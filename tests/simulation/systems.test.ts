import { describe, expect, it } from "vitest";
import { advanceMovement } from "../../src/simulation/MovementSystem";
import { advanceStatuses, applyStatus } from "../../src/simulation/StatusSystem";
import { selectTarget } from "../../src/simulation/TargetingSystem";
import { makeUnit } from "../support/makeUnit";

describe("targeting and movement", () => {
  it("selects a replacement after the current target dies", () => {
    const hero = makeUnit({ id: "hero", team: "heroes", x: 100 });
    const dead = makeUnit({ id: "dead", team: "enemies", x: 200, alive: false, hp: 0 });
    const live = makeUnit({ id: "live", team: "enemies", x: 300 });
    expect(selectTarget(hero, [hero, dead, live], "nearestEnemy")?.id).toBe("live");
  });

  it("stops a ranged hero at attack range", () => {
    const hero = makeUnit({ id: "hero", x: 100, attackRange: 280, moveSpeed: 100 });
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 500, moveSpeed: 0 });
    advanceMovement([hero, enemy], 1000);
    expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(280);
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
    // engageRange = attackRange + melee contact padding
    expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(100);
  });

  it("pushes overlapping allies apart along the ground (x), not vertically", () => {
    const a = makeUnit({ id: "a", team: "heroes", x: 200, y: 8, moveSpeed: 0, attackRange: 40 });
    const b = makeUnit({ id: "b", team: "heroes", x: 200, y: 14, moveSpeed: 0, attackRange: 280 });
    const enemy = makeUnit({ id: "enemy", team: "enemies", x: 900, moveSpeed: 0 });
    for (let i = 0; i < 12; i += 1) advanceMovement([a, b, enemy], 50);
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(40);
    expect(a.y).toBe(8);
    expect(b.y).toBe(14);
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
      attackRange: 270,
      moveSpeed: 120,
      targetId: enemy.id,
    });
    for (let i = 0; i < 40; i += 1) advanceMovement([melee, ranged, enemy], 50);
    expect(Math.abs(enemy.x - ranged.x)).toBeLessThanOrEqual(274);
  });
});

describe("statuses", () => {
  it("keeps the stronger same-kind effect and refreshes duration", () => {
    const hero = makeUnit();
    applyStatus(hero, { kind: "haste", magnitude: 0.1, remainingMs: 1000, sourceId: "a" });
    applyStatus(hero, { kind: "haste", magnitude: 0.2, remainingMs: 500, sourceId: "b" });
    expect(hero.statuses).toHaveLength(1);
    expect(hero.statuses[0]?.magnitude).toBe(0.2);
    expect(hero.statuses[0]?.remainingMs).toBe(1000);
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
