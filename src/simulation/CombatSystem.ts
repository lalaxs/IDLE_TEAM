import {
  ARMOR_FACTOR,
  BASE_CRIT_MULTIPLIER,
  DAMAGE_VARIANCE_MIN,
  DAMAGE_VARIANCE_SPAN,
} from "../content/balance";
import {
  BLOCK_CHANCE_CAP,
  BLOCK_DAMAGE_FACTOR,
  DODGE_CHANCE_CAP,
} from "../content/affixes";
import {
  ELEMENTAL_ATTACK_AMP,
  allResistFromDefense,
  clampElementResist,
  type DamageElement,
} from "../content/damageElements";
import type { RandomSource } from "./RandomSource";
import { specializationState, specializationTalent } from "./SpecializationState";
import { baseBlockChanceForSpecialization } from "../content/specializations";
import { HERO_BY_ID } from "../content/heroes";
import { HERO_SKILL_BY_ID } from "../content/heroSkills";
import { getStatusMagnitude } from "./StatusSystem";
import { gainRage, gainRageFromDamage } from "./RageSystem";
import type { BattleEvent, CombatAttribution, HeroId, HitContext, UnitState } from "./types";

export interface DamageRoll {
  damage: number;
  critical: boolean;
}

export type DamageProfile = "standard" | "periodic" | "proc" | "reflected" | "deferred";

export interface DamageRequest {
  attackId?: string;
  sourceId: string;
  target: UnitState;
  context: HitContext;
  element: DamageElement;
  baseDamage: number;
  profile: DamageProfile;
  critChance?: number;
  critMultiplier?: number;
  defenseReduction?: number;
}

export interface DamageResult {
  attackId?: string;
  outcome: "hit" | "dodged" | "invalid";
  sourceId: string;
  targetId: string;
  context: HitContext;
  element: DamageElement;
  rawDamage: number;
  rolledDamage: number;
  mitigatedDamage: number;
  absorbed: number;
  hpDamage: number;
  appliedDamage: number;
  critical: boolean;
  blocked: boolean;
  killed: boolean;
}

export type HitResolution =
  | { outcome: "dodged"; hpDamage: number; absorbed: number; died: boolean; blocked: boolean }
  | {
      outcome: "hit";
      hpDamage: number;
      absorbed: number;
      died: boolean;
      blocked: boolean;
      amount: number;
    };

/**
 * Soft-armor mitigation (Diablo Immortal / common ARPG style):
 * damage ≈ attack² / (attack + defense × k)
 */
export function calculateDamage(
  attack: number,
  defense: number,
  critChance: number,
  random: RandomSource,
  defenseReduction = 0,
  /** Total crit multiplier; default 1.5 matches DI Critical Hit Damage base. */
  critMultiplier = BASE_CRIT_MULTIPLIER,
): DamageRoll {
  const variance = DAMAGE_VARIANCE_MIN + random.next() * DAMAGE_VARIANCE_SPAN;
  const effectiveDefense = defense * (1 - Math.min(1, Math.max(0, defenseReduction)));
  const denominator = Math.max(1, attack + effectiveDefense * ARMOR_FACTOR);
  const mitigated = (attack * attack) / denominator;
  const normal = Math.max(1, Math.round(mitigated * variance));
  const critical = random.next() < critChance;
  const multiplier = Math.max(1, critMultiplier);
  return { damage: critical ? Math.round(normal * multiplier) : normal, critical };
}

/** School-specific damage from TBH-style physical / spell affixes. */
export function schoolDamageMultiplier(source: UnitState): number {
  const school = Number(source.passiveFlags.gearDamageSchoolMagic ?? 0) > 0 ? "magic" : "physical";
  if (school === "magic") {
    return 1 + Number(source.passiveFlags.gearMagicDamage ?? 0);
  }
  return 1 + Number(source.passiveFlags.gearPhysicalDamage ?? 0);
}

const ELEMENT_DAMAGE_FLAG: Record<DamageElement, string> = {
  physical: "",
  fire: "gearFireDamage",
  frost: "gearFrostDamage",
  lightning: "gearLightningDamage",
  dark: "gearDarkDamage",
  holy: "",
};

/** Precise elemental damage (Fire/Frost/Lightning/Dark %). Physical and holy use school / heal affixes instead. */
export function elementDamageMultiplier(source: UnitState): number {
  const flag = ELEMENT_DAMAGE_FLAG[source.damageElement];
  if (!flag) return 1;
  return 1 + Number(source.passiveFlags[flag] ?? 0);
}

