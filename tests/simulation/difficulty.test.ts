import { describe, expect, it } from "vitest";
import {
  applyDifficultyHealthPhase,
  applyDifficultySignatureMechanic,
  combatProfileForEnemy,
} from "../../src/simulation/EnemyBehaviorSystem";
import { createEnemyUnits } from "../../src/simulation/WaveSystem";
import { difficultyPowerStage } from "../../src/content/difficulties";
import { makeUnit } from "../support/makeUnit";

describe("battle difficulty", () => {
  it("starts every post-easy campaign in the endgame power band", () => {
    expect(difficultyPowerStage(1, "easy")).toBe(1);
    expect(difficultyPowerStage(120, "easy")).toBe(120);
    expect(difficultyPowerStage(1, "hard")).toBe(120);
    expect(difficultyPowerStage(120, "torment")).toBe(120);
  });

  it("scales enemy stats from easy through torment", () => {
    const easy = createEnemyUnits(1, 1, 9, 900, false, "easy")[0]!;
    const hard = createEnemyUnits(1, 1, 9, 900, false, "hard")[0]!;
    const torment = createEnemyUnits(1, 1, 9, 900, false, "torment")[0]!;

    expect(easy.maxHp).toBeLessThan(hard.maxHp);
    expect(torment.maxHp).toBeGreaterThan(hard.maxHp);
    expect(torment.attack).toBeGreaterThan(hard.attack);
  });

  it("gives bosses one hell shield at the 70% health breakpoint", () => {
    const boss = makeUnit({
      id: "boss",
      sourceId: "B04",
      team: "enemies",
      hp: 70,
      maxHp: 100,
      shield: 0,
    });

    applyDifficultyHealthPhase(boss, "nightmare");
    expect(boss.shield).toBe(0);
    applyDifficultyHealthPhase(boss, "hell");
    expect(boss.shield).toBe(15);
    boss.shield = 0;
    applyDifficultyHealthPhase(boss, "hell");
    expect(boss.shield).toBe(0);
  });

  it("adds haste after boss signatures and echoes every third torment signature", () => {
    const boss = makeUnit({ id: "boss", sourceId: "B04", team: "enemies" });
    const abilityId = combatProfileForEnemy(boss).active!.id;

    expect(applyDifficultySignatureMechanic(boss, abilityId, "torment").echoMultiplier).toBe(0);
    expect(applyDifficultySignatureMechanic(boss, abilityId, "torment").echoMultiplier).toBe(0);
    const third = applyDifficultySignatureMechanic(boss, abilityId, "torment");
    expect(third.echoMultiplier).toBe(0.4);
    expect(third.events).toContainEqual({ type: "status:applied", targetId: "boss", kind: "haste" });
    expect(boss.statuses).toContainEqual(expect.objectContaining({ magnitude: 0.1, remainingMs: 3000 }));
  });
});
