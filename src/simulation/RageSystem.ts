import {
  ACTIVE_SKILL_RAGE_COST,
  BASIC_ATTACK_RAGE_GAIN,
  DEFAULT_SKILL_CAST_TIME_MS,
  DAMAGE_TAKEN_RAGE_PER_MAX_HP,
  MAX_CAST_SPEED_PCT,
  MIN_SKILL_CAST_TIME_MS,
} from "../content/rage";
import type { UnitState } from "./types";

export function hasRage(unit: UnitState, cost: number): boolean {
  return unit.rage >= cost;
}

export function gainRage(unit: UnitState, amount: number): void {
  if (unit.team !== "heroes" || amount <= 0) return;
  const gainMultiplier = 1 + Number(unit.passiveFlags.gearRageGainPct ?? 0);
  grantRage(unit, amount * gainMultiplier);
}

export function grantRage(unit: UnitState, amount: number): void {
  if (unit.team !== "heroes" || amount <= 0) return;
  unit.rage = Math.min(unit.maxRage, unit.rage + amount);
}

export function gainRageFromBasicAttack(unit: UnitState): void {
  gainRage(unit, BASIC_ATTACK_RAGE_GAIN);
}

export function gainRageFromDamage(unit: UnitState, hpDamage: number): void {
  if (unit.maxHp <= 0) return;
  gainRage(unit, (hpDamage / unit.maxHp) * DAMAGE_TAKEN_RAGE_PER_MAX_HP);
}

export function spendRage(unit: UnitState, cost: number): void {
  unit.rage = Math.max(0, unit.rage - cost);
}

export function rageCostForNextSkill(_unit: UnitState): number {
  return ACTIVE_SKILL_RAGE_COST;
}

export type SkillPreparationTransition =
  | { type: "started"; castId: string }
  | { type: "cancelled"; castId: string };

export function clampCastSpeedPct(castSpeedPct: number): number {
  return Math.max(0, Math.min(MAX_CAST_SPEED_PCT, castSpeedPct));
}

export function getEffectiveSkillCastTime(
  baseCastTimeMs: number,
  castSpeedPct: number,
): number {
  const speed = clampCastSpeedPct(castSpeedPct);
  return Math.max(
    MIN_SKILL_CAST_TIME_MS,
    Math.round(baseCastTimeMs / (1 + speed / 100)),
  );
}

export function cancelSkillPreparation(unit: UnitState): SkillPreparationTransition | null {
  const castId = unit.skillCastId;
  unit.skillPrepareMs = null;
  unit.skillCastDurationMs = null;
  unit.skillCastId = null;
  unit.skillTargetIds = [];
  return castId ? { type: "cancelled", castId } : null;
}

export function advanceSkillPreparation(
  unit: UnitState,
  deltaMs: number,
  canPrepare = true,
  castTimeMs = DEFAULT_SKILL_CAST_TIME_MS,
): SkillPreparationTransition | null {
  if (!unit.alive || unit.rage < rageCostForNextSkill(unit) || !canPrepare) {
    return cancelSkillPreparation(unit);
  }
  if (unit.skillPrepareMs === null) {
    unit.skillCastSequence += 1;
    unit.skillCastId = `${unit.id}:skill:${unit.skillCastSequence}`;
    unit.skillCastDurationMs = getEffectiveSkillCastTime(castTimeMs, unit.castSpeedPct);
    unit.skillPrepareMs = unit.skillCastDurationMs;
    return { type: "started", castId: unit.skillCastId };
  }
  unit.skillPrepareMs = Math.max(0, unit.skillPrepareMs - deltaMs);
  return null;
}
