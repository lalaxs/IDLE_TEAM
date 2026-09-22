import { DIFFICULTY_BY_ID } from "../../src/content/difficulties";
import { describe, expect, it } from "vitest";
import { ENEMY_BY_ID, ENEMY_DEFINITIONS } from "../../src/content/enemies";
import { ENEMY_COMBAT_PROFILES, getEnemyCombatProfile } from "../../src/content/enemyCombatProfiles";
import { enemyAtkMultiplier, enemyHpMultiplier } from "../../src/content/balance";
import { createEnemySummonUnit } from "../../src/simulation/BattleSimulation";
import {
  activeEnemyAbilityFor,
  advanceEnemyBehavior,
  afterEnemyBasicHit,
  applyEnemyHealthPhase,
  applyEnemyStatusOnly,
  completeEnemyActive,
  initialEnemySkillTrigger,
} from "../../src/simulation/EnemyBehaviorSystem";
import { makeUnit } from "../support/makeUnit";
import type { EnemyId } from "../../src/simulation/types";

const MAINLINE_BOSSES: EnemyId[] = [
  "B04", "B08", "B12", "B16", "B20", "B24", "B28", "B32", "B36", "B40", "B44", "B48",
  "B52", "B56", "B60", "B64", "B68", "B72", "B76", "B80", "B84", "B88", "B92", "B96",
  "B100", "B104", "B108", "B112", "B116", "B120",
];

