import { sql } from "drizzle-orm";
import { pgTable, serial, text, varchar, numeric, integer, timestamp, jsonb, unique, boolean, index } from "drizzle-orm/pg-core";

export const adminClients = pgTable("admin_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("admin_clients_email_key").on(t.email),
]);

export const adminServiceRequests = pgTable("admin_service_requests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => adminClients.id),
  type: text("type").notNull().default("withdrawal"),
  amount: numeric("amount", { precision: 14, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  txnId: text("txn_id"),
  status: text("status").notNull().default("pending"),
  // Unguessable per-row capability token used by the public status lookup.
  publicToken: varchar("public_token", { length: 64 }).notNull().default(sql`(gen_random_uuid())::text`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("admin_service_requests_public_token_key").on(t.publicToken),
  // Speeds up the per-user pending-withdrawal count on GET /api/auth/sessions,
  // which filters admin_service_requests by client_id, type and status.
  index("admin_service_requests_client_type_status_idx").on(
    t.clientId,
    t.type,
    t.status,
  ),
]);

export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (t) => [
  unique("admin_sessions_token_hash_key").on(t.tokenHash),
]);

export const adminActivityLog = pgTable("admin_activity_log", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  clientId: integer("client_id").references(() => adminClients.id),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cryptoWalletConfigs = pgTable("crypto_wallet_configs", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  network: text("network").notNull(),
  address: text("address").notNull(),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coinSectionOrders = pgTable("coin_section_orders", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("coin_section_orders_symbol_key").on(t.symbol),
]);

export type AdminClient = typeof adminClients.$inferSelect;
export type InsertAdminClient = typeof adminClients.$inferInsert;
export type AdminServiceRequest = typeof adminServiceRequests.$inferSelect;
export type InsertAdminServiceRequest = typeof adminServiceRequests.$inferInsert;
export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
export type CryptoWalletConfig = typeof cryptoWalletConfigs.$inferSelect;
export type InsertCryptoWalletConfig = typeof cryptoWalletConfigs.$inferInsert;
export type CoinSectionOrder = typeof coinSectionOrders.$inferSelect;
export type InsertCoinSectionOrder = typeof coinSectionOrders.$inferInsert;
