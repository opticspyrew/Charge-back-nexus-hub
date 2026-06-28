import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db, pool } from "@workspace/db";
import { adminClients, adminServiceRequests, adminActivityLog } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { extractBearerToken, findUserBySessionToken } from "../lib/auth";
import { sendAdminEmail, newServiceRequestEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

// ---------------------------------------------------------------------------
// Refunds.site homepage content.
//
// The marketing homepage used to render from hard-coded mock data shipped in
// the frontend bundle. These endpoints make it render from the backend
// instead: the recovery statistics and the trend chart are computed from real
// service-request rows, while the recovery categories are content the backend
// owns as the source of truth.
// ---------------------------------------------------------------------------

interface RecoveryStat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  caption: string;
}

interface RecoveryCategory {
  id: string;
  name: string;
  icon: string;
  summary: string;
  signals: string[];
}

interface RecoveryTrendPoint {
  month: string;
  recoveredUsd: number;
  casesOpened: number;
}

const RECOVERY_CATEGORIES: RecoveryCategory[] = [
  {
    id: "phishing",
    name: "Phishing & approval drains",
    icon: "ScanLine",
    summary:
      "Malicious signature requests and token-approval exploits that silently drain wallets after a single interaction.",
    signals: ["Unlimited approvals", "Drainer contracts", "Spoofed dApps"],
  },
  {
    id: "wallet-compromise",
    name: "Wallet compromise",
    icon: "KeyRound",
    summary:
      "Leaked seed phrases, malware, and SIM-swap takeovers leading to unauthorized transfers from self-custody wallets.",
    signals: ["Seed exposure", "Clipboard malware", "SIM swap"],
  },
  {
    id: "investment-fraud",
    name: "Investment & romance fraud",
    icon: "HeartCrack",
    summary:
      "Long-con schemes routing victim deposits through layered wallets and fraudulent trading platforms.",
    signals: ["Fake platforms", "Pig-butchering", "Layered deposits"],
  },
  {
    id: "contract-exploit",
    name: "Smart contract exploit",
    icon: "Bug",
    summary:
      "Protocol-level exploits — reentrancy, oracle manipulation, and bridge attacks — that move pooled funds at scale.",
    signals: ["Reentrancy", "Oracle abuse", "Bridge attack"],
  },
  {
    id: "exchange-incident",
    name: "Exchange & custodian incident",
    icon: "Building2",
    summary:
      "Frozen, misdirected, or withheld balances at centralized venues requiring documented counterparty engagement.",
    signals: ["Frozen funds", "Wrong network", "Withdrawal holds"],
  },
  {
    id: "business-email",
    name: "Business payment redirection",
    icon: "Mailbox",
    summary:
      "Compromised invoicing and payment instructions that redirect corporate crypto settlements to attacker wallets.",
    signals: ["Invoice fraud", "Vendor spoof", "Treasury loss"],
  },
];

const HOMEPAGE_CACHE_TTL_MS = 30_000;
let homepageCache: {
  payload: { stats: RecoveryStat[]; categories: RecoveryCategory[]; trend: RecoveryTrendPoint[] };
  fetchedAt: number;
} | null = null;

async function computeStats(): Promise<RecoveryStat[]> {
  const { rows } = await pool.query<{
    total_cases: string;
    reported_usd: string;
    recovered_usd: string;
    avg_resolution_hours: string | null;
  }>(`
    SELECT
      COUNT(*)::text AS total_cases,
      COALESCE(SUM(amount), 0)::text AS reported_usd,
      COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)::text AS recovered_usd,
      ROUND(
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)
          FILTER (WHERE status IN ('approved', 'processing')),
        1
      )::text AS avg_resolution_hours
    FROM admin_service_requests
  `);

  const r = rows[0];
  const totalCases = Number(r?.total_cases ?? 0);
  const reportedUsd = Math.round(Number(r?.reported_usd ?? 0));
  const recoveredUsd = Math.round(Number(r?.recovered_usd ?? 0));
  const avgHours = r?.avg_resolution_hours != null ? Number(r.avg_resolution_hours) : 0;

  return [
    {
      id: "assets-traced",
      label: "Assets traced",
      value: reportedUsd,
      prefix: "$",
      caption: "Cumulative reported value across every intake case on the platform.",
    },
    {
      id: "funds-recovered",
      label: "Funds recovered",
      value: recoveredUsd,
      prefix: "$",
      caption: "Value released on cases that reached an approved recovery outcome.",
    },
    {
      id: "cases",
      label: "Cases investigated",
      value: totalCases,
      caption: "Forensic intake cases opened and worked since platform inception.",
    },
    {
      id: "resolution",
      label: "Avg. resolution",
      value: avgHours,
      decimals: 1,
      suffix: "h",
      caption: "Average time from intake to a scored recoverability decision.",
    },
  ];
}

