import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog, users, cryptoWalletConfigs } from "@workspace/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { sendAdminEmail, newClientEmail, newServiceRequestEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

function getAdminCredentials(): { user: string; pass: string } {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    logger.error("ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required but not set");
    throw new Error("Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD env vars.");
  }
  return { user, pass };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  let creds: { user: string; pass: string };
  try {
    creds = getAdminCredentials();
  } catch {
    res.status(503).json({ error: "Admin authentication not configured on server" });
    return;
  }
  const auth = req.headers["x-admin-token"];
  if (auth !== `${creds.user}:${creds.pass}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/login", (req: Request, res: Response): void => {
  let creds: { user: string; pass: string };
  try {
    creds = getAdminCredentials();
  } catch {
    res.status(503).json({ error: "Admin authentication not configured on server" });
    return;
  }
  const { username, password } = req.body as { username?: string; password?: string };
  if (username === creds.user && password === creds.pass) {
    res.json({ success: true, token: `${creds.user}:${creds.pass}` });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

router.get("/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalClients] = await db.select({ count: sql<number>`count(*)::int` }).from(adminClients);
    const [pendingClients] = await db.select({ count: sql<number>`count(*)::int` }).from(adminClients).where(eq(adminClients.status, "pending"));
    const [totalRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(adminServiceRequests);
    const [pendingRequests] = await db.select({ count: sql<number>`count(*)::int` }).from(adminServiceRequests).where(eq(adminServiceRequests.status, "pending"));
    const recentActivity = await db.select().from(adminActivityLog).orderBy(desc(adminActivityLog.createdAt)).limit(10);
    res.json({
      totalClients: totalClients.count,
      pendingClients: pendingClients.count,
      totalRequests: totalRequests.count,
      pendingRequests: pendingRequests.count,
      recentActivity,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "Failed to load stats");
    res.status(500).json({ error: "Failed to load stats", detail: msg });
  }
});

router.get("/clients", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const clients = await db.select().from(adminClients).orderBy(desc(adminClients.createdAt));
    res.json({ clients });
  } catch (err) {
    logger.error({ err }, "Failed to load clients");
    res.status(500).json({ error: "Failed to load clients" });
  }
});

router.post("/clients", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, notes } = req.body as {
      name?: string; email?: string; phone?: string; company?: string; notes?: string;
    };
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const [existing] = await db.select().from(adminClients).where(eq(adminClients.email, email.toLowerCase().trim()));
    if (existing) {
      res.status(409).json({ error: "A client with this email already exists" });
      return;
    }

    const [client] = await db.insert(adminClients).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() ?? null,
      company: company?.trim() ?? null,
      notes: notes?.trim() ?? null,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "client_registered",
      clientId: client.id,
      description: `New client registered: ${client.name} (${client.email})`,
      metadata: { name: client.name, email: client.email },
    });

    const { subject, html } = newClientEmail({ ...client, createdAt: client.createdAt as Date });
    const emailSent = await sendAdminEmail(subject, html);

    res.status(201).json({ client, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to register client");
    res.status(500).json({ error: "Failed to register client" });
  }
});

router.patch("/clients/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(String(req.params.id));
    const { status, notes } = req.body as { status?: string; notes?: string };
    const [client] = await db.update(adminClients)
      .set({ status, notes, updatedAt: new Date() })
      .where(eq(adminClients.id, id))
      .returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await db.insert(adminActivityLog).values({
      eventType: "client_status_changed",
      clientId: client.id,
      description: `Client ${client.name} status changed to: ${status}`,
      metadata: { status },
    });

    res.json({ client });
  } catch (err) {
    logger.error({ err }, "Failed to update client");
    res.status(500).json({ error: "Failed to update client" });
  }
});

router.get("/requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
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
    res.json({ requests });
  } catch (err) {
    logger.error({ err }, "Failed to load requests");
    res.status(500).json({ error: "Failed to load requests" });
  }
});

router.post("/requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, type, amount, currency, notes } = req.body as {
      clientId?: number | string; type?: string; amount?: string; currency?: string; notes?: string;
    };
    if (!clientId) {
      res.status(400).json({ error: "clientId is required" });
      return;
    }

    const [client] = await db.select().from(adminClients).where(eq(adminClients.id, parseInt(String(clientId), 10)));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const [request] = await db.insert(adminServiceRequests).values({
      clientId: parseInt(String(clientId), 10),
      type: type ?? "withdrawal",
      amount: amount ? String(amount) : null,
      currency: currency ?? "USD",
      notes: notes?.trim() ?? null,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "service_request_submitted",
      clientId: client.id,
      description: `${type ?? "withdrawal"} request submitted by ${client.name}: ${currency ?? "USD"} ${amount ?? "N/A"}`,
      metadata: { type, amount, currency },
    });

    const { subject, html } = newServiceRequestEmail({
      client: { name: client.name, email: client.email },
      request: { ...request, createdAt: request.createdAt as Date },
    });
    const emailSent = await sendAdminEmail(subject, html);

    res.status(201).json({ request, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to submit request");
    res.status(500).json({ error: "Failed to submit request" });
  }
});

router.patch("/requests/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(String(req.params.id));
    const { status } = req.body as { status?: string };
    const [request] = await db.update(adminServiceRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(adminServiceRequests.id, id))
      .returning();
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const [client] = await db.select().from(adminClients).where(eq(adminClients.id, request.clientId));

    await db.insert(adminActivityLog).values({
      eventType: "request_status_changed",
      clientId: request.clientId,
      description: `${request.type} request from ${client?.name ?? "unknown"} ${status}`,
      metadata: { status, requestId: id },
    });

    res.json({ request });
  } catch (err) {
    logger.error({ err }, "Failed to update request");
    res.status(500).json({ error: "Failed to update request" });
  }
});

router.get("/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        passwordSalt: users.passwordSalt,
        passwordIterations: users.passwordIterations,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    res.json({ users: allUsers });
  } catch (err) {
    logger.error({ err }, "Failed to load users");
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.get("/activity", requireAdmin, async (req: Request, res: Response): Promise<void> => {
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
    res.json({ activity });
  } catch (err) {
    logger.error({ err }, "Failed to load activity");
    res.status(500).json({ error: "Failed to load activity" });
  }
});

router.get("/wallet-configs", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const configs = await db
      .select()
      .from(cryptoWalletConfigs)
      .orderBy(asc(cryptoWalletConfigs.sortOrder), asc(cryptoWalletConfigs.symbol));
    res.json({ configs });
  } catch (err) {
    logger.error({ err }, "Failed to fetch wallet configs");
    res.status(500).json({ error: "Failed to fetch wallet configs" });
  }
});

router.post("/wallet-configs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, network, address, label, isActive, sortOrder } = req.body as {
      symbol?: string; network?: string; address?: string;
      label?: string; isActive?: boolean; sortOrder?: number;
    };
    const trimmedAddress = address?.trim() ?? "";
    if (!symbol?.trim() || !network?.trim() || !trimmedAddress) {
      res.status(400).json({ error: "symbol, network, and address are required and must not be blank" });
      return;
    }
    const [config] = await db.insert(cryptoWalletConfigs).values({
      symbol: symbol.trim().toUpperCase(),
      network: network.trim(),
      address: trimmedAddress,
      label: label?.trim() ?? null,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json({ config });
  } catch (err) {
    logger.error({ err }, "Failed to create wallet config");
    res.status(500).json({ error: "Failed to create wallet config" });
  }
});

router.patch("/wallet-configs/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(String(req.params.id));
    const { address, label, isActive, sortOrder, network } = req.body as {
      address?: string; label?: string; isActive?: boolean; sortOrder?: number; network?: string;
    };
    if (address !== undefined && !address.trim()) {
      res.status(400).json({ error: "address must not be blank" });
      return;
    }
    const [config] = await db.update(cryptoWalletConfigs)
      .set({
        ...(address !== undefined && { address: address.trim() }),
        ...(label !== undefined && { label: label?.trim() ?? null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(network !== undefined && { network: network.trim() }),
        updatedAt: new Date(),
      })
      .where(eq(cryptoWalletConfigs.id, id))
      .returning();
    if (!config) {
      res.status(404).json({ error: "Wallet config not found" });
      return;
    }
    res.json({ config });
  } catch (err) {
    logger.error({ err }, "Failed to update wallet config");
    res.status(500).json({ error: "Failed to update wallet config" });
  }
});

router.delete("/wallet-configs/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(String(req.params.id));
    const [deleted] = await db.delete(cryptoWalletConfigs)
      .where(eq(cryptoWalletConfigs.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Wallet config not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete wallet config");
    res.status(500).json({ error: "Failed to delete wallet config" });
  }
});

export default router;