describe("full enemy combat content coverage", () => {
  it("resolves authored profiles for every normal and mainline boss", () => {
    const normalIds = ENEMY_DEFINITIONS.filter(({ id }) => id.startsWith("E")).map(({ id }) => id);
    expect(normalIds).toHaveLength(120);
    for (const id of [...normalIds, ...MAINLINE_BOSSES]) {
      const definition = ENEMY_BY_ID[id];
      expect(definition.combatProfileId).toBeTruthy();
      expect(ENEMY_COMBAT_PROFILES[definition.combatProfileId!]).toBeTruthy();
    }
    for (const id of MAINLINE_BOSSES) {
      const profile = getEnemyCombatProfile(ENEMY_BY_ID[id].combatProfileId, "boss");
      expect(profile.active).toBeTruthy();
      expect(profile.healthPhase).toBeTruthy();
    }
  });

  it("keeps later elite mechanics distinct and matrix-shaped", () => {
    const profile = (id: EnemyId) => getEnemyCombatProfile(ENEMY_BY_ID[id].combatProfileId, "elite");
    expect(profile("E28").active).toMatchObject({ prepareMs: 700, targetCount: 1, attackMultiplier: 0.7 });
    expect(profile("E32").active).toMatchObject({ prepareMs: 700, targetCount: 2, attackMultiplier: 0.55 });
    expect(profile("E44").active).toMatchObject({ prepareMs: 750, targetCount: 3, attackMultiplier: 0.55 });
    expect(profile("E56").active).toMatchObject({ prepareMs: 750, targetCount: 2, attackMultiplier: 0.55 });
    expect(profile("E104").active).toMatchObject({ prepareMs: 800, targetCount: 3, attackMultiplier: 0.6 });
    expect(profile("E116").active).toMatchObject({ prepareMs: 800, targetCount: 3, attackMultiplier: 0.65 });
    expect(profile("E44").active?.id).not.toBe(profile("E80").active?.id);
    expect(profile("E60").active?.id).not.toBe(profile("E64").active?.id);
  });

  it("allows status-only elite actives to resolve without damage", () => {
    const source = makeUnit({ id: "enemy-E20", sourceId: "E20", team: "enemies", x: 100, attack: 100 });
    const target = makeUnit({ id: "hero-target", team: "heroes", x: 100 });
    const ability = activeEnemyAbilityFor(source)!;
    const events = applyEnemyStatusOnly(source, [target], [source, target], ability);
    expect(events).toContainEqual({ type: "status:applied", targetId: target.id, kind: "stun" });
    expect(events.some(({ type }) => type === "damage")).toBe(false);
    expect(target.statuses).toContainEqual(expect.objectContaining({ kind: "stun", magnitude: 1 }));
    for (const id of ["E16", "E20", "E52", "E120"] as EnemyId[]) {
      const profile = getEnemyCombatProfile(ENEMY_BY_ID[id].combatProfileId, "elite");
      expect(profile.active?.attackMultiplier).toBe(0);
      expect(profile.active?.targetStatus).toBeTruthy();
    }
  });

  it("authors generic phase ally effects and summon preparation", () => {
    const b56 = getEnemyCombatProfile(ENEMY_BY_ID.B56.combatProfileId, "boss").healthPhase!;
    const b72 = getEnemyCombatProfile(ENEMY_BY_ID.B72.combatProfileId, "boss").healthPhase!;
    const b84 = getEnemyCombatProfile(ENEMY_BY_ID.B84.combatProfileId, "boss").healthPhase!;
    expect(b56.allyStatus?.status.kind).toBe("haste");
    expect(b72.allyStatus?.status.kind).toBe("haste");
    expect(b84.allyShieldMaxHpRatio?.amountPctMaxHp).toBe(0.12);
    expect(getEnemyCombatProfile(ENEMY_BY_ID.E92.combatProfileId, "elite").healthPhase?.summon?.prepareMs).toBe(900);
    expect(getEnemyCombatProfile(ENEMY_BY_ID.B88.combatProfileId, "boss").healthPhase?.status).toBeUndefined();
  });

  it("runs the E92 summon preparation once and scales summons from E89", () => {
    const source = makeUnit({ id: "enemy-E92", sourceId: "E92", team: "enemies", hp: 40, maxHp: 100, x: 100 });
    const hero = makeUnit({ id: "hero-front", team: "heroes", x: 100 });
    const started = advanceEnemyBehavior(source, [source, hero], 0);
    expect(started).toContainEqual(expect.objectContaining({ type: "skill:started", skillId: "elite-summon" }));
    expect(advanceEnemyBehavior(source, [source, hero], 899)).not.toContainEqual(expect.objectContaining({ type: "enemy:summoned" }));
    const resolved = advanceEnemyBehavior(source, [source, hero], 1);
    expect(resolved).not.toContainEqual(expect.objectContaining({ type: "enemy:summoned" }));
    const completion = advanceEnemyBehavior(source, [source, hero], 0);
    const summonEvent = completion.find((event) => event.type === "enemy:summoned");
    expect(summonEvent).toMatchObject({ sourceEnemyId: "E89", hpRatio: 0.5, attackRatio: 0.45 });
    expect(completion.filter((event) => event.type === "enemy:summoned")).toHaveLength(1);
    expect(advanceEnemyBehavior(source, [source, hero], 0)).not.toContainEqual(expect.objectContaining({ type: "enemy:summoned" }));
    if (!summonEvent || summonEvent.type !== "enemy:summoned") throw new Error("E92 summon did not resolve");
    const summon = createEnemySummonUnit(summonEvent, source, 92, 2)!;
    expect(summon.maxHp).toBe(Math.round(ENEMY_BY_ID.E89.maxHp * enemyHpMultiplier(92) * DIFFICULTY_BY_ID.easy.enemyHpMultiplier * 0.5));
    expect(summon.attack).toBe(Math.round(ENEMY_BY_ID.E89.attack * enemyAtkMultiplier(92) * DIFFICULTY_BY_ID.easy.enemyAttackMultiplier * 0.45));
    expect(summon.countsForBossProgress).toBe(false);
  });

  it("applies phase team effects once and keeps summon deaths out of the meter", () => {
    for (const id of ["B56", "B72"] as EnemyId[]) {
      const source = makeUnit({ id: `enemy-${id}`, sourceId: id, team: "enemies", hp: 40, maxHp: 100 });
      const escort = makeUnit({ id: `${id}-escort`, sourceId: "E01", team: "enemies", hp: 80, maxHp: 100 });
      const events = applyEnemyHealthPhase(source, [source, escort]);
      const statusEvents = events.filter((event) => event.type === "status:applied");
      expect(statusEvents.map((event) => event.type === "status:applied" && event.targetId), id).toEqual([source.id, escort.id]);
      expect(new Set(statusEvents.map((event) => event.type === "status:applied" && event.targetId)).size, id).toBe(2);
    }
    const shieldSource = makeUnit({ id: "enemy-B84", sourceId: "B84", team: "enemies", hp: 40, maxHp: 100 });
    const shieldEscort = makeUnit({ id: "B84-escort", sourceId: "E01", team: "enemies", hp: 80, maxHp: 100 });
    expect(applyEnemyHealthPhase(shieldSource, [shieldSource, shieldEscort])).toEqual([]);
    expect(shieldSource.shield).toBe(12);
    expect(shieldEscort.shield).toBe(12);
    const summon = createEnemySummonUnit({ type: "enemy:summoned", sourceId: shieldSource.id, summonId: "escort-1", sourceEnemyId: "E89", hpRatio: 0.5, attackRatio: 0.45 }, shieldSource, 56, 2)!;
    expect(summon.countsForBossProgress).toBe(false);
  });

  it("runs E71 split burn and E100 single-ally shield behavior", () => {
    const source = makeUnit({ id: "enemy-E71", sourceId: "E71", team: "enemies", x: 100, attack: 100 });
    const first = makeUnit({ id: "hero-a", team: "heroes", x: 100, hp: 100, maxHp: 100 });
    const second = makeUnit({ id: "hero-b", team: "heroes", x: 110, hp: 100, maxHp: 100 });
    for (let hit = 0; hit < 4; hit += 1) afterEnemyBasicHit(source, first, { next: () => 0.5, int: (min) => min, pick: <T>(values: readonly T[]) => values[0]! }, [source, first, second]);
    const split = afterEnemyBasicHit(source, first, { next: () => 0.5, int: (min) => min, pick: <T>(values: readonly T[]) => values[0]! }, [source, first, second]);
    expect(split.filter((event) => event.type === "damage")).toHaveLength(2);
    expect(first.periodicEffects).toHaveLength(1);
    expect(second.periodicEffects).toHaveLength(1);
    const healer = makeUnit({ id: "enemy-E100", sourceId: "E100", team: "enemies", x: 100 });
    const wounded = makeUnit({ id: "escort-wounded", sourceId: "E01", team: "enemies", hp: 50, maxHp: 100 });
    for (let hit = 0; hit < 6; hit += 1) afterEnemyBasicHit(healer, first, { next: () => 0.5, int: (min) => min, pick: <T>(values: readonly T[]) => values[0]! }, [healer, first, wounded]);
    expect(wounded.shield).toBe(12);
  });

  it("completes B120 phase active and resumes its signature active", () => {
    const source = makeUnit({ id: "enemy-B120", sourceId: "B120", team: "enemies", hp: 40, maxHp: 100, x: 100, skillTriggerMs: initialEnemySkillTrigger("B120") });
    const hero = makeUnit({ id: "hero-front", team: "heroes", x: 100 });
    const phaseStart = advanceEnemyBehavior(source, [source, hero], 0);
    expect(phaseStart).toContainEqual(expect.objectContaining({ type: "skill:started", skillId: "b120-tail-answer" }));
    advanceEnemyBehavior(source, [source, hero], 700);
    completeEnemyActive(source);
    const signature = advanceEnemyBehavior(source, [source, hero], 5400);
    expect(signature).toContainEqual(expect.objectContaining({ type: "skill:started", skillId: "b120-glaive-sweep" }));
  });

  it("starts and completes every mainline boss active and phase path", () => {
    for (const id of MAINLINE_BOSSES) {
      const source = makeUnit({ id: `enemy-${id}`, sourceId: id, team: "enemies", hp: 100, maxHp: 100, x: 100, skillTriggerMs: initialEnemySkillTrigger(id) });
      const hero = makeUnit({ id: `hero-${id}`, team: "heroes", x: 100 });
      const activeStart = advanceEnemyBehavior(source, [source, hero], initialEnemySkillTrigger(id));
      expect(activeStart, id).toContainEqual(expect.objectContaining({ type: "skill:started" }));
      completeEnemyActive(source);
      source.hp = 40;
      const phaseStart = advanceEnemyBehavior(source, [source, hero], 0);
      if (source.skillPrepareMs !== null) {
        advanceEnemyBehavior(source, [source, hero], source.skillPrepareMs);
        completeEnemyActive(source);
      }
      expect(source.passiveFlags.enemyHealthPhaseUsed, id).toBe(true);
      expect(phaseStart.every((event) => event.type !== "damage")).toBe(true);
    }
  });
});
