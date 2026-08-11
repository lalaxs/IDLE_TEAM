import { describe, expect, it } from "vitest";
import {
  alchemyCandidateItems,
  craftAlchemyItem,
  nextAlchemyRarity,
  pickAlchemyAutoFill,
  validateAlchemyInputs,
} from "../../src/progression/AlchemySystem";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { createDefaultSave } from "../../src/persistence/schema";
import { GameStore } from "../../src/app/GameStore";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("alchemy system", () => {
  it("advances rarity by one step until primordial", () => {
    expect(nextAlchemyRarity("common")).toBe("uncommon");
    expect(nextAlchemyRarity("sacred")).toBe("primordial");
    expect(nextAlchemyRarity("primordial")).toBeNull();
  });

  it("requires nine items of the same grade", () => {
    const items = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, index === 0 ? "rare" : "common", new SeededRandom(index + 1)),
    );
    expect(validateAlchemyInputs(items)).toMatch(/同一品阶/);
  });

  it("crafts nine common items into one uncommon", () => {
    const inputs = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 3, "common", new SeededRandom(10 + index)),
    );
    const outcome = craftAlchemyItem(inputs, new SeededRandom(99));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.toRarity).toBe("uncommon");
    expect(outcome.result.rarity).toBe("uncommon");
    expect(outcome.consumedIds).toHaveLength(9);
  });

  it("auto-fills nine items from densest same-grade pool", () => {
    const commons = Array.from({ length: 10 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(20 + index)),
    );
    const rares = Array.from({ length: 3 }, (_, index) =>
      createEquipment("armor_guard_mail", 1, "rare", new SeededRandom(40 + index)),
    );
    const picked = pickAlchemyAutoFill([...commons, ...rares]);
    expect(picked).toHaveLength(9);
    expect(picked.every((id) => commons.some((item) => item.instanceId === id))).toBe(true);
  });

  it("excludes equipped and primordial gear from candidates", () => {
    const save = createDefaultSave();
    const common = createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(1));
    const equipped = createEquipment("weapon_ranger_bow", 1, "common", new SeededRandom(2));
    save.inventory.push(common, equipped);
    save.roster.H01.equipment.main_weapon = equipped.instanceId;
    const candidates = alchemyCandidateItems(
      save.inventory,
      Object.values(save.roster).map((progress) => progress.equipment),
    );
    expect(candidates.map((item) => item.instanceId)).toEqual([common.instanceId]);
  });
});

describe("alchemy store action", () => {
  it("consumes nine items and inserts the upgraded result", () => {
    const save = createDefaultSave();
    const inputs = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 2, "common", new SeededRandom(50 + index)),
    );
    save.inventory.push(...inputs);
    const store = new GameStore(save);
    store.dispatch({ type: "alchemy:craft", itemIds: inputs.map((item) => item.instanceId) });
    const state = store.getState();
    expect(state.save.inventory).toHaveLength(1);
    expect(state.save.inventory[0]?.rarity).toBe("uncommon");
    expect(state.ui.toast).toMatch(/炼金成功/);
  });
});
