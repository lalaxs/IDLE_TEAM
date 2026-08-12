import { HERO_BY_ID } from "../content/heroes";
import {
  HERO_ATK_PER_LEVEL,
  HERO_DEF_PER_LEVEL,
  HERO_HP_PER_LEVEL,
  HERO_UPGRADE_COST_BASE,
  HERO_UPGRADE_COST_GROWTH,
} from "../content/balance";
import type { HeroId } from "../simulation/types";

export const getUpgradeCost = (level: number): number =>
  Math.round(HERO_UPGRADE_COST_BASE * HERO_UPGRADE_COST_GROWTH ** (level - 1));

/** Fragment costs to raise star rank from current stars → stars+1. */
export const HERO_STAR_UPGRADE_COST = [20, 40, 80, 120, 200] as const;
export const MAX_HERO_STARS = HERO_STAR_UPGRADE_COST.length;

export const getStarUpgradeCost = (stars: number): number | null => {
  if (stars < 0 || stars >= MAX_HERO_STARS) return null;
  return HERO_STAR_UPGRADE_COST[stars]!;
};

export function getHeroStats(heroId: HeroId, level: number) {
  const hero = HERO_BY_ID[heroId];
  const index = Math.max(0, level - 1);
  return {
    maxHp: Math.round(hero.maxHp * HERO_HP_PER_LEVEL ** index),
    attack: Math.round(hero.attack * HERO_ATK_PER_LEVEL ** index),
    defense: Math.round(hero.defense * HERO_DEF_PER_LEVEL ** index),
  };
}
