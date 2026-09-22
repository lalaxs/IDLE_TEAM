export const AD_VIP_LEVELS = [
  { level: 0, ads: 0, offlineHours: 12, speed: 1, equipmentBonus: 0, freeRefreshes: 0, priceRate: 1, dailyGems: 0, weeklyGems: 0, weeklyTickets: 0 },
  { level: 1, ads: 10, offlineHours: 12, speed: 1, equipmentBonus: 0, freeRefreshes: 0, priceRate: 1, dailyGems: 10, weeklyGems: 50, weeklyTickets: 1 },
  { level: 2, ads: 50, offlineHours: 12, speed: 1, equipmentBonus: 0, freeRefreshes: 1, priceRate: .95, dailyGems: 15, weeklyGems: 75, weeklyTickets: 2 },
  { level: 3, ads: 100, offlineHours: 12, speed: 1.5, equipmentBonus: .05, freeRefreshes: 1, priceRate: .95, dailyGems: 20, weeklyGems: 100, weeklyTickets: 3 },
  { level: 4, ads: 200, offlineHours: 12, speed: 1.5, equipmentBonus: .1, freeRefreshes: 2, priceRate: .9, dailyGems: 25, weeklyGems: 125, weeklyTickets: 4 },
  { level: 5, ads: 350, offlineHours: 12, speed: 1.5, equipmentBonus: .15, freeRefreshes: 2, priceRate: .85, dailyGems: 30, weeklyGems: 150, weeklyTickets: 5 },
  { level: 6, ads: 500, offlineHours: 12, speed: 2, equipmentBonus: .2, freeRefreshes: 3, priceRate: .85, dailyGems: 40, weeklyGems: 200, weeklyTickets: 6 },
] as const;
export type AdVipBenefits = (typeof AD_VIP_LEVELS)[number];
export type BattleSpeed = 1 | 1.5 | 2;
export function getAdVipBenefits(watchedAds: number): AdVipBenefits {
  return [...AD_VIP_LEVELS].reverse().find((tier) => watchedAds >= tier.ads) ?? AD_VIP_LEVELS[0];
}
