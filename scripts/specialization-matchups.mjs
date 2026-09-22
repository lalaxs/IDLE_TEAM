import { createServer } from "vite";
import { writeFile } from "node:fs/promises";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const { RELEASED_HERO_DEFINITIONS: roster } = await server.ssrLoadModule("/src/content/heroes.ts");
  const { getHeroStats } = await server.ssrLoadModule("/src/progression/HeroProgression.ts");
  const { BattleSimulation } = await server.ssrLoadModule("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await server.ssrLoadModule("/tests/support/makeUnit.ts");
  const runs = [];
  for (const hero of roster.filter((entry) => entry.expeditionRole === "tank")) {
    for (const pressure of ["steady", "burst"]) for (const seed of [7, 23, 71]) {
      const simulation = new BattleSimulation({ stage: 1, party: [hero.id, "H65"], heroStats: { [hero.id]: getHeroStats(hero.id, 20), H65: getHeroStats("H65", 20) }, seed });
      const allies = simulation.units.filter((unit) => unit.team === "heroes");
      const tank = allies[0]; tank.x = 200; allies[1].x = -50;
      const foe = makeUnit({ id: "foe", sourceId: "E01", team: "enemies", x: 400, attackRange: 200,
        hp: 1e7, maxHp: 1e7, attack: pressure === "steady" ? 200 : 400, defense: 70,
        attackIntervalMs: pressure === "steady" ? 1500 : 3000, critChance: 0, rage: 0,
        moveSpeed: 0, passiveFlags: { entryDone: true } });
      simulation.units = [...allies, foe]; simulation.state = "engaging"; simulation.drainEvents();
      let elapsed = 0, healing = 0, absorbed = 0;
      while (tank.alive && elapsed < 60000) {
        simulation.step(50); elapsed += 50;
        for (const event of simulation.drainEvents()) {
          if (event.type === "heal" && event.targetId === tank.id) healing += event.amount;
          if (event.type === "damage" && event.targetId === tank.id) absorbed += event.absorbed ?? 0;
        }
      }
      runs.push({ spec: hero.specId, pressure, seed, elapsed, alive: tank.alive, hp: tank.hp, maxHp: tank.maxHp, healing, absorbed, casts: tank.skillCastCount });
    }
  }
  const supportRuns = [];
  const candidates = [{ id: null, choice: 0 }, { id: "H59", choice: 0 },
    ...["H30", "H68"].flatMap((id) => [0, 1, 2, 3].map((choice) => ({ id, choice })))];
  for (const candidate of candidates) for (const seed of [7, 23, 71]) {
    const party = ["H35", "H65", "H57", "H78", candidate.id];
    const simulation = new BattleSimulation({ stage: 1, party,
      heroStats: Object.fromEntries(party.filter(Boolean).map((id) => [id, getHeroStats(id, 20)])), seed,
      heroBonuses: candidate.id ? { [candidate.id]: { talentSpecialization: candidate.choice } } : {} });
    const allies = simulation.units.filter((unit) => unit.team === "heroes");
    allies.forEach((unit, index) => { unit.x = 200 - index * 90; });
    const foe = makeUnit({ id: "foe", sourceId: "E01", team: "enemies", x: 420, attackRange: 240,
      hp: 1e7, maxHp: 1e7, attack: 180, defense: 70, attackIntervalMs: 1500, critChance: 0, rage: 0,
      moveSpeed: 0, passiveFlags: { entryDone: true } });
    simulation.units = [...allies, foe]; simulation.state = "engaging"; simulation.drainEvents();
    let damage = 0, healing = 0, absorbed = 0;
    for (let elapsed = 0; elapsed < 60000; elapsed += 50) {
      simulation.step(50);
      for (const event of simulation.drainEvents()) {
        if (event.type === "damage" && event.sourceId.startsWith("hero-")) damage += event.amount;
        if (event.type === "heal" && event.sourceId.startsWith("hero-")) healing += event.amount;
        if (event.type === "damage" && event.targetId.startsWith("hero-")) absorbed += event.absorbed ?? 0;
      }
    }
    supportRuns.push({ hero: candidate.id, choice: candidate.choice, seed, damage, healing, absorbed,
      alive: allies.filter((unit) => unit.alive).length });
  }
  await writeFile("docs/delivery/2026-09-22-specialization-support.json", JSON.stringify(supportRuns, null, 2) + "\n");
  await writeFile("docs/delivery/2026-09-22-specialization-matchups.json", JSON.stringify(runs, null, 2) + "\n");
  for (const spec of new Set(runs.map((run) => run.spec))) {
    console.log(spec, ...["steady", "burst"].map((pressure) => {
      const rows = runs.filter((run) => run.spec === spec && run.pressure === pressure);
      return `${pressure}: ${Math.round(rows.reduce((sum, run) => sum + run.elapsed, 0) / rows.length / 100) / 10}s, alive ${rows.filter((run) => run.alive).length}/3`;
    }));
  }
} finally { await server.close(); }
