import type { UnitState } from "../simulation/types";

const WORLD_WIDTH = 1000;
/** Keep the party near this world offset inside the view (slightly left of center). */
const HERO_ANCHOR = 380;

function averageX(units: readonly UnitState[]): number {
  return units.reduce((sum, { x }) => sum + x, 0) / units.length;
}

/**
 * Frame only the party. Enemy spawn / march-in positions must never yank the lens
 * — heroes stay mid-left while foes walk in from the right of that frame.
 */
export function calculateBattleCameraX(units: readonly UnitState[]): number {
  const heroes = units.filter(({ team, alive }) => team === "heroes" && alive);
  if (heroes.length > 0) {
    return Math.max(0, averageX(heroes) - HERO_ANCHOR);
  }
  const fallback = units.filter(({ alive }) => alive);
  if (fallback.length === 0) return 0;
  return Math.max(0, averageX(fallback) - HERO_ANCHOR);
}

export function projectBattleX(worldX: number, cameraX: number, viewportWidth: number): number {
  return ((worldX - cameraX) / WORLD_WIDTH) * viewportWidth;
}

export function calculateParallaxOffset(cameraX: number, factor: number, span: number): number {
  if (span <= 0) return 0;
  return -((cameraX * factor) % span);
}
