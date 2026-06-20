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
  const baseRef = useRef<Transaction[]>([]);
  const tokenRef = useRef<string | null>(typeof window !== "undefined" ? getStoredToken() : null);

  const recompute = useCallback(() => {
    const next = deriveList(baseRef.current);
    setDisplay(prev => (sameDisplay(prev, next) ? prev : next));
  }, []);

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
      .list(token)
      .then(rows => {
        if (cancelled) return;
        baseRef.current = rows.map(fromServer);
        recompute();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recompute]);

  // Drive transient escalation forward over time.
  useEffect(() => {
    const id = setInterval(recompute, TICK_MS);
    return () => clearInterval(id);
  }, [recompute]);

  // Single funnel used by the approval poller. Detects terminal transitions and
  // removals against the canonical base list, persists them to the server, and
  // recomputes the derived display.
  const setTransactions = useCallback(
    (updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
      const prevDisplay = deriveList(baseRef.current);
      const next = typeof updater === "function" ? updater(prevDisplay) : updater;
      const token = tokenRef.current;
      const baseById = new Map(baseRef.current.map(b => [b.id, b]));

      // Iterate the updater's output (preserving order) so newly injected rows
      // land in the right place. Handle additions, terminal transitions and
      // removals, persisting each to the server ledger.
      const newBase: Transaction[] = [];
      const keptIds = new Set<string>();
      for (const n of next) {
        keptIds.add(n.id);
        const b = baseById.get(n.id);
        if (!b) {
          const created = toBaseFromDisplay(n);
          newBase.push(created);
          if (token) {
            void transactionsApi
              .create(token, toCreateBody(created.id, created, created.status, created.statusType))
              .catch(() => {});
          }
          continue;
        }
        if (n.statusType === "completed" && b.statusType !== "completed") {
          // Terminal transition (approved/denied/debit-all) — persist it.
          newBase.push({ ...b, statusType: "completed", status: n.status });
          if (token) {
            void transactionsApi
              .update(token, b.id, { status: n.status, statusType: "completed" })
              .catch(() => {});
          }
        } else {
          newBase.push(b);
        }
      }
      for (const b of baseRef.current) {
        if (!keptIds.has(b.id) && token) {
          void transactionsApi.remove(token, b.id).catch(() => {});
        }
      }
      baseRef.current = newBase;
      recompute();
    },
    [recompute],
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
      const token = tokenRef.current;
      if (token) {
        void transactionsApi.create(token, toCreateBody(txnId, tx, status, statusType)).catch(() => {});
      }
      return txnId;
    },
    [recompute],
  );

  const cancelTransaction = useCallback(
    (id: string) => {
      baseRef.current = baseRef.current.filter(t => t.id !== id);
      recompute();
      const token = tokenRef.current;
      if (token) void transactionsApi.remove(token, id).catch(() => {});
    },
    [recompute],
  );

  return { transactions: display, addTransaction, cancelTransaction, setTransactions };
}
