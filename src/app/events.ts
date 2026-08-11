import type { HeroId } from "../simulation/types";

export type AppEvent =
  | { type: "hero:leveled"; heroId: HeroId; level: number }
  | { type: "hero:unlocked"; heroId: HeroId }
  | { type: "item:equipped"; heroId: HeroId; itemId: string }
  | { type: "item:unequipped"; heroId: HeroId; itemId: string }
  | { type: "item:salvaged"; itemId: string; gold: number }
  | { type: "item:salvagedMany"; count: number; gold: number }
  | { type: "alchemy:crafted"; resultId: string; fromRarity: string; toRarity: string }
  | { type: "toast"; message: string }
  | { type: "save:failed"; message: string };
