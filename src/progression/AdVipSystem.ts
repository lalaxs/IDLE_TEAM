import { AD_VIP_LEVELS, getAdVipBenefits } from "../content/adVip";
import type { TaskPeriod } from "../content/recurringTasks";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { taskPeriodKey } from "../domain/activities/RecurringTaskState";

export function syncAdVip(save: SaveDataV1, now = Date.now()) {
  for (const period of ["daily", "weekly"] as const) {
    const key = taskPeriodKey(period, now);
    if (key > save.adVip[period].key) {
      save.adVip[period] = { key, claimedLevel: 0 };
      if (period === "daily") save.adVip.freeRefreshesUsed = 0;
    }
  }
}
export function vipGift(save: SaveDataV1, period: TaskPeriod) {
  const tier = getAdVipBenefits(save.adVip.watchedAds);
  const current = save.adVip[period];
  const claimedLevel = current.key === taskPeriodKey(period) ? current.claimedLevel : 0;
  const previous = AD_VIP_LEVELS[claimedLevel]!;
  return {
    gems: period === "daily" ? tier.dailyGems - previous.dailyGems : tier.weeklyGems - previous.weeklyGems,
    tickets: period === "daily" ? Number(tier.level > 0) - Number(previous.level > 0) : tier.weeklyTickets - previous.weeklyTickets,
    topUp: claimedLevel > 0 && claimedLevel < tier.level,
  };
}
export function hasVipRewards(save: SaveDataV1) {
  return [vipGift(save, "daily"), vipGift(save, "weekly")].some((gift) => gift.gems > 0 || gift.tickets > 0);
}
export function claimVipGift(save: SaveDataV1, period: TaskPeriod) {
  syncAdVip(save);
  const gift = vipGift(save, period);
  if (gift.gems <= 0 && gift.tickets <= 0) return null;
  save.gems += gift.gems;
  save.adTickets += gift.tickets;
  save.adVip[period].claimedLevel = getAdVipBenefits(save.adVip.watchedAds).level;
  return gift;
}
export function getVipShopPrice(save: SaveDataV1, basePrice: number) {
  return Math.ceil(basePrice * getAdVipBenefits(save.adVip.watchedAds).priceRate);
}
