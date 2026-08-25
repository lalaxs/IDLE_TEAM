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
import { getStatusMagnitude } from "./StatusSystem";
import type { UnitState } from "./types";

export interface DamageRoll {
  damage: number;
  critical: boolean;
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

export function applyDamage(
  target: UnitState,
  amount: number,
): { hpDamage: number; absorbed: number; died: boolean } {
  const gearDr = Number(target.passiveFlags.gearDamageReduction ?? 0);
  const statusDr = Math.max(
    getStatusMagnitude(target, "damageReduction"),
    getStatusMagnitude(target, "mirageGuard"),
  );
  const reduced = Math.max(
    0,
    Math.round(amount * (1 - Math.min(0.6, gearDr + statusDr))),
  );
  const absorbed = Math.min(target.shield, reduced);
  target.shield -= absorbed;
  const hpBefore = target.hp;
  let hpDamage = Math.min(target.hp, reduced - absorbed);
  target.hp -= hpDamage;
  if (target.hp <= 0) {
    const cloudveil = Number(target.passiveFlags.gearCloudveil ?? 0);
    if (target.team === "heroes" && cloudveil > 0 && !target.passiveFlags.gearCloudveilUsed) {
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
  return { hpDamage, absorbed, died: !target.alive };
}

/** Apply dodge → block → elemental resist → damage for an already-rolled hit amount. */
export function resolveHit(
  target: UnitState,
  amount: number,
  random: RandomSource,
  element: DamageElement = "physical",
): HitResolution {
  const dodge = Math.min(DODGE_CHANCE_CAP, Number(target.passiveFlags.gearDodgeChance ?? 0));
  if (dodge > 0 && random.next() < dodge) {
    return { outcome: "dodged", hpDamage: 0, absorbed: 0, died: false, blocked: false };
  }
  let dealt = amount;
  let blocked = false;
  const block = Math.min(BLOCK_CHANCE_CAP, Number(target.passiveFlags.gearBlockChance ?? 0));
  if (block > 0 && random.next() < block) {
    dealt = Math.max(1, Math.round(amount * BLOCK_DAMAGE_FACTOR));
    blocked = true;
  }
  const resist = incomingElementResist(target, element);
  if (resist > 0) {
    dealt = Math.max(0, Math.round(dealt * (1 - resist)));
  }
  const result = applyDamage(target, dealt);
  return { outcome: "hit", ...result, blocked, amount: dealt };
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
  let shielded = 0;
  if (overflowToShield) {
    const cap = Math.round(target.maxHp * Math.max(0.1, shieldCapRatio));
    shielded = Math.min(Math.max(0, Math.round(amount) - healed), cap - target.shield);
    target.shield += Math.max(0, shielded);
  }
  return { healed, shielded: Math.max(0, shielded) };
}
