import type { HeroDefinition } from "../content/heroes";
import type { ClassId } from "../content/specializations";
import type { HeroId } from "../simulation/types";
import type { RandomSource } from "../simulation/RandomSource";

export const SUMMON_SINGLE_COST = 100;
export const SUMMON_FIVE_COST = 450;
export const SUMMON_THEME_SELECTION_COST = 50;
export const SUMMON_THEME_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
export const SUMMON_THEME_HERO_CHANCE = 0.6;
export const SUMMON_THEME_PITY_PULLS = 10;

export const SUMMON_THEME_CLASS_IDS: readonly ClassId[] = [
  "death_knight",
  "demon_hunter",
  "druid",
  "evoker",
  "hunter",
  "mage",
  "monk",
  "paladin",
  "priest",
  "rogue",
  "shaman",
  "warlock",
  "warrior",
];

export const SUMMON_CLASS_LABELS: Record<ClassId, string> = {
  death_knight: "死亡骑士",
  demon_hunter: "恶魔猎手",
  druid: "德鲁伊",
  evoker: "唤魔师",
  hunter: "猎人",
  mage: "法师",
  monk: "武僧",
  paladin: "圣骑士",
  priest: "牧师",
  rogue: "潜行者",
  shaman: "萨满祭司",
  warlock: "术士",
  warrior: "战士",
};

export type SummonRewardKind = "hero" | "universalMarks" | "ascendStone" | "exp" | "gold";

export interface PersonalSummonTheme {
  classId: ClassId;
  expiresAt: number;
}

export interface ActiveSummonTheme {
  classId: ClassId;
  source: "global" | "personal";
  expiresAt: number;
}

const SUMMON_THEME_EPOCH = Date.UTC(2026, 0, 1);

export function isSummonClassId(value: unknown): value is ClassId {
  return typeof value === "string" && (SUMMON_THEME_CLASS_IDS as readonly string[]).includes(value);
}

export function getGlobalSummonTheme(now = Date.now()): ActiveSummonTheme {
  const elapsed = Math.max(0, now - SUMMON_THEME_EPOCH);
  const cycle = Math.floor(elapsed / SUMMON_THEME_DURATION_MS);
  return {
    classId: SUMMON_THEME_CLASS_IDS[cycle % SUMMON_THEME_CLASS_IDS.length]!,
    source: "global",
    expiresAt: SUMMON_THEME_EPOCH + (cycle + 1) * SUMMON_THEME_DURATION_MS,
  };
}

export function getActiveSummonTheme(
  personalTheme: PersonalSummonTheme | null,
  now = Date.now(),
): ActiveSummonTheme {
  if (personalTheme && personalTheme.expiresAt > now) {
    return { ...personalTheme, source: "personal" };
  }
  return getGlobalSummonTheme(now);
}

export function rollSummonRewardKind(random: RandomSource): SummonRewardKind {
  const roll = random.next();
  if (roll < 0.4) return "hero";
  if (roll < 0.65) return "universalMarks";
  if (roll < 0.75) return "ascendStone";
  if (roll < 0.9) return "exp";
  return "gold";
}

function weightedHeroPick(
  random: RandomSource,
  heroes: readonly HeroDefinition[],
  isUnlocked: (heroId: HeroId) => boolean,
): HeroId {
  const totalWeight = heroes.reduce((sum, hero) => sum + (isUnlocked(hero.id) ? 1 : 2), 0);
  let roll = random.next() * totalWeight;
  for (const hero of heroes) {
    roll -= isUnlocked(hero.id) ? 1 : 2;
    if (roll < 0) return hero.id;
  }
  return heroes[heroes.length - 1]!.id;
}

export function selectSummonHero(
  random: RandomSource,
  heroes: readonly HeroDefinition[],
  isUnlocked: (heroId: HeroId) => boolean,
  themeClassId: ClassId,
  forceTheme = false,
): HeroId {
  const themed = heroes.filter((hero) => hero.classId === themeClassId);
  const other = heroes.filter((hero) => hero.classId !== themeClassId);
  const useTheme = forceTheme || other.length === 0 || (themed.length > 0 && random.next() < SUMMON_THEME_HERO_CHANCE);
  const pool = useTheme ? themed : other;
  return weightedHeroPick(random, pool.length > 0 ? pool : heroes, isUnlocked);
}

export function getSummonGoldReward(highestClearedStage: number): number {
  const stage = Math.max(1, Math.min(120, Math.floor(highestClearedStage)));
  return (20 + stage * 12) * 10;
}

export function getSummonExperienceReward(highestClearedStage: number): number {
  const stage = Math.max(1, Math.min(120, Math.floor(highestClearedStage)));
  return 80 + stage * 20;
}