/** General, school, and element damage share one additive equipment bucket. */
export function gearDamageMultiplier(source: UnitState): number {
  return 1
    + Number(source.passiveFlags.gearDamagePct ?? 0)
    + (schoolDamageMultiplier(source) - 1)
    + (elementDamageMultiplier(source) - 1);
}

const RESIST_FLAG: Record<DamageElement, string> = {
  physical: "gearPhysicalResist",
  fire: "gearFireResist",
  frost: "gearFrostResist",
  lightning: "gearLightningResist",
  dark: "gearDarkResist",
  holy: "gearHolyResist",
};

/** Heroes only: defense all-resist + gear all-resist + matching elemental resist, capped. */
export function incomingElementResist(target: UnitState, element: DamageElement): number {
  if (target.team !== "heroes") return 0;
  const fromDefense = allResistFromDefense(target.defense);
  const all = Number(target.passiveFlags.gearAllResist ?? 0);
  const specific = Number(target.passiveFlags[RESIST_FLAG[element]] ?? 0);
  return clampElementResist(fromDefense + all + specific);
}

/** Non-physical monster hits hit much harder unless the hero stacked matching resist. */
export function outgoingElementMultiplier(source: UnitState): number {
  if (source.team !== "enemies") return 1;
  if (source.damageElement === "physical") return 1;
  return 1 + ELEMENTAL_ATTACK_AMP;
}

export function effectiveAttack(source: UnitState): number {
  return source.attack * (1 + Number(source.passiveFlags.specAttackBuffPct ?? 0));
}

interface DamageApplicationOptions {
  reduce: boolean;
  shield: boolean;
  stagger: boolean;
  deathPrevention: boolean;
  rage: boolean;
}

interface DamageApplication {
  mitigatedDamage: number;
  hpDamage: number;
  absorbed: number;
  died: boolean;
}

function applyDamageToTarget(
  target: UnitState,
  amount: number,
  options: DamageApplicationOptions,
): DamageApplication {
  let reduced = Math.max(0, Math.round(amount));
  if (options.reduce) {
    const gearDr = Number(target.passiveFlags.gearDamageReduction ?? 0);
    const sharedDr = target.chosenSkillId === "iron-wall"
      ? HERO_SKILL_BY_ID["iron-wall"].passive.damageReduction ?? 0.08
      : 0;
    const vulnerability = getStatusMagnitude(target, "vulnerability");
    const statusDr = Math.max(
      getStatusMagnitude(target, "damageReduction"),
      getStatusMagnitude(target, "mirageGuard"),
    );
    reduced = Math.max(
      0,
      Math.round(
        amount
        * (1 + vulnerability)
        * (1 - Math.min(0.6, gearDr + sharedDr + statusDr)),
      ),
    );
  }
  const specId = target.team === "heroes"
    ? HERO_BY_ID[target.sourceId as HeroId]?.specId
    : undefined;
  const absorbed = options.shield ? Math.min(target.shield, reduced) : 0;
  target.shield -= absorbed;
  if (options.stagger && specId === "monk_brewmaster" && reduced > absorbed) {
    const staggered = Math.round((reduced - absorbed) * (specializationTalent(target, 1) ? 0.45 : 0.35));
    reduced -= staggered;
    target.passiveFlags.specStaggerPool = Number(target.passiveFlags.specStaggerPool ?? 0) + staggered;
    specializationState(target).stagger.push({ amount: staggered, ticks: 4, untilTickMs: 1000 });
  }
  const hpBefore = target.hp;
  let hpDamage = Math.min(target.hp, reduced - absorbed);
  target.hp -= hpDamage;
  if (target.hp <= 0) {
    const cloudveil = Number(target.passiveFlags.gearCloudveil ?? 0);
    if (
      options.deathPrevention
      && target.team === "heroes"
      && cloudveil > 0
      && !target.passiveFlags.gearCloudveilUsed
    ) {
      target.hp = 1;
      target.alive = true;
      target.shield += Math.round(target.maxHp * cloudveil);
      target.passiveFlags.gearCloudveilUsed = true;
      hpDamage = Math.max(0, hpBefore - 1);
    } else {
      target.hp = 0;
      target.alive = false;
    }
  }
  if (hpDamage > 0 && target.team === "heroes") {
    specializationState(target).recentDamage.push({ amount: hpDamage, remainingMs: 4000 });
    if (specId === "demon_hunter_vengeance" && Number(target.passiveFlags.specFragmentCooldownMs ?? 0) <= 0) {
      target.passiveFlags.specFragments = Math.min(5, Number(target.passiveFlags.specFragments ?? 0) + 1);
      target.passiveFlags.specFragmentCooldownMs = specializationTalent(target, 1) ? 1000 : 1500;
    }
  }
  if (options.rage) gainRageFromDamage(target, hpDamage);
  return { mitigatedDamage: reduced, hpDamage, absorbed, died: !target.alive };
}

