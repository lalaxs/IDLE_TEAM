import { createEmptyEquipment, EQUIPMENT_SLOTS, type EquipmentSlot } from "../content/items";
import { HERO_DEFINITIONS } from "../content/heroes";
import {
  createDefaultAbilityLevels,
  normalizeAbilityLevels,
  type AbilityLevels,
} from "../progression/AbilitySystem";
import {
  createEmptyTalentRanks,
  normalizeChosenSkillId,
  normalizeTalentRanks,
  type TalentRanks,
} from "../progression/TalentSystem";
import type { HeroSkillId } from "../content/heroSkills";
import {
  createDefaultLootChest,
  normalizeLootChest,
  type LootChestState,
} from "../progression/LootChestSystem";
import {
  createStarterMaterials,
  normalizeMaterials,
  type MaterialId,
} from "../content/materials";
import { isDungeonId, DUNGEON_BY_ID, type DungeonId } from "../content/dungeons";
import {
  INVENTORY_STORAGE_LIMIT,
  normalizeInventoryItem,
  type InventoryItem,
} from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";

function normalizeHeroEquipment(raw: unknown): Record<EquipmentSlot, string | null> {
  const equipment = createEmptyEquipment();
  if (!raw || typeof raw !== "object") return equipment;
  const source = raw as Partial<Record<EquipmentSlot, unknown>>;
  for (const slot of EQUIPMENT_SLOTS) {
    const value = source[slot];
    if (typeof value === "string") equipment[slot] = value;
  }
  return equipment;
}

function normalizeAscendLevel(raw: { ascendLevel?: unknown; ascended?: unknown }): number {
  if (typeof raw.ascendLevel === "number" && Number.isFinite(raw.ascendLevel)) {
    return Math.min(5, Math.max(0, Math.floor(raw.ascendLevel)));
  }
  return raw.ascended ? 1 : 0;
}

function normalizeItemList(raw: unknown, limit: number): InventoryItem[] {
  if (!Array.isArray(raw)) return [];
  const result: InventoryItem[] = [];
  for (const entry of raw.slice(0, limit)) {
    const item = normalizeInventoryItem(entry);
    if (item) result.push(item);
  }
  return result;
}

export interface HeroProgress {
  heroId: HeroId;
  unlocked: boolean;
  level: number;
  /** Duplicate-summon fragments used for star upgrades. */
  marks: number;
  /** Star rank unlocked via fragments (0–5). */
  stars: number;
  /** Ascension rank after max stars (0–5). */
  ascendLevel: number;
  /** Flat HP kept after star resets. */
  starFlatHp: number;
  /** Flat attack kept after star resets. */
  starFlatAtk: number;
  /** Flat defense kept after star resets. */
  starFlatDef: number;
  /** Shared talent tree ranks. */
  talentRanks: TalentRanks;
  /** Shared hero skill chosen at level 20. */
  chosenSkillId: HeroSkillId | null;
  equipment: Record<EquipmentSlot, string | null>;
}

export type ShopOfferState =
  | {
      offerId: string;
      kind: "equipment";
      item: InventoryItem;
      priceGold: number;
      sold: boolean;
    }
  | {
      offerId: string;
      kind: "gems";
      gemAmount: 50;
      priceGold: number;
      sold: boolean;
    };

export interface DungeonRun {
  dungeonId: DungeonId;
  heroIds: HeroId[];
  startedAt: number;
  endsAt: number;
}

export interface SaveDataV1 {
  version: 1;
  updatedAt: number;
  lastActiveAt: number;
  currentStage: number;
  highestUnlockedStage: number;
  highestClearedStage: number;
  /** Timed dungeon dispatches running in the background. */
  dungeonRuns: DungeonRun[];
  gold: number;
  /** Experience currency for hero leveling. */
  exp: number;
  gems: number;
  summonCount: number;
  roster: Record<HeroId, HeroProgress>;
  party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null];
  inventory: InventoryItem[];
  overflow: InventoryItem[];
  /** Crafting / gem materials keyed by material id. */
  materials: Record<MaterialId, number>;
  shop: {
    dateKey: string;
    freeRefreshUsed: boolean;
    offers: ShopOfferState[];
  };
  abilities: AbilityLevels;
  lootChest: LootChestState;
  tutorialCompleted: boolean;
  settings: {
    battleSpeed: 1 | 2;
    soundEnabled: boolean;
    reducedMotion: boolean;
  };
}

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, numeric));
};

