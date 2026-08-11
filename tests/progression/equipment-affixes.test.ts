import { describe, expect, it } from "vitest";
import {
  AFFIX_COUNT_BY_RARITY,
  AFFIX_BY_ID,
  getAffixesForSlot,
} from "../../src/content/affixes";
import { applyItemToBonus } from "../../src/progression/AffixBonuses";
import {
  createEquipment,
  getItemBudget,
  normalizeInventoryItem,
} from "../../src/progression/EquipmentSystem";
import type { HeroBattleBonus } from "../../src/simulation/BattleSimulation";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("TBH-aligned equipment affixes", () => {
  it("rolls affix counts by rarity", () => {
    expect(AFFIX_COUNT_BY_RARITY.common).toBe(0);
    expect(AFFIX_COUNT_BY_RARITY.uncommon).toBe(1);
    expect(AFFIX_COUNT_BY_RARITY.rare).toBe(2);
    expect(AFFIX_COUNT_BY_RARITY.epic).toBe(3);

    const common = createEquipment("weapon_frost_fang_saber", 15, "common", new SeededRandom(1));
    const uncommon = createEquipment("weapon_frost_fang_saber", 15, "uncommon", new SeededRandom(2));
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(3));
    const epic = createEquipment("weapon_frost_fang_saber", 15, "epic", new SeededRandom(4));

    expect(common.affixes).toHaveLength(0);
    expect(uncommon.affixes).toHaveLength(1);
    expect(rare.affixes).toHaveLength(2);
    expect(epic.affixes).toHaveLength(3);
  });

  it("keeps inherent attack within float band", () => {
    const budget = getItemBudget(15, "rare", 2);
    for (let seed = 1; seed <= 40; seed += 1) {
      const item = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(seed));
      expect(item.stats.attack).toBeGreaterThanOrEqual(Math.round(budget * 0.85));
      expect(item.stats.attack).toBeLessThanOrEqual(Math.round(budget * 1.15));
    }
  });

  it("only rolls slot-legal affixes without duplicates", () => {
    const weaponPool = new Set(getAffixesForSlot("main_weapon").map(({ id }) => id));
    for (let seed = 1; seed <= 30; seed += 1) {
      const item = createEquipment("weapon_frost_fang_saber", 15, "epic", new SeededRandom(seed));
      const ids = item.affixes.map(({ affixId }) => affixId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(weaponPool.has(id)).toBe(true);
    }
  });

  it("keeps armor-side defenses off weapons", () => {
    expect(AFFIX_BY_ID.damage_reduction.slots.includes("main_weapon")).toBe(false);
    expect(AFFIX_BY_ID.defense_pct.slots.includes("main_weapon")).toBe(false);
    expect(AFFIX_BY_ID.damage_reduction.slots.includes("armor")).toBe(true);
    expect(AFFIX_BY_ID.cooldown_reduction.slots.includes("main_weapon")).toBe(true);
  });

  it("applies TBH core affixes into battle bonus fields", () => {
    const bonus: HeroBattleBonus = {};
    applyItemToBonus(
      {
        instanceId: "t",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "epic",
        stage: 5,
        stats: { attack: 100 },
        affixes: [
          { affixId: "damage_pct", value: 10 },
          { affixId: "cooldown_reduction", value: 6 },
          { affixId: "life_steal", value: 3 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.attack).toBe(100);
    expect(bonus.damagePct).toBeCloseTo(0.1);
    expect(bonus.skillCooldownPct).toBeCloseTo(0.06);
    expect(bonus.lifeStealPct).toBeCloseTo(0.03);

    applyItemToBonus(
      {
        instanceId: "a",
        definitionId: "armor_guard_mail",
        slot: "armor",
        rarity: "epic",
        stage: 5,
        stats: { defense: 20, maxHp: 200 },
        affixes: [
          { affixId: "defense_pct", value: 8 },
          { affixId: "hp_regen", value: 12 },
          { affixId: "block_chance", value: 4 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.defensePct).toBeCloseTo(0.08);
    expect(bonus.hpRegenPerSec).toBe(12);
    expect(bonus.blockChance).toBeCloseTo(0.04);
  });

  it("maps avoidance and school damage affixes", () => {
    const bonus: HeroBattleBonus = {};
    applyItemToBonus(
      {
        instanceId: "b",
        definitionId: "boots_guard_greaves",
        slot: "boots",
        rarity: "rare",
        stage: 5,
        stats: { maxHp: 50 },
        affixes: [
          { affixId: "dodge_chance", value: 3 },
          { affixId: "move_speed", value: 5 },
        ],
        traitId: null,
      },
      bonus,
    );
    applyItemToBonus(
      {
        instanceId: "w",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "rare",
        stage: 5,
        stats: { attack: 40 },
        affixes: [
          { affixId: "physical_damage_pct", value: 8 },
          { affixId: "magic_damage_pct", value: 7 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.dodgeChance).toBeCloseTo(0.03);
    expect(bonus.moveSpeedPct).toBe(5);
    expect(bonus.physicalDamagePct).toBeCloseTo(0.08);
    expect(bonus.magicDamagePct).toBeCloseTo(0.07);
  });

  it("parses inventory items with current slot ids", () => {
    const item = normalizeInventoryItem({
      instanceId: "gear-1",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "rare",
      stage: 3,
      stats: { attack: 40 },
      affixes: [],
      traitId: "sharp",
    });
    expect(item?.slot).toBe("main_weapon");
    expect(item?.affixes).toEqual([]);
  });

  it("drops items that still use obsolete slot ids", () => {
    expect(
      normalizeInventoryItem({
        instanceId: "legacy",
        definitionId: "weapon_guard_blade",
        slot: "weapon",
        rarity: "rare",
        stage: 3,
        stats: { attack: 40 },
        traitId: null,
      }),
    ).toBeNull();
  });
});
