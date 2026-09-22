/** Time-based idle chest. Gold and experience are shown directly; equipment stays boxed until reveal. */

import { difficultyRank, isGameDifficulty, type GameDifficulty } from "../content/difficulties";
import { IDLE_CAP_HOURS, idleExperiencePerHour, referenceLevel } from "../content/numericalModel";
import { RARITY_RANK, type Rarity } from "../content/rarities";
import { SeededRandom, type RandomSource } from "../simulation/RandomSource";
import {
  applyOfflineExpAbilityBonus,
  applyOfflineGoldAbilityBonus,
  type AbilityLevels,
} from "./AbilitySystem";
import { createNaturalEquipment } from "./EquipmentDropSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import type { InventoryItem } from "./EquipmentSystem";

export const LOOT_CHEST_CAP_MS = IDLE_CAP_HOURS * 60 * 60_000;
export const LOOT_CHEST_MIN_OPEN_MS = 5 * 60_000;
export const LOOT_CHEST_DROP_ROLL_MS = 60_000;
export const LOOT_CHEST_DROP_WINDOW_MS = 45 * 60_000;
export const LOOT_CHEST_MAX_DROPS_PER_WINDOW = 6;
export const LOOT_CHEST_GOLD_RATE_MULTIPLIER = 0.25;
export const LOOT_CHEST_EXP_RATE_MULTIPLIER = 0.3;

/** Offline clear-equivalent chance, tuned to TBH's frequent low-tier chest cadence. */
export const LOOT_CHEST_DROP_CHANCE_BY_DIFFICULTY: Record<GameDifficulty, number> = {
  easy: 0.12,
  hard: 0.12,
  nightmare: 0.1,
  hell: 0.08,
  torment: 0.06,
};

export type EquipmentChestTier = "wood" | "bronze" | "silver" | "gold";

export interface LootChestState {
  /** Real timestamp when the current accumulation period began. */
  startedAt: number;
  checkpointAt?: number;
  segments?: Array<{ accumulatedMs: number; stage: number; difficulty: GameDifficulty }>;
}

export interface LootChestPreview {
  accumulatedMs: number;
  minutes: number;
  progress: number;
  full: boolean;
  gold: number;
  exp: number;
  items: InventoryItem[];
}

export interface LootChestHourlyRates {
  gold: number;
  exp: number;
}

export interface LootChestOpenResult extends LootChestPreview {
  ok: true;
  chest: LootChestState;
}

export interface LootChestOpenFail {
  ok: false;
  reason: "empty";
}

export function createDefaultLootChest(now = Date.now()): LootChestState {
  return { startedAt: Math.max(0, Math.round(now)) };
}

export function normalizeLootChest(raw: unknown, now = Date.now()): LootChestState {
  if (!raw || typeof raw !== "object") return createDefaultLootChest(now);
  const startedAt = (raw as Partial<LootChestState>).startedAt;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) {
    return createDefaultLootChest(now);
  }
  const source = raw as LootChestState;
  const normalized = { startedAt: Math.min(Math.max(0, Math.round(startedAt)), now) } as LootChestState;
  if (Array.isArray(source.segments) && Number.isFinite(source.checkpointAt)) {
    normalized.checkpointAt = Math.max(normalized.startedAt, Math.min(now, source.checkpointAt!));
    let remaining = LOOT_CHEST_CAP_MS;
    normalized.segments = source.segments.flatMap((segment) => {
      if (!segment || !Number.isFinite(segment.accumulatedMs) || !Number.isFinite(segment.stage) || !isGameDifficulty(segment.difficulty)) return [];
      const accumulatedMs = Math.max(0, Math.min(remaining, segment.accumulatedMs));
      remaining -= accumulatedMs;
      return accumulatedMs > 0 ? [{ accumulatedMs, stage: normalizeRewardStage(segment.stage), difficulty: segment.difficulty }] : [];
    });
  }
  return normalized;
}

