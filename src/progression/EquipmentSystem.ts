import {
  AFFIX_BY_ID,
  formatAffixValue,
  getAffixesForSlot,
  getAffixRange,
  type AffixId,
  type AffixRoll,
} from "../content/affixes";
import { getLegendaryTraitId } from "../content/legendaryPowers";
import {
  EQUIPMENT_SLOTS,
  ITEM_BY_ID,
  ITEM_DEFINITIONS,
  type EquipmentSlot,
  type ItemDefinition,
} from "../content/items";
import {
  AFFIX_COUNT_BY_RARITY,
  isRarity,
  rarityHasLegendaryTrait,
  RARITY_MULTIPLIER,
  RARITY_RANK,
  type Rarity,
} from "../content/rarities";
import { BASE_TIER_MULTIPLIER, itemBudgetBase } from "../content/balance";
import type { RandomSource } from "../simulation/RandomSource";

export type { AffixRoll };

export interface InventoryItem {
  instanceId: string;
  definitionId: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stage: number;
  stats: Partial<{
    attack: number;
    maxHp: number;
    defense: number;
    attackSpeedPct: number;
  }>;
  affixes: AffixRoll[];
  traitId: string | null;
}

const INHERENT_ROLL_MIN = 0.85;
const INHERENT_ROLL_MAX = 1.15;

let instanceCounter = 0;

const SLOT_SET = new Set<string>(EQUIPMENT_SLOTS);
const AFFIX_ID_SET = new Set<string>(Object.keys(AFFIX_BY_ID));

export const getItemBudget = (
  stage: number,
  rarity: Rarity,
  baseTier: 1 | 2 | 3 | 4 = 1,
): number =>
  Math.round(itemBudgetBase(stage) * RARITY_MULTIPLIER[rarity] * BASE_TIER_MULTIPLIER[baseTier]);

function rollInherentFactor(random: RandomSource): number {
  return INHERENT_ROLL_MIN + random.next() * (INHERENT_ROLL_MAX - INHERENT_ROLL_MIN);
}

function scaleStat(base: number, factor: number): number {
  return Math.max(1, Math.round(base * factor));
}

function applySlotStats(
  slot: EquipmentSlot,
  budget: number,
  random: RandomSource,
): InventoryItem["stats"] {
  const factor = rollInherentFactor(random);
  const stats: InventoryItem["stats"] = {};
  switch (slot) {
    case "main_weapon":
      stats.attack = scaleStat(budget, factor);
      break;
    case "off_hand":
      stats.attack = scaleStat(budget * 0.75, factor);
      break;
    case "helmet":
      stats.maxHp = scaleStat(budget * 4, factor);
      stats.defense = scaleStat(budget * 0.25, factor);
      break;
    case "armor":
      stats.maxHp = scaleStat(budget * 8, factor);
      stats.defense = scaleStat(budget * 0.45, factor);
      break;
    case "gloves":
      stats.attack = scaleStat(budget * 0.4, factor);
      break;
    case "boots":
      stats.maxHp = scaleStat(budget * 3, factor);
      stats.defense = scaleStat(budget * 0.2, factor);
      break;
    case "ring":
      stats.attack = scaleStat(budget * 0.55, factor);
      break;
    case "bracer":
      stats.defense = scaleStat(budget * 0.5, factor);
      stats.maxHp = scaleStat(budget * 2, factor);
      break;
    case "amulet":
      if (random.next() < 0.5) stats.attack = scaleStat(budget * 0.55, factor);
      else stats.maxHp = scaleStat(budget * 3, factor);
      break;
    case "earring":
      if (random.next() < 0.5) {
        stats.attack = scaleStat(budget * 0.45, factor);
      } else {
        stats.maxHp = scaleStat(budget * 3, factor);
        stats.defense = scaleStat(budget * 0.15, factor);
      }
      break;
  }
  return stats;
}

function rollAffixValue(
  affixId: AffixId,
  rarity: Exclude<Rarity, "common">,
  budget: number,
  random: RandomSource,
): number {
  const definition = AFFIX_BY_ID[affixId];
  const range = getAffixRange(definition, rarity);
  if (definition.kind === "percent") {
    return random.int(Math.round(range.min), Math.round(range.max));
  }
  const mult = range.min + random.next() * (range.max - range.min);
  return Math.max(1, Math.round(budget * mult));
}

