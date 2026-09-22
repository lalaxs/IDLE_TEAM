import type { DamageElement, HeroId, TargetStrategy } from "../simulation/types";
import { buildHeroDefinitions } from "./heroRoster";
import {
  type ClassId,
  type HeroExpeditionRole,
  type SpecId,
} from "./specializations";

export type HeroGender = "male" | "female";
export type HeroCombatRange = "melee" | "ranged";

export const HERO_GENDER_LABEL: Record<HeroGender, string> = {
  male: "男性",
  female: "女性",
};

export const HERO_COMBAT_RANGE_LABEL: Record<HeroCombatRange, string> = {
  melee: "近战",
  ranged: "远程",
};

export const HERO_EXPEDITION_ROLE_LABEL: Record<HeroExpeditionRole, string> = {
  tank: "坦克",
  healer: "治疗",
  support: "辅助",
  damage: "输出",
};

export interface HeroDefinition {
  id: HeroId;
  name: string;
  role: string;
  color: string;
  maxHp: number;
  attack: number;
  defense: number;
  attackIntervalMs: number;
  attackRange: number;
  moveSpeed: number;
  /** Physical vs elemental (magic) damage school for gear affixes. */
  damageSchool: "physical" | "magic";
  /** Hit element for combat text, resists, and precise elemental damage affixes. */
  damageElement: DamageElement;
  classId: ClassId;
  className: string;
  specId: SpecId;
  specName: string;
  gender: HeroGender;
  combatRange: HeroCombatRange;
  expeditionRole: HeroExpeditionRole;
  activeSkillId: string;
  passiveSkillId: string;
  targetStrategy: TargetStrategy;
  tagline: string;
  /** Basename of class art (`wa_pro_m` → hero_wa_pro_m_runtime). */
  artKey: string;
}

export const HERO_DEFINITIONS: readonly HeroDefinition[] = buildHeroDefinitions();

export const HERO_BY_ID = Object.fromEntries(
  HERO_DEFINITIONS.map((hero) => [hero.id, hero]),
) as Record<HeroId, HeroDefinition>;

/** Approved first-release roster: one selected hero for every specialization. */
export const RELEASED_HERO_IDS = [
  "H09", "H10", "H43", "H12", "H13", "H14", "H20", "H33", "H49", "H18",
  "H19", "H54", "H30", "H22", "H57", "H23", "H59", "H03", "H60", "H62",
  "H63", "H64", "H65", "H17", "H21", "H68", "H04", "H15", "H71", "H27",
  "H73", "H08", "H28", "H36", "H24", "H31", "H78", "H79", "H02", "H35",
] as const satisfies readonly HeroId[];

export const RELEASED_HERO_DEFINITIONS: readonly HeroDefinition[] = RELEASED_HERO_IDS.map(
  (heroId) => HERO_BY_ID[heroId],
);

/** Starting party candidates mirror the six roles used by the demo opening. */
export const STARTER_HERO_IDS = ["H35", "H02", "H03", "H04", "H57", "H71"] as const satisfies readonly HeroId[];

/** The first two summon reveals introduce selected launch heroes. */
export const INTRO_SUMMON_HERO_IDS = ["H60", "H08"] as const satisfies readonly HeroId[];
