import { describe, expect, it } from "vitest";
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS } from "../../src/content/items";
import { SET_DEFINITIONS, getChapterSetIds } from "../../src/content/sets";
import { createDefaultSave } from "../../src/persistence/schema";
import { getEquipmentBonuses } from "../../src/progression/EquipmentBonuses";
import { canImprintSetOnSlot } from "../../src/progression/GearCraftSystem";
import type { InventoryItem } from "../../src/progression/EquipmentSystem";

describe("equipment set catalog", () => {
  it("offers sixteen distinct sets with complete 2/4/6 bonuses", () => {
    expect(SET_DEFINITIONS).toHaveLength(16);
    expect(new Set(SET_DEFINITIONS.map((set) => set.id)).size).toBe(16);
    for (const set of SET_DEFINITIONS) {
      expect(set.bonuses.map((bonus) => bonus.pieces)).toEqual([2, 4, 6]);
      expect(EQUIPMENT_SLOTS.every((slot) => canImprintSetOnSlot(set.id, slot))).toBe(true);
    }
  });

  it("uses chapter-specific natural set-mark pools", () => {
    expect(getChapterSetIds(1)).toEqual(["set_moss_crown"]);
    expect(getChapterSetIds(4)).toEqual(["set_storm_tide"]);
    expect(getChapterSetIds(5)).toEqual(["set_blackwater_hunt", "set_marshfire_rite"]);
    expect(getChapterSetIds(10)).toEqual(["set_northwind_warsong", "set_polar_astrolabe"]);
  });

  it("keeps set identity off equipment definitions", () => {
    expect(ITEM_DEFINITIONS.every((item) => item.setId == null)).toBe(true);
  });

  it("applies the new set combat axes cumulatively", () => {
    const save = createDefaultSave(0);
    const pieces = EQUIPMENT_SLOTS.slice(0, 6).map((slot) =>
      ITEM_DEFINITIONS.find((item) => item.slot === slot)!,
    );
    for (const [index, definition] of pieces.entries()) {
      const instanceId = `set-piece-${index}`;
      const item: InventoryItem = {
        instanceId,
        definitionId: definition.id,
        slot: definition.slot,
        rarity: "common",
        level: 40,
        stage: 49,
        stats: {},
        affixes: [],
        traitId: null,
        setId: "set_blackwater_hunt",
      };
      save.inventory.push(item);
      save.roster.H01.equipment[definition.slot] = instanceId;
    }

    const bonus = getEquipmentBonuses(save).H01!;
    expect(bonus.lifeStealPct).toBeCloseTo(0.02, 5);
    expect(bonus.primaryAttackPct).toBeCloseTo(0.1, 5);
    expect(bonus.attackSpeedPct).toBeCloseTo(4, 5);
    expect(bonus.executeDamagePct).toBeCloseTo(0.12, 5);
  });
});
