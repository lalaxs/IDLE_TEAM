import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
import { createBuildFixtures } from "./specialization-builds.mjs";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const load = (path) => server.ssrLoadModule(path);
  const { fixtures } = await createBuildFixtures(load);
  const { BattleSimulation } = await load("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await load("/tests/support/makeUnit.ts");
  const fixture = fixtures.find(({ profile }) => profile.id === "grown100");
  const rows = [];
  for (const choice of [1, 2, 3]) for (const seed of [7, 23, 71]) {
    const defaults = fixture.variants.get("3/2").bonuses;
    const simulation = new BattleSimulation({ stage: 1, party: ["H35", "H65", "H22", "H12", "H79"],
      heroStats: fixture.stats, heroBonuses: { ...defaults, H79: fixture.variants.get(`3/${choice}`).bonuses.H79 }, seed });
    const allies = simulation.units.filter((unit) => unit.team === "heroes");
    allies.forEach((unit, index) => { unit.x = 200 - index * 15; });
    const foes = Array.from({ length: 4 }, (_, index) => makeUnit({ id: `foe-${index}`, sourceId: "E01", team: "enemies",
      x: 290 + index * 20, hp: 1e9, maxHp: 1e9, attack: 6500, defense: 1200, attackIntervalMs: 1500,
      attackRange: 90, moveSpeed: 95, critChance: 0, rage: 0, passiveFlags: { entryDone: true } }));
    simulation.units = [...allies, ...foes];
    simulation.state = "engaging";
    simulation.drainEvents();
    let damage = 0, teamDamage = 0;
    for (let elapsed = 0; elapsed < 60000; elapsed += 50) {
      simulation.step(50);
      for (const event of simulation.drainEvents()) {
        if (event.type !== "damage" || !event.sourceId.startsWith("hero-")) continue;
        teamDamage += event.amount;
        if (event.sourceId.endsWith("H79")) damage += event.amount;
      }
    }
    rows.push({ choice, seed, damage, teamDamage, alive: allies.filter((unit) => unit.alive).length });
  }
  await writeFile(process.argv[2] ?? "docs/delivery/2026-09-22-capstone-arms-cleave.json", JSON.stringify(rows, null, 2));
  for (const choice of [1, 2, 3]) {
    const selected = rows.filter((row) => row.choice === choice);
    console.log(JSON.stringify({ choice, damage: selected.reduce((sum, row) => sum + row.damage, 0) / 3,
      teamDamage: selected.reduce((sum, row) => sum + row.teamDamage, 0) / 3, alive: selected.map((row) => row.alive) }));
  }
} finally { await server.close(); }
