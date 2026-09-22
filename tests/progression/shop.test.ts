import { describe, expect, it } from "vitest";
import { ITEM_BY_ID } from "../../src/content/items";
import { RARITY_RANK } from "../../src/content/rarities";
import {
  SHOP_AD_REFRESH_LIMIT,
  SHOP_EQUIPMENT_OFFER_COUNT,
  SHOP_GOLD_REFRESH_LIMIT,
  SHOP_MATERIAL_OFFER_COUNT,
  getShopRefreshKey,
} from "../../src/content/shop";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave } from "../../src/persistence/schema";
import { createShopOffers } from "../../src/progression/ShopSystem";

const equipmentItems = (dateKey: string, stage: number) =>
  createShopOffers(dateKey, stage)
    .filter((offer) => offer.kind === "equipment")
    .map((offer) => offer.item);

describe("daily equipment shop", () => {
  it("does not offer Frostland gear before 2-1 is unlocked", () => {
    const items = equipmentItems("2026-07-31", 12);
    expect(items.every(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 1)).toBe(true);
  });

  it("uses the highest unlocked late-Frostland weight", () => {
    const items = Array.from({ length: 80 }, (_, day) =>
      equipmentItems(`2026-08-${String(day + 1).padStart(2, "0")}`, 24),
    ).flat();
    const frostlandShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 2).length /
      items.length;
    expect(frostlandShare).toBeGreaterThan(0.65);
    expect(frostlandShare).toBeLessThanOrEqual(1);
  });

  it("uses the highest unlocked late-Red-Sands weight", () => {
    const items = Array.from({ length: 80 }, (_, day) =>
      equipmentItems(`2026-09-${String(day + 1).padStart(2, "0")}`, 36),
    ).flat();
    const redSandsShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 3).length /
      items.length;
    expect(redSandsShare).toBeGreaterThan(0.65);
    expect(redSandsShare).toBeLessThanOrEqual(1);
  });

  it("uses the highest unlocked late-Stormsea weight", () => {
    const items = Array.from({ length: 80 }, (_, day) =>
      equipmentItems(`2026-10-${String(day + 1).padStart(2, "0")}`, 48),
    ).flat();
    const stormseaShare =
      items.filter(({ definitionId }) => ITEM_BY_ID[definitionId]?.chapter === 4).length /
      items.length;
    expect(stormseaShare).toBeGreaterThan(0.65);
    expect(stormseaShare).toBeLessThanOrEqual(1);
  });

  it("rolls random affixes on every equipment offer", () => {
    const items = Array.from({ length: 40 }, (_, day) =>
      equipmentItems(`2026-11-${String((day % 28) + 1).padStart(2, "0")}`, 20),
    ).flat();
    expect(items.every((item) => RARITY_RANK[item.rarity] >= RARITY_RANK.rare)).toBe(true);
    expect(items.every((item) => item.affixes.length > 0)).toBe(true);
    const signatures = new Set(
      items.map((item) =>
        item.affixes.map(({ affixId, value }) => `${affixId}:${value}`).join("|"),
      ),
    );
    expect(signatures.size).toBeGreaterThan(8);
  });

  it("mixes premium equipment, alchemy materials, and starstones in each refresh", () => {
    const offers = createShopOffers("2026-09-21-12", 48);
    expect(offers.filter(({ kind }) => kind === "equipment")).toHaveLength(SHOP_EQUIPMENT_OFFER_COUNT);
    expect(offers.filter(({ kind }) => kind === "material" || kind === "setEssence"))
      .toHaveLength(SHOP_MATERIAL_OFFER_COUNT);
    expect(offers.filter(({ kind }) => kind === "gems")).toHaveLength(1);
  });

  it("supports two gold refreshes and two completed ad refreshes per day", () => {
    const beforeWindow = new Date(2026, 8, 21, 5, 59, 0);
    const save = createDefaultSave(beforeWindow.getTime());
    save.gold = 100_000;
    save.highestClearedStage = 20;
    save.highestUnlockedStage = 21;
    const store = new GameStore(save);

    for (let index = 0; index < SHOP_GOLD_REFRESH_LIMIT; index += 1) {
      store.dispatch({ type: "shop:refresh" });
    }
    expect(save.shop.goldRefreshesUsed).toBe(SHOP_GOLD_REFRESH_LIMIT);

    store.dispatch({ type: "ads:result", placement: "shop", result: "completed" });
    for (let index = 0; index < SHOP_AD_REFRESH_LIMIT; index += 1) {
      store.dispatch({ type: "shop:refresh" });
    }
    expect(save.shop.adRefreshesUsed).toBe(SHOP_AD_REFRESH_LIMIT);
    expect(save.shop.refreshSequence).toBe(SHOP_GOLD_REFRESH_LIMIT + SHOP_AD_REFRESH_LIMIT);

    store.dispatch({ type: "shop:refresh" });
    expect(save.shop.refreshSequence).toBe(SHOP_GOLD_REFRESH_LIMIT + SHOP_AD_REFRESH_LIMIT);

    const nextWindow = new Date(2026, 8, 21, 6, 0, 0);
    store.dispatch({ type: "shop:sync", now: nextWindow.getTime() });
    expect(save.shop.refreshKey).toBe(getShopRefreshKey(nextWindow));
    expect(save.shop.refreshSequence).toBe(0);
    expect(save.shop.goldRefreshesUsed).toBe(SHOP_GOLD_REFRESH_LIMIT);
  });

  it("adds purchased material offers to the matching inventory", () => {
    const save = createDefaultSave(new Date(2026, 8, 21, 12, 0, 0).getTime());
    save.gold = 100_000;
    const store = new GameStore(save);
    const offer = save.shop.offers.find((entry) => entry.kind === "material");
    expect(offer?.kind).toBe("material");
    if (!offer || offer.kind !== "material") return;
    const before = save.materials[offer.materialId];

    store.dispatch({ type: "shop:buy", offerId: offer.offerId });

    expect(save.materials[offer.materialId]).toBe(before + offer.amount);
    expect(offer.sold).toBe(true);
  });
});
