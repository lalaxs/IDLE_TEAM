import {
  DIFFICULTY_BY_ID,
  difficultyRank,
  equipmentLevelForDifficulty,
  type GameDifficulty,
} from "../content/difficulties";
import { ITEM_BY_ID, ITEM_DEFINITIONS } from "../content/items";
import { RARITY_IDS, RARITY_RANK, type Rarity } from "../content/rarities";
import { getChapterSetIds } from "../content/sets";
import { stageToChapter } from "../content/chapters";
import type { RandomSource } from "../simulation/RandomSource";
import {
  applyGreaterAffixes,
  createEquipment,
  type InventoryItem,
} from "./EquipmentSystem";

export type NaturalDropSource = "normal" | "elite" | "boss" | "chapter_boss" | "offline" | "chest";

const SET_CHANCE_MULTIPLIER: Record<NaturalDropSource, number> = {
  normal: 1,
  offline: 1,
  chest: 2,
  elite: 1.5,
  boss: 2,
  chapter_boss: 3,
};

export function naturalSetMarkChance(
  difficulty: GameDifficulty,
  source: NaturalDropSource,
): number {
  return Math.min(1, DIFFICULTY_BY_ID[difficulty].setMarkChance * SET_CHANCE_MULTIPLIER[source]);
}

function rarityAtLeast(rarity: Rarity, minimum: Rarity): Rarity {
  return RARITY_IDS[Math.max(RARITY_RANK[rarity], RARITY_RANK[minimum]) - 1]!;
}

function rarityAtMost(rarity: Rarity, maximum: Rarity): Rarity {
  return RARITY_IDS[Math.min(RARITY_RANK[rarity], RARITY_RANK[maximum]) - 1]!;
}

const NATURAL_DROP_RARITIES = RARITY_IDS.filter(
  (rarity): rarity is Exclude<Rarity, "primordial"> => rarity !== "primordial",
);
const NATURAL_DROP_ANCHORS = [
  { step: 0, weights: [72, 27, 1, 0, 0, 0, 0, 0, 0] },
  { step: 9, weights: [60, 27, 10, 2.7, 0.3, 0, 0, 0, 0] },
  { step: 18, weights: [54, 27, 13, 4.5, 1.3, 0.2, 0, 0, 0] },
  { step: 27, weights: [49, 26, 17, 5.5, 1.7, 0.65, 0.15, 0, 0] },
  { step: 36, weights: [45, 25, 20, 6.2, 2.2, 1, 0.5, 0.1, 0] },
  { step: 45, weights: [41, 24, 23, 7, 2.5, 1.3, 0.7, 0.4, 0.1] },
] as const;

const NATURAL_DROP_UNLOCK_STEP: Record<(typeof NATURAL_DROP_RARITIES)[number], number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  epic: 5,
  immortal: 8,
  arcane: 14,
  transcendent: 23,
  astral: 32,
  sacred: 41,
};

const HIGH_RARITY_SOURCE_MULTIPLIER: Record<NaturalDropSource, number> = {
  normal: 1,
  offline: 1,
  elite: 1.1,
  boss: 1.2,
  chest: 1.2,
  chapter_boss: 1.35,
};

function naturalDropProgressStep(stage: number, difficulty: GameDifficulty): number {
  const chapter = Math.max(1, Math.min(10, Math.ceil(Math.max(1, stage) / 12)));
  return difficultyRank(difficulty) * 9 + chapter - 1;
}

export function getNaturalDropRarityWeights(
  stage: number,
  difficulty: GameDifficulty,
  source: NaturalDropSource = "normal",
): Record<Rarity, number> {
  const step = naturalDropProgressStep(stage, difficulty);
  const upperIndex = NATURAL_DROP_ANCHORS.findIndex((anchor) => anchor.step >= step);
  const upper = NATURAL_DROP_ANCHORS[upperIndex < 0 ? NATURAL_DROP_ANCHORS.length - 1 : upperIndex]!;
  const lower = NATURAL_DROP_ANCHORS[Math.max(0, (upperIndex < 0 ? NATURAL_DROP_ANCHORS.length : upperIndex) - 1)]!;
  const distance = Math.max(1, upper.step - lower.step);
  const progress = upper.step === lower.step ? 0 : (step - lower.step) / distance;
  const highRarityMultiplier = HIGH_RARITY_SOURCE_MULTIPLIER[source];
  const raw = NATURAL_DROP_RARITIES.map((rarity, index) => {
    if (step < NATURAL_DROP_UNLOCK_STEP[rarity]) return 0;
    const interpolated = lower.weights[index]! + (upper.weights[index]! - lower.weights[index]!) * progress;
    return RARITY_RANK[rarity] >= RARITY_RANK.epic
      ? interpolated * highRarityMultiplier
      : interpolated;
  });
  const total = raw.reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(RARITY_IDS.map((rarity, index) => [
    rarity,
    rarity === "primordial" ? 0 : (raw[index] ?? 0) / total,
  ])) as Record<Rarity, number>;
}

export function getNaturalDropRarityBounds(
  stage: number,
  difficulty: GameDifficulty,
): { min: Rarity; max: Rarity } {
  const weights = getNaturalDropRarityWeights(stage, difficulty);
  const available = RARITY_IDS.filter((rarity) => weights[rarity] > 0);
  return { min: available[0] ?? "common", max: available[available.length - 1] ?? "common" };
}

export function rollNaturalRarity(
  stage: number,
  difficulty: GameDifficulty,
  random: RandomSource,
  source: NaturalDropSource = "normal",
): Rarity {
  const weights = getNaturalDropRarityWeights(stage, difficulty, source);
  let roll = random.next();
  for (const rarity of NATURAL_DROP_RARITIES) {
    roll -= weights[rarity];
    if (roll < 0) return rarity;
  }
  return "sacred";
}

export function rollGreaterAffixCount(
  difficulty: GameDifficulty,
  random: RandomSource,
): number {
  const roll = random.next();
  if (difficulty === "hell") {
    if (roll < 0.84) return 0;
    if (roll < 0.99) return 1;
    return 2;
  }
  if (difficulty === "torment") {
    if (roll < 0.65) return 0;
    if (roll < 0.93) return 1;
    if (roll < 0.99) return 2;
    return 3;
  }
  return 0;
}

export interface NaturalEquipmentOptions {
  forcedRarity?: Rarity;
  guaranteeGreater?: boolean;
}

/** Shared natural-drop path for combat and offline rewards. */
export function createNaturalEquipment(
  definitionId: string,
  stage: number,
  difficulty: GameDifficulty,
  source: NaturalDropSource,
  random: RandomSource,
  options: NaturalEquipmentOptions = {},
): InventoryItem {
  const definition = ITEM_BY_ID[definitionId] ?? ITEM_DEFINITIONS[0]!;
  let rarity = options.forcedRarity ?? rollNaturalRarity(stage, difficulty, random, source);
  if (options.guaranteeGreater) rarity = rarityAtLeast(rarity, "epic");
  rarity = rarityAtMost(rarity, "sacred");

  const item = createEquipment(
    definition.id,
    stage,
    rarity,
    random,
    equipmentLevelForDifficulty(stage, difficulty),
  );

  if (random.next() < naturalSetMarkChance(difficulty, source)) {
    item.setId = random.pick(getChapterSetIds(stageToChapter(stage)));
  }

  const greaterCount = Math.max(
    options.guaranteeGreater ? 1 : 0,
    rollGreaterAffixCount(difficulty, random),
  );
  return applyGreaterAffixes(item, greaterCount, random);
}
