import { createEmptyEquipment, EQUIPMENT_SLOTS, type EquipmentSlot } from "../content/items";
import { normalizeRecurringTasks } from "../domain/activities/RecurringTaskState";
import { normalizeAdVip } from "../domain/activities/AdVipState";
import { normalizeProgressionDaily } from "../progression/ProgressionDaily";
import { getAdVipBenefits } from "../content/adVip";
import { getDateKey } from "../domain/time/GameDay";
import {
  SAVE_VERSION,
  type DungeonRun,
  type HeroProgress,
  type SaveDataV1,
  type ShopOfferState,
} from "../domain/save/SaveData";
import { HERO_DEFINITIONS, STARTER_HERO_IDS } from "../content/heroes";
import {
  createDefaultAbilityLevels,
  normalizeAbilityLevels,
} from "../progression/AbilitySystem";
import {
  createEmptyTalentRanks,
  normalizeChosenSkillId,
  normalizeTalentRanks,
} from "../progression/TalentSystem";
import {
  createDefaultLootChest,
  normalizeLootChest,
} from "../progression/LootChestSystem";
import {
  createStarterMaterials,
  isMaterialId,
  normalizeMaterials,
} from "../content/materials";
import { isDungeonId, DUNGEON_BY_ID, type DungeonId } from "../content/dungeons";
import {
  INVENTORY_STORAGE_LIMIT,
  canHeroEquipItem,
  normalizeInventoryItem,
  type InventoryItem,
} from "../progression/EquipmentSystem";
import {
  createDefaultAlchemyStation,
  normalizeAlchemyStation,
} from "../progression/AlchemySystem";
import type { HeroId } from "../simulation/types";
import { MAX_HERO_STARS } from "../progression/HeroProgression";
import { GEM_OFFER_AMOUNT, SHOP_SIZE, getShopRefreshKey } from "../content/shop";
import { getUnlockedPartySlotCount } from "../progression/PartySystem";
import {
  createEmptySetEssences,
  isSetId,
  normalizeSetEssences,
} from "../content/sets";
import {
  createDefaultDifficultyProgress,
  isDifficultyUnlocked,
  isGameDifficulty,
  GAME_DIFFICULTY_IDS,
  type DifficultyProgressMap,
  type GameDifficulty,
} from "../content/difficulties";
import {
  isSummonClassId,
  type PersonalSummonTheme,
} from "../progression/SummonSystem";

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

function normalizeItemList(raw: unknown, limit: number, seenIds: Set<string>): InventoryItem[] {
  if (!Array.isArray(raw)) return [];
  const result: InventoryItem[] = [];
  for (const entry of raw) {
    if (result.length >= limit) break;
    const item = normalizeInventoryItem(entry);
    if (!item || seenIds.has(item.instanceId)) continue;
    seenIds.add(item.instanceId);
    result.push(item);
  }
  return result;
}

export { SAVE_VERSION, getDateKey };
export type { DungeonRun, HeroProgress, SaveDataV1, ShopOfferState };

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, numeric));
};

function normalizeDifficultyProgress(
  raw: unknown,
  legacyHighestUnlockedStage: number,
  legacyHighestClearedStage: number,
): DifficultyProgressMap {
  const progress = createDefaultDifficultyProgress();
  const source = raw && typeof raw === "object"
    ? raw as Partial<Record<GameDifficulty, { highestUnlockedStage?: unknown; highestClearedStage?: unknown }>>
    : {};
  for (const difficulty of GAME_DIFFICULTY_IDS) {
    const entry = source[difficulty];
    if (!entry || typeof entry !== "object") continue;
    const highestClearedStage = clampInt(entry.highestClearedStage, 0, 0, 120);
    progress[difficulty] = {
      highestClearedStage,
      highestUnlockedStage: Math.max(
        Math.min(120, highestClearedStage + 1),
        clampInt(entry.highestUnlockedStage, 1, 1, 120),
      ),
    };
  }
  progress.easy.highestClearedStage = Math.max(
    progress.easy.highestClearedStage,
    legacyHighestClearedStage,
  );
  progress.easy.highestUnlockedStage = Math.max(
    progress.easy.highestUnlockedStage,
    legacyHighestUnlockedStage,
    Math.min(120, progress.easy.highestClearedStage + 1),
  );
  return progress;
}

