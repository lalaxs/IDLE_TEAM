export const SHOP_SIZE = 10;
export const SHOP_EQUIPMENT_OFFER_COUNT = 5;
export const SHOP_MATERIAL_OFFER_COUNT = 4;
export const GEM_OFFER_AMOUNT = 50;
export const SHOP_NATURAL_REFRESH_HOURS = 6;
export const SHOP_GOLD_REFRESH_LIMIT = 2;
export const SHOP_AD_REFRESH_LIMIT = 2;

export const getGemOfferPrice = (highestClearedStage: number): number =>
  1200 + highestClearedStage * 120;

/** Fixed local-time refresh windows: 00:00, 06:00, 12:00, and 18:00. */
export function getShopRefreshKey(now = new Date()): string {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const slotHour = Math.floor(now.getHours() / SHOP_NATURAL_REFRESH_HOURS) * SHOP_NATURAL_REFRESH_HOURS;
  return `${date}-${String(slotHour).padStart(2, "0")}`;
}

export function getNextShopRefreshAt(now = new Date()): number {
  const next = new Date(now);
  const nextHour = (Math.floor(now.getHours() / SHOP_NATURAL_REFRESH_HOURS) + 1) * SHOP_NATURAL_REFRESH_HOURS;
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return next.getTime();
}

/** Gold refreshes cost roughly five and ten minutes of base offline income. */
export function getShopGoldRefreshCost(highestClearedStage: number, refreshIndex: number): number {
  const stage = Math.max(1, Math.round(highestClearedStage));
  const minutes = refreshIndex <= 0 ? 5 : 10;
  return (20 + stage * 12) * minutes;
}
