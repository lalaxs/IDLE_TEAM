import { describe, expect, it } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave } from "../../src/persistence/schema";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("GameStore meta loop", () => {
  it("unlocks H07 then H08 through the fixed demo summon sequence", () => {
    const save = createDefaultSave();
    const store = new GameStore(save);
    store.dispatch({ type: "summon:single" });
    expect(store.getState().save.roster.H07?.unlocked).toBe(true);
    store.getState().save.gems = 100;
    store.dispatch({ type: "summon:single" });
    expect(store.getState().save.roster.H08?.unlocked).toBe(true);
  });

  it("emits summon results for unlocks and duplicate marks", () => {
    const save = createDefaultSave();
    save.gems = 1000;
    save.roster.H07.unlocked = true;
    save.roster.H08.unlocked = true;
    const store = new GameStore(save);
    let resultCount = 0;
    store.subscribe((_state, events) => {
      const completed = events.find((event) => event.type === "summon:completed");
      if (completed?.type === "summon:completed") {
        resultCount = completed.results.length;
        expect(completed.results.every((pull) => pull.kind === "marks" && pull.marks === 20)).toBe(true);
      }
    });
    store.dispatch({ type: "summon:five" });
    expect(resultCount).toBe(5);
  });

  it("rejects duplicate heroes in a saved party", () => {
    const store = new GameStore(createDefaultSave());
    expect(() =>
      store.dispatch({
        type: "party:commit",
        party: ["H01", "H01", "H03", "H04", "H05"],
      }),
    ).toThrow("duplicate");
  });

  it("levels a hero only when there is enough gold", () => {
    const save = createDefaultSave();
    save.gold = 80;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:levelUp", heroId: "H01" });
    expect(store.getState().save.roster.H01?.level).toBe(2);
    expect(store.getState().save.gold).toBe(0);
  });

  it("keeps equipped item data available for combat stat calculation", () => {
    const save = createDefaultSave();
    const item = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(2));
    save.inventory.push(item);
    const store = new GameStore(save);
    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    expect(store.getState().save.roster.H01?.equipment.main_weapon).toBe(item.instanceId);
    expect(store.getState().save.inventory).toContainEqual(item);
  });

  it("does not count equipped items toward backpack capacity", () => {
    const save = createDefaultSave();
    save.inventory = Array.from({ length: 40 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(index + 1)),
    );
    const equipped = save.inventory[0]!;
    save.roster.H01.equipment.main_weapon = equipped.instanceId;
    const store = new GameStore(save);
    const incoming = createEquipment("weapon_oak_staff", 1, "rare", new SeededRandom(999));
    store.dispatch({ type: "item:add", item: incoming });
    expect(store.getState().save.inventory).toContainEqual(incoming);
    expect(store.getState().save.inventory.length).toBe(41);
  });

  it("claims offline gold and equipment without changing stage progress", () => {
    const save = createDefaultSave();
    const item = createEquipment("armor_scale_vest", 3, "uncommon", new SeededRandom(4));
    const store = new GameStore(save);
    store.dispatch({ type: "offline:claim", gold: 500, items: [item] });
    expect(store.getState().save.gold).toBe(500);
    expect(store.getState().save.inventory).toContainEqual(item);
    expect(store.getState().save.highestClearedStage).toBe(0);
  });

  it("salvages inventory items into gold and clears equipment refs", () => {
    const save = createDefaultSave();
    save.gold = 10;
    const item = createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(2));
    save.inventory.push(item);
    const store = new GameStore(save);
    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    store.dispatch({ type: "item:salvage", itemId: item.instanceId });
    expect(store.getState().save.inventory.find(({ instanceId }) => instanceId === item.instanceId)).toBeUndefined();
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBeNull();
    expect(store.getState().save.gold).toBeGreaterThan(10);
  });

  it("organizes inventory by the default rarity, score, and slot order", () => {
    const save = createDefaultSave();
    save.inventory = [
      {
        instanceId: "low",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "high",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    store.dispatch({ type: "item:organize" });
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId)).toEqual(["high", "low"]);
  });

  it("salvages many selected items in one action", () => {
    const save = createDefaultSave();
    save.gold = 0;
    save.inventory = [
      {
        instanceId: "a",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "b",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "common",
        stage: 1,
        stats: { maxHp: 40, defense: 4 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "c",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    store.dispatch({ type: "item:salvageMany", itemIds: ["a", "b"] });
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId)).toEqual(["c"]);
    expect(store.getState().save.gold).toBeGreaterThan(0);
  });

  it("unequips an item from a hero slot", () => {
    const save = createDefaultSave();
    const item = createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(2));
    save.inventory.push(item);
    const store = new GameStore(save);
    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBe(item.instanceId);
    store.dispatch({ type: "item:unequip", heroId: "H01", itemId: item.instanceId });
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBeNull();
    expect(store.getState().save.inventory).toContainEqual(item);
  });

  it("unlocks and selects every Frostland stage through 2-12", () => {
    const save = createDefaultSave();
    save.currentStage = 23;
    save.highestUnlockedStage = 23;
    save.highestClearedStage = 22;
    const store = new GameStore(save);
    store.dispatch({ type: "stage:victory", stage: 23, gold: 0, items: [] });
    expect(store.getState().save.currentStage).toBe(24);
    expect(store.getState().save.highestUnlockedStage).toBe(24);
    store.dispatch({ type: "stage:select", stage: 24 });
    expect(store.getState().save.currentStage).toBe(24);
  });

  it("unlocks and selects the Red Sands finale", () => {
    const save = createDefaultSave();
    save.currentStage = 35;
    save.highestUnlockedStage = 35;
    save.highestClearedStage = 34;
    const store = new GameStore(save);
    store.dispatch({ type: "stage:victory", stage: 35, gold: 0, items: [] });
    expect(store.getState().save.currentStage).toBe(36);
    expect(store.getState().save.highestUnlockedStage).toBe(36);
    store.dispatch({ type: "stage:select", stage: 36 });
    expect(store.getState().save.currentStage).toBe(36);
  });

  it("unlocks and selects the Stormsea finale", () => {
    const save = createDefaultSave();
    save.currentStage = 47;
    save.highestUnlockedStage = 47;
    save.highestClearedStage = 46;
    const store = new GameStore(save);
    store.dispatch({ type: "stage:victory", stage: 47, gold: 0, items: [] });
    expect(store.getState().save.currentStage).toBe(48);
    expect(store.getState().save.highestUnlockedStage).toBe(48);
    store.dispatch({ type: "stage:select", stage: 48 });
    expect(store.getState().save.currentStage).toBe(48);
  });
});
