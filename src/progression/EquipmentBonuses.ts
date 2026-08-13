import { applyItemToBonus } from "./AffixBonuses";
import type { InventoryItem } from "./EquipmentSystem";
import { getHeroStats } from "./HeroProgression";
import { ITEM_BY_ID } from "../content/items";
import { activeSetBonuses, type SetId } from "../content/sets";
import { rarityHasLegendaryTrait } from "../content/rarities";
import { BASE_CRIT_MULTIPLIER } from "../content/balance";
import { HERO_BY_ID } from "../content/heroes";
import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import {
  BLOCK_CHANCE_CAP,
  DODGE_CHANCE_CAP,
  SKILL_COOLDOWN_REDUCTION_CAP,
} from "../content/affixes";
import type { SaveDataV1 } from "../persistence/schema";
import { applyCombatAbilityBonus } from "./AbilitySystem";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { HeroId } from "../simulation/types";

function applyTraitBonuses(item: InventoryItem, bonus: HeroBattleBonus): void {
  const high = rarityHasLegendaryTrait(item.rarity);
  if (item.traitId === "swift") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 12 : 8);
  if (item.traitId === "tenacious") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "precision") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.07 : 0.04);
  if (item.traitId === "focus") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "sharp") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "execute") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + (high ? 0.18 : 0.12);
  if (item.traitId === "guardian") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "thorns") bonus.thornsPct = (bonus.thornsPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "renewal") bonus.renewalPct = (bonus.renewalPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "frostbite") bonus.frostbiteChance = 0.15;
  if (item.traitId === "snowguard") bonus.snowguardShieldPct = 0.06;
  if (item.traitId === "frostfocus") bonus.frostfocusCooldownPct = 0.18;
  if (item.traitId === "sandscar") bonus.sandscarChance = 0.15;
  if (item.traitId === "mirageguard") bonus.mirageGuardPct = 0.2;
  if (item.traitId === "tailwind") bonus.tailwindPct = 0.15;
  if (item.traitId === "thunderbrand") bonus.thunderbrandPct = 0.35;
  if (item.traitId === "cloudveil") bonus.cloudveilShieldPct = 0.12;
  if (item.traitId === "stormward") bonus.stormwardShieldPct = 0.1;
  if (item.traitId === "aegis") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.09 : 0.06);
  if (item.traitId === "keen") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.05 : 0.03);
  if (item.traitId === "fleet") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 10 : 6);
  if (item.traitId === "sturdy") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "sanguine") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "warding") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + (high ? 0.05 : 0.03);
  if (item.traitId === "insight") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + (high ? 0.08 : 0.05);
  if (item.traitId === "bogvenom") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + 0.08;
  if (item.traitId === "mireguard") bonus.snowguardShieldPct = 0.07;
  if (item.traitId === "fenfocus") bonus.frostfocusCooldownPct = 0.15;
  if (item.traitId === "emberbrand") bonus.thunderbrandPct = 0.28;
  if (item.traitId === "ashplate") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + 0.04;
  if (item.traitId === "cinderfocus") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + 0.08;
  if (item.traitId === "tidemark") bonus.frostbiteChance = 0.12;
  if (item.traitId === "saltguard") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + 0.07;
  if (item.traitId === "seafocus") bonus.critDamagePct = (bonus.critDamagePct ?? 0) + 12;
  if (item.traitId === "wailbrand") bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + 0.1;
  if (item.traitId === "barrowguard") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + 0.08;
  if (item.traitId === "gravefocus") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + 0.1;
  if (item.traitId === "fangbrand") bonus.critChance = (bonus.critChance ?? 0) + 0.04;
  if (item.traitId === "stoneguard") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + 0.05;
  if (item.traitId === "peakfocus") bonus.damagePct = (bonus.damagePct ?? 0) + 0.08;
  if (item.traitId === "northbrand") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + 8;
  if (item.traitId === "gateguard") bonus.cloudveilShieldPct = 0.1;
  if (item.traitId === "galefocus") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + 0.07;
}

export function getEquipmentBonuses(save: SaveDataV1): Partial<Record<HeroId, HeroBattleBonus>> {
  const result: Partial<Record<HeroId, HeroBattleBonus>> = {};
  for (const [rawHeroId, progress] of Object.entries(save.roster)) {
    const heroId = rawHeroId as HeroId;
    const items = Object.values(progress.equipment)
      .map((instanceId) => save.inventory.find((item) => item.instanceId === instanceId))
      .filter((item): item is InventoryItem => Boolean(item));
    const bonus: HeroBattleBonus = {};
    const setCounts: Partial<Record<SetId, number>> = {};
    for (const item of items) {
      applyItemToBonus(item, bonus);
      const definition = ITEM_BY_ID[item.definitionId];
      if (definition?.setId) {
        setCounts[definition.setId] = (setCounts[definition.setId] ?? 0) + 1;
      }
      applyTraitBonuses(item, bonus);
    }
    for (const setBonus of activeSetBonuses(setCounts)) {
      if (setBonus.lifePct) bonus.maxHpPct = (bonus.maxHpPct ?? 0) + setBonus.lifePct / 100;
      if (setBonus.damagePct) bonus.damagePct = (bonus.damagePct ?? 0) + setBonus.damagePct / 100;
      if (setBonus.damageReductionPct) {
        bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + setBonus.damageReductionPct / 100;
      }
      if (setBonus.attackSpeedPct) bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + setBonus.attackSpeedPct;
      if (setBonus.critChancePct) bonus.critChance = (bonus.critChance ?? 0) + setBonus.critChancePct / 100;
      if (setBonus.critDamagePct) bonus.critDamagePct = (bonus.critDamagePct ?? 0) + setBonus.critDamagePct;
      if (setBonus.eliteDamagePct) bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + setBonus.eliteDamagePct / 100;
    }
    result[heroId] = applyCombatAbilityBonus(bonus, save.abilities);
  }
  return result;
}

