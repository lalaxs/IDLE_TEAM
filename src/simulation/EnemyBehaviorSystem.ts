import {
  getEnemyCombatProfile,
  type EnemyActiveAbility,
  type EnemyCombatProfile,
  type EnemyStatusEffect,
} from "../content/enemyCombatProfiles";
import { ENEMY_BY_ID } from "../content/enemies";
import { difficultyRank, type GameDifficulty } from "../content/difficulties";
import { applyHealing, damageEvents, resolveDamage } from "./CombatSystem";
import { engageRange } from "./MovementSystem";
import { addPeriodicEffect } from "./PeriodicEffectSystem";
import type { RandomSource } from "./RandomSource";
import { applyStatus, isStunned } from "./StatusSystem";
import { isTankUnit, selectTarget, selectTauntTarget } from "./TargetingSystem";
import type { BattleEvent, EnemyId, UnitState } from "./types";

const PHASE_FLAG = "enemyHealthPhaseUsed";
const SUCCESSFUL_HITS_FLAG = "enemySuccessfulBasicHits";
const PHASE_ACTIVE_PENDING = "enemyPhaseActivePending";
const SIGNATURE_COOLDOWN_SAVED = "enemySignatureCooldownSaved";
const SUMMON_PENDING = "enemySummonPending";
const DIFFICULTY_ARMOR_FLAG = "enemyDifficultyArmorUsed";
const DIFFICULTY_SIGNATURE_CASTS = "enemyDifficultySignatureCasts";

export function combatProfileForEnemy(source: UnitState): EnemyCombatProfile {
  const definition = ENEMY_BY_ID[source.sourceId as EnemyId];
  return getEnemyCombatProfile(definition?.combatProfileId, definition?.kind ?? "normal");
}

export function activeEnemyAbilityFor(source: UnitState): EnemyActiveAbility | undefined {
  const profile = combatProfileForEnemy(source);
  const phaseAbility = profile.healthPhase?.active;
  return phaseAbility && source.passiveFlags[PHASE_ACTIVE_PENDING] === phaseAbility.id
    ? phaseAbility
    : profile.active;
}

export function initialEnemySkillTrigger(enemyId: EnemyId): number {
  const definition = ENEMY_BY_ID[enemyId];
  const active = getEnemyCombatProfile(definition?.combatProfileId, definition?.kind ?? "normal").active;
  return active?.trigger.kind === "cooldown" ? active.trigger.initialMs : Number.POSITIVE_INFINITY;
}

export function enemyBasicAttackMultiplier(source: UnitState): number {
  const multiplier = combatProfileForEnemy(source).openingStrikeMultiplier;
  return multiplier && source.basicAttackCount === 0 ? multiplier : 1;
}

export function selectEnemyBasicTarget(source: UnitState, units: readonly UnitState[]): UnitState | null {
  const profile = combatProfileForEnemy(source);
  const taunted = selectTauntTarget(source, units);
  if (taunted) {
    source.targetId = taunted.id;
    return taunted;
  }
  if (profile.lockTargetUntilDeath && source.targetId) {
    const locked = units.find((unit) => unit.id === source.targetId && unit.alive && unit.team !== source.team);
    if (locked) return locked;
  }
  if (profile.targetStrategy === "frontmostEnemy" && source.targetId) {
    const tank = units.find(
      (unit) => unit.id === source.targetId && unit.alive && isTankUnit(unit),
    );
    if (tank) return tank;
  }
  const target = selectTarget(source, units, profile.targetStrategy);
  source.targetId = target?.id ?? null;
  return target;
}

function stableTargets(source: UnitState, units: readonly UnitState[], strategy: "frontmostEnemy" | "nearestEnemy" | "lowestHpEnemy" | "lowestHpAlly", count: number): UnitState[] {
  const candidates = units.filter((unit) => unit.alive && unit.team !== source.team);
  if (strategy === "lowestHpAlly") return [...units].filter((unit) => unit.alive && unit.team === source.team).sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp || left.id.localeCompare(right.id)).slice(0, count);
  if (strategy === "lowestHpEnemy") {
    return [...candidates].sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp || left.id.localeCompare(right.id)).slice(0, count);
  }
  if (strategy === "nearestEnemy") {
    return [...candidates].sort((left, right) => Math.abs(left.x - source.x) - Math.abs(right.x - source.x) || left.id.localeCompare(right.id)).slice(0, count);
  }
  return [...candidates].sort((left, right) => {
    const order = source.team === "heroes" ? left.x - right.x : right.x - left.x;
    return order || left.id.localeCompare(right.id);
  }).slice(0, count);
}

