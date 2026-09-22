import { describe, expect, it } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { RELEASED_HERO_DEFINITIONS } from "../../src/content/heroes";
import { HERO_SKILL_CHANGE_GOLD_COST } from "../../src/content/heroSkills";
import { createDefaultSave } from "../../src/persistence/schema";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { TALENT_RESET_GOLD_COST } from "../../src/progression/TalentSystem";
import { SOCKET_GOLD_COST } from "../../src/progression/GearCraftSystem";
import { SeededRandom, type RandomSource } from "../../src/simulation/RandomSource";
import type { AppEvent } from "../../src/app/events";

class SequenceRandom implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[], private readonly fallback = 0.99) {}

  next(): number {
    return this.values[this.index++] ?? this.fallback;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)]!;
  }
}

describe("GameStore meta loop", () => {
  it("unlocks H60 then H08 through the ordered summon sequence", () => {
    const save = createDefaultSave();
    const store = new GameStore(save);
    store.dispatch({ type: "summon:single" });
    expect(store.getState().save.roster.H60?.unlocked).toBe(true);
    store.getState().save.gems = 100;
    store.dispatch({ type: "summon:single" });
    expect(store.getState().save.roster.H08?.unlocked).toBe(true);
  });

  it("limits the release pool and guarantees a hero in every five-pull", () => {
    const save = createDefaultSave();
    save.gems = 1000;
    save.summonCount = 2;
    for (const hero of RELEASED_HERO_DEFINITIONS) {
      save.roster[hero.id].unlocked = true;
    }
    const store = new GameStore(save, new SequenceRandom([0.99, 0.99, 0.99, 0.99, 0.99, 0.99]));
    let resultCount = 0;
    store.subscribe((_state, events) => {
      const completed = events.find((event) => event.type === "summon:completed");
      if (completed?.type === "summon:completed") {
        resultCount = completed.results.length;
        expect(completed.results.filter((pull) => pull.kind === "marks")).toHaveLength(1);
        expect(completed.results.filter((pull) => pull.kind === "gold")).toHaveLength(4);
      }
    });
    store.dispatch({ type: "summon:five" });
    expect(resultCount).toBe(5);
    expect(store.getState().save.roster.H41.unlocked).toBe(false);
  });

  it("grants one universal fragment and lets it cover a star-up shortfall", () => {
    const save = createDefaultSave();
    save.gems = 100;
    save.summonCount = 2;
    const store = new GameStore(save, new SequenceRandom([0.5]));

    store.dispatch({ type: "summon:single" });
    expect(store.getState().save.universalHeroMarks).toBe(1);

    save.roster.H35.stars = 1;
    save.roster.H35.marks = 1;
    store.dispatch({ type: "hero:starUp", heroId: "H35" });
    expect(save.roster.H35).toMatchObject({ stars: 2, marks: 0 });
    expect(save.universalHeroMarks).toBe(0);
  });

  it("spends starstones to select a 72-hour personal summon theme", () => {
    const save = createDefaultSave(1_000);
    save.gems = 100;
    const store = new GameStore(save);
    store.dispatch({ type: "summon:selectTheme", classId: "hunter", now: 5_000 });
    expect(save.gems).toBe(50);
    expect(save.personalSummonTheme).toEqual({
      classId: "hunter",
      expiresAt: 5_000 + 3 * 24 * 60 * 60 * 1000,
    });
  });

  it("resets a personal summon theme without spending starstones", () => {
    const save = createDefaultSave(1_000);
    save.gems = 100;
    save.personalSummonTheme = { classId: "hunter", expiresAt: 50_000 };
    const store = new GameStore(save);

    store.dispatch({ type: "summon:resetTheme" });

    expect(save.gems).toBe(100);
    expect(save.personalSummonTheme).toBeNull();
  });

  it("guarantees the active-theme hero on the tenth miss", () => {
    const save = createDefaultSave();
    save.gems = 100;
    save.summonCount = 2;
    save.summonThemeMisses = 9;
    save.personalSummonTheme = { classId: "hunter", expiresAt: Number.MAX_SAFE_INTEGER };
    const store = new GameStore(save, new SequenceRandom([0.4]));
    let result: AppEvent | undefined;
    store.subscribe((_state, events) => {
      result = events.find((event) => event.type === "summon:completed");
    });
    store.dispatch({ type: "summon:single" });
    expect(result?.type).toBe("summon:completed");
    if (result?.type === "summon:completed") {
      const pull = result.results[0]!;
      expect(pull.kind === "unlock" || pull.kind === "marks").toBe(true);
      if (pull.kind === "unlock" || pull.kind === "marks") {
        const hero = RELEASED_HERO_DEFINITIONS.find(({ id }) => id === pull.heroId);
        expect(hero?.classId).toBe("hunter");
      }
    }
    expect(save.summonThemeMisses).toBe(0);
  });

  it("rejects duplicate heroes in a saved party", () => {
    const store = new GameStore(createDefaultSave());
    expect(() =>
      store.dispatch({
        type: "party:commit",
        party: ["H35", "H35", "H03", "H04", "H57"],
      }),
    ).toThrow("duplicate");
  });

  it("unlocks party slots progressively through chapter one", () => {
    const save = createDefaultSave();
    const store = new GameStore(save);
    expect(() =>
      store.dispatch({ type: "party:commit", party: ["H35", "H02", null, null, null] }),
    ).toThrow("locked slot");

    save.highestClearedStage = 1;
    store.dispatch({ type: "party:commit", party: ["H35", "H02", null, null, null] });
    expect(store.getState().save.party).toEqual(["H35", "H02", null, null, null]);

    expect(() =>
      store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", null, null] }),
    ).toThrow("locked slot");

    save.highestClearedStage = 3;
    store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", null, null] });
    expect(store.getState().save.party).toEqual(["H35", "H02", "H03", null, null]);

    save.highestClearedStage = 9;
    store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", "H04", null] });
    expect(() =>
      store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", "H04", "H57"] }),
    ).toThrow("locked slot");

    save.highestClearedStage = 12;
    expect(() =>
      store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", "H04", "H57"] }),
    ).toThrow("locked slot");

    save.highestClearedStage = 17;
    store.dispatch({ type: "party:commit", party: ["H35", "H02", "H03", "H04", "H57"] });
    expect(store.getState().save.party).toEqual(["H35", "H02", "H03", "H04", "H57"]);
  });

  it("spends experience currency to complete a hero's partial experience", () => {
    const save = createDefaultSave();
    save.exp = 5;
    save.roster.H06.experience = 7;
    save.gold = 0;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:levelUp", heroId: "H06" });
    expect(store.getState().save.roster.H06?.level).toBe(2);
    expect(store.getState().save.exp).toBe(0);
  });

  it("allows experience-currency leveling for a deployed hero", () => {
    const save = createDefaultSave();
    save.exp = 10;
    save.roster.H01.experience = 2;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:levelUp", heroId: "H01" });
    expect(store.getState().save.roster.H01).toMatchObject({ level: 2, experience: 0 });
    expect(store.getState().save.exp).toBe(0);
  });

  it("grants battle experience once to the shared pool", () => {
    const save = createDefaultSave();
    save.highestClearedStage = 12;
    save.party = ["H01", "H02", null, null, null];
    save.roster.H01.experience = 55;
    const store = new GameStore(save);

    store.dispatch({ type: "stage:victory", stage: 13, gold: 0, exp: 10, items: [] });

    expect(store.getState().save.roster.H01).toMatchObject({ level: 1, experience: 55 });
    expect(store.getState().save.roster.H02).toMatchObject({ level: 1, experience: 0 });
    expect(store.getState().save.roster.H06.experience).toBe(0);
    expect(store.getState().save.exp).toBe(130);
  });

  it("holds a first-clear starstone gift until the player claims it", () => {
    const store = new GameStore(createDefaultSave());

    store.dispatch({ type: "stage:victory", stage: 1, gold: 0, exp: 0, items: [] });
    expect(store.getState().save.gems).toBe(300);
    expect(store.getState().save.claimedStageGiftStages).toEqual([]);

    store.dispatch({ type: "stageGift:claim", stage: 1 });
    expect(store.getState().save.gems).toBe(320);
    expect(store.getState().save.claimedStageGiftStages).toEqual([1]);

    store.dispatch({ type: "stageGift:claim", stage: 1 });
    expect(store.getState().save.gems).toBe(320);
  });

  it("ascends a one-star hero at the first level cap without resetting stars", () => {
    const save = createDefaultSave();
    save.roster.H01.unlocked = true;
    save.roster.H01.stars = 1;
    save.roster.H01.ascendLevel = 0;
    save.roster.H01.level = 20;
    save.materials.mat_ascend_stone = 3;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:ascend", heroId: "H01" });
    expect(store.getState().save.roster.H01.ascendLevel).toBe(1);
    expect(store.getState().save.roster.H01.stars).toBe(1);
    expect(store.getState().save.materials.mat_ascend_stone).toBe(2);
    store.dispatch({ type: "hero:ascend", heroId: "H01" });
    expect(store.getState().save.roster.H01.ascendLevel).toBe(1);
  });

  it("rejects the first ascend before one star", () => {
    const save = createDefaultSave();
    save.roster.H01.stars = 0;
    save.roster.H01.ascendLevel = 0;
    save.roster.H01.level = 20;
    save.materials.mat_ascend_stone = 3;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:ascend", heroId: "H01" });
    expect(store.getState().save.roster.H01.ascendLevel).toBe(0);
    expect(store.getState().save.materials.mat_ascend_stone).toBe(3);
  });

  it("rejects ascend before the current level cap", () => {
    const save = createDefaultSave();
    save.roster.H01.stars = 1;
    save.roster.H01.ascendLevel = 0;
    save.roster.H01.level = 19;
    save.materials.mat_ascend_stone = 3;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:ascend", heroId: "H01" });
    expect(store.getState().save.roster.H01.ascendLevel).toBe(0);
  });

  it("advances from silver to gold without storing level-dependent stat gains", () => {
    const save = createDefaultSave();
    save.roster.H06.marks = 5;
    save.roster.H06.stars = 5;
    save.roster.H06.ascendLevel = 0;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:starUp", heroId: "H06" });
    expect(store.getState().save.roster.H06.stars).toBe(6);
    expect(store.getState().save.roster.H06.marks).toBe(0);
    expect("starFlatHp" in store.getState().save.roster.H06).toBe(false);
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

  it("keeps gems on replaced gear until the player chooses to return them", () => {
    const save = createDefaultSave();
    const oldItem = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(31));
    const newItem = createEquipment("weapon_oak_staff", 1, "rare", new SeededRandom(32));
    oldItem.sockets = [{ gemId: "gem_atk_2" }];
    save.inventory.push(oldItem, newItem);
    save.roster.H01.equipment.main_weapon = oldItem.instanceId;
    save.materials.gem_atk_2 = 0;
    const store = new GameStore(save);
    const events: AppEvent[] = [];
    store.subscribe((_state, emitted) => events.push(...emitted));

    store.dispatch({ type: "item:equip", heroId: "H01", itemId: newItem.instanceId });

    expect(store.getState().save.roster.H01.equipment.main_weapon).toBe(newItem.instanceId);
    expect(oldItem.sockets).toEqual([{ gemId: "gem_atk_2" }]);
    expect(events.find((event) => event.type === "item:equipped")).toMatchObject({
      itemId: newItem.instanceId,
      replacedItemId: oldItem.instanceId,
    });

    store.dispatch({ type: "item:returnGems", itemId: oldItem.instanceId });
    expect(oldItem.sockets).toEqual([{ gemId: null }]);
    expect(store.getState().save.materials.gem_atk_2).toBe(1);
    expect(events.find((event) => event.type === "gems:returned")).toMatchObject({
      source: "equipment",
      count: 1,
    });
  });

  it("requires the hero to reach the equipment level", () => {
    const save = createDefaultSave();
    const item = createEquipment("weapon_cloudsplitter_glaive", 120, "epic", new SeededRandom(9));
    save.inventory.push(item);
    const store = new GameStore(save);

    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBeNull();
    expect(store.getState().ui.toast).toBe("需要英雄达到 100 级");

    store.getState().save.roster.H01.level = 100;
    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBe(item.instanceId);
  });

  it("auto-equips the strongest available items into empty slots and replaces weaker gear", () => {
    const save = createDefaultSave();
    save.roster.H01.unlocked = true;
    save.inventory = [
      {
        instanceId: "current-weapon",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 4 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "stronger-weapon",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 100 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "weak-armor",
        definitionId: "armor_travel_cloak",
        slot: "armor",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { maxHp: 20 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "best-armor",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { maxHp: 200, defense: 20 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "claimed-ring",
        definitionId: "ring_moss_band",
        slot: "ring",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 100 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "available-ring",
        definitionId: "ring_ember_loop",
        slot: "ring",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 5 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "locked-boots",
        definitionId: "boots_trail_sandals",
        slot: "boots",
        rarity: "common",
        level: 5,
        stage: 1,
        stats: { defense: 100 },
        affixes: [],
        traitId: null,
      },
    ];
    save.roster.H01.equipment.main_weapon = "current-weapon";
    save.roster.H02.equipment.ring = "claimed-ring";
    const store = new GameStore(save);

    store.dispatch({ type: "item:autoEquip", heroId: "H01" });

    expect(store.getState().save.roster.H01.equipment.main_weapon).toBe("stronger-weapon");
    expect(store.getState().save.roster.H01.equipment.armor).toBe("best-armor");
    expect(store.getState().save.roster.H01.equipment.ring).toBe("available-ring");
    expect(store.getState().save.roster.H01.equipment.boots).toBeNull();
    expect(store.getState().save.roster.H02.equipment.ring).toBe("claimed-ring");
    expect(store.getState().ui.toast).toBe("已自动装备 3 件");
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
    store.dispatch({ type: "offline:claim", gold: 500, exp: 200, items: [item] });
    expect(store.getState().save.gold).toBe(500);
    expect(store.getState().save.exp).toBe(createDefaultSave().exp + 200);
    expect(store.getState().save.inventory).toContainEqual(item);
    expect(store.getState().save.highestClearedStage).toBe(0);
  });

  it("salvages inventory items into gold and clears equipment refs", () => {
    const save = createDefaultSave();
    save.gold = 10;
    const item = createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(2));
    item.setId = "set_moss_crown";
    item.sockets = [{ gemId: "gem_resist_3" }];
    save.materials.gem_resist_3 = 0;
    save.inventory.push(item);
    const store = new GameStore(save);
    store.dispatch({ type: "item:equip", heroId: "H01", itemId: item.instanceId });
    store.dispatch({ type: "item:salvage", itemId: item.instanceId });
    expect(store.getState().save.inventory.find(({ instanceId }) => instanceId === item.instanceId)).toBeUndefined();
    expect(store.getState().save.roster.H01.equipment.main_weapon).toBeNull();
    expect(store.getState().save.gold).toBeGreaterThan(10);
    expect(store.getState().save.setEssences.set_moss_crown).toBe(1);
    expect(store.getState().save.materials.gem_resist_3).toBe(1);
    expect(store.getState().ui.toast).toContain("苔冠守望精华 +1");
  });

  it("spends set essence and an inscription stone to add a set tag", () => {
    const save = createDefaultSave();
    save.setEssences.set_moss_crown = 4;
    save.materials.mat_set_inscription = 1;
    const item = createEquipment("weapon_ranger_bow", 97, "epic", new SeededRandom(11));
    save.inventory.push(item);
    const store = new GameStore(save);
    const beforeTrait = item.traitId;

    store.dispatch({ type: "craft:imprint", itemId: item.instanceId, setId: "set_moss_crown" });

    expect(item.setId).toBe("set_moss_crown");
    expect(item.traitId).toBe(beforeTrait);
    expect(store.getState().save.setEssences.set_moss_crown).toBe(0);
    expect(store.getState().save.materials.mat_set_inscription).toBe(0);
  });

  it("charges both socket stones and gold when opening a socket", () => {
    const save = createDefaultSave();
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(12));
    save.inventory.push(item);
    save.materials.mat_socket_stone = 1;
    save.gold = SOCKET_GOLD_COST - 1;
    const store = new GameStore(save);
    const events: AppEvent[] = [];
    store.subscribe((_state, emitted) => events.push(...emitted));

    store.dispatch({ type: "craft:socket", itemId: item.instanceId });
    expect(item.sockets).toHaveLength(0);
    expect(store.getState().save.materials.mat_socket_stone).toBe(1);
    expect(store.getState().save.gold).toBe(SOCKET_GOLD_COST - 1);
    expect(events).toContainEqual({ type: "toast", message: "金币不足" });

    store.getState().save.gold = SOCKET_GOLD_COST;
    store.dispatch({ type: "craft:socket", itemId: item.instanceId });
    expect(item.sockets).toHaveLength(1);
    expect(store.getState().save.materials.mat_socket_stone).toBe(0);
    expect(store.getState().save.gold).toBe(0);
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
    store.dispatch({ type: "stage:victory", stage: 23, gold: 0, exp: 0, items: [] });
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
    store.dispatch({ type: "stage:victory", stage: 35, gold: 0, exp: 0, items: [] });
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
    store.dispatch({ type: "stage:victory", stage: 47, gold: 0, exp: 0, items: [] });
    expect(store.getState().save.currentStage).toBe(48);
    expect(store.getState().save.highestUnlockedStage).toBe(48);
    store.dispatch({ type: "stage:select", stage: 48 });
    expect(store.getState().save.currentStage).toBe(48);
  });

  it("spends talent points and unlocks a shared hero skill at 20", () => {
    const save = createDefaultSave();
    save.roster.H01.unlocked = true;
    save.roster.H01.level = 20;
    save.roster.H01.ascendLevel = 1;
    save.gold = TALENT_RESET_GOLD_COST;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:talentUp", heroId: "H01", talentId: "foundation_power" });
    expect(store.getState().save.roster.H01.talentRanks.foundation_power).toBe(1);
    store.dispatch({ type: "hero:chooseSkill", heroId: "H01", skillId: "iron-wall" });
    expect(store.getState().save.roster.H01.chosenSkillId).toBe("iron-wall");
    store.dispatch({ type: "hero:talentReset", heroId: "H01" });
    expect(store.getState().save.roster.H01.talentRanks).toEqual({});
    expect(store.getState().save.gold).toBe(0);
  });

  it("keeps the first shared passive free and charges gold for later changes", () => {
    const save = createDefaultSave();
    save.roster.H01.unlocked = true;
    save.roster.H01.level = 20;
    save.roster.H01.ascendLevel = 1;
    save.gold = HERO_SKILL_CHANGE_GOLD_COST;
    const store = new GameStore(save);

    store.dispatch({ type: "hero:chooseSkill", heroId: "H01", skillId: "iron-wall" });
    expect(store.getState().save.roster.H01.chosenSkillId).toBe("iron-wall");
    expect(store.getState().save.gold).toBe(HERO_SKILL_CHANGE_GOLD_COST);

    store.dispatch({ type: "hero:chooseSkill", heroId: "H01", skillId: "quake-slash" });
    expect(store.getState().save.roster.H01.chosenSkillId).toBe("quake-slash");
    expect(store.getState().save.gold).toBe(0);

    store.dispatch({ type: "hero:chooseSkill", heroId: "H01", skillId: "meteor" });
    expect(store.getState().save.roster.H01.chosenSkillId).toBe("quake-slash");
    expect(store.getState().save.gold).toBe(0);
  });

  it("unlocks a fresh hard campaign only after easy 10-12 is cleared", () => {
    const save = createDefaultSave();
    save.currentStage = 120;
    save.highestUnlockedStage = 120;
    save.highestClearedStage = 119;
    save.difficultyProgress.easy = { highestUnlockedStage: 120, highestClearedStage: 119 };
    const store = new GameStore(save);

    expect(() => store.dispatch({ type: "stage:select", stage: 1, difficulty: "hard" }))
      .toThrow("Difficulty is locked");
    store.dispatch({ type: "stage:victory", stage: 120, gold: 0, exp: 0, items: [] });
    store.dispatch({ type: "stage:select", stage: 1, difficulty: "hard" });
    expect(store.getState().save.selectedDifficulty).toBe("hard");
    expect(store.getState().save.difficultyProgress.hard).toEqual({
      highestUnlockedStage: 1,
      highestClearedStage: 0,
    });
    expect(() => store.dispatch({ type: "stage:select", stage: 2, difficulty: "hard" }))
      .toThrow("Stage is locked");
    store.dispatch({ type: "stage:victory", stage: 1, gold: 0, exp: 0, items: [] });
    store.dispatch({ type: "stage:select", stage: 2, difficulty: "hard" });
    expect(store.getState().save.currentStage).toBe(2);
    expect(() => store.dispatch({ type: "stage:select", stage: 1, difficulty: "nightmare" }))
      .toThrow("Difficulty is locked");
  });

  it("does not reset talents when gold is insufficient", () => {
    const save = createDefaultSave();
    save.roster.H01.unlocked = true;
    save.roster.H01.level = 20;
    save.gold = TALENT_RESET_GOLD_COST - 1;
    const store = new GameStore(save);
    store.dispatch({ type: "hero:talentUp", heroId: "H01", talentId: "foundation_power" });
    store.dispatch({ type: "hero:talentReset", heroId: "H01" });
    expect(store.getState().save.roster.H01.talentRanks.foundation_power).toBe(1);
    expect(store.getState().save.gold).toBe(TALENT_RESET_GOLD_COST - 1);
  });
});
