import { describe, expect, it } from "vitest";
import {
  applyDamage,
  applyHealing,
  calculateDamage,
  resolveHit,
  schoolDamageMultiplier,
} from "../../src/simulation/CombatSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";
import { makeUnit } from "../support/makeUnit";

const fixedRandom: RandomSource = {
  next: () => 0.5,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

describe("combat formulas", () => {
  it("applies soft armor, deterministic variance, and critical multiplier", () => {
    // variance at next()=0.5 → 1.0; damage = atk²/(atk+def×1.25)
    expect(calculateDamage(100, 20, 0, fixedRandom).damage).toBe(80);
    expect(calculateDamage(100, 20, 1, fixedRandom).damage).toBe(120);
  });

  it("reduces effective defense before calculating armor-broken damage", () => {
    expect(calculateDamage(100, 100, 0, fixedRandom).damage).toBe(44);
    expect(calculateDamage(100, 100, 0, fixedRandom, 0.12).damage).toBe(48);
  });

  it("consumes shield before hp", () => {
    const target = makeUnit({ hp: 100, maxHp: 100, shield: 30 });
    const result = applyDamage(target, 50);
    expect(result.absorbed).toBe(30);
    expect(target.hp).toBe(80);
    expect(target.shield).toBe(0);
  });

  it("applies Mirage Guard reduction independently from normal reduction", () => {
    const target = makeUnit({
      hp: 100,
      maxHp: 100,
      statuses: [{
        kind: "mirageGuard",
        magnitude: 0.2,
        remainingMs: 3000,
        sourceId: "gear",
      }],
    });
    expect(applyDamage(target, 100).hpDamage).toBe(80);
  });

  it("uses Cloudveil once to survive lethal normal damage and gain a shield", () => {
    const target = makeUnit({
      hp: 40,
      maxHp: 100,
      passiveFlags: { gearCloudveil: 0.12, gearCloudveilUsed: false },
    });
    const first = applyDamage(target, 80);
    expect(first).toEqual({ hpDamage: 39, absorbed: 0, died: false });
    expect(target.hp).toBe(1);
    expect(target.shield).toBe(12);
    expect(target.passiveFlags.gearCloudveilUsed).toBe(true);

    applyDamage(target, 20);
    expect(target.alive).toBe(false);
  });

  it("caps normal healing and converts allowed overflow to shield", () => {
    const target = makeUnit({ hp: 90, maxHp: 100 });
    expect(applyHealing(target, 30, false)).toEqual({ healed: 10, shielded: 0 });
    target.hp = 90;
    expect(applyHealing(target, 30, true)).toEqual({ healed: 10, shielded: 10 });
  });

  it("dodges when roll is below dodge chance", () => {
    const target = makeUnit({
      hp: 100,
      maxHp: 100,
      passiveFlags: { gearDodgeChance: 0.6 },
    });
    const alwaysDodge: RandomSource = { ...fixedRandom, next: () => 0.1 };
    expect(resolveHit(target, 50, alwaysDodge).outcome).toBe("dodged");
    expect(target.hp).toBe(100);
  });

  it("halves damage on block when not dodged", () => {
    const target = makeUnit({
      hp: 100,
      maxHp: 100,
      passiveFlags: { gearBlockChance: 0.35 },
    });
    const blockRandom: RandomSource = {
      ...fixedRandom,
      next: () => 0.1,
    };
    const hit = resolveHit(target, 40, blockRandom);
    expect(hit.outcome).toBe("hit");
    if (hit.outcome === "hit") {
      expect(hit.blocked).toBe(true);
      expect(hit.amount).toBe(20);
      expect(target.hp).toBe(80);
    }
  });

  it("applies school damage only for matching hero school", () => {
    const physical = makeUnit({
      passiveFlags: {
        gearPhysicalDamage: 0.2,
        gearMagicDamage: 0.5,
        gearDamageSchoolMagic: 0,
      },
    });
    const magic = makeUnit({
      passiveFlags: {
        gearPhysicalDamage: 0.2,
        gearMagicDamage: 0.5,
        gearDamageSchoolMagic: 1,
      },
    });
    expect(schoolDamageMultiplier(physical)).toBeCloseTo(1.2);
    expect(schoolDamageMultiplier(magic)).toBeCloseTo(1.5);
  });
});
