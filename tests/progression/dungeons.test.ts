import { describe, expect, it } from "vitest";
import {
  DAILY_DUNGEON_COUNT,
  DUNGEON_BY_ID,
  DUNGEON_DEFINITIONS,
  applyDungeonBonusToHero,
  getDailyDungeonIds,
  isDailyDungeonOpen,
} from "../../src/content/dungeons";
import { getBusyHeroIds, getExploringHeroIds, rollDungeonRewards } from "../../src/progression/DungeonSystem";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import type { HeroId } from "../../src/simulation/types";

function unlockAll(save = createDefaultSave()) {
  save.highestClearedStage = 120;
  save.highestUnlockedStage = 120;
  save.shop.dateKey = "2026-08-18";
  for (const progress of Object.values(save.roster)) progress.unlocked = true;
  save.party = ["H01", null, null, null, null];
  return save;
}

function pickHeroes(count: number, exclude: readonly HeroId[] = [], party: readonly (HeroId | null)[] = ["H01"]): HeroId[] {
  const blocked = new Set<HeroId>([...exclude, ...party.filter((id): id is HeroId => id != null)]);
  const ids: HeroId[] = [];
  for (const progress of Object.values(unlockAll().roster)) {
    if (blocked.has(progress.heroId)) continue;
    ids.push(progress.heroId);
    if (ids.length === count) break;
  }
  return ids;
}

