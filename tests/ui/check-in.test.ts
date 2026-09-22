// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultSave } from "../../src/persistence/schema";
import { GameStore } from "../../src/app/GameStore";
import { AppShell } from "../../src/ui/AppShell";

let shell: AppShell;
afterEach(() => { shell?.destroy(); document.body.innerHTML = ""; vi.useRealTimers(); });
function setup() {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  const save = createDefaultSave();
  save.tutorialCompleted = true;
  const root = document.createElement("main");
  document.body.append(root);
  const store = new GameStore(save);
  shell = new AppShell(root, store, {});
  const click = (selector: string) => {
    const button = root.querySelector<HTMLButtonElement>(selector)!;
    button.focus(); button.click();
  };
  return { root, save, store, click };
}
describe("check-in UI", () => {
  it("refreshes task experience tips with the best cleared tier and retains the claimed amount", () => {
    const { root, save, store, click } = setup();
    save.currentStage = 10;
    click('[data-action="activities"]');
    click('[data-action="activity-tab"][data-tab="tasks"]');
    const chest = '[data-action="task-milestone-tips"][data-points="80"]';
    const tips = root.querySelector<HTMLElement>('.task-reward-tips')!;
    Object.defineProperty(tips, "offsetParent", { value: root });
    click(chest);
    expect(tips.textContent).toContain('600');
    save.currentStage = 50;
    save.difficultyProgress.easy.highestClearedStage = 12;
    store.dispatch({ type: "tasks:sync" });
    expect(tips.textContent).toContain('783');
    click(chest);
    for (const taskId of ["victory", "loot", "purchase", "alchemy"] as const) {
      save.recurringTasks.daily.progress[taskId] = taskId === "victory" ? 10 : 1;
      store.dispatch({ type: "tasks:claim", period: "daily", taskId });
    }
    const before = save.exp;
    click(chest);
    expect(save.exp).toBe(before + 783);
    click(chest);
    save.currentStage = 60;
    store.dispatch({ type: "tasks:sync" });
    expect(tips.textContent).toContain('783');
    expect(tips.textContent).toContain('已领取');
  });
  it("routes task shortcuts to alchemy, hero growth, summons and gem fusion", () => {
    const { root, store, click } = setup();
    const openTasks = () => { click('[data-action="activities"]'); click('[data-action="activity-tab"][data-tab="tasks"]'); };
    openTasks();
    click('.recurring-task[data-task-id="alchemy"] button');
    expect(store.getState().ui.activeTab).toBe("alchemy");
    expect(root.querySelector('[data-action="alchemy-auto-fill"]')).not.toBeNull();
    openTasks();
    click('.recurring-task[data-task-id="hero_level"] button');
    expect(store.getState().ui.activeTab).toBe("heroes");
    openTasks();
    click('[data-action="task-period"][data-period="weekly"]');
    click('.recurring-task[data-task-id="summon"] button');
    expect(root.querySelector('.summon-modal')).not.toBeNull();
    click('[data-action="close-modal"]');
    openTasks();
    click('.recurring-task[data-task-id="gem_fusion"] button');
    expect(store.getState().ui.activeTab).toBe("alchemy");
    expect(root.querySelector('[data-action="craft-fuse-all-gems"]')).not.toBeNull();
    openTasks();
    click('.recurring-task[data-task-id="socket"] button');
    expect(store.getState().ui.activeTab).toBe("alchemy");
    expect(root.querySelector('[data-action="craft-mode-toggle"]')!.textContent).toContain("开孔");
    openTasks();
    click('.recurring-task[data-task-id="hero_ascend"] button');
    expect(store.getState().ui.activeTab).toBe("heroes");
  });
  it.each(["daily", "weekly"] as const)("sorts %s tasks by claim status while preserving unchanged rows and scroll", (period) => {
    const { root, save, store, click } = setup();
    const state = save.recurringTasks[period];
    state.progress.victory = period === "daily" ? 9 : 99;
    state.progress.alchemy = period === "daily" ? 1 : 10;
    state.progress.hero_level = period === "daily" ? 1 : 10;
    state.claimed = ["hero_level"];
    click('[data-action="activities"]');
    click('[data-action="activity-tab"][data-tab="tasks"]');
    click(`[data-action="task-period"][data-period="${period}"]`);
    const scroll = root.querySelector<HTMLElement>('.recurring-task-list')!;
    const order = () => [...scroll.querySelectorAll<HTMLElement>('.recurring-task')].map((row) => row.dataset.taskId);
    const unfinished = period === "daily" ? ["loot", "purchase", "expedition", "gem_fusion"] : ["expedition", "summon", "gem_fusion", "hero_ascend", "socket"];
    expect(order()).toEqual(["alchemy", "victory", ...unfinished, "hero_level"]);
    const alchemy = root.querySelector('.recurring-task[data-task-id="alchemy"]');
    const battle = root.querySelector('.recurring-task[data-task-id="victory"]');
    scroll.scrollTop = 45;
    store.dispatch({ type: "stage:victory", stage: 1, gold: 0, exp: 0, items: [] });
    expect(root.querySelector('.recurring-task-list')).toBe(scroll);
    expect(scroll.scrollTop).toBe(45);
    expect(root.querySelector('.recurring-task[data-task-id="alchemy"]')).toBe(alchemy);
    expect(root.querySelector('.recurring-task[data-task-id="victory"]')).not.toBe(battle);
    expect(order()).toEqual(["victory", "alchemy", ...unfinished, "hero_level"]);
    click('.recurring-task[data-task-id="victory"] button');
    expect(order()).toEqual(["alchemy", ...unfinished, "victory", "hero_level"]);
    expect(root.querySelector('.recurring-task[data-task-id="alchemy"]')).toBe(alchemy);
    expect(scroll.scrollTop).toBe(45);
    expect(scroll.querySelector<HTMLButtonElement>('.recurring-task[data-task-id="victory"] button')!.disabled).toBe(true);
  });
  it("shows claimed ad tickets and ascension stones in the material inventory", () => {
    const { root, save, click } = setup();
    save.checkIn = { claimedDays: 1, lastClaimDate: "2026-01-01" };
    click('[data-action="activities"]');
    click('[data-action="check-in-claim"]');
    click('[data-action="close-activities"]');
    click('[data-action="inventory-bag-tab"][data-tab="materials"]');
    expect(save.adTickets).toBe(1);
    expect(root.querySelector('[data-consumable-id="ad_ticket"] img')?.getAttribute("src")).toBe("/assets/resources/ad_ticket.webp");
    expect(root.querySelector('[data-action="inventory-material-detail"][data-material-id="mat_ascend_stone"]')).not.toBeNull();
    click('[data-consumable-id="ad_ticket"]');
    expect(root.querySelector('#global-material-tips h3')?.textContent).toBe("广告券");
    expect(root.querySelector('[data-action="reward-box-open"]')).toBeNull();
  });
  it("keeps the activity page stable and isolates background input until returning", () => {
    const { root, store, click } = setup();
    click('[data-action="activities"]');
    const modal = root.querySelector(".activities-page")!;
    expect(root.querySelector<HTMLElement>('.battle-frame')!.inert).toBe(true);
    expect(root.querySelector('.modal-backdrop')).toBeNull();
    store.dispatch({ type: "settings:update", patch: { soundEnabled: false } });
    expect(root.querySelector(".activities-page")).toBe(modal);
    click('[data-action="check-in-claim"]');
    expect(root.querySelector<HTMLButtonElement>('[data-action="check-in-claim"]')!.disabled).toBe(true);
    expect(root.querySelector(".activity-entry")!.getAttribute("data-claimable")).toBe("false");
    expect(root.querySelector('#activity-tab-check-in')?.classList.contains("has-reward")).toBe(false);
    click('[data-action="close-activities"]');
    expect(root.querySelector<HTMLElement>('.battle-frame')!.inert).toBe(false);
    expect(root.querySelector('.game-shell')!.classList.contains('activities-open')).toBe(false);
    expect(document.activeElement).toBe(root.querySelector(".activity-entry"));
  });

  it("turns the completed first week into daily sign-in at 05:00 while open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 23, 4, 59, 59));
    const { root, save, click } = setup();
    save.checkIn = { claimedDays: 7, lastClaimDate: "2026-09-22" };
    click('[data-action="activities"]');
    expect(root.querySelector("h2")!.textContent).toBe("活动");
    expect(root.querySelector('.activities-tabs [role="tab"][aria-selected="true"]')!.textContent).toBe("7日签到");
    vi.advanceTimersByTime(1500);
    expect(root.querySelector("h2")!.textContent).toBe("活动");
    expect(root.querySelector('.activities-tabs [role="tab"][aria-selected="true"]')!.textContent).toBe("每日签到");
    expect(root.querySelector<HTMLButtonElement>('[data-action="check-in-claim"]')!.disabled).toBe(false);
  });

  it.each(["gem_box", "material_box"] as const)("opens the final %s in material tips and retains its result", (id) => {
    const { root, save, click, store } = setup();
    save.rewardBoxes[id] = 1;
    click('[data-action="inventory-bag-tab"][data-tab="materials"]');
    click(`[data-action="inventory-consumable-detail"][data-consumable-id="${id}"]`);
    const materialsBefore = Object.values(save.materials).reduce((sum, count) => sum + count, 0);
    click('[data-action="reward-box-open"]');
    expect(save.rewardBoxes[id]).toBe(0);
    expect(Object.values(save.materials).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(materialsBefore);
    expect(root.querySelector(".reward-box-result")!.textContent).toContain("已放入材料背包");
    expect(root.querySelector<HTMLButtonElement>('[data-action="reward-box-open"]')!.disabled).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.reward-box-result'));
    const result = root.querySelector(".reward-box-result");
    store.dispatch({ type: "settings:update", patch: { soundEnabled: false } });
    expect(root.querySelector(".reward-box-result")).toBe(result);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.querySelector('#global-material-tips')).toBeNull();
    expect(root.querySelector(`[data-consumable-id="${id}"]`)).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('[data-action="inventory-bag-tab"][data-tab="materials"]'));
  });
});
