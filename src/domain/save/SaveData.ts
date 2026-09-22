import type { EquipmentSlot } from "../../content/items";
import type { HeroSkillId } from "../../content/heroSkills";
import type { MaterialId } from "../../content/materials";
import type { DungeonId } from "../../content/dungeons";
import type { SetEssenceInventory, SetId } from "../../content/sets";
import type { DifficultyProgressMap, GameDifficulty } from "../../content/difficulties";
import type { AbilityLevels } from "../../progression/AbilitySystem";
import type { TalentRanks } from "../../progression/TalentSystem";
import type { LootChestState } from "../../progression/LootChestSystem";
import type { InventoryItem } from "../../progression/EquipmentSystem";
import type { AlchemyStationState } from "../../progression/AlchemySystem";
import type { PersonalSummonTheme } from "../../progression/SummonSystem";
import type { HeroId } from "../../simulation/types";
import type { RecurringTaskState } from "../activities/RecurringTaskState";
import type { AdVipState } from "../activities/AdVipState";
import type { BattleSpeed } from "../../content/adVip";
import type { ProgressionDaily } from "../../progression/ProgressionDaily";

export const SAVE_VERSION = 1 as const;

export interface HeroProgress {
  heroId: HeroId;
  unlocked: boolean;
  level: number;
  experience: number;
  marks: number;
  stars: number;
  ascendLevel: number;
  talentRanks: TalentRanks;
  chosenSkillId: HeroSkillId | null;
  augmentationTargetId?: HeroId | null;
  equipment: Record<EquipmentSlot, string | null>;
}

export type ShopOfferState =
  | { offerId: string; kind: "equipment"; item: InventoryItem; priceGold: number; sold: boolean }
  | { offerId: string; kind: "gems"; gemAmount: 50; priceGold: number; sold: boolean }
  | { offerId: string; kind: "material"; materialId: MaterialId; amount: number; priceGold: number; sold: boolean }
  | { offerId: string; kind: "setEssence"; setId: SetId; amount: number; priceGold: number; sold: boolean };

export interface DungeonRun {
  dungeonId: DungeonId;
  heroIds: HeroId[];
  startedAt: number;
  maxStamina: number;
}

export interface SaveDataV1 {
  version: typeof SAVE_VERSION;
  updatedAt: number;
  lastActiveAt: number;
  currentStage: number;
  selectedDifficulty: GameDifficulty;
  difficultyProgress: DifficultyProgressMap;
  highestUnlockedStage: number;
  highestClearedStage: number;
  claimedStageGiftStages: number[];
  checkIn: { claimedDays: number; lastClaimDate: string };
  rewardBoxes: { gem_box: number; material_box: number };
  adTickets: number;
  adVip: AdVipState;
  recurringTasks: RecurringTaskState;
  dungeonRuns: DungeonRun[];
  gold: number;
  exp: number;
  gems: number;
  summonCount: number;
  universalHeroMarks: number;
  summonThemeMisses: number;
  personalSummonTheme: PersonalSummonTheme | null;
  roster: Record<HeroId, HeroProgress>;
  party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null];
  inventory: InventoryItem[];
  overflow: InventoryItem[];
  materials: Record<MaterialId, number>;
  setEssences: SetEssenceInventory;
  alchemyStation: AlchemyStationState;
  shop: {
    dateKey: string;
    refreshKey: string;
    refreshSequence: number;
    goldRefreshesUsed: number;
    adRefreshesClaimed: boolean;
    adRefreshesUsed: number;
    offers: ShopOfferState[];
  };
  abilities: AbilityLevels;
  lootChest: LootChestState;
  progressionDaily: ProgressionDaily;
  tutorialCompleted: boolean;
  settings: {
    battleSpeed: BattleSpeed;
    soundEnabled: boolean;
    reducedMotion: boolean;
  };
}