export function createDefaultSave(now = Date.now()): SaveDataV1 {
  const starterHeroes = new Set<HeroId>(STARTER_HERO_IDS);
  const roster = Object.fromEntries(
    HERO_DEFINITIONS.map(({ id }) => {
      const ascendLevel = 0;
      return [
        id,
        {
          heroId: id,
          unlocked: starterHeroes.has(id),
          level: 1,
          experience: 0,
          marks: 0,
          stars: 0,
          ascendLevel,
          talentRanks: createEmptyTalentRanks(),
          chosenSkillId: null,
          augmentationTargetId: null,
          equipment: createEmptyEquipment(),
        },
      ];
    }),
  ) as Record<HeroId, HeroProgress>;

  return {
    version: SAVE_VERSION,
    updatedAt: now,
    lastActiveAt: now,
    currentStage: 1,
    selectedDifficulty: "easy",
    difficultyProgress: createDefaultDifficultyProgress(),
    highestUnlockedStage: 1,
    highestClearedStage: 0,
    claimedStageGiftStages: [],
    checkIn: { claimedDays: 0, lastClaimDate: "" },
    rewardBoxes: { gem_box: 0, material_box: 0 },
    adTickets: 0,
    adVip: normalizeAdVip(undefined, now),
    recurringTasks: normalizeRecurringTasks(null, now),
    dungeonRuns: [],
    gold: 0,
    exp: 120,
    gems: 300,
    summonCount: 0,
    universalHeroMarks: 0,
    summonThemeMisses: 0,
    personalSummonTheme: null,
    roster,
    party: [STARTER_HERO_IDS[0], null, null, null, null],
    inventory: [],
    overflow: [],
    materials: createStarterMaterials(),
    setEssences: createEmptySetEssences(),
    alchemyStation: createDefaultAlchemyStation(),
    shop: {
      dateKey: getDateKey(new Date(now)),
      refreshKey: getShopRefreshKey(new Date(now)),
      refreshSequence: 0,
      goldRefreshesUsed: 0,
      adRefreshesClaimed: false,
      adRefreshesUsed: 0,
      offers: [],
    },
    abilities: createDefaultAbilityLevels(),
    lootChest: createDefaultLootChest(now),
    progressionDaily: normalizeProgressionDaily(undefined, now),
    tutorialCompleted: false,
    settings: {
      battleSpeed: 1,
      soundEnabled: true,
      reducedMotion:
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
  };
}

function repairEquipmentReferences(
  roster: Record<HeroId, HeroProgress>,
  inventory: readonly InventoryItem[],
): void {
  const itemById = new Map(inventory.map((item) => [item.instanceId, item]));
  const equippedIds = new Set<string>();
  for (const hero of HERO_DEFINITIONS) {
    const progress = roster[hero.id];
    const equipment = createEmptyEquipment();
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = progress.equipment[slot];
      const item = itemId ? itemById.get(itemId) : undefined;
      if (
        !item ||
        item.slot !== slot ||
        equippedIds.has(item.instanceId) ||
        !canHeroEquipItem(progress.level, item)
      ) continue;
      equipment[slot] = item.instanceId;
      equippedIds.add(item.instanceId);
    }
    roster[hero.id] = { ...progress, equipment };
  }
}

function normalizeParty(
  raw: unknown,
  roster: Record<HeroId, HeroProgress>,
  fallback: SaveDataV1["party"],
): SaveDataV1["party"] {
  const source = Array.isArray(raw) ? raw : fallback;
  const used = new Set<HeroId>();
  const party = fallback.map((_, index) => {
    const candidate = source[index];
    if (candidate === null) return null;
    if (
      typeof candidate === "string" &&
      Object.prototype.hasOwnProperty.call(roster, candidate) &&
      roster[candidate as HeroId].unlocked &&
      !used.has(candidate as HeroId)
    ) {
      used.add(candidate as HeroId);
      return candidate as HeroId;
    }
    return null;
  }) as SaveDataV1["party"];

  if (party.some((heroId) => heroId !== null)) return party;
  const firstAvailableId =
    STARTER_HERO_IDS.find((heroId) => roster[heroId].unlocked)
    ?? HERO_DEFINITIONS.find(({ id }) => roster[id].unlocked)?.id;
  if (firstAvailableId) party[0] = firstAvailableId;
  return party;
}

