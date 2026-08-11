import { describe, expect, it } from "vitest";
import {
  createEnemyUnits,
  createWaveDefinitions,
  trashQuotaForStage,
} from "../../src/simulation/WaveSystem";

describe("wave generation", () => {
  it("adds stage-scaled normal enemies, elite, boss, and late escorts", () => {
    expect(createWaveDefinitions(1, 1, 1)).toHaveLength(3);
    expect(createWaveDefinitions(4, 2, 1).some(({ enemyId }) => enemyId === "E04")).toBe(true);
    expect(createWaveDefinitions(7, 3, 1).map(({ enemyId }) => enemyId)).toEqual(["B01", expect.any(String)]);
    expect(createWaveDefinitions(10, 3, 1)).toHaveLength(3);
  });

  it("sets trash quota to the size of two trash packs", () => {
    expect(trashQuotaForStage(1, 10)).toBe(
      createWaveDefinitions(1, 1, 10).length + createWaveDefinitions(1, 2, 10).length,
    );
  });

  it("is deterministic for a stage seed", () => {
    expect(createWaveDefinitions(8, 2, 99)).toEqual(createWaveDefinitions(8, 2, 99));
  });

  it("gives consecutive stages distinct enemy view identities", () => {
    const firstStageIds = createEnemyUnits(1, 1, 99).map(({ id }) => id);
    const secondStageIds = createEnemyUnits(2, 1, 99).map(({ id }) => id);
    expect(secondStageIds.every((id) => !firstStageIds.includes(id))).toBe(true);
  });

  it("spaces a group far enough apart to enter from the right in sequence", () => {
    const enemies = createEnemyUnits(8, 2, 99, 1200);
    const gaps = enemies.slice(1).map(({ x }, index) => x - enemies[index]!.x);
    expect(gaps.every((gap) => gap >= 90)).toBe(true);
  });
});