export interface HeroCombatDisplayStats {
  maxHp: number;
  attack: number;
  defense: number;
  critChancePct: number;
  critDamagePct: number;
  attackIntervalMs: number;
  attackSpeedPct: number;
  attackRange: number;
  moveSpeed: number;
  moveSpeedPct: number;
  damageSchool: "physical" | "magic";
  damagePct: number;
  primaryAttackPct: number;
  skillDamagePct: number;
  physicalDamagePct: number;
  magicDamagePct: number;
  eliteDamagePct: number;
  skillCooldownPct: number;
  skillCooldownMs: number;
  damageReductionPct: number;
  lifeOnHit: number;
  lifeStealPct: number;
  hpRegenPerSec: number;
  dodgeChancePct: number;
  blockChancePct: number;
  executeDamagePct: number;
  guardianShieldPct: number;
  thornsPct: number;
  renewalPct: number;
  frostbiteChancePct: number;
  snowguardShieldPct: number;
  frostfocusCooldownPct: number;
  sandscarChancePct: number;
  mirageGuardPct: number;
  tailwindPct: number;
  thunderbrandPct: number;
  cloudveilShieldPct: number;
  stormwardShieldPct: number;
}

export function getHeroCombatDisplayStats(
  heroId: HeroId,
  level: number,
  bonus: HeroBattleBonus = {},
): HeroCombatDisplayStats {
  const definition = HERO_BY_ID[heroId];
  const levelStats = getHeroStats(heroId, level);
  const attackSpeedPct = bonus.attackSpeedPct ?? 0;
  const skillCooldownPct = Math.min(SKILL_COOLDOWN_REDUCTION_CAP, bonus.skillCooldownPct ?? 0);
  const baseSkillCd = ACTIVE_SKILL_BY_HERO[heroId].cooldownMs ?? 6000;
  return {
    maxHp: Math.round((levelStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0))),
    attack: levelStats.attack + (bonus.attack ?? 0),
    defense: Math.round((levelStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0))),
    critChancePct: (0.05 + (bonus.critChance ?? 0)) * 100,
    critDamagePct: (BASE_CRIT_MULTIPLIER + (bonus.critDamagePct ?? 0) / 100) * 100,
    attackIntervalMs: Math.round(definition.attackIntervalMs / (1 + attackSpeedPct / 100)),
    attackSpeedPct,
    attackRange: definition.attackRange,
    moveSpeed: definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100),
    moveSpeedPct: bonus.moveSpeedPct ?? 0,
    damageSchool: definition.damageSchool,
    damagePct: (bonus.damagePct ?? 0) * 100,
    primaryAttackPct: (bonus.primaryAttackPct ?? 0) * 100,
    skillDamagePct: (bonus.skillDamagePct ?? 0) * 100,
    physicalDamagePct: (bonus.physicalDamagePct ?? 0) * 100,
    magicDamagePct: (bonus.magicDamagePct ?? 0) * 100,
    eliteDamagePct: (bonus.eliteDamagePct ?? 0) * 100,
    skillCooldownPct: skillCooldownPct * 100,
    skillCooldownMs: Math.round(baseSkillCd * (1 - skillCooldownPct)),
    damageReductionPct: (bonus.damageReductionPct ?? 0) * 100,
    lifeOnHit: bonus.lifeOnHit ?? 0,
    lifeStealPct: (bonus.lifeStealPct ?? 0) * 100,
    hpRegenPerSec: bonus.hpRegenPerSec ?? 0,
    dodgeChancePct: Math.min(DODGE_CHANCE_CAP, bonus.dodgeChance ?? 0) * 100,
    blockChancePct: Math.min(BLOCK_CHANCE_CAP, bonus.blockChance ?? 0) * 100,
    executeDamagePct: (bonus.executeDamagePct ?? 0) * 100,
    guardianShieldPct: (bonus.guardianShieldPct ?? 0) * 100,
    thornsPct: (bonus.thornsPct ?? 0) * 100,
    renewalPct: (bonus.renewalPct ?? 0) * 100,
    frostbiteChancePct: (bonus.frostbiteChance ?? 0) * 100,
    snowguardShieldPct: (bonus.snowguardShieldPct ?? 0) * 100,
    frostfocusCooldownPct: (bonus.frostfocusCooldownPct ?? 0) * 100,
    sandscarChancePct: (bonus.sandscarChance ?? 0) * 100,
    mirageGuardPct: (bonus.mirageGuardPct ?? 0) * 100,
    tailwindPct: (bonus.tailwindPct ?? 0) * 100,
    thunderbrandPct: (bonus.thunderbrandPct ?? 0) * 100,
    cloudveilShieldPct: (bonus.cloudveilShieldPct ?? 0) * 100,
    stormwardShieldPct: (bonus.stormwardShieldPct ?? 0) * 100,
  };
}