function applyPartySlotUnlocks(
  party: SaveDataV1["party"],
  highestClearedStage: number,
): SaveDataV1["party"] {
  const unlockedSlots = getUnlockedPartySlotCount(highestClearedStage);
  if (unlockedSlots === party.length) return party;
  const firstHero = party.find((heroId): heroId is HeroId => heroId !== null) ?? null;
  return party.map((heroId, index) => (index === 0 ? firstHero : index < unlockedSlots ? heroId : null)) as SaveDataV1["party"];
}

function normalizeShopOffers(raw: unknown): ShopOfferState[] {
  if (!Array.isArray(raw)) return [];
  const offers: ShopOfferState[] = [];
  const offerIds = new Set<string>();
  for (const entry of raw.slice(0, SHOP_SIZE)) {
    if (!entry || typeof entry !== "object") return [];
    const source = entry as Record<string, unknown>;
    if (
      typeof source.offerId !== "string" ||
      source.offerId.length === 0 ||
      offerIds.has(source.offerId) ||
      typeof source.priceGold !== "number" ||
      !Number.isFinite(source.priceGold) ||
      source.priceGold < 0
    ) {
      return [];
    }
    const priceGold = Math.round(source.priceGold);
    offerIds.add(source.offerId);
    if (source.kind === "equipment") {
      const item = normalizeInventoryItem(source.item);
      if (!item) return [];
      offers.push({
        offerId: source.offerId,
        kind: "equipment",
        item,
        priceGold,
        sold: source.sold === true,
      });
    } else if (source.kind === "gems" && source.gemAmount === GEM_OFFER_AMOUNT) {
      offers.push({
        offerId: source.offerId,
        kind: "gems",
        gemAmount: GEM_OFFER_AMOUNT,
        priceGold,
        sold: source.sold === true,
      });
    } else if (
      source.kind === "material" &&
      typeof source.materialId === "string" &&
      isMaterialId(source.materialId) &&
      typeof source.amount === "number" &&
      Number.isFinite(source.amount) &&
      source.amount > 0
    ) {
      offers.push({
        offerId: source.offerId,
        kind: "material",
        materialId: source.materialId,
        amount: Math.min(99, Math.max(1, Math.round(source.amount))),
        priceGold,
        sold: source.sold === true,
      });
    } else if (
      source.kind === "setEssence" &&
      isSetId(source.setId) &&
      typeof source.amount === "number" &&
      Number.isFinite(source.amount) &&
      source.amount > 0
    ) {
      offers.push({
        offerId: source.offerId,
        kind: "setEssence",
        setId: source.setId,
        amount: Math.min(99, Math.max(1, Math.round(source.amount))),
        priceGold,
        sold: source.sold === true,
      });
    } else {
      return [];
    }
  }
  return offers;
}

