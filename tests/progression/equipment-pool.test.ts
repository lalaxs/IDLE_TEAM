import { describe, expect, it } from "vitest";
import {
  getFrostlandWeight,
  getRegionalEquipmentWeight,
  selectEquipmentDefinition,
} from "../../src/progression/EquipmentPool";
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
  it("uses the approved Frostland thresholds", () => {
    expect([
      getFrostlandWeight(12),
      getFrostlandWeight(13),
      getFrostlandWeight(16),
      getFrostlandWeight(17),
      getFrostlandWeight(20),
      getFrostlandWeight(21),
      getFrostlandWeight(24),
    ]).toEqual([0, 0.35, 0.35, 0.6, 0.6, 0.8, 0.8]);
  });

  it("never selects Frostland gear in chapter one", () => {
    expect(selectEquipmentDefinition(12, new FixedRandom(0)).chapter).toBe(1);
  });

  it("selects either chapter pool around each stage threshold", () => {
    // Ch2: T1 boards are retired, so both rolls stay in chapter-2 window.
    expect(selectEquipmentDefinition(13, new FixedRandom(0.34)).chapter).toBe(2);
    expect(selectEquipmentDefinition(13, new FixedRandom(0.35)).chapter).toBe(2);
    expect(selectEquipmentDefinition(17, new FixedRandom(0.59)).chapter).toBe(2);
    expect(selectEquipmentDefinition(17, new FixedRandom(0.6)).chapter).toBe(2);
    expect(selectEquipmentDefinition(21, new FixedRandom(0.79)).chapter).toBe(2);
    expect(selectEquipmentDefinition(21, new FixedRandom(0.8)).chapter).toBe(2);
  });

  it("repeats the approved regional thresholds in Red Sands", () => {
    expect([
      getRegionalEquipmentWeight(24),
      getRegionalEquipmentWeight(25),
      getRegionalEquipmentWeight(28),
      getRegionalEquipmentWeight(29),
      getRegionalEquipmentWeight(32),
      getRegionalEquipmentWeight(33),
      getRegionalEquipmentWeight(36),
    ]).toEqual([0.8, 0.35, 0.35, 0.6, 0.6, 0.8, 0.8]);
  });

  it("selects Red Sands or earlier gear around each chapter-three threshold", () => {
    expect(selectEquipmentDefinition(25, new FixedRandom(0.34)).chapter).toBe(3);
    expect(selectEquipmentDefinition(25, new FixedRandom(0.35)).chapter).not.toBe(3);
    expect(selectEquipmentDefinition(29, new FixedRandom(0.59)).chapter).toBe(3);
    expect(selectEquipmentDefinition(29, new FixedRandom(0.6)).chapter).not.toBe(3);
    expect(selectEquipmentDefinition(33, new FixedRandom(0.79)).chapter).toBe(3);
    expect(selectEquipmentDefinition(33, new FixedRandom(0.8)).chapter).not.toBe(3);
  });

  it("repeats the approved regional thresholds in Stormsea", () => {
    expect([
      getRegionalEquipmentWeight(36),
      getRegionalEquipmentWeight(37),
      getRegionalEquipmentWeight(40),
      getRegionalEquipmentWeight(41),
      getRegionalEquipmentWeight(44),
      getRegionalEquipmentWeight(45),
      getRegionalEquipmentWeight(48),
    ]).toEqual([0.8, 0.35, 0.35, 0.6, 0.6, 0.8, 0.8]);
  });

  it("selects Stormsea or earlier gear around each chapter-four threshold", () => {
    expect(selectEquipmentDefinition(37, new FixedRandom(0.34)).chapter).toBe(4);
    expect(selectEquipmentDefinition(37, new FixedRandom(0.35)).chapter).not.toBe(4);
    expect(selectEquipmentDefinition(41, new FixedRandom(0.59)).chapter).toBe(4);
    expect(selectEquipmentDefinition(41, new FixedRandom(0.6)).chapter).not.toBe(4);
    expect(selectEquipmentDefinition(45, new FixedRandom(0.79)).chapter).toBe(4);
    expect(selectEquipmentDefinition(45, new FixedRandom(0.8)).chapter).not.toBe(4);
  });
});
