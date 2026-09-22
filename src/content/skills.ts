import type { HeroId } from "../simulation/types";
import { DAMAGE_ELEMENT_LABEL } from "./damageElements";
import { HERO_BY_ID } from "./heroes";
import { HERO_ROSTER } from "./heroRoster";
import { specializationSkillIcon, type SkillIconRef } from "./skillIcons";
import { specializationForArtKey, type SpecId } from "./specializations";
import { ACTIVE_SKILL_RAGE_COST } from "./rage";

export interface SkillDefinition {
  id: string;
  heroId: HeroId;
  name: string;
  description: string;
  icon: SkillIconRef;
  rageCost?: number;
}

export interface ActiveSkillDefinition extends SkillDefinition {
  castTimeMs: number;
}

/** Short casts keep auto-battle responsive; larger control and burst skills telegraph longer. */
const ACTIVE_SKILL_CAST_TIME_MS: Record<SpecId, number> = {
  death_knight_blood: 450,
  death_knight_frost: 500,
  death_knight_unholy: 650,
  demon_hunter_havoc: 300,
  demon_hunter_vengeance: 420,
  demon_hunter_devourer: 700,
  druid_balance: 600,
  druid_feral: 320,
  druid_guardian: 450,
  druid_restoration: 380,
  evoker_devastation: 900,
  evoker_preservation: 360,
  evoker_augmentation: 500,
  hunter_beast_mastery: 350,
  hunter_marksmanship: 800,
  hunter_survival: 320,
  mage_arcane: 650,
  mage_fire: 600,
  mage_frost: 650,
  monk_brewmaster: 420,
  monk_mistweaver: 340,
  monk_windwalker: 380,
  paladin_holy: 360,
  paladin_protection: 480,
  paladin_retribution: 500,
  priest_discipline: 450,
  priest_holy: 650,
  priest_shadow: 600,
  rogue_assassination: 300,
  rogue_outlaw: 280,
  rogue_subtlety: 420,
  shaman_elemental: 600,
  shaman_enhancement: 340,
  shaman_restoration: 480,
  warlock_affliction: 600,
  warlock_demonology: 700,
  warlock_destruction: 800,
  warrior_arms: 480,
  warrior_fury: 300,
  warrior_protection: 520,
};

const NON_DAMAGE_ACTIVE_SPECS = new Set<SpecId>([
  "druid_restoration",
  "evoker_preservation",
  "monk_mistweaver",
  "paladin_holy",
  "priest_holy",
  "shaman_restoration",
]);

function activeSkillDescription(
  specialization: ReturnType<typeof specializationForArtKey>,
  heroId: HeroId,
): string {
  if (NON_DAMAGE_ACTIVE_SPECS.has(specialization.id)) {
    return specialization.activeDescription;
  }
  const element = HERO_BY_ID[heroId].damageElement;
  const damageLabel = `${DAMAGE_ELEMENT_LABEL[element]}伤害`;
  const described = specialization.activeDescription.replace("伤害", damageLabel);
  return described === specialization.activeDescription
    ? `${described}；伤害类型：${DAMAGE_ELEMENT_LABEL[element]}`
    : described;
}

export const ACTIVE_SKILLS: readonly ActiveSkillDefinition[] = HERO_ROSTER.map((entry) => {
  const specialization = specializationForArtKey(entry.artKey);
  return {
    id: `${specialization.id}-active`,
    heroId: entry.id,
    name: specialization.activeName,
    icon: specializationSkillIcon(specialization.id, "active"),
    rageCost: ACTIVE_SKILL_RAGE_COST,
    castTimeMs: ACTIVE_SKILL_CAST_TIME_MS[specialization.id],
    description: activeSkillDescription(specialization, entry.id),
  };
});

export const PASSIVE_SKILLS: readonly SkillDefinition[] = HERO_ROSTER.map((entry) => {
  const specialization = specializationForArtKey(entry.artKey);
  return {
    id: `${specialization.id}-passive`,
    heroId: entry.id,
    name: specialization.passiveName,
    icon: specializationSkillIcon(specialization.id, "passive"),
    description: specialization.passiveDescription,
  };
});

export const ACTIVE_SKILL_BY_HERO = Object.fromEntries(
  ACTIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, ActiveSkillDefinition>;

export const ACTIVE_SKILL_BY_ID = Object.fromEntries(
  ACTIVE_SKILLS.map((skill) => [skill.id, skill]),
) as Record<string, ActiveSkillDefinition>;

export const PASSIVE_SKILL_BY_HERO = Object.fromEntries(
  PASSIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const PASSIVE_SKILL_BY_ID = Object.fromEntries(
  PASSIVE_SKILLS.map((skill) => [skill.id, skill]),
) as Record<string, SkillDefinition>;