async function computeTrend(): Promise<RecoveryTrendPoint[]> {
  const { rows } = await pool.query<{
    month: string;
    cases_opened: string;
    recovered_usd: string;
  }>(`
    WITH months AS (
      SELECT date_trunc('month', (now() - (n || ' month')::interval)) AS m
      FROM generate_series(7, 0, -1) AS n
    )
    SELECT
      to_char(months.m, 'Mon') AS month,
      COALESCE(COUNT(r.id), 0)::text AS cases_opened,
      COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'approved'), 0)::text AS recovered_usd
    FROM months
    LEFT JOIN admin_service_requests r
      ON date_trunc('month', r.created_at) = months.m
    GROUP BY months.m
    ORDER BY months.m
  `);

  return rows.map((row) => ({
    month: row.month,
    casesOpened: Number(row.cases_opened),
    recoveredUsd: Math.round(Number(row.recovered_usd)),
  }));
}

router.get("/homepage", async (_req: Request, res: Response): Promise<void> => {
  const now = Date.now();
  if (homepageCache && now - homepageCache.fetchedAt < HOMEPAGE_CACHE_TTL_MS) {
    res.json(homepageCache.payload);
    return;
  }

  try {
    const [stats, trend] = await Promise.all([computeStats(), computeTrend()]);
    const payload = { stats, categories: RECOVERY_CATEGORIES, trend };
    homepageCache = { payload, fetchedAt: now };
    res.json(payload);
  } catch (err) {
    logger.error({ err }, "Failed to build refunds homepage payload");
    res.status(500).json({ error: "Failed to load homepage data" });
  }
});

// ---------------------------------------------------------------------------
// Case intake submission.
//
// The portal's multi-step intake form used to be a no-op that flipped a local
// "submitted" flag. This endpoint persists the intake as a real service
// request for the signed-in user and returns a human-readable case reference.
// ---------------------------------------------------------------------------

const intakeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, "Refunds intake rate limit exceeded");
    res.status(429).json({ error: "Too many requests, please try again in a minute." });
  },
});

function caseReference(id: number, createdAt: Date): string {
  return `RF-${createdAt.getUTCFullYear()}-${String(id).padStart(4, "0")}`;
}

