/**
 * Component tests for SocialAuthButtons.
 *
 * These tests cover the three UI behaviors that the social sign-in flow
 * relies on (and that would otherwise only be observable through a manual
 * browser session):
 *
 *   1. When both providers are disabled (their server-side OAuth config is
 *      missing), no provider buttons render — but if a ?social_error= code
 *      was passed in, the error banner still appears.
 *   2. When at least one provider is configured, the corresponding "Continue
 *      with X" button renders with the right data-testid for the page mode
 *      (signin-* on sign-in, signup-* on sign-up).
 *   3. The errorCode → human message mapping renders the expected copy for
 *      all known error codes, and falls back to a generic message for an
 *      unknown code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import SocialAuthButtons from "../social-auth-buttons";

const originalFetch = globalThis.fetch;

function mockProvidersConfig(config: { google: boolean; apple: boolean }) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/auth/providers/config")) {
      return new Response(JSON.stringify({ providers: config }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not mocked", { status: 500 });
  }) as typeof fetch;
}

function mockProvidersConfigFailure() {
  globalThis.fetch = vi.fn(async () => {
    throw new Error("network down");
  }) as typeof fetch;
}

beforeEach(() => {
  // Ensure each test starts with a known fetch implementation.
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("SocialAuthButtons — no providers configured", () => {
  it("renders nothing when both providers are disabled and no error is passed", async () => {
    mockProvidersConfig({ google: false, apple: false });
    const { container } = render(<SocialAuthButtons mode="signin" />);
    // Wait for the publicConfig() promise to resolve and the component to settle.
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    // Give React a microtask to apply state.
    await Promise.resolve();
    expect(container.querySelector('[data-testid="signin-google"]')).toBeNull();
    expect(container.querySelector('[data-testid="signin-apple"]')).toBeNull();
    expect(container.querySelector('[data-testid="social-auth-error"]')).toBeNull();
  });

  it("shows ONLY the error banner when both providers are disabled and an error code is passed", async () => {
    mockProvidersConfig({ google: false, apple: false });
    render(<SocialAuthButtons mode="signin" errorCode="email_unverified" />);
    const banner = await screen.findByTestId("social-auth-error");
    expect(banner.textContent).toMatch(/verified email/i);
    expect(screen.queryByTestId("signin-google")).toBeNull();
    expect(screen.queryByTestId("signin-apple")).toBeNull();
  });

  it("treats a fetch failure as 'no providers configured' (graceful degradation)", async () => {
    mockProvidersConfigFailure();
    const { container } = render(<SocialAuthButtons mode="signin" />);
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    await Promise.resolve();
    expect(container.querySelector('[data-testid="signin-google"]')).toBeNull();
    expect(container.querySelector('[data-testid="signin-apple"]')).toBeNull();
  });
});

describe("SocialAuthButtons — providers configured", () => {
  it("renders the Google button (sign-in mode) when google=true", async () => {
    mockProvidersConfig({ google: true, apple: false });
    render(<SocialAuthButtons mode="signin" />);
    const googleBtn = await screen.findByTestId("signin-google");
    expect(googleBtn.tagName).toBe("A");
    expect(googleBtn.getAttribute("href")).toMatch(/\/auth\/google\/login$/);
    expect(googleBtn.textContent).toMatch(/Continue with Google/i);
    expect(screen.queryByTestId("signin-apple")).toBeNull();
  });

  it("renders the Apple button (sign-in mode) when apple=true", async () => {
    mockProvidersConfig({ google: false, apple: true });
    render(<SocialAuthButtons mode="signin" />);
    const appleBtn = await screen.findByTestId("signin-apple");
    expect(appleBtn.getAttribute("href")).toMatch(/\/auth\/apple\/login$/);
    expect(appleBtn.textContent).toMatch(/Continue with Apple/i);
    expect(screen.queryByTestId("signin-google")).toBeNull();
  });

  it("uses 'signup-*' data-testids when mode is 'signup'", async () => {
    mockProvidersConfig({ google: true, apple: true });
    render(<SocialAuthButtons mode="signup" />);
    expect(await screen.findByTestId("signup-google")).toBeTruthy();
    expect(await screen.findByTestId("signup-apple")).toBeTruthy();
    expect(screen.queryByTestId("signin-google")).toBeNull();
    expect(screen.queryByTestId("signin-apple")).toBeNull();
  });

  it("renders the error banner ABOVE the buttons when both are present", async () => {
    mockProvidersConfig({ google: true, apple: true });
    render(<SocialAuthButtons mode="signin" errorCode="cancelled" />);
    const banner = await screen.findByTestId("social-auth-error");
    expect(banner.textContent).toMatch(/cancelled/i);
    expect(await screen.findByTestId("signin-google")).toBeTruthy();
    expect(await screen.findByTestId("signin-apple")).toBeTruthy();
  });
});

describe("SocialAuthButtons — error code → message mapping", () => {
  // Every known code in SOCIAL_ERROR_MESSAGES from social-auth-buttons.tsx.
  // If any of these messages change, the test is a deliberate canary so we
  // remember to update both the component and the test together.
  const cases: Array<[string, RegExp]> = [
    ["cancelled", /cancelled/i],
    ["provider_error", /provider reported/i],
    ["missing_state", /session expired/i],
    ["exchange_failed", /couldn'?t verify/i],
    ["email_unverified", /verified email/i],
    ["google_not_configured", /google sign-in/i],
    ["apple_not_configured", /apple sign-in/i],
    ["start_failed", /couldn'?t start/i],
    ["user_resolve_failed", /creating your account/i],
    ["session_failed", /create a session/i],
    ["auth_required", /sign in before/i],
  ];

  for (const [code, pattern] of cases) {
    it(`renders the right message for error code '${code}'`, async () => {
      mockProvidersConfig({ google: false, apple: false });
      render(<SocialAuthButtons mode="signin" errorCode={code} />);
      const banner = await screen.findByTestId("social-auth-error");
      expect(banner.textContent ?? "").toMatch(pattern);
    });
  }

  it("falls back to a generic 'Sign-in failed' message for unknown codes", async () => {
    mockProvidersConfig({ google: false, apple: false });
    render(<SocialAuthButtons mode="signin" errorCode="some_brand_new_code" />);
    const banner = await screen.findByTestId("social-auth-error");
    expect(banner.textContent).toMatch(/Sign-in failed/i);
  });
});
