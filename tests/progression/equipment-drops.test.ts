import { describe, expect, it } from "vitest";
import {
  getAffixValueBounds,
  GREATER_AFFIX_POWER_MULTIPLIER,
} from "../../src/content/affixes";
import { equipmentLevelForDifficulty } from "../../src/content/difficulties";
import { getChapterSetIds } from "../../src/content/sets";
import {
  createNaturalEquipment,
  getNaturalDropRarityBounds,
  getNaturalDropRarityWeights,
  rollGreaterAffixCount,
} from "../../src/progression/EquipmentDropSystem";
import { getEquipmentLevel, getItemBudget } from "../../src/progression/EquipmentSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";

class FixedRandom implements RandomSource {
  constructor(private readonly value: number) {}

  next(): number {
    return this.value;
  }

  int(min: number, max: number): number {
    return this.value < 0.5 ? min : max;
  }

  pick<T>(values: readonly T[]): T {
    return values[this.value < 0.5 ? 0 : values.length - 1]!;
  }
}

describe("natural equipment drops", () => {
  it("uses the approved front-loaded level curve", () => {
    expect(Array.from({ length: 10 }, (_, chapter) => equipmentLevelForDifficulty(chapter * 12 + 1, "easy")))
      .toEqual([1, 10, 20, 25, 30, 35, 40, 40, 45, 45]);
    expect(Array.from({ length: 10 }, (_, chapter) => equipmentLevelForDifficulty(chapter * 12 + 1, "hard")))
      .toEqual([50, 55, 60, 65, 70, 75, 80, 80, 85, 85]);
    expect(Array.from({ length: 10 }, (_, chapter) => equipmentLevelForDifficulty(chapter * 12 + 1, "nightmare")))
      .toEqual([90, 90, 90, 95, 95, 95, 95, 100, 100, 100]);
    expect(equipmentLevelForDifficulty(1, "hell")).toBe(100);
    expect(equipmentLevelForDifficulty(120, "torment")).toBe(100);
  });

  it("rolls chapter set marks on an equipment instance instead of its name", () => {
    const item = createNaturalEquipment(
      "main_weapon_ch7_p",
      73,
      "easy",
      "normal",
      new FixedRandom(0),
    );
    expect(getChapterSetIds(7)).toContain(item.setId);
    expect(item.definitionId).toBe("main_weapon_ch7_p");
  });

  it("continues the rarity curve across difficulty boundaries", () => {
    const easyChapterTen = getNaturalDropRarityWeights(109, "easy");
    const hardChapterOne = getNaturalDropRarityWeights(1, "hard");
    expect(hardChapterOne).toEqual(easyChapterTen);
  });

  it("keeps low rarities dominant through the final torment chapter", () => {
    const weights = getNaturalDropRarityWeights(120, "torment");
    expect(weights.common + weights.uncommon + weights.rare).toBeCloseTo(0.88, 5);
    expect(weights.epic + weights.immortal + weights.arcane + weights.transcendent + weights.astral + weights.sacred)
      .toBeCloseTo(0.12, 5);
    expect(weights.primordial).toBe(0);
  });

  it("gives bosses a small high-rarity weight boost without changing unlocks", () => {
    const normal = getNaturalDropRarityWeights(120, "torment", "normal");
    const chapterBoss = getNaturalDropRarityWeights(120, "torment", "chapter_boss");
    const highShare = (weights: typeof normal) => 1 - weights.common - weights.uncommon - weights.rare;
    expect(highShare(chapterBoss)).toBeGreaterThan(highShare(normal));
    expect(highShare(chapterBoss)).toBeLessThan(0.16);
  });

  it("prevents primordial equipment from dropping naturally", () => {
    expect(createNaturalEquipment(
      "main_weapon_ch7_p",
      73,
      "easy",
      "normal",
      new FixedRandom(0),
      { forcedRarity: "primordial" },
    ).rarity).toBe("sacred");
  });

  it("reports the actual rarity range visible in a chapter", () => {
    expect(getNaturalDropRarityBounds(1, "easy"))
      .toEqual({ min: "common", max: "rare" });
    expect(getNaturalDropRarityBounds(120, "easy"))
      .toEqual({ min: "common", max: "immortal" });
    expect(getNaturalDropRarityBounds(1, "hard"))
      .toEqual({ min: "common", max: "immortal" });
    expect(getNaturalDropRarityBounds(120, "torment"))
      .toEqual({ min: "common", max: "sacred" });
  });

  it("keeps Greater Affixes exclusive to hell and torment distributions", () => {
    expect(rollGreaterAffixCount("nightmare", new FixedRandom(0.999))).toBe(0);
    expect(rollGreaterAffixCount("hell", new FixedRandom(0.83))).toBe(0);
    expect(rollGreaterAffixCount("hell", new FixedRandom(0.9))).toBe(1);
    expect(rollGreaterAffixCount("hell", new FixedRandom(0.995))).toBe(2);
    expect(rollGreaterAffixCount("torment", new FixedRandom(0.64))).toBe(0);
    expect(rollGreaterAffixCount("torment", new FixedRandom(0.8))).toBe(1);
    expect(rollGreaterAffixCount("torment", new FixedRandom(0.95))).toBe(2);
    expect(rollGreaterAffixCount("torment", new FixedRandom(0.999))).toBe(3);
  });

  it("guarantees a 125%-maximum Greater Affix on a torment chapter-boss first clear", () => {
    const item = createNaturalEquipment(
      "main_weapon_ch10_p",
      120,
      "torment",
      "chapter_boss",
      new FixedRandom(0),
      { guaranteeGreater: true },
    );
    const greater = item.affixes.find((roll) => roll.greater);
    expect(greater).toBeDefined();
    if (item.rarity === "common") throw new Error("guaranteed Greater Affix must be epic or higher");
    const budget = getItemBudget(getEquipmentLevel(item), item.rarity, 4);
    const bounds = getAffixValueBounds(greater!.affixId, item.rarity, budget, getEquipmentLevel(item));
    expect(greater!.value).toBe(Math.round(bounds.max * GREATER_AFFIX_POWER_MULTIPLIER));
  });
});
