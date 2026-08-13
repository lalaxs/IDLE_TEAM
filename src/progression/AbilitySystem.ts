import {
  ABILITY_BY_ID,
  ABILITY_DEFINITIONS,
  ABILITY_IDS,
  COMBAT_ABILITIES,
  ECONOMY_ABILITIES,
  GENERAL_ABILITIES,
  type AbilityId,
} from "../content/abilities";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
export type AbilityLevels = Record<AbilityId, number>;

export const ABILITY_UPGRADE_COST_BASE = 80;
export const ABILITY_UPGRADE_COST_GROWTH = 1.14;

export function createDefaultAbilityLevels(): AbilityLevels {
  return Object.fromEntries(ABILITY_IDS.map((id) => [id, 0])) as AbilityLevels;
}

export function getAbilityMaxLevel(abilityId: AbilityId): number {
  return ABILITY_BY_ID[abilityId].maxLevel;
}

export function normalizeAbilityLevels(raw: unknown): AbilityLevels {
  const base = createDefaultAbilityLevels();
  if (!raw || typeof raw !== "object") return base;
  const source = raw as Partial<Record<AbilityId, unknown>>;
  for (const id of ABILITY_IDS) {
    const value = source[id];
    const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
    base[id] = Math.min(getAbilityMaxLevel(id), Math.max(0, numeric));
  }
  return base;
}

/** Gold cost to raise an ability from `level` to `level + 1`. */
export function getAbilityUpgradeCost(level: number): number {
  return Math.round(ABILITY_UPGRADE_COST_BASE * ABILITY_UPGRADE_COST_GROWTH ** Math.max(0, level));
}

export function getAbilityEffectValue(abilityId: AbilityId, level: number): number {
  const definition = ABILITY_BY_ID[abilityId];
  const clamped = Math.max(0, Math.min(definition.maxLevel, level));
  return definition.perLevel * clamped;
}

export function describeAbilityEffect(abilityId: AbilityId, level: number): string {
  const definition = ABILITY_BY_ID[abilityId];
  const value = getAbilityEffectValue(abilityId, level);
  const pretty = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  if (definition.unit === "percent") return `当前 +${pretty}%`;
  return `当前 +${pretty}`;
}

/** Apply purchased gold abilities: (base + flat) * (1 + percent). */
export function applyGoldAbilityBonus(baseGold: number, levels: AbilityLevels): number {
  const flat = getAbilityEffectValue("gold_flat", levels.gold_flat);
  const percent = getAbilityEffectValue("gold_percent", levels.gold_percent);
  return Math.round((baseGold + flat) * (1 + percent / 100));
}

export function applyOfflineGoldAbilityBonus(baseGold: number, levels: AbilityLevels): number {
  const percent = getAbilityEffectValue("offline_gold_percent", levels.offline_gold_percent);
  return Math.round(baseGold * (1 + percent / 100));
}

export function applyOfflineExpAbilityBonus(baseExp: number, levels: AbilityLevels): number {
  const percent = getAbilityEffectValue("offline_exp_percent", levels.offline_exp_percent);
  return Math.round(baseExp * (1 + percent / 100));
}

export const BACKPACK_CAPACITY_BASE = 40;

export function getBackpackCapacity(levels: AbilityLevels): number {
  return BACKPACK_CAPACITY_BASE + getAbilityEffectValue("backpack_slots", levels.backpack_slots);
}

/** Extra boss-meter fill rate as a fraction (0.01 = +1%). */
export function getChestProgressBonus(levels: AbilityLevels): number {
  return getAbilityEffectValue("chest_progress", levels.chest_progress) / 100;
}

/** Account combat abilities layered onto every hero. */
export function applyCombatAbilityBonus(bonus: HeroBattleBonus, levels: AbilityLevels): HeroBattleBonus {
  const next = { ...bonus };
  next.attack = (next.attack ?? 0) + getAbilityEffectValue("hero_attack", levels.hero_attack);
  next.defense = (next.defense ?? 0) + getAbilityEffectValue("hero_defense", levels.hero_defense);
  next.skillCooldownPct =
    (next.skillCooldownPct ?? 0) + getAbilityEffectValue("hero_cooldown", levels.hero_cooldown) / 100;
  next.attackSpeedPct =
    (next.attackSpeedPct ?? 0) + getAbilityEffectValue("hero_attack_speed", levels.hero_attack_speed);
  next.physicalDamagePct =
    (next.physicalDamagePct ?? 0) + getAbilityEffectValue("physical_damage", levels.physical_damage) / 100;
  next.magicDamagePct =
    (next.magicDamagePct ?? 0) + getAbilityEffectValue("magic_damage", levels.magic_damage) / 100;
  next.damagePct = (next.damagePct ?? 0) + getAbilityEffectValue("damage_bonus", levels.damage_bonus) / 100;
  next.damageReductionPct =
    (next.damageReductionPct ?? 0) + getAbilityEffectValue("damage_reduction", levels.damage_reduction) / 100;
  return next;
}

export function abilityCardMeta(abilityId: AbilityId, level: number) {
  const definition = ABILITY_BY_ID[abilityId];
  const atMax = level >= definition.maxLevel;
  return {
    definition,
    level,
    atMax,
    effectText: describeAbilityEffect(abilityId, level),
    nextCost: atMax ? null : getAbilityUpgradeCost(level),
  };
}

export {
  ABILITY_DEFINITIONS,
  COMBAT_ABILITIES,
  ECONOMY_ABILITIES,
  GENERAL_ABILITIES,
};