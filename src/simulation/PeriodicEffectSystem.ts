import {
  applyHealing,
  damageEvents,
  resolveDamage,
} from "./CombatSystem";
import type { RandomSource } from "./RandomSource";
import { healCombatTarget } from "./HealingSystem";
import { applyLifeSteal, targetSkillDamageMultiplier } from "./SkillCombat";
import { getStatusMagnitude } from "./StatusSystem";
import type { BattleEvent, PeriodicEffect, UnitState } from "./types";

export function addPeriodicEffect(target: UnitState, effect: PeriodicEffect): void {
  const existingIndex = target.periodicEffects.findIndex(
    (candidate) => candidate.id === effect.id && candidate.sourceId === effect.sourceId,
  );
  if (existingIndex >= 0) target.periodicEffects[existingIndex] = { ...effect, untilTickMs: target.periodicEffects[existingIndex]!.untilTickMs };
  else target.periodicEffects.push({ ...effect });
}

export function remainingPeriodicDamage(target: UnitState, sourceId: string, id: string): number {
  const effect = target.periodicEffects.find(
    (candidate) => candidate.kind === "damage" && candidate.sourceId === sourceId && candidate.id === id,
  );
  return effect ? effect.amount * effect.remainingTicks : 0;
}

export function removePeriodicEffect(target: UnitState, sourceId: string, id: string): void {
  target.periodicEffects = target.periodicEffects.filter(
    (candidate) => candidate.sourceId !== sourceId || candidate.id !== id,
  );
}

export function tickPeriodicEffects(
  target: UnitState,
  deltaMs: number,
  random: RandomSource,
  units: readonly UnitState[] = [target],
): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const effect of target.periodicEffects) {
    effect.untilTickMs -= deltaMs;
    while (effect.remainingTicks > 0 && effect.untilTickMs <= 0 && target.alive) {
      effect.untilTickMs += effect.intervalMs;
      effect.remainingTicks -= 1;
      if (effect.kind === "heal") {
        const source = units.find((unit) => unit.id === effect.sourceId);
        if (source) {
          healCombatTarget(source, target, effect.amount, units, events, {
            attribution: effect.attribution, periodicId: effect.id,
          });
          continue;
        }
        const result = applyHealing(target, effect.amount, false);
        if (result.healed > 0) {
          events.push({
            type: "heal",
            sourceId: effect.sourceId,
            targetId: target.id,
            amount: result.healed,
            ...(effect.attribution ? { attribution: effect.attribution } : {}),
          });
        }
        continue;
      }
      const source = units.find((unit) => unit.id === effect.sourceId);
      const targetBonus = source && effect.skillDamagePct !== undefined
        ? targetSkillDamageMultiplier(source, target, effect.skillDamagePct) : 1;
      const element = effect.element ?? "physical";
      const result = resolveDamage({
        sourceId: effect.sourceId,
        target,
        context: { sourceKind: "periodic", delivery: "indirect" },
        element,
        baseDamage: effect.amount * targetBonus,
        profile: "periodic",
        critChance: 0,
        defenseReduction: getStatusMagnitude(target, "armorBreak"),
      }, random);
      events.push(...damageEvents(result, true, undefined, effect.attribution));
      if (source) applyLifeSteal(source, result.hpDamage, events);
    }
  }
  target.periodicEffects = target.periodicEffects.filter(
    (effect) => effect.remainingTicks > 0,
  );
  return events;
}
