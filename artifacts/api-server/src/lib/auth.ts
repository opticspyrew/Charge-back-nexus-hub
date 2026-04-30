import { db, users, userSessions, type User, type UserSession } from "@workspace/db";
import { and, eq, isNull, lt, ne } from "drizzle-orm";
import { hashPassword, generateSessionToken } from "./passwords";
import { logger } from "./logger";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)));
  return user;
}

export interface SessionMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSession(
  userId: number,
  metadata: SessionMetadata = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
    ipAddress: metadata.ipAddress ?? null,
    userAgent: metadata.userAgent ?? null,
  });
  return { token, expiresAt };
}

export async function findUserBySessionToken(token: string): Promise<User | undefined> {
  const row = await findSessionWithUser(token);
  return row?.user;
}

export async function findSessionWithUser(
  token: string,
): Promise<{ user: User; session: UserSession } | undefined> {
  const [row] = await db
    .select({
      user: users,
      session: userSessions,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(eq(userSessions.token, token));
  if (!row) return undefined;
  if (row.session.expiresAt.getTime() <= Date.now()) {
    // Expired — clean up and return nothing.
    await db.delete(userSessions).where(eq(userSessions.id, row.session.id));
    return undefined;
  }
  return row;
}

/**
 * Returns true if the user has any session row (active OR expired) matching
 * the given (ipAddress, userAgent) pair. We deliberately do not filter by
 * expiry: a returning user on a previously-known device should not get a
 * "new device" email just because their old session has timed out.
 *
 * `excludeSessionId` lets the caller skip a specific row (e.g. a session
 * they just inserted) so it doesn't match itself.
 *
 * If both ipAddress and userAgent are null/empty we treat that as "unknown"
 * and conservatively return true so we don't fire a "new device" alert just
 * because we happen to be missing metadata.
 */
export async function hasSeenSessionMetadata(params: {
  userId: number;
  ipAddress: string | null;
  userAgent: string | null;
  excludeSessionId?: number;
}): Promise<boolean> {
  const { userId, ipAddress, userAgent, excludeSessionId } = params;
  if (!ipAddress && !userAgent) return true;

  // We deliberately do NOT filter on expiresAt here: a returning user whose
  // old sessions have all expired should still be recognized on the same
  // device they used before, otherwise they would receive a "new device"
  // email every time their inactivity exceeds the session TTL.
  const conditions = [
    eq(userSessions.userId, userId),
    ipAddress
      ? eq(userSessions.ipAddress, ipAddress)
      : isNull(userSessions.ipAddress),
    userAgent
      ? eq(userSessions.userAgent, userAgent)
      : isNull(userSessions.userAgent),
  ];
  if (typeof excludeSessionId === "number") {
    conditions.push(ne(userSessions.id, excludeSessionId));
  }
  const [row] = await db
    .select({ id: userSessions.id })
    .from(userSessions)
    .where(and(...conditions))
    .limit(1);
  return !!row;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

/**
 * Revoke all sessions for a user. If `exceptSessionId` is provided, that
 * session is preserved (used to keep the caller's own session alive after a
 * password change).
 */
export async function deleteAllUserSessions(
  userId: number,
  exceptSessionId?: number,
): Promise<void> {
  if (typeof exceptSessionId === "number") {
    await db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          ne(userSessions.id, exceptSessionId),
        ),
      );
  } else {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
}

export function extractBearerToken(req: { headers: Record<string, unknown> }): string | null {
  const header = req.headers["authorization"];
  if (typeof header !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export function publicUser(user: User): { id: number; email: string; name: string } {
  return { id: user.id, email: user.email, name: user.name };
}
