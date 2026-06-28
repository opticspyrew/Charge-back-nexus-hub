# Manus ↔ Refunds.site Data-Sync Requirements ("our side")

**Owner:** NETSPYWORLD FORENSICS LTD (brand: Netspy-World Forensics)
**Scope:** Refunds.site, which lives inside the `crypto-dashboard` artifact at `/refunds`.
**Status:** Requirements only. Phase 5 (live sync) is **BLOCKED** on Manus API
documentation and credentials. This document describes what *our* side
(Refunds.site backend, `@workspace/api-server`) needs in order to exchange case
data with Manus. It does not commit Manus to any specific contract.

---

## 1. Purpose & goals

Manus is the firm's external case-management / operations system. Refunds.site is
the client-facing intake and status portal. We need a reliable, idempotent,
auditable sync so that:

1. Cases (service requests) and the clients who own them stay consistent across
   both systems.
2. Status changes made by analysts in Manus surface to clients on Refunds.site
   without manual re-entry.
3. New intakes captured on Refunds.site reach Manus for triage.
4. Every sync action is recorded in our activity log so the case timeline shown
   to clients (and used by the AI assistant for narratives) stays complete.

Non-goals: Manus's internal workflow, analyst tooling, or any data we do not
already model. We sync only the three canonical entities below.

---

## 2. Canonical entities (the only data we sync)

Our side already models these in `lib/db/src/schema/admin.ts`. The sync contract
maps **one-to-one** onto these tables. We do **not** invent new external-facing
tables; Manus-specific identifiers are added as additive columns (see §4).

### 2.1 Client — `admin_clients`

| Field        | DB column     | Type                | Notes                                            |
|--------------|---------------|---------------------|--------------------------------------------------|
| id           | `id`          | serial PK           | Our internal id. Never sent as the join key.     |
| name         | `name`        | text, required      |                                                  |
| email        | `email`       | text, **unique**    | Natural business key on our side.                |
| phone        | `phone`       | text, nullable      |                                                  |
| company      | `company`     | text, nullable      |                                                  |
| status       | `status`      | text, default `pending` | Lifecycle (see §3).                          |
| notes        | `notes`       | text, nullable      | Internal notes; **not** exposed to clients.      |
| createdAt    | `created_at`  | timestamptz         |                                                  |
| updatedAt    | `updated_at`  | timestamptz         | Used for last-writer reconciliation (see §7).    |

### 2.2 Service request (a "case") — `admin_service_requests`

| Field        | DB column      | Type                     | Notes                                          |
|--------------|----------------|--------------------------|------------------------------------------------|
| id           | `id`           | serial PK                | Drives the public case reference (see §5).      |
| clientId     | `client_id`    | int FK → admin_clients   | Required.                                       |
| type         | `type`         | text, default `withdrawal` |                                              |
| amount       | `amount`       | numeric(14,2), nullable  | Optional. Validate precision/scale on ingest.  |
| currency     | `currency`     | text, default `USD`      |                                                |
| notes        | `notes`        | text, nullable           | Internal.                                      |
| txnId        | `txn_id`       | text, nullable           | On-chain / external transaction reference.     |
| status       | `status`       | text, default `pending`  | Lifecycle (see §3).                            |
| publicToken  | `public_token` | varchar(64), **unique**  | Unguessable capability token; **never** sent to Manus and never logged. |
| createdAt    | `created_at`   | timestamptz              |                                                |
| updatedAt    | `updated_at`   | timestamptz              | Reconciliation timestamp.                      |

> **Security:** `public_token` is a per-row capability used by the public status
> lookup. It must never appear in any Manus payload, log line, or error message.

### 2.3 Activity event — `admin_activity_log`

| Field        | DB column     | Type                   | Notes                                            |
|--------------|---------------|------------------------|--------------------------------------------------|
| id           | `id`          | serial PK              |                                                  |
| eventType    | `event_type`  | text, required         | e.g. `service_request_submitted`, `status_changed`. |
| clientId     | `client_id`   | int FK, nullable       |                                                  |
| description  | `description` | text, required         | Human-readable; surfaced in the client timeline. |
| metadata     | `metadata`    | jsonb, nullable        | Structured detail; sync provenance goes here.    |
| createdAt    | `created_at`  | timestamptz            |                                                  |

Activity is **append-only**. Sync never updates or deletes existing rows; it only
inserts new events. Each synced event carries provenance in `metadata`
(`{ "source": "manus", "manusEventId": "..." }`) so we never double-insert.