export function selectEnemySkillTargets(source: UnitState, units: readonly UnitState[], ability: EnemyActiveAbility): UnitState[] {
  return stableTargets(source, units, ability.targetStrategy ?? combatProfileForEnemy(source).targetStrategy, ability.targetCount);
}

/** Apply the non-damaging portion of an active. Damage-bearing actives resolve their hit first. */
export function applyEnemyStatusOnly(
  source: UnitState,
  targets: readonly UnitState[],
  units: readonly UnitState[],
  ability: EnemyActiveAbility,
): BattleEvent[] {
  if (ability.attackMultiplier > 0) return [];
  const events: BattleEvent[] = [];
  if (ability.targetStatus) {
    for (const target of targets) {
      if (!target.alive || target.team === source.team) continue;
      events.push(applyConfiguredStatus(target, `${ability.id}-${ability.targetStatus.kind}`, ability.targetStatus, source.id));
    }
  }
  if (source.alive && ability.selfStatus) {
    events.push(applyConfiguredStatus(source, `${ability.id}-${ability.selfStatus.kind}`, ability.selfStatus, source.id));
  }
  if (source.alive && ability.selfShieldMaxHpRatio) {
    source.shield = Math.max(source.shield, Math.round(source.maxHp * ability.selfShieldMaxHpRatio));
  }
  const allies = units
    .filter((unit) => unit.alive && unit.team === source.team && unit.id !== source.id)
    .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp || left.id.localeCompare(right.id));
  if (ability.allyStatus) {
    const { status, count, includeSelf } = ability.allyStatus;
    const allyTargets = (includeSelf ? [source, ...allies] : allies).slice(0, count);
    for (const ally of allyTargets) {
      events.push(applyConfiguredStatus(ally, `${ability.id}-${status.kind}`, status, source.id));
    }
  }
  if (ability.allyShieldMaxHpRatio) {
    const { amountPctMaxHp, count, includeSelf } = ability.allyShieldMaxHpRatio;
    const allyTargets = (includeSelf ? [source, ...allies] : allies).slice(0, count);
    for (const ally of allyTargets) {
      ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * amountPctMaxHp));
    }
  }
  return events;
}

function applyConfiguredStatus(target: UnitState, effectId: string, effect: EnemyStatusEffect, sourceId: string): BattleEvent {
  applyStatus(target, { kind: effect.kind, effectId, magnitude: effect.magnitude, remainingMs: effect.durationMs, sourceId });
  return { type: "status:applied", targetId: target.id, kind: effect.kind };
}

function allyTargets(source: UnitState, units: readonly UnitState[], count: number, includeSelf: boolean): UnitState[] {
  const wounded = units
    .filter((unit) => unit.alive && unit.team === source.team && unit.id !== source.id && unit.hp < unit.maxHp)
    .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp || left.id.localeCompare(right.id));
  return includeSelf ? [source, ...wounded].slice(0, count) : wounded.slice(0, count);
}

export function applyEnemyHealthPhase(source: UnitState, units: readonly UnitState[] = [source]): BattleEvent[] {
  const phase = combatProfileForEnemy(source).healthPhase;
  if (!phase || source.passiveFlags[PHASE_FLAG] || source.hp / Math.max(1, source.maxHp) > phase.hpRatio) return [];
  source.passiveFlags[PHASE_FLAG] = true;
  if (phase.activeCooldownMs) source.skillTriggerMs = Math.min(source.skillTriggerMs, phase.activeCooldownMs);
  if (phase.active) {
    source.passiveFlags[PHASE_ACTIVE_PENDING] = phase.active.id;
    source.passiveFlags[SIGNATURE_COOLDOWN_SAVED] = source.skillTriggerMs;
    source.skillTriggerMs = 0;
  }
  const events: BattleEvent[] = [];
  if (phase.status) events.push(applyConfiguredStatus(source, phase.id, phase.status, source.id));
  if (phase.shieldMaxHpRatio) source.shield = Math.max(source.shield, Math.round(source.maxHp * phase.shieldMaxHpRatio));
  if (phase.allyStatus || phase.allyShieldMaxHpRatio) {
    const allies = units
      .filter((unit) => unit.alive && unit.team === source.team && unit.id !== source.id)
      .sort((left, right) => left.id.localeCompare(right.id));
    const includeSelf = Boolean(phase.allyStatus?.includeSelf || phase.allyShieldMaxHpRatio?.includeSelf);
    const targets = includeSelf ? [source, ...allies] : allies;
    for (const ally of targets) {
      if (phase.allyStatus) events.push(applyConfiguredStatus(ally, phase.id, phase.allyStatus.status, source.id));
      if (phase.allyShieldMaxHpRatio) ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * phase.allyShieldMaxHpRatio.amountPctMaxHp));
    }
  }
  if (phase.summon?.prepareMs) {
    source.passiveFlags[SUMMON_PENDING] = 1;
    source.skillCastSequence += 1;
    source.skillCastId = `${source.id}:phase:${source.skillCastSequence}`;
    source.skillCastDurationMs = phase.summon.prepareMs;
    source.skillPrepareMs = phase.summon.prepareMs;
    events.push({ type: "skill:started", castId: source.skillCastId, sourceId: source.id, skillId: phase.id });
  } else if (phase.summon) {
    events.push(...summonEvents(source, phase.summon));
  }
  return events;
}

