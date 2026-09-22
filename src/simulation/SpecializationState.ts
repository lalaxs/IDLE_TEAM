import type { SpecializationState, UnitState } from "./types";

export function specializationState(unit: UnitState): SpecializationState {
  return unit.specialization ??= { recentDamage: [], stagger: [], demons: [] };
}

export function recentDamage(unit: UnitState): number {
  return unit.specialization?.recentDamage.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
}

export function consumeRecentDamage(unit: UnitState, amount: number): void {
  for (const entry of specializationState(unit).recentDamage) {
    const consumed = Math.min(entry.amount, amount);
    entry.amount -= consumed;
    amount -= consumed;
    if (amount <= 0) break;
  }
}

export function specializationTalent(unit: UnitState, choice: 1 | 2 | 3): boolean {
  return Number(unit.passiveFlags.talentSpecialization ?? 0) === choice;
}
