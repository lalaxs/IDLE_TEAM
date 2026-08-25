import { describe, expect, it } from "vitest";
import { TALENT_TIERS, talentsInTier } from "../../src/content/talents";
import {
  applyTalentBonus,
  canLearnHeroSkill,
  describeTalentEffectAtRank,
  getTalentPointsEarned,
  getTalentTierProgress,
  isTalentNodeUnlocked,
  isTalentTierUnlocked,
  upgradeTalent,
} from "../../src/progression/TalentSystem";
import type { HeroBattleBonus } from "../../src/simulation/BattleSimulation";

describe("shared talent tree", () => {
  it("grants one point every five levels", () => {
    expect(getTalentPointsEarned(4)).toBe(0);
    expect(getTalentPointsEarned(5)).toBe(1);
    expect(getTalentPointsEarned(20)).toBe(4);
    expect(getTalentPointsEarned(100)).toBe(20);
  });

  it("uses wide foundational tiers and narrow key tiers", () => {
    expect(TALENT_TIERS.map((tier) => tier.tier)).toEqual([0, 1, 2, 3]);
    expect(talentsInTier(0)).toHaveLength(6);
    expect(talentsInTier(1)).toHaveLength(3);
    expect(talentsInTier(2)).toHaveLength(6);
    expect(talentsInTier(3)).toHaveLength(3);
  });

  it("unlocks later tiers after investing in the previous tier", () => {
    expect(isTalentTierUnlocked({}, 0)).toBe(true);
    expect(isTalentNodeUnlocked({}, "might_skill")).toBe(false);
    expect(upgradeTalent({}, "might_skill", 20)).toBeNull();

    let ranks = {};
    for (let i = 0; i < 4; i += 1) {
      ranks = upgradeTalent(ranks, "might_attack", 40)!;
    }
    expect(getTalentTierProgress(ranks, 0).spent).toBe(4);
    expect(isTalentTierUnlocked(ranks, 1)).toBe(true);
    expect(upgradeTalent(ranks, "might_skill", 40)?.might_skill).toBe(1);
  });

  it("applies attack percent to battle bonus", () => {
    const bonus: HeroBattleBonus = {};
    applyTalentBonus({ might_attack: 2 }, "H01", bonus);
    expect(bonus.attackPct).toBeCloseTo(0.05);
  });

  it("unlocks the shared hero skill at level 20", () => {
    expect(canLearnHeroSkill(19)).toBe(false);
    expect(canLearnHeroSkill(20)).toBe(true);
  });

  it("describes current talent effect by rank", () => {
    expect(describeTalentEffectAtRank("might_attack", 0)).toBe("尚未学习");
    expect(describeTalentEffectAtRank("might_attack", 2)).toBe("攻击 +5%");
    expect(describeTalentEffectAtRank("spirit_haste", 1)).toBe("攻击速度 +2.5%");
  });
});
