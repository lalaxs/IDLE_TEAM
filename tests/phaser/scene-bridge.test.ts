import { describe, expect, it } from "vitest";
import { SceneBridge, type BattleViewAdapter } from "../../src/phaser/SceneBridge";
import type { BattleSnapshot } from "../../src/simulation/types";
import { makeUnit } from "../support/makeUnit";

describe("SceneBridge", () => {
  it("creates, updates, and removes unit views from snapshots", () => {
    const calls: string[] = [];
    const adapter: BattleViewAdapter = {
      createUnit: (unit) => calls.push(`create:${unit.id}`),
      updateUnit: (unit) => calls.push(`update:${unit.id}`),
      removeUnit: (id) => calls.push(`remove:${id}`),
      playEvent: () => undefined,
    };
    const bridge = new SceneBridge(adapter);
    const snapshot = (units: BattleSnapshot["units"]): BattleSnapshot => ({
      stage: 1, wave: 1, state: "engaging", elapsedMs: 0, progress: 0, bossActive: false, seed: 1, units,
    });
    bridge.sync(snapshot([makeUnit({ id: "a" })]), []);
    bridge.sync(snapshot([makeUnit({ id: "a", x: 200 }), makeUnit({ id: "b" })]), []);
    bridge.sync(snapshot([makeUnit({ id: "b" })]), []);
    expect(calls).toEqual(["create:a", "update:a", "create:b", "update:b", "remove:a"]);
  });

  it("plays each drained event exactly once", () => {
    let events = 0;
    const bridge = new SceneBridge({
      createUnit: () => undefined,
      updateUnit: () => undefined,
      removeUnit: () => undefined,
      playEvent: () => void (events += 1),
    });
    const snapshot: BattleSnapshot = { stage: 1, wave: 1, state: "engaging", elapsedMs: 0, progress: 0, bossActive: false, seed: 1, units: [] };
    bridge.sync(snapshot, [{ type: "wave:started", wave: 1 }]);
    bridge.sync(snapshot, []);
    expect(events).toBe(1);
  });
});
