import type { InventoryItem } from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";

export type AppTab = "inventory" | "shop" | "heroes" | "stages" | "alchemy";

export type GameAction =
  | { type: "ui:selectTab"; tab: AppTab }
  | { type: "battle:setSpeed"; speed: 1 | 2 }
  | { type: "party:commit"; party: [HeroId | null, HeroId | null, HeroId | null, HeroId | null, HeroId | null] }
  | { type: "hero:levelUp"; heroId: HeroId }
  | { type: "item:equip"; heroId: HeroId; itemId: string }
  | { type: "item:unequip"; heroId: HeroId; itemId: string }
  | { type: "item:salvage"; itemId: string }
  | { type: "item:salvageMany"; itemIds: string[] }
  | { type: "item:organize" }
  | { type: "item:add"; item: InventoryItem }
  | { type: "alchemy:craft"; itemIds: string[] }
  | { type: "stage:select"; stage: number }
  | { type: "stage:victory"; stage: number; gold: number; items: InventoryItem[] }
  | { type: "shop:buy"; offerId: string }
  | { type: "shop:refresh" }
  | { type: "summon:single" }
  | { type: "summon:five" }
  | { type: "offline:claim"; gold: number; items: InventoryItem[] }
  | { type: "settings:update"; patch: Partial<{ battleSpeed: 1 | 2; soundEnabled: boolean; reducedMotion: boolean }> }
  | { type: "tutorial:complete" };
