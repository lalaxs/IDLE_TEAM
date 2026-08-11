import { describe, expect, it } from "vitest";
import {
  calculateBattleCameraX,
  calculateParallaxOffset,
  projectBattleX,
} from "../../src/phaser/BattleCamera";
import { makeUnit } from "../support/makeUnit";

describe("battle camera", () => {
  it("keeps travelling heroes slightly left of center", () => {
    const heroes = [
      makeUnit({ id: "hero-a", x: 650 }),
      makeUnit({ id: "hero-b", x: 700 }),
    ];

    const cameraX = calculateBattleCameraX(heroes);
    const projectedCenter = projectBattleX(675, cameraX, 430);

    expect(cameraX).toBe(295);
    expect(projectedCenter).toBeCloseTo(163.4, 0);
  });

  it("ignores enemy spawn positions when framing the party", () => {
    const heroesOnly = [
      makeUnit({ id: "hero-a", team: "heroes", x: 400 }),
      makeUnit({ id: "hero-b", team: "heroes", x: 440 }),
    ];
    const withEnemies = [
      ...heroesOnly,
      makeUnit({ id: "enemy-a", team: "enemies", x: 720 }),
      makeUnit({ id: "enemy-b", team: "enemies", x: 1380 }),
    ];

    const before = calculateBattleCameraX(heroesOnly);
    const after = calculateBattleCameraX(withEnemies);
    expect(after).toBe(before);
    expect(after).toBe(40);

    const heroScreen = projectBattleX(420, after, 430);
    expect(heroScreen).toBeCloseTo(163.4, 0);
  });

  it("follows the party as they advance right", () => {
    const early = calculateBattleCameraX([makeUnit({ id: "hero-a", team: "heroes", x: 400 })]);
    const later = calculateBattleCameraX([makeUnit({ id: "hero-a", team: "heroes", x: 700 })]);
    expect(later).toBeGreaterThan(early);
    expect(projectBattleX(700, later, 430)).toBeCloseTo(projectBattleX(400, early, 430), 5);
  });

  it("moves foreground layers left in a bounded loop as the party advances", () => {
    expect(calculateParallaxOffset(245, 0.28, 100)).toBeCloseTo(-68.6, 1);
    expect(calculateParallaxOffset(500, 0.28, 100)).toBe(-40);
  });
});
