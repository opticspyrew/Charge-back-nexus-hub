import { db, loginThrottleAttempts } from "@workspace/db";
import { and, eq, gte, lt, min, sql } from "drizzle-orm";
import { logger } from "./logger";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES_PER_ACCOUNT = 10;
const LOGIN_MAX_ATTEMPTS_PER_IP = 20;

const ACCOUNT_SCOPE = "account";
const IP_SCOPE = "ip";

export type LoginThrottleResult =
  | { allowed: true }
  | { allowed: false; reason: "account" | "ip"; retryAfterMs: number };

async function countAndOldest(
  scope: string,
  key: string,
  cutoff: Date,
): Promise<{ count: number; oldest: Date | null }> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      oldest: min(loginThrottleAttempts.occurredAt),
    })
    .from(loginThrottleAttempts)
    .where(
      and(
        eq(loginThrottleAttempts.scope, scope),
        eq(loginThrottleAttempts.key, key),
        gte(loginThrottleAttempts.occurredAt, cutoff),
      ),
    );
  return {
    count: row?.count ?? 0,
    oldest: (row?.oldest as Date | null | undefined) ?? null,
  };
}

export async function checkLoginThrottle(
  email: string,
  ip: string,
  now: number = Date.now(),
): Promise<LoginThrottleResult> {
  const cutoff = new Date(now - LOGIN_WINDOW_MS);

  const account = await countAndOldest(ACCOUNT_SCOPE, email, cutoff);
  if (account.count >= LOGIN_MAX_FAILURES_PER_ACCOUNT) {
    const oldestMs = account.oldest ? account.oldest.getTime() : now;
    return {
      allowed: false,
      reason: "account",
      retryAfterMs: Math.max(0, oldestMs + LOGIN_WINDOW_MS - now),
    };
  }

  const ipBucket = await countAndOldest(IP_SCOPE, ip, cutoff);
  if (ipBucket.count >= LOGIN_MAX_ATTEMPTS_PER_IP) {
    const oldestMs = ipBucket.oldest ? ipBucket.oldest.getTime() : now;
    return {
      allowed: false,
      reason: "ip",
      retryAfterMs: Math.max(0, oldestMs + LOGIN_WINDOW_MS - now),
    };
  }

  // Record this attempt against the IP bucket so repeated calls — even from
  // many different (possibly nonexistent) accounts — eventually trip the
  // per-IP limit.
  await db.insert(loginThrottleAttempts).values({
    scope: IP_SCOPE,
    key: ip,
    occurredAt: new Date(now),
  });

  return { allowed: true };
}

export async function recordLoginFailure(
  email: string,
  now: number = Date.now(),
): Promise<void> {
  await db.insert(loginThrottleAttempts).values({
    scope: ACCOUNT_SCOPE,
    key: email,
    occurredAt: new Date(now),
  });
}

export async function clearLoginFailures(email: string): Promise<void> {
  await db
    .delete(loginThrottleAttempts)
    .where(
      and(
        eq(loginThrottleAttempts.scope, ACCOUNT_SCOPE),
        eq(loginThrottleAttempts.key, email),
      ),
    );
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

async function pruneExpiredAttempts(now: number = Date.now()): Promise<void> {
  const cutoff = new Date(now - LOGIN_WINDOW_MS);
  try {
    await db
      .delete(loginThrottleAttempts)
      .where(lt(loginThrottleAttempts.occurredAt, cutoff));
  } catch (err) {
    logger.error({ err }, "Failed to prune expired login-throttle attempts");
  }
}

export function startLoginThrottleCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    void pruneExpiredAttempts();
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}
