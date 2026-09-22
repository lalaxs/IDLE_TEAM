import { describe, expect, it } from "vitest";
import {
  createDefaultSave,
  repairSaveData,
} from "../../src/persistence/schema";
import {
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  SaveRepository,
  type StorageLike,
} from "../../src/persistence/SaveRepository";
import { calculateOfflineReward } from "../../src/progression/OfflineRewards";
import { createOfflineEquipment } from "../../src/progression/OfflineRewards";
import { ITEM_BY_ID } from "../../src/content/items";

describe("save schema", () => {
  it("creates the approved starting account", () => {
    const save = createDefaultSave(1_000);
    expect(save.gems).toBe(300);
    expect(save.alchemyStation).toEqual({ level: 1, exp: 0 });
    expect(Object.values(save.roster).filter(({ unlocked }) => unlocked)).toHaveLength(6);
    expect(save.party).toEqual(["H35", null, null, null, null]);
    expect(save.selectedDifficulty).toBe("easy");
    expect(save.difficultyProgress.easy).toEqual({ highestUnlockedStage: 1, highestClearedStage: 0 });
    expect(save.claimedStageGiftStages).toEqual([]);
  });

  it("keeps legacy first-clear rewards claimed while preserving new pending gifts", () => {
    expect(repairSaveData({
      version: 1,
      highestClearedStage: 3,
      highestUnlockedStage: 4,
    }).claimedStageGiftStages).toEqual([1, 2, 3]);

    expect(repairSaveData({
      version: 1,
      highestClearedStage: 3,
      highestUnlockedStage: 4,
      claimedStageGiftStages: [1],
    }).claimedStageGiftStages).toEqual([1]);
  });

  it("unlocks each difficulty only after the previous full campaign is cleared", () => {
    expect(repairSaveData({
      version: 1,
      highestClearedStage: 120,
      highestUnlockedStage: 120,
      selectedDifficulty: "hard",
    }).selectedDifficulty).toBe("hard");
    expect(repairSaveData({
      version: 1,
      highestClearedStage: 36,
      highestUnlockedStage: 37,
      selectedDifficulty: "hard",
    }).selectedDifficulty).toBe("easy");
    expect(repairSaveData({
      version: 1,
      highestClearedStage: 120,
      highestUnlockedStage: 120,
      difficultyProgress: {
        easy: { highestUnlockedStage: 120, highestClearedStage: 120 },
        hard: { highestUnlockedStage: 120, highestClearedStage: 120 },
        nightmare: { highestUnlockedStage: 120, highestClearedStage: 120 },
        hell: { highestUnlockedStage: 120, highestClearedStage: 120 },
        torment: { highestUnlockedStage: 4, highestClearedStage: 3 },
      },
      selectedDifficulty: "torment",
      currentStage: 4,
    }).selectedDifficulty).toBe("torment");
  });

  it("repairs party slots against progressive chapter-one unlocks", () => {
    const beforeSecondSlot = repairSaveData({
      version: 1,
      highestClearedStage: 0,
      party: ["H02", "H03", "H04", null, null],
    });
    expect(beforeSecondSlot.party).toEqual(["H02", null, null, null, null]);

    const afterThirdSlot = repairSaveData({
      version: 1,
      highestClearedStage: 3,
      party: ["H02", null, "H04", null, null],
    });
    expect(afterThirdSlot.party).toEqual(["H02", null, "H04", null, null]);

    const fullParty = repairSaveData({
      version: 1,
      highestClearedStage: 17,
      party: ["H35", "H02", "H03", "H04", "H57"],
    });
    expect(fullParty.party).toEqual(["H35", "H02", "H03", "H04", "H57"]);
  });

  it("repairs malformed values without losing valid progress", () => {
    const save = repairSaveData({
      version: 1,
      gold: 900,
      currentStage: 99,
      alchemyStation: { level: 2, exp: 45 },
      roster: { H01: { experience: 42 } },
    }, 2_000);
    expect(save.gold).toBe(900);
    expect(save.currentStage).toBe(99);
    expect(save.alchemyStation).toEqual({ level: 2, exp: 45 });
    expect(save.roster.H01.experience).toBe(42);
    expect(save.party).toHaveLength(5);
  });

  it("adds default alchemy progress to existing saves", () => {
    const save = repairSaveData({ version: 1 });
    expect(save.alchemyStation).toEqual({ level: 1, exp: 0 });
    expect(save.roster.H01.experience).toBe(0);
  });

  it("adds summon defaults to old saves and preserves a valid personal theme", () => {
    const legacy = repairSaveData({ version: 1 }, 1_000);
    expect(legacy.universalHeroMarks).toBe(0);
    expect(legacy.summonThemeMisses).toBe(0);
    expect(legacy.personalSummonTheme).toBeNull();

    const themed = repairSaveData({
      version: 1,
      universalHeroMarks: 7,
      summonThemeMisses: 8,
      personalSummonTheme: { classId: "priest", expiresAt: 5_000 },
    }, 1_000);
    expect(themed.universalHeroMarks).toBe(7);
    expect(themed.summonThemeMisses).toBe(8);
    expect(themed.personalSummonTheme).toEqual({ classId: "priest", expiresAt: 5_000 });

    expect(repairSaveData({
      version: 1,
      personalSummonTheme: { classId: "hunter", expiresAt: 900 },
    }, 1_000).personalSummonTheme).toBeNull();
  });

  it("ignores obsolete three-slot roster keys and does not remap them", () => {
    const save = repairSaveData(
      {
        version: 1,
        inventory: [
          {
            instanceId: "gear-weapon",
            definitionId: "weapon_guard_blade",
            slot: "main_weapon",
            rarity: "rare",
            stage: 1,
            stats: { attack: 20 },
            affixes: [],
            traitId: null,
          },
        ],
        roster: {
          H01: {
            heroId: "H01",
            unlocked: true,
            level: 2,
            marks: 0,
            equipment: {
              weapon: "gear-weapon",
              armor: null,
              accessory: null,
            },
          },
        },
      },
      3_000,
    );
    expect(save.inventory).toHaveLength(1);
    expect(save.roster.H01.equipment.main_weapon).toBeNull();
    expect(Object.keys(save.roster.H01.equipment)).toHaveLength(10);
  });

  it("keeps current ten-slot equipment loadouts", () => {
    const save = repairSaveData(
      {
        version: 1,
        inventory: [
          {
            instanceId: "gear-weapon",
            definitionId: "weapon_guard_blade",
            slot: "main_weapon",
            rarity: "rare",
            stage: 1,
            stats: { attack: 20 },
            affixes: [],
            traitId: null,
          },
        ],
        roster: {
          H01: {
            heroId: "H01",
            unlocked: true,
            level: 2,
            marks: 0,
            equipment: {
              main_weapon: "gear-weapon",
            },
          },
        },
      },
      3_000,
    );
    expect(save.inventory[0]?.slot).toBe("main_weapon");
    expect(save.roster.H01.equipment.main_weapon).toBe("gear-weapon");
  });

  it("filters invalid equipment references, shop offers, and duplicate party members", () => {
    const validItem = {
      instanceId: "gear-valid",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "rare",
      stage: 1,
      stats: { attack: 20 },
      affixes: [],
      traitId: null,
    };
    const save = repairSaveData(
      {
        version: 1,
        inventory: [
          validItem,
          { ...validItem, instanceId: "gear-unknown", definitionId: "missing-definition" },
        ],
        overflow: [{ ...validItem }],
        roster: {
          H01: { equipment: { main_weapon: "gear-valid" } },
          H02: { equipment: { main_weapon: "gear-valid" } },
          H03: { equipment: { main_weapon: "gear-missing" } },
        },
        party: ["H02", "H02", null, "missing-hero", null],
        shop: {
          dateKey: "2026-09-10",
          freeRefreshUsed: false,
          offers: [
            {
              offerId: "broken-offer",
              kind: "equipment",
              item: { ...validItem, definitionId: "missing-definition" },
              priceGold: 10,
              sold: false,
            },
          ],
        },
      },
      3_000,
    );

    expect(save.inventory.map(({ instanceId }) => instanceId)).toEqual(["gear-valid"]);
    expect(save.overflow).toEqual([]);
    expect(save.roster.H01.equipment.main_weapon).toBe("gear-valid");
    expect(save.roster.H02.equipment.main_weapon).toBeNull();
    expect(save.roster.H03.equipment.main_weapon).toBeNull();
    expect(save.party).toEqual(["H02", null, null, null, null]);
    expect(save.shop.offers).toEqual([]);
  });

  it("keeps intentional empty party slots and restores one hero only when every slot is empty", () => {
    expect(repairSaveData({ version: 1, party: ["H02", null, null, null, null] }).party).toEqual([
      "H02",
      null,
      null,
      null,
      null,
    ]);
    expect(repairSaveData({ version: 1, party: [null, null, null, null, null] }).party).toEqual([
      "H35",
      null,
      null,
      null,
      null,
    ]);
  });

  it("rejects incompatible schemas and unsafe activity timestamps", () => {
    expect(repairSaveData({ version: 2, gold: 900 }, 2_000).gold).toBe(0);
    expect(repairSaveData({ version: 1, lastActiveAt: -1 }, 2_000).lastActiveAt).toBe(2_000);
    expect(repairSaveData({ version: 1, lastActiveAt: 3_000 }, 2_000).lastActiveAt).toBe(2_000);
  });

  it("backs up corrupt JSON and recovers a valid default", () => {
    const memory = new Map<string, string>([[SAVE_KEY, "{broken"]]);
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    };
    const repository = new SaveRepository(storage);
    expect(repository.load().currentStage).toBe(1);
    expect(memory.get(SAVE_BACKUP_KEY)).toBe("{broken");
    expect(memory.has(SAVE_KEY)).toBe(false);
  });

  it("uses one backup slot when incompatible saves repeat", () => {
    const memory = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
    const repository = new SaveRepository(storage);
    memory.set(SAVE_KEY, JSON.stringify({ version: 2, gold: 100 }));
    expect(repository.load().gold).toBe(0);
    memory.set(SAVE_KEY, JSON.stringify({ version: 3, gold: 200 }));
    expect(repository.load().gold).toBe(0);
    expect(JSON.parse(memory.get(SAVE_BACKUP_KEY) ?? "{}").version).toBe(3);
    expect([...memory.keys()].filter((key) => key === SAVE_BACKUP_KEY)).toHaveLength(1);
  });

  it("stays playable when storage reads or deletes throw", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const repository = new SaveRepository(storage);
    expect(repository.load().currentStage).toBe(1);
    expect(repository.persistent).toBe(false);
    expect(() => repository.clear()).not.toThrow();
    expect(repository.clear()).toBe(false);
  });

  it("retains a failed write for retry without claiming it was saved", () => {
    const memory = new Map<string, string>();
    let failWrites = true;
    const storage: StorageLike = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        if (failWrites) throw new Error("quota");
        memory.set(key, value);
      },
      removeItem: (key) => void memory.delete(key),
    };
    const repository = new SaveRepository(storage);
    const save = createDefaultSave(1_000);
    save.gold = 123;
    repository.schedule(save);
    expect(repository.flush()).toBe(false);
    expect(save.updatedAt).toBe(1_000);
    expect(repository.persistent).toBe(false);

    failWrites = false;
    expect(repository.flush()).toBe(true);
    expect(JSON.parse(memory.get(SAVE_KEY) ?? "{}").gold).toBe(123);
    expect(repository.persistent).toBe(true);
  });

  it("can immediately persist the latest activity time without a scheduled store update", () => {
    const memory = new Map<string, string>();
    const repository = new SaveRepository({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    });
    const save = createDefaultSave(1_000);
    save.lastActiveAt = 2_000;
    expect(repository.saveNow(save)).toBe(true);
    expect(JSON.parse(memory.get(SAVE_KEY) ?? "{}").lastActiveAt).toBe(2_000);
  });
});

