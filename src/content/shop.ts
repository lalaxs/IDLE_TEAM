export const SHOP_SIZE = 4;
export const GEM_OFFER_AMOUNT = 50;
export const getGemOfferPrice = (highestClearedStage: number): number =>
  1200 + highestClearedStage * 120;