describe("dungeons", () => {
  it("defines twenty farmable dungeons with dispatch size and duration", () => {
    expect(DUNGEON_DEFINITIONS).toHaveLength(20);
    for (const dungeon of DUNGEON_DEFINITIONS) {
      expect(dungeon.drops.length).toBeGreaterThan(0);
      expect(dungeon.bonusLabel.length).toBeGreaterThan(0);
      expect(dungeon.powerStage).toBeGreaterThan(0);
      expect(dungeon.partySize).toBeGreaterThanOrEqual(2);
      expect(dungeon.durationMs).toBeGreaterThan(0);
    }
    expect(DUNGEON_BY_ID.D01.partySize).toBe(2);
    expect(DUNGEON_BY_ID.D01.durationMs).toBe(15 * 60_000);
    expect(DUNGEON_BY_ID.D08.partySize).toBe(3);
    expect(DUNGEON_BY_ID.D15.partySize).toBe(4);
    expect(DUNGEON_BY_ID.D18.partySize).toBe(5);
    expect(DUNGEON_BY_ID.D20.durationMs).toBe(60 * 60_000);
  });

  it("opens exactly three deterministic daily dungeons", () => {
    const a = getDailyDungeonIds("2026-08-18");
    const b = getDailyDungeonIds("2026-08-18");
    const c = getDailyDungeonIds("2026-08-19");
    expect(a).toHaveLength(DAILY_DUNGEON_COUNT);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(DAILY_DUNGEON_COUNT);
    expect(a).not.toEqual(c);
    expect(isDailyDungeonOpen(a[0]!, "2026-08-18")).toBe(true);
  });

  it("applies shared school bonuses to matching damage schools", () => {
    const dungeon = DUNGEON_DEFINITIONS.find((entry) => entry.id === "D02")!;
    const physical = applyDungeonBonusToHero(dungeon, "狂战", "physical", {});
    const magic = applyDungeonBonusToHero(dungeon, "火法", "magic", {});
    expect(physical.physicalDamagePct ?? 0).toBeGreaterThan(0);
    expect(magic.physicalDamagePct ?? 0).toBe(0);
  });

  it("applies party bonuses to every hero", () => {
    const dungeon = DUNGEON_DEFINITIONS.find((entry) => entry.id === "D05")!;
    const a = applyDungeonBonusToHero(dungeon, "盾卫", "physical", {});
    const b = applyDungeonBonusToHero(dungeon, "火法", "magic", {});
    expect(a.attackSpeedPct ?? 0).toBeGreaterThan(0);
    expect(b.attackSpeedPct ?? 0).toBe(a.attackSpeedPct);
  });

  it("rolls material rewards for dungeon clears", () => {
    const dungeon = DUNGEON_DEFINITIONS[10]!;
    const reward = rollDungeonRewards(dungeon, 42);
    expect(reward.gold).toBe(dungeon.gold);
    expect(Object.keys(reward.materials).length).toBeGreaterThan(0);
  });

  it("dispatches heroes into a daily dungeon and keeps mainline party filled", () => {
    const save = unlockAll();
    const daily = getDailyDungeonIds(save.shop.dateKey);
    const dungeon = DUNGEON_BY_ID[daily[0]!];
    const heroes = pickHeroes(dungeon.partySize);
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: heroes });
    const next = store.getState().save;
    expect(next.dungeonRuns).toHaveLength(1);
    expect(next.dungeonRuns[0]?.dungeonId).toBe(dungeon.id);
    expect(next.dungeonRuns[0]?.heroIds).toEqual(heroes);
    expect(next.party.some((id) => id && heroes.includes(id))).toBe(false);
    expect(next.party).toContain("H01");
    expect(getBusyHeroIds(next.dungeonRuns).size).toBe(dungeon.partySize);
  });

  it("rejects heroes currently exploring the mainline", () => {
    const save = unlockAll();
    const dungeon = DUNGEON_BY_ID.D01;
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: ["H01", "H02"] });
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(getExploringHeroIds(store.getState().save.party).has("H01")).toBe(true);
  });

  it("rejects a dispatch that would leave no mainline hero", () => {
    const save = unlockAll();
    for (const progress of Object.values(save.roster)) progress.unlocked = false;
    save.roster.H01.unlocked = true;
    save.roster.H02.unlocked = true;
    save.party = ["H01", "H02", null, null, null];
    const dungeon = DUNGEON_BY_ID.D01;
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: ["H01", "H02"] });
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(store.getState().save.party).toEqual(["H01", "H02", null, null, null]);
  });

  it("allows two daily dungeons at once and rejects overlapping heroes", () => {
    let dateKey = "2026-08-18";
    let first = DUNGEON_BY_ID[getDailyDungeonIds(dateKey)[0]!];
    let second = DUNGEON_BY_ID[getDailyDungeonIds(dateKey)[1]!];
    for (let day = 1; day <= 28; day += 1) {
      const key = `2026-08-${String(day).padStart(2, "0")}`;
      const defs = getDailyDungeonIds(key).map((id) => DUNGEON_BY_ID[id]);
      const pair = defs.filter((dungeon) => dungeon.partySize <= 3);
      if (pair.length >= 2 && pair[0]!.partySize + pair[1]!.partySize <= 6) {
        dateKey = key;
        first = pair[0]!;
        second = pair[1]!;
        break;
      }
    }
    const save = unlockAll();
    save.shop.dateKey = dateKey;
    const firstHeroes = pickHeroes(first.partySize);
    const secondHeroes = pickHeroes(second.partySize, firstHeroes);
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: first.id, heroIds: firstHeroes });
    const overlap = [firstHeroes[0]!, ...pickHeroes(second.partySize - 1, firstHeroes)];
    store.dispatch({ type: "dungeon:dispatch", dungeonId: second.id, heroIds: overlap });
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: second.id, heroIds: secondHeroes });
    expect(store.getState().save.dungeonRuns).toHaveLength(2);
  });

  it("cannot claim before the timer ends, then grants materials and frees heroes", () => {
    const save = unlockAll();
    const dungeon = DUNGEON_BY_ID[getDailyDungeonIds(save.shop.dateKey)[0]!];
    const heroes = pickHeroes(dungeon.partySize);
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: heroes });
    const goldBefore = store.getState().save.gold;
    store.dispatch({ type: "dungeon:claim", dungeonId: dungeon.id });
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    expect(getBusyHeroIds(store.getState().save.dungeonRuns).has(heroes[0]!)).toBe(true);
    store.getState().save.dungeonRuns[0]!.endsAt = Date.now() - 1;
    store.dispatch({ type: "dungeon:claim", dungeonId: dungeon.id });
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(getBusyHeroIds(store.getState().save.dungeonRuns).size).toBe(0);
    expect(store.getState().save.gold).toBe(goldBefore + dungeon.gold);
  });

  it("rejects dungeons that are not in today's rotation", () => {
    const save = unlockAll();
    const daily = new Set(getDailyDungeonIds(save.shop.dateKey));
    const closed = DUNGEON_DEFINITIONS.find((dungeon) => !daily.has(dungeon.id))!;
    const store = new GameStore(save);
    store.dispatch({
      type: "dungeon:dispatch",
      dungeonId: closed.id,
      heroIds: pickHeroes(closed.partySize),
    });
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
  });

  it("drops obsolete farm-mode fields when repairing old saves", () => {
    const save = repairSaveData({
      version: 1,
      battleMode: "dungeon",
      currentDungeonId: "D01",
      gold: 40,
    });
    expect(save.dungeonRuns).toEqual([]);
    expect(save.gold).toBe(40);
  });
});
