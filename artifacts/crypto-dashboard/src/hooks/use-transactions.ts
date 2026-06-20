import { useState, useEffect, useRef, useCallback } from "react";
import { transactionsApi, type ServerTransaction, type TransactionInput } from "@/lib/api";

export type StatusType = "investigation" | "completed" | "pending" | "processing";

export interface Transaction {
  id: string;
  type: string;
  asset: string;
  amount: string;
  usdAmount?: number;
  date: string;
  status: string;
  statusType: StatusType;
  address: string;
  blockConfirmations?: number;
  blockConfirmStart?: number;
  // Epoch ms of server-side creation, used to derive the transient escalation
  // (pending → processing → investigation) purely on the client.
  createdAtMs?: number;
}

export function useBlockConfirmations(tx: Transaction) {
  const [count, setCount] = useState(tx.blockConfirmations ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stallTarget = useRef(Math.random() < 0.6 ? 7 : 8);

  useEffect(() => {
    if (tx.statusType !== "processing") return;

    const startFrom = tx.blockConfirmations ?? 0;
    setCount(startFrom);

    if (startFrom >= stallTarget.current) return;

    intervalRef.current = setInterval(() => {
      setCount(prev => {
        const next = prev + 1;
        if (next >= stallTarget.current) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return stallTarget.current;
        }
        return next;
      });
    }, 3500 + Math.random() * 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tx.id, tx.statusType]);

  return count;
}

// --- Session token (shared with use-balance / use-approval-poller) ---------

const SESSION_KEY = "cryptovault.session";

function getStoredToken(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

// --- Invoice context (transient session state, stays in localStorage) ------

const INVOICE_CTX_KEY = "cryptovault_invoice_ctx";

export function saveInvoiceContext(tx: { usdAmount: number; asset: string; rawAmount: string; txId: string }) {
  try {
    localStorage.setItem(INVOICE_CTX_KEY, JSON.stringify(tx));
  } catch {}
}

export function loadInvoiceContext(): { usdAmount: number; asset: string; rawAmount: string; txId: string } | null {
  try {
    const raw = localStorage.getItem(INVOICE_CTX_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- Payment confirmation resume state (transient, stays in localStorage) ---

const PAYMENT_CONFIRMATION_KEY_PREFIX = "cryptovault_payment_confirmation:";
const PAYMENT_CONFIRMATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PaymentConfirmationRecord {
  txId: string;
  publicToken: string;
  approvedHandled?: boolean;
  savedAt?: number;
}

function paymentConfirmationKey(txId: string): string | null {
  if (!txId) return null;
  return `${PAYMENT_CONFIRMATION_KEY_PREFIX}${txId}`;
}

export function savePaymentConfirmation(rec: PaymentConfirmationRecord) {
  const key = paymentConfirmationKey(rec.txId);
  if (!key) return;
  try {
    const withTs: PaymentConfirmationRecord = { ...rec, savedAt: rec.savedAt ?? Date.now() };
    localStorage.setItem(key, JSON.stringify(withTs));
  } catch {}
}

export function loadPaymentConfirmation(txId: string): PaymentConfirmationRecord | null {
  const key = paymentConfirmationKey(txId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentConfirmationRecord;
    if (!parsed?.txId || !parsed?.publicToken || parsed.txId !== txId) {
      localStorage.removeItem(key);
      return null;
    }
    // Treat missing/invalid `savedAt` (legacy records) as stale.
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > PAYMENT_CONFIRMATION_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPaymentConfirmation(txId: string) {
  const key = paymentConfirmationKey(txId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// --- Transient escalation derivation ---------------------------------------
//
// The server persists only two non-terminal/terminal states for the simulated
// withdrawal flow: "pending" (freshly created send/withdrawal) and "completed"
// (a terminal outcome — approved, denied/cancelled, or an instantly-completed
// op such as a conversion or deposit). The "processing" and "investigation"
// stages are display-only and derived from how long ago the row was created so
// they never need to be written back to the server.

const PROCESSING_AFTER_MS = 20_000;
const INVESTIGATION_AFTER_MS = PROCESSING_AFTER_MS + 90_000;
const TICK_MS = 5_000;
// How often the displayed ledger is re-reconciled against the server, so a
// dropped write or a divergence eventually self-heals without a manual refresh.
const RECONCILE_MS = 30_000;

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// Collapse any server-side status bucket into the two states the client
// persists: a still-running op stays "pending" (and re-derives its display
// stage from time), anything terminal becomes "completed".
function baseStatusTypeOf(statusType: string): "pending" | "completed" {
  return statusType === "completed" || statusType === "cancelled" || statusType === "failed"
    ? "completed"
    : "pending";
}

function fromServer(r: ServerTransaction): Transaction {
  const createdAtMs = Date.parse(r.createdAt) || Date.now();
  return {
    id: r.txnId,
    type: r.type,
    asset: r.asset,
    amount: r.amount,
    usdAmount: r.usdAmount,
    date: formatDate(createdAtMs),
    status: r.status,
    statusType: baseStatusTypeOf(r.statusType),
    address: r.address ?? "",
    createdAtMs,
  };
}

// Given a canonical (base) transaction, compute the display transaction with
// its transient escalation stage applied.
function deriveOne(base: Transaction): Transaction {
  if (base.statusType === "completed") return base;
  const createdAtMs = base.createdAtMs ?? Date.now();
  const elapsed = Date.now() - createdAtMs;
  if (elapsed < PROCESSING_AFTER_MS) {
    return { ...base, status: "Pending", statusType: "pending" };
  }
  if (elapsed < INVESTIGATION_AFTER_MS) {
    return {
      ...base,
      status: "Processing",
      statusType: "processing",
      blockConfirmStart: createdAtMs + PROCESSING_AFTER_MS,
      blockConfirmations: base.blockConfirmations ?? 0,
    };
  }
  return { ...base, status: "Under Investigation", statusType: "investigation" };
}

function deriveList(base: Transaction[]): Transaction[] {
  return base.map(deriveOne);
}

function sameDisplay(a: Transaction[], b: Transaction[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].statusType !== b[i].statusType ||
      a[i].status !== b[i].status ||
      a[i].amount !== b[i].amount
    ) {
      return false;
    }
  }
  return true;
}

// Reconcile the locally-held base list with a fresh server snapshot without
// throwing away work that hasn't round-tripped yet. The server snapshot is the
// source of truth, except:
//   - rows with a write (create/terminal update) still in flight keep their
//     local version until the server acknowledges it
//   - rows with a delete still in flight are dropped even if the snapshot still
//     contains them
// This is what lets the late initial list merge with — rather than overwrite —
// optimistic rows, and lets periodic reconciliation correct any divergence.
function mergeBase(
  local: Transaction[],
  server: Transaction[],
  inflightWrites: Set<string>,
  inflightDeletes: Set<string>,
): Transaction[] {
  const localById = new Map(local.map(t => [t.id, t]));
  const merged = new Map<string, Transaction>();

  for (const s of server) {
    if (inflightDeletes.has(s.id)) continue;
    const prev = localById.get(s.id);
    if (prev && inflightWrites.has(s.id)) {
      // A local change to this row hasn't been acknowledged yet — keep it.
      merged.set(s.id, prev);
    } else {
      // Preserve the locally-known creation time for stable ordering.
      merged.set(s.id, prev ? { ...s, createdAtMs: prev.createdAtMs ?? s.createdAtMs } : s);
    }
  }
  for (const l of local) {
    if (merged.has(l.id) || inflightDeletes.has(l.id)) continue;
    // A local row the server doesn't know about is kept only while its create
    // is in flight; otherwise it never persisted (or was removed elsewhere).
    if (inflightWrites.has(l.id)) merged.set(l.id, l);
  }

  return [...merged.values()].sort(
    (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
  );
}

let txnCounter = 0;
function genTxnId(): string {
  txnCounter = (txnCounter + 1) % 100000;
  return `txn-${Date.now()}-${txnCounter}`;
}

type AppendInput = Omit<Transaction, "id" | "date" | "status" | "statusType" | "createdAtMs"> &
  Partial<Pick<Transaction, "id" | "status" | "statusType" | "date">>;

function toCreateBody(txnId: string, tx: AppendInput, status: string, statusType: string): TransactionInput {
  return {
    txnId,
    type: tx.type,
    asset: tx.asset,
    amount: tx.amount,
    usdAmount: tx.usdAmount ?? 0,
    address: tx.address ?? null,
    status,
    statusType: baseStatusTypeOf(statusType),
  };
}

// Normalize a display transaction supplied by the updater into a canonical base
// row (used when the approval poller injects a brand-new record, e.g. an
// admin-triggered account debit).
function toBaseFromDisplay(n: Transaction): Transaction {
  const createdAtMs = n.createdAtMs ?? Date.now();
  return {
    ...n,
    statusType: baseStatusTypeOf(n.statusType),
    createdAtMs,
    date: n.date ?? formatDate(createdAtMs),
  };
}

/**
 * Append a transaction from outside a mounted `useTransactions` hook (e.g. the
 * invoice flow on a different route, or the convert page). Writes to the
 * server ledger and returns the client txn id synchronously. A mounted
 * dashboard picks it up on its next fetch.
 */
export function pushTransaction(tx: AppendInput): string {
  const txnId = tx.id ?? genTxnId();
  const status = tx.status ?? "Completed";
  const statusType = tx.statusType ?? "completed";
  const token = getStoredToken();
  if (token) {
    void transactionsApi.create(token, toCreateBody(txnId, tx, status, statusType)).catch(() => {});
  }
  return txnId;
}

export function useTransactions() {
  const [display, setDisplay] = useState<Transaction[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const baseRef = useRef<Transaction[]>([]);
  const tokenRef = useRef<string | null>(typeof window !== "undefined" ? getStoredToken() : null);
  // Ids of ledger writes still in flight, used by `mergeBase` so a concurrent
  // reconciliation doesn't clobber work that hasn't round-tripped yet.
  const inflightWrites = useRef<Set<string>>(new Set());
  const inflightDeletes = useRef<Set<string>>(new Set());

  const recompute = useCallback(() => {
    const next = deriveList(baseRef.current);
    setDisplay(prev => (sameDisplay(prev, next) ? prev : next));
  }, []);

  // Pull a fresh server snapshot and merge it into the local base, preserving
  // in-flight work. Silently no-ops if the server can't be reached so a flaky
  // connection never wipes the displayed history — the next tick retries.
  const reconcile = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    let rows;
    try {
      rows = await transactionsApi.listOrThrow(token);
    } catch {
      return;
    }
    baseRef.current = mergeBase(
      baseRef.current,
      rows.map(fromServer),
      inflightWrites.current,
      inflightDeletes.current,
    );
    recompute();
  }, [recompute]);

  // Persist a write, tracking it as in-flight and reconciling once it settles.
  // On persistent failure (retries already exhausted inside transactionsApi),
  // surface an error; the follow-up reconcile then realigns the display with
  // the server (e.g. drops a row whose create never landed, or restores one
  // whose delete failed) so the history can't silently drift.
  const persistWrite = useCallback(
    (id: string, run: () => Promise<unknown>, isDelete: boolean) => {
      const tracker = isDelete ? inflightDeletes.current : inflightWrites.current;
      tracker.add(id);
      run()
        .then(() => setSyncError(null))
        .catch(() => setSyncError("Some changes couldn't be saved. The list will resync automatically."))
        .finally(() => {
          tracker.delete(id);
          void reconcile();
        });
    },
    [reconcile],
  );

  const persistCreate = useCallback(
    (body: TransactionInput) => {
      const token = tokenRef.current;
      if (!token) return;
      persistWrite(body.txnId, () => transactionsApi.create(token, body), false);
    },
    [persistWrite],
  );

  const persistUpdate = useCallback(
    (txnId: string, body: { status: string; statusType: string }) => {
      const token = tokenRef.current;
      if (!token) return;
      persistWrite(txnId, () => transactionsApi.update(token, txnId, body), false);
    },
    [persistWrite],
  );

  const persistRemove = useCallback(
    (txnId: string) => {
      const token = tokenRef.current;
      if (!token) return;
      persistWrite(txnId, () => transactionsApi.remove(token, txnId), true);
    },
    [persistWrite],
  );

  // Initial load from the server ledger.
  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    tokenRef.current = token;
    if (!token) {
      baseRef.current = [];
      setDisplay([]);
      return;
    }
    transactionsApi
      .listOrThrow(token)
      .then(rows => {
        if (cancelled) return;
        // Merge rather than overwrite: the user may have added optimistic rows
        // before this initial list resolved.
        baseRef.current = mergeBase(
          baseRef.current,
          rows.map(fromServer),
          inflightWrites.current,
          inflightDeletes.current,
        );
        recompute();
      })
      .catch(() => {
        // Initial load failed (e.g. offline). Keep any optimistic rows and let
        // periodic reconciliation recover once the connection is back.
      });
    return () => {
      cancelled = true;
    };
  }, [recompute]);

  // Drive transient escalation forward over time.
  useEffect(() => {
    const id = setInterval(recompute, TICK_MS);
    return () => clearInterval(id);
  }, [recompute]);

  // Periodically resync with the server so any divergence self-heals.
  useEffect(() => {
    const id = setInterval(() => {
      void reconcile();
    }, RECONCILE_MS);
    return () => clearInterval(id);
  }, [reconcile]);

  // Single funnel used by the approval poller. Detects terminal transitions and
  // removals against the canonical base list, persists them to the server, and
  // recomputes the derived display.
  const setTransactions = useCallback(
    (updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
      const prevDisplay = deriveList(baseRef.current);
      const next = typeof updater === "function" ? updater(prevDisplay) : updater;
      const baseById = new Map(baseRef.current.map(b => [b.id, b]));

      // Iterate the updater's output (preserving order) so newly injected rows
      // land in the right place. Handle additions, terminal transitions and
      // removals, persisting each to the server ledger (with retry + resync).
      const newBase: Transaction[] = [];
      const keptIds = new Set<string>();
      for (const n of next) {
        keptIds.add(n.id);
        const b = baseById.get(n.id);
        if (!b) {
          const created = toBaseFromDisplay(n);
          newBase.push(created);
          persistCreate(toCreateBody(created.id, created, created.status, created.statusType));
          continue;
        }
        if (n.statusType === "completed" && b.statusType !== "completed") {
          // Terminal transition (approved/denied/debit-all) — persist it.
          newBase.push({ ...b, statusType: "completed", status: n.status });
          persistUpdate(b.id, { status: n.status, statusType: "completed" });
        } else {
          newBase.push(b);
        }
      }
      for (const b of baseRef.current) {
        if (!keptIds.has(b.id)) {
          persistRemove(b.id);
        }
      }
      baseRef.current = newBase;
      recompute();
    },
    [recompute, persistCreate, persistUpdate, persistRemove],
  );

  const addTransaction = useCallback(
    (tx: AppendInput) => {
      const txnId = genTxnId();
      const now = Date.now();
      const status = tx.status ?? "Pending";
      const statusType = baseStatusTypeOf(tx.statusType ?? "pending");
      const base: Transaction = {
        id: txnId,
        type: tx.type,
        asset: tx.asset,
        amount: tx.amount,
        usdAmount: tx.usdAmount,
        address: tx.address ?? "",
        date: formatDate(now),
        status,
        statusType,
        createdAtMs: now,
      };
      baseRef.current = [base, ...baseRef.current];
      recompute();
      persistCreate(toCreateBody(txnId, tx, status, statusType));
      return txnId;
    },
    [recompute, persistCreate],
  );

  const cancelTransaction = useCallback(
    (id: string) => {
      baseRef.current = baseRef.current.filter(t => t.id !== id);
      recompute();
      persistRemove(id);
    },
    [recompute, persistRemove],
  );

  return { transactions: display, addTransaction, cancelTransaction, setTransactions, syncError };
}