/** Shared high-difficulty breakpoint: bosses gain one 15% max-HP shield at 70% health. */
export function applyDifficultyHealthPhase(
  source: UnitState,
  difficulty: GameDifficulty,
): void {
  const definition = ENEMY_BY_ID[source.sourceId as EnemyId];
  if (
    difficultyRank(difficulty) < difficultyRank("hell")
    || definition?.kind !== "boss"
    || source.passiveFlags[DIFFICULTY_ARMOR_FLAG]
    || source.hp / Math.max(1, source.maxHp) > 0.7
  ) return;

  source.passiveFlags[DIFFICULTY_ARMOR_FLAG] = true;
  source.shield = Math.max(source.shield, Math.round(source.maxHp * 0.15));
}

export interface DifficultySignatureResult {
  events: BattleEvent[];
  echoMultiplier: number;
}

/** Generic boss rules layered over each boss's existing signature skill. */
export function applyDifficultySignatureMechanic(
  source: UnitState,
  abilityId: string,
  difficulty: GameDifficulty,
): DifficultySignatureResult {
  const definition = ENEMY_BY_ID[source.sourceId as EnemyId];
  const profile = combatProfileForEnemy(source);
  if (
    difficultyRank(difficulty) < difficultyRank("nightmare")
    || definition?.kind !== "boss"
    || profile.active?.id !== abilityId
    || !source.alive
  ) return { events: [], echoMultiplier: 0 };

  applyStatus(source, {
    kind: "haste",
    effectId: "difficulty-signature-haste",
    magnitude: 0.1,
    remainingMs: 3000,
    sourceId: source.id,
  });
  const casts = Number(source.passiveFlags[DIFFICULTY_SIGNATURE_CASTS] ?? 0) + 1;
  source.passiveFlags[DIFFICULTY_SIGNATURE_CASTS] = casts;
  return {
    events: [{ type: "status:applied", targetId: source.id, kind: "haste" }],
    echoMultiplier:
      difficultyRank(difficulty) >= difficultyRank("torment") && casts % 3 === 0 ? 0.4 : 0,
  };
}

function summonEvents(source: UnitState, summon: NonNullable<NonNullable<EnemyCombatProfile["healthPhase"]>["summon"]>): BattleEvent[] {
  return Array.from({ length: summon.count }, (_, index) => ({
    type: "enemy:summoned" as const,
    sourceId: source.id,
    summonId: `${summon.id}-${index + 1}`,
    sourceEnemyId: summon.sourceId as EnemyId,
    hpRatio: summon.hpRatio,
    attackRatio: summon.attackRatio,
  }));
}

