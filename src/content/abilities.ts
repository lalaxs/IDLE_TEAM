/** Account-wide growth blessings purchased with gold. */

export type AbilityCategory = "economy" | "combat" | "general";
export type AbilityAccent =
  | "gold"
  | "amber"
  | "teal"
  | "violet"
  | "crimson"
  | "slate"
  | "sky"
  | "rose"
  | "moss";

export type AbilityId =
  | "gold_flat"
  | "gold_percent"
  | "gold_drop_chance"
  | "exp_flat"
  | "exp_percent"
  | "hero_attack"
  | "hero_defense"
  | "hero_cooldown"
  | "hero_attack_speed"
  | "physical_damage"
  | "magic_damage"
  | "damage_bonus"
  | "damage_reduction"
  | "offline_exp_percent"
  | "offline_gold_percent"
  | "backpack_slots"
  | "chest_progress";

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  blurb: string;
  icon: string;
  accent: AbilityAccent;
  category: AbilityCategory;
  maxLevel: number;
  /** Per-level magnitude in display units (flat points or percent points). */
  perLevel: number;
  unit: "flat" | "percent";
  /** Optional per-ability gold curve; omitted abilities use the shared default. */
  upgradeCostBase?: number;
  upgradeCostGrowth?: number;
  /** When false, levels persist but effects are not applied yet. */
  active: boolean;
}

