import { getStatusMagnitude, isStunned } from "./StatusSystem";
import { selectTarget } from "./TargetingSystem";
import type { BattleEvent, UnitState } from "./types";

/** Ally footprint gap along world X — close enough to allow formation ranks to settle. */
const HERO_GAP = 64;
const ENEMY_GAP = 48;
/**
 * Extra stop distance for short-range units. Attack range alone (~55) is smaller
 * than a sprite, so units otherwise walk into each other's art before striking.
 */
const MELEE_CONTACT = 48;
/** Unstick true sprite piles only — do not fight engageRange every tick. */
const BODY_OVERLAP = 52;

export function advanceMovement(
  units: UnitState[],
  deltaMs: number,
  options: {
    teams?: ReadonlyArray<"heroes" | "enemies">;
    skip?: (unit: UnitState) => boolean;
  } = {},
): BattleEvent[] {
  const allowed = options.teams;
  for (const unit of units) {
    if (!unit.alive || isStunned(unit)) continue;
    if (allowed && !allowed.includes(unit.team)) continue;
    if (options.skip?.(unit)) continue;
    const current = units.find(({ id }) => id === unit.targetId && id !== unit.id);
    const target =
      current?.alive && current.team !== unit.team
        ? current
        : selectTarget(unit, units, "nearestEnemy");
    unit.targetId = target?.id ?? null;
    if (!target) continue;
    const direction = Math.sign(target.x - unit.x);
    const distance = Math.abs(target.x - unit.x);
    const range = engageRange(unit);
    if (distance <= range) continue;
    const slow = getStatusMagnitude(unit, "slow");
    const haste = getStatusMagnitude(unit, "haste");
    const movement = unit.moveSpeed * Math.max(0.2, 1 + haste - slow) * (deltaMs / 1000);
    const allowedStep = Math.max(0, distance - range);
    unit.x += direction * Math.min(movement, allowedStep);
  }
  separateAllies(units, deltaMs);
  if (!allowed || allowed.length > 1) {
    separateOpponents(units, deltaMs);
  }
  return [];
}

/** True when the unit has planted inside strike distance of its current foe. */
export function isPlantedForAttack(unit: UnitState, units: readonly UnitState[]): boolean {
  if (!unit.alive || !unit.targetId) return false;
  const target = units.find(({ id, alive }) => id === unit.targetId && alive);
  if (!target || target.team === unit.team) return false;
  return Math.abs(target.x - unit.x) <= engageRange(unit) + 2;
}

/** Stop / strike distance. Melee gets contact padding so art does not overlap. */
export function engageRange(unit: UnitState): number {
  if (unit.attackRange > 140) return unit.attackRange;
  const body = unit.sourceId === "B01" ? MELEE_CONTACT + 12 : MELEE_CONTACT;
  return unit.attackRange + body;
}

/** Soft same-team volume on X. unit.y is a stable DNF-style lane offset. */
export function separateAllies(units: UnitState[], deltaMs: number): void {
  const alive = units.filter(({ alive }) => alive);
  const step = Math.min(1, deltaMs / 40);

  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i]!;
      const b = alive[j]!;
      if (a.team !== b.team) continue;

      // Planted fighters keep their feet still — shoving them reads as skating mid-attack.
      const aPlanted = isPlantedForAttack(a, alive);
      const bPlanted = isPlantedForAttack(b, alive);
      if (aPlanted && bPlanted) continue;

      const heroTeam = a.team === "heroes";
      const minGap = heroTeam ? HERO_GAP : ENEMY_GAP;
      const strength = heroTeam ? 0.75 : 0.55;
      let dx = b.x - a.x;

      if (Math.abs(dx) >= minGap) continue;

      if (Math.abs(dx) < 0.001) {
        if (a.attackRange !== b.attackRange) {
          dx = a.attackRange > b.attackRange ? 1 : -1;
        } else {
          dx = a.id < b.id ? 1 : -1;
        }
      }

      const overlap = (minGap - Math.abs(dx)) * strength * step * 0.55;
      const dir = Math.sign(dx);
      // Never shove someone farther from their foe — that parked backliners out of range.
      if (!aPlanted) {
        const move = -dir * overlap;
        if (!increasesTargetDistance(a, move, alive)) a.x += move;
      }
      if (!bPlanted) {
        const move = dir * overlap;
        if (!increasesTargetDistance(b, move, alive)) b.x += move;
      }
    }
  }
}

