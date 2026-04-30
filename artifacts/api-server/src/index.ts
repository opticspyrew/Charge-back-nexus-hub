import app from "./app";
import { logger } from "./lib/logger";
import { purgeExpiredSessions } from "./lib/auth";
import { startForgotPasswordThrottleCleanup } from "./lib/forgot-password-throttle";
import { startLoginThrottleCleanup } from "./lib/login-throttle";
import { seedDefaultWallets } from "./lib/seed-wallets";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Clear expired sessions on startup (best-effort).
  void purgeExpiredSessions();
  void seedDefaultWallets();

  // Periodically prune throttle buckets to prevent memory growth.
  startForgotPasswordThrottleCleanup();
  startLoginThrottleCleanup();
});
