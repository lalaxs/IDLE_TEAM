import { applyItemToBonus } from "./AffixBonuses";
import { getEquipmentSetId, type InventoryItem } from "./EquipmentSystem";
import {
  getHeroStats,
  getStarRageGainPct,
  getStarSkillEffectPct,
  type HeroStatGrowth,
} from "./HeroProgression";
import { applyTalentBonus } from "./TalentSystem";
import { MATERIAL_BY_ID, type MaterialId } from "../content/materials";
import { activeSetBonuses, type SetId } from "../content/sets";
import { rarityHasLegendaryTrait } from "../content/rarities";
import { BASE_CRIT_MULTIPLIER } from "../content/balance";
import { baseBlockChanceForSpecialization } from "../content/specializations";
import { HERO_BY_ID } from "../content/heroes";
import { BASE_RAGE_GAIN_PCT, HERO_MAX_RAGE, MAX_CAST_SPEED_PCT } from "../content/rage";
import {
  BLOCK_CHANCE_CAP,
  DODGE_CHANCE_CAP,
} from "../content/affixes";
import {
  allResistFromDefense,
  clampElementResist,
  type DamageElement,
} from "../content/damageElements";
import { applyCombatAbilityBonus } from "./AbilitySystem";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { HeroId } from "../simulation/types";
import type { HeroProgress, SaveDataV1 } from "../domain/save/SaveData";

function applyGemBonuses(item: InventoryItem, bonus: HeroBattleBonus): void {
  for (const socket of item.sockets ?? []) {
    if (!socket.gemId) continue;
    const gem = MATERIAL_BY_ID[socket.gemId as MaterialId];
    if (!gem?.gemBonus) continue;
    const value = gem.gemBonus;
    if (value.attackPct) bonus.attackPct = (bonus.attackPct ?? 0) + value.attackPct;
    if (value.maxHpPct) bonus.maxHpPct = (bonus.maxHpPct ?? 0) + value.maxHpPct;
    if (value.defensePct) bonus.defensePct = (bonus.defensePct ?? 0) + value.defensePct;
    if (value.critChance) bonus.critChance = (bonus.critChance ?? 0) + value.critChance;
    if (value.critDamagePct) bonus.critDamagePct = (bonus.critDamagePct ?? 0) + value.critDamagePct;
    if (value.attackSpeedPct) bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + value.attackSpeedPct;
    if (value.castSpeedPct) bonus.castSpeedPct = (bonus.castSpeedPct ?? 0) + value.castSpeedPct;
    if (value.skillDamagePct) bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + value.skillDamagePct;
    if (value.rageGainPct) bonus.rageGainPct = (bonus.rageGainPct ?? 0) + value.rageGainPct;
    if (value.damageReductionPct) bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + value.damageReductionPct;
    if (value.allResistPct) bonus.allResistPct = (bonus.allResistPct ?? 0) + value.allResistPct;
    if (value.lifeStealPct) bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + value.lifeStealPct;
    if (value.healPowerPct) bonus.healPowerPct = (bonus.healPowerPct ?? 0) + value.healPowerPct;
  }
}

