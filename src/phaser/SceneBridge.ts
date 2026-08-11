import type { BattleEvent, BattleSnapshot, UnitState } from "../simulation/types";

export interface BattleViewAdapter {
  createUnit(unit: UnitState): void;
  updateUnit(unit: UnitState): void;
  removeUnit(id: string): void;
  playEvent(event: BattleEvent): void;
}

export class SceneBridge {
  private knownUnitIds = new Set<string>();

  constructor(private readonly adapter: BattleViewAdapter) {}

  sync(snapshot: BattleSnapshot, events: readonly BattleEvent[]): void {
    const nextIds = new Set(snapshot.units.map(({ id }) => id));
    for (const unit of snapshot.units) {
      if (!this.knownUnitIds.has(unit.id)) {
        this.adapter.createUnit(unit);
        this.knownUnitIds.add(unit.id);
      } else {
        this.adapter.updateUnit(unit);
      }
    }
    for (const id of this.knownUnitIds) {
      if (!nextIds.has(id)) {
        this.adapter.removeUnit(id);
        this.knownUnitIds.delete(id);
      }
    }
    for (const event of events) this.adapter.playEvent(event);
  }

  reset(): void {
    for (const id of this.knownUnitIds) this.adapter.removeUnit(id);
    this.knownUnitIds.clear();
  }
}
