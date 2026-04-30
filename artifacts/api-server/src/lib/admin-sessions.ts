import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { adminSessions } from "@workspace/db";
import { and, eq, gt, lt } from "drizzle-orm";
import { logger } from "./logger";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(meta: { ipAddress?: string | null; userAgent?: string | null }): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(adminSessions).values({
    tokenHash,
    expiresAt,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return { token, expiresAt };
}

export async function validateAdminSession(token: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ id: adminSessions.id, tokenHash: adminSessions.tokenHash })
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())));
  if (!row) return false;
  const a = Buffer.from(row.tokenHash, "hex");
  const b = Buffer.from(tokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function deleteAdminSession(token: string): Promise<void> {
  if (!token || typeof token !== "string") return;
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token)));
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startAdminSessionCleanup(): void {
  if (cleanupTimer) return;
  const tick = async () => {
    try {
      await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
    } catch (err) {
      logger.warn({ err }, "admin session cleanup failed");
    }
  };
  cleanupTimer = setInterval(tick, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();
  void tick();
}
