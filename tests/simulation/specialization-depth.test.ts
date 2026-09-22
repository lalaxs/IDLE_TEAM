import { describe, expect, it } from "vitest";
import { RELEASED_HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { applyDamage } from "../../src/simulation/CombatSystem";
import { tryCastSkill } from "../../src/simulation/SkillSystem";
import { advanceStatuses, applyStatus, getStatusMagnitude } from "../../src/simulation/StatusSystem";
import { specializationState } from "../../src/simulation/SpecializationState";
import { castSpecializationSkill, shouldCastSpecialization, specializationCastTime, specializationReactions, tickSpecializationPassives } from "../../src/simulation/SpecializationSkillSystem";
import type { BattleEvent, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const random = { next: () => 0.5, int: (min: number) => min, pick: <T>(values: readonly T[]): T => values[0]! };
const hero = (spec: SpecId, choice: number, flags: UnitState["passiveFlags"] = {}) => makeUnit({
  id: spec, sourceId: RELEASED_HERO_DEFINITIONS.find((entry) => entry.specId === spec)!.id,
  maxHp: 10000, hp: 10000, attack: 100, critChance: 0, rage: 40,
  passiveFlags: { talentSpecialization: choice, ...flags },
});
const enemy = () => makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", x: 150,
  hp: 1e6, maxHp: 1e6, defense: 0 });
const hits = (events: readonly BattleEvent[]) => events.filter((event) => event.type === "damage");
const critical = (source: UnitState, target: UnitState) => specializationReactions([
  { type: "damage", sourceId: source.id, targetId: target.id, amount: 10, critical: true },
], [source, target], random);

