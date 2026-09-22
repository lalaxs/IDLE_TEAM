import { ARMOR_FACTOR, HERO_ATK_PER_LEVEL, HERO_HP_PER_LEVEL, HERO_DEF_PER_LEVEL, itemBudgetBase } from "./balance";
import { EQUIPMENT_LEVELS_BY_DIFFICULTY, GAME_DIFFICULTY_IDS, difficultyRank, type DifficultyProgressMap, type GameDifficulty } from "./difficulties";

export const PROGRESSION_DAYS = 90;
export const PROGRESSION_PARTY_SIZE = 5;
export const BASE_DAILY_INCOME_HOURS = 27;
export const IDLE_CAP_HOURS = 12;
export const DOUBLE_CLAIMS_PER_DAY = 2;
export const QUICK_REWARDS_PER_DAY = 3;
export const QUICK_REWARD_HOURS = 10;
export const ACTIVE_EXPERIENCE_HOURS_PER_DAY = 1;

const weights = Array.from({ length: 99 }, (_, i) => 0.001 + ((i + 1) / 100) ** 1.7);
const totalWeight = weights.reduce((sum, value) => sum + value, 0);

export function idleExperiencePerHour(level: number): number {
  return 600 * 1.03 ** (Math.max(1, Math.min(100, level)) - 1);
}

export function heroUpgradeExperience(level: number): number {
  if (level >= 100) return 0;
  const index = Math.max(0, Math.floor(level) - 1);
  return Math.ceil(idleExperiencePerHour(index + 1) * BASE_DAILY_INCOME_HOURS
    * PROGRESSION_DAYS * weights[index]! / totalWeight / PROGRESSION_PARTY_SIZE);
}

export function referenceLevel(stage: number, difficulty: GameDifficulty = "easy"): number {
  const local = Math.max(1, Math.min(120, Math.floor(stage)));
  const chapter = Math.floor((local - 1) / 12);
  const levels = EQUIPMENT_LEVELS_BY_DIFFICULTY[difficulty];
  const start = levels[chapter]!;
  const end = levels[chapter + 1] ?? [50, 90, 100, 100, 100][difficultyRank(difficulty)]!;
  return Math.round(start + (end - start) * ((local - 1) % 12) / 11);
}

/** Best cleared resource tier is independent of the currently selected battle. */
export function bestIdleProgress(progress: DifficultyProgressMap): { stage: number; difficulty: GameDifficulty } {
  let best = { stage: 1, difficulty: "easy" as GameDifficulty };
  for (const difficulty of GAME_DIFFICULTY_IDS) {
    const stage = progress[difficulty].highestClearedStage;
    if (stage < 1) continue;
    const level = referenceLevel(stage, difficulty);
    if (level >= referenceLevel(best.stage, best.difficulty)) best = { stage, difficulty };
  }
  return best;
}

export function progressExperiencePerHour(progress: DifficultyProgressMap): number {
  const best = bestIdleProgress(progress);
  return idleExperiencePerHour(referenceLevel(best.stage, best.difficulty));
}

export const ASCEND_GUARANTEES = [
  { difficulty: "easy", stage: 12, stones: 5 },
  { difficulty: "easy", stage: 72, stones: 10 },
  { difficulty: "easy", stage: 120, stones: 15 },
  { difficulty: "hard", stage: 60, stones: 25 },
] as const;

/** Fixed reference squad, independent of the player's current party and equipment. */
export function referenceEncounter(stage: number, difficulty: GameDifficulty = "easy") {
  const level = referenceLevel(stage, difficulty);
  const rank = difficultyRank(difficulty);
  const chapter = Math.floor((Math.max(1, Math.min(120, stage)) - 1) / 12);
  const coverage = Math.min(1, (level - 1) / 19);
  const ascend = (level > 40 ? 0.08 : 0) + (level > 80 ? 0.15 : 0);
  const equipmentLevel = Math.min(EQUIPMENT_LEVELS_BY_DIFFICULTY[difficulty][chapter]!, Math.max(1, 5 * Math.floor(level / 5)));
  const gear = itemBudgetBase(equipmentLevel) * [1.05, 1.1, 1.16, 1.29, 1.43][rank]!
    * [1, 1.04, 1.08, 1.12, 1.12][rank]! * coverage;
  const attack = (base: number) => Math.round(base * HERO_ATK_PER_LEVEL ** (level - 1) * (1 + ascend)) + gear * 2.85;
  const dpsAttack = attack(125), tankAttack = attack(90), healerAttack = attack(70);
  const tankHp = (Math.round(1500 * HERO_HP_PER_LEVEL ** (level - 1) * (1 + ascend)) + gear * 22.2) * (1 + 0.1 * coverage);
  const tankDefense = (Math.round(65 * HERO_DEF_PER_LEVEL ** (level - 1) * (1 + ascend)) + gear * 1.75) * (1 + 0.1 * coverage);
  const defense = Math.round(dpsAttack * 0.25 / ARMOR_FACTOR);
  const bossDefense = Math.round(defense * 1.25);
  const dps = (armor: number) => {
    const damage = (x: number) => x * x / (x + ARMOR_FACTOR * armor);
    const boost = 1 + 0.2 * coverage, speed = 1 + 0.08 * coverage;
    return (3 * (damage(dpsAttack * boost) * speed / 1.2 + damage(dpsAttack * boost * 2.5) / 6.5)
      + damage(tankAttack * boost) * speed / 1.4 + damage(tankAttack * boost * 1.5) / 8
      + damage(healerAttack * boost) * speed / 1.6) * 1.025;
  };
  const within = rank >= 3 ? (stage - 1) / 119 : 0;
  const timeMultiplier = [1, 1.1, 1.2, 1.35, 1.6][rank]! * (1 + 0.15 * within);
  const waveSeconds = (12 + 6 * (level - 1) / 99) * timeMultiplier;
  const bossSeconds = (30 + 20 * (level - 1) / 99) * timeMultiplier * (stage % 12 === 0 ? 1.15 : 1);
  const pressure = [1, 1.05, 1.1, 1.2, 1.35][rank]! * (1 + 0.08 * within);
  const resistance = Math.min(0.75, tankDefense / (tankDefense + 4000));
  const enemyAttack = (seconds: number, focus: number, survival: number) => {
    const y = tankHp * seconds / (focus * survival) / (1 - resistance) * pressure;
    return Math.round((y + Math.sqrt(y * y + 4 * y * ARMOR_FACTOR * tankDefense)) / 2);
  };
  return {
    level, equipmentLevel, waveSeconds, bossSeconds,
    normalHp: Math.round(dps(defense) * 1.25 * waveSeconds / 4.6),
    bossHp: Math.round(dps(bossDefense) * bossSeconds),
    defense, bossDefense,
    normalAttack: enemyAttack(1.5, 3, 20), bossAttack: enemyAttack(2, 1, 40),
  };
}
