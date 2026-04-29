import React, { createContext, useContext, useState, useEffect } from "react";
import { publicApi } from "./api";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "BTC";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rateFromUsd: number;
}

const STATIC_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BTC: 1 / 27000,
};

const CURRENCY_META: Omit<CurrencyInfo, "rateFromUsd">[] = [
  { code: "USD", symbol: "$",  label: "US Dollar" },
  { code: "EUR", symbol: "€",  label: "Euro" },
  { code: "GBP", symbol: "£",  label: "British Pound" },
  { code: "BTC", symbol: "₿",  label: "Bitcoin" },
];

function buildCurrencies(rates: Record<string, number>): CurrencyInfo[] {
  return CURRENCY_META.map(meta => ({
    ...meta,
    rateFromUsd: rates[meta.code] ?? STATIC_RATES[meta.code],
  }));
}

export let CURRENCIES: CurrencyInfo[] = buildCurrencies(STATIC_RATES);

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const DEFAULT_CURRENCY = CURRENCIES[0];

export interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  convert: (usd: number) => number;
  fmt: (usd: number, opts?: { decimals?: number }) => string;
  ratesLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>(CURRENCIES);
  const [currency, setCurrencyState] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function fetchRates() {
      publicApi.getExchangeRates()
        .then(rates => {
          if (cancelled) return;
          const updated = buildCurrencies(rates);
          CURRENCIES = updated;
          setCurrencies(updated);
          setCurrencyState(prev => updated.find(c => c.code === prev.code) ?? prev);
        })
        .catch(() => {
        })
        .finally(() => {
          if (!cancelled) setRatesLoading(false);
        });
    }

    fetchRates();
    const intervalId = setInterval(fetchRates, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    const found = currencies.find(c => c.code === code);
    if (found) setCurrencyState(found);
  };

  const convert = (usd: number): number => usd * currency.rateFromUsd;

  const fmt = (usd: number, opts: { decimals?: number } = {}): string => {
    const value = convert(usd);
    if (currency.code === "BTC") {
      return `₿${value.toFixed(opts.decimals ?? 6)}`;
    }
    const decimals = opts.decimals ?? 2;
    return `${currency.symbol}${value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, fmt, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
