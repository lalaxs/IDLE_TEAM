import { SPECIALIZATION_TALENTS } from "./specializationTalents";
import { HERO_BY_ID } from "./heroes";
import { SPECIALIZATION_BY_ID, type SpecId } from "./specializations";
import type { HeroId } from "../simulation/types";

export type TalentId =
  | "foundation_power" | "foundation_precision" | "foundation_vitality"
  | "foundation_guard" | "foundation_tempo" | "foundation_focus"
  | "basic_a" | "basic_b" | "basic_c"
  | "mastery_a" | "mastery_b" | "mastery_c" | "mastery_d" | "mastery_e"
  | "ultimate_a" | "ultimate_b" | "ultimate_c";

export type TalentStat =
  | "attackPct" | "critChance" | "critDamagePct" | "skillDamagePct"
  | "schoolDamagePct" | "primaryAttackPct" | "eliteDamagePct"
  | "maxHpPct" | "defensePct" | "damageReductionPct" | "blockChance"
  | "allResistPct" | "hpRegenMaxHpPct" | "attackSpeedPct" | "rageGainPct"
  | "lifeStealPct" | "healPowerPct";

export type BasicTalentProc = "armorBreak" | "shield" | "heal" | "allyRage" | "slow" | "vulnerability";
export type ActiveTalentProc = "vulnerability" | "selfShield" | "teamShield" | "teamDamageReduction" | "cleanse" | "teamRage" | "rageRefund";

export type TalentEffect =
  | { kind: "stat"; stat: TalentStat; perRank: number }
  | { kind: "basicDamage"; value: number }
  | { kind: "basicRage"; value: number }
  | { kind: "basicProc"; proc: BasicTalentProc; interval: number; value: number; durationMs?: number }
  | { kind: "specialization"; choice: 1 | 2 | 3 }
  | { kind: "activeDamage"; value: number }
  | { kind: "activeHeal"; value: number }
  | { kind: "activeProc"; proc: ActiveTalentProc; value?: number; durationMs?: number };

export interface TalentTierDef {
  tier: number;
  name: string;
  hint: string;
  pointCap: number;
  previousTierPointsRequired: number;
}

export interface TalentNode {
  id: TalentId;
  tier: number;
  name: string;
  icon: string;
  blurb: string;
  maxRank: number;
  effect: TalentEffect;
}

type TalentArchetype = "vanguard" | "healer" | "support" | "striker" | "caster" | "affliction";
type StatNodeSeed = readonly [name: string, icon: string, blurb: string, stat: TalentStat, perRank: number];

export const TALENT_POINT_INTERVAL = 5;
export const TALENT_POINT_CAP = 17;
export const HERO_SKILL_UNLOCK_LEVEL = 20;

export const TALENT_TIERS: readonly TalentTierDef[] = [
  { tier: 0, name: "根基", hint: "投入 10 点，建立专精的基础属性", pointCap: 10, previousTierPointsRequired: 0 },
  { tier: 1, name: "技艺", hint: "三选一，改变普攻的战斗节奏", pointCap: 1, previousTierPointsRequired: 10 },
  { tier: 2, name: "磨砺", hint: "投入 5 点，强化专精的核心方向", pointCap: 5, previousTierPointsRequired: 1 },
  { tier: 3, name: "奥义", hint: "三选一，改造专精主动技能", pointCap: 1, previousTierPointsRequired: 5 },
];

export const TALENT_IDS: readonly TalentId[] = [
  "foundation_power", "foundation_precision", "foundation_vitality", "foundation_guard", "foundation_tempo", "foundation_focus",
  "basic_a", "basic_b", "basic_c",
  "mastery_a", "mastery_b", "mastery_c", "mastery_d", "mastery_e",
  "ultimate_a", "ultimate_b", "ultimate_c",
];

