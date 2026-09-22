import type { ActiveTalentProc, BasicTalentProc } from "../content/talents";
import { healCombatTarget, healingMultiplier } from "./HealingSystem";
import { gainRage, grantRage } from "./RageSystem";
import { applyStatus } from "./StatusSystem";
import type { BattleEvent, StatusKind, UnitState } from "./types";

const CLEANSED_STATUSES = new Set<StatusKind>(["stun", "slow", "armorBreak", "vulnerability"]);

function alliesOf(source: UnitState, units: UnitState[]): UnitState[] {
  return units.filter((unit) => unit.alive && unit.team === source.team);
}

function recordStatus(source: UnitState, target: UnitState, kind: StatusKind, value: number, durationMs: number, events: BattleEvent[]): void {
  applyStatus(target, {
    kind,
    effectId: `talent-${kind}`,
    magnitude: value,
    remainingMs: durationMs,
    sourceId: source.id,
  });
  events.push({ type: "status:applied", targetId: target.id, kind });
}

export function afterTalentBasicAttack(
  source: UnitState,
  target: UnitState,
  units: UnitState[],
  events: BattleEvent[],
): void {
  if (source.team !== "heroes" || !source.alive) return;
  const extraRage = Number(source.passiveFlags.talentBasicRage ?? 0);
  if (extraRage > 0) gainRage(source, extraRage);

  const proc = String(source.passiveFlags.talentBasicProc ?? "") as BasicTalentProc;
  const interval = Number(source.passiveFlags.talentBasicProcInterval ?? 0);
  if (!proc || interval <= 0 || source.basicAttackCount % interval !== 0) return;
  const value = Number(source.passiveFlags.talentBasicProcValue ?? 0);
  const durationMs = Number(source.passiveFlags.talentBasicProcDurationMs ?? 0);
  if (proc === "shield") {
    source.shield += Math.round(source.maxHp * value);
  } else if (proc === "heal") {
    const ally = [...alliesOf(source, units)].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (!ally) return;
    healCombatTarget(source, ally, ally.maxHp * value * healingMultiplier(source, false), units, events,
      { attribution: { kind: "talent", id: "basic-heal" } });
  } else if (proc === "allyRage") {
    const ally = [...alliesOf(source, units)].sort((a, b) => a.rage / a.maxRage - b.rage / b.maxRage)[0];
    if (ally) grantRage(ally, value);
  } else if (target.alive) {
    recordStatus(source, target, proc, value, durationMs, events);
  }
}

export function afterTalentActiveSkill(
  source: UnitState,
  targetIds: readonly string[],
  units: UnitState[],
  events: BattleEvent[],
): void {
  if (source.team !== "heroes" || !source.alive) return;
  const proc = String(source.passiveFlags.talentActiveProc ?? "") as ActiveTalentProc;
  if (!proc) return;
  const value = Number(source.passiveFlags.talentActiveProcValue ?? 0);
  const durationMs = Number(source.passiveFlags.talentActiveProcDurationMs ?? 0);
  const allies = alliesOf(source, units);
  if (proc === "rageRefund") {
    grantRage(source, value);
  } else if (proc === "selfShield") {
    source.shield += Math.round(source.maxHp * value);
  } else if (proc === "teamShield") {
    for (const ally of allies) ally.shield += Math.round(ally.maxHp * value);
  } else if (proc === "teamRage") {
    for (const ally of allies) grantRage(ally, value);
  } else if (proc === "teamDamageReduction") {
    for (const ally of allies) recordStatus(source, ally, "damageReduction", value, durationMs, events);
  } else if (proc === "cleanse") {
    const affected = new Set(targetIds);
    for (const ally of allies) {
      if (affected.has(ally.id)) ally.statuses = ally.statuses.filter(({ kind }) => !CLEANSED_STATUSES.has(kind));
    }
  } else if (proc === "vulnerability") {
    const affected = new Set(targetIds);
    for (const unit of units) {
      if (unit.alive && unit.team !== source.team && affected.has(unit.id)) {
        recordStatus(source, unit, "vulnerability", value, durationMs, events);
      }
    }
  }
}
