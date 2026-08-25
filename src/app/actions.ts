import type { AbilityId } from "../content/abilities";
import type { HeroSkillId } from "../content/heroSkills";
import type { TalentId } from "../content/talents";
import type { AffixId } from "../content/affixes";
import type { DungeonId } from "../content/dungeons";
import type { MaterialId } from "../content/materials";
import type { InventoryItem } from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";

export type AppTab = "inventory" | "shop" | "heroes" | "stages" | "alchemy";

export type GameAction =
  | { type: "ui:selectTab"; tab: AppTab }
  | { type: "battle:setSpeed"; speed: 1 | 2 }
  | { type: "party:commit"; party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null] }
  | { type: "hero:levelUp"; heroId: HeroId }
  | { type: "hero:starUp"; heroId: HeroId }
  | { type: "hero:ascend"; heroId: HeroId }
  | { type: "hero:talentUp"; heroId: HeroId; talentId: TalentId }
  | { type: "hero:chooseSkill"; heroId: HeroId; skillId: HeroSkillId }
  | { type: "item:equip"; heroId: HeroId; itemId: string }
  | { type: "item:unequip"; heroId: HeroId; itemId: string }
  | { type: "item:salvage"; itemId: string }
  | { type: "item:salvageMany"; itemIds: string[] }
  | { type: "item:organize" }
  | { type: "item:add"; item: InventoryItem }
  | { type: "alchemy:craft"; itemIds: string[] }
  | { type: "craft:socket"; itemId: string }
  | { type: "craft:reset"; itemId: string; affixIndex: number }
  | { type: "craft:smelt"; itemId: string; affixId: AffixId }
  | { type: "craft:inlay"; itemId: string; socketIndex: number; gemId: MaterialId }
  | { type: "craft:removeGem"; itemId: string; socketIndex: number }
  | { type: "stage:select"; stage: number }
  | { type: "stage:victory"; stage: number; gold: number; exp: number; items: InventoryItem[] }
  | { type: "dungeon:dispatch"; dungeonId: DungeonId; heroIds: HeroId[] }
  | { type: "dungeon:claim"; dungeonId: DungeonId }
  | { type: "shop:buy"; offerId: string }
  | { type: "shop:refresh" }
  | { type: "ability:upgrade"; abilityId: AbilityId }
  | { type: "lootChest:charge"; amount: number }
  | { type: "lootChest:open" }
  | { type: "summon:single" }
  | { type: "summon:five" }
  | { type: "offline:claim"; gold: number; exp: number; items: InventoryItem[] }
  | { type: "settings:update"; patch: Partial<{ battleSpeed: 1 | 2; soundEnabled: boolean; reducedMotion: boolean }> }
  | { type: "tutorial:complete" };
