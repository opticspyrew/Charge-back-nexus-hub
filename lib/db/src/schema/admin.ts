import { pgTable, serial, text, numeric, integer, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminActivityLog = pgTable("admin_activity_log", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  clientId: integer("client_id").references(() => adminClients.id),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminClient = typeof adminClients.$inferSelect;
export type InsertAdminClient = typeof adminClients.$inferInsert;
export type AdminServiceRequest = typeof adminServiceRequests.$inferSelect;
export type InsertAdminServiceRequest = typeof adminServiceRequests.$inferInsert;
export type AdminActivityLog = typeof adminActivityLog.$inferSelect;
