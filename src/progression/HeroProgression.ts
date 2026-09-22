import { HERO_BY_ID } from "../content/heroes";
import {
  HERO_ATK_PER_LEVEL,
  HERO_DEF_PER_LEVEL,
  HERO_HP_PER_LEVEL,
  HERO_LEVELS_PER_ASCEND,
  MAX_HERO_LEVEL,
} from "../content/balance";
import type { HeroId } from "../simulation/types";
import { heroUpgradeExperience } from "../content/numericalModel";

export const getUpgradeCost = heroUpgradeExperience;

export function getHeroExperienceRemaining(level: number, experience: number): number {
  return Math.max(0, getUpgradeCost(level) - Math.max(0, Math.floor(experience)));
}

/** Fragment costs for silver 1–5, gold 1–5, then rainbow 1–5. */
export const HERO_STAR_UPGRADE_COST = [
  1, 2, 3, 4, 5,
  5, 6, 6, 7, 7,
  8, 8, 9, 9, 10,
] as const;
export const HERO_STARS_PER_PHASE = 5;
export const HERO_STAR_PHASES = ["silver", "gold", "rainbow"] as const;
export type HeroStarPhase = (typeof HERO_STAR_PHASES)[number];
export const MAX_HERO_STARS = HERO_STAR_UPGRADE_COST.length;
export const STAR_SKILL_EFFECT_PER_PHASE_STAR = [0.02, 0.03, 0.04] as const;
export const STAR_RAGE_GAIN_BY_PHASE = [0.03, 0.06, 0.1] as const;

/** Ascend-stone costs for rank 0→1 … 4→5. */
export const HERO_ASCEND_STONE_COST = [1, 2, 3, 5, 8] as const;
export const MAX_HERO_ASCEND_LEVEL = HERO_ASCEND_STONE_COST.length;

export const ASCEND_STAT_RANK_2 = 0.08;
export const ASCEND_STAT_RANK_4 = 0.15;
export const ASCEND_STAT_RANK_5 = 0.25;

export interface HeroStatGrowth {
  stars?: number;
  ascendLevel?: number;
}

export function getHeroLevelCap(ascendLevel: number): number {
  const rank = Math.max(0, Math.min(MAX_HERO_ASCEND_LEVEL, Math.floor(ascendLevel)));
  return Math.min(MAX_HERO_LEVEL, HERO_LEVELS_PER_ASCEND * (rank + 1));
}

export const getStarUpgradeCost = (stars: number): number | null => {
  if (stars < 0 || stars >= MAX_HERO_STARS) return null;
  return HERO_STAR_UPGRADE_COST[Math.floor(stars)]!;
};

export function getHeroStarPhase(stars: number): { phase: HeroStarPhase; count: number } {
  const normalized = Math.max(0, Math.min(MAX_HERO_STARS, Math.floor(stars)));
  if (normalized <= HERO_STARS_PER_PHASE) return { phase: "silver", count: normalized };
  if (normalized <= HERO_STARS_PER_PHASE * 2) {
    return { phase: "gold", count: normalized - HERO_STARS_PER_PHASE };
  }
  return { phase: "rainbow", count: normalized - HERO_STARS_PER_PHASE * 2 };
}

export function getHeroStarRankLabel(stars: number): string {
  const { phase, count } = getHeroStarPhase(stars);
  if (count === 0) return "无星";
  const label = phase === "silver" ? "银星" : phase === "gold" ? "金星" : "彩星";
  return `${label} ${count}/${HERO_STARS_PER_PHASE}`;
}

export const getAscendStoneCost = (ascendLevel: number): number | null => {
  if (ascendLevel < 0 || ascendLevel >= MAX_HERO_ASCEND_LEVEL) return null;
  return HERO_ASCEND_STONE_COST[ascendLevel]!;
};

export function canAscendHero(ascendLevel: number, level: number): boolean {
  return (
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

export function getStarSkillEffectPct(stars: number): number {
  const normalized = Math.max(0, Math.min(MAX_HERO_STARS, Math.floor(stars)));
  return HERO_STAR_PHASES.reduce((total, _phase, index) => {
    const count = Math.max(0, Math.min(HERO_STARS_PER_PHASE, normalized - index * HERO_STARS_PER_PHASE));
    return total + count * STAR_SKILL_EFFECT_PER_PHASE_STAR[index]!;
  }, 0);
}

export function getStarRageGainPct(stars: number): number {
  const completedPhases = Math.min(
    HERO_STAR_PHASES.length,
    Math.floor(Math.max(0, stars) / HERO_STARS_PER_PHASE),
  );
  return completedPhases > 0 ? STAR_RAGE_GAIN_BY_PHASE[completedPhases - 1]! : 0;
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

export function getHeroStats(heroId: HeroId, level: number, growth: HeroStatGrowth = {}) {
  const base = HERO_BY_ID[heroId];
  const index = Math.max(0, level - 1);
  const ascendPct = getAscendStatPct(growth.ascendLevel ?? 0);
  return {
    maxHp: Math.round(base.maxHp * HERO_HP_PER_LEVEL ** index * (1 + ascendPct)),
    attack: Math.round(base.attack * HERO_ATK_PER_LEVEL ** index * (1 + ascendPct)),
    defense: Math.round(base.defense * HERO_DEF_PER_LEVEL ** index * (1 + ascendPct)),
  };
}

export function heroGrowthFromProgress(progress: {
  stars?: number;
  ascendLevel?: number;
}): HeroStatGrowth {
  return {
    stars: progress.stars ?? 0,
    ascendLevel: progress.ascendLevel ?? 0,
  };
}
