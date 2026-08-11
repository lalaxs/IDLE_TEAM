import { ITEM_BY_ID, ITEM_DEFINITIONS } from "../content/items";
import { RARITY_IDS, RARITY_LABELS, RARITY_RANK, type Rarity } from "../content/rarities";
import type { RandomSource } from "../simulation/RandomSource";
import { createEquipment, type InventoryItem } from "./EquipmentSystem";

export const ALCHEMY_SLOT_COUNT = 9;

/** Next grade on the TBH ladder, or null at 混元. */
export function nextAlchemyRarity(rarity: Rarity): Rarity | null {
  const index = RARITY_IDS.indexOf(rarity);
  if (index < 0 || index >= RARITY_IDS.length - 1) return null;
  return RARITY_IDS[index + 1]!;
}

export function isEquippedInstance(
  itemId: string,
  equipmentMaps: Iterable<Partial<Record<string, string | null>>>,
): boolean {
  for (const equipment of equipmentMaps) {
    for (const value of Object.values(equipment)) {
      if (value === itemId) return true;
    }
  }
  return false;
}

/** Unequipped gear that can still be upgraded. */
export function alchemyCandidateItems(
  inventory: readonly InventoryItem[],
  equipmentMaps: Iterable<Partial<Record<string, string | null>>>,
): InventoryItem[] {
  return inventory.filter(
    (item) => item.rarity !== "primordial" && !isEquippedInstance(item.instanceId, equipmentMaps),
  );
}

export function validateAlchemyInputs(items: readonly InventoryItem[]): string | null {
  if (items.length !== ALCHEMY_SLOT_COUNT) return `需要放入 ${ALCHEMY_SLOT_COUNT} 件装备`;
  const rarity = items[0]?.rarity;
  if (!rarity) return "炼金材料无效";
  if (rarity === "primordial") return "混元已是最高品阶，无法继续炼金";
  if (!items.every((item) => item.rarity === rarity)) return "九件装备必须为同一品阶";
  if (items.some((item) => item.rarity === "primordial")) return "混元无法作为炼金材料";
  return null;
}

function pickResultDefinitionId(inputs: readonly InventoryItem[], targetRarity: Rarity, random: RandomSource): string {
  const seed = inputs[0]!;
  const seedDefinition = ITEM_BY_ID[seed.definitionId];
  if (seedDefinition && RARITY_RANK[seedDefinition.maxGrade] >= RARITY_RANK[targetRarity]) {
    return seed.definitionId;
  }
  const slot = seed.slot;
  const school = seedDefinition?.school;
  const pool = ITEM_DEFINITIONS.filter(
    (definition) =>
      definition.slot === slot &&
      (!school || definition.school === school) &&
      RARITY_RANK[definition.maxGrade] >= RARITY_RANK[targetRarity],
  );
  if (pool.length > 0) {
    return random.pick(pool).id;
  }
  const anyPool = ITEM_DEFINITIONS.filter(
    (definition) => RARITY_RANK[definition.maxGrade] >= RARITY_RANK[targetRarity],
  );
  if (anyPool.length > 0) return random.pick(anyPool).id;
  return seed.definitionId;
}

export interface AlchemyCraftResult {
  ok: true;
  consumedIds: string[];
  result: InventoryItem;
  fromRarity: Rarity;
  toRarity: Rarity;
}

export interface AlchemyCraftFailure {
  ok: false;
  message: string;
}

/** Consume 9 same-grade items → one item at +1 grade. */
export function craftAlchemyItem(
  inputs: readonly InventoryItem[],
  random: RandomSource,
): AlchemyCraftResult | AlchemyCraftFailure {
  const error = validateAlchemyInputs(inputs);
  if (error) return { ok: false, message: error };
  const fromRarity = inputs[0]!.rarity;
  const toRarity = nextAlchemyRarity(fromRarity);
  if (!toRarity) return { ok: false, message: "已达最高品阶" };

  const definitionId = pickResultDefinitionId(inputs, toRarity, random);
  const definition = ITEM_BY_ID[definitionId];
  if (!definition || RARITY_RANK[definition.maxGrade] < RARITY_RANK[toRarity]) {
    return {
      ok: false,
      message: `没有可升到${RARITY_LABELS[toRarity]}的同部位配方`,
    };
  }

  const stage = Math.max(...inputs.map((item) => item.stage));
  const result = createEquipment(definitionId, stage, toRarity, random);
  return {
    ok: true,
    consumedIds: inputs.map((item) => item.instanceId),
    result,
    fromRarity,
    toRarity,
  };
}

/**
 * Auto-pick up to 9 unequipped candidates of one grade.
 * Prefers a rarity that already has 9+, then densest same-definition cluster.
 */
export function pickAlchemyAutoFill(candidates: readonly InventoryItem[]): string[] {
  if (candidates.length === 0) return [];

  const byRarity = new Map<Rarity, InventoryItem[]>();
  for (const item of candidates) {
    const list = byRarity.get(item.rarity) ?? [];
    list.push(item);
    byRarity.set(item.rarity, list);
  }

  const groups = [...byRarity.entries()].sort((a, b) => {
    const readyA = a[1].length >= ALCHEMY_SLOT_COUNT ? 1 : 0;
    const readyB = b[1].length >= ALCHEMY_SLOT_COUNT ? 1 : 0;
    if (readyA !== readyB) return readyB - readyA;
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return RARITY_RANK[b[0]] - RARITY_RANK[a[0]];
  });

  const [, pool] = groups[0]!;
  const byDefinition = new Map<string, InventoryItem[]>();
  for (const item of pool) {
    const list = byDefinition.get(item.definitionId) ?? [];
    list.push(item);
    byDefinition.set(item.definitionId, list);
  }
  const definitionGroups = [...byDefinition.values()].sort((a, b) => b.length - a.length);
  const preferred = definitionGroups[0] ?? [];
  const selected: InventoryItem[] = [...preferred];
  if (selected.length < ALCHEMY_SLOT_COUNT) {
    for (const item of pool) {
      if (selected.length >= ALCHEMY_SLOT_COUNT) break;
      if (selected.some((entry) => entry.instanceId === item.instanceId)) continue;
      selected.push(item);
    }
  }
  return selected.slice(0, ALCHEMY_SLOT_COUNT).map((item) => item.instanceId);
}
