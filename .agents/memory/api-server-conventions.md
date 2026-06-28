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

## Case-derived documents share one ownership-enforced endpoint
- `GET /public/refunds/reports/:reference` (frontend `useCaseReport`) is the
  single source for any document built from a case — Report Generation AND
  Legal Coordination both consume it, so generated docs cite server-verified
  facts, not client state. Build new case-document features on top of this hook.
- **Why:** keeps every case artifact behind the same ownership check (caller's
  `adminClients` email must match the request's `clientId`).
- Reference matching must be EXACT on year+id (`caseReference(id, createdAt)`),
  not just the numeric id — `referenceToId` alone would let `RF-9999-0001`
  resolve case `0001`. The route re-checks the full reference before returning.
