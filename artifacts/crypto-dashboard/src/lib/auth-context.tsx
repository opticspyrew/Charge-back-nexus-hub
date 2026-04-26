import React, { createContext, useContext, useEffect, useState } from "react";
import { publicApi } from "./api";
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

interface HashedAccount {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  iterations: number;
}

interface LegacyAccount {
  email: string;
  name: string;
  password: string;
}

type StoredAccount = HashedAccount | LegacyAccount;

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

const PBKDF2_ITERATIONS = 150_000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

function isHashedAccount(account: StoredAccount): account is HashedAccount {
  return (
    typeof (account as HashedAccount).passwordHash === "string" &&
    typeof (account as HashedAccount).salt === "string" &&
    typeof (account as HashedAccount).iterations === "number"
  );
}

function isLegacyAccount(account: StoredAccount): account is LegacyAccount {
  return typeof (account as LegacyAccount).password === "string";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto is not available in this environment.");
  }
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH_BITS,
  );
  return bytesToBase64(new Uint8Array(derived));
}

async function hashPassword(password: string): Promise<{
  passwordHash: string;
  salt: string;
  iterations: number;
}> {
  if (!window.crypto?.getRandomValues || !window.crypto?.subtle) {
    throw new Error(
      "Your browser does not support the secure cryptography needed to create an account. Please update to a modern browser and try again.",
    );
  }
  const saltBytes = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const passwordHash = await derivePasswordHash(password, saltBytes, PBKDF2_ITERATIONS);
  return {
    passwordHash,
    salt: bytesToBase64(saltBytes),
    iterations: PBKDF2_ITERATIONS,
  };
}

async function verifyPassword(account: HashedAccount, password: string): Promise<boolean> {
  try {
    const saltBytes = base64ToBytes(account.salt);
    const candidate = await derivePasswordHash(password, saltBytes, account.iterations);
    return timingSafeEqual(candidate, account.passwordHash);
  } catch {
    return false;
  }
}

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
    return parsed.filter((a) => {
      if (!a || typeof a.email !== "string" || typeof a.name !== "string") return false;
      return isHashedAccount(a) || isLegacyAccount(a);
    });
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

  useEffect(() => {
    // Touch storage so any tab open before this version still loads cleanly.
    loadAccounts();
  }, []);

  const setUser = (next: User | null) => {
    saveSession(next);
    setUserState(next);
  };

  const login = async (email: string, password: string) => {
    const lock = getLockoutState(email);
    if (lock.locked) {
      throw new LoginLockoutError(lock.msRemaining, lock.failures);
    }

    await new Promise((r) => setTimeout(r, 400));
    const normalized = email.trim().toLowerCase();

    const failAndThrow = (): never => {
      recordFailure(email);
      throw new Error("Invalid email or password");
    };

    if (normalized === PRIMARY_EMAIL && password === PRIMARY_PASSWORD) {
      recordSuccess(email);
      setUser({ email: PRIMARY_EMAIL, name: PRIMARY_NAME });
      return;
    }

    const stored = loadAccounts();
    const index = stored.findIndex((a) => a.email.trim().toLowerCase() === normalized);
    if (index === -1) {
      failAndThrow();
    }
    const account = stored[index];

    if (isHashedAccount(account)) {
      const ok = await verifyPassword(account, password);
      if (!ok) failAndThrow();
      recordSuccess(email);
      setUser({ email: account.email, name: account.name });
      return;
    }

    if (isLegacyAccount(account)) {
      // One-time migration: verify the legacy plain-text password, then
      // immediately upgrade the stored record to a hashed representation
      // so the plain-text value never lives on disk again.
      if (account.password !== password) {
        failAndThrow();
      }
      const hashed = await hashPassword(password);
      const upgraded: HashedAccount = {
        email: account.email,
        name: account.name,
        ...hashed,
      };
      const next = [...stored];
      next[index] = upgraded;
      saveAccounts(next);
      recordSuccess(email);
      setUser({ email: upgraded.email, name: upgraded.name });
      return;
    }

    failAndThrow();
  };

  const signup = async (name: string, email: string, password: string) => {
    const normalized = email.trim().toLowerCase();

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      throw new Error(passwordCheck.error ?? "Please choose a stronger password.");
    }

    if (normalized === PRIMARY_EMAIL) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    const existing = loadAccounts();
    if (existing.some((a) => a.email.trim().toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    const hashed = await hashPassword(password);
    const newAccount: HashedAccount = {
      email: email.trim(),
      name: name.trim(),
      ...hashed,
    };
    const updated = [...existing, newAccount];
    saveAccounts(updated);
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
