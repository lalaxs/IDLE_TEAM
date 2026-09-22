import { describe, expect, it } from "vitest";
import {
  addAlchemyStationExperience,
  alchemyCandidateItems,
  canAlchemyMiracle,
  craftAlchemyItem,
  getAlchemyGreaterAffixPreview,
  getAlchemyStationLevelCap,
  nextAlchemyRarity,
  pickAlchemyAutoFill,
  rollAlchemyRarity,
  rollAlchemyGreaterAffixCount,
  validateAlchemyInputs,
} from "../../src/progression/AlchemySystem";
import { createEquipment, getGreaterAffixCount } from "../../src/progression/EquipmentSystem";
import { createDefaultSave } from "../../src/persistence/schema";
import { GameStore } from "../../src/app/GameStore";
import type { AppEvent } from "../../src/app/events";
import { SeededRandom, type RandomSource } from "../../src/simulation/RandomSource";

class FixedRandom implements RandomSource {
  constructor(private readonly value: number) {}
  next(): number { return this.value; }
  int(min: number, max: number): number {
    return Math.min(max, min + Math.floor(this.value * (max - min + 1)));
  }
  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)]!;
  }
}

function createStarredAlchemyInputs(starEnergy: number) {
  const inputs = Array.from({ length: 9 }, (_, index) =>
    createEquipment("weapon_guard_blade", 120, "epic", new SeededRandom(300 + index), 100),
  );
  let remaining = starEnergy;
  for (const item of inputs) {
    for (const affix of item.affixes) {
      if (remaining <= 0) return inputs;
      affix.greater = true;
      remaining -= 1;
    }
  }
  return inputs;
}