---

## 3. Status lifecycle (shared vocabulary)

Both systems must agree on a closed set of status strings. Our code currently
recognizes the following for service requests; Manus must map its internal states
onto these and reject anything else:

- `pending` — intake received, not yet triaged (our default on create).
- `processing` — actively being worked.
- `approved` — recovery outcome approved; counts toward "value released" metrics.
- `rejected` — declined; a reason should accompany this transition.

Client `status` uses `pending` by default and follows the firm's onboarding
states. Any new status value is a **contract change** and must be agreed in
writing before either side emits it, because unknown values break our public
metrics aggregation (which filters on `approved` / `processing`).

> **Compliance guardrail:** status text and any synced narrative must never imply
> guaranteed recovery. "Recovery is never guaranteed" remains the firm's stance.

---

## 4. External IDs & idempotency keys

We do **not** join on autoincrement `id` across systems. Each side keeps its own
primary key and stores the *other* system's id alongside it.

Required additive columns on our side (migration to be scheduled with Phase 5):

- `admin_clients.manus_client_id` (text, nullable, unique when present)
- `admin_service_requests.manus_case_id` (text, nullable, unique when present)

Join/idempotency rules:

1. **Clients** join on `email` (our natural unique key) **or** `manus_client_id`
   when known. Email is case-insensitive for matching.
2. **Service requests** join on `manus_case_id`; if absent, fall back to our case
   reference (§5) supplied by Manus.
3. Every **write** request carries an `Idempotency-Key` header (a UUID chosen by
   the caller). We persist processed keys for at least 7 days and return the
   original result for repeats, so retries never create duplicates.
4. Activity events additionally de-dupe on `metadata.manusEventId`.

---

## 5. Case reference format

The client-facing reference is derived deterministically from the service-request
id and its creation year:

```
RF-<YYYY>-<id zero-padded to 4>      e.g.  RF-2026-0001
```

Parsing back is strict: `^RF-\d{4}-(\d+)$`. Manus may display this reference but
must treat `manus_case_id` (not the reference) as the durable join key, since the
reference encodes our internal id and year.

---

## 6. Sync direction & transport

Two directions, each explicit:

### 6.1 Manus → Refunds.site (push, primary)

Manus is the system of record for analyst-driven changes (status, notes, new
activity). Manus **pushes** changes to endpoints we expose. Preferred transport:
**webhook-style HTTPS POST** with idempotency keys. Endpoints we will expose
(under the existing `/api/public/refunds` surface, but on a dedicated, separately
authenticated sub-path — see §8):

- `POST /sync/clients` — upsert a client.
- `POST /sync/cases` — upsert a service request (case).
- `POST /sync/activity` — append one or more activity events.

All three are **upsert/append** and **idempotent**. Batching: accept either a
single object or an array (cap array length, e.g. 100, and reject larger batches
with 413).

### 6.2 Refunds.site → Manus (push on intake)

When a client files a case on Refunds.site, we emit it to Manus so triage can
begin. Until Manus's API is documented, this is **outbound-pending**: we enqueue
the event locally (activity log marker `eventType = "manus_sync_pending"`) and
flush once credentials exist. No client-facing behavior depends on Manus being
reachable.

### 6.3 Reconciliation pull (secondary, optional)

A scheduled **pull** (`GET` from Manus, or a Manus-initiated full push) reconciles
drift. Frequency and endpoint TBD with Manus. Used only to repair missed
webhooks; the push path is authoritative for real-time updates.

---

## 7. Conflict resolution & reconciliation

- **Last-writer-wins by `updatedAt`** per field-group, with Manus winning ties on
  analyst-owned fields (`status`, `notes`) and Refunds.site winning on
  client-owned intake fields (`name`, `email`, `phone`, `company`, `amount`,
  `currency`, `txnId`).
- Status transitions are validated against §3; an out-of-vocabulary status is
  rejected (422) and logged, never silently coerced.
- Every applied sync writes an `admin_activity_log` row with
  `metadata.source = "manus"` so the change is auditable and appears in the client
  timeline and AI-generated narratives.
- Reconciliation compares `updatedAt` per record; mismatches are resolved by the
  rules above and the loser's prior value is preserved in the activity
  `metadata` for audit.

---

## 8. Authentication & security

