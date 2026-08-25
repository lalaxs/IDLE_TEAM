import type { DamageElement, HeroId, TargetStrategy } from "../simulation/types";
import { buildHeroDefinitions, type SkillPatternId } from "./heroRoster";

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
  activeSkillId: string;
  passiveSkillId: string;
  targetStrategy: TargetStrategy;
  tagline: string;
  /** Combat kit template shared with H01–H08 skill implementations. */
  skillPattern: SkillPatternId;
  /** Basename of class art (`wa_pro_m` → hero_wa_pro_m_runtime). */
  artKey: string;
}

export const HERO_DEFINITIONS: readonly HeroDefinition[] = buildHeroDefinitions();

export const HERO_BY_ID = Object.fromEntries(
  HERO_DEFINITIONS.map((hero) => [hero.id, hero]),
) as Record<HeroId, HeroDefinition>;
