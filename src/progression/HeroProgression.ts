import { HERO_BY_ID } from "../content/heroes";
import {
  HERO_ATK_PER_LEVEL,
  HERO_DEF_PER_LEVEL,
  HERO_HP_PER_LEVEL,
  HERO_LEVELS_PER_ASCEND,
  HERO_UPGRADE_COST_BASE,
  HERO_UPGRADE_COST_GROWTH,
  MAX_HERO_LEVEL,
} from "../content/balance";
import type { HeroId } from "../simulation/types";

export const getUpgradeCost = (level: number): number =>
  Math.round(HERO_UPGRADE_COST_BASE * HERO_UPGRADE_COST_GROWTH ** (level - 1));

/** Fragment costs to raise star rank from current stars → stars+1. */
export const HERO_STAR_UPGRADE_COST = [20, 40, 80, 120, 200] as const;
export const MAX_HERO_STARS = HERO_STAR_UPGRADE_COST.length;
export const STAR_FLAT_LEVELS = 5;
export const STAR_SKILL_DAMAGE_PER_STAR = 0.06;
export const STAR_SKILL_COOLDOWN_AT_FIVE = 0.08;

/** Ascend-stone costs for rank 0→1 … 4→5. */
export const HERO_ASCEND_STONE_COST = [1, 2, 3, 5, 8] as const;
export const MAX_HERO_ASCEND_LEVEL = HERO_ASCEND_STONE_COST.length;

export const ASCEND_STAT_RANK_2 = 0.08;
export const ASCEND_STAT_RANK_4 = 0.15;
export const ASCEND_STAT_RANK_5 = 0.25;

export interface HeroStatGrowth {
  starFlatHp?: number;
  starFlatAtk?: number;
  starFlatDef?: number;
  ascendLevel?: number;
}

export function getHeroLevelCap(ascendLevel: number): number {
  const rank = Math.max(0, Math.min(MAX_HERO_ASCEND_LEVEL, Math.floor(ascendLevel)));
  return Math.min(MAX_HERO_LEVEL, HERO_LEVELS_PER_ASCEND * (rank + 1));
}

export const getStarUpgradeCost = (stars: number, ascendLevel = 0): number | null => {
  if (stars < 0 || stars >= MAX_HERO_STARS) return null;
  const base = HERO_STAR_UPGRADE_COST[stars]!;
  return Math.round(base * (1 + 0.4 * Math.max(0, ascendLevel)));
};

export const getAscendStoneCost = (ascendLevel: number): number | null => {
  if (ascendLevel < 0 || ascendLevel >= MAX_HERO_ASCEND_LEVEL) return null;
  return HERO_ASCEND_STONE_COST[ascendLevel]!;
};

export function canAscendHero(stars: number, ascendLevel: number, level = 0): boolean {
  return (
    stars >= MAX_HERO_STARS &&
    ascendLevel < MAX_HERO_ASCEND_LEVEL &&
    level >= getHeroLevelCap(ascendLevel)
  );
}

export function hasHeroUltimate(ascendLevel: number): boolean {
  return ascendLevel >= 1;
}

export function hasHeroAwakening(ascendLevel: number): boolean {
  return ascendLevel >= 3;
}

export function getAscendStatPct(ascendLevel: number): number {
  let pct = 0;
  if (ascendLevel >= 2) pct += ASCEND_STAT_RANK_2;
  if (ascendLevel >= 4) pct += ASCEND_STAT_RANK_4;
  if (ascendLevel >= 5) pct += ASCEND_STAT_RANK_5;
  return pct;
}

export function getStarSkillDamagePct(stars: number): number {
  return Math.max(0, Math.min(MAX_HERO_STARS, stars)) * STAR_SKILL_DAMAGE_PER_STAR;
}

export function getStarSkillCooldownPct(stars: number): number {
  return stars >= MAX_HERO_STARS ? STAR_SKILL_COOLDOWN_AT_FIVE : 0;
}

export function getHeroLevelStats(heroId: HeroId, level: number) {
  const hero = HERO_BY_ID[heroId];
  const index = Math.max(0, level - 1);
  return {
    maxHp: Math.round(hero.maxHp * HERO_HP_PER_LEVEL ** index),
    attack: Math.round(hero.attack * HERO_ATK_PER_LEVEL ** index),
    defense: Math.round(hero.defense * HERO_DEF_PER_LEVEL ** index),
  };
}

export function getStarFlatDelta(heroId: HeroId, level: number) {
  const now = getHeroLevelStats(heroId, Math.max(1, level));
  const next = getHeroLevelStats(heroId, Math.max(1, level) + 1);
  return {
    maxHp: STAR_FLAT_LEVELS * (next.maxHp - now.maxHp),
    attack: STAR_FLAT_LEVELS * (next.attack - now.attack),
    defense: STAR_FLAT_LEVELS * (next.defense - now.defense),
  };
}

export function getHeroStats(heroId: HeroId, level: number, growth: HeroStatGrowth = {}) {
  const base = getHeroLevelStats(heroId, level);
  const pct = getAscendStatPct(growth.ascendLevel ?? 0);
  return {
    maxHp: Math.round((base.maxHp + (growth.starFlatHp ?? 0)) * (1 + pct)),
    attack: Math.round((base.attack + (growth.starFlatAtk ?? 0)) * (1 + pct)),
    defense: Math.round((base.defense + (growth.starFlatDef ?? 0)) * (1 + pct)),
  };
}

export function heroGrowthFromProgress(progress: {
  starFlatHp?: number;
  starFlatAtk?: number;
  starFlatDef?: number;
  ascendLevel?: number;
}): HeroStatGrowth {
  return {
    starFlatHp: progress.starFlatHp ?? 0,
    starFlatAtk: progress.starFlatAtk ?? 0,
    starFlatDef: progress.starFlatDef ?? 0,
    ascendLevel: progress.ascendLevel ?? 0,
  };
}