const TALENT_ID_SET = new Set<string>(TALENT_IDS);
const VANGUARD_SPECS = new Set<SpecId>([
  "death_knight_blood", "demon_hunter_vengeance", "druid_guardian", "monk_brewmaster", "paladin_protection", "warrior_protection",
]);
const HEALER_SPECS = new Set<SpecId>([
  "druid_restoration", "evoker_preservation", "monk_mistweaver", "paladin_holy", "priest_holy", "shaman_restoration",
]);
const SUPPORT_SPECS = new Set<SpecId>(["evoker_augmentation", "priest_discipline"]);
const AFFLICTION_SPECS = new Set<SpecId>([
  "death_knight_unholy", "druid_feral", "mage_fire", "priest_shadow", "rogue_assassination", "warlock_affliction", "warlock_demonology",
]);
const CASTER_SPECS = new Set<SpecId>([
  "demon_hunter_devourer", "druid_balance", "evoker_devastation", "mage_arcane", "mage_frost", "shaman_elemental", "warlock_destruction",
]);

function archetypeFor(specId: SpecId): TalentArchetype {
  if (VANGUARD_SPECS.has(specId)) return "vanguard";
  if (HEALER_SPECS.has(specId)) return "healer";
  if (SUPPORT_SPECS.has(specId)) return "support";
  if (AFFLICTION_SPECS.has(specId)) return "affliction";
  if (CASTER_SPECS.has(specId)) return "caster";
  return "striker";
}

const FOUNDATION_BY_ARCHETYPE: Record<TalentArchetype, readonly StatNodeSeed[]> = {
  vanguard: [
    ["镇阵", "镇", "每级生命 +2.5%", "maxHpPct", 0.025], ["铁壁", "壁", "每级防御 +2.5%", "defensePct", 0.025],
    ["招架", "架", "每级格挡率 +1.2%", "blockChance", 0.012], ["坚忍", "忍", "每级伤害减免 +0.6%", "damageReductionPct", 0.006],
    ["聚势", "势", "每级怒气获取 +2%", "rageGainPct", 0.02], ["反攻", "攻", "每级攻击 +2%", "attackPct", 0.02],
  ],
  healer: [
    ["慈愈", "愈", "每级治疗强度 +3%", "healPowerPct", 0.03], ["灵感", "灵", "每级怒气获取 +2.5%", "rageGainPct", 0.025],
    ["生机", "生", "每级生命 +2%", "maxHpPct", 0.02], ["守心", "守", "每级防御 +2%", "defensePct", 0.02],
    ["轻灵", "轻", "每级攻击速度 +2%", "attackSpeedPct", 2], ["圣导", "导", "每级攻击 +1.5%", "attackPct", 0.015],
  ],
  support: [
    ["协力", "协", "每级攻击 +2%", "attackPct", 0.02], ["回响", "响", "每级怒气获取 +2.5%", "rageGainPct", 0.025],
    ["护持", "护", "每级生命 +2%", "maxHpPct", 0.02], ["从容", "容", "每级伤害减免 +0.5%", "damageReductionPct", 0.005],
    ["敏行", "敏", "每级攻击速度 +2%", "attackSpeedPct", 2], ["明识", "识", "每级暴击率 +0.8%", "critChance", 0.008],
  ],
  striker: [
    ["锋锐", "锋", "每级攻击 +2.5%", "attackPct", 0.025], ["会心", "会", "每级暴击率 +1%", "critChance", 0.01],
    ["决断", "决", "每级暴击伤害 +6%", "critDamagePct", 6], ["迅击", "迅", "每级攻击速度 +2%", "attackSpeedPct", 2],
    ["战意", "战", "每级怒气获取 +2%", "rageGainPct", 0.02], ["强身", "强", "每级生命 +1.5%", "maxHpPct", 0.015],
  ],
  caster: [
    ["法能", "法", "每级攻击 +2.5%", "attackPct", 0.025], ["洞察", "察", "每级暴击率 +1%", "critChance", 0.01],
    ["咏法", "咏", "每级技能伤害 +2.5%", "skillDamagePct", 0.025], ["聚能", "聚", "每级怒气获取 +2%", "rageGainPct", 0.02],
    ["灵护", "护", "每级生命 +1.5%", "maxHpPct", 0.015], ["稳固", "稳", "每级伤害减免 +0.5%", "damageReductionPct", 0.005],
  ],
  affliction: [
    ["蚀力", "蚀", "每级攻击 +2.5%", "attackPct", 0.025], ["深咒", "咒", "每级技能伤害 +3%", "skillDamagePct", 0.03],
    ["汲取", "汲", "每级生命偷取 +0.8%", "lifeStealPct", 0.008], ["蓄念", "念", "每级怒气获取 +2%", "rageGainPct", 0.02],
    ["疾咒", "疾", "每级攻击速度 +2%", "attackSpeedPct", 2], ["命脉", "命", "每级生命 +1.5%", "maxHpPct", 0.015],
  ],
};

