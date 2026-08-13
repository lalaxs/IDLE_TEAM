/** Account loot chest charged by monster kills. */

export const LOOT_CHEST_MAX_LEVEL = 5;

/** Kills needed to fill the bar at each chest level (1–5). */
export const LOOT_CHEST_CHARGE_NEEDED = [12, 20, 30, 42, 56] as const;

export const LOOT_CHEST_LABELS = ["木箱", "铜箱", "银箱", "金箱", "宝匣"] as const;

export interface LootChestState {
  /** Current chest tier, 1–5. */
  level: number;
  /** Progress toward the next fill, 0 … chargeNeeded. */
  charge: number;
}

export function createDefaultLootChest(): LootChestState {
  return { level: 1, charge: 0 };
}

export function normalizeLootChest(raw: unknown): LootChestState {
  const base = createDefaultLootChest();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<LootChestState>;
  const level =
    typeof source.level === "number" && Number.isFinite(source.level)
      ? Math.round(source.level)
      : 1;
  const charge =
    typeof source.charge === "number" && Number.isFinite(source.charge)
      ? Math.round(source.charge)
      : 0;
  const clampedLevel = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, level));
  const needed = getLootChestChargeNeeded(clampedLevel);
  return {
    level: clampedLevel,
    charge: Math.min(needed, Math.max(0, charge)),
  };
}

export function getLootChestChargeNeeded(level: number): number {
  const index = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, level)) - 1;
  return LOOT_CHEST_CHARGE_NEEDED[index]!;
}

export function getLootChestLabel(level: number): string {
  const index = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, level)) - 1;
  return LOOT_CHEST_LABELS[index]!;
}

export function getLootChestProgress(chest: LootChestState): number {
  const needed = getLootChestChargeNeeded(chest.level);
  if (needed <= 0) return 1;
  return Math.min(1, Math.max(0, chest.charge / needed));
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

export interface LootChestChargeResult {
  chest: LootChestState;
  leveledUp: boolean;
  rewarded: boolean;
  goldGained: number;
  previousLevel: number;
}

/**
 * Apply kill charge. Filling the bar upgrades the chest (max 5).
 * At max level, each fill grants a reward and resets charge.
 */
export function applyLootChestCharge(
  chest: LootChestState,
  rawAmount: number,
  chargeBonusFraction: number,
  highestStage: number,
): LootChestChargeResult {
  const amount = Math.max(0, rawAmount) * (1 + Math.max(0, chargeBonusFraction));
  let level = Math.min(LOOT_CHEST_MAX_LEVEL, Math.max(1, chest.level));
  let charge = Math.max(0, chest.charge) + amount;
  let leveledUp = false;
  let rewarded = false;
  let goldGained = 0;
  const previousLevel = level;

  // Allow multi-fill if a boss dump overflows several bars.
  for (let guard = 0; guard < 8; guard += 1) {
    const needed = getLootChestChargeNeeded(level);
    if (charge < needed) break;
    charge -= needed;
    if (level < LOOT_CHEST_MAX_LEVEL) {
      level += 1;
      leveledUp = true;
      goldGained += getLootChestRewardGold(level, highestStage);
      rewarded = true;
    } else {
      goldGained += getLootChestRewardGold(level, highestStage);
      rewarded = true;
    }
  }

  return {
    chest: {
      level,
      charge: Math.min(getLootChestChargeNeeded(level), Math.round(charge * 1000) / 1000),
    },
    leveledUp,
    rewarded,
    goldGained,
    previousLevel,
  };
}