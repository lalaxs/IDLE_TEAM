import { createEquipment, chooseRarity, type InventoryItem } from "./EquipmentSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom } from "../simulation/RandomSource";
import {
  applyOfflineExpAbilityBonus,
  applyOfflineGoldAbilityBonus,
  type AbilityLevels,
} from "./AbilitySystem";

export interface OfflineReward {
  minutes: number;
  gold: number;
  exp: number;
  gearCount: number;
}

export function calculateOfflineReward(
  elapsedMs: number,
  highestStage: number,
  seed: number,
  abilities?: AbilityLevels,
): OfflineReward {
  const rawMinutes = Math.floor(elapsedMs / 60_000);
  if (rawMinutes < 5 || highestStage < 3) {
    return { minutes: 0, gold: 0, exp: 0, gearCount: 0 };
  }
  const minutes = Math.min(480, rawMinutes);
  const baseGold = (20 + highestStage * 12) * minutes;
  const gold = abilities ? applyOfflineGoldAbilityBonus(baseGold, abilities) : baseGold;
  const baseExp = (8 + highestStage * 4) * minutes;
  const exp = abilities ? applyOfflineExpAbilityBonus(baseExp, abilities) : baseExp;
  const expectedGear = (minutes / 60) * Math.min(3, 0.8 + highestStage * 0.12);
  const floor = Math.floor(expectedGear);
  const fraction = expectedGear - floor;
  const pseudo = ((seed * 9301 + 49297) % 233280) / 233280;
  return { minutes, gold, exp, gearCount: floor + (pseudo < fraction ? 1 : 0) };
}

export function createOfflineEquipment(
  gearCount: number,
  highestUnlockedStage: number,
  seed: number,
): InventoryItem[] {
  const stage = Math.max(1, highestUnlockedStage);
  const random = new SeededRandom(seed);
  return Array.from({ length: gearCount }, () => {
    const definition = selectEquipmentDefinition(stage, random);
    return createEquipment(
      definition.id,
      stage,
      chooseRarity(stage, random),
      random,
    );
  });
}
