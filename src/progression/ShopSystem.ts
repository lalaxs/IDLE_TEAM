import {
  GEM_OFFER_AMOUNT,
  SHOP_EQUIPMENT_OFFER_COUNT,
  SHOP_MATERIAL_OFFER_COUNT,
  getGemOfferPrice,
} from "../content/shop";
import { RARITY_RANK, type Rarity } from "../content/rarities";
import {
  GEM_BASE_IDS,
  getGemMaterialId,
  type CraftMaterialId,
  type GemRank,
  type MaterialId,
} from "../content/materials";
import { getChapterSetIds, type SetId } from "../content/sets";
import {
  createEquipment,
  chooseRarity,
  getEquipmentLevel,
  getItemBudget,
} from "./EquipmentSystem";
import { selectChapterEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom, type RandomSource } from "../simulation/RandomSource";
import type { ShopOfferState } from "../domain/save/SaveData";

function hashText(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Shop gear is deliberately better than routine drops: at least rare, with two rarity rolls. */
function chooseShopRarity(stage: number, random: RandomSource): Rarity {
  const first = chooseRarity(stage, random);
  const second = chooseRarity(stage, random);
  const rolled = RARITY_RANK[first] >= RARITY_RANK[second] ? first : second;
  return RARITY_RANK[rolled] < RARITY_RANK.rare ? "rare" : rolled;
}

type MaterialOfferSeed =
  | { kind: "material"; materialId: MaterialId; amount: number; priceMinutes: number }
  | { kind: "setEssence"; setId: SetId; amount: number; priceMinutes: number };

function createMaterialOfferSeeds(stage: number, random: RandomSource): MaterialOfferSeed[] {
  const craft = (
    materialId: CraftMaterialId,
    amount: number,
    priceMinutes: number,
  ): MaterialOfferSeed => ({ kind: "material", materialId, amount, priceMinutes });
  const chapter = Math.max(1, Math.min(10, Math.ceil(stage / 12)));
  const setIds = getChapterSetIds(chapter);
  const setId = random.pick(setIds);
  const maxGemRank = Math.min(4, 1 + Math.floor((Math.max(1, stage) - 1) / 36)) as GemRank;
  const gemRank = random.next() < 0.7 ? maxGemRank : Math.max(1, maxGemRank - 1) as GemRank;
  const gemId = getGemMaterialId(random.pick(GEM_BASE_IDS), gemRank);
  const gemPriceMinutes = 4 * 3 ** (gemRank - 1);

  return [
    craft("mat_socket_stone", 2, 5),
    craft("mat_reset_scroll", 2, 4),
    craft("mat_smelt_flux", 2, 5),
    craft("mat_set_inscription", 1, 8),
    { kind: "setEssence", setId, amount: random.int(2, 4), priceMinutes: 7 },
    { kind: "material", materialId: gemId, amount: 1, priceMinutes: gemPriceMinutes },
  ];
}

export function createShopOffers(
  refreshKey: string,
  highestStage: number,
  refreshIndex = 0,
): ShopOfferState[] {
  const random = new SeededRandom(hashText(`${refreshKey}-${highestStage}-${refreshIndex}`));
  const effectiveStage = Math.max(1, highestStage);
  const equipment: ShopOfferState[] = Array.from({ length: SHOP_EQUIPMENT_OFFER_COUNT }, (_, index) => {
    const definition = selectChapterEquipmentDefinition(effectiveStage, random);
    const rarity = chooseShopRarity(effectiveStage, random);
    const item = createEquipment(definition.id, effectiveStage, rarity, random);
    const budget = getItemBudget(getEquipmentLevel(item), item.rarity, definition.baseTier);
    return {
      offerId: `${refreshKey}-${refreshIndex}-gear-${index}`,
      kind: "equipment" as const,
      item,
      priceGold: Math.round(budget * 35),
      sold: false,
    };
  });

  const goldPerMinute = 20 + effectiveStage * 12;
  const materialSeeds = createMaterialOfferSeeds(effectiveStage, random);
  const materials: ShopOfferState[] = Array.from({ length: SHOP_MATERIAL_OFFER_COUNT }, (_, index) => {
    const pickedIndex = random.int(0, materialSeeds.length - 1);
    const picked = materialSeeds.splice(pickedIndex, 1)[0]!;
    const base = {
      offerId: `${refreshKey}-${refreshIndex}-material-${index}`,
      priceGold: Math.round(goldPerMinute * picked.priceMinutes),
      sold: false,
    };
    return picked.kind === "material"
      ? { ...base, kind: "material", materialId: picked.materialId, amount: picked.amount }
      : { ...base, kind: "setEssence", setId: picked.setId, amount: picked.amount };
  });

  return [
    ...equipment,
    ...materials,
    {
      offerId: `${refreshKey}-${refreshIndex}-gems`,
      kind: "gems",
      gemAmount: GEM_OFFER_AMOUNT,
      priceGold: getGemOfferPrice(highestStage),
      sold: false,
    },
  ];
}
