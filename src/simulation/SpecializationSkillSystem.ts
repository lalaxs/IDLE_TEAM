import { HERO_BY_ID } from "../content/heroes";
import { ACTIVE_SKILL_RAGE_COST } from "../content/rage";
import type { SpecId } from "../content/specializations";
import type { HeroId } from "./types";
import type { RandomSource } from "./RandomSource";
import { applyHealing, damageEvents, effectiveAttack, gearDamageMultiplier, outgoingElementMultiplier, resolveDamage } from "./CombatSystem";
import { ensureBeacon, healCombatTarget, healingMultiplier } from "./HealingSystem";
import { consumeRecentDamage, recentDamage, specializationState, specializationTalent } from "./SpecializationState";
import { engageRange } from "./MovementSystem";
import {
  addPeriodicEffect,
  removePeriodicEffect,
} from "./PeriodicEffectSystem";
import {
  dealSkillDamage,
  livingAllies,
  livingEnemies,
  lowestHealthFirst,
  nearestTo,
  type SkillDamageResult,
} from "./SkillCombat";
import { applyStatus, getStatusMagnitude, isStunned } from "./StatusSystem";
import { gainRage, spendRage } from "./RageSystem";
import type { BattleEvent, CombatAttribution, StatusKind, UnitState } from "./types";

interface CastContext {
  source: UnitState;
  units: UnitState[];
  random: RandomSource;
  events: BattleEvent[];
  targetIds: string[];
  enemies: UnitState[];
  allies: UnitState[];
  nearest: UnitState[];
  attribution?: CombatAttribution;
}

type SpecCaster = (context: CastContext) => boolean;

const POSITIVE_SKILL_STATUSES = new Set<StatusKind>(["haste", "damageReduction", "mirageGuard"]);
const TANK_TAUNT_MS = 3000;

function skillEffectMultiplier(source: UnitState): number {
  return 1 + Number(source.passiveFlags.heroSkillEffect ?? 0);
}

function recordTarget(context: CastContext, target: UnitState): void {
  if (!context.targetIds.includes(target.id)) context.targetIds.push(target.id);
}

function hit(
  context: CastContext,
  target: UnitState | undefined,
  multiplier: number,
  options: Parameters<typeof dealSkillDamage>[5] = {},
): SkillDamageResult {
  if (!context.source.alive || !target?.alive) return { amount: 0, critical: false, hit: false, died: false };
  recordTarget(context, target);
  return dealSkillDamage(
    context.source,
    target,
    multiplier,
    context.random,
    context.events,
    { ...options, attribution: options.attribution ?? context.attribution },
  );
}

function activeSkillAttribution(source: UnitState): CombatAttribution | undefined {
  const specId = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  return specId ? { kind: "activeSkill", id: `${specId}-active` } : undefined;
}

function heal(
  context: CastContext,
  target: UnitState | undefined,
  attackMultiplier: number,
  maxHpRatio: number,
  overflowToShield = false,
  shieldCapRatio = 0.1,
): number {
  if (!target?.alive) return 0;
  recordTarget(context, target);
  return healCombatTarget(context.source, target,
    Math.max(effectiveAttack(context.source) * attackMultiplier, target.maxHp * maxHpRatio)
      * healingMultiplier(context.source), context.units, context.events,
    { attribution: context.attribution, overflowShield: overflowToShield ? shieldCapRatio : undefined });
}

function addStatus(
  context: CastContext,
  target: UnitState,
  kind: StatusKind,
  magnitude: number,
  remainingMs: number,
  effectId: string,
): void {
  const scaledMagnitude = target.team === context.source.team && POSITIVE_SKILL_STATUSES.has(kind)
    ? magnitude * skillEffectMultiplier(context.source)
    : magnitude;
  applyStatus(target, { kind, effectId, magnitude: scaledMagnitude, remainingMs, sourceId: context.source.id });
  context.events.push({ type: "status:applied", targetId: target.id, kind });
}

function taunt(context: CastContext, targets: readonly UnitState[]): void {
  for (const target of targets) {
    if (!target.alive || target.team === context.source.team) continue;
    target.statuses = target.statuses.filter(({ kind }) => kind !== "taunt");
    addStatus(context, target, "taunt", 1, TANK_TAUNT_MS, "tank-taunt");
  }
}

function periodicRawDamage(source: UnitState, multiplier: number): number {
  return effectiveAttack(source)
    * multiplier
    * skillEffectMultiplier(source)
    * (1 + Number(source.passiveFlags.gearSkillDamage ?? 0))
    * (1 + Number(source.passiveFlags.talentActiveDamagePct ?? 0))
    * gearDamageMultiplier(source)
    * outgoingElementMultiplier(source);
}

function addDot(
  context: CastContext,
  target: UnitState,
  id: string,
  multiplier: number,
  ticks: number,
  intervalMs: number,
): void {
  if (id === "unholy-disease") target.passiveFlags[`specDisease:${context.source.id}`] = ticks * intervalMs;
  addPeriodicEffect(target, {
    id,
    kind: "damage",
    sourceId: context.source.id,
    amount: periodicRawDamage(context.source, multiplier),
    skillDamagePct: Number(context.source.passiveFlags.gearSkillDamage ?? 0),
    intervalMs,
    untilTickMs: intervalMs,
    remainingTicks: ticks,
    element: context.source.damageElement,
    attribution: context.attribution ?? activeSkillAttribution(context.source),
  });
  recordTarget(context, target);
}

function addHot(
  context: CastContext,
  target: UnitState,
  id: string,
  maxHpRatioPerTick: number,
  ticks: number,
  intervalMs: number,
): void {
  const healPower = (1 + Number(context.source.passiveFlags.gearHealPowerPct ?? 0))
    * (1 + Number(context.source.passiveFlags.talentActiveHealPct ?? 0))
    * skillEffectMultiplier(context.source);
  addPeriodicEffect(target, {
    id,
    kind: "heal",
    sourceId: context.source.id,
    amount: target.maxHp * maxHpRatioPerTick * healPower,
    intervalMs,
    untilTickMs: intervalMs,
    remainingTicks: ticks,
    attribution: context.attribution ?? activeSkillAttribution(context.source),
  });
  recordTarget(context, target);
}

function nearestEnemy(context: CastContext): UnitState | undefined {
  return context.nearest[0];
}

function lowestEnemy(context: CastContext): UnitState | undefined {
  return lowestHealthFirst(context.enemies)[0];
}

function lowestAlly(context: CastContext): UnitState {
  return lowestHealthFirst(context.allies)[0] ?? context.source;
}

function teleportToTarget(source: UnitState, target: UnitState): void {
  source.x = Math.max(source.x, target.x - engageRange(source, target));
}

function ownEffect(source: UnitState, target: UnitState, id: string) {
  return target.periodicEffects.find((effect) => effect.sourceId === source.id && effect.id === id);
}

function sustainedTarget(context: CastContext, effectId: string): UnitState | undefined {
  const reachable = context.nearest.filter((enemy) => Math.abs(enemy.x - context.source.x) <= engageRange(context.source, enemy) + 4);
  return reachable.find((enemy) => ownEffect(context.source, enemy, effectId))
    ?? reachable.sort((a, b) => b.hp - a.hp)[0];
}

function advanceWindwalkerCombo(context: CastContext, target: UnitState): void {
  const step = Number(context.source.passiveFlags.specComboStep ?? 0);
  if (step <= 0) return;
  const last = step === 2;
  if (last && specializationTalent(context.source, 2)) {
    target = context.nearest.find((enemy) => enemy.id !== context.source.passiveFlags.specComboTarget) ?? target;
    teleportToTarget(context.source, target);
  }
  hit(context, target, last ? (specializationTalent(context.source, 1) ? 1.4 : 1.0) : 0.6);
  if (!last && target.alive) addStatus(context, target, "vulnerability", 0.1, 3000, "windwalker-pressure");
  if (last) {
    gainRage(context.source, 5);
    if (specializationTalent(context.source, 1)) context.source.passiveFlags.specComboQuick = true;
    if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 100)) hit(context, enemy, 0.7);
    if (specializationTalent(context.source, 3)) {
      const ally = lowestAlly(context);
      ally.shield += Math.round(ally.maxHp * 0.08 * skillEffectMultiplier(context.source));
      gainRage(ally, 6);
    }
    for (const enemy of context.enemies) enemy.statuses = enemy.statuses.filter((status) => status.effectId !== "windwalker-pressure" || status.sourceId !== context.source.id);
  }
  context.source.passiveFlags.specComboStep = last ? 0 : 2;
  if (last) context.source.passiveFlags.specComboRemainingMs = 0;
}

function restorationTargets(source: UnitState, allies: UnitState[]): UnitState[] {
  if (specializationTalent(source, 1)) {
    const tank = allies.filter((ally) => HERO_BY_ID[ally.sourceId as HeroId]?.expeditionRole === "tank").sort((a, b) => b.x - a.x)[0];
    return tank ? [tank] : lowestHealthFirst(allies).slice(0, 1);
  }
  return [...allies].sort((a, b) => {
    const danger = Number(b.hp / b.maxHp < 0.35) - Number(a.hp / a.maxHp < 0.35);
    if (danger) return danger;
    if (a.hp / a.maxHp < 0.35) return a.hp / a.maxHp - b.hp / b.maxHp;
    const aHot = ownEffect(source, a, "restoration-hot");
    const bHot = ownEffect(source, b, "restoration-hot");
    return Number(Boolean(aHot)) - Number(Boolean(bHot)) || (aHot && bHot ? aHot.remainingTicks - bHot.remainingTicks : a.hp / a.maxHp - b.hp / b.maxHp);
  }).slice(0, specializationTalent(source, 2) ? 3 : 2);
}