export const getDateKey = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export function createDefaultSave(now = Date.now()): SaveDataV1 {
  const demoAscendByHero: Partial<Record<HeroId, number>> = {
    H01: 1,
    H02: 2,
    H03: 3,
    H04: 4,
    H05: 5,
  };
  const roster = Object.fromEntries(
    HERO_DEFINITIONS.map(({ id }, index) => {
      const ascendLevel = demoAscendByHero[id] ?? 0;
      return [
        id,
        {
          heroId: id,
          unlocked: index < 6,
          level: 1,
          marks: 0,
          stars: 0,
          ascendLevel,
          starFlatHp: 0,
          starFlatAtk: 0,
          starFlatDef: 0,
          talentRanks: createEmptyTalentRanks(),
          chosenSkillId: null,
          equipment: createEmptyEquipment(),
        },
      ];
    }),
  ) as Record<HeroId, HeroProgress>;

  return {
    version: 1,
    updatedAt: now,
    lastActiveAt: now,
    currentStage: 1,
    highestUnlockedStage: 1,
    highestClearedStage: 0,
    dungeonRuns: [],
    gold: 0,
    exp: 120,
    gems: 300,
    summonCount: 0,
    roster,
    party: ["H01", "H02", "H03", "H04", "H05"],
    inventory: [],
    overflow: [],
    materials: createStarterMaterials(),
    shop: {
      dateKey: getDateKey(new Date(now)),
      freeRefreshUsed: false,
      offers: [],
    },
    abilities: createDefaultAbilityLevels(),
    lootChest: createDefaultLootChest(),
    tutorialCompleted: false,
    settings: {
      battleSpeed: 1,
      soundEnabled: true,
      reducedMotion:
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
  };
}

export function repairSaveData(input: unknown, now = Date.now()): SaveDataV1 {
  const base = createDefaultSave(now);
  if (!input || typeof input !== "object") return base;
  const source = input as Partial<SaveDataV1>;
  const inventory = normalizeItemList(source.inventory, INVENTORY_STORAGE_LIMIT);
  const overflow = normalizeItemList(source.overflow, 10);

  const roster = { ...base.roster };
  if (source.roster && typeof source.roster === "object") {
    for (const hero of HERO_DEFINITIONS) {
      const value = source.roster[hero.id];
      if (!value || typeof value !== "object") continue;
      roster[hero.id] = {
        ...roster[hero.id],
        unlocked: Boolean(value.unlocked || roster[hero.id].unlocked),
        level: clampInt(value.level, 1, 1, 100),
        marks: clampInt(value.marks, 0, 0, 9999),
        stars: clampInt((value as { stars?: unknown }).stars, 0, 0, 5),
        ascendLevel: normalizeAscendLevel(value),
        starFlatHp: clampInt((value as { starFlatHp?: unknown }).starFlatHp, 0, 0, 1_000_000),
        starFlatAtk: clampInt((value as { starFlatAtk?: unknown }).starFlatAtk, 0, 0, 1_000_000),
        starFlatDef: clampInt((value as { starFlatDef?: unknown }).starFlatDef, 0, 0, 1_000_000),
        talentRanks: normalizeTalentRanks((value as { talentRanks?: unknown }).talentRanks),
        chosenSkillId: normalizeChosenSkillId((value as { chosenSkillId?: unknown }).chosenSkillId),
        equipment: normalizeHeroEquipment(value.equipment),
      };
    }
  }
  const partySource = Array.isArray(source.party) ? source.party : base.party;
  const unique = new Set<HeroId>();
  const rawParty = base.party.map((fallback, index) => {
    const candidate = partySource[index];
    if (
      typeof candidate === "string" &&
      candidate in roster &&
      roster[candidate as HeroId].unlocked &&
      !unique.has(candidate as HeroId)
    ) {
      unique.add(candidate as HeroId);
      return candidate as HeroId;
    }
    if (fallback) unique.add(fallback);
    return fallback;
  }) as SaveDataV1["party"];

  const dungeonRuns = normalizeDungeonRuns((source as { dungeonRuns?: unknown }).dungeonRuns, roster, now);
  const busyHeroes = new Set(dungeonRuns.flatMap((run) => run.heroIds));
  const party = stripBusyHeroesFromParty(rawParty, busyHeroes, roster);

  // Keep shop offer item slots aligned with current definitions when possible.
  const shopOffers =
    source.shop && typeof source.shop === "object" && Array.isArray(source.shop.offers)
      ? source.shop.offers.slice(0, 4).map((offer) => {
          if (!offer || typeof offer !== "object" || offer.kind !== "equipment") return offer;
          const item = normalizeInventoryItem(offer.item);
          return item ? { ...offer, item } : offer;
        })
      : [];

  return {
    ...base,
    updatedAt: clampInt(source.updatedAt, now, 0, Number.MAX_SAFE_INTEGER),
    lastActiveAt: clampInt(source.lastActiveAt, now, 0, Number.MAX_SAFE_INTEGER),
    currentStage: clampInt(source.currentStage, 1, 1, 120),
    highestUnlockedStage: clampInt(source.highestUnlockedStage, 1, 1, 120),
    highestClearedStage: clampInt(source.highestClearedStage, 0, 0, 120),
    dungeonRuns,
    gold: clampInt(source.gold, 0, 0, 999_999_999),
    exp: clampInt((source as { exp?: unknown }).exp, 120, 0, 999_999_999),
    gems: clampInt(source.gems, 300, 0, 999_999),
    summonCount: clampInt(source.summonCount, 0, 0, 9999),
    roster,
    party,
    inventory,
    overflow,
    materials: normalizeMaterials((source as { materials?: unknown }).materials),
    shop:
      source.shop && typeof source.shop === "object"
        ? {
            dateKey: typeof source.shop.dateKey === "string" ? source.shop.dateKey : base.shop.dateKey,
            freeRefreshUsed: Boolean(source.shop.freeRefreshUsed),
            offers: shopOffers.length ? shopOffers : Array.isArray(source.shop.offers) ? source.shop.offers.slice(0, 4) : [],
          }
        : base.shop,
    abilities: normalizeAbilityLevels(source.abilities),
    lootChest: normalizeLootChest(source.lootChest),
    tutorialCompleted: Boolean(source.tutorialCompleted),
    settings: {
      battleSpeed: source.settings?.battleSpeed === 2 ? 2 : 1,
      soundEnabled: source.settings?.soundEnabled !== false,
      reducedMotion: Boolean(source.settings?.reducedMotion),
    },
  };
}

function normalizeDungeonRuns(raw: unknown, roster: Record<HeroId, HeroProgress>, now: number): DungeonRun[] {
  if (!Array.isArray(raw)) return [];
  const usedHeroes = new Set<HeroId>();
  const usedDungeons = new Set<DungeonId>();
  const runs: DungeonRun[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const source = entry as Partial<DungeonRun>;
    if (typeof source.dungeonId !== "string" || !isDungeonId(source.dungeonId)) continue;
    if (usedDungeons.has(source.dungeonId)) continue;
    const dungeon = DUNGEON_BY_ID[source.dungeonId];
    const heroIds = Array.isArray(source.heroIds)
      ? [...new Set(source.heroIds.filter((id): id is HeroId => typeof id === "string" && id in roster && roster[id as HeroId].unlocked))]
      : [];
    if (heroIds.length !== dungeon.partySize) continue;
    if (heroIds.some((id) => usedHeroes.has(id))) continue;
    const startedAt = clampInt(source.startedAt, now, 0, Number.MAX_SAFE_INTEGER);
    const endsAt = clampInt(source.endsAt, startedAt + dungeon.durationMs, startedAt, Number.MAX_SAFE_INTEGER);
    usedDungeons.add(source.dungeonId);
    for (const id of heroIds) usedHeroes.add(id);
    runs.push({ dungeonId: source.dungeonId, heroIds, startedAt, endsAt });
  }
  return runs;
}

function stripBusyHeroesFromParty(
  party: SaveDataV1["party"],
  busyHeroes: Set<HeroId>,
  roster: Record<HeroId, HeroProgress>,
): SaveDataV1["party"] {
  const stripped = party.map((id) => (id && busyHeroes.has(id) ? null : id)) as SaveDataV1["party"];
  if (stripped.some((id) => id !== null)) return stripped;
  const fallback = HERO_DEFINITIONS.find(({ id }) => roster[id].unlocked && !busyHeroes.has(id));
  if (!fallback) return stripped;
  stripped[0] = fallback.id;
  return stripped;
}
