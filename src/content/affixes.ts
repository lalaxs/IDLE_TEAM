import type { EquipmentSlot } from "./equipmentSlots";
import type { DamageSchool } from "./equipmentIcon";
import { AFFIX_COUNT_BY_RARITY, type Rarity } from "./rarities";

export { AFFIX_COUNT_BY_RARITY };

/** Rolled magic attribute on an equipment instance (TBH material-stat vocabulary). */
export interface AffixRoll {
  affixId: AffixId;
  /** Display value: percent points for % affixes, flat amount for flat affixes. */
  value: number;
  /** Greater Affix: fixed at 125% of this affix's normal maximum. */
  greater?: boolean;
  /** The single affix granted by equipment smelting. */
  smelted?: boolean;
}

/** Deterministic smelting trades roll strength for direct affix selection. */
export const SMELT_AFFIX_POWER_MULTIPLIER = 0.75;
/** Greater Affixes stay desirable without making one roll dominate the item. */
export const GREATER_AFFIX_POWER_MULTIPLIER = 1.25;

export type AffixId =
  | "attack_speed"
  | "cast_speed"
  | "damage_pct"
  | "primary_attack_pct"
  | "crit_chance"
  | "crit_damage"
  | "skill_damage"
  | "cooldown_reduction"
  | "damage_reduction"
  | "flat_attack"
  | "flat_life"
  | "flat_defense"
  | "life_on_hit"
  | "life_steal"
  | "hp_regen"
  | "dodge_chance"
  | "block_chance"
  | "move_speed"
  | "physical_damage_pct"
  | "magic_damage_pct"
  | "fire_damage_pct"
  | "frost_damage_pct"
  | "lightning_damage_pct"
  | "dark_damage_pct"
  | "holy_heal_pct"
  | "physical_resist"
  | "fire_resist"
  | "frost_resist"
  | "lightning_resist"
  | "dark_resist"
  | "holy_resist"
  | "all_resist";

/** Soft caps for avoidance affixes (fraction 0–1). */
export const DODGE_CHANCE_CAP = 0.35;
export const BLOCK_CHANCE_CAP = 0.35;
/** Blocked hits deal this fraction of rolled damage. */
export const BLOCK_DAMAGE_FACTOR = 0.5;

export type AffixValueKind = "percent" | "flat_budget";

/** Display as +N%. */
export function affixDisplaysPercent(kind: AffixValueKind): boolean {
  return kind === "percent";
}

type AffixBand = "uncommon" | "rare" | "epic";

export interface AffixDefinition {
  id: AffixId;
  sourceLabel: string;
  name: string;
  kind: AffixValueKind;
  scoreWeight: number;
  slots: readonly EquipmentSlot[];
  /** Raises this affix's roll weight on matching physical / magic item bases. */
  schoolBias?: DamageSchool;
  ranges: Record<AffixBand, { min: number; max: number }>;
}

function bandForRarity(rarity: Exclude<Rarity, "common">): AffixBand {
  if (rarity === "uncommon" || rarity === "rare") return rarity;
  return "epic";
}

/** Resolve affix min/max; percentage ranges stop growing after the epic band. */
export function getAffixRange(
  definition: AffixDefinition,
  rarity: Exclude<Rarity, "common">,
  _itemLevel = 100,
): { min: number; max: number } {
  const band = bandForRarity(rarity);
  const base = definition.ranges[band];
  return base;
}

const WEAPON: readonly EquipmentSlot[] = ["main_weapon", "off_hand"];
const ARMOR: readonly EquipmentSlot[] = ["helmet", "armor", "gloves", "boots", "bracer"];
const ACCESSORY: readonly EquipmentSlot[] = ["ring", "amulet", "earring"];

/** Fixed percentage bands; specific resistance is stronger than all resistance. */
const ALL_RESIST_RANGES = {
  uncommon: { min: 1, max: 2 },
  rare: { min: 1, max: 2 },
  epic: { min: 1, max: 2 },
};
const ELEMENT_RESIST_RANGES = {
  uncommon: { min: 2, max: 4 },
  rare: { min: 2, max: 4 },
  epic: { min: 2, max: 4 },
};

/**
 * Affix pool aligned to TBH decoration / engraving / inscription material stats.
 * Drop-random structure kept for idle loot; vocabulary & choice axes follow TBH.
 */
