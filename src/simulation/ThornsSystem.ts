import { resolveDamage, type DamageResult } from "./CombatSystem";
import type { RandomSource } from "./RandomSource";
import type { HitContext, UnitState } from "./types";

/**
 * Resolve a defender's thorns after a successful contact hit.
 * Reflection is direct damage: it cannot dodge, block, crit, proc on-hit effects,
 * or recursively trigger another thorns resolution.
 */
export function resolveThorns(
  attacker: UnitState,
  defender: UnitState,
  hit: DamageResult,
  context: HitContext,
  random: RandomSource,
): DamageResult | null {
  if (context.delivery !== "contact" || hit.outcome !== "hit" || !attacker.alive) return null;

  const thornsPct = Number(defender.passiveFlags.gearThorns ?? 0);
  const receivedDamage = hit.hpDamage + hit.absorbed;
  if (thornsPct <= 0 || receivedDamage <= 0) return null;

  const rawDamage = Math.max(1, Math.round(receivedDamage * thornsPct));
  return resolveDamage({
    sourceId: defender.id,
    target: attacker,
    context: { sourceKind: "reflected", delivery: "indirect" },
    element: "physical",
    baseDamage: rawDamage,
    profile: "reflected",
  }, random);
}
