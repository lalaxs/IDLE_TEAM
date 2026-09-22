import { describe, expect, it } from "vitest";
import { HERO_BY_ID } from "../../src/content/heroes";
import {
  advanceMovement,
  combatBodyRadius,
  engageRange,
  heroFormationOffset,
  laneOffsetY,
  minimumOpponentGap,
  RANGED_ATTACK_RANGE_BONUS,
} from "../../src/simulation/MovementSystem";
import { advanceStatuses, applyStatus, getStatusMagnitude } from "../../src/simulation/StatusSystem";
import { resolveMeleeFrontTarget, selectTarget } from "../../src/simulation/TargetingSystem";
import { makeUnit } from "../support/makeUnit";

describe("targeting and movement", () => {
  it("selects a replacement after the current target dies", () => {
    const hero = makeUnit({ id: "hero", team: "heroes", x: 100 });
    const dead = makeUnit({ id: "dead", team: "enemies", x: 200, alive: false, hp: 0 });
    const live = makeUnit({ id: "live", team: "enemies", x: 300 });
    expect(selectTarget(hero, [hero, dead, live], "nearestEnemy")?.id).toBe("live");
  });

  it("lets a living tank intercept ordinary enemy attacks", () => {
    const enemy = makeUnit({
      id: "enemy",
      sourceId: "E01",
      team: "enemies",
      x: 500,
      attackMode: "melee",
    });
    const tank = makeUnit({ id: "tank", sourceId: "H01", x: 200 });
    const assassin = makeUnit({ id: "assassin", sourceId: "H06", x: 250 });

    const preferred = selectTarget(enemy, [enemy, tank, assassin], "frontmostEnemy");
    expect(preferred?.id).toBe(tank.id);
    expect(resolveMeleeFrontTarget(enemy, preferred, [enemy, tank, assassin])?.id).toBe(tank.id);
  });

  it("keeps specialist target rules able to bypass the tank", () => {
    const enemy = makeUnit({ id: "enemy", sourceId: "E02", team: "enemies", x: 500 });
    const tank = makeUnit({ id: "tank", sourceId: "H01", hp: 90, maxHp: 100, x: 200 });
    const assassin = makeUnit({ id: "assassin", sourceId: "H06", hp: 30, maxHp: 100, x: 220 });

    expect(selectTarget(enemy, [enemy, tank, assassin], "lowestHpEnemy")?.id).toBe(assassin.id);
  });

  it("honors a temporary taunt before returning to ordinary tank priority", () => {
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", x: 500 });
    const tank = makeUnit({ id: "tank", sourceId: "H01", x: 200 });
    const assassin = makeUnit({ id: "assassin", sourceId: "H06", x: 240 });
    applyStatus(enemy, {
      kind: "taunt",
      effectId: "test-taunt",
      sourceId: assassin.id,
      magnitude: 1,
      remainingMs: 3000,
    });

    expect(selectTarget(enemy, [enemy, tank, assassin], "frontmostEnemy")?.id).toBe(assassin.id);
    advanceStatuses(enemy, 3000);
    expect(selectTarget(enemy, [enemy, tank, assassin], "frontmostEnemy")?.id).toBe(tank.id);
  });

  it("keeps ordinary melee movement close behind a living tank", () => {
    const tank = makeUnit({
      id: "tank",
      sourceId: "H01",
      x: 200,
      moveSpeed: 0,
      targetId: "enemy",
      passiveFlags: { formationLane: 0 },
    });
    const assassin = makeUnit({
      id: "assassin",
      sourceId: "H06",
      x: 200,
      moveSpeed: 1000,
      targetId: "enemy",
      passiveFlags: { formationLane: 1 },
    });
    const enemy = makeUnit({
      id: "enemy",
      sourceId: "E01",
      team: "enemies",
      x: 800,
      moveSpeed: 0,
      targetId: tank.id,
    });

    advanceMovement([tank, assassin, enemy], 1000);

    expect(assassin.x).toBeLessThanOrEqual(tank.x + 28);
  });

  it("splits melee peers across nearby front targets by ground lane", () => {
    const upperHero = makeUnit({
      id: "upper-hero",
      team: "heroes",
      x: 200,
      y: -40,
      passiveFlags: { formationLane: 0 },
    });
    const lowerHero = makeUnit({
      id: "lower-hero",
      team: "heroes",
      x: 200,
      y: 40,
      passiveFlags: { formationLane: 1 },
    });
    const upperEnemy = makeUnit({
      id: "upper-enemy",
      team: "enemies",
      x: 500,
      y: -40,
      moveSpeed: 0,
    });
    const lowerEnemy = makeUnit({
      id: "lower-enemy",
      team: "enemies",
      x: 600,
      y: 40,
      moveSpeed: 0,
    });

    advanceMovement([upperHero, lowerHero, upperEnemy, lowerEnemy], 50, { teams: ["heroes"] });

    expect(upperHero.targetId).toBe(upperEnemy.id);
    expect(lowerHero.targetId).toBe(lowerEnemy.id);
  });

  it("stops a ranged hero at attack range", () => {
    const hero = makeUnit({
      id: "hero",
      x: 100,
      attackMode: "ranged",
      attackRange: 280,
      moveSpeed: 100,
    });
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 500, moveSpeed: 0 });
    advanceMovement([hero, enemy], 1000);
    expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(280);
  });

  it("makes a melee pursuer engage the frontline instead of clipping through to a backliner", () => {
    const ranged = makeUnit({
      id: "ranged",
      team: "heroes",
      x: 200,
      attackMode: "ranged",
      attackRange: 280,
      moveSpeed: 100,
    });
    const melee = makeUnit({
      id: "melee",
      team: "enemies",
      x: 330,
      attackMode: "melee",
      attackRange: 60,
      moveSpeed: 120,
      targetId: ranged.id,
    });
    const frontliner = makeUnit({
      id: "frontliner",
      team: "heroes",
      x: 260,
      attackMode: "melee",
      moveSpeed: 0,
    });
    const startingX = ranged.x;
    for (let index = 0; index < 80; index += 1) advanceMovement([ranged, frontliner, melee], 50);
    expect(ranged.x).toBeGreaterThanOrEqual(startingX);
    expect(melee.targetId).toBe(frontliner.id);
    expect(Math.abs(melee.x - frontliner.x)).toBeLessThanOrEqual(
      engageRange(melee, frontliner) + 2,
    );
  });

  it("keeps the last ranged hero planted when no melee ally survives", () => {
    const ranged = makeUnit({
      id: "ranged",
      team: "heroes",
      x: 200,
      attackMode: "ranged",
      attackRange: 280,
      moveSpeed: 100,
    });
    const fallenMelee = makeUnit({
      id: "fallen-melee",
      team: "heroes",
      alive: false,
      hp: 0,
      attackMode: "melee",
    });
    const enemy = makeUnit({
      id: "enemy",
      team: "enemies",
      x: 450,
      moveSpeed: 0,
    });
    for (let index = 0; index < 20; index += 1) {
      advanceMovement([ranged, fallenMelee, enemy], 50);
    }
    expect(ranged.x).toBe(200);
  });

  it("lets melee heroes close on planted ranged enemies without overlap", () => {
    const hero = makeUnit({
      id: "hero",
      team: "heroes",
      x: 220,
      attackMode: "melee",
      attackRange: 60,
      moveSpeed: 120,
    });
    const rangedEnemy = makeUnit({
      id: "ranged-enemy",
      team: "enemies",
      x: 480,
      attackMode: "ranged",
      attackRange: 250,
      moveSpeed: 100,
    });
    const startingX = rangedEnemy.x;
    for (let index = 0; index < 10; index += 1) advanceMovement([hero, rangedEnemy], 50);
    expect(rangedEnemy.x).toBe(startingX);
    expect(Math.abs(rangedEnemy.x - hero.x)).toBeGreaterThanOrEqual(
      minimumOpponentGap(hero, rangedEnemy),
    );
    expect(Math.abs(rangedEnemy.x - hero.x)).toBeLessThanOrEqual(
      engageRange(hero, rangedEnemy) + 2,
    );
    expect(hero.x).toBeGreaterThan(220);
  });

  it("plants a hero while its visible skill cast is in progress", () => {
    const caster = makeUnit({
      id: "caster",
      team: "heroes",
      x: 200,
      attackMode: "ranged",
      attackRange: 280,
      moveSpeed: 100,
      targetId: "enemy",
      skillPrepareMs: 300,
    });
    const frontliner = makeUnit({
      id: "frontliner",
      team: "heroes",
      x: 260,
      attackMode: "melee",
      moveSpeed: 0,
      targetId: "enemy",
    });
    const enemy = makeUnit({
      id: "enemy",
      team: "enemies",
      x: 500,
      moveSpeed: 0,
      targetId: frontliner.id,
    });

    advanceMovement([caster, frontliner, enemy], 500);
    expect(caster.x).toBe(200);
  });

  it("places ranged heroes behind melee heroes regardless of party slot", () => {
    const front = heroFormationOffset(65, 0, "H01");
    const back = heroFormationOffset(290, 4, "H05");
    expect(back.x).toBeLessThan(front.x);
  });

  it("keeps the five hero lanes visibly separated", () => {
    const lanes = Array.from(
      { length: 5 },
      (_, index) => laneOffsetY(`hero-${index}-H0${index + 1}`, index, "heroes"),
    ).sort((left, right) => left - right);

    for (let index = 1; index < lanes.length; index += 1) {
      expect(lanes[index]! - lanes[index - 1]!).toBeGreaterThan(14);
    }
  });

  it("keeps melee enemies from walking into hero sprites", () => {
    const hero = makeUnit({
      id: "hero",
      team: "heroes",
      x: 200,
      attackRange: 60,
      moveSpeed: 0,
    });
    const enemy = makeUnit({
      id: "enemy",
      team: "enemies",
      x: 420,
      attackRange: 55,
      moveSpeed: 120,
    });
    for (let i = 0; i < 40; i += 1) advanceMovement([hero, enemy], 50);
    expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(
      minimumOpponentGap(enemy, hero) - 1,
    );
  });

  it("combines both body footprints with melee reach", () => {
    const hero = makeUnit({ team: "heroes", attackMode: "melee", attackRange: 60 });
    const normal = makeUnit({ team: "enemies", sourceId: "E01" });
    const boss = makeUnit({ team: "enemies", sourceId: "B04" });
    const ranged = makeUnit({ attackMode: "ranged", attackRange: 280 });

    expect(combatBodyRadius(hero)).toBe(70);
    expect(combatBodyRadius(normal)).toBe(82);
    expect(engageRange(hero, normal)).toBe(212);
    expect(engageRange(hero, boss)).toBeGreaterThan(engageRange(hero, normal));
    expect(engageRange(ranged, normal)).toBe(
      280 + RANGED_ATTACK_RANGE_BONUS + 104,
    );
  });

  it("stops opposing movement before models can cross or overlap", () => {
    const hero = makeUnit({
      id: "hero",
      team: "heroes",
      x: 100,
      moveSpeed: 1000,
      targetId: "enemy",
    });
    const enemy = makeUnit({
      id: "enemy",
      team: "enemies",
      sourceId: "E01",
      x: 500,
      moveSpeed: 1000,
      targetId: "hero",
    });
    const heroStart = hero.x;
    const enemyStart = enemy.x;

    advanceMovement([hero, enemy], 1000);

    expect(hero.x).toBeGreaterThanOrEqual(heroStart);
    expect(enemy.x).toBeLessThanOrEqual(enemyStart);
    expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(
      minimumOpponentGap(hero, enemy) - 1,
    );
  });

  it("spreads advancing allies without moving either one backward", () => {
    const a = makeUnit({ id: "a", team: "heroes", x: 200, y: 8, moveSpeed: 100, attackRange: 40 });
    const b = makeUnit({ id: "b", team: "heroes", x: 200, y: 14, moveSpeed: 100, attackRange: 280 });
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 900, moveSpeed: 0 });
    const startA = a.x;
    const startB = b.x;
    for (let i = 0; i < 12; i += 1) advanceMovement([a, b, enemy], 50);
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(40);
    expect(a.x).toBeGreaterThanOrEqual(startA);
    expect(b.x).toBeGreaterThanOrEqual(startB);
    expect(a.y).toBe(8);
    expect(b.y).toBe(14);
  });

  it("assigns advancing melee allies stable front and rear positions", () => {
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 650, moveSpeed: 0 });
    const a = makeUnit({ id: "a", team: "heroes", x: 250, targetId: enemy.id, moveSpeed: 100 });
    const b = makeUnit({ id: "b", team: "heroes", x: 250, targetId: enemy.id, moveSpeed: 100 });

    for (let index = 0; index < 20; index += 1) advanceMovement([a, b, enemy], 50);

    expect(Math.abs(a.x - b.x)).toBeGreaterThan(70);
    expect(Math.min(a.x, b.x)).toBeGreaterThanOrEqual(250);
  });

  it("lets separate formation lanes reach the same target without forming a queue", () => {
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 650, moveSpeed: 0 });
    const warrior = makeUnit({
      id: "warrior",
      team: "heroes",
      x: 180,
      y: -18,
      attackRange: 60,
      targetId: enemy.id,
      passiveFlags: { formationLane: 0 },
    });
    const knight = makeUnit({
      id: "knight",
      team: "heroes",
      x: 180,
      y: 14,
      attackRange: 65,
      targetId: enemy.id,
      passiveFlags: { formationLane: 1 },
    });
    const ranger = makeUnit({
      id: "ranger",
      team: "heroes",
      x: 120,
      y: -6,
      attackMode: "ranged",
      attackRange: 290,
      targetId: enemy.id,
      passiveFlags: { formationLane: 2 },
    });

    for (let index = 0; index < 100; index += 1) {
      advanceMovement([warrior, knight, ranger, enemy], 50);
    }

    for (const hero of [warrior, knight, ranger]) {
      expect(Math.abs(enemy.x - hero.x)).toBeLessThanOrEqual(engageRange(hero, enemy) + 2);
    }
    expect([warrior.y, knight.y, ranger.y]).toEqual([-18, 14, -6]);
  });

  it("keeps melee reach attached to the hero instead of the formation slot", () => {
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 650, y: 0, moveSpeed: 0 });
    const shield = makeUnit({
      id: "shield",
      sourceId: "H01",
      team: "heroes",
      x: 200,
      y: 0,
      attackRange: HERO_BY_ID.H01.attackRange,
      targetId: enemy.id,
      passiveFlags: { formationLane: 4 },
    });
    const longWeapon = makeUnit({
      id: "long-weapon",
      sourceId: "H16",
      team: "heroes",
      x: 200,
      y: 0,
      attackRange: HERO_BY_ID.H16.attackRange,
      targetId: enemy.id,
      passiveFlags: { formationLane: 0 },
    });
    const shieldInAnotherLane = makeUnit({
      ...shield,
      id: "shield-other-lane",
      passiveFlags: { formationLane: 1 },
    });

    for (let index = 0; index < 100; index += 1) advanceMovement([shield, longWeapon, enemy], 50);

    expect(HERO_BY_ID.H16.attackRange - HERO_BY_ID.H01.attackRange).toBeGreaterThanOrEqual(35);
    expect(shield.x - longWeapon.x).toBeGreaterThanOrEqual(35);
    expect(engageRange(shieldInAnotherLane, enemy)).toBe(engageRange(shield, enemy));
    expect(Math.abs(enemy.x - shield.x)).toBeLessThanOrEqual(engageRange(shield, enemy) + 2);
    expect(Math.abs(enemy.x - longWeapon.x)).toBeLessThanOrEqual(engageRange(longWeapon, enemy) + 2);
  });

  it("never reverses either team during ordinary combat movement", () => {
    const heroes = [
      makeUnit({ id: "hero-melee", team: "heroes", x: 220, attackMode: "melee" }),
      makeUnit({ id: "hero-ranged", team: "heroes", x: 180, attackMode: "ranged", attackRange: 280 }),
    ];
    const enemies = [
      makeUnit({ id: "enemy-melee", team: "enemies", sourceId: "E01", x: 460, attackMode: "melee" }),
      makeUnit({ id: "enemy-ranged", team: "enemies", sourceId: "E17", x: 520, attackMode: "ranged", attackRange: 250 }),
    ];
    const units = [...heroes, ...enemies];

    for (let tick = 0; tick < 80; tick += 1) {
      const before = new Map(units.map((unit) => [unit.id, unit.x]));
      advanceMovement(units, 50);
      for (const hero of heroes) expect(hero.x).toBeGreaterThanOrEqual(before.get(hero.id)!);
      for (const enemy of enemies) expect(enemy.x).toBeLessThanOrEqual(before.get(enemy.id)!);
    }
  });

  it("does not shove backliners out of their attack range behind melee", () => {
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 500, moveSpeed: 0, attackRange: 55 });
    const melee = makeUnit({
      id: "melee",
      team: "heroes",
      x: 380,
      attackRange: 60,
      moveSpeed: 0,
      targetId: enemy.id,
    });
    const ranged = makeUnit({
      id: "ranged",
      team: "heroes",
      x: 200,
      attackMode: "ranged",
      attackRange: 270,
      moveSpeed: 120,
      targetId: enemy.id,
    });
    for (let i = 0; i < 40; i += 1) advanceMovement([melee, ranged, enemy], 50);
    expect(Math.abs(enemy.x - ranged.x)).toBeLessThanOrEqual(engageRange(ranged, enemy) + 4);
  });
});

