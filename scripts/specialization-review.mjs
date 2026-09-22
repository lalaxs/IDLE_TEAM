import { createServer } from "vite";
import { writeFile } from "node:fs/promises";

// Reproducible design audit; all fixtures are isolated from player saves.
const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const load = (path) => server.ssrLoadModule(path);
  const { RELEASED_HERO_DEFINITIONS: roster } = await load("/src/content/heroes.ts");
  const { getHeroStats } = await load("/src/progression/HeroProgression.ts");
  const { BattleSimulation } = await load("/src/simulation/BattleSimulation.ts");
  const { makeUnit } = await load("/tests/support/makeUnit.ts");
  const { castSpecializationSkill, shouldCastSpecialization, specializationBasicAttackModifiers } = await load("/src/simulation/SpecializationSkillSystem.ts");
  const { tickPeriodicEffects } = await load("/src/simulation/PeriodicEffectSystem.ts");
  const { specializationState } = await load("/src/simulation/SpecializationState.ts");
  const { dealSkillDamage } = await load("/src/simulation/SkillCombat.ts");
  const stableRandom = { next: () => 0.5, int: (min) => min, pick: (values) => values[0] };
  const definition = (spec) => roster.find((hero) => hero.specId === spec);
  const subject = (spec, bonus = {}) => {
    const hero = definition(spec);
    const simulation = new BattleSimulation({ stage: 1, party: [hero.id], heroStats: { [hero.id]: getHeroStats(hero.id, 20) }, heroBonuses: { [hero.id]: bonus }, seed: 23 });
    return simulation.units.find((unit) => unit.team === "heroes");
  };
  const dummy = (patch = {}) => makeUnit({ id: "dummy", sourceId: "E01", team: "enemies", x: 160, hp: 1e7, maxHp: 1e7,
    attack: 0, defense: 70, critChance: 0, attackIntervalMs: 1e9, attackCooldownMs: 1e9, moveSpeed: 0,
    passiveFlags: { entryDone: true }, ...patch });

  function loop(spec, seed = 23, bonus = {}, enemyCount = 1) {
    const hero = definition(spec);
    const simulation = new BattleSimulation({ stage: 1, party: [hero.id], heroStats: { [hero.id]: getHeroStats(hero.id, 20) }, heroBonuses: { [hero.id]: bonus }, seed });
    const source = simulation.units.find((unit) => unit.team === "heroes");
    source.x = 100;
    const foes = Array.from({ length: enemyCount }, (_, i) => dummy({ id: `dummy-${i}`, x: 100 + source.attackRange - 1 + i * 20 }));
    simulation.units = [source, ...foes];
    simulation.state = "engaging";
    simulation.drainEvents();
    let damage = 0, periodicHits = 0, freezes = 0, shatterHits = 0, maxDemons = 0;
    const casts = [], resourcesAtCast = [], trapLags = [];
    let trapPlacedAt = null;
    for (let elapsed = 50; elapsed <= 60000; elapsed += 50) {
      const before = source.skillCastCount;
      const flags = { ...source.passiveFlags };
      const demonsBefore = source.specialization?.demons.length ?? 0;
      const shatterReady = flags.specShatterTarget && specializationBasicAttackModifiers(source, foes[0]).damageMultiplier > 1;
      const trapBefore = source.specialization?.trap;
      periodicHits += foes.reduce((total, foe) => total + foe.periodicEffects.filter((effect) => effect.kind === "damage" && effect.sourceId === source.id && effect.untilTickMs <= 50 && effect.remainingTicks > 0).length, 0);
      simulation.step(50);
      maxDemons = Math.max(maxDemons, source.specialization?.demons.length ?? 0);
      if (source.skillCastCount > before) {
        casts.push(elapsed);
        resourcesAtCast.push({ arcane: flags.specArcaneCharges ?? 0,
          demons: demonsBefore, killing: Boolean(flags.specKillingMachine), trapReady: Boolean(flags.specTrapReady) });
        if (source.specialization?.trap && source.specialization.trap !== trapBefore) trapPlacedAt = elapsed;
      }
      if (trapPlacedAt !== null && !source.specialization?.trap) { if (source.passiveFlags.specTrapReady) trapLags.push(elapsed - trapPlacedAt); trapPlacedAt = null; }
      for (const event of simulation.drainEvents()) {
        if (event.type === "damage" && event.sourceId === source.id) {
          damage += event.amount;
        }
        if (event.type === "status:applied" && event.kind === "stun") freezes++;
        if (event.type === "attack" && event.sourceId === source.id && shatterReady) shatterHits++;
      }
    }
    return { spec, hero: hero.id, role: hero.expeditionRole, seed, bonus, enemyCount,
      attack: source.attack, maxHp: source.maxHp, interval: source.attackIntervalMs, range: source.attackRange, element: source.damageElement,
      damage, periodicHits, freezes, shatterHits, casts, basicAttacks: source.basicAttackCount, maxDemons, resourcesAtCast, trapLags };
  }

  const baseline = roster.filter((hero) => hero.expeditionRole === "damage").flatMap((hero) =>
    [1, 3].flatMap((enemyCount) => [7, 23, 71].map((seed) => loop(hero.specId, seed, {}, enemyCount))));
  const frost = [0, 1, 2, 3].map((choice) => loop("mage_frost", 23, { talentSpecialization: choice }));
  const frostWithSlow = loop("mage_frost", 23, { talentBasicProc: "slow", talentBasicProcInterval: 3, talentBasicProcValue: 0.25, talentBasicProcDurationMs: 3000 });
  const poison = [0, 25].map((attackSpeedPct) => loop("rogue_assassination", 23, { attackSpeedPct }));
  const trap = loop("hunter_survival");

  const preserver = subject("evoker_preservation");
  const healedTank = subject("warrior_protection");
  const wounded = subject("mage_arcane");
  wounded.hp = Math.round(wounded.maxHp * 0.2);
  specializationState(healedTank).recentDamage.push({ amount: 1000, remainingMs: 3500 });
  const preserveUnits = [preserver, healedTank, wounded, dummy()];
  const preservation = { canCast: shouldCastSpecialization(preserver, preserveUnits), woundedHpBefore: wounded.hp, healedTankHp: healedTank.hp,
    woundedHpAfter: 0, result: castSpecializationSkill(preserver, preserveUnits, stableRandom) };
  preservation.woundedHpAfter = wounded.hp;

  function dotGear(bonus) {
    const source = subject("warlock_affliction", bonus);
    source.hp = Math.round(source.maxHp * 0.2);
    const target = dummy({ sourceId: "B04", defense: 0 });
    castSpecializationSkill(source, [source, target], stableRandom);
    const rawPerTick = target.periodicEffects[0].amount;
    const events = tickPeriodicEffects(target, 1000, stableRandom, [source, target]);
    const directEvents = [];
    dealSkillDamage(source, target, rawPerTick / source.attack, stableRandom, directEvents);
    return { bonus, rawPerTick, dot: events.filter((event) => event.type === "damage").map((event) => event.amount),
      dotGearHeals: events.filter((event) => event.type === "heal" && event.attribution?.id === "life-steal"),
      direct: directEvents.filter((event) => event.type === "damage").map((event) => event.amount),
      directGearHeals: directEvents.filter((event) => event.type === "heal" && event.attribution?.id === "life-steal") };
  }
  const gear = [{}, { eliteDamagePct: 0.3 }, { lifeStealPct: 0.1 }].map(dotGear);

  function tankPressure(spec, seed, blockChance = 0) {
    const hero = definition(spec);
    const simulation = new BattleSimulation({ stage: 1, party: [hero.id], heroStats: { [hero.id]: getHeroStats(hero.id, 20) }, heroBonuses: { [hero.id]: { blockChance } }, seed });
    const source = simulation.units.find((unit) => unit.team === "heroes");
    source.x = 100;
    const target = dummy({ x: 160, attack: 200, attackCooldownMs: 0, attackIntervalMs: 1500, attackRange: 200 });
    simulation.units = [source, target]; simulation.state = "engaging"; simulation.drainEvents();
    let revengeProcs = 0, damageTaken = 0, healing = 0, elapsed = 0;
    while (elapsed < 60000 && source.alive) {
      const revengeBefore = Boolean(source.passiveFlags.specRevenge);
      simulation.step(50); elapsed += 50;
      if (!revengeBefore && source.passiveFlags.specRevenge) revengeProcs++;
      for (const event of simulation.drainEvents()) {
        if (event.type === "damage" && event.targetId === source.id) { damageTaken += event.hpDamage ?? event.amount; }
        if (event.type === "heal" && event.targetId === source.id) healing += event.amount;
      }
    }
    return { spec, seed, blockChance, elapsed, alive: source.alive, hp: source.hp, maxHp: source.maxHp, shield: source.shield, casts: source.skillCastCount, revengeProcs, damageTaken, healing };
  }
  const tanks = roster.filter((hero) => hero.expeditionRole === "tank").flatMap((hero) => [7, 23, 71].map((seed) => tankPressure(hero.specId, seed)));
  const protectionWithBlock = [7, 23, 71].map((seed) => tankPressure("warrior_protection", seed, 0.15));

  function campaign(hero, stage, seed) {
    const party = hero.expeditionRole === "tank" ? [hero.id, "H04", "H03", "H57", "H71"]
      : hero.expeditionRole === "healer" ? ["H35", hero.id, "H03", "H57", "H71"]
      : ["H35", "H04", "H03", "H57", hero.id];
    // When the candidate is already a fixed teammate, use a different fixed DPS.
    if (party.filter((id) => id === hero.id).length > 1) party[party.indexOf(hero.id)] = "H28";
    const simulation = new BattleSimulation({ stage, party, heroStats: Object.fromEntries(party.map((id) => [id, getHeroStats(id, 20)])), seed });
    let damage = 0, healing = 0;
    for (let elapsed = 0; elapsed < 120000 && !["victory", "defeat"].includes(simulation.state); elapsed += 50) {
      simulation.step(50);
      for (const event of simulation.drainEvents()) {
        if (event.type === "damage" && event.sourceId.endsWith(hero.id)) damage += event.amount;
        if (event.type === "heal" && event.sourceId.endsWith(hero.id)) healing += event.amount;
      }
    }
    return { spec: hero.specId, role: hero.expeditionRole, stage, seed, party, state: simulation.state,
      elapsed: simulation.getSnapshot().elapsedMs, wave: simulation.getSnapshot().wave, progress: simulation.getSnapshot().progress,
      damage, healing, alive: simulation.units.filter((unit) => unit.team === "heroes" && unit.alive).length };
  }
  const campaigns = roster.flatMap((hero) => [12, 24].flatMap((stage) => [7, 23, 71].map((seed) => campaign(hero, stage, seed))));
  const data = { methodology: { level: 20, loopMs: 60000, enemyDefense: 70, seeds: [7, 23, 71], baselineBonus: "No gear, stars, talents or shared skills", campaignLimitMs: 120000 },
    baseline, probes: { frost, frostWithSlow, poison, trap, preservation, gear }, tanks, protectionWithBlock, campaigns };
  await writeFile(process.argv[2] ?? "docs/delivery/2026-09-22-specialization-review-data.json", JSON.stringify(data, null, 2) + "\n");
  console.log(JSON.stringify({ runs: { baseline: baseline.length, campaigns: campaigns.length, tanks: tanks.length },
    frost: frost.map(({ bonus, freezes, shatterHits, casts }) => ({ bonus, freezes, shatterHits, casts: casts.length })),
    frostWithSlow: { freezes: frostWithSlow.freezes, shatterHits: frostWithSlow.shatterHits },
    poison: poison.map(({ bonus, periodicHits, basicAttacks }) => ({ bonus, periodicHits, basicAttacks })),
    trapLags: trap.trapLags, preservation, gear, campaignStates: Object.fromEntries([...new Set(campaigns.map((run) => run.state))].map((state) => [state, campaigns.filter((run) => run.state === state).length])) }, null, 2));
} finally { await server.close(); }
