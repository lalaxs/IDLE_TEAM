import { describe, expect, it } from "vitest";
import { SPECIALIZATION_TALENTS } from "../../src/content/specializationTalents";
import type { SpecId } from "../../src/content/specializations";
import { specializationScenario } from "../support/specializationScenario";

describe("complete specialization talent combat", () => {
  for (const spec of Object.keys(SPECIALIZATION_TALENTS) as SpecId[]) {
    it.each([1, 2, 3])(`${spec} resolves choice %i over thirty seconds`, (choice) => {
      const result = specializationScenario(spec, 3, choice);
      expect(result.alive).toBe(true);
      expect(result.casts).toBeGreaterThan(1);
      expect(result.basicHits).toBeGreaterThan(0);
      for (const unit of result.simulation.getSnapshot().units) {
        expect(Number.isFinite(unit.hp)).toBe(true);
        expect(unit.hp).toBeGreaterThanOrEqual(0);
        expect(unit.hp).toBeLessThanOrEqual(unit.maxHp);
        expect(unit.shield).toBeGreaterThanOrEqual(0);
        expect(unit.rage).toBeGreaterThanOrEqual(0);
        expect(unit.rage).toBeLessThanOrEqual(unit.maxRage);
      }
    });
  }
});