function augmentationTarget(source: UnitState, allies: UnitState[]): UnitState | undefined {
  const eligible = allies.filter((ally) => ally.alive && ally.team === source.team && ally.id !== source.id);
  const preferred = eligible.find((ally) => ally.sourceId === source.passiveFlags.augmentationTargetId);
  if (preferred) return preferred;
  return eligible.sort((a, b) =>
    Number(HERO_BY_ID[b.sourceId as HeroId]?.expeditionRole === "damage")
      - Number(HERO_BY_ID[a.sourceId as HeroId]?.expeditionRole === "damage")
    || b.attack - a.attack || a.id.localeCompare(b.id))[0];
}

export function shouldCastSpecialization(source: UnitState, units: readonly UnitState[]): boolean {
  if (source.specialization?.channel) return false;
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  if ((spec === "mage_fire" || spec === "warlock_destruction") && specializationTalent(source, 1)) {
    const ready = spec === "mage_fire" ? Boolean(source.passiveFlags.specHotStreak && source.passiveFlags.specHotStreakReserve)
      : Number(source.passiveFlags.specEmbers ?? 0) >= 2;
    return Boolean(source.skillCastId) || ready || source.rage >= source.maxRage - 10
      || units.some((unit) => unit.alive && unit.team !== source.team && unit.hp / unit.maxHp < 0.35);
  }
  if (spec === "warrior_fury" && specializationTalent(source, 3)) {
    return Boolean(source.skillCastId) || source.rage >= ACTIVE_SKILL_RAGE_COST + 20
      || units.some((unit) => unit.alive && unit.team !== source.team && unit.hp / unit.maxHp < 0.35);
  }
  if (spec === "monk_brewmaster") {
    if (source.skillCastId || source.skillCastCount === 0) return true;
    const debt = Number(source.passiveFlags.specStaggerPool ?? 0);
    const nearby = units.filter((enemy) => enemy.alive && enemy.team !== source.team
      && Math.abs(enemy.x - source.x) <= engageRange(source, enemy) + 4);
    const threatened = nearby.some((enemy) => allies.some((ally) => ally.id !== source.id && ally.id === enemy.targetId));
    const incomingSoon = nearby.some((enemy) => enemy.targetId === source.id && enemy.attackCooldownMs <= 1200
      && !enemy.statuses.some((status) => status.kind === "stun" && status.remainingMs > 0));
    return threatened || debt >= source.maxHp * 0.08 || (debt > 0 && source.hp / source.maxHp < 0.5)
      || !incomingSoon || source.rage >= source.maxRage - 10 || Number(source.passiveFlags.specBrewWaitMs ?? 0) >= 1200;
  }
  if (spec === "druid_restoration") return restorationTargets(source, allies).some((ally) => ally.hp < ally.maxHp
    || !ownEffect(source, ally, "restoration-hot") || ownEffect(source, ally, "restoration-hot")!.remainingTicks <= 2);
  if (spec === "mage_arcane") {
    if (Number(source.passiveFlags.specArcaneSurgeMs ?? 0) > 0) return false;
    const charges = Number(source.passiveFlags.specArcaneCharges ?? 0);
    const enemies = units.filter((unit) => unit.alive && unit.team !== source.team);
    return charges >= 4 || (charges >= 2 && (specializationTalent(source, 3)
      || (specializationTalent(source, 2) && enemies.length >= 2) || enemies.some((enemy) => enemy.hp / enemy.maxHp < 0.35)));
  }
  if (spec === "monk_windwalker" && Number(source.passiveFlags.specComboStep ?? 0) > 0) return false;
  if (spec === "warlock_affliction") return units.some((unit) => unit.alive && unit.team !== source.team
    && (!ownEffect(source, unit, "affliction-rot") || ownEffect(source, unit, "affliction-rot")!.remainingTicks <= 2));
  if (spec === "monk_mistweaver") return allies.some((ally) => ally.hp < ally.maxHp)
    || Number(source.passiveFlags.specMistWindowMs ?? 0) < 1000;
  if (spec === "evoker_preservation" || spec === "paladin_holy" || spec === "shaman_restoration") {
    return allies.some((ally) => ally.hp < ally.maxHp);
  }
  if (spec === "priest_holy") return allies.some((ally) => ally.hp / ally.maxHp < 0.7)
    || allies.filter((ally) => ally.hp < ally.maxHp).length >= 2;
  return true;
}

export function specializationCastTime(source: UnitState, baseMs: number): number {
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  if (spec === "evoker_devastation" && source.passiveFlags.specDragonQuick) return Math.round(baseMs * 0.6);
  if (spec === "monk_windwalker" && source.passiveFlags.specComboQuick) return Math.round(baseMs * 0.5);
  if (spec === "mage_fire" && specializationTalent(source, 3) && source.passiveFlags.specHotStreak) return Math.round(baseMs * 0.5);
  if (spec === "mage_frost" && source.passiveFlags.specFrostQuick) return Math.round(baseMs * 0.5);
  if (spec === "warlock_destruction" && Number(source.passiveFlags.specEmbers ?? 0) > 0) {
    if (specializationTalent(source, 1)) return Math.round(baseMs * 1.3);
    if (specializationTalent(source, 3)) return Math.round(baseMs * 0.7);
  }
  return baseMs;
}

