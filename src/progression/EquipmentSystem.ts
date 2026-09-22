import {
  AFFIX_BY_ID,
  formatAffixValue,
  GREATER_AFFIX_POWER_MULTIPLIER,
  getAffixSchoolWeight,
  getAffixesForSlot,
  getAffixRange,
  getAffixValueBounds,
  SMELT_AFFIX_POWER_MULTIPLIER,
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
import {
  BASE_TIER_MULTIPLIER,
  itemBudgetBase,
  MAX_HERO_LEVEL,
  SALVAGE_GOLD_BASE,
  SALVAGE_GOLD_GROWTH,
} from "../content/balance";
import { MAX_STAGE } from "../content/chapters";
import { MATERIAL_BY_ID, type MaterialId } from "../content/materials";
import { HERO_DEFINITIONS } from "../content/heroes";
import { ABILITY_BY_ID } from "../content/abilities";
import type { RandomSource } from "../simulation/RandomSource";
import { isSetId, type SetId } from "../content/sets";

export type { AffixRoll };

/** Open gem socket on an equipment piece (max 2). */
export interface ItemSocket {
  gemId: string | null;
}

export interface InventoryItem {
  instanceId: string;
  definitionId: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  /** Visible equip requirement and the source of every stat roll band. */
  level?: number;
  /** Stage that produced the item; retained for loot provenance only. */
  stage: number;
  stats: Partial<{
    attack: number;
    maxHp: number;
    defense: number;
    attackSpeedPct: number;
  }>;
  affixes: AffixRoll[];
  traitId: string | null;
  /** Instance-owned set tag. It can coexist with a legendary trait. */
  setId?: SetId | null;
  /** Opened gem sockets; length 0–2. Missing on legacy saves until normalized. */
  sockets?: ItemSocket[];
  /**
   * Index of the only affix that may be reset on this item.
   * null/undefined = never reset yet (player may pick any one affix once).
   */
  resetAffixIndex?: number | null;
}

const INHERENT_ROLL_MIN = 0.95;
const INHERENT_ROLL_MAX = 1.05;

let instanceCounter = 0;

const SLOT_SET = new Set<string>(EQUIPMENT_SLOTS);
const AFFIX_ID_SET = new Set<string>(Object.keys(AFFIX_BY_ID));

/** Lv.1 is the starter band; every later equipment band advances by 5 levels. */
export const EQUIPMENT_LEVEL_TIERS = [
  1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
] as const;

export const getItemBudget = (
  itemLevel: number,
  rarity: Rarity,
  baseTier: 1 | 2 | 3 | 4 = 1,
): number => {
  const level = clampEquipmentLevel(itemLevel);
  return Math.round(
    itemBudgetBase(level) *
      RARITY_MULTIPLIER[rarity] *
      BASE_TIER_MULTIPLIER[baseTier],
  );
};

export function equipmentLevelForStage(stage: number): number {
  const clampedStage = Math.max(1, Math.min(MAX_STAGE, Math.round(stage)));
  return clampEquipmentLevel(
    1 + ((clampedStage - 1) * (MAX_HERO_LEVEL - 1)) / (MAX_STAGE - 1),
  );
}

function clampEquipmentLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_HERO_LEVEL, Math.floor(level)));
  let tier: number = EQUIPMENT_LEVEL_TIERS[0];
  for (const candidate of EQUIPMENT_LEVEL_TIERS) {
    if (candidate > clamped) break;
    tier = candidate;
  }
  return tier;
}

export function getEquipmentLevel(item: Pick<InventoryItem, "level" | "stage">): number {
  return typeof item.level === "number" && Number.isFinite(item.level)
    ? clampEquipmentLevel(item.level)
    : equipmentLevelForStage(item.stage);
}

export function canHeroEquipItem(heroLevel: number, item: InventoryItem): boolean {
  return Math.max(1, Math.round(heroLevel)) >= getEquipmentLevel(item);
}

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
  return slotStatsAtFactor(slot, budget, factor);
}

