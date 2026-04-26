import type { Request } from "express";

export const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
export const FORGOT_PASSWORD_MAX_PER_EMAIL = 3;
export const FORGOT_PASSWORD_MAX_PER_IP = 10;

type Bucket = {
  timestamps: number[];
};

const emailBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function pruneBucket(bucket: Bucket, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < bucket.timestamps.length && bucket.timestamps[i] <= cutoff) {
    i += 1;
  }
  if (i > 0) bucket.timestamps.splice(0, i);
}

function checkBucket(
  buckets: Map<string, Bucket>,
  key: string,
  max: number,
  windowMs: number,
  now: number,
): { allowed: boolean; count: number; retryAfterMs: number } {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  pruneBucket(bucket, now, windowMs);
  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0] ?? now;
    return {
      allowed: false,
      count: bucket.timestamps.length,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }
  bucket.timestamps.push(now);
  return {
    allowed: true,
    count: bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

export type ThrottleResult = {
  allowed: boolean;
  reason?: "email" | "ip";
  emailCount: number;
  ipCount: number;
  retryAfterMs: number;
};

export function checkForgotPasswordThrottle(
  email: string,
  ip: string,
  now: number = Date.now(),
): ThrottleResult {
  // Check email bucket first without consuming, then IP without consuming,
  // then consume both only if both pass. This avoids one scope blocking
  // the other from getting a slot it would have otherwise had.
  const emailBucket = emailBuckets.get(email) ?? { timestamps: [] };
  pruneBucket(emailBucket, now, FORGOT_PASSWORD_WINDOW_MS);
  if (emailBucket.timestamps.length >= FORGOT_PASSWORD_MAX_PER_EMAIL) {
    const oldest = emailBucket.timestamps[0] ?? now;
    return {
      allowed: false,
      reason: "email",
      emailCount: emailBucket.timestamps.length,
      ipCount: ipBuckets.get(ip)?.timestamps.length ?? 0,
      retryAfterMs: Math.max(0, oldest + FORGOT_PASSWORD_WINDOW_MS - now),
    };
  }

  const ipResult = checkBucket(
    ipBuckets,
    ip,
    FORGOT_PASSWORD_MAX_PER_IP,
    FORGOT_PASSWORD_WINDOW_MS,
    now,
  );
  if (!ipResult.allowed) {
    return {
      allowed: false,
      reason: "ip",
      emailCount: emailBucket.timestamps.length,
      ipCount: ipResult.count,
      retryAfterMs: ipResult.retryAfterMs,
    };
  }

  // IP slot consumed above; now consume email slot.
  emailBucket.timestamps.push(now);
  emailBuckets.set(email, emailBucket);

  return {
    allowed: true,
    emailCount: emailBucket.timestamps.length,
    ipCount: ipResult.count,
    retryAfterMs: 0,
  };
}

// Returns the client IP for throttling purposes.
//
// SECURITY: this function intentionally does NOT read X-Forwarded-For or
// X-Real-IP from the request. Trusting those headers directly would let
// an attacker spoof any IP and trivially evade the per-IP throttle.
// Instead, it uses Express's `req.ip`, which is computed from the
// `trust proxy` setting in app.ts (1 trusted hop = the Replit platform
// proxy). With that setting, Express picks the rightmost X-Forwarded-For
// entry — the address the trusted proxy actually saw — and discards any
// client-supplied entries to its left.
export function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

// Periodic cleanup so empty buckets don't accumulate forever.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanupBuckets(map: Map<string, Bucket>, now: number): void {
  const cutoff = now - FORGOT_PASSWORD_WINDOW_MS;
  for (const [key, bucket] of map) {
    while (bucket.timestamps.length && bucket.timestamps[0] <= cutoff) {
      bucket.timestamps.shift();
    }
    if (bucket.timestamps.length === 0) map.delete(key);
  }
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startForgotPasswordThrottleCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    cleanupBuckets(emailBuckets, now);
    cleanupBuckets(ipBuckets, now);
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}

// Test-only: allow tests to reset state.
export function __resetForgotPasswordThrottle(): void {
  emailBuckets.clear();
  ipBuckets.clear();
}
