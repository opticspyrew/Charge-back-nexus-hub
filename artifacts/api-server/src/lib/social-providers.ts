export type SocialProvider = "google" | "apple";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export interface AppleConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function decodeApplePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN PRIVATE KEY")) return trimmed;
  // Support base64-encoded .p8 contents pasted as a single line.
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    if (decoded.includes("BEGIN PRIVATE KEY")) return decoded;
  } catch {
    // fall through
  }
  return trimmed;
}

export function getAppleConfig(): AppleConfig | null {
  const clientId = process.env.APPLE_OAUTH_CLIENT_ID?.trim();
  const teamId = process.env.APPLE_OAUTH_TEAM_ID?.trim();
  const keyId = process.env.APPLE_OAUTH_KEY_ID?.trim();
  const rawKey = process.env.APPLE_OAUTH_PRIVATE_KEY?.trim();
  if (!clientId || !teamId || !keyId || !rawKey) return null;
  return { clientId, teamId, keyId, privateKey: decodeApplePrivateKey(rawKey) };
}

export function isProviderConfigured(provider: SocialProvider): boolean {
  return provider === "google" ? !!getGoogleConfig() : !!getAppleConfig();
}
