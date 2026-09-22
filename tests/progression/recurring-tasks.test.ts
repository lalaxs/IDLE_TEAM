import { afterEach, describe, expect, it, vi } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { getTaskMilestoneRewards, recordTaskProgress, taskActivity, taskPeriodKey } from "../../src/progression/RecurringTaskSystem";
import { RECURRING_TASKS } from "../../src/content/recurringTasks";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";
import { getHeroLevelCap } from "../../src/progression/HeroProgression";

const date = (day: number) => new Date(2026, 8, day, 12).getTime();
function setup(day = 22) { vi.useFakeTimers(); vi.setSystemTime(date(day)); const save = createDefaultSave(); return { save, store: new GameStore(save) }; }
afterEach(() => vi.useRealTimers());

describe("daily and weekly tasks", () => {
  it("keeps Sunday progress until Monday 05:00, including reloads and shop daily allowances", () => {
    const { save, store } = setup(27);
    recordTaskProgress(save, "victory", 10);
    store.dispatch({ type: "tasks:claim", period: "daily", taskId: "victory" });
    save.shop.goldRefreshesUsed = 2;
    save.shop.adRefreshesClaimed = true;
    save.shop.adRefreshesUsed = 2;
    for (const hour of [0, 4]) {
      const now = new Date(2026, 8, 28, hour, 59, 59).getTime();
      vi.setSystemTime(now);
      store.dispatch({ type: "tasks:sync" });
      store.dispatch({ type: "shop:sync", now });
      expect(taskPeriodKey("weekly", now)).toBe("2026-09-21");
      expect(save.recurringTasks.daily.claimed).toEqual(["victory"]);
      expect(repairSaveData(JSON.parse(JSON.stringify(save))).recurringTasks).toEqual(save.recurringTasks);
      expect(save.shop.goldRefreshesUsed).toBe(2);
      expect(save.shop.adRefreshesUsed).toBe(2);
    }
    const now = new Date(2026, 8, 28, 5).getTime();
    vi.setSystemTime(now);
    store.dispatch({ type: "tasks:sync" });
    store.dispatch({ type: "shop:sync", now });
    expect(save.recurringTasks.daily.key).toBe("2026-09-28");
    expect(save.recurringTasks.weekly.key).toBe("2026-09-28");
    expect(save.recurringTasks.daily.claimed).toEqual([]);
    expect(save.recurringTasks.weekly.progress.victory).toBe(0);
    expect(save.shop.goldRefreshesUsed).toBe(0);
    expect(save.shop.adRefreshesUsed).toBe(0);
    expect(save.shop.adRefreshesClaimed).toBe(false);
  });

  it("resets daily progress while keeping weekly progress and does not award login activity", () => {
    const { save, store } = setup();
    expect(taskActivity(save.recurringTasks.daily)).toBe(0);
    recordTaskProgress(save, "alchemy", 2);
    vi.setSystemTime(date(23));
    store.dispatch({ type: "tasks:sync" });
    expect(save.recurringTasks.daily.progress.alchemy).toBe(0);
    expect(save.recurringTasks.weekly.progress.alchemy).toBe(2);
    const loaded = repairSaveData(JSON.parse(JSON.stringify(save)));
    new GameStore(loaded).dispatch({ type: "tasks:sync" });
    expect(loaded.recurringTasks).toEqual(save.recurringTasks);
  });

  it("tracks battles in both periods and purchases only in daily tasks", () => {
    const { save, store } = setup();
    store.dispatch({ type: "stage:victory", stage: 1, gold: 0, exp: 0, items: [] });
    expect(save.recurringTasks.daily.progress.victory).toBe(1);
    expect(save.recurringTasks.weekly.progress.victory).toBe(1);
    store.dispatch({ type: "shop:buy", offerId: "missing" });
    expect(save.recurringTasks.daily.progress.purchase).toBe(0);
    save.gold = 999999;
    const offerId = save.shop.offers[0]!.offerId;
    store.dispatch({ type: "shop:buy", offerId });
    store.dispatch({ type: "shop:buy", offerId });
    expect(save.recurringTasks.daily.progress.purchase).toBe(1);
    expect(save.recurringTasks.weekly.progress.purchase).toBe(0);
  });

  it("counts successful alchemy and manual hero upgrades without counting rejected or passive upgrades", () => {
    const { save, store } = setup();
    store.dispatch({ type: "alchemy:craft", itemIds: [] });
    expect(save.recurringTasks.weekly.progress.alchemy).toBe(0);
    const inputs = Array.from({ length: 9 }, (_, index) => createEquipment("weapon_guard_blade", 2, "common", new SeededRandom(50 + index)));
    save.inventory.push(...inputs);
    const itemIds = inputs.map((item) => item.instanceId);
    store.dispatch({ type: "alchemy:craft", itemIds });
    store.dispatch({ type: "alchemy:craft", itemIds });
    expect(save.recurringTasks.daily.progress.alchemy).toBe(1);
    expect(save.recurringTasks.weekly.progress.alchemy).toBe(1);
    save.exp = 0;
    store.dispatch({ type: "hero:levelUp", heroId: "H02" });
    expect(save.recurringTasks.weekly.progress.hero_level).toBe(0);
    save.exp = 999999;
    store.dispatch({ type: "hero:levelUp", heroId: "H02" });
    store.dispatch({ type: "hero:levelUp", heroId: "H02" });
    expect(save.recurringTasks.daily.progress.hero_level).toBe(1);
    expect(save.recurringTasks.weekly.progress.hero_level).toBe(2);
    store.dispatch({ type: "stage:victory", stage: 1, gold: 0, exp: 999999, items: [] });
    expect(save.recurringTasks.weekly.progress.hero_level).toBe(2);
  });

  it("counts five-pull summons and batch gem fusion by actual successful quantities", () => {
    const { save, store } = setup();
    save.gems = 0;
    store.dispatch({ type: "summon:five" });
    expect(save.recurringTasks.weekly.progress.summon).toBe(0);
    save.gems = 999999;
    store.dispatch({ type: "summon:single" });
    expect(save.recurringTasks.weekly.progress.summon).toBe(1);
    store.dispatch({ type: "summon:five" });
    expect(save.recurringTasks.weekly.progress.summon).toBe(5);
    expect(save.recurringTasks.daily.progress.summon).toBe(0);
    for (const id of Object.keys(save.materials) as (keyof typeof save.materials)[]) save.materials[id] = 0;
    store.dispatch({ type: "craft:fuseAllGems" });
    expect(save.recurringTasks.weekly.progress.gem_fusion).toBe(0);
    save.materials.gem_atk = 3;
    store.dispatch({ type: "craft:fuseGemRank", gemId: "gem_atk" });
    expect(save.recurringTasks.weekly.progress.gem_fusion).toBe(1);
    save.materials.gem_atk = 6;
    store.dispatch({ type: "craft:fuseAllGems" });
    expect(save.recurringTasks.weekly.progress.gem_fusion).toBe(3);
    expect(save.recurringTasks.daily.progress.gem_fusion).toBe(1);
  });

  it("grants each task and milestone once, persists rewards, and resets unclaimed progress", () => {
    const { save, store } = setup();
    const before = { gold: save.gold, exp: save.exp, gems: save.gems, stones: save.materials.mat_ascend_stone };
    store.dispatch({ type: "tasks:milestone", period: "daily", points: 100 });
    store.dispatch({ type: "tasks:claim", period: "daily", taskId: "victory" });
    expect(save.gold).toBe(before.gold);
    for (const task of RECURRING_TASKS.daily) {
      save.recurringTasks.daily.progress[task.id] = task.target;
      store.dispatch({ type: "tasks:claim", period: "daily", taskId: task.id });
      store.dispatch({ type: "tasks:claim", period: "daily", taskId: task.id });
    }
    expect(taskActivity(save.recurringTasks.daily)).toBe(100);
    for (const points of [40, 80, 100]) store.dispatch({ type: "tasks:milestone", period: "daily", points });
    expect(save.gold).toBe(before.gold + 12000);
    expect(save.exp).toBe(before.exp + 1200);
    expect(save.gems).toBe(before.gems + 80);
    expect(save.materials.mat_ascend_stone).toBe(before.stones);
    expect(save.rewardBoxes).toEqual({ gem_box: 2, material_box: 1 });
    expect(save.adTickets).toBe(1);
    const loaded = repairSaveData(JSON.parse(JSON.stringify(save)));
    const restoredStore = new GameStore(loaded);
    restoredStore.dispatch({ type: "tasks:milestone", period: "daily", points: 100 });
    expect(loaded.adTickets).toBe(1);
    expect(loaded.recurringTasks.daily.milestones).toEqual([40, 80, 100]);
    vi.setSystemTime(date(23));
    restoredStore.dispatch({ type: "tasks:milestone", period: "daily", points: 100 });
    expect(loaded.adTickets).toBe(1);
    expect(loaded.recurringTasks.daily.claimed).toEqual([]);
  });

  it("retains previously claimed milestone rewards when retired tasks are removed", () => {
    const { save } = setup();
    const source = JSON.parse(JSON.stringify(save));
    source.recurringTasks.daily.progress = { login: 1, salvage: 5, victory: 10, expedition: 1, loot: 1, purchase: 0 };
    source.recurringTasks.daily.claimed = ["login", "salvage", "victory", "expedition", "loot"];
    source.recurringTasks.daily.milestones = [40, 80, 100];
    const loaded = repairSaveData(source);
    expect(loaded.recurringTasks.daily.claimed).toEqual(["victory", "loot", "expedition"]);
    expect(loaded.recurringTasks.daily.milestones).toEqual([40, 80, 100]);
    expect(loaded.recurringTasks.daily.progress.alchemy).toBe(0);
    const store = new GameStore(loaded);
    recordTaskProgress(loaded, "purchase"); recordTaskProgress(loaded, "alchemy"); recordTaskProgress(loaded, "hero_level");
    for (const task of RECURRING_TASKS.daily) store.dispatch({ type: "tasks:claim", period: "daily", taskId: task.id });
    store.dispatch({ type: "tasks:milestone", period: "daily", points: 100 });
    expect(loaded.adTickets).toBe(save.adTickets);
  });

  it("counts real chest openings only in daily tasks and ignores duplicate or debug openings", () => {
    const { save, store } = setup();
    store.dispatch({ type: "lootChest:open", now: Date.now() });
    expect(save.recurringTasks.daily.progress.loot).toBe(0);
    save.lootChest.startedAt = Date.now() - 8 * 60 * 60_000;
    store.dispatch({ type: "lootChest:open", now: Date.now() });
    store.dispatch({ type: "lootChest:open", now: Date.now() });
    expect(save.recurringTasks.daily.progress.loot).toBe(1);
    expect(save.recurringTasks.weekly.progress.loot).toBe(0);
    vi.setSystemTime(date(23));
    save.lootChest.startedAt = Date.now();
    store.dispatch({ type: "debug:grantLootChests", tiers: ["wood"] });
    store.dispatch({ type: "lootChest:open", now: Date.now() });
    expect(save.recurringTasks.daily.progress.loot).toBe(0);
  });

  it("counts only completed expedition claims in both periods", () => {
    const { save, store } = setup();
    const run = { dungeonId: "D01" as const, heroIds: ["H02" as const], startedAt: Date.now(), maxStamina: 100 };
    save.dungeonRuns = [run];
    store.dispatch({ type: "dungeon:claim", dungeonId: "D01" });
    store.dispatch({ type: "dungeon:recall", dungeonId: "D01" });
    expect(save.recurringTasks.weekly.progress.expedition).toBe(0);
    save.dungeonRuns = [{ ...run, startedAt: Date.now() - 24 * 60 * 60_000 }];
    store.dispatch({ type: "dungeon:claim", dungeonId: "D01" });
    store.dispatch({ type: "dungeon:claim", dungeonId: "D01" });
    expect(save.recurringTasks.daily.progress.expedition).toBe(1);
    expect(save.recurringTasks.weekly.progress.expedition).toBe(1);
  });

  it.each(["daily", "weekly"] as const)("allows any five %s tasks to earn all milestones while extra tasks still award gold", (period) => {
    const { save, store } = setup();
    const before = { exp: save.exp, gems: save.gems, stones: save.materials.mat_ascend_stone };
    save.currentStage = 10;
    expect(getTaskMilestoneRewards(save, period, 80)[0]).toEqual(period === "daily" ? { id: "exp", amount: 600 } : { id: "gold", amount: 20000 });
    save.currentStage = 50;
    const tasks = RECURRING_TASKS[period];
    const chosen = tasks.slice(-5);
    const optional = tasks.slice(0, -5);
    expect(optional.length).toBeGreaterThan(0);
    for (const task of chosen) {
      recordTaskProgress(save, task.id, task.target);
      store.dispatch({ type: "tasks:claim", period, taskId: task.id });
    }
    expect(taskActivity(save.recurringTasks[period])).toBe(100);
    for (const points of [40, 80, 100]) store.dispatch({ type: "tasks:milestone", period, points });
    expect(save.recurringTasks[period].milestones).toEqual([40, 80, 100]);
    const expectedExp = before.exp + (period === "daily" ? 1200 : 0);
    const expectedGems = before.gems + (period === "daily" ? 80 : 400);
    expect(save.exp).toBe(expectedExp);
    expect(save.gems).toBe(expectedGems);
    expect(save.materials.mat_ascend_stone).toBe(before.stones);
    const loaded = repairSaveData(JSON.parse(JSON.stringify(save)));
    loaded.currentStage = 60;
    expect(getTaskMilestoneRewards(loaded, period, 80)[0]).toEqual(period === "daily" ? { id: "exp", amount: 600 } : { id: "gold", amount: 20000 });
    const restoredStore = new GameStore(loaded);
    for (const points of [80, 100]) restoredStore.dispatch({ type: "tasks:milestone", period, points });
    expect(loaded.exp).toBe(expectedExp);
    expect(loaded.gems).toBe(expectedGems);
    const gold = save.gold;
    for (const task of optional) {
      recordTaskProgress(save, task.id, task.target);
      store.dispatch({ type: "tasks:claim", period, taskId: task.id });
    }
    expect(save.gold).toBe(gold + optional.reduce((total, task) => total + task.gold, 0));
    expect(taskActivity(save.recurringTasks[period])).toBe(100);
    expect(save.recurringTasks[period].claimed).toHaveLength(tasks.length);
    vi.setSystemTime(date(29));
    restoredStore.dispatch({ type: "tasks:sync" });
    expect(loaded.recurringTasks[period].claimedExp).toBeUndefined();
    expect(getTaskMilestoneRewards(loaded, period, 80)[0]).toEqual(period === "daily" ? { id: "exp", amount: 600 } : { id: "gold", amount: 20000 });
  });

  it("counts successful ascensions and socket openings only in weekly tasks", () => {
    const { save, store } = setup();
    const hero = save.roster.H02;
    hero.unlocked = true;
    hero.ascendLevel = 0;
    hero.level = getHeroLevelCap(0);
    hero.stars = 0;
    save.materials.mat_ascend_stone = 0;
    store.dispatch({ type: "hero:ascend", heroId: "H02" });
    expect(save.recurringTasks.weekly.progress.hero_ascend).toBe(0);
    save.materials.mat_ascend_stone = 100;
    store.dispatch({ type: "hero:ascend", heroId: "H02" });
    store.dispatch({ type: "hero:ascend", heroId: "H02" });
    expect(save.recurringTasks.weekly.progress.hero_ascend).toBe(1);
    expect(save.recurringTasks.daily.progress.hero_ascend).toBe(0);
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(1));
    save.inventory.push(item);
    save.gold = 10000;
    save.materials.mat_socket_stone = 0;
    store.dispatch({ type: "craft:socket", itemId: item.instanceId });
    expect(save.recurringTasks.weekly.progress.socket).toBe(0);
    save.materials.mat_socket_stone = 100;
    for (let i = 0; i < 3; i++) store.dispatch({ type: "craft:socket", itemId: item.instanceId });
    expect(save.recurringTasks.weekly.progress.socket).toBe(2);
    expect(save.recurringTasks.daily.progress.socket).toBe(0);
  });
});
