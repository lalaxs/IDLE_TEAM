import { ABILITY_CATEGORY_TABS, type AbilityCategory } from "../../../content/abilities";
import { ACCOUNT_CURRENCY_BY_ID } from "../../../content/currencies";
import { getAdVipBenefits } from "../../../content/adVip";
import { getVipShopPrice } from "../../../progression/AdVipSystem";
import { ITEM_BY_ID } from "../../../content/items";
import { MATERIAL_BY_ID, type MaterialId } from "../../../content/materials";
import { SET_BY_ID, type SetId } from "../../../content/sets";
import {
  SHOP_AD_REFRESH_LIMIT,
  SHOP_GOLD_REFRESH_LIMIT,
  getShopGoldRefreshCost,
} from "../../../content/shop";
import {
  COMBAT_ABILITIES,
  ECONOMY_ABILITIES,
  GENERAL_ABILITIES,
  abilityCardMeta,
} from "../../../progression/AbilitySystem";
import type { GameStoreState } from "../../../app/GameStore";
import {
  abilityIconMarkup,
  compact,
  equipmentArt,
  equipmentSpecialMarks,
  formatShopRefreshCountdown,
  itemLevelBadge,
  legendaryTraitAria,
  materialArt,
  rarityClass,
} from "../../shared/presentation";

export interface ShopViewOptions {
  panel: "daily" | "abilities";
  abilityCategory: AbilityCategory;
  equipmentPopoverSource: "inventory" | "shop" | "alchemy" | "craft" | "loot-chest" | null;
  equipmentPopoverAnchorId: string | null;
  materialPopoverSource: "inventory" | "shop" | "imprint" | "craft" | "growth" | null;
  materialPopoverKind: "material" | "set-essence" | "imprint-essence" | "imprint-stone" | "item" | null;
  materialPopoverId: MaterialId | SetId | string | null;
}

export function renderShopView(state: GameStoreState, options: ShopViewOptions): string {
  const dailyActive = options.panel === "daily";
  return `
    <div class="shop-section-tabs" role="tablist" aria-label="商店分区">
      <button role="tab" class="shop-section-tab ${dailyActive ? "active" : ""}" data-action="shop-panel" data-panel="daily" aria-selected="${dailyActive}">精品补给</button>
      <button role="tab" class="shop-section-tab ${!dailyActive ? "active" : ""}" data-action="shop-panel" data-panel="abilities" aria-selected="${!dailyActive}">成长祝福</button>
    </div>
    ${dailyActive ? renderDailyShop(state, options) : renderAbilityShop(state, options.abilityCategory)}
  `;
}

