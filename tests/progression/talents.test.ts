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
  normalizeTalentRanks,
  talentUpgradeBlocked,
  upgradeTalent,
} from "../../src/progression/TalentSystem";
import type { HeroBattleBonus } from "../../src/simulation/BattleSimulation";

describe("specialization talent tree", () => {
  it("grants one point every five levels through level 85", () => {
    expect(getTalentPointsEarned(4)).toBe(0);
    expect(getTalentPointsEarned(5)).toBe(1);
    expect(getTalentPointsEarned(20)).toBe(4);
    expect(getTalentPointsEarned(85)).toBe(17);
    expect(getTalentPointsEarned(100)).toBe(17);
  });

  it("uses wide foundational tiers and narrow key tiers", () => {
    expect(TALENT_TIERS.map((tier) => tier.tier)).toEqual([0, 1, 2, 3]);
    expect(TALENT_TIERS.map((tier) => tier.pointCap)).toEqual([10, 1, 5, 1]);
    expect(talentsInTier("H01", 0)).toHaveLength(6);
    expect(talentsInTier("H01", 1)).toHaveLength(3);
    expect(talentsInTier("H01", 2)).toHaveLength(5);
    expect(talentsInTier("H01", 3)).toHaveLength(3);
  });

  it("unlocks later tiers after investing in the previous tier", () => {
    expect(isTalentTierUnlocked({}, 0)).toBe(true);
    expect(isTalentNodeUnlocked({}, "basic_a")).toBe(false);
    expect(talentUpgradeBlocked({}, "ultimate_a", 1, "H01")).toBe("需在「磨砺」投入 5 点");
    expect(upgradeTalent({}, "basic_a", 55, "H01")).toBeNull();

    let ranks = {};
    for (let i = 0; i < 5; i += 1) {
      ranks = upgradeTalent(ranks, "foundation_power", 55, "H01")!;
      ranks = upgradeTalent(ranks, "foundation_precision", 55, "H01")!;
    }
    expect(getTalentTierProgress(ranks, 0).spent).toBe(10);
    expect(isTalentTierUnlocked(ranks, 1)).toBe(true);
    const withBasic = upgradeTalent(ranks, "basic_a", 55, "H01")!;
    expect(withBasic.basic_a).toBe(1);
    expect(upgradeTalent(withBasic, "basic_b", 60, "H01")).toBeNull();
  });

  it("applies role stats and combat transformations to battle bonus", () => {
    const bonus: HeroBattleBonus = {};
    applyTalentBonus({ foundation_power: 2, basic_a: 1, ultimate_c: 1 }, "H01", bonus);
    expect(bonus.maxHpPct).toBeCloseTo(0.05);
    expect(bonus.talentBasicDamagePct).toBeCloseTo(0.18);
    expect(bonus.talentSpecialization).toBe(3);
  });

  it("unlocks the shared hero skill after the first ascension", () => {
    expect(canLearnHeroSkill(19, 1)).toBe(false);
    expect(canLearnHeroSkill(20, 0)).toBe(false);
    expect(canLearnHeroSkill(20, 1)).toBe(true);
  });

  it("describes current talent effect by rank", () => {
    expect(describeTalentEffectAtRank("H01", "foundation_power", 0)).toBe("尚未学习");
    expect(describeTalentEffectAtRank("H01", "foundation_power", 2)).toBe("生命 +5%");
    expect(describeTalentEffectAtRank("H02", "foundation_tempo", 1)).toBe("怒气获取 +2%");
  });

  it("migrates legacy allocations into the new tier budgets", () => {
    const migrated = normalizeTalentRanks({
      might_attack: 5,
      might_crit: 5,
      fort_hp: 5,
      fort_dr: 3,
      might_school: 4,
      spirit_heal: 4,
      fort_capstone: 1,
    });
    expect(getTalentTierProgress(migrated, 0).spent).toBe(10);
    expect(getTalentTierProgress(migrated, 1).spent).toBe(1);
    expect(getTalentTierProgress(migrated, 2).spent).toBe(5);
    expect(migrated.ultimate_b).toBe(1);
  });
});
