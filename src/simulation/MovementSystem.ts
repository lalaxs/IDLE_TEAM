import { ENEMY_BY_ID } from "../content/enemies";
import { getEnemyCombatProfile } from "../content/enemyCombatProfiles";
import { HERO_BY_ID } from "../content/heroes";
import { getStatusMagnitude, isStunned } from "./StatusSystem";
import {
  isTankUnit,
  resolveMeleeFrontTarget,
  selectTarget,
  selectTauntTarget,
} from "./TargetingSystem";
import type { BattleEvent, EnemyId, HeroId, UnitState } from "./types";

/** Same-team spacing keeps a readable rank without flattening the lane formation. */
const HERO_GAP = 82;
const ENEMY_GAP = 74;
/** Non-tank melee may edge past the tank, but never become the natural vanguard. */
const NON_TANK_FRONTLINE_LEAD = 28;
/** Extra projectile reach for ranged combatants on both teams. */
export const RANGED_ATTACK_RANGE_BONUS = 48;
/** Combat footprints are world-space radii, independent from sprite animation scale. */
const HERO_BODY_RADIUS = 70;
const NORMAL_ENEMY_BODY_RADIUS = 82;
const ELITE_ENEMY_BODY_RADIUS = 100;
const BOSS_ENEMY_BODY_RADIUS = 124;
/** Projectiles may connect with the full visible silhouette rather than the ground footprint. */
const HERO_PROJECTILE_RADIUS = 92;
const NORMAL_ENEMY_PROJECTILE_RADIUS = 104;
const ELITE_ENEMY_PROJECTILE_RADIUS = 122;
const BOSS_ENEMY_PROJECTILE_RADIUS = 150;
const MIN_MELEE_REACH = 30;

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
    // A visible cast bar means the unit has planted to complete the spell.
    if (unit.skillPrepareMs !== null || unit.specialization?.channel) continue;
    const current = units.find(({ id }) => id === unit.targetId && id !== unit.id);
    const enemyDefinition = unit.team === "enemies"
      ? ENEMY_BY_ID[unit.sourceId as EnemyId]
      : undefined;
    const strategy = enemyDefinition
      ? getEnemyCombatProfile(
          enemyDefinition.combatProfileId,
          enemyDefinition.kind,
        ).targetStrategy
      : "nearestEnemy";
    const taunted = selectTauntTarget(unit, units);
    const preferredTarget =
      taunted
        ? taunted
        : current?.alive && current.team !== unit.team
        ? current
        : selectTarget(unit, units, strategy);
    const target = resolveMeleeFrontTarget(unit, preferredTarget, units);
    unit.targetId = target?.id ?? null;
    if (!target) continue;
    const direction = unit.team === "heroes" ? 1 : -1;
    const distance = (target.x - unit.x) * direction;
    const range = engageRange(unit, target);
    // Normal combat movement is monotonic: heroes only advance right and
    // enemies only advance left. A target that has crossed behind never
    // causes automatic backpedalling.
    if (distance <= 0) continue;
    if (distance <= range) continue;
    const movement = movementStep(unit, deltaMs);
    const allowedStep = Math.min(
      Math.max(0, distance - range),
      sameTeamAdvanceLimit(unit, units),
      frontlineAdvanceLimit(unit, units),
    );
    unit.x += direction * Math.min(movement, allowedStep);
  }
  return [];
}

function frontlineAdvanceLimit(unit: UnitState, units: readonly UnitState[]): number {
  if (unit.team !== "heroes" || unit.attackMode !== "melee" || isTankUnit(unit)) {
    return Number.POSITIVE_INFINITY;
  }
  const tanks = units.filter((candidate) => candidate.alive && isTankUnit(candidate));
  if (tanks.length === 0) return Number.POSITIVE_INFINITY;
  const frontlineX = Math.max(...tanks.map(({ x }) => x));
  return Math.max(0, frontlineX + NON_TANK_FRONTLINE_LEAD - unit.x);
}

/**
 * Stop a rear unit before it catches the ally in front. Equal-X ties use a
 * stable melee-first order so formation spread never needs a backward shove.
 */
function sameTeamAdvanceLimit(unit: UnitState, units: readonly UnitState[]): number {
  const direction = unit.team === "heroes" ? 1 : -1;
  const minGap = unit.team === "heroes" ? HERO_GAP : ENEMY_GAP;
  let limit = Number.POSITIVE_INFINITY;
  for (const ally of units) {
    if (!ally.alive || ally.team !== unit.team || ally.id === unit.id) continue;
    // Units on separate ground lanes may advance in parallel. Keeping the
    // full X gap across every lane turns the formation into a single-file queue.
    if (!sharesFormationLane(unit, ally)) continue;
    const forwardDistance = (ally.x - unit.x) * direction;
    // A lower-priority backliner never blocks a frontline unit from passing.
    if (forwardDistance > 0 && compareFormationPriority(ally, unit) > 0) continue;
    const allyWinsTie = Math.abs(forwardDistance) < 0.001
      && compareFormationPriority(ally, unit) < 0;
    if (forwardDistance <= 0 && !allyWinsTie) continue;
    limit = Math.min(limit, Math.max(0, forwardDistance - minGap));
  }
  return limit;
}

function sharesFormationLane(left: UnitState, right: UnitState): boolean {
  const leftLane = left.passiveFlags.formationLane;
  const rightLane = right.passiveFlags.formationLane;
  if (typeof leftLane === "number" && typeof rightLane === "number") {
    return leftLane === rightLane;
  }
  // Tests and externally constructed units may not carry authored lane data.
  return Math.abs(left.y - right.y) < 12;
}

