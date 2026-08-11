import type { TargetStrategy, UnitState } from "./types";

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
  if (strategy === "lowestHpEnemy" || strategy === "lowestHpAlly") {
    return [...candidates].sort(
      (left, right) => left.hp / left.maxHp - right.hp / right.maxHp,
    )[0]!;
  }
  if (strategy === "frontmostEnemy") {
    return [...candidates].sort((left, right) =>
      source.team === "heroes" ? left.x - right.x : right.x - left.x,
    )[0]!;
  }
  return [...candidates].sort(
    (left, right) => Math.abs(left.x - source.x) - Math.abs(right.x - source.x),
  )[0]!;
}
