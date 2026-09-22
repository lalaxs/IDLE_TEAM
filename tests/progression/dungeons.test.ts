import { describe, expect, it } from "vitest";
import {
  DAILY_DUNGEON_COUNT,
  DUNGEON_BY_ID,
  DUNGEON_DEFINITIONS,
  applyDungeonBonusToHero,
  getDailyDungeonIds,
  getDailyExpeditionRequirements,
  getExpeditionRequirements,
  getExpeditionEventIntervalMs,
  isDailyDungeonOpen,
} from "../../src/content/dungeons";
import { HERO_DEFINITIONS } from "../../src/content/heroes";
import {
  calculateExpeditionStamina,
  calculateHeroExpeditionStamina,
  estimateExpeditionDurationMs,
  getBusyHeroIds,
  getDungeonRunDetails,
  getDungeonRunProgress,
  getExploringHeroIds,
  heroMatchesExpeditionRequirement,
  rollDungeonRewards,
  validateDungeonDispatch,
} from "../../src/progression/DungeonSystem";
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
  it("defines twenty stamina-driven expeditions", () => {
    expect(DUNGEON_DEFINITIONS).toHaveLength(20);
    for (const dungeon of DUNGEON_DEFINITIONS) {
      expect(dungeon.drops.length).toBeGreaterThan(0);
      expect(dungeon.bonusLabel.length).toBeGreaterThan(0);
      expect(dungeon.powerStage).toBeGreaterThan(0);
      expect(dungeon.partySize).toBeGreaterThanOrEqual(2);
      expect(dungeon.staminaCost).toBeGreaterThan(0);
      expect(dungeon.environment.label.length).toBeGreaterThan(0);
      expect(dungeon.environment.favoredElements.length).toBeGreaterThan(0);
      expect(dungeon.environment.staminaBonusPct).toBe(0.25);
    }
    expect(DUNGEON_BY_ID.D01.partySize).toBe(2);
    expect(DUNGEON_BY_ID.D01.staminaCost).toBe(14);
    expect(DUNGEON_BY_ID.D08.partySize).toBe(3);
    expect(DUNGEON_BY_ID.D15.partySize).toBe(4);
    expect(DUNGEON_BY_ID.D18.partySize).toBe(5);
    expect(DUNGEON_BY_ID.D20.staminaCost).toBe(14);
  });

  it("balances one hundred stamina to about one hour of expedition time", () => {
    const interval = getExpeditionEventIntervalMs();
    expect(interval).toBe(5 * 60_000);
    expect(estimateExpeditionDurationMs(100)).toBe(60 * 60_000);
    const startedAt = 1_825_000_000_000;
    const durations = DUNGEON_DEFINITIONS.map((dungeon) => {
      const run = {
        dungeonId: dungeon.id,
        heroIds: [] as HeroId[],
        startedAt,
        maxStamina: 100,
      };
      for (let step = 1; step <= 30; step += 1) {
        if (getDungeonRunProgress(run, startedAt + interval * step).returned) {
          return interval * step;
        }
      }
      throw new Error(`${dungeon.id} did not return within the calibration window`);
    });
    const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    expect(averageDuration).toBeGreaterThanOrEqual(50 * 60_000);
    expect(averageDuration).toBeLessThanOrEqual(70 * 60_000);
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

  it("keeps one daily expedition unrestricted and gives the other two stable varied conditions", () => {
    const dateKey = "2026-08-18";
    const daily = getDailyDungeonIds(dateKey);
    const first = getDailyExpeditionRequirements(dateKey);
    const again = getDailyExpeditionRequirements(dateKey);
    expect(first).toEqual(again);
    expect(first[daily[0]!] ?? []).toHaveLength(0);
    expect(first[daily[1]!] ?? []).toHaveLength(1);
    expect(first[daily[2]!] ?? []).toHaveLength(1);
    expect(first[daily[1]!]![0]!.kind).not.toBe(first[daily[2]!]![0]!.kind);
  });

  it("enforces the daily condition while allowing a matching party", () => {
    const save = unlockAll();
    const dungeonId = getDailyDungeonIds(save.shop.dateKey)[1]!;
    const dungeon = DUNGEON_BY_ID[dungeonId];
    const requirement = getExpeditionRequirements(dungeonId, save.shop.dateKey)[0]!;
    const mainline = getExploringHeroIds(save.party);
    const matching = HERO_DEFINITIONS.filter((hero) => !mainline.has(hero.id) && heroMatchesExpeditionRequirement(hero.id, requirement));
    const nonMatching = HERO_DEFINITIONS.filter((hero) => !mainline.has(hero.id) && !heroMatchesExpeditionRequirement(hero.id, requirement));
    const required = requirement.count === "all" ? dungeon.partySize : requirement.count;
    const validHeroes = [
      ...matching.slice(0, required),
      ...nonMatching.slice(0, dungeon.partySize - required),
    ].map((hero) => hero.id);
    const invalidHeroes = nonMatching.slice(0, dungeon.partySize).map((hero) => hero.id);
    expect(validateDungeonDispatch({ dungeonId, heroIds: invalidHeroes, save, dateKey: save.shop.dateKey }))
      .toContain(requirement.label);
    expect(validateDungeonDispatch({ dungeonId, heroIds: validHeroes, save, dateKey: save.shop.dateKey }))
      .toBeNull();
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

  it("rolls one reward category for each expedition discovery", () => {
    const dungeon = DUNGEON_BY_ID.D09;
    const firstReward = rollDungeonRewards(dungeon, 42, 0);
    expect(firstReward.gold).toBe(0);
    expect(firstReward.exp).toBe(0);
    expect(Object.keys(firstReward.materials)).toHaveLength(1);
    for (let stepIndex = 1; stepIndex <= 12; stepIndex += 1) {
      const reward = rollDungeonRewards(dungeon, 42 + stepIndex, stepIndex);
      const categoryCount = Number(reward.gold > 0)
        + Number(reward.exp > 0)
        + Number(Object.keys(reward.materials).length > 0);
      expect(categoryCount).toBe(1);
      expect(Object.keys(reward.materials).length).toBeLessThanOrEqual(1);
    }
  });

  it("dispatches idle heroes without changing the mainline party", () => {
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
    expect(next.dungeonRuns[0]?.maxStamina).toBeGreaterThan(0);
    expect(next.party.some((id) => id && heroes.includes(id))).toBe(false);
    expect(next.party).toEqual(["H01", null, null, null, null]);
    expect(getBusyHeroIds(next.dungeonRuns).size).toBe(dungeon.partySize);
  });

  it("rejects heroes that are assigned to the mainline party", () => {
    const save = unlockAll();
    const dungeon = DUNGEON_BY_ID[getDailyDungeonIds(save.shop.dateKey)[0]!];
    const heroes = ["H01", ...pickHeroes(dungeon.partySize - 1, ["H01"], [])] as HeroId[];
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: heroes });
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

  it("returns after stamina is depleted, then grants accumulated rewards and frees heroes", () => {
    const save = unlockAll();
    const dungeon = DUNGEON_BY_ID[getDailyDungeonIds(save.shop.dateKey)[0]!];
    const heroes = pickHeroes(dungeon.partySize);
    const store = new GameStore(save);
    store.dispatch({ type: "dungeon:dispatch", dungeonId: dungeon.id, heroIds: heroes });
    const goldBefore = store.getState().save.gold;
    store.dispatch({ type: "dungeon:claim", dungeonId: dungeon.id });
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    expect(getBusyHeroIds(store.getState().save.dungeonRuns).has(heroes[0]!)).toBe(true);
    const run = store.getState().save.dungeonRuns[0]!;
    run.startedAt = Date.now() - 24 * 60 * 60_000;
    const progress = getDungeonRunProgress(run);
    expect(progress.returned).toBe(true);
    expect(progress.remainingStamina).toBe(0);
    expect(progress.rewardSteps).toBeGreaterThan(0);
    store.dispatch({ type: "dungeon:claim", dungeonId: dungeon.id });
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(getBusyHeroIds(store.getState().save.dungeonRuns).size).toBe(0);
    expect(store.getState().save.gold).toBeGreaterThan(goldBefore);
  });

  it("reconstructs expedition events and accumulated rewards from a running dispatch", () => {
    const dungeon = DUNGEON_BY_ID.D01;
    const startedAt = 1_825_000_000_000;
    const baseInterval = getExpeditionEventIntervalMs();
    const run = {
      dungeonId: dungeon.id,
      heroIds: ["H01", "H02"] as HeroId[],
      startedAt,
      maxStamina: 1_000,
    };
    const details = getDungeonRunDetails(run, startedAt + baseInterval * 8);
    expect(details.events.length).toBeGreaterThanOrEqual(6);
    expect(details.events[0]).toMatchObject({ step: 1, kind: "battle-victory" });
    const eventIntervals = details.events.map((event, index) => (
      event.occurredAt - (details.events[index - 1]?.occurredAt ?? startedAt)
    ));
    expect(eventIntervals.every((interval) => interval >= 4 * 60_000 && interval <= 6 * 60_000)).toBe(true);
    expect(new Set(eventIntervals).size).toBeGreaterThan(1);
    expect(details.progress.returned).toBe(false);
    const rewards = details.events.flatMap((event) => event.reward ? [event.reward] : []);
    expect(rewards).toHaveLength(details.progress.rewardSteps);
    for (const reward of rewards) {
      const categoryCount = Number(reward.gold > 0)
        + Number(reward.exp > 0)
        + Number(Object.keys(reward.materials).length > 0);
      expect(categoryCount).toBe(1);
    }
    expect(details.accumulatedRewards.gold).toBe(rewards.reduce((sum, reward) => sum + reward.gold, 0));
    expect(details.accumulatedRewards.exp).toBe(rewards.reduce((sum, reward) => sum + reward.exp, 0));
    expect(details.nextEventAt).not.toBeNull();
    expect(details.nextEventAt! - details.events.at(-1)!.occurredAt).toBeGreaterThanOrEqual(4 * 60_000);
    expect(details.nextEventAt! - details.events.at(-1)!.occurredAt).toBeLessThanOrEqual(6 * 60_000);

    const returned = getDungeonRunDetails(run, startedAt + 24 * 60 * 60_000);
    expect(returned.progress.returned).toBe(true);
    expect(returned.nextEventAt).toBeNull();
    expect(returned.events.at(-1)?.remainingStamina).toBe(0);
  });

  it("resolves battles, recovery, treasure, and discoveries with distinct stamina and reward results", () => {
    const dungeon = DUNGEON_BY_ID.D01;
    const startedAt = 1_825_000_000_000;
    const run = {
      dungeonId: dungeon.id,
      heroIds: ["H01", "H02"] as HeroId[],
      startedAt,
      maxStamina: 10_000,
    };
    const details = getDungeonRunDetails(
      run,
      startedAt + getExpeditionEventIntervalMs() * 100,
    );
    expect(new Set(details.events.map((event) => event.kind))).toEqual(new Set([
      "battle-victory",
      "battle-defeat",
      "recovery",
      "treasure",
      "discovery",
    ]));
    for (const event of details.events) {
      if (event.kind === "battle-victory") {
        expect(event.reward).toBeDefined();
        expect(event.staminaChange).toBeLessThan(0);
      } else if (event.kind === "battle-defeat") {
        expect(event.reward).toBeUndefined();
        expect(event.staminaChange).toBeLessThan(0);
      } else if (event.kind === "recovery") {
        expect(event.reward).toBeUndefined();
        expect(event.staminaChange).toBeGreaterThan(0);
      } else if (event.kind === "treasure") {
        expect(event.reward).toBeDefined();
        expect(event.staminaChange).toBe(0);
      } else {
        expect(event.reward).toBeUndefined();
        expect(event.staminaChange).toBeLessThan(0);
      }
    }
  });

  it("builds more expedition stamina from stronger heroes", () => {
    const save = unlockAll();
    const dungeon = DUNGEON_BY_ID.D01;
    const heroes: HeroId[] = ["H02", "H03"];
    const base = calculateExpeditionStamina(save, dungeon, heroes);
    save.roster.H02.level = 40;
    save.roster.H03.level = 40;
    save.roster.H02.stars = 5;
    save.roster.H03.stars = 5;
    const stronger = calculateExpeditionStamina(save, dungeon, heroes);
    expect(stronger).toBeGreaterThan(base);
  });

  it("gives unmodified heroes the same base stamina regardless of archetype", () => {
    const save = createDefaultSave();
    save.roster.H01.ascendLevel = 0;
    save.roster.H02.ascendLevel = 0;
    const dungeon = DUNGEON_BY_ID.D02;
    const tank = calculateHeroExpeditionStamina(save, dungeon, "H01");
    const berserker = calculateHeroExpeditionStamina(save, dungeon, "H02");
    expect(tank.base).toBe(100);
    expect(tank.maxHp).toBe(0);
    expect(tank.attack).toBe(0);
    expect(tank.total).toBe(125);
    expect(berserker).toEqual(tank);
  });

  it("adds stamina when a hero element fits the expedition environment", () => {
    const save = createDefaultSave();
    save.roster.H03.ascendLevel = 0;
    save.roster.H04.ascendLevel = 0;
    const dungeon = DUNGEON_BY_ID.D07;
    const fire = calculateHeroExpeditionStamina(save, dungeon, "H03");
    const holy = calculateHeroExpeditionStamina(save, dungeon, "H04");
    expect(fire.environmentFavored).toBe(true);
    expect(fire.environment).toBe(25);
    expect(fire.total).toBe(125);
    expect(holy.environmentFavored).toBe(false);
    expect(holy.total).toBe(100);
  });

  it("converts only level, stars, max health, attack, and environment into stamina", () => {
    const save = createDefaultSave();
    const dungeon = DUNGEON_BY_ID.D07;
    const base = calculateHeroExpeditionStamina(save, dungeon, "H06").total;
    save.roster.H06.level = 20;
    save.roster.H06.stars = 3;
    expect(calculateHeroExpeditionStamina(save, dungeon, "H06").total).toBeGreaterThan(base);
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
