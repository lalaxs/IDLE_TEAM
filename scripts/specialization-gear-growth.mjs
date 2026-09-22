import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { createBuildFixtures } from "./specialization-builds.mjs";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const load = (path) => server.ssrLoadModule(path);
  const { roster, fixtures } = await createBuildFixtures(load);
  const fixture = fixtures.find(({ profile }) => profile.id === "grown100");
  const { createDefaultSave } = await load("/src/persistence/schema.ts");
  const { getEquipmentBonuses } = await load("/src/progression/EquipmentBonuses.ts");
  const { openEquipmentSocket, inlayGem, imprintSetTag } = await load("/src/progression/GearCraftSystem.ts");
  const { MATERIAL_IDS } = await load("/src/content/materials.ts");
  const { SET_IDS } = await load("/src/content/sets.ts");
  const { BattleSimulation } = await load("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await load("/tests/support/makeUnit.ts");
  const subjects = {
    mage_fire: ["set_cinder_chant", "set_polar_astrolabe", "gem_crit_4", "gem_crit_damage_4"],
    warlock_destruction: ["set_cinder_chant", "set_polar_astrolabe", "gem_skill_4", "gem_rage_4"],
    warrior_fury: ["set_northwind_warsong", "set_ember_breaker", "gem_haste_4", "gem_crit_4"],
    demon_hunter_devourer: ["set_grave_whisper", "set_polar_astrolabe", "gem_skill_4", "gem_crit_damage_4"],
    warlock_affliction: ["set_grave_whisper", "set_marshfire_rite", "gem_skill_4", "gem_rage_4"],
    warlock_demonology: ["set_grave_whisper", "set_polar_astrolabe", "gem_skill_4", "gem_haste_4"],
    hunter_beast_mastery: ["set_northwind_warsong", "set_grave_hunt", "gem_crit_4", "gem_crit_damage_4"],
    monk_brewmaster: ["set_stonefang_bulwark", "set_tide_oath", "gem_hp_4", "gem_damage_reduction_4"],
  };
  const cases = {
    baseline: [], attack: ["gem_atk_4", "gem_atk_4"], critical: ["gem_crit_4", "gem_crit_damage_4"],
    haste: ["gem_haste_4", "gem_haste_4"], skill: ["gem_skill_4", "gem_skill_4"],
    rage: ["gem_rage_4", "gem_rage_4"], defense: ["gem_hp_4", "gem_damage_reduction_4"],
    sets: [], combined: [],
  };
  const seeds = [7, 23, 71];
  const selected = process.argv.find((arg) => arg.startsWith("--spec="))?.slice(7).split(",");
  const runs = [];
  const builds = [];
  for (const definition of roster.filter((hero) => subjects[hero.specId] && (!selected || selected.includes(hero.specId)))) {
    for (const ultimate of [1, 2, 3]) for (const [gearCase, gems] of Object.entries(cases)) {
      const save = createDefaultSave(0);
      save.inventory = structuredClone(fixture.gear);
      for (const hero of roster) {
        Object.assign(save.roster[hero.id], { unlocked: true, level: 100, stars: 15, ascendLevel: 5,
          chosenSkillId: fixture.chosenSkills[hero.id],
          talentRanks: { ...fixture.variants.get(`3/${hero.id === definition.id ? ultimate : 1}`).ranks[hero.id] },
          equipment: Object.fromEntries(save.inventory.filter((item) => item.instanceId.startsWith(`grown100-${hero.id}-`)).map((item) => [item.slot, item.instanceId])),
        });
      }
      const items = save.inventory.filter((item) => item.instanceId.startsWith(`grown100-${definition.id}-`));
      const materials = Object.fromEntries(MATERIAL_IDS.map((id) => [id, 100000]));
      const essences = Object.fromEntries(SET_IDS.map((id) => [id, 100000]));
      const plan = subjects[definition.specId];
      if (gearCase === "sets" || gearCase === "combined") for (const [index, item] of items.entries()) {
        assert(imprintSetTag(item, plan[index < 6 ? 0 : 1], essences, materials).ok);
      }
      const inlays = gearCase === "combined" ? plan.slice(2) : gems;
      if (inlays.length) for (const item of items.slice(0, 6)) for (const [index, gem] of inlays.entries()) {
        assert(openEquipmentSocket(item, materials).ok);
        assert(inlayGem(item, index, gem, materials).ok);
      }
      const bonuses = getEquipmentBonuses(save);
      builds.push({ spec: definition.specId, ultimate, gearCase, items, bonus: bonuses[definition.id] });
      const party = definition.expeditionRole === "tank" ? [definition.id, "H65", "H57", "H78", "H59"]
        : ["H35", "H65", "H57", "H59", definition.id];
      for (const scenario of ["boss", "pack"]) for (const seed of seeds) {
        const sim = new BattleSimulation({ stage: 1, difficulty: "hard", party, heroStats: fixture.stats, heroBonuses: bonuses, seed });
        const allies = sim.units.filter((unit) => unit.team === "heroes");
        allies.forEach((unit, index) => { unit.x = 200 - index * 70; });
        const source = allies.find((unit) => unit.sourceId === definition.id);
        const foes = Array.from({ length: scenario === "boss" ? 1 : 4 }, (_, index) => makeUnit({
          id: `foe-${index}`, sourceId: scenario === "boss" ? "B04" : "E01", team: "enemies", x: 460 + index * 30,
          maxHp: 1e9, hp: 1e9, attack: scenario === "boss" ? 16000 : 6500, defense: 1200,
          attackIntervalMs: 1500, attackRange: 90, moveSpeed: 95, critChance: 0, rage: 0, passiveFlags: { entryDone: true },
        }));
        sim.units = [...allies, ...foes]; sim.state = "engaging"; sim.drainEvents();
        let damage = 0, teamDamage = 0, basicHits = 0, passiveDamage = 0, healing = 0, taken = 0, absorbed = 0, minimumHpPct = 1;
        for (let elapsed = 0; elapsed < 60000 && sim.state !== "defeat"; elapsed += 50) {
          sim.step(50);
          minimumHpPct = Math.min(minimumHpPct, source.hp / source.maxHp);
          for (const event of sim.drainEvents()) {
            if (event.type === "damage" && event.sourceId.startsWith("hero-")) teamDamage += event.amount;
            if (event.type === "damage" && event.sourceId === source.id) {
              damage += event.amount;
              if (event.attribution?.kind === "passive") passiveDamage += event.amount;
            }
            if (event.type === "damage" && event.targetId === source.id) { taken += event.hpDamage ?? event.amount; absorbed += event.absorbed ?? 0; }
            if (event.type === "heal" && event.sourceId === source.id) healing += event.amount;
            if (event.type === "attack" && event.sourceId === source.id) basicHits++;
          }
        }
        runs.push({ spec: definition.specId, ultimate, gearCase, scenario, seed, damage, teamDamage, basicHits,
          casts: source.skillCastCount, passiveDamage, healing, taken, absorbed, minimumHpPct,
          sourceAlive: source.alive, alive: allies.filter((unit) => unit.alive).length,
          attack: source.attack, critChance: source.critChance, attackIntervalMs: source.attackIntervalMs, castSpeedPct: source.castSpeedPct,
        });
      }
    }
    console.log(`${definition.specId}: ${runs.length} completed`);
  }
  const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ?? "docs/delivery/2026-09-22-specialization-gear-growth.json";
  await writeFile(output, JSON.stringify({
    methodology: { profile: fixture.profile, seeds, stepMs: 50, durationMs: 60000, basics: "c", ultimates: [1, 2, 3],
      gems: "Six pieces, two rank-4 gems each; all sockets, inlays and 6+4 set imprints use crafting functions",
      scenarios: "One durable B04 boss or four E01 enemies, 30 units apart; fixed teammates, only subject gear changes",
      comparison: "Attributes are isolated additions, not equal-budget substitutes; combined uses thematic gear, not a best-in-slot search" },
    subjects, cases, builds, runs,
  }, null, 2) + "\n");
  console.log(`${runs.length} gear-growth runs written`);
} finally { await server.close(); }
