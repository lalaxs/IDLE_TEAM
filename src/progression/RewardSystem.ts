import { ENEMY_BY_ID } from "../content/enemies";
import { enemyHpMultiplier } from "../content/balance";
import { idleExperiencePerHour, referenceEncounter } from "../content/numericalModel";
import {
  DIFFICULTY_BY_ID,
  difficultyPowerStage,
  difficultyRank,
  type DifficultyDefinition,
  type GameDifficulty,
} from "../content/difficulties";
import type { InventoryItem } from "./EquipmentSystem";
import { createNaturalEquipment, type NaturalDropSource } from "./EquipmentDropSystem";
import { selectEquipmentDefinition } from "./EquipmentPool";
import { SeededRandom } from "../simulation/RandomSource";
import {
  createEncounterDefinitions,
  TRASH_ENCOUNTERS_BEFORE_BOSS,
} from "../simulation/WaveSystem";
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

export type RewardEnemyKind = "normal" | "elite" | "boss";

export interface EnemyRewardDrop {
  gold: number;
  exp: number;
  item: InventoryItem | null;
}

/**
 * Rolls one reward at the moment each authored enemy dies, while preserving the
 * existing stage-wide economy bonuses for final settlement.
 */
export class StageRewardTracker {
  private readonly difficultyDefinition: DifficultyDefinition;
  private readonly random: SeededRandom;
  private readonly normalGold: number;
  private readonly normalExp: number;
  private readonly normalEquipmentChance: number;
  private readonly localStage: number;
  private gold = 0;
  private exp = 0;
  private readonly items: InventoryItem[] = [];

  constructor(
    private readonly stage: number,
    seed: number,
    private readonly difficulty: GameDifficulty = "easy",
    private readonly firstClear = false,
  ) {
    this.difficultyDefinition = DIFFICULTY_BY_ID[difficulty];
    const powerStage = difficultyPowerStage(stage, difficulty);
    const power = enemyHpMultiplier(powerStage);
    this.random = new SeededRandom(seed + stage * 7_919 + difficultyRank(difficulty) * 104_729);
    this.normalGold = Math.round(5 * power ** 0.45);
    const kinds = stageEnemyKinds(stage, seed);
    const reference = referenceEncounter(stage, difficulty);
    const totalWeight = kinds.reduce((sum, kind) => sum + (kind === "boss" ? 16 : kind === "elite" ? 5 : 1), 0);
    this.normalExp = idleExperiencePerHour(reference.level) * 2
      * (5 * reference.waveSeconds + reference.bossSeconds) / 3600 / totalWeight;
    const normalCount = kinds.filter((kind) => kind === "normal").length;
    this.normalEquipmentChance = Math.min(0.03, 0.3 / Math.max(1, normalCount));
    this.localStage = ((Math.max(1, stage) - 1) % 12) + 1;
  }

  rollEnemy(kind: RewardEnemyKind, goldChance: number, equipmentBonus = 0): EnemyRewardDrop {
    const rewardMultiplier = kind === "boss" ? 16 : kind === "elite" ? 5 : 1;
    const exp = this.normalExp * rewardMultiplier;
    this.exp += exp;

    const gold = this.random.next() < goldChance
      ? this.normalGold * (kind === "boss" ? 12 : kind === "elite" ? 5 : 1)
      : 0;
    this.gold += gold;

    const chapterBoss = kind === "boss" && this.localStage === 12;
    const equipmentMultiplier = this.difficultyDefinition.equipmentDropMultiplier * (1 + equipmentBonus);
    const shouldDrop = chapterBoss || (
      kind === "boss"
        ? this.random.next() < Math.min(1, 0.35 * equipmentMultiplier)
        : kind === "elite"
          ? this.random.next() < Math.min(1, 0.2 * equipmentMultiplier)
          : this.random.next() < Math.min(1, this.normalEquipmentChance * equipmentMultiplier)
    );
    if (!shouldDrop) return { gold, exp, item: null };

    const definition = selectEquipmentDefinition(this.stage, this.random);
    const source: NaturalDropSource = chapterBoss
      ? "chapter_boss"
      : kind === "boss"
        ? "boss"
        : kind;
    const item = createNaturalEquipment(
      definition.id,
      this.stage,
      this.difficulty,
      source,
      this.random,
      {
        guaranteeGreater: chapterBoss && this.difficulty === "torment" && this.firstClear,
      },
    );
    this.items.push(item);
    return { gold, exp, item };
  }

  settle(abilities?: AbilityLevels): StageRewards {
    let gold = this.gold;
    let exp = this.exp;
    if (abilities) {
      if (gold > 0) gold = applyGoldAbilityBonus(gold, abilities);
      exp = applyExpAbilityBonus(exp, abilities);
    }
    gold = Math.round(gold * this.difficultyDefinition.currencyMultiplier);
    exp = Math.round(exp);
    return { gold, exp, items: [...this.items] };
  }
}

function stageEnemyKinds(stage: number, seed: number): RewardEnemyKind[] {
  return [
    ...Array.from({ length: TRASH_ENCOUNTERS_BEFORE_BOSS }, (_, index) =>
      createEncounterDefinitions(stage, index + 1, seed, false),
    ),
    createEncounterDefinitions(stage, TRASH_ENCOUNTERS_BEFORE_BOSS + 1, seed, true),
  ].flatMap((encounter) => encounter.map(({ enemyId }) => ENEMY_BY_ID[enemyId].kind));
}

export function generateStageRewards(
  stage: number,
  seed: number,
  abilities?: AbilityLevels,
  difficulty: GameDifficulty = "easy",
  firstClear = false,
): StageRewards {
  const goldChance = getGoldDropChance(abilities);
  const tracker = new StageRewardTracker(stage, seed, difficulty, firstClear);
  for (const kind of stageEnemyKinds(stage, seed)) tracker.rollEnemy(kind, goldChance);
  return tracker.settle(abilities);
}
