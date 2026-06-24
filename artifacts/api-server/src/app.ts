import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust exactly one proxy hop (the Replit platform proxy that fronts every
// request). With this set, Express derives `req.ip` from the rightmost
// X-Forwarded-For entry — the address the trusted proxy actually saw —
// and discards any client-supplied entries to its left. This is what the
// forgot-password throttle relies on to get a non-spoofable client IP.
app.set("trust proxy", 1);

// Paths whose final segment is a per-row capability token (presented in the
// URL path) MUST NOT be logged verbatim, because every entry in the access
// log would otherwise expose the token to anyone with log read access (proxy
// logs, Replit deployment logs, log aggregators, etc.). The pino serializer
// below replaces the token segment with `:token` before it ever hits the log.
function redactCapabilityToken(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  const path = rawUrl.split("?")[0];
  return path.replace(
    /^(\/api\/public\/request-status)\/[^/]+/,
    "$1/:token",
  );
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        // pino-http calls our serializer with its own wrapped object;
        // the original Express request (which has the `req.ip` getter
        // backed by the `trust proxy` setting above) is on `req.raw`.
        // Logging it gives every HTTP line the real client IP rather
        // than the proxy's address.
        const raw = (req as { raw?: { ip?: string } }).raw;
        return {
          id: req.id,
          method: req.method,
          url: redactCapabilityToken(req.url),
          ip: raw?.ip,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Clerk Frontend API proxy. Mounted before body parsers because it streams raw
// bytes. Production-only (no-ops in dev); used by the portfolio-tracker artifact
// for production Clerk auth. Does not affect existing routes.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors());
// 12mb limit accommodates KYC ID photo uploads (base64-encoded, up to ~8MB raw).
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

// Populate Clerk auth state (req.auth) from the session cookie. Resolves the
// publishable key from the request host so the same server can serve multiple
// Clerk custom domains. Existing routes ignore req.auth, so this is additive.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