export const AFFIX_DEFINITIONS: readonly AffixDefinition[] = [
  {
    id: "flat_attack",
    sourceLabel: "Attack Damage",
    name: "攻击",
    kind: "flat_budget",
    scoreWeight: 3,
    slots: [...WEAPON, "gloves", "bracer", ...ACCESSORY],
    ranges: {
      uncommon: { min: 0.08, max: 0.14 },
      rare: { min: 0.08, max: 0.14 },
      epic: { min: 0.08, max: 0.14 },
    },
  },
  {
    id: "damage_pct",
    sourceLabel: "Attack Damage %",
    name: "全伤害",
    kind: "percent",
    scoreWeight: 10,
    slots: [...WEAPON, "helmet", ...ACCESSORY],
    ranges: {
      uncommon: { min: 1, max: 3 },
      rare: { min: 1, max: 3 },
      epic: { min: 1, max: 3 },
    },
  },
  {
    id: "attack_speed",
    sourceLabel: "Attack Speed",
    name: "攻击速度",
    kind: "percent",
    scoreWeight: 8,
    slots: [...WEAPON, "helmet", "gloves", ...ACCESSORY],
    ranges: {
      uncommon: { min: 1, max: 3 },
      rare: { min: 1, max: 3 },
      epic: { min: 1, max: 3 },
    },
  },
  {
    id: "cast_speed",
    sourceLabel: "Cast Speed",
    name: "施法速度",
    kind: "percent",
    scoreWeight: 8,
    schoolBias: "magic",
    slots: [...WEAPON, "helmet", ...ACCESSORY],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 4, max: 7 },
      epic: { min: 5, max: 8 },
    },
  },
  {
    id: "crit_chance",
    sourceLabel: "Critical Chance",
    name: "暴击率",
    kind: "percent",
    scoreWeight: 12,
    slots: [...WEAPON, "gloves", ...ACCESSORY],
    ranges: {
      uncommon: { min: 1, max: 2 },
      rare: { min: 1, max: 2 },
      epic: { min: 1, max: 2 },
    },
  },
  {
    id: "crit_damage",
    sourceLabel: "Critical Damage",
    name: "暴击伤害",
    kind: "percent",
    scoreWeight: 4,
    slots: [...WEAPON, "gloves", "ring", "amulet"],
    ranges: {
      uncommon: { min: 3, max: 6 },
      rare: { min: 3, max: 6 },
      epic: { min: 3, max: 6 },
    },
  },
  {
    id: "cooldown_reduction",
    sourceLabel: "Rage Gain",
    name: "怒气获取",
    kind: "percent",
    scoreWeight: 14,
    slots: [...WEAPON, ...ARMOR, ...ACCESSORY],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 4, max: 7 },
      epic: { min: 5, max: 8 },
    },
  },
  {
    id: "skill_damage",
    sourceLabel: "Skill damage (idle skill axis)",
    name: "技能伤害",
    kind: "percent",
    scoreWeight: 9,
    slots: [...WEAPON, "helmet", "amulet", "earring"],
    ranges: {
      uncommon: { min: 2, max: 4 },
      rare: { min: 2, max: 4 },
      epic: { min: 2, max: 4 },
    },
  },
  {
    id: "flat_life",
    sourceLabel: "Max HP",
    name: "生命",
    kind: "flat_budget",
    scoreWeight: 0.1,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: {
      uncommon: { min: 0.8, max: 1.4 },
      rare: { min: 0.8, max: 1.4 },
      epic: { min: 0.8, max: 1.4 },
    },
  },
  {
    id: "flat_defense",
    sourceLabel: "Armor",
    name: "防御",
    kind: "flat_budget",
    scoreWeight: 2,
    slots: [...ARMOR],
    ranges: {
      uncommon: { min: 0.04, max: 0.08 },
      rare: { min: 0.04, max: 0.08 },
      epic: { min: 0.04, max: 0.08 },
    },
  },
  {
    id: "damage_reduction",
    sourceLabel: "Damage taken reduced",
    name: "伤害减免",
    kind: "percent",
    scoreWeight: 14,
    slots: ["armor", "boots", "bracer"],
    ranges: {
      uncommon: { min: 2, max: 3 },
      rare: { min: 3, max: 4 },
      epic: { min: 4, max: 5 },
    },
  },
  {
    id: "life_on_hit",
    sourceLabel: "Add HP Per Hit",
    name: "击中回血",
    kind: "flat_budget",
    scoreWeight: 2,
    slots: [...WEAPON, ...ACCESSORY],
    ranges: {
      uncommon: { min: 0.08, max: 0.14 },
      rare: { min: 0.1, max: 0.18 },
      epic: { min: 0.12, max: 0.22 },
    },
  },
  {
    id: "life_steal",
    sourceLabel: "HP Leech",
    name: "生命偷取",
    kind: "percent",
    scoreWeight: 10,
    slots: [...WEAPON, ...ACCESSORY],
    ranges: {
      uncommon: { min: 1, max: 2 },
      rare: { min: 2, max: 3 },
      epic: { min: 3, max: 4 },
    },
  },
  {
    id: "hp_regen",
    sourceLabel: "HP Regen Per Sec",
    name: "每秒回血",
    kind: "flat_budget",
    scoreWeight: 2,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: {
      uncommon: { min: 0.06, max: 0.12 },
      rare: { min: 0.08, max: 0.15 },
      epic: { min: 0.1, max: 0.18 },
    },
  },
  {
    id: "primary_attack_pct",
    sourceLabel: "Primary Attack damage (idle keep)",
    name: "普攻伤害",
    kind: "percent",
    scoreWeight: 9,
    schoolBias: "physical",
    slots: [...WEAPON, "helmet"],
    ranges: {
      uncommon: { min: 4, max: 7 },
      rare: { min: 6, max: 10 },
      epic: { min: 8, max: 12 },
    },
  },
  {
    id: "physical_damage_pct",
    sourceLabel: "Physical Damage %",
    name: "物理伤害",
    kind: "percent",
    scoreWeight: 9,
    schoolBias: "physical",
    slots: [...WEAPON, "gloves", "ring", "amulet"],
    ranges: {
      uncommon: { min: 2, max: 4 },
      rare: { min: 2, max: 4 },
      epic: { min: 2, max: 4 },
    },
  },
  {
    id: "magic_damage_pct",
    sourceLabel: "Spell / Magic Damage %",
    name: "法术伤害",
    kind: "percent",
    scoreWeight: 9,
    schoolBias: "magic",
    slots: [...WEAPON, "helmet", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 2, max: 4 },
      rare: { min: 2, max: 4 },
      epic: { min: 2, max: 4 },
    },
  },
  {
    id: "fire_damage_pct",
    sourceLabel: "Fire Damage %",
    name: "火焰伤害",
    kind: "percent",
    scoreWeight: 8,
    slots: [...WEAPON, "helmet", "gloves", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 3, max: 5 },
      epic: { min: 3, max: 5 },
    },
  },
  {
    id: "frost_damage_pct",
    sourceLabel: "Frost Damage %",
    name: "冰霜伤害",
    kind: "percent",
    scoreWeight: 8,
    slots: [...WEAPON, "helmet", "gloves", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 3, max: 5 },
      epic: { min: 3, max: 5 },
    },
  },
  {
    id: "lightning_damage_pct",
    sourceLabel: "Lightning Damage %",
    name: "雷电伤害",
    kind: "percent",
    scoreWeight: 8,
    slots: [...WEAPON, "helmet", "gloves", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 3, max: 5 },
      epic: { min: 3, max: 5 },
    },
  },
  {
    id: "dark_damage_pct",
    sourceLabel: "Dark Damage %",
    name: "暗黑伤害",
    kind: "percent",
    scoreWeight: 8,
    slots: [...WEAPON, "helmet", "gloves", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 3, max: 5 },
      epic: { min: 3, max: 5 },
    },
  },
  {
    id: "holy_heal_pct",
    sourceLabel: "Holy Heal Power %",
    name: "治疗效果",
    kind: "percent",
    scoreWeight: 8,
    schoolBias: "magic",
    slots: ["main_weapon", "amulet", "earring"],
    ranges: {
      uncommon: { min: 9, max: 13 },
      rare: { min: 13, max: 18 },
      epic: { min: 16, max: 24 },
    },
  },
  {
    id: "physical_resist",
    sourceLabel: "Physical Resistance",
    name: "物理抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "fire_resist",
    sourceLabel: "Fire Resistance",
    name: "火焰抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "frost_resist",
    sourceLabel: "Frost Resistance",
    name: "冰霜抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "lightning_resist",
    sourceLabel: "Lightning Resistance",
    name: "雷电抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "dark_resist",
    sourceLabel: "Dark Resistance",
    name: "暗黑抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "holy_resist",
    sourceLabel: "Holy Resistance",
    name: "圣光抗性",
    kind: "percent",
    scoreWeight: 4,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: ELEMENT_RESIST_RANGES,
  },
  {
    id: "all_resist",
    sourceLabel: "All Elemental Resistance",
    name: "全元素抗性",
    kind: "percent",
    scoreWeight: 6,
    slots: ["helmet", "armor", "amulet"],
    ranges: ALL_RESIST_RANGES,
  },
  {
    id: "dodge_chance",
    sourceLabel: "Dodge Chance",
    name: "闪避",
    kind: "percent",
    scoreWeight: 12,
    slots: ["boots", "gloves", "bracer", ...ACCESSORY],
    ranges: {
      uncommon: { min: 2, max: 3 },
      rare: { min: 3, max: 4 },
      epic: { min: 4, max: 5 },
    },
  },
  {
    id: "block_chance",
    sourceLabel: "Block Chance",
    name: "格挡",
    kind: "percent",
    scoreWeight: 12,
    slots: ["off_hand", "armor", "bracer", "helmet"],
    ranges: {
      uncommon: { min: 2, max: 3 },
      rare: { min: 3, max: 4 },
      epic: { min: 4, max: 5 },
    },
  },
  {
    id: "move_speed",
    sourceLabel: "Movement Speed",
    name: "移动速度",
    kind: "percent",
    scoreWeight: 6,
    slots: ["boots", ...ACCESSORY],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 4, max: 7 },
      epic: { min: 5, max: 8 },
    },
  },
] as const;