export function applyDamage(
  target: UnitState,
  amount: number,
): { hpDamage: number; absorbed: number; died: boolean } {
  const result = applyDamageToTarget(target, amount, {
    reduce: true,
    shield: true,
    stagger: true,
    deathPrevention: true,
    rage: true,
  });
  return { hpDamage: result.hpDamage, absorbed: result.absorbed, died: result.died };
}

const DAMAGE_PROFILE_RULES: Record<DamageProfile, {
  roll: boolean;
  dodge: boolean;
  block: boolean;
  resist: boolean;
  reduce: boolean;
  shield: boolean;
  stagger: boolean;
  deathPrevention: boolean;
  rage: boolean;
}> = {
  standard: {
    roll: true, dodge: true, block: true, resist: true, reduce: true,
    shield: true, stagger: true, deathPrevention: true, rage: true,
  },
  periodic: {
    roll: true, dodge: false, block: false, resist: true, reduce: true,
    shield: true, stagger: true, deathPrevention: true, rage: true,
  },
  proc: {
    roll: false, dodge: true, block: true, resist: true, reduce: true,
    shield: true, stagger: true, deathPrevention: true, rage: true,
  },
  reflected: {
    roll: false, dodge: false, block: false, resist: false, reduce: true,
    shield: true, stagger: true, deathPrevention: true, rage: true,
  },
  deferred: {
    roll: false, dodge: false, block: false, resist: false, reduce: false,
    shield: false, stagger: false, deathPrevention: false, rage: false,
  },
};

/** Resolve one damage transaction from source data through mitigation and health. */
export function resolveDamage(request: DamageRequest, random: RandomSource): DamageResult {
  const { target } = request;
  const rawDamage = Math.max(0, request.baseDamage);
  const base: Omit<DamageResult, "outcome" | "rolledDamage" | "mitigatedDamage" | "absorbed" | "hpDamage" | "appliedDamage" | "critical" | "blocked" | "killed"> = {
    attackId: request.attackId,
    sourceId: request.sourceId,
    targetId: target.id,
    context: request.context,
    element: request.element,
    rawDamage,
  };
  if (!target.alive || rawDamage <= 0) {
    return {
      ...base,
      outcome: "invalid",
      rolledDamage: 0,
      mitigatedDamage: 0,
      absorbed: 0,
      hpDamage: 0,
      appliedDamage: 0,
      critical: false,
      blocked: false,
      killed: false,
    };
  }

  const rules = DAMAGE_PROFILE_RULES[request.profile];
  const roll = rules.roll
    ? calculateDamage(
        rawDamage,
        target.defense,
        request.critChance ?? 0,
        random,
        request.defenseReduction ?? 0,
        request.critMultiplier,
      )
    : { damage: Math.max(0, Math.round(rawDamage)), critical: false };

  if (rules.dodge) {
    const dodge = Math.min(
      DODGE_CHANCE_CAP,
      Number(target.passiveFlags.gearDodgeChance ?? 0) + Number(target.passiveFlags.specDodgeBonus ?? 0),
    );
    if (dodge > 0 && random.next() < dodge) {
      return {
        ...base,
        outcome: "dodged",
        rolledDamage: roll.damage,
        mitigatedDamage: 0,
        absorbed: 0,
        hpDamage: 0,
        appliedDamage: 0,
        critical: false,
        blocked: false,
        killed: false,
      };
    }
  }

  let dealt = roll.damage;
  let blocked = false;
  if (rules.block) {
    const baseBlock = target.team === "heroes" ? baseBlockChanceForSpecialization(HERO_BY_ID[target.sourceId as HeroId]?.specId) : 0;
    const block = Math.min(BLOCK_CHANCE_CAP, baseBlock + Number(target.passiveFlags.gearBlockChance ?? 0));
    if (block > 0 && random.next() < block) {
      dealt = Math.max(1, Math.round(dealt * BLOCK_DAMAGE_FACTOR));
      blocked = true;
    }
  }
  if (rules.resist) {
    const resist = incomingElementResist(target, request.element);
    if (resist > 0) dealt = Math.max(0, Math.round(dealt * (1 - resist)));
  }

  const application = applyDamageToTarget(target, dealt, rules);
  if (blocked && target.team === "heroes") {
    const specId = HERO_BY_ID[target.sourceId as HeroId]?.specId;
    if (specId === "warrior_protection") {
      gainRage(target, 5);
      target.passiveFlags.specRevenge = true;
      target.shield += Math.round(
        target.maxHp * 0.02 * (1 + Number(target.passiveFlags.heroSkillEffect ?? 0)),
      );
    }
  }
  return {
    ...base,
    outcome: "hit",
    rolledDamage: roll.damage,
    mitigatedDamage: application.mitigatedDamage,
    absorbed: application.absorbed,
    hpDamage: application.hpDamage,
    appliedDamage: application.absorbed + application.hpDamage,
    critical: roll.critical && !blocked,
    blocked,
    killed: application.died,
  };
}

