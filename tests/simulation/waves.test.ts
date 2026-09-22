import { describe, expect, it } from "vitest";
import { bossIdForStage, resolveEnemyDamageElement } from "../../src/content/enemies";
import { chapterThemeElement } from "../../src/content/damageElements";
import {
  createEnemyUnits,
  createEncounterDefinitions,
  createStageEncounterPlan,
  createWaveDefinitions,
  TRASH_ENCOUNTERS_BEFORE_BOSS,
  trashQuotaForStage,
} from "../../src/simulation/WaveSystem";

describe("wave generation", () => {
  it("uses one roster and boss for each first-chapter region", () => {
    expect(createWaveDefinitions(1, 1, 1)).toHaveLength(3);
    expect(createWaveDefinitions(4, 2, 1).some(({ enemyId }) => enemyId === "E04")).toBe(true);
    expect(createWaveDefinitions(1, 3, 1).map(({ enemyId }) => enemyId)).toEqual(["B04"]);
    expect(createWaveDefinitions(5, 1, 1).every(({ enemyId }) => enemyId === "E05")).toBe(true);
    expect(createWaveDefinitions(8, 2, 1).some(({ enemyId }) => enemyId === "E08")).toBe(true);
    expect(createWaveDefinitions(8, 3, 1)[0]?.enemyId).toBe("B08");
    expect(createWaveDefinitions(9, 1, 1).every(({ enemyId }) => enemyId === "E09")).toBe(true);
    expect(createWaveDefinitions(12, 2, 1).some(({ enemyId }) => enemyId === "E12")).toBe(true);
    expect(createWaveDefinitions(12, 3, 1)[0]?.enemyId).toBe("B12");
    expect(createWaveDefinitions(12, 3, 1)).toHaveLength(3);
  });

  it("builds five varied controlled-random encounters", () => {
    const plan = createStageEncounterPlan(12, 10);
    expect(plan.map((encounter) => encounter.length)).toEqual([3, 4, 5, 5, 6]);
    expect(new Set(plan.map((encounter) =>
      encounter.map(({ enemyId }) => enemyId).sort().join(","),
    )).size).toBe(5);
    expect(plan[3]?.some(({ enemyId }) => enemyId === "E12")).toBe(true);
    expect(plan.flat().every(({ enemyId }) => enemyId.startsWith("E"))).toBe(true);
  });

  it("keeps encounter randomness deterministic per attempt and changes it for a new seed", () => {
    expect(createStageEncounterPlan(36, 99)).toEqual(createStageEncounterPlan(36, 99));
    expect(createStageEncounterPlan(36, 99)).not.toEqual(createStageEncounterPlan(36, 100));
  });

  it("rotates chapter bosses without consecutive repeats and preserves regional finales", () => {
    for (let stage = 2; stage <= 120; stage += 1) {
      expect(bossIdForStage(stage)).not.toBe(bossIdForStage(stage - 1));
    }
    expect([1, 2, 3, 4].map(bossIdForStage)).toEqual(["B04", "B08", "B12", "B04"]);
    expect([4, 8, 12].map(bossIdForStage)).toEqual(["B04", "B08", "B12"]);
  });

  it("scales boss escorts across the four stages of a region", () => {
    expect([1, 2, 3, 4].map((stage) =>
      createEncounterDefinitions(stage, 6, 10, true).length,
    )).toEqual([1, 2, 2, 3]);
  });

  it("sets trash quota to the five planned encounters", () => {
    const expected = Array.from(
      { length: TRASH_ENCOUNTERS_BEFORE_BOSS },
      (_, index) => createEncounterDefinitions(1, index + 1, 10, false).length,
    ).reduce((total, count) => total + count, 0);
    expect(TRASH_ENCOUNTERS_BEFORE_BOSS).toBe(5);
    expect(trashQuotaForStage(1, 10)).toBe(expected);
  });

  it("uses one roster and boss for each second-chapter region", () => {
    expect(createWaveDefinitions(13, 1, 1).every(({ enemyId }) => enemyId === "E13")).toBe(true);
    expect(createWaveDefinitions(16, 2, 1).some(({ enemyId }) => enemyId === "E16")).toBe(true);
    expect(createWaveDefinitions(16, 3, 1)[0]?.enemyId).toBe("B16");
    expect(createWaveDefinitions(17, 1, 1).every(({ enemyId }) => enemyId === "E17")).toBe(true);
    expect(createWaveDefinitions(20, 2, 1).some(({ enemyId }) => enemyId === "E20")).toBe(true);
    expect(createWaveDefinitions(20, 3, 1)[0]?.enemyId).toBe("B20");
    expect(createWaveDefinitions(21, 1, 1).every(({ enemyId }) => enemyId === "E21")).toBe(true);
    expect(createWaveDefinitions(24, 2, 1).some(({ enemyId }) => enemyId === "E24")).toBe(true);
    expect(createWaveDefinitions(24, 3, 1)[0]?.enemyId).toBe("B24");
    expect(createWaveDefinitions(24, 3, 1)).toHaveLength(3);
  });

  it("uses the approved third- through eighth-chapter regional rosters", () => {
    expect(createWaveDefinitions(25, 1, 1).every(({ enemyId }) => enemyId === "E25")).toBe(true);
    expect(createWaveDefinitions(28, 2, 1).some(({ enemyId }) => enemyId === "E28")).toBe(true);
    expect(createWaveDefinitions(28, 3, 1)[0]?.enemyId).toBe("B28");
    expect(createWaveDefinitions(32, 3, 1)[0]?.enemyId).toBe("B32");
    expect(createWaveDefinitions(36, 2, 1).some(({ enemyId }) => enemyId === "E36")).toBe(true);
    expect(createWaveDefinitions(36, 3, 1)[0]?.enemyId).toBe("B36");

    expect(createWaveDefinitions(37, 1, 1).every(({ enemyId }) => enemyId === "E37")).toBe(true);
    expect(createWaveDefinitions(40, 2, 1).some(({ enemyId }) => enemyId === "E40")).toBe(true);
    expect(createWaveDefinitions(40, 3, 1)[0]?.enemyId).toBe("B40");
    expect(createWaveDefinitions(44, 3, 1)[0]?.enemyId).toBe("B44");
    expect(createWaveDefinitions(48, 2, 1).some(({ enemyId }) => enemyId === "E48")).toBe(true);
    expect(createWaveDefinitions(48, 3, 1)[0]?.enemyId).toBe("B48");
    expect(createWaveDefinitions(48, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(49, 1, 1).every(({ enemyId }) => enemyId === "E49")).toBe(true);
    expect(createWaveDefinitions(52, 2, 1).some(({ enemyId }) => enemyId === "E52")).toBe(true);
    expect(createWaveDefinitions(52, 3, 1)[0]?.enemyId).toBe("B52");
    expect(createWaveDefinitions(56, 2, 1).some(({ enemyId }) => enemyId === "E56")).toBe(true);
    expect(createWaveDefinitions(56, 3, 1)[0]?.enemyId).toBe("B56");
    expect(createWaveDefinitions(60, 2, 1).some(({ enemyId }) => enemyId === "E60")).toBe(true);
    expect(createWaveDefinitions(60, 3, 1)[0]?.enemyId).toBe("B60");
    expect(createWaveDefinitions(60, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(61, 1, 1).every(({ enemyId }) => enemyId === "E61")).toBe(true);
    expect(createWaveDefinitions(64, 2, 1).some(({ enemyId }) => enemyId === "E64")).toBe(true);
    expect(createWaveDefinitions(64, 3, 1)[0]?.enemyId).toBe("B64");
    expect(createWaveDefinitions(68, 2, 1).some(({ enemyId }) => enemyId === "E68")).toBe(true);
    expect(createWaveDefinitions(68, 3, 1)[0]?.enemyId).toBe("B68");
    expect(createWaveDefinitions(69, 1, 1).every(({ enemyId }) => enemyId === "E69")).toBe(true);
    expect(createWaveDefinitions(72, 2, 1).some(({ enemyId }) => enemyId === "E72")).toBe(true);
    expect(createWaveDefinitions(72, 3, 1)[0]?.enemyId).toBe("B72");
    expect(createWaveDefinitions(72, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(73, 1, 1).every(({ enemyId }) => enemyId === "E73")).toBe(true);
    expect(createWaveDefinitions(76, 2, 1).some(({ enemyId }) => enemyId === "E76")).toBe(true);
    expect(createWaveDefinitions(76, 3, 1)[0]?.enemyId).toBe("B76");
    expect(createWaveDefinitions(80, 2, 1).some(({ enemyId }) => enemyId === "E80")).toBe(true);
    expect(createWaveDefinitions(80, 3, 1)[0]?.enemyId).toBe("B80");
    expect(createWaveDefinitions(81, 1, 1).every(({ enemyId }) => enemyId === "E81")).toBe(true);
    expect(createWaveDefinitions(84, 2, 1).some(({ enemyId }) => enemyId === "E84")).toBe(true);
    expect(createWaveDefinitions(84, 3, 1)[0]?.enemyId).toBe("B84");
    expect(createWaveDefinitions(84, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(85, 1, 1).every(({ enemyId }) => enemyId === "E85")).toBe(true);
    expect(createWaveDefinitions(88, 2, 1).some(({ enemyId }) => enemyId === "E88")).toBe(true);
    expect(createWaveDefinitions(88, 3, 1)[0]?.enemyId).toBe("B88");
    expect(createWaveDefinitions(92, 2, 1).some(({ enemyId }) => enemyId === "E92")).toBe(true);
    expect(createWaveDefinitions(92, 3, 1)[0]?.enemyId).toBe("B92");
    expect(createWaveDefinitions(93, 1, 1).every(({ enemyId }) => enemyId === "E93")).toBe(true);
    expect(createWaveDefinitions(96, 2, 1).some(({ enemyId }) => enemyId === "E96")).toBe(true);
    expect(createWaveDefinitions(96, 3, 1)[0]?.enemyId).toBe("B96");
    expect(createWaveDefinitions(96, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(97, 1, 1).every(({ enemyId }) => enemyId === "E97")).toBe(true);
    expect(createWaveDefinitions(100, 2, 1).some(({ enemyId }) => enemyId === "E100")).toBe(true);
    expect(createWaveDefinitions(100, 3, 1)[0]?.enemyId).toBe("B100");
    expect(createWaveDefinitions(104, 2, 1).some(({ enemyId }) => enemyId === "E104")).toBe(true);
    expect(createWaveDefinitions(104, 3, 1)[0]?.enemyId).toBe("B104");
    expect(createWaveDefinitions(105, 1, 1).every(({ enemyId }) => enemyId === "E105")).toBe(true);
    expect(createWaveDefinitions(108, 2, 1).some(({ enemyId }) => enemyId === "E108")).toBe(true);
    expect(createWaveDefinitions(108, 3, 1)[0]?.enemyId).toBe("B108");
    expect(createWaveDefinitions(108, 3, 1)).toHaveLength(3);

    expect(createWaveDefinitions(109, 1, 1).every(({ enemyId }) => enemyId === "E109")).toBe(true);
    expect(createWaveDefinitions(112, 2, 1).some(({ enemyId }) => enemyId === "E112")).toBe(true);
    expect(createWaveDefinitions(112, 3, 1)[0]?.enemyId).toBe("B112");
    expect(createWaveDefinitions(116, 2, 1).some(({ enemyId }) => enemyId === "E116")).toBe(true);
    expect(createWaveDefinitions(116, 3, 1)[0]?.enemyId).toBe("B116");
    expect(createWaveDefinitions(117, 1, 1).every(({ enemyId }) => enemyId === "E117")).toBe(true);
    expect(createWaveDefinitions(120, 2, 1).some(({ enemyId }) => enemyId === "E120")).toBe(true);
    expect(createWaveDefinitions(120, 3, 1)[0]?.enemyId).toBe("B120");
    expect(createWaveDefinitions(120, 3, 1)).toHaveLength(3);
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

  it("orders enemy melee ranks ahead of ranged ranks", () => {
    const enemies = createEnemyUnits(24, 3, 99, 1200, true);
    const ranks = enemies.map(({ attackMode }) => attackMode === "melee" ? 0 : 1);
    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
  });

  it("tags elite and boss attacks with the chapter element", () => {
    expect(chapterThemeElement(1)).toBe("physical");
    expect(chapterThemeElement(2)).toBe("frost");
    expect(chapterThemeElement(3)).toBe("fire");
    expect(chapterThemeElement(4)).toBe("lightning");
    expect(chapterThemeElement(5)).toBe("dark");
    expect(resolveEnemyDamageElement("E13", 13)).toBe("frost");
    expect(resolveEnemyDamageElement("E16", 16)).toBe("frost");
    expect(resolveEnemyDamageElement("B16", 16)).toBe("frost");
    expect(resolveEnemyDamageElement("B12", 12)).toBe("physical");
    expect(resolveEnemyDamageElement("E02", 1)).toBe("dark");
    expect(createEnemyUnits(25, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B28")?.damageElement).toBe("fire");
    expect(createEnemyUnits(37, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B40")?.damageElement).toBe("lightning");
    expect(createEnemyUnits(49, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B52")?.damageElement).toBe("dark");
    expect(createEnemyUnits(61, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B64")?.damageElement).toBe("fire");
    expect(createEnemyUnits(73, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B76")?.damageElement).toBe("lightning");
    expect(createEnemyUnits(85, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B88")?.damageElement).toBe("dark");
    expect(createEnemyUnits(109, 1, 1, 900, true).find(({ sourceId }) => sourceId === "B112")?.damageElement).toBe("frost");
  });

  it("copies explicit melee and ranged modes into battle units", () => {
    const melee = createEnemyUnits(1, 1, 1).find(({ sourceId }) => sourceId === "E01");
    const ranged = createEnemyUnits(17, 1, 1).find(({ sourceId }) => sourceId === "E17");
    const rangedBoss = createEnemyUnits(24, 1, 1, 900, true).find(
      ({ sourceId }) => sourceId === "B24",
    );

    expect(melee?.attackMode).toBe("melee");
    expect(ranged?.attackMode).toBe("ranged");
    expect(ranged?.attackRange).toBe(250);
    expect(rangedBoss?.attackMode).toBe("ranged");
  });
});