const MASTERY_BY_ARCHETYPE: Record<TalentArchetype, readonly StatNodeSeed[]> = {
  vanguard: [
    ["厚甲", "甲", "每级防御 +3%", "defensePct", 0.03], ["血垒", "垒", "每级生命 +3%", "maxHpPct", 0.03],
    ["磐石", "磐", "每级格挡率 +1.5%", "blockChance", 0.015], ["抗性", "抗", "每级全抗性 +1.5%", "allResistPct", 0.015],
    ["复苏", "苏", "每级每秒回复 0.25% 最大生命", "hpRegenMaxHpPct", 0.0025],
  ],
  healer: [
    ["丰沛", "丰", "每级治疗强度 +4%", "healPowerPct", 0.04], ["祷念", "祷", "每级怒气获取 +3%", "rageGainPct", 0.03],
    ["流转", "转", "每级攻击速度 +2.5%", "attackSpeedPct", 2.5], ["庇护", "庇", "每级伤害减免 +0.7%", "damageReductionPct", 0.007],
    ["生息", "息", "每级生命 +2.5%", "maxHpPct", 0.025],
  ],
  support: [
    ["共鸣", "鸣", "每级技能伤害 +3%", "skillDamagePct", 0.03], ["激励", "励", "每级怒气获取 +3%", "rageGainPct", 0.03],
    ["调律", "律", "每级攻击速度 +2.5%", "attackSpeedPct", 2.5], ["守望", "望", "每级伤害减免 +0.7%", "damageReductionPct", 0.007],
    ["稳阵", "阵", "每级生命 +2.5%", "maxHpPct", 0.025],
  ],
  striker: [
    ["专武", "武", "每级对应物理或法术伤害 +3%", "schoolDamagePct", 0.03], ["连击", "连", "每级普攻伤害 +3%", "primaryAttackPct", 0.03],
    ["绝技", "绝", "每级技能伤害 +3%", "skillDamagePct", 0.03], ["嗜战", "嗜", "每级生命偷取 +0.8%", "lifeStealPct", 0.008],
    ["猎首", "首", "每级对精英与首领伤害 +3%", "eliteDamagePct", 0.03],
  ],
  caster: [
    ["元素", "元", "每级对应物理或法术伤害 +3%", "schoolDamagePct", 0.03], ["秘术", "秘", "每级技能伤害 +3%", "skillDamagePct", 0.03],
    ["灵光", "光", "每级暴击率 +1.2%", "critChance", 0.012], ["威能", "威", "每级对精英与首领伤害 +3%", "eliteDamagePct", 0.03],
    ["吟诵", "吟", "每级攻击速度 +2%", "attackSpeedPct", 2],
  ],
  affliction: [
    ["侵蚀", "侵", "每级对应物理或法术伤害 +3%", "schoolDamagePct", 0.03], ["恶化", "恶", "每级技能伤害 +3%", "skillDamagePct", 0.03],
    ["吸魂", "魂", "每级生命偷取 +1%", "lifeStealPct", 0.01], ["蔓延", "蔓", "每级对精英与首领伤害 +3%", "eliteDamagePct", 0.03],
    ["暗涌", "涌", "每级怒气获取 +2.5%", "rageGainPct", 0.025],
  ],
};

function statNodes(tier: 0 | 2, seeds: readonly StatNodeSeed[]): TalentNode[] {
  const ids = tier === 0 ? TALENT_IDS.slice(0, 6) : TALENT_IDS.slice(9, 14);
  return seeds.map(([name, icon, blurb, stat, perRank], index) => ({
    id: ids[index]!, tier, name, icon, blurb, maxRank: tier === 0 ? 5 : 3,
    effect: { kind: "stat", stat, perRank },
  }));
}

