import { describe, expect, it } from "vitest";
import { referenceEncounter, idleExperiencePerHour } from "../../src/content/numericalModel";
import { ITEM_BY_ID } from "../../src/content/items";
import { generateStageRewards } from "../../src/progression/RewardSystem";
import { RARITY_RANK } from "../../src/content/rarities";
import { getStageEquipmentDropPool } from "../../src/progression/EquipmentPool";
import { getEquipmentLevel } from "../../src/progression/EquipmentSystem";

describe("stage rewards", () => {
  it("always gives a chapter-boss item and deterministic rewards", () => {
    const left = generateStageRewards(12, 99);
    const right = generateStageRewards(12, 99);
    expect(left.gold).toBeGreaterThan(0);
    expect(left.items.length).toBeGreaterThanOrEqual(1);
    expect(left.items.map(({ definitionId, rarity, stats }) => ({ definitionId, rarity, stats }))).toEqual(
      right.items.map(({ definitionId, rarity, stats }) => ({ definitionId, rarity, stats })),
    );
  });

  it("keeps non-test difficulty repeatable-stage direct equipment near one item per clear", () => {
    const sampleCount = 400;
    const itemCount = Array.from({ length: sampleCount }, (_, seed) =>
      generateStageRewards(119, seed, undefined, "hard").items.length,
    ).reduce((total, count) => total + count, 0);
    const average = itemCount / sampleCount;
    expect(average).toBeGreaterThan(0.4);
    expect(average).toBeLessThan(1);
  });

  it("keeps chapter-one replays in the base pool", () => {
    const items = Array.from({ length: 20 }, (_, seed) =>
      generateStageRewards(12, seed).items,
    ).flat();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 1)).toBe(true);
  });

  it("uses the late-Frostland weighted pool in chapter two", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(24, seed).items,
    ).flat();
    const frostlandShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 2).length /
      items.length;
    expect(frostlandShare).toBe(1);
  });

  it("uses the late-Red-Sands weighted pool in chapter three", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(36, seed).items,
    ).flat();
    const redSandsShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 3).length /
      items.length;
    expect(redSandsShare).toBe(1);
  });

  it("uses the late-Stormsea weighted pool in chapter four", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(48, seed).items,
    ).flat();
    const stormseaShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 4).length /
      items.length;
    expect(stormseaShare).toBe(1);
  });

  it("raises equipment efficiency and quality without changing its chapter pool", () => {
    const sampleCount = 500;
    const hard = Array.from({ length: sampleCount }, (_, seed) =>
      generateStageRewards(119, seed, undefined, "hard").items,
    ).flat();
    const torment = Array.from({ length: sampleCount }, (_, seed) =>
      generateStageRewards(119, seed, undefined, "torment").items,
    ).flat();
    const averageRank = (items: typeof hard) =>
      items.reduce((sum, item) => sum + RARITY_RANK[item.rarity], 0) / items.length;

    expect(torment.length).toBeGreaterThan(hard.length);
    expect(averageRank(torment)).toBeGreaterThan(averageRank(hard));
    const allowedDefinitions = new Set(getStageEquipmentDropPool(119).map(({ id }) => id));
    expect(torment.every(({ stage, definitionId }) => stage === 119 && allowedDefinitions.has(definitionId))).toBe(true);
  });

  it("starts hard mode at level 50 while preserving the chapter-one pool", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(1, seed, undefined, "hard").items,
    ).flat();

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.stage === 1 && getEquipmentLevel(item) === 50)).toBe(true);
    expect(items.every(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 1)).toBe(true);
  });

  it("prices experience from the reference level and encounter time", () => {
    const hard = generateStageRewards(60, 22, undefined, "hard");
    const hell = generateStageRewards(60, 22, undefined, "hell");
    const ref = referenceEncounter(60, "hell");
    expect(hell.exp).toBe(Math.round(idleExperiencePerHour(ref.level) * 2 * (5 * ref.waveSeconds + ref.bossSeconds) / 3600));
    expect(hell.exp).toBeGreaterThan(hard.exp);
  });
});
