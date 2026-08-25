import { ENEMY_BY_ID, resolveEnemyDamageElement } from "../content/enemies";
import {
  enemyAtkMultiplier,
  enemyDefMultiplier,
  enemyHpMultiplier,
} from "../content/balance";
import type { EnemyId, UnitState } from "./types";
import { laneOffsetY } from "./MovementSystem";
import { SeededRandom } from "./RandomSource";

export interface WaveUnitDefinition {
  enemyId: EnemyId;
  scale: number;
}

/** Trash kills needed to fill the boss meter (matches two classic pack sizes). */
export function trashQuotaForStage(stage: number, seed: number): number {
  return createWaveDefinitions(stage, 1, seed).length + createWaveDefinitions(stage, 2, seed).length;
}

/**
 * Pack recipe for an encounter.
 * - Boss pack when `boss` is true
 * - Otherwise alternate classic pack-1 / pack-2 compositions by encounter index
 */
export function createEncounterDefinitions(
  stage: number,
  encounter: number,
  seed: number,
  boss: boolean,
): WaveUnitDefinition[] {
  if (boss) return createWaveDefinitions(stage, 3, seed);
  const patternWave = ((Math.max(1, encounter) - 1) % 2) + 1;
  return createWaveDefinitions(stage, patternWave, seed);
}

export function createWaveDefinitions(
  stage: number,
  wave: number,
  seed: number,
): WaveUnitDefinition[] {
  if (wave === 3) {
    const escorts = stage >= 10 ? 2 : stage >= 7 ? 1 : 0;
    const random = new SeededRandom(seed + stage * 101 + wave);
    const available: EnemyId[] = ["E01"];
    if (stage >= 2) available.push("E02");
    if (stage >= 3) available.push("E03");
    return [
      { enemyId: "B01", scale: stage },
      ...Array.from({ length: escorts }, () => ({
        enemyId: random.pick(available),
        scale: stage,
      })),
    ];
  }

  const baseCount = 3 + Math.floor((stage - 1) / 4);
  const count = baseCount + (wave === 2 ? 1 : 0);
  const random = new SeededRandom(seed + stage * 101 + wave);
  const available: EnemyId[] = ["E01"];
  if (stage >= 2) available.push("E02");
  if (stage >= 3) available.push("E03");
  const normalCount = wave === 2 && stage >= 4 ? count - 1 : count;
  const result = Array.from({ length: normalCount }, () => ({
    enemyId: random.pick(available),
    scale: stage,
  }));
  if (wave === 2 && stage >= 4) result.push({ enemyId: "E04", scale: stage });
  return result;
}

/** DI-style asymmetric scaling: HP rises faster than attack. */
export function createEnemyUnits(
  stage: number,
  encounter: number,
  seed: number,
  startX = 900,
  boss = false,
): UnitState[] {
  const hpMult = enemyHpMultiplier(stage);
  const atkMult = enemyAtkMultiplier(stage);
  const defMult = enemyDefMultiplier(stage);
  return createEncounterDefinitions(stage, encounter, seed, boss).map(({ enemyId }, index) => {
    const definition = ENEMY_BY_ID[enemyId];
    const maxHp = Math.round(definition.maxHp * hpMult);
    return {
      id: `enemy-${stage}-${encounter}-${index}-${enemyId}`,
      team: "enemies",
      sourceId: enemyId,
      name: definition.name,
      x: startX + index * 118 + (index % 2) * 12,
      y: laneOffsetY(`enemy-${stage}-${encounter}-${index}-${enemyId}`, index, "enemies"),
      hp: maxHp,
      maxHp,
      attack: Math.round(definition.attack * atkMult),
      defense: Math.round(definition.defense * defMult),
      damageElement: resolveEnemyDamageElement(enemyId, stage),
      critChance: 0.05,
      attackRange: definition.attackRange,
      moveSpeed: definition.moveSpeed,
      attackIntervalMs: definition.attackIntervalMs,
      attackCooldownMs: 500 + index * 120,
      skillCooldownMs: enemyId === "B01" ? 5000 : Number.POSITIVE_INFINITY,
      ultimateCooldownMs: Number.POSITIVE_INFINITY,
      targetId: null,
      shield: 0,
      statuses: [],
      alive: true,
      basicAttackCount: 0,
      skillCastCount: 0,
      passiveFlags: {},
    };
  });
}
