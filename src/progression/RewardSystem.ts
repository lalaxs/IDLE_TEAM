import { ENEMY_BY_ID } from "../content/enemies";
import { enemyHpMultiplier } from "../content/balance";
import { createEquipment, chooseRarity, type InventoryItem } from "./EquipmentSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom } from "../simulation/RandomSource";
import { createWaveDefinitions } from "../simulation/WaveSystem";
import {
  applyExpAbilityBonus,
  applyGoldAbilityBonus,
  getGoldDropChance,
  type AbilityLevels,
} from "./AbilitySystem";

export interface StageRewards {
  gold: number;
  exp: number;
  items: InventoryItem[];
}

export function generateStageRewards(stage: number, seed: number, abilities?: AbilityLevels): StageRewards {
  const random = new SeededRandom(seed + stage * 7_919);
  // Gold / exp track HP pressure lightly (DI: denser rewards in harder zones).
  const power = enemyHpMultiplier(stage);
  const normalGold = Math.round(5 * power ** 0.45);
  const normalExp = Math.round(4 * power ** 0.42);
  const goldChance = getGoldDropChance(abilities);
  let gold = 0;
  let exp = 0;
  const items: InventoryItem[] = [];
  for (let wave = 1; wave <= 3; wave += 1) {
    for (const { enemyId } of createWaveDefinitions(stage, wave, seed)) {
      const kind = ENEMY_BY_ID[enemyId].kind;
      // Experience always drops; bosses / elites grant more of the same currency.
      exp += normalExp * (kind === "boss" ? 16 : kind === "elite" ? 5 : 1);
      // Gold is chance-based (base 15%, raised by gold_drop_chance ability).
      if (random.next() < goldChance) {
        gold += normalGold * (kind === "boss" ? 12 : kind === "elite" ? 5 : 1);
      }
      const shouldDrop = kind === "boss" || kind === "elite" || random.next() < 0.18;
      if (shouldDrop) {
        const definition = selectEquipmentDefinition(stage, random);
        items.push(createEquipment(definition.id, stage, chooseRarity(stage, random), random));
      }
      if (kind === "boss" && random.next() < 0.25) {
        const definition = selectEquipmentDefinition(stage, random);
        items.push(createEquipment(definition.id, stage, chooseRarity(stage, random), random));
      }
    }
  }
  if (abilities) {
    if (gold > 0) gold = applyGoldAbilityBonus(gold, abilities);
    exp = applyExpAbilityBonus(exp, abilities);
  }
  return { gold, exp, items };
}
