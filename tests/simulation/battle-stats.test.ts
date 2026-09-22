import { describe, expect, it } from "vitest";
import { BattleStatsCollector } from "../../src/simulation/BattleStats";
import type { BattleSnapshot } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

describe("BattleStatsCollector", () => {
  it("aggregates totals and bounded source details, then resets for a new encounter", () => {
    const collector = new BattleStatsCollector();
    const hero = makeUnit({ id: "battle-hero-H01", sourceId: "H01" });
    const enemy = makeUnit({ id: "battle-enemy", team: "enemies", sourceId: "E01" });
    const snapshot: BattleSnapshot = {
      stage: 1,
      difficulty: "easy",
      wave: 1,
      state: "engaging",
      elapsedMs: 100,
      progress: 0,
      seed: 1,
      units: [hero, enemy],
      bossActive: false,
    };

    collector.syncSnapshot(snapshot, ["H01", null, null, null, null]);
    collector.record([
      { type: "skill:started", castId: "cast-1", sourceId: hero.id, skillId: "warrior_protection-active" },
      { type: "skill:resolved", castId: "cast-1", sourceId: hero.id, skillId: "warrior_protection-active", targetIds: [enemy.id] },
      { type: "damage", sourceId: hero.id, targetId: enemy.id, amount: 70, critical: false, skillCastId: "cast-1" },
      { type: "damage", sourceId: enemy.id, targetId: hero.id, amount: 25, critical: false, attackId: "enemy-basic-1" },
      {
        type: "heal",
        sourceId: hero.id,
        targetId: hero.id,
        amount: 12,
        attribution: { kind: "gear", id: "life-steal" },
      },
    ]);

    expect(collector.sortedEntries(["H01", null, null, null, null], "damage")[0]).toMatchObject({
      heroId: "H01",
      damage: 70,
      taken: 25,
      healing: 12,
    });
    expect(collector.sources("H01", "damage")).toEqual([
      expect.objectContaining({
        attribution: { kind: "activeSkill", id: "warrior_protection-active" },
        amount: 70,
        events: 1,
      }),
    ]);
    expect(collector.sources("H01", "taken")[0]?.attribution).toEqual({ kind: "basic", id: "basic" });
    expect(collector.sources("H01", "healing")[0]?.attribution).toEqual({ kind: "gear", id: "life-steal" });

    collector.syncSnapshot({ ...snapshot, seed: 2 }, ["H01", null, null, null, null]);
    expect(collector.sortedEntries(["H01", null, null, null, null], "damage")[0]?.damage).toBe(0);
    expect(collector.sources("H01", "damage")).toEqual([]);
  });
});
