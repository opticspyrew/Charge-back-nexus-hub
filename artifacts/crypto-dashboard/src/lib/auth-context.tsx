import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { authApi, publicApi, type AuthUser } from "./api";
import { validatePassword } from "./password-policy";
import {
  LoginLockoutError,
  getLockoutState,
  recordFailure,
  recordSuccess,
} from "./login-throttle";

interface User {
  email: string;
  name: string;
  avatar?: string;
}

interface StoredSession {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, initialBalanceUsd?: number) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPasswordWithToken: (token: string, newPassword: string) => Promise<void>;
  accountExists: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "cryptovault.session";
const LEGACY_ACCOUNTS_KEY = "cryptovault.accounts";

function toUser(apiUser: AuthUser): User {
  return { email: apiUser.email, name: apiUser.name };
}

function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.token === "string" &&
      parsed.user &&
      typeof parsed.user.email === "string" &&
      typeof parsed.user.name === "string"
    ) {
      return {
        token: parsed.token,
        user: { email: parsed.user.email, name: parsed.user.name },
      };
    }
    // Legacy session shape (just user info, no token) — discard so the user
    // is forced to sign in against the server.
    return null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function clearLegacyAccounts() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = loadStoredSession();
  const [session, setSessionState] = useState<StoredSession | null>(initial);
  const tokenRef = useRef<string | null>(initial?.token ?? null);

  const updateSession = (next: StoredSession | null) => {
    tokenRef.current = next?.token ?? null;
    saveStoredSession(next);
    setSessionState(next);
  };

  useEffect(() => {
    // Stop persisting locally-created accounts; the server is the source of truth now.
    clearLegacyAccounts();
  }, []);

  useEffect(() => {
    // Validate any restored session against the server. If the token is no
    // longer valid (e.g. expired or revoked), drop it so the UI redirects to
    // sign-in instead of pretending the user is authenticated.
    let cancelled = false;
    const current = tokenRef.current;
    if (!current) return;
    (async () => {
      try {
        const apiUser = await authApi.me(current);
        if (cancelled) return;
        if (!apiUser) {
          updateSession(null);
        } else {
          updateSession({ token: current, user: toUser(apiUser) });
        }
      } catch {
        // Network failure — keep the cached session so the user isn't kicked
        // out unnecessarily; the next protected request will surface the issue.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const lock = getLockoutState(email);
    if (lock.locked) {
      throw new LoginLockoutError(lock.msRemaining, lock.failures);
    }

    try {
      const result = await authApi.login({ email, password });
      recordSuccess(email);
      updateSession({ token: result.token, user: toUser(result.user) });
    } catch (err) {
      recordFailure(email);
      const fresh = getLockoutState(email);
      if (fresh.locked) {
        throw new LoginLockoutError(fresh.msRemaining, fresh.failures);
      }
      if (err instanceof Error) throw err;
      throw new Error("Invalid email or password");
    }
  };

  const signup = async (name: string, email: string, password: string, initialBalanceUsd?: number) => {
    const result = await authApi.signup({ name, email, password, initialBalanceUsd });
    updateSession({ token: result.token, user: toUser(result.user) });

    try {
      await publicApi.registerClient({ name: result.user.name, email: result.user.email });
    } catch {
      // silent — don't block signup if the admin notification is unavailable
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = tokenRef.current;
    if (!token) {
      throw new Error("You must be signed in to change your password.");
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      throw new Error(passwordCheck.error ?? "Please choose a stronger password.");
    }

    if (currentPassword === newPassword) {
      throw new Error("New password must be different from your current password.");
    }

    await authApi.changePassword(token, { currentPassword, newPassword });
  };

  const accountExists = async (email: string): Promise<boolean> => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    try {
      const { exists } = await authApi.exists(trimmed);
      return exists;
    } catch {
      return false;
    }
  };

  const forgotPassword = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error("Please enter the email address for your account.");
    }
    await authApi.forgotPassword(trimmed);
  };

  const resetPasswordWithToken = async (token: string, newPassword: string) => {
    if (!token) {
      throw new Error("Reset link is missing or invalid.");
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.ok) {
      throw new Error(passwordCheck.error ?? "Please choose a stronger password.");
    }

    const result = await authApi.resetPassword({ token, newPassword });
    updateSession({ token: result.token, user: toUser(result.user) });

    // Clear any active lockout for this email so a previously locked-out user
    // can use the dashboard immediately after resetting.
    recordSuccess(result.user.email);
  };

  const logout = async () => {
    const token = tokenRef.current;
    updateSession(null);
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // ignore — we've already dropped the local session
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        isAuthenticated: !!session,
        token: session?.token ?? null,
        login,
        signup,
        changePassword,
        forgotPassword,
        resetPasswordWithToken,
        accountExists,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