function slotStatsAtFactor(
  slot: EquipmentSlot,
  budget: number,
  factor: number,
): InventoryItem["stats"] {
  const stats: InventoryItem["stats"] = {};
  switch (slot) {
    case "main_weapon":
      stats.attack = scaleStat(budget, factor);
      break;
    case "off_hand":
      stats.attack = scaleStat(budget * 0.55, factor);
      stats.defense = scaleStat(budget * 0.2, factor);
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
      stats.attackSpeedPct = Math.max(1, Math.round(4 * factor));
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
      stats.attack = scaleStat(budget * 0.35, factor);
      stats.maxHp = scaleStat(budget * 2.2, factor);
      break;
    case "earring":
      stats.maxHp = scaleStat(budget * 3, factor);
      stats.defense = scaleStat(budget * 0.15, factor);
      break;
  }
  return stats;
}

export interface EquipmentBaseStatRange {
  key: "attack" | "maxHp" | "defense" | "attackSpeedPct";
  min: number;
  max: number;
}

export function getEquipmentBaseStatRanges(
  definition: ItemDefinition,
  minLevel: number,
  maxLevel: number,
  minRarity: Rarity = definition.minGrade,
  maxRarity: Rarity = definition.maxGrade,
): EquipmentBaseStatRange[] {
  const minStats = slotStatsAtFactor(
    definition.slot,
    getItemBudget(minLevel, minRarity, definition.baseTier),
    INHERENT_ROLL_MIN,
  );
  const maxStats = slotStatsAtFactor(
    definition.slot,
    getItemBudget(maxLevel, maxRarity, definition.baseTier),
    INHERENT_ROLL_MAX,
  );
  const keys: EquipmentBaseStatRange["key"][] = ["attack", "maxHp", "defense", "attackSpeedPct"];
  return keys.flatMap((key) => {
    const min = minStats[key];
    const max = maxStats[key];
    return min == null || max == null ? [] : [{ key, min, max }];
  });
}

function rollAffixValue(
  affixId: AffixId,
  rarity: Exclude<Rarity, "common">,
  budget: number,
  itemLevel: number,
  random: RandomSource,
): number {
  const definition = AFFIX_BY_ID[affixId];
  const range = getAffixRange(definition, rarity, itemLevel);
  if (definition.kind === "percent") {
    return random.int(Math.round(range.min), Math.round(range.max));
  }
  const mult = range.min + random.next() * (range.max - range.min);
  return Math.max(1, Math.round(budget * mult));
}

function rollAffixes(
  slot: EquipmentSlot,
  school: ItemDefinition["school"],
  rarity: Rarity,
  budget: number,
  itemLevel: number,
  random: RandomSource,
): AffixRoll[] {
  const count = AFFIX_COUNT_BY_RARITY[rarity];
  if (count <= 0 || rarity === "common") return [];
  const pool = [...getAffixesForSlot(slot)];
  const rolled: AffixRoll[] = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const totalWeight = pool.reduce(
      (total, affix) => total + getAffixSchoolWeight(affix, school),
      0,
    );
    let roll = random.next() * totalWeight;
    let pickIndex = pool.length - 1;
    for (let poolIndex = 0; poolIndex < pool.length; poolIndex += 1) {
      roll -= getAffixSchoolWeight(pool[poolIndex]!, school);
      if (roll < 0) {
        pickIndex = poolIndex;
        break;
      }
    }
    const [picked] = pool.splice(pickIndex, 1);
    if (!picked) break;
    rolled.push({
      affixId: picked.id,
      value: rollAffixValue(picked.id, rarity, budget, itemLevel, random),
    });
  }
  return rolled;
}