/** Build canonical combat events from the actual result, never from estimated damage. */
export function damageEvents(
  result: DamageResult,
  includeDeath = true,
  skillCastId?: string,
  attribution?: CombatAttribution,
): BattleEvent[] {
  if (result.outcome !== "hit") return [];
  const events: BattleEvent[] = [];
  const resolvedAttribution = attribution
    ?? (result.context.sourceKind === "basic"
      ? { kind: "basic" as const, id: "basic" }
      : result.context.sourceKind === "reflected"
        ? { kind: "reflect" as const, id: "thorns" }
        : undefined);
  if (result.appliedDamage > 0) {
    events.push({
      type: "damage",
      sourceId: result.sourceId,
      targetId: result.targetId,
      amount: result.appliedDamage,
      critical: result.critical,
      element: result.element,
      hpDamage: result.hpDamage,
      absorbed: result.absorbed,
      ...(skillCastId ? { skillCastId } : {}),
      ...(result.attackId ? { attackId: result.attackId } : {}),
      ...(resolvedAttribution ? { attribution: resolvedAttribution } : {}),
    });
  }
  if (includeDeath && result.killed) {
    events.push({
      type: "unit:died",
      unitId: result.targetId,
      ...(skillCastId ? { skillCastId } : {}),
      ...(result.attackId ? { attackId: result.attackId } : {}),
    });
  }
  return events;
}

/** Apply dodge → block → elemental resist → damage for an already-rolled hit amount. */
export function resolveHit(
  target: UnitState,
  amount: number,
  random: RandomSource,
  element: DamageElement = "physical",
): HitResolution {
  const result = resolveDamage({
    sourceId: "legacy-hit",
    target,
    context: { sourceKind: "skill", delivery: "indirect" },
    element,
    baseDamage: amount,
    profile: "proc",
  }, random);
  if (result.outcome === "dodged") {
    return { outcome: "dodged", hpDamage: 0, absorbed: 0, died: false, blocked: false };
  }
  return {
    outcome: "hit",
    hpDamage: result.hpDamage,
    absorbed: result.absorbed,
    died: result.killed,
    blocked: result.blocked,
    amount: result.mitigatedDamage,
  };
}

export function applyHealing(
  target: UnitState,
  amount: number,
  overflowToShield: boolean,
  shieldCapRatio = 0.1,
): { healed: number; shielded: number } {
  const missing = target.maxHp - target.hp;
  const healed = Math.max(0, Math.min(missing, Math.round(amount)));
  target.hp += healed;
  if (healed > 0 && target.team === "heroes" && HERO_BY_ID[target.sourceId as HeroId]?.specId === "monk_brewmaster") {
    let purified = healed * 0.3;
    const state = specializationState(target);
    for (const entry of state.stagger) {
      const amount = Math.min(entry.amount, purified);
      entry.amount -= amount; purified -= amount;
      if (purified <= 0) break;
    }
    state.stagger = state.stagger.filter((entry) => entry.amount > 0);
    target.passiveFlags.specStaggerPool = state.stagger.reduce((sum, entry) => sum + entry.amount, 0);
  }
  let shielded = 0;
  if (overflowToShield) {
    const cap = Math.round(target.maxHp * Math.max(0.1, shieldCapRatio));
    shielded = Math.min(Math.max(0, Math.round(amount) - healed), cap - target.shield);
    target.shield += Math.max(0, shielded);
  }
  return { healed, shielded: Math.max(0, shielded) };
}
