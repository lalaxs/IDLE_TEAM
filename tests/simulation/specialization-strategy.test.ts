import { describe, expect, it } from "vitest";
import { SeededRandom } from "../../src/simulation/RandomSource";
import { castSpecializationSkill, onAnyHeroSkillCast, shouldCastSpecialization, tickSpecializationPassives } from "../../src/simulation/SpecializationSkillSystem";
import { tryCastSkill } from "../../src/simulation/SkillSystem";
import { makeUnit } from "../support/makeUnit";

const random = new SeededRandom(23);
const brewer = () => makeUnit({ id: "brew", sourceId: "H62", hp: 900, maxHp: 1000, rage: 40, skillCastCount: 1,
  passiveFlags: { specStaggerPool: 20 } });
const foe = () => makeUnit({ id: "foe", sourceId: "E01", team: "enemies", x: 160, targetId: "brew", hp: 100000, maxHp: 100000 });

describe("specialization automatic decisions", () => {
  it("holds a small stagger pool without spending rage, then purifies accumulated damage", () => {
    const source = brewer(); const target = foe(); const units = [source, target];
    expect(tryCastSkill(source, units, random)).toEqual([]);
    expect(source.rage).toBe(40);
    target.attackCooldownMs = 2500;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    target.attackCooldownMs = 0;
    source.passiveFlags.specStaggerPool = 80;
    expect(shouldCastSpecialization(source, units)).toBe(true);
  });

  it("does not delay opening taunt, a threatened ally, critical healing or rage overflow", () => {
    const source = brewer(); const target = foe(); const ally = makeUnit({ id: "ally", sourceId: "H65" });
    const units = [source, target, ally];
    source.skillCastCount = 0;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    source.skillCastCount = 1; target.targetId = ally.id;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    target.x = 900;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    target.x = 160; target.targetId = source.id; source.hp = 450;
    expect(shouldCastSpecialization(source, units)).toBe(true);
    source.hp = 900; source.rage = 90;
    expect(shouldCastSpecialization(source, units)).toBe(true);
  });

  it("limits waiting and finishes an already prepared purification after a teammate heals", () => {
    const source = brewer(); const units = [source, foe()];
    tickSpecializationPassives(source, units, 1150, random);
    expect(shouldCastSpecialization(source, units)).toBe(false);
    tickSpecializationPassives(source, units, 50, random);
    expect(shouldCastSpecialization(source, units)).toBe(true);
    source.passiveFlags.specBrewWaitMs = 0;
    source.passiveFlags.specStaggerPool = 0;
    source.skillCastId = "brew:skill:1";
    expect(shouldCastSpecialization(source, units)).toBe(true);
    tryCastSkill(source, units, random);
    expect(source.skillCastCount).toBe(2);
    expect(source.passiveFlags.specBrewWaitMs).toBe(0);
  });

  it("automatically prefers a damage dealer over a higher-attack tank or healer", () => {
    const source = makeUnit({ id: "support", sourceId: "H30" });
    const tank = makeUnit({ id: "tank", sourceId: "H35", attack: 600 });
    const healer = makeUnit({ id: "healer", sourceId: "H65", attack: 700 });
    const damage = makeUnit({ id: "damage", sourceId: "H57", attack: 200 });
    castSpecializationSkill(source, [source, tank, healer, damage, foe()], random);
    expect(damage.passiveFlags.specAugmentSourceId).toBe(source.id);
    expect(healer.passiveFlags.specAugmentSourceId).toBeUndefined();
  });

  it("honors a chosen teammate and falls back when they die or leave", () => {
    const source = makeUnit({ id: "support", sourceId: "H30", passiveFlags: { augmentationTargetId: "H65" } });
    const healer = makeUnit({ id: "healer", sourceId: "H65", attack: 200 });
    const damage = makeUnit({ id: "damage", sourceId: "H57", attack: 300 });
    castSpecializationSkill(source, [source, healer, damage, foe()], random);
    expect(healer.passiveFlags.specAugmentSourceId).toBe(source.id);
    healer.alive = false;
    castSpecializationSkill(source, [source, healer, damage, foe()], random);
    expect(damage.passiveFlags.specAugmentSourceId).toBe(source.id);
    delete damage.passiveFlags.specAugmentSourceId;
    castSpecializationSkill(source, [source, damage, foe()], random);
    expect(damage.passiveFlags.specAugmentSourceId).toBe(source.id);
  });

  it("uses a living ally in a team without damage dealers and prioritizes damage for relay", () => {
    const source = makeUnit({ id: "support", sourceId: "H30", passiveFlags: { talentSpecialization: 2 } });
    const healer = makeUnit({ id: "healer", sourceId: "H65", attack: 700 });
    const tank = makeUnit({ id: "tank", sourceId: "H35", attack: 600 });
    castSpecializationSkill(source, [source, healer, tank, foe()], random);
    expect(healer.passiveFlags.specAugmentSourceId).toBe(source.id);
    const damage = makeUnit({ id: "damage", sourceId: "H57", attack: 200 });
    onAnyHeroSkillCast(healer, [source, healer, tank, damage]);
    expect(damage.passiveFlags.specAttackBuffPct).toBe(0.06);
    expect(damage.passiveFlags.specAugmentSourceId).toBeUndefined();
  });
});
