import { describe, expect, it } from "vitest";
import { ITEM_BY_ID } from "../../src/content/items";
import { generateStageRewards } from "../../src/progression/RewardSystem";

describe("stage rewards", () => {
  it("always gives a boss item and deterministic rewards", () => {
    const left = generateStageRewards(5, 99);
    const right = generateStageRewards(5, 99);
    expect(left.gold).toBeGreaterThan(0);
    expect(left.items.length).toBeGreaterThanOrEqual(1);
    expect(left.items.map(({ definitionId, rarity, stats }) => ({ definitionId, rarity, stats }))).toEqual(
      right.items.map(({ definitionId, rarity, stats }) => ({ definitionId, rarity, stats })),
    );
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
    expect(frostlandShare).toBeGreaterThan(0.65);
    expect(frostlandShare).toBeLessThanOrEqual(1);
  });

  it("uses the late-Red-Sands weighted pool in chapter three", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(36, seed).items,
    ).flat();
    const redSandsShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 3).length /
      items.length;
    expect(redSandsShare).toBeGreaterThan(0.65);
    expect(redSandsShare).toBeLessThan(0.95);
  });

  it("uses the late-Stormsea weighted pool in chapter four", () => {
    const items = Array.from({ length: 80 }, (_, seed) =>
      generateStageRewards(48, seed).items,
    ).flat();
    const stormseaShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 4).length /
      items.length;
    expect(stormseaShare).toBeGreaterThan(0.65);
    expect(stormseaShare).toBeLessThan(0.95);
  });
});
