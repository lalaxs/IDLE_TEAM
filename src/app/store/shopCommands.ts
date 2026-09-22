import {
  SHOP_AD_REFRESH_LIMIT,
  SHOP_GOLD_REFRESH_LIMIT,
  getShopGoldRefreshCost,
  getShopRefreshKey,
} from "../../content/shop";
import { getDateKey } from "../../domain/time/GameDay";
import type { SaveDataV1 } from "../../domain/save/SaveData";
import { getBackpackCapacity } from "../../progression/AbilitySystem";
import { collectEquippedItemIds, insertInventoryItem } from "../../progression/EquipmentSystem";
import { recordTaskProgress } from "../../progression/RecurringTaskSystem";
import { createShopOffers } from "../../progression/ShopSystem";
import { getAdVipBenefits } from "../../content/adVip";
import { getVipShopPrice } from "../../progression/AdVipSystem";
import type { GameAction } from "../actions";
import type { AppEvent } from "../events";

type ShopAction = Extract<GameAction,
  { type: "shop:buy" | "shop:refresh" | "shop:claimAdRefreshes" | "shop:sync" }
>;

function isShopAction(action: GameAction): action is ShopAction {
  return action.type === "shop:buy"
    || action.type === "shop:refresh"
    || action.type === "shop:claimAdRefreshes"
    || action.type === "shop:sync";
}

export function handleShopCommand(action: GameAction, save: SaveDataV1, events: AppEvent[]): boolean {
  if (!isShopAction(action)) return false;
  if (action.type === "shop:buy") {
    const offer = save.shop.offers.find(({ offerId }) => offerId === action.offerId);
    if (!offer || offer.sold || save.gold < getVipShopPrice(save, offer.priceGold)) {
      events.push({ type: "toast", message: "金币不足或商品已售罄" });
      return true;
    }
    save.gold -= getVipShopPrice(save, offer.priceGold);
    offer.sold = true;
    recordTaskProgress(save, "purchase");
    if (offer.kind === "gems") save.gems += offer.gemAmount;
    else if (offer.kind === "material") save.materials[offer.materialId] += offer.amount;
    else if (offer.kind === "setEssence") save.setEssences[offer.setId] += offer.amount;
    else {
      const result = insertInventoryItem(
        save.inventory,
        save.overflow,
        offer.item,
        collectEquippedItemIds(save.roster),
        getBackpackCapacity(save.abilities),
      );
      save.inventory = result.inventory;
      save.overflow = result.overflow;
      save.gold += result.goldGained;
    }
    return true;
  }
  if (action.type === "shop:refresh") {
    if (save.adVip.freeRefreshesUsed < getAdVipBenefits(save.adVip.watchedAds).freeRefreshes) {
      save.adVip.freeRefreshesUsed += 1;
      refreshOffers(save);
    } else if (save.shop.goldRefreshesUsed < SHOP_GOLD_REFRESH_LIMIT) {
      const cost = getShopGoldRefreshCost(save.highestClearedStage, save.shop.goldRefreshesUsed);
      if (save.gold < cost) {
        events.push({ type: "toast", message: `金币不足，还需 ${cost - save.gold}` });
      } else {
        save.gold -= cost;
        save.shop.goldRefreshesUsed += 1;
        refreshOffers(save);
      }
    } else if (!save.shop.adRefreshesClaimed) {
      events.push({ type: "toast", message: "可观看广告获得 2 次刷新" });
    } else if (save.shop.adRefreshesUsed < SHOP_AD_REFRESH_LIMIT) {
      save.shop.adRefreshesUsed += 1;
      refreshOffers(save);
    } else {
      events.push({ type: "toast", message: "今日刷新次数已用完" });
    }
    return true;
  }
  if (action.type === "shop:claimAdRefreshes") {
    events.push({ type: "toast", message: "请通过广告或广告券领取刷新次数" });
    return true;
  }
  const now = new Date(action.now);
  const dateKey = getDateKey(now);
  const refreshKey = getShopRefreshKey(now);
  if (save.shop.dateKey !== dateKey) {
    save.shop.dateKey = dateKey;
    save.shop.goldRefreshesUsed = 0;
    save.shop.adRefreshesClaimed = false;
    save.shop.adRefreshesUsed = 0;
  }
  if (save.shop.refreshKey !== refreshKey) {
    save.shop.refreshKey = refreshKey;
    save.shop.refreshSequence = 0;
    save.shop.offers = createShopOffers(refreshKey, save.highestUnlockedStage);
  }
  return true;
}

function refreshOffers(save: SaveDataV1): void {
  save.shop.refreshSequence += 1;
  save.shop.offers = createShopOffers(
    save.shop.refreshKey,
    save.highestUnlockedStage,
    save.shop.refreshSequence,
  );
}
