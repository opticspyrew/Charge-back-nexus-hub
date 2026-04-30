import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog, cryptoWalletConfigs, coinSectionOrders } from "@workspace/db";
import { asc, eq, inArray } from "drizzle-orm";
import { sendAdminEmail, newClientEmail, newServiceRequestEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

const STATIC_RATES: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, BTC: 1 / 27000 };
const CACHE_TTL_MS = 60_000;
let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;

router.get("/exchange-rates", async (_req: Request, res: Response): Promise<void> => {
  const now = Date.now();
  if (ratesCache && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
    res.json({ rates: ratesCache.rates, cached: true });
    return;
  }

  const rates: Record<string, number> = { ...STATIC_RATES };

  try {
    const [fiatResult, btcResult] = await Promise.allSettled([
      fetch("https://open.er-api.com/v6/latest/USD").then(r => {
        if (!r.ok) throw new Error(`open.er-api returned ${r.status}`);
        return r.json();
      }),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd").then(r => {
        if (!r.ok) throw new Error(`coingecko returned ${r.status}`);
        return r.json();
      }),
    ]);

    if (fiatResult.status === "fulfilled") {
      const data = fiatResult.value as { rates?: Record<string, number> };
      if (data.rates?.EUR) rates.EUR = data.rates.EUR;
      if (data.rates?.GBP) rates.GBP = data.rates.GBP;
    } else {
      logger.warn({ err: fiatResult.reason }, "Fiat rate provider unavailable, using static EUR/GBP");
    }

    if (btcResult.status === "fulfilled") {
      const data = btcResult.value as { bitcoin?: { usd?: number } };
      if (data.bitcoin?.usd && data.bitcoin.usd > 0) {
        rates.BTC = 1 / data.bitcoin.usd;
      }
    } else {
      logger.warn({ err: btcResult.reason }, "BTC rate provider unavailable, using static BTC rate");
    }
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live exchange rates, using static fallback");
  }

  ratesCache = { rates, fetchedAt: now };
  res.json({ rates, cached: false });
});

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

router.get("/tx-approvals", async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = String(req.query.txnIds ?? "").trim();
    if (!raw) {
      res.json({ approvals: [] });
      return;
    }
    const ids = raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);
    if (ids.length === 0) {
      res.json({ approvals: [] });
      return;
    }
    const rows = await db
      .select({ txnId: adminServiceRequests.txnId, status: adminServiceRequests.status })
      .from(adminServiceRequests)
      .where(
        ids.length === 1
          ? eq(adminServiceRequests.txnId, ids[0])
          : inArray(adminServiceRequests.txnId, ids)
      );
    res.json({ approvals: rows.filter(r => r.txnId != null) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch tx approvals");
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

router.post("/request", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, type, amount, currency, notes, txnId } = req.body as {
      name?: string; email?: string;
      type?: string; amount?: string; currency?: string; notes?: string; txnId?: string;
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
      txnId: txnId?.trim() || null,
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

router.post("/payment-confirmation", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, amount, currency, notes } = req.body as {
      name?: string; email?: string; amount?: string; currency?: string; notes?: string;
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
    }

    const [request] = await db.insert(adminServiceRequests).values({
      clientId: client.id,
      type: "payment_confirmation",
      amount: amount ? String(amount) : null,
      currency: currency ?? "USD",
      notes: notes?.trim() ?? "Awaiting admin approval to release funds.",
      status: "pending",
    }).returning();

    await db.insert(adminActivityLog).values({
      eventType: "service_request_submitted",
      clientId: client.id,
      description: `Payment confirmation request from ${client.name}: ${currency ?? "USD"} ${amount ?? "N/A"}`,
      metadata: { type: "payment_confirmation", amount, currency },
    });

    const { subject, html } = newServiceRequestEmail({
      client: { name: client.name, email: client.email },
      request: { ...request, type: "Payment Confirmation", createdAt: request.createdAt as Date },
    });
    const emailSent = await sendAdminEmail(subject, html);

    logger.info({ clientId: client.id, requestId: request.id, emailSent }, "Payment confirmation submitted");
    res.status(201).json({ request, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to submit payment confirmation");
    res.status(500).json({ error: "Failed to submit payment confirmation" });
  }
});

router.get("/request-status/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(String(req.params.id));
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [request] = await db.select().from(adminServiceRequests).where(eq(adminServiceRequests.id, id));
    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({ id: request.id, status: request.status, type: request.type });
  } catch (err) {
    logger.error({ err }, "Failed to fetch request status");
    res.status(500).json({ error: "Failed to fetch request status" });
  }
});

router.get("/wallet-configs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [configs, sectionOrders] = await Promise.all([
      db
        .select()
        .from(cryptoWalletConfigs)
        .where(eq(cryptoWalletConfigs.isActive, true))
        .orderBy(asc(cryptoWalletConfigs.sortOrder), asc(cryptoWalletConfigs.symbol)),
      db
        .select()
        .from(coinSectionOrders)
        .orderBy(asc(coinSectionOrders.sortOrder), asc(coinSectionOrders.symbol)),
    ]);
    const coinOrder = sectionOrders.map(o => o.symbol);
    res.json({ configs, coinOrder });
  } catch (err) {
    logger.error({ err }, "Failed to fetch wallet configs");
    res.status(500).json({ error: "Failed to fetch wallet configs" });
  }
});

export default router;
