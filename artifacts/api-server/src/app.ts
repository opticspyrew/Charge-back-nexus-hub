import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
