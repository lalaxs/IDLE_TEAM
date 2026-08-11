import type { EquipmentSlot } from "./equipmentSlots";
import { affixRangeScale, AFFIX_COUNT_BY_RARITY, type Rarity } from "./rarities";

export { AFFIX_COUNT_BY_RARITY };

/** Rolled magic attribute on an equipment instance (TBH material-stat vocabulary). */
export interface AffixRoll {
  affixId: AffixId;
  /** Display value: percent points for % affixes, flat amount for flat affixes. */
  value: number;
}

export type AffixId =
  | "attack_speed"
  | "damage_pct"
  | "primary_attack_pct"
  | "crit_chance"
  | "crit_damage"
  | "skill_damage"
  | "cooldown_reduction"
  | "life_pct"
  | "damage_reduction"
  | "defense_pct"
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
  | "magic_damage_pct";

/** Soft caps for avoidance affixes (fraction 0–1). */
export const DODGE_CHANCE_CAP = 0.35;
export const BLOCK_CHANCE_CAP = 0.35;
/** Blocked hits deal this fraction of rolled damage. */
export const BLOCK_DAMAGE_FACTOR = 0.5;

export type AffixValueKind = "percent" | "flat_budget";

type AffixBand = "uncommon" | "rare" | "epic";

export interface AffixDefinition {
  id: AffixId;
  sourceLabel: string;
  name: string;
  kind: AffixValueKind;
  scoreWeight: number;
  slots: readonly EquipmentSlot[];
  ranges: Record<AffixBand, { min: number; max: number }>;
}

function bandForRarity(rarity: Exclude<Rarity, "common">): AffixBand {
  if (rarity === "uncommon" || rarity === "rare") return rarity;
  return "epic";
}

/** Resolve affix min/max for any non-common rarity (higher grades scale from epic). */
export function getAffixRange(
  definition: AffixDefinition,
  rarity: Exclude<Rarity, "common">,
): { min: number; max: number } {
  const band = bandForRarity(rarity);
  const base = definition.ranges[band];
  const scale = affixRangeScale(rarity);
  if (scale === 1) return base;
  return { min: base.min * scale, max: base.max * scale };
}

const WEAPON: readonly EquipmentSlot[] = ["main_weapon", "off_hand"];
const ARMOR: readonly EquipmentSlot[] = ["helmet", "armor", "gloves", "boots", "bracer"];
const ACCESSORY: readonly EquipmentSlot[] = ["ring", "amulet", "earring"];

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
      uncommon: { min: 0.12, max: 0.18 },
      rare: { min: 0.14, max: 0.22 },
      epic: { min: 0.16, max: 0.26 },
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
      uncommon: { min: 4, max: 6 },
      rare: { min: 6, max: 9 },
      epic: { min: 8, max: 12 },
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
      uncommon: { min: 2, max: 4 },
      rare: { min: 3, max: 5 },
      epic: { min: 4, max: 6 },
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
      uncommon: { min: 10, max: 16 },
      rare: { min: 14, max: 22 },
      epic: { min: 18, max: 28 },
    },
  },
  {
    id: "cooldown_reduction",
    sourceLabel: "Cooldown Reduction",
    name: "冷却缩减",
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
      uncommon: { min: 4, max: 6 },
      rare: { min: 5, max: 8 },
      epic: { min: 6, max: 10 },
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
      uncommon: { min: 1.2, max: 2.0 },
      rare: { min: 1.5, max: 2.5 },
      epic: { min: 1.8, max: 3.0 },
    },
  },
  {
    id: "life_pct",
    sourceLabel: "Max HP %",
    name: "生命百分比",
    kind: "percent",
    scoreWeight: 10,
    slots: [...ARMOR, ...ACCESSORY],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 4, max: 7 },
      epic: { min: 5, max: 8 },
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
      uncommon: { min: 0.12, max: 0.2 },
      rare: { min: 0.15, max: 0.25 },
      epic: { min: 0.18, max: 0.3 },
    },
  },
  {
    id: "defense_pct",
    sourceLabel: "Armor %",
    name: "防御百分比",
    kind: "percent",
    scoreWeight: 11,
    slots: [...ARMOR],
    ranges: {
      uncommon: { min: 3, max: 5 },
      rare: { min: 4, max: 7 },
      epic: { min: 5, max: 8 },
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
    slots: [...WEAPON, "gloves", "ring", "amulet"],
    ranges: {
      uncommon: { min: 4, max: 6 },
      rare: { min: 5, max: 8 },
      epic: { min: 6, max: 10 },
    },
  },
  {
    id: "magic_damage_pct",
    sourceLabel: "Spell / Magic Damage %",
    name: "法术伤害",
    kind: "percent",
    scoreWeight: 9,
    slots: [...WEAPON, "helmet", "ring", "amulet", "earring"],
    ranges: {
      uncommon: { min: 4, max: 6 },
      rare: { min: 5, max: 8 },
      epic: { min: 6, max: 10 },
    },
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

/** Soft cap for skill cooldown reduction from gear + traits. */
export const SKILL_COOLDOWN_REDUCTION_CAP = 0.4;

export function formatAffixValue(affixId: AffixId, value: number): string {
  const definition = AFFIX_BY_ID[affixId];
  if (!definition) return `+${value}`;
  if (definition.kind === "percent") return `${definition.name} +${value}%`;
  return `${definition.name} +${value}`;
}

export function getAffixesForSlot(slot: EquipmentSlot): AffixDefinition[] {
  return AFFIX_DEFINITIONS.filter((affix) => affix.slots.includes(slot));
}