const CASTERS: Record<SpecId, SpecCaster> = {
  death_knight_blood(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    hit(context, target, 1.6);
    taunt(context, [target]);
    const recent = recentDamage(context.source);
    const recovery = Math.max(context.source.maxHp * 0.06, recent * (specializationTalent(context.source, 1) ? 0.5 : 0.35));
    healCombatTarget(context.source, context.source, recovery * healingMultiplier(context.source), context.units, context.events,
      { overflowShield: specializationTalent(context.source, 3) ? 0.2 : 0.12 });
    consumeRecentDamage(context.source, recent);
    if (specializationTalent(context.source, 2)) {
      const ally = lowestHealthFirst(context.allies.filter((unit) => unit.id !== context.source.id))[0];
      if (ally) heal(context, ally, 0, 0.04);
    }
    return true;
  },
  death_knight_frost(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const killing = Boolean(context.source.passiveFlags.specKillingMachine);
    hit(context, target, 1.05);
    hit(context, target, killing ? (specializationTalent(context.source, 1) ? 1.95 : 1.55) : 1.05,
      killing ? { critChance: 1 } : {});
    if (killing) {
      context.source.passiveFlags.specKillingMachine = false;
      if (target.alive) addStatus(context, target, "stun", 1, specializationTalent(context.source, 3) ? 1000 : 600, "frost-mark-freeze");
      if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.filter((unit) => unit.id !== target.id).slice(0, 2)) hit(context, enemy, 0.6);
    }
    return true;
  },
  death_knight_unholy(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const key = `specWound:${context.source.id}`;
    const wounds = Number(target.passiveFlags[key] ?? 0);
    hit(context, target, 1.7 + wounds * (specializationTalent(context.source, 1) ? 0.55 : 0.4));
    target.passiveFlags[key] = 0;
    if (target.alive) addDot(context, target, "unholy-disease", 0.35, 6, 1000);
    for (const splash of context.enemies.filter((enemy) => enemy.id !== target.id && Math.abs(enemy.x - target.x) <= 140)
      .slice(0, specializationTalent(context.source, 2) ? 2 : 1)) addDot(context, splash, "unholy-disease", 0.175, 6, 1000);
    if (specializationTalent(context.source, 3)) heal(context, context.source, wounds * 0.25, 0);
    return true;
  },
  demon_hunter_havoc(context) {
    const target = lowestEnemy(context);
    if (!target) return false;
    teleportToTarget(context.source, target);
    const victims = context.enemies.filter((enemy) => Math.abs(enemy.x - target.x) <= 90);
    for (let index = 0; index < 3; index += 1) {
      for (const victim of victims) hit(context, victim, specializationTalent(context.source, 2) ? 0.8 : 0.7);
    }
    if (victims.length >= 2) addStatus(context, context.source, "haste", 0.2, 3000, "havoc-momentum");
    if (specializationTalent(context.source, 3)) addStatus(context, context.source, "damageReduction", 0.15, 3000, "havoc-guard");
    return true;
  },
  demon_hunter_vengeance(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    hit(context, target, 1.5);
    taunt(context, [target]);
    const fragments = Number(context.source.passiveFlags.specFragments ?? 0);
    heal(context, context.source, 0, 0.03 + fragments * 0.025);
    context.source.passiveFlags.specFragments = 0;
    addStatus(context, context.source, "damageReduction", 0.06 + fragments * 0.02,
      specializationTalent(context.source, 3) ? 5000 : 3000, "vengeance-demon-skin");
    if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 100)) hit(context, enemy, fragments * 0.3);
    return true;
  },
  demon_hunter_devourer(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const available = Math.min(3, Number(context.source.passiveFlags.specSouls ?? 0));
    const shortChannel = specializationTalent(context.source, 3);
    const souls = shortChannel ? Math.min(1, available) : available;
    const ticks = (shortChannel ? 2 : 4) + souls;
    specializationState(context.source).channel = { targetId: target.id, ticks, totalTicks: ticks, untilTickMs: 500,
      multiplier: specializationTalent(context.source, 1) ? 0.85 : shortChannel ? 1 : 0.9 };
    recordTarget(context, target);
    context.source.passiveFlags.specSouls = available - souls;
    if (specializationTalent(context.source, 3)) addStatus(context, context.source, "damageReduction", 0.2, ticks * 500, "devourer-channel-guard");
    return true;
  },
  druid_balance(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const moon = Boolean(context.source.passiveFlags.specBalanceMoon);
    if (moon) {
      for (const enemy of context.enemies.filter((unit) => Math.abs(unit.x - target.x) <= 100)) {
        hit(context, enemy, (specializationTalent(context.source, 2) ? 1.9 : 1.6));
        if (enemy.alive) addStatus(context, enemy, "slow", 0.25, 3000, "balance-moon-slow");
      }
    } else {
      hit(context, target, (specializationTalent(context.source, 1) ? 2.6 : 2.1));
      for (const enemy of context.enemies.filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 90)) {
        hit(context, enemy, 0.95);
      }
    }
    context.source.passiveFlags.specBalanceMoon = !moon;
    if (specializationTalent(context.source, 3)) heal(context, lowestAlly(context), 0, 0.04);
    return true;
  },
  druid_feral(context) {
    const target = sustainedTarget(context, "feral-bleed");
    if (!target) return false;
    teleportToTarget(context.source, target);
    const carry = Math.min(2, ownEffect(context.source, target, "feral-bleed")?.remainingTicks ?? 0);
    hit(context, target, 1.2);
    if (target.alive) addDot(context, target, "feral-bleed", specializationTalent(context.source, 1) ? 0.32 : 0.25, 6 + carry, 1000);
    return true;
  },
  druid_guardian(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const victims = context.enemies.filter((enemy) => Math.abs(enemy.x - target.x) <= 95);
    const resolved = victims.length > 0 ? victims : [target];
    for (const victim of resolved) hit(context, victim, 1.5);
    taunt(context, resolved);
    context.source.shield += Math.round(context.source.maxHp * 0.08 * skillEffectMultiplier(context.source));
    addStatus(context, context.source, "damageReduction", Math.min(0.1, resolved.length * 0.02), 4000, "guardian-ironfur");
    if (specializationTalent(context.source, 2)) for (const ally of context.allies.filter((unit) => Math.abs(unit.x - context.source.x) <= 120 && unit.id !== context.source.id)) ally.shield += Math.round(ally.maxHp * 0.04);
    if (specializationTalent(context.source, 3)) heal(context, context.source, 0, 0.02 * Math.min(5, resolved.length));
    return true;
  },
  druid_restoration(context) {
    const targets = restorationTargets(context.source, context.allies);
    const count = specializationTalent(context.source, 1) ? 1 : specializationTalent(context.source, 2) ? 3 : 2;
    for (const target of targets) {
      heal(context, target, 0.8, 0.04);
      addHot(context, target, "restoration-hot", count === 1 ? 0.045 : count === 3 ? 0.017 : 0.025, 6, 1000);
    }
    return true;
  },
  evoker_devastation(context) {
    const reach = specializationTalent(context.source, 2) ? 180 : 80;
    const victims = context.nearest.filter((enemy) => enemy.x >= context.source.x
      && enemy.x - context.source.x <= engageRange(context.source, enemy) + reach);
    for (const [index, target] of victims.entries()) hit(context, target,
      index === 0 ? (specializationTalent(context.source, 1) ? 2.7 : 2.1) : 1.3);
    context.source.passiveFlags.specDragonQuick = victims.length >= 2;
    if (specializationTalent(context.source, 3)) context.source.shield += Math.round(context.source.maxHp * 0.06 * victims.length);
    return victims.length > 0;
  },
  evoker_preservation(context) {
    const targets = context.allies.filter((ally) => ally.hp < ally.maxHp).sort((a, b) => recentDamage(b) - recentDamage(a)
      || a.hp / a.maxHp - b.hp / b.maxHp).slice(0, specializationTalent(context.source, 2) ? 2 : 1);
    for (const target of targets) {
      const recorded = recentDamage(target);
      const rewind = Math.min(target.maxHp * 0.2, recorded * (specializationTalent(context.source, 1) ? 0.65 : 0.5));
      const amount = (Math.max(effectiveAttack(context.source) * 1.5, target.maxHp * 0.07) + rewind)
        * healingMultiplier(context.source) * (targets.length > 1 ? 0.65 : 1);
      healCombatTarget(context.source, target, amount, context.units, context.events);
      consumeRecentDamage(target, recorded);
      recordTarget(context, target);
      if (specializationTalent(context.source, 3)) addStatus(context, target, "damageReduction", 0.12, 3000, "preservation-shelter");
    }
    return true;
  },
  evoker_augmentation(context) {
    const target = nearestEnemy(context);
    if (target) hit(context, target, 1.3);
    const ally = augmentationTarget(context.source, context.allies);
    if (ally) {
      ally.passiveFlags.specAttackBuffPct = (specializationTalent(context.source, 1) ? 0.16 : 0.12) * skillEffectMultiplier(context.source);
      ally.passiveFlags.specAugmentRemainingMs = 5000;
      ally.passiveFlags.specAugmentExtensionMs = 0;
      ally.passiveFlags.specAugmentSourceId = context.source.id;
      recordTarget(context, ally);
    }
    return Boolean(target || ally);
  },
  hunter_beast_mastery(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    if (context.source.passiveFlags.specHuntTarget !== target.id) context.source.passiveFlags.specHuntFocus = 0;
    context.source.passiveFlags.specHuntTarget = target.id;
    context.source.passiveFlags.specBeastFrenzyMs = 5000;
    hit(context, target, 1.3);
    if (specializationTalent(context.source, 3)) addStatus(context, context.source, "damageReduction", 0.08, 5000, "beast-resilience");
    return true;
  },
  hunter_marksmanship(context) {
    const target = context.enemies.find((enemy) => enemy.id === context.source.passiveFlags.specAimTarget) ?? nearestEnemy(context);
    if (!target) return false;
    const distance = Math.abs(target.x - context.source.x);
    const distanceAmp = 1 + Math.min(0.25, Math.max(0, distance - 80) / 760);
    hit(context, target, 2.3 * distanceAmp * (specializationTalent(context.source, 1)
      && context.source.passiveFlags.specAimTarget === target.id ? 1.2 : 1));
    if (specializationTalent(context.source, 2)) {
      const second = context.nearest.find((enemy) => enemy.id !== target.id);
      if (second) hit(context, second, 1.0);
    }
    if (specializationTalent(context.source, 3) && Number(context.source.passiveFlags.specAimStacks ?? 0) >= 4 && context.source.passiveFlags.specAimTarget === target.id) {
      context.source.passiveFlags.specAimStacks = 2;
      if (target.alive) addStatus(context, target, "slow", 0.35, 4000, "marksman-suppression");
      const tank = context.allies.filter((ally) => ally.id !== context.source.id && HERO_BY_ID[ally.sourceId as HeroId]?.expeditionRole === "tank").sort((a, b) => b.x - a.x)[0];
      if (tank) gainRage(tank, 8);
    }
    return true;
  },
  hunter_survival(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    teleportToTarget(context.source, target);
    const empowered = Boolean(context.source.passiveFlags.specTrapReady);
    hit(context, target, empowered ? 2.3 : 1.7);
    context.source.passiveFlags.specTrapReady = false;
    if (!specializationState(context.source).trap) {
      const radius = specializationTalent(context.source, 2) ? 140 : 80;
      const timed = specializationTalent(context.source, 1);
      const x = timed ? target.x : target.x + 100;
      specializationState(context.source).trap = { x, remainingMs: 6000, armMs: timed ? 1500 : 750,
        occupantIds: context.enemies.filter((enemy) => Math.abs(enemy.x - x) <= radius).map((enemy) => enemy.id) };
    }
    return true;
  },
  mage_arcane(context) {
    const available = Math.min(4, Number(context.source.passiveFlags.specArcaneCharges ?? 0));
    const split = specializationTalent(context.source, 2) && context.enemies.length >= 2;
    const conserve = specializationTalent(context.source, 3);
    const charges = split || conserve ? Math.min(2, available) : available;
    if (!nearestEnemy(context)) return false;
    hit(context, nearestEnemy(context), 1.6 + charges * 0.3);
    if (split) for (const enemy of context.nearest.slice(1, 3)) hit(context, enemy, charges * 0.3);
    if (conserve) gainRage(context.source, charges * 6);
    if (charges === 4) context.source.passiveFlags.specArcaneSurgeMs = specializationTalent(context.source, 1) ? 6000 : 4000;
    context.source.passiveFlags.specArcaneCharges = available - charges;
    return true;
  },
  mage_fire(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const hotStreak = Boolean(context.source.passiveFlags.specHotStreak);
    const charges = Number(hotStreak) + Number(Boolean(context.source.passiveFlags.specHotStreakReserve));
    context.source.passiveFlags.specHotStreak = false;
    context.source.passiveFlags.specHotStreakReserve = false;
    const result = hit(context, target, specializationTalent(context.source, 1) ? 1.9 + charges * 0.9 : hotStreak ? 2.5 : 1.9);
    if (target.alive) addDot(context, target, "fire-ignite", 0.3, 3, 1000);
    if (result.critical || hotStreak) {
      for (const enemy of context.enemies
        .filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 100)
        .slice(0, specializationTalent(context.source, 2) ? 3 : 2)) addDot(context, enemy, "fire-ignite", 0.3, 3, 1000);
    }
    if (specializationTalent(context.source, 3) && hotStreak) {
      context.source.shield += Math.round(context.source.maxHp * 0.08);
      gainRage(context.source, 6);
    }
    return true;
  },
  mage_frost(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    context.source.passiveFlags.specFrostQuick = false;
    let frozenTarget: UnitState | undefined;
    for (const enemy of context.enemies.filter((unit) => Math.abs(unit.x - target.x) <= 90)) {
      const chilled = context.source.passiveFlags.specChillTarget === enemy.id && Number(context.source.passiveFlags.specChillStacks ?? 0) >= 2;
      const alreadySlowed = chilled || getStatusMagnitude(enemy, "slow") > 0 || getStatusMagnitude(enemy, "stun") > 0;
      hit(context, enemy, alreadySlowed ? 2.0 : 1.5);
      if (alreadySlowed && enemy.alive) {
        addStatus(context, enemy, "stun", 1, specializationTalent(context.source, 2) ? 1200 : 800, "frost-nova-freeze");
        if (!frozenTarget || enemy.id === target.id) frozenTarget = enemy;
        enemy.passiveFlags[`specFrozen:${context.source.id}`] = 2500;
      }
      if (enemy.alive) addStatus(context, enemy, "slow", 0.35, 3000, "frost-nova-slow");
    }
    if (frozenTarget) {
      context.source.passiveFlags.specShatterTarget = frozenTarget.id;
      context.source.passiveFlags.specShatterRemainingMs = 2500;
    }
    context.source.passiveFlags.specChillStacks = 0;
    return true;
  },
  monk_brewmaster(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const victims = context.enemies.filter((enemy) => Math.abs(enemy.x - target.x) <= 90);
    const resolved = victims.length > 0 ? victims : [target];
    for (const victim of resolved) hit(context, victim, 1.4);
    taunt(context, resolved);
    const retained = specializationTalent(context.source, 3) ? 0.5 : 0.6;
    const hadStagger = specializationState(context.source).stagger.some((entry) => entry.amount > 0);
    context.source.passiveFlags.specBrewWaitMs = 0;
    for (const entry of specializationState(context.source).stagger) entry.amount *= retained;
    context.source.passiveFlags.specStaggerPool = specializationState(context.source).stagger.reduce((sum, entry) => sum + entry.amount, 0);
    if (specializationTalent(context.source, 3) && hadStagger) addStatus(context, context.source, "damageReduction", 0.12, 3000, "brew-purified-guard");
    if (specializationTalent(context.source, 2)) for (const ally of context.allies.filter((unit) => Math.abs(unit.x - context.source.x) <= 120)) addStatus(context, ally, "damageReduction", 0.08, 3000, "brew-shared-guard");
    return true;
  },
  monk_mistweaver(context) {
    const target = lowestAlly(context);
    heal(context, target, 2.2, 0.11);
    context.source.passiveFlags.specMistWindowMs = specializationTalent(context.source, 1) ? 7000 : 5000;
    return true;
  },
  monk_windwalker(context) {
    const target = lowestEnemy(context);
    if (!target) return false;
    teleportToTarget(context.source, target);
    hit(context, target, 1.0);
    context.source.passiveFlags.specComboQuick = false;
    context.source.passiveFlags.specComboStep = 1;
    context.source.passiveFlags.specComboTarget = target.id;
    context.source.passiveFlags.specComboRemainingMs = 5000;
    return true;
  },
  paladin_holy(context) {
    ensureBeacon(context.source, context.units);
    const target = lowestAlly(context);
    heal(context, target, 2.5, 0.12);
    return true;
  },
  paladin_protection(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    hit(context, target, 1.5);
    if (target.alive) addStatus(context, target, "stun", 1, 600, "protection-shield-stun");
    taunt(context, [target]);
    addStatus(context, context.source, "damageReduction", 0.12, 4000, "protection-consecration-dr");
    for (const ally of context.allies.filter((unit) => unit.id !== context.source.id && Math.abs(unit.x - context.source.x) <= (specializationTalent(context.source, 2) ? 220 : 120))) {
      addStatus(context, ally, "damageReduction", specializationTalent(context.source, 1) ? 0.1 : 0.06, 4000, "protection-consecration-dr");
      recordTarget(context, ally);
      if (specializationTalent(context.source, 3)) ally.shield += Math.round(ally.maxHp * 0.04);
    }
    return true;
  },
  paladin_retribution(context) {
    const target = selectSpecializationTarget(context.source, context.units) ?? nearestEnemy(context);
    if (!target) return false;
    const key = `specJudgment:${context.source.id}`;
    const marked = Number(target.passiveFlags[key] ?? 0) > 0;
    hit(context, target, marked ? 2.8 : 1.9);
    target.passiveFlags[key] = marked ? 0 : 6000;
    if (marked && specializationTalent(context.source, 1)) context.source.passiveFlags.specVerdictEcho = true;
    if (marked && specializationTalent(context.source, 2)) {
      for (const enemy of context.nearest.filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 140).slice(0, 2)) {
        hit(context, enemy, 0.8);
        if (enemy.alive) enemy.passiveFlags[key] = 6000;
      }
    }
    if (marked && specializationTalent(context.source, 3)) {
      heal(context, lowestAlly(context), 0, 0.03);
      context.source.passiveFlags.specMercyAttacks = 3;
    }
    return true;
  },
  priest_discipline(context) {
    const result = hit(context, nearestEnemy(context), 1.7);
    const target = lowestAlly(context);
    if (result.hit) {
      healCombatTarget(context.source, target, result.amount * 0.6 * healingMultiplier(context.source), context.units, context.events, { overflowShield: 0.1 });
      recordTarget(context, target);
      target.passiveFlags[`specAtonement:${context.source.id}`] = 6000;
      if (specializationTalent(context.source, 2)) {
        const second = lowestHealthFirst(context.allies.filter((ally) => ally.id !== target.id))[0];
        if (second) second.passiveFlags[`specAtonement:${context.source.id}`] = 6000;
      }
      if (specializationTalent(context.source, 3)) target.shield += Math.round(target.maxHp * 0.06);
    }
    return true;
  },
  priest_holy(context) {
    let rescued = 0;
    const empowered = Number(context.source.passiveFlags.specHope ?? 0) >= 3;
    for (const ally of context.allies) {
      const danger = ally.hp / ally.maxHp < 0.35;
      if (danger) rescued += 1;
      const amp = danger ? (specializationTalent(context.source, 1) ? 1.7 : 1.4) : 1;
      heal(context, ally, 1.7 * amp, 0.08 * amp);
      if (empowered) addHot(context, ally, "holy-hope", 0.02, specializationTalent(context.source, 2) ? 5 : 3, 1000);
      if (specializationTalent(context.source, 3) && danger) ally.shield += Math.round(ally.maxHp * 0.06);
    }
    context.source.passiveFlags.specHope = Math.min(3, (empowered ? 0 : Number(context.source.passiveFlags.specHope ?? 0)) + rescued);
    return true;
  },
  priest_shadow(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    if (Number(context.source.passiveFlags.specVoidFormMs ?? 0) > 0) {
      const spread = specializationTalent(context.source, 2);
      const returnToVoid = specializationTalent(context.source, 3);
      const victims = context.enemies.filter((unit) => Math.abs(unit.x - target.x) <= (spread ? 180 : 100));
      for (const enemy of victims) hit(context, enemy, spread || returnToVoid ? 1.8 : 2.2);
      if (target.alive) addDot(context, target, "shadow-whisper", 0.35, 4, 1000);
      if (spread) for (const enemy of victims.filter((unit) => unit.alive && unit.id !== target.id && !ownEffect(context.source, unit, "shadow-whisper")).slice(0, 2)) addDot(context, enemy, "shadow-whisper", 0.35, 4, 1000);
      if (returnToVoid) {
        context.source.passiveFlags.specVoidFormMs = 0;
        context.source.passiveFlags.specVoid = 2;
        heal(context, context.source, 0, 0.08);
      }
    } else {
      hit(context, target, 1.5);
      if (target.alive) addDot(context, target, "shadow-whisper", 0.35, 4, 1000);
    }
    return true;
  },
  rogue_assassination(context) {
    const key = `specPoison:${context.source.id}`;
    const target = context.nearest.filter((enemy) => Math.abs(enemy.x - context.source.x) <= engageRange(context.source, enemy) + 4).sort((a, b) => Number(b.passiveFlags[key] ?? 0) - Number(a.passiveFlags[key] ?? 0)
      || b.hp - a.hp)[0];
    if (!target) return false;
    const stacks = Number(target.passiveFlags[key] ?? 0);
    hit(context, target, 1.2 + stacks * (specializationTalent(context.source, 1) ? 0.35 : 0.25));
    target.passiveFlags[key] = 0;
    removePeriodicEffect(target, context.source.id, "assassination-poison");
    if (specializationTalent(context.source, 2) && stacks > 0) {
      const other = context.nearest.find((enemy) => enemy.id !== target.id);
      if (other) {
        other.passiveFlags[key] = Math.min(5, Number(other.passiveFlags[key] ?? 0) + Math.ceil(stacks / 2));
        addDot(context, other, "assassination-poison", 0.08 * Number(other.passiveFlags[key]), 4, 1000);
      }
    }
    if (specializationTalent(context.source, 3)) heal(context, context.source, stacks * 0.2, 0);
    return true;
  },
  rogue_outlaw(context) {
    const first = nearestEnemy(context);
    if (!first) return false;
    hit(context, first, 1.2);
    const opportunity = String(context.source.passiveFlags.specOpportunity ?? "");
    hit(context, opportunity === "focus" ? first : context.nearest.find((enemy) => enemy.id !== first.id) ?? first,
      opportunity === "focus" ? 1.7 : 1.0);
    if (opportunity === "ricochet") for (const enemy of context.nearest.slice(0, specializationTalent(context.source, 2) ? 3 : 2)) hit(context, enemy, 0.55);
    context.source.passiveFlags.specOpportunity = "";
    if (specializationTalent(context.source, 3) && opportunity) addStatus(context, context.source, "damageReduction", 0.15, 4000, "outlaw-footwork");
    return true;
  },
  rogue_subtlety(context) {
    const target = [...context.enemies].sort((a, b) => b.x - a.x)[0];
    if (!target) return false;
    const origin = context.source.x;
    if (specializationTalent(context.source, 3)) for (const ally of context.allies.filter((unit) => Math.abs(unit.x - origin) <= 140)) addStatus(context, ally, "damageReduction", 0.12, 4000, "subtlety-smoke");
    teleportToTarget(context.source, target);
    hit(context, target, specializationTalent(context.source, 1) ? 2.9 : 2.4);
    context.source.passiveFlags.specDodgeBonus = 0.3;
    context.source.passiveFlags.specShadowRemainingMs = 2000;
    context.source.passiveFlags.specShadowOriginX = origin;
    context.source.passiveFlags.specShadowReturnPending = specializationTalent(context.source, 2);
    return true;
  },
  shaman_elemental(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    hit(context, target, 2.6);
    if (target.alive && context.random.next() < (specializationTalent(context.source, 1) ? 0.55 : 0.35)) {
      hit(context, target, 1.3);
      gainRage(context.source, 8);
      if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.slice(1, 3)) hit(context, enemy, 0.5);
      if (specializationTalent(context.source, 3)) heal(context, lowestAlly(context), 0, 0.05);
    }
    return true;
  },
  shaman_enhancement(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    hit(context, target, 0.95);
    hit(context, target, 0.95);
    const fire = Boolean(context.source.passiveFlags.specEnhanceFire);
    if (fire && target.alive) {
      addDot(context, target, "enhancement-flame", specializationTalent(context.source, 2) ? 0.35 : 0.2, 3, 1000);
      context.source.passiveFlags.specMaelstromReady = true;
    } else if (target.alive) {
      hit(context, target, 0.55);
      if (specializationTalent(context.source, 1)) context.source.passiveFlags.specMaelstromReady = true;
    }
    context.source.passiveFlags.specEnhanceFire = !fire;
    return true;
  },
  shaman_restoration(context) {
    const ratios = [[2.3, 0.11], [1.6, 0.08], [1.15, 0.06]] as const;
    const remaining = lowestHealthFirst(context.allies.filter((ally) => ally.hp < ally.maxHp));
    let previous: UnitState | undefined;
    for (let index = 0; index < (specializationTalent(context.source, 2) ? 4 : 3); index += 1) {
      const selected = remaining.findIndex((ally) => !previous || Math.abs(ally.x - previous.x) <= 180);
      if (selected < 0) break;
      const ally = remaining.splice(selected, 1)[0]!;
      const ratio = ratios[Math.min(2, index)]!;
      const depth = 1 + (1 - ally.hp / ally.maxHp) * (specializationTalent(context.source, 1) ? 0.5 : 0.3);
      heal(context, ally, ratio[0] * depth, ratio[1] * depth);
      if (specializationTalent(context.source, 3)) addStatus(context, ally, "damageReduction", 0.08, 3000, "restoration-water-shield");
      previous = ally;
    }
    return true;
  },
  warlock_affliction(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const infected = context.enemies.filter((enemy) => enemy.periodicEffects.some((effect) => effect.sourceId === context.source.id)).length;
    addDot(context, target, "affliction-rot", 0.65 * (1 + Math.min(4, infected) * 0.04), 7, 1000);
    for (const spread of [...context.nearest].filter((enemy) => enemy.id !== target.id)
      .sort((a, b) => Number(Boolean(ownEffect(context.source, a, "affliction-rot"))) - Number(Boolean(ownEffect(context.source, b, "affliction-rot"))))
      .slice(0, specializationTalent(context.source, 2) ? 2 : 1)) addDot(context, spread, "affliction-rot", 0.39 * (1 + Math.min(4, infected) * 0.04), 7, 1000);
    if (specializationTalent(context.source, 1) && target.alive) ownEffect(context.source, target, "affliction-rot")!.remainingTicks += 3;
    return true;
  },
  warlock_demonology(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const demons = specializationState(context.source).demons;
    for (const _demon of demons) hit(context, target, specializationTalent(context.source, 2) ? 0.65 : 0.45);
    for (let index = 0; index < 2 && demons.length < 4; index += 1) demons.push({ remainingMs: specializationTalent(context.source, 1) ? 8000 : 6000, untilAttackMs: 2000 });
    if (specializationTalent(context.source, 3)) context.source.shield += Math.round(context.source.maxHp * demons.length * 0.025);
    recordTarget(context, target);
    return Boolean(target);
  },
  warlock_destruction(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const embers = Number(context.source.passiveFlags.specEmbers ?? 0);
    const spent = Math.min(embers, specializationTalent(context.source, 1) ? 2 : 1);
    hit(context, target, spent > 0 ? (specializationTalent(context.source, 1) ? 1.4 + spent * 1.4 : 2.4) : 2.0,
      embers > 0 ? { critChance: 1 } : {});
    if (embers > 0) {
      context.source.passiveFlags.specEmbers = embers - spent;
      if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.slice(1, 3)) hit(context, enemy, 1.2);
      if (specializationTalent(context.source, 3)) {
        heal(context, context.source, 0, 0.04);
        gainRage(context.source, 8);
      }
    }
    return true;
  },
  warrior_arms(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const execute = target.hp / target.maxHp < 0.35;
    const overpower = Boolean(context.source.passiveFlags.specOverpower);
    const execution = execute && overpower && specializationTalent(context.source, 1);
    const breach = overpower && specializationTalent(context.source, 2);
    hit(context, target, execution ? 3.4 : execute ? 2.8 : 2.1, overpower ? { critChance: 1 } : {});
    context.source.passiveFlags.specOverpower = false;
    if (target.alive) addStatus(context, target, "armorBreak", breach ? 0.3 : specializationTalent(context.source, 2) ? 0.22 : 0.15, 5000, "arms-defense-break");
    if (execution) gainRage(context.source, 10);
    if (breach) for (const enemy of context.nearest.filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 120).slice(0, 2)) addStatus(context, enemy, "armorBreak", 0.3, 5000, "arms-defense-break");
    if (specializationTalent(context.source, 3) && overpower) {
      context.source.shield += Math.round(context.source.maxHp * 0.06);
      context.source.passiveFlags.specOverpowerRageAttacks = 2;
    }
    return true;
  },
  warrior_fury(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    let total = 0;
    const extraRage = specializationTalent(context.source, 3) ? Math.min(20, context.source.rage) : 0;
    spendRage(context.source, extraRage);
    for (let index = 0; index < 3 && target.alive; index += 1) {
      const result = hit(context, target, 0.7 * (1 + extraRage * 0.03));
      total += result.amount;

    }
    const healed = applyHealing(context.source, total * 0.08, false).healed;
    if (healed > 0) context.events.push({ type: "heal", sourceId: context.source.id, targetId: context.source.id, amount: healed });
    const previous = Number(context.source.passiveFlags.specFuryRemainingMs ?? 0);
    const duration = specializationTalent(context.source, 1) ? Math.max(previous, Math.min(6000, previous + 3000)) : 3000;
    if (!specializationTalent(context.source, 1) || previous <= 0) context.source.passiveFlags.specFuryExtensionMs = 0;
    context.source.passiveFlags.specFuryRemainingMs = duration;
    addStatus(context, context.source, "haste", specializationTalent(context.source, 1) ? 0.3 : 0.2, duration, "fury-frenzy");
    if (specializationTalent(context.source, 2)) for (const enemy of context.nearest.slice(1, 3)) hit(context, enemy, 0.6);
    return true;
  },
  warrior_protection(context) {
    const target = nearestEnemy(context);
    if (!target) return false;
    const revenge = Boolean(context.source.passiveFlags.specRevenge);
    hit(context, target, revenge ? (specializationTalent(context.source, 1) ? 2.7 : 2.2) : 1.6);
    context.source.passiveFlags.specRevenge = false;
    if (target.alive) addStatus(context, target, "stun", 1, 800, "warrior-shield-stun");
    taunt(context, [target]);
    context.source.shield += Math.round(context.source.maxHp * 0.08 * skillEffectMultiplier(context.source));
    if (specializationTalent(context.source, 2) && revenge) for (const enemy of context.nearest.slice(1, 3)) hit(context, enemy, 0.8);
    if (specializationTalent(context.source, 3)) context.source.shield += Math.round(context.source.maxHp * 0.08 * skillEffectMultiplier(context.source));
    return true;
  },
};

