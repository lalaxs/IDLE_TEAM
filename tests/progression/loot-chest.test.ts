import { describe, expect, it } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { RARITY_RANK } from "../../src/content/rarities";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import type { RandomSource } from "../../src/simulation/RandomSource";
import {
  canOpenLootChest,
  createDefaultLootChest,
  getEquipmentChestTier,
  getLootChestHourlyRates,
  getLootChestAccumulatedMs,
  getLootChestProgress,
  LOOT_CHEST_CAP_MS,
  normalizeLootChest,
  openLootChest,
  previewLootChest,
  rollLootChestItems,
} from "../../src/progression/LootChestSystem";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

class FixedRandom implements RandomSource {
  constructor(private readonly value: number) {}

  next(): number {
    return this.value;
  }

  int(min: number): number {
    return min;
  }

  pick<T>(values: readonly T[]): T {
    return values[0]!;
  }
}

describe("idle loot chest", () => {
  it("stores the start of the current accumulation period", () => {
    expect(createDefaultLootChest(1_000)).toEqual({ startedAt: 1_000 });
    expect(normalizeLootChest({ startedAt: 800 }, 1_000)).toEqual({ startedAt: 800 });
    expect(normalizeLootChest({ startedAt: 1_200 }, 1_000)).toEqual({ startedAt: 1_000 });
  });

  it("accumulates from real time and stops at twelve hours", () => {
    const chest = createDefaultLootChest(1_000);
    expect(getLootChestAccumulatedMs(chest, 1_000 + 3 * HOUR)).toBe(3 * HOUR);
    expect(getLootChestAccumulatedMs(chest, 1_000 + 12 * HOUR)).toBe(LOOT_CHEST_CAP_MS);
    expect(getLootChestProgress(chest, 1_000 + 12 * HOUR)).toBe(1);
  });

  it("allows basic rewards after five minutes", () => {
    const chest = createDefaultLootChest(0);
    expect(canOpenLootChest(chest, 5 * MINUTE - 1)).toBe(false);
    expect(canOpenLootChest(chest, 5 * MINUTE)).toBe(true);
  });

  it("rolls equipment randomly without a fixed first drop and respects the window cap", () => {
    expect(rollLootChestItems(8 * HOUR, 1, "easy", new FixedRandom(1))).toHaveLength(0);
    expect(rollLootChestItems(20 * MINUTE, 1, "easy", new FixedRandom(0))).toHaveLength(6);
    expect(rollLootChestItems(2 * HOUR, 1, "easy", new FixedRandom(0))).toHaveLength(18);
  });

  it("maps rolled equipment to visible wood, bronze, silver, and gold boxes", () => {
    expect(getEquipmentChestTier("common")).toBe("wood");
    expect(getEquipmentChestTier("uncommon")).toBe("bronze");
    expect(getEquipmentChestTier("rare")).toBe("silver");
    expect(getEquipmentChestTier("epic")).toBe("gold");
    expect(getEquipmentChestTier("arcane")).toBe("gold");
  });

  it("grows both resources and equipment with idle duration", () => {
    const chest = createDefaultLootChest(10_000);
    const short = previewLootChest(chest, 10_000 + HOUR, 12, "easy");
    const long = previewLootChest(chest, 10_000 + 8 * HOUR, 12, "easy");
    expect(long.gold).toBeGreaterThan(short.gold);
    expect(long.exp).toBeGreaterThan(short.exp);
    expect(long.items.length).toBeGreaterThanOrEqual(short.items.length);
  });

  it("increases hourly gold and experience rates with cleared-stage progress", () => {
    const early = getLootChestHourlyRates(1);
    const later = getLootChestHourlyRates(12);
    expect(later.gold).toBeGreaterThan(early.gold);
    expect(later.exp).toBeGreaterThan(early.exp);
    expect(later).toEqual({ gold: 2_460, exp: 600 * 1.03 ** 9 });
  });

  it("keeps idle resource progress continuous across difficulty boundaries", () => {
    const endOfEasy = getLootChestHourlyRates(120, undefined, "easy");
    const startOfHard = getLootChestHourlyRates(1, undefined, "hard");
    const startOfNightmare = getLootChestHourlyRates(1, undefined, "nightmare");
    expect(startOfHard.gold).toBeGreaterThan(endOfEasy.gold);
    expect(startOfHard.exp).toBe(endOfEasy.exp);
    expect(startOfNightmare.gold).toBeGreaterThan(
      getLootChestHourlyRates(120, undefined, "hard").gold,
    );
  });

  it("uses the normal chapter rarity ceiling for boxed equipment", () => {
    const items = rollLootChestItems(20 * MINUTE, 1, "easy", new FixedRandom(0));
    expect(items).toHaveLength(6);
    expect(items.every((item) => RARITY_RANK[item.rarity] <= RARITY_RANK.rare)).toBe(true);
  });

  it("opens through the store, grants rewards, and starts a new accumulation period", () => {
    const now = 20_000_000;
    const save = createDefaultSave();
    save.gold = 0;
    save.lootChest = createDefaultLootChest(now - 8 * HOUR);
    save.difficultyProgress.easy.highestClearedStage = 12;
    const store = new GameStore(save);
    store.dispatch({ type: "lootChest:open", now });

    const state = store.getState();
    expect(state.save.lootChest).toEqual({ startedAt: now });
    expect(state.save.gold).toBeGreaterThan(0);
  });

  it("queues all four debug chest tiers and opens them without waiting", () => {
    const now = 20_000_000;
    const save = createDefaultSave(now);
    const store = new GameStore(save);
    let openedItems: import("../../src/progression/EquipmentSystem").InventoryItem[] = [];
    store.subscribe((_state, events) => {
      const opened = events.find((event) => event.type === "lootChest:opened");
      if (opened?.type === "lootChest:opened") openedItems = opened.items;
    });

    store.dispatch({
      type: "debug:grantLootChests",
      tiers: ["wood", "bronze", "silver", "gold"],
    });
    expect(store.getState().ui.debugLootChestItems.map((item) => getEquipmentChestTier(item.rarity)))
      .toEqual(["wood", "bronze", "silver", "gold"]);

    store.dispatch({ type: "lootChest:open", now });
    expect(store.getState().ui.debugLootChestItems).toHaveLength(0);
    expect(openedItems.map((item) => getEquipmentChestTier(item.rarity)))
      .toEqual(["wood", "bronze", "silver", "gold"]);
  });

  it("repairs legacy chest data into the new time-based state", () => {
    const before = Date.now();
    const repaired = repairSaveData({ version: 1, lootChest: { level: 3, charge: 7 } });
    expect(repaired.lootChest.startedAt).toBeGreaterThanOrEqual(before);
    expect(repaired.lootChest.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it("returns the previewed rewards and resets only after a valid open", () => {
    const chest = createDefaultLootChest(5_000);
    expect(openLootChest(chest, 5_000 + 4 * MINUTE, 8, "easy")).toEqual({
      ok: false,
      reason: "empty",
    });
    const preview = previewLootChest(chest, 5_000 + 2 * HOUR, 8, "easy");
    const opened = openLootChest(chest, 5_000 + 2 * HOUR, 8, "easy");
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.items.map(({ instanceId: _instanceId, ...item }) => item)).toEqual(
      preview.items.map(({ instanceId: _instanceId, ...item }) => item),
    );
    expect(opened.chest).toEqual({ startedAt: 5_000 + 2 * HOUR });
  });
});
