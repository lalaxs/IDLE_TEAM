/** Shared hero talent tree. Layered layout — players freely pick what fits each hero. */

export type TalentId =
  | "might_attack"
  | "might_crit"
  | "might_skill"
  | "might_school"
  | "might_execute"
  | "might_capstone"
  | "fort_hp"
  | "fort_def"
  | "fort_dr"
  | "fort_block"
  | "fort_regen"
  | "fort_capstone"
  | "spirit_haste"
  | "spirit_cdr"
  | "spirit_leech"
  | "spirit_heal"
  | "spirit_elite"
  | "spirit_capstone";

export type TalentStat =
  | "attackPct"
  | "critChance"
  | "skillDamagePct"
  | "schoolDamagePct"
  | "executeDamagePct"
  | "damagePct"
  | "maxHpPct"
  | "defensePct"
  | "damageReductionPct"
  | "blockChance"
  | "hpRegenMaxHpPct"
  | "waveStartShieldPct"
  | "attackSpeedPct"
  | "skillCooldownPct"
  | "lifeStealPct"
  | "healPowerPct"
  | "eliteDamagePct"
  | "waveStartSkillCdrPct";

export interface TalentTierDef {
  /** 0-based tier index. */
  tier: number;
  name: string;
  hint: string;
  /**
   * Points that must already be spent in the previous tier before this tier unlocks.
   * Tier 0 always uses 0.
   */
  previousTierPointsRequired: number;
}

export interface TalentNode {
  id: TalentId;
  /** Which horizontal layer this node belongs to. */
  tier: number;
  name: string;
  icon: string;
  blurb: string;
  maxRank: number;
  stat: TalentStat;
  /** Per-rank magnitude. Percents are fractions except attackSpeedPct (percentage points). */
  perRank: number;
}

export const TALENT_POINT_INTERVAL = 5;
export const HERO_SKILL_UNLOCK_LEVEL = 20;

/**
 * Layer plan (参考多/少交替):
 * - 根基 6：基础属性，量大可自由搭配
 * - 枢要 3：关键成长方向，少而重
 * - 专精 6：情境向加强，再放宽选择面
 * - 终极 3：质变点，少而强
 */
export const TALENT_TIERS: readonly TalentTierDef[] = [
  { tier: 0, name: "根基", hint: "基础属性，按英雄自由加点", previousTierPointsRequired: 0 },
  { tier: 1, name: "枢要", hint: "关键成长，每点都更有分量", previousTierPointsRequired: 4 },
  { tier: 2, name: "专精", hint: "情境强化，按玩法挑选", previousTierPointsRequired: 2 },
  { tier: 3, name: "终极", hint: "质变天赋，择一深造亦可", previousTierPointsRequired: 4 },
];

