import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";

const BALANCE_KEY = "cryptovault_balance_btc";
const SESSION_KEY = "cryptovault.session";
export const BTC_PRICE_USD = 27000;
// Default to 0 so a brand-new account that left "Assets in total" blank
// shows an empty (0) balance instead of a fake demo amount until the
// server balance loads.
const INITIAL_BTC = 0;
const EVENT = "cryptovault:balance-changed";

function getStoredToken(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}

// Kept for syncBalanceFromServer only — reading the server balance is fine.
// Writing back is intentionally removed to prevent client-side balance forgery.

function loadBtc(): number {
  if (typeof window === "undefined") return INITIAL_BTC;
  try {
    const raw = window.localStorage.getItem(BALANCE_KEY);
    if (raw == null) return INITIAL_BTC;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return INITIAL_BTC;
    return n;
  } catch {
    return INITIAL_BTC;
  }
}

function saveBtc(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BALANCE_KEY, String(value));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore
  }
}

export async function syncBalanceFromServer(): Promise<void> {
  const token = getStoredToken();
  if (!token) return;
  try {
    const serverBtc = await authApi.getBalance(token);
    if (serverBtc !== null && Number.isFinite(serverBtc) && serverBtc >= 0) {
      saveBtc(serverBtc);
    }
  } catch {
    // ignore — fall back to localStorage
  }
}

export function debitUsd(usdAmount: number): { btcDebited: number; remainingBtc: number } {
  const current = loadBtc();
  const btcToDebit = usdAmount / BTC_PRICE_USD;
  const next = Math.max(0, Math.round((current - btcToDebit) * 100000000) / 100000000);
  saveBtc(next);
  return { btcDebited: btcToDebit, remainingBtc: next };
}

export function debitAll(): { btcDebited: number; usdDebited: number; remainingBtc: number } {
  const current = loadBtc();
  saveBtc(0);
  return { btcDebited: current, usdDebited: current * BTC_PRICE_USD, remainingBtc: 0 };
}

export function resetBalance() {
  saveBtc(INITIAL_BTC);
}

export function useBalance() {
  const [btc, setBtc] = useState<number>(() => loadBtc());

  useEffect(() => {
    syncBalanceFromServer().then(() => {
      setBtc(loadBtc());
    });

    const refresh = () => setBtc(loadBtc());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const usd = btc * BTC_PRICE_USD;
  return {
    btc,
    usd,
    btcFormatted: btc.toFixed(4),
    usdFormatted: usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
}