export function afterEnemyBasicHit(source: UnitState, target: UnitState, random: RandomSource, units: readonly UnitState[] = [source, target]): BattleEvent[] {
  const profile = combatProfileForEnemy(source);
  const successfulHits = Number(source.passiveFlags[SUCCESSFUL_HITS_FLAG] ?? 0) + 1;
  source.passiveFlags[SUCCESSFUL_HITS_FLAG] = successfulHits;
  const active = profile.active;
  if (active?.trigger.kind === "basicHits" && successfulHits % active.trigger.everyHits === 0) source.skillTriggerMs = 0;
  const cadence = profile.cadence;
  if (!cadence || successfulHits % cadence.everyHits !== 0) return [];
  if (cadence.kind === "targetStatus") return target.alive ? [applyConfiguredStatus(target, cadence.id, cadence.status, source.id)] : [];
  if (cadence.kind === "selfStatus") return source.alive ? [applyConfiguredStatus(source, cadence.id, cadence.status, source.id)] : [];
  if (cadence.kind === "selfShield") {
    if (!source.alive || (cadence.skipWhileShielded && source.shield > 0)) return [];
    source.shield = Math.max(source.shield, Math.round(source.maxHp * cadence.maxHpRatio));
    return [];
  }
  if (cadence.kind === "splitHit") {
    const secondary = stableTargets(source, units, "frontmostEnemy", 2).find((candidate) => candidate.id !== target.id);
    if (!secondary) return [];
    const hit = resolveDamage({ sourceId: source.id, target: secondary, context: { sourceKind: "skill", delivery: "indirect" }, element: source.damageElement, baseDamage: source.attack * cadence.secondaryMultiplier, profile: "standard", critChance: 0 }, random);
    return damageEvents(hit, true, undefined, { kind: "passive", id: cadence.id });
  }
  if (cadence.kind === "splitPeriodic") {
    const secondary = stableTargets(source, units, "frontmostEnemy", 2).find((candidate) => candidate.id !== target.id);
    const affected = [target, ...(secondary ? [secondary] : [])];
    const events: BattleEvent[] = [];
    for (const victim of affected) {
      if (!victim.alive) continue;
      const hit = resolveDamage({ sourceId: source.id, target: victim, context: { sourceKind: "skill", delivery: "indirect" }, element: source.damageElement, baseDamage: source.attack * cadence.secondaryMultiplier, profile: "standard", critChance: 0 }, random);
      events.push(...damageEvents(hit, true, undefined, { kind: "passive", id: cadence.id }));
      addPeriodicEffect(victim, { id: cadence.id, kind: "damage", sourceId: source.id, amount: source.attack * cadence.powerPct, intervalMs: cadence.intervalMs, untilTickMs: cadence.intervalMs, remainingTicks: cadence.ticks, element: cadence.element ?? source.damageElement, attribution: { kind: "periodic", id: cadence.id } });
    }
    return events;
  }
  if (cadence.kind === "periodicDamage") {
    if (!target.alive) return [];
    addPeriodicEffect(target, { id: cadence.id, kind: "damage", sourceId: source.id, amount: source.attack * cadence.powerPct, intervalMs: cadence.intervalMs, untilTickMs: cadence.intervalMs, remainingTicks: cadence.ticks, element: cadence.element ?? source.damageElement, attribution: { kind: "periodic", id: cadence.id } });
    return [];
  }
  if (cadence.kind === "allyStatus") {
    return allyTargets(source, units, cadence.count, cadence.includeSelf).map((ally) => applyConfiguredStatus(ally, cadence.id, cadence.status, source.id));
  }
  if (cadence.kind === "allyShield") {
    const events: BattleEvent[] = [];
    for (const ally of allyTargets(source, units, cadence.count, cadence.includeSelf)) {
      if (cadence.skipWhileShielded && ally.shield > 0) continue;
      ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * cadence.maxHpRatio));
    }
    return events;
  }
  if (cadence.kind === "allyHeal") {
    const ally = allyTargets(source, units, 1, false)[0];
    if (!ally) return [];
    const amount = Math.min(ally.maxHp * cadence.maxHpRatio, source.attack * cadence.attackMultiplier);
    const healed = applyHealing(ally, amount, false).healed;
    return healed > 0 ? [{ type: "heal", sourceId: source.id, targetId: ally.id, amount: healed, attribution: { kind: "passive", id: cadence.id } }] : [];
  }
  if (!target.alive) return [];
  const hit = resolveDamage({ sourceId: source.id, target, context: { sourceKind: "skill", delivery: "indirect" }, element: source.damageElement, baseDamage: source.attack * cadence.attackMultiplier, profile: "standard", critChance: 0 }, random);
  return damageEvents(hit, true, undefined, { kind: "passive", id: cadence.id });
}

export function enemyDeathBurst(source: UnitState, units: readonly UnitState[], random: RandomSource): BattleEvent[] {
  const multiplier = combatProfileForEnemy(source).deathBurstMultiplier;
  if (!multiplier) return [];
  const targets = stableTargets(source, units, "frontmostEnemy", 1);
  const target = targets[0];
  if (!target) return [];
  const hit = resolveDamage({ sourceId: source.id, target, context: { sourceKind: "skill", delivery: "indirect" }, element: source.damageElement, baseDamage: source.attack * multiplier, profile: "proc", critChance: 0 }, random);
  return damageEvents(hit, true, undefined, { kind: "passive", id: `${source.sourceId}-death-burst` });
}

