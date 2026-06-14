import { useEffect, useState } from "react";
import type { RecoveryCategory, RecoveryStat, RecoveryTrendPoint } from "./types";
import {
  getRecoveryCategories,
  getRecoveryStats,
  getRecoveryTrend,
} from "./mocks";

// ---------------------------------------------------------------------------
// Refunds.site homepage data layer.
//
// This module is the single seam between the homepage and its data source.
// Components consume the hooks below; the swap from bundled mock data to live
// API calls is contained entirely here. Mock data is used only as an instant
// first-paint seed and as a graceful fallback if the API is unreachable, so a
// marketing page never renders empty.
// ---------------------------------------------------------------------------

// Root-relative to match the existing lib/api.ts convention (the proxy maps
// `/api` to the API server regardless of the artifact's base path).
const BASE = "/api/public/refunds";

export interface HomepageData {
  stats: RecoveryStat[];
  categories: RecoveryCategory[];
  trend: RecoveryTrendPoint[];
}

let homepagePromise: Promise<HomepageData> | null = null;

async function requestHomepageData(): Promise<HomepageData> {
  const res = await fetch(`${BASE}/homepage`);
  if (!res.ok) throw new Error("Failed to load homepage data");
  return (await res.json()) as HomepageData;
}

// Shared, cached fetch so the stats, categories, and trend hooks trigger a
// single network request per page load rather than one each.
export function fetchHomepageData(): Promise<HomepageData> {
  if (!homepagePromise) {
    homepagePromise = requestHomepageData().catch((err) => {
      homepagePromise = null;
      throw err;
    });
  }
  return homepagePromise;
}

function useHomepageSlice<T>(
  initial: T,
  select: (data: HomepageData) => T,
): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    let active = true;
    fetchHomepageData()
      .then((data) => {
        if (active) setValue(select(data));
      })
      .catch(() => {
        // Keep the seeded mock fallback already in state.
      });
    return () => {
      active = false;
    };
  }, []);
  return value;
}

export function useRecoveryStats(): RecoveryStat[] {
  return useHomepageSlice(getRecoveryStats(), (d) => d.stats);
}

export function useRecoveryCategories(): RecoveryCategory[] {
  return useHomepageSlice(getRecoveryCategories(), (d) => d.categories);
}

export function useRecoveryTrend(): RecoveryTrendPoint[] {
  return useHomepageSlice(getRecoveryTrend(), (d) => d.trend);
}

export interface CaseIntakePayload {
  incident: string;
  asset: string;
  chain: string;
  amount: string;
  txHashes: string;
  evidenceCount: number;
}

export interface CaseIntakeResult {
  reference: string;
  requestId: number;
}

export async function submitCaseIntake(
  token: string,
  payload: CaseIntakePayload,
): Promise<CaseIntakeResult> {
  const res = await fetch(`${BASE}/intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to submit case intake");
  }
  return (await res.json()) as CaseIntakeResult;
}
