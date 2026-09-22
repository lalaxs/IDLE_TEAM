import { HERO_SKILL_BY_ID } from "../content/heroSkills";
import { healCombatTarget, healingMultiplier } from "./HealingSystem";
import { gainRage } from "./RageSystem";
import { livingAllies, lowestHealthFirst } from "./SkillCombat";
import { applyStatus, getStatusMagnitude } from "./StatusSystem";
import type { BattleEvent, StatusKind, UnitState } from "./types";

const CLEANSED_STATUSES = new Set<StatusKind>(["slow", "armorBreak", "vulnerability"]);

function recordStatus(
  source: UnitState,
  target: UnitState,
  kind: StatusKind,
  magnitude: number,
  remainingMs: number,
  effectId: string,
  events: BattleEvent[],
): void {
  applyStatus(target, { kind, effectId, magnitude, remainingMs, sourceId: source.id });
  events.push({ type: "status:applied", targetId: target.id, kind });
}

function hasCleansableStatus(unit: UnitState): boolean {
  return unit.statuses.some(({ kind }) => CLEANSED_STATUSES.has(kind));
}

export function afterSharedHeroPassiveDamage(
  source: UnitState,
  target: UnitState,
  critical: boolean,
  events: BattleEvent[],
): void {
  if (!critical || source.chosenSkillId !== "volley" || !target.alive) return;
  const passive = HERO_SKILL_BY_ID.volley.passive;
  recordStatus(
    source,
    target,
    "vulnerability",
    passive.vulnerabilityMagnitude ?? 0.08,
    passive.vulnerabilityMs ?? 4000,
    "shared-volley-vulnerability",
    events,
  );
}

export function afterSharedHeroPassiveBasicAttack(
  source: UnitState,
  target: UnitState,
  events: BattleEvent[],
): void {
  if (!target.alive) return;
  if (source.chosenSkillId === "quake-slash") {
    const passive = HERO_SKILL_BY_ID["quake-slash"].passive;
    const interval = passive.basicAttackInterval ?? 3;
    const hits = Number(source.passiveFlags.sharedBasicHitCount ?? 0) + 1;
    source.passiveFlags.sharedBasicHitCount = hits >= interval ? 0 : hits;
    if (hits < interval) return;
    recordStatus(
      source,
      target,
      "armorBreak",
      passive.armorBreakMagnitude ?? 0.12,
      passive.armorBreakMs ?? 4000,
      "shared-quake-armor-break",
      events,
    );
    return;
  }
  if (source.chosenSkillId !== "blizzard") return;
  const passive = HERO_SKILL_BY_ID.blizzard.passive;
  const interval = passive.basicAttackInterval ?? 4;
  const hits = Number(source.passiveFlags.sharedBasicHitCount ?? 0) + 1;
  source.passiveFlags.sharedBasicHitCount = hits >= interval ? 0 : hits;
  if (hits < interval) return;
  const wasSlowed = getStatusMagnitude(target, "slow") > 0;
  recordStatus(
    source,
    target,
    "slow",
    passive.slowMagnitude ?? 0.3,
    passive.slowMs ?? 3000,
    "shared-blizzard-slow",
    events,
  );
  if (wasSlowed) {
    recordStatus(source, target, "stun", 1, passive.stunMs ?? 600, "shared-blizzard-freeze", events);
  }
}

export function triggerSharedHeroPassivesAfterSkillCast(
  caster: UnitState,
  units: UnitState[],
): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (caster.chosenSkillId === "sanctuary") {
    const passive = HERO_SKILL_BY_ID.sanctuary.passive;
    const allies = livingAllies(caster, units);
    const debuffed = allies.filter(hasCleansableStatus);
    const target = lowestHealthFirst(debuffed.length > 0 ? debuffed : allies)[0];
    if (target) {
      healCombatTarget(caster, target, target.maxHp * (passive.healMaxHpRatio ?? 0.04)
        * healingMultiplier(caster, false), units, events, { attribution: { kind: "passive", id: "sanctuary" } });
      if (passive.cleanseNegativeStatuses) {
        target.statuses = target.statuses.filter(({ kind }) => !CLEANSED_STATUSES.has(kind));
      }
    }
  }

  for (const ally of livingAllies(caster, units)) {
    if (ally.chosenSkillId !== "storm-chain") continue;
    if (Number(ally.passiveFlags.sharedStormCooldownMs ?? 0) > 0) continue;
    const passive = HERO_SKILL_BY_ID["storm-chain"].passive;
    gainRage(ally, passive.ragePerTrigger ?? 3);
    ally.passiveFlags.sharedStormCooldownMs = passive.internalCooldownMs ?? 1000;
  }
  return events;
}

export function tickSharedHeroPassive(
  unit: UnitState,
  deltaMs: number,
): void {
  if (!unit.alive || unit.team !== "heroes") return;
  const cooldown = Number(unit.passiveFlags.sharedStormCooldownMs ?? 0);
  if (cooldown > 0) {
    unit.passiveFlags.sharedStormCooldownMs = Math.max(0, cooldown - deltaMs);
  }
}
