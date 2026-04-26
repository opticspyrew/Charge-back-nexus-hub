import { Router, type Request, type Response } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/passwords";
import {
  createSession,
  deleteSessionByToken,
  ensurePrimaryUser,
  extractBearerToken,
  findUserByEmail,
  findUserBySessionToken,
  normalizeEmail,
  publicUser,
} from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

const MIN_PASSWORD_LENGTH = 8;

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "p@ssword", "p@ssw0rd",
  "qwerty", "qwerty123", "qwertyuiop", "12345678", "123456789", "1234567890",
  "11111111", "00000000", "abc12345", "abcd1234", "letmein", "letmein1",
  "welcome", "welcome1", "iloveyou", "admin123", "administrator",
  "monkey123", "football", "baseball", "starwars", "trustno1",
  "sunshine", "princess", "dragon123", "master123", "superman", "batman123",
]);

function validatePassword(password: string): { ok: boolean; error?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: "That password is too common. Please choose a less guessable one." };
  }
  const classes = new Set<string>();
  for (const ch of password) {
    if (/[A-Za-z]/.test(ch)) classes.add("letter");
    else if (/[0-9]/.test(ch)) classes.add("digit");
    else classes.add("symbol");
  }
  if (classes.size < 2) {
    return { ok: false, error: "Password must mix at least two of: letters, numbers, and symbols." };
  }
  return { ok: true };
}

router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string;
    };
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required." });
      return;
    }
    const trimmedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    if (!trimmedName) {
      res.status(400).json({ error: "Name is required." });
      return;
    }
    if (!normalizedEmail.includes("@")) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      res.status(400).json({ error: passwordCheck.error ?? "Please choose a stronger password." });
      return;
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      return;
    }

    const hashed = await hashPassword(password);
    const [user] = await db.insert(users).values({
      email: normalizedEmail,
      name: trimmedName,
      passwordHash: hashed.passwordHash,
      passwordSalt: hashed.passwordSalt,
      passwordIterations: hashed.passwordIterations,
    }).returning();

    const session = await createSession(user.id);

    logger.info({ userId: user.id, email: user.email }, "User signed up");
    res.status(201).json({
      user: publicUser(user),
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to sign up user");
    res.status(500).json({ error: "Failed to create account." });
  }
});

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }
    await ensurePrimaryUser();

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const ok = await verifyPassword(password, {
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      passwordIterations: user.passwordIterations,
    });
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const session = await createSession(user.id);
    logger.info({ userId: user.id, email: user.email }, "User signed in");
    res.json({
      user: publicUser(user),
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to sign in user");
    res.status(500).json({ error: "Failed to sign in." });
  }
});

router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      await deleteSessionByToken(token);
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to log out");
    res.status(500).json({ error: "Failed to log out." });
  }
});

router.post("/exists", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) {
      res.json({ exists: false });
      return;
    }
    await ensurePrimaryUser();
    const user = await findUserByEmail(normalized);
    res.json({ exists: !!user });
  } catch (err) {
    logger.error({ err }, "Failed to check account existence");
    res.status(500).json({ error: "Failed to look up account." });
  }
});

router.post("/change-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "You must be signed in to change your password." });
      return;
    }
    const sessionUser = await findUserBySessionToken(token);
    if (!sessionUser) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password are required." });
      return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({ error: "New password must be different from your current password." });
      return;
    }
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      res.status(400).json({ error: passwordCheck.error ?? "Please choose a stronger password." });
      return;
    }
    const ok = await verifyPassword(currentPassword, {
      passwordHash: sessionUser.passwordHash,
      passwordSalt: sessionUser.passwordSalt,
      passwordIterations: sessionUser.passwordIterations,
    });
    if (!ok) {
      res.status(401).json({ error: "Current password is incorrect." });
      return;
    }
    const hashed = await hashPassword(newPassword);
    await db.update(users)
      .set({
        passwordHash: hashed.passwordHash,
        passwordSalt: hashed.passwordSalt,
        passwordIterations: hashed.passwordIterations,
      })
      .where(eq(users.id, sessionUser.id));
    logger.info({ userId: sessionUser.id }, "User changed password");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to change password");
    res.status(500).json({ error: "Failed to change password." });
  }
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, newPassword } = req.body as { email?: string; newPassword?: string };
    if (!email || !newPassword) {
      res.status(400).json({ error: "Email and new password are required." });
      return;
    }
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      res.status(400).json({ error: passwordCheck.error ?? "Please choose a stronger password." });
      return;
    }
    await ensurePrimaryUser();
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "We couldn't find an account with that email address." });
      return;
    }
    const hashed = await hashPassword(newPassword);
    await db.update(users)
      .set({
        passwordHash: hashed.passwordHash,
        passwordSalt: hashed.passwordSalt,
        passwordIterations: hashed.passwordIterations,
      })
      .where(eq(users.id, user.id));
    logger.info({ userId: user.id }, "User reset password");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to reset password");
    res.status(500).json({ error: "Failed to reset password." });
  }
});

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const user = await findUserBySessionToken(token);
    if (!user) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    logger.error({ err }, "Failed to load session user");
    res.status(500).json({ error: "Failed to load session." });
  }
});

export default router;
