/**
 * Page-level tests that exercise the real query-string plumbing for the
 * social sign-in UX:
 *
 *   - SignIn  reads ?social_error= on mount, passes it to <SocialAuthButtons />
 *   - SignUp  does the same
 *   - ConnectedAccounts reads ?status= on mount and shows the correct banner
 *   - ConnectedAccounts renders Connect / Disconnect buttons with the right
 *     states from /api/auth/providers/linked
 *
 * Heavy page dependencies (auth context, dashboard layout, login throttle,
 * forgot-password panel) are mocked so the tests stay focused on the
 * social-auth surface and don't require a running backend.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module mocks must be declared before importing the pages under test.
// ---------------------------------------------------------------------------

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { email: "t@example.com", name: "T" },
    isAuthenticated: true,
    token: "test-token",
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    forgotPassword: vi.fn(),
    resetPasswordWithToken: vi.fn(),
    accountExists: vi.fn(),
  }),
}));

vi.mock("@/lib/login-throttle", () => ({
  LoginLockoutError: class extends Error {
    msRemaining = 0;
  },
  formatRemaining: () => "",
  getLockoutState: () => ({ msRemaining: 0 }),
  subscribe: () => () => {},
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}));

vi.mock("@/components/dashboard-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/forgot-password-panel", () => ({
  ForgotPasswordPanel: () => null,
}));

vi.mock("@/components/total-assets-banner", () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------

import SignIn from "../sign-in";
import SignUp from "../sign-up";
import ConnectedAccounts from "../connected-accounts";

type FetchMockMap = Record<string, (init: RequestInit | undefined) => Response | Promise<Response>>;

function installFetchMock(routes: FetchMockMap) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return handler(init);
      }
    }
    return new Response(`unmocked ${url}`, { status: 500 });
  }) as typeof fetch;
}

function setUrl(path: string, search: string) {
  // jsdom lets us set window.location via history.replaceState.
  window.history.replaceState({}, "", `${path}${search}`);
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  setUrl("/", "");
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe("SignIn — ?social_error= query plumbing", () => {
  it("surfaces the error banner when the URL has ?social_error=email_unverified", async () => {
    setUrl("/sign-in", "?social_error=email_unverified");
    installFetchMock({
      "/auth/providers/config": () =>
        new Response(JSON.stringify({ providers: { google: false, apple: false } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    render(<SignIn />);

    const banner = await screen.findByTestId("social-auth-error");
    expect(banner.textContent).toMatch(/verified email/i);

    // The query param is consumed so it doesn't show up again on the next render.
    expect(window.location.search).toBe("");
  });

  it("does NOT render the error banner when no ?social_error is present", async () => {
    setUrl("/sign-in", "");
    installFetchMock({
      "/auth/providers/config": () =>
        new Response(JSON.stringify({ providers: { google: false, apple: false } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    const { container } = render(<SignIn />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await Promise.resolve();
    expect(container.querySelector('[data-testid="social-auth-error"]')).toBeNull();
  });

  it("renders the Google sign-in button when /providers/config reports google=true", async () => {
    setUrl("/sign-in", "");
    installFetchMock({
      "/auth/providers/config": () =>
        new Response(JSON.stringify({ providers: { google: true, apple: false } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    render(<SignIn />);
    const btn = await screen.findByTestId("signin-google");
    expect(btn.getAttribute("href")).toMatch(/\/auth\/google\/login$/);
  });
});

describe("SignUp — ?social_error= query plumbing", () => {
  it("surfaces the cancelled banner when the URL has ?social_error=cancelled", async () => {
    setUrl("/sign-up", "?social_error=cancelled");
    installFetchMock({
      "/auth/providers/config": () =>
        new Response(JSON.stringify({ providers: { google: false, apple: false } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    render(<SignUp />);
    const banner = await screen.findByTestId("social-auth-error");
    expect(banner.textContent).toMatch(/cancelled/i);
  });
});

describe("ConnectedAccounts — ?status= query plumbing and provider rendering", () => {
  function mockLinked(payload: {
    providers: { google: boolean; apple: boolean };
    linked: Array<{ provider: "google" | "apple"; email?: string | null; linkedAt?: string }>;
    hasPassword: boolean;
  }) {
    installFetchMock({
      "/auth/providers/linked": () =>
        new Response(
          JSON.stringify({
            providers: payload.providers,
            linked: payload.linked.map((l) => ({
              provider: l.provider,
              email: l.email ?? null,
              linkedAt: l.linkedAt ?? new Date().toISOString(),
            })),
            hasPassword: payload.hasPassword,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
  }

  it("shows the success status banner for ?status=connected", async () => {
    setUrl("/connected-accounts", "?status=connected");
    mockLinked({ providers: { google: false, apple: false }, linked: [], hasPassword: true });

    render(<ConnectedAccounts />);
    const banner = await screen.findByTestId("connected-accounts-status");
    expect(banner.textContent).toMatch(/Account connected/i);
    expect(window.location.search).toBe("");
  });

  it("shows the in_use_elsewhere error banner for ?status=in_use_elsewhere", async () => {
    setUrl("/connected-accounts", "?status=in_use_elsewhere");
    mockLinked({ providers: { google: true, apple: true }, linked: [], hasPassword: true });

    render(<ConnectedAccounts />);
    const banner = await screen.findByTestId("connected-accounts-status");
    expect(banner.textContent).toMatch(/different CryptoVault user/i);
  });

  it("renders a Connect button for a configured-but-unlinked provider", async () => {
    setUrl("/connected-accounts", "");
    mockLinked({ providers: { google: true, apple: false }, linked: [], hasPassword: true });

    render(<ConnectedAccounts />);
    const connectGoogle = await screen.findByTestId("connect-google");
    expect(connectGoogle.textContent).toMatch(/Connect/i);
    expect((connectGoogle as HTMLButtonElement).disabled).toBe(false);
    // Apple isn't configured, so its Connect button must be disabled.
    const connectApple = await screen.findByTestId("connect-apple");
    expect((connectApple as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders a Disconnect button for a linked provider and DISABLES it when it would strand the user", async () => {
    setUrl("/connected-accounts", "");
    mockLinked({
      providers: { google: true, apple: true },
      linked: [{ provider: "google", email: "alice@example.com" }],
      hasPassword: false, // no password + only one provider linked → disconnect must be blocked in the UI
    });

    render(<ConnectedAccounts />);
    const disconnect = await screen.findByTestId("disconnect-google");
    expect((disconnect as HTMLButtonElement).disabled).toBe(true);
    expect(disconnect.getAttribute("title")).toMatch(/password|provider/i);
  });

  it("enables Disconnect when the user has a password (a remaining sign-in method)", async () => {
    setUrl("/connected-accounts", "");
    mockLinked({
      providers: { google: true, apple: true },
      linked: [{ provider: "google", email: "alice@example.com" }],
      hasPassword: true,
    });

    render(<ConnectedAccounts />);
    const disconnect = await screen.findByTestId("disconnect-google");
    expect((disconnect as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders nothing connectable when no providers are configured", async () => {
    setUrl("/connected-accounts", "");
    mockLinked({ providers: { google: false, apple: false }, linked: [], hasPassword: true });

    const { container } = render(<ConnectedAccounts />);
    // Wait for the linked fetch to resolve.
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await Promise.resolve();
    await Promise.resolve();

    // There should be Connect buttons rendered for both providers but disabled
    // (because neither is configured) — and no Disconnect buttons.
    const connectGoogle = container.querySelector('[data-testid="connect-google"]') as HTMLButtonElement | null;
    const connectApple = container.querySelector('[data-testid="connect-apple"]') as HTMLButtonElement | null;
    expect(connectGoogle?.disabled).toBe(true);
    expect(connectApple?.disabled).toBe(true);
    expect(container.querySelector('[data-testid="disconnect-google"]')).toBeNull();
    expect(container.querySelector('[data-testid="disconnect-apple"]')).toBeNull();
  });
});
