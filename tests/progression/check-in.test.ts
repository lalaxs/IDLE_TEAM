import { afterEach, describe, expect, it, vi } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { claimCheckIn, getCheckInStatus, openRewardBox } from "../../src/progression/CheckInSystem";
import { REWARD_BOXES, REWARD_BOX_IDS } from "../../src/content/checkIn";

const day = (date: number) => new Date(2026, 8, date, 12).getTime();
afterEach(() => vi.useRealTimers());

describe("check-in rewards", () => {
  it("grants only once per day through the store, including after save reload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(day(22));
    const save = createDefaultSave();
    const store = new GameStore(save);
    const before = { gold: save.gold, exp: save.exp, stones: save.materials.mat_ascend_stone };
    store.dispatch({ type: "checkIn:claim" });
    store.dispatch({ type: "checkIn:claim" });
    expect(save.gold).toBe(before.gold + 15000);
    expect(save.exp).toBe(before.exp);
    expect(save.materials.mat_ascend_stone).toBe(before.stones + 5);
    expect(save.checkIn.claimedDays).toBe(1);
    const loaded = repairSaveData(JSON.parse(JSON.stringify(save)), day(22));
    new GameStore(loaded).dispatch({ type: "checkIn:claim" });
    expect(loaded.gold).toBe(save.gold);
    expect(loaded.materials.mat_ascend_stone).toBe(save.materials.mat_ascend_stone);
    expect(loaded.checkIn.claimedDays).toBe(1);
  });

  it("retains progress after missed days and transitions only the day after the seventh claim", () => {
    const save = createDefaultSave(day(1));
    const before = { gold: save.gold, exp: save.exp, stones: save.materials.mat_ascend_stone };
    for (let index = 0; index < 7; index++) expect(claimCheckIn(save, day(1 + index * 2))).not.toBeNull();
    expect(save.checkIn.claimedDays).toBe(7);
    expect(save.rewardBoxes).toEqual({ gem_box: 13, material_box: 14 });
    expect(save.gold).toBe(before.gold + 45000);
    expect(save.exp).toBe(before.exp);
    expect(save.materials.mat_ascend_stone).toBe(before.stones + 15);
    expect(save.adTickets).toBe(3);
    expect(repairSaveData(JSON.parse(JSON.stringify(save)), day(13)).adTickets).toBe(3);
    expect(save.gems).toBe(850);
    expect(getCheckInStatus(save.checkIn, day(13))).toMatchObject({ firstWeek: true, canClaim: false, claimedInCycle: 7 });
    expect(claimCheckIn(save, day(13))).toBeNull();
    expect(getCheckInStatus(save.checkIn, day(14))).toMatchObject({ firstWeek: false, canClaim: true, claimedInCycle: 0, cycle: 1 });
    for (let index = 0; index < 7; index++) claimCheckIn(save, day(14 + index));
    expect(save.gold).toBe(before.gold + 75000);
    expect(save.exp).toBe(before.exp);
    expect(save.materials.mat_ascend_stone).toBe(before.stones + 20);
    expect(save.adTickets).toBe(6);
    expect(save.rewardBoxes).toEqual({ gem_box: 21, material_box: 17 });
    expect(getCheckInStatus(save.checkIn, day(20))).toMatchObject({ cycle: 1, claimedInCycle: 7, canClaim: false });
    expect(getCheckInStatus(save.checkIn, day(21))).toMatchObject({ cycle: 2, claimedInCycle: 0, canClaim: true });
    expect(claimCheckIn(save, day(21))).toEqual([{ id: "gold", amount: 10000 }]);
  });

  it("refreshes at local 05:00 and does not grant again when the clock moves backward", () => {
    const save = createDefaultSave();
    claimCheckIn(save, new Date(2026, 8, 22, 23, 59, 59).getTime());
    expect(claimCheckIn(save, day(21))).toBeNull();
    expect(claimCheckIn(save, new Date(2026, 8, 23, 0, 0).getTime())).toBeNull();
    expect(claimCheckIn(save, new Date(2026, 8, 23, 4, 59, 59).getTime())).toBeNull();
    expect(claimCheckIn(save, new Date(2026, 8, 23, 5, 0).getTime())).toEqual([{ id: "gems", amount: 100 }, { id: "ad_ticket", amount: 1 }]);
    expect(claimCheckIn(save, new Date(2026, 8, 23, 5, 1).getTime())).toBeNull();
    expect(save.adTickets).toBe(1);
  });

  it("initializes existing saves without changing existing balances", () => {
    const source = JSON.parse(JSON.stringify(createDefaultSave(day(22))));
    delete source.checkIn;
    delete source.rewardBoxes;
    delete source.adTickets;
    source.gold = 12345;
    const save = repairSaveData(source, day(22));
    expect(save.checkIn).toEqual({ claimedDays: 0, lastClaimDate: "" });
    expect(save.rewardBoxes).toEqual({ gem_box: 0, material_box: 0 });
    expect(save.adTickets).toBe(0);
    expect(save.gold).toBe(12345);
  });
});

describe("reward boxes", () => {
  it.each(REWARD_BOX_IDS)("consumes one %s and grants each configured pool outcome to the material inventory", (id) => {
    const save = createDefaultSave(day(22));
    const drops = REWARD_BOXES[id].drops;
    save.rewardBoxes[id] = drops.length;
    drops.forEach((expected, index) => {
      const before = save.materials[expected.materialId];
      expect(openRewardBox(save, id, () => (index + 0.5) / drops.length)).toEqual(expected);
      expect(save.materials[expected.materialId]).toBe(before + expected.amount);
    });
    const before = structuredClone(save.materials);
    expect(openRewardBox(save, id)).toBeNull();
    expect(save.materials).toEqual(before);
    expect(save.rewardBoxes[id]).toBe(0);
    const restored = repairSaveData(JSON.parse(JSON.stringify(save)), day(22));
    expect(restored.materials).toEqual(save.materials);
    expect(restored.rewardBoxes).toEqual(save.rewardBoxes);
  });
});
