import { taskPeriodKey } from "./RecurringTaskState";
import { getAdVipBenefits } from "../../content/adVip";

export interface AdVipState {
  watchedAds: number;
  daily: { key: string; claimedLevel: number };
  weekly: { key: string; claimedLevel: number };
  freeRefreshesUsed: number;
}
export function normalizeAdVip(value: Partial<AdVipState> | undefined, now: number): AdVipState {
  const integer = (value: unknown, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
  const watchedAds = integer(value?.watchedAds, 500);
  const level = getAdVipBenefits(watchedAds).level;
  const dailyKey = taskPeriodKey("daily", now);
  const weeklyKey = taskPeriodKey("weekly", now);
  return {
    watchedAds,
    daily: { key: dailyKey, claimedLevel: value?.daily?.key === dailyKey ? integer(value.daily.claimedLevel, level) : 0 },
    weekly: { key: weeklyKey, claimedLevel: value?.weekly?.key === weeklyKey ? integer(value.weekly.claimedLevel, level) : 0 },
    freeRefreshesUsed: value?.daily?.key === dailyKey ? integer(value.freeRefreshesUsed, 3) : 0,
  };
}
