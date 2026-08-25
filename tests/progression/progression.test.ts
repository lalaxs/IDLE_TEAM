import { describe, expect, it } from "vitest";
import {
  canAscendHero,
  getHeroLevelCap,
  getHeroStats,
  getStarFlatDelta,
  getStarUpgradeCost,
  getUpgradeCost,
} from "../../src/progression/HeroProgression";
import {
  compareInventoryItems,
  createEquipment,
  getItemBudget,
  getItemScore,
  insertInventoryItem,
  sortInventoryItems,
  type InventoryItem,
} from "../../src/progression/EquipmentSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";
import type { RandomSource } from "../../src/simulation/RandomSource";

const frostTraitRandom: RandomSource = {
  next: () => 0.1,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

describe("hero progression", () => {
  it("uses the approved level curves", () => {
    expect(getUpgradeCost(1)).toBe(60);
    expect(getUpgradeCost(2)).toBe(65);
    expect(getHeroStats("H01", 2)).toMatchObject({
      maxHp: 1539,
      attack: 92,
      defense: 66,
    });
  });

  it("caps level by ascend rank and keeps star flats through ascend percent", () => {
    expect(getHeroLevelCap(0)).toBe(20);
    expect(getHeroLevelCap(1)).toBe(40);
    expect(getHeroLevelCap(5)).toBe(100);
    expect(canAscendHero(5, 0, 19)).toBe(false);
    expect(canAscendHero(5, 0, 20)).toBe(true);
    expect(getStarUpgradeCost(0, 1)).toBe(28);
    const flats = getStarFlatDelta("H01", 1);
    expect(getHeroStats("H01", 1, { starFlatHp: flats.maxHp, ascendLevel: 2 }).maxHp).toBe(
      Math.round((1500 + flats.maxHp) * 1.08),
    );
  });
});

describe("equipment", () => {
  it("creates stage-scaled inherent stats with rarity affixes", () => {
    const budget = getItemBudget(15, "rare", 2);
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(2));
    expect(rare.stats.attack).toBeGreaterThanOrEqual(Math.round(budget * 0.85));
    expect(rare.stats.attack).toBeLessThanOrEqual(Math.round(budget * 1.15));
    expect(rare.affixes).toHaveLength(2);
    expect(rare.traitId).toBeNull();
    const epic = createEquipment("weapon_frost_fang_saber", 15, "epic", new SeededRandom(2));
    expect(epic.traitId).toBe("frostbite");
    expect(getItemScore(epic)).toBeGreaterThan(100);
  });

  it("converts common overflow to gold and preserves rare overflow", () => {
    const inventory = Array.from({ length: 40 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(index + 1)),
    );
    const common = createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(99));
    expect(insertInventoryItem(inventory, [], common).goldGained).toBe(56);
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(100));
    expect(insertInventoryItem(inventory, [], rare).overflow).toHaveLength(1);
  });

  it("ignores equipped items when checking backpack capacity", () => {
    const inventory = Array.from({ length: 40 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(index + 1)),
    );
    const equippedIds = new Set([inventory[0]!.instanceId]);
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(100));
    const result = insertInventoryItem(inventory, [], rare, equippedIds);
    expect(result.overflow).toHaveLength(0);
    expect(result.inventory).toHaveLength(41);
    expect(result.inventory.at(-1)).toEqual(rare);
  });

  it("binds Diablo Immortal–style legendary powers only on epic by definition", () => {
    expect(createEquipment("weapon_frost_fang_saber", 13, "rare", frostTraitRandom).traitId).toBeNull();
    expect(createEquipment("weapon_frost_fang_saber", 13, "epic", frostTraitRandom).traitId).toBe(
      "frostbite",
    );
    expect(createEquipment("weapon_frost_fang_saber", 13, "uncommon", frostTraitRandom).traitId).toBeNull();
    // T1 boards clamp to 良品 — no legendary on iron-tier boards
    expect(createEquipment("weapon_guard_blade", 13, "epic", frostTraitRandom).rarity).toBe("uncommon");
    expect(createEquipment("weapon_guard_blade", 13, "epic", frostTraitRandom).traitId).toBeNull();
    expect(createEquipment("weapon_dune_crescent_sickle", 25, "epic", frostTraitRandom).traitId).toBe(
      "sandscar",
    );
    expect(createEquipment("weapon_cloudsplitter_glaive", 37, "epic", frostTraitRandom).traitId).toBe(
      "thunderbrand",
    );
    expect(createEquipment("offhand_frost_buckler", 13, "epic", frostTraitRandom).traitId).toBe("aegis");
  });

  it("sorts inventory by rarity, then score, then slot kind", () => {
    const items: InventoryItem[] = [
      {
        instanceId: "a",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 50 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "b",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "rare",
        stage: 1,
        stats: { maxHp: 10, defense: 1 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "c",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "d",
        definitionId: "armor_guard_mail",
        slot: "armor",
        rarity: "rare",
        stage: 1,
        stats: { maxHp: 200, defense: 10 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "e",
        definitionId: "accessory_leaf_charm",
        slot: "amulet",
        rarity: "uncommon",
        stage: 1,
        stats: { attackSpeedPct: 5 },
        affixes: [],
        traitId: null,
      },
    ];

    expect(sortInventoryItems(items).map(({ instanceId }) => instanceId)).toEqual([
      "c", // rare weapon, higher score than other rare weapon-less armor? c attack 20 score ~60+35, b low score, d high hp
      "d",
      "b",
      "e",
      "a",
    ]);
    expect(compareInventoryItems(items[2]!, items[3]!)).toBeLessThan(0);
  });
});