export function createEquipment(
  definitionId: string,
  stage: number,
  rarity: Rarity,
  random: RandomSource,
  requestedLevel = equipmentLevelForStage(stage),
): InventoryItem {
  const definition = ITEM_BY_ID[definitionId] ?? ITEM_DEFINITIONS[0]!;
  const level = clampEquipmentLevel(requestedLevel);
  const budget = getItemBudget(level, rarity, definition.baseTier);
  const stats = applySlotStats(definition.slot, budget, random);
  const affixes = rollAffixes(
    definition.slot,
    definition.school,
    rarity,
    budget,
    level,
    random,
  );
  const traitId = rarityHasLegendaryTrait(rarity)
    ? getLegendaryTraitId(definition.id)
    : null;
  instanceCounter += 1;
  return {
    instanceId: `gear-${Date.now().toString(36)}-${instanceCounter.toString(36)}`,
    definitionId: definition.id,
    slot: definition.slot,
    rarity,
    level,
    stage,
    stats,
    affixes,
    traitId,
    setId: null,
    sockets: [],
  };
}

export function getEquipmentSetId(
  item: Pick<InventoryItem, "setId">,
): SetId | null {
  return isSetId(item.setId) ? item.setId : null;
}

export function getGreaterAffixCount(item: Pick<InventoryItem, "affixes">): number {
  return (item.affixes ?? []).filter((roll) => roll.greater === true).length;
}

