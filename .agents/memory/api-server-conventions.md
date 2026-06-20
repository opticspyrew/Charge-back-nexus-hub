---
name: api-server & crypto-dashboard data conventions
description: Non-obvious wiring conventions for adding API routes and frontend fetchers in this monorepo
---

# API server + frontend data conventions

## Frontend API base
- Frontend fetches use **root-relative `/api/...`**, NOT `import.meta.env.BASE_URL`.
  The proxy maps `/api` to the api-server regardless of the artifact's base path.
  Match `artifacts/crypto-dashboard/src/lib/api.ts` (`API_BASE = "/api"`) for any
  new fetcher; using BASE_URL would prepend the artifact path and break the call.

## api-server dev workflow needs a restart for new routes
- The `api-server` dev workflow runs `build` then `start` (esbuild bundle to
  dist/, then `node dist/index.mjs`) — it does **not** hot-reload.
- After adding/registering a route or changing route code, you must
  `restart_workflow("artifacts/api-server: API Server")` before curl sees it.
  A 404 on a brand-new route almost always just means "not restarted yet".

## Route registration order
- In `src/routes/index.ts`, mount more-specific prefixes BEFORE general ones,
  e.g. `router.use("/public/refunds", refundsRouter)` must come before
  `router.use("/public", publicRouter)` or the general router swallows the path.

## Auth for protected endpoints
- Use `extractBearerToken` + `findUserBySessionToken` (from `src/lib/auth.ts`);
  the returned `User` is the full `users` row (has `name`, `email`).
- Frontend gets the token from `useAuth()` (`@/lib/auth-context`), where
  `token` is `string | null`.

## Pre-existing unrelated tsc error
- `artifacts/api-server/src/lib/objectStorage.ts(265)` has a pre-existing
  `signed_url`/unknown tsc error unrelated to feature work — ignore it.

## api-server tests are LIVE integration tests (no in-process app boot)
- `pnpm --filter @workspace/api-server test` runs `node --import tsx --test`
  against a **running** server (default `http://localhost:8080/api`, override
  `API_BASE_URL`). The server MUST be up (the dev workflow) or every test fails
  to connect — they are integration tests, not unit tests.
- Harness pattern (mirror `tests/pending-withdrawal-count.test.mjs`): signup via
  the real API, push created ids, delete users in `after()`. Deleting the user
  is enough — `transactions` FK is `ON DELETE CASCADE`.
- **Anti-flake:** send a fresh fake `x-forwarded-for` per request; the server
  has `trust proxy` + per-minute rate limiters, and a shared real IP across many
  signups/logins will trip 429s.
- **Guard constraint:** `no-leftover-accounts.guard.mjs` only counts
  `social-%@example.com` / `kycflow-%@example.com`. New suites should use a
  different email prefix AND still clean up their own users.
- POST `/auth/transactions` is idempotent on `(user_id, txn_id)`:
  201 on create, **200** on duplicate (onConflictDoNothing + re-select).