function resetEnemyActive(source: UnitState, ability: EnemyActiveAbility): void {
  source.skillPrepareMs = null;
  source.skillCastDurationMs = null;
  source.skillCastId = null;
  source.skillTargetIds = [];
  if (source.passiveFlags[PHASE_ACTIVE_PENDING] === ability.id) {
    delete source.passiveFlags[PHASE_ACTIVE_PENDING];
    const savedCooldown = source.passiveFlags[SIGNATURE_COOLDOWN_SAVED];
    source.skillTriggerMs = Number(savedCooldown ?? ("cooldownMs" in ability.trigger ? ability.trigger.cooldownMs : Number.POSITIVE_INFINITY));
    delete source.passiveFlags[SIGNATURE_COOLDOWN_SAVED];
    return;
  }
  if (ability.trigger.kind === "basicHits") {
    source.skillTriggerMs = Number.POSITIVE_INFINITY;
    return;
  }
  const phase = combatProfileForEnemy(source).healthPhase;
  const cooldownMs = "cooldownMs" in ability.trigger ? ability.trigger.cooldownMs : Number.POSITIVE_INFINITY;
  source.skillTriggerMs = phase?.activeCooldownMs && source.passiveFlags[PHASE_FLAG] ? phase.activeCooldownMs : cooldownMs;
}

export function completeEnemyActive(source: UnitState): void {
  const ability = activeEnemyAbilityFor(source);
  if (ability) resetEnemyActive(source, ability);
}

export function advanceEnemyBehavior(
  source: UnitState,
  units: readonly UnitState[],
  deltaMs: number,
  difficulty: GameDifficulty = "easy",
): BattleEvent[] {
  const events = applyEnemyHealthPhase(source, units);
  applyDifficultyHealthPhase(source, difficulty);
  const phase = combatProfileForEnemy(source).healthPhase;
  if (source.passiveFlags[SUMMON_PENDING] && phase?.summon) {
    const castId = source.skillCastId;
    if (!source.alive || isStunned(source)) {
      delete source.passiveFlags[SUMMON_PENDING];
      source.skillPrepareMs = null;
      source.skillCastDurationMs = null;
      source.skillCastId = null;
      source.skillTargetIds = [];
      if (castId) events.push({ type: "skill:cancelled", castId, sourceId: source.id, skillId: phase.id });
      return events;
    }
    if (source.skillPrepareMs !== null) {
      if (source.skillPrepareMs > 0) {
        source.skillPrepareMs = Math.max(0, source.skillPrepareMs - deltaMs);
        return events;
      }
      events.push(...summonEvents(source, phase.summon));
      if (castId) events.push({ type: "skill:resolved", castId, sourceId: source.id, skillId: phase.id, targetIds: [] });
      delete source.passiveFlags[SUMMON_PENDING];
      source.skillPrepareMs = null;
      source.skillCastDurationMs = null;
      source.skillCastId = null;
      source.skillTargetIds = [];
      source.skillTriggerMs = Number.POSITIVE_INFINITY;
      return events;
    }
  }
  const ability = activeEnemyAbilityFor(source);
  if (!ability) return events;
  if (source.skillPrepareMs !== null) {
    if (isStunned(source)) {
      const castId = source.skillCastId;
      resetEnemyActive(source, ability);
      if (castId) events.push({ type: "skill:cancelled", castId, sourceId: source.id, skillId: ability.id });
      return events;
    }
    if (source.skillPrepareMs > 0) {
      source.skillPrepareMs = Math.max(0, source.skillPrepareMs - deltaMs);
      return events;
    }
    return events;
  }
  source.skillTriggerMs -= deltaMs;
  if (source.skillTriggerMs > 0 || isStunned(source)) return events;
  const targets = selectEnemySkillTargets(source, units, ability);
  if (
    targets.length === 0
    || !targets.some(
      (target) => Math.abs(target.x - source.x) <= engageRange(source, target) + 4,
    )
  ) return events;
  source.skillCastSequence += 1;
  source.skillCastId = `${source.id}:skill:${source.skillCastSequence}`;
  source.skillCastDurationMs = ability.prepareMs;
  source.skillPrepareMs = ability.prepareMs;
  source.skillTargetIds = targets.map(({ id }) => id);
  events.push({ type: "skill:started", castId: source.skillCastId, sourceId: source.id, skillId: ability.id });
  return events;
}
