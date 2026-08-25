/** Account loot chest charged by monster kills; open freely at tiers 1–5. */

import { RARITY_IDS, RARITY_RANK, type Rarity } from "../content/rarities";
import { SeededRandom, type RandomSource } from "../simulation/RandomSource";
import { createEquipment, chooseRarity, type InventoryItem } from "./EquipmentSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";

export const LOOT_CHEST_MAX_LEVEL = 5;

/**
 * Kills needed to advance from the current level toward the next.
 * Index 0 = Lv.0→1, …, index 4 = Lv.4→5. At Lv.5 the bar only caps.
 */
export const LOOT_CHEST_CHARGE_NEEDED = [12, 20, 30, 42, 56] as const;

export const LOOT_CHEST_LABELS = ["空箱", "木箱", "铜箱", "银箱", "金箱", "宝匣"] as const;

/** Items granted when opening a chest of each level (1–5). */
export const LOOT_CHEST_ITEM_COUNTS = [1, 1, 2, 2, 3] as const;

export interface LootChestState {
  /** Current chest tier, 0–5. */
  level: number;
  /** Progress toward the next upgrade, 0 … chargeNeeded. */
  charge: number;
}

export interface LootChestChargeResult {
  chest: LootChestState;
  leveledUp: boolean;
  becameReady: boolean;
  previousLevel: number;
}

export interface LootChestOpenResult {
  ok: true;
  chest: LootChestState;
  items: InventoryItem[];
  gold: number;
  exp: number;
  openedLevel: number;
  dropStage: number;
  lucky: boolean;
}

export interface LootChestOpenFail {
  ok: false;
  reason: "empty";
}

export function createDefaultLootChest(): LootChestState {
  return { level: 0, charge: 0 };
}

export function normalizeLootChest(raw: unknown): LootChestState {
  const base = createDefaultLootChest();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<LootChestState>;
  const level =
    typeof source.level === "number" && Number.isFinite(source.level)
      ? Math.round(source.level)
      : 0;
  const charge =
    typeof source.charge === "number" && Number.isFinite(source.charge)
      ? Math.round(source.charge)
      : 0;
  const clampedLevel = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(0, level));
  const needed = getLootChestChargeNeeded(clampedLevel);
  return {
    level: clampedLevel,
    charge: Math.min(needed, Math.max(0, charge)),
  };
}

/** Charge required at `level` to advance (or fill the max-tier bar). */
export function getLootChestChargeNeeded(level: number): number {
  const clamped = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(0, level));
  if (clamped >= LOOT_CHEST_MAX_LEVEL) {
    return LOOT_CHEST_CHARGE_NEEDED[LOOT_CHEST_CHARGE_NEEDED.length - 1]!;
  }
  return LOOT_CHEST_CHARGE_NEEDED[clamped]!;
}

export function getLootChestLabel(level: number): string {
  const index = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(0, level));
  return LOOT_CHEST_LABELS[index]!;
}

export function getLootChestItemCount(level: number): number {
  if (level < 1) return 0;
  const index = Math.min(LOOT_CHEST_MAX_LEVEL, level) - 1;
  return LOOT_CHEST_ITEM_COUNTS[index]!;
}

export function getLootChestProgress(chest: LootChestState): number {
  const needed = getLootChestChargeNeeded(chest.level);
  if (needed <= 0) return 1;
  return Math.min(1, Math.max(0, chest.charge / needed));
}

/** Levels 1–5 can be opened at any time; level 0 is empty. */
export function canOpenLootChest(chest: LootChestState): boolean {
  return chest.level >= 1 && chest.level <= LOOT_CHEST_MAX_LEVEL;
}

/** @deprecated Prefer canOpenLootChest — kept for call-site clarity. */
export function isLootChestReady(chest: LootChestState): boolean {
  return canOpenLootChest(chest);
}

/** Kill weight: normal 1, elite 2, boss 4. */
export function getLootChestKillCharge(kind: "normal" | "elite" | "boss"): number {
  if (kind === "boss") return 4;
  if (kind === "elite") return 2;
  return 1;
}

export function getLootChestRewardGold(level: number, highestStage: number): number {
  const tier = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, level));
  return Math.round((40 + highestStage * 8) * (0.8 + tier * 0.45));
}

export function getLootChestRewardExp(level: number, highestStage: number): number {
  const tier = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, level));
  return Math.round((24 + highestStage * 5) * (0.75 + tier * 0.4));
}

/**
 * Apply kill charge. Filling the bar upgrades 0→1→…→5.
 * At max level, further charge only caps the bar.
 */
