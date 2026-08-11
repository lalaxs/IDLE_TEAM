/** Ten-grade rarity ladder (TBH skeleton + 本作命名). */

export const RARITY_IDS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "immortal",
  "arcane",
  "transcendent",
  "astral",
  "sacred",
  "primordial",
] as const;

export type Rarity = (typeof RARITY_IDS)[number];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "凡品",
  uncommon: "良品",
  rare: "珍品",
  epic: "传奇",
  immortal: "传世",
  arcane: "灵蕴",
  transcendent: "超然",
  astral: "星穹",
  sacred: "神辉",
  primordial: "混元",
};

/** TBH-aligned signature colors (UI may darken common / rainbow primordial border). */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#bdbdbd",
  uncommon: "#54fc0c",
  rare: "#2f8bfc",
  epic: "#fc9c0c",
  immortal: "#fc2424",
  arcane: "#b40cfc",
  transcendent: "#fc246c",
  astral: "#6ccce4",
  sacred: "#fce454",
  primordial: "#fcfcfc",
};

export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.25,
  rare: 1.55,
  epic: 2,
  immortal: 2.55,
  arcane: 3.25,
  transcendent: 4.1,
  astral: 5.2,
  sacred: 6.6,
  primordial: 8.4,
};

export const AFFIX_COUNT_BY_RARITY: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  immortal: 3,
  arcane: 4,
  transcendent: 4,
  astral: 4,
  sacred: 5,
  primordial: 5,
};

export const RARITY_RANK: Record<Rarity, number> = Object.fromEntries(
  RARITY_IDS.map((id, index) => [id, index + 1]),
) as Record<Rarity, number>;

export const RARITY_ORDER: readonly Rarity[] = RARITY_IDS;

export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && (RARITY_IDS as readonly string[]).includes(value);
}

/** Grades that unlock legendary orange-text traits. */
export function rarityHasLegendaryTrait(rarity: Rarity): boolean {
  return RARITY_RANK[rarity] >= RARITY_RANK.epic;
}

/** Scale factor for affix ranges above epic, relative to epic band. */
export function affixRangeScale(rarity: Rarity): number {
  if (rarity === "common") return 0;
  if (rarity === "uncommon" || rarity === "rare" || rarity === "epic") return 1;
  return RARITY_MULTIPLIER[rarity] / RARITY_MULTIPLIER.epic;
}
