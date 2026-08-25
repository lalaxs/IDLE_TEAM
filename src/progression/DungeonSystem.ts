import {
  DUNGEON_BY_ID,
  isDailyDungeonOpen,
  isDungeonUnlocked,
  type DungeonDefinition,
  type DungeonId,
} from "../content/dungeons";
import type { MaterialId } from "../content/materials";
import type { DungeonRun, HeroProgress, SaveDataV1 } from "../persistence/schema";
import { SeededRandom } from "../simulation/RandomSource";
import type { HeroId } from "../simulation/types";

export interface DungeonClearReward {
  dungeonId: DungeonId;
  gold: number;
  exp: number;
  materials: Partial<Record<MaterialId, number>>;
}

export type DungeonRunStatus = "idle" | "running" | "ready";

export function rollDungeonRewards(dungeon: DungeonDefinition, seed: number): DungeonClearReward {
  const random = new SeededRandom(seed);
  const materials: Partial<Record<MaterialId, number>> = {};
  for (const drop of dungeon.drops) {
    let amount = drop.amount;
    if (random.next() < drop.bonusChance) amount += 1;
    materials[drop.materialId] = (materials[drop.materialId] ?? 0) + amount;
  }
  return {
    dungeonId: dungeon.id,
    gold: dungeon.gold,
    exp: dungeon.exp,
    materials,
  };
}

export function getActiveDungeon(dungeonId: string | null | undefined): DungeonDefinition | null {
  if (!dungeonId || !(dungeonId in DUNGEON_BY_ID)) return null;
  return DUNGEON_BY_ID[dungeonId as DungeonId];
}

export function getDungeonRun(runs: readonly DungeonRun[], dungeonId: DungeonId): DungeonRun | undefined {
  return runs.find((run) => run.dungeonId === dungeonId);
}

export function getBusyHeroIds(runs: readonly DungeonRun[]): Set<HeroId> {
  return new Set(runs.flatMap((run) => run.heroIds));
}

export function getExploringHeroIds(party: SaveDataV1["party"]): Set<HeroId> {
  return new Set(party.filter((id): id is HeroId => id != null));
}

export function isHeroBusy(runs: readonly DungeonRun[], heroId: HeroId): boolean {
  return runs.some((run) => run.heroIds.includes(heroId));
}

export function isDungeonRunReady(run: DungeonRun, now = Date.now()): boolean {
  return now >= run.endsAt;
}

export function getDungeonRunRemainingMs(run: DungeonRun, now = Date.now()): number {
  return Math.max(0, run.endsAt - now);
}

export function getDungeonRunStatus(run: DungeonRun | undefined, now = Date.now()): DungeonRunStatus {
  if (!run) return "idle";
  return isDungeonRunReady(run, now) ? "ready" : "running";
}

export function formatDungeonDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} 分钟`;
}

export function formatDungeonCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function countIdleUnlockedHeroes(
  roster: Record<HeroId, HeroProgress>,
  busyHeroes: ReadonlySet<HeroId>,
): number {
  return Object.values(roster).filter((progress) => progress.unlocked && !busyHeroes.has(progress.heroId)).length;
}

export function removeHeroesFromParty(
  party: SaveDataV1["party"],
  heroIds: readonly HeroId[],
): SaveDataV1["party"] {
  const removing = new Set(heroIds);
  return party.map((id) => (id && removing.has(id) ? null : id)) as SaveDataV1["party"];
}

export function fillEmptyParty(
  party: SaveDataV1["party"],
  roster: Record<HeroId, HeroProgress>,
  busyHeroes: ReadonlySet<HeroId>,
): SaveDataV1["party"] {
  if (party.some((id) => id !== null)) return party;
  const fallback = Object.values(roster).find((progress) => progress.unlocked && !busyHeroes.has(progress.heroId));
  if (!fallback) return party;
  const next = [...party] as SaveDataV1["party"];
  next[0] = fallback.heroId;
  return next;
}

export function validateDungeonDispatch(options: {
  dungeonId: DungeonId;
  heroIds: readonly HeroId[];
  save: SaveDataV1;
  dateKey: string;
  now?: number;
}): string | null {
  const dungeon = DUNGEON_BY_ID[options.dungeonId];
  if (!dungeon || !isDungeonUnlocked(dungeon, options.save.highestClearedStage)) {
    return "副本尚未解锁";
  }
  if (!isDailyDungeonOpen(options.dungeonId, options.dateKey)) {
    return "今日未开放该副本";
  }
  if (getDungeonRun(options.save.dungeonRuns, options.dungeonId)) {
    return "该副本正在派遣中";
  }
  const heroes = [...new Set(options.heroIds)];
  if (heroes.length !== dungeon.partySize || heroes.length !== options.heroIds.length) {
    return `需要派出 ${dungeon.partySize} 名英雄`;
  }
  const busy = getBusyHeroIds(options.save.dungeonRuns);
  const exploring = getExploringHeroIds(options.save.party);
  for (const heroId of heroes) {
    if (!options.save.roster[heroId]?.unlocked) return "英雄未解锁";
    if (busy.has(heroId)) return "该英雄正在副本中";
    if (exploring.has(heroId)) return "该英雄正在主线探索";
  }
  const nextBusy = new Set(busy);
  for (const heroId of heroes) nextBusy.add(heroId);
  if (countIdleUnlockedHeroes(options.save.roster, nextBusy) < 1) {
    return "至少留一名英雄继续主线";
  }
  return null;
}