function rollAffixes(
  slot: EquipmentSlot,
  rarity: Rarity,
  budget: number,
  random: RandomSource,
): AffixRoll[] {
  const count = AFFIX_COUNT_BY_RARITY[rarity];
  if (count <= 0 || rarity === "common") return [];
  const pool = [...getAffixesForSlot(slot)];
  const rolled: AffixRoll[] = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const pickIndex = random.int(0, pool.length - 1);
    const [picked] = pool.splice(pickIndex, 1);
    if (!picked) break;
    rolled.push({
      affixId: picked.id,
      value: rollAffixValue(picked.id, rarity, budget, random),
    });
  }
  return rolled;
}

const NATURAL_DROP_GRADES: readonly Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "immortal",
  "arcane",
  "transcendent",
  "astral",
  "sacred",
];

function clampRarityToDefinition(rarity: Rarity, definition: ItemDefinition): Rarity {
  const min = RARITY_RANK[definition.minGrade];
  const max = RARITY_RANK[definition.maxGrade];
  const rank = Math.min(max, Math.max(min, RARITY_RANK[rarity]));
  return (Object.keys(RARITY_RANK) as Rarity[]).find((id) => RARITY_RANK[id] === rank) ?? definition.minGrade;
}

export function createEquipment(
  definitionId: string,
  stage: number,
  rarity: Rarity,
  random: RandomSource,
): InventoryItem {
  const definition = ITEM_BY_ID[definitionId] ?? ITEM_DEFINITIONS[0]!;
  const clampedRarity = clampRarityToDefinition(rarity, definition);
  const budget = getItemBudget(stage, clampedRarity, definition.baseTier);
  const stats = applySlotStats(definition.slot, budget, random);
  const affixes = rollAffixes(definition.slot, clampedRarity, budget, random);
  const traitId = rarityHasLegendaryTrait(clampedRarity)
    ? getLegendaryTraitId(definition.id)
    : null;
  instanceCounter += 1;
  return {
    instanceId: `gear-${Date.now().toString(36)}-${instanceCounter.toString(36)}`,
    definitionId: definition.id,
    slot: definition.slot,
    rarity: clampedRarity,
    stage,
    stats,
    affixes,
    traitId,
  };
}

export function getItemScore(item: InventoryItem): number {
  const traitScore = item.traitId ? 60 : 0;
  let affixScore = 0;
  for (const roll of item.affixes ?? []) {
    const weight = AFFIX_BY_ID[roll.affixId]?.scoreWeight ?? 1;
    affixScore += roll.value * weight;
  }
  return Math.round(
    (item.stats.attack ?? 0) * 3 +
      (item.stats.maxHp ?? 0) * 0.1 +
      (item.stats.defense ?? 0) * 2 +
      (item.stats.attackSpeedPct ?? 0) * 8 +
      affixScore +
      traitScore +
      RARITY_RANK[item.rarity] * 20,
  );
}

export function describeItemAffixes(item: InventoryItem): string[] {
  return (item.affixes ?? []).map((roll) => formatAffixValue(roll.affixId, roll.value));
}

const SLOT_RANK: Record<EquipmentSlot, number> = Object.fromEntries(
  EQUIPMENT_SLOTS.map((slot, index) => [slot, index]),
) as Record<EquipmentSlot, number>;

export function compareInventoryItems(a: InventoryItem, b: InventoryItem): number {
  const rarityDelta = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
  if (rarityDelta !== 0) return rarityDelta;
  const scoreDelta = getItemScore(b) - getItemScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  const slotDelta = SLOT_RANK[a.slot] - SLOT_RANK[b.slot];
  if (slotDelta !== 0) return slotDelta;
  return a.instanceId.localeCompare(b.instanceId);
}

export function sortInventoryItems(items: readonly InventoryItem[]): InventoryItem[] {
  return [...items].sort(compareInventoryItems);
}

export function getSalvageGold(item: InventoryItem): number {
  const definition = ITEM_BY_ID[item.definitionId];
  return getItemBudget(item.stage, item.rarity, definition?.baseTier ?? 1) * 4;
}

/** Soft cap for unequipped items visible in the backpack UI (before ability bonuses). */
export const BACKPACK_CAPACITY = 40;
/** Persist equipped + backpack items together (8 heroes × 10 slots + backpack + ability upgrades). */
export const INVENTORY_STORAGE_LIMIT = BACKPACK_CAPACITY + 60 + 80;