/** Promote distinct existing affixes to Greater Affixes at 125% of normal maximum. */
export function applyGreaterAffixes(
  item: InventoryItem,
  requestedCount: number,
  random: RandomSource,
): InventoryItem {
  if (
    getEquipmentLevel(item) < MAX_HERO_LEVEL ||
    item.rarity === "common" ||
    RARITY_RANK[item.rarity] < RARITY_RANK.epic
  ) return item;
  const affixes = item.affixes ?? [];
  const candidates = affixes.map((_, index) => index);
  const count = Math.min(Math.max(0, Math.floor(requestedCount)), candidates.length);
  const definition = ITEM_BY_ID[item.definitionId];
  const budget = getItemBudget(getEquipmentLevel(item), item.rarity, definition?.baseTier ?? 1);
  for (let promoted = 0; promoted < count; promoted += 1) {
    const candidateIndex = random.int(0, candidates.length - 1);
    const [affixIndex] = candidates.splice(candidateIndex, 1);
    if (affixIndex == null) break;
    const roll = affixes[affixIndex]!;
    const bounds = getAffixValueBounds(
      roll.affixId,
      item.rarity,
      budget,
      getEquipmentLevel(item),
    );
    affixes[affixIndex] = {
      ...roll,
      value: Math.round(bounds.max * GREATER_AFFIX_POWER_MULTIPLIER),
      greater: true,
    };
  }
  item.affixes = affixes;
  return item;
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

export function isEquipmentUpgrade(candidate: InventoryItem, equipped: InventoryItem | null): boolean {
  return equipped === null || getItemScore(candidate) > getItemScore(equipped);
}

export function describeItemAffixes(item: InventoryItem): string[] {
  return (item.affixes ?? []).map((roll) =>
    `${roll.smelted ? "熔炼·" : ""}${roll.greater ? "★" : ""}${formatAffixValue(roll.affixId, roll.value)}`,
  );
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
  const level = getEquipmentLevel(item);
  return Math.round(
    SALVAGE_GOLD_BASE *
      SALVAGE_GOLD_GROWTH ** (level - 1) *
      RARITY_MULTIPLIER[item.rarity] *
      BASE_TIER_MULTIPLIER[definition?.baseTier ?? 1],
  );
}

/** Soft cap for unequipped items visible in the backpack UI (before ability bonuses). */
export const BACKPACK_CAPACITY = 40;
/** Persist every hero loadout plus the maximum backpack capacity. */
export const INVENTORY_STORAGE_LIMIT =
  HERO_DEFINITIONS.length * EQUIPMENT_SLOTS.length +
  BACKPACK_CAPACITY +
  ABILITY_BY_ID.backpack_slots.maxLevel * ABILITY_BY_ID.backpack_slots.perLevel;

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

function normalizeAffixes(
  raw: unknown,
  rarity: Exclude<Rarity, "common">,
  budget: number,
  itemLevel: number,
): AffixRoll[] {
  if (!Array.isArray(raw)) return [];
  const result: AffixRoll[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const source = entry as {
      affixId?: unknown;
      value?: unknown;
      greater?: unknown;
      smelted?: unknown;
    };
    if (typeof source.affixId !== "string" || !AFFIX_ID_SET.has(source.affixId)) continue;
    if (typeof source.value !== "number" || !Number.isFinite(source.value)) continue;
    const affixId = source.affixId as AffixId;
    const greater = source.greater === true;
    const smelted = source.smelted === true;
    const bounds = getAffixValueBounds(
      affixId,
      rarity,
      budget,
      itemLevel,
      smelted ? SMELT_AFFIX_POWER_MULTIPLIER : 1,
    );
    const maximum = Math.round(
      bounds.max * (greater ? GREATER_AFFIX_POWER_MULTIPLIER : 1),
    );
    result.push({
      affixId,
      value: Math.max(1, Math.min(maximum, Math.round(source.value))),
      ...(greater ? { greater: true } : {}),
      ...(smelted ? { smelted: true } : {}),
    });
  }
  return result;
}

function normalizeBaseStats(
  raw: unknown,
  slot: EquipmentSlot,
  budget: number,
): InventoryItem["stats"] {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const maximums = slotStatsAtFactor(slot, budget, INHERENT_ROLL_MAX);
  const stats: InventoryItem["stats"] = {};
  for (const key of ["attack", "maxHp", "defense", "attackSpeedPct"] as const) {
    const value = source[key];
    const maximum = maximums[key];
    if (typeof value !== "number" || !Number.isFinite(value) || maximum == null) continue;
    stats[key] = Math.max(1, Math.min(maximum, Math.round(value)));
  }
  return stats;
}

export function normalizeInventoryItem(raw: unknown): InventoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<InventoryItem> & { slot?: string };
  if (typeof source.instanceId !== "string" || typeof source.definitionId !== "string") return null;
  const definition = ITEM_BY_ID[source.definitionId];
  if (!definition) return null;
  if (typeof source.slot !== "string" || !SLOT_SET.has(source.slot)) return null;
  const declaredSlot = source.slot as EquipmentSlot;
  const slot = definition.slot;
  if (definition.slot !== declaredSlot) return null;
  if (!isRarity(source.rarity)) return null;
  const stage =
    typeof source.stage === "number" && Number.isFinite(source.stage)
      ? Math.max(1, Math.min(MAX_STAGE, Math.round(source.stage)))
      : 1;
  const level =
    typeof source.level === "number" && Number.isFinite(source.level)
      ? clampEquipmentLevel(source.level)
      : equipmentLevelForStage(stage);
  const budget = getItemBudget(level, source.rarity, definition.baseTier);
  const affixes = source.rarity === "common"
    ? []
    : normalizeAffixes(
        source.affixes,
        source.rarity,
        budget,
        level,
      );
  const rawReset = (source as { resetAffixIndex?: unknown }).resetAffixIndex;
  const resetAffixIndex =
    typeof rawReset === "number" &&
    Number.isInteger(rawReset) &&
    rawReset >= 0 &&
    rawReset < affixes.length
      ? rawReset
      : null;
  return {
    instanceId: source.instanceId,
    definitionId: source.definitionId,
    slot,
    rarity: source.rarity,
    level,
    stage,
    stats: normalizeBaseStats(source.stats, slot, budget),
    affixes,
    traitId: typeof source.traitId === "string" ? source.traitId : null,
    setId: isSetId(source.setId) ? source.setId : null,
    sockets: normalizeItemSockets(source.sockets),
    resetAffixIndex,
  };
}

function normalizeItemSockets(raw: unknown): ItemSocket[] {
  if (!Array.isArray(raw)) return [];
  const result: ItemSocket[] = [];
  for (const entry of raw) {
    if (result.length >= 2) break;
    if (!entry || typeof entry !== "object") {
      result.push({ gemId: null });
      continue;
    }
    const gemId = (entry as { gemId?: unknown }).gemId;
    if (typeof gemId === "string" && MATERIAL_BY_ID[gemId as MaterialId]?.kind === "gem") {
      result.push({ gemId });
    } else {
      result.push({ gemId: null });
    }
  }
  return result;
}