function renderDailyShop(state: GameStoreState, options: ShopViewOptions): string {
  const shop = state.save.shop;
  const vip = getAdVipBenefits(state.save.adVip.watchedAds);
  const freeRemaining = Math.max(0, vip.freeRefreshes - state.save.adVip.freeRefreshesUsed);
  const paidRefreshesRemaining = SHOP_GOLD_REFRESH_LIMIT - shop.goldRefreshesUsed;
  const adRefreshesRemaining = shop.adRefreshesClaimed ? SHOP_AD_REFRESH_LIMIT - shop.adRefreshesUsed : 0;
  const refreshCost = getShopGoldRefreshCost(state.save.highestClearedStage, shop.goldRefreshesUsed);
  const refreshButton = freeRemaining > 0
    ? `<button class="secondary-button compact shop-refresh-button" data-action="shop-refresh"><span class="shop-refresh-button-face"><span>VIP免费刷新</span><small>${freeRemaining}/${vip.freeRefreshes}</small></span></button>`
    : paidRefreshesRemaining > 0
    ? `<button class="secondary-button compact shop-refresh-button" data-action="shop-refresh" ${state.save.gold < refreshCost ? "disabled" : ""} aria-label="消耗 ${refreshCost} 金币刷新商店，今日剩余 ${paidRefreshesRemaining} 次金币刷新"><span class="shop-refresh-button-face"><span>刷新</span><img class="inline-currency-icon" src="${ACCOUNT_CURRENCY_BY_ID.gold.icon}" alt=""><span>${compact(refreshCost)}</span><small>${paidRefreshesRemaining}/2</small></span></button>`
    : !shop.adRefreshesClaimed
      ? `<div class="shop-ad-actions"><button class="secondary-button compact shop-refresh-button" data-action="shop-ad-refresh"><span class="shop-refresh-button-face">看广告 +2次</span></button>${state.save.adTickets > 0 ? '<button class="secondary-button compact shop-refresh-button" data-action="shop-ticket-refresh">广告券×1 · +2次</button>' : ""}</div>`
      : adRefreshesRemaining > 0
        ? `<button class="secondary-button compact shop-refresh-button" data-action="shop-refresh" aria-label="使用广告刷新机会，今日剩余 ${adRefreshesRemaining} 次"><span class="shop-refresh-button-face"><span>广告刷新</span><small>${adRefreshesRemaining}/2</small></span></button>`
        : '<button class="secondary-button compact shop-refresh-button" disabled><span class="shop-refresh-button-face">今日已用完</span></button>';

  return `<div class="shop-refresh-bar" data-panel="shop"><p class="shop-refresh-countdown">${vip.priceRate < 1 ? `VIP商品${Math.round(vip.priceRate * 100) / 10}折 · ` : ""}自然刷新 <strong data-shop-refresh-countdown>${formatShopRefreshCountdown(Date.now())}</strong></p>${refreshButton}</div>
    <div class="shop-grid" role="list" aria-label="今日商品">${shop.offers.map((original) => {
      const offer = { ...original, priceGold: getVipShopPrice(state.save, original.priceGold) };
      if (offer.kind === "gems") {
        return `<article class="shop-card gem-offer ${offer.sold ? "sold" : ""}" role="listitem"><div class="shop-offer-summary item-card gem-shop-item" role="img" aria-label="${offer.gemAmount} 星石"><span class="item-icon offer-art" aria-hidden="true"><img class="shop-resource-art" src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt=""></span><span class="shop-item-amount" aria-hidden="true">×${offer.gemAmount}</span></div>${buyButton(offer, state.save.gold, `${offer.gemAmount} 星石`)}</article>`;
      }
      if (offer.kind === "material") {
        const definition = MATERIAL_BY_ID[offer.materialId];
        const previewing = options.materialPopoverSource === "shop" && options.materialPopoverKind === "material" && options.materialPopoverId === offer.materialId;
        return `<article class="shop-card material-offer tone-${definition.tone} ${offer.sold ? "sold" : ""}" role="listitem"><button type="button" class="shop-offer-summary item-card ${previewing ? "equipment-previewing" : ""}" data-action="shop-material-detail" data-material-id="${offer.materialId}" aria-label="查看${definition.name}详情，数量 ${offer.amount}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${previewing}"><span class="item-icon offer-art" aria-hidden="true">${materialArt(definition.icon)}</span><span class="shop-item-amount" aria-hidden="true">×${offer.amount}</span></button>${buyButton(offer, state.save.gold, `${definition.name} ${offer.amount} 个`)}</article>`;
      }
      if (offer.kind === "setEssence") {
        const set = SET_BY_ID[offer.setId];
        const previewing = options.materialPopoverSource === "shop" && options.materialPopoverKind === "set-essence" && options.materialPopoverId === offer.setId;
        return `<article class="shop-card material-offer set-essence-offer ${offer.sold ? "sold" : ""}" role="listitem"><button type="button" class="shop-offer-summary item-card ${previewing ? "equipment-previewing" : ""}" data-action="shop-set-essence-detail" data-set-id="${offer.setId}" aria-label="查看${set.name}精华详情，数量 ${offer.amount}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${previewing}"><span class="item-icon offer-art" aria-hidden="true">${materialArt("/assets/resources/mat_set_essence.png")}</span><span class="shop-item-amount" aria-hidden="true">×${offer.amount}</span></button>${buyButton(offer, state.save.gold, `${set.name}精华 ${offer.amount} 个`)}</article>`;
      }
      const definition = ITEM_BY_ID[offer.item.definitionId]!;
      const previewing = options.equipmentPopoverSource === "shop" && options.equipmentPopoverAnchorId === offer.offerId;
      return `<article class="shop-card equipment-offer ${offer.sold ? "sold" : ""}" role="listitem"><button type="button" class="shop-offer-summary item-card ${rarityClass(offer.item.rarity)} ${previewing ? "equipment-previewing" : ""}" data-action="shop-offer-detail" data-offer-id="${offer.offerId}" aria-label="查看${definition.name}详情${legendaryTraitAria(offer.item)}" aria-haspopup="dialog" aria-controls="global-equipment-tips" aria-expanded="${previewing}"><span class="item-icon offer-art" aria-hidden="true">${equipmentArt(definition.icon)}</span>${equipmentSpecialMarks(offer.item)}${itemLevelBadge(offer.item)}</button>${buyButton(offer, state.save.gold, definition.name)}</article>`;
    }).join("")}</div>`;
}

function buyButton(offer: { offerId: string; priceGold: number; sold: boolean }, gold: number, label: string): string {
  return `<button class="shop-buy" data-action="shop-buy" data-offer-id="${offer.offerId}" aria-label="${offer.sold ? `${label}已售罄` : `购买${label}，价格 ${offer.priceGold} 金币`}" ${offer.sold || gold < offer.priceGold ? "disabled" : ""}>${offer.sold ? "已售罄" : `<img class="shop-price-art" src="${ACCOUNT_CURRENCY_BY_ID.gold.icon}" alt="" aria-hidden="true"><span>${compact(offer.priceGold)}</span>`}</button>`;
}

function renderAbilityShop(state: GameStoreState, category: AbilityCategory): string {
  const list = category === "combat" ? COMBAT_ABILITIES : category === "general" ? GENERAL_ABILITIES : ECONOMY_ABILITIES;
  return `<div class="ability-shop-layout" data-panel="shop-abilities"><div class="ability-category-tabs" role="tablist" aria-label="能力分类" aria-orientation="vertical">${ABILITY_CATEGORY_TABS.map((tab) => `<button role="tab" class="ability-category-tab ${category === tab.id ? "active" : ""}" data-action="ability-category" data-category="${tab.id}" aria-selected="${category === tab.id}">${tab.label}</button>`).join("")}</div><div class="ability-icon-grid" role="list">${list.map((definition) => {
    const pending = definition.active ? "" : " pending";
    const meta = abilityCardMeta(definition.id, state.save.abilities[definition.id]);
    return `<button class="ability-icon-tile accent-${definition.accent}${pending}" data-action="ability-select" data-ability-id="${definition.id}" role="listitem" aria-label="${definition.name}，${meta.effectText}"><span class="ability-icon-glyph" aria-hidden="true">${abilityIconMarkup(definition.id)}</span><span class="ability-icon-copy"><strong class="ability-icon-name">${definition.name}</strong><small class="ability-icon-value">${meta.effectText}</small></span></button>`;
  }).join("")}</div></div>`;
}
