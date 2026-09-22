import { afterEach, describe, expect, it, vi } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { GameSession } from "../../src/app/GameSession";
import { setRewardedAdProvider } from "../../src/app/RewardedAds";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { bestIdleProgress, heroUpgradeExperience, idleExperiencePerHour, referenceEncounter } from "../../src/content/numericalModel";
import { getHeroStats, getStarSkillEffectPct } from "../../src/progression/HeroProgression";
import { checkpointLootChest, previewLootChest } from "../../src/progression/LootChestSystem";
import { getEquipmentBonuses } from "../../src/progression/EquipmentBonuses";
import { generateStageRewards } from "../../src/progression/RewardSystem";

const HOUR = 3_600_000;
afterEach(() => { vi.useRealTimers(); setRewardedAdProvider(async () => "unavailable"); });

describe("90 day progression model", () => {
  it("prices a full five-hero team at 90 ordinary or 30 fully accelerated days", () => {
    let exp = 0, ordinary = 0, accelerated = 0;
    for (let level = 1; level < 100; level++) {
      const cost = 5 * heroUpgradeExperience(level), rate = idleExperiencePerHour(level);
      exp += cost; ordinary += cost / (27 * rate); accelerated += cost / (81 * rate);
    }
    expect(exp).toBe(14_100_190);
    expect(ordinary).toBeCloseTo(90, 1);
    expect(accelerated).toBeCloseTo(30, 1);
    expect(heroUpgradeExperience(100)).toBe(0);
  });

  it("separates star skill growth from ascension base attributes", () => {
    expect(getHeroStats("H01", 80, { stars: 15, ascendLevel: 3 })).toEqual(getHeroStats("H01", 80, { stars: 0, ascendLevel: 3 }));
    expect(getStarSkillEffectPct(15)).toBeCloseTo(.45);
    const save = createDefaultSave(); save.roster.H35.stars = 15;
    expect(getEquipmentBonuses(save).H35).toMatchObject({ skillEffectPct: expect.closeTo(.45), rageGainPct: .1 });
    save.roster.H35.level = 20; save.materials.mat_ascend_stone = 1; save.roster.H35.stars = 0;
    const store = new GameStore(save); store.dispatch({ type: "hero:ascend", heroId: "H35" });
    expect(save.roster.H35.ascendLevel).toBe(1);
    store.dispatch({ type: "hero:chooseSkill", heroId: "H35", skillId: "iron-wall" });
    expect(save.roster.H35.chosenSkillId).toBe("iron-wall");
  });

  it("grants experience once and caps active earnings by equivalent hours", () => {
    const save = createDefaultSave(), store = new GameStore(save);
    const before = save.exp;
    store.dispatch({ type: "stage:victory", stage: 1, exp: 600, gold: 0, items: [] });
    store.dispatch({ type: "stage:victory", stage: 1, exp: 600, gold: 0, items: [] });
    expect(save.exp - before).toBe(600);
    expect(save.roster.H35.level).toBe(1);
    expect(save.roster.H35.experience).toBe(0);
  });

  it("guarantees 55 stones once before their corresponding level caps", () => {
    const save = createDefaultSave(), store = new GameStore(save);
    const before = save.materials.mat_ascend_stone;
    for (const stage of [12, 72, 120, 120]) store.dispatch({ type: "stage:victory", stage, exp: 0, gold: 0, items: [] });
    store.dispatch({ type: "stage:select", difficulty: "hard", stage: 1 });
    store.dispatch({ type: "stage:victory", stage: 60, exp: 0, gold: 0, items: [] });
    expect(save.materials.mat_ascend_stone - before).toBe(55);
  });

  it("keeps old accumulated hours at their old resource tier after a clear and reload", () => {
    const save = createDefaultSave(0);
    checkpointLootChest(save.lootChest, HOUR, 1, "easy");
    const restored = repairSaveData(save, 2 * HOUR);
    const result = previewLootChest(restored.lootChest, 2 * HOUR, 12, "easy");
    expect(result.exp).toBe(Math.floor(600 + 600 * 1.03 ** 9));
    expect(result.accumulatedMs).toBe(2 * HOUR);
    restored.difficultyProgress.hard.highestClearedStage = 60;
    expect(bestIdleProgress(restored.difficultyProgress)).toEqual({ stage: 60, difficulty: "hard" });
  });

  it("uses one daily quota for ads and tickets and awards nothing for a cancelled ad", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 22, 18));
    const save = createDefaultSave(), store = new GameStore(save);
    save.adTickets = 10;
    save.lootChest.startedAt = Date.now() - 12 * HOUR;
    const initial = save.exp;
    setRewardedAdProvider(async () => "cancelled");
    await store.watchAd("idle-double");
    expect(save.exp).toBe(initial); expect(save.progressionDaily.doubleClaims).toBe(0);
    await store.watchAd("idle-double", true);
    expect(save.exp - initial).toBe(24 * 600); expect(save.adTickets).toBe(9);
    const afterDouble = save.exp;
    await store.watchAd("idle-double", true);
    expect(save.exp).toBe(afterDouble); expect(save.adTickets).toBe(9);
    setRewardedAdProvider(async () => "completed");
    await store.watchAd("idle-quick");
    await store.watchAd("idle-quick", true);
    await store.watchAd("idle-quick");
    await store.watchAd("idle-quick", true);
    expect(save.exp - afterDouble).toBe(30 * 600); expect(save.adTickets).toBe(8);
    expect(save.progressionDaily.quickRewards).toBe(3);
    const restored = repairSaveData(save); expect(restored.progressionDaily.quickRewards).toBe(3);
    vi.advanceTimersByTime(24 * HOUR); await store.watchAd("idle-quick", true);
    expect(save.progressionDaily.quickRewards).toBe(1);
  });

  it("uses only accrued time for a short double claim", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 22, 18));
    const save = createDefaultSave(), store = new GameStore(save);
    save.adTickets = 1; save.lootChest.startedAt -= 4 * HOUR;
    const before = save.exp;
    await store.watchAd("idle-double", true);
    expect(save.exp - before).toBe(8 * 600);
  });

  it("matches workbook reference endpoints and prices active clears from their target duration", () => {
    const end = referenceEncounter(120, "easy");
    expect(end.level).toBe(50); expect(end.bossHp).toBe(297769);
    expect(referenceEncounter(120, "torment").bossHp).toBe(5891394);
    const reward = generateStageRewards(120, 1);
    expect(reward.exp).toBe(Math.round(idleExperiencePerHour(50) * 2 * (5 * end.waveSeconds + end.bossSeconds) / 3600));
  });


  it("preserves personal experience across multiple manual upgrades and reloads", () => {
    const save = createDefaultSave(); save.exp = 0; save.roster.H35.experience = 42;
    const restored = repairSaveData(save), store = new GameStore(restored);
    store.dispatch({ type: "hero:levelUp", heroId: "H35" });
    expect(restored.roster.H35).toMatchObject({ level: 2, experience: 30 });
    store.dispatch({ type: "hero:levelUp", heroId: "H35" });
    expect(restored.roster.H35).toMatchObject({ level: 3, experience: 11 });
    expect(restored.exp).toBe(0);
    store.dispatch({ type: "hero:levelUp", heroId: "H35" });
    expect(restored.roster.H35.level).toBe(3);
  });

  it("fills ten starter equipment slots at the four level milestones", () => {
    const save = createDefaultSave(); save.exp = 1_000_000; save.roster.H35.level = 4;
    const store = new GameStore(save);
    for (let level = 4; level < 20; level++) store.dispatch({ type: "hero:levelUp", heroId: "H35" });
    const equipped = Object.values(save.roster.H35.equipment).filter(Boolean);
    expect(new Set(equipped).size).toBe(10);
    expect(save.inventory.filter(item => equipped.includes(item.instanceId)).map(item => item.rarity)).toEqual(Array(10).fill("common"));
  });

  it("lets the actual starting hero clear the first encounter chain", () => {
    const session = new GameSession(createDefaultSave(), 7);
    for (let step = 0; step < 6000 && !["victory", "defeat"].includes(session.snapshot.state); step++) session.step(50);
    expect(session.snapshot.state).toBe("victory");
    session.destroy();
  });
});
