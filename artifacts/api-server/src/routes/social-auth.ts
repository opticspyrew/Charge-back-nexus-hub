import { Router, type IRouter, type Request, type Response } from "express";
import { db, users, providerIdentities } from "@workspace/db";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  createSession,
  extractBearerToken,
  findSessionWithUser,
  hasSeenSessionMetadata,
  publicUser,
} from "../lib/auth";
import {
  buildAppleAuthUrl,
  buildGoogleAuthUrl,
  clearStateCookie,
  exchangeAppleCode,
  exchangeGoogleCode,
  getProviderConfigStatus,
  pkceChallengeFromVerifier,
  randomToken,
  readStateCookie,
  resolveUserForProviderProfile,
  attachProviderToExistingUser,
  setStateCookie,
  verifyAppleIdToken,
  verifyGoogleIdToken,
  type OAuthStatePayload,
  type ProviderProfile,
} from "../lib/social-oauth";
import {
  getAppleConfig,
  getGoogleConfig,
  isProviderConfigured,
  type SocialProvider,
} from "../lib/social-providers";
import {
  captureSessionMetadata,
  getTrustedAppOrigin,
  notifyNewSignIn,
} from "../lib/login-notifications";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_LANDING_PATH = "/dashboard";
const SIGN_IN_PATH = "/sign-in";
const CONNECTED_ACCOUNTS_PATH = "/connected-accounts";

function callbackUrl(req: Request, provider: SocialProvider): string {
  const origin = getTrustedAppOrigin(req);
  if (!origin) {
    throw new Error("Cannot resolve callback URL: no app origin");
  }
  return `${origin}/api/auth/${provider}/callback`;
}

function redirectToSignInError(res: Response, code: string) {
  res.redirect(`${SIGN_IN_PATH}?social_error=${encodeURIComponent(code)}`);
}

function redirectToConnectedAccounts(res: Response, status: string) {
  res.redirect(`${CONNECTED_ACCOUNTS_PATH}?status=${encodeURIComponent(status)}`);
}

async function startFlow(
  req: Request,
  res: Response,
  provider: SocialProvider,
  opts: { linkUserId?: number } = {},
): Promise<void> {
  if (!isProviderConfigured(provider)) {
    if (opts.linkUserId) {
      redirectToConnectedAccounts(res, `${provider}_not_configured`);
    } else {
      redirectToSignInError(res, `${provider}_not_configured`);
    }
    return;
  }
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken(64);
  const payload: OAuthStatePayload = { state, nonce, codeVerifier };
  if (opts.linkUserId) payload.linkUserId = opts.linkUserId;
  setStateCookie(res, provider, payload);

  try {
    const redirectUri = callbackUrl(req, provider);
    if (provider === "google") {
      const cfg = getGoogleConfig()!;
      const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);
      const url = buildGoogleAuthUrl({
        clientId: cfg.clientId,
        redirectUri,
        state,
        nonce,
        codeChallenge,
      });
      res.redirect(url);
    } else {
      const cfg = getAppleConfig()!;
      const url = buildAppleAuthUrl({
        clientId: cfg.clientId,
        redirectUri,
        state,
        nonce,
      });
      res.redirect(url);
    }
  } catch (err) {
    logger.error({ err, provider }, "social-auth: failed to start flow");
    clearStateCookie(res, provider);
    if (opts.linkUserId) {
      redirectToConnectedAccounts(res, "start_failed");
    } else {
      redirectToSignInError(res, "start_failed");
    }
  }
}

async function loadAuthedUserId(req: Request): Promise<number | null> {
  // Allow either bearer token (when called from the SPA) or a `?token=` query
  // param on the /connect redirect endpoints, since the SPA can't set the
  // Authorization header on a top-level navigation.
  const bearer = extractBearerToken(req);
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const token = bearer ?? queryToken;
  if (!token) return null;
  const row = await findSessionWithUser(token);
  return row?.user.id ?? null;
}

// --- Public config: which providers are enabled ----------------------------

router.get("/providers/config", (_req, res) => {
  res.json({ providers: getProviderConfigStatus() });
});

