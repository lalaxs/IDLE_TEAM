import {
  ENEMY_BY_ID,
  bossIdForStage,
  resolveEnemyDamageElement,
} from "../content/enemies";
import { referenceEncounter } from "../content/numericalModel";
import type { GameDifficulty } from "../content/difficulties";
import { getUnlockedPartySlotCount } from "../progression/PartySystem";
import type { EnemyId, UnitState } from "./types";
import { formationLane, laneOffsetY } from "./MovementSystem";
import { SeededRandom } from "./RandomSource";
import { initialEnemySkillTrigger } from "./EnemyBehaviorSystem";

export interface WaveUnitDefinition {
  enemyId: EnemyId;
  scale: number;
}

export const TRASH_ENCOUNTERS_BEFORE_BOSS = 5;

const CHAPTER_ONE_NORMALS = [
  ["E01", "E02", "E03"],
  ["E05", "E06", "E07"],
  ["E09", "E10", "E11"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_ONE_ELITES = ["E04", "E08", "E12"] as const satisfies readonly EnemyId[];
const CHAPTER_TWO_NORMALS = [
  ["E13", "E14", "E15"],
  ["E17", "E18", "E19"],
  ["E21", "E22", "E23"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_TWO_ELITES = ["E16", "E20", "E24"] as const satisfies readonly EnemyId[];
const CHAPTER_THREE_NORMALS = [
  ["E25", "E26", "E27"],
  ["E29", "E30", "E31"],
  ["E33", "E34", "E35"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_THREE_ELITES = ["E28", "E32", "E36"] as const satisfies readonly EnemyId[];
const CHAPTER_FOUR_NORMALS = [
  ["E37", "E38", "E39"],
  ["E41", "E42", "E43"],
  ["E45", "E46", "E47"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_FOUR_ELITES = ["E40", "E44", "E48"] as const satisfies readonly EnemyId[];
const CHAPTER_FIVE_NORMALS = [
  ["E49", "E50", "E51"],
  ["E53", "E54", "E55"],
  ["E57", "E58", "E59"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_FIVE_ELITES = ["E52", "E56", "E60"] as const satisfies readonly EnemyId[];
const CHAPTER_SIX_NORMALS = [
  ["E61", "E62", "E63"],
  ["E65", "E66", "E67"],
  ["E69", "E70", "E71"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_SIX_ELITES = ["E64", "E68", "E72"] as const satisfies readonly EnemyId[];
const CHAPTER_SEVEN_NORMALS = [
  ["E73", "E74", "E75"],
  ["E77", "E78", "E79"],
  ["E81", "E82", "E83"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_SEVEN_ELITES = ["E76", "E80", "E84"] as const satisfies readonly EnemyId[];
const CHAPTER_EIGHT_NORMALS = [
  ["E85", "E86", "E87"],
  ["E89", "E90", "E91"],
  ["E93", "E94", "E95"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_EIGHT_ELITES = ["E88", "E92", "E96"] as const satisfies readonly EnemyId[];
const CHAPTER_NINE_NORMALS = [
  ["E97", "E98", "E99"],
  ["E101", "E102", "E103"],
  ["E105", "E106", "E107"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_NINE_ELITES = ["E100", "E104", "E108"] as const satisfies readonly EnemyId[];
const CHAPTER_TEN_NORMALS = [
  ["E109", "E110", "E111"],
  ["E113", "E114", "E115"],
  ["E117", "E118", "E119"],
] as const satisfies readonly (readonly EnemyId[])[];
const CHAPTER_TEN_ELITES = ["E112", "E116", "E120"] as const satisfies readonly EnemyId[];
const LATER_CHAPTER_NORMAL_FALLBACK = [
  "E01", "E02", "E03", "E05", "E06", "E07",
] as const satisfies readonly EnemyId[];
const LATER_CHAPTER_ELITE_FALLBACK = ["E04", "E08"] as const satisfies readonly EnemyId[];
const CHAPTER_NORMAL_ROSTERS: readonly (readonly (readonly EnemyId[])[])[] = [
  CHAPTER_ONE_NORMALS,
  CHAPTER_TWO_NORMALS,
  CHAPTER_THREE_NORMALS,
  CHAPTER_FOUR_NORMALS,
  CHAPTER_FIVE_NORMALS,
  CHAPTER_SIX_NORMALS,
  CHAPTER_SEVEN_NORMALS,
  CHAPTER_EIGHT_NORMALS,
  CHAPTER_NINE_NORMALS,
  CHAPTER_TEN_NORMALS,
];
const CHAPTER_ELITE_ROSTERS: readonly (readonly EnemyId[])[] = [
  CHAPTER_ONE_ELITES,
  CHAPTER_TWO_ELITES,
  CHAPTER_THREE_ELITES,
  CHAPTER_FOUR_ELITES,
  CHAPTER_FIVE_ELITES,
  CHAPTER_SIX_ELITES,
  CHAPTER_SEVEN_ELITES,
  CHAPTER_EIGHT_ELITES,
  CHAPTER_NINE_ELITES,
  CHAPTER_TEN_ELITES,
];
const ENCOUNTER_COUNTS = [3, 4, 5, 5, 6] as const;

interface StageRoster {
  core: EnemyId[];
  adjacent: EnemyId[];
  regionNormals: EnemyId[];
  elite: EnemyId | null;
  stageInRegion: number;
}

function rosterForStage(stage: number): StageRoster {
  const safeStage = Math.max(1, Math.floor(stage));
  const chapterIndex = Math.floor((safeStage - 1) / 12);
  const localStage = (safeStage - 1) % 12;
  const region = Math.floor(localStage / 4);
  const stageInRegion = localStage % 4;
  const chapterNormals = CHAPTER_NORMAL_ROSTERS[chapterIndex];
  const regionNormals = chapterNormals?.[region];

  if (!chapterNormals || !regionNormals) {
    return {
      core: [...LATER_CHAPTER_NORMAL_FALLBACK],
      adjacent: [],
      regionNormals: [...LATER_CHAPTER_NORMAL_FALLBACK],
      elite: LATER_CHAPTER_ELITE_FALLBACK[region % LATER_CHAPTER_ELITE_FALLBACK.length] ?? null,
      stageInRegion,
    };
  }

  const adjacentRegion = region < chapterNormals.length - 1 ? region + 1 : region - 1;
  return {
    // The first stage introduces a featured pair; later stages use the full local trio.
    core: [...regionNormals.slice(0, stageInRegion === 0 ? 2 : 3)],
    adjacent: [...(chapterNormals[adjacentRegion] ?? [])],
    regionNormals: [...regionNormals],
    elite: CHAPTER_ELITE_ROSTERS[chapterIndex]?.[region] ?? null,
    stageInRegion,
  };
}

function shuffled<T>(values: readonly T[], random: SeededRandom): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

/** Draw every local monster before reshuffling, without repeating at a bag boundary. */
function createBagPicker(pool: readonly EnemyId[], random: SeededRandom): () => EnemyId {
  let bag: EnemyId[] = [];
  let previous: EnemyId | null = null;
  return () => {
    if (bag.length === 0) {
      bag = shuffled(pool, random);
      if (bag.length > 1 && bag[0] === previous) {
        const replacement = bag.findIndex((enemyId) => enemyId !== previous);
        [bag[0], bag[replacement]] = [bag[replacement]!, bag[0]!];
      }
    }
    const next = bag.shift()!;
    previous = next;
    return next;
  };
}

function tacticalAnchors(pool: readonly EnemyId[], random: SeededRandom): EnemyId[] {
  const melee = pool.filter((enemyId) => ENEMY_BY_ID[enemyId].attackMode === "melee");
  const ranged = pool.filter((enemyId) => ENEMY_BY_ID[enemyId].attackMode === "ranged");
  if (melee.length > 0 && ranged.length > 0) {
    return [random.pick(melee), random.pick(ranged)];
  }

  const sturdy = [...pool].sort(
    (left, right) => ENEMY_BY_ID[right].defense - ENEMY_BY_ID[left].defense,
  )[0]!;
  const fast = [...pool].sort(
    (left, right) => ENEMY_BY_ID[right].moveSpeed - ENEMY_BY_ID[left].moveSpeed,
  )[0]!;
  return sturdy === fast ? [sturdy] : [sturdy, fast];
}

function packSignature(pack: readonly EnemyId[]): string {
  return [...pack].sort().join(",");
}

function avoidRepeatedPack(
  pack: EnemyId[],
  previous: readonly EnemyId[] | null,
  replacements: readonly EnemyId[],
): EnemyId[] {
  if (!previous || packSignature(pack) !== packSignature(previous)) return pack;
  for (let index = pack.length - 1; index >= 0; index -= 1) {
    for (const replacement of replacements) {
      if (replacement === pack[index]) continue;
      const candidate = [...pack];
      candidate[index] = replacement;
      if (packSignature(candidate) !== packSignature(previous)) return candidate;
    }
  }
  return pack;
}

/** Five controlled-random encounters with a rising 3/4/5/5/6-unit cadence. */
export function createStageEncounterPlan(stage: number, seed: number): WaveUnitDefinition[][] {
  const roster = rosterForStage(stage);
  const random = new SeededRandom(seed + stage * 101 + 0x5f37_59df);
  const draw = createBagPicker(roster.core, random);
  const featured = roster.regionNormals[roster.stageInRegion % roster.regionNormals.length]!;
  const eliteEncounter = roster.stageInRegion === 2 ? 4 : roster.stageInRegion === 3 ? 3 : -1;
  let previous: EnemyId[] | null = null;

  return ENCOUNTER_COUNTS.map((count, encounterIndex) => {
    let anchors: EnemyId[] = [];
    if (encounterIndex === 0) anchors = [featured];
    if (encounterIndex === 2) anchors = tacticalAnchors(roster.core, random);
    if (encounterIndex === eliteEncounter && roster.elite) anchors = [roster.elite];
    if (encounterIndex === 3 && eliteEncounter !== 3) {
      anchors = tacticalAnchors(roster.core, random).slice(0, 1);
    }

    let enemyIds = [...anchors];
    while (enemyIds.length < count) enemyIds.push(draw());

    // A restrained adjacent-region cameo keeps the chapter connected without
    // replacing the local roster or its elite.
    if ((encounterIndex === 2 || encounterIndex === 4) && roster.adjacent.length > 0 && random.next() < 0.15) {
      enemyIds[enemyIds.length - 1] = random.pick(roster.adjacent);
    }

    enemyIds = avoidRepeatedPack(enemyIds, previous, roster.core);
    previous = enemyIds;
    return enemyIds.map((enemyId) => ({ enemyId, scale: stage }));
  });
}

function createBossEncounter(stage: number, seed: number): WaveUnitDefinition[] {
  const roster = rosterForStage(stage);
  const random = new SeededRandom(seed + stage * 149 + 0x0b05_5f17);
  const draw = createBagPicker(roster.core, random);
  const escortCount = [0, 1, 1, 2][roster.stageInRegion] ?? 0;
  return [
    { enemyId: bossIdForStage(stage), scale: stage },
    ...Array.from({ length: escortCount }, () => ({ enemyId: draw(), scale: stage })),
  ];
}

/** Trash kills needed to fill the boss meter across five varied encounters. */
export function trashQuotaForStage(stage: number, seed: number): number {
  return createStageEncounterPlan(stage, seed)
    .reduce((total, encounter) => total + encounter.length, 0);
}

/**
 * Pack recipe for an encounter.
 * - Boss pack when `boss` is true
 * - Otherwise select one of the five deterministic controlled-random packs
 */
export function createEncounterDefinitions(
  stage: number,
  encounter: number,
  seed: number,
  boss: boolean,
): WaveUnitDefinition[] {
  if (boss) return createBossEncounter(stage, seed);
  const plan = createStageEncounterPlan(stage, seed);
  return plan[Math.min(plan.length - 1, Math.max(0, Math.floor(encounter) - 1))] ?? [];
}

/** Compatibility adapter for the old 1/2 trash and 3 boss API. */
export function createWaveDefinitions(
  stage: number,
  wave: number,
  seed: number,
): WaveUnitDefinition[] {
  if (wave === 3) return createBossEncounter(stage, seed);
  const roster = rosterForStage(stage);
  const first = roster.regionNormals[0]!;
  const second = roster.regionNormals[1] ?? first;
  const third = roster.regionNormals[2] ?? second;
  const available = roster.stageInRegion === 0
    ? [first]
    : roster.stageInRegion === 1
      ? [first, second]
      : roster.stageInRegion === 2
        ? [second, third]
        : [first, second, third];
  const random = new SeededRandom(seed + stage * 101 + wave);
  const useElite = wave === 2 && roster.stageInRegion === 3 && roster.elite;
  const count = 3 + (wave === 2 ? 1 : 0);
  const result = Array.from({ length: count - (useElite ? 1 : 0) }, () => ({
    enemyId: random.pick(available),
    scale: stage,
  }));
  if (useElite) result.push({ enemyId: roster.elite!, scale: stage });
  return result;
}

/** Enemy budgets follow the fixed reference squad for each campaign tier. */
export function createEnemyUnits(
  stage: number,
  encounter: number,
  seed: number,
  startX = 900,
  boss = false,
  difficulty: GameDifficulty = "easy",
): UnitState[] {
  const reference = referenceEncounter(stage, difficulty);
  const openingPartyScale = difficulty === "easy" ? getUnlockedPartySlotCount(stage - 1) / 5 : 1;
  const formation = [...createEncounterDefinitions(stage, encounter, seed, boss)]
    .sort((left, right) => {
      const leftRank = ENEMY_BY_ID[left.enemyId].attackMode === "melee" ? 0 : 1;
      const rightRank = ENEMY_BY_ID[right.enemyId].attackMode === "melee" ? 0 : 1;
      return leftRank - rightRank;
    });
  return formation.map(({ enemyId }, index) => {
    const definition = ENEMY_BY_ID[enemyId];
    const isBoss = definition.kind === "boss", elite = definition.kind === "elite";
    const ranged = definition.attackMode === "ranged";
    const heavy = !ranged && definition.attackIntervalMs >= 1600;
    const fast = !ranged && definition.attackIntervalMs <= 1250;
    const hpRatio = elite ? 3 : ranged ? 0.8 : heavy ? 1.3 : fast ? 0.75 : 1;
    const atkRatio = elite ? 1.3 : ranged ? 1.1 : heavy ? 0.75 : fast ? 0.9 : 1;
    const defRatio = elite ? 1.2 : ranged ? 0.7 : heavy ? 1.8 : fast ? 0.6 : 1;
    const maxHp = Math.round((isBoss ? reference.bossHp : reference.normalHp * hpRatio) * openingPartyScale);
    const damageElement = resolveEnemyDamageElement(enemyId, stage);
    const elementMultiplier = damageElement === "physical" ? 1 : 1.75;
    return {
      id: `enemy-${stage}-${encounter}-${index}-${enemyId}`,
      team: "enemies",
      sourceId: enemyId,
      name: definition.name,
      x: startX + index * 118 + (index % 2) * 12,
      y: laneOffsetY(`enemy-${stage}-${encounter}-${index}-${enemyId}`, index, "enemies"),
      hp: maxHp,
      maxHp,
      rage: 0,
      maxRage: 0,
      attack: Math.round((isBoss ? reference.bossAttack : reference.normalAttack * atkRatio) * openingPartyScale / elementMultiplier),
      defense: Math.round(isBoss ? reference.bossDefense : reference.defense * defRatio),
      damageElement,
      critChance: 0.05,
      attackMode: definition.attackMode,
      attackRange: definition.attackRange,
      moveSpeed: definition.moveSpeed,
      attackIntervalMs: isBoss ? 2000 : heavy ? 1800 : fast ? 1100 : 1500,
      castSpeedPct: 0,
      attackCooldownMs: 500 + index * 120,
      skillTriggerMs: initialEnemySkillTrigger(enemyId),
      skillPrepareMs: null,
      skillCastDurationMs: null,
      skillCastId: null,
      skillCastSequence: 0,
      skillTargetIds: [],
      targetId: null,
      shield: 0,
      statuses: [],
      periodicEffects: [],
      alive: true,
      basicAttackCount: 0,
      skillCastCount: 0,
      passiveFlags: { formationLane: formationLane(index, "enemies") },
    };
  });
}
