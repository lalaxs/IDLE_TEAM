import type { UnitState } from "../simulation/types";

const WORLD_WIDTH = 1000;
const VIEW_CENTER_WORLD_X = WORLD_WIDTH / 2;
const POSITION_RESPONSE_MS = 75;

export function findFrontmostLivingHero(units: readonly UnitState[]): UnitState | null {
  let front: UnitState | null = null;
  for (const unit of units) {
    if (unit.team !== "heroes" || !unit.alive) continue;
    if (!front || unit.x > front.x) front = unit;
  }
  return front;
}

/** Frame the destination while the party runs in from beyond the left edge. */
export function findHeroEntryCameraAnchor(units: readonly UnitState[]): number | null {
  const leader = findFrontmostLivingHero(
    units.filter((unit) => unit.passiveFlags.heroEntryActive === true),
  );
  if (!leader) return null;
  const holdX = leader.passiveFlags.holdX;
  return typeof holdX === "number" ? holdX : leader.x;
}

export function battleCameraXForAnchor(anchorWorldX: number): number {
  return anchorWorldX - VIEW_CENTER_WORLD_X;
}

/** Smooth fixed-step simulation coordinates for frame-rate rendering. */
export function advanceBattleRenderX(
  currentX: number,
  targetX: number,
  deltaMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || Math.abs(targetX - currentX) < 0.01) return targetX;
  const blend = 1 - Math.exp(-Math.max(0, deltaMs) / POSITION_RESPONSE_MS);
  return currentX + (targetX - currentX) * blend;
}

/** Briefly soften a camera anchor change when another hero becomes the leader. */
export function interpolateLeaderCameraAnchor(
  fromX: number,
  targetX: number,
  elapsedMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return targetX;
  const progress = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const eased = 1 - (1 - progress) ** 3;
  return fromX + (targetX - fromX) * eased;
}

/**
 * Keep the frontmost living hero at the horizontal center of the battle view.
 * Enemies and trailing allies never influence the camera anchor.
 */
export function calculateBattleCameraX(
  units: readonly UnitState[],
  fallbackX = 0,
): number {
  const front = findFrontmostLivingHero(units);
  return front === null ? fallbackX : battleCameraXForAnchor(front.x);
}

export function projectBattleX(worldX: number, cameraX: number, viewportWidth: number): number {
  return ((worldX - cameraX) / WORLD_WIDTH) * viewportWidth;
}

export function calculateParallaxOffset(cameraX: number, factor: number, span: number): number {
  if (span <= 0) return 0;
  return -((cameraX * factor) % span);
}

export interface MirroredStripLayout {
  segmentIndex: number;
  localOffset: number;
}

/** Position a normal/mirrored image pair as one continuous repeating strip. */
export function calculateMirroredStripLayout(
  scroll: number,
  segmentWidth: number,
): MirroredStripLayout {
  const width = Math.max(1, segmentWidth);
  const distance = Math.max(0, scroll);
  return {
    segmentIndex: Math.floor(distance / width),
    localOffset: distance % width,
  };
}
