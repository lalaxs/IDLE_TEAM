import { HERO_BY_ID } from "../content/heroes";
import type { HeroId, TargetStrategy, UnitState } from "./types";

/** Short weapons stay near the foremost blocker; long weapons can cover a wider front. */
const MIN_MELEE_FLANK_BAND = 160;
/** A tank still intercepts while a diver is only slightly ahead on another lane. */
const TANK_INTERCEPT_LEEWAY = 64;

function meleeFlankBand(source: UnitState): number {
  return Math.max(MIN_MELEE_FLANK_BAND, source.attackRange * 2);
}

export function isTankUnit(unit: UnitState): boolean {
  return unit.team === "heroes"
    && HERO_BY_ID[unit.sourceId as HeroId]?.expeditionRole === "tank";
}

export function selectTauntTarget(
  source: UnitState,
  units: readonly UnitState[],
): UnitState | null {
  if (source.team !== "enemies") return null;
  const taunt = source.statuses.find(
    (status) => status.kind === "taunt" && status.remainingMs > 0,
  );
  if (!taunt) return null;
  return units.find(
    (unit) => unit.id === taunt.sourceId && unit.alive && unit.team !== source.team,
  ) ?? null;
}

export function selectTarget(
  source: UnitState,
  units: readonly UnitState[],
  strategy: TargetStrategy,
): UnitState | null {
  const candidates = units.filter((unit) => {
    if (!unit.alive) return false;
    if (strategy === "lowestHpAlly") {
      return unit.team === source.team && unit.hp < unit.maxHp;
    }
    return unit.team !== source.team;
  });

  if (candidates.length === 0) return null;
  const taunted = selectTauntTarget(source, candidates);
  if (taunted) return taunted;
  if (strategy === "lowestHpEnemy" || strategy === "lowestHpAlly") {
    return [...candidates].sort(
      (left, right) =>
        left.hp / left.maxHp - right.hp / right.maxHp
        || left.id.localeCompare(right.id),
    )[0]!;
  }
  if (strategy === "frontmostEnemy") {
    const tanks = source.team === "enemies" ? candidates.filter(isTankUnit) : [];
    return [...(tanks.length > 0 ? tanks : candidates)].sort((left, right) => {
      const order = source.team === "heroes" ? left.x - right.x : right.x - left.x;
      return order || left.id.localeCompare(right.id);
    })[0]!;
  }
  return [...candidates].sort(
    (left, right) =>
      Math.abs(left.x - source.x) - Math.abs(right.x - source.x)
      || left.id.localeCompare(right.id),
  )[0]!;
}

/** Melee cannot pass through a nearer opponent on the horizontal battle line. */
export function resolveMeleeFrontTarget(
  source: UnitState,
  preferred: UnitState | null,
  units: readonly UnitState[],
): UnitState | null {
  if (!preferred || source.attackMode !== "melee") return preferred;
  const direction = Math.sign(preferred.x - source.x);
  if (direction === 0) return preferred;
  const preferredDistance = Math.abs(preferred.x - source.x);
  const nearestOpponentDistance = Math.min(
    ...units
      .filter((candidate) => {
        if (!candidate.alive || candidate.team === source.team) return false;
        return Math.sign(candidate.x - source.x) === direction;
      })
      .map((candidate) => Math.abs(candidate.x - source.x)),
  );
  const taunted = selectTauntTarget(source, units);
  const tankIntercepts = source.team === "enemies"
    && preferred.attackMode === "melee"
    && isTankUnit(preferred);
  if (
    (taunted?.id === preferred.id || tankIntercepts)
    && preferredDistance <= nearestOpponentDistance + TANK_INTERCEPT_LEEWAY
  ) {
    return preferred;
  }
  const hasMeleePeer = units.some((candidate) =>
    candidate.alive
    && candidate.id !== source.id
    && candidate.team === source.team
    && candidate.attackMode === "melee",
  );
  if (!hasMeleePeer) {
    return units
      .filter((candidate) => {
        if (!candidate.alive || candidate.team === source.team) return false;
        const offset = candidate.x - source.x;
        return Math.sign(offset) === direction && Math.abs(offset) <= preferredDistance;
      })
      .sort(
        (left, right) =>
          Math.abs(left.x - source.x) - Math.abs(right.x - source.x)
          || left.id.localeCompare(right.id),
      )[0] ?? preferred;
  }
  const blockers = units
    .filter((candidate) => {
      if (!candidate.alive || candidate.team === source.team) return false;
      const offset = candidate.x - source.x;
      return Math.sign(offset) === direction;
    });
  if (blockers.length === 0) return preferred;
  const nearestDistance = Math.min(
    ...blockers.map((candidate) => Math.abs(candidate.x - source.x)),
  );
  return blockers
    .filter((candidate) =>
      Math.abs(candidate.x - source.x) <= nearestDistance + meleeFlankBand(source),
    )
    .sort(
      (left, right) =>
        Math.abs(left.y - source.y) - Math.abs(right.y - source.y)
        || Math.abs(left.x - source.x) - Math.abs(right.x - source.x)
        || left.id.localeCompare(right.id),
    )[0] ?? preferred;
}