/** True when applying dx would move the unit farther from its current enemy. */
function increasesTargetDistance(unit: UnitState, dx: number, units: readonly UnitState[]): boolean {
  if (!unit.targetId || Math.abs(dx) < 0.001) return false;
  const target = units.find(({ id, alive }) => id === unit.targetId && alive);
  if (!target || target.team === unit.team) return false;
  const before = Math.abs(target.x - unit.x);
  const after = Math.abs(target.x - (unit.x + dx));
  return after > before + 0.01;
}

/** Keep enemy and hero footprints from collapsing into one sprite pile. */
export function separateOpponents(units: UnitState[], deltaMs: number): void {
  const alive = units.filter(({ alive }) => alive);
  const step = Math.min(1, deltaMs / 40);
  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i]!;
      const b = alive[j]!;
      if (a.team === b.team) continue;

      const dx = Math.abs(b.x - a.x);
      if (dx >= BODY_OVERLAP) continue;
      if (isPlantedForAttack(a, alive) || isPlantedForAttack(b, alive)) continue;

      const overlap = (BODY_OVERLAP - dx) * 0.85 * step;
      const hero = a.team === "heroes" ? a : b;
      const enemy = a.team === "enemies" ? a : b;
      hero.x -= overlap;
      enemy.x += overlap;
    }
  }
}

/** Stable 0–1 hash from an id string (not a neat sequence). */
export function unitNoise(id: string, salt = 0): number {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/** How far left of hold X a hero starts when marching in from off-screen. */
export const HERO_ENTRY_OFFSET = 460;
/** Extra left spacing so later slots trail in sequence. */
export const HERO_ENTRY_STAGGER_X = 72;
/** Delay before each slot begins marching in. */
export const HERO_ENTRY_STAGGER_MS = 160;
/** March-in speed toward formation hold X. */
export const HERO_ENTRY_SPEED = 210;

/** How far right of hold X an enemy starts when entering from off-screen. */
export const ENEMY_ENTRY_OFFSET = 300;
/** Extra right spacing so later enemy slots trail in sequence. */
export const ENEMY_ENTRY_STAGGER_X = 78;
/** Delay before each enemy slot begins marching in. */
export const ENEMY_ENTRY_STAGGER_MS = 150;
/** Enemy march-in speed toward formation hold X. */
export const ENEMY_ENTRY_SPEED = 195;

/**
 * DNF-style path lanes in screen px relative to the ground line.
 * Keep the band inside the walkable dirt road (not into trees / bottom FG).
 * Negative = farther up the path; positive = closer to the camera.
 */
const HERO_LANE_Y = [-18, 14, -6, 28, 4] as const;
const ENEMY_LANE_Y = [-14, 10, -4, 22, 16, 2] as const;

/**
 * Stable lane Y for a unit. Spread is wide enough that 74px sprites do not merge.
 */
export function laneOffsetY(
  unitId: string,
  slotIndex: number,
  team: "heroes" | "enemies" = "enemies",
): number {
  const table = team === "heroes" ? HERO_LANE_Y : ENEMY_LANE_Y;
  const base = table[slotIndex % table.length] ?? (slotIndex - 2) * 16;
  const jitter = (unitNoise(unitId, 11) - 0.5) * 10;
  return base + jitter;
}

/** World X where a hero begins when entering from the unseen left. */
export function heroEntryStartX(holdX: number, slotIndex: number): number {
  return holdX - HERO_ENTRY_OFFSET - slotIndex * HERO_ENTRY_STAGGER_X;
}

/** World X where an enemy begins when entering from the unseen right. */
export function enemyEntryStartX(holdX: number, slotIndex: number): number {
  return holdX + ENEMY_ENTRY_OFFSET + slotIndex * ENEMY_ENTRY_STAGGER_X;
}

/** Opening formation: melee forward on X, DNF-style lane spread on Y. */
export function heroFormationOffset(
  attackRange: number,
  slotIndex: number,
  heroId: string,
): { x: number; y: number } {
  const rank = attackRange >= 200 ? 0 : attackRange >= 120 ? 48 : 92;
  const stagger = slotIndex * 28;
  const jitter = (unitNoise(heroId, 3) - 0.5) * 14;
  return {
    x: 70 + rank + stagger + jitter,
    y: laneOffsetY(`hero-${slotIndex}-${heroId}`, slotIndex, "heroes"),
  };
}
