import type { AbilityId } from "../content/abilities";
import type { HeroSkillId } from "../content/heroSkills";
import type { TalentId } from "../content/talents";
import type { DungeonId } from "../content/dungeons";
import type { InventoryItem } from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";
import type { GemMaterialId, GemRank, MaterialId } from "../content/materials";
import type { AccountCurrencyId } from "../content/currencies";
import type { SetId } from "../content/sets";

export type SummonPullResult =
  | { kind: "unlock"; heroId: HeroId }
  | { kind: "marks"; heroId: HeroId; marks: 1 }
  | { kind: "universalMarks"; amount: 1 }
  | { kind: "ascendStone"; amount: 1 }
  | { kind: "exp"; amount: number }
  | { kind: "gold"; amount: number };

export type ResourceRewardSource = "battle" | "dungeon" | "loot-chest" | "offline" | "salvage" | "stage-gift" | "check-in" | "tasks" | "vip";

export type AppEvent =
  | { type: "rewardBox:opened"; boxId: import("../content/checkIn").RewardBoxId; materialId: import("../content/materials").MaterialId; amount: number }
  | { type: "hero:leveled"; heroId: HeroId; level: number }
  | { type: "hero:starred"; heroId: HeroId; stars: number }
  | { type: "hero:ascended"; heroId: HeroId; level: number }
  | { type: "hero:talentUpgraded"; heroId: HeroId; talentId: TalentId; rank: number }
  | { type: "hero:talentsReset"; heroId: HeroId }
  | { type: "hero:skillChosen"; heroId: HeroId; skillId: HeroSkillId }
  | { type: "hero:augmentationTargetChanged"; heroId: HeroId; targetHeroId: HeroId | null }
  | { type: "hero:unlocked"; heroId: HeroId }
  | { type: "summon:completed"; results: SummonPullResult[] }
  | {
      type: "resources:earned";
      source: ResourceRewardSource;
      rewards: Partial<Record<AccountCurrencyId, number>>;
    }
  | { type: "item:equipped"; heroId: HeroId; itemId: string; replacedItemId?: string }
  | { type: "item:unequipped"; heroId: HeroId; itemId: string }
  | { type: "item:salvaged"; itemId: string; gold: number; setEssences: Partial<Record<SetId, number>> }
  | { type: "item:salvagedMany"; count: number; gold: number; setEssences: Partial<Record<SetId, number>> }
  | {
      type: "alchemy:crafted";
      resultId: string;
      fromRarity: string;
      toRarity: string;
      miracle: boolean;
      sourceLevel: number;
      resultLevel: number;
      stationExperience: number;
      stationLevelBefore: number;
      stationExperienceBefore: number;
      stationExperienceAfter: number;
      stationLevel: number;
      levelsGained: number;
      greaterAffixEnergy: number;
      greaterAffixCount: number;
      result: InventoryItem;
    }
  | { type: "craft:socketed"; itemId: string; sockets: number }
  | { type: "craft:imprinted"; itemId: string; setId: SetId; essenceCost: number; stoneCost: number }
  | {
      type: "craft:reset";
      itemId: string;
      affixId: string;
      previousValue: number;
      value: number;
    }
  | {
      type: "craft:smelted";
      itemId: string;
      affixId: string;
      value: number;
      previousAffixId: string | null;
      previousValue: number | null;
    }
  | { type: "craft:inlaid"; itemId: string; gemId: string }
  | { type: "craft:gemRemoved"; itemId: string; gemId: string }
  | { type: "craft:gemRankFused"; sourceId: GemMaterialId; resultId: GemMaterialId }
  | { type: "craft:allGemsFused"; crafted: number; families: number; highestRank: GemRank }
  | {
      type: "gems:returned";
      source: "equipment" | "salvage" | "alchemy";
      itemIds: string[];
      count: number;
      gems: Partial<Record<GemMaterialId, number>>;
    }
  | { type: "ability:upgraded"; abilityId: AbilityId; level: number }
  | {
      type: "lootChest:opened";
      minutes: number;
      gold: number;
      exp: number;
      items: InventoryItem[];
    }
  | {
      type: "dungeon:cleared";
      dungeonId: DungeonId;
      materials: Partial<Record<MaterialId, number>>;
    }
  | { type: "toast"; message: string }
  | { type: "save:failed"; message: string };
