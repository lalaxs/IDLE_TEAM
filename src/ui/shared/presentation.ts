import type { AbilityId } from "../../content/abilities";
import type { Rarity } from "../../content/rarities";
import { SET_BY_ID, type SetId } from "../../content/sets";
import { getNextShopRefreshAt } from "../../content/shop";
import {
  getEquipmentLevel,
  getEquipmentSetId,
  getGreaterAffixCount,
  type InventoryItem,
} from "../../progression/EquipmentSystem";

export const rarityClass = (rarity: Rarity): string => `rarity-${rarity}`;

export function compact(value: number): string {
  if (value >= 999_500) {
    const millions = value / 1_000_000;
    return `${millions < 10 ? millions.toFixed(1) : Math.round(millions)}m`;
  }
  if (value >= 100_000) return `${Math.round(value / 1_000)}k`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("zh-CN");
}

export function itemLevelBadge(item: InventoryItem, locked = false): string {
  if (getGreaterAffixCount(item) > 0) return "";
  return `<span class="item-level-badge ${locked ? "locked" : ""}">Lv.${getEquipmentLevel(item)}</span>`;
}

export function setNameInitial(setId: SetId): string {
  return Array.from(SET_BY_ID[setId].name)[0] ?? "套";
}

export function equipmentSpecialMarks(item: InventoryItem): string {
  const greaterCount = getGreaterAffixCount(item);
  const legendary = item.traitId
    ? '<span class="legendary-trait-mark" aria-hidden="true"></span>'
    : "";
  const setId = getEquipmentSetId(item);
  const set = setId
    ? `<span class="set-tag-mark" aria-hidden="true">${setNameInitial(setId)}</span>`
    : "";
  const greater = greaterCount > 0
    ? `<span class="greater-affix-mark" aria-hidden="true">${"★".repeat(greaterCount)}</span>`
    : "";
  return `${legendary}${set}${greater}`;
}

export function legendaryTraitAria(item: InventoryItem): string {
  const setId = getEquipmentSetId(item);
  const parts = [
    item.traitId ? "含传奇特性" : "",
    setId ? `含${SET_BY_ID[setId].name}套装标签` : "",
    getGreaterAffixCount(item) > 0 ? `含${getGreaterAffixCount(item)}条强化词条` : "",
  ].filter(Boolean);
  return parts.length ? `，${parts.join("，")}` : "";
}

export function equipmentArt(src: string): string {
  return `<img class="equipment-art" src="${src}" alt="" aria-hidden="true">`;
}

export function materialArt(src: string): string {
  return src
    ? `<img class="material-art" src="${src}" alt="" aria-hidden="true">`
    : '<span class="material-art material-glyph-art" aria-hidden="true">印</span>';
}

export function abilityIconMarkup(abilityId: AbilityId): string {
  return `<img class="ability-art" src="/assets/abilities/${abilityId}.png" alt="" aria-hidden="true">`;
}

export function formatShopRefreshCountdown(now: number): string {
  const remainingSeconds = Math.max(0, Math.ceil((getNextShopRefreshAt(new Date(now)) - now) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