export function collectEquippedItemIds(
  roster: Readonly<Record<string, { equipment: Readonly<Record<string, string | null>> }>>,
): Set<string> {
  const equipped = new Set<string>();
  for (const progress of Object.values(roster)) {
    for (const itemId of Object.values(progress.equipment)) {
      if (itemId) equipped.add(itemId);
    }
  }
  return equipped;
}

export function countBackpackItems(
  inventory: readonly InventoryItem[],
  equippedIds: ReadonlySet<string>,
): number {
  let count = 0;
  for (const item of inventory) {
    if (!equippedIds.has(item.instanceId)) count += 1;
  }
  return count;
}

export function backpackItems(
  inventory: readonly InventoryItem[],
  equippedIds: ReadonlySet<string>,
): InventoryItem[] {
  return inventory.filter((item) => !equippedIds.has(item.instanceId));
}

export function insertInventoryItem(
  inventory: InventoryItem[],
  overflow: InventoryItem[],
  item: InventoryItem,
  equippedIds: ReadonlySet<string> = new Set(),
  capacity = BACKPACK_CAPACITY,
): { inventory: InventoryItem[]; overflow: InventoryItem[]; goldGained: number; rejected: boolean } {
  if (countBackpackItems(inventory, equippedIds) < capacity) {
    return { inventory: [...inventory, item], overflow, goldGained: 0, rejected: false };
  }
  if (item.rarity === "common") {
    return {
      inventory,
      overflow,
      goldGained: getSalvageGold(item),
      rejected: false,
    };
  }
  if (overflow.length < 10) {
    return { inventory, overflow: [...overflow, item], goldGained: 0, rejected: false };
  }
  return { inventory, overflow, goldGained: 0, rejected: true };
}

/**
 * Natural drop rarity — never primordial.
 * Higher stages unlock higher grade weights; still clamped by definition later.
 */
export function chooseRarity(stage: number, random: RandomSource): Rarity {
  const roll = random.next();
  if (stage <= 12) {
    if (roll < 0.72) return "common";
    if (roll < 0.94) return "uncommon";
    if (roll < 0.995) return "rare";
    return "epic";
  }
  if (stage <= 36) {
    if (roll < 0.55) return "common";
    if (roll < 0.82) return "uncommon";
    if (roll < 0.94) return "rare";
    if (roll < 0.985) return "epic";
    return "immortal";
  }
  if (stage <= 72) {
    if (roll < 0.42) return "common";
    if (roll < 0.7) return "uncommon";
    if (roll < 0.86) return "rare";
    if (roll < 0.94) return "epic";
    if (roll < 0.98) return "immortal";
    if (roll < 0.995) return "arcane";
    return "transcendent";
  }
  if (roll < 0.35) return "common";
  if (roll < 0.6) return "uncommon";
  if (roll < 0.78) return "rare";
  if (roll < 0.88) return "epic";
  if (roll < 0.94) return "immortal";
  if (roll < 0.975) return "arcane";
  if (roll < 0.99) return "transcendent";
  if (roll < 0.997) return "astral";
  return "sacred";
}

function normalizeAffixes(raw: unknown): AffixRoll[] {
  if (!Array.isArray(raw)) return [];
  const result: AffixRoll[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const source = entry as { affixId?: unknown; value?: unknown };
    if (typeof source.affixId !== "string" || !AFFIX_ID_SET.has(source.affixId)) continue;
    if (typeof source.value !== "number" || !Number.isFinite(source.value)) continue;
    result.push({ affixId: source.affixId as AffixId, value: Math.round(source.value) });
  }
  return result;
}

export function normalizeInventoryItem(raw: unknown): InventoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<InventoryItem> & { slot?: string };
  if (typeof source.instanceId !== "string" || typeof source.definitionId !== "string") return null;
  const definition = ITEM_BY_ID[source.definitionId];
  if (typeof source.slot !== "string" || !SLOT_SET.has(source.slot)) return null;
  const declaredSlot = source.slot as EquipmentSlot;
  const slot = definition?.slot ?? declaredSlot;
  if (definition && definition.slot !== declaredSlot) return null;
  if (!isRarity(source.rarity)) return null;
  return {
    instanceId: source.instanceId,
    definitionId: source.definitionId,
    slot,
    rarity: source.rarity,
    stage: typeof source.stage === "number" ? source.stage : 1,
    stats: source.stats && typeof source.stats === "object" ? source.stats : {},
    affixes: normalizeAffixes(source.affixes),
    traitId: typeof source.traitId === "string" ? source.traitId : null,
  };
}

void NATURAL_DROP_GRADES;
