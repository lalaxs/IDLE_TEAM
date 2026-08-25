import { describe, expect, it } from "vitest";
import {
  applyLootChestCharge,
  canOpenLootChest,
  createDefaultLootChest,
  generateLootChestRewards,
  getLootChestChargeNeeded,
  getLootChestItemCount,
  getLootChestKillCharge,
  getLootChestProgress,
  LOOT_CHEST_MAX_LEVEL,
  normalizeLootChest,
  openLootChest,
  rollLootChestDropStage,
} from "../../src/progression/LootChestSystem";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("loot chest", () => {
  it("starts at level 0 and normalizes out-of-range state", () => {
    expect(createDefaultLootChest()).toEqual({ level: 0, charge: 0 });
    expect(normalizeLootChest(undefined)).toEqual(createDefaultLootChest());
    expect(normalizeLootChest({ level: 99, charge: -3 })).toEqual({
      level: LOOT_CHEST_MAX_LEVEL,
      charge: 0,
    });
  });

  it("charges from level 0 and becomes openable at level 1", () => {
    const needed = getLootChestChargeNeeded(0);
    const result = applyLootChestCharge(createDefaultLootChest(), needed, 0);
    expect(result.leveledUp).toBe(true);
    expect(result.becameReady).toBe(true);
    expect(result.chest.level).toBe(1);
    expect(canOpenLootChest(result.chest)).toBe(true);
  });

  it("keeps upgrading past level 1 while remaining openable", () => {
    const needed = getLootChestChargeNeeded(1);
    const result = applyLootChestCharge({ level: 1, charge: 0 }, needed, 0);
    expect(result.leveledUp).toBe(true);
    expect(result.chest.level).toBe(2);
    expect(canOpenLootChest(result.chest)).toBe(true);
    expect(getLootChestProgress(result.chest)).toBeLessThan(1);
  });

  it("caps charge at max level", () => {
    const chest = { level: LOOT_CHEST_MAX_LEVEL, charge: getLootChestChargeNeeded(5) - 1 };
    const result = applyLootChestCharge(chest, getLootChestKillCharge("boss"), 0);
    expect(result.chest.level).toBe(LOOT_CHEST_MAX_LEVEL);
    expect(result.chest.charge).toBe(getLootChestChargeNeeded(5));
    expect(canOpenLootChest(result.chest)).toBe(true);
  });

  it("opens any tier 1–5 and resets to level 0", () => {
    for (const level of [1, 3, 5] as const) {
      const result = openLootChest({ level, charge: 0 }, 36, 42 + level);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.items).toHaveLength(getLootChestItemCount(level));
      expect(result.chest).toEqual({ level: 0, charge: 0 });
      for (const item of result.items) {
        expect(item.stage).toBeGreaterThanOrEqual(36);
      }
    }
  });

  it("refuses to open an empty level-0 chest", () => {
    expect(openLootChest(createDefaultLootChest(), 10, 1)).toEqual({
      ok: false,
      reason: "empty",
    });
  });

  it("only max-tier chests can roll a higher drop stage", () => {
    let lowLucky = false;
    let highLucky = false;
    for (let seed = 1; seed < 8000; seed += 1) {
      if (rollLootChestDropStage(12, 4, new SeededRandom(seed)).lucky) lowLucky = true;
      const high = rollLootChestDropStage(12, 5, new SeededRandom(seed));
      if (high.lucky && high.stage > 12) highLucky = true;
    }
    expect(lowLucky).toBe(false);
    expect(highLucky).toBe(true);
  });

  it("persists loot chest through save repair", () => {
    const save = repairSaveData({
      version: 1,
      lootChest: { level: 3, charge: 7 },
    });
    expect(save.lootChest).toEqual({ level: 3, charge: 7 });
    expect(repairSaveData({ version: 1 }).lootChest).toEqual({ level: 0, charge: 0 });
  });

  it("opens mid-tier chests through the store and resets to 0", () => {
    const save = createDefaultSave();
    save.gold = 0;
    save.highestClearedStage = 36;
    save.lootChest = { level: 2, charge: 5 };
    const store = new GameStore(save);
    const before = store.getState().save.inventory.length;
    store.dispatch({ type: "lootChest:open" });
    const state = store.getState();
    expect(state.save.lootChest).toEqual(createDefaultLootChest());
    expect(state.save.gold).toBeGreaterThan(0);
    expect(state.save.inventory.length).toBeGreaterThan(before);
  });

  it("generates more items from higher chest tiers", () => {
    const low = generateLootChestRewards(1, 10, 100);
    const high = generateLootChestRewards(5, 10, 100);
    expect(low.items.length).toBe(1);
    expect(high.items.length).toBe(3);
  });
});
