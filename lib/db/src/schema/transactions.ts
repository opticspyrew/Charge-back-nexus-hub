import { pgTable, serial, text, integer, timestamp, real, unique, index } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Append-only, per-user transaction ledger backing the CryptoVault activity
 * feed. Every balance-changing operation (convert, deposit/add, deduct, send,
 * receive, withdraw) appends one row here so history survives refreshes and is
 * consistent across devices.
 *
 * `txnId` is a stable client-generated id ("txn-<timestamp>") that makes the
 * optimistic-append + background-POST flow idempotent: the unique
 * (user_id, txn_id) constraint means a retried POST can never create a
 * duplicate row. The server NEVER trusts a client-supplied user id — rows are
 * always scoped to the authenticated session user.
 */
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Stable client-generated id for idempotent optimistic appends.
  txnId: text("txn_id").notNull(),
  // "Conversion" | "Deposit" | "Withdrawal" | "Send" | "Receive" | "Deduction" ...
  type: text("type").notNull(),
  asset: text("asset").notNull(),
  // Human display amount, e.g. "-0.1200 BTC" / "+1,500.00 USD".
  amount: text("amount").notNull(),
  usdAmount: real("usd_amount").notNull().default(0),
  // Optional address / counterparty / note shown in the row.
  address: text("address"),
  // Display status label, e.g. "Completed" | "Pending" | "Under Investigation".
  status: text("status").notNull(),
  // Coarse status bucket used for styling/escalation: "completed" | "pending"
  // | "processing" | "investigation" | "failed" | "cancelled".
  statusType: text("status_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("transactions_user_txn_key").on(t.userId, t.txnId),
  index("transactions_user_created_idx").on(t.userId, t.createdAt),
]);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