export const TALENT_NODES: readonly TalentNode[] = [
  // —— 根基（多）：攻 / 暴 / 血 / 防 / 速 / 冷却 ——
  {
    id: "might_attack",
    tier: 0,
    name: "锐锋",
    icon: "刃",
    blurb: "每级攻击 +2.5%",
    maxRank: 5,
    stat: "attackPct",
    perRank: 0.025,
  },
  {
    id: "might_crit",
    tier: 0,
    name: "会心",
    icon: "准",
    blurb: "每级暴击率 +1.2%",
    maxRank: 5,
    stat: "critChance",
    perRank: 0.012,
  },
  {
    id: "fort_hp",
    tier: 0,
    name: "体魄",
    icon: "体",
    blurb: "每级生命 +3%",
    maxRank: 5,
    stat: "maxHpPct",
    perRank: 0.03,
  },
  {
    id: "fort_def",
    tier: 0,
    name: "甲胄",
    icon: "甲",
    blurb: "每级防御 +3%",
    maxRank: 5,
    stat: "defensePct",
    perRank: 0.03,
  },
  {
    id: "spirit_haste",
    tier: 0,
    name: "急速",
    icon: "速",
    blurb: "每级攻击速度 +2.5%",
    maxRank: 5,
    stat: "attackSpeedPct",
    perRank: 2.5,
  },
  {
    id: "spirit_cdr",
    tier: 0,
    name: "凝神",
    icon: "凝",
    blurb: "每级技能冷却缩减 +2%",
    maxRank: 5,
    stat: "skillCooldownPct",
    perRank: 0.02,
  },

  // —— 枢要（少）：技能伤 / 减伤 / 吸血 ——
  {
    id: "might_skill",
    tier: 1,
    name: "破军",
    icon: "技",
    blurb: "每级技能伤害 +3%",
    maxRank: 5,
    stat: "skillDamagePct",
    perRank: 0.03,
  },
  {
    id: "fort_dr",
    tier: 1,
    name: "铁骨",
    icon: "骨",
    blurb: "每级伤害减免 +1%",
    maxRank: 5,
    stat: "damageReductionPct",
    perRank: 0.01,
  },
  {
    id: "spirit_leech",
    tier: 1,
    name: "嗜血",
    icon: "血",
    blurb: "每级生命偷取 +1.2%",
    maxRank: 5,
    stat: "lifeStealPct",
    perRank: 0.012,
  },

  // —— 专精（多）：物法 / 格挡 / 回春 / 治疗 / 处决 / 精英 ——
  {
    id: "might_school",
    tier: 2,
    name: "专精",
    icon: "专",
    blurb: "每级对应物理或法术伤害 +3%",
    maxRank: 5,
    stat: "schoolDamagePct",
    perRank: 0.03,
  },
  {
    id: "fort_block",
    tier: 2,
    name: "格挡",
    icon: "挡",
    blurb: "每级格挡率 +2%",
    maxRank: 3,
    stat: "blockChance",
    perRank: 0.02,
  },
  {
    id: "fort_regen",
    tier: 2,
    name: "回春",
    icon: "春",
    blurb: "每级每秒回复 0.4% 最大生命",
    maxRank: 3,
    stat: "hpRegenMaxHpPct",
    perRank: 0.004,
  },
  {
    id: "spirit_heal",
    tier: 2,
    name: "恩泽",
    icon: "愈",
    blurb: "每级治疗强度 +4%",
    maxRank: 5,
    stat: "healPowerPct",
    perRank: 0.04,
  },
  {
    id: "might_execute",
    tier: 2,
    name: "猎杀",
    icon: "猎",
    blurb: "每级对低血目标伤害 +5%",
    maxRank: 3,
    stat: "executeDamagePct",
    perRank: 0.05,
  },
  {
    id: "spirit_elite",
    tier: 2,
    name: "洞察",
    icon: "察",
    blurb: "每级对精英与首领伤害 +4%",
    maxRank: 3,
    stat: "eliteDamagePct",
    perRank: 0.04,
  },

  // —— 终极（少）：全伤 / 护盾 / 开场减 CD ——
  {
    id: "might_capstone",
    tier: 3,
    name: "战意",
    icon: "战",
    blurb: "全伤害 +8%",
    maxRank: 1,
    stat: "damagePct",
    perRank: 0.08,
  },
  {
    id: "fort_capstone",
    tier: 3,
    name: "不灭",
    icon: "盾",
    blurb: "每波开始获得 12% 最大生命护盾",
    maxRank: 1,
    stat: "waveStartShieldPct",
    perRank: 0.12,
  },
  {
    id: "spirit_capstone",
    tier: 3,
    name: "超然",
    icon: "然",
    blurb: "每波开始时技能剩余冷却减半",
    maxRank: 1,
    stat: "waveStartSkillCdrPct",
    perRank: 0.5,
  },
];

export const TALENT_BY_ID = Object.fromEntries(TALENT_NODES.map((node) => [node.id, node])) as Record<
  TalentId,
  TalentNode
>;

export const TALENT_IDS = TALENT_NODES.map(({ id }) => id);

export function isTalentId(value: string): value is TalentId {
  return value in TALENT_BY_ID;
}

export function talentsInTier(tier: number): readonly TalentNode[] {
  return TALENT_NODES.filter((node) => node.tier === tier);
}

export function getTalentTierDef(tier: number): TalentTierDef {
  const found = TALENT_TIERS.find((entry) => entry.tier === tier);
  if (!found) throw new Error(`Unknown talent tier: ${tier}`);
  return found;
}