export function getLootChestAccumulatedMs(
  chest: LootChestState,
  now = Date.now(),
  speedBonusFraction = 0,
): number {
  const bankedMs = (chest.segments ?? []).reduce((total, segment) => total + segment.accumulatedMs, 0);
  const rawElapsed = Math.max(0, now - (chest.checkpointAt ?? chest.startedAt));
  const effectiveElapsed = rawElapsed * (1 + Math.max(0, speedBonusFraction));
  return Math.min(LOOT_CHEST_CAP_MS, bankedMs + Math.floor(effectiveElapsed));
}

export function getLootChestProgress(
  chest: LootChestState,
  now = Date.now(),
  speedBonusFraction = 0,
): number {
  return getLootChestAccumulatedMs(chest, now, speedBonusFraction) / LOOT_CHEST_CAP_MS;
}

export function canOpenLootChest(
  chest: LootChestState,
  now = Date.now(),
  speedBonusFraction = 0,
): boolean {
  return getLootChestAccumulatedMs(chest, now, speedBonusFraction) >= LOOT_CHEST_MIN_OPEN_MS;
}

export function getEquipmentChestTier(rarity: Rarity): EquipmentChestTier {
  const rank = RARITY_RANK[rarity];
  if (rank === RARITY_RANK.common) return "wood";
  if (rank === RARITY_RANK.uncommon) return "bronze";
  if (rank === RARITY_RANK.rare) return "silver";
  return "gold";
}

export function getEquipmentChestTierLabel(tier: EquipmentChestTier): string {
  if (tier === "gold") return "金宝箱";
  if (tier === "silver") return "银宝箱";
  if (tier === "bronze") return "铜宝箱";
  return "木宝箱";
}

function normalizeRewardStage(highestClearedStage: number): number {
  return Math.max(1, Math.min(120, Math.round(highestClearedStage) || 1));
}

function continuousRewardStage(
  highestClearedStage: number,
  difficulty: GameDifficulty,
): number {
  return difficultyRank(difficulty) * 120 + normalizeRewardStage(highestClearedStage);
}

function getBaseLootChestRewards(
  minutes: number,
  highestClearedStage: number,
  difficulty: GameDifficulty,
): LootChestHourlyRates {
  const progressStage = continuousRewardStage(highestClearedStage, difficulty);
  return {
    gold: Math.round(
      (20 + progressStage * 12) * minutes * LOOT_CHEST_GOLD_RATE_MULTIPLIER,
    ),
    exp: idleExperiencePerHour(referenceLevel(highestClearedStage, difficulty)) * minutes / 60,
  };
}

export function getLootChestHourlyRates(
  highestClearedStage: number,
  abilities?: AbilityLevels,
  difficulty: GameDifficulty = "easy",
): LootChestHourlyRates {
  const base = getBaseLootChestRewards(60, highestClearedStage, difficulty);
  return {
    gold: abilities ? applyOfflineGoldAbilityBonus(base.gold, abilities) : base.gold,
    exp: abilities ? applyOfflineExpAbilityBonus(base.exp, abilities) : base.exp,
  };
}

function rewardSeed(chest: LootChestState, stage: number, difficulty: GameDifficulty): number {
  return (
    Math.imul(chest.startedAt | 0, 31)
    ^ Math.imul(stage, 97_531)
    ^ Math.imul(difficultyRank(difficulty) + 1, 104_729)
  ) >>> 0;
}

