import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/app/GameSession";
import { createDefaultSave } from "../../src/persistence/schema";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";

function clearStageWithDebug(session: GameSession): void {
  for (let wave = 0; wave < 3; wave += 1) {
    session.debugDefeatEnemies();
    for (let tick = 0; tick < 40; tick += 1) {
      session.step(50);
      if (session.snapshot.state === "victory") break;
      if (session.snapshot.units.some(({ team, alive }) => team === "enemies" && alive)) break;
    }
  }
}

describe("GameSession", () => {
  it("awards and advances exactly once after a three-wave victory", () => {
    const session = new GameSession(createDefaultSave(), 42);
    clearStageWithDebug(session);
    const goldAfterVictory = session.store.getState().save.gold;
    expect(session.store.getState().save.highestClearedStage).toBe(1);
    expect(session.store.getState().save.currentStage).toBe(2);
    expect(goldAfterVictory).toBeGreaterThan(0);
    session.step(1000);
    expect(session.store.getState().save.gold).toBe(goldAfterVictory);
  });

  it("restarts the selected stage with the latest party", () => {
    const session = new GameSession(createDefaultSave(), 42);
    session.store.dispatch({
      type: "party:commit",
      party: ["H01", "H02", "H03", "H04", "H06"],
    });
    session.restart();
    expect(session.snapshot.units.some(({ sourceId }) => sourceId === "H06")).toBe(true);
    expect(session.snapshot.wave).toBe(1);
  });

  it("continues into the next stage with a staggered left-edge entry", () => {
    const session = new GameSession(createDefaultSave(), 42);
    clearStageWithDebug(session);

    session.continueToNextStage();

    expect(session.snapshot.stage).toBe(2);
    expect(session.snapshot.state).toBe("travelling");
    const heroes = session.snapshot.units.filter(({ team }) => team === "heroes");
    expect(heroes.length).toBeGreaterThan(1);
    expect(Math.max(...heroes.map(({ x }) => x))).toBeLessThan(0);
    const xs = heroes.map(({ x }) => x);
    expect(new Set(xs).size).toBe(xs.length);
  });

  it("starts an automatic stage continuation with a march before enemies arrive", () => {
    const save = createDefaultSave();
    save.currentStage = 2;
    const session = new GameSession(save, 42);

    session.continueToNextStage();

    expect(session.snapshot.stage).toBe(2);
    expect(session.snapshot.state).toBe("travelling");
    expect(session.snapshot.units.filter(({ team }) => team === "enemies")).toHaveLength(0);
  });

  it("applies equipped item stats to the battle snapshot", () => {
    const save = createDefaultSave();
    const weapon = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(3));
    save.inventory.push(weapon);
    save.roster.H01.equipment.main_weapon = weapon.instanceId;
    const session = new GameSession(save, 42);
    const lorne = session.snapshot.units.find(({ sourceId }) => sourceId === "H01");
    const flatAttack = weapon.affixes
      .filter(({ affixId }) => affixId === "flat_attack")
      .reduce((sum, { value }) => sum + value, 0);
    expect(lorne?.attack).toBe(90 + (weapon.stats.attack ?? 0) + flatAttack);
  });

  it("refreshes live hero stats after leveling without resetting the wave", () => {
    const save = createDefaultSave();
    save.gold = 80;
    const session = new GameSession(save, 42);
    session.store.dispatch({ type: "hero:levelUp", heroId: "H01" });
    expect(session.snapshot.units.find(({ sourceId }) => sourceId === "H01")?.maxHp).toBe(1643);
    expect(session.snapshot.wave).toBe(1);
  });

  it("carries all equipped combat traits into hero rule state", () => {
    const save = createDefaultSave();
    const definitions = [
      ["H01", "weapon_guard_blade", "sharp"],
      ["H01", "armor_guard_mail", "guardian"],
      ["H01", "accessory_leaf_charm", "renewal"],
      ["H02", "weapon_ranger_bow", "execute"],
      ["H02", "armor_scale_vest", "thorns"],
      ["H02", "accessory_sun_ring", "focus"],
      ["H03", "weapon_oak_staff", "swift"],
      ["H03", "armor_leaf_robe", "tenacious"],
      ["H03", "accessory_rune_stone", "precision"],
    ] as const;
    for (const [heroId, definitionId, traitId] of definitions) {
      const item = createEquipment(definitionId, 8, "epic", new SeededRandom(traitId.length));
      item.rarity = "epic";
      item.traitId = traitId;
      item.affixes = [];
      save.inventory.push(item);
      save.roster[heroId].equipment[item.slot] = item.instanceId;
    }
    const session = new GameSession(save, 42);
    const lorne = session.snapshot.units.find(({ sourceId }) => sourceId === "H01")!;
    const bran = session.snapshot.units.find(({ sourceId }) => sourceId === "H02")!;
    expect(lorne.passiveFlags.gearSkillDamage).toBe(0.12);
    expect(lorne.passiveFlags.gearGuardian).toBe(0.12);
    expect(lorne.passiveFlags.gearRenewal).toBe(0.1);
    expect(bran.passiveFlags.gearExecute).toBe(0.18);
    expect(bran.passiveFlags.gearThorns).toBe(0.12);
  });

  it("carries all three Frostland traits into hero rule state", () => {
    const save = createDefaultSave();
    const definitions = [
      ["weapon_frost_fang_saber", "frostbite"],
      ["armor_snow_travel_coat", "snowguard"],
      ["accessory_cold_star_pendant", "frostfocus"],
    ] as const;
    for (const [definitionId, traitId] of definitions) {
      const item = createEquipment(definitionId, 13, "rare", new SeededRandom(2));
      item.traitId = traitId;
      item.affixes = [];
      save.inventory.push(item);
      save.roster.H01.equipment[item.slot] = item.instanceId;
    }
    const session = new GameSession(save, 42);
    const lorne = session.snapshot.units.find(({ sourceId }) => sourceId === "H01")!;
    expect(lorne.passiveFlags.gearFrostbiteChance).toBe(0.15);
    expect(lorne.passiveFlags.gearSnowguard).toBe(0.06);
    expect(lorne.passiveFlags.gearFrostfocus).toBe(0.18);
  });

  it("carries all three Red Sands traits into hero rule state", () => {
    const save = createDefaultSave();
    const definitions = [
      ["weapon_dune_crescent_sickle", "sandscar"],
      ["armor_dustwalker_mantle", "mirageguard"],
      ["accessory_scarab_seal", "tailwind"],
    ] as const;
    for (const [definitionId, traitId] of definitions) {
      const item = createEquipment(definitionId, 25, "rare", new SeededRandom(2));
      item.traitId = traitId;
      item.affixes = [];
      save.inventory.push(item);
      save.roster.H01.equipment[item.slot] = item.instanceId;
    }
    const session = new GameSession(save, 42);
    const lorne = session.snapshot.units.find(({ sourceId }) => sourceId === "H01")!;
    expect(lorne.passiveFlags.gearSandscarChance).toBe(0.15);
    expect(lorne.passiveFlags.gearMirageGuard).toBe(0.2);
    expect(lorne.passiveFlags.gearTailwind).toBe(0.15);
  });

  it("carries all three Stormsea traits into hero rule state", () => {
    const save = createDefaultSave();
    const definitions = [
      ["weapon_cloudsplitter_glaive", "thunderbrand"],
      ["armor_cloudwarden_cloak", "cloudveil"],
      ["accessory_stormeye_brooch", "stormward"],
    ] as const;
    for (const [definitionId, traitId] of definitions) {
      const item = createEquipment(definitionId, 37, "rare", new SeededRandom(2));
      item.traitId = traitId;
      item.affixes = [];
      save.inventory.push(item);
      save.roster.H01.equipment[item.slot] = item.instanceId;
    }
    const session = new GameSession(save, 42);
    const lorne = session.snapshot.units.find(({ sourceId }) => sourceId === "H01")!;
    expect(lorne.passiveFlags.gearThunderbrand).toBe(0.35);
    expect(lorne.passiveFlags.gearCloudveil).toBe(0.12);
    expect(lorne.passiveFlags.gearStormward).toBe(0.1);
  });
});
