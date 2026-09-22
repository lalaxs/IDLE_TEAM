import type { InventoryItem } from "./EquipmentSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom } from "../simulation/RandomSource";
import type { GameDifficulty } from "../content/difficulties";
import { createNaturalEquipment } from "./EquipmentDropSystem";
import { idleExperiencePerHour, referenceLevel } from "../content/numericalModel";
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

export function getStageBaseExpPerMinute(stage: number): number {
  return idleExperiencePerHour(referenceLevel(stage)) / 60;
}

export function calculateOfflineReward(
  elapsedMs: number,
  highestStage: number,
  seed: number,
  abilities?: AbilityLevels,
  capMinutes = 720,
): OfflineReward {
  const rawMinutes = Math.floor(elapsedMs / 60_000);
  if (rawMinutes < 5 || highestStage < 3) {
    return { minutes: 0, gold: 0, exp: 0, gearCount: 0 };
  }
  const minutes = Math.min(capMinutes, rawMinutes);
  const baseGold = (20 + highestStage * 12) * minutes;
  const gold = abilities ? applyOfflineGoldAbilityBonus(baseGold, abilities) : baseGold;
  const baseExp = getStageBaseExpPerMinute(highestStage) * minutes;
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
  difficulty: GameDifficulty = "easy",
): InventoryItem[] {
  const stage = Math.max(1, highestUnlockedStage);
  const random = new SeededRandom(seed);
  return Array.from({ length: gearCount }, () => {
    const definition = selectEquipmentDefinition(stage, random);
    return createNaturalEquipment(
      definition.id,
      stage,
      difficulty,
      "offline",
      random,
    );
  });
}
