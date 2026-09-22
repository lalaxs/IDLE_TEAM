import { describe, expect, it } from "vitest";
import {
  AFFIX_COUNT_BY_RARITY,
  AFFIX_BY_ID,
  GREATER_AFFIX_POWER_MULTIPLIER,
  SMELT_AFFIX_POWER_MULTIPLIER,
  formatAffixValue,
  getAffixSchoolWeight,
  getAffixesForSlot,
  getAffixValueBounds,
} from "../../src/content/affixes";
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS } from "../../src/content/items";
import { applyItemToBonus } from "../../src/progression/AffixBonuses";
import {
  EQUIPMENT_LEVEL_TIERS,
  canHeroEquipItem,
  createEquipment,
  equipmentLevelForStage,
  getEquipmentLevel,
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
    for (let seed = 1; seed <= 40; seed += 1) {
      const item = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(seed));
      const budget = getItemBudget(getEquipmentLevel(item), "rare", 2);
      expect(item.stats.attack).toBeGreaterThanOrEqual(Math.round(budget * 0.95));
      expect(item.stats.attack).toBeLessThanOrEqual(Math.round(budget * 1.05));
    }
  });

  it("maps the campaign only to the starter tier and fixed 5-level tiers", () => {
    expect(equipmentLevelForStage(1)).toBe(1);
    expect(equipmentLevelForStage(5)).toBe(1);
    expect(equipmentLevelForStage(6)).toBe(5);
    expect(equipmentLevelForStage(11)).toBe(5);
    expect(equipmentLevelForStage(12)).toBe(10);
    expect(equipmentLevelForStage(120)).toBe(100);
    for (let stage = 1; stage <= 120; stage += 1) {
      expect(EQUIPMENT_LEVEL_TIERS).toContain(equipmentLevelForStage(stage));
    }
    const endgame = createEquipment("weapon_cloudsplitter_glaive", 120, "epic", new SeededRandom(8));
    expect(getEquipmentLevel(endgame)).toBe(100);
    expect(canHeroEquipItem(99, endgame)).toBe(false);
    expect(canHeroEquipItem(100, endgame)).toBe(true);
  });

  it("keeps each slot's inherent stat package fixed", () => {
    const offHand = createEquipment("offhand_oak_buckler", 1, "common", new SeededRandom(1));
    const gloves = createEquipment("gloves_oak_gauntlets", 1, "common", new SeededRandom(2));
    const amulet = createEquipment("accessory_leaf_charm", 1, "common", new SeededRandom(3));
    const earring = createEquipment("earring_dew_drop", 1, "common", new SeededRandom(4));

    expect(Object.keys(offHand.stats).sort()).toEqual(["attack", "defense"]);
    expect(Object.keys(gloves.stats).sort()).toEqual(["attack", "attackSpeedPct"]);
    expect(Object.keys(amulet.stats).sort()).toEqual(["attack", "maxHp"]);
    expect(Object.keys(earring.stats).sort()).toEqual(["defense", "maxHp"]);
  });

  it("weights school affixes without turning school into an equip lock", () => {
    expect(getAffixSchoolWeight(AFFIX_BY_ID.physical_damage_pct, "physical")).toBe(2.5);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.physical_damage_pct, "magic")).toBe(0.25);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.magic_damage_pct, "magic")).toBe(2.5);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.magic_damage_pct, "physical")).toBe(0.25);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.cast_speed, "magic")).toBe(2.5);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.cast_speed, "physical")).toBe(0.25);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.crit_chance, "physical")).toBe(1);
    expect(getAffixSchoolWeight(AFFIX_BY_ID.crit_chance, "magic")).toBe(1);
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
    expect(AFFIX_BY_ID.flat_defense.slots.includes("main_weapon")).toBe(false);
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
          { affixId: "cast_speed", value: 6 },
          { affixId: "cooldown_reduction", value: 6 },
          { affixId: "life_steal", value: 3 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.attack).toBe(100);
    expect(bonus.damagePct).toBeCloseTo(0.1);
    expect(bonus.castSpeedPct).toBe(6);
    expect(bonus.rageGainPct).toBeCloseTo(0.06);
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
          { affixId: "flat_defense", value: 18 },
          { affixId: "hp_regen", value: 12 },
          { affixId: "block_chance", value: 4 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.defense).toBe(38);
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
          { affixId: "fire_damage_pct", value: 15 },
          { affixId: "frost_damage_pct", value: 12 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.dodgeChance).toBeCloseTo(0.03);
    expect(bonus.moveSpeedPct).toBe(5);
    expect(bonus.physicalDamagePct).toBeCloseTo(0.08);
    expect(bonus.magicDamagePct).toBeCloseTo(0.07);
    expect(bonus.fireDamagePct).toBeCloseTo(0.15);
    expect(bonus.frostDamagePct).toBeCloseTo(0.12);
  });

  it("maps holy heal power into outgoing heal bonus", () => {
    const bonus: HeroBattleBonus = {};
    applyItemToBonus(
      {
        instanceId: "h",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "epic",
        stage: 5,
        stats: { attack: 40 },
        affixes: [{ affixId: "holy_heal_pct", value: 15 }],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.healPowerPct).toBeCloseTo(0.15);
    expect(AFFIX_BY_ID.holy_heal_pct.ranges.epic.min).toBeGreaterThan(AFFIX_BY_ID.magic_damage_pct.ranges.epic.max);
    expect(AFFIX_BY_ID.holy_heal_pct.ranges.epic.min).toBeGreaterThan(AFFIX_BY_ID.damage_pct.ranges.epic.max);
    expect(AFFIX_BY_ID.holy_heal_pct.slots.includes("main_weapon")).toBe(true);
    expect(AFFIX_BY_ID.holy_heal_pct.slots).toEqual(["main_weapon", "amulet", "earring"]);
    expect(AFFIX_BY_ID.holy_heal_pct.slots.includes("armor")).toBe(false);
  });

  it("keeps a clear staircase from generic to precise damage affixes", () => {
    const allDamage = AFFIX_BY_ID.damage_pct.ranges.epic;
    const schoolDamage = AFFIX_BY_ID.magic_damage_pct.ranges.epic;
    expect(AFFIX_BY_ID.physical_damage_pct.ranges.epic).toEqual(schoolDamage);
    expect(schoolDamage.max).toBeGreaterThan(allDamage.max);
    expect(schoolDamage.min).toBeGreaterThanOrEqual(allDamage.min);
    for (const id of [
      "fire_damage_pct",
      "frost_damage_pct",
      "lightning_damage_pct",
      "dark_damage_pct",
      "holy_heal_pct",
    ] as const) {
      const range = AFFIX_BY_ID[id].ranges.epic;
      expect(range.max).toBeGreaterThan(schoolDamage.max);
      expect(range.min).toBeGreaterThanOrEqual(allDamage.max);
      expect(AFFIX_BY_ID[id].slots.includes("main_weapon")).toBe(true);
      expect(AFFIX_BY_ID[id].slots.includes("armor")).toBe(false);
    }
  });

  it("maps elemental resist affixes on armor and not weapons", () => {
    expect(AFFIX_BY_ID.fire_resist.slots.includes("main_weapon")).toBe(false);
    expect(AFFIX_BY_ID.fire_resist.slots.includes("armor")).toBe(true);
    expect(AFFIX_BY_ID.holy_resist.slots.includes("armor")).toBe(true);
    expect(AFFIX_BY_ID.holy_resist.slots.includes("main_weapon")).toBe(false);
    expect(AFFIX_BY_ID.all_resist.slots.includes("armor")).toBe(true);
    expect(AFFIX_BY_ID.all_resist.slots.includes("boots")).toBe(false);

    const bonus: HeroBattleBonus = {};
    applyItemToBonus(
      {
        instanceId: "r",
        definitionId: "armor_guard_mail",
        slot: "armor",
        rarity: "epic",
        stage: 5,
        stats: { defense: 20 },
        affixes: [
          { affixId: "fire_resist", value: 8 },
          { affixId: "frost_resist", value: 6 },
          { affixId: "all_resist", value: 3 },
          { affixId: "holy_resist", value: 7 },
        ],
        traitId: null,
      },
      bonus,
    );
    expect(bonus.fireResistPct).toBeCloseTo(0.08);
    expect(bonus.frostResistPct).toBeCloseTo(0.06);
    expect(bonus.allResistPct).toBeCloseTo(0.03);
    expect(bonus.holyResistPct).toBeCloseTo(0.07);
  });

  it("keeps resistance as bounded percentages independent of item budget", () => {
    expect(AFFIX_BY_ID.fire_resist.kind).toBe("percent");
    expect(AFFIX_BY_ID.all_resist.kind).toBe("percent");
    expect(formatAffixValue("fire_resist", 12)).toBe("火焰抗性 +12%");
    expect(formatAffixValue("all_resist", 7)).toBe("全元素抗性 +7%");

    const all = getAffixValueBounds("all_resist", "epic", 100);
    expect(all).toEqual({ min: 1, max: 2 });
    expect(getAffixValueBounds("all_resist", "epic", 100_000)).toEqual(all);
    for (const id of [
      "physical_resist",
      "fire_resist",
      "frost_resist",
      "lightning_resist",
      "dark_resist",
      "holy_resist",
    ] as const) {
      const specific = getAffixValueBounds(id, "epic", 100);
      expect(specific).toEqual({ min: 2, max: 4 });
      expect(getAffixValueBounds(id, "epic", 100_000)).toEqual(specific);
      expect(specific.min / all.min).toBeGreaterThanOrEqual(1.5);
      expect(specific.min / all.min).toBeLessThanOrEqual(2);
      expect(specific.max / all.max).toBeGreaterThanOrEqual(1.5);
      expect(specific.max / all.max).toBeLessThanOrEqual(2);
    }
  });

  it("uses rarity once for flat affixes and keeps smelting at 75% power", () => {
    const epic = getAffixValueBounds("flat_attack", "epic", 1_000, 100);
    const primordial = getAffixValueBounds("flat_attack", "primordial", 1_000, 100);
    expect(primordial).toEqual(epic);
    expect(
      getAffixValueBounds(
        "flat_attack",
        "primordial",
        1_000,
        100,
        SMELT_AFFIX_POWER_MULTIPLIER,
      ),
    ).toEqual({ min: 60, max: 105 });
  });

  it("caps percentage affixes at the epic band for higher rarities", () => {
    expect(getAffixValueBounds("damage_pct", "primordial", 1, 100)).toEqual(
      getAffixValueBounds("damage_pct", "epic", 1, 100),
    );
    expect(
      Math.round(
        getAffixValueBounds("damage_pct", "primordial", 1, 100).max
          * GREATER_AFFIX_POWER_MULTIPLIER,
      ),
    ).toBe(4);
  });

  it("keeps the level-100 top weapon inside the compressed endgame band", () => {
    const budget = getItemBudget(100, "primordial", 4);
    expect(budget).toBeGreaterThanOrEqual(2_300);
    expect(budget).toBeLessThanOrEqual(2_400);
    expect(Math.round(budget * 0.95)).toBeGreaterThanOrEqual(2_200);
    expect(Math.round(budget * 1.05)).toBeLessThanOrEqual(2_550);
    const greaterFlatAttack = getAffixValueBounds(
      "flat_attack",
      "primordial",
      budget,
      100,
    ).max * GREATER_AFFIX_POWER_MULTIPLIER;
    expect(Math.round(greaterFlatAttack)).toBeLessThan(1_000);
  });

  it("keeps a full ten-slot endgame smelt loadout inside the additive damage budget", () => {
    const fireSmeltMax = getAffixValueBounds(
      "fire_damage_pct",
      "primordial",
      1,
      100,
      SMELT_AFFIX_POWER_MULTIPLIER,
    ).max;
    const bonus: HeroBattleBonus = {};
    const items = EQUIPMENT_SLOTS.map((slot, index) => {
      const definition = ITEM_DEFINITIONS.find((entry) => entry.slot === slot)!;
      const item = createEquipment(definition.id, 120, "primordial", new SeededRandom(800 + index), 100);
      item.affixes = AFFIX_BY_ID.fire_damage_pct.slots.includes(slot)
        ? [{ affixId: "fire_damage_pct", value: fireSmeltMax, smelted: true }]
        : [];
      applyItemToBonus(item, bonus);
      return item;
    });

    const additiveDamageMultiplier = 1
      + (bonus.damagePct ?? 0)
      + (bonus.magicDamagePct ?? 0)
      + (bonus.fireDamagePct ?? 0);
    expect(items).toHaveLength(10);
    expect(items.filter((item) => item.affixes.some((roll) => roll.smelted))).toHaveLength(7);
    expect(additiveDamageMultiplier).toBeLessThanOrEqual(2.8);
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

  it("preserves Greater Affix state when loading inventory", () => {
    const item = normalizeInventoryItem({
      instanceId: "greater-gear",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "epic",
      level: 100,
      stage: 120,
      stats: { attack: 40 },
      affixes: [{ affixId: "flat_attack", value: 120, greater: true, smelted: true }],
      traitId: "sharp",
    });
    expect(item?.affixes[0]).toEqual({ affixId: "flat_attack", value: 120, greater: true, smelted: true });
  });

  it("brings legacy over-budget resistance rolls into the new bounded ranges", () => {
    const item = normalizeInventoryItem({
      instanceId: "legacy-resist-gear",
      definitionId: "armor_guard_mail",
      slot: "armor",
      rarity: "epic",
      level: 100,
      stage: 120,
      stats: { defense: 40 },
      affixes: [
        { affixId: "fire_resist", value: 3_756 },
        { affixId: "all_resist", value: 2_086, smelted: true },
      ],
      traitId: "sharp",
    });
    expect(item?.affixes).toEqual([
      { affixId: "fire_resist", value: 4 },
      { affixId: "all_resist", value: 2, smelted: true },
    ]);
  });

  it("brings legacy base stats into the compressed equipment band", () => {
    const item = normalizeInventoryItem({
      instanceId: "legacy-high-weapon",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "primordial",
      level: 100,
      stage: 120,
      stats: { attack: 99_999 },
      affixes: [],
      traitId: "sharp",
    });
    const budget = getItemBudget(100, "primordial", 1);
    expect(item?.stats.attack).toBe(Math.round(budget * 1.05));
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