export function castSpecializationSkill(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): { events: BattleEvent[]; targetIds: string[] } | null {
  const hero = HERO_BY_ID[source.sourceId as HeroId];
  if (!hero) return null;
  const events: BattleEvent[] = [];
  const enemies = livingEnemies(source, units);
  const allies = livingAllies(source, units);
  const context: CastContext = {
    source,
    units,
    random,
    events,
    targetIds: [],
    enemies,
    allies,
    nearest: nearestTo(source, enemies),
  };
  const resolved = CASTERS[hero.specId](context);
  if (!resolved) return null;
  return { events, targetIds: context.targetIds };
}

export function selectSpecializationTarget(source: UnitState, units: UnitState[]): UnitState | undefined {
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  const enemies = livingEnemies(source, units);
  if (spec === "monk_windwalker" && Number(source.passiveFlags.specComboStep ?? 0) > 0) return enemies.find((enemy) => enemy.id === source.passiveFlags.specComboTarget);
  if (spec === "druid_feral") return enemies.find((enemy) => ownEffect(source, enemy, "feral-bleed"))
    ?? enemies.sort((a, b) => b.hp - a.hp)[0];
  if (spec === "rogue_assassination") return enemies.sort((a, b) => Number(b.passiveFlags[`specPoison:${source.id}`] ?? 0)
    - Number(a.passiveFlags[`specPoison:${source.id}`] ?? 0) || b.hp - a.hp)[0];
  if (spec === "hunter_marksmanship") return enemies.find((enemy) => enemy.id === source.passiveFlags.specAimTarget);
  if (spec === "paladin_retribution" && specializationTalent(source, 2)) return nearestTo(source, enemies)
    .find((enemy) => Number(enemy.passiveFlags[`specJudgment:${source.id}`] ?? 0) > 0
      && Math.abs(enemy.x - source.x) <= engageRange(source, enemy) + 4);
  return undefined;
}