// --- Authenticated: list & disconnect connected providers ------------------

router.get("/providers/linked", async (req, res) => {
  try {
    const userId = await loadAuthedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const rows = await db
      .select({
        provider: providerIdentities.provider,
        emailAtLink: providerIdentities.emailAtLink,
        linkedAt: providerIdentities.linkedAt,
      })
      .from(providerIdentities)
      .where(eq(providerIdentities.userId, userId));
    res.json({
      providers: getProviderConfigStatus(),
      linked: rows.map((r) => ({
        provider: r.provider,
        email: r.emailAtLink,
        linkedAt: r.linkedAt.toISOString(),
      })),
      hasPassword: !!user.passwordHash,
    });
  } catch (err) {
    logger.error({ err }, "social-auth: failed to list linked providers");
    res.status(500).json({ error: "Failed to load connected accounts." });
  }
});

router.post("/providers/:provider/disconnect", async (req, res) => {
  try {
    const provider = req.params.provider as SocialProvider;
    if (provider !== "google" && provider !== "apple") {
      res.status(400).json({ error: "Unknown provider." });
      return;
    }
    const userId = await loadAuthedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }

    // Don't allow disconnect if it would leave the user with no sign-in method.
    const otherLinks = await db
      .select({ id: providerIdentities.id })
      .from(providerIdentities)
      .where(
        and(
          eq(providerIdentities.userId, userId),
          // anything that's NOT this provider counts as an alternate method
        ),
      );
    const otherProviderCount = otherLinks.filter((l) => {
      // We didn't select provider; re-query lightly:
      return true;
    }).length;
    // Re-fetch with provider info to be precise:
    const allLinks = await db
      .select({ provider: providerIdentities.provider })
      .from(providerIdentities)
      .where(eq(providerIdentities.userId, userId));
    const otherProviders = allLinks.filter((l) => l.provider !== provider).length;
    const hasPassword = !!user.passwordHash;
    if (!hasPassword && otherProviders === 0) {
      res.status(400).json({
        error:
          "You can't disconnect your only sign-in method. Set a password first, or connect another provider.",
      });
      return;
    }

    void otherProviderCount;

    await db
      .delete(providerIdentities)
      .where(
        and(
          eq(providerIdentities.userId, userId),
          eq(providerIdentities.provider, provider),
        ),
      );
    logger.info({ userId, provider }, "social-auth: provider disconnected");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "social-auth: failed to disconnect provider");
    res.status(500).json({ error: "Failed to disconnect provider." });
  }
});

// --- Start / callback for Google -------------------------------------------

router.get("/google/login", (req, res) => {
  void startFlow(req, res, "google");
});

router.get("/google/connect", async (req, res) => {
  const userId = await loadAuthedUserId(req);
  if (!userId) {
    redirectToSignInError(res, "auth_required");
    return;
  }
  void startFlow(req, res, "google", { linkUserId: userId });
});

router.get("/google/callback", async (req, res) => {
  await handleCallback(req, res, "google");
});

// --- Start / callback for Apple --------------------------------------------

router.get("/apple/login", (req, res) => {
  void startFlow(req, res, "apple");
});

router.get("/apple/connect", async (req, res) => {
  const userId = await loadAuthedUserId(req);
  if (!userId) {
    redirectToSignInError(res, "auth_required");
    return;
  }
  void startFlow(req, res, "apple", { linkUserId: userId });
});

// Apple posts back via form_post; accept POST and GET both.
router.post("/apple/callback", async (req, res) => {
  await handleCallback(req, res, "apple");
});
router.get("/apple/callback", async (req, res) => {
  await handleCallback(req, res, "apple");
});

// --- Shared callback handler -----------------------------------------------

