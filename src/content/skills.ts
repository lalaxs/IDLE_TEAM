import type { HeroId } from "../simulation/types";
import { HERO_SKILL_COMBAT, HERO_ULTIMATE_COMBAT } from "./balance";
import {
  HERO_ROSTER,
  PATTERN_ACTIVE_DESC,
  PATTERN_AWAKENING_DESC,
  PATTERN_PASSIVE_DESC,
  PATTERN_ULTIMATE_DESC,
  skillIdsForHero,
} from "./heroRoster";

export interface SkillDefinition {
  id: string;
  heroId: HeroId;
  name: string;
  description: string;
  cooldownMs?: number;
}

export const ACTIVE_SKILLS: readonly SkillDefinition[] = HERO_ROSTER.map((entry) => {
  const ids = skillIdsForHero(entry);
  return {
    id: ids.active,
    heroId: entry.id,
    name: entry.activeName,
    cooldownMs: HERO_SKILL_COMBAT[entry.id].cooldownMs,
    description: PATTERN_ACTIVE_DESC[entry.skillPattern],
  };
});

export const PASSIVE_SKILLS: readonly SkillDefinition[] = HERO_ROSTER.map((entry) => {
  const ids = skillIdsForHero(entry);
  return {
    id: ids.passive,
    heroId: entry.id,
    name: entry.passiveName,
    description: PATTERN_PASSIVE_DESC[entry.skillPattern],
  };
});

export const ULTIMATE_SKILLS: readonly SkillDefinition[] = HERO_ROSTER.map((entry) => {
  const ids = skillIdsForHero(entry);
  return {
    id: ids.ultimate,
    heroId: entry.id,
    name: entry.ultimateName,
    cooldownMs: HERO_ULTIMATE_COMBAT[entry.id].cooldownMs,
    description: PATTERN_ULTIMATE_DESC[entry.skillPattern],
  };
});

export const AWAKENING_SKILLS: readonly SkillDefinition[] = HERO_ROSTER.map((entry) => {
  const ids = skillIdsForHero(entry);
  const names: Record<typeof entry.skillPattern, string> = {
    H01: "不屈",
    H02: "狂怒",
    H03: "焚天",
    H04: "晨祷",
    H05: "猎手",
    H06: "猎杀",
    H07: "极寒",
    H08: "雷鼓",
  };
  return {
    id: ids.awakening,
    heroId: entry.id,
    name: entry.id === entry.skillPattern ? names[entry.skillPattern] : `${entry.role}觉醒`,
    description: PATTERN_AWAKENING_DESC[entry.skillPattern],
  };
});

export const ACTIVE_SKILL_BY_HERO = Object.fromEntries(
  ACTIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const PASSIVE_SKILL_BY_HERO = Object.fromEntries(
  PASSIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const ULTIMATE_SKILL_BY_HERO = Object.fromEntries(
  ULTIMATE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const AWAKENING_SKILL_BY_HERO = Object.fromEntries(
  AWAKENING_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;
