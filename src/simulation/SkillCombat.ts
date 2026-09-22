import { ENEMY_BY_ID } from "../content/enemies";
import { HERO_SKILL_BY_ID } from "../content/heroSkills";
import type { CombatAttribution, DamageElement, HitDelivery } from "./types";
import type { RandomSource } from "./RandomSource";
import {
  applyHealing,
  effectiveAttack,
  damageEvents,
  gearDamageMultiplier,
  outgoingElementMultiplier,
  resolveDamage,
} from "./CombatSystem";
import { applyStatus, getStatusMagnitude } from "./StatusSystem";
import { resolveThorns } from "./ThornsSystem";
import { HERO_BY_ID } from "../content/heroes";
import { healingMultiplier } from "./HealingSystem";
import type { HeroId } from "./types";
import type { BattleEvent, UnitState } from "./types";

export interface SkillDamageOptions {
  critChance?: number;
  critMultiplier?: number;
  element?: DamageElement;
  delivery?: HitDelivery;
  attribution?: CombatAttribution;
}

export interface SkillDamageResult {
  amount: number;
  critical: boolean;
  hit: boolean;
  died: boolean;
}

/** Source power is snapshotted by DoTs; target conditions are evaluated on each hit. */
export function targetSkillDamageMultiplier(source: UnitState, target: UnitState, skillDamage = Number(source.passiveFlags.gearSkillDamage ?? 0)): number {
  const execute = target.hp / target.maxHp < 0.35
    ? Number(source.passiveFlags.gearExecute ?? 0)
    : 0;
  const meteorPassive = HERO_SKILL_BY_ID.meteor.passive;
  const sharedHighHp = source.chosenSkillId === "meteor"
    && target.hp / target.maxHp > (meteorPassive.highHpThreshold ?? 0.7)
    ? meteorPassive.highHpDamageBonus ?? 0.15
    : 0;
  const executePassive = HERO_SKILL_BY_ID["execute-flurry"].passive;
  const sharedExecute = source.chosenSkillId === "execute-flurry"
    && target.hp / target.maxHp < (executePassive.executeThreshold ?? 0.35)
    ? executePassive.executeDamageBonus ?? 0.2
    : 0;
  const enemyKind = ENEMY_BY_ID[target.sourceId as keyof typeof ENEMY_BY_ID]?.kind;
  const elite = enemyKind === "elite" || enemyKind === "boss"
    ? Number(source.passiveFlags.gearEliteDamage ?? 0)
    : 0;
  return (1 + execute / (1 + skillDamage)) * (1 + sharedHighHp) * (1 + sharedExecute) * (1 + elite);
}

export function applyLifeSteal(source: UnitState, hpDamage: number, events: BattleEvent[]): void {
  if (source.team !== "heroes" || !source.alive) return;
  const healed = applyHealing(source, hpDamage * Number(source.passiveFlags.gearLifeStealPct ?? 0), false).healed;
  if (healed > 0) events.push({ type: "heal", sourceId: source.id, targetId: source.id, amount: healed,
    attribution: { kind: "gear", id: "life-steal" }, presentation: "silent" });
}

export function dealSkillDamage(
  source: UnitState,
  target: UnitState,
  multiplier: number,
  random: RandomSource,
  events: BattleEvent[],
  options: SkillDamageOptions = {},
): SkillDamageResult {
  const skillDamage = Number(source.passiveFlags.gearSkillDamage ?? 0);
  const skillEffect = Number(source.passiveFlags.heroSkillEffect ?? 0);
  const talentActiveDamage = Number(source.passiveFlags.talentActiveDamagePct ?? 0);
  const critMultiplier = options.critMultiplier
    ?? 1.5 + Number(source.passiveFlags.gearCritDamagePct ?? 0) / 100;
  const element = options.element ?? source.damageElement;
  const delivery = options.delivery ?? (source.attackMode === "melee" ? "contact" : "projectile");
  const result = resolveDamage({
    sourceId: source.id,
    target,
    context: { sourceKind: "skill", delivery },
    element,
    baseDamage: effectiveAttack(source)
      * multiplier
      * (1 + skillEffect)
      * (1 + skillDamage)
      * (1 + talentActiveDamage)
      * gearDamageMultiplier(source)
      * targetSkillDamageMultiplier(source, target, skillDamage)
      * outgoingElementMultiplier(source),
    profile: "standard",
    critChance: options.critChance ?? source.critChance + Number(source.passiveFlags.specCritBonus ?? 0)
      + (HERO_BY_ID[source.sourceId as HeroId]?.specId === "hunter_marksmanship"
        && source.passiveFlags.specAimTarget === target.id
        ? Math.min(0.16, Number(source.passiveFlags.specAimStacks ?? 0) * 0.04) : 0),
    critMultiplier,
    defenseReduction: getStatusMagnitude(target, "armorBreak"),
  }, random);
  if (result.outcome !== "hit") {
    return { amount: 0, critical: false, hit: false, died: false };
  }
  events.push(...damageEvents(result, false, undefined, options.attribution));
  if (source.chosenSkillId === "volley" && result.critical && target.alive) {
    const passive = HERO_SKILL_BY_ID.volley.passive;
    applyStatus(target, {
      kind: "vulnerability",
      effectId: "shared-volley-vulnerability",
      magnitude: passive.vulnerabilityMagnitude ?? 0.08,
      remainingMs: passive.vulnerabilityMs ?? 4000,
      sourceId: source.id,
    });
    events.push({ type: "status:applied", targetId: target.id, kind: "vulnerability" });
  }
  applyLifeSteal(source, result.hpDamage, events);
  const thorns = resolveThorns(source, target, result, { sourceKind: "skill", delivery }, random);
  if (thorns) events.push(...damageEvents(thorns, false));
  if (result.killed) events.push({ type: "unit:died", unitId: target.id });
  if (thorns?.killed) events.push({ type: "unit:died", unitId: source.id });
  return { amount: result.hpDamage, critical: result.critical, hit: true, died: result.killed };
}

export function healFromSkill(
  source: UnitState,
  target: UnitState,
  attackMultiplier: number,
  maxHpRatio: number,
  overflowToShield = false,
  shieldCapRatio = 0.1,
) {
  const amount = Math.max(effectiveAttack(source) * attackMultiplier, target.maxHp * maxHpRatio)
    * healingMultiplier(source);
  return applyHealing(target, amount, overflowToShield, shieldCapRatio);
}

export const livingEnemies = (source: UnitState, units: UnitState[]) =>
  units.filter((unit) => unit.alive && unit.team !== source.team);

export const livingAllies = (source: UnitState, units: UnitState[]) =>
  units.filter((unit) => unit.alive && unit.team === source.team);

export const nearestTo = (source: UnitState, units: UnitState[]) =>
  [...units].sort((a, b) => Math.abs(a.x - source.x) - Math.abs(b.x - source.x));

export const lowestHealthFirst = (units: UnitState[]) =>
  [...units].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
