import { describe, expect, it } from "vitest";
import {
  getChapterEquipmentDropPool,
  getEquipmentDropChapters,
  getStageEquipmentDropPool,
  selectEquipmentDefinition,
} from "../../src/progression/EquipmentPool";
import { ITEM_BY_ID } from "../../src/content/items";
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

describe("chapter equipment pool", () => {
  it("never selects Frostland gear in chapter one", () => {
    expect(selectEquipmentDefinition(12, new FixedRandom(0)).chapter).toBe(1);
  });

  it("keeps every chapter pool exclusive to that chapter", () => {
    for (const chapter of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const) {
      const pool = getChapterEquipmentDropPool(chapter);
      expect(pool.length).toBeGreaterThan(0);
      expect(new Set(pool.map((item) => item.chapter))).toEqual(new Set([chapter]));
      expect(pool.some((item) => item.id.startsWith("set_"))).toBe(false);
    }
  });

  it("targets equipment slots by each four-stage band", () => {
    expect(new Set(getStageEquipmentDropPool(25).map((item) => item.slot))).toEqual(new Set(["main_weapon"]));
    expect(new Set(getStageEquipmentDropPool(28).map((item) => item.slot))).toEqual(new Set(["main_weapon", "off_hand"]));
    expect(new Set(getStageEquipmentDropPool(29).map((item) => item.slot))).toEqual(new Set(["armor"]));
    expect(new Set(getStageEquipmentDropPool(32).map((item) => item.slot))).toEqual(new Set(["armor", "gloves"]));
    expect(new Set(getStageEquipmentDropPool(33).map((item) => item.slot))).toEqual(new Set(["ring"]));
    expect(new Set(getStageEquipmentDropPool(35).map((item) => item.slot))).toEqual(new Set(["amulet", "earring"]));
    expect(new Set(getStageEquipmentDropPool(36).map((item) => item.slot)).size).toBe(10);
  });

  it("maps a natural equipment name to one chapter only", () => {
    expect(getEquipmentDropChapters(ITEM_BY_ID.weapon_guard_blade!)).toEqual([1]);
    expect(getEquipmentDropChapters(ITEM_BY_ID.main_weapon_ch7_p!)).toEqual([7]);
    expect(getEquipmentDropChapters(ITEM_BY_ID.set_moss_crown_main_weapon!)).toEqual([]);
  });

  it("keeps only the current chapter at every campaign boundary", () => {
    expect(new Set(getStageEquipmentDropPool(48).map((item) => item.chapter))).toEqual(new Set([4]));
    expect(new Set(getStageEquipmentDropPool(84).map((item) => item.chapter))).toEqual(new Set([7]));
    expect(new Set(getStageEquipmentDropPool(120).map((item) => item.chapter))).toEqual(new Set([10]));
  });
});
