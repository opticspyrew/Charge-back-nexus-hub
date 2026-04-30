# Threat Model

## Project Overview

CryptoVault is a pnpm monorepo with a React/Vite customer dashboard, a React/Vite admin dashboard, and an Express 5 API backed by PostgreSQL via Drizzle ORM. The production system exposes `/api/public/*` for unauthenticated flows, `/api/auth/*` for end-user accounts and sessions, and `/api/admin/*` for internal administrative operations. The mockup sandbox artifact is development-only and should be ignored unless production reachability is demonstrated.

Assumptions propagated from the platform and scan policy: production traffic is TLS-terminated by the platform, `NODE_ENV` is `production`, and only vulnerabilities reachable in production should be reported.

## Assets

- **End-user accounts and sessions** — user emails, names, password-derived secrets, reset tokens, and bearer session tokens. Compromise enables account takeover and unauthorized access to balances and activity.
- **Account balances and transaction state** — portfolio balances, transaction records, request statuses, and debit directives. Tampering affects financial integrity and could enable fraudulent withdrawals or false account state.
- **Administrative control plane** — admin credentials, admin API access, client records, service requests, wallet configuration, and approval workflows. Compromise gives broad control over user-facing business flows.
- **Sensitive personal and operational data** — client registration details, service request notes, session metadata (IP/user agent/location), and password-reset flows. Disclosure affects privacy and can aid follow-on attacks.
- **Application secrets** — database URL, SMTP credentials, admin credentials, and any future signing material. Exposure can lead to full environment compromise or impersonation.

## Trust Boundaries

- **Browser to API** — all frontend inputs are untrusted and must be validated server-side. This includes public forms, auth requests, and admin actions.
- **Authenticated user to protected API** — possession of a bearer token crosses into account-scoped operations like `/api/auth/me`, `/api/auth/sessions`, and balance-related endpoints.
- **Admin browser to admin API** — the admin surface crosses from a browser storing admin state into high-impact privileged endpoints under `/api/admin/*`.
- **API to database** — the API has direct read/write access to users, sessions, requests, wallet configs, and activity logs. Query safety and authorization at this boundary are critical.
- **API to external services** — the server calls email and exchange-rate providers. Outbound requests and generated links must not be attacker-controlled in ways that leak secrets or enable spoofing.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox` is out of scope by default; `artifacts/api-server`, `artifacts/crypto-dashboard`, `artifacts/admin-dashboard`, and shared `lib/db` are production-relevant.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/crypto-dashboard/src/main.tsx`, `artifacts/admin-dashboard/src/main.tsx`
- **Highest-risk code areas:** `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/routes/public.ts`, `artifacts/api-server/src/lib/auth.ts`, `artifacts/admin-dashboard/src/lib/api.ts`, `lib/db/src/schema/*`
- **Public surfaces:** `/api/public/*`, signup/login/reset endpoints under `/api/auth/*`
- **Authenticated user surfaces:** `/api/auth/me`, `/api/auth/sessions`, `/api/auth/balance`, `/api/auth/change-password`
- **Admin surfaces:** all `/api/admin/*` routes and the admin dashboard frontend
- **Usually ignore unless proven reachable:** `artifacts/mockup-sandbox/**`, generated build outputs under `dist/**`

## Threat Categories

### Spoofing

The project uses bearer tokens for end users and a custom `x-admin-token` mechanism for administrators. The system must ensure every protected endpoint verifies an unforgeable, revocable secret and must not treat static shared credentials as durable browser-side session state. Password reset links and any future callbacks must be bound to trusted origins and unguessable tokens.

### Tampering

Users and unauthenticated visitors can submit registration, request, and balance-related data that crosses into business records. The system must derive or authorize sensitive state changes server-side, not accept client-controlled balances, approvals, or other security-relevant values without independent validation.

### Information Disclosure

The application stores PII, session metadata, and password-derived material. The system must not disclose user secrets, password hashes/salts, reset-token material, or other unnecessary sensitive fields through API responses, logs, or admin convenience views. Public endpoints must not expose request or client state to unauthorized parties.

### Denial of Service

Public endpoints such as account recovery, client registration, and service request submission are internet-facing. The system should rate-limit or otherwise bound expensive or spam-prone flows, and external service calls should remain bounded so unauthenticated traffic cannot exhaust resources.

### Elevation of Privilege

The largest privilege step is from unauthenticated/public access to end-user sessions, and from end-user access to administrator capabilities. The system must enforce server-side authorization on every admin and account-scoped route, prevent users from mutating other users' data or privileged business state, and avoid designs where theft of a single browser-stored secret yields full administrative control.