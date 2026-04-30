import type { Request } from "express";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES_PER_ACCOUNT = 10;
const LOGIN_MAX_ATTEMPTS_PER_IP = 20;

type Bucket = {
  timestamps: number[];
};

const accountFailureBuckets = new Map<string, Bucket>();
const ipAttemptBuckets = new Map<string, Bucket>();

function pruneBucket(bucket: Bucket, now: number): void {
  const cutoff = now - LOGIN_WINDOW_MS;
  let i = 0;
  while (i < bucket.timestamps.length && bucket.timestamps[i] <= cutoff) {
    i++;
  }
  if (i > 0) bucket.timestamps.splice(0, i);
}

function getOrCreate(map: Map<string, Bucket>, key: string): Bucket {
  let b = map.get(key);
  if (!b) {
    b = { timestamps: [] };
    map.set(key, b);
  }
  return b;
}

export type LoginThrottleResult =
  | { allowed: true }
  | { allowed: false; reason: "account" | "ip"; retryAfterMs: number };

export function checkLoginThrottle(
  email: string,
  ip: string,
  now: number = Date.now(),
): LoginThrottleResult {
  const accountBucket = getOrCreate(accountFailureBuckets, email);
  pruneBucket(accountBucket, now);
  if (accountBucket.timestamps.length >= LOGIN_MAX_FAILURES_PER_ACCOUNT) {
    const oldest = accountBucket.timestamps[0] ?? now;
    return {
      allowed: false,
      reason: "account",
      retryAfterMs: Math.max(0, oldest + LOGIN_WINDOW_MS - now),
    };
  }

  const ipBucket = getOrCreate(ipAttemptBuckets, ip);
  pruneBucket(ipBucket, now);
  if (ipBucket.timestamps.length >= LOGIN_MAX_ATTEMPTS_PER_IP) {
    const oldest = ipBucket.timestamps[0] ?? now;
    return {
      allowed: false,
      reason: "ip",
      retryAfterMs: Math.max(0, oldest + LOGIN_WINDOW_MS - now),
    };
  }

  ipBucket.timestamps.push(now);
  return { allowed: true };
}

export function recordLoginFailure(email: string, now: number = Date.now()): void {
  const bucket = getOrCreate(accountFailureBuckets, email);
  pruneBucket(bucket, now);
  bucket.timestamps.push(now);
}

export function clearLoginFailures(email: string): void {
  accountFailureBuckets.delete(email);
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function startLoginThrottleCleanup(): void {
  const timer = setInterval(() => {
    const now = Date.now();
    const cutoff = now - LOGIN_WINDOW_MS;
    for (const [key, bucket] of accountFailureBuckets) {
      while (bucket.timestamps.length && bucket.timestamps[0] <= cutoff) {
        bucket.timestamps.shift();
      }
      if (bucket.timestamps.length === 0) accountFailureBuckets.delete(key);
    }
    for (const [key, bucket] of ipAttemptBuckets) {
      while (bucket.timestamps.length && bucket.timestamps[0] <= cutoff) {
        bucket.timestamps.shift();
      }
      if (bucket.timestamps.length === 0) ipAttemptBuckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  timer.unref?.();
}
