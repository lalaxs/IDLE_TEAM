import { describe, expect, it } from "vitest";
import { ITEM_BY_ID } from "../../src/content/items";
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
});
