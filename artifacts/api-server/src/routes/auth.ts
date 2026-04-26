import { Router, type Request, type Response } from "express";
import { db, users, passwordResetTokens } from "@workspace/db";
import { and, eq, isNull, gt } from "drizzle-orm";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from "../lib/passwords";
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
import {
  passwordChangedEmail,
  passwordResetEmail,
  sendUserEmail,
} from "../lib/email";

const SUPPORT_EMAIL = "Opticspycrew@gmail.com";

async function notifyPasswordChanged(
  user: { name: string; email: string },
  method: "reset" | "change",
): Promise<void> {
  try {
    const { subject, html } = passwordChangedEmail({
      name: user.name,
      email: user.email,
      changedAt: new Date(),
      method,
      supportEmail: SUPPORT_EMAIL,
    });
    const sent = await sendUserEmail(user.email, subject, html);
    logger.info(
      { email: user.email, method, sent },
      sent
        ? "Password-changed notification email sent"
        : "Password-changed notification email could not be sent",
    );
  } catch (err) {
    // Never let a failed notification break the underlying password
    // operation — it has already succeeded.
    logger.error(
      { err, email: user.email, method },
      "Failed to send password-changed notification email",
    );
  }
}

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes
const RESET_TOKEN_TTL_MINUTES = 30;

function getTrustedAppOrigin(): string | null {
  const configured = process.env.APP_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  // REPLIT_DEV_DOMAIN is supplied by the platform, not by the request,
  // so it's safe to use as a fallback for development environments.
  const replitDev = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (replitDev) {
    return `https://${replitDev.replace(/\/$/, "")}`;
  }
  return null;
}

function buildResetUrl(token: string): string | null {
  const origin = getTrustedAppOrigin();
  if (!origin) return null;
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

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
    void notifyPasswordChanged(
      { name: sessionUser.name, email: sessionUser.email },
      "change",
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to change password");
    res.status(500).json({ error: "Failed to change password." });
  }
});

router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  // Always return 200 OK regardless of whether the account exists, the
  // payload was malformed, or anything internal failed. This prevents
  // attackers from enumerating which emails are registered.
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string") {
      res.json({ ok: true });
      return;
    }

    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) {
      res.json({ ok: true });
      return;
    }

    await ensurePrimaryUser();
    const user = await findUserByEmail(normalized);
    if (!user) {
      logger.info({ email: normalized }, "Password reset requested for unknown account");
      res.json({ ok: true });
      return;
    }

    // Invalidate any outstanding reset tokens for this user so old links can't
    // be used after a fresh request.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    const rawToken = generateResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = buildResetUrl(rawToken);
    if (!resetUrl) {
      logger.error(
        { userId: user.id },
        "Cannot send password reset email: APP_PUBLIC_URL (or REPLIT_DEV_DOMAIN) is not configured.",
      );
    } else {
      const { subject, html } = passwordResetEmail({
        name: user.name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
      const emailSent = await sendUserEmail(user.email, subject, html);
      logger.info(
        { userId: user.id, emailSent },
        emailSent
          ? "Password reset email sent"
          : "Password reset token issued but email could not be sent",
      );
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to process forgot-password request");
    // Even on internal errors, respond 200 to avoid leaking information.
    res.json({ ok: true });
  }
});

async function loadValidResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const [row] = await db
    .select({
      reset: passwordResetTokens,
      user: users,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    );
  return row;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

router.get("/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      res.status(400).json({ valid: false, error: "Missing reset token." });
      return;
    }
    const row = await loadValidResetToken(token);
    if (!row) {
      res.status(400).json({
        valid: false,
        error: "This password reset link is invalid or has expired. Please request a new one.",
      });
      return;
    }
    res.json({
      valid: true,
      email: maskEmail(row.user.email),
      expiresAt: row.reset.expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to validate reset token");
    res.status(500).json({ valid: false, error: "Failed to validate reset link." });
  }
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      res.status(400).json({ error: "Reset token and new password are required." });
      return;
    }
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      res.status(400).json({ error: passwordCheck.error ?? "Please choose a stronger password." });
      return;
    }

    const row = await loadValidResetToken(token);
    if (!row) {
      res.status(400).json({
        error: "This password reset link is invalid or has expired. Please request a new one.",
      });
      return;
    }

    // Atomically claim the token: only proceed if exactly one row was
    // updated (i.e. the token is still unused and unexpired). This closes
    // the race window between validating and consuming the token if two
    // requests arrive concurrently with the same link.
    const claimed = await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.id, row.reset.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .returning({ id: passwordResetTokens.id });
    if (claimed.length !== 1) {
      res.status(400).json({
        error: "This password reset link is invalid or has expired. Please request a new one.",
      });
      return;
    }

    const hashed = await hashPassword(newPassword);
    await db.update(users)
      .set({
        passwordHash: hashed.passwordHash,
        passwordSalt: hashed.passwordSalt,
        passwordIterations: hashed.passwordIterations,
      })
      .where(eq(users.id, row.user.id));

    // Sign the user in immediately so they don't have to re-enter their new password.
    const session = await createSession(row.user.id);
    logger.info({ userId: row.user.id }, "User reset password via email link");
    void notifyPasswordChanged(
      { name: row.user.name, email: row.user.email },
      "reset",
    );
    res.json({
      user: publicUser(row.user),
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
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
