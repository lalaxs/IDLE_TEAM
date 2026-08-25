import type { HeroSkillCombat } from "./balance";

/** Shared 20th-level hero skills. Any hero may pick one. */

export type HeroSkillId =
  | "iron-wall"
  | "quake-slash"
  | "meteor"
  | "sanctuary"
  | "volley"
  | "execute-flurry"
  | "blizzard"
  | "storm-chain";

export type HeroSkillRole = "tank" | "melee" | "mage" | "support" | "ranged" | "assassin" | "control" | "chain";

export interface HeroSkillDefinition {
  id: HeroSkillId;
  name: string;
  role: HeroSkillRole;
  roleLabel: string;
  description: string;
  cooldownMs: number;
  combat: HeroSkillCombat;
}

export const HERO_SKILLS: readonly HeroSkillDefinition[] = [
  {
    id: "iron-wall",
    name: "铁壁怒吼",
    role: "tank",
    roleLabel: "防护",
    cooldownMs: 12000,
    description: "自身获得 18% 最大生命护盾，全队减伤 12% 持续 4 秒，并对最近敌人造成 220% 伤害",
    combat: {
      cooldownMs: 12000,
      hits: [{ multiplier: 2.2 }],
      selfShieldMaxHpRatio: 0.18,
      teamDamageReduction: 0.12,
      teamDamageReductionMs: 4000,
    },
  },
  {
    id: "quake-slash",
    name: "裂地斩",
    role: "melee",
    roleLabel: "近战",
    cooldownMs: 11000,
    description: "对自身周围敌人连续造成 3 次 110% 伤害",
    combat: {
      cooldownMs: 11000,
      hits: [{ multiplier: 1.1 }, { multiplier: 1.1 }, { multiplier: 1.1 }],
      aoeRadius: 90,
    },
  },
  {
    id: "meteor",
    name: "陨星",
    role: "mage",
    roleLabel: "爆发",
    cooldownMs: 13000,
    description: "对大范围敌人造成 300% 伤害",
    combat: {
      cooldownMs: 13000,
      hits: [{ multiplier: 3.0 }],
      aoeRadius: 140,
    },
  },
  {
    id: "sanctuary",
    name: "圣域",
    role: "support",
    roleLabel: "支援",
    cooldownMs: 12000,
    description: "治疗全队（220% 攻击或 10% 最大生命，取高）",
    combat: {
      cooldownMs: 12000,
      hits: [],
      healAttackMultiplier: 2.2,
      healMaxHpRatio: 0.1,
    },
  },
  {
    id: "volley",
    name: "箭雨",
    role: "ranged",
    roleLabel: "远程",
    cooldownMs: 12000,
    description: "对前方最多 4 名敌人各造成 140% 伤害",
    combat: {
      cooldownMs: 12000,
      hits: [{ multiplier: 1.4 }],
      chainMaxTargets: 4,
    },
  },
  {
    id: "execute-flurry",
    name: "影袭连刺",
    role: "assassin",
    roleLabel: "收割",
    cooldownMs: 11000,
    description: "对生命比例最低的敌人连续造成 4 次 90% 伤害",
    combat: {
      cooldownMs: 11000,
      hits: [{ multiplier: 0.9 }, { multiplier: 0.9 }, { multiplier: 0.9 }, { multiplier: 0.9 }],
    },
  },
  {
    id: "blizzard",
    name: "暴风雪",
    role: "control",
    roleLabel: "控制",
    cooldownMs: 13000,
    description: "大范围造成 240% 伤害并减速 45% 持续 4 秒",
    combat: {
      cooldownMs: 13000,
      hits: [{ multiplier: 2.4 }],
      aoeRadius: 130,
      slowMagnitude: 0.45,
      slowMs: 4000,
    },
  },
  {
    id: "storm-chain",
    name: "雷暴",
    role: "chain",
    roleLabel: "连锁",
    cooldownMs: 12000,
    description: "在最多 5 名敌人间跳跃，末跳小幅眩晕",
    combat: {
      cooldownMs: 12000,
      hits: [{ multiplier: 1.25 }],
      chainDecay: 0.78,
      chainMaxTargets: 5,
      stunMs: 600,
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
