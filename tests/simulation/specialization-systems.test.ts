import { describe, expect, it } from "vitest";
import { RELEASED_HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { afterSpecializationBasicAttack, castSpecializationSkill, onPeriodicEffectEvents,
  selectSpecializationTarget, specializationBasicAttackModifiers, specializationCastTime, tickSpecializationPassives } from "../../src/simulation/SpecializationSkillSystem";
import { getStatusMagnitude } from "../../src/simulation/StatusSystem";
import type { BattleEvent, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const random = { next: () => 0.5, int: (min: number) => min, pick: <T>(values: readonly T[]): T => values[0]! };
const hero = (spec: SpecId, choice: number) => makeUnit({ id: spec,
  sourceId: RELEASED_HERO_DEFINITIONS.find((entry) => entry.specId === spec)!.id,
  attack: 100, critChance: 0, rage: 0, attackRange: 400, hp: 10000, maxHp: 10000,
  passiveFlags: { talentSpecialization: choice } });
const enemy = (id = "enemy", x = 160) => makeUnit({ id, sourceId: "E01", team: "enemies", x,
  hp: 1000000, maxHp: 1000000, defense: 0 });
const hits = (events: readonly BattleEvent[]) => events.filter((event) => event.type === "damage");
const cast = (source: UnitState, units: UnitState[]) => castSpecializationSkill(source, units, random)!.events;
function basic(source: UnitState, target: UnitState, units: UnitState[]) {
  const events: BattleEvent[] = [];
  source.basicAttackCount++;
  afterSpecializationBasicAttack(source, target, units, random, events);
  return events;
}
function voidTicks(source: UnitState, target: UnitState, count: number) {
  onPeriodicEffectEvents(Array.from({ length: count }, (): BattleEvent => ({
    type: "damage", sourceId: source.id, targetId: target.id, amount: 35, critical: false,
  })), [source, target]);
}

describe("specialization capstone systems", () => {
  it("prepares a faster frost nova by consuming shatter on the primary frozen enemy", () => {
    const source = hero("mage_frost", 1); const target = enemy(); const other = enemy("other", 180);
    const units = [source, target, other];
    basic(source, target, units); basic(source, target, units);
    cast(source, units);
    expect(source.passiveFlags.specShatterTarget).toBe(target.id);
    expect(specializationBasicAttackModifiers(source, target).damageMultiplier).toBe(1.8);
    basic(source, target, units);
    expect(source.passiveFlags.specChillStacks).toBe(1);
    expect(specializationCastTime(source, 600)).toBe(300);
    expect(specializationBasicAttackModifiers(source, target).damageMultiplier).toBe(1);
    cast(source, units);
    expect(specializationCastTime(source, 600)).toBe(600);
  });

  it("spreads frost control when shatter is consumed", () => {
    const source = hero("mage_frost", 2); const target = enemy(); const other = enemy("other", 280);
    const units = [source, target, other];
    basic(source, target, units); basic(source, target, units);
    cast(source, units);
    expect(getStatusMagnitude(other, "slow")).toBe(0);
    basic(source, target, units);
    expect(getStatusMagnitude(other, "slow")).toBe(0.25);
    expect(target.statuses.find((status) => status.effectId === "frost-nova-freeze")?.remainingMs).toBe(1200);
  });

  it("grants frost protection and rage only for a consumed shatter opportunity", () => {
    const source = hero("mage_frost", 3); const target = enemy(); const other = enemy("other", 280);
    const units = [source, target, other];
    basic(source, target, units); basic(source, target, units);
    cast(source, units);
    expect(source.shield).toBe(0);
    basic(source, other, units);
    expect(source.shield).toBe(0);
    expect(source.passiveFlags.specShatterTarget).toBe(target.id);
    basic(source, target, units);
    expect(source.shield).toBe(800);
    expect(source.rage).toBe(2);
    basic(source, target, units);
    expect(source.shield).toBe(800);
  });

  it("rebuilds judgment through one empowered basic after a verdict", () => {
    const source = hero("paladin_retribution", 1); const target = enemy(); const units = [source, target];
    const key = `specJudgment:${source.id}`;
    cast(source, units);
    expect(hits(cast(source, units))[0]?.amount).toBe(280);
    expect(target.passiveFlags[key]).toBe(0);
    expect(hits(basic(source, target, units))[0]?.amount).toBe(60);
    expect(target.passiveFlags[key]).toBe(6000);
    expect(hits(basic(source, target, units))[0]?.amount).toBe(20);
  });

  it("relays judgment and follows another marked enemy within reach", () => {
    const source = hero("paladin_retribution", 2); const first = enemy(); const second = enemy("second", 180);
    const third = enemy("third", 200); const units = [source, first, second, third];
    const key = `specJudgment:${source.id}`;
    second.passiveFlags[key] = 6000;
    expect(selectSpecializationTarget(source, units)?.id).toBe(second.id);
    expect(hits(cast(source, units)).map((event) => event.amount)).toEqual([280, 80, 80]);
    expect(second.passiveFlags[key]).toBe(0);
    expect(first.passiveFlags[key]).toBe(6000);
    expect(third.passiveFlags[key]).toBe(6000);
    expect(selectSpecializationTarget(source, units)?.id).toBe(first.id);
  });

  it("distributes redemption healing over a verdict and the next three basics", () => {
    const source = hero("paladin_retribution", 3); const target = enemy(); const ally = hero("warrior_protection", 0);
    ally.hp = 5000;
    const units = [source, ally, target]; target.passiveFlags[`specJudgment:${source.id}`] = 6000;
    cast(source, units);
    expect(ally.hp).toBe(5300);
    for (let i = 0; i < 4; i++) basic(source, target, units);
    expect(ally.hp).toBe(5600);
  });

  it("primes maelstrom through wind strikes and recycles its rage", () => {
    const source = hero("shaman_enhancement", 1); const target = enemy(); const units = [source, target];
    expect(hits(cast(source, units)).map((event) => event.amount)).toEqual([95, 95, 55]);
    expect(hits(basic(source, target, units))[0]?.amount).toBe(60);
    expect(source.rage).toBe(4);
    expect(source.passiveFlags.specMaelstromReady).toBe(false);
    cast(source, units);
    expect(hits(basic(source, target, units))[0]?.amount).toBe(60);
    expect(source.rage).toBe(8);
  });

  it("sustains enhancement flame through maelstrom without an unbounded duration", () => {
    const source = hero("shaman_enhancement", 2); const target = enemy(); const units = [source, target];
    cast(source, units); cast(source, units);
    const flame = target.periodicEffects.find((effect) => effect.id === "enhancement-flame")!;
    expect(flame.amount).toBe(35);
    basic(source, target, units);
    expect(flame.remainingTicks).toBe(5);
    source.passiveFlags.specMaelstromReady = true;
    basic(source, target, units);
    expect(flame.remainingTicks).toBe(6);
  });

  it("trades enhancement burst damage for maelstrom healing", () => {
    const source = hero("shaman_enhancement", 3); const target = enemy(); source.hp = 5000;
    source.passiveFlags.specMaelstromReady = true;
    expect(hits(basic(source, target, [source, target]))[0]?.amount).toBe(40);
    expect(source.hp).toBe(5800);
    basic(source, target, [source, target]);
    expect(source.hp).toBe(5800);
  });

  it("extends shadow form through basics with a fresh extension budget for each entry", () => {
    const source = hero("priest_shadow", 1); const target = enemy(); const units = [source, target];
    voidTicks(source, target, 4);
    expect(source.passiveFlags.specVoidFormMs).toBe(6000);
    for (let i = 0; i < 12; i++) basic(source, target, units);
    expect(source.passiveFlags.specVoidFormMs).toBe(10000);
    tickSpecializationPassives(source, units, 10000, random);
    voidTicks(source, target, 4); basic(source, target, units);
    expect(source.passiveFlags.specVoidFormMs).toBe(6400);
  });

  it("seeds additional shadow damage while trading away immediate burst", () => {
    const source = hero("priest_shadow", 2); const units = [source, enemy(), enemy("second", 200), enemy("third", 240)];
    source.passiveFlags.specVoidFormMs = 6000;
    expect(hits(cast(source, units)).map((event) => event.amount)).toEqual([180, 180, 180]);
    for (const target of units.slice(1)) expect(target.periodicEffects.find((effect) => effect.id === "shadow-whisper")?.remainingTicks).toBe(4);
  });

  it("exits shadow form for recovery and uses retained energy to enter again", () => {
    const source = hero("priest_shadow", 3); const target = enemy(); const units = [source, target];
    source.hp = 5000; source.passiveFlags.specVoidFormMs = 6000;
    expect(hits(cast(source, units))[0]?.amount).toBe(180);
    expect(source.hp).toBe(5800);
    expect(source.passiveFlags.specVoidFormMs).toBe(0);
    expect(source.passiveFlags.specVoid).toBe(2);
    voidTicks(source, target, 2);
    expect(source.passiveFlags.specVoidFormMs).toBe(6000);
  });

  it("refunds execution rage only when spending overpower on a low-health enemy", () => {
    const source = hero("warrior_arms", 1); const target = enemy(); const units = [source, target];
    target.hp *= 0.3; source.passiveFlags.specOverpower = true;
    expect(hits(cast(source, units))[0]?.amount).toBe(510);
    expect(source.rage).toBe(10);
    expect(hits(cast(source, units))[0]?.amount).toBe(280);
    expect(source.rage).toBe(10);
  });

  it("spreads empowered armor break when spending overpower", () => {
    const source = hero("warrior_arms", 2); const units = [source, enemy(), enemy("second", 180), enemy("third", 200), enemy("far", 500)];
    source.passiveFlags.specOverpower = true;
    expect(hits(cast(source, units))[0]?.amount).toBe(315);
    for (const target of units.slice(1, 4)) expect(getStatusMagnitude(target, "armorBreak")).toBe(0.3);
    expect(getStatusMagnitude(units[4]!, "armorBreak")).toBe(0);
  });

  it("rebuilds arms rage with two basics after spending overpower defensively", () => {
    const source = hero("warrior_arms", 3); const target = enemy(); const units = [source, target];
    source.passiveFlags.specOverpower = true;
    cast(source, units);
    expect(source.shield).toBe(600);
    for (let i = 0; i < 3; i++) basic(source, target, units);
    expect(source.rage).toBe(8);
    expect(source.passiveFlags.specOverpower).toBe(true);
  });

  it("recycles beast rage through successful frenzy shots only", () => {
    const source = hero("hunter_beast_mastery", 3); const target = enemy(); const units = [source, target];
    cast(source, units);
    expect(getStatusMagnitude(source, "damageReduction")).toBe(0.08);
    tickSpecializationPassives(source, units, 1600, random);
    expect(source.rage).toBe(2);
    source.passiveFlags.specBeastFrenzyMs = 0;
    tickSpecializationPassives(source, units, 1600, random);
    expect(source.rage).toBe(2);
  });
});
