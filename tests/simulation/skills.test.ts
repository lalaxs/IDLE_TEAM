import { describe, expect, it } from "vitest";
import { HERO_BY_ID, HERO_DEFINITIONS } from "../../src/content/heroes";
import { HERO_SKILLS } from "../../src/content/heroSkills";
import { ACTIVE_SKILL_BY_HERO } from "../../src/content/skills";
import { applyDamage } from "../../src/simulation/CombatSystem";
import { tryCastReadySkill, tryCastSkill } from "../../src/simulation/SkillSystem";
import {
  advanceSkillPreparation,
  gainRageFromBasicAttack,
  gainRageFromDamage,
  getEffectiveSkillCastTime,
} from "../../src/simulation/RageSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";
import {
  afterSharedHeroPassiveBasicAttack,
  tickSharedHeroPassive,
  triggerSharedHeroPassivesAfterSkillCast,
} from "../../src/simulation/SharedHeroPassiveSystem";
import { dealSkillDamage } from "../../src/simulation/SkillCombat";
import { afterTalentBasicAttack } from "../../src/simulation/TalentCombatSystem";
import { applyStatus, getStatusMagnitude } from "../../src/simulation/StatusSystem";
import type { HeroId, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const fixedRandom: RandomSource = {
  next: () => 0.5,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

const heroIds: HeroId[] = [
  ...new Map(HERO_DEFINITIONS.map((hero) => [hero.specId, hero.id] as const)).values(),
];
const tankHeroIds: HeroId[] = [
  ...new Map(
    HERO_DEFINITIONS
      .filter(({ expeditionRole }) => expeditionRole === "tank")
      .map((hero) => [hero.specId, hero.id] as const),
  ).values(),
];

describe("hero skills", () => {
  it("defines all shared hero choices as passive effects", () => {
    expect(HERO_SKILLS).toHaveLength(8);
    expect(HERO_SKILLS.every(({ passive }) => Boolean(passive.trigger))).toBe(true);
  });

  it.each(heroIds)("%s resolves its specialization active skill by spending rage", (heroId) => {
    const definition = HERO_BY_ID[heroId];
    const hero = makeUnit({
      id: heroId,
      sourceId: heroId,
      name: definition.name,
      attack: definition.attack,
    });
    const allies: UnitState[] = [
      hero,
      makeUnit({ id: "ally", hp: 40, maxHp: 100, x: 120 }),
    ];
    const enemies = [
      makeUnit({ id: "enemy-a", team: "enemies", x: 170, hp: 300, maxHp: 300 }),
      makeUnit({ id: "enemy-b", team: "enemies", x: 210, hp: 240, maxHp: 300 }),
      makeUnit({ id: "enemy-c", team: "enemies", x: 250, hp: 200, maxHp: 300 }),
    ];
    if (definition.specId === "mage_arcane") hero.passiveFlags.specArcaneCharges = 4;
    const events = tryCastSkill(hero, [...allies, ...enemies], fixedRandom);
    expect(events.some(({ type }) => type === "skill:resolved")).toBe(true);
    expect(hero.rage).toBe(60);
  });

  it.each(tankHeroIds)("%s applies a three-second taunt with its active skill", (heroId) => {
    const definition = HERO_BY_ID[heroId];
    const hero = makeUnit({
      id: `tank-${heroId}`,
      sourceId: heroId,
      name: definition.name,
      attack: definition.attack,
      rage: 100,
    });
    const enemy = makeUnit({
      id: "taunt-target",
      sourceId: "E01",
      team: "enemies",
      x: 170,
      hp: 10_000,
      maxHp: 10_000,
    });

    tryCastSkill(hero, [hero, enemy], fixedRandom);

    expect(enemy.statuses).toContainEqual(expect.objectContaining({
      kind: "taunt",
      sourceId: hero.id,
      remainingMs: 3000,
    }));
  });

  it("does not pull a charging hero backward when its target is behind", () => {
    const hero = makeUnit({
      id: "survival-hunter",
      sourceId: "H23",
      x: 200,
    });
    const enemy = makeUnit({
      id: "enemy-behind",
      team: "enemies",
      x: 170,
      hp: 10_000,
      maxHp: 10_000,
    });

    tryCastSkill(hero, [hero, enemy], fixedRandom);

    expect(hero.x).toBe(200);
  });

  it("does not gate hero skills behind a time cooldown", () => {
    const hero = makeUnit({
      id: "rage-hero",
      sourceId: "H01",
      attack: 50,
      rage: 40,
    });
    const enemy = makeUnit({
      id: "cdr-enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    expect(tryCastSkill(hero, [hero, enemy], fixedRandom).some(({ type }) => type === "skill:resolved")).toBe(true);
    expect(hero.rage).toBe(0);
  });

  it("grants Stormward only on the first active skill cast of a wave", () => {
    const hero = makeUnit({
      id: "stormward-hero",
      sourceId: "H01",
      maxHp: 200,
      hp: 200,
      passiveFlags: { gearStormward: 0.1, gearStormwardUsed: false },
    });
    const enemy = makeUnit({
      id: "stormward-enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.shield).toBe(36);
    expect(hero.passiveFlags.gearStormwardUsed).toBe(true);

    hero.rage = hero.maxRage;
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.shield).toBe(52);
  });

  it("requires and consumes rage for specialization active skills", () => {
    const hero = makeUnit({ sourceId: "H01", rage: 39 });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", x: 170 });

    expect(tryCastSkill(hero, [hero, enemy], fixedRandom)).toEqual([]);
    expect(hero.rage).toBe(39);

    hero.rage = 40;
    expect(tryCastSkill(hero, [hero, enemy], fixedRandom).some(({ type }) => type === "skill:resolved")).toBe(true);
    expect(hero.rage).toBe(0);
  });

  it("correlates direct skill damage with its cast for projectile timing", () => {
    const definition = HERO_BY_ID.H03;
    const hero = makeUnit({
      id: "fire-mage",
      sourceId: "H03",
      name: definition.name,
      attack: definition.attack,
      attackMode: "ranged",
      attackRange: definition.attackRange,
      rage: 100,
    });
    const enemy = makeUnit({
      id: "target",
      team: "enemies",
      x: 170,
      hp: 10_000,
      maxHp: 10_000,
    });
    const events = tryCastSkill(hero, [hero, enemy], fixedRandom);
    const resolved = events.find((event) => event.type === "skill:resolved");
    const damage = events.find((event) => event.type === "damage");
    expect(resolved?.type).toBe("skill:resolved");
    expect(damage?.type === "damage" ? damage.skillCastId : undefined)
      .toBe(resolved?.type === "skill:resolved" ? resolved.castId : undefined);
    expect(damage?.type === "damage" ? damage.hpDamage : undefined).toBeGreaterThan(0);
  });

  it("gains rage from basic attacks and hp damage without exceeding the maximum", () => {
    const hero = makeUnit({ rage: 0, maxRage: 100, hp: 1000, maxHp: 1000 });

    gainRageFromBasicAttack(hero);
    expect(hero.rage).toBe(10);

    gainRageFromDamage(hero, 200);
    expect(hero.rage).toBe(20);

    gainRageFromDamage(hero, 5000);
    expect(hero.rage).toBe(100);
  });

  it("applies rage gain bonuses to attacks and damage taken", () => {
    const hero = makeUnit({ rage: 0, maxRage: 100, hp: 1000, maxHp: 1000, passiveFlags: { gearRageGainPct: 0.2 } });
    gainRageFromBasicAttack(hero);
    gainRageFromDamage(hero, 200);
    expect(hero.rage).toBe(24);
  });

  it("holds a rage-ready skill for its preparation window before casting", () => {
    const hero = makeUnit({ sourceId: "H01", rage: 40, skillPrepareMs: null });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", x: 170 });
    const castTimeMs = ACTIVE_SKILL_BY_HERO.H01.castTimeMs;

    const started = advanceSkillPreparation(hero, 50, true, castTimeMs);
    expect(started).toEqual({ type: "started", castId: "unit:skill:1" });
    expect(hero.skillPrepareMs).toBe(520);
    expect(tryCastReadySkill(hero, [hero, enemy], fixedRandom)).toEqual([]);

    advanceSkillPreparation(hero, castTimeMs - 50);
    expect(hero.skillPrepareMs).toBe(50);
    advanceSkillPreparation(hero, 50);
    const events = tryCastReadySkill(hero, [hero, enemy], fixedRandom);
    expect(events).toContainEqual(expect.objectContaining({
      type: "skill:resolved",
      castId: "unit:skill:1",
    }));
    expect(events.some(({ type }) => type === "skill:started")).toBe(false);
    expect(hero.rage).toBe(0);
    expect(hero.skillPrepareMs).toBeNull();
    expect(hero.skillCastId).toBeNull();
  });

  it("shortens preparation with cast speed while respecting its cap and floor", () => {
    const hero = makeUnit({ rage: 40, castSpeedPct: 20 });

    advanceSkillPreparation(hero, 50, true, 600);

    expect(hero.skillPrepareMs).toBe(500);
    expect(hero.skillCastDurationMs).toBe(500);
    expect(getEffectiveSkillCastTime(600, 500)).toBe(400);
    expect(getEffectiveSkillCastTime(280, 500)).toBe(240);
  });

  it("interrupts a prepared skill without spending rage", () => {
    const hero = makeUnit({
      rage: 40,
      skillPrepareMs: 180,
      skillCastId: "unit:skill:1",
      skillCastSequence: 1,
    });

    expect(advanceSkillPreparation(hero, 50, false, 520)).toEqual({
      type: "cancelled",
      castId: "unit:skill:1",
    });
    expect(hero.rage).toBe(40);
    expect(hero.skillPrepareMs).toBeNull();
  });

  it("finishes a locked cast after its target drifts out of attack range", () => {
    const hero = makeUnit({
      sourceId: "H01",
      rage: 40,
      skillPrepareMs: 0,
      skillCastId: "unit:skill:1",
      skillCastSequence: 1,
    });
    const distantEnemy = makeUnit({
      id: "distant-enemy",
      sourceId: "E01",
      team: "enemies",
      x: 500,
    });

    expect(tryCastReadySkill(hero, [hero, distantEnemy], fixedRandom)).toContainEqual(
      expect.objectContaining({
        type: "skill:resolved",
        castId: "unit:skill:1",
      }),
    );
    expect(hero.rage).toBe(0);
  });

  it("cancels a prepared skill when no valid target remains", () => {
    const hero = makeUnit({
      sourceId: "H01",
      rage: 40,
      skillPrepareMs: 0,
      skillCastId: "unit:skill:1",
      skillCastSequence: 1,
    });

    expect(tryCastReadySkill(hero, [hero], fixedRandom)).toEqual([{
      type: "skill:cancelled",
      castId: "unit:skill:1",
      sourceId: hero.id,
      skillId: "warrior_protection-active",
    }]);
    expect(hero.rage).toBe(40);
    expect(hero.skillPrepareMs).toBeNull();
    expect(hero.skillCastId).toBeNull();
  });

  it("scales Nora heals with holy heal power", () => {
    const nora = makeUnit({
      id: "nora",
      sourceId: "H04",
      attack: 100,
      damageElement: "holy",
      passiveFlags: { gearHealPowerPct: 0.18 },
    });
    const ally = makeUnit({ id: "ally", hp: 10, maxHp: 10_000, x: 120 });
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 170 });
    const events = tryCastSkill(nora, [nora, ally, enemy], fixedRandom);
    const resolved = events.find((event) => event.type === "skill:resolved");
    const heal = events.find((event) => event.type === "heal" && event.targetId === "ally");
    expect(heal).toMatchObject({
      type: "heal",
      amount: 1322,
      skillCastId: resolved?.type === "skill:resolved" ? resolved.castId : undefined,
    });
    expect(ally.hp).toBe(1332);
  });

  it("applies star skill effect to every component of a mixed damage-and-buff skill", () => {
    const hero = makeUnit({
      id: "augmenter",
      sourceId: "H30",
      attack: 100,
      critChance: 0,
      passiveFlags: { heroSkillEffect: 0.3 },
    });
    const ally = makeUnit({ id: "ally", attack: 200, x: 120 });
    const enemy = makeUnit({
      id: "enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      defense: 0,
      x: 170,
    });

    tryCastSkill(hero, [hero, ally, enemy], fixedRandom);

    expect(enemy.hp).toBe(9831);
    expect(ally.passiveFlags.specAttackBuffPct).toBeCloseTo(0.156);
  });

  it("applies star skill effect to healing, shields, and positive status magnitudes", () => {
    const healer = makeUnit({
      id: "mistweaver",
      sourceId: "H26",
      attack: 100,
      passiveFlags: { heroSkillEffect: 0.3 },
    });
    const wounded = makeUnit({ id: "wounded", hp: 100, maxHp: 10_000, x: 120 });
    const firstEnemy = makeUnit({ id: "enemy-a", team: "enemies", x: 170 });
    tryCastSkill(healer, [healer, wounded, firstEnemy], fixedRandom);
    expect(wounded.hp).toBe(1530);

    const guardian = makeUnit({
      id: "guardian",
      sourceId: "H49",
      hp: 1000,
      maxHp: 1000,
      passiveFlags: { heroSkillEffect: 0.3 },
    });
    const secondEnemy = makeUnit({ id: "enemy-b", team: "enemies", hp: 10_000, maxHp: 10_000, x: 170 });
    tryCastSkill(guardian, [guardian, secondEnemy], fixedRandom);
    expect(guardian.shield).toBe(104);
    expect(getStatusMagnitude(guardian, "damageReduction")).toBeCloseTo(0.026);
  });

  it("keeps casting the specialization active skill when a shared passive is selected", () => {
    const hero = makeUnit({
      id: "lorne",
      sourceId: "H01",
      attack: 100,
      maxHp: 1000,
      hp: 1000,
      skillCastCount: 2,
      skillPrepareMs: 0,
      chosenSkillId: "iron-wall",
      rage: 40,
    });
    const enemy = makeUnit({
      id: "enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    const events = tryCastReadySkill(hero, [hero, enemy], fixedRandom);
    expect(events.some((event) => event.type === "skill:resolved" && event.skillId === "warrior_protection-active")).toBe(true);
    expect(events.some((event) => event.type === "skill:resolved" && event.skillId === "iron-wall")).toBe(false);
    expect(hero.skillCastCount).toBe(3);
    expect(hero.rage).toBe(0);
  });

  it("applies 铁壁意志 as permanent damage reduction", () => {
    const hero = makeUnit({ hp: 1000, maxHp: 1000, chosenSkillId: "iron-wall" });
    expect(applyDamage(hero, 100).hpDamage).toBe(92);
  });

  it("triggers 破阵余震 on every third basic attack", () => {
    const hero = makeUnit({
      id: "breaker",
      sourceId: "H01",
      chosenSkillId: "quake-slash",
    });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies" });
    const events: Parameters<typeof afterSharedHeroPassiveBasicAttack>[2] = [];

    afterSharedHeroPassiveBasicAttack(hero, enemy, events);
    afterSharedHeroPassiveBasicAttack(hero, enemy, events);
    afterSharedHeroPassiveBasicAttack(hero, enemy, events);

    expect(getStatusMagnitude(enemy, "armorBreak")).toBe(0.12);
    expect(events).toContainEqual({ type: "status:applied", targetId: enemy.id, kind: "armorBreak" });
  });

  it("lets 陨星轨迹 increase damage only against high-health enemies", () => {
    const hero = makeUnit({ id: "meteor", chosenSkillId: "meteor", attack: 100, critChance: 0 });
    const highHpEnemy = makeUnit({ id: "high", sourceId: "E01", team: "enemies", hp: 1000, maxHp: 1000, defense: 0 });
    const lowHpEnemy = makeUnit({ id: "low", sourceId: "E01", team: "enemies", hp: 700, maxHp: 1000, defense: 0 });

    const highHpResult = dealSkillDamage(hero, highHpEnemy, 1, fixedRandom, []);
    const lowHpResult = dealSkillDamage(hero, lowHpEnemy, 1, fixedRandom, []);

    expect(highHpResult.amount).toBe(115);
    expect(lowHpResult.amount).toBe(100);
  });

  it("lets 圣域恩典 heal and cleanse after a specialization skill cast", () => {
    const hero = makeUnit({
      id: "healer",
      sourceId: "H01",
      chosenSkillId: "sanctuary",
    });
    const ally = makeUnit({ id: "ally", hp: 100, maxHp: 1000, x: 120 });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", x: 170 });
    applyStatus(ally, { kind: "slow", magnitude: 0.4, remainingMs: 3000, sourceId: enemy.id });
    applyStatus(ally, { kind: "armorBreak", magnitude: 0.2, remainingMs: 3000, sourceId: enemy.id });

    const events = triggerSharedHeroPassivesAfterSkillCast(hero, [hero, ally, enemy]);

    expect(ally.hp).toBe(140);
    expect(getStatusMagnitude(ally, "slow")).toBe(0);
    expect(getStatusMagnitude(ally, "armorBreak")).toBe(0);
    expect(events).toContainEqual({
      type: "heal",
      sourceId: hero.id,
      targetId: ally.id,
      amount: 40,
      attribution: { kind: "passive", id: "sanctuary" },
    });
  });

  it("applies 猎杀印记 after a critical hit", () => {
    const hero = makeUnit({ id: "hunter", chosenSkillId: "volley", attack: 100, critChance: 1 });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", hp: 1000, maxHp: 1000, defense: 0 });
    const events: Parameters<typeof dealSkillDamage>[4] = [];

    dealSkillDamage(hero, enemy, 1, fixedRandom, events);

    expect(getStatusMagnitude(enemy, "vulnerability")).toBe(0.08);
    expect(events).toContainEqual({ type: "status:applied", targetId: enemy.id, kind: "vulnerability" });
  });

  it("raises direct skill damage against low-health enemies with 影袭本能", () => {
    const hero = makeUnit({ id: "executor", chosenSkillId: "execute-flurry", attack: 100, critChance: 0 });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", hp: 300, maxHp: 1000, defense: 0 });
    const events: Parameters<typeof dealSkillDamage>[4] = [];

    const result = dealSkillDamage(hero, enemy, 1, fixedRandom, events);

    expect(result.amount).toBe(120);
  });

  it("applies specialization talent transformations in combat", () => {
    const hero = makeUnit({
      id: "talent-hero",
      sourceId: "H01",
      rage: 100,
      basicAttackCount: 3,
      passiveFlags: {
        talentBasicProc: "armorBreak",
        talentBasicProcInterval: 3,
        talentBasicProcValue: 0.1,
        talentBasicProcDurationMs: 4000,
        talentActiveProc: "rageRefund",
        talentActiveProcValue: 12,
      },
    });
    const enemy = makeUnit({ id: "talent-enemy", sourceId: "E01", team: "enemies", x: 170 });
    const events: Parameters<typeof afterTalentBasicAttack>[3] = [];

    afterTalentBasicAttack(hero, enemy, [hero, enemy], events);
    expect(getStatusMagnitude(enemy, "armorBreak")).toBe(0.1);

    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.rage).toBe(72);
  });

  it("amplifies specialization active damage without changing shared passives", () => {
    const hero = makeUnit({ id: "active-talent", attack: 100, critChance: 0, passiveFlags: { talentActiveDamagePct: 0.25 } });
    const enemy = makeUnit({ id: "active-target", sourceId: "E01", team: "enemies", hp: 1000, maxHp: 1000, defense: 0 });

    expect(dealSkillDamage(hero, enemy, 1, fixedRandom, []).amount).toBe(125);
  });

  it("lets 霜寒追击 freeze an already slowed target on every fourth basic attack", () => {
    const hero = makeUnit({ id: "frost", chosenSkillId: "blizzard" });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies" });
    const events: Parameters<typeof afterSharedHeroPassiveBasicAttack>[2] = [];
    applyStatus(enemy, { kind: "slow", magnitude: 0.1, remainingMs: 1000, sourceId: "ally" });

    for (let hit = 0; hit < 4; hit += 1) {
      afterSharedHeroPassiveBasicAttack(hero, enemy, events);
    }

    expect(getStatusMagnitude(enemy, "slow")).toBe(0.3);
    expect(getStatusMagnitude(enemy, "stun")).toBe(1);
  });

  it("limits 雷霆共鸣 to one rage trigger per second", () => {
    const caster = makeUnit({ id: "caster", rage: 0 });
    const listener = makeUnit({ id: "listener", chosenSkillId: "storm-chain", rage: 0 });

    triggerSharedHeroPassivesAfterSkillCast(caster, [caster, listener]);
    triggerSharedHeroPassivesAfterSkillCast(caster, [caster, listener]);
    expect(listener.rage).toBe(3);

    tickSharedHeroPassive(listener, 1000);
    triggerSharedHeroPassivesAfterSkillCast(caster, [caster, listener]);
    expect(listener.rage).toBe(6);
  });
});
