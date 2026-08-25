import { describe, expect, it } from "vitest";
import { HERO_BY_ID } from "../../src/content/heroes";
import { tryCastReadySkill, tryCastSkill, tryCastUltimate } from "../../src/simulation/SkillSystem";
import type { RandomSource } from "../../src/simulation/RandomSource";
import type { HeroId, UnitState } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

const fixedRandom: RandomSource = {
  next: () => 0.5,
  int: (min) => min,
  pick: <T>(values: readonly T[]) => values[0]!,
};

const heroIds: HeroId[] = ["H01", "H02", "H03", "H04", "H05", "H06", "H07", "H08"];

describe("hero skills", () => {
  it.each(heroIds)("%s resolves a distinct active skill and resets cooldown", (heroId) => {
    const definition = HERO_BY_ID[heroId];
    const hero = makeUnit({
      id: heroId,
      sourceId: heroId,
      name: definition.name,
      attack: definition.attack,
      skillCooldownMs: 0,
    });
    const allies: UnitState[] = [
      hero,
      makeUnit({ id: "ally", hp: 40, maxHp: 100, x: 120 }),
    ];
    const enemies = [
      makeUnit({ id: "enemy-a", team: "enemies", x: 170, hp: 300, maxHp: 300 }),
      makeUnit({ id: "enemy-b", team: "enemies", x: 210, hp: 240, maxHp: 300 }),
      makeUnit({ id: "enemy-c", team: "enemies", x: 250, hp: 200, maxHp: 300 }),
    ];
    const events = tryCastSkill(hero, [...allies, ...enemies], fixedRandom);
    expect(events.some(({ type }) => type === "skill:resolved")).toBe(true);
    expect(hero.skillCooldownMs).toBeGreaterThan(0);
  });

  it("applies gear cooldown reduction on every skill cast", () => {
    const hero = makeUnit({
      id: "cdr-hero",
      sourceId: "H01",
      attack: 50,
      skillCooldownMs: 0,
      passiveFlags: { gearSkillCooldownPct: 0.2 },
    });
    const enemy = makeUnit({
      id: "cdr-enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    const firstCd = hero.skillCooldownMs;
    expect(firstCd).toBe(Math.round(6000 * 0.8));

    hero.skillCooldownMs = 0;
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.skillCooldownMs).toBe(firstCd);
  });

  it("grants Stormward only on the first active skill cast of a wave", () => {
    const hero = makeUnit({
      id: "stormward-hero",
      sourceId: "H01",
      maxHp: 200,
      hp: 200,
      skillCooldownMs: 0,
      passiveFlags: { gearStormward: 0.1, gearStormwardUsed: false },
    });
    const enemy = makeUnit({
      id: "stormward-enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.shield).toBe(20);
    expect(hero.passiveFlags.gearStormwardUsed).toBe(true);

    hero.skillCooldownMs = 0;
    tryCastSkill(hero, [hero, enemy], fixedRandom);
    expect(hero.shield).toBe(20);
  });

  it("scales Nora heals with holy heal power", () => {
    const nora = makeUnit({
      id: "nora",
      sourceId: "H04",
      attack: 100,
      skillCooldownMs: 0,
      damageElement: "holy",
      passiveFlags: { gearHealPowerPct: 0.18 },
    });
    const ally = makeUnit({ id: "ally", hp: 10, maxHp: 10_000, x: 120 });
    const events = tryCastSkill(nora, [nora, ally], fixedRandom);
    const heal = events.find((event) => event.type === "heal");
    expect(heal).toMatchObject({ type: "heal", amount: 1652 });
    expect(ally.hp).toBe(1662);
  });

  it("casts the chosen shared hero skill before the primary skill", () => {
    const hero = makeUnit({
      id: "lorne",
      sourceId: "H01",
      attack: 100,
      maxHp: 1000,
      hp: 1000,
      skillCooldownMs: 0,
      ultimateCooldownMs: 0,
      chosenSkillId: "iron-wall",
      passiveFlags: { kitUltimate: 1 },
    });
    const enemy = makeUnit({
      id: "enemy",
      sourceId: "E01",
      team: "enemies",
      hp: 10_000,
      maxHp: 10_000,
      x: 170,
    });
    const events = tryCastReadySkill(hero, [hero, enemy], fixedRandom);
    expect(events.some((event) => event.type === "skill:resolved" && event.skillId === "iron-wall")).toBe(true);
    expect(hero.ultimateCooldownMs).toBeGreaterThan(0);
    expect(hero.skillCooldownMs).toBe(0);
    expect(hero.shield).toBeGreaterThan(0);
  });

  it("does not cast an ultimate without the kit flag", () => {
    const hero = makeUnit({
      id: "lorne",
      sourceId: "H01",
      skillCooldownMs: 1000,
      ultimateCooldownMs: 0,
    });
    const enemy = makeUnit({ id: "enemy", sourceId: "E01", team: "enemies", hp: 100, maxHp: 100, x: 170 });
    expect(tryCastUltimate(hero, [hero, enemy], fixedRandom)).toEqual([]);
  });
});
