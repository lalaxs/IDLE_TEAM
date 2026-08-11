import { getGemOfferPrice } from "../content/shop";
import { itemBudgetBase } from "../content/balance";
import { RARITY_MULTIPLIER } from "../content/rarities";
import { createEquipment, chooseRarity } from "./EquipmentSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom } from "../simulation/RandomSource";
import type { ShopOfferState } from "../persistence/schema";

function hashText(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createShopOffers(
  dateKey: string,
  highestStage: number,
  refreshIndex = 0,
): ShopOfferState[] {
  const random = new SeededRandom(hashText(`${dateKey}-${highestStage}-${refreshIndex}`));
  const effectiveStage = Math.max(1, highestStage);
  const equipment: ShopOfferState[] = Array.from({ length: 3 }, (_, index) => {
    const definition = selectEquipmentDefinition(effectiveStage, random);
    const rarity = chooseRarity(effectiveStage, random);
    const item = createEquipment(definition.id, effectiveStage, rarity, random);
    const budget = itemBudgetBase(effectiveStage);
    return {
      offerId: `daily-${refreshIndex}-gear-${index}`,
      kind: "equipment" as const,
      item,
      priceGold: Math.round(budget * 25 * RARITY_MULTIPLIER[item.rarity]),
      sold: false,
    };
  });
  return [
    ...equipment,
    {
      offerId: `daily-${refreshIndex}-gems`,
      kind: "gems",
      gemAmount: 50,
      priceGold: getGemOfferPrice(highestStage),
      sold: false,
    },
  ];
}
