import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendAdminEmail, newClientEmail, newServiceRequestEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db.select().from(adminClients).where(eq(adminClients.email, normalizedEmail));
    if (existing) {
      res.json({ client: existing, alreadyExists: true, emailSent: false });
      return;
    }

    const [client] = await db.insert(adminClients).values({
      name: name.trim(),
      email: normalizedEmail,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "client_registered",
      clientId: client.id,
      description: `New client registered via CryptoVault: ${client.name} (${client.email})`,
      metadata: { name: client.name, email: client.email },
    });

    const { subject, html } = newClientEmail({ ...client, createdAt: client.createdAt as Date });
    const emailSent = await sendAdminEmail(subject, html);

    logger.info({ clientId: client.id, email: normalizedEmail, emailSent }, "New client registered via public endpoint");
    res.status(201).json({ client, alreadyExists: false, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to register client via public endpoint");
    res.status(500).json({ error: "Failed to register client" });
  }
});

router.post("/request", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, type, amount, currency, notes } = req.body as {
      name?: string; email?: string;
      type?: string; amount?: string; currency?: string; notes?: string;
    };

    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let [client] = await db.select().from(adminClients).where(eq(adminClients.email, normalizedEmail));

    if (!client) {
      const [newClient] = await db.insert(adminClients).values({
        name: name?.trim() ?? normalizedEmail.split("@")[0],
        email: normalizedEmail,
        status: "pending",
      }).returning();
      client = newClient;

      await db.insert(adminActivityLog).values({
        eventType: "client_registered",
        clientId: client.id,
        description: `Client auto-created from service request: ${client.name} (${client.email})`,
        metadata: { name: client.name, email: client.email },
      });
    }

    const [request] = await db.insert(adminServiceRequests).values({
      clientId: client.id,
      type: type ?? "withdrawal",
      amount: amount ? String(amount) : null,
      currency: currency ?? "USD",
      notes: notes?.trim() ?? null,
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "service_request_submitted",
      clientId: client.id,
      description: `${type ?? "withdrawal"} request from ${client.name}: ${currency ?? "USD"} ${amount ?? "N/A"}`,
      metadata: { type, amount, currency },
    });

    const { subject, html } = newServiceRequestEmail({
      client: { name: client.name, email: client.email },
      request: { ...request, createdAt: request.createdAt as Date },
    });
    const emailSent = await sendAdminEmail(subject, html);

    logger.info({ clientId: client.id, requestId: request.id, type, emailSent }, "Service request submitted via public endpoint");
    res.status(201).json({ request, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to submit service request via public endpoint");
    res.status(500).json({ error: "Failed to submit request" });
  }
});

export default router;
