import { HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { BattleSimulation } from "../../src/simulation/BattleSimulation";
import type { UnitState } from "../../src/simulation/types";
import { makeUnit } from "./makeUnit";

/** Equal-stat arena: one tested hero, four passive allies, and durable melee targets. */
export function specializationScenario(spec: SpecId, enemyCount: number, choice = 0, seed = 23, durationMs = 30000) {
  const definition = HERO_DEFINITIONS.find((hero) => hero.specId === spec)!;
  const source = makeUnit({ id: "subject", sourceId: definition.id, x: 120, hp: 3000, maxHp: 5000,
    attack: 100, defense: 0, rage: 0, critChance: 0.15, attackRange: 200, moveSpeed: 0,
    passiveFlags: { talentSpecialization: choice, gearBlockChance: 0.15 } });
  const allies = Array.from({ length: 4 }, (_, index) => makeUnit({
    id: `ally-${index}`, sourceId: "E01", x: 50 - index * 20, y: index * 20,
    hp: 2500, maxHp: 5000, attack: 60, defense: 0, critChance: 0.15, rage: 0,
    attackMode: "ranged", attackRange: 500, attackIntervalMs: 1500, moveSpeed: 0,
  }));
  const foes = Array.from({ length: enemyCount }, (_, index) => makeUnit({
    id: `foe-${index}`, sourceId: "E01", team: "enemies", x: 200 + index * 20, y: index * 20,
    hp: 1000000, maxHp: 1000000, attack: 40, defense: 0, critChance: 0, rage: 0,
    attackIntervalMs: 1500, moveSpeed: 0, passiveFlags: { entryDone: true },
  }));
  const simulation = new BattleSimulation({ stage: 1, party: [definition.id], heroStats: {}, seed });
  const arena = simulation as unknown as { units: UnitState[]; state: string };
  arena.units = [source, ...allies, ...foes];
  arena.state = "engaging";
  simulation.drainEvents();
  let damage = 0;
  let healing = 0;
  let teamDamage = 0;
  let basicHits = 0;
  let passiveDamage = 0;
  let activeDamage = 0;
  for (let elapsed = 0; elapsed < durationMs; elapsed += 50) {
    simulation.step(50);
    for (const event of simulation.drainEvents()) {
      if (event.type === "damage" && !event.sourceId.startsWith("foe")) teamDamage += event.amount;
      if (event.type === "damage" && event.sourceId === source.id) {
        damage += event.amount;
        if (event.attribution?.kind === "passive") passiveDamage += event.amount;
        if (event.skillCastId || event.attribution?.kind === "activeSkill") activeDamage += event.amount;
      }
      if (event.type === "attack" && event.sourceId === source.id) basicHits += 1;
      if (event.type === "heal" && event.sourceId === source.id) healing += event.amount;
    }
  }
  return { spec, role: definition.expeditionRole, enemyCount, choice, seed,
    damage, healing, teamDamage, basicHits, passiveDamage, activeDamage,
    casts: source.skillCastCount, hp: source.hp, shield: source.shield,
    alive: source.alive, source, simulation };
}
