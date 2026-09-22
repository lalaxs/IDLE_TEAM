import { describe, expect, it } from "vitest";
import { HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { SPECIALIZATION_TALENTS } from "../../src/content/specializationTalents";
import { applyDamage, damageEvents, resolveDamage } from "../../src/simulation/CombatSystem";
import { ensureBeacon, healCombatTarget } from "../../src/simulation/HealingSystem";
import { tickPeriodicEffects } from "../../src/simulation/PeriodicEffectSystem";
import { advanceMovement } from "../../src/simulation/MovementSystem";
import { tryCastSkill } from "../../src/simulation/SkillSystem";
import { afterSpecializationBasicAttack, onAnyHeroSkillCast, shouldCastSpecialization,
  specializationCastTime, specializationReactions, tickSpecializationPassives,
  onPeriodicEffectEvents, specializationBasicAttackModifiers } from "../../src/simulation/SpecializationSkillSystem";
import { recentDamage, specializationState } from "../../src/simulation/SpecializationState";
import { applyStatus } from "../../src/simulation/StatusSystem";
import { specializationLabel, channelProgress } from "../../src/ui/SpecializationPresentation";
import { BattleSimulation } from "../../src/simulation/BattleSimulation";
import type { RandomSource } from "../../src/simulation/RandomSource";
import type { BattleEvent, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const random: RandomSource = { next: () => 0.5, int: (min) => min, pick: (values) => values[0]! };
function hero(spec: SpecId, patch: Partial<UnitState> = {}) {
  const definition = HERO_DEFINITIONS.find((entry) => entry.specId === spec)!;
  return makeUnit({ id: spec, sourceId: definition.id, hp: 1000, maxHp: 1000, critChance: 0,
    attackRange: 400, ...patch });
}
const enemy = (patch: Partial<UnitState> = {}) => makeUnit({ id: "enemy", sourceId: "E01", team: "enemies",
  x: 160, hp: 10000, maxHp: 10000, defense: 0, critChance: 0, ...patch });
const hits = (events: readonly BattleEvent[]) => events.filter((event) => event.type === "damage");
function cast(source: UnitState, units: UnitState[], rng = random) {
  source.rage = 100;
  return tryCastSkill(source, units, rng);
}
function basic(source: UnitState, target: UnitState, units: UnitState[]) {
  source.basicAttackCount += 1;
  const events: BattleEvent[] = [];
  afterSpecializationBasicAttack(source, target, units, random, events, false);
  return events;
}

describe("specialization combat loops", () => {
  it("keeps a fixed beacon and copies healing only once without reapplying bonuses", () => {
    const source = hero("paladin_holy", { passiveFlags: { gearHealPowerPct: 1 } });
    const tank = hero("warrior_protection", { hp: 500 });
    const ally = hero("mage_arcane", { hp: 200 });
    const units = [source, tank, ally];
    expect(ensureBeacon(source, units)?.id).toBe(tank.id);
    const events: BattleEvent[] = [];
    healCombatTarget(source, ally, 200, units, events);
    expect(ally.hp).toBe(400);
    expect(tank.hp).toBe(570);
    expect(events).toHaveLength(2);
    tank.hp = 990;
    expect(ensureBeacon(source, units)?.id).toBe(tank.id);
    tank.alive = false;
    expect(ensureBeacon(source, units)?.id).not.toBe(tank.id);
  });

  it("spreads druid HoTs and transfers their overheal to another wounded ally", () => {
    const source = hero("druid_restoration");
    const allies = ["mage_arcane", "mage_fire", "mage_frost", "warrior_arms"].map((id) => hero(id as SpecId));
    const foe = enemy();
    const units = [source, ...allies, foe];
    cast(source, units);
    expect(units.filter((unit) => unit.periodicEffects.length > 0)).toHaveLength(2);
    cast(source, units);
    expect(units.filter((unit) => unit.periodicEffects.length > 0)).toHaveLength(4);
    const covered = units.find((unit) => unit.periodicEffects.length > 0)!;
    const wounded = allies.find((unit) => unit.id !== covered.id)!;
    wounded.hp = 500;
    tickPeriodicEffects(covered, 1000, random, units);
    expect(wounded.hp).toBe(513);
  });

  it("uses actual recent HP damage for preservation and consumes the record", () => {
    const source = hero("evoker_preservation");
    const ally = hero("mage_arcane", { shield: 100 });
    const units = [source, ally, enemy()];
    applyDamage(ally, 100);
    expect(recentDamage(ally)).toBe(0);
    applyDamage(ally, 400);
    expect(recentDamage(ally)).toBe(400);
    cast(source, units);
    expect(ally.hp).toBe(950); // 150 base + 200 rewind
    expect(recentDamage(ally)).toBe(0);
    applyDamage(ally, 100);
    tickSpecializationPassives(ally, units, 4000, random);
    expect(recentDamage(ally)).toBe(0);
  });

  it("saves emergency healing rage at full health while mistweaver prepares an attack-healing window", () => {
    for (const spec of ["paladin_holy", "priest_holy", "evoker_preservation", "shaman_restoration"] as const) {
      const source = hero(spec);
      expect(cast(source, [source, enemy()])).toHaveLength(0);
      expect(source.rage).toBe(100);
    }
    const source = hero("monk_mistweaver");
    const ally = hero("mage_fire", { hp: 500 });
    const foe = enemy();
    const units = [source, ally, foe];
    cast(source, units);
    const healed = ally.hp;
    basic(source, foe, units);
    expect(ally.hp).toBe(healed + 70);
    tickSpecializationPassives(source, units, 5000, random);
    expect(basic(source, foe, units)).toHaveLength(0);
  });

  it("pays each stagger debt in four ticks and shields do not create debt", () => {
    const source = hero("monk_brewmaster", { shield: 100 });
    const units = [source, enemy()];
    applyDamage(source, 100);
    expect(specializationState(source).stagger).toHaveLength(0);
    applyDamage(source, 100);
    expect(source.hp).toBe(935);
    expect(specializationState(source).stagger[0]?.amount).toBe(35);
    const paid: number[] = [];
    for (let index = 0; index < 4; index += 1) paid.push(hits(tickSpecializationPassives(source, units, 1000, random))[0]!.amount);
    expect(paid).toEqual([9, 9, 9, 8]);
    expect(source.hp).toBe(900);
    expect(source.passiveFlags.specStaggerPool).toBe(0);
  });

  it("purifies only outstanding stagger without healing already paid damage", () => {
    const source = hero("monk_brewmaster");
    const units = [source, enemy()];
    applyDamage(source, 500);
    tickSpecializationPassives(source, units, 1000, random);
    expect(source.hp).toBe(631);
    cast(source, units);
    expect(source.hp).toBe(631);
    expect(source.passiveFlags.specStaggerPool).toBeCloseTo(78.6);
    tickSpecializationPassives(source, units, 3000, random);
    expect(source.hp).toBe(552);
    expect(source.passiveFlags.specStaggerPool).toBe(0);
  });

  it("channels over time, retargets a dead victim, and interrupts on stun", () => {
    const source = hero("demon_hunter_devourer");
    const first = enemy({ hp: 1 });
    const second = enemy({ id: "second", x: 180 });
    const units = [source, first, second];
    expect(hits(cast(source, units))).toHaveLength(0);
    expect(channelProgress(source)).toBe(1);
    expect(shouldCastSpecialization(source, units)).toBe(false);
    const x = source.x;
    advanceMovement(units, 500);
    expect(source.x).toBe(x);
    expect(hits(tickSpecializationPassives(source, units, 499, random))).toHaveLength(0);
    expect(hits(tickSpecializationPassives(source, units, 1, random))[0]?.targetId).toBe(first.id);
    expect(hits(tickSpecializationPassives(source, units, 500, random))[0]?.targetId).toBe(second.id);
    applyStatus(source, { kind: "stun", magnitude: 1, remainingMs: 1000, sourceId: second.id });
    expect(hits(tickSpecializationPassives(source, units, 500, random))).toHaveLength(0);
    expect(source.specialization?.channel).toBeUndefined();
    expect(channelProgress(source)).toBeNull();
  });

  it("summons independent demons without refreshing old lifetimes or dealing instant spawn damage", () => {
    const source = hero("warlock_demonology");
    const units = [source, enemy()];
    expect(hits(cast(source, units))).toHaveLength(0);
    expect(hits(tickSpecializationPassives(source, units, 2000, random))).toHaveLength(2);
    expect(hits(cast(source, units))).toHaveLength(2); // existing demons volley
    expect(source.specialization?.demons.map((demon) => demon.remainingMs)).toEqual([4000, 4000, 6000, 6000]);
    expect(hits(tickSpecializationPassives(source, units, 4000, random))).toHaveLength(8);
    expect(source.specialization?.demons).toHaveLength(2);
    expect(hits(tickSpecializationPassives(source, units, 2000, random))).toHaveLength(2);
    expect(source.specialization?.demons).toHaveLength(0);
  });

  it("fires predator shots between basics and accelerates them during bestial wrath", () => {
    const source = hero("hunter_beast_mastery");
    const units = [source, enemy()];
    expect(hits(tickSpecializationPassives(source, units, 1600, random))).toHaveLength(1);
    expect(source.basicAttackCount).toBe(0);
    cast(source, units);
    tickSpecializationPassives(source, units, 1600, random);
    expect(hits(tickSpecializationPassives(source, units, 900, random))).toHaveLength(1);
    expect(specializationLabel(source)).toBe("兽王之怒");
  });

  it("holds predator shots while stunned, preparing a skill, or out of range without banking extra shots", () => {
    const source = hero("hunter_beast_mastery");
    const foe = enemy();
    const units = [source, foe];
    applyStatus(source, { kind: "stun", magnitude: 1, remainingMs: 3000, sourceId: foe.id });
    expect(hits(tickSpecializationPassives(source, units, 3000, random))).toHaveLength(0);
    source.statuses = [];
    source.skillCastId = "preparing-wrath";
    expect(hits(tickSpecializationPassives(source, units, 2000, random))).toHaveLength(0);
    source.skillCastId = null;
    foe.x = 1000;
    expect(hits(tickSpecializationPassives(source, units, 2000, random))).toHaveLength(0);
    foe.x = 160;
    const shot = hits(tickSpecializationPassives(source, units, 50, random));
    expect(shot).toHaveLength(1);
    expect(shot[0]?.sourceId).toBe(source.id);
    expect(hits(tickSpecializationPassives(source, units, 50, random))).toHaveLength(0);
    expect(specializationLabel(source)).toBe("掠食本能");
  });

  it("maintains feral bleed but consumes assassination poison stacks", () => {
    const feral = hero("druid_feral");
    const foe = enemy();
    cast(feral, [feral, foe]);
    tickPeriodicEffects(foe, 1000, random, [feral, foe]);
    expect(foe.periodicEffects[0]?.remainingTicks).toBe(5);
    basic(feral, foe, [feral, foe]);
    expect(foe.periodicEffects[0]?.remainingTicks).toBe(6);
    const rogue = hero("rogue_assassination");
    const units = [rogue, foe];
    for (let index = 0; index < 3; index += 1) basic(rogue, foe, units);
    expect(foe.passiveFlags[`specPoison:${rogue.id}`]).toBe(3);
    expect(hits(cast(rogue, units))[0]?.amount).toBe(195);
    expect(foe.passiveFlags[`specPoison:${rogue.id}`]).toBe(0);
  });

  it("limits dragon breath to the forward range and rewards hitting a pack with a faster next cast", () => {
    const source = hero("evoker_devastation", { attackRange: 60 });
    const units = [source, enemy(), enemy({ id: "near", x: 190 }), enemy({ id: "behind", x: 50 }), enemy({ id: "far", x: 1000 })];
    expect(hits(cast(source, units)).map((hit) => hit.targetId)).toEqual(["enemy", "near"]);
    expect(specializationCastTime(source, 900)).toBe(540);
    units[2]!.alive = false;
    cast(source, units);
    expect(specializationCastTime(source, 900)).toBe(900);
  });

  it("advances windwalker over two subsequent basics instead of resolving the combo immediately", () => {
    const source = hero("monk_windwalker");
    const foe = enemy();
    const units = [source, foe];
    expect(hits(cast(source, units))).toHaveLength(1);
    expect(specializationLabel(source)).toBe("连招 1/3");
    expect(hits(basic(source, foe, units))[0]?.amount).toBe(60);
    expect(hits(basic(source, foe, units))[0]?.amount).toBe(110);
    expect(source.passiveFlags.specComboStep).toBe(0);
  });

  it("extends augmentation only while active and includes it in DoT snapshots", () => {
    const support = hero("evoker_augmentation");
    const source = hero("warlock_affliction");
    const foe = enemy();
    const units = [support, source, foe];
    cast(support, units);
    cast(source, units);
    expect(foe.periodicEffects[0]?.amount).toBeCloseTo(72.8);
    expect(source.passiveFlags.specAugmentRemainingMs).toBe(5800);
    tickSpecializationPassives(source, units, 6000, random);
    onAnyHeroSkillCast(source, units);
    expect(source.passiveFlags.specAttackBuffPct).toBe(0);
    expect(source.passiveFlags.specAugmentRemainingMs).toBe(0);
  });

  it("keeps equipment critical damage when arms forces a crit and applies aim crit chance to skills", () => {
    const arms = hero("warrior_arms", { passiveFlags: { specOverpower: true, gearCritDamagePct: 50 } });
    expect(hits(cast(arms, [arms, enemy()]))[0]?.amount).toBe(420);
    const marksman = hero("hunter_marksmanship", { passiveFlags: { specAimStacks: 4, specAimTarget: "enemy" } });
    const rng = { ...random, next: () => 0.1 };
    expect(hits(cast(marksman, [marksman, enemy()], rng))[0]?.critical).toBe(true);
  });

  it("retains on-cast rage refunds even when casting from full rage", () => {
    const source = hero("shaman_elemental");
    cast(source, [source, enemy()], { ...random, next: () => 0.1 });
    expect(source.rage).toBe(68);
  });

  it("spends rage for a dodged active rather than granting a free cast", () => {
    const source = hero("death_knight_blood", { hp: 500 });
    const events = cast(source, [source, enemy({ passiveFlags: { gearDodgeChance: 0.5 } })], { ...random, next: () => 0 });
    expect(events.some((event) => event.type === "skill:resolved")).toBe(true);
    expect(source.rage).toBe(60);
  });

  it("earns havoc rage from any credited killing hit and unholy spreads on an infected death", () => {
    const source = hero("demon_hunter_havoc", { rage: 0 });
    const unholy = hero("death_knight_unholy");
    const victim = enemy({ hp: 1, passiveFlags: { [`specDisease:${unholy.id}`]: 2000 } });
    const next = enemy({ id: "next", x: 200 });
    const result = resolveDamage({ sourceId: source.id, target: victim, baseDamage: 100, element: "physical", profile: "periodic",
      context: { sourceKind: "periodic", delivery: "indirect" } }, random);
    specializationReactions(damageEvents(result, true), [source, unholy, victim, next], random);
    expect(source.rage).toBe(12);
    expect(next.periodicEffects[0]?.id).toBe("unholy-disease");
  });

  it("builds shadow form through periodic ticks and does not refill it while active", () => {
    const source = hero("priest_shadow");
    const foe = enemy();
    const units = [source, foe];
    cast(source, units);
    onPeriodicEffectEvents(tickPeriodicEffects(foe, 4000, random, units), units);
    expect(source.passiveFlags.specVoidFormMs).toBe(6000);
    cast(source, units);
    onPeriodicEffectEvents(tickPeriodicEffects(foe, 4000, random, units), units);
    expect(source.passiveFlags.specVoid).toBe(0);
    expect(specializationBasicAttackModifiers(source, foe).damageMultiplier).toBe(1.25);
  });

  it("reserves discipline conversion for subsequent damage and scales healing once", () => {
    const source = hero("priest_discipline", { passiveFlags: { gearHealPowerPct: 1 } });
    const ally = hero("mage_arcane", { hp: 100 });
    const foe = enemy();
    const units = [source, ally, foe];
    const events = cast(source, units);
    expect(ally.hp).toBe(304);
    expect(specializationReactions(events, units, random)).toHaveLength(0);
    specializationReactions([{ type: "damage", sourceId: source.id, targetId: foe.id, amount: 100, hpDamage: 100, critical: false, element: "physical" }], units, random);
    expect(ally.hp).toBe(344);
  });

  it("clears a channel at wave completion and returns detached snapshots", () => {
    const definition = HERO_DEFINITIONS.find((entry) => entry.specId === "demon_hunter_devourer")!;
    const simulation = new BattleSimulation({ stage: 1, party: [definition.id], heroStats: {}, seed: 7 });
    const internal = simulation as unknown as { units: UnitState[] };
    const source = internal.units.find((unit) => unit.team === "heroes")!;
    specializationState(source).channel = { targetId: "gone", ticks: 3, totalTicks: 4, untilTickMs: 500, multiplier: 0.55 };
    const snapshot = simulation.getSnapshot();
    snapshot.units.find((unit) => unit.team === "heroes")!.specialization!.channel!.ticks = 99;
    expect(source.specialization?.channel?.ticks).toBe(3);
    for (const unit of internal.units.filter((unit) => unit.team === "enemies")) unit.alive = false;
    simulation.step(50);
    expect(source.specialization?.channel).toBeUndefined();
  });

  it("defines three distinct final talents for every specialization", () => {
    expect(Object.keys(SPECIALIZATION_TALENTS)).toHaveLength(40);
    for (const choices of Object.values(SPECIALIZATION_TALENTS)) {
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map(([name]) => name)).size).toBe(3);
    }
  });

  it.each(["druid_guardian", "monk_brewmaster"] as const)("%s sweeps enemies near the contact target", (spec) => {
    const source = hero(spec);
    const first = enemy({ x: 400 });
    const second = enemy({ id: "nearby", x: 450 });
    const units = [source, first, second];
    expect(hits(cast(source, units)).map((hit) => hit.targetId)).toEqual([first.id, second.id]);
    if (spec === "druid_guardian") {
      first.targetId = second.targetId = null;
      first.statuses = second.statuses = [];
      tickSpecializationPassives(source, units, 50, random);
      expect(source.statuses).toContainEqual(expect.objectContaining({ effectId: "guardian-ironfur", remainingMs: 4000, magnitude: 0.04 }));
    }
  });

  it("applies shatter to either frozen victim and consumes the opportunity on the next basic", () => {
    const source = hero("mage_frost");
    const first = enemy();
    const second = enemy({ id: "second", x: 180 });
    const units = [source, first, second];
    cast(source, units);
    cast(source, units);
    expect(specializationBasicAttackModifiers(source, first).damageMultiplier).toBe(1.5);
    expect(specializationBasicAttackModifiers(source, second).damageMultiplier).toBe(1.5);
    basic(source, first, units);
    expect(specializationBasicAttackModifiers(source, second).damageMultiplier).toBe(1);
  });

  it.each(["rogue_assassination", "druid_feral"] as const)("%s keeps its primary selection within reach", (spec) => {
    const source = hero(spec);
    const first = enemy();
    const distant = enemy({ id: "distant", x: 2000, hp: 100000, maxHp: 100000 });
    expect(hits(cast(source, [source, first, distant]))[0]?.targetId).toBe(first.id);
  });
});
