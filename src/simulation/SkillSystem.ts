import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import { ACTIVE_SKILL_RAGE_COST } from "../content/rage";
import type { HeroId } from "./types";
import type { RandomSource } from "./RandomSource";
import { hasRage, spendRage } from "./RageSystem";
import { engageRange } from "./MovementSystem";
import {
  castSpecializationSkill,
  onAnyHeroSkillCast,
  shouldCastSpecialization,
} from "./SpecializationSkillSystem";
import { triggerSharedHeroPassivesAfterSkillCast } from "./SharedHeroPassiveSystem";
import { afterTalentActiveSkill } from "./TalentCombatSystem";
import type { BattleEvent, UnitState } from "./types";

function enemiesOf(source: UnitState, units: UnitState[]): UnitState[] {
  return units.filter((unit) => unit.alive && unit.team !== source.team);
}

export function hasEnemyInCastRange(source: UnitState, units: UnitState[]): boolean {
  return enemiesOf(source, units).some(
    (enemy) => Math.abs(enemy.x - source.x) <= engageRange(source, enemy) + 4,
  );
}

function applyFirstCastShield(source: UnitState): void {
  const stormward = Number(source.passiveFlags.gearStormward ?? 0);
  if (stormward <= 0 || source.passiveFlags.gearStormwardUsed) return;
  source.shield += Math.round(source.maxHp * stormward);
  source.passiveFlags.gearStormwardUsed = true;
}

export function tryCastSkill(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): BattleEvent[] {
  if (!source.alive || !source.sourceId.startsWith("H")) return [];
  const heroId = source.sourceId as HeroId;
  const definition = ACTIVE_SKILL_BY_HERO[heroId];
  if (!definition) return [];
  const rageCost = definition.rageCost ?? ACTIVE_SKILL_RAGE_COST;
  if (!hasRage(source, rageCost)) return [];
  if (!shouldCastSpecialization(source, units)) return [];
  const alreadyStarted = source.skillCastId !== null;
  if (!alreadyStarted && !hasEnemyInCastRange(source, units)) return [];
  if (!alreadyStarted) {
    source.skillCastSequence += 1;
    source.skillCastId = `${source.id}:skill:${source.skillCastSequence}`;
  }
  const castId = source.skillCastId!;
  spendRage(source, rageCost);
  const resolved = castSpecializationSkill(source, units, random);
  if (!resolved) {
    source.rage = Math.min(source.maxRage, source.rage + rageCost);
    if (!alreadyStarted) source.skillCastId = null;
    return [];
  }
  const effectEvents: BattleEvent[] = [...resolved.events];
  afterTalentActiveSkill(source, resolved.targetIds, units, effectEvents);
  source.skillPrepareMs = null;
  source.skillCastDurationMs = null;
  source.skillCastId = null;
  source.skillTargetIds = [];
  applyFirstCastShield(source);
  source.skillCastCount += 1;
  onAnyHeroSkillCast(source, units);
  effectEvents.push(...triggerSharedHeroPassivesAfterSkillCast(source, units));
  const events: BattleEvent[] = [];
  if (!alreadyStarted) {
    events.push({
      type: "skill:started",
      castId,
      sourceId: source.id,
      skillId: definition.id,
    });
  }
  events.push({
    type: "skill:resolved",
    castId,
    sourceId: source.id,
    skillId: definition.id,
    targetIds: resolved.targetIds,
  });
  events.push(...effectEvents.map((event): BattleEvent => {
    if (
      event.type === "damage"
      && event.sourceId === source.id
      && !event.attackId
      && !event.attribution
    ) {
      return { ...event, skillCastId: castId };
    }
    if (
      event.type === "heal"
      && event.sourceId === source.id
      && !event.attribution
    ) {
      return { ...event, skillCastId: castId };
    }
    if (event.type === "unit:died" && resolved.targetIds.includes(event.unitId)) {
      return { ...event, skillCastId: castId };
    }
    return event;
  }));
  return events;
}

export function tryCastReadySkill(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): BattleEvent[] {
  if (source.skillPrepareMs !== 0) return [];
  const castId = source.skillCastId;
  const events = tryCastSkill(source, units, random);
  if (events.length > 0 || !castId) return events;

  const definition = ACTIVE_SKILL_BY_HERO[source.sourceId as HeroId];
  source.skillPrepareMs = null;
  source.skillCastDurationMs = null;
  source.skillCastId = null;
  source.skillTargetIds = [];
  return definition
    ? [{
        type: "skill:cancelled",
        castId,
        sourceId: source.id,
        skillId: definition.id,
      }]
    : [];
}
