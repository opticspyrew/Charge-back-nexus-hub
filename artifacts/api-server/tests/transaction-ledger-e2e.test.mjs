// End-to-end regression guard for the unified /refunds wallet's core data
// guarantees (Task #126 / #129). These were previously only verified by hand:
//
//   1. A BRAND-NEW account starts completely blank — empty transaction activity
//      AND empty monitoring (recovery cases). No demo seeds.
//   2. Every balance-changing operation (convert, deposit, receive, send,
//      withdraw) appends EXACTLY ONE ledger row — none missing, none duplicated
//      (a retried optimistic append is idempotent on the client txnId).
//   3. History is SERVER-BACKED: it survives a page reload / a different device
//      (a fresh GET returns the same rows), and one account never sees another
//      account's history.
//
// This exercises the real append-only ledger end-to-end: the authenticated
// /api/auth/transactions routes, the per-user (user_id, txn_id) uniqueness, and
// the /api/public/refunds/cases monitoring feed — all against the live API
// server and the real database, mirroring the shapes the client's
// addTransaction() / useTransactions() / useMyCases() actually send.
//
// Runs against a live API server (default http://localhost:8080/api). Accounts
// are created via the public signup endpoint and removed in after(); the
// transactions table cascades on user delete, so deleting the user is enough to
// leave no DB residue across re-runs.
// Run with `pnpm --filter @workspace/api-server test`.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8080/api";
const PASSWORD = "Passw0rd!!";

// Every account this suite creates, removed in after(). transactions has an
// ON DELETE CASCADE FK to users, so deleting the user drops its ledger too.
const createdUserIds = [];

function rnd() {
  return Math.random().toString(36).slice(2, 10);
}

// The api server runs with `trust proxy: 1`; a fresh fake IP per request keeps
// the per-minute rate limiters from rejecting test traffic without weakening
// the production config.
function fakeIp() {
  const oct = () => Math.floor(Math.random() * 254) + 1;
  return `10.${oct()}.${oct()}.${oct()}`;
}

function ipHeaders(extra = {}) {
  return { "x-forwarded-for": fakeIp(), ...extra };
}

async function jsonOf(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function signupUser() {
  const email = `ledger-e2e-${rnd()}@example.com`;
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: ipHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({
      name: "Ledger E2E",
      email,
      password: PASSWORD,
      scammedVia: "Crypto",
    }),
  });
  assert.equal(res.status, 201, "signup should succeed");
  const body = await jsonOf(res);
  createdUserIds.push(body.user.id);
  return { email, token: body.token, userId: body.user.id };
}

// Re-authenticate an existing account to get a fresh, independent session token
// — used to prove the ledger is scoped to the USER, not a single session.
async function loginUser(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: ipHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  assert.equal(res.status, 200, "login should succeed");
  const body = await jsonOf(res);
  return body.token;
}

async function listTransactions(token) {
  const res = await fetch(`${BASE}/auth/transactions`, {
    headers: ipHeaders({ authorization: `Bearer ${token}` }),
  });
  assert.equal(res.status, 200, "GET /auth/transactions should succeed");
  const body = await jsonOf(res);
  return body.transactions;
}

async function listCases(token) {
  const res = await fetch(`${BASE}/public/refunds/cases`, {
    headers: ipHeaders({ authorization: `Bearer ${token}` }),
  });
  assert.equal(res.status, 200, "GET /public/refunds/cases should succeed");
  const body = await jsonOf(res);
  return body.cases;
}

