import { createEmptyEquipment, EQUIPMENT_SLOTS, type EquipmentSlot } from "../content/items";
import { HERO_DEFINITIONS } from "../content/heroes";
import { normalizeInventoryItem, type InventoryItem } from "../progression/EquipmentSystem";
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
  marks: number;
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

export interface SaveDataV1 {
  version: 1;
  updatedAt: number;
  lastActiveAt: number;
  currentStage: number;
  highestUnlockedStage: number;
  highestClearedStage: number;
  gold: number;
  gems: number;
  summonCount: number;
  roster: Record<HeroId, HeroProgress>;
  party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null];
  inventory: InventoryItem[];
  overflow: InventoryItem[];
  shop: {
    dateKey: string;
    freeRefreshUsed: boolean;
    offers: ShopOfferState[];
  };
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
  const roster = Object.fromEntries(
    HERO_DEFINITIONS.map(({ id }, index) => [
      id,
      {
        heroId: id,
        unlocked: index < 6,
        level: 1,
        marks: 0,
        equipment: createEmptyEquipment(),
      },
    ]),
  ) as Record<HeroId, HeroProgress>;

  return {
    version: 1,
    updatedAt: now,
    lastActiveAt: now,
    currentStage: 1,
    highestUnlockedStage: 1,
    highestClearedStage: 0,
    gold: 0,
    gems: 300,
    summonCount: 0,
    roster,
    party: ["H01", "H02", "H03", "H04", "H05"],
    inventory: [],
    overflow: [],
    shop: {
      dateKey: getDateKey(new Date(now)),
      freeRefreshUsed: false,
      offers: [],
    },
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
  const inventory = normalizeItemList(source.inventory, 40);
  const overflow = normalizeItemList(source.overflow, 10);

  const roster = { ...base.roster };
  if (source.roster && typeof source.roster === "object") {
    for (const hero of HERO_DEFINITIONS) {
      const value = source.roster[hero.id];
      if (!value || typeof value !== "object") continue;
      roster[hero.id] = {
        ...roster[hero.id],
        unlocked: Boolean(value.unlocked || roster[hero.id].unlocked),
        level: clampInt(value.level, 1, 1, 20),
        marks: clampInt(value.marks, 0, 0, 9999),
        equipment: normalizeHeroEquipment(value.equipment),
      };
    }
  }
  const partySource = Array.isArray(source.party) ? source.party : base.party;
  const unique = new Set<HeroId>();
  const party = base.party.map((fallback, index) => {
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
    gold: clampInt(source.gold, 0, 0, 999_999_999),
    gems: clampInt(source.gems, 300, 0, 999_999),
    summonCount: clampInt(source.summonCount, 0, 0, 9999),
    roster,
    party,
    inventory,
    overflow,
    shop:
      source.shop && typeof source.shop === "object"
        ? {
            dateKey: typeof source.shop.dateKey === "string" ? source.shop.dateKey : base.shop.dateKey,
            freeRefreshUsed: Boolean(source.shop.freeRefreshUsed),
            offers: shopOffers.length ? shopOffers : Array.isArray(source.shop.offers) ? source.shop.offers.slice(0, 4) : [],
          }
        : base.shop,
    tutorialCompleted: Boolean(source.tutorialCompleted),
    settings: {
      battleSpeed: source.settings?.battleSpeed === 2 ? 2 : 1,
      soundEnabled: source.settings?.soundEnabled !== false,
      reducedMotion: Boolean(source.settings?.reducedMotion),
    },
  };
}
