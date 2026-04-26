import { db, users, userSessions, type User } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { hashPassword, generateSessionToken } from "./passwords";
import { logger } from "./logger";

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const PRIMARY_USER = {
  email: "pgeitz@hotmail.com",
  name: "Pgeitz",
  password: "Centuryhacks",
};

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

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(userSessions).values({ userId, token, expiresAt });
  return { token, expiresAt };
}

export async function findUserBySessionToken(token: string): Promise<User | undefined> {
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
  return row.user;
}

export async function deleteSessionByToken(token: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
}

export async function ensurePrimaryUser(): Promise<void> {
  try {
    const existing = await findUserByEmail(PRIMARY_USER.email);
    if (existing) return;
    const hashed = await hashPassword(PRIMARY_USER.password);
    await db.insert(users).values({
      email: normalizeEmail(PRIMARY_USER.email),
      name: PRIMARY_USER.name,
      passwordHash: hashed.passwordHash,
      passwordSalt: hashed.passwordSalt,
      passwordIterations: hashed.passwordIterations,
    });
    logger.info({ email: PRIMARY_USER.email }, "Seeded primary user account");
  } catch (err) {
    logger.error({ err }, "Failed to seed primary user account");
  }
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