// The intake handler stores the structured incident/asset/chain values inside
// the free-text `notes` column. Parse them back out so the client-facing case
// list can present them as discrete fields without a schema change.
function parseIntakeNotes(notes: string | null): {
  incident: string | null;
  asset: string | null;
  chain: string | null;
} {
  if (!notes) return { incident: null, asset: null, chain: null };
  const incident = notes.match(/^Incident type:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const assetChain = notes.match(/^Asset \/ chain:\s*(.+?)\s+on\s+(.+)$/m);
  return {
    incident,
    asset: assetChain?.[1]?.trim() ?? null,
    chain: assetChain?.[2]?.trim() ?? null,
  };
}

router.post("/intake", intakeLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const user = token ? await findUserBySessionToken(token) : undefined;
    if (!user) {
      res.status(401).json({ error: "Sign in required to submit a case." });
      return;
    }

    const { incident, asset, chain, amount, txHashes, evidenceCount } = req.body as {
      incident?: string;
      asset?: string;
      chain?: string;
      amount?: string;
      txHashes?: string;
      evidenceCount?: number;
    };

    if (!incident || !asset || !chain) {
      res.status(400).json({ error: "Incident type, asset, and chain are required." });
      return;
    }

    // `amount` is optional, but when present it must be a real, non-negative
    // number that fits the numeric(14, 2) column (max 999,999,999,999.99).
    // Otherwise a malformed value like "1.2.3" — or a non-string JSON payload
    // (number/object/array) that would throw on string ops — reaches Postgres
    // as a cast and surfaces as a 500 instead of a clean 400.
    const amountInvalid = () => {
      res.status(400).json({
        error: "Loss amount must be a valid non-negative number.",
      });
    };

    if (amount != null && typeof amount !== "string") {
      amountInvalid();
      return;
    }

    const normalizedAmount = amount ? amount.replace(/,/g, "").trim() : "";
    if (normalizedAmount) {
      const AMOUNT_UPPER_BOUND = 1_000_000_000_000; // exclusive; numeric(14, 2) caps at 12 integer digits
      const parsedAmount = Number(normalizedAmount);
      const isWellFormed = /^\d+(\.\d+)?$/.test(normalizedAmount);
      if (
        !isWellFormed ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount < 0 ||
        parsedAmount >= AMOUNT_UPPER_BOUND
      ) {
        amountInvalid();
        return;
      }
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    let [client] = await db
      .select()
      .from(adminClients)
      .where(eq(adminClients.email, normalizedEmail));

    if (!client) {
      const [newClient] = await db
        .insert(adminClients)
        .values({
          name: user.name?.trim() || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          status: "pending",
        })
        .returning();
      client = newClient;

      await db.insert(adminActivityLog).values({
        eventType: "client_registered",
        clientId: client.id,
        description: `Client auto-created from case intake: ${client.name} (${client.email})`,
        metadata: { name: client.name, email: client.email },
      });
    }

    const noteLines = [
      `Incident type: ${incident}`,
      `Asset / chain: ${asset} on ${chain}`,
      evidenceCount ? `Evidence files attached: ${evidenceCount}` : null,
      txHashes?.trim() ? `Transaction hashes:\n${txHashes.trim()}` : null,
    ].filter(Boolean);

    const [request] = await db
      .insert(adminServiceRequests)
      .values({
        clientId: client.id,
        type: "recovery_case",
        amount: normalizedAmount ? normalizedAmount : null,
        currency: "USD",
        notes: noteLines.join("\n"),
        status: "pending",
      })
      .returning();

    await db.insert(adminActivityLog).values({
      eventType: "service_request_submitted",
      clientId: client.id,
      description: `Recovery case intake from ${client.name}: ${incident} (${asset}/${chain})`,
      metadata: { type: "recovery_case", incident, asset, chain, amount: normalizedAmount || null },
    });

    const reference = caseReference(request.id, request.createdAt as Date);

    const { subject, html } = newServiceRequestEmail({
      client: { name: client.name, email: client.email },
      request: { ...request, type: "Recovery Case Intake", createdAt: request.createdAt as Date },
    });
    const emailSent = await sendAdminEmail(subject, html);

    // A new intake changes the homepage aggregates, so drop the cache.
    homepageCache = null;

    logger.info(
      { clientId: client.id, requestId: request.id, emailSent },
      "Recovery case intake submitted",
    );
    res.status(201).json({ reference, requestId: request.id });
  } catch (err) {
    logger.error({ err }, "Failed to submit recovery case intake");
    res.status(500).json({ error: "Failed to submit case intake" });
  }
});

// ---------------------------------------------------------------------------
// "My cases" — authenticated case list.
//
// Returns only the recovery cases belonging to the signed-in user, resolved
// from their email to an admin_clients row. Other request types and other
// clients' cases are never returned.
// ---------------------------------------------------------------------------

