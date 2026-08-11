import type { StatusInstance, UnitState } from "./types";

export function applyStatus(unit: UnitState, incoming: StatusInstance): void {
  const existing = unit.statuses.find(({ kind }) => kind === incoming.kind);
  if (!existing) {
    unit.statuses.push({ ...incoming });
    return;
  }
  existing.magnitude = Math.max(existing.magnitude, incoming.magnitude);
  existing.remainingMs = Math.max(existing.remainingMs, incoming.remainingMs);
  if (incoming.magnitude >= existing.magnitude) existing.sourceId = incoming.sourceId;
}

export function advanceStatuses(unit: UnitState, deltaMs: number): void {
  for (const status of unit.statuses) status.remainingMs -= deltaMs;
  unit.statuses = unit.statuses.filter(({ remainingMs }) => remainingMs > 0);
}

export function getStatusMagnitude(unit: UnitState, kind: StatusInstance["kind"]): number {
  return unit.statuses.find((status) => status.kind === kind)?.magnitude ?? 0;
}

export const isStunned = (unit: UnitState): boolean =>
  getStatusMagnitude(unit, "stun") > 0;
