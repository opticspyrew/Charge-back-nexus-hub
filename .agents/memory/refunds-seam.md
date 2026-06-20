---
name: Refunds.site / CryptoVault seam
description: How the Refunds.site brand coexists with CryptoVault inside the crypto-dashboard app without visual or code bleed.
---

# Refunds.site ↔ CryptoVault isolation

Refunds.site is a second product living **inside** the existing `crypto-dashboard`
app (not a separate artifact), under the `/refunds/*` routes and the `src/refunds/`
folder. CryptoVault keeps `/dashboard`.

**Rule — keep the two products fully isolated:**
- All Refunds UI renders inside a `.refunds-scope` element that redefines the
  Tailwind CSS variables to the Refunds palette, so the same Tailwind utilities
  resolve to Refunds colors only inside the scope. This is why both brands share
  one Tailwind config without bleeding into each other.
- The seam boundary is **pages**: never import a CryptoVault *page* into
  `src/refunds/` (or vice versa). Shared *hooks* and *modals* may be reused — that
  is how the wallet was unified in place. Reused modals must be plain in-tree
  overlays (NOT `createPortal` to `document.body`) so they render inside
  `.refunds-scope` and inherit the palette.

**Why:** The user required that adding Refunds must not change the CryptoVault look,
and that `/dashboard` stay unchanged.

**How to apply:**
- New Refunds screens go under `src/refunds/`, mount at a `/refunds/*` route, and
  carry `refunds-scope` at their root. Section content rendered inside the portal
  shell is already scoped — don't add a second wrapper.
- `/refunds` is the **unified auth-aware hub**: anonymous → marketing landing;
  authenticated → the merged wallet + recovery portal. The portal's default
  section is the in-place Wallet.
- Wallet **and** monitoring are **server-backed per account**, so a brand-new
  account shows blank history AND blank monitoring. Never reintroduce the old
  static mocks into live components (they survive only for their own unit test).