async function handleCallback(
  req: Request,
  res: Response,
  provider: SocialProvider,
): Promise<void> {
  const stored = readStateCookie(req, provider);
  clearStateCookie(res, provider);

  const params = req.method === "POST" ? req.body : req.query;
  const queryError = typeof params?.error === "string" ? params.error : null;
  const state = typeof params?.state === "string" ? params.state : null;
  const code = typeof params?.code === "string" ? params.code : null;
  const linking = !!stored?.linkUserId;

  if (queryError) {
    logger.warn({ provider, error: queryError }, "social-auth: provider returned error");
    if (linking) {
      redirectToConnectedAccounts(res, "cancelled");
    } else {
      redirectToSignInError(res, queryError === "user_cancelled_authorize" ? "cancelled" : "provider_error");
    }
    return;
  }
  if (!stored || !state || !code || stored.state !== state) {
    logger.warn({ provider }, "social-auth: missing or mismatched state in callback");
    if (linking) {
      redirectToConnectedAccounts(res, "missing_state");
    } else {
      redirectToSignInError(res, "missing_state");
    }
    return;
  }
  if (!isProviderConfigured(provider)) {
    if (linking) {
      redirectToConnectedAccounts(res, `${provider}_not_configured`);
    } else {
      redirectToSignInError(res, `${provider}_not_configured`);
    }
    return;
  }

  let profile: ProviderProfile;
  try {
    const redirectUri = callbackUrl(req, provider);
    if (provider === "google") {
      const cfg = getGoogleConfig()!;
      const { idToken } = await exchangeGoogleCode({
        code,
        redirectUri,
        codeVerifier: stored.codeVerifier,
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
      });
      profile = await verifyGoogleIdToken({
        idToken,
        clientId: cfg.clientId,
        expectedNonce: stored.nonce,
      });
    } else {
      const cfg = getAppleConfig()!;
      const { idToken } = await exchangeAppleCode({
        code,
        redirectUri,
        cfg,
      });
      let userJson: { name?: { firstName?: string; lastName?: string } } | null = null;
      if (typeof params?.user === "string") {
        try {
          userJson = JSON.parse(params.user);
        } catch {
          userJson = null;
        }
      }
      profile = await verifyAppleIdToken({
        idToken,
        clientId: cfg.clientId,
        expectedNonce: stored.nonce,
        userJson,
      });
    }
  } catch (err) {
    logger.error({ err, provider }, "social-auth: token exchange or verify failed");
    if (linking) {
      redirectToConnectedAccounts(res, "exchange_failed");
    } else {
      redirectToSignInError(res, "exchange_failed");
    }
    return;
  }

  if (!profile.emailVerified || !profile.email) {
    if (linking) {
      redirectToConnectedAccounts(res, "email_unverified");
    } else {
      redirectToSignInError(res, "email_unverified");
    }
    return;
  }

  // Linking flow: attach the provider identity to the already-logged-in user.
  if (stored.linkUserId) {
    const result = await attachProviderToExistingUser(stored.linkUserId, profile);
    if (!result.ok) {
      redirectToConnectedAccounts(
        res,
        result.reason === "already_linked_to_self" ? "already_linked" : "in_use_elsewhere",
      );
      return;
    }
    redirectToConnectedAccounts(res, "connected");
    return;
  }

  // Sign-in / sign-up flow.
  let user;
  try {
    user = await resolveUserForProviderProfile(profile);
  } catch (err) {
    logger.error({ err, provider }, "social-auth: failed to resolve user");
    redirectToSignInError(res, "user_resolve_failed");
    return;
  }

  const metadata = captureSessionMetadata(req);
  let historicallySeen = true;
  try {
    historicallySeen = await hasSeenSessionMetadata({
      userId: user.id,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    });
  } catch (err) {
    logger.error({ err }, "social-auth: hasSeenSessionMetadata failed");
  }

  let token: string;
  try {
    const session = await createSession(user.id, metadata);
    token = session.token;
  } catch (err) {
    logger.error({ err, provider }, "social-auth: failed to create session");
    redirectToSignInError(res, "session_failed");
    return;
  }

  if (!historicallySeen) {
    void notifyNewSignIn({ name: user.name, email: user.email }, metadata, req);
  }

  // Hand off to the SPA via URL fragment (same mechanism as Replit OIDC).
  const target = `${APP_LANDING_PATH}#social_token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`;
  res.redirect(target);
}

export default router;
