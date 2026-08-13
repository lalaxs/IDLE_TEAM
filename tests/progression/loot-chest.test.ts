import { describe, expect, it } from "vitest";
import {
  applyLootChestCharge,
  createDefaultLootChest,
  getLootChestChargeNeeded,
  getLootChestKillCharge,
  getLootChestProgress,
  LOOT_CHEST_MAX_LEVEL,
  normalizeLootChest,
} from "../../src/progression/LootChestSystem";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";

describe("loot chest", () => {
  it("normalizes missing and out-of-range chest state", () => {
    expect(normalizeLootChest(undefined)).toEqual(createDefaultLootChest());
    expect(normalizeLootChest({ level: 99, charge: -3 })).toEqual({
      level: LOOT_CHEST_MAX_LEVEL,
      charge: 0,
    });
  });

  it("charges from kills and upgrades when the bar fills", () => {
    let chest = createDefaultLootChest();
    const needed = getLootChestChargeNeeded(1);
    const result = applyLootChestCharge(chest, needed, 0, 10);
    expect(result.leveledUp).toBe(true);
    expect(result.chest.level).toBe(2);
    expect(result.goldGained).toBeGreaterThan(0);
    expect(getLootChestProgress(result.chest)).toBeLessThan(1);
  });

  it("stays at max level and still pays out when filled", () => {
    const chest = { level: LOOT_CHEST_MAX_LEVEL, charge: getLootChestChargeNeeded(5) - 1 };
    const result = applyLootChestCharge(chest, getLootChestKillCharge("boss"), 0, 20);
    expect(result.chest.level).toBe(LOOT_CHEST_MAX_LEVEL);
    expect(result.rewarded).toBe(true);
    expect(result.goldGained).toBeGreaterThan(0);
  });

  it("persists loot chest through save repair", () => {
    const save = repairSaveData({
      version: 1,
      lootChest: { level: 3, charge: 7 },
    });
    expect(save.lootChest).toEqual({ level: 3, charge: 7 });
  });

  it("awards gold through the store charge action", () => {
    const save = createDefaultSave();
    save.gold = 0;
    const store = new GameStore(save);
    const needed = getLootChestChargeNeeded(1);
    store.dispatch({ type: "lootChest:charge", amount: needed });
    expect(store.getState().save.lootChest.level).toBe(2);
    expect(store.getState().save.gold).toBeGreaterThan(0);
  });
});