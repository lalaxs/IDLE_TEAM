import { RARITY_IDS, RARITY_RANK, type Rarity } from "../content/rarities";
import { MAX_HERO_LEVEL } from "../content/balance";
import type { RandomSource } from "../simulation/RandomSource";
import {
  applyGreaterAffixes,
  createEquipment,
  getEquipmentLevel,
  getGreaterAffixCount,
  type InventoryItem,
} from "./EquipmentSystem";

export const ALCHEMY_SLOT_COUNT = 9;

export interface AlchemyStationState {
  level: number;
  /** Progress within the current station level. */
  exp: number;
}

export const ALCHEMY_STATION_MAX_LEVEL = 9;

/** Each station level unlocks one additional ten-level synthesis band. */
export const ALCHEMY_STATION_LEVEL_CAPS = [20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/** Experience needed to advance from the corresponding station level. */
export const ALCHEMY_STATION_EXP_TO_NEXT = [90, 180, 300, 450, 630, 840, 1080, 1350, 0] as const;

export function createDefaultAlchemyStation(): AlchemyStationState {
  return { level: 1, exp: 0 };
}

export function normalizeAlchemyStation(raw: unknown): AlchemyStationState {
  if (!raw || typeof raw !== "object") return createDefaultAlchemyStation();
  const source = raw as Partial<AlchemyStationState>;
  let level = Number.isFinite(source.level)
    ? Math.max(1, Math.min(ALCHEMY_STATION_MAX_LEVEL, Math.floor(source.level!)))
    : 1;
  let exp = Number.isFinite(source.exp) ? Math.max(0, Math.floor(source.exp!)) : 0;
  while (level < ALCHEMY_STATION_MAX_LEVEL) {
    const required = ALCHEMY_STATION_EXP_TO_NEXT[level - 1]!;
    if (exp < required) break;
    exp -= required;
    level += 1;
  }
  if (level >= ALCHEMY_STATION_MAX_LEVEL) exp = 0;
  return { level, exp };
}

export function getAlchemyStationLevelCap(level: number): number {
  const normalized = Math.max(1, Math.min(ALCHEMY_STATION_MAX_LEVEL, Math.floor(level)));
  return ALCHEMY_STATION_LEVEL_CAPS[normalized - 1]!;
}

export function getAlchemyExperienceToNext(level: number): number {
  const normalized = Math.max(1, Math.min(ALCHEMY_STATION_MAX_LEVEL, Math.floor(level)));
  return ALCHEMY_STATION_EXP_TO_NEXT[normalized - 1]!;
}

export function addAlchemyStationExperience(
  station: AlchemyStationState,
  gained: number,
): { station: AlchemyStationState; levelsGained: number } {
  const before = normalizeAlchemyStation(station);
  if (before.level >= ALCHEMY_STATION_MAX_LEVEL) {
    return { station: before, levelsGained: 0 };
  }
  const after = normalizeAlchemyStation({ level: before.level, exp: before.exp + Math.max(0, Math.floor(gained)) });
  return { station: after, levelsGained: after.level - before.level };
}

/** Next grade on the TBH ladder, or null at 混元. */
export function nextAlchemyRarity(rarity: Rarity): Rarity | null {
  const index = RARITY_IDS.indexOf(rarity);
  if (index < 0 || index >= RARITY_IDS.length - 1) return null;
  return RARITY_IDS[index + 1]!;
}

const ALCHEMY_MIRACLE_CHANCE: Record<Exclude<Rarity, "primordial">, number> = {
  common: 0.05,
  uncommon: 0.04,
  rare: 0.025,
  epic: 0.01,
  immortal: 0.005,
  arcane: 0.003,
  transcendent: 0.0015,
  astral: 0.0005,
  sacred: 0,
};

export function canAlchemyMiracle(rarity: Rarity): boolean {
  if (rarity === "primordial") return false;
  const upgraded = nextAlchemyRarity(rarity);
  return upgraded !== null
    && nextAlchemyRarity(upgraded) !== null
    && ALCHEMY_MIRACLE_CHANCE[rarity] > 0;
}

export function rollAlchemyRarity(
  rarity: Exclude<Rarity, "primordial">,
  random: RandomSource,
): { rarity: Rarity; miracle: boolean } {
  const upgraded = nextAlchemyRarity(rarity)!;
  const miracleTarget = nextAlchemyRarity(upgraded);
  const miracle = canAlchemyMiracle(rarity)
    && random.next() < ALCHEMY_MIRACLE_CHANCE[rarity];
  return { rarity: miracle ? miracleTarget! : upgraded, miracle };
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
  const level = getEquipmentLevel(items[0]!);
  if (!items.every((item) => getEquipmentLevel(item) === level)) return "九件装备必须为同一等级";
  if (items.some((item) => item.rarity === "primordial")) return "混元无法作为炼金材料";
  return null;
}

export function getAlchemyResultLevel(items: readonly InventoryItem[], stationLevel: number): number {
  const sourceLevel = items[0] ? getEquipmentLevel(items[0]) : 1;
  return Math.min(sourceLevel, getAlchemyStationLevelCap(stationLevel));
}

export function getAlchemyExperienceReward(
  items: readonly InventoryItem[],
  stationLevel: number,
): number {
  if (!items.length) return 0;
  const effectiveLevel = getAlchemyResultLevel(items, stationLevel);
  const levelFactor = Math.max(1, Math.ceil(effectiveLevel / 10));
  return items.length * levelFactor * RARITY_RANK[items[0]!.rarity];
}

export interface AlchemyGreaterAffixPreview {
  /** Total Greater Affixes consumed by the nine inputs. */
  energy: number;
  oneOrMoreChancePct: number;
  twoOrMoreChancePct: number;
  threeChancePct: number;
}

/**
 * Greater Affix inheritance uses one cumulative roll:
 * - every input star adds 20% toward at least one Greater Affix;
 * - after 3 stars, each extra star adds 12% toward at least two;
 * - after 8 stars, each extra star adds 8% toward three.
 */
export function getAlchemyGreaterAffixPreview(
  inputs: readonly Pick<InventoryItem, "affixes" | "rarity" | "level" | "stage">[],
  resultLevel?: number,
): AlchemyGreaterAffixPreview {
  const energy = inputs.reduce((sum, item) => sum + getGreaterAffixCount(item), 0);
  const targetRarity = inputs[0] ? nextAlchemyRarity(inputs[0].rarity) : null;
  const targetLevel = resultLevel ?? (inputs[0] ? getEquipmentLevel(inputs[0]) : 0);
  if (
    targetLevel < MAX_HERO_LEVEL ||
    !targetRarity ||
    RARITY_RANK[targetRarity] < RARITY_RANK.epic ||
    energy <= 0
  ) {
    return { energy, oneOrMoreChancePct: 0, twoOrMoreChancePct: 0, threeChancePct: 0 };
  }
  const oneOrMoreChancePct = Math.min(100, energy * 20);
  const twoOrMoreChancePct = Math.min(
    oneOrMoreChancePct,
    Math.min(100, Math.max(0, energy - 3) * 12),
  );
  const threeChancePct = Math.min(
    twoOrMoreChancePct,
    Math.min(100, Math.max(0, energy - 8) * 8),
  );
  return { energy, oneOrMoreChancePct, twoOrMoreChancePct, threeChancePct };
}

export function rollAlchemyGreaterAffixCount(
  preview: AlchemyGreaterAffixPreview,
  random: RandomSource,
): number {
  if (preview.oneOrMoreChancePct <= 0) return 0;
  const roll = random.next() * 100;
  if (roll < preview.threeChancePct) return 3;
  if (roll < preview.twoOrMoreChancePct) return 2;
  if (roll < preview.oneOrMoreChancePct) return 1;
  return 0;
}

function pickResultDefinitionId(inputs: readonly InventoryItem[]): string {
  return inputs[0]!.definitionId;
}

export interface AlchemyCraftResult {
  ok: true;
  consumedIds: string[];
  result: InventoryItem;
  fromRarity: Rarity;
  toRarity: Rarity;
  miracle: boolean;
  sourceLevel: number;
  resultLevel: number;
  stationExperience: number;
  greaterAffixEnergy: number;
  greaterAffixCount: number;
}

export interface AlchemyCraftFailure {
  ok: false;
  message: string;
}

/** Consume 9 same-level, same-grade items → one item at +1, or rarely +2, grades. */
export function craftAlchemyItem(
  inputs: readonly InventoryItem[],
  stationLevel: number,
  random: RandomSource,
): AlchemyCraftResult | AlchemyCraftFailure {
  const error = validateAlchemyInputs(inputs);
  if (error) return { ok: false, message: error };
  const fromRarity = inputs[0]!.rarity;
  if (fromRarity === "primordial") return { ok: false, message: "已达最高品阶" };
  const rarityOutcome = rollAlchemyRarity(fromRarity, random);
  const toRarity = rarityOutcome.rarity;

  const definitionId = pickResultDefinitionId(inputs);

  const stage = Math.max(...inputs.map((item) => item.stage));
  const sourceLevel = getEquipmentLevel(inputs[0]!);
  const resultLevel = getAlchemyResultLevel(inputs, stationLevel);
  const result = createEquipment(definitionId, stage, toRarity, random, resultLevel);
  const greaterPreview = getAlchemyGreaterAffixPreview(inputs, resultLevel);
  const greaterAffixCount = rollAlchemyGreaterAffixCount(greaterPreview, random);
  applyGreaterAffixes(result, greaterAffixCount, random);
  return {
    ok: true,
    consumedIds: inputs.map((item) => item.instanceId),
    result,
    fromRarity,
    toRarity,
    miracle: rarityOutcome.miracle,
    sourceLevel,
    resultLevel,
    stationExperience: getAlchemyExperienceReward(inputs, stationLevel),
    greaterAffixEnergy: greaterPreview.energy,
    greaterAffixCount: getGreaterAffixCount(result),
  };
}

/**
 * Auto-pick up to 9 unequipped candidates of one grade.
 * Prefers a rarity that already has 9+, then densest same-definition cluster.
 */
export function pickAlchemyAutoFill(
  candidates: readonly InventoryItem[],
  stationLevel: number,
): string[] {
  const levelCap = getAlchemyStationLevelCap(stationLevel);
  const groupsByKey = new Map<string, { level: number; rarity: Rarity; items: InventoryItem[] }>();
  for (const item of candidates) {
    const level = getEquipmentLevel(item);
    if (level > levelCap) continue;
    const key = `${level}:${item.rarity}`;
    const group = groupsByKey.get(key) ?? { level, rarity: item.rarity, items: [] };
    group.items.push(item);
    groupsByKey.set(key, group);
  }
  if (groupsByKey.size === 0) return [];

  const groups = [...groupsByKey.values()].sort((a, b) => {
    const readyA = a.items.length >= ALCHEMY_SLOT_COUNT ? 1 : 0;
    const readyB = b.items.length >= ALCHEMY_SLOT_COUNT ? 1 : 0;
    if (readyA !== readyB) return readyB - readyA;
    if (b.items.length !== a.items.length) return b.items.length - a.items.length;
    if (b.level !== a.level) return b.level - a.level;
    return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
  });

  const pool = groups[0]!.items;
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