describe("alchemy system", () => {
  it("advances rarity by one step until primordial", () => {
    expect(nextAlchemyRarity("common")).toBe("uncommon");
    expect(nextAlchemyRarity("sacred")).toBe("primordial");
    expect(nextAlchemyRarity("primordial")).toBeNull();
  });

  it("resolves only normal promotion or a rare two-grade miracle", () => {
    expect(canAlchemyMiracle("common")).toBe(true);
    expect(canAlchemyMiracle("astral")).toBe(true);
    expect(canAlchemyMiracle("sacred")).toBe(false);
    expect(canAlchemyMiracle("primordial")).toBe(false);
    expect(rollAlchemyRarity("common", new FixedRandom(0))).toEqual({
      rarity: "rare",
      miracle: true,
    });
    expect(rollAlchemyRarity("common", new FixedRandom(0.99))).toEqual({
      rarity: "uncommon",
      miracle: false,
    });
    expect(rollAlchemyRarity("sacred", new FixedRandom(0))).toEqual({
      rarity: "primordial",
      miracle: false,
    });
  });

  it("requires nine items of the same grade", () => {
    const items = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, index === 0 ? "rare" : "common", new SeededRandom(index + 1)),
    );
    expect(validateAlchemyInputs(items)).toMatch(/同一品阶/);
  });

  it("requires nine items of the same equipment level", () => {
    const items = Array.from({ length: 9 }, (_, index) =>
      createEquipment(
        "weapon_guard_blade",
        1,
        "common",
        new SeededRandom(index + 1),
        index === 0 ? 10 : 15,
      ),
    );
    expect(validateAlchemyInputs(items)).toMatch(/同一等级/);
  });

  it("crafts nine common items into one uncommon", () => {
    const inputs = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 3, "common", new SeededRandom(10 + index), 10),
    );
    const outcome = craftAlchemyItem(inputs, 1, new FixedRandom(0.99));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.toRarity).toBe("uncommon");
    expect(outcome.result.rarity).toBe("uncommon");
    expect(outcome.resultLevel).toBe(10);
    expect(outcome.consumedIds).toHaveLength(9);
  });

  it("caps an over-level synthesis at the station limit", () => {
    const inputs = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 30, "common", new SeededRandom(70 + index), 30),
    );
    const outcome = craftAlchemyItem(inputs, 1, new SeededRandom(100));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(getAlchemyStationLevelCap(1)).toBe(20);
    expect(outcome.sourceLevel).toBe(30);
    expect(outcome.resultLevel).toBe(20);
    expect(outcome.result.level).toBe(20);
  });

  it("levels the station with synthesis experience", () => {
    expect(addAlchemyStationExperience({ level: 1, exp: 80 }, 10)).toEqual({
      station: { level: 2, exp: 0 },
      levelsGained: 1,
    });
  });

  it("auto-fills nine items from densest same-grade pool", () => {
    const commons = Array.from({ length: 10 }, (_, index) =>
      createEquipment("weapon_guard_blade", 1, "common", new SeededRandom(20 + index)),
    );
    const rares = Array.from({ length: 3 }, (_, index) =>
      createEquipment("armor_guard_mail", 1, "rare", new SeededRandom(40 + index)),
    );
    const picked = pickAlchemyAutoFill([...commons, ...rares], 1);
    expect(picked).toHaveLength(9);
    expect(picked.every((id) => commons.some((item) => item.instanceId === id))).toBe(true);
  });

  it("auto-fill keeps one level band and does not consume gear above the station cap", () => {
    const level20 = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 20, "common", new SeededRandom(120 + index), 20),
    );
    const level30 = Array.from({ length: 12 }, (_, index) =>
      createEquipment("weapon_guard_blade", 30, "common", new SeededRandom(150 + index), 30),
    );
    const picked = pickAlchemyAutoFill([...level20, ...level30], 1);
    expect(picked).toHaveLength(9);
    expect(picked.every((id) => level20.some((item) => item.instanceId === id))).toBe(true);
  });

  it("turns consumed Greater Affixes into cumulative output-star chances", () => {
    expect(getAlchemyGreaterAffixPreview(createStarredAlchemyInputs(1))).toEqual({
      energy: 1,
      oneOrMoreChancePct: 20,
      twoOrMoreChancePct: 0,
      threeChancePct: 0,
    });
    expect(getAlchemyGreaterAffixPreview(createStarredAlchemyInputs(5))).toEqual({
      energy: 5,
      oneOrMoreChancePct: 100,
      twoOrMoreChancePct: 24,
      threeChancePct: 0,
    });
    expect(getAlchemyGreaterAffixPreview(createStarredAlchemyInputs(9))).toEqual({
      energy: 9,
      oneOrMoreChancePct: 100,
      twoOrMoreChancePct: 72,
      threeChancePct: 8,
    });
  });

  it("uses one roll to resolve zero through three inherited Greater Affixes", () => {
    const preview = getAlchemyGreaterAffixPreview(createStarredAlchemyInputs(9));
    expect(rollAlchemyGreaterAffixCount(preview, new FixedRandom(0.05))).toBe(3);
    expect(rollAlchemyGreaterAffixCount(preview, new FixedRandom(0.5))).toBe(2);
    expect(rollAlchemyGreaterAffixCount(preview, new FixedRandom(0.9))).toBe(1);
    expect(rollAlchemyGreaterAffixCount(
      getAlchemyGreaterAffixPreview(createStarredAlchemyInputs(1)),
      new FixedRandom(0.3),
    )).toBe(0);
  });

  it("rerolls inherited stars onto the crafted item", () => {
    const outcome = craftAlchemyItem(createStarredAlchemyInputs(9), 9, new FixedRandom(0));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.greaterAffixEnergy).toBe(9);
    expect(outcome.greaterAffixCount).toBe(3);
    expect(getGreaterAffixCount(outcome.result)).toBe(3);
  });

  it("does not create Greater Affixes when the station caps the result below level 100", () => {
    const outcome = craftAlchemyItem(createStarredAlchemyInputs(9), 1, new FixedRandom(0));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.resultLevel).toBe(20);
    expect(outcome.greaterAffixEnergy).toBe(9);
    expect(outcome.greaterAffixCount).toBe(0);
  });

  it("allows automatic fill to select Greater Affix gear", () => {
    const normal = Array.from({ length: 9 }, (_, index) =>
      createEquipment("weapon_guard_blade", 120, "epic", new SeededRandom(400 + index), 100),
    );
    const starred = createEquipment("weapon_guard_blade", 120, "epic", new SeededRandom(450), 100);
    starred.affixes[0]!.greater = true;
    const picked = pickAlchemyAutoFill([starred, ...normal], 9);
    expect(picked).toHaveLength(9);
    expect(picked).toContain(starred.instanceId);
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
    inputs[0]!.sockets = [{ gemId: "gem_skill_2" }];
    save.materials.gem_skill_2 = 0;
    save.inventory.push(...inputs);
    const store = new GameStore(save);
    const events: AppEvent[] = [];
    store.subscribe((_state, emitted) => events.push(...emitted));
    store.dispatch({ type: "alchemy:craft", itemIds: inputs.map((item) => item.instanceId) });
    const state = store.getState();
    expect(state.save.inventory).toHaveLength(1);
    expect(["uncommon", "rare"]).toContain(state.save.inventory[0]?.rarity);
    expect(state.save.alchemyStation.exp).toBeGreaterThan(0);
    expect(state.save.materials.gem_skill_2).toBe(1);
    expect(state.ui.toast).toContain(state.save.inventory[0]?.rarity === "rare" ? "奇迹升品" : "炼金成功");
    expect(events.find((event) => event.type === "alchemy:crafted")).toMatchObject({
      stationLevelBefore: 1,
      stationExperienceBefore: 0,
      stationExperienceAfter: 9,
      stationExperience: 9,
      stationLevel: 1,
    });
    expect(events.find((event) => event.type === "gems:returned")).toMatchObject({
      source: "alchemy",
      count: 1,
      gems: { gem_skill_2: 1 },
    });
  });
});
