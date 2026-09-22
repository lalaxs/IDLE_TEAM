export const GAME_DIFFICULTY_IDS = [
  "easy",
  "hard",
  "nightmare",
  "hell",
  "torment",
] as const;

export type GameDifficulty = (typeof GAME_DIFFICULTY_IDS)[number];

export interface DifficultyDefinition {
  id: GameDifficulty;
  label: string;
  shortLabel: string;
  unlocksAfter: GameDifficulty | null;
  enemyHpMultiplier: number;
  enemyAttackMultiplier: number;
  enemyDefenseMultiplier: number;
  currencyMultiplier: number;
  equipmentDropMultiplier: number;
  /** Base chance for a natural item to carry one chapter set mark. */
  setMarkChance: number;
  mechanic: string;
}

export const DIFFICULTY_DEFINITIONS: readonly DifficultyDefinition[] = [
  {
    id: "easy",
    label: "简单",
    shortLabel: "简单",
    unlocksAfter: null,
    enemyHpMultiplier: 0.78,
    enemyAttackMultiplier: 0.85,
    enemyDefenseMultiplier: 0.9,
    currencyMultiplier: 0.8,
    equipmentDropMultiplier: 0.75,
    setMarkChance: 0.04,
    mechanic: "敌人更温和，技能机制不变",
  },
  {
    id: "hard",
    label: "困难",
    shortLabel: "困难",
    unlocksAfter: "easy",
    enemyHpMultiplier: 1,
    enemyAttackMultiplier: 1,
    enemyDefenseMultiplier: 1,
    currencyMultiplier: 1,
    equipmentDropMultiplier: 1,
    setMarkChance: 0.06,
    mechanic: "标准数值，完整敌人技能",
  },
  {
    id: "nightmare",
    label: "噩梦",
    shortLabel: "噩梦",
    unlocksAfter: "hard",
    enemyHpMultiplier: 1.35,
    enemyAttackMultiplier: 1.18,
    enemyDefenseMultiplier: 1.12,
    currencyMultiplier: 1.25,
    equipmentDropMultiplier: 1.2,
    setMarkChance: 0.09,
    mechanic: "招牌技后：攻速+10%（3秒）",
  },
  {
    id: "hell",
    label: "地狱",
    shortLabel: "地狱",
    unlocksAfter: "nightmare",
    enemyHpMultiplier: 1.75,
    enemyAttackMultiplier: 1.35,
    enemyDefenseMultiplier: 1.25,
    currencyMultiplier: 1.55,
    equipmentDropMultiplier: 1.45,
    setMarkChance: 0.12,
    mechanic: "噩梦 + 70%生命：15%护盾（1次）",
  },
  {
    id: "torment",
    label: "折磨",
    shortLabel: "折磨",
    unlocksAfter: "hell",
    enemyHpMultiplier: 2.3,
    enemyAttackMultiplier: 1.55,
    enemyDefenseMultiplier: 1.4,
    currencyMultiplier: 1.9,
    equipmentDropMultiplier: 1.75,
    setMarkChance: 0.15,
    mechanic: "地狱 + 每3次招牌技：40%回响",
  },
] as const;

export const DIFFICULTY_BY_ID: Record<GameDifficulty, DifficultyDefinition> =
  Object.fromEntries(DIFFICULTY_DEFINITIONS.map((difficulty) => [difficulty.id, difficulty])) as
    Record<GameDifficulty, DifficultyDefinition>;

export function isGameDifficulty(value: unknown): value is GameDifficulty {
  return typeof value === "string" && (GAME_DIFFICULTY_IDS as readonly string[]).includes(value);
}

export interface DifficultyProgress {
  highestUnlockedStage: number;
  highestClearedStage: number;
}

export type DifficultyProgressMap = Record<GameDifficulty, DifficultyProgress>;

export function createDefaultDifficultyProgress(): DifficultyProgressMap {
  return Object.fromEntries(GAME_DIFFICULTY_IDS.map((difficulty) => [difficulty, {
    highestUnlockedStage: 1,
    highestClearedStage: 0,
  }])) as DifficultyProgressMap;
}

export function isDifficultyUnlocked(
  difficulty: GameDifficulty,
  progress: DifficultyProgressMap,
): boolean {
  const prerequisite = DIFFICULTY_BY_ID[difficulty].unlocksAfter;
  return prerequisite === null || progress[prerequisite].highestClearedStage >= 120;
}

export function difficultyUnlockLabel(difficulty: GameDifficulty): string {
  const prerequisite = DIFFICULTY_BY_ID[difficulty].unlocksAfter;
  return prerequisite
    ? `通关${DIFFICULTY_BY_ID[prerequisite].label}10-12解锁`
    : "初始可用";
}

export function difficultyRank(difficulty: GameDifficulty): number {
  return GAME_DIFFICULTY_IDS.indexOf(difficulty);
}

/**
 * Easy follows the authored 1-120 growth curve. Later campaigns stay in the
 * endgame power band; their authored enemies and difficulty modifiers provide
 * the within-campaign and between-campaign growth without a second exponential.
 */
export function difficultyPowerStage(stage: number, difficulty: GameDifficulty): number {
  const campaignStage = Math.max(1, Math.min(120, Math.round(stage)));
  return difficulty === "easy" ? campaignStage : 120;
}

/** Chapter equipment levels. Early chapters grow quickly, then the curve slows. */
export const EQUIPMENT_LEVELS_BY_DIFFICULTY: Record<GameDifficulty, readonly number[]> = {
  easy: [1, 10, 20, 25, 30, 35, 40, 40, 45, 45],
  hard: [50, 55, 60, 65, 70, 75, 80, 80, 85, 85],
  nightmare: [90, 90, 90, 95, 95, 95, 95, 100, 100, 100],
  hell: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  torment: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
};

export function equipmentLevelForDifficulty(
  stage: number,
  difficulty: GameDifficulty,
): number {
  const chapter = Math.max(1, Math.min(10, Math.ceil(Math.max(1, stage) / 12)));
  return EQUIPMENT_LEVELS_BY_DIFFICULTY[difficulty][chapter - 1]!;
}
