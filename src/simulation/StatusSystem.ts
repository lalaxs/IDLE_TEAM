import type { StatusInstance, UnitState } from "./types";

function statusIdentity(status: StatusInstance): string {
  return status.effectId ?? status.kind;
}

export function applyStatus(unit: UnitState, incoming: StatusInstance): void {
  const identity = statusIdentity(incoming);
  const existing = unit.statuses.find(
    (status) => status.kind === incoming.kind
      && status.sourceId === incoming.sourceId
      && statusIdentity(status) === identity,
  );
  if (!existing) {
    unit.statuses.push({ ...incoming });
    return;
  }
  if (incoming.magnitude > existing.magnitude) {
    existing.magnitude = incoming.magnitude;
    existing.remainingMs = incoming.remainingMs;
    return;
  }
  if (incoming.magnitude === existing.magnitude) {
    existing.remainingMs = Math.max(existing.remainingMs, incoming.remainingMs);
  }
}

export function advanceStatuses(unit: UnitState, deltaMs: number): void {
  for (const status of unit.statuses) status.remainingMs -= deltaMs;
  unit.statuses = unit.statuses.filter(({ remainingMs }) => remainingMs > 0);
}

export function getStatusMagnitude(unit: UnitState, kind: StatusInstance["kind"]): number {
  return unit.statuses.reduce(
    (strongest, status) => status.kind === kind ? Math.max(strongest, status.magnitude) : strongest,
    0,
  );
}

export const isStunned = (unit: UnitState): boolean =>
  getStatusMagnitude(unit, "stun") > 0;