export const AFFIX_BY_ID = Object.fromEntries(
  AFFIX_DEFINITIONS.map((affix) => [affix.id, affix]),
) as Record<AffixId, AffixDefinition>;


export function formatAffixValue(affixId: AffixId, value: number): string {
  const definition = AFFIX_BY_ID[affixId];
  if (!definition) return `+${value}`;
  if (affixDisplaysPercent(definition.kind)) return `${definition.name} +${value}%`;
  return `${definition.name} +${value}`;
}

/** Possible rolled value bounds for craft preview (percent or flat-from-budget). */
export function getAffixValueBounds(
  affixId: AffixId,
  rarity: Exclude<Rarity, "common">,
  budget: number,
  itemLevel = 100,
  valueScale = 1,
): { min: number; max: number } {
  const definition = AFFIX_BY_ID[affixId];
  const range = getAffixRange(definition, rarity, itemLevel);
  if (definition.kind === "percent") {
    return {
      min: Math.max(1, Math.round(range.min * valueScale)),
      max: Math.max(1, Math.round(range.max * valueScale)),
    };
  }
  return {
    min: Math.max(1, Math.round(budget * range.min * valueScale)),
    max: Math.max(1, Math.round(budget * range.max * valueScale)),
  };
}

export function formatAffixRangeLabel(
  affixId: AffixId,
  rarity: Exclude<Rarity, "common">,
  budget: number,
  itemLevel = 100,
  valueScale = 1,
): string {
  const definition = AFFIX_BY_ID[affixId];
  const bounds = getAffixValueBounds(affixId, rarity, budget, itemLevel, valueScale);
  if (affixDisplaysPercent(definition.kind)) {
    return `区间 ${bounds.min}% ~ ${bounds.max}%`;
  }
  return `区间 ${bounds.min} ~ ${bounds.max}`;
}

export function getAffixesForSlot(slot: EquipmentSlot): AffixDefinition[] {
  return AFFIX_DEFINITIONS.filter((affix) => affix.slots.includes(slot));
}

/** School is a loot preference rather than an equip restriction. */
export function getAffixSchoolWeight(affix: AffixDefinition, school: DamageSchool): number {
  if (!affix.schoolBias) return 1;
  return affix.schoolBias === school ? 2.5 : 0.25;
}