export function rollLootChestItems(
  accumulatedMs: number,
  stage: number,
  difficulty: GameDifficulty,
  random: RandomSource,
): InventoryItem[] {
  const rollCount = Math.floor(Math.max(0, accumulatedMs) / LOOT_CHEST_DROP_ROLL_MS);
  const rollsPerWindow = Math.max(
    1,
    Math.floor(LOOT_CHEST_DROP_WINDOW_MS / LOOT_CHEST_DROP_ROLL_MS),
  );
  const dropChance = LOOT_CHEST_DROP_CHANCE_BY_DIFFICULTY[difficulty];
  const items: InventoryItem[] = [];
  let activeWindow = -1;
  let dropsInWindow = 0;
  for (let roll = 0; roll < rollCount; roll += 1) {
    const window = Math.floor(roll / rollsPerWindow);
    if (window !== activeWindow) {
      activeWindow = window;
      dropsInWindow = 0;
    }
    if (dropsInWindow >= LOOT_CHEST_MAX_DROPS_PER_WINDOW) continue;
    if (random.next() >= dropChance) continue;
    const definition = selectEquipmentDefinition(stage, random);
    items.push(createNaturalEquipment(definition.id, stage, difficulty, "chest", random));
    dropsInWindow += 1;
  }
  return items;
}

export function previewLootChest(
  chest: LootChestState,
  now: number,
  highestClearedStage: number,
  difficulty: GameDifficulty = "easy",
  abilities?: AbilityLevels,
): LootChestPreview {
  const speedBonus = abilities ? (abilities.chest_progress ?? 0) * 0.005 : 0;
  const accumulatedMs = getLootChestAccumulatedMs(chest, now, speedBonus);
  const minutes = Math.floor(accumulatedMs / 60_000);
  const segments = [...(chest.segments ?? [])];
  const bankedMs = segments.reduce((total, segment) => total + segment.accumulatedMs, 0);
  segments.push({ accumulatedMs: Math.max(0, accumulatedMs - bankedMs), stage: normalizeRewardStage(highestClearedStage), difficulty });
  let offset = 0, baseGold = 0, baseExp = 0;
  const items: InventoryItem[] = [];
  for (const segment of segments) {
    const base = getBaseLootChestRewards(segment.accumulatedMs / 60_000, segment.stage, segment.difficulty);
    baseGold += base.gold; baseExp += base.exp;
    const random = new SeededRandom(rewardSeed({ startedAt: chest.startedAt + offset }, segment.stage, segment.difficulty));
    items.push(...rollLootChestItems(segment.accumulatedMs, segment.stage, segment.difficulty, random));
    offset += segment.accumulatedMs;
  }
  const gold = Math.floor(abilities ? applyOfflineGoldAbilityBonus(baseGold, abilities) : baseGold);
  const exp = Math.floor(abilities ? applyOfflineExpAbilityBonus(baseExp, abilities) : baseExp);
  return {
    accumulatedMs,
    minutes,
    progress: accumulatedMs / LOOT_CHEST_CAP_MS,
    full: accumulatedMs >= LOOT_CHEST_CAP_MS,
    gold,
    exp,
    items,
  };
}

/** Close the old reward tier at the moment a higher tier is cleared. */
export function checkpointLootChest(chest: LootChestState, now: number, stage: number, difficulty: GameDifficulty, abilities?: AbilityLevels): void {
  const speed = abilities ? (abilities.chest_progress ?? 0) * 0.005 : 0;
  const totalMs = getLootChestAccumulatedMs(chest, now, speed);
  const segments = chest.segments ?? (chest.segments = []);
  const elapsed = totalMs - segments.reduce((sum, segment) => sum + segment.accumulatedMs, 0);
  const last = segments[segments.length - 1];
  if (elapsed > 0) {
    if (last?.stage === stage && last.difficulty === difficulty) last.accumulatedMs += elapsed;
    else segments.push({ accumulatedMs: elapsed, stage, difficulty });
  }
  chest.checkpointAt = now;
}

export function openLootChest(
  chest: LootChestState,
  now: number,
  highestClearedStage: number,
  difficulty: GameDifficulty = "easy",
  abilities?: AbilityLevels,
): LootChestOpenResult | LootChestOpenFail {
  const preview = previewLootChest(chest, now, highestClearedStage, difficulty, abilities);
  if (preview.accumulatedMs < LOOT_CHEST_MIN_OPEN_MS) {
    return { ok: false, reason: "empty" };
  }
  return {
    ok: true,
    ...preview,
    chest: createDefaultLootChest(now),
  };
}
