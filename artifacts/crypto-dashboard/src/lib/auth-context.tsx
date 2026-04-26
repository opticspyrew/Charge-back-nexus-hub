import React, { createContext, useContext, useEffect, useState } from "react";
import { publicApi } from "./api";

interface User {
  email: string;
  name: string;
  avatar?: string;
}

interface StoredAccount {
  email: string;
  name: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCOUNTS_KEY = "cryptovault.accounts";
const SESSION_KEY = "cryptovault.session";
const PRIMARY_EMAIL = "pgeitz@hotmail.com";
const PRIMARY_PASSWORD = "Centuryhacks";
const PRIMARY_NAME = "Pgeitz";

function loadSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.email === "string" &&
      typeof parsed.name === "string" &&
      (typeof parsed.avatar === "string" || typeof parsed.avatar === "undefined")
    ) {
      return { email: parsed.email, name: parsed.name, avatar: parsed.avatar };
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) =>
        a &&
        typeof a.email === "string" &&
        typeof a.name === "string" &&
        typeof a.password === "string",
    );
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => loadSession());
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  useEffect(() => {
    setAccounts(loadAccounts());
  }, []);

  const setUser = (next: User | null) => {
    saveSession(next);
    setUserState(next);
  };

  const login = async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 800));
    const normalized = email.trim().toLowerCase();

    if (normalized === PRIMARY_EMAIL && password === PRIMARY_PASSWORD) {
      setUser({ email: PRIMARY_EMAIL, name: PRIMARY_NAME });
      return;
    }

    const stored = loadAccounts();
    const match = stored.find(
      (a) => a.email.trim().toLowerCase() === normalized && a.password === password,
    );
    if (!match) {
      throw new Error("Invalid email or password");
    }
    setUser({ email: match.email, name: match.name });
  };

  const signup = async (name: string, email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 800));
    const normalized = email.trim().toLowerCase();

    if (normalized === PRIMARY_EMAIL) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    const existing = loadAccounts();
    if (existing.some((a) => a.email.trim().toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    const newAccount: StoredAccount = { email: email.trim(), name: name.trim(), password };
    const updated = [...existing, newAccount];
    saveAccounts(updated);
    setAccounts(updated);
    setUser({ email: newAccount.email, name: newAccount.name });

    try {
      await publicApi.registerClient({ name: newAccount.name, email: newAccount.email });
    } catch {
      // silent — don't block signup if the API is temporarily unavailable
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
