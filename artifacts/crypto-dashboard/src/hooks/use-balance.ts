import { useEffect, useState } from "react";

const BALANCE_KEY = "cryptovault_balance_btc";
const INITIAL_BTC = 1.8802;
export const BTC_PRICE_USD = 27000;
const EVENT = "cryptovault:balance-changed";

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
