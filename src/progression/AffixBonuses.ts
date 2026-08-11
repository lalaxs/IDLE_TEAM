import { AFFIX_BY_ID, type AffixRoll } from "../content/affixes";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { InventoryItem } from "./EquipmentSystem";

/** Fold inherent stats + TBH-aligned magic attributes into a hero battle bonus. */
export function applyItemToBonus(item: InventoryItem, bonus: HeroBattleBonus): void {
  bonus.attack = (bonus.attack ?? 0) + (item.stats.attack ?? 0);
  bonus.maxHp = (bonus.maxHp ?? 0) + (item.stats.maxHp ?? 0);
  bonus.defense = (bonus.defense ?? 0) + (item.stats.defense ?? 0);
  bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (item.stats.attackSpeedPct ?? 0);
  for (const roll of item.affixes ?? []) {
    applyAffixRoll(roll, bonus);
  }
}

function applyAffixRoll(roll: AffixRoll, bonus: HeroBattleBonus): void {
  if (!AFFIX_BY_ID[roll.affixId]) return;
  switch (roll.affixId) {
    case "attack_speed":
      bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + roll.value;
      break;
    case "damage_pct":
      bonus.damagePct = (bonus.damagePct ?? 0) + roll.value / 100;
      break;
    case "primary_attack_pct":
      bonus.primaryAttackPct = (bonus.primaryAttackPct ?? 0) + roll.value / 100;
      break;
    case "crit_chance":
      bonus.critChance = (bonus.critChance ?? 0) + roll.value / 100;
      break;
    case "crit_damage":
      bonus.critDamagePct = (bonus.critDamagePct ?? 0) + roll.value;
      break;
    case "skill_damage":
      bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + roll.value / 100;
      break;
    case "cooldown_reduction":
      bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + roll.value / 100;
      break;
    case "life_pct":
      bonus.maxHpPct = (bonus.maxHpPct ?? 0) + roll.value / 100;
      break;
    case "damage_reduction":
      bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + roll.value / 100;
      break;
    case "defense_pct":
      bonus.defensePct = (bonus.defensePct ?? 0) + roll.value / 100;
      break;
    case "flat_attack":
      bonus.attack = (bonus.attack ?? 0) + roll.value;
      break;
    case "flat_life":
      bonus.maxHp = (bonus.maxHp ?? 0) + roll.value;
      break;
    case "flat_defense":
      bonus.defense = (bonus.defense ?? 0) + roll.value;
      break;
    case "life_on_hit":
      bonus.lifeOnHit = (bonus.lifeOnHit ?? 0) + roll.value;
      break;
    case "life_steal":
      bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + roll.value / 100;
      break;
    case "hp_regen":
      bonus.hpRegenPerSec = (bonus.hpRegenPerSec ?? 0) + roll.value;
      break;
    case "dodge_chance":
      bonus.dodgeChance = (bonus.dodgeChance ?? 0) + roll.value / 100;
      break;
    case "block_chance":
      bonus.blockChance = (bonus.blockChance ?? 0) + roll.value / 100;
      break;
    case "move_speed":
      bonus.moveSpeedPct = (bonus.moveSpeedPct ?? 0) + roll.value;
      break;
    case "physical_damage_pct":
      bonus.physicalDamagePct = (bonus.physicalDamagePct ?? 0) + roll.value / 100;
      break;
    case "magic_damage_pct":
      bonus.magicDamagePct = (bonus.magicDamagePct ?? 0) + roll.value / 100;
      break;
  }
}
