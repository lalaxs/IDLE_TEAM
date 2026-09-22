import { describe, expect, it } from "vitest";
import {
  advanceBattleRenderX,
  battleCameraXForAnchor,
  calculateBattleCameraX,
  calculateMirroredStripLayout,
  calculateParallaxOffset,
  findHeroEntryCameraAnchor,
  interpolateLeaderCameraAnchor,
  projectBattleX,
} from "../../src/phaser/BattleCamera";
import { makeUnit } from "../support/makeUnit";

describe("battle camera", () => {
  it("keeps the frontmost living hero at the horizontal center", () => {
    const heroes = [
      makeUnit({ id: "hero-a", x: 650 }),
      makeUnit({ id: "hero-b", x: 700 }),
    ];

    const cameraX = calculateBattleCameraX(heroes);
    const projectedFront = projectBattleX(700, cameraX, 430);

    expect(cameraX).toBe(200);
    expect(projectedFront).toBe(215);
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
    expect(after).toBe(-60);

    const heroScreen = projectBattleX(440, after, 430);
    expect(heroScreen).toBe(215);
  });

  it("follows every forward step without an encounter lock", () => {
    const early = calculateBattleCameraX([makeUnit({ id: "hero-a", team: "heroes", x: 400 })]);
    const later = calculateBattleCameraX([makeUnit({ id: "hero-a", team: "heroes", x: 700 })]);
    expect(later).toBeGreaterThan(early);
    expect(projectBattleX(400, early, 430)).toBe(215);
    expect(projectBattleX(700, later, 430)).toBe(215);
  });

  it("frames the entry destination instead of snapping to the off-screen leader", () => {
    const leader = makeUnit({ id: "hero-a", team: "heroes", x: -420 });
    leader.passiveFlags.heroEntryActive = true;
    leader.passiveFlags.holdX = 180;

    const anchor = findHeroEntryCameraAnchor([leader]);

    expect(anchor).toBe(180);
    expect(projectBattleX(leader.x, battleCameraXForAnchor(anchor!), 430)).toBeLessThan(0);
  });

  it("recenters on the next front hero when the current leader falls", () => {
    const units = [
      makeUnit({ id: "hero-a", team: "heroes", x: 650, alive: false, hp: 0 }),
      makeUnit({ id: "hero-b", team: "heroes", x: 480 }),
      makeUnit({ id: "hero-c", team: "heroes", x: 350 }),
    ];

    const cameraX = calculateBattleCameraX(units, 150);
    expect(cameraX).toBe(-20);
    expect(projectBattleX(480, cameraX, 430)).toBe(215);
  });

  it("never falls back to surviving enemies as a camera target", () => {
    const enemy = makeUnit({ id: "enemy-a", team: "enemies", x: 920 });
    expect(calculateBattleCameraX([enemy], 175)).toBe(175);
  });

  it("smooths fixed-step movement while keeping the rendered leader centered", () => {
    const renderX = advanceBattleRenderX(400, 410, 16, false);
    const cameraX = battleCameraXForAnchor(renderX);

    expect(renderX).toBeGreaterThan(400);
    expect(renderX).toBeLessThan(410);
    expect(projectBattleX(renderX, cameraX, 430)).toBe(215);
    expect(advanceBattleRenderX(renderX, 410, 16, true)).toBe(410);
  });

  it("uses a short ease-out when the front hero changes", () => {
    const halfway = interpolateLeaderCameraAnchor(650, 480, 100, 200);

    expect(halfway).toBeGreaterThan(480);
    expect(halfway).toBeLessThan(650);
    expect(interpolateLeaderCameraAnchor(650, 480, 200, 200)).toBe(480);
  });

  it("moves foreground layers left in a bounded loop as the party advances", () => {
    expect(calculateParallaxOffset(245, 0.28, 100)).toBeCloseTo(-68.6, 1);
    expect(calculateParallaxOffset(500, 0.28, 100)).toBe(-40);
  });

  it("keeps a mirrored image pair continuous across segment boundaries", () => {
    expect(calculateMirroredStripLayout(860, 860)).toEqual({
      segmentIndex: 1,
      localOffset: 0,
    });
    expect(calculateMirroredStripLayout(1735, 860)).toEqual({
      segmentIndex: 2,
      localOffset: 15,
    });
  });

});
