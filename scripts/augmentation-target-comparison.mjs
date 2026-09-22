import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
import { createBuildFixtures } from "./specialization-builds.mjs";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, logLevel: "error" });
try {
  const load = (path) => server.ssrLoadModule(path);
  const { fixtures } = await createBuildFixtures(load);
  const { BattleSimulation } = await load("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await load("/tests/support/makeUnit.ts");
  const [formed, grown] = fixtures;
  const party = ["H35", "H65", "H57", "H59", "H30"];
  const stats = { ...formed.stats, H65: grown.stats.H65 };
  const bonuses = { ...formed.variants.get("3/1").bonuses, H65: grown.variants.get("3/1").bonuses.H65 };
  const runs = [];
  for (const preference of [null, "H65", "H57", "H59"]) for (const seed of [7, 23, 71]) {
    const sim = new BattleSimulation({ stage: 1, party, heroStats: stats,
      heroBonuses: { ...bonuses, H30: { ...bonuses.H30, augmentationTargetId: preference } }, seed });
    const allies = sim.units.filter((unit) => unit.team === "heroes");
    allies.forEach((unit, index) => { unit.x = 200 - index * 70; });
    const source = allies.find((unit) => unit.sourceId === "H30");
    const highestAttack = [...allies].filter((unit) => unit.id !== source.id).sort((a, b) => b.attack - a.attack)[0].sourceId;
    const enemy = makeUnit({ id: "boss", sourceId: "B04", team: "enemies", hp: 1e9, maxHp: 1e9, x: 460,
      attack: 5000, defense: 1200, attackIntervalMs: 1500, attackRange: 90, moveSpeed: 95, critChance: 0,
      rage: 0, passiveFlags: { entryDone: true } });
    sim.units = [...allies, enemy]; sim.state = "engaging"; sim.drainEvents();
    let teamDamage = 0; const recipients = {};
    for (let elapsed = 0; elapsed < 60000 && sim.state !== "defeat"; elapsed += 50) {
      sim.step(50);
      for (const event of sim.drainEvents()) {
        if (event.type === "damage" && event.sourceId.startsWith("hero-")) teamDamage += event.amount;
        if (event.type === "skill:resolved" && event.sourceId === source.id) {
          for (const ally of allies) if (event.targetIds.includes(ally.id)) recipients[ally.sourceId] = (recipients[ally.sourceId] ?? 0) + 1;
        }
      }
    }
    runs.push({ preference, seed, highestAttack, teamDamage, recipients, alive: allies.filter((unit) => unit.alive).length });
  }
  await writeFile("docs/delivery/2026-09-22-augmentation-target-comparison.json", JSON.stringify({
    setup: "H65 uses grown100; four teammates use formed85. All use basic c / ultimate a. 60-second durable boss, attack 5000, defense 1200, 1.5-second attacks.", runs }, null, 2) + "\n");
  console.log(runs);
} finally { await server.close(); }