router.get("/cases", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const user = token ? await findUserBySessionToken(token) : undefined;
    if (!user) {
      res.status(401).json({ error: "Sign in required to view your cases." });
      return;
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const [client] = await db
      .select()
      .from(adminClients)
      .where(eq(adminClients.email, normalizedEmail));

    // No client row means the user has never filed a case.
    if (!client) {
      res.json({ cases: [] });
      return;
    }

    const rows = await db
      .select()
      .from(adminServiceRequests)
      .where(
        and(
          eq(adminServiceRequests.clientId, client.id),
          eq(adminServiceRequests.type, "recovery_case"),
        ),
      )
      .orderBy(desc(adminServiceRequests.createdAt));

    const cases = rows.map((row) => {
      const { incident, asset, chain } = parseIntakeNotes(row.notes);
      const createdAt = row.createdAt as Date;
      return {
        id: row.id,
        reference: caseReference(row.id, createdAt),
        incident,
        asset,
        chain,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        submittedAt: createdAt.toISOString(),
      };
    });

    res.json({ cases });
  } catch (err) {
    logger.error({ err }, "Failed to load client recovery cases");
    res.status(500).json({ error: "Failed to load your cases" });
  }
});

// ---------------------------------------------------------------------------
// Case report — composed forensic report for a single owned case.
//
// Builds a structured, exportable report from the signed-in client's own case
// record and their investigation activity. Ownership is enforced: the case must
// resolve to the caller's client row, so one client can never read another's
// report. This reads from our own datastore today; when the Manus integration
// lands, the backend sync populates these same tables, so this endpoint and the
// frontend that consumes it stay unchanged.
// ---------------------------------------------------------------------------

function referenceToId(reference: string): number | null {
  const match = /^RF-\d{4}-(\d+)$/.exec(reference.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseTxHashes(notes: string | null): string[] {
  if (!notes) return [];
  const block = notes.match(/Transaction hashes:\s*\n([\s\S]*)$/);
  if (!block) return [];
  return block[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

router.get("/reports/:reference", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    const user = token ? await findUserBySessionToken(token) : undefined;
    if (!user) {
      res.status(401).json({ error: "Sign in required to view reports." });
      return;
    }

    const referenceParam = Array.isArray(req.params.reference)
      ? req.params.reference[0]
      : req.params.reference;
    const id = referenceToId(referenceParam ?? "");
    if (!id) {
      res.status(400).json({ error: "Invalid case reference." });
      return;
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const [client] = await db
      .select()
      .from(adminClients)
      .where(eq(adminClients.email, normalizedEmail));

    if (!client) {
      res.status(404).json({ error: "Case not found." });
      return;
    }

    const [row] = await db
      .select()
      .from(adminServiceRequests)
      .where(
        and(
          eq(adminServiceRequests.id, id),
          eq(adminServiceRequests.clientId, client.id),
          eq(adminServiceRequests.type, "recovery_case"),
        ),
      );

    if (!row) {
      res.status(404).json({ error: "Case not found." });
      return;
    }

    const createdAt = row.createdAt as Date;
    if (caseReference(row.id, createdAt) !== (referenceParam ?? "").trim()) {
      res.status(404).json({ error: "Case not found." });
      return;
    }

    const { incident, asset, chain } = parseIntakeNotes(row.notes);

    const activityRows = await db
      .select()
      .from(adminActivityLog)
      .where(eq(adminActivityLog.clientId, client.id))
      .orderBy(desc(adminActivityLog.createdAt))
      .limit(50);

    const report = {
      reference: caseReference(row.id, createdAt),
      generatedAt: new Date().toISOString(),
      firm: {
        legalName: "NETSPYWORLD FORENSICS LTD",
        brand: "Netspy-World Forensics",
        jurisdictionNote:
          "Findings are based on information available at time of generation. Outcomes depend on jurisdiction, counterparty cooperation, and the underlying asset — recovery is never guaranteed.",
      },
      client: { name: client.name, email: client.email },
      case: {
        id: row.id,
        reference: caseReference(row.id, createdAt),
        incident,
        asset,
        chain,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        submittedAt: createdAt.toISOString(),
        txHashes: parseTxHashes(row.notes),
      },
      activity: activityRows.map((a) => ({
        at: (a.createdAt as Date).toISOString(),
        eventType: a.eventType,
        description: a.description,
      })),
    };

    res.json({ report });
  } catch (err) {
    logger.error({ err }, "Failed to build case report");
    res.status(500).json({ error: "Failed to build report" });
  }
});

export default router;
