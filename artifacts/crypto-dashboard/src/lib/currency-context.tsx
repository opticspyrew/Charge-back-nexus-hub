import React, { createContext, useContext, useState } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "BTC";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rateFromUsd: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$",  label: "US Dollar",      rateFromUsd: 1 },
  { code: "EUR", symbol: "€",  label: "Euro",           rateFromUsd: 0.92 },
  { code: "GBP", symbol: "£",  label: "British Pound",  rateFromUsd: 0.79 },
  { code: "BTC", symbol: "₿",  label: "Bitcoin",        rateFromUsd: 1 / 27000 },
];

const DEFAULT_CURRENCY = CURRENCIES[0];

export interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  convert: (usd: number) => number;
  fmt: (usd: number, opts?: { decimals?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(DEFAULT_CURRENCY);

  const setCurrency = (code: CurrencyCode) => {
    const found = CURRENCIES.find(c => c.code === code);
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
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
