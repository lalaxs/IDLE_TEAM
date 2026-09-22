import { describe, expect, it } from "vitest";
import {
  canAscendHero,
  getHeroLevelCap,
  getHeroStarPhase,
  getHeroStarRankLabel,
  getHeroStats,
  getStarRageGainPct,
  getStarSkillEffectPct,
  getStarUpgradeCost,
  getUpgradeCost,
} from "../../src/progression/HeroProgression";
import {
  compareInventoryItems,
  createEquipment,
  getEquipmentLevel,
  getItemBudget,
  getItemScore,
  getSalvageGold,
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
    expect(getUpgradeCost(1)).toBe(12);
    expect(getUpgradeCost(2)).toBe(19);
    expect(getHeroStats("H01", 2)).toMatchObject({
      maxHp: 1554,
      attack: 93,
      defense: 67,
    });
  });

  it("caps level by ascend rank independently of stars", () => {
    expect(getHeroLevelCap(0)).toBe(20);
    expect(getHeroLevelCap(1)).toBe(40);
    expect(getHeroLevelCap(5)).toBe(100);
    expect(canAscendHero(0, 19)).toBe(false);
    expect(canAscendHero(0, 20)).toBe(true);
    expect(canAscendHero(1, 40)).toBe(true);
    expect(canAscendHero(1, 40)).toBe(true);
    expect(canAscendHero(2, 60)).toBe(true);
    expect(getStarUpgradeCost(0)).toBe(1);
    expect(getHeroStats("H01", 1, { stars: 5, ascendLevel: 2 }).maxHp).toBe(
      Math.round(1500 * 1.08),
    );
  });

  it("advances from silver stars to gold stars and then rainbow stars", () => {
    expect(getHeroStarPhase(0)).toEqual({ phase: "silver", count: 0 });
    expect(getHeroStarRankLabel(0)).toBe("无星");
    expect(getHeroStarPhase(5)).toEqual({ phase: "silver", count: 5 });
    expect(getHeroStarRankLabel(5)).toBe("银星 5/5");
    expect(getHeroStarRankLabel(6)).toBe("金星 1/5");
    expect(getHeroStarPhase(10)).toEqual({ phase: "gold", count: 5 });
    expect(getHeroStarRankLabel(11)).toBe("彩星 1/5");
    expect(getHeroStarPhase(15)).toEqual({ phase: "rainbow", count: 5 });
    expect([0, 4, 5, 9, 10, 14].map((stars) => getStarUpgradeCost(stars))).toEqual([
      1, 5, 5, 7, 8, 10,
    ]);
    expect(Array.from({ length: 15 }, (_, stars) => getStarUpgradeCost(stars) ?? 0)
      .reduce((total, cost) => total + cost, 0)).toBe(90);
    expect(getStarUpgradeCost(15)).toBeNull();
  });

  it("scales star skills by phase without exceeding the final bonus budget", () => {
    const level100Base = getHeroStats("H01", 100);
    expect(getHeroStats("H01", 100, { stars: 15 }).maxHp).toBe(level100Base.maxHp);
    expect(getStarSkillEffectPct(5)).toBeCloseTo(0.1);
    expect(getStarSkillEffectPct(10)).toBeCloseTo(0.25);
    expect(getStarSkillEffectPct(15)).toBeCloseTo(0.45);
    expect(getStarRageGainPct(5)).toBeCloseTo(0.03);
    expect(getStarRageGainPct(10)).toBeCloseTo(0.06);
    expect(getStarRageGainPct(15)).toBeCloseTo(0.1);
  });
});

describe("equipment", () => {
  it("creates stage-scaled inherent stats with rarity affixes", () => {
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(2));
    const budget = getItemBudget(getEquipmentLevel(rare), "rare", 2);
    expect(rare.stats.attack).toBeGreaterThanOrEqual(Math.round(budget * 0.95));
    expect(rare.stats.attack).toBeLessThanOrEqual(Math.round(budget * 1.05));
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
    expect(insertInventoryItem(inventory, [], common).goldGained).toBe(50);
    const rare = createEquipment("weapon_frost_fang_saber", 15, "rare", new SeededRandom(100));
    expect(insertInventoryItem(inventory, [], rare).overflow).toHaveLength(1);
  });

  it("keeps salvage gold on the slower economy curve across equipment levels", () => {
    const levelOne = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(201), 1);
    const levelFortyFive = createEquipment("main_weapon_ch10_p", 120, "rare", new SeededRandom(202), 45);
    const levelEightyFive = createEquipment("main_weapon_ch10_p", 120, "rare", new SeededRandom(203), 85);
    const levelOneHundred = createEquipment("main_weapon_ch10_p", 120, "rare", new SeededRandom(204), 100);

    expect(getSalvageGold(levelOne)).toBe(55);
    expect(getSalvageGold(levelFortyFive)).toBe(280);
    expect(getSalvageGold(levelEightyFive)).toBe(1_108);
    expect(getSalvageGold(levelOneHundred)).toBe(1_856);
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
    expect(createEquipment("weapon_guard_blade", 13, "epic", frostTraitRandom).rarity).toBe("epic");
    expect(createEquipment("weapon_guard_blade", 13, "epic", frostTraitRandom).traitId).toBe("sharp");
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
