import { Router } from "express";
import { db } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { sendAdminEmail, newClientEmail, newServiceRequestEmail } from "../lib/email";

const router = Router();

const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "Admin2026!";

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers["x-admin-token"];
  if (auth !== `${ADMIN_USER}:${ADMIN_PASS}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, token: `${ADMIN_USER}:${ADMIN_PASS}` });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [totalClients] = await db.select({ count: sql<number>`count(*)::int` }).from(adminClients);
    const [pendingClients] = await db.select({ count: sql<number>`count(*)::int` }).from(adminClients).where(eq(adminClients.status, "pending"));
    const [totalRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(adminServiceRequests);
    const [pendingRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(adminServiceRequests).where(eq(adminServiceRequests.status, "pending"));
    const recentActivity = await db.select().from(adminActivityLog).orderBy(desc(adminActivityLog.createdAt)).limit(10);
    return res.json({
      totalClients: totalClients.count,
      pendingClients: pendingClients.count,
      totalRequests: totalRequests.count,
      pendingRequests: pendingRequests.count,
      recentActivity,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load stats" });
  }
});

router.get("/clients", requireAdmin, async (req, res) => {
  try {
    const clients = await db.select().from(adminClients).orderBy(desc(adminClients.createdAt));
    return res.json({ clients });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load clients" });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const { name, email, phone, company, notes } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

    const [existing] = await db.select().from(adminClients).where(eq(adminClients.email, email.toLowerCase().trim()));
    if (existing) return res.status(409).json({ error: "A client with this email already exists" });

    const [client] = await db.insert(adminClients).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      notes: notes?.trim() || null,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "client_registered",
      clientId: client.id,
      description: `New client registered: ${client.name} (${client.email})`,
      metadata: { name: client.name, email: client.email },
    });

    const { subject, html } = newClientEmail({ ...client, createdAt: client.createdAt as Date });
    await sendAdminEmail(subject, html);

    return res.status(201).json({ client, emailSent: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to register client" });
  }
});

router.patch("/clients/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const [client] = await db.update(adminClients)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(adminClients.id, id))
      .returning();
    if (!client) return res.status(404).json({ error: "Client not found" });

    await db.insert(adminActivityLog).values({
      eventType: "client_status_changed",
      clientId: client.id,
      description: `Client ${client.name} status changed to: ${status}`,
      metadata: { status },
    });

    return res.json({ client });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update client" });
  }
});

router.get("/requests", requireAdmin, async (req, res) => {
  try {
    const requests = await db
      .select({
        id: adminServiceRequests.id,
        clientId: adminServiceRequests.clientId,
        type: adminServiceRequests.type,
        amount: adminServiceRequests.amount,
        currency: adminServiceRequests.currency,
        notes: adminServiceRequests.notes,
        status: adminServiceRequests.status,
        createdAt: adminServiceRequests.createdAt,
        updatedAt: adminServiceRequests.updatedAt,
        clientName: adminClients.name,
        clientEmail: adminClients.email,
      })
      .from(adminServiceRequests)
      .leftJoin(adminClients, eq(adminServiceRequests.clientId, adminClients.id))
      .orderBy(desc(adminServiceRequests.createdAt));
    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load requests" });
  }
});

router.post("/requests", async (req, res) => {
  try {
    const { clientId, type, amount, currency, notes } = req.body;
    if (!clientId) return res.status(400).json({ error: "clientId is required" });

    const [client] = await db.select().from(adminClients).where(eq(adminClients.id, parseInt(clientId)));
    if (!client) return res.status(404).json({ error: "Client not found" });

    const [request] = await db.insert(adminServiceRequests).values({
      clientId: parseInt(clientId),
      type: type || "withdrawal",
      amount: amount ? String(amount) : null,
      currency: currency || "USD",
      notes: notes?.trim() || null,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "service_request_submitted",
      clientId: client.id,
      description: `${type || "withdrawal"} request submitted by ${client.name}: ${currency || "USD"} ${amount || "N/A"}`,
      metadata: { type, amount, currency },
    });

    const { subject, html } = newServiceRequestEmail({
      client: { name: client.name, email: client.email },
      request: { ...request, createdAt: request.createdAt as Date },
    });
    await sendAdminEmail(subject, html);

    return res.status(201).json({ request, emailSent: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit request" });
  }
});

router.patch("/requests/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [request] = await db.update(adminServiceRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(adminServiceRequests.id, id))
      .returning();
    if (!request) return res.status(404).json({ error: "Request not found" });

    const [client] = await db.select().from(adminClients).where(eq(adminClients.id, request.clientId));

    await db.insert(adminActivityLog).values({
      eventType: "request_status_changed",
      clientId: request.clientId,
      description: `${request.type} request from ${client?.name || "unknown"} ${status}`,
      metadata: { status, requestId: id },
    });

    return res.json({ request });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update request" });
  }
});

router.get("/activity", requireAdmin, async (req, res) => {
  try {
    const activity = await db
      .select({
        id: adminActivityLog.id,
        eventType: adminActivityLog.eventType,
        clientId: adminActivityLog.clientId,
        description: adminActivityLog.description,
        metadata: adminActivityLog.metadata,
        createdAt: adminActivityLog.createdAt,
        clientName: adminClients.name,
      })
      .from(adminActivityLog)
      .leftJoin(adminClients, eq(adminActivityLog.clientId, adminClients.id))
      .orderBy(desc(adminActivityLog.createdAt))
      .limit(100);
    return res.json({ activity });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load activity" });
  }
});

export default router;
