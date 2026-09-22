import { describe, expect, it } from "vitest";
import {
  SUMMON_THEME_DURATION_MS,
  getActiveSummonTheme,
  getGlobalSummonTheme,
  rollSummonRewardKind,
} from "../../src/progression/SummonSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";

class FixedRandom implements RandomSource {
  constructor(private readonly value: number) {}
  next(): number { return this.value; }
  int(min: number, max: number): number { return Math.floor(this.value * (max - min + 1)) + min; }
  pick<T>(values: readonly T[]): T { return values[this.int(0, values.length - 1)]!; }
}

describe("SummonSystem", () => {
  it("uses the approved mixed-pool probability bands", () => {
    expect(rollSummonRewardKind(new FixedRandom(0.1))).toBe("hero");
    expect(rollSummonRewardKind(new FixedRandom(0.5))).toBe("universalMarks");
    expect(rollSummonRewardKind(new FixedRandom(0.7))).toBe("ascendStone");
    expect(rollSummonRewardKind(new FixedRandom(0.8))).toBe("exp");
    expect(rollSummonRewardKind(new FixedRandom(0.95))).toBe("gold");
  });

  it("rotates the global class every three days and lets an active personal theme override it", () => {
    const first = getGlobalSummonTheme(Date.UTC(2026, 0, 1));
    const second = getGlobalSummonTheme(Date.UTC(2026, 0, 1) + SUMMON_THEME_DURATION_MS);
    expect(second.classId).not.toBe(first.classId);
    expect(getActiveSummonTheme({ classId: "hunter", expiresAt: 20_000 }, 10_000)).toMatchObject({
      classId: "hunter",
      source: "personal",
    });
    expect(getActiveSummonTheme({ classId: "hunter", expiresAt: 9_000 }, 10_000).source).toBe("global");
  });
});