function basicNodes(specId: SpecId, archetype: TalentArchetype): TalentNode[] {
  const spec = SPECIALIZATION_BY_ID[specId];
  const procByArchetype: Record<TalentArchetype, { name: string; icon: string; blurb: string; effect: TalentEffect }> = {
    vanguard: { name: "铁卫反击", icon: "盾", blurb: "每第 3 次普攻获得 4% 最大生命护盾", effect: { kind: "basicProc", proc: "shield", interval: 3, value: 0.04 } },
    healer: { name: "愈脉", icon: "愈", blurb: "每第 3 次普攻治疗生命最低队友 3.5% 最大生命", effect: { kind: "basicProc", proc: "heal", interval: 3, value: 0.035 } },
    support: { name: "协奏", icon: "协", blurb: "每第 3 次普攻为怒气最低队友补充 3 点怒气", effect: { kind: "basicProc", proc: "allyRage", interval: 3, value: 3 } },
    striker: { name: "破势", icon: "破", blurb: "每第 3 次普攻使目标破甲 10%，持续 4 秒", effect: { kind: "basicProc", proc: "armorBreak", interval: 3, value: 0.1, durationMs: 4000 } },
    caster: { name: "凝滞", icon: "凝", blurb: "每第 3 次普攻使目标减速 25%，持续 3 秒", effect: { kind: "basicProc", proc: "slow", interval: 3, value: 0.25, durationMs: 3000 } },
    affliction: { name: "蚀印", icon: "印", blurb: "每第 4 次普攻使目标易伤 8%，持续 4 秒", effect: { kind: "basicProc", proc: "vulnerability", interval: 4, value: 0.08, durationMs: 4000 } },
  };
  const proc = procByArchetype[archetype];
  return [
    { id: "basic_a", tier: 1, name: `${spec.passiveName}·强袭`, icon: "击", blurb: "普攻伤害提高 18%", maxRank: 1, effect: { kind: "basicDamage", value: 0.18 } },
    { id: "basic_b", tier: 1, name: `${spec.passiveName}·回流`, icon: "怒", blurb: "每次普攻命中额外获得 2 点怒气", maxRank: 1, effect: { kind: "basicRage", value: 2 } },
    { id: "basic_c", tier: 1, name: proc.name, icon: proc.icon, blurb: proc.blurb, maxRank: 1, effect: proc.effect },
  ];
}

function ultimateNodes(specId: SpecId, _archetype: TalentArchetype): TalentNode[] {
  return SPECIALIZATION_TALENTS[specId].map(([name, blurb], index) => ({
    id: (["ultimate_a", "ultimate_b", "ultimate_c"] as const)[index]!, tier: 3, name,
    icon: ["专", "拓", "护"][index]!, blurb, maxRank: 1,
    effect: { kind: "specialization", choice: (index + 1) as 1 | 2 | 3 },
  }));
}

const NODE_CACHE = new Map<SpecId, readonly TalentNode[]>();

export function talentsForSpec(specId: SpecId): readonly TalentNode[] {
  const cached = NODE_CACHE.get(specId);
  if (cached) return cached;
  const archetype = archetypeFor(specId);
  const nodes = [
    ...statNodes(0, FOUNDATION_BY_ARCHETYPE[archetype]),
    ...basicNodes(specId, archetype),
    ...statNodes(2, MASTERY_BY_ARCHETYPE[archetype]),
    ...ultimateNodes(specId, archetype),
  ];
  NODE_CACHE.set(specId, nodes);
  return nodes;
}

export function talentsForHero(heroId: HeroId): readonly TalentNode[] {
  return talentsForSpec(HERO_BY_ID[heroId].specId);
}

export function talentByIdForHero(heroId: HeroId, talentId: TalentId): TalentNode {
  const node = talentsForHero(heroId).find(({ id }) => id === talentId);
  if (!node) throw new Error(`Unknown talent: ${talentId}`);
  return node;
}

export function isTalentId(value: string): value is TalentId {
  return TALENT_ID_SET.has(value);
}

export function talentsInTier(heroId: HeroId, tier: number): readonly TalentNode[] {
  return talentsForHero(heroId).filter((node) => node.tier === tier);
}

export function getTalentTierDef(tier: number): TalentTierDef {
  const found = TALENT_TIERS.find((entry) => entry.tier === tier);
  if (!found) throw new Error(`Unknown talent tier: ${tier}`);
  return found;
}

/** Representative tree for content inspection; runtime nodes resolve from each hero's specialization. */
export const TALENT_NODES = talentsForSpec("warrior_arms");
