import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { createBuildFixtures } from "./specialization-builds.mjs";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const load = (path) => server.ssrLoadModule(path);
  const fixturePath = process.argv.find((arg) => arg.startsWith("--fixtures="))?.slice(11);
  const { roster, fixtures } = fixturePath ? {
    roster: (await load("/src/content/heroes.ts")).RELEASED_HERO_DEFINITIONS,
    fixtures: JSON.parse(await readFile(fixturePath, "utf8")).fixtures.map((fixture) => ({
      ...fixture, variants: new Map(Object.entries(fixture.variants)),
    })),
  } : await createBuildFixtures(load);
  const { BattleSimulation } = await load("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await load("/tests/support/makeUnit.ts");
  const selected = process.argv.find((arg) => arg.startsWith("--spec="))?.slice(7).split(",");
  const stress = process.argv.includes("--stress");
  const scenarioFilter = process.argv.find((arg) => arg.startsWith("--scenarios="))?.slice(12).split(",");
  const seeds = (process.argv.find((arg) => arg.startsWith("--seeds="))?.slice(8) ?? "23").split(",").map(Number);
  const basics = (process.argv.find((arg) => arg.startsWith("--basics="))?.slice(9) ?? (stress ? "3" : "1,2,3")).split(",").map(Number);
  const runs = [];
  for (const fixture of fixtures) {
    const { profile, stats, variants } = fixture;
    const defaults = variants.get("3/1").bonuses;
    const referenceSim = new BattleSimulation({ stage: 1, party: ["H35"], heroStats: stats, heroBonuses: defaults, seed: 23 });
    const reference = referenceSim.units.find((unit) => unit.team === "heroes");
    for (const hero of roster.filter((entry) => !selected || selected.includes(entry.specId))) {
      for (const basic of basics) for (const ultimate of [1, 2, 3]) {
        const candidateBonus = variants.get(`${basic}/${ultimate}`).bonuses[hero.id];
        const party = hero.expeditionRole === "tank" ? [hero.id, "H65", "H57", "H78", "H59"]
          : hero.expeditionRole === "healer" ? ["H35", hero.id, "H57", "H78", "H59"] : ["H35", "H65", "H57", "H78", hero.id];
        if (party.filter((id) => id === hero.id).length > 1) party[party.indexOf(hero.id)] = "H28";
        for (const scenario of (stress ? ["burst", "campaign"] : ["boss", "pack", "burst", "campaign"]).filter((name) => !scenarioFilter || scenarioFilter.includes(name))) for (const seed of seeds) {
          const simulation = new BattleSimulation({ stage: scenario === "campaign" ? profile.stage : 1,
            difficulty: scenario === "campaign" ? stress ? "torment" : profile.difficulty : "hard", party, heroStats: stats,
            heroBonuses: { ...defaults, [hero.id]: candidateBonus }, seed });
          const allies = simulation.units.filter((unit) => unit.team === "heroes");
          const source = allies.find((unit) => unit.sourceId === hero.id);
          if (scenario !== "campaign") {
            allies.forEach((unit, index) => { unit.x = 200 - index * 70; });
            const count = scenario === "pack" ? 3 : 1;
            const burstDamage = reference.maxHp * (profile.level === 85 ? 0.75 : 1.25);
            const stressAttack = (burstDamage + Math.sqrt(burstDamage ** 2 + 4 * burstDamage * reference.defense * 1.25)) / 2;
            const foes = Array.from({ length: count }, (_, index) => makeUnit({ id: `foe-${index}`, sourceId: scenario === "pack" ? "E01" : "B04", team: "enemies", x: 460 + index * 60,
              maxHp: 1e9, hp: 1e9, attack: Math.round(stress ? stressAttack : reference.attack * (scenario === "burst" ? 2.4 : count === 3 ? 0.42 : 0.9)),
              defense: Math.round(reference.defense * 0.5), attackIntervalMs: scenario === "burst" ? 3000 : 1500,
              attackRange: 90, moveSpeed: 95, critChance: 0, rage: 0, passiveFlags: { entryDone: true } }));
            simulation.units = [...allies, ...foes]; simulation.state = "engaging";
          }
          simulation.drainEvents();
          let damage = 0, teamDamage = 0, healing = 0, sourceHealing = 0, absorbed = 0, elapsed = 0, deaths = 0, trapTriggers = 0, castDebt = 0, debtCasts = 0;
          let minimumPartyHpPct = 1;
          const lastIncoming = [];
          const fallen = [];
          let sourceDeath = null;
          const limit = scenario === "campaign" ? 300000 : 60000;
          while (elapsed < limit && !["victory", "defeat"].includes(simulation.state)) {
            const trap = source.specialization?.trap;
            const debt = Number(source.passiveFlags.specStaggerPool ?? 0);
            simulation.step(50); elapsed += 50;
            minimumPartyHpPct = Math.min(minimumPartyHpPct, ...allies.map((unit) => unit.hp / unit.maxHp));
            if (trap && !source.specialization?.trap && source.passiveFlags.specTrapReady) trapTriggers++;
            for (const event of simulation.drainEvents()) {
              if (event.type === "damage" && event.sourceId.startsWith("hero-")) { teamDamage += event.amount; if (event.sourceId === source.id) damage += event.amount; }
              if (event.type === "heal" && event.sourceId.startsWith("hero-")) {
                healing += event.amount;
                if (event.sourceId === source.id) sourceHealing += event.amount;
              }
              if (event.type === "damage" && event.targetId.startsWith("hero-")) absorbed += event.absorbed ?? 0;
              if (event.type === "damage" && event.targetId === source.id) {
                lastIncoming.push({ elapsed, sourceId: event.sourceId, amount: event.amount, hpDamage: event.hpDamage,
                  absorbed: event.absorbed, attribution: event.attribution });
                if (lastIncoming.length > 6) lastIncoming.shift();
              }
              if (event.type === "unit:died" && event.unitId === source.id) sourceDeath = { elapsed, maxHp: source.maxHp, pool: debt, lastIncoming: [...lastIncoming] };
              if (event.type === "unit:died" && event.unitId.startsWith("hero-")) {
                deaths++;
                const victim = allies.find((unit) => unit.id === event.unitId);
                fallen.push({ elapsed, hero: victim.sourceId, maxHp: victim.maxHp, subjectHp: source.hp, subjectDebt: source.passiveFlags.specStaggerPool });
              }
              if (event.type === "skill:resolved" && event.sourceId === source.id) { castDebt += debt; debtCasts++; }
            }
          }
          runs.push({ profile: profile.id, spec: hero.specId, role: hero.expeditionRole, basic, ultimate, scenario, stress, seed,
            state: simulation.state, elapsed, damage, teamDamage, healing, sourceHealing, absorbed, deaths,
            alive: allies.filter((unit) => unit.alive).length, sourceAlive: source.alive, sourceHp: source.hp,
            casts: source.skillCastCount, trapTriggers, minimumPartyHpPct, fallen, sourceDeath, meanDebtAtCast: debtCasts ? castDebt / debtCasts : 0 });
        }
      }
      console.log(`${profile.id}/${hero.specId}: ${runs.length} completed`);
    }
    console.log(`${profile.id}: ${runs.length} completed`);
  }
  const data = { methodology: { seeds, stress, stepMs: 50, arenaMs: 60000, campaignMs: 300000,
    fixtureSource: fixturePath ?? "current progression",
    stressPressure: "Burst attack solves the armor formula for 75% of reference tank HP at level 85, 125% at level 100, before resistance/reduction; campaign uses Torment",
    allocation: "17 legal points: foundation power 5 + precision 5; each of 3 basics; mastery a 3 + b 2; each of 3 ultimates",
    teammateBuild: "basic c / ultimate a", gearRollSeeds: { physical: 9007, magic: 9023 },
    exclusions: "No sets, gems, greater affixes or account abilities; selected ordinary gear is shared by school, not optimized per specialization" },
    fixtures: fixtures.map(({ profile, stats, variants, gear, chosenSkills }) => ({ profile, stats, gear, chosenSkills,
      variants: Object.fromEntries(variants) })), runs };
  const output = process.argv[2] ?? "docs/delivery/2026-09-22-specialization-endgame.json";
  await writeFile(output, JSON.stringify(data, null, 2) + "\n");
  console.log(`${runs.length} runs written to ${output}`);
} finally { await server.close(); }
