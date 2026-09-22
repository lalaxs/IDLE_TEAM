/** Shared hero, equipment and combat curves. Progression pacing lives in numericalModel.ts. */

import type { ChapterId } from "./chapters";
import { stageToChapter } from "./chapters";

/** Enemy HP growth per stage (DI: difficulty mostly stacks HP). */
export const ENEMY_HP_GROWTH = 1.045;
/** Enemy attack growth (slower than HP). */
export const ENEMY_ATK_GROWTH = 1.032;
export const ENEMY_DEF_GROWTH = 1.034;

/** Item power-like budget growth. */
export const ITEM_BUDGET_BASE = 36;
export const ITEM_BUDGET_GROWTH = 1.037;

/** Salvage uses a slower economy curve so high-level gear does not overwhelm other gold sources. */
export const SALVAGE_GOLD_BASE = 50;
export const SALVAGE_GOLD_GROWTH = 1.035;

export const BASE_TIER_MULTIPLIER: Record<1 | 2 | 3 | 4, number> = {
  1: 1,
  2: 1.04,
  3: 1.08,
  4: 1.12,
};

/** Hero base growth; equipment supplies a separate additive budget. */
export const HERO_HP_PER_LEVEL = 1.036;
export const HERO_ATK_PER_LEVEL = 1.035;
export const HERO_DEF_PER_LEVEL = 1.035;
export const MAX_HERO_LEVEL = 100;
export const HERO_LEVELS_PER_ASCEND = 20;

/** Soft armor: damage = atk² / (atk + def × factor). */
export const ARMOR_FACTOR = 1.25;
export const DAMAGE_VARIANCE_MIN = 0.92;
export const DAMAGE_VARIANCE_SPAN = 0.16;
export const BASE_CRIT_MULTIPLIER = 1.5;

/** Chapter difficulty bands (silent Hell-like steps). */
const CHAPTER_HP_BAND: Record<ChapterId, number> = {
  1: 1,
  2: 1,
  3: 1.08,
  4: 1.08,
  5: 1.18,
  6: 1.18,
  7: 1.32,
  8: 1.32,
  9: 1.5,
  10: 1.5,
};

const CHAPTER_ATK_BAND: Record<ChapterId, number> = {
  1: 1,
  2: 1,
  3: 1.04,
  4: 1.04,
  5: 1.08,
  6: 1.08,
  7: 1.14,
  8: 1.14,
  9: 1.22,
  10: 1.22,
};

export function enemyHpMultiplier(stage: number): number {
  const chapter = stageToChapter(stage);
  return ENEMY_HP_GROWTH ** (stage - 1) * CHAPTER_HP_BAND[chapter];
}

export function enemyAtkMultiplier(stage: number): number {
  const chapter = stageToChapter(stage);
  return ENEMY_ATK_GROWTH ** (stage - 1) * CHAPTER_ATK_BAND[chapter];
}

export function enemyDefMultiplier(stage: number): number {
  return ENEMY_DEF_GROWTH ** (stage - 1);
}

export function itemBudgetBase(powerStage: number): number {
  return ITEM_BUDGET_BASE * ITEM_BUDGET_GROWTH ** (powerStage - 1);
}

export type HeroSkillPassiveTrigger =
  | "always"
  | "basic-attack"
  | "high-health-target"
  | "active-skill"
  | "critical-hit"
  | "low-health-target"
  | "ally-active-skill";

export interface HeroSkillPassive {
  trigger: HeroSkillPassiveTrigger;
  damageReduction?: number;
  basicAttackInterval?: number;
  armorBreakMagnitude?: number;
  armorBreakMs?: number;
  highHpThreshold?: number;
  highHpDamageBonus?: number;
  healMaxHpRatio?: number;
  cleanseNegativeStatuses?: boolean;
  vulnerabilityMagnitude?: number;
  vulnerabilityMs?: number;
  executeThreshold?: number;
  executeDamageBonus?: number;
  slowMagnitude?: number;
  slowMs?: number;
  stunMs?: number;
  ragePerTrigger?: number;
  internalCooldownMs?: number;
}