- The `/sync/*` endpoints are **machine-to-machine**, not client-facing. They do
  **not** use the per-user bearer-session auth used by the rest of
  `/api/public/refunds`. Instead require a dedicated shared secret presented as
  `Authorization: Bearer <MANUS_SYNC_TOKEN>` (stored as a secret, requested via
  the environment-secrets flow when Phase 5 starts), plus an allow-listed source
  if Manus publishes stable egress IPs.
- Optional but recommended: HMAC signature header
  (`X-Manus-Signature: sha256=...`) over the raw body using a shared signing key,
  verified before parsing.
- Rate-limit the sync endpoints independently of the client API.
- TLS only. Reject non-HTTPS. Never log request bodies containing PII
  (`name`, `email`, `phone`) or `public_token`.

---

## 9. Payload examples (grounded in the schema)

### 9.1 Upsert client — `POST /sync/clients`

```http
POST /api/public/refunds/sync/clients
Authorization: Bearer <MANUS_SYNC_TOKEN>
Idempotency-Key: 7c3b...e1
Content-Type: application/json
```
```json
{
  "manusClientId": "mc_01HZX...",
  "name": "Jordan Avery",
  "email": "jordan@example.com",
  "phone": "+1-555-0100",
  "company": "Avery Holdings",
  "status": "pending",
  "updatedAt": "2026-06-28T04:10:00.000Z"
}
```
Response `200`:
```json
{ "ok": true, "clientId": 42, "manusClientId": "mc_01HZX...", "created": false }
```

### 9.2 Upsert case — `POST /sync/cases`

```json
{
  "manusCaseId": "case_01J2A...",
  "reference": "RF-2026-0001",
  "client": { "email": "jordan@example.com", "manusClientId": "mc_01HZX..." },
  "type": "withdrawal",
  "amount": "1000.00",
  "currency": "USD",
  "txnId": "0xabc123...",
  "status": "processing",
  "updatedAt": "2026-06-28T04:12:00.000Z"
}
```
Response `200`:
```json
{ "ok": true, "caseId": 1, "reference": "RF-2026-0001", "manusCaseId": "case_01J2A...", "created": false }
```
Notes: `amount` is validated against `numeric(14,2)`; out-of-range/non-numeric →
`422`. `public_token` is **never** present in this payload.

### 9.3 Append activity — `POST /sync/activity`

```json
[
  {
    "manusEventId": "evt_01J2B...",
    "case": { "reference": "RF-2026-0001", "manusCaseId": "case_01J2A..." },
    "clientEmail": "jordan@example.com",
    "eventType": "status_changed",
    "description": "Case moved to processing after on-chain trace confirmed.",
    "metadata": { "from": "pending", "to": "processing" },
    "createdAt": "2026-06-28T04:12:00.000Z"
  }
]
```
Response `200`:
```json
{ "ok": true, "inserted": 1, "skippedDuplicates": 0 }
```

---

## 10. Error contract

| HTTP | Meaning                                                            |
|------|-------------------------------------------------------------------|
| 200  | Upsert/append applied (idempotent repeats also return 200).       |
| 400  | Malformed JSON or missing required field.                         |
| 401  | Missing/invalid `MANUS_SYNC_TOKEN` (or bad HMAC signature).       |
| 404  | Referenced client/case not found and payload lacks data to create.|
| 409  | Idempotency-Key reused with a *different* body.                   |
| 413  | Batch exceeds the array cap.                                      |
| 422  | Valid JSON but invalid value (unknown status, bad amount).        |
| 429  | Rate limit exceeded.                                              |
| 503  | Sync temporarily disabled (e.g. credentials not configured).     |

Errors return `{ "error": "<human-readable message>" }` and never echo secrets,
tokens, or `public_token`.

---

## 11. Open questions (to resolve with Manus before Phase 5)

1. Does Manus push webhooks, expect us to pull, or both? What is its auth model?
2. Manus's canonical id formats for clients/cases (to size the additive columns).
3. Manus's status vocabulary and the exact mapping to ours (§3).
4. Signing scheme: shared bearer token only, or HMAC body signatures?
5. Egress IPs for allow-listing, if any.
6. Batch limits and acceptable webhook retry/backoff policy.
7. SLA for reconciliation pulls and who initiates them.

Until 1–7 are answered and a `MANUS_SYNC_TOKEN` (and any signing key) is
provisioned, the live sync remains **blocked**; the contract above is what our
side is built to honor.
