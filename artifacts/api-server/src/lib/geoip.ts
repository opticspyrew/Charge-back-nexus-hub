import { logger } from "./logger.js";

const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const LOOKUP_TIMEOUT_MS = 1500;

// Privacy/egress kill-switch. ip-api.com's free tier is HTTP-only, which
// means client IPs (PII) cross the wire in plaintext. Set
// GEOIP_LOOKUP_ENABLED=false to disable all outbound lookups in
// privacy-sensitive deployments; the Recent Activity panel will then fall
// back to showing the raw IP for every row.
function lookupEnabled(): boolean {
  const flag = (process.env.GEOIP_LOOKUP_ENABLED ?? "true").trim().toLowerCase();
  return flag !== "false" && flag !== "0" && flag !== "no" && flag !== "off";
}

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
// Promises currently in flight, keyed by normalized IP. Coalescing here
// means if two simultaneous /sessions calls (or two rows in the same
// response) ask for the same uncached IP, we only hit the upstream once.
const inflight = new Map<string, Promise<string | null>>();

function setCache(ip: string, value: string | null) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(ip, {
    value,
    expiresAt: Date.now() + (value ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });
}

function getCache(ip: string): CacheEntry | null {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(ip);
    return null;
  }
  return entry;
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function isPrivateOrLocal(ip: string): boolean {
  // IPv6 unspecified / loopback / "localhost"
  if (ip === "::" || ip === "::1" || ip === "localhost") return true;
  // Full IPv4 loopback range 127.0.0.0/8 — not just 127.0.0.1
  if (/^127\./.test(ip)) return true;
  if (ip === "0.0.0.0") return true;
  // RFC1918 private IPv4
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  // Link-local IPv4
  if (/^169\.254\./.test(ip)) return true;
  // CGNAT 100.64.0.0/10 (not globally routable, no useful geo)
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true;
  // Unique local IPv6 fc00::/7 (covers fcXX:: and fdXX::)
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
  // Link-local IPv6 fe80::/10 — covers fe80:: through febf::, i.e. the
  // second hex digit is 8, 9, a, or b.
  if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true;
  return false;
}

interface IpApiResponse {
  status?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  message?: string;
}

function formatLocation(data: IpApiResponse): string | null {
  if (data.status !== "success") return null;
  const region = data.city || data.regionName;
  const country = data.countryCode || data.country;
  if (region && country) return `${region}, ${country}`;
  if (country) return country;
  if (region) return region;
  return null;
}

async function fetchLocation(ip: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    // ip-api.com free tier: HTTP-only, ~45 req/min/IP, no API key. The
    // `fields` query string trims the response to just what we need.
    const url = `http://ip-api.com/json/${encodeURIComponent(
      ip,
    )}?fields=status,message,country,countryCode,regionName,city`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as IpApiResponse;
    return formatLocation(data);
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      logger.debug({ ip }, "GeoIP lookup timed out");
    } else {
      logger.debug({ err, ip }, "GeoIP lookup failed");
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolve an IP address to a coarse "City, CC" / "Country" string for
 * display in the Recent Activity panel.
 *
 * Returns null when:
 *  - the IP is missing, private, or loopback
 *  - the upstream geoip service is unreachable, slow, or returns "fail"
 *
 * Results are cached in-process: 24h for successful lookups, 5min for
 * failures (so one transient outage doesn't block the same IP all day).
 * The map is capped at 1000 entries with simple FIFO eviction.
 */
export async function lookupLocation(rawIp: string | null): Promise<string | null> {
  if (!lookupEnabled()) return null;
  const ip = normalizeIp(rawIp);
  if (!ip) return null;
  if (isPrivateOrLocal(ip)) return null;

  const cached = getCache(ip);
  if (cached) return cached.value;

  // Coalesce concurrent lookups for the same IP into a single upstream call.
  const existing = inflight.get(ip);
  if (existing) return existing;

  const promise = fetchLocation(ip)
    .then((value) => {
      setCache(ip, value);
      return value;
    })
    .finally(() => {
      inflight.delete(ip);
    });
  inflight.set(ip, promise);
  return promise;
}

/** Test-only helper. */
export function __clearGeoCacheForTests() {
  cache.clear();
  inflight.clear();
}
