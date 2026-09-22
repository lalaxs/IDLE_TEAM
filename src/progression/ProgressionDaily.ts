import { getDateKey } from "../domain/time/GameDay";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { ACTIVE_EXPERIENCE_HOURS_PER_DAY, DOUBLE_CLAIMS_PER_DAY, QUICK_REWARDS_PER_DAY } from "../content/numericalModel";

export interface ProgressionDaily {
  dateKey: string;
  doubleClaims: number;
  quickRewards: number;
  activeHours: number;
}

export function normalizeProgressionDaily(raw: Partial<ProgressionDaily> | undefined, now = Date.now()): ProgressionDaily {
  const dateKey = getDateKey(new Date(now));
  const current = raw?.dateKey === dateKey ? raw : undefined;
  const amount = (n: number | undefined, cap: number) => Number.isFinite(n) ? Math.max(0, Math.min(cap, n!)) : 0;
  return { dateKey, doubleClaims: Math.floor(amount(current?.doubleClaims, DOUBLE_CLAIMS_PER_DAY)),
    quickRewards: Math.floor(amount(current?.quickRewards, QUICK_REWARDS_PER_DAY)),
    activeHours: amount(current?.activeHours, ACTIVE_EXPERIENCE_HOURS_PER_DAY) };
}

export function syncProgressionDaily(save: SaveDataV1, now = Date.now()): void {
  if (!save.progressionDaily || save.progressionDaily.dateKey !== getDateKey(new Date(now))) {
    save.progressionDaily = normalizeProgressionDaily(undefined, now);
  }
}
