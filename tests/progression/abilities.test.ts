import { describe, expect, it } from "vitest";
import { generateStageRewards } from "../../src/progression/RewardSystem";
import {
  applyCombatAbilityBonus,
  applyGoldAbilityBonus,
  applyOfflineGoldAbilityBonus,
  createDefaultAbilityLevels,
  getAbilityUpgradeCost,
  getBackpackCapacity,
  getChestProgressBonus,
  getGoldDropChance,
  normalizeAbilityLevels,
} from "../../src/progression/AbilitySystem";
import { ABILITY_BY_ID, ABILITY_DEFINITIONS } from "../../src/content/abilities";
import { getEquipmentBonuses } from "../../src/progression/EquipmentBonuses";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";

describe("ability upgrades", () => {
  it("scales upgrade cost with level", () => {
    expect(getAbilityUpgradeCost(0)).toBe(80);
    expect(getAbilityUpgradeCost(1)).toBeGreaterThan(getAbilityUpgradeCost(0));
    expect(getAbilityUpgradeCost(10)).toBeGreaterThan(getAbilityUpgradeCost(5));
  });

  it("applies flat then percent gold bonuses", () => {
    const levels = createDefaultAbilityLevels();
    levels.gold_flat = 2;
    levels.gold_percent = 10;
    expect(applyGoldAbilityBonus(100, levels)).toBe(Math.round((100 + 20) * 1.1));
  });

  it("boosts stage gold when amount abilities are provided", () => {
    const base = generateStageRewards(1, 42).gold;
    const levels = createDefaultAbilityLevels();
    levels.gold_flat = 5;
    levels.gold_percent = 20;
    const boosted = generateStageRewards(1, 42, levels).gold;
    // Same drop rolls (chance unchanged); amount abilities scale the payout.
    expect(boosted).toBe(base > 0 ? applyGoldAbilityBonus(base, levels) : 0);
    if (base > 0) expect(boosted).toBeGreaterThan(base);
  });

  it("raises gold drop chance with the gold_drop_chance ability", () => {
    const levels = createDefaultAbilityLevels();
    expect(getGoldDropChance()).toBeCloseTo(0.15, 5);
    levels.gold_drop_chance = 10;
    expect(getGoldDropChance(levels)).toBeCloseTo(0.25, 5);

    let baseTotal = 0;
    let boostedTotal = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      baseTotal += generateStageRewards(8, seed).gold;
      boostedTotal += generateStageRewards(8, seed, levels).gold;
    }
    expect(boostedTotal).toBeGreaterThan(baseTotal);
  });

  it("persists ability levels through save repair", () => {
    const save = repairSaveData({
      version: 1,
      abilities: {
        gold_flat: 3,
        gold_percent: 99,
        exp_flat: -2,
        exp_percent: 2,
        damage_bonus: 12,
        hero_attack: 4,
      },
    });
    expect(save.abilities.gold_flat).toBe(3);
    expect(save.abilities.gold_percent).toBe(ABILITY_BY_ID.gold_percent.maxLevel);
    expect(save.abilities.exp_flat).toBe(0);
    expect(save.abilities.exp_percent).toBe(2);
    expect(save.abilities.damage_bonus).toBe(10);
    expect(save.abilities.hero_attack).toBe(4);
  });

  it("spends gold to raise an ability level", () => {
    const save = createDefaultSave();
    save.gold = 500;
    const store = new GameStore(save);
    store.dispatch({ type: "ability:upgrade", abilityId: "gold_flat" });
    expect(store.getState().save.abilities.gold_flat).toBe(1);
    expect(store.getState().save.gold).toBe(500 - getAbilityUpgradeCost(0));
  });

  it("rejects upgrades when gold is insufficient", () => {
    const save = createDefaultSave();
    save.gold = 0;
    const store = new GameStore(save);
    store.dispatch({ type: "ability:upgrade", abilityId: "gold_percent" });
    expect(store.getState().save.abilities.gold_percent).toBe(0);
  });

  it("normalizes missing ability maps", () => {
    expect(normalizeAbilityLevels(undefined)).toEqual(createDefaultAbilityLevels());
    expect(Object.keys(createDefaultAbilityLevels()).sort()).toEqual(
      ABILITY_DEFINITIONS.map(({ id }) => id).sort(),
    );
  });

  it("applies offline gold and backpack capacity bonuses", () => {
    const levels = createDefaultAbilityLevels();
    levels.offline_gold_percent = 5;
    levels.backpack_slots = 7;
    levels.chest_progress = 4;
    expect(applyOfflineGoldAbilityBonus(1000, levels)).toBe(1100);
    expect(getBackpackCapacity(levels)).toBe(47);
    expect(getChestProgressBonus(levels)).toBeCloseTo(0.04, 5);
  });

  it("applies combat abilities onto hero bonuses", () => {
    const save = createDefaultSave();
    save.abilities.hero_attack = 2;
    save.abilities.hero_defense = 3;
    save.abilities.hero_cooldown = 5;
    save.abilities.hero_attack_speed = 10;
    save.abilities.physical_damage = 4;
    save.abilities.magic_damage = 6;
    save.abilities.damage_bonus = 2;
    save.abilities.damage_reduction = 3;
    const bonus = getEquipmentBonuses(save).H01!;
    expect(bonus.attack).toBe(200);
    expect(bonus.defense).toBe(150);
    expect(bonus.skillCooldownPct).toBeCloseTo(0.01, 5);
    expect(bonus.attackSpeedPct).toBeCloseTo(2, 5);
    expect(bonus.physicalDamagePct).toBeCloseTo(0.04, 5);
    expect(bonus.magicDamagePct).toBeCloseTo(0.06, 5);
    expect(bonus.damagePct).toBeCloseTo(0.02, 5);
    expect(bonus.damageReductionPct).toBeCloseTo(0.03, 5);
    const layered = applyCombatAbilityBonus({}, save.abilities);
    expect(layered.attack).toBe(200);
  });
});