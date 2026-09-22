import type { AbilityId } from "../content/abilities";
import type { HeroSkillId } from "../content/heroSkills";
import type { TalentId } from "../content/talents";
import type { AffixId } from "../content/affixes";
import type { DungeonId } from "../content/dungeons";
import type { GemMaterialId } from "../content/materials";
import type { InventoryItem } from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";
import type { SetId } from "../content/sets";
import type { GameDifficulty } from "../content/difficulties";
import type { ClassId } from "../content/specializations";
import type { EquipmentChestTier } from "../progression/LootChestSystem";

export type AppTab = "inventory" | "shop" | "heroes" | "stages" | "alchemy";

export type GameAction =
  | { type: "vip:claim"; period: import("../content/recurringTasks").TaskPeriod }
  | { type: "ads:result"; placement: import("./RewardedAds").AdPlacement; result: import("./RewardedAds").RewardedAdResult; ticket?: boolean }
  | { type: "tasks:sync" }
  | { type: "tasks:claim"; period: import("../content/recurringTasks").TaskPeriod; taskId: string }
  | { type: "tasks:milestone"; period: import("../content/recurringTasks").TaskPeriod; points: number }
  | { type: "checkIn:claim" }
  | { type: "rewardBox:open"; boxId: import("../content/checkIn").RewardBoxId }
  | { type: "ui:selectTab"; tab: AppTab }
  | { type: "battle:setSpeed"; speed: 1 | 1.5 | 2 }
  | { type: "session:touch"; now: number }
  | { type: "party:commit"; party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null] }
  | { type: "hero:levelUp"; heroId: HeroId }
  | { type: "hero:starUp"; heroId: HeroId }
  | { type: "hero:ascend"; heroId: HeroId }
  | { type: "hero:talentUp"; heroId: HeroId; talentId: TalentId }
  | { type: "hero:talentReset"; heroId: HeroId }
  | { type: "hero:chooseSkill"; heroId: HeroId; skillId: HeroSkillId }
  | { type: "hero:setAugmentationTarget"; heroId: HeroId; targetHeroId: HeroId | null }
  | { type: "item:equip"; heroId: HeroId; itemId: string }
  | { type: "item:autoEquip"; heroId: HeroId }
  | { type: "item:unequip"; heroId: HeroId; itemId: string }
  | { type: "item:salvage"; itemId: string }
  | { type: "item:salvageMany"; itemIds: string[] }
  | { type: "item:returnGems"; itemId: string }
  | { type: "item:organize" }
  | { type: "item:add"; item: InventoryItem }
  | { type: "alchemy:craft"; itemIds: string[] }
  | { type: "craft:imprint"; itemId: string; setId: SetId }
  | { type: "craft:socket"; itemId: string }
  | { type: "craft:reset"; itemId: string; affixIndex: number }
  | { type: "craft:smelt"; itemId: string; affixId: AffixId }
  | { type: "craft:inlay"; itemId: string; socketIndex: number; gemId: GemMaterialId }
  | { type: "craft:removeGem"; itemId: string; socketIndex: number }
  | { type: "craft:fuseGemRank"; gemId: GemMaterialId }
  | { type: "craft:fuseAllGems" }
  | { type: "stage:select"; stage: number; difficulty?: GameDifficulty }
  | { type: "stage:victory"; stage: number; gold: number; exp: number; items: InventoryItem[] }
  | { type: "stageGift:claim"; stage: number }
  | { type: "dungeon:dispatch"; dungeonId: DungeonId; heroIds: HeroId[] }
  | { type: "dungeon:claim"; dungeonId: DungeonId }
  | { type: "dungeon:recall"; dungeonId: DungeonId }
  | { type: "shop:buy"; offerId: string }
  | { type: "shop:refresh" }
  | { type: "shop:claimAdRefreshes" }
  | { type: "shop:sync"; now: number }
  | { type: "ability:upgrade"; abilityId: AbilityId }
  | { type: "lootChest:open"; now: number }
  | { type: "debug:grantLootChests"; tiers: EquipmentChestTier[] }
  | { type: "debug:addCurrency"; gold?: number; gems?: number }
  | { type: "summon:single" }
  | { type: "summon:five" }
  | { type: "summon:selectTheme"; classId: ClassId; now: number }
  | { type: "summon:resetTheme" }
  | { type: "offline:claim"; gold: number; exp: number; items: InventoryItem[] }
  | { type: "settings:update"; patch: Partial<{ battleSpeed: 1 | 1.5 | 2; soundEnabled: boolean; reducedMotion: boolean }> }
  | { type: "tutorial:complete" };