function applyTraitBonuses(item: InventoryItem, bonus: HeroBattleBonus): void {
  const high = rarityHasLegendaryTrait(item.rarity);
  if (item.traitId === "swift") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 12 : 8);
  if (item.traitId === "tenacious") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "precision") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.07 : 0.04);
  if (item.traitId === "focus") bonus.rageGainPct = (bonus.rageGainPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "sharp") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "execute") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + (high ? 0.18 : 0.12);
  if (item.traitId === "guardian") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "thorns") bonus.thornsPct = (bonus.thornsPct ?? 0) + (high ? 0.12 : 0.08);
  if (item.traitId === "renewal") bonus.renewalPct = (bonus.renewalPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "frostbite") bonus.frostbiteChance = 0.15;
  if (item.traitId === "snowguard") bonus.snowguardShieldPct = 0.06;
  if (item.traitId === "frostfocus") bonus.frostfocusInitialRage = 18;
  if (item.traitId === "sandscar") bonus.sandscarChance = 0.15;
  if (item.traitId === "mirageguard") bonus.mirageGuardPct = 0.2;
  if (item.traitId === "tailwind") bonus.tailwindPct = 0.15;
  if (item.traitId === "thunderbrand") bonus.thunderbrandPct = 0.35;
  if (item.traitId === "cloudveil") bonus.cloudveilShieldPct = 0.12;
  if (item.traitId === "stormward") bonus.stormwardShieldPct = 0.1;
  if (item.traitId === "aegis") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.09 : 0.06);
  if (item.traitId === "deflect") bonus.blockChance = (bonus.blockChance ?? 0) + (high ? 0.06 : 0.04);
  if (item.traitId === "reprisal") bonus.thornsPct = (bonus.thornsPct ?? 0) + (high ? 0.1 : 0.07);
  if (item.traitId === "keen") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.05 : 0.03);
  if (item.traitId === "foresight") bonus.waveStartRage = (bonus.waveStartRage ?? 0) + (high ? 16 : 10);
  if (item.traitId === "resolve") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.09 : 0.06);
  if (item.traitId === "fleet") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 10 : 6);
  if (item.traitId === "combo") bonus.primaryAttackPct = (bonus.primaryAttackPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "leeching") bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + (high ? 0.04 : 0.025);
  if (item.traitId === "sturdy") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "windstep") bonus.moveSpeedPct = (bonus.moveSpeedPct ?? 0) + (high ? 10 : 6);
  if (item.traitId === "elusive") bonus.dodgeChance = (bonus.dodgeChance ?? 0) + (high ? 0.06 : 0.04);
  if (item.traitId === "sanguine") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.1 : 0.06);
  if (item.traitId === "cruelty") bonus.critDamagePct = (bonus.critDamagePct ?? 0) + (high ? 18 : 12);
  if (item.traitId === "surge") bonus.damagePct = (bonus.damagePct ?? 0) + (high ? 0.08 : 0.05);
  if (item.traitId === "warding") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + (high ? 0.05 : 0.03);
  if (item.traitId === "parry") bonus.blockChance = (bonus.blockChance ?? 0) + (high ? 0.05 : 0.03);
  if (item.traitId === "barbed") bonus.thornsPct = (bonus.thornsPct ?? 0) + (high ? 0.09 : 0.06);
  if (item.traitId === "insight") bonus.rageGainPct = (bonus.rageGainPct ?? 0) + (high ? 0.08 : 0.05);
  if (item.traitId === "echoing") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.09 : 0.06);
  if (item.traitId === "vitality") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.08 : 0.05);
  if (item.traitId === "bogvenom") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + 0.08;
  if (item.traitId === "mireguard") bonus.snowguardShieldPct = 0.07;
  if (item.traitId === "fenfocus") bonus.frostfocusInitialRage = 15;
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
  if (item.traitId === "galefocus") bonus.rageGainPct = (bonus.rageGainPct ?? 0) + 0.07;
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
      applyGemBonuses(item, bonus);
      const setId = getEquipmentSetId(item);
      if (setId) {
        setCounts[setId] = (setCounts[setId] ?? 0) + 1;
      }
      applyTraitBonuses(item, bonus);
    }
    for (const setBonus of activeSetBonuses(setCounts)) {
      if (setBonus.lifePct) bonus.maxHpPct = (bonus.maxHpPct ?? 0) + setBonus.lifePct / 100;
      if (setBonus.defensePct) bonus.defensePct = (bonus.defensePct ?? 0) + setBonus.defensePct / 100;
      if (setBonus.damagePct) bonus.damagePct = (bonus.damagePct ?? 0) + setBonus.damagePct / 100;
      if (setBonus.primaryAttackPct) {
        bonus.primaryAttackPct = (bonus.primaryAttackPct ?? 0) + setBonus.primaryAttackPct / 100;
      }
      if (setBonus.skillDamagePct) {
        bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + setBonus.skillDamagePct / 100;
      }
      if (setBonus.physicalDamagePct) {
        bonus.physicalDamagePct = (bonus.physicalDamagePct ?? 0) + setBonus.physicalDamagePct / 100;
      }
      if (setBonus.magicDamagePct) {
        bonus.magicDamagePct = (bonus.magicDamagePct ?? 0) + setBonus.magicDamagePct / 100;
      }
      if (setBonus.fireDamagePct) bonus.fireDamagePct = (bonus.fireDamagePct ?? 0) + setBonus.fireDamagePct / 100;
      if (setBonus.lightningDamagePct) {
        bonus.lightningDamagePct = (bonus.lightningDamagePct ?? 0) + setBonus.lightningDamagePct / 100;
      }
      if (setBonus.darkDamagePct) bonus.darkDamagePct = (bonus.darkDamagePct ?? 0) + setBonus.darkDamagePct / 100;
      if (setBonus.damageReductionPct) {
        bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + setBonus.damageReductionPct / 100;
      }
      if (setBonus.attackSpeedPct) bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + setBonus.attackSpeedPct;
      if (setBonus.castSpeedPct) bonus.castSpeedPct = (bonus.castSpeedPct ?? 0) + setBonus.castSpeedPct;
      if (setBonus.rageGainPct) bonus.rageGainPct = (bonus.rageGainPct ?? 0) + setBonus.rageGainPct / 100;
      if (setBonus.critChancePct) bonus.critChance = (bonus.critChance ?? 0) + setBonus.critChancePct / 100;
      if (setBonus.critDamagePct) bonus.critDamagePct = (bonus.critDamagePct ?? 0) + setBonus.critDamagePct;
      if (setBonus.eliteDamagePct) bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + setBonus.eliteDamagePct / 100;
      if (setBonus.executeDamagePct) {
        bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + setBonus.executeDamagePct / 100;
      }
      if (setBonus.healPowerPct) bonus.healPowerPct = (bonus.healPowerPct ?? 0) + setBonus.healPowerPct / 100;
      if (setBonus.lifeStealPct) bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + setBonus.lifeStealPct / 100;
      if (setBonus.blockChancePct) bonus.blockChance = (bonus.blockChance ?? 0) + setBonus.blockChancePct / 100;
      if (setBonus.allResistPct) bonus.allResistPct = (bonus.allResistPct ?? 0) + setBonus.allResistPct / 100;
      if (setBonus.thornsPct) bonus.thornsPct = (bonus.thornsPct ?? 0) + setBonus.thornsPct / 100;
      if (setBonus.waveStartShieldPct) {
        bonus.waveStartShieldPct = (bonus.waveStartShieldPct ?? 0) + setBonus.waveStartShieldPct / 100;
      }
    }
    applyHeroProgressionBonus(heroId, progress, bonus);
    result[heroId] = applyCombatAbilityBonus(bonus, save.abilities);
  }
  return result;
}

