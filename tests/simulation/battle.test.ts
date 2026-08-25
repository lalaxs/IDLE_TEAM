import { describe, expect, it } from "vitest";
import { BattleSimulation } from "../../src/simulation/BattleSimulation";

function clearStageWithDebug(battle: BattleSimulation): void {
  for (let wave = 0; wave < 3; wave += 1) {
    battle.debugDefeatEnemies();
    for (let tick = 0; tick < 40; tick += 1) {
      battle.step(50);
      const snapshot = battle.getSnapshot();
      if (snapshot.state === "victory") break;
      if (snapshot.units.some(({ team, alive }) => team === "enemies" && alive)) break;
    }
  }
}

describe("BattleSimulation", () => {
  it("starts with five heroes and a trash pack, meter empty", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });
    const snapshot = battle.getSnapshot();
    expect(snapshot.units.filter(({ team }) => team === "heroes")).toHaveLength(5);
    expect(snapshot.wave).toBe(1);
    expect(snapshot.progress).toBe(0);
    expect(snapshot.bossActive).toBe(false);
    expect(snapshot.units.some(({ sourceId }) => sourceId === "B01")).toBe(false);
    expect(["waveIntro", "advancing"]).toContain(snapshot.state);
  });

  it("assigns each hero their combat damage element", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H03", "H04", "H06", "H08"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });
    const byHero = Object.fromEntries(
      battle.getSnapshot().units
        .filter(({ team }) => team === "heroes")
        .map((unit) => [unit.sourceId, unit.damageElement]),
    );
    expect(byHero).toMatchObject({
      H01: "physical",
      H03: "fire",
      H04: "holy",
      H06: "dark",
      H08: "lightning",
    });
  });

  it("pauses in place after a pack clear before the next enemies arrive", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });

    battle.debugDefeatEnemies();
    battle.step(50);

    const snapshot = battle.getSnapshot();
    expect(snapshot.wave).toBe(2);
    expect(snapshot.progress).toBeGreaterThan(0);
    expect(snapshot.bossActive).toBe(false);
    expect(snapshot.state).toBe("travelling");
    expect(snapshot.units.filter(({ team }) => team === "enemies")).toHaveLength(0);
  });

  it("fills the boss meter with trash kills and summons the boss when full", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });

    battle.debugDefeatEnemies();
    for (let tick = 0; tick < 30; tick += 1) battle.step(50);
    expect(battle.getSnapshot().bossActive).toBe(false);

    battle.debugDefeatEnemies();
    for (let tick = 0; tick < 30; tick += 1) battle.step(50);
    const bossFight = battle.getSnapshot();
    expect(bossFight.progress).toBe(1);
    expect(bossFight.bossActive).toBe(true);
    expect(bossFight.units.some(({ sourceId }) => sourceId === "B01")).toBe(true);
  });

  it("marches heroes in from the left one slot at a time when startWithTravel is set", () => {
    const battle = new BattleSimulation({
      stage: 2,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: true,
    });

    const opening = battle.getSnapshot();
    expect(opening.state).toBe("travelling");
    expect(opening.units.filter(({ team }) => team === "enemies")).toHaveLength(0);
    const openingXs = opening.units.filter(({ team }) => team === "heroes").map(({ x }) => x);
    expect(Math.max(...openingXs)).toBeLessThan(0);
    expect(new Set(openingXs).size).toBe(5);

    const ys = opening.units.filter(({ team }) => team === "heroes").map(({ y }) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(35);

    for (let tick = 0; tick < 8; tick += 1) battle.step(50);
    const early = battle.getSnapshot().units.filter(({ team }) => team === "heroes");
    const moved = early.filter(({ x }, index) => x > openingXs[index]!);
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.length).toBeLessThan(5);

    for (let tick = 0; tick < 80; tick += 1) battle.step(50);
    const arrived = battle.getSnapshot();
    expect(arrived.units.filter(({ team }) => team === "enemies").length).toBeGreaterThan(0);
    expect(Math.min(...arrived.units.filter(({ team }) => team === "heroes").map(({ x }) => x))).toBeGreaterThan(50);
  });

  it("keeps heroes planted between waves while the next foes spawn ahead", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });
    battle.debugDefeatEnemies();
    battle.step(50);
    const beforeBreak = battle.getSnapshot().units
      .filter(({ team }) => team === "heroes")
      .map(({ x }) => x);

    for (let tick = 0; tick < 10; tick += 1) battle.step(50);

    const duringBreak = battle.getSnapshot();
    expect(
      duringBreak.units
        .filter(({ team }) => team === "heroes")
        .every(({ x }, index) => x === beforeBreak[index]!),
    ).toBe(true);
    expect(duringBreak.units.filter(({ team }) => team === "enemies")).toHaveLength(0);

    for (let tick = 0; tick < 20; tick += 1) battle.step(50);

    const encounter = battle.getSnapshot();
    const heroFront = Math.max(...encounter.units.filter(({ team }) => team === "heroes").map(({ x }) => x));
    const enemies = encounter.units.filter(({ team }) => team === "enemies");
    expect(enemies.length).toBeGreaterThan(0);
    expect(Math.min(...enemies.map(({ x }) => x))).toBeGreaterThan(
      Math.max(...beforeBreak),
    );
    // Heroes may already be closing once the next wave appears.
    expect(heroFront).toBeGreaterThanOrEqual(Math.max(...beforeBreak));
  });

  it("starts attacking during wave intro once a foe is in range", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H03", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });

    let attackedDuringIntro = false;
    for (let tick = 0; tick < 120; tick += 1) {
      const stateBefore = battle.getSnapshot().state;
      battle.step(50);
      const events = battle.drainEvents();
      if (stateBefore === "waveIntro" && events.some((event) => event.type === "attack")) {
        attackedDuringIntro = true;
        break;
      }
      if (stateBefore !== "waveIntro" && stateBefore !== "bossIntro") break;
    }
    expect(attackedDuringIntro).toBe(true);
  });

  it("marches enemies in from the right one slot at a time", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });

    const opening = battle.getSnapshot();
    expect(opening.state).toBe("waveIntro");
    const openingEnemies = opening.units.filter(({ team }) => team === "enemies");
    expect(openingEnemies.length).toBeGreaterThan(1);
    const openingXs = openingEnemies.map(({ x }) => x);
    expect(new Set(openingXs).size).toBe(openingXs.length);

    const holds = openingEnemies.map((enemy) => Number(enemy.passiveFlags.holdX));
    expect(openingXs.every((x, index) => x > holds[index]!)).toBe(true);

    const openingHeroFront = Math.max(
      ...opening.units.filter(({ team }) => team === "heroes").map(({ x }) => x),
    );

    for (let tick = 0; tick < 3; tick += 1) battle.step(50);
    const early = battle.getSnapshot();
    const earlyEnemies = early.units.filter(({ team }) => team === "enemies");
    const moved = earlyEnemies.filter(({ x }, index) => x < openingXs[index]!);
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.length).toBeLessThan(earlyEnemies.length);
    expect(
      Math.max(...early.units.filter(({ team }) => team === "heroes").map(({ x }) => x)),
    ).toBeGreaterThan(openingHeroFront);
  });

  it("lets backline ranged heroes attack before the frontline falls", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H03", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });

    let rangedAttacked = false;
    for (let tick = 0; tick < 160; tick += 1) {
      const frontAlive = battle
        .getSnapshot()
        .units.some(({ sourceId, alive }) => sourceId === "H01" && alive);
      battle.step(50);
      const attacks = battle.drainEvents().filter((event) => event.type === "attack");
      if (
        frontAlive &&
        attacks.some((event) => event.type === "attack" && (event.sourceId.includes("H03") || event.sourceId.includes("H05")))
      ) {
        rangedAttacked = true;
        break;
      }
      if (battle.getSnapshot().state === "victory" || battle.getSnapshot().state === "defeat") break;
    }
    expect(rangedAttacked).toBe(true);
  });

  it("produces a deterministic three-wave victory with debug damage", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 10,
      startWithTravel: false,
    });
    clearStageWithDebug(battle);
    expect(battle.getSnapshot().state).toBe("victory");
    expect(battle.drainEvents().some(({ type }) => type === "battle:victory")).toBe(true);
  });

  it("lets the default party clear the onboarding stage through real combat", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01", "H02", "H03", "H04", "H05"],
      heroLevels: {},
      seed: 21,
      startWithTravel: false,
    });
    for (let tick = 0; tick < 2_400 && battle.getSnapshot().state !== "victory"; tick += 1) {
      battle.step(50);
    }
    expect(battle.getSnapshot().state).toBe("victory");
  });

  it("keeps late-game combat bounded for a developed party", () => {
    const battle = new BattleSimulation({
      stage: 12,
      party: ["H01", "H02", "H03", "H07", "H08"],
      heroLevels: { H01: 20, H02: 20, H03: 20, H07: 20, H08: 20 },
      seed: 212,
      startWithTravel: false,
    });
    for (let tick = 0; tick < 3_600 && !["victory", "defeat"].includes(battle.getSnapshot().state); tick += 1) {
      battle.step(50);
    }
    expect(battle.getSnapshot().state).toBe("victory");
  });

  it("applies Snowguard once per wave and removes its old shield between waves", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroLevels: {},
      heroBonuses: { H01: { snowguardShieldPct: 0.06 } },
      seed: 10,
    });
    const firstWaveHero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")!;
    expect(firstWaveHero.shield).toBe(Math.round(firstWaveHero.maxHp * 0.06));

    battle.debugDefeatEnemies();
    battle.step(50);
    expect(battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")?.shield).toBe(0);
    for (let tick = 0; tick < 30; tick += 1) battle.step(50);
    const secondWaveHero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")!;
    expect(secondWaveHero.shield).toBe(Math.round(secondWaveHero.maxHp * 0.06));
  });

  it("shortens only the opening active cooldown of each wave with Frostfocus", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroLevels: {},
      heroBonuses: { H01: { frostfocusCooldownPct: 0.18 } },
      seed: 10,
    });
    const hero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")!;
    expect(hero.skillCooldownMs).toBe(4920);
    expect(hero.passiveFlags.gearFrostfocusTriggered).toBe(true);
  });

  it("applies the full Frostbite slow after a successful basic hit", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroLevels: {},
      heroBonuses: { H01: { frostbiteChance: 1 } },
      seed: 10,
    });
    let slowed = false;
    for (let tick = 0; tick < 400 && !slowed; tick += 1) {
      battle.step(50);
      slowed = battle
        .getSnapshot()
        .units.some(({ team, statuses }) =>
          team === "enemies" &&
          statuses.some(({ kind, magnitude }) => kind === "slow" && magnitude === 0.12),
        );
    }
    expect(slowed).toBe(true);
  });

  it("applies Sandscar armor break after a successful basic hit", () => {
    const battle = new BattleSimulation({
      stage: 25,
      party: ["H01"],
      heroLevels: { H01: 20 },
      heroBonuses: { H01: { sandscarChance: 1 } },
      seed: 10,
    });
    let broken = false;
    for (let tick = 0; tick < 500 && !broken; tick += 1) {
      battle.step(50);
      broken = battle.getSnapshot().units.some(({ team, statuses }) =>
        team === "enemies" &&
        statuses.some(({ kind, magnitude }) => kind === "armorBreak" && magnitude === 0.12),
      );
    }
    expect(broken).toBe(true);
  });

  it("adds Thunderbrand true damage to every fourth hero basic attack", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroLevels: { H01: 20 },
      heroBonuses: { H01: { thunderbrandPct: 0.35 } },
      seed: 10,
    });
    let heroAttacks = 0;
    let fourthAttackDamage: number[] = [];
    for (let tick = 0; tick < 2_000 && heroAttacks < 4; tick += 1) {
      battle.step(50);
      const events = battle.drainEvents();
      const attack = events.find((event) =>
        event.type === "attack" && event.sourceId.includes("H01"),
      );
      if (!attack || attack.type !== "attack") continue;
      heroAttacks += 1;
      if (heroAttacks === 4) {
        fourthAttackDamage = events
          .filter((event) =>
            event.type === "damage" &&
            event.sourceId === attack.sourceId &&
            event.targetId === attack.targetId,
          )
          .map((event) => event.type === "damage" ? event.amount : 0);
      }
    }
    const hero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")!;
    expect(heroAttacks).toBe(4);
    expect(fourthAttackDamage).toHaveLength(2);
    expect(fourthAttackDamage).toContain(Math.round(hero.attack * 0.35));
  });

  it("resets Cloudveil availability when the next wave begins", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H01"],
      heroLevels: {},
      heroBonuses: { H01: { cloudveilShieldPct: 0.12 } },
      seed: 10,
    });
    const internal = battle as unknown as { units: Array<{ team: string; passiveFlags: Record<string, boolean | number> }> };
    const hero = internal.units.find(({ team }) => team === "heroes")!;
    hero.passiveFlags.gearCloudveilUsed = true;
    battle.debugDefeatEnemies();
    battle.step(50);
    expect(
      battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01")
        ?.passiveFlags.gearCloudveilUsed,
    ).toBe(false);
  });

  it("applies Tailwind haste at the start of every wave", () => {
    const battle = new BattleSimulation({
      stage: 1,
      party: ["H03"],
      heroLevels: {},
      heroBonuses: { H03: { tailwindPct: 0.15 } },
      seed: 10,
    });
    const getTailwind = () => battle.getSnapshot().units
      .find(({ sourceId }) => sourceId === "H03")?.statuses
      .find(({ kind }) => kind === "haste");
    expect(getTailwind()?.magnitude).toBe(0.15);
    battle.debugDefeatEnemies();
    battle.step(50);
    for (let tick = 0; tick < 20; tick += 1) battle.step(50);
    expect(getTailwind()?.magnitude).toBe(0.15);
  });

  it("triggers Mirage Guard only once after falling below half health", () => {
    const battle = new BattleSimulation({
      stage: 12,
      party: ["H03"],
      heroLevels: {},
      heroBonuses: { H03: { mirageGuardPct: 0.2 } },
      seed: 12,
    });
    let triggered = false;
    for (let tick = 0; tick < 1_000 && !triggered; tick += 1) {
      battle.step(50);
      triggered = battle.getSnapshot().units.some(({ sourceId, statuses }) =>
        sourceId === "H03" &&
        statuses.some(({ kind, magnitude }) => kind === "mirageGuard" && magnitude === 0.2),
      );
    }
    expect(triggered).toBe(true);
    expect(
      battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H03")
        ?.passiveFlags.gearMirageGuardUsed,
    ).toBe(true);
  });

  it("keeps Mirage Guard at three seconds beside H01's persistent reduction", () => {
    const battle = new BattleSimulation({
      stage: 48,
      party: ["H01"],
      heroLevels: {},
      heroBonuses: { H01: { mirageGuardPct: 0.2, maxHpPct: 1.5 } },
      seed: 12,
    });
    let hero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01");
    for (let tick = 0; tick < 4_000 && !hero?.passiveFlags.hold; tick += 1) {
      battle.step(50);
      hero = battle.getSnapshot().units.find(({ sourceId }) => sourceId === "H01");
    }
    const mirageRemaining = hero?.statuses
      .find(({ sourceId }) => sourceId.endsWith(":mirageguard"))?.remainingMs;
    expect(hero?.passiveFlags.hold).toBe(true);
    expect(mirageRemaining).toBeGreaterThan(0);
    expect(mirageRemaining).toBeLessThanOrEqual(3000);
  });
});
