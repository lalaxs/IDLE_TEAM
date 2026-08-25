/**
 * Combat economy tuned against Diablo Immortal rhythms:
 * - Monster HP rises faster than monster attack (longer fights, fewer one-shots).
 * - Gear budget outpaces HP slightly (upgrades feel good).
 * - Skills deal ~180–340% attack per cast on 5–8s CDs.
 * - Soft armor mitigation instead of flat atk−def.
 *
 * Spec: docs/superpowers/specs/2026-08-10-diablo-immortal-combat-balance-design.md
 */

import type { ChapterId } from "./chapters";
import { stageToChapter } from "./chapters";
import type { HeroId } from "../simulation/types";

/** Enemy HP growth per stage (DI: difficulty mostly stacks HP). */
export const ENEMY_HP_GROWTH = 1.055;
/** Enemy attack growth (slower than HP). */
export const ENEMY_ATK_GROWTH = 1.038;
export const ENEMY_DEF_GROWTH = 1.04;

/** Item power-like budget growth. */
export const ITEM_BUDGET_BASE = 14;
export const ITEM_BUDGET_GROWTH = 1.062;

export const BASE_TIER_MULTIPLIER: Record<1 | 2 | 3 | 4, number> = {
  1: 1,
  2: 1.12,
  3: 1.28,
  4: 1.48,
};

/** Hero level curves for 100 levels — weaker than gear (DI character vs item power). */
export const HERO_HP_PER_LEVEL = 1.026;
export const HERO_ATK_PER_LEVEL = 1.023;
export const HERO_DEF_PER_LEVEL = 1.02;
export const HERO_UPGRADE_COST_BASE = 60;
export const HERO_UPGRADE_COST_GROWTH = 1.085;
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

export function itemBudgetBase(stage: number): number {
  return ITEM_BUDGET_BASE * ITEM_BUDGET_GROWTH ** (stage - 1);
}

export interface SkillHitProfile {
  /** Attack % as decimal (1.85 = 185%). */
  multiplier: number;
}

export interface HeroSkillCombat {
  cooldownMs: number;
  /** Primary damaging hits (healers may leave empty). */
  hits: readonly SkillHitProfile[];
  splashMultiplier?: number;
  splashRadius?: number;
  pierceMultiplier?: number;
  healAttackMultiplier?: number;
  healMaxHpRatio?: number;
  executeMultiplier?: number;
  executeThreshold?: number;
  chainDecay?: number;
  chainMaxTargets?: number;
  aoeRadius?: number;
  stunMs?: number;
  slowMagnitude?: number;
  slowMs?: number;
  hasteMagnitude?: number;
  hasteMs?: number;
  teamDamageReduction?: number;
  teamDamageReductionMs?: number;
  selfShieldMaxHpRatio?: number;
}

/**
 * DI-like primary skills: ~180–340% attack per cast, 5–8s CD.
 */
export const HERO_SKILL_COMBAT: Record<HeroId, HeroSkillCombat> = {
  H01: {
    cooldownMs: 6000,
    hits: [{ multiplier: 1.85 }],
    stunMs: 1200,
  },
  H02: {
    cooldownMs: 5500,
    hits: [{ multiplier: 0.75 }, { multiplier: 0.75 }, { multiplier: 0.75 }],
  },
  H03: {
    cooldownMs: 6500,
    hits: [{ multiplier: 2.0 }],
    splashMultiplier: 0.95,
    splashRadius: 90,
  },
  H04: {
    cooldownMs: 5500,
    hits: [],
    healAttackMultiplier: 2.8,
    healMaxHpRatio: 0.14,
  },
  H05: {
    cooldownMs: 5000,
    hits: [{ multiplier: 2.2 }],
    pierceMultiplier: 1.1,
  },
  H06: {
    cooldownMs: 5500,
    hits: [{ multiplier: 2.5 }],
    executeMultiplier: 3.4,
    executeThreshold: 0.35,
  },
  H07: {
    cooldownMs: 6500,
    hits: [{ multiplier: 1.6 }],
    aoeRadius: 90,
    slowMagnitude: 0.4,
    slowMs: 3000,
  },
  H08: {
    cooldownMs: 5500,
    hits: [{ multiplier: 1.25 }],
    chainDecay: 0.78,
    chainMaxTargets: 3,
    hasteMagnitude: 0.1,
    hasteMs: 3000,
  },
};

/** Ascend-1 ultimates: 10–13s, ~300–420% attack equivalent. */
export const HERO_ULTIMATE_COMBAT: Record<HeroId, HeroSkillCombat> = {
  H01: {
    cooldownMs: 12000,
    hits: [{ multiplier: 2.2 }],
    selfShieldMaxHpRatio: 0.18,
    teamDamageReduction: 0.12,
    teamDamageReductionMs: 4000,
  },
  H02: {
    cooldownMs: 11000,
    hits: [{ multiplier: 1.1 }, { multiplier: 1.1 }, { multiplier: 1.1 }],
    aoeRadius: 90,
  },
  H03: {
    cooldownMs: 13000,
    hits: [{ multiplier: 3.0 }],
    aoeRadius: 140,
  },
  H04: {
    cooldownMs: 12000,
    hits: [],
    healAttackMultiplier: 2.2,
    healMaxHpRatio: 0.1,
  },
  H05: {
    cooldownMs: 12000,
    hits: [{ multiplier: 1.4 }],
    chainMaxTargets: 4,
  },
  H06: {
    cooldownMs: 11000,
    hits: [{ multiplier: 0.9 }, { multiplier: 0.9 }, { multiplier: 0.9 }, { multiplier: 0.9 }],
  },
  H07: {
    cooldownMs: 13000,
    hits: [{ multiplier: 2.4 }],
    aoeRadius: 130,
    slowMagnitude: 0.45,
    slowMs: 4000,
  },
  H08: {
    cooldownMs: 12000,
    hits: [{ multiplier: 1.25 }],
    chainDecay: 0.78,
    chainMaxTargets: 5,
    stunMs: 600,
    hasteMagnitude: 0.1,
    hasteMs: 3000,
  },
};