function applyHeroProgressionBonus(heroId: HeroId, progress: HeroProgress, bonus: HeroBattleBonus): void {
  bonus.augmentationTargetId = progress.augmentationTargetId ?? null;
  const stars = progress.stars ?? 0;
  bonus.skillEffectPct = (bonus.skillEffectPct ?? 0) + getStarSkillEffectPct(stars);
  bonus.rageGainPct = (bonus.rageGainPct ?? 0) + getStarRageGainPct(stars);
  applyTalentBonus(progress.talentRanks ?? {}, heroId, bonus);
  if (progress.chosenSkillId && progress.ascendLevel >= 1) {
    bonus.chosenSkillId = progress.chosenSkillId;
  }
}

export interface HeroCombatDisplayStats {
  maxHp: number;
  maxRage: number;
  rageGainPct: number;
  attack: number;
  defense: number;
  critChancePct: number;
  critDamagePct: number;
  attackIntervalMs: number;
  attackSpeedPct: number;
  castSpeedPct: number;
  attackRange: number;
  moveSpeed: number;
  moveSpeedPct: number;
  damageSchool: "physical" | "magic";
  damageElement: DamageElement;
  damagePct: number;
  primaryAttackPct: number;
  skillDamagePct: number;
  skillEffectPct: number;
  physicalDamagePct: number;
  magicDamagePct: number;
  fireDamagePct: number;
  frostDamagePct: number;
  lightningDamagePct: number;
  darkDamagePct: number;
  healPowerPct: number;
  eliteDamagePct: number;
  initialRage: number;
  damageReductionPct: number;
  physicalResistPct: number;
  fireResistPct: number;
  frostResistPct: number;
  lightningResistPct: number;
  darkResistPct: number;
  holyResistPct: number;
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
  growth: HeroStatGrowth = {},
): HeroCombatDisplayStats {
  const definition = HERO_BY_ID[heroId];
  const levelStats = getHeroStats(heroId, level, growth);
  const attackSpeedPct = bonus.attackSpeedPct ?? 0;
  const maxHp = Math.round((levelStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0)));
  const defense = Math.round((levelStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0)));
  const resistOf = (specific: number): number =>
    clampElementResist(allResistFromDefense(defense) + (bonus.allResistPct ?? 0) + specific) * 100;
  return {
    maxHp,
    maxRage: HERO_MAX_RAGE,
    rageGainPct: BASE_RAGE_GAIN_PCT * (1 + (bonus.rageGainPct ?? 0)),
    initialRage: (bonus.waveStartRage ?? 0) + (bonus.frostfocusInitialRage ?? 0),
    attack: Math.round((levelStats.attack + (bonus.attack ?? 0)) * (1 + (bonus.attackPct ?? 0))),
    defense,
    critChancePct: (0.05 + (bonus.critChance ?? 0)) * 100,
    critDamagePct: (BASE_CRIT_MULTIPLIER + (bonus.critDamagePct ?? 0) / 100) * 100,
    attackIntervalMs: Math.round(definition.attackIntervalMs / (1 + attackSpeedPct / 100)),
    attackSpeedPct,
    castSpeedPct: Math.min(MAX_CAST_SPEED_PCT, Math.max(0, bonus.castSpeedPct ?? 0)),
    attackRange: definition.attackRange,
    moveSpeed: definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100),
    moveSpeedPct: bonus.moveSpeedPct ?? 0,
    damageSchool: definition.damageSchool,
    damageElement: definition.damageElement,
    damagePct: (bonus.damagePct ?? 0) * 100,
    primaryAttackPct: (bonus.primaryAttackPct ?? 0) * 100,
    skillDamagePct: (bonus.skillDamagePct ?? 0) * 100,
    skillEffectPct: (bonus.skillEffectPct ?? 0) * 100,
    physicalDamagePct: (bonus.physicalDamagePct ?? 0) * 100,
    magicDamagePct: (bonus.magicDamagePct ?? 0) * 100,
    fireDamagePct: (bonus.fireDamagePct ?? 0) * 100,
    frostDamagePct: (bonus.frostDamagePct ?? 0) * 100,
    lightningDamagePct: (bonus.lightningDamagePct ?? 0) * 100,
    darkDamagePct: (bonus.darkDamagePct ?? 0) * 100,
    healPowerPct: (bonus.healPowerPct ?? 0) * 100,
    eliteDamagePct: (bonus.eliteDamagePct ?? 0) * 100,
    damageReductionPct: (bonus.damageReductionPct ?? 0) * 100,
    physicalResistPct: resistOf(bonus.physicalResistPct ?? 0),
    fireResistPct: resistOf(bonus.fireResistPct ?? 0),
    frostResistPct: resistOf(bonus.frostResistPct ?? 0),
    lightningResistPct: resistOf(bonus.lightningResistPct ?? 0),
    darkResistPct: resistOf(bonus.darkResistPct ?? 0),
    holyResistPct: resistOf(bonus.holyResistPct ?? 0),
    lifeOnHit: bonus.lifeOnHit ?? 0,
    lifeStealPct: (bonus.lifeStealPct ?? 0) * 100,
    hpRegenPerSec: (bonus.hpRegenPerSec ?? 0) + maxHp * (bonus.hpRegenMaxHpPct ?? 0),
    dodgeChancePct: Math.min(DODGE_CHANCE_CAP, bonus.dodgeChance ?? 0) * 100,
    blockChancePct: Math.min(BLOCK_CHANCE_CAP, baseBlockChanceForSpecialization(definition.specId) + (bonus.blockChance ?? 0)) * 100,
    executeDamagePct: (bonus.executeDamagePct ?? 0) * 100,
    guardianShieldPct: (bonus.guardianShieldPct ?? 0) * 100,
    thornsPct: (bonus.thornsPct ?? 0) * 100,
    renewalPct: (bonus.renewalPct ?? 0) * 100,
    frostbiteChancePct: (bonus.frostbiteChance ?? 0) * 100,
    snowguardShieldPct: (bonus.snowguardShieldPct ?? 0) * 100,
    sandscarChancePct: (bonus.sandscarChance ?? 0) * 100,
    mirageGuardPct: (bonus.mirageGuardPct ?? 0) * 100,
    tailwindPct: (bonus.tailwindPct ?? 0) * 100,
    thunderbrandPct: (bonus.thunderbrandPct ?? 0) * 100,
    cloudveilShieldPct: (bonus.cloudveilShieldPct ?? 0) * 100,
    stormwardShieldPct: (bonus.stormwardShieldPct ?? 0) * 100,
  };
}
