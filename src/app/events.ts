import type { AbilityId } from "../content/abilities";
import type { HeroSkillId } from "../content/heroSkills";
import type { TalentId } from "../content/talents";
import type { DungeonId } from "../content/dungeons";
import type { InventoryItem } from "../progression/EquipmentSystem";
import type { HeroId } from "../simulation/types";
import type { MaterialId } from "../content/materials";

export type SummonPullResult =
  | { kind: "unlock"; heroId: HeroId }
  | { kind: "marks"; heroId: HeroId; marks: number };

export type AppEvent =
  | { type: "hero:leveled"; heroId: HeroId; level: number }
  | { type: "hero:starred"; heroId: HeroId; stars: number }
  | { type: "hero:ascended"; heroId: HeroId; level: number }
  | { type: "hero:talentUpgraded"; heroId: HeroId; talentId: TalentId; rank: number }
  | { type: "hero:skillChosen"; heroId: HeroId; skillId: HeroSkillId }
  | { type: "hero:unlocked"; heroId: HeroId }
  | { type: "summon:completed"; results: SummonPullResult[] }
  | { type: "item:equipped"; heroId: HeroId; itemId: string }
  | { type: "item:unequipped"; heroId: HeroId; itemId: string }
  | { type: "item:salvaged"; itemId: string; gold: number }
  | { type: "item:salvagedMany"; count: number; gold: number }
  | { type: "alchemy:crafted"; resultId: string; fromRarity: string; toRarity: string }
  | { type: "craft:socketed"; itemId: string; sockets: number }
  | { type: "craft:reset"; itemId: string }
  | { type: "craft:smelted"; itemId: string; affixId: string; value: number }
  | { type: "craft:inlaid"; itemId: string; gemId: string }
  | { type: "ability:upgraded"; abilityId: AbilityId; level: number }
  | { type: "lootChest:charged"; level: number; progress: number; ready: boolean }
  | { type: "lootChest:leveled"; level: number }
  | {
      type: "lootChest:opened";
      level: number;
      gold: number;
      exp: number;
      items: InventoryItem[];
      lucky: boolean;
    }
  | {
      type: "dungeon:cleared";
      dungeonId: DungeonId;
      materials: Partial<Record<MaterialId, number>>;
    }
  | { type: "toast"; message: string }
  | { type: "save:failed"; message: string };