export function specializationBasicAttackModifiers(source: UnitState, target: UnitState) {
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  let damageMultiplier = 1;
  let critChanceBonus = 0;
  if (spec === "druid_feral" && ownEffect(source, target, "feral-bleed")) damageMultiplier *= 1.12;
  if (spec === "mage_frost" && source.passiveFlags.specShatterTarget
    && Number(source.passiveFlags.specShatterRemainingMs ?? 0) > 0 && Number(target.passiveFlags[`specFrozen:${source.id}`] ?? 0) > 0) damageMultiplier *= specializationTalent(source, 1) ? 1.8 : 1.5;
  if (spec === "druid_balance" && !source.passiveFlags.specBalanceMoon) damageMultiplier *= 1.25;
  if (spec === "priest_shadow" && Number(source.passiveFlags.specVoidFormMs ?? 0) > 0) damageMultiplier *= 1.25;
  if (spec === "hunter_marksmanship" && source.passiveFlags.specAimTarget === target.id) critChanceBonus += Math.min(0.16, Number(source.passiveFlags.specAimStacks ?? 0) * 0.04);
  damageMultiplier *= 1 + Number(source.passiveFlags.specAttackBuffPct ?? 0);
  critChanceBonus += Number(source.passiveFlags.specCritBonus ?? 0);
  return { damageMultiplier, critChanceBonus };
}

