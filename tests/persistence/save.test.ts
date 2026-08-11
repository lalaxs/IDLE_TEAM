import { describe, expect, it } from "vitest";
import {
  createDefaultSave,
  repairSaveData,
} from "../../src/persistence/schema";
import { SaveRepository } from "../../src/persistence/SaveRepository";
import { calculateOfflineReward } from "../../src/progression/OfflineRewards";
import { createOfflineEquipment } from "../../src/progression/OfflineRewards";
import { ITEM_BY_ID } from "../../src/content/items";

describe("save schema", () => {
  it("creates the approved starting account", () => {
    const save = createDefaultSave(1_000);
    expect(save.gems).toBe(300);
    expect(Object.values(save.roster).filter(({ unlocked }) => unlocked)).toHaveLength(6);
    expect(save.party).toEqual(["H01", "H02", "H03", "H04", "H05"]);
  });

  it("repairs malformed values without losing valid progress", () => {
    const save = repairSaveData({ version: 1, gold: 900, currentStage: 99 }, 2_000);
    expect(save.gold).toBe(900);
    expect(save.currentStage).toBe(99);
    expect(save.party).toHaveLength(5);
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

  it("backs up corrupt JSON and recovers a valid default", () => {
    const memory = new Map<string, string>([["idle-rpg-save-v1", "{broken"]]);
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    };
    const repository = new SaveRepository(storage);
    expect(repository.load().currentStage).toBe(1);
    expect([...memory.keys()].some((key) => key.startsWith("idle-rpg-save-corrupt-"))).toBe(true);
  });
});

describe("offline reward", () => {
  it("ignores less than five minutes and caps at eight hours", () => {
    expect(calculateOfflineReward(4 * 60_000, 3, 1).gold).toBe(0);
    const capped = calculateOfflineReward(24 * 60 * 60_000, 3, 1);
    expect(capped.minutes).toBe(480);
    expect(capped.gold).toBe((20 + 3 * 12) * 480);
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
