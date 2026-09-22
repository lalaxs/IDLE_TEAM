import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { GameStore } from "../../src/app/GameStore";
import { setRewardedAdProvider } from "../../src/app/RewardedAds";
import { AD_VIP_LEVELS, getAdVipBenefits } from "../../src/content/adVip";
import { claimVipGift, getVipShopPrice, syncAdVip, vipGift } from "../../src/progression/AdVipSystem";
import { calculateOfflineReward } from "../../src/progression/OfflineRewards";
import { StageRewardTracker } from "../../src/progression/RewardSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); setRewardedAdProvider(async () => "unavailable"); });
describe("advertising VIP", () => {
  it("unlocks only at cumulative thresholds and reserves double speed for 500 ads", () => {
    for (const tier of AD_VIP_LEVELS.slice(1)) {
      expect(getAdVipBenefits(tier.ads - 1).level).toBe(tier.level - 1);
      expect(getAdVipBenefits(tier.ads)).toBe(tier);
    }
    expect(getAdVipBenefits(499).speed).toBe(1.5);
    expect(getAdVipBenefits(500).speed).toBe(2);
  });
  it("counts completed ads once and ignores cancellation, failure and concurrent clicks", async () => {
    const save = createDefaultSave(); const store = new GameStore(save);
    save.adVip.watchedAds = 9;
    setRewardedAdProvider(async () => "cancelled");
    await store.watchAd("vip"); expect(save.adVip.watchedAds).toBe(9);
    setRewardedAdProvider(async () => { throw new Error("unavailable"); });
    await store.watchAd("vip"); expect(save.adVip.watchedAds).toBe(9);
    let finish!: (result: "completed") => void;
    const provider = vi.fn(() => new Promise<"completed">((resolve) => { finish = resolve; }));
    setRewardedAdProvider(provider);
    const pending = store.watchAd("vip"); await store.watchAd("vip");
    expect(provider).toHaveBeenCalledTimes(1);
    finish("completed"); await pending;
    expect(save.adVip.watchedAds).toBe(10);
    expect(getAdVipBenefits(save.adVip.watchedAds).level).toBe(1);
    save.adVip.watchedAds = 500; await store.watchAd("vip");
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it("grants shop ad refreshes through completion or a ticket without counting tickets", async () => {
    const save = createDefaultSave(); const store = new GameStore(save);
    save.shop.goldRefreshesUsed = 2; save.adTickets = 1;
    const provider = vi.fn(async () => "completed" as const); setRewardedAdProvider(provider);
    await store.watchAd("shop", true);
    expect(save.adTickets).toBe(0); expect(save.adVip.watchedAds).toBe(0);
    expect(save.shop.adRefreshesClaimed).toBe(true); expect(provider).not.toHaveBeenCalled();
    await store.watchAd("shop"); expect(provider).not.toHaveBeenCalled();
    save.shop.adRefreshesClaimed = false;
    await store.watchAd("shop"); expect(save.adVip.watchedAds).toBe(1);
    expect(save.shop.adRefreshesClaimed).toBe(true);
  });
  it("pays gift differences after upgrades and persists claims across reloads", () => {
    const save = createDefaultSave(); save.adVip.watchedAds = 10;
    const before = save.gems;
    expect(claimVipGift(save, "daily")).toMatchObject({ tickets: 1, gems: 10 });
    expect(claimVipGift(save, "weekly")).toMatchObject({ tickets: 1, gems: 50 });
    save.adVip.watchedAds = 500;
    expect(claimVipGift(save, "daily")).toMatchObject({ tickets: 0, gems: 30, topUp: true });
    expect(claimVipGift(save, "weekly")).toMatchObject({ tickets: 5, gems: 150, topUp: true });
    expect(save.gems).toBe(before + 240); expect(save.adTickets).toBe(7);
    const loaded = repairSaveData(JSON.parse(JSON.stringify(save)));
    expect(claimVipGift(loaded, "daily")).toBeNull(); expect(claimVipGift(loaded, "weekly")).toBeNull();
  });
  it("resets gifts and free refreshes Monday at 05:00 while retaining the VIP level", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 28, 4, 59));
    const save = createDefaultSave(); save.adVip.watchedAds = 500;
    claimVipGift(save, "daily"); claimVipGift(save, "weekly"); save.adVip.freeRefreshesUsed = 3;
    syncAdVip(save); expect(vipGift(save, "daily").gems).toBe(0);
    vi.setSystemTime(new Date(2026, 8, 28, 5)); syncAdVip(save);
    expect(save.adVip.watchedAds).toBe(500); expect(save.adVip.freeRefreshesUsed).toBe(0);
    expect(vipGift(save, "daily").gems).toBe(40); expect(vipGift(save, "weekly").gems).toBe(200);
  });
  it("uses free refreshes before paid refreshes and charges the displayed discounted price", () => {
    const save = createDefaultSave(); save.adVip.watchedAds = 500; save.gold = 100000;
    const store = new GameStore(save);
    for (let i = 0; i < 3; i++) store.dispatch({ type: "shop:refresh" });
    expect(save.gold).toBe(100000); expect(save.shop.goldRefreshesUsed).toBe(0);
    store.dispatch({ type: "shop:refresh" }); expect(save.shop.goldRefreshesUsed).toBe(1);
    const offer = save.shop.offers[0]!; const gold = save.gold;
    const price = getVipShopPrice(save, offer.priceGold);
    expect(price).toBe(Math.ceil(offer.priceGold * .85));
    store.dispatch({ type: "shop:buy", offerId: offer.offerId });
    expect(save.gold).toBe(gold - price);
    store.dispatch({ type: "shop:buy", offerId: offer.offerId }); expect(save.gold).toBe(gold - price);
  });
  it("caps all offline resources at each tier's hours", () => {
    for (const tier of AD_VIP_LEVELS) {
      const cap = tier.offlineHours * 60;
      const full = calculateOfflineReward(48 * 3600000, 10, 1, undefined, cap);
      expect(full).toEqual(calculateOfflineReward(cap * 60000, 10, 1, undefined, cap));
      expect(full.minutes).toBe(cap); expect(full.gold).toBe(140 * cap); expect(full.exp).toBeCloseTo(600 * 1.03 ** 7 * cap / 60);
    }
  });
  it("applies drop bonuses multiplicatively and keeps chapter bosses guaranteed", () => {
    vi.spyOn(SeededRandom.prototype, "next").mockReturnValue(.16);
    expect(new StageRewardTracker(1, 1).rollEnemy("elite", 0).item).toBeNull();
    expect(new StageRewardTracker(1, 1).rollEnemy("elite", 0, .2).item).not.toBeNull();
    expect(new StageRewardTracker(12, 1).rollEnemy("boss", 0, .2).item).not.toBeNull();
  });
  it("gates all speed changes and repairs locked speeds in saves", () => {
    const save = createDefaultSave(); const store = new GameStore(save);
    store.dispatch({ type: "battle:setSpeed", speed: 2 }); expect(save.settings.battleSpeed).toBe(1);
    save.adVip.watchedAds = 100;
    store.dispatch({ type: "battle:setSpeed", speed: 1.5 }); expect(save.settings.battleSpeed).toBe(1.5);
    store.dispatch({ type: "battle:setSpeed", speed: 2 }); expect(save.settings.battleSpeed).toBe(1.5);
    expect(repairSaveData(JSON.parse(JSON.stringify(save))).settings.battleSpeed).toBe(1.5);
    save.adVip.watchedAds = 500;
    store.dispatch({ type: "battle:setSpeed", speed: 2 }); expect(save.settings.battleSpeed).toBe(2);
    save.adVip.watchedAds = 0;
    expect(repairSaveData(JSON.parse(JSON.stringify(save))).settings.battleSpeed).toBe(1);
    const old = JSON.parse(JSON.stringify(save)); delete old.adVip;
    expect(repairSaveData(old).adVip.watchedAds).toBe(0);
  });
});