export const ABILITY_DEFINITIONS: readonly AbilityDefinition[] = [
  {
    id: "gold_flat",
    name: "金币掉落固定值",
    blurb: "每级通关金币 +5",
    icon: "●",
    accent: "gold",
    category: "economy",
    maxLevel: 30,
    perLevel: 5,
    unit: "flat",
    upgradeCostBase: 600,
    upgradeCostGrowth: 1.16,
    active: true,
  },
  {
    id: "gold_percent",
    name: "金币掉落百分比",
    blurb: "每级通关金币 +1%",
    icon: "◎",
    accent: "amber",
    category: "economy",
    maxLevel: 30,
    perLevel: 1,
    unit: "percent",
    upgradeCostBase: 1000,
    upgradeCostGrowth: 1.18,
    active: true,
  },
  {
    id: "gold_drop_chance",
    name: "金币掉落几率",
    blurb: "每级金币掉落几率 +0.5%（基础 15%）",
    icon: "◉",
    accent: "gold",
    category: "economy",
    maxLevel: 20,
    perLevel: 0.5,
    unit: "percent",
    upgradeCostBase: 1600,
    upgradeCostGrowth: 1.22,
    active: true,
  },
  {
    id: "exp_flat",
    name: "经验货币掉落固定值",
    blurb: "每级通关经验 +5",
    icon: "✧",
    accent: "teal",
    category: "economy",
    maxLevel: 30,
    perLevel: 5,
    unit: "flat",
    upgradeCostBase: 600,
    upgradeCostGrowth: 1.16,
    active: true,
  },
  {
    id: "exp_percent",
    name: "经验货币掉落百分比",
    blurb: "每级通关经验 +1%",
    icon: "◇",
    accent: "violet",
    category: "economy",
    maxLevel: 30,
    perLevel: 1,
    unit: "percent",
    upgradeCostBase: 1000,
    upgradeCostGrowth: 1.18,
    active: true,
  },
  {
    id: "hero_attack",
    name: "英雄攻击力固定值",
    blurb: "每级全队攻击 +5",
    icon: "⚔",
    accent: "crimson",
    category: "combat",
    maxLevel: 30,
    perLevel: 5,
    unit: "flat",
    upgradeCostBase: 800,
    upgradeCostGrowth: 1.15,
    active: true,
  },
  {
    id: "hero_defense",
    name: "英雄防御力固定值",
    blurb: "每级全队防御 +2",
    icon: "🛡",
    accent: "slate",
    category: "combat",
    maxLevel: 30,
    perLevel: 2,
    unit: "flat",
    upgradeCostBase: 800,
    upgradeCostGrowth: 1.15,
    active: true,
  },
  {
    id: "hero_cooldown",
    name: "英雄怒气获取",
    blurb: "每级怒气获取 +0.2%",
    icon: "焰",
    accent: "sky",
    category: "combat",
    maxLevel: 25,
    perLevel: 0.2,
    unit: "percent",
    upgradeCostBase: 1120,
    upgradeCostGrowth: 1.16,
    active: true,
  },
  {
    id: "hero_attack_speed",
    name: "英雄攻速固定值",
    blurb: "每级攻击速度 +0.2%",
    icon: "↯",
    accent: "amber",
    category: "combat",
    maxLevel: 25,
    perLevel: 0.2,
    unit: "percent",
    upgradeCostBase: 1280,
    upgradeCostGrowth: 1.17,
    active: true,
  },
  {
    id: "physical_damage",
    name: "物理伤害加成",
    blurb: "每级物理伤害 +0.5%",
    icon: "▲",
    accent: "crimson",
    category: "combat",
    maxLevel: 30,
    perLevel: 0.5,
    unit: "percent",
    upgradeCostBase: 1440,
    upgradeCostGrowth: 1.17,
    active: true,
  },
  {
    id: "magic_damage",
    name: "法术伤害加成",
    blurb: "每级法术伤害 +0.5%",
    icon: "✦",
    accent: "violet",
    category: "combat",
    maxLevel: 30,
    perLevel: 0.5,
    unit: "percent",
    upgradeCostBase: 1440,
    upgradeCostGrowth: 1.17,
    active: true,
  },
  {
    id: "damage_bonus",
    name: "伤害加成",
    blurb: "每级全伤害 +0.5%",
    icon: "✸",
    accent: "rose",
    category: "combat",
    maxLevel: 20,
    perLevel: 0.5,
    unit: "percent",
    upgradeCostBase: 2080,
    upgradeCostGrowth: 1.2,
    active: true,
  },
  {
    id: "damage_reduction",
    name: "伤害减免加成",
    blurb: "每级受到伤害减免 +0.25%",
    icon: "◉",
    accent: "slate",
    category: "combat",
    maxLevel: 20,
    perLevel: 0.25,
    unit: "percent",
    upgradeCostBase: 2560,
    upgradeCostGrowth: 1.22,
    active: true,
  },
  {
    id: "offline_exp_percent",
    name: "离线经验货币获取",
    blurb: "每级离线经验 +1%",
    icon: "✧",
    accent: "teal",
    category: "general",
    maxLevel: 30,
    perLevel: 1,
    unit: "percent",
    upgradeCostBase: 1200,
    upgradeCostGrowth: 1.18,
    active: true,
  },
  {
    id: "offline_gold_percent",
    name: "离线金币获取",
    blurb: "每级离线金币 +1%",
    icon: "●",
    accent: "gold",
    category: "general",
    maxLevel: 30,
    perLevel: 1,
    unit: "percent",
    upgradeCostBase: 1200,
    upgradeCostGrowth: 1.18,
    active: true,
  },
  {
    id: "backpack_slots",
    name: "背包格子",
    blurb: "每级背包容量 +5",
    icon: "▣",
    accent: "moss",
    category: "general",
    maxLevel: 32,
    perLevel: 5,
    unit: "flat",
    upgradeCostBase: 1000,
    upgradeCostGrowth: 1.14,
    active: true,
  },
  {
    id: "chest_progress",
    name: "宝箱进度加成",
    blurb: "每级讨伐与挂机宝箱累计速度 +0.5%",
    icon: "◆",
    accent: "amber",
    category: "general",
    maxLevel: 20,
    perLevel: 0.5,
    unit: "percent",
    upgradeCostBase: 1800,
    upgradeCostGrowth: 1.22,
    active: true,
  },
] as const;

export const ABILITY_BY_ID = Object.fromEntries(
  ABILITY_DEFINITIONS.map((ability) => [ability.id, ability]),
) as Record<AbilityId, AbilityDefinition>;

export const ABILITY_IDS = ABILITY_DEFINITIONS.map(({ id }) => id);

export const ECONOMY_ABILITIES = ABILITY_DEFINITIONS.filter((ability) => ability.category === "economy");
export const COMBAT_ABILITIES = ABILITY_DEFINITIONS.filter((ability) => ability.category === "combat");
export const GENERAL_ABILITIES = ABILITY_DEFINITIONS.filter((ability) => ability.category === "general");

export const ABILITY_CATEGORY_TABS = [
  { id: "economy" as const, label: "经济" },
  { id: "combat" as const, label: "战力" },
  { id: "general" as const, label: "通用" },
];
