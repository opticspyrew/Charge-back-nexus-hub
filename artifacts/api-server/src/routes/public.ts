import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog, cryptoWalletConfigs, coinSectionOrders } from "@workspace/db";
import { asc, eq, inArray } from "drizzle-orm";
import { sendAdminEmail, newClientEmail, newServiceRequestEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

// Per-IP rate limiter for the unauthenticated submission endpoints
// (`/register`, `/request`, `/payment-confirmation`). Each of these routes
// inserts rows and triggers an email to the hard-coded ADMIN_EMAIL inbox,
// so without throttling a single attacker can flood the operational inbox,
// exhaust SMTP quota, and bury legitimate requests in noise.
//
// The numbers below (10 successful writes per IP per minute) are deliberately
// generous for real users — a person registers / submits a withdrawal a few
// times an hour at most — while still capping abusive scripts at a tractable
// rate. We also key by `req.ip` (which is correct because `app.ts` sets
// `trust proxy: 1`), and we explicitly skip non-2xx responses so failed
// attempts don't poison legitimate users' quota.
const publicSubmissionLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, "Public submission rate limit exceeded");
    res.status(429).json({ error: "Too many requests, please try again in a minute." });
  },
});

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

router.post("/register", publicSubmissionLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    // Lookup only the id column. Previously this returned `db.select().from(adminClients)`
    // and serialized the whole row to the unauthenticated caller, which leaked
    // phone, company, status, internal admin notes, and timestamps for any
    // existing customer email. The public endpoint never needs that data — the
    // client only needs to know whether registration succeeded — so we limit
    // the column projection and limit the response payload to a boolean flag.
    const [existing] = await db
      .select({ id: adminClients.id })
      .from(adminClients)
      .where(eq(adminClients.email, normalizedEmail));
    if (existing) {
      res.json({ alreadyExists: true, emailSent: false });
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
    // Only echo back the id of the newly-created row. Internal admin fields
    // (status, notes, phone, company, timestamps) stay server-side.
    res.status(201).json({ client: { id: client.id }, alreadyExists: false, emailSent });
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

router.post("/request", publicSubmissionLimiter, async (req: Request, res: Response): Promise<void> => {
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
    // Return the unguessable `publicToken` so the client can poll status
    // without enabling enumeration of other users' requests by serial id.
    res.status(201).json({ request: { id: request.id, publicToken: request.publicToken }, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to submit service request via public endpoint");
    res.status(500).json({ error: "Failed to submit request" });
  }
});

router.post("/payment-confirmation", publicSubmissionLimiter, async (req: Request, res: Response): Promise<void> => {
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
    // Return the unguessable `publicToken` so the invoice page can poll
    // status without exposing the predictable serial id to attackers.
    res.status(201).json({ request: { id: request.id, publicToken: request.publicToken }, emailSent });
  } catch (err) {
    logger.error({ err }, "Failed to submit payment confirmation");
    res.status(500).json({ error: "Failed to submit payment confirmation" });
  }
});

// Public status lookup is keyed by the unguessable `publicToken` issued at
// submission time (see `/request` and `/payment-confirmation`). The previous
// version of this route accepted the serial primary key and returned status
// for any existing row, which let an unauthenticated attacker enumerate
// pending/approved/denied state for every other user's request by sweeping
// `1, 2, 3, ...`. Switching to a 36-char random token effectively requires
// the caller to already know the token, which only the submitting client
// receives in the response body of the matching POST.
router.get("/request-status/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token ?? "").trim();
    // Defense-in-depth: require the path segment to look like the UUID format
    // we issue (`gen_random_uuid()`), so callers cannot probe the endpoint
    // with arbitrary short strings to learn anything beyond a generic 404.
    const isValidToken = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(token);
    if (!isValidToken) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    const [request] = await db
      .select({ id: adminServiceRequests.id, status: adminServiceRequests.status, type: adminServiceRequests.type })
      .from(adminServiceRequests)
      .where(eq(adminServiceRequests.publicToken, token));
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
    const rawConfigs = await db
      .select()
      .from(cryptoWalletConfigs)
      .where(eq(cryptoWalletConfigs.isActive, true))
      .orderBy(asc(cryptoWalletConfigs.sortOrder), asc(cryptoWalletConfigs.symbol));
    let coinOrder: string[] = [];
    try {
      const sectionOrders = await db
        .select()
        .from(coinSectionOrders)
        .orderBy(asc(coinSectionOrders.sortOrder), asc(coinSectionOrders.symbol));
      coinOrder = sectionOrders.map(o => o.symbol);
    } catch (orderErr) {
      const code = (orderErr as { code?: string } | null)?.code;
      if (code === "42P01") {
        logger.warn("coin_section_orders table missing; returning empty coinOrder");
      } else {
        logger.error({ err: orderErr }, "Failed to fetch coin section orders");
        res.status(500).json({ error: "Failed to fetch wallet configs" });
        return;
      }
    }
    const orderRank = new Map<string, number>(coinOrder.map((s, i) => [s, i]));
    const configs = [...rawConfigs].sort((a, b) => {
      const ar = orderRank.has(a.symbol) ? (orderRank.get(a.symbol) as number) : Number.MAX_SAFE_INTEGER;
      const br = orderRank.has(b.symbol) ? (orderRank.get(b.symbol) as number) : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id - b.id;
    });
    res.json({ configs, coinOrder });
  } catch (err) {
    logger.error({ err }, "Failed to fetch wallet configs");
    res.status(500).json({ error: "Failed to fetch wallet configs" });
  }
});

export default router;
