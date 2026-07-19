"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GrowthPlan,
  GrowthProjection,
  Milestone,
  MonthlyGoalProgress,
  Operation,
  PerformanceStats,
  ComparisonStatus,
} from "./types";

export interface MilestoneProgress extends Milestone {
  reached: boolean;
  progress: number;
  weeksAway: number | null;
}

export interface GrowthResponse {
  plan: GrowthPlan;
  projection: GrowthProjection;
  stats: PerformanceStats;
  milestones: MilestoneProgress[];
  comparison: {
    status: ComparisonStatus;
    realNow: number;
    projectedNow: number;
    deltaPct: number;
    week: number;
  };
  nextMilestone: {
    label: string;
    value: number;
    remaining: number;
    weeksAway: number | null;
    progress: number;
  } | null;
  monthlyGoal: MonthlyGoalProgress;
}

export type { Operation, PerformanceStats, GrowthPlan, MonthlyGoalProgress };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: "no-store" }).then((r) => json<T>(r));
}

/**
 * Global revalidation bus: every mounted useApi hook registers its refresh
 * here, so a single mutation (add/edit/delete anywhere) re-fetches all live
 * data — the header Capital, dashboard, etc. update on their own, no reload.
 */
const revalidators = new Set<() => void>();

export function revalidateAll() {
  for (const fn of revalidators) fn();
}

export function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  return fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((r) => json<T>(r))
    .then((data) => {
      // A mutation just succeeded — refresh every mounted query.
      revalidateAll();
      return data;
    });
}

/** Minimal data hook: fetch on mount, expose refresh + optimistic setters. */
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const d = await apiGet<T>(url);
      setData(d);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void refresh();
    // Join the revalidation bus so mutations elsewhere refresh this data too.
    revalidators.add(refresh);
    return () => {
      revalidators.delete(refresh);
    };
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