describe("offline reward", () => {
  it("ignores less than five minutes and caps at twelve hours", () => {
    expect(calculateOfflineReward(4 * 60_000, 3, 1).gold).toBe(0);
    const capped = calculateOfflineReward(24 * 60 * 60_000, 3, 1);
    expect(capped.minutes).toBe(720);
    expect(capped.gold).toBe((20 + 3 * 12) * 720);
  });

  it("uses the highest unlocked stage for offline equipment", () => {
    const chapterOne = createOfflineEquipment(20, 12, 1234);
    expect(
      chapterOne.every(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 1),
    ).toBe(true);
    const frostland = createOfflineEquipment(100, 24, 1234);
    const frostlandShare =
      frostland.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 2).length /
      frostland.length;
    expect(frostlandShare).toBeGreaterThan(0.65);
    expect(frostlandShare).toBeLessThanOrEqual(1);
    const redSands = createOfflineEquipment(100, 36, 5678);
    const redSandsShare =
      redSands.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 3).length /
      redSands.length;
    expect(redSandsShare).toBeGreaterThan(0.65);
    expect(redSandsShare).toBeLessThanOrEqual(1);
    const stormsea = createOfflineEquipment(100, 48, 9012);
    const stormseaShare =
      stormsea.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 4).length /
      stormsea.length;
    expect(stormseaShare).toBeGreaterThan(0.65);
    expect(stormseaShare).toBeLessThanOrEqual(1);
  });
});