export function applyLootChestCharge(
  chest: LootChestState,
  rawAmount: number,
  chargeBonusFraction: number,
): LootChestChargeResult {
  let level = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(0, chest.level));
  const previousLevel = level;
  const neededAtStart = getLootChestChargeNeeded(level);

  if (level >= LOOT_CHEST_MAX_LEVEL && chest.charge >= neededAtStart) {
    return {
      chest: { level, charge: neededAtStart },
      leveledUp: false,
      becameReady: false,
      previousLevel,
    };
  }
  if (rawAmount <= 0) {
    return {
      chest: { level, charge: Math.min(neededAtStart, Math.max(0, chest.charge)) },
      leveledUp: false,
      becameReady: false,
      previousLevel,
    };
  }

  let charge =
    Math.max(0, chest.charge) + Math.max(0, rawAmount) * (1 + Math.max(0, chargeBonusFraction));
  let leveledUp = false;

  for (let guard = 0; guard < 8; guard += 1) {
    const needed = getLootChestChargeNeeded(level);
    if (charge < needed) break;
    if (level < LOOT_CHEST_MAX_LEVEL) {
      charge -= needed;
      level += 1;
      leveledUp = true;
      continue;
    }
    charge = needed;
    break;
  }

  return {
    chest: {
      level,
      charge: Math.min(getLootChestChargeNeeded(level), Math.round(charge * 1000) / 1000),
    },
    leveledUp,
    becameReady: previousLevel < 1 && level >= 1,
    previousLevel,
  };
}

function bumpRarity(rarity: Rarity, steps: number): Rarity {
  if (steps <= 0) return rarity;
  const index = Math.min(RARITY_IDS.length - 2, RARITY_RANK[rarity] - 1 + steps);
  return RARITY_IDS[Math.max(0, index)]!;
}

/**
 * Resolve drop stage for one item.
 * Base = highest cleared stage. Only max-tier chests may roll higher.
 */
export function rollLootChestDropStage(
  baseStage: number,
  chestLevel: number,
  random: RandomSource,
): { stage: number; lucky: boolean } {
  const stage = Math.max(1, Math.min(120, Math.round(baseStage)));
  if (chestLevel < LOOT_CHEST_MAX_LEVEL) {
    return { stage, lucky: false };
  }
  const roll = random.next();
  if (roll < 0.003) {
    return { stage: Math.min(120, stage + 24), lucky: true };
  }
  if (roll < 0.015) {
    return { stage: Math.min(120, stage + 12), lucky: true };
  }
  return { stage, lucky: false };
}

function rollLootChestRarity(
  dropStage: number,
  chestLevel: number,
  random: RandomSource,
): { rarity: Rarity; lucky: boolean } {
  const rarity = chooseRarity(dropStage, random);
  if (chestLevel < LOOT_CHEST_MAX_LEVEL) {
    return { rarity, lucky: false };
  }
  const roll = random.next();
  if (roll < 0.002) {
    return { rarity: bumpRarity(rarity, 2), lucky: true };
  }
  if (roll < 0.01) {
    return { rarity: bumpRarity(rarity, 1), lucky: true };
  }
  return { rarity, lucky: false };
}

export function generateLootChestRewards(
  chestLevel: number,
  highestClearedStage: number,
  seed: number,
): { items: InventoryItem[]; lucky: boolean; dropStage: number } {
  const random = new SeededRandom(seed);
  const count = getLootChestItemCount(chestLevel);
  const baseStage = Math.max(1, Math.min(120, Math.round(highestClearedStage)));
  const items: InventoryItem[] = [];
  let lucky = false;
  let maxDropStage = baseStage;

  for (let index = 0; index < count; index += 1) {
    const staged = rollLootChestDropStage(baseStage, chestLevel, random);
    const rare = rollLootChestRarity(staged.stage, chestLevel, random);
    if (staged.lucky || rare.lucky) lucky = true;
    maxDropStage = Math.max(maxDropStage, staged.stage);
    const definition = selectEquipmentDefinition(staged.stage, random);
    items.push(createEquipment(definition.id, staged.stage, rare.rarity, random));
  }

  return { items, lucky, dropStage: maxDropStage };
}

/**
 * Open a chest at levels 1–5: grant gear at highest-cleared drop power,
 * then reset back to level 0 with charge cleared. Only Lv.5 may roll lucky upgrades.
 */
export function openLootChest(
  chest: LootChestState,
  highestClearedStage: number,
  seed: number,
): LootChestOpenResult | LootChestOpenFail {
  const level = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(0, chest.level));
  if (!canOpenLootChest({ level, charge: chest.charge })) {
    return { ok: false, reason: "empty" };
  }

  const stage = Math.max(1, Math.min(120, Math.round(highestClearedStage) || 1));
  const rewards = generateLootChestRewards(level, stage, seed);
  const gold = getLootChestRewardGold(level, stage);
  const exp = getLootChestRewardExp(level, stage);

  return {
    ok: true,
    chest: { level: 0, charge: 0 },
    items: rewards.items,
    gold,
    exp,
    openedLevel: level,
    dropStage: rewards.dropStage,
    lucky: rewards.lucky,
  };
}
