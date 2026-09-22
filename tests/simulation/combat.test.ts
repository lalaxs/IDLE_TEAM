import { describe, expect, it } from "vitest";
import {
  applyDamage,
  applyHealing,
  calculateDamage,
  damageEvents,
  gearDamageMultiplier,
  incomingElementResist,
  outgoingElementMultiplier,
  resolveDamage,
  resolveHit,
  schoolDamageMultiplier,
  elementDamageMultiplier,
  type DamageResult,
} from "../../src/simulation/CombatSystem";
import { ELEMENTAL_ATTACK_AMP, ELEMENT_RESIST_CAP } from "../../src/content/damageElements";
import type { RandomSource } from "../../src/simulation/RandomSource";
import { resolveThorns } from "../../src/simulation/ThornsSystem";
import { makeUnit } from "../support/makeUnit";

const fixedRandom: RandomSource = {
  next: () => 0.5,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

const hitResult = (overrides: Partial<DamageResult> = {}): DamageResult => ({
  outcome: "hit",
  sourceId: "attacker",
  targetId: "defender",
  context: { sourceKind: "basic", delivery: "contact" },
  element: "physical",
  rawDamage: 200,
  rolledDamage: 200,
  mitigatedDamage: 200,
  absorbed: 50,
  hpDamage: 150,
  appliedDamage: 200,
  critical: false,
  blocked: false,
  killed: false,
  ...overrides,
});

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

  it("reports damage from the amount actually applied", () => {
    const target = makeUnit({
      hp: 100,
      maxHp: 100,
      shield: 30,
      passiveFlags: { gearDamageReduction: 0.5 },
    });
    const result = resolveDamage({
      sourceId: "attacker",
      target,
      context: { sourceKind: "skill", delivery: "indirect" },
      element: "physical",
      baseDamage: 100,
      profile: "proc",
    }, fixedRandom);

    expect(result).toMatchObject({ mitigatedDamage: 50, absorbed: 30, hpDamage: 20, appliedDamage: 50 });
    expect(damageEvents(result)).toEqual([{
      type: "damage",
      sourceId: "attacker",
      targetId: target.id,
      amount: 50,
      critical: false,
      element: "physical",
      hpDamage: 20,
      absorbed: 30,
    }]);
  });

  it("gains hero rage from hp damage", () => {
    const target = makeUnit({ hp: 100, maxHp: 100, rage: 0, maxRage: 100 });
    applyDamage(target, 20);
    expect(target.rage).toBe(10);
  });

  it("reflects a percentage of contact damage actually received", () => {
    const attacker = makeUnit({
      hp: 100,
      maxHp: 100,
      shield: 4,
      passiveFlags: { gearDamageReduction: 0.5, gearDodgeChance: 1 },
    });
    const defender = makeUnit({ passiveFlags: { gearThorns: 0.1 } });
    const result = resolveThorns(
      attacker,
      defender,
      hitResult(),
      { sourceKind: "basic", delivery: "contact" },
      fixedRandom,
    );

    expect(result).toMatchObject({ rawDamage: 20, appliedDamage: 10, hpDamage: 6, absorbed: 4, killed: false });
    expect(attacker.hp).toBe(94);
  });

  it("does not trigger thorns for projectile, indirect, or dodged hits", () => {
    const attacker = makeUnit();
    const defender = makeUnit({ passiveFlags: { gearThorns: 0.12 } });
    const hit = hitResult({ hpDamage: 80, absorbed: 20, appliedDamage: 100 });

    expect(resolveThorns(attacker, defender, hit, {
      sourceKind: "basic",
      delivery: "projectile",
    }, fixedRandom)).toBeNull();
    expect(resolveThorns(attacker, defender, hit, {
      sourceKind: "periodic",
      delivery: "indirect",
    }, fixedRandom)).toBeNull();
    expect(resolveThorns(attacker, defender, hitResult({
      outcome: "dodged",
      hpDamage: 0,
      absorbed: 0,
      appliedDamage: 0,
    }), {
      sourceKind: "basic",
      delivery: "contact",
    }, fixedRandom)).toBeNull();
    expect(attacker.hp).toBe(100);
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

  it("applies elemental damage only for the matching hit element", () => {
    const flags = {
      gearFireDamage: 0.18,
      gearFrostDamage: 0.12,
      gearLightningDamage: 0.1,
      gearDarkDamage: 0.15,
    };
    expect(elementDamageMultiplier(makeUnit({ damageElement: "fire", passiveFlags: flags }))).toBeCloseTo(1.18);
    expect(elementDamageMultiplier(makeUnit({ damageElement: "frost", passiveFlags: flags }))).toBeCloseTo(1.12);
    expect(elementDamageMultiplier(makeUnit({ damageElement: "lightning", passiveFlags: flags }))).toBeCloseTo(1.1);
    expect(elementDamageMultiplier(makeUnit({ damageElement: "dark", passiveFlags: flags }))).toBeCloseTo(1.15);
    expect(elementDamageMultiplier(makeUnit({ damageElement: "physical", passiveFlags: flags }))).toBe(1);
    expect(elementDamageMultiplier(makeUnit({ damageElement: "holy", passiveFlags: flags }))).toBe(1);
  });

  it("adds general, school, and element damage inside one equipment bucket", () => {
    const source = makeUnit({
      damageElement: "fire",
      passiveFlags: {
        gearDamagePct: 0.1,
        gearMagicDamage: 0.2,
        gearDamageSchoolMagic: 1,
        gearFireDamage: 0.18,
      },
    });
    expect(gearDamageMultiplier(source)).toBeCloseTo(1.48);
  });

  it("converts hero defense into a small all-element resist", () => {
    const hero = makeUnit({ team: "heroes", defense: 400 });
    const monster = makeUnit({ team: "enemies", defense: 400 });
    expect(incomingElementResist(hero, "fire")).toBeCloseTo(400 / 4400);
    expect(incomingElementResist(hero, "physical")).toBeCloseTo(400 / 4400);
    expect(incomingElementResist(monster, "fire")).toBe(0);
  });

  it("reduces matching elemental hits and caps combined resist", () => {
    const target = makeUnit({
      team: "heroes",
      hp: 200,
      maxHp: 200,
      defense: 0,
      passiveFlags: { gearFireResist: 0.2, gearAllResist: 0.1 },
    });
    const neverAvoid: RandomSource = { ...fixedRandom, next: () => 0.99 };
    const fireHit = resolveHit(target, 100, neverAvoid, "fire");
    expect(fireHit.outcome).toBe("hit");
    if (fireHit.outcome === "hit") {
      expect(fireHit.amount).toBe(70);
      expect(target.hp).toBe(130);
    }

    const stacked = makeUnit({
      team: "heroes",
      hp: 200,
      maxHp: 200,
      defense: 0,
      passiveFlags: { gearFireResist: 0.5, gearAllResist: 0.4 },
    });
    expect(incomingElementResist(stacked, "fire")).toBe(ELEMENT_RESIST_CAP);
    const capped = resolveHit(stacked, 100, neverAvoid, "fire");
    if (capped.outcome === "hit") {
      expect(capped.amount).toBe(25);
    }

    const physical = makeUnit({
      team: "heroes",
      hp: 100,
      maxHp: 100,
      defense: 0,
      passiveFlags: { gearFireResist: 0.5 },
    });
    const physHit = resolveHit(physical, 40, neverAvoid, "physical");
    if (physHit.outcome === "hit") {
      expect(physHit.amount).toBe(40);
    }

    const holyTarget = makeUnit({
      team: "heroes",
      hp: 100,
      maxHp: 100,
      defense: 0,
      passiveFlags: { gearHolyResist: 0.25 },
    });
    const holyHit = resolveHit(holyTarget, 80, neverAvoid, "holy");
    if (holyHit.outcome === "hit") {
      expect(holyHit.amount).toBe(60);
    }
  });

  it("amps non-physical monster attacks", () => {
    expect(outgoingElementMultiplier(makeUnit({ team: "enemies", damageElement: "fire" }))).toBe(
      1 + ELEMENTAL_ATTACK_AMP,
    );
    expect(outgoingElementMultiplier(makeUnit({ team: "enemies", damageElement: "physical" }))).toBe(1);
    expect(outgoingElementMultiplier(makeUnit({ team: "heroes", damageElement: "fire" }))).toBe(1);
  });
});
