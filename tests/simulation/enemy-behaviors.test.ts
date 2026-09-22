import { describe, expect, it } from "vitest";
import { ENEMY_BY_ID } from "../../src/content/enemies";
import { BattleSimulation } from "../../src/simulation/BattleSimulation";
import {
  advanceEnemyBehavior,
  afterEnemyBasicHit,
  applyEnemyHealthPhase,
  initialEnemySkillTrigger,
  selectEnemyBasicTarget,
} from "../../src/simulation/EnemyBehaviorSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";
import type { BattleEvent, EnemyId } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const fixedRandom: RandomSource = {
  next: () => 0.5,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

function makeEnemy(sourceId: EnemyId) {
  return makeUnit({
    id: `enemy-${sourceId}`,
    sourceId,
    team: "enemies",
    x: 200,
    hp: 100,
    maxHp: 100,
    attack: 100,
    defense: 0,
    shield: 0,
    skillTriggerMs: initialEnemySkillTrigger(sourceId),
  });
}

function summonBoss(battle: BattleSimulation): void {
  for (let encounter = 0; encounter < 5; encounter += 1) {
    battle.debugDefeatEnemies();
    for (let tick = 0; tick < 40; tick += 1) {
      battle.step(50);
      if (battle.getSnapshot().units.some(({ team, alive }) => team === "enemies" && alive)) {
        break;
      }
    }
  }
}

describe("chapter-one enemy behaviors", () => {
  it("assigns authored profiles to every chapter-one enemy and region boss", () => {
    const ids: EnemyId[] = [
      "E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08",
      "E09", "E10", "E11", "E12", "B04", "B08", "B12",
    ];

    expect(ids.every((id) => Boolean(ENEMY_BY_ID[id].combatProfileId))).toBe(true);
  });

  it("adds exactly one cap strike after E02's fourth successful basic hit", () => {
    const source = makeEnemy("E02");
    const target = makeUnit({ id: "hero-front", hp: 1000, maxHp: 1000, defense: 0 });

    expect(afterEnemyBasicHit(source, target, fixedRandom)).toEqual([]);
    expect(afterEnemyBasicHit(source, target, fixedRandom)).toEqual([]);
    expect(afterEnemyBasicHit(source, target, fixedRandom)).toEqual([]);
    const fourth = afterEnemyBasicHit(source, target, fixedRandom);

    expect(fourth.filter(({ type }) => type === "damage")).toHaveLength(1);
    expect(fourth).toContainEqual(expect.objectContaining({
      type: "damage",
      attribution: { kind: "passive", id: "mushroom-cap-strike" },
    }));
  });

  it("applies E03's shell once when crossing half health", () => {
    const source = makeEnemy("E03");
    source.hp = 50;

    expect(applyEnemyHealthPhase(source)).toContainEqual({
      type: "status:applied",
      targetId: source.id,
      kind: "damageReduction",
    });
    expect(source.statuses[0]).toMatchObject({ magnitude: 0.18, remainingMs: 3000 });
    expect(applyEnemyHealthPhase(source)).toEqual([]);
  });

  it("keeps E07 on its lowest-health target until that target dies", () => {
    const source = makeEnemy("E07");
    const heroB = makeUnit({ id: "hero-b", hp: 50, maxHp: 100, x: 120 });
    const heroA = makeUnit({ id: "hero-a", hp: 50, maxHp: 100, x: 80 });
    const units = [source, heroB, heroA];

    expect(selectEnemyBasicTarget(source, units)?.id).toBe("hero-a");
    heroA.hp = 100;
    heroB.hp = 10;
    expect(selectEnemyBasicTarget(source, units)?.id).toBe("hero-a");
    heroA.alive = false;
    expect(selectEnemyBasicTarget(source, units)?.id).toBe("hero-b");
  });

  it("starts E08's 700ms root cast after five successful hits", () => {
    const source = makeEnemy("E08");
    const target = makeUnit({ id: "hero-front", x: 100 });

    for (let hit = 0; hit < 5; hit += 1) {
      afterEnemyBasicHit(source, target, fixedRandom);
    }
    expect(source.skillTriggerMs).toBe(0);

    const events = advanceEnemyBehavior(source, [source, target], 50);
    expect(events).toContainEqual(expect.objectContaining({
      type: "skill:started",
      skillId: "root-bind",
    }));
    expect(source.skillPrepareMs).toBe(700);
    expect(source.skillTargetIds).toEqual([target.id]);
  });

  it("does not stack E12's cadence shield while any shield remains", () => {
    const source = makeEnemy("E12");
    const target = makeUnit({ id: "hero-front" });

    for (let hit = 0; hit < 5; hit += 1) afterEnemyBasicHit(source, target, fixedRandom);
    expect(source.shield).toBe(12);
    source.shield = 6;
    for (let hit = 0; hit < 5; hit += 1) afterEnemyBasicHit(source, target, fixedRandom);
    expect(source.shield).toBe(6);
    source.shield = 0;
    for (let hit = 0; hit < 5; hit += 1) afterEnemyBasicHit(source, target, fixedRandom);
    expect(source.shield).toBe(12);
  });

  it("runs B04 through telegraph and resolution before applying damage", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroStats: {},
      heroBonuses: {
        H01: { maxHp: 100_000, defense: 10_000, damageReductionPct: 0.6 },
      },
      seed: 10,
      startWithTravel: false,
    });
    summonBoss(battle);
    expect(battle.getSnapshot().units.some(({ sourceId }) => sourceId === "B04")).toBe(true);
    battle.drainEvents();

    const events: BattleEvent[] = [];
    for (let tick = 0; tick < 150; tick += 1) {
      battle.step(50);
      events.push(...battle.drainEvents());
      if (events.some(({ type }) => type === "skill:resolved")) break;
    }

    const startedIndex = events.findIndex(
      (event) => event.type === "skill:started" && event.skillId === "b04-sail-sweep",
    );
    const resolvedIndex = events.findIndex(
      (event) => event.type === "skill:resolved" && event.skillId === "b04-sail-sweep",
    );
    expect(startedIndex).toBeGreaterThanOrEqual(0);
    expect(resolvedIndex).toBeGreaterThan(startedIndex);
    expect(events[resolvedIndex]).toEqual(expect.objectContaining({
      type: "skill:resolved",
      targetIds: [expect.stringContaining("hero-0-H01")],
    }));
  });
});