describe("specialization talent rotations", () => {
  it("banks two fire opportunities and consumes them together without losing the next critical", () => {
    const source = hero("mage_fire", 1); const target = enemy(); const units = [source, target];
    critical(source, target);
    expect(shouldCastSpecialization(source, units)).toBe(false);
    critical(source, target); critical(source, target);
    expect(shouldCastSpecialization(source, units)).toBe(true);
    const events = tryCastSkill(source, units, random);
    expect(hits(events)[0]?.amount).toBe(370);
    expect(source.passiveFlags.specHotStreak).toBe(false);
    expect(source.passiveFlags.specHotStreakReserve).toBe(false);
    critical(source, target);
    expect(source.passiveFlags.specHotStreak).toBe(true);
    expect(source.passiveFlags.specHotStreakReserve).toBe(false);
  });

  it.each(["mage_fire", "warlock_destruction"] as const)("%s releases before overflow or a dying target and completes an existing cast", (spec) => {
    const source = hero(spec, 1); const target = enemy(); const units = [source, target];
    expect(shouldCastSpecialization(source, units)).toBe(false);
    source.rage = 90;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    source.rage = 40; target.hp = target.maxHp * 0.3;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    target.hp = target.maxHp; source.skillCastId = "prepared";
    expect(shouldCastSpecialization(source, units)).toBe(true);
  });

  it("quick fire only refunds and shields after consuming an opportunity", () => {
    const source = hero("mage_fire", 3, { specHotStreak: true }); const target = enemy();
    expect(specializationCastTime(source, 600)).toBe(300);
    tryCastSkill(source, [source, target], random);
    expect(source.rage).toBe(6);
    expect(source.shield).toBe(800);
    expect(specializationCastTime(source, 600)).toBe(600);
    source.rage = 40;
    tryCastSkill(source, [source, target], random);
    expect(source.rage).toBe(0);
    expect(source.shield).toBe(800);
  });

  it("spends two embers for a heavy critical and one for the refund rotation", () => {
    const heavy = hero("warlock_destruction", 1, { specEmbers: 2 }); const target = enemy();
    expect(specializationCastTime(heavy, 600)).toBe(780);
    expect(hits(tryCastSkill(heavy, [heavy, target], random))[0]?.amount).toBe(630);
    expect(heavy.passiveFlags.specEmbers).toBe(0);
    const quick = hero("warlock_destruction", 3, { specEmbers: 2 }); quick.hp = 5000;
    expect(specializationCastTime(quick, 600)).toBe(420);
    tryCastSkill(quick, [quick, target], random);
    expect(quick.passiveFlags.specEmbers).toBe(1);
    expect(quick.rage).toBe(8);
    expect(quick.hp).toBe(5400);
  });

  it("preserves fury duration on recast without resetting the critical extension budget", () => {
    const source = hero("warrior_fury", 1); const target = enemy(); const units = [source, target];
    castSpecializationSkill(source, units, random);
    tickSpecializationPassives(source, units, 1000, random); advanceStatuses(source, 1000);
    castSpecializationSkill(source, units, random);
    expect(source.passiveFlags.specFuryRemainingMs).toBe(5000);
    for (let count = 0; count < 4; count++) critical(source, target);
    expect(source.passiveFlags.specFuryExtensionMs).toBe(2000);
    castSpecializationSkill(source, units, random);
    critical(source, target);
    expect(source.passiveFlags.specFuryRemainingMs).toBe(7000);
    expect(source.statuses.find((status) => status.effectId === "fury-frenzy")?.remainingMs).toBe(7000);
    tickSpecializationPassives(source, units, 2000, random); advanceStatuses(source, 2000);
    castSpecializationSkill(source, units, random);
    expect(source.passiveFlags.specFuryRemainingMs).toBe(6000);
  });

  it("spends extra fury only after the base skill cost and can finish a low-health target", () => {
    const source = hero("warrior_fury", 3); const target = enemy(); const units = [source, target];
    expect(tryCastSkill(source, units, random)).toEqual([]);
    expect(source.rage).toBe(40);
    source.rage = 60;
    const events = tryCastSkill(source, units, random);
    expect(source.rage).toBe(0);
    expect(hits(events).map((event) => event.amount)).toEqual([112, 112, 112]);
    source.rage = 40; target.hp = 1000;
    expect(hits(tryCastSkill(source, units, random)).map((event) => event.amount)).toEqual([70, 70, 70]);
  });

  it("rewards a complete deep ray and increases its later ticks", () => {
    const source = hero("demon_hunter_devourer", 1, { specSouls: 3 }); const target = enemy(); const units = [source, target];
    castSpecializationSkill(source, units, random);
    const events = tickSpecializationPassives(source, units, 3500, random);
    expect(hits(events).map((event) => event.amount)).toEqual([85, 93, 101, 109, 117, 125, 133]);
    expect(source.specialization?.channel).toBeUndefined();
    expect(source.passiveFlags.specSouls).toBe(1);
    tickSpecializationPassives(source, units, 50, random);
    expect(source.passiveFlags.specSouls).toBe(1);
  });

  it("shortens a recycling ray, preserves unused souls and refunds only on completion", () => {
    const source = hero("demon_hunter_devourer", 3, { specSouls: 3 }); const target = enemy(); const units = [source, target];
    tryCastSkill(source, units, random);
    expect(source.specialization?.channel?.ticks).toBe(3);
    expect(source.passiveFlags.specSouls).toBe(2);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0.2);
    tickSpecializationPassives(source, units, 1000, random);
    expect(source.rage).toBe(0);
    tickSpecializationPassives(source, units, 500, random);
    expect(source.rage).toBe(8);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0);
  });

  it("splits a ray near its primary victim even when the second victim is beyond the caster's direct range", () => {
    const source = hero("demon_hunter_devourer", 2); const target = enemy();
    const second = { ...enemy(), id: "second", x: 250 };
    const units = [source, target, second];
    castSpecializationSkill(source, units, random);
    expect(hits(tickSpecializationPassives(source, units, 500, random)).map((event) => event.targetId)).toEqual([target.id, second.id]);
    second.x = 300;
    expect(hits(tickSpecializationPassives(source, units, 500, random)).map((event) => event.targetId)).toEqual([target.id]);
  });

  it.each([1, 3])("does not grant completion rewards for interrupted or targetless rays, choice %i", (choice) => {
    for (const interruption of ["stun", "range"]) {
      const source = hero("demon_hunter_devourer", choice, { specSouls: 1 }); const target = enemy(); const units = [source, target];
      tryCastSkill(source, units, random);
      tickSpecializationPassives(source, units, 500, random);
      if (interruption === "stun") applyStatus(source, { kind: "stun", sourceId: target.id, magnitude: 1, remainingMs: 1000 });
      else target.x = 2000;
      tickSpecializationPassives(source, units, 500, random);
      expect(source.specialization?.channel).toBeUndefined();
      expect(source.passiveFlags.specSouls).toBe(0);
      expect(source.rage).toBe(0);
    }
  });

  it("purification guards against the next direct hit only when there is debt to clear", () => {
    const source = hero("monk_brewmaster", 3); const target = enemy(); const units = [source, target];
    castSpecializationSkill(source, units, random);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0);
    applyDamage(source, 1000);
    castSpecializationSkill(source, units, random);
    expect(specializationState(source).stagger[0]?.amount).toBe(175);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0.12);
    const guarded = applyDamage(source, 1000).hpDamage;
    advanceStatuses(source, 3000);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0);
    expect(applyDamage(source, 1000).hpDamage).toBeGreaterThan(guarded);
  });
});
