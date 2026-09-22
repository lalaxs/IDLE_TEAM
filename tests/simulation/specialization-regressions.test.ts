import { describe, expect, it } from "vitest";
import { RELEASED_HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { BattleSimulation, type HeroBattleBonus } from "../../src/simulation/BattleSimulation";
import { tickPeriodicEffects } from "../../src/simulation/PeriodicEffectSystem";
import { dealSkillDamage } from "../../src/simulation/SkillCombat";
import { castSpecializationSkill, afterSpecializationBasicAttack, tickSpecializationPassives, specializationBasicAttackModifiers, shouldCastSpecialization, specializationReactions, onAnyHeroSkillCast, specializationCastTime } from "../../src/simulation/SpecializationSkillSystem";
import { tryCastSkill } from "../../src/simulation/SkillSystem";
import { resolveDamage, applyDamage, applyHealing } from "../../src/simulation/CombatSystem";
import { getHeroCombatDisplayStats } from "../../src/progression/EquipmentBonuses";
import { advanceStatuses } from "../../src/simulation/StatusSystem";
import { specializationState } from "../../src/simulation/SpecializationState";
import type { BattleEvent, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";
import { getHeroStats } from "../../src/progression/HeroProgression";

const random = { next: () => 0.5, int: (min: number) => min, pick: <T>(values: readonly T[]): T => values[0]! };
const hero = (spec: SpecId, patch: Partial<UnitState> = {}) => makeUnit({ id: spec,
  sourceId: RELEASED_HERO_DEFINITIONS.find((entry) => entry.specId === spec)!.id,
  hp: 1000, maxHp: 1000, critChance: 0, ...patch });
const enemy = (patch: Partial<UnitState> = {}) => makeUnit({ id: "enemy", team: "enemies", sourceId: "E01",
  x: 160, hp: 100000, maxHp: 100000, defense: 0, critChance: 0, ...patch });
const damage = (events: readonly BattleEvent[]) => events.filter((event) => event.type === "damage");

function arena(spec: SpecId, bonus: HeroBattleBonus = {}) {
  const id = RELEASED_HERO_DEFINITIONS.find((entry) => entry.specId === spec)!.id;
  const simulation = new BattleSimulation({ stage: 1, party: [id], heroStats: { [id]: getHeroStats(id, 20) }, heroBonuses: { [id]: bonus }, seed: 23 });
  const internal = simulation as unknown as { units: UnitState[]; state: string };
  const source = internal.units.find((unit) => unit.team === "heroes")!;
  source.x = 100;
  const target = enemy({ x: 100 + source.attackRange - 1, attack: 0, attackCooldownMs: 1e9, attackIntervalMs: 1e9,
    moveSpeed: 0, passiveFlags: { entryDone: true } });
  internal.units = [source, target]; internal.state = "engaging"; simulation.drainEvents();
  return { simulation, source, target, units: internal.units };
}

describe("specialization regression scenarios", () => {
  it("lets actual healing purify stagger without counting overhealing", () => {
    const source = hero("monk_brewmaster");
    applyDamage(source, 500);
    expect(source.passiveFlags.specStaggerPool).toBe(175);
    applyHealing(source, 100, false);
    expect(source.passiveFlags.specStaggerPool).toBe(145);
    applyHealing(source, 1000, false);
    expect(source.hp).toBe(1000);
    expect(source.passiveFlags.specStaggerPool).toBeCloseTo(77.5);
  });

  it("makes full-charge arcane alternate between charging and a missile window", () => {
    const source = hero("mage_arcane", { passiveFlags: { specArcaneCharges: 4 } });
    const target = enemy(); const units = [source, target];
    tryCastSkill(source, units, random);
    expect(source.passiveFlags.specArcaneCharges).toBe(0);
    expect(shouldCastSpecialization(source, units)).toBe(false);
    const events: BattleEvent[] = [];
    afterSpecializationBasicAttack(source, target, units, random, events);
    expect(damage(events)).toHaveLength(1);
    expect(source.passiveFlags.specArcaneCharges).toBe(0);
    tickSpecializationPassives(source, units, 4000, random);
    afterSpecializationBasicAttack(source, target, units, random, []);
    expect(source.passiveFlags.specArcaneCharges).toBe(1);
  });

  it("lets arcane preserve charges for splitting and trade burst for refunded rage", () => {
    const source = hero("mage_arcane", { rage: 40, passiveFlags: { talentSpecialization: 2, specArcaneCharges: 4 } });
    const targets = [enemy(), enemy({ id: "other", x: 180 })];
    expect(damage(tryCastSkill(source, [source, ...targets], random))).toHaveLength(2);
    expect(source.passiveFlags.specArcaneCharges).toBe(2);
    expect(source.passiveFlags.specArcaneSurgeMs).toBeUndefined();
    source.rage = 40; source.passiveFlags.talentSpecialization = 3;
    tryCastSkill(source, [source, ...targets], random);
    expect(source.rage).toBe(12);
    expect(source.passiveFlags.specArcaneCharges).toBe(0);
  });

  it("changes arcane's automatic cast cadence with the conservation talent", () => {
    const casts = [0, 3].map((talentSpecialization) => {
      const { simulation, source } = arena("mage_arcane", { talentSpecialization });
      for (let time = 0; time < 30000; time += 50) { simulation.step(50); simulation.drainEvents(); }
      return source.skillCastCount;
    });
    expect(casts[0]).toBeGreaterThan(2);
    expect(casts[1]).toBeGreaterThan(casts[0]!);
  });

  it("completes windwalker's chain before recasting and enables a quick follow-up", () => {
    const source = hero("monk_windwalker", { passiveFlags: { talentSpecialization: 1 } });
    const target = enemy(); const units = [source, target];
    tryCastSkill(source, units, random);
    expect(shouldCastSpecialization(source, units)).toBe(false);
    afterSpecializationBasicAttack(source, target, units, random, []);
    expect(target.statuses.some((status) => status.kind === "vulnerability")).toBe(true);
    afterSpecializationBasicAttack(source, target, units, random, []);
    expect(shouldCastSpecialization(source, units)).toBe(true);
    expect(target.statuses.some((status) => status.effectId === "windwalker-pressure")).toBe(false);
    expect(specializationCastTime(source, 380)).toBe(190);
  });

  it("uses the windwalker finisher to switch targets or protect a wounded ally", () => {
    const source = hero("monk_windwalker", { passiveFlags: { talentSpecialization: 2 } });
    const first = enemy(); const other = enemy({ id: "other", x: 210 });
    const ally = hero("mage_fire", { hp: 100, rage: 0 }); const units = [source, ally, first, other];
    castSpecializationSkill(source, units, random);
    afterSpecializationBasicAttack(source, first, units, random, []);
    const finish: BattleEvent[] = [];
    afterSpecializationBasicAttack(source, first, units, random, finish);
    expect(damage(finish)[0]?.targetId).toBe(other.id);
    source.passiveFlags.talentSpecialization = 3;
    castSpecializationSkill(source, units, random);
    afterSpecializationBasicAttack(source, first, units, random, []);
    afterSpecializationBasicAttack(source, first, units, random, []);
    expect(ally.shield).toBe(80);
    expect(ally.rage).toBe(6);
  });

  it("allows a timed trap to damage a stationary boss after its fuse", () => {
    const source = hero("hunter_survival", { passiveFlags: { talentSpecialization: 1 } });
    const target = enemy(); const units = [source, target];
    castSpecializationSkill(source, units, random);
    expect(damage(tickSpecializationPassives(source, units, 1000, random))).toHaveLength(0);
    expect(damage(tickSpecializationPassives(source, units, 500, random))).toHaveLength(1);
    expect(source.passiveFlags.specTrapReady).toBe(true);
  });

  it("carries some aim after the marked enemy dies and spends aim to cover a tank", () => {
    const source = hero("hunter_marksmanship", { passiveFlags: { talentSpecialization: 2, specAimTarget: "enemy", specAimStacks: 4 } });
    const target = enemy({ alive: false, hp: 0 }); const next = enemy({ id: "next" });
    const tank = hero("warrior_protection", { rage: 0 }); const units = [source, tank, target, next];
    specializationReactions([{ type: "unit:died", unitId: target.id }], units, random);
    afterSpecializationBasicAttack(source, next, units, random, []);
    expect(source.passiveFlags.specAimStacks).toBe(3);
    afterSpecializationBasicAttack(source, next, units, random, []);
    source.passiveFlags.talentSpecialization = 3;
    castSpecializationSkill(source, units, random);
    expect(source.passiveFlags.specAimStacks).toBe(2);
    expect(tank.rage).toBe(8);
    expect(next.statuses.some((status) => status.effectId === "marksman-suppression")).toBe(true);
  });

  it("returns subtlety to the party after a backline strike", () => {
    const source = hero("rogue_subtlety", { x: 100, passiveFlags: { talentSpecialization: 2 } });
    const tank = hero("warrior_protection", { x: 200 });
    const rear = enemy({ x: 1000 }); const units = [source, tank, rear];
    castSpecializationSkill(source, units, random);
    expect(source.x).toBeGreaterThan(500);
    tickSpecializationPassives(source, units, 2000, random);
    expect(source.x).toBe(160);
    expect(source.passiveFlags.specShadowStrike).toBe(true);
  });

  it("relays augmentation once and lets the supported caster shield an injured teammate", () => {
    const support = hero("evoker_augmentation", { passiveFlags: { talentSpecialization: 2 } });
    const primary = hero("mage_fire", { attack: 200 });
    const secondary = hero("mage_arcane", { attack: 180 });
    const wounded = hero("warrior_protection", { hp: 200 }); const units = [support, primary, secondary, wounded, enemy()];
    castSpecializationSkill(support, units, random);
    onAnyHeroSkillCast(primary, units);
    expect(secondary.passiveFlags.specAttackBuffPct).toBe(0.06);
    onAnyHeroSkillCast(secondary, units);
    expect(wounded.passiveFlags.specAttackBuffPct).toBeUndefined();
    support.passiveFlags.talentSpecialization = 3;
    onAnyHeroSkillCast(primary, units);
    onAnyHeroSkillCast(primary, units);
    expect(wounded.shield).toBe(60);
  });

  it("prioritizes a critical HoT target and avoids renewing a healthy single-tank HoT early", () => {
    const source = hero("druid_restoration"); const tank = hero("warrior_protection");
    const other = hero("mage_fire"); const units = [source, tank, other, enemy()];
    castSpecializationSkill(source, units, random);
    tank.hp = 200;
    expect(castSpecializationSkill(source, units, random)?.targetIds[0]).toBe(tank.id);
    source.passiveFlags.talentSpecialization = 1;
    tank.hp = tank.maxHp;
    castSpecializationSkill(source, units, random);
    expect(shouldCastSpecialization(source, units)).toBe(false);
  });

  it("runs frost's own chill-freeze-shatter loop without another slow source", () => {
    const { simulation, source, target } = arena("mage_frost");
    let freezes = 0, shatters = 0;
    for (let time = 0; time < 30000; time += 50) {
      const ready = specializationBasicAttackModifiers(source, target).damageMultiplier > 1;
      simulation.step(50);
      for (const event of simulation.drainEvents()) {
        if (event.type === "status:applied" && event.kind === "stun") freezes++;
        if (event.type === "attack" && event.sourceId === source.id && ready) shatters++;
      }
    }
    expect(freezes).toBeGreaterThanOrEqual(4);
    expect(shatters).toBeGreaterThanOrEqual(4);
  });

  it("keeps shatter usable after the brief stun ends and consumes it only once", () => {
    const source = hero("mage_frost"); const target = enemy(); const units = [source, target];
    afterSpecializationBasicAttack(source, target, units, random, []);
    afterSpecializationBasicAttack(source, target, units, random, []);
    castSpecializationSkill(source, units, random);
    advanceStatuses(target, 1000);
    tickSpecializationPassives(source, units, 1000, random);
    tickSpecializationPassives(target, units, 1000, random);
    expect(specializationBasicAttackModifiers(source, target).damageMultiplier).toBe(1.5);
    afterSpecializationBasicAttack(source, target, units, random, []);
    expect(specializationBasicAttackModifiers(source, target).damageMultiplier).toBe(1);
  });

  it("gives protection baseline block in combat and in the displayed stat", () => {
    const source = hero("warrior_protection", { rage: 0 });
    const hit = resolveDamage({ sourceId: "enemy", target: source, baseDamage: 100, element: "physical", profile: "standard",
      context: { sourceKind: "basic", delivery: "contact" }, critChance: 0 }, { ...random, next: () => 0.05 });
    expect(hit.blocked).toBe(true);
    expect(source.passiveFlags.specRevenge).toBe(true);
    expect(getHeroCombatDisplayStats("H35", 20, {}).blockChancePct).toBe(8);
    expect(getHeroCombatDisplayStats("H35", 20, { blockChance: 0.07 }).blockChancePct).toBeCloseTo(15);
  });

  it("holds an interception trap until an enemy enters its armed area", () => {
    const source = hero("hunter_survival"); const target = enemy();
    const approaching = enemy({ id: "approaching", x: 600 }); const units = [source, target, approaching];
    castSpecializationSkill(source, units, random);
    expect(damage(tickSpecializationPassives(source, units, 100, random))).toHaveLength(0);
    expect(damage(tickSpecializationPassives(source, units, 700, random))).toHaveLength(0);
    approaching.x = source.specialization!.trap!.x;
    expect(damage(tickSpecializationPassives(source, units, 50, random))).toHaveLength(1);
    expect(source.passiveFlags.specTrapReady).toBe(true);
    expect(source.specialization?.trap).toBeUndefined();
  });

  it.each([0, 25])("ticks poison during sustained attacks with %s percent bonus attack speed", (attackSpeedPct) => {
    const { simulation, source } = arena("rogue_assassination", { attackSpeedPct });
    let poisonHits = 0;
    for (let time = 0; time < 15000; time += 50) {
      simulation.step(50);
      poisonHits += damage(simulation.drainEvents()).filter((event) => event.attribution?.id === "rogue_assassination-passive").length;
    }
    expect(source.skillCastCount).toBeGreaterThan(2);
    expect(poisonHits).toBeGreaterThan(5);
  });

  it("preserves the next poison tick on refresh and consumes poison on envenom", () => {
    const source = hero("rogue_assassination");
    const target = enemy(); const units = [source, target];
    afterSpecializationBasicAttack(source, target, units, random, []);
    tickPeriodicEffects(target, 870, random, units);
    afterSpecializationBasicAttack(source, target, units, random, []);
    expect(damage(tickPeriodicEffects(target, 130, random, units))).toHaveLength(1);
    castSpecializationSkill(source, units, random);
    expect(target.periodicEffects).toHaveLength(0);
    expect(target.passiveFlags[`specPoison:${source.id}`]).toBe(0);
  });

  it("heals the wounded ally when a previously injured tank has already been healed", () => {
    const source = hero("evoker_preservation");
    const tank = hero("warrior_protection");
    const wounded = hero("mage_arcane", { hp: 200 });
    specializationState(tank).recentDamage.push({ amount: 600, remainingMs: 3500 });
    const cast = castSpecializationSkill(source, [source, tank, wounded, enemy()], random)!;
    expect(cast.targetIds).toEqual([wounded.id]);
    expect(wounded.hp).toBeGreaterThan(200);
    expect(tank.hp).toBe(1000);
  });

  it("evaluates boss and execute bonuses per tick without rescaling the source snapshot", () => {
    const source = hero("warlock_affliction", { passiveFlags: { gearSkillDamage: 0.25, gearExecute: 0.5, gearEliteDamage: 0.3 } });
    const target = enemy({ sourceId: "B04" }); const units = [source, target];
    castSpecializationSkill(source, units, random);
    const baseTick = target.periodicEffects[0]!.amount;
    expect(damage(tickPeriodicEffects(target, 1000, random, units))[0]!.amount).toBe(Math.round(baseTick * 1.3));
    target.hp = target.maxHp * 0.3;
    const direct: BattleEvent[] = [];
    dealSkillDamage(source, target, 0.65, random, direct);
    expect(damage(tickPeriodicEffects(target, 1000, random, units))[0]!.amount).toBe(damage(direct)[0]!.amount);
    source.attack *= 2;
    source.passiveFlags.gearSkillDamage = 0.75;
    expect(damage(tickPeriodicEffects(target, 1000, random, units))[0]!.amount).toBe(damage(direct)[0]!.amount);
  });

  it("steals life from periodic HP damage but not shield absorption or overkill", () => {
    const source = hero("warlock_affliction", { hp: 500, passiveFlags: { gearLifeStealPct: 0.5 } });
    const target = enemy({ shield: 100 }); const units = [source, target];
    castSpecializationSkill(source, units, random);
    tickPeriodicEffects(target, 1000, random, units);
    expect(source.hp).toBe(500);
    target.shield = 0; target.hp = 10;
    tickPeriodicEffects(target, 1000, random, units);
    expect(source.hp).toBe(505);
  });
});