function passiveContext(source: UnitState, units: UnitState[], random: RandomSource, events: BattleEvent[]): CastContext {
  const enemies = livingEnemies(source, units);
  return { source, units, random, events, targetIds: [], enemies, allies: livingAllies(source, units),
    nearest: nearestTo(source, enemies), attribution: { kind: "passive", id: `${HERO_BY_ID[source.sourceId as HeroId]?.specId}-passive` } };
}

export function afterSpecializationBasicAttack(
  source: UnitState, target: UnitState, units: UnitState[], random: RandomSource, events: BattleEvent[], critical = false,
): void {
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  if (!spec || !source.alive) return;
  const context = passiveContext(source, units, random, events);
  if (spec === "death_knight_frost") {
    const strikes = Number(source.passiveFlags.specFrostStrikes ?? 0) + 1;
    if (critical || strikes >= 4) { source.passiveFlags.specKillingMachine = true; source.passiveFlags.specFrostStrikes = 0; }
    else source.passiveFlags.specFrostStrikes = strikes;
  }
  else if (spec === "death_knight_unholy" && target.alive) {
    const key = `specWound:${source.id}`;
    target.passiveFlags[key] = Math.min(3, Number(target.passiveFlags[key] ?? 0) + 1);
  } else if (spec === "druid_feral") {
    const bleed = ownEffect(source, target, "feral-bleed");
    if (bleed) bleed.remainingTicks = Math.min(specializationTalent(source, 1) ? 10 : 8, bleed.remainingTicks + 1);
  } else if (spec === "druid_balance" && source.passiveFlags.specBalanceMoon) {
    const other = context.nearest.find((enemy) => enemy.id !== target.id && Math.abs(enemy.x - target.x) <= 100);
    if (other) hit(context, other, 0.3);
  } else if (spec === "hunter_marksmanship") {
    if (source.passiveFlags.specAimTarget === target.id) source.passiveFlags.specAimStacks = Math.min(4, Number(source.passiveFlags.specAimStacks ?? 0) + 1);
    else {
      source.passiveFlags.specAimTarget = target.id;
      source.passiveFlags.specAimStacks = Math.min(4, 1 + Number(source.passiveFlags.specAimCarry ?? 0));
      source.passiveFlags.specAimCarry = 0;
    }
  } else if (spec === "mage_arcane") {
    if (Number(source.passiveFlags.specArcaneSurgeMs ?? 0) > 0) hit(context, target, specializationTalent(source, 1) ? 0.85 : 0.6);
    else source.passiveFlags.specArcaneCharges = Math.min(4, Number(source.passiveFlags.specArcaneCharges ?? 0) + 1);
  }
  else if (spec === "mage_frost") {
    const shatter = source.passiveFlags.specShatterTarget === target.id
      && Number(source.passiveFlags.specShatterRemainingMs ?? 0) > 0
      && Number(target.passiveFlags[`specFrozen:${source.id}`] ?? 0) > 0;
    if (shatter) {
      source.passiveFlags.specShatterTarget = "";
      source.passiveFlags.specShatterRemainingMs = 0;
      if (specializationTalent(source, 1)) source.passiveFlags.specFrostQuick = true;
      if (specializationTalent(source, 2)) for (const other of nearestTo(target, context.enemies)
        .filter((unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= 140).slice(0, 2)) addStatus(context, other, "slow", 0.25, 3000, "frost-shatter-chill");
      if (specializationTalent(source, 3)) {
        source.shield += Math.round(source.maxHp * 0.08);
        gainRage(source, 2);
      }
    }
    const same = source.passiveFlags.specChillTarget === target.id;
    source.passiveFlags.specChillTarget = target.id;
    source.passiveFlags.specChillStacks = target.alive ? Math.min(2, (same ? Number(source.passiveFlags.specChillStacks ?? 0) : 0) + 1) : 0;
  }
  else if (spec === "priest_shadow" && specializationTalent(source, 1) && Number(source.passiveFlags.specVoidFormMs ?? 0) > 0) {
    const extended = Number(source.passiveFlags.specVoidExtensionMs ?? 0);
    const extra = Math.min(400, 4000 - extended);
    source.passiveFlags.specVoidExtensionMs = extended + extra;
    source.passiveFlags.specVoidFormMs = Number(source.passiveFlags.specVoidFormMs) + extra;
  }
  else if (spec === "monk_mistweaver" && Number(source.passiveFlags.specMistWindowMs ?? 0) > 0) {
    const targets = lowestHealthFirst(context.allies).slice(0, specializationTalent(source, 2) ? 2 : 1);
    for (const ally of targets) heal(context, ally, targets.length === 2 ? 0.4 : 0.7, 0);
    if (specializationTalent(source, 3)) source.shield = Math.min(source.maxHp * 0.12, source.shield + source.maxHp * 0.015);
  } else if (spec === "monk_windwalker") advanceWindwalkerCombo(context, target.alive ? target : nearestEnemy(context) ?? target);
  else if (spec === "paladin_retribution") {
    const key = `specJudgment:${source.id}`;
    if (target.alive && source.passiveFlags.specVerdictEcho) {
      source.passiveFlags.specVerdictEcho = false;
      hit(context, target, 0.6, { element: "holy" });
      if (target.alive) target.passiveFlags[key] = 6000;
    } else if (target.alive && Number(target.passiveFlags[key] ?? 0) > 0) hit(context, target, 0.2, { element: "holy" });
    const mercy = Number(source.passiveFlags.specMercyAttacks ?? 0);
    if (mercy > 0) {
      source.passiveFlags.specMercyAttacks = mercy - 1;
      heal(context, lowestAlly(context), 0, 0.01);
    }
  }
  else if (spec === "rogue_assassination" && target.alive) {
    const key = `specPoison:${source.id}`;
    target.passiveFlags[key] = Math.min(5, Number(target.passiveFlags[key] ?? 0) + 1);
    addDot(context, target, "assassination-poison", 0.08 * Number(target.passiveFlags[key]), 4, 1000);
  } else if (spec === "rogue_outlaw" && source.basicAttackCount % (specializationTalent(source, 1) ? 3 : 4) === 0) source.passiveFlags.specOpportunity = random.next() < 0.5 ? "focus" : "ricochet";
  else if (spec === "rogue_subtlety" && source.passiveFlags.specShadowStrike && target.alive) {
    hit(context, target, specializationTalent(source, 2) ? 1.0 : 0.6, { element: "dark" });
    source.passiveFlags.specShadowStrike = false;
  } else if (spec === "shaman_enhancement") {
    if (source.passiveFlags.specMaelstromReady) {
      source.passiveFlags.specMaelstromReady = false;
      hit(context, target, specializationTalent(source, 1) ? 0.6 : specializationTalent(source, 3) ? 0.4 : 0.8);
      if (specializationTalent(source, 1)) gainRage(source, 4);
      if (specializationTalent(source, 2) && target.alive) {
        const flame = ownEffect(source, target, "enhancement-flame");
        if (flame) flame.remainingTicks = Math.min(6, flame.remainingTicks + 2);
      }
      if (specializationTalent(source, 3)) heal(context, lowestAlly(context), 0, 0.08);
    } else if (source.basicAttackCount % 3 === 0) {
      if (source.passiveFlags.specEnhanceFire && target.alive) addDot(context, target, "enhancement-flame", specializationTalent(source, 2) ? 0.35 : 0.2, 3, 1000);
      else hit(context, target, 0.4);
    }
  } else if (spec === "warlock_destruction" && target.alive && !ownEffect(source, target, "destruction-smolder")) addDot(context, target, "destruction-smolder", 0.12, 3, 1000);
  else if (spec === "warrior_arms") {
    if (source.basicAttackCount % 3 === 0) source.passiveFlags.specOverpower = true;
    const attacks = Number(source.passiveFlags.specOverpowerRageAttacks ?? 0);
    if (attacks > 0) {
      source.passiveFlags.specOverpowerRageAttacks = attacks - 1;
      gainRage(source, 4);
    }
  }
}

export function onAnyHeroSkillCast(source: UnitState, units: UnitState[]): void {
  if (!source.passiveFlags.specAugmentSourceId || Number(source.passiveFlags.specAugmentRemainingMs ?? 0) <= 0) return;
  const support = units.find((unit) => unit.alive && unit.id === source.passiveFlags.specAugmentSourceId);
  const previous = Number(source.passiveFlags.specAugmentExtensionMs ?? 0);
  const extended = Math.min(2400, previous + 800);
  source.passiveFlags.specAugmentExtensionMs = extended;
  source.passiveFlags.specAugmentRemainingMs = Number(source.passiveFlags.specAugmentRemainingMs) + extended - previous;
  if (!support) return;
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  if (specializationTalent(support, 2)) {
    const next = augmentationTarget(support, allies.filter((ally) => ally.id !== source.id && ally.passiveFlags.specAugmentSourceId !== support.id));
    if (next) {
      next.passiveFlags.specAttackBuffPct = 0.06 * skillEffectMultiplier(support);
      next.passiveFlags.specAugmentRemainingMs = 3000;
      next.passiveFlags.specAugmentExtensionMs = 0;
    }
  }
  if (specializationTalent(support, 3) && Number(support.passiveFlags.specAugmentWardMs ?? 0) <= 0) {
    const wounded = lowestHealthFirst(allies)[0];
    if (wounded) wounded.shield += Math.round(wounded.maxHp * 0.06 * skillEffectMultiplier(support));
    support.passiveFlags.specAugmentWardMs = 2000;
  }
}

export function tickSpecializationPassives(unit: UnitState, units: UnitState[], deltaMs: number, random: RandomSource): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const [key, raw] of Object.entries(unit.passiveFlags)) {
    if (!(key.startsWith("specJudgment:") || key.startsWith("specAtonement:") || key.startsWith("specDisease:") || key.startsWith("specFrozen:")) || typeof raw !== "number" || raw <= 0) continue;
    unit.passiveFlags[key] = Math.max(0, raw - deltaMs);
  }
  const spec = HERO_BY_ID[unit.sourceId as HeroId]?.specId;
  if (!spec || !unit.alive) return events;
  const state = specializationState(unit);
  state.recentDamage = state.recentDamage.filter((entry) => { entry.remainingMs -= deltaMs; return entry.remainingMs > 0 && entry.amount > 0; });
  const context = passiveContext(unit, units, random, events);
  const timed = ["specAugmentRemainingMs", "specShadowRemainingMs", "specFuryRemainingMs", "specMistWindowMs", "specFragmentCooldownMs", "specBeaconGuardMs", "specConsecrationRageMs", "specBeastFrenzyMs", "specVoidFormMs", "specShatterRemainingMs", "specArcaneSurgeMs", "specComboRemainingMs", "specAugmentWardMs"];
  for (const key of timed) {
    const previous = Number(unit.passiveFlags[key] ?? 0);
    if (previous <= 0) continue;
    const next = Math.max(0, previous - deltaMs);
    unit.passiveFlags[key] = next;
    if (next > 0) continue;
    if (key === "specAugmentRemainingMs") { unit.passiveFlags.specAttackBuffPct = 0; unit.passiveFlags.specAugmentSourceId = ""; }
    if (key === "specComboRemainingMs") unit.passiveFlags.specComboStep = 0;
    if (key === "specShatterRemainingMs") unit.passiveFlags.specShatterTarget = "";
    if (key === "specShadowRemainingMs") {
      unit.passiveFlags.specDodgeBonus = 0; unit.passiveFlags.specShadowStrike = true;
      if (unit.passiveFlags.specShadowReturnPending) {
        const tank = context.allies.filter((ally) => ally.id !== unit.id && HERO_BY_ID[ally.sourceId as HeroId]?.expeditionRole === "tank").sort((a, b) => b.x - a.x)[0];
        unit.x = tank ? tank.x - 40 : Number(unit.passiveFlags.specShadowOriginX);
        unit.targetId = null;
        unit.passiveFlags.specShadowReturnPending = false;
      }
    }
  }
  if (spec === "paladin_holy") ensureBeacon(unit, units);
  if (spec === "druid_guardian") {
    const attackers = context.enemies.filter((enemy) => enemy.targetId === unit.id || enemy.statuses.some((status) => status.kind === "taunt" && status.sourceId === unit.id)).length;
    const hide = unit.statuses.find((status) => status.effectId === "guardian-thick-hide");
    const magnitude = Math.min(0.1, attackers * (specializationTalent(unit, 1) ? 0.03 : 0.02));
    if (hide) { hide.magnitude = magnitude * skillEffectMultiplier(unit); hide.remainingMs = attackers > 0 ? 200 : 0; }
    else if (attackers > 0) addStatus(context, unit, "damageReduction", magnitude, 200, "guardian-thick-hide");
  }
  if (spec === "monk_brewmaster") {
    unit.passiveFlags.specBrewWaitMs = unit.rage >= ACTIVE_SKILL_RAGE_COST && !unit.skillCastId && context.enemies.length > 0
      ? Number(unit.passiveFlags.specBrewWaitMs ?? 0) + deltaMs : 0;
    for (const entry of state.stagger) {
      entry.untilTickMs -= deltaMs;
      while (entry.ticks > 0 && entry.untilTickMs <= 0 && unit.alive) {
        const amount = entry.ticks === 1 ? Math.round(entry.amount) : Math.round(entry.amount / entry.ticks);
        entry.amount -= amount;
        entry.ticks -= 1;
        entry.untilTickMs += 1000;
        const result = resolveDamage({ sourceId: `${unit.id}:stagger`, target: unit, context: { sourceKind: "periodic", delivery: "indirect" }, element: "physical", baseDamage: amount, profile: "deferred" }, random);
        events.push(...damageEvents(result, true, undefined, { kind: "periodic", id: "stagger" }));
      }
    }
    state.stagger = state.stagger.filter((entry) => entry.ticks > 0 && entry.amount > 0);
    unit.passiveFlags.specStaggerPool = state.stagger.reduce((sum, entry) => sum + entry.amount, 0);
  }
  if (spec === "demon_hunter_devourer") {
    if (state.channel) {
      if (isStunned(unit)) state.channel = undefined;
      else {
        const channel = state.channel;
        channel.untilTickMs -= deltaMs;
        while (channel.ticks > 0 && channel.untilTickMs <= 0 && unit.alive) {
          const eligible = context.nearest.filter((enemy) => enemy.alive && Math.abs(enemy.x - unit.x) <= engageRange(unit, enemy) + 4);
          const target = eligible.find((enemy) => enemy.id === channel.targetId) ?? eligible[0];
          if (!target) { channel.ticks = 0; break; }
          channel.targetId = target.id;
          const multiplier = channel.multiplier + (specializationTalent(unit, 1) ? (channel.totalTicks - channel.ticks) * 0.08 : 0);
          hit({ ...context, attribution: activeSkillAttribution(unit) }, target, multiplier, { delivery: "indirect" });
          if (specializationTalent(unit, 2)) {
            const second = context.nearest.find((enemy) => enemy.alive && enemy.id !== target.id && Math.abs(enemy.x - target.x) <= 120);
            if (second) hit(context, second, channel.multiplier * 0.5, { delivery: "indirect" });
          }
          channel.ticks -= 1;
          channel.untilTickMs += 500;
          if (channel.ticks === 0 && unit.alive) {
            if (specializationTalent(unit, 1)) unit.passiveFlags.specSouls = Math.min(3, Number(unit.passiveFlags.specSouls ?? 0) + 1);
            if (specializationTalent(unit, 3)) gainRage(unit, 8);
          }
        }
        if (channel.ticks <= 0 || !unit.alive) state.channel = undefined;
      }
      if (!state.channel) unit.statuses = unit.statuses.filter((status) => status.effectId !== "devourer-channel-guard");
    } else if (context.enemies.length > 0) {
      let timer = Number(unit.passiveFlags.specSoulClockMs ?? 2000) - deltaMs;
      while (timer <= 0) { unit.passiveFlags.specSouls = Math.min(3, Number(unit.passiveFlags.specSouls ?? 0) + 1); timer += 2000; }
      unit.passiveFlags.specSoulClockMs = timer;
    }
  }
  if (spec === "hunter_survival" && state.trap) {
    const trap = state.trap;
    trap.remainingMs -= deltaMs;
    trap.armMs = Math.max(0, trap.armMs - deltaMs);
    const victims = context.enemies.filter((enemy) => Math.abs(enemy.x - trap.x) <= (specializationTalent(unit, 2) ? 140 : 80));
    const entered = victims.some((enemy) => !trap.occupantIds.includes(enemy.id));
    trap.occupantIds = victims.map((enemy) => enemy.id);
    if (trap.remainingMs <= 0) state.trap = undefined;
    else if (trap.armMs === 0 && victims.length > 0 && (entered || specializationTalent(unit, 1))) {
      for (const target of victims) {
        hit(context, target, 0.8, { delivery: "indirect" });
        if (target.alive) {
          addStatus(context, target, "slow", 0.35, specializationTalent(unit, 3) ? 4000 : 2500, "survival-trap-slow");
          if (specializationTalent(unit, 2)) addStatus(context, target, "stun", 1, 800, "survival-trap-snare");
        }
      }
      if (specializationTalent(unit, 3)) for (const ally of nearestTo(unit, context.allies.filter((ally) => ally.id !== unit.id)).slice(0, 2)) gainRage(ally, Math.min(6, victims.length * 2));
      unit.passiveFlags.specTrapReady = true;
      state.trap = undefined;
    }
  }
  if (spec === "hunter_beast_mastery") {
    let timer = Number(unit.passiveFlags.specHuntAttackMs ?? 1600) - deltaMs;
    if (isStunned(unit) || unit.skillCastId) timer = Math.max(0, timer);
    while (timer <= 0 && unit.alive && !isStunned(unit) && !unit.skillCastId) {
      const eligible = context.nearest.filter((enemy) => enemy.alive && Math.abs(enemy.x - unit.x) <= engageRange(unit, enemy));
      const target = eligible.find((enemy) => enemy.id === unit.passiveFlags.specHuntTarget) ?? eligible[0];
      if (target) {
        const same = unit.passiveFlags.specHuntTarget === target.id;
        unit.passiveFlags.specHuntFocus = same ? Math.min(5, Number(unit.passiveFlags.specHuntFocus ?? 0) + 1) : 0;
        unit.passiveFlags.specHuntTarget = target.id;
        const shot = hit(context, target, 0.55 * (specializationTalent(unit, 1) ? 1 + Number(unit.passiveFlags.specHuntFocus) * 0.06 : 1), { delivery: "projectile" });
        if (shot.hit && specializationTalent(unit, 3) && Number(unit.passiveFlags.specBeastFrenzyMs ?? 0) > 0) gainRage(unit, 2);
        if (specializationTalent(unit, 2) && Number(unit.passiveFlags.specBeastFrenzyMs ?? 0) > 0) for (const other of eligible.filter((enemy) => enemy.id !== target.id && Math.abs(enemy.x - target.x) <= 90)) hit(context, other, 0.25, { delivery: "projectile" });
      } else { timer = 0; break; }
      timer += Number(unit.passiveFlags.specBeastFrenzyMs ?? 0) > 0 ? 900 : 1600;
    }
    unit.passiveFlags.specHuntAttackMs = timer;
  }
  if (spec === "warlock_demonology") {
    for (const demon of state.demons) {
      const elapsed = Math.min(deltaMs, demon.remainingMs);
      demon.untilAttackMs -= elapsed;
      demon.remainingMs -= elapsed;
      while (demon.untilAttackMs <= 0 && unit.alive) {
        const target = context.nearest.find((enemy) => enemy.alive);
        if (target) hit(context, target, 0.45, { delivery: "indirect" });
        demon.untilAttackMs += 2000;
      }
    }
    state.demons = state.demons.filter((demon) => demon.remainingMs > 0);
  }
  return events;
}

