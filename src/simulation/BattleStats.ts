import type {
  BattleEvent,
  BattleSnapshot,
  CombatAttribution,
  HeroId,
} from "./types";

export type BattleStatsMetric = "damage" | "taken" | "healing";

export interface BattleStatsEntry {
  heroId: HeroId;
  damage: number;
  taken: number;
  healing: number;
}

export interface BattleStatsSourceEntry {
  key: string;
  attribution: CombatAttribution;
  amount: number;
  events: number;
}

interface MutableSourceEntry extends BattleStatsSourceEntry {}

interface MutableBattleStatsEntry extends BattleStatsEntry {
  sources: Record<BattleStatsMetric, Map<string, MutableSourceEntry>>;
}

const OTHER_ATTRIBUTION: CombatAttribution = { kind: "other", id: "other" };
const BASIC_ATTRIBUTION: CombatAttribution = { kind: "basic", id: "basic" };

function sourceKey(attribution: CombatAttribution): string {
  return `${attribution.kind}:${attribution.id}`;
}

export class BattleStatsCollector {
  private encounterKey = "";
  private readonly entries = new Map<HeroId, MutableBattleStatsEntry>();
  private readonly unitHeroes = new Map<string, HeroId>();
  private readonly castSources = new Map<string, CombatAttribution>();
  private changeRevision = 0;

  get revision(): number {
    return this.changeRevision;
  }

  syncSnapshot(snapshot: BattleSnapshot, party: readonly (HeroId | null)[]): boolean {
    const encounterKey = `${snapshot.stage}:${snapshot.seed}`;
    const reset = encounterKey !== this.encounterKey;
    if (reset) {
      this.encounterKey = encounterKey;
      this.entries.clear();
      this.unitHeroes.clear();
      this.castSources.clear();
      this.changeRevision += 1;
    }

    let changed = false;
    for (const heroId of party) {
      if (heroId) changed = this.ensureEntry(heroId).created || changed;
    }
    for (const unit of snapshot.units) {
      if (unit.team !== "heroes" || !unit.sourceId.startsWith("H")) continue;
      const heroId = unit.sourceId as HeroId;
      this.unitHeroes.set(unit.id, heroId);
      changed = this.ensureEntry(heroId).created || changed;
    }
    if (changed && !reset) this.changeRevision += 1;
    return reset;
  }

  record(events: readonly BattleEvent[]): boolean {
    const completedCasts = new Set<string>();
    for (const event of events) {
      if (event.type === "skill:started" || event.type === "skill:resolved") {
        this.castSources.set(event.castId, { kind: "activeSkill", id: event.skillId });
      }
      if (event.type === "skill:resolved" || event.type === "skill:cancelled") {
        completedCasts.add(event.castId);
      }
    }

    let changed = false;
    for (const event of events) {
      if (event.type === "damage") {
        const attribution = this.resolveAttribution(event);
        const sourceHeroId = this.unitHeroes.get(event.sourceId);
        const targetHeroId = this.unitHeroes.get(event.targetId);
        if (sourceHeroId) {
          this.add(sourceHeroId, "damage", event.amount, attribution);
          changed = true;
        }
        if (targetHeroId) {
          this.add(targetHeroId, "taken", event.amount, attribution);
          changed = true;
        }
      } else if (event.type === "heal") {
        const sourceHeroId = this.unitHeroes.get(event.sourceId);
        if (sourceHeroId && event.amount > 0) {
          this.add(sourceHeroId, "healing", event.amount, this.resolveAttribution(event));
          changed = true;
        }
      }
    }

    for (const castId of completedCasts) this.castSources.delete(castId);
    if (changed) this.changeRevision += 1;
    return changed;
  }

  sortedEntries(
    party: readonly (HeroId | null)[],
    metric: BattleStatsMetric,
  ): BattleStatsEntry[] {
    const partyOrder = party.filter((heroId): heroId is HeroId => Boolean(heroId));
    for (const heroId of partyOrder) this.ensureEntry(heroId);
    const formationIndex = new Map(partyOrder.map((heroId, index) => [heroId, index]));
    return [...this.entries.values()]
      .filter(({ heroId }) => formationIndex.has(heroId))
      .sort((left, right) =>
        right[metric] - left[metric]
        || (formationIndex.get(left.heroId) ?? 0) - (formationIndex.get(right.heroId) ?? 0))
      .map(({ heroId, damage, taken, healing }) => ({ heroId, damage, taken, healing }));
  }

  sources(heroId: HeroId, metric: BattleStatsMetric): BattleStatsSourceEntry[] {
    const entry = this.entries.get(heroId);
    if (!entry) return [];
    return [...entry.sources[metric].values()]
      .sort((left, right) => right.amount - left.amount)
      .map(({ key, attribution, amount, events }) => ({ key, attribution, amount, events }));
  }

  private ensureEntry(heroId: HeroId): { entry: MutableBattleStatsEntry; created: boolean } {
    const existing = this.entries.get(heroId);
    if (existing) return { entry: existing, created: false };
    const entry: MutableBattleStatsEntry = {
      heroId,
      damage: 0,
      taken: 0,
      healing: 0,
      sources: {
        damage: new Map(),
        taken: new Map(),
        healing: new Map(),
      },
    };
    this.entries.set(heroId, entry);
    return { entry, created: true };
  }

  private add(
    heroId: HeroId,
    metric: BattleStatsMetric,
    amount: number,
    attribution: CombatAttribution,
  ): void {
    if (amount <= 0) return;
    const { entry } = this.ensureEntry(heroId);
    entry[metric] += amount;
    const key = sourceKey(attribution);
    const existing = entry.sources[metric].get(key);
    if (existing) {
      existing.amount += amount;
      existing.events += 1;
    } else {
      entry.sources[metric].set(key, { key, attribution, amount, events: 1 });
    }
  }

  private resolveAttribution(
    event: Extract<BattleEvent, { type: "damage" | "heal" }>,
  ): CombatAttribution {
    if (event.attribution) return event.attribution;
    if (event.skillCastId) return this.castSources.get(event.skillCastId) ?? OTHER_ATTRIBUTION;
    if (event.type === "damage" && event.attackId) return BASIC_ATTRIBUTION;
    return OTHER_ATTRIBUTION;
  }
}