function compareFormationPriority(left: UnitState, right: UnitState): number {
  const leftRank = left.attackMode === "melee" ? 0 : 1;
  const rightRank = right.attackMode === "melee" ? 0 : 1;
  return leftRank - rightRank
    || left.attackRange - right.attackRange
    || left.id.localeCompare(right.id);
}

/** Movement distance for one simulation step, shared by entry and combat travel. */
export function movementStep(unit: UnitState, deltaMs: number): number {
  const slow = getStatusMagnitude(unit, "slow");
  const haste = getStatusMagnitude(unit, "haste");
  return unit.moveSpeed * Math.max(0.2, 1 + haste - slow) * (deltaMs / 1000);
}

/** True when the unit has planted inside strike distance of its current foe. */
export function isPlantedForAttack(unit: UnitState, units: readonly UnitState[]): boolean {
  if (!unit.alive || !unit.targetId) return false;
  const target = units.find(({ id, alive }) => id === unit.targetId && alive);
  if (!target || target.team === unit.team) return false;
  return Math.abs(target.x - unit.x) <= engageRange(unit, target) + 2;
}

/** Stable combat footprint used by movement; rendering remains free to animate around it. */
export function combatBodyRadius(unit: UnitState): number {
  if (unit.team === "heroes") return HERO_BODY_RADIUS;
  const kind = ENEMY_BY_ID[unit.sourceId as EnemyId]?.kind;
  if (kind === "boss") return BOSS_ENEMY_BODY_RADIUS;
  if (kind === "elite") return ELITE_ENEMY_BODY_RADIUS;
  return NORMAL_ENEMY_BODY_RADIUS;
}

/** Full target silhouette used for projectile range without widening melee contact. */
function projectileTargetRadius(unit: UnitState): number {
  if (unit.team === "heroes") return HERO_PROJECTILE_RADIUS;
  const kind = ENEMY_BY_ID[unit.sourceId as EnemyId]?.kind;
  if (kind === "boss") return BOSS_ENEMY_PROJECTILE_RADIUS;
  if (kind === "elite") return ELITE_ENEMY_PROJECTILE_RADIUS;
  return NORMAL_ENEMY_PROJECTILE_RADIUS;
}

/** Minimum center distance before opposing character models touch. */
export function minimumOpponentGap(left: UnitState, right: UnitState): number {
  return combatBodyRadius(left) + combatBodyRadius(right);
}

/**
 * Legal strike distance. Melee reach starts outside both combat footprints;
 * ranged projectiles only need to reach the target footprint, not its center.
 */
export function engageRange(source: UnitState, target: UnitState): number {
  if (source.attackMode === "ranged") {
    return source.attackRange + RANGED_ATTACK_RANGE_BONUS + projectileTargetRadius(target);
  }
  return minimumOpponentGap(source, target) + Math.max(MIN_MELEE_REACH, source.attackRange);
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
export const HERO_ENTRY_OFFSET = 620;
/** Extra left spacing so later slots trail in sequence. */
export const HERO_ENTRY_STAGGER_X = 52;
/** Delay before each slot begins marching in. */
export const HERO_ENTRY_STAGGER_MS = 160;
/** March-in speed toward formation hold X. */
export const HERO_ENTRY_SPEED = 260;

/** How far right of hold X an enemy starts when entering from off-screen. */
export const ENEMY_ENTRY_OFFSET = 300;
/** Extra right spacing so later enemy slots trail in sequence. */
export const ENEMY_ENTRY_STAGGER_X = 78;
/** Delay before each enemy slot begins marching in. */
export const ENEMY_ENTRY_STAGGER_MS = 150;
/**
 * DNF-style path lanes in screen px relative to the ground line.
 * Keep the band inside the walkable dirt road (not into trees / bottom FG).
 * Negative = farther up the path; positive = closer to the camera.
 */
const HERO_LANE_Y = [-52, 26, -26, 52, 0] as const;
const ENEMY_LANE_Y = [-40, 24, -24, 40, 8, -8] as const;

/** Stable authored lane shared by movement and presentation. */
export function formationLane(
  slotIndex: number,
  team: "heroes" | "enemies" = "enemies",
): number {
  const laneCount = team === "heroes" ? HERO_LANE_Y.length : ENEMY_LANE_Y.length;
  return Math.max(0, slotIndex) % laneCount;
}

/**
 * Stable lane Y for a unit. A small identity offset keeps the formation organic.
 */
export function laneOffsetY(
  unitId: string,
  slotIndex: number,
  team: "heroes" | "enemies" = "enemies",
): number {
  const table = team === "heroes" ? HERO_LANE_Y : ENEMY_LANE_Y;
  const base = table[formationLane(slotIndex, team)] ?? (slotIndex - 2) * 16;
  const jitter = (unitNoise(unitId, 11) - 0.5) * (team === "heroes" ? 12 : 4);
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
  const rank = attackRange >= 200 ? 0 : attackRange >= 120 ? 56 : 112;
  const tankLead = HERO_BY_ID[heroId as HeroId]?.expeditionRole === "tank" ? 28 : 0;
  const stagger = (slotIndex % 2) * 14;
  const jitter = (unitNoise(heroId, 3) - 0.5) * 14;
  return {
    x: 82 + rank + tankLead + stagger + jitter,
    y: laneOffsetY(`hero-${slotIndex}-${heroId}`, slotIndex, "heroes"),
  };
}