export function onPeriodicEffectEvents(events: readonly BattleEvent[], units: UnitState[]): void {
  for (const event of events) {
    if (event.type !== "damage") continue;
    const source = units.find((unit) => unit.id === event.sourceId);
    if (!source?.alive) continue;
    const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
    if (spec === "priest_shadow" && Number(source.passiveFlags.specVoidFormMs ?? 0) <= 0) {
      const stacks = Number(source.passiveFlags.specVoid ?? 0) + 1;
      if (stacks >= 4) {
        source.passiveFlags.specVoid = 0;
        source.passiveFlags.specVoidFormMs = 6000;
        source.passiveFlags.specVoidExtensionMs = 0;
      }
      else source.passiveFlags.specVoid = stacks;
    }
    if (spec === "warlock_destruction") {
      const ticks = Number(source.passiveFlags.specEmberTicks ?? 0) + 1;
      source.passiveFlags.specEmberTicks = ticks % 3;
      if (ticks >= 3) source.passiveFlags.specEmbers = Math.min(2, Number(source.passiveFlags.specEmbers ?? 0) + 1);
    }
  }
}

export function specializationReactions(events: readonly BattleEvent[], units: UnitState[], random: RandomSource): BattleEvent[] {
  const reactions: BattleEvent[] = [];
  for (const event of events) {
    if (event.type !== "damage") continue;
    const source = units.find((unit) => unit.id === event.sourceId);
    const target = units.find((unit) => unit.id === event.targetId);
    const spec = source ? HERO_BY_ID[source.sourceId as HeroId]?.specId : undefined;
    if (source?.alive && spec === "mage_fire" && event.critical) {
      if (specializationTalent(source, 1) && source.passiveFlags.specHotStreak) source.passiveFlags.specHotStreakReserve = true;
      source.passiveFlags.specHotStreak = true;
    }
    if (source?.alive && spec === "warrior_fury" && event.critical && Number(source.passiveFlags.specFuryRemainingMs ?? 0) > 0) {
      const extended = Number(source.passiveFlags.specFuryExtensionMs ?? 0);
      const extra = Math.min(600, 2000 - extended);
      source.passiveFlags.specFuryExtensionMs = extended + extra;
      source.passiveFlags.specFuryRemainingMs = Number(source.passiveFlags.specFuryRemainingMs) + extra;
      const haste = source.statuses.find((status) => status.effectId === "fury-frenzy");
      if (haste) haste.remainingMs += extra;
    }
    if (source?.alive && (spec === "priest_discipline" || spec === "warlock_affliction" || (spec === "druid_feral" && specializationTalent(source, 3)))) {
      if (spec === "priest_discipline") {
        if (event.skillCastId || event.attribution?.id === "priest_discipline-active") continue;
        for (const ally of units.filter((unit) => unit.alive && unit.team === source.team && Number(unit.passiveFlags[`specAtonement:${source.id}`] ?? 0) > 0)) {
          healCombatTarget(source, ally, (event.hpDamage ?? event.amount) * (specializationTalent(source, 1) ? 0.3 : 0.2) * healingMultiplier(source, false), units, reactions,
            { attribution: { kind: "passive", id: `${spec}-passive` }, overflowShield: 0.1 });
        }
      } else {
        const ratio = spec === "warlock_affliction" ? (specializationTalent(source, 3) ? 0.15 : 0.06) : 0.06;
        healCombatTarget(source, source, (event.hpDamage ?? event.amount) * ratio * healingMultiplier(source, false), units, reactions,
          { attribution: { kind: "passive", id: `${spec}-passive` } });
      }
    }
    if (target?.team === "heroes" && (event.hpDamage ?? 0) > 0) {
      for (const status of target.statuses.filter((status) => status.effectId === "protection-consecration-dr" && status.sourceId !== target.id)) {
        const protector = units.find((unit) => unit.alive && unit.id === status.sourceId);
        if (protector && Number(protector.passiveFlags.specConsecrationRageMs ?? 0) <= 0) { gainRage(protector, 3); protector.passiveFlags.specConsecrationRageMs = 1000; }
      }
    }
  }
  for (const death of events.filter((event) => event.type === "unit:died")) {
    if (death.type !== "unit:died") continue;
    const victim = units.find((unit) => unit.id === death.unitId);
    if (!victim || victim.team !== "enemies") continue;
    const killingHit = [...events].reverse().find((event) => event.type === "damage" && event.targetId === victim.id);
    const killer = killingHit?.type === "damage" ? units.find((unit) => unit.id === killingHit.sourceId && unit.alive) : undefined;
    if (killer && HERO_BY_ID[killer.sourceId as HeroId]?.specId === "demon_hunter_havoc") {
      gainRage(killer, specializationTalent(killer, 1) ? 18 : 12);
      killer.targetId = lowestHealthFirst(livingEnemies(killer, units))[0]?.id ?? null;
    }
    for (const source of units.filter((unit) => unit.alive && unit.team === "heroes")) {
      const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
      const context = passiveContext(source, units, random, reactions);
      if (spec === "hunter_marksmanship" && specializationTalent(source, 2) && source.passiveFlags.specAimTarget === victim.id) {
        source.passiveFlags.specAimCarry = Math.ceil(Number(source.passiveFlags.specAimStacks ?? 0) / 2);
        source.passiveFlags.specAimTarget = "";
        source.passiveFlags.specAimStacks = 0;
      }
      if (spec === "death_knight_unholy" && Number(victim.passiveFlags[`specDisease:${source.id}`] ?? 0) > 0) {
        for (const enemy of nearestTo(victim, context.enemies).filter((enemy) => !ownEffect(source, enemy, "unholy-disease")).slice(0, 2)) addDot(context, enemy, "unholy-disease", 0.15, 4, 1000);
      }
      if (spec === "druid_feral" && specializationTalent(source, 2)) {
        const bleed = ownEffect(source, victim, "feral-bleed");
        const next = nearestTo(victim, context.enemies)[0];
        if (bleed && next) addPeriodicEffect(next, { ...bleed, amount: bleed.amount * 0.6 });
      }
    }
  }
  return reactions;
}
