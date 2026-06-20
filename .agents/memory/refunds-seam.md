---
name: Refunds.site / CryptoVault seam
description: How the Refunds.site brand coexists with CryptoVault inside the crypto-dashboard app without visual or code bleed.
---

# Refunds.site ↔ CryptoVault isolation

Refunds.site lives inside the existing `crypto-dashboard` app (not a separate
artifact) under the `/refunds/*` route prefix and the `src/refunds/` folder.

**Rule:** Keep the two products fully isolated.
- All Refunds UI is wrapped in a `.refunds-scope` element. That class redefines
  the Tailwind CSS variables (`--primary`, `--card`, etc.) to the Refunds palette,
  so Tailwind utilities (`bg-primary`, `text-foreground`, …) resolve to Refunds
  colors only inside the scope — CryptoVault is untouched.
- The seam boundary is **pages**: never import a CryptoVault *page* into
  `src/refunds/` (or vice versa). Shared *hooks* (`useTransactions`, `useBalance`,
  `useKyc`, `useApprovalPoller`) and shared *modals* (`WalletModal`, `KycModal`) ARE
  intentionally reused by the Refunds portal — that is how the wallet was unified
  in-place. The modals are plain `fixed` overlays (NOT `createPortal` to
  `document.body`), so they render inside the `.refunds-scope` subtree and inherit
  the Refunds palette automatically. /dashboard must stay unchanged.
- Refunds-specific tokens/utilities/animations are namespaced `refunds-*` in
  `src/index.css` (glass, grid, radial, vault-bg, scan-line, pulse-ring, etc.) and
  all animations are gated behind `prefers-reduced-motion`.

**Why:** The user explicitly required that adding Refunds must not change the
CryptoVault look. The scoped-CSS-variable approach lets both brands share Tailwind
without a second config.

**How to apply:** New Refunds screens go under `src/refunds/`, are mounted at a
`/refunds/*` route in `App.tsx`, and their root element carries `refunds-scope`.
`/refunds` itself is the **unified auth-aware hub**: anonymous → marketing landing,
authenticated → the merged wallet + recovery portal (`RefundsHome` in `App.tsx`).
The portal's first/default section is the in-place Wallet (`portal-sections/funds.tsx`).

**Data layer:** wallet + monitoring are now **server-backed per account**, not mock —
wallet via `useTransactions` (GET/POST/PATCH/DELETE `/api/auth/transactions`),
monitoring via `useMyCases(token)` (`/api/auth/cases`). A brand-new account therefore
shows blank history AND blank monitoring everywhere. The old `get*()` mocks remain in
`src/refunds/data/mocks.ts` ONLY because `mocks.test.ts` still tests them; the running
app no longer imports them — don't reintroduce them into live components.

**Motion note:** The marketing homepage (`src/refunds/pages/landing.tsx`) wraps its
sections in framer-motion `<MotionConfig reducedMotion="user">` so all JS-driven
animations honor reduced-motion, complementing the CSS-level guard.
