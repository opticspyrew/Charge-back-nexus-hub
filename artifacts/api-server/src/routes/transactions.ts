import { Router, type Request, type Response } from "express";
import { db, transactions, type Transaction } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { extractBearerToken, findUserBySessionToken } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Per-user transaction ledger. Every route here is authenticated and scoped to
 * the session user — a client can never read or mutate another user's rows, and
 * a client-supplied user id is always ignored in favour of the session user id.
 */

const MAX_LEN = {
  txnId: 80,
  type: 40,
  asset: 24,
  amount: 80,
  address: 200,
  status: 60,
  statusType: 24,
};

const VALID_STATUS_TYPES = new Set([
  "completed",
  "pending",
  "processing",
  "investigation",
  "failed",
  "cancelled",
]);

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function publicTransaction(row: Transaction) {
  return {
    txnId: row.txnId,
    type: row.type,
    asset: row.asset,
    amount: row.amount,
    usdAmount: row.usdAmount,
    address: row.address,
    status: row.status,
    statusType: row.statusType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireUser(
  req: Request,
  res: Response,
): Promise<{ id: number } | null> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "You must be signed in." });
    return null;
  }
  const user = await findUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ error: "Session expired. Please sign in again." });
    return null;
  }
  return { id: user.id };
}

// GET /api/auth/transactions — newest-first list for the session user.
router.get("/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.createdAt), desc(transactions.id));
    res.json({ transactions: rows.map(publicTransaction) });
  } catch (err) {
    logger.error({ err }, "Failed to list transactions");
    res.status(500).json({ error: "Failed to load transactions." });
  }
});

// POST /api/auth/transactions — append a transaction. Idempotent on txnId via
// the unique (user_id, txn_id) constraint: a retried POST returns the existing
// row instead of creating a duplicate.
router.post("/transactions", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const body = req.body as Record<string, unknown>;
    const txnId = clean(body.txnId, MAX_LEN.txnId);
    const type = clean(body.type, MAX_LEN.type);
    const asset = clean(body.asset, MAX_LEN.asset);
    const amount = clean(body.amount, MAX_LEN.amount);
    const status = clean(body.status, MAX_LEN.status);
    const statusType = clean(body.statusType, MAX_LEN.statusType);
    const address = clean(body.address, MAX_LEN.address);

    if (!txnId || !type || !asset || !amount || !status || !statusType) {
      res.status(400).json({
        error: "txnId, type, asset, amount, status and statusType are required.",
      });
      return;
    }
    if (!VALID_STATUS_TYPES.has(statusType)) {
      res.status(400).json({ error: "Invalid statusType." });
      return;
    }
    const rawUsd = body.usdAmount;
    const usdAmount =
      typeof rawUsd === "number" && Number.isFinite(rawUsd)
        ? rawUsd
        : typeof rawUsd === "string" && rawUsd.trim() !== "" && Number.isFinite(Number(rawUsd))
          ? Number(rawUsd)
          : 0;

    const [row] = await db
      .insert(transactions)
      .values({
        userId: user.id,
        txnId,
        type,
        asset,
        amount,
        usdAmount,
        address,
        status,
        statusType,
      })
      .onConflictDoNothing({
        target: [transactions.userId, transactions.txnId],
      })
      .returning();

    // onConflictDoNothing returns nothing when the row already existed — fetch
    // and return the existing row so the client gets a consistent response.
    if (!row) {
      const [existing] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, user.id), eq(transactions.txnId, txnId)));
      if (existing) {
        res.status(200).json({ transaction: publicTransaction(existing) });
        return;
      }
      res.status(500).json({ error: "Failed to append transaction." });
      return;
    }

    res.status(201).json({ transaction: publicTransaction(row) });
  } catch (err) {
    logger.error({ err }, "Failed to append transaction");
    res.status(500).json({ error: "Failed to append transaction." });
  }
});

// PATCH /api/auth/transactions/:txnId — update terminal status (e.g. a pending
// withdrawal becomes Completed/Failed after admin approval/denial). Scoped to
// the session user.
router.patch("/transactions/:txnId", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const txnId = clean(req.params.txnId, MAX_LEN.txnId);
    if (!txnId) {
      res.status(400).json({ error: "Invalid transaction id." });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const status = clean(body.status, MAX_LEN.status);
    const statusType = clean(body.statusType, MAX_LEN.statusType);
    if (!status || !statusType) {
      res.status(400).json({ error: "status and statusType are required." });
      return;
    }
    if (!VALID_STATUS_TYPES.has(statusType)) {
      res.status(400).json({ error: "Invalid statusType." });
      return;
    }

    const [row] = await db
      .update(transactions)
      .set({ status, statusType, updatedAt: new Date() })
      .where(and(eq(transactions.userId, user.id), eq(transactions.txnId, txnId)))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    res.json({ transaction: publicTransaction(row) });
  } catch (err) {
    logger.error({ err }, "Failed to update transaction");
    res.status(500).json({ error: "Failed to update transaction." });
  }
});

// DELETE /api/auth/transactions/:txnId — cancel/remove a transaction the user
// abandoned (e.g. a withdrawal they backed out of). Scoped to the session user.
router.delete("/transactions/:txnId", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const txnId = clean(req.params.txnId, MAX_LEN.txnId);
    if (!txnId) {
      res.status(400).json({ error: "Invalid transaction id." });
      return;
    }
    await db
      .delete(transactions)
      .where(and(eq(transactions.userId, user.id), eq(transactions.txnId, txnId)));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete transaction");
    res.status(500).json({ error: "Failed to delete transaction." });
  }
});

export default router;