async function appendTransaction(token, txn) {
  const res = await fetch(`${BASE}/auth/transactions`, {
    method: "POST",
    headers: ipHeaders({
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify(txn),
  });
  return { status: res.status, body: await jsonOf(res) };
}

// The five balance-changing operations the unified wallet records, each in the
// exact shape the client's addTransaction() posts. A shared random suffix keeps
// txnIds unique per test invocation while staying recognisable.
function opPayloads() {
  const id = rnd();
  return [
    { txnId: `txn-${id}-convert`, type: "Conversion", asset: "BTC", amount: "-0.1000 BTC", usdAmount: 2700, status: "Completed", statusType: "completed", address: "BTC \u2192 USDT" },
    { txnId: `txn-${id}-deposit`, type: "Deposit", asset: "BTC", amount: "+0.2500 BTC", usdAmount: 6750, status: "Completed", statusType: "completed", address: null },
    { txnId: `txn-${id}-receive`, type: "Receive", asset: "BTC", amount: "+0.0500 BTC", usdAmount: 1350, status: "Completed", statusType: "completed", address: "bc1qreceive000" },
    { txnId: `txn-${id}-send`, type: "Send", asset: "BTC", amount: "-0.0300 BTC", usdAmount: 810, status: "Completed", statusType: "completed", address: "bc1qsend00000" },
    { txnId: `txn-${id}-withdraw`, type: "Withdrawal", asset: "BTC", amount: "-0.0700 BTC", usdAmount: 1890, status: "Pending", statusType: "pending", address: "bc1qwithdraw00" },
  ];
}

after(async () => {
  if (createdUserIds.length > 0) {
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [
      createdUserIds,
    ]);
  }
});

test("1) a brand-new account starts with blank activity AND blank monitoring", async () => {
  const { token } = await signupUser();
  assert.deepEqual(
    await listTransactions(token),
    [],
    "new account must have an empty transaction history",
  );
  assert.deepEqual(
    await listCases(token),
    [],
    "new account must have empty monitoring (no recovery cases)",
  );
});

test("2) each balance-changing op appends exactly one ledger row (none missing)", async () => {
  const { token } = await signupUser();
  const ops = opPayloads();

  for (const op of ops) {
    const { status } = await appendTransaction(token, op);
    assert.equal(status, 201, `append ${op.type} should create a new row`);
  }

  const rows = await listTransactions(token);
  assert.equal(rows.length, ops.length, "exactly one row recorded per operation");
  assert.deepEqual(
    rows.map((r) => r.type).sort(),
    ops.map((o) => o.type).sort(),
    "every operation type is recorded exactly once",
  );

  // The stored row must faithfully reflect what was posted (amount/usd/status).
  for (const op of ops) {
    const row = rows.find((r) => r.txnId === op.txnId);
    assert.ok(row, `a row for ${op.type} should exist`);
    assert.equal(row.amount, op.amount, `${op.type} amount preserved`);
    assert.equal(row.usdAmount, op.usdAmount, `${op.type} usdAmount preserved`);
    assert.equal(row.statusType, op.statusType, `${op.type} statusType preserved`);
  }
});

test("3) a retried append is idempotent — no duplicate row", async () => {
  const { token } = await signupUser();
  const [op] = opPayloads();

  const first = await appendTransaction(token, op);
  assert.equal(first.status, 201, "first append creates the row");

  // Same client txnId again (an optimistic-append retry after a flaky network).
  const retry = await appendTransaction(token, op);
  assert.equal(retry.status, 200, "retry returns the existing row, not a new one");
  assert.equal(
    retry.body.transaction.txnId,
    op.txnId,
    "retry returns the same logical transaction",
  );

  const rows = await listTransactions(token);
  assert.equal(rows.length, 1, "a retried append must not create a duplicate");
});

test("4) history is server-backed — it survives a reload / a different device", async () => {
  const { email, token } = await signupUser();
  const ops = opPayloads();
  for (const op of ops) {
    await appendTransaction(token, op);
  }

  // A page reload re-mounts the SPA, which refetches from the server. A brand
  // new GET with the same session models exactly that.
  const afterReload = await listTransactions(token);
  assert.equal(
    afterReload.length,
    ops.length,
    "all rows persist across a reload (nothing was client-only state)",
  );
  assert.deepEqual(
    afterReload.map((r) => r.txnId).sort(),
    ops.map((o) => o.txnId).sort(),
    "the reloaded history matches exactly what was recorded",
  );

  // A genuinely separate device: sign in again to mint a DIFFERENT session
  // token, then read the ledger. This proves history is scoped to the USER
  // (not the originating session) — a regression that read per-session would
  // pass if we reused the first token, so we deliberately do not.
  const secondSessionToken = await loginUser(email);
  assert.notEqual(
    secondSessionToken,
    token,
    "second login should mint a distinct session token",
  );
  const otherDevice = await listTransactions(secondSessionToken);
  assert.deepEqual(
    otherDevice.map((r) => r.txnId).sort(),
    ops.map((o) => o.txnId).sort(),
    "a different session sees the same per-user history",
  );
});

test("5) a new account never inherits another account's history", async () => {
  const accountA = await signupUser();
  await appendTransaction(accountA.token, opPayloads()[0]);
  assert.equal(
    (await listTransactions(accountA.token)).length,
    1,
    "account A recorded its own row",
  );

  const accountB = await signupUser();
  assert.deepEqual(
    await listTransactions(accountB.token),
    [],
    "a freshly created account B starts blank and cannot see A's ledger",
  );
});
