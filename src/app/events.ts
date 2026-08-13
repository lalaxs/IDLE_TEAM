import type { AbilityId } from "../content/abilities";
import type { HeroId } from "../simulation/types";

export type SummonPullResult =
  | { kind: "unlock"; heroId: HeroId }
  | { kind: "marks"; heroId: HeroId; marks: number };

export type AppEvent =
  | { type: "hero:leveled"; heroId: HeroId; level: number }
  | { type: "hero:starred"; heroId: HeroId; stars: number }
  | { type: "hero:unlocked"; heroId: HeroId }
  | { type: "summon:completed"; results: SummonPullResult[] }
  | { type: "item:equipped"; heroId: HeroId; itemId: string }
  | { type: "item:unequipped"; heroId: HeroId; itemId: string }
  | { type: "item:salvaged"; itemId: string; gold: number }
  | { type: "item:salvagedMany"; count: number; gold: number }
  | { type: "alchemy:crafted"; resultId: string; fromRarity: string; toRarity: string }
  | { type: "ability:upgraded"; abilityId: AbilityId; level: number }
  | { type: "lootChest:charged"; level: number; progress: number }
  | { type: "lootChest:leveled"; level: number; gold: number }
  | { type: "lootChest:rewarded"; level: number; gold: number }
  | { type: "toast"; message: string }
  | { type: "save:failed"; message: string };
