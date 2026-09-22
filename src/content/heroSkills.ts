import type { HeroSkillPassive } from "./balance";
import { sharedSkillIcon, type SkillIconRef } from "./skillIcons";

/** Shared 20th-level hero skills. Any hero may pick one. */

export const HERO_SKILL_CHANGE_GOLD_COST = 5_000;

export type HeroSkillId =
  | "iron-wall"
  | "quake-slash"
  | "meteor"
  | "sanctuary"
  | "volley"
  | "execute-flurry"
  | "blizzard"
  | "storm-chain";

export type HeroSkillRole =
  | "defense"
  | "break"
  | "burst"
  | "recovery"
  | "amplify"
  | "execute"
  | "control"
  | "charge";

export interface HeroSkillDefinition {
  id: HeroSkillId;
  name: string;
  role: HeroSkillRole;
  roleLabel: string;
  description: string;
  icon: SkillIconRef;
  passive: HeroSkillPassive;
}

export const HERO_SKILLS: readonly HeroSkillDefinition[] = [
  {
    id: "iron-wall",
    name: "铁壁意志",
    role: "defense",
    roleLabel: "防护",
    icon: sharedSkillIcon(0),
    description: "常驻获得 8% 伤害减免",
    passive: {
      trigger: "always",
      damageReduction: 0.08,
    },
  },
  {
    id: "quake-slash",
    name: "破阵余震",
    role: "break",
    roleLabel: "破阵",
    icon: sharedSkillIcon(1),
    description: "每第 3 次普攻命中使目标降低 12% 防御，持续 4 秒",
    passive: {
      trigger: "basic-attack",
      basicAttackInterval: 3,
      armorBreakMagnitude: 0.12,
      armorBreakMs: 4000,
    },
  },
  {
    id: "meteor",
    name: "陨星轨迹",
    role: "burst",
    roleLabel: "先攻",
    icon: sharedSkillIcon(2),
    description: "对生命高于 70% 的敌人造成的普攻与专精主动技能伤害提高 15%",
    passive: {
      trigger: "high-health-target",
      highHpThreshold: 0.7,
      highHpDamageBonus: 0.15,
    },
  },
  {
    id: "sanctuary",
    name: "圣域恩典",
    role: "recovery",
    roleLabel: "恢复",
    icon: sharedSkillIcon(3),
    description: "每次释放专精主动技能后，治疗生命比例最低的队友 4% 最大生命（受治疗加成影响）；若有队友受到减速、破甲或易伤，优先选择并清除其状态",
    passive: {
      trigger: "active-skill",
      healMaxHpRatio: 0.04,
      cleanseNegativeStatuses: true,
    },
  },
  {
    id: "volley",
    name: "猎杀印记",
    role: "amplify",
    roleLabel: "增幅",
    icon: sharedSkillIcon(4),
    description: "造成暴击时使目标受到的所有伤害提高 8%，持续 4 秒",
    passive: {
      trigger: "critical-hit",
      vulnerabilityMagnitude: 0.08,
      vulnerabilityMs: 4000,
    },
  },
  {
    id: "execute-flurry",
    name: "影袭本能",
    role: "execute",
    roleLabel: "收割",
    icon: sharedSkillIcon(5),
    description: "对生命低于 35% 的敌人造成的普攻与专精主动技能伤害提高 20%",
    passive: {
      trigger: "low-health-target",
      executeThreshold: 0.35,
      executeDamageBonus: 0.2,
    },
  },
  {
    id: "blizzard",
    name: "霜寒追击",
    role: "control",
    roleLabel: "控制",
    icon: sharedSkillIcon(6),
    description: "每第 4 次普攻命中使目标减速 30%，持续 3 秒；目标已被减速时额外冻结 0.6 秒",
    passive: {
      trigger: "basic-attack",
      basicAttackInterval: 4,
      slowMagnitude: 0.3,
      slowMs: 3000,
      stunMs: 600,
    },
  },
  {
    id: "storm-chain",
    name: "雷霆共鸣",
    role: "charge",
    roleLabel: "充能",
    icon: sharedSkillIcon(7),
    description: "任意友方英雄释放专精主动技能时，自身获得 3 点怒气，1 秒内最多触发一次",
    passive: {
      trigger: "ally-active-skill",
      ragePerTrigger: 3,
      internalCooldownMs: 1000,
    },
  },
];

export const HERO_SKILL_BY_ID = Object.fromEntries(HERO_SKILLS.map((skill) => [skill.id, skill])) as Record<
  HeroSkillId,
  HeroSkillDefinition
>;

export const HERO_SKILL_IDS = HERO_SKILLS.map(({ id }) => id);

export function isHeroSkillId(value: string): value is HeroSkillId {
  return value in HERO_SKILL_BY_ID;
}