export function repairSaveData(input: unknown, now = Date.now()): SaveDataV1 {
  const base = createDefaultSave(now);
  if (!input || typeof input !== "object") return base;
  const source = input as Partial<SaveDataV1>;
  if (source.version !== SAVE_VERSION) return base;
  const highestClearedStage = clampInt(source.highestClearedStage, 0, 0, 120);
  const legacyCurrentStage = clampInt(source.currentStage, 1, 1, 120);
  const highestUnlockedStage = Math.max(
    legacyCurrentStage,
    clampInt(source.highestUnlockedStage, 1, 1, 120),
  );
  const difficultyProgress = normalizeDifficultyProgress(
    (source as { difficultyProgress?: unknown }).difficultyProgress,
    highestUnlockedStage,
    highestClearedStage,
  );
  const requestedDifficulty = isGameDifficulty(source.selectedDifficulty)
    ? source.selectedDifficulty
    : "easy";
  const selectedDifficulty = isDifficultyUnlocked(requestedDifficulty, difficultyProgress)
    ? requestedDifficulty
    : "easy";
  const itemIds = new Set<string>();
  const inventory = normalizeItemList(source.inventory, INVENTORY_STORAGE_LIMIT, itemIds);
  const overflow = normalizeItemList(source.overflow, 10, itemIds);

  const roster = { ...base.roster };
  if (source.roster && typeof source.roster === "object") {
    for (const hero of HERO_DEFINITIONS) {
      const value = source.roster[hero.id];
      if (!value || typeof value !== "object") continue;
      const level = clampInt(value.level, 1, 1, 100);
      roster[hero.id] = {
        ...roster[hero.id],
        unlocked: Boolean(value.unlocked || roster[hero.id].unlocked),
        level,
        experience: clampInt(
          (value as { experience?: unknown }).experience,
          0,
          0,
          999_999_999,
        ),
        marks: clampInt(value.marks, 0, 0, 9999),
        stars: clampInt((value as { stars?: unknown }).stars, 0, 0, MAX_HERO_STARS),
        ascendLevel: normalizeAscendLevel(value),
        talentRanks: normalizeTalentRanks((value as { talentRanks?: unknown }).talentRanks),
        chosenSkillId: normalizeChosenSkillId((value as { chosenSkillId?: unknown }).chosenSkillId),
        augmentationTargetId: hero.specId === "evoker_augmentation"
          && value.augmentationTargetId !== hero.id
          && HERO_DEFINITIONS.some((candidate) => candidate.id === value.augmentationTargetId)
          ? value.augmentationTargetId ?? null : null,
        equipment: normalizeHeroEquipment(value.equipment),
      };
    }
  }
  repairEquipmentReferences(roster, inventory);
  const rawParty = applyPartySlotUnlocks(
    normalizeParty(source.party, roster, base.party),
    highestClearedStage,
  );

  const dungeonRuns = normalizeDungeonRuns((source as { dungeonRuns?: unknown }).dungeonRuns, roster, now);
  const busyHeroes = new Set(dungeonRuns.flatMap((run) => run.heroIds));
  const party = stripBusyHeroesFromParty(rawParty, busyHeroes, roster);

  const shopOffers = normalizeShopOffers(source.shop?.offers);
  const rawClaimedStageGiftStages = (source as { claimedStageGiftStages?: unknown }).claimedStageGiftStages;
  const claimedStageGiftStages = Array.isArray(rawClaimedStageGiftStages)
    ? [...new Set(rawClaimedStageGiftStages
      .map((stage) => clampInt(stage, 0, 0, highestClearedStage))
      .filter((stage) => stage > 0))]
      .sort((left, right) => left - right)
    : Array.from({ length: highestClearedStage }, (_, index) => index + 1);
  const rawPersonalTheme = (source as { personalSummonTheme?: unknown }).personalSummonTheme;
  const personalSummonTheme = rawPersonalTheme && typeof rawPersonalTheme === "object"
    && isSummonClassId((rawPersonalTheme as { classId?: unknown }).classId)
    && typeof (rawPersonalTheme as { expiresAt?: unknown }).expiresAt === "number"
    && Number.isFinite((rawPersonalTheme as { expiresAt: number }).expiresAt)
    && (rawPersonalTheme as { expiresAt: number }).expiresAt > now
      ? {
          classId: (rawPersonalTheme as { classId: PersonalSummonTheme["classId"] }).classId,
          expiresAt: Math.round((rawPersonalTheme as { expiresAt: number }).expiresAt),
        }
      : null;

  return {
    ...base,
    updatedAt: clampInt(source.updatedAt, now, 0, Number.MAX_SAFE_INTEGER),
    lastActiveAt:
      typeof source.lastActiveAt === "number" &&
      Number.isFinite(source.lastActiveAt) &&
      source.lastActiveAt >= 0 &&
      source.lastActiveAt <= now
        ? Math.round(source.lastActiveAt)
        : now,
    currentStage: clampInt(
      source.currentStage,
      1,
      1,
      difficultyProgress[selectedDifficulty].highestUnlockedStage,
    ),
    selectedDifficulty,
    difficultyProgress,
    highestUnlockedStage,
    highestClearedStage,
    claimedStageGiftStages,
    checkIn: {
      claimedDays: clampInt(source.checkIn?.claimedDays, 0, 0, 999_999),
      lastClaimDate: typeof source.checkIn?.lastClaimDate === "string"
        && /^\d{4}-\d{2}-\d{2}$/.test(source.checkIn.lastClaimDate) ? source.checkIn.lastClaimDate : "",
    },
    rewardBoxes: {
      gem_box: clampInt(source.rewardBoxes?.gem_box, 0, 0, 999_999),
      material_box: clampInt(source.rewardBoxes?.material_box, 0, 0, 999_999),
    },
    adTickets: clampInt(source.adTickets, 0, 0, 999_999),
    adVip: normalizeAdVip(source.adVip, now),
    recurringTasks: normalizeRecurringTasks(source.recurringTasks, now),
    dungeonRuns,
    gold: clampInt(source.gold, 0, 0, 999_999_999),
    exp: clampInt((source as { exp?: unknown }).exp, 120, 0, 999_999_999),
    gems: clampInt(source.gems, 300, 0, 999_999),
    summonCount: clampInt(source.summonCount, 0, 0, 9999),
    universalHeroMarks: clampInt(
      (source as { universalHeroMarks?: unknown }).universalHeroMarks,
      0,
      0,
      9999,
    ),
    summonThemeMisses: clampInt(
      (source as { summonThemeMisses?: unknown }).summonThemeMisses,
      0,
      0,
      9,
    ),
    personalSummonTheme,
    roster,
    party,
    inventory,
    overflow,
    materials: normalizeMaterials((source as { materials?: unknown }).materials),
    setEssences: normalizeSetEssences((source as { setEssences?: unknown }).setEssences),
    alchemyStation: normalizeAlchemyStation(
      (source as { alchemyStation?: unknown }).alchemyStation,
    ),
    shop:
      source.shop && typeof source.shop === "object"
        ? {
            dateKey: typeof source.shop.dateKey === "string" ? source.shop.dateKey : base.shop.dateKey,
            refreshKey: typeof source.shop.refreshKey === "string" ? source.shop.refreshKey : "",
            refreshSequence: clampInt(source.shop.refreshSequence, 0, 0, 99),
            goldRefreshesUsed: clampInt(source.shop.goldRefreshesUsed, 0, 0, 2),
            adRefreshesClaimed: Boolean(source.shop.adRefreshesClaimed),
            adRefreshesUsed: clampInt(source.shop.adRefreshesUsed, 0, 0, 2),
            offers: shopOffers,
          }
        : base.shop,
    abilities: normalizeAbilityLevels(source.abilities),
    lootChest: normalizeLootChest(source.lootChest, now),
    progressionDaily: normalizeProgressionDaily(source.progressionDaily, now),
    tutorialCompleted: Boolean(source.tutorialCompleted),
    settings: {
      battleSpeed: source.settings?.battleSpeed === 2 && getAdVipBenefits(source.adVip?.watchedAds ?? 0).speed === 2 ? 2
        : source.settings?.battleSpeed === 1.5 && getAdVipBenefits(source.adVip?.watchedAds ?? 0).speed >= 1.5 ? 1.5 : 1,
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
    const fallbackStamina = heroIds.reduce((total, id) => {
      const progress = roster[id];
      return total + 80 + progress.level * 4 + progress.stars * 15 + progress.ascendLevel * 25;
    }, 0);
    const maxStamina = clampInt(source.maxStamina, fallbackStamina, 1, 1_000_000);
    usedDungeons.add(source.dungeonId);
    for (const id of heroIds) usedHeroes.add(id);
    runs.push({ dungeonId: source.dungeonId, heroIds, startedAt, maxStamina });
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