describe("statuses", () => {
  it("keeps differently named same-kind effects independent and uses the strongest", () => {
    const hero = makeUnit();
    applyStatus(hero, { kind: "haste", effectId: "tailwind", magnitude: 0.1, remainingMs: 1000, sourceId: "a" });
    applyStatus(hero, { kind: "haste", effectId: "frenzy", magnitude: 0.2, remainingMs: 500, sourceId: "a" });
    expect(hero.statuses).toHaveLength(2);
    expect(getStatusMagnitude(hero, "haste")).toBe(0.2);
    advanceStatuses(hero, 500);
    expect(getStatusMagnitude(hero, "haste")).toBe(0.1);
  });

  it("does not combine a stronger reapplication with the old longer duration", () => {
    const hero = makeUnit();
    applyStatus(hero, { kind: "haste", effectId: "frenzy", magnitude: 0.1, remainingMs: 8000, sourceId: "a" });
    applyStatus(hero, { kind: "haste", effectId: "frenzy", magnitude: 0.3, remainingMs: 2000, sourceId: "a" });
    expect(hero.statuses).toEqual([{
      kind: "haste",
      effectId: "frenzy",
      magnitude: 0.3,
      remainingMs: 2000,
      sourceId: "a",
    }]);
  });

  it("expires status timers without leaving negative entries", () => {
    const hero = makeUnit({
      statuses: [{ kind: "stun", magnitude: 1, remainingMs: 50, sourceId: "enemy" }],
    });
    advanceStatuses(hero, 50);
    expect(hero.statuses).toEqual([]);
  });

  it("refreshes a same-source Frostbite slow without stacking it", () => {
    const enemy = makeUnit();
    applyStatus(enemy, { kind: "slow", magnitude: 0.12, remainingMs: 500, sourceId: "hero-a" });
    applyStatus(enemy, { kind: "slow", magnitude: 0.12, remainingMs: 2000, sourceId: "hero-a" });
    expect(enemy.statuses).toEqual([
      { kind: "slow", magnitude: 0.12, remainingMs: 2000, sourceId: "hero-a" },
    ]);
  });
});
