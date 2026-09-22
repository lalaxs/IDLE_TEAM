// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave } from "../../src/persistence/schema";
import { AppShell } from "../../src/ui/AppShell";
import type { BattleSnapshot } from "../../src/simulation/types";
import {
  DAILY_DUNGEON_COUNT,
  DUNGEON_BY_ID,
  DUNGEON_DEFINITIONS,
  getDailyDungeonIds,
  getExpeditionEventIntervalMs,
  type DungeonId,
} from "../../src/content/dungeons";
import { HERO_BY_ID, HERO_DEFINITIONS } from "../../src/content/heroes";
import { HERO_SKILL_CHANGE_GOLD_COST } from "../../src/content/heroSkills";
import { TALENT_RESET_GOLD_COST } from "../../src/progression/TalentSystem";
import { getHeroLevelCap } from "../../src/progression/HeroProgression";
import { previewLootChest } from "../../src/progression/LootChestSystem";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";
import { makeUnit } from "../support/makeUnit";

const snapshot: BattleSnapshot = {
  stage: 1,
  difficulty: "easy",
  wave: 1,
  state: "advancing",
  elapsedMs: 0,
  progress: 0,
  seed: 1,
  units: [],
  bossActive: false,
};

describe("AppShell", () => {
  it("detaches delegated events and store updates when destroyed", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    const onSoundRequested = vi.fn();
    const shell = new AppShell(root, store, { onSoundRequested });
    const shopButton = root.querySelector<HTMLButtonElement>('[data-action="select-tab"][data-tab="shop"]')!;

    shell.destroy();
    shopButton.click();
    expect(store.getState().ui.activeTab).toBe("inventory");
    expect(onSoundRequested).not.toHaveBeenCalled();

    store.dispatch({ type: "ui:selectTab", tab: "shop" });
    expect(root.querySelector('[data-panel="inventory"]')).not.toBeNull();
    expect(root.querySelector('[data-panel="shop"]')).toBeNull();
  });

  it("uses the account currency artwork in offline rewards", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});

    shell.showOfflineReward(30, 120, 80, 2, vi.fn());

    const icons = [...root.querySelectorAll<HTMLImageElement>(".offline-reward-modal .reward-currency-art")];
    expect(icons.map((icon) => icon.getAttribute("src"))).toEqual([
      "/assets/resources/currency_exp.webp",
      "/assets/resources/currency_gold_warm_outline_256.png",
    ]);
  });

  it("keeps the approved topbar, battlefield, party tabs, panel, and nav hierarchy", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    const shell = new AppShell(root, store, {});
    shell.renderBattle(snapshot);
    expect([...root.querySelectorAll(".game-shell > :not(.overlay-layer)")].map((node) => node.className)).toEqual([
      "topbar",
      "battle-frame",
      "party-strip",
      "alchemy-tips-host",
      "content-panel",
      "bottom-nav",
    ]);
    expect(root.querySelectorAll(".party-strip .party-member-tab")).toHaveLength(5);
    expect(root.querySelectorAll(".party-strip .party-member-entry")).toHaveLength(5);
    expect(root.querySelectorAll(".party-strip .party-member-bar.hp")).toHaveLength(5);
    expect(root.querySelector(".party-strip .party-member-bar.rage")).toBeNull();
    expect(root.querySelector(".party-member-rage-curtain")).toBeNull();
    expect(root.querySelector(".party-strip .party-formation-button")).toBeNull();
    expect(root.querySelector(".party-strip .party-skill")).toBeNull();
    expect(root.querySelectorAll(".bottom-nav button")).toHaveLength(5);
    expect(root.querySelector(".loot-chest-dock")).not.toBeNull();
    expect(root.querySelector(".loot-chest-time")?.textContent).toBe("0:00");
    expect(root.querySelector(".loot-chest-badge.ready")).toBeNull();
    expect(root.querySelector(".loot-chest-meter")).toBeNull();
    expect(root.querySelector(".loot-chest-tier")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();
    expect(root.querySelector(".loot-chest-tips")?.textContent).toMatch(/挂机宝箱/);
    expect(root.querySelector<HTMLButtonElement>('[data-action="loot-chest-claim"]')?.disabled).toBe(true);
    expect(root.querySelector('.loot-chest-tips [data-action="close-modal"]')).toBeNull();
    root.querySelector<HTMLElement>('[data-action="loot-chest-dismiss"]')?.click();
    expect(root.querySelector(".loot-chest-tips")).toBeNull();

    const lockedSlot = root.querySelector<HTMLButtonElement>('.party-strip button.party-member-tab.locked[data-slot="1"]');
    expect(lockedSlot?.getAttribute("aria-label")).toContain("通关主线第1章第1关后解锁");
    expect([...root.querySelectorAll<HTMLButtonElement>('.party-strip button.party-member-tab.locked')]
      .map((slot) => slot.getAttribute("aria-label"))).toEqual([
        "第 2 个小队位置未解锁，通关主线第1章第1关后解锁",
        "第 3 个小队位置未解锁，通关主线第1章第3关后解锁",
        "第 4 个小队位置未解锁，通关主线第1章第9关后解锁",
        "第 5 个小队位置未解锁，通关主线第2章第5关后解锁",
      ]);
    lockedSlot?.click();
    expect(root.querySelector(".toast-stack")?.textContent).toBe("第 2 个小队位置：通关主线第1章第1关后解锁");

    const battlePortrait = root.querySelector<HTMLImageElement>(".party-strip .party-member-portrait img");
    root.querySelector<HTMLButtonElement>(".party-strip .party-member-tab[data-hero-id]")?.click();
    const modalPortrait = root.querySelector<HTMLImageElement>(".equip-party-strip .party-member-portrait img");
    expect(root.querySelector(".character-equip-modal")).not.toBeNull();
    expect(modalPortrait?.getAttribute("src")).toBe(battlePortrait?.getAttribute("src"));
  });

  it("shows equipment as quality-coded boxes before opening and reveals items afterward", () => {
    const now = 20_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.lootChest.startedAt = now - 8 * 60 * 60_000;
    save.difficultyProgress.easy.highestClearedStage = 12;
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});

    expect(root.querySelector(".loot-chest-badge.ready")).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();

    const modal = root.querySelector(".idle-chest-modal");
    const boxes = [...root.querySelectorAll<HTMLButtonElement>(".idle-small-chest")];
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((box) => ["wood", "bronze", "silver", "gold"].includes(box.dataset.tier ?? ""))).toBe(true);
    expect(boxes.every((box) => (box.textContent ?? "").trim() === "")).toBe(true);
    expect(boxes.every((box) => /loot_chest_(wood|bronze|silver|gold)\.png/.test(box.querySelector("img")?.getAttribute("src") ?? ""))).toBe(true);
    expect(root.querySelector(".idle-chest-note")).toBeNull();
    expect(root.querySelector(".idle-chest-section-heading")?.textContent?.trim()).toBe("宝箱");
    expect(root.querySelector(".idle-chest-section-heading span")).toBeNull();
    expect(root.querySelector(".idle-chest-heading p")).toBeNull();
    expect(root.querySelector(".idle-chest-progress")).toBeNull();
    expect(root.querySelector(".idle-chest-duration")?.textContent?.trim()).toBe("挂机时长8 小时");
    expect(root.querySelector(".idle-chest-open-all")?.textContent).toBe("领取奖励");
    expect(root.querySelectorAll(".idle-chest-resource")).toHaveLength(2);
    expect([...root.querySelectorAll(".idle-chest-resource em")].map((node) => node.textContent))
      .toEqual(["2,460/小时", "783/小时"]);

    const inventoryCountBeforeReveal = store.getState().save.inventory.length;
    boxes[0]?.click();
    expect(boxes[0]?.classList.contains("revealed")).toBe(true);
    expect(boxes[0]?.disabled).toBe(false);
    expect(boxes.slice(1).every((box) => !box.classList.contains("revealed"))).toBe(true);
    expect(root.querySelectorAll(".idle-chest-item-face")).toHaveLength(1);
    expect(store.getState().save.inventory).toHaveLength(inventoryCountBeforeReveal);

    boxes[0]?.click();
    expect(root.querySelector(".loot-chest-equipment-tips-layer .equipment-tip-card")).not.toBeNull();
    expect(boxes[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(boxes[0]?.classList.contains("equipment-previewing")).toBe(false);
    root.querySelector<HTMLElement>(".idle-chest-equipment-section")?.click();
    expect(root.querySelector(".loot-chest-equipment-tips-layer")).toBeNull();
    expect(root.querySelector(".idle-chest-modal")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-claim"]')?.click();

    expect(root.querySelector(".idle-chest-modal")).toBe(modal);
    expect(root.querySelector(".idle-chest-heading h2")?.textContent).toBe("装备揭晓");
    expect(root.querySelector(".idle-chest-open-all")?.textContent).toBe("领取奖励");
    expect(root.querySelectorAll(".idle-chest-item-face")).toHaveLength(boxes.length);
    expect([...root.querySelectorAll(".idle-small-chest")]).toEqual(boxes);
    expect(root.querySelector(".currency-reward")).toBeNull();
    shell.destroy();
    nowSpy.mockRestore();
  });

  it("collects immediately after every idle chest has been opened by hand", () => {
    const now = 20_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.lootChest.startedAt = now - 8 * 60 * 60_000;
    save.difficultyProgress.easy.highestClearedStage = 12;
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();
    const boxes = [...root.querySelectorAll<HTMLButtonElement>(".idle-small-chest")];
    expect(boxes.length).toBeGreaterThan(0);
    boxes.forEach((box) => box.click());

    const collectButton = root.querySelector<HTMLButtonElement>(
      '[data-action="loot-chest-claim-close"]',
    );
    expect(collectButton?.textContent).toBe("收下");
    const inventoryCountBeforeClaim = store.getState().save.inventory.length;
    collectButton?.click();

    expect(root.querySelector(".idle-chest-modal")).toBeNull();
    expect(store.getState().save.inventory.length).toBeGreaterThan(inventoryCountBeforeClaim);
    shell.destroy();
    nowSpy.mockRestore();
  });

  it("claims pending idle rewards when the chest modal is dismissed", () => {
    const now = 20_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.lootChest.startedAt = now - 8 * 60 * 60_000;
    save.difficultyProgress.easy.highestClearedStage = 12;
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();
    const inventoryCountBeforeClaim = store.getState().save.inventory.length;
    root.querySelector<HTMLElement>('[data-action="loot-chest-dismiss"]')?.click();

    expect(root.querySelector(".idle-chest-modal")).toBeNull();
    expect(store.getState().save.lootChest.startedAt).toBe(now);
    expect(store.getState().save.inventory.length).toBeGreaterThan(inventoryCountBeforeClaim);
    shell.destroy();
    nowSpy.mockRestore();
  });

  it("keeps accumulated gold and experience when dismissed without equipment", () => {
    const now = 20_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.difficultyProgress.easy.highestClearedStage = 1;
    let startedAt = now - 5 * 60_000;
    while (
      previewLootChest({ startedAt }, now, 1, "easy", save.abilities).items.length > 0
      && startedAt > now - 6 * 60_000
    ) {
      startedAt -= 1;
    }
    save.lootChest.startedAt = startedAt;
    expect(previewLootChest(save.lootChest, now, 1, "easy", save.abilities).items).toHaveLength(0);
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});
    const goldBefore = store.getState().save.gold;
    const expBefore = store.getState().save.exp;

    root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();
    expect(root.querySelector(".idle-chest-empty")).not.toBeNull();
    root.querySelector<HTMLElement>('[data-action="loot-chest-dismiss"]')?.click();

    expect(root.querySelector(".idle-chest-modal")).toBeNull();
    expect(store.getState().save.lootChest.startedAt).toBe(startedAt);
    expect(store.getState().save.gold).toBe(goldBefore);
    expect(store.getState().save.exp).toBe(expBefore);
    shell.destroy();
    nowSpy.mockRestore();
  });

  it("plays the idle chest bounce on only one unopened box at a time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000_000);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    let shell: AppShell | null = null;
    try {
      const root = document.createElement("main");
      const save = createDefaultSave();
      save.settings.reducedMotion = false;
      save.lootChest.startedAt = Date.now() - 8 * 60 * 60_000;
      save.difficultyProgress.easy.highestClearedStage = 12;
      shell = new AppShell(root, new GameStore(save), {});

      root.querySelector<HTMLButtonElement>('[data-action="loot-chest-open"]')?.click();
      expect(root.querySelectorAll(".idle-small-chest").length).toBeGreaterThan(1);
      expect(root.querySelectorAll(".idle-small-chest.is-bouncing")).toHaveLength(0);

      vi.advanceTimersByTime(1_400);
      expect(root.querySelectorAll(".idle-small-chest.is-bouncing")).toHaveLength(1);

      vi.advanceTimersByTime(620);
      expect(root.querySelectorAll(".idle-small-chest.is-bouncing")).toHaveLength(0);

      vi.advanceTimersByTime(2_200);
      const nextBounce = [...root.querySelectorAll(".idle-small-chest.is-bouncing")];
      expect(nextBounce).toHaveLength(1);
      expect(nextBounce[0]).toBe(root.querySelectorAll(".idle-small-chest")[1]);
    } finally {
      shell?.destroy();
      randomSpy.mockRestore();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it("renders distinct boss, victory, and defeat battle banners", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});

    shell.presentBattleEvents([{ type: "boss:intro", name: "林地守望者" }]);
    let banner = root.querySelector<HTMLElement>(".battle-banner");
    expect(banner?.classList.contains("boss")).toBe(true);
    expect(banner?.querySelector("strong")?.textContent).toBe("首领来袭");
    expect(banner?.querySelector("small")?.textContent).toBe("林地守望者");
    expect(banner?.querySelector(".battle-banner-emblem svg")).not.toBeNull();
    expect(banner?.getAttribute("aria-label")).toBe("首领来袭，林地守望者");

    shell.presentBattleEvents([{ type: "battle:victory", stage: 1 }]);
    banner = root.querySelector<HTMLElement>(".battle-banner");
    expect(root.querySelectorAll(".battle-banner")).toHaveLength(1);
    expect(banner?.classList.contains("victory")).toBe(true);
    expect(banner?.querySelector("strong")?.textContent).toBe("挑战成功");
    expect(banner?.querySelector("small")?.textContent).toBe("关卡完成");
    expect(root.querySelector(".toast-stack")?.textContent).toBe("");

    shell.presentBattleEvents([{ type: "battle:defeat", stage: 1 }]);
    banner = root.querySelector<HTMLElement>(".battle-banner");
    expect(root.querySelectorAll(".battle-banner")).toHaveLength(1);
    expect(banner?.classList.contains("defeat")).toBe(true);
    expect(banner?.querySelector("strong")?.textContent).toBe("挑战失败");
    expect(banner?.querySelector("small")?.textContent).toBe("小队整备中");
    expect(root.querySelector(".toast-stack")?.textContent).toBe("");

    shell.destroy();
  });

  it("edits the party with hero cards after the second selected-hero click", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>('.party-strip .party-member-tab[data-hero-id="H35"]')?.click();
    expect(root.querySelectorAll(".equip-party-strip .party-member-tab.locked")).toHaveLength(4);
    expect(root.querySelector(".equip-party-strip .party-member-selected-meta small")?.textContent).toBe("点击换人");
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H35"]')?.click();
    expect(root.querySelector('[role="dialog"][aria-label="更换阵容"]')).not.toBeNull();
    expect(root.querySelector(".character-equip-modal")?.classList.contains("party-edit-mode")).toBe(true);
    expect(root.querySelector(".formation-modal")).toBeNull();
    const unlockedHeroCount = HERO_DEFINITIONS.filter(({ id }) => save.roster[id].unlocked).length;
    expect(root.querySelectorAll(".party-edit-picker .party-edit-card")).toHaveLength(unlockedHeroCount);
    expect(root.querySelector(".party-edit-picker .hero-card.locked")).toBeNull();
    expect(root.querySelector<HTMLElement>(".equip-panel-body")?.hidden).toBe(true);
    expect(root.querySelector('.equip-party-strip [data-slot="0"]')?.classList.contains("selected")).toBe(true);
    expect(root.querySelectorAll(".equip-party-strip .party-member-tab.locked")).toHaveLength(4);
    expect(root.querySelector<HTMLButtonElement>('.party-edit-card[data-hero-id="H35"]')?.disabled).toBe(true);
    expect(root.querySelector('.party-edit-card[data-hero-id="H35"] .party-edit-card-status')?.textContent).toBe("已上阵");
    expect(root.querySelector('.party-edit-card[data-hero-id="H02"] .party-edit-card-status')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="party-edit-cancel"]')?.click();
    expect(root.querySelector('[role="dialog"][aria-label="英雄属性"]')).not.toBeNull();
    expect(store.getState().save.party).toEqual(["H35", null, null, null, null]);
    root.querySelector<HTMLButtonElement>('.character-equip-modal [data-action="close-modal"]')?.click();

    save.highestClearedStage = 17;
    save.party = ["H35", "H02", null, null, null];
    store.dispatch({ type: "settings:update", patch: {} });
    root.querySelector<HTMLButtonElement>('.party-strip .party-member-tab[data-hero-id="H35"]')?.click();
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(root.querySelector('.equip-party-strip [data-hero-id="H02"]')?.classList.contains("selected")).toBe(true);
    expect(root.querySelector('.equip-party-strip [data-hero-id="H02"] .party-member-selected-meta small')?.textContent).toBe("点击换人");
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(root.querySelector('[role="dialog"][aria-label="更换阵容"]')).not.toBeNull();
    expect(root.querySelector('.equip-party-strip [data-slot="1"]')?.classList.contains("selected")).toBe(true);
    expect(root.querySelector('.party-edit-card[data-hero-id="H02"] .party-edit-card-status')?.textContent).toBe("已上阵");
    expect(root.querySelector('.party-edit-card[data-hero-id="H03"] .party-edit-card-status')).toBeNull();
    root.querySelector<HTMLButtonElement>('.party-edit-card[data-action="party-edit-remove"][data-hero-id="H02"]')?.click();
    expect(root.querySelector('.equip-party-strip [data-slot="1"]')?.classList.contains("empty")).toBe(true);
    root.querySelector<HTMLButtonElement>('.party-edit-card[data-action="party-edit-add"][data-hero-id="H03"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="party-edit-save"]')?.click();
    expect(store.getState().save.party).toEqual(["H35", "H03", null, null, null]);
    expect(root.querySelector('[role="dialog"][aria-label="英雄属性"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.character-equip-modal [data-action="close-modal"]')?.click();
    root.querySelector<HTMLButtonElement>('.party-strip .party-member-tab.empty[data-slot="2"]')?.click();
    expect(root.querySelector('[role="dialog"][aria-label="更换阵容"]')).not.toBeNull();
    expect(root.querySelector('.equip-party-strip [data-slot="2"]')?.classList.contains("selected")).toBe(true);
    root.querySelector<HTMLButtonElement>('.party-edit-card[data-action="party-edit-add"][data-hero-id="H04"]')?.click();
    expect(root.querySelector('.equip-party-strip [data-slot="2"][data-hero-id="H04"]')).not.toBeNull();
    expect(root.querySelector('.equip-party-strip [data-slot="3"]')?.classList.contains("selected")).toBe(true);
    root.querySelector<HTMLButtonElement>('.party-edit-card[data-action="party-edit-add"][data-hero-id="H57"]')?.click();
    expect(root.querySelector('.equip-party-strip [data-slot="3"][data-hero-id="H57"]')).not.toBeNull();
    expect(root.querySelector('.equip-party-strip [data-slot="4"]')?.classList.contains("selected")).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-action="party-edit-save"]')?.click();
    expect(store.getState().save.party).toEqual(["H35", "H03", "H04", "H57", null]);

    root.querySelector<HTMLButtonElement>('.character-equip-modal [data-action="close-modal"]')?.click();
    root.querySelector<HTMLButtonElement>('.party-strip .party-member-tab[data-hero-id="H35"]')?.click();
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H35"]')?.click();
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-action="party-edit-slot"][data-slot="2"]')?.click();
    root.querySelector<HTMLButtonElement>('.party-edit-card[data-action="party-edit-remove"][data-hero-id="H57"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="party-edit-save"]')?.click();
    expect(store.getState().save.party).toEqual(["H35", "H03", "H57", "H04", null]);
  });

  it("titles the party editor and orders drafted party heroes first", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestClearedStage = 99;
    save.party = ["H57", "H03", "H35", "H04", "H02"];
    save.roster.H57.ascendLevel = 5;
    save.roster.H57.ascendLevel = 5;
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>('.party-strip .party-member-tab[data-hero-id="H57"]')?.click();
    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H57"]')?.click();

    const dialog = root.querySelector('[role="dialog"][aria-label="更换阵容"]');
    expect(dialog?.querySelector("h2")?.textContent).toBe("更换阵容");
    const heroOrder = [...dialog!.querySelectorAll<HTMLElement>(".party-edit-picker .party-edit-card")]
      .slice(0, 6)
      .map((card) => card.dataset.heroId);
    expect(heroOrder).toEqual(["H57", "H03", "H35", "H04", "H02", "H71"]);
  });

  it("updates the portrait fill while rage builds and marks a prepared skill ready", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    const shell = new AppShell(root, store, {});
    const hero = makeUnit({
      sourceId: "H35",
      rage: 40,
      skillPrepareMs: 0,
    });

    shell.renderBattle({ ...snapshot, units: [hero] });

    const tab = root.querySelector<HTMLElement>('.party-member-tab[data-hero-id="H35"]');
    const portrait = tab?.querySelector<HTMLElement>(".party-member-portrait");
    expect(tab?.classList.contains("skill-ready")).toBe(true);
    expect(tab?.classList.contains("rage-building")).toBe(false);
    expect(tab?.getAttribute("aria-label")).toContain("技能已就绪");
    expect(portrait?.style.getPropertyValue("--party-rage-level")).toBe("100.00%");

    hero.rage = 20;
    hero.skillCastCount = 0;
    hero.skillPrepareMs = null;
    shell.renderBattle({ ...snapshot, units: [hero] });
    expect(tab?.classList.contains("skill-ready")).toBe(false);
    expect(tab?.classList.contains("rage-building")).toBe(true);
    expect(portrait?.style.getPropertyValue("--party-rage-level")).toBe("50.00%");
  });

  it("shakes only the matching party portrait when a hero starts a skill", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestClearedStage = 12;
    save.party = ["H01", "H02", null, null, null];
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});
    const hero = makeUnit({ id: "battle-hero-H01", sourceId: "H01" });
    shell.renderBattle({ ...snapshot, units: [hero] });

    shell.presentBattleEvents([
      {
        type: "skill:started",
        castId: "hero-0-H01:skill:1",
        sourceId: hero.id,
        skillId: "warrior_protection-active",
      },
    ]);

    expect(
      root.querySelector('.party-member-tab[data-hero-id="H01"]')?.classList.contains("skill-cast-feedback"),
    ).toBe(true);
    expect(
      root.querySelector('.party-member-tab[data-hero-id="H02"]')?.classList.contains("skill-cast-feedback"),
    ).toBe(false);
  });

  it("tracks per-hero battle details, sorts metrics, and resets for a new battle", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestClearedStage = 12;
    save.party = ["H01", "H02", null, null, null];
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});
    const guardian = makeUnit({ id: "battle-hero-H01", sourceId: "H01" });
    const berserker = makeUnit({ id: "battle-hero-H02", sourceId: "H02" });
    const enemy = makeUnit({ id: "battle-enemy", team: "enemies", sourceId: "E01" });
    shell.renderBattle({ ...snapshot, units: [guardian, berserker, enemy] });

    shell.presentBattleEvents([
      {
        type: "damage",
        sourceId: guardian.id,
        targetId: enemy.id,
        amount: 120,
        critical: false,
        attribution: { kind: "basic", id: "basic" },
      },
      { type: "damage", sourceId: enemy.id, targetId: guardian.id, amount: 45, critical: false },
      { type: "heal", sourceId: berserker.id, targetId: guardian.id, amount: 80 },
    ]);

    const detailsButton = root.querySelector<HTMLButtonElement>('[data-action="battle-details"]');
    expect(root.querySelector('.topbar [data-action="battle-details"]')).toBeNull();
    expect(detailsButton?.closest(".battle-frame")).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="battle-details"]')?.click();

    let guardianRow = root.querySelector<HTMLElement>('.battle-details-row[data-hero-id="H01"]');
    let berserkerRow = root.querySelector<HTMLElement>('.battle-details-row[data-hero-id="H02"]');
    expect(root.querySelector(".battle-details-table-head")).toBeNull();
    expect(guardianRow?.querySelector('[data-detail-metric-label]')?.textContent).toBe("输出");
    expect(guardianRow?.querySelector('[data-detail-value]')?.textContent).toBe("120");
    expect(root.querySelectorAll(".battle-details-row [data-detail-value]")).toHaveLength(2);
    expect(root.querySelector(".battle-details-row")?.getAttribute("data-hero-id")).toBe("H01");

    guardianRow?.click();
    expect(root.querySelector(".battle-details-modal h2")?.textContent).toBe("数据来源");
    expect(root.querySelector("[data-source-label]")?.textContent).toBe("普通攻击");
    expect(root.querySelector("[data-source-value]")?.textContent).toBe("120");
    root.querySelector<HTMLButtonElement>('[data-action="battle-details-back"]')?.click();
    guardianRow = root.querySelector<HTMLElement>('.battle-details-row[data-hero-id="H01"]');
    berserkerRow = root.querySelector<HTMLElement>('.battle-details-row[data-hero-id="H02"]');

    root.querySelector<HTMLButtonElement>('[data-action="battle-details-metric"][data-metric="taken"]')?.click();
    expect(guardianRow?.querySelector('[data-detail-metric-label]')?.textContent).toBe("承伤");
    expect(guardianRow?.querySelector('[data-detail-value]')?.textContent).toBe("45");

    root.querySelector<HTMLButtonElement>('[data-action="battle-details-metric"][data-metric="healing"]')?.click();
    expect(berserkerRow?.querySelector('[data-detail-metric-label]')?.textContent).toBe("治疗");
    expect(root.querySelector(".battle-details-row")?.getAttribute("data-hero-id")).toBe("H02");
    expect(berserkerRow?.querySelector('[data-detail-value]')?.textContent).toBe("80");

    shell.renderBattle({ ...snapshot, seed: 2, units: [guardian, berserker, enemy] });
    expect(berserkerRow?.querySelector('[data-detail-value]')?.textContent).toBe("0");
  });

  it("batches live battle-detail DOM updates while the modal is open", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    const store = new GameStore(save);
    const shell = new AppShell(root, store, {});
    const hero = makeUnit({ id: "battle-hero-H35", sourceId: "H35" });
    const enemy = makeUnit({ id: "battle-enemy", team: "enemies", sourceId: "E01" });
    shell.renderBattle({ ...snapshot, units: [hero, enemy] });
    root.querySelector<HTMLButtonElement>('[data-action="battle-details"]')?.click();

    shell.presentBattleEvents([
      { type: "damage", sourceId: hero.id, targetId: enemy.id, amount: 30, critical: false },
    ]);
    expect(root.querySelector('[data-detail-value]')?.textContent).toBe("0");

    shell.renderBattle({ ...snapshot, elapsedMs: 50, units: [hero, enemy] });
    expect(root.querySelector('[data-detail-value]')?.textContent).toBe("0");
    shell.renderBattle({ ...snapshot, elapsedMs: 100, units: [hero, enemy] });
    expect(root.querySelector('[data-detail-value]')?.textContent).toBe("30");
  });

  it("switches all management pages without removing the battle canvas", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    for (const tab of ["shop", "heroes", "stages", "alchemy", "inventory"] as const) {
      store.dispatch({ type: "ui:selectTab", tab });
      expect(root.querySelector(`[data-panel="${tab}"]`)).not.toBeNull();
      expect(root.querySelector("#battle-canvas")).not.toBeNull();
    }
  });

  it("keeps the hero summon banner outside the scrolling roster", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });

    const page = root.querySelector(".heroes-page");
    const banner = page?.querySelector<HTMLButtonElement>(".hero-summon-banner");
    const roster = page?.querySelector(".hero-roster-scroll");
    expect(banner?.dataset.action).toBe("summon-open");
    expect(banner?.textContent).toContain("召唤英雄");
    expect(roster?.contains(banner ?? null)).toBe(false);
    expect(roster?.querySelector('[role="list"][aria-label="英雄名册"]')).not.toBeNull();
  });

  it("opens alchemy cube page from the middle nav tab", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    const tabs = [...root.querySelectorAll<HTMLButtonElement>(".bottom-nav button")].map(
      (button) => button.dataset.tab,
    );
    expect(tabs).toEqual(["inventory", "heroes", "alchemy", "stages", "shop"]);
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
    expect(root.querySelector(".alchemy-cube")?.children).toHaveLength(9);
    const stationTrigger = root.querySelector<HTMLButtonElement>(".alchemy-heading .alchemy-station-trigger");
    expect(stationTrigger?.textContent).toBe("Lv.1");
    expect(stationTrigger?.classList.contains("craft-mode-trigger")).toBe(true);
    expect(stationTrigger?.getAttribute("aria-haspopup")).toBe("dialog");
    stationTrigger?.click();
    const stationDialog = root.querySelector(".alchemy-station-modal");
    expect(stationDialog?.textContent).toMatch(/装备合成上限Lv\.20/);
    expect(stationDialog?.textContent).toMatch(/炼金台经验0\/90/);
    stationDialog?.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    expect(root.querySelector(".alchemy-station-modal")).toBeNull();
    expect(root.querySelector('[data-action="craft-mode-toggle"]')?.textContent).toMatch(/升品/);
    expect(root.querySelector(".alchemy-guide")).toBeNull();
    expect(root.querySelector('[data-action="alchemy-auto-fill"]')).not.toBeNull();
    expect(root.querySelector('[data-action="alchemy-craft"]')).not.toBeNull();
  });

  it("refreshes alchemy cube immediately after auto-fill and clear", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 10 + index },
        affixes: [],
        traitId: null,
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-auto-fill"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(9);
    expect(root.querySelector(".alchemy-cell.filled .equipment-art")).not.toBeNull();
    expect(root.querySelector(".alchemy-grade")).toBeNull();
    expect(root.querySelector(".alchemy-cell.filled.rarity-common")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-clear"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.empty")).toHaveLength(9);
  });

  it("does not advertise miracle promotion when sacred gear can only become primordial", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-sacred-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "sacred",
        level: 10,
        stage: 10,
        stats: { attack: 20 + index },
        affixes: [],
        traitId: null,
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-auto-fill"]')?.click();
    const hint = root.querySelector(".alchemy-hint")?.textContent;
    expect(hint).toMatch(/神辉.*混元/);
    expect(hint).not.toContain("奇迹升品");
  });

  it("confirms before an over-level synthesis and caps the result level", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-over-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        level: 30,
        stage: 30,
        stats: { attack: 100 + index },
        affixes: [],
        traitId: null,
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    for (let index = 0; index < 9; index += 1) {
      root.querySelector<HTMLButtonElement>(`[data-action="alchemy-item-select"][data-item-id="alchemy-over-${index}"]`)?.click();
    }
    expect(root.querySelector('[data-action="alchemy-craft"]')?.textContent).toMatch(/Lv\.20/);
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-craft"]')?.click();
    expect(root.querySelector(".alchemy-downgrade-modal")?.textContent).toMatch(/Lv\.30 → Lv\.20/);
    expect(store.getState().save.inventory).toHaveLength(9);

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-craft-confirm"]')?.click();
    expect(store.getState().save.inventory).toHaveLength(1);
    expect(store.getState().save.inventory[0]?.level).toBe(20);
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/炼金成功/);
    expect(root.querySelector(".craft-result-item-copy")?.textContent).toMatch(/Lv\.20/);
    expect(root.querySelector(".craft-result-modal")?.textContent).not.toMatch(/装备 Lv\.20/);
  });

  it("shows a result modal after a successful synthesis", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-result-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        level: 10,
        stage: 10,
        stats: { attack: 20 + index },
        affixes: [],
        traitId: null,
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-auto-fill"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(9);
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-craft"]')?.click();

    const result = root.querySelector<HTMLElement>(".craft-result-modal");
    expect(result?.textContent).toMatch(/炼金成功/);
    expect(result?.textContent).toMatch(/凡品.*(良品|珍品)/s);
    expect(result?.querySelector(".craft-result-station-progress")?.textContent).toMatch(/炼金台经验/);
    expect(result?.querySelector(".craft-result-station-progress")?.textContent).toMatch(/\+9/);
    expect(result?.querySelector(".craft-result-station-meta")).toBeNull();
    expect(result?.querySelector(".craft-result-station-meter")?.getAttribute("aria-valuemax")).toBe("90");
    expect(result?.querySelector(".craft-result-station-meter")?.getAttribute("aria-valuenow")).toBe("9");
    expect(result?.querySelector(".craft-result-item-art .equipment-art")).not.toBeNull();
    expect(result?.querySelector(".craft-result-attributes")?.textContent).toMatch(/装备属性.*攻击/s);
    expect(result?.querySelector(".craft-result-confirm")).toBeNull();
    expect(result?.querySelector(".craft-result-dismiss-hint")?.textContent).toBe("点击空白处关闭");

    const stableResult = root.querySelector(".craft-result-modal");
    store.dispatch({ type: "battle:setSpeed", speed: 2 });
    expect(root.querySelector(".craft-result-modal")).toBe(stableResult);
    result?.querySelector<HTMLElement>(".craft-result-attribute-content")?.click();
    expect(root.querySelector(".craft-result-modal")).toBe(stableResult);
    result?.click();
    expect(root.querySelector(".craft-result-modal")).toBeNull();
  });

  it("warns after auto-filling starred gear and crafts it without extra confirmation", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.alchemyStation.level = 9;
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-star-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "epic",
        level: 100,
        stage: 120,
        stats: { attack: 60 + index },
        affixes: [{ affixId: "flat_attack", value: 12, ...(index < 5 ? { greater: true } : {}) }],
        traitId: "sharp",
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-auto-fill"]')?.click();
    expect(root.querySelector(".toast-stack")?.textContent).toBe("");

    const preview = root.querySelector(".alchemy-star-inheritance");
    expect(preview?.textContent).toMatch(/星能 5/);
    expect(preview?.textContent).toMatch(/至少1条 100%/);
    expect(preview?.textContent).toMatch(/至少2条 24%/);
    expect(preview?.textContent).toMatch(/3条 0%/);
    expect(root.querySelector('[data-action="alchemy-craft"]')?.textContent).toBe("星能炼金");

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-craft"]')?.click();
    expect(root.querySelector(".alchemy-downgrade-modal")).toBeNull();
    expect(store.getState().save.inventory).toHaveLength(1);
    expect(root.querySelector(".craft-result-star-note")?.textContent).toMatch(/消耗 5 点星能，产物获得 [12] 条强化词条/);
  });

  it("shows a single level-up beat when alchemy experience crosses the station threshold", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.alchemyStation.exp = 85;
    for (let index = 0; index < 9; index += 1) {
      save.inventory.push({
        instanceId: `alchemy-level-up-${index}`,
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        level: 10,
        stage: 10,
        stats: { attack: 20 + index },
        affixes: [],
        traitId: null,
      });
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-auto-fill"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-craft"]')?.click();

    const result = root.querySelector(".craft-result-modal");
    expect(result?.querySelector(".craft-result-station-levelup")?.textContent).toMatch(/炼金台升级.*Lv\.1 → Lv\.2/s);
    expect(result?.querySelector(".craft-result-station-progress")?.classList.contains("leveled")).toBe(true);
    expect(result?.querySelector(".craft-result-bonus")?.textContent).toMatch(/装备合成上限提升/);
  });

  it("uses the shared result modal for equipment crafting actions", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.gold = 7_000;
    save.setEssences.set_moss_crown = 4;
    save.materials.mat_set_inscription = 1;
    save.inventory.push({
      instanceId: "craft-result-gear",
      definitionId: "weapon_ranger_bow",
      slot: "main_weapon",
      rarity: "epic",
      level: 20,
      stage: 20,
      stats: { attack: 40 },
      affixes: [{ affixId: "flat_attack", value: 8 }],
      traitId: "sharp",
      sockets: [],
    });
    const store = new GameStore(save);
    new AppShell(root, store, {});
    const closeResult = () => {
      root.querySelector<HTMLElement>(".craft-result-modal")?.click();
      expect(root.querySelector(".craft-result-modal")).toBeNull();
    };

    store.dispatch({ type: "craft:imprint", itemId: "craft-result-gear", setId: "set_moss_crown" });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/刻印成功.*新增套装标签.*苔冠守望/s);
    expect(root.querySelector(".craft-result-note")?.textContent).toMatch(/装备属性、传奇特性与养成内容均已保留/);
    closeResult();

    store.dispatch({ type: "craft:socket", itemId: "craft-result-gear" });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/开孔成功.*1\/2/s);
    expect(root.querySelectorAll(".craft-result-item-art .legendary-trait-mark")).toHaveLength(1);
    expect(root.querySelector(".craft-result-attributes")?.textContent).toMatch(/传奇.*锐利.*技能伤害提高/s);
    expect(root.querySelector(".craft-result-effect.set")?.textContent).toMatch(/套装.*苔冠守望/s);
    expect(root.querySelector(".craft-result-effect.set")?.textContent).toMatch(
      /2件：生命 \+6%.*4件：伤害减免 \+4% · 格挡 \+4%.*6件：精英伤害 \+10%/s,
    );
    expect(root.querySelector(".craft-result-effect.socket small")?.textContent).toBe("宝石");
    expect(root.querySelector(".craft-result-effect.socket")?.textContent).toMatch(/宝石.*空孔/s);
    closeResult();

    store.dispatch({ type: "craft:reset", itemId: "craft-result-gear", affixIndex: 0 });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/重置成功.*词条变化/s);
    closeResult();

    store.dispatch({ type: "craft:smelt", itemId: "craft-result-gear", affixId: "damage_pct" });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/熔炼成功.*新增熔炼词条/s);
    expect(store.getState().save.gold).toBe(0);
    expect(store.getState().save.materials.mat_smelt_flux).toBe(11);
    closeResult();

    store.dispatch({ type: "craft:inlay", itemId: "craft-result-gear", socketIndex: 0, gemId: "gem_atk" });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/镶嵌成功.*攻击宝石/s);
    expect(root.querySelector(".craft-result-effect.socket")?.textContent).toMatch(/宝石.*攻击宝石·1级 · 攻击 \+1%/s);
    closeResult();

    store.dispatch({ type: "craft:removeGem", itemId: "craft-result-gear", socketIndex: 0 });
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/卸下成功.*宝石已返回材料背包/s);
  });

  it("puts alchemy equipment immediately, shows its tips, and removes it from the left slot", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.inventory.push({
      instanceId: "alchemy-tip",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "common",
      stage: 1,
      stats: { attack: 12 },
      affixes: [],
      traitId: null,
    });
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-select"]')?.click();
    expect(root.querySelector(".item-tips-modal")).toBeNull();
    const tips = root.querySelector<HTMLElement>(".equipment-global-tips-host .equipment-tips-popover");
    expect(tips?.textContent).toContain("守望短刃");
    expect(tips?.textContent).toMatch(/攻击\s*\+12/);
    expect(tips?.querySelector(".equipment-tip-footer")).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(1);
    expect(root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-select"]')?.getAttribute("aria-pressed")).toBe("true");

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-slot-clear"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(0);
    expect(root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-select"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows Greater Affix stars on the item and highlights the affected lines", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.inventory.push({
      instanceId: "greater-tip",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "epic",
      level: 100,
      stage: 120,
      stats: { attack: 120 },
      affixes: [
        { affixId: "flat_attack", value: 180, greater: true },
        { affixId: "crit_chance", value: 12, greater: true },
      ],
      traitId: "sharp",
      setId: "set_moss_crown",
    });
    const store = new GameStore(save);
    new AppShell(root, store, {});

    expect(root.querySelector(".greater-affix-mark")?.textContent).toBe("★★");
    expect(root.querySelector(".item-level-badge")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="item-detail"]')?.click();
    const tips = root.querySelector(".equipment-global-tips-host .equipment-tip-card");
    expect(tips?.querySelector(".equipment-tip-greater-stars")?.textContent).toBe("★★");
    expect(tips?.querySelector(".equipment-tip-greater-stars")?.getAttribute("aria-label")).toBe("2 条高阶词条");
    expect(tips?.querySelector("h3 + .equipment-tip-greater-stars")).not.toBeNull();
    expect(tips?.textContent).toContain("Lv.100");
    expect(tips?.querySelectorAll(".equipment-tip-stat.greater")).toHaveLength(2);
    expect(tips?.textContent).toContain("★攻击");
    expect(tips?.querySelectorAll(".equipment-tip-set-bonus")).toHaveLength(3);
    expect(tips?.querySelectorAll(".equipment-tip-set-bonus.active")).toHaveLength(0);
  });

  it("shows each set tier on its own row and lights only active tiers", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    const weapon = createEquipment("set_moss_crown_main_weapon", 120, "primordial", new SeededRandom(71), 100);
    const offHand = createEquipment("set_moss_crown_off_hand", 120, "primordial", new SeededRandom(72), 100);
    weapon.setId = "set_moss_crown";
    offHand.setId = "set_moss_crown";
    save.inventory.push(weapon, offHand);
    save.roster.H35.equipment.off_hand = offHand.instanceId;
    new AppShell(root, new GameStore(save), {});

    root.querySelector<HTMLButtonElement>(`[data-action="item-detail"][data-item-id="${weapon.instanceId}"]`)?.click();
    root.querySelector<HTMLButtonElement>('[data-action="item-open-equip"]')?.click();
    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    dialog?.querySelector<HTMLButtonElement>(`[data-action="equip-candidate-select"][data-item-id="${weapon.instanceId}"]`)?.click();
    expect(dialog?.querySelector(".equip-tips-layer")).not.toBeNull();

    const rows = [...(dialog?.querySelectorAll<HTMLElement>(".equipment-tip-set-bonus") ?? [])];
    expect(rows.map((row) => row.querySelector("b")?.textContent)).toEqual(["2件套", "4件套", "6件套"]);
    expect(rows.map((row) => row.classList.contains("active"))).toEqual([true, false, false]);
    expect(rows[0]?.getAttribute("aria-label")).toContain("已激活");
    expect(rows[1]?.getAttribute("aria-label")).toContain("未激活");
  });

  it("uses direct put and left-side remove for every equipment craft mode", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gold = 5_000;
    save.inventory.push({
      instanceId: "craft-tip-gear",
      definitionId: "weapon_guard_blade",
      slot: "main_weapon",
      rarity: "rare",
      stage: 3,
      stats: { attack: 20 },
      affixes: [{ affixId: "flat_attack", value: 5 }],
      traitId: null,
      sockets: [{ gemId: null }],
    });
    save.roster.H01.equipment.main_weapon = "craft-tip-gear";
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    for (const mode of ["imprint", "socket", "reset", "smelt", "inlay"]) {
      root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
      root.querySelector<HTMLButtonElement>(`[data-action="craft-mode-select"][data-mode="${mode}"]`)?.click();

      const listItem = root.querySelector<HTMLButtonElement>(
        '[data-action="craft-item-select"][data-item-id="craft-tip-gear"]',
      );
      expect(listItem?.getAttribute("aria-pressed")).toBe("false");
      listItem?.click();

      expect(root.querySelector(".equipment-global-tips-host .equipment-tip-card")).not.toBeNull();
      expect(root.querySelector(".equipment-global-tips-host .equipment-tip-footer")).toBeNull();
      if (mode === "inlay" || mode === "socket") {
        expect(root.querySelector(".equipment-global-tips-host .equipment-tip-context")?.textContent).toBe(
          `${HERO_BY_ID.H01.name}已装备`,
        );
      }
      const placed = root.querySelector<HTMLButtonElement>('[data-action="craft-item-remove"]');
      expect(placed?.getAttribute("aria-label")).toMatch(/^卸下/);
      if (mode === "inlay") {
        expect(root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-tab"][data-tab="materials"]')?.classList.contains("active")).toBe(true);
      } else if (mode === "smelt") {
        expect(root.querySelectorAll(".craft-smelt-footer .craft-socket-cost")).toHaveLength(2);
        expect(root.querySelector(".craft-smelt-cost")?.getAttribute("aria-label")).toBe(
          "查看熔炼触媒详情，消耗 1 个，持有 12 个",
        );
        expect(root.querySelector(".craft-smelt-cost .craft-socket-cost-count")?.textContent).toBe("12/1");
        expect(root.querySelector(".craft-smelt-gold-cost")?.getAttribute("aria-label")).toBe(
          "查看金币详情，熔炼消耗 5000 金币",
        );
        expect(root.querySelector(".craft-smelt-gold-cost .craft-socket-cost-count")?.textContent).toBe("5000");

        store.getState().save.gold = 4_999;
        store.dispatch({ type: "settings:update", patch: {} });
        expect(root.querySelector(".craft-smelt-gold-cost")?.classList.contains("insufficient")).toBe(true);
        expect(root.querySelector('[data-action="craft-smelt"]')?.textContent).toBe("金币不足");
        store.getState().save.gold = 5_000;
        store.getState().save.materials.mat_smelt_flux = 0;
        store.dispatch({ type: "settings:update", patch: {} });
        expect(root.querySelector(".craft-smelt-cost")?.classList.contains("insufficient")).toBe(true);
        expect(root.querySelector('[data-action="craft-smelt"]')?.textContent).toBe("熔炼触媒不足");
        store.getState().save.materials.mat_smelt_flux = 12;
        store.dispatch({ type: "settings:update", patch: {} });

        root.querySelector<HTMLButtonElement>('[data-action="craft-cost-material-tip"][data-material-id="mat_smelt_flux"]')?.click();
        expect(root.querySelector(".equipment-global-tips-host .material-tips-popover h3")?.textContent).toBe("熔炼触媒");
        root.querySelector<HTMLButtonElement>('[data-action="craft-smelt-affix-open"]')?.click();
        const smeltDialog = root.querySelector<HTMLElement>(".smelt-affix-tips");
        expect(smeltDialog?.querySelector(".smelt-affix-guide")?.textContent?.trim()).toBe(
          "每件装备限 1 条熔炼词条。再次熔炼会替换原词条。",
        );
        expect(smeltDialog?.textContent).not.toContain("金币 ×5000");
        expect(smeltDialog?.textContent).not.toContain("当前：");
        expect(smeltDialog?.textContent).not.toContain("没有条数上限");
        const smeltOptions = [...smeltDialog?.querySelectorAll(".smelt-affix-option") ?? []];
        expect(smeltOptions.length).toBeGreaterThan(0);
        expect(smeltOptions.every((option) => option.classList.contains("reset-affix-tip-option"))).toBe(true);
        expect(smeltOptions[0]?.querySelector(".smelt-affix-kind")).not.toBeNull();
        expect(smeltOptions[0]?.querySelector(".affix-range")?.textContent).toMatch(/^区间 /);
        smeltDialog?.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
      } else {
        expect(root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"]')?.getAttribute("aria-pressed")).toBe("true");
      }

      root.querySelector<HTMLButtonElement>('[data-action="craft-item-remove"]')?.click();
      expect(root.querySelector('[data-action="craft-item-remove"]')).toBeNull();
      expect(root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"]')?.getAttribute("aria-pressed")).toBe("false");
    }

    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="inlay"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"][data-item-id="craft-tip-gear"]')?.click();
    expect(root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-tab"][data-tab="materials"]')?.classList.contains("active")).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-action="craft-material-detail"]')?.click();
    expect(root.querySelector(".material-tips-modal")).toBeNull();
    expect(root.querySelector(".alchemy-tips-host .alchemy-tips .item-detail-name")).not.toBeNull();
    expect(root.querySelector(".craft-inlay-gem.selected")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.craft-inlay-gem[data-action="craft-material-remove"]')?.click();
    expect(root.querySelector(".craft-inlay-gem.empty")).not.toBeNull();
  });

  it("guides inlay through equipment, socket, gem, and the single relevant action", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gold = 4_000;
    save.materials.gem_atk = 2;
    save.materials.mat_socket_stone = 4;
    save.inventory.push(
      {
        instanceId: "inlay-no-socket",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "rare",
        stage: 3,
        stats: { attack: 20 },
        affixes: [{ affixId: "flat_attack", value: 5 }],
        traitId: null,
        sockets: [],
      },
      {
        instanceId: "inlay-ready",
        definitionId: "armor_guard_mail",
        slot: "armor",
        rarity: "rare",
        stage: 3,
        stats: { defense: 14, maxHp: 120 },
        affixes: [{ affixId: "flat_defense", value: 5 }],
        traitId: null,
        sockets: [{ gemId: null }, { gemId: "gem_atk_2" }],
      },
    );
    save.roster.H01.equipment.armor = "inlay-ready";
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="inlay"]')?.click();

    expect(root.querySelector(".craft-inlay-empty-state")?.textContent).toMatch(/选择装备.*右侧装备/s);
    expect(root.querySelector(".craft-inlay-footer")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"][data-item-id="inlay-no-socket"]')?.click();
    expect(root.querySelector(".craft-inlay-empty-state.no-socket")?.textContent).toMatch(/尚未开孔.*开启孔位/s);
    expect(root.querySelector('[data-action="craft-inlay-open-socket"]')).not.toBeNull();
    expect(root.querySelector('[data-action="craft-inlay"]')).toBeNull();
    expect(root.querySelector('[data-action="craft-remove-gem"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="craft-inlay-open-socket"]')?.click();
    expect(root.querySelector('[data-action="craft-mode-toggle"]')?.textContent).toMatch(/开孔/);
    expect(root.querySelector('.craft-target[data-item-id="inlay-no-socket"]')).not.toBeNull();
    expect(root.querySelector(".alchemy-list-caption")?.textContent).toBe("装备");
    expect(root.querySelector(".alchemy-list-tabs")).toBeNull();
    expect(root.querySelector(".craft-material-slot")).toBeNull();
    expect(root.querySelectorAll(".craft-open-socket-cell")).toHaveLength(2);
    expect(root.querySelector(".craft-socket-cost")?.getAttribute("aria-label")).toBe("查看开孔石详情，消耗 1 个，持有 4 个");
    expect(root.querySelector(".craft-socket-cost-count")?.textContent).toBe("4/1");
    expect(root.querySelectorAll(".craft-socket-costs .craft-socket-cost")).toHaveLength(2);
    expect(root.querySelector(".craft-socket-gold-cost")?.getAttribute("aria-label")).toBe("查看金币详情，开孔消耗 2000 金币");
    expect(root.querySelector(".craft-socket-gold-cost .craft-socket-cost-count")?.textContent).toBe("2000");
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("选择孔位");
    store.getState().save.gold = 1_999;
    store.dispatch({ type: "settings:update", patch: {} });
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("金币不足");
    store.getState().save.gold = 4_000;
    store.getState().save.materials.mat_socket_stone = 0;
    store.dispatch({ type: "settings:update", patch: {} });
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("开孔石不足");
    store.getState().save.gold = 1_999;
    store.dispatch({ type: "settings:update", patch: {} });
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("开孔石不足");
    store.getState().save.gold = 4_000;
    store.getState().save.materials.mat_socket_stone = 4;
    store.dispatch({ type: "settings:update", patch: {} });
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("选择孔位");
    root.querySelector<HTMLButtonElement>('[data-action="craft-cost-material-tip"][data-material-id="mat_socket_stone"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .material-tips-popover h3")?.textContent).toBe("开孔石");
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-socket"]')?.disabled).toBe(true);

    root.querySelector<HTMLButtonElement>('[data-action="craft-open-socket-pick"][data-socket-index="0"]')?.click();
    expect(root.querySelector('.craft-open-socket-cell.selected[data-socket-index="0"]')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-socket"]')?.disabled).toBe(false);
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("开孔");
    root.querySelector<HTMLButtonElement>('[data-action="craft-socket"]')?.click();
    expect(store.getState().save.inventory.find((item) => item.instanceId === "inlay-no-socket")?.sockets).toHaveLength(1);
    expect(store.getState().save.materials.mat_socket_stone).toBe(3);
    expect(store.getState().save.gold).toBe(2_000);
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/开孔成功.*1\/2/s);
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();

    expect(root.querySelector(".craft-socket-cost")?.getAttribute("aria-label")).toBe("查看开孔石详情，消耗 3 个，持有 3 个");
    expect(root.querySelector(".craft-socket-cost-count")?.textContent).toBe("3/3");
    expect(root.querySelector(".craft-socket-gold-cost .craft-socket-cost-count")?.textContent).toBe("2000");
    root.querySelector<HTMLButtonElement>('[data-action="craft-open-socket-pick"][data-socket-index="1"]')?.click();
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-socket"]')?.disabled).toBe(false);
    root.querySelector<HTMLButtonElement>('[data-action="craft-socket"]')?.click();
    expect(store.getState().save.inventory.find((item) => item.instanceId === "inlay-no-socket")?.sockets).toHaveLength(2);
    expect(store.getState().save.materials.mat_socket_stone).toBe(0);
    expect(store.getState().save.gold).toBe(0);
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/开孔成功.*2\/2/s);
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    expect(root.querySelector(".craft-socket-gold-cost")?.classList.contains("insufficient")).toBe(true);
    expect(root.querySelector(".craft-socket-gold-cost")?.getAttribute("aria-label")).toBe("金币不足，开孔需要 2000 金币");
    expect(root.querySelector('[data-action="craft-socket"]')?.textContent).toBe("已满孔");

    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="inlay"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"][data-item-id="inlay-ready"]')?.click();
    const inlayEquipmentTips = root.querySelector<HTMLElement>(".equipment-global-tips-host .equipment-tip-card");
    expect(inlayEquipmentTips).not.toBeNull();
    expect(inlayEquipmentTips?.querySelector(".equipment-tip-context")?.textContent).toBe(
      `${HERO_BY_ID.H01.name}已装备`,
    );
    expect(inlayEquipmentTips?.querySelectorAll(".equipment-tip-effect.socket b")[1]?.textContent).toBe("攻击 +1.7%");
    expect(inlayEquipmentTips?.textContent).not.toContain("攻击宝石·2级");
    expect(root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-tab"][data-tab="materials"]')?.classList.contains("active")).toBe(true);
    expect(root.querySelectorAll(".craft-socket-cell")).toHaveLength(2);
    expect(root.querySelector(".craft-inlay-sockets > header")).toBeNull();
    expect(root.querySelector(".craft-inlay-sockets")?.textContent).not.toContain("已镶嵌");
    expect(root.querySelector('[data-action="craft-inlay"]')).not.toBeNull();
    expect(root.querySelector(".craft-inlay-footer .alchemy-hint")).toBeNull();
    expect(root.querySelector('[data-action="craft-remove-gem"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="craft-material-detail"][data-material-id="gem_atk"]')?.click();
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-inlay"]')?.disabled).toBe(false);
    expect(root.querySelector(".craft-inlay-gem.selected")?.textContent).toMatch(/攻击宝石.*攻击 \+1%/s);

    root.querySelector<HTMLButtonElement>('[data-action="craft-socket-pick"][data-socket-index="1"]')?.click();
    expect(root.querySelector(".craft-inlay-gem.installed")?.textContent).toMatch(/当前孔位.*攻击宝石·2级/s);
    expect(root.querySelector('[data-action="craft-inlay"]')).toBeNull();
    expect(root.querySelector(".craft-inlay-footer .alchemy-hint")).toBeNull();
    expect(root.querySelector('[data-action="craft-remove-gem"]')?.textContent).toBe("卸下宝石");
  });

  it("quick-selects and removes reset gear while showing only the required scroll cost", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.materials.mat_reset_scroll = 9;
    save.inventory.push({
      instanceId: "reset-quick-gear",
      definitionId: "armor_guard_mail",
      slot: "armor",
      rarity: "rare",
      stage: 10,
      stats: { defense: 14, maxHp: 257 },
      affixes: [{ affixId: "cooldown_reduction", value: 3 }],
      traitId: null,
    });
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="reset"]')?.click();

    const listItem = root.querySelector<HTMLButtonElement>(
      '[data-action="craft-item-select"][data-item-id="reset-quick-gear"]',
    );
    expect(listItem?.getAttribute("aria-pressed")).toBe("false");
    listItem?.click();

    expect(root.querySelector(".equipment-global-tips-host .equipment-tip-card")).not.toBeNull();
    expect(root.querySelector(".craft-target:not(.empty)")).not.toBeNull();
    expect(root.querySelector('.craft-target[data-action="craft-item-remove"]')?.getAttribute("aria-label")).toMatch(/^卸下/);
    expect(root.querySelector(".craft-reset-cost .material-art")).not.toBeNull();
    expect(root.querySelector(".craft-reset-cost")?.getAttribute("aria-label")).toBe("查看重置卷轴详情，消耗 1 个，持有 9 个");
    expect(root.querySelector(".craft-reset-cost .craft-socket-cost-count")?.textContent).toBe("9/1");
    root.querySelector<HTMLButtonElement>('[data-action="craft-cost-material-tip"][data-material-id="mat_reset_scroll"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .material-tips-popover h3")?.textContent).toBe("重置卷轴");

    root.querySelector<HTMLButtonElement>('.craft-target[data-action="craft-item-remove"]')?.click();
    expect(root.querySelector(".craft-target.empty")).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('[data-item-id="reset-quick-gear"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("imprints a selected set tag onto non-set gear after confirmation", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.setEssences.set_moss_crown = 4;
    save.materials.mat_set_inscription = 1;
    const existingSetItem = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(13));
    existingSetItem.setId = "set_moss_crown";
    save.inventory.push(
      existingSetItem,
      createEquipment("weapon_ranger_bow", 97, "epic", new SeededRandom(14)),
    );
    const baseItem = save.inventory[1]!;
    baseItem.traitId = "swift";
    const legendaryTrait = baseItem.traitId;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="imprint"]')?.click();

    expect(root.querySelector('[data-action="craft-mode-toggle"]')?.textContent).toMatch(/套装刻印/);
    expect(root.querySelector(".alchemy-list-caption")?.textContent).toBe("非套装装备");
    expect(root.querySelectorAll('[data-action="craft-item-select"]')).toHaveLength(1);

    root.querySelector<HTMLButtonElement>('[data-action="craft-item-select"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .equipment-tip-card")).not.toBeNull();
    expect(root.querySelector('.craft-imprint-base-art[class*="rarity-"] .legendary-trait-mark')).not.toBeNull();
    expect(root.querySelector(".craft-imprint-base")?.textContent).not.toMatch(/传奇特性保留/);
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-request"]')?.textContent).toMatch(/套装刻印.*尚未选择/s);
    expect(root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-request"]')?.disabled).toBe(false);
    root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-request"]')?.click();
    expect(root.querySelector(".set-imprint-base-summary")).toBeNull();
    expect(root.querySelector(".set-imprint-description")).toBeNull();
    expect(root.querySelectorAll('[data-action="craft-set-select"]').length).toBeGreaterThan(0);
    expect(root.querySelector('[data-action="craft-set-select"][data-set-id="set_moss_crown"] .set-imprint-option-sigil')?.textContent).toBe("苔");
    root.querySelector<HTMLButtonElement>('[data-action="craft-set-select"][data-set-id="set_moss_crown"]')?.click();
    expect(root.querySelector(".set-imprint-option.selected")?.textContent).toMatch(/苔冠守望/);
    expect(root.querySelector(".set-imprint-description")?.textContent).toMatch(/苔冠守望.*2件.*4件.*6件/s);
    expect(root.querySelector(".set-imprint-picker-footer > .set-imprint-description")).not.toBeNull();
    expect(root.querySelector(".set-imprint-description-sigil")?.textContent).toBe("苔");
    expect(root.querySelectorAll(".set-imprint-description-bonuses > span")).toHaveLength(3);
    expect(root.querySelector('.set-imprint-picker-modal [data-action="craft-imprint-confirm"]')).toBeNull();
    expect(root.querySelector(".set-imprint-picker-modal .set-imprint-materials")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="craft-set-apply"]')?.click();

    expect(root.querySelector(".set-imprint-picker-modal")).toBeNull();
    expect(root.querySelector(".craft-imprint-set.selected")?.textContent).toMatch(/苔冠守望.*更换/s);
    const imprintMaterials = root.querySelectorAll(".set-imprint-material");
    expect(imprintMaterials).toHaveLength(2);
    expect(root.querySelector(".set-imprint-materials b")).toBeNull();
    expect(imprintMaterials[0]?.getAttribute("aria-label")).toBe("苔冠守望精华，持有 4，需要 4");
    expect(imprintMaterials[0]?.querySelector<HTMLImageElement>(".material-art")?.getAttribute("src")).toBe(
      "/assets/resources/mat_set_essence.png",
    );
    expect(imprintMaterials[0]?.querySelector(".set-imprint-material-badge")?.textContent).toBe("苔");
    expect(imprintMaterials[0]?.querySelector("em")?.textContent).toBe("4/4");
    expect(imprintMaterials[1]?.querySelector<HTMLImageElement>(".material-art")?.getAttribute("src")).toBe(
      "/assets/resources/mat_set_inscription.png",
    );
    expect(imprintMaterials[1]?.getAttribute("aria-label")).toBe("套装刻印石，持有 1，需要 1");
    expect(imprintMaterials[1]?.querySelector("em")?.textContent).toBe("1/1");

    (imprintMaterials[0] as HTMLButtonElement).click();
    expect(root.querySelector('[data-material-kind="essence"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card h3")?.textContent).toBe("苔冠守望精华");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")?.textContent).toMatch(/本次消耗.*4\/4.*分解带有苔冠守望套装标签/s);

    root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-material-tip"][data-material-kind="stone"]')?.click();
    expect(root.querySelector('[data-material-kind="stone"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card h3")?.textContent).toBe("套装刻印石");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")?.textContent).toMatch(/本次消耗.*1\/1.*与指定套装精华一同消耗/s);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")).toBeNull();
    expect(root.querySelector('[data-material-kind="stone"]')?.getAttribute("aria-expanded")).toBe("false");
    const imprintConfirm = root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-confirm"]');
    expect(imprintConfirm?.textContent).toBe("确认刻印");
    expect(imprintConfirm?.disabled).toBe(false);
    root.querySelector<HTMLButtonElement>('[data-action="craft-imprint-confirm"]')?.click();

    expect(baseItem.setId).toBe("set_moss_crown");
    expect(baseItem.traitId).toBe(legendaryTrait);
    expect(root.querySelector(".craft-result-modal")?.textContent).toMatch(/刻印成功.*苔冠守望/s);
  });

  it("renders buttons with mobile-sized semantic targets", () => {
    const root = document.createElement("main");
    new AppShell(root, new GameStore(createDefaultSave()), {});
    expect(root.querySelectorAll("button[aria-label], button .nav-label").length).toBeGreaterThan(4);
  });

  it("hides equipped items from the backpack and frees capacity", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.inventory = [
      {
        instanceId: "bag-item",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "worn-item",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
    ];
    save.roster.H01.equipment.main_weapon = "worn-item";
    const store = new GameStore(save);
    new AppShell(root, store, {});

    expect(root.querySelector('[data-panel="inventory"]')?.textContent).toContain("装备 1/40");
    expect(root.querySelector('[data-item-id="bag-item"]')).not.toBeNull();
    expect(root.querySelector('[data-item-id="worn-item"]')).toBeNull();
  });

  it("renders compact inventory toolbar with capacity, organize, and salvage", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.inventory = [
      {
        instanceId: "gear-low",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "gear-high",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});

    const heading = root.querySelector('[data-panel="inventory"]');
    expect(heading?.querySelector("h2")).toBeNull();
    expect(heading?.textContent).toContain("装备 2/40");
    expect(heading?.textContent).not.toContain("战利品仓库");
    expect(heading?.querySelector(".inventory-panel-tabs")).toBeNull();
    expect(root.querySelector(".inventory-side-tabs")).not.toBeNull();
    expect(
      root.querySelector('[data-action="inventory-bag-tab"][data-tab="equipment"]')?.classList.contains("active"),
    ).toBe(true);
    expect(heading?.querySelector('[data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(heading?.querySelector('[data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(heading?.querySelector('[data-action^="inventory-filter"]')).toBeNull();
    const capacityUpgrade = heading?.querySelector<HTMLButtonElement>(
      '[data-action="ability-select"][data-ability-id="backpack_slots"]',
    );
    expect(capacityUpgrade?.getAttribute("aria-label")).toBe("提升装备背包容量");
    capacityUpgrade?.click();
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("背包格子");
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("背包容量 +5");
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    const visibleItemOrder = () => [...root.querySelectorAll<HTMLElement>(".inventory-grid [data-item-id]")]
      .map((item) => item.dataset.itemId);
    expect(visibleItemOrder()).toEqual(["gear-low", "gear-high"]);

    root.querySelector<HTMLButtonElement>('[data-action="inventory-organize"]')?.click();
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId)).toEqual([
      "gear-high",
      "gear-low",
    ]);
    expect(visibleItemOrder()).toEqual(["gear-high", "gear-low"]);
  });

  it("switches inventory between equipment and materials bags", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.materials.mat_socket_stone = 5;
    save.materials.mat_set_inscription = 1;
    save.setEssences.set_moss_crown = 2;
    save.setEssences.set_frost_bite = 3;
    save.inventory = [
      {
        instanceId: "bag-gear",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "inventory" });
    expect(root.querySelector(".inventory-side-tabs")).not.toBeNull();
    expect(root.querySelector('[data-panel="inventory"]')?.textContent).toMatch(/\d+\/\d+/);
    expect(root.querySelector('[data-item-id="bag-gear"]')).not.toBeNull();
    root
      .querySelector<HTMLButtonElement>('[data-action="inventory-bag-tab"][data-tab="materials"]')
      ?.click();
    expect(root.querySelector('[data-material-id="mat_socket_stone"]')?.textContent).toContain("×5");
    const mossEssence = root.querySelector('.set-essence-card[data-set-id="set_moss_crown"]');
    const frostEssence = root.querySelector('.set-essence-card[data-set-id="set_frost_bite"]');
    expect(mossEssence?.querySelector(".set-essence-icon img")?.getAttribute("src")).toBe(
      "/assets/resources/mat_set_essence.png",
    );
    expect(frostEssence?.querySelector(".set-essence-icon img")?.getAttribute("src")).toBe(
      "/assets/resources/mat_set_essence.png",
    );
    expect(mossEssence?.querySelector(".set-essence-badge")?.textContent).toBe("苔");
    expect(frostEssence?.querySelector(".set-essence-badge")?.textContent).toBe("霜");
    expect(mossEssence?.querySelector(".set-essence-name")).toBeNull();
    expect(mossEssence?.textContent).not.toContain("苔冠守望");
    expect(root.querySelector('[data-item-id="bag-gear"]')).toBeNull();
    expect(root.querySelector('[data-panel="inventory"]')?.textContent).toMatch(/\d+\/\d+/);
    const heading = root.querySelector('[data-panel="inventory"]');
    expect(heading?.querySelector('[data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(heading?.querySelector('[data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(heading?.querySelector<HTMLButtonElement>('[data-action="inventory-salvage-open"]')?.disabled).toBe(true);
    const materialFilter = heading?.querySelector<HTMLSelectElement>('[data-action="inventory-material-filter"]');
    expect([...materialFilter?.options ?? []].map((option) => option.textContent)).toEqual([
      "全部",
      "宝箱与广告券",
      "镶嵌",
      "重置",
      "熔炼",
      "开孔",
      "套装刻印",
      "进阶石",
    ]);
    heading?.querySelector<HTMLButtonElement>('[data-action="inventory-salvage-open"]')?.click();
    expect(root.querySelector(".salvage-modal")).toBeNull();
    const applyMaterialFilter = (value: string) => {
      const select = root.querySelector<HTMLSelectElement>('[data-action="inventory-material-filter"]');
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    applyMaterialFilter("socket");
    expect(root.querySelector('[data-material-id="mat_socket_stone"]')).not.toBeNull();
    expect(root.querySelector('[data-material-id="gem_atk"]')).toBeNull();
    applyMaterialFilter("inlay");
    expect(root.querySelector('[data-material-id="gem_atk"]')).not.toBeNull();
    expect(root.querySelector('[data-material-id="mat_socket_stone"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="inventory-organize"]')?.click();
    expect(root.querySelector<HTMLSelectElement>('[data-action="inventory-material-filter"]')?.value).toBe("all");
    expect(root.querySelector('[data-material-id="mat_socket_stone"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-material-id="mat_socket_stone"]')?.click();
    expect(root.querySelector(".material-tips-modal")).toBeNull();
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card h3")?.textContent).toBe("开孔石");
    root.querySelector<HTMLButtonElement>('[data-action="inventory-set-essence-detail"][data-set-id="set_moss_crown"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card h3")?.textContent).toBe("苔冠守望精华");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")?.textContent).toMatch(/套装精华.*库存 ×2.*分解带有苔冠守望套装标签/s);
    root.querySelector<HTMLButtonElement>('[data-action="inventory-material-detail"][data-material-id="mat_set_inscription"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card h3")?.textContent).toBe("套装刻印石");
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")?.textContent).toMatch(/套装刻印.*库存 ×1.*与指定套装精华一同消耗/s);
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-material-filter"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.querySelector(".equipment-global-tips-host .material-tip-card")).toBeNull();
    root
      .querySelector<HTMLButtonElement>('[data-action="inventory-bag-tab"][data-tab="equipment"]')
      ?.click();
    expect(root.querySelector('[data-item-id="bag-gear"]')).not.toBeNull();
  });

  it("opens a salvage filter modal and confirms selected items", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.gold = 0;
    save.inventory = [
      {
        instanceId: "keep-rare",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "rare",
        stage: 1,
        stats: { attack: 20 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "scrap-one",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 8 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "scrap-two",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "common",
        stage: 1,
        stats: { maxHp: 40, defense: 4 },
        affixes: [],
        traitId: null,
        setId: "set_moss_crown",
      },
    ];
    save.roster.H01.equipment.main_weapon = "scrap-one";
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>('[data-action="inventory-salvage-open"]')?.click();
    const dialog = root.querySelector<HTMLElement>(".salvage-modal");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll(".salvage-chip.active")).toHaveLength(1);
    expect(dialog?.querySelector('.salvage-chip[data-rarity="common"]')?.classList.contains("active")).toBe(true);
    expect(dialog?.querySelectorAll('.salvage-grid [data-item-id="scrap-two"].selected')).toHaveLength(1);
    expect(dialog?.querySelector('[data-item-id="scrap-one"]')).toBeNull();
    expect(dialog?.querySelector('[data-item-id="keep-rare"]')).toBeNull();
    expect(dialog?.textContent).toContain("精华 ×1");
    expect(dialog?.querySelector('[data-item-id="scrap-two"] .set-tag-mark')?.textContent).toBe("苔");
    expect(
      dialog?.querySelector<HTMLImageElement>('[data-action="salvage-confirm"] .inline-currency-icon')?.getAttribute("src"),
    ).toBe("/assets/resources/currency_gold_warm_outline_256.png");

    dialog?.querySelector<HTMLButtonElement>('[data-action="salvage-confirm"]')?.click();
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId).sort()).toEqual([
      "keep-rare",
      "scrap-one",
    ]);
    expect(store.getState().save.gold).toBeGreaterThan(0);
    expect(root.querySelector(".salvage-modal")).toBeNull();
    expect(root.querySelector(".toast-stack")?.textContent).toContain("苔冠守望精华 +1");
  });

  it("opens item tips first, then equip flow with candidate list and side-by-side compare", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestClearedStage = 12;
    save.party = ["H01", "H02", "H03", "H04", "H05"];
    save.tutorialCompleted = true;
    save.roster.H01.experience = 6;
    save.inventory = [
      {
        instanceId: "gear-test",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 12 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "gear-alt",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "uncommon",
        stage: 1,
        stats: { attack: 18 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "gear-armor",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "common",
        stage: 1,
        level: 5,
        stats: { maxHp: 40, defense: 4 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});
    expect(root.querySelector(".notice-dot")).toBeNull();

    const card = root.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]');
    expect(card?.querySelector("strong")).toBeNull();
    expect(card?.querySelector("small")).toBeNull();
    expect(card?.querySelector<HTMLImageElement>(".equipment-art")?.getAttribute("src")).toBe(
      "/assets/equipment/weapon_guard_blade.webp",
    );

    card?.click();
    const tips = root.querySelector<HTMLElement>(".equipment-global-tips-host .equipment-tips-popover");
    expect(tips).not.toBeNull();
    expect(root.querySelector(".character-equip-modal")).toBeNull();
    expect(tips?.querySelector<HTMLImageElement>(".equipment-tip-icon .equipment-art")?.getAttribute("src")).toBe(
      "/assets/equipment/weapon_guard_blade.webp",
    );
    expect(tips?.textContent).toContain("守望短刃");
    expect(tips?.textContent).toMatch(/攻击\s*\+12/);
    expect(tips?.querySelector('[data-action="item-salvage"]')).not.toBeNull();
    expect(tips?.querySelector('[data-action="item-open-equip"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.inventory-grid [data-item-id="gear-alt"]')?.click();
    expect(
      root
        .querySelector<HTMLImageElement>(".equipment-global-tips-host .equipment-tip-icon .equipment-art")
        ?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");
    root.querySelector<HTMLButtonElement>('.inventory-grid [data-item-id="gear-test"]')?.click();

    root.querySelector<HTMLButtonElement>('.equipment-global-tips-host [data-action="item-open-equip"]')?.click();
    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    expect(root.querySelector(".equipment-global-tips-host .equipment-tips-popover")).toBeNull();
    expect(dialog?.querySelector(".character-equip-header h2")?.textContent).toBe("英雄属性");
    expect(dialog?.querySelector(".character-equip-header .modal-close")).not.toBeNull();
    expect(dialog?.querySelector(".equip-party-strip")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-party-strip .party-member-tab")).toHaveLength(5);
    expect(dialog?.querySelector(".character-resource-bar.hp b")?.textContent).toBe("1500");
    expect(dialog?.querySelector(".character-resource-bar.hp + .character-resource-bar.experience")).not.toBeNull();
    expect(dialog?.querySelector(".character-resource-bar.experience b")?.textContent).toBe("6/12");
    expect(dialog?.querySelector(".character-resource-bar.experience")?.getAttribute("aria-valuenow")).toBe("6");
    expect(dialog?.querySelector(".character-resource-bar.rage")).toBeNull();
    expect(dialog?.querySelectorAll(".equip-panel-tab")).toHaveLength(2);
    expect(dialog?.querySelector('.equip-panel-tab[data-tab="gear"]')?.classList.contains("active")).toBe(true);
    expect(dialog?.textContent).toContain("罗德里克");
    expect(dialog?.querySelectorAll(".equip-slot")).toHaveLength(10);
    const emptySlotArt = dialog?.querySelector<HTMLElement>(".equip-slot.empty .equip-slot-art");
    expect(emptySlotArt?.textContent?.trim()).toBe("空");
    expect(emptySlotArt?.querySelector("img")).toBeNull();
    expect(dialog?.querySelector(".character-loadout-col.left")).not.toBeNull();
    expect(dialog?.querySelector(".character-loadout-col.right")).not.toBeNull();
    expect(dialog?.querySelector<HTMLImageElement>(".character-portrait-art")?.getAttribute("src")).toBe(
      "/assets/characters/hero-h01.webp",
    );
    expect(dialog?.querySelector(".equip-compare-board")).toBeNull();
    expect(dialog?.querySelector('.equip-gear-panel [data-action="equip-item"]')).toBeNull();
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();
    expect(dialog?.querySelector(".equip-panel-body")).not.toBeNull();
    expect(dialog?.querySelector('[data-item-id="gear-test"]')?.classList.contains("selected")).toBe(true);
    const portraitBeforeTabSwitch = dialog?.querySelector(".character-portrait-stage");

    expect(dialog?.querySelector(".equip-candidate-grid")?.getAttribute("data-drag-scroll-bound")).toBe("1");
    expect(dialog?.getAttribute("data-drag-scroll-bound")).toBeNull();

    const candidates = dialog!.querySelectorAll(".equip-candidate-grid .item-card");
    expect(candidates).toHaveLength(2);
    expect(dialog?.querySelectorAll(".equip-candidate-grid .equip-upgrade-arrow")).toHaveLength(2);
    expect(dialog?.querySelector('[data-item-id="gear-alt"]')?.getAttribute("aria-label")).toContain("可提升当前装备");
    expect(
      dialog
        ?.querySelector<HTMLImageElement>('.equip-candidate-grid [data-item-id="gear-alt"] .equipment-art')
        ?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");

    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-alt"]')?.click();
    expect(dialog?.querySelector(".equip-tips-layer")).not.toBeNull();
    const singleTips = dialog?.querySelector<HTMLElement>(".equipment-tips-popover.is-single");
    expect(singleTips).not.toBeNull();
    expect(singleTips?.getAttribute("aria-modal")).toBe("false");
    expect(singleTips?.querySelectorAll(".equipment-tip-card")).toHaveLength(1);
    const compareLabels = [...(singleTips?.querySelectorAll(".equipment-tip-context") ?? [])].map(
      (node) => node.textContent,
    );
    expect(compareLabels).toEqual(["选择装备"]);
    expect(singleTips?.querySelector(".equipment-tip-card.current")).toBeNull();
    expect(
      singleTips?.querySelector<HTMLImageElement>(".equipment-tip-card.selected .equipment-art")?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");
    expect(singleTips?.querySelector(".item-stat-heading")).toBeNull();
    expect(singleTips?.querySelector('.equipment-tip-card.selected [data-action="equip-item"]')?.textContent).toBe("装备");
    expect(singleTips?.querySelector(':scope > [data-action="equip-item"]')).toBeNull();
    expect(dialog?.querySelector('[data-item-id="gear-alt"]')?.classList.contains("selected")).toBe(true);

    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]')?.click();
    expect(
      dialog
        ?.querySelector<HTMLImageElement>(".equipment-tips-popover .equipment-tip-card.selected .equipment-art")
        ?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_guard_blade.webp");
    expect(dialog?.querySelector('[data-item-id="gear-test"]')?.classList.contains("selected")).toBe(true);

    dialog?.querySelector<HTMLElement>(".equip-candidate-label")?.click();
    expect(dialog?.querySelector(".equipment-tips-popover")).toBeNull();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="armor"]')?.click();
    expect(dialog?.querySelector(".equip-candidate-label")?.textContent).toContain("护甲");
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(dialog?.querySelector('[data-item-id="gear-armor"] .equip-upgrade-arrow')).toBeNull();
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();
    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-armor"]')?.click();
    const lockedTips = dialog?.querySelector<HTMLElement>(".equipment-tips-popover.is-single");
    const lockedCard = lockedTips?.querySelector<HTMLElement>(".equipment-tip-card.selected");
    expect(lockedCard?.querySelector(".equipment-tips-status")?.textContent).toContain("需要 Lv.5");
    expect(lockedCard?.querySelector<HTMLButtonElement>('[data-action="equip-item"]')?.disabled).toBe(true);
    dialog?.querySelector<HTMLElement>(".equip-candidate-label")?.click();

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]')?.click();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(root.querySelector(".character-equip-modal")).toBe(dialog);
    expect(root.querySelector(".equip-modal")?.textContent).toContain("格雷戈尔");
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]')?.click();
    root.querySelector<HTMLButtonElement>('.equip-tips-layer [data-action="equip-item"]')?.click();
    expect(store.getState().save.roster.H02.equipment.main_weapon).toBe("gear-test");
    expect(root.querySelector(".character-equip-modal")).toBe(dialog);
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H01"]')?.click();
    expect(dialog?.querySelector('[data-item-id="gear-test"]')).toBeNull();
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(dialog?.querySelector('[data-item-id="gear-alt"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(dialog?.querySelector('[data-item-id="gear-alt"] .equip-upgrade-arrow')).not.toBeNull();
    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-alt"]')?.click();
    const comparisonTips = dialog?.querySelector<HTMLElement>(".equipment-tips-popover.is-comparison");
    expect(comparisonTips).not.toBeNull();
    expect(comparisonTips?.querySelectorAll(".equipment-tip-card")).toHaveLength(2);
    expect(
      [...(comparisonTips?.querySelectorAll(".equipment-tip-context") ?? [])].map((node) => node.textContent),
    ).toEqual(["选择装备", "当前装备"]);
    expect(
      comparisonTips?.querySelector(".equipment-tip-card.selected .equipment-tip-change.upgrade")?.getAttribute("aria-label"),
    ).toBe("提升");
    expect(comparisonTips?.querySelector('.equipment-tip-card.selected [data-action="equip-item"]')?.textContent).toBe("装备");
    dialog?.querySelector<HTMLElement>(".equip-candidate-label")?.click();
    root.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    const equippedTips = dialog?.querySelector<HTMLElement>(".equipment-tips-popover.is-single");
    expect(equippedTips).not.toBeNull();
    expect(equippedTips?.querySelectorAll(".equipment-tip-card")).toHaveLength(1);
    expect(equippedTips?.querySelector(".equipment-tip-card.current .equipment-tip-context")?.textContent).toBe("当前装备");
    expect(dialog?.querySelector(".equip-candidate-label")?.textContent).toContain("主武器");
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(equippedTips?.querySelector('[data-action="unequip-item"]')?.textContent).toBe("卸下");
    expect(equippedTips?.querySelector(".item-detail-sheet")).toBeNull();
    root.querySelector<HTMLButtonElement>('.equipment-tips-popover [data-action="unequip-item"]')?.click();
    expect(store.getState().save.roster.H02.equipment.main_weapon).toBeNull();
    expect(dialog?.querySelector(".equipment-tips-popover")).toBeNull();
    expect(dialog?.querySelector('[data-item-id="gear-test"]')).not.toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-panel-tab"][data-tab="stats"]')?.click();
    expect(dialog?.querySelector('.equip-panel-tab[data-tab="stats"]')?.classList.contains("active")).toBe(true);
    expect(dialog?.querySelector(".equip-panel-body")?.classList.contains("equip-tab-sections-enter")).toBe(true);
    expect(dialog?.querySelector(".character-portrait-stage")).toBe(portraitBeforeTabSwitch);
    expect(dialog?.querySelector(".character-portrait-art")).not.toBeNull();
    expect(dialog?.querySelector(".equip-slot-grid.gear")?.hasAttribute("hidden")).toBe(true);
    expect(dialog?.querySelector(".equip-candidate-section")?.hasAttribute("hidden")).toBe(true);
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("怒气获取");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("生命");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("攻击");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("伤害类型");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("冷却缩减");
    expect(dialog?.querySelector(".hero-damage-identity")).toBeNull();
    expect(dialog?.querySelector(".character-portrait-stars")?.parentElement?.classList.contains("character-rank-summary")).toBe(true);
    expect(dialog?.querySelector(".character-portrait-level")?.textContent).toMatch(/Lv\.\d+\/\d+/);
    expect(dialog?.querySelector(".character-portrait-tags")?.textContent).not.toContain("Lv.");
    expect(dialog?.querySelector(".character-portrait-tags")?.textContent).not.toContain("进阶");
    expect(dialog?.querySelector(".character-portrait-tags")?.children).toHaveLength(1);
    expect(dialog?.querySelector("[data-hero-specialization]")?.textContent).toBe(
      `${HERO_BY_ID.H02.className} · ${HERO_BY_ID.H02.specName}`,
    );
    const portraitArt = dialog?.querySelector(".character-portrait-art");
    expect(portraitArt?.previousElementSibling?.classList.contains("character-portrait-tags")).toBe(true);
    expect(portraitArt?.nextElementSibling?.classList.contains("character-portrait-meta")).toBe(true);
    expect(portraitArt?.nextElementSibling?.querySelector("strong")?.textContent).toBe(HERO_BY_ID.H02.name);
    expect(dialog?.querySelector(".character-resource-bar.rage")).toBeNull();
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("冷却缩减");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("技能冷却");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("物理抗性");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("火焰抗性");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("冰霜抗性");
    expect(dialog?.querySelector(".equip-stats-pager")).toBeNull();
    expect(dialog?.querySelector(".equip-stats-tabs")).toBeNull();
    const leftLabels = [...(dialog?.querySelectorAll(".equip-stats-col.left .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(dialog?.querySelector(".equip-stats-col.left .equip-stats-heading")?.textContent).toBe("进攻属性");
    expect(leftLabels[0]).toBe("攻击");
    expect(leftLabels).toContain("怒气获取");
    expect(leftLabels).toContain("全伤害");
    expect(leftLabels).not.toContain("雷霆增伤");
    expect(leftLabels).not.toContain("处决伤害");
    expect(leftLabels).not.toContain("防御");
    const rightLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(dialog?.querySelector(".equip-stats-col.right .equip-stats-heading")?.textContent).toBe("防御属性");
    expect(rightLabels[0]).toBe("防御");
    expect(rightLabels).not.toContain("全伤害");
    expect(rightLabels).not.toContain("技能伤害");
    expect(rightLabels).not.toContain("冷却缩减");
    expect(rightLabels).not.toContain("技能冷却");
    expect(rightLabels).not.toContain("火焰抗性");
    expect(rightLabels).toContain("每秒回血");
    expect(rightLabels).not.toContain("守护护盾");
    expect(rightLabels).not.toContain("风暴护盾");
    const hpRegenRow = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row") ?? [])].find(
      (row) => row.querySelector("span")?.textContent === "每秒回血",
    );
    expect(hpRegenRow?.querySelector("b")?.textContent).toBe("0");
    expect(dialog?.querySelector('.equip-stats-col.left [data-action="open-more-stats"]')).toBeNull();
    const moreStatsButton = dialog?.querySelector<HTMLButtonElement>('.equip-stats-col.right [data-action="open-more-stats"]');
    expect(dialog?.querySelectorAll('[data-action="open-more-stats"]')).toHaveLength(1);
    expect(moreStatsButton?.textContent).toBe("更多");
    moreStatsButton?.click();
    const statsDetail = dialog?.querySelector<HTMLElement>(".hero-stats-detail-dialog");
    const detailLeftLabels = [...(statsDetail?.querySelectorAll('.hero-stats-detail-group[aria-label="进攻属性"] .equip-stat-row span') ?? [])].map(
      (node) => node.textContent,
    );
    const detailRightLabels = [...(statsDetail?.querySelectorAll('.hero-stats-detail-group[aria-label="防御属性"] .equip-stat-row span') ?? [])].map(
      (node) => node.textContent,
    );
    expect(statsDetail?.querySelector("h3")?.textContent).toBe("全部属性");
    expect(detailLeftLabels).toContain("移动速度加成");
    expect(detailRightLabels).toContain("最大生命");
    expect(detailRightLabels).toContain("物理抗性");
    expect(detailRightLabels).toContain("火焰抗性");
    expect(detailRightLabels).toContain("圣光抗性");
    expect(detailLeftLabels).not.toContain("雷霆增伤");
    expect(detailRightLabels).not.toContain("守护护盾");
    statsDetail?.querySelector<HTMLButtonElement>('[data-action="close-more-stats"]')?.click();
    expect(dialog?.querySelector(".hero-stats-detail-dialog")).toBeNull();
    expect(dialog?.querySelectorAll('[data-action="open-more-stats"]')).toHaveLength(1);
    expect(dialog?.querySelector(".equip-skill-list .equip-skill-tile:not(.empty)")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile")).toHaveLength(4);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.empty")).toHaveLength(0);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.locked")).toHaveLength(1);
    expect(dialog?.querySelectorAll(".equip-skill-tile-tag")).toHaveLength(4);
    expect(dialog?.querySelector('[data-skill-kind="talent"] .equip-talent-entry-icon [data-icon-kind="talent"]')?.getAttribute("stroke-width")).toBe("2");
    expect(dialog?.querySelector('[data-skill-kind="signature"].locked .equip-skill-lock-icon [data-icon-kind="lock"]')?.getAttribute("stroke-width")).toBe("3.2");
    expect(dialog?.querySelector('[data-skill-kind="signature"].locked .equip-skill-tile-tag')?.textContent).not.toContain("锁");
    const skillIcons = dialog?.querySelectorAll<HTMLElement>(".equip-skill-tile-tag.skill-icon-sprite");
    expect(skillIcons).toHaveLength(2);
    expect(skillIcons?.[0]?.getAttribute("style")).toContain("atlas-warrior.png");
    expect(skillIcons?.[0]?.getAttribute("style")).toContain("--skill-icon-x:50%");
    expect(skillIcons?.[0]?.getAttribute("style")).toContain("--skill-icon-y:50%");
    expect(skillIcons?.[1]?.getAttribute("style")).toContain("--skill-icon-x:100%");
    expect(dialog?.querySelector(".equip-skill-name")?.textContent).toBeTruthy();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="signature"]')?.click();
    expect(dialog?.querySelector('.equip-skill-icon.large [data-icon-kind="lock"]')?.getAttribute("stroke-width")).toBe("3.2");
    dialog?.querySelector<HTMLButtonElement>('[data-action="close-equip-tips"]')?.click();
    expect(dialog?.querySelector(".equip-growth-actions")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-growth-action")).toHaveLength(3);
    expect(dialog?.querySelector('[data-action="hero-level"] strong')?.textContent).toBe("升级");
    expect(dialog?.querySelector<HTMLButtonElement>('[data-action="hero-level"]')?.disabled).toBe(false);
    expect(dialog?.querySelector<HTMLImageElement>('[data-action="hero-level"] .equip-growth-currency-cost img')?.getAttribute("src")).toBe("/assets/resources/currency_exp.webp");
    expect(dialog?.querySelector('[data-action="open-growth-dialog"][data-growth-kind="star"]')).not.toBeNull();
    expect(dialog?.querySelector('[data-action="open-growth-dialog"][data-growth-kind="ascend"]')).not.toBeNull();
    expect(dialog?.querySelectorAll(".character-portrait-stars .character-rank-star")).toHaveLength(5);
    expect(dialog?.querySelectorAll(".character-portrait-stars .character-rank-star.filled")).toHaveLength(0);
    expect(dialog?.querySelector(".character-portrait-level")?.textContent).toMatch(/^Lv\.1\/\d+$/);
    expect(dialog?.querySelector(".character-portrait-meta")?.textContent).not.toContain("进阶");

    dialog?.querySelector<HTMLButtonElement>('[data-action="open-growth-dialog"][data-growth-kind="star"]')?.click();
    expect(dialog?.querySelector('.growth-dialog[data-growth-kind="star"]')).not.toBeNull();
    expect(dialog?.querySelector('.growth-dialog[data-growth-kind="star"] h3')?.textContent).toBe("英雄升星");
    expect(dialog?.querySelector('.growth-dialog [data-action="hero-star-up"]')).not.toBeNull();
    expect(dialog?.querySelector<HTMLImageElement>('.growth-dialog .hero-fragment-art img')?.getAttribute("src")).toBe(
      "/assets/characters/hero-h02.webp",
    );
    const fragmentCost = dialog?.querySelector('.growth-dialog .hero-fragment-cost');
    expect(fragmentCost?.firstElementChild?.classList.contains("hero-fragment-title")).toBe(true);
    expect(fragmentCost?.querySelector('.hero-fragment-title')?.textContent).toContain("升星消耗");
    expect(fragmentCost?.querySelector('.hero-fragment-art')?.nextElementSibling?.classList.contains("hero-fragment-count")).toBe(true);
    expect(fragmentCost?.querySelector('.hero-fragment-count')?.textContent).toBe("0/1");
    expect(dialog?.querySelectorAll('.growth-dialog .growth-star-orbs')).toHaveLength(2);
    expect(dialog?.querySelectorAll('.growth-dialog .growth-star-orbs .character-rank-star')).toHaveLength(10);
    expect(dialog?.querySelectorAll('.growth-dialog .growth-star-orbs.next .character-rank-star.filled')).toHaveLength(1);
    expect(dialog?.querySelector('.growth-dialog .growth-star-orbs.next .character-rank-star.filled')?.classList.contains("silver")).toBe(true);
    expect(dialog?.querySelector('.growth-dialog .growth-star-rank')?.textContent).not.toMatch(/[★☆]/);
    expect(dialog?.querySelector('.growth-dialog .hero-fragment-progress')).toBeNull();
    expect(dialog?.querySelector('.growth-dialog > .growth-progress')).toBeNull();
    expect(dialog?.querySelector('.growth-dialog .growth-star-bonus')?.textContent).toContain("本次提升");
    expect(dialog?.querySelector('.growth-dialog .growth-star-bonus > small')?.textContent).toBe("本次提升");
    expect(dialog?.querySelectorAll('.growth-dialog .growth-star-bonus-pill')).toHaveLength(1);
    expect(dialog?.querySelector('.growth-dialog .growth-star-bonus-pill:first-child b')?.textContent).toBe("+2%");
    expect(dialog?.querySelector('.growth-dialog .growth-star-bonus-pill:nth-child(1) em')?.textContent).toBe("技能效果");
    expect(dialog?.querySelector('.growth-dialog .growth-star-bonus-pill:nth-child(1) b')?.textContent).toBe("+2%");
    expect(dialog?.querySelector('.growth-dialog[data-growth-kind="star"] .growth-dialog-status')).toBeNull();
    expect(dialog?.querySelector('.growth-dialog-actions .secondary-button')).toBeNull();
    expect(dialog?.querySelectorAll('.growth-dialog-actions button')).toHaveLength(1);
    expect(dialog?.querySelector<HTMLButtonElement>('.growth-dialog [data-action="hero-star-up"]')?.disabled).toBe(true);
    dialog?.querySelector<HTMLElement>('[data-action="close-growth-dialog"]')?.click();
    expect(dialog?.querySelector('.growth-dialog')).toBeNull();
    dialog?.querySelector<HTMLButtonElement>('[data-action="open-growth-dialog"][data-growth-kind="ascend"]')?.click();
    const ascendDialog = dialog?.querySelector<HTMLElement>('.growth-dialog[data-growth-kind="ascend"]');
    expect(ascendDialog).not.toBeNull();
    expect(ascendDialog?.querySelector("h3")?.textContent).toBe("英雄进阶");
    expect(ascendDialog?.querySelectorAll(".growth-ascend-rank-card")).toHaveLength(2);
    expect(ascendDialog?.querySelector(".growth-ascend-bonus")?.textContent).toContain("本次提升");
    expect(ascendDialog?.querySelector(".growth-section-title")?.textContent).toBe("进阶条件");
    const ascendConditions = ascendDialog?.querySelectorAll<HTMLElement>(".growth-condition");
    expect(ascendConditions).toHaveLength(1);
    const levelCondition = ascendConditions?.[0];
    expect(levelCondition?.querySelector(":scope > span")?.textContent).toBe("等级（未达成）");
    expect(levelCondition?.querySelector(".growth-condition-unmet")?.textContent).toBe("（未达成）");
    expect(levelCondition?.querySelector(".growth-condition-target-level")?.textContent).toBe("Lv.20");
    expect(levelCondition?.textContent).not.toContain("要求");
    expect(ascendDialog?.querySelector<HTMLImageElement>('.growth-ascend-stone-cost .material-art')?.getAttribute("src")).toBe(
      "/assets/resources/mat_ascend_stone.webp",
    );
    expect(ascendDialog?.querySelector(".growth-ascend-stone-cost .craft-socket-cost-count")?.textContent).toBe("20/1");
    const ascendStoneCost = ascendDialog?.querySelector<HTMLButtonElement>('.growth-ascend-stone-cost');
    expect(ascendStoneCost?.getAttribute("aria-label")).toBe("查看进阶石详情，消耗 1 个，持有 20 个");
    ascendStoneCost?.click();
    const ascendStoneTips = root.querySelector<HTMLElement>(".equipment-global-tips-host .material-tips-popover");
    expect(ascendStoneTips?.querySelector("h3")?.textContent).toBe("进阶石");
    expect(ascendStoneTips?.textContent).toMatch(/本次消耗.*20\/1.*英雄达到当前等级上限后消耗/s);
    expect(ascendStoneCost?.getAttribute("aria-expanded")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.querySelector(".equipment-global-tips-host .material-tips-popover")).toBeNull();
    expect(ascendStoneCost?.getAttribute("aria-expanded")).toBe("false");
    expect(ascendDialog?.querySelector(".growth-dialog-status")).toBeNull();
    expect(ascendDialog?.textContent).not.toContain("需先达到");
    expect(ascendDialog?.querySelector('.growth-dialog-actions .secondary-button')).toBeNull();
    expect(ascendDialog?.querySelectorAll('.growth-dialog-actions button')).toHaveLength(1);
    expect(ascendDialog?.querySelector<HTMLButtonElement>('[data-action="hero-ascend"]')?.disabled).toBe(true);
    dialog?.querySelector<HTMLButtonElement>('[data-action="close-growth-dialog"]')?.click();

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="active"]')?.click();
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();
    expect(dialog?.querySelector('.equip-skill-popover[role="region"]')).not.toBeNull();
    expect(dialog?.querySelector('.equip-skill-popover[data-skill-kind="active"] .skill-icon-sprite')).not.toBeNull();
    expect(dialog?.querySelector(".equip-skill-popover-close")).toBeNull();
    expect(dialog?.querySelector('.equip-skill-popover [data-action="close-equip-tips"]')).toBeNull();
    expect(dialog?.querySelector('[data-skill-kind="active"]')?.getAttribute("aria-expanded")).toBe("true");
    expect(dialog?.querySelector(".equip-skill-tips-desc")?.textContent).toBeTruthy();
    expect(dialog?.querySelector(".equip-skill-tips-cd")?.textContent).toContain("怒气");
    dialog?.querySelector<HTMLElement>(".character-portrait-stage")?.click();
    expect(dialog?.querySelector(".equip-skill-popover")).toBeNull();
    expect(dialog?.querySelector('[data-skill-kind="active"]')?.getAttribute("aria-expanded")).toBe("false");
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="active"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="active"]')?.click();
    expect(dialog?.querySelector(".equip-skill-popover")).toBeNull();
    expect(dialog?.querySelector('[data-skill-kind="active"]')?.getAttribute("aria-expanded")).toBe("false");
  });

  it("sorts upgrades first and auto-equips stronger gear from the equipment tab", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.inventory = [
      {
        instanceId: "kept-weapon",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 100 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "stronger-weapon",
        definitionId: "weapon_oak_staff",
        slot: "main_weapon",
        rarity: "common",
        level: 1,
        stage: 1,
        stats: { attack: 110 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "weaker-legendary-weapon",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "arcane",
        level: 1,
        stage: 1,
        stats: { attack: 1 },
        affixes: [],
        traitId: null,
      },
      {
        instanceId: "best-armor",
        definitionId: "armor_scale_vest",
        slot: "armor",
        rarity: "rare",
        level: 1,
        stage: 1,
        stats: { maxHp: 200, defense: 20 },
        affixes: [],
        traitId: null,
      },
    ];
    save.roster.H35.equipment.main_weapon = "kept-weapon";
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('.hero-card[data-hero-id="H35"]')?.click();

    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-panel-tab"][data-tab="gear"]')?.click();
    const autoEquip = dialog?.querySelector<HTMLButtonElement>('[data-action="equip-auto"]');
    expect(autoEquip?.textContent).toContain("自动装备");
    expect(autoEquip?.classList.contains("has-upgrade")).toBe(true);
    expect(autoEquip?.getAttribute("aria-label")).toBe("自动装备，有可提升装备");
    expect(autoEquip?.closest(".equip-candidate-heading")?.querySelector(".equip-candidate-label")?.textContent).toContain("可选装备");
    const weaponCandidates = [...(dialog?.querySelectorAll<HTMLElement>(".equip-candidate-grid .item-card") ?? [])];
    expect(weaponCandidates.map(({ dataset }) => dataset.itemId)).toEqual([
      "stronger-weapon",
      "weaker-legendary-weapon",
    ]);
    expect(weaponCandidates[0]?.querySelector(".equip-upgrade-arrow")).not.toBeNull();
    expect(weaponCandidates[1]?.querySelector(".equip-upgrade-arrow")).toBeNull();

    autoEquip?.click();
    expect(store.getState().save.roster.H35.equipment.main_weapon).toBe("stronger-weapon");
    expect(store.getState().save.roster.H35.equipment.armor).toBe("best-armor");
    expect(autoEquip?.classList.contains("has-upgrade")).toBe(false);
    expect(autoEquip?.getAttribute("aria-label")).toBe("自动装备");
    expect(root.querySelector(".toast-stack")?.textContent).toBe("");
    expect(dialog?.querySelector('[data-action="equip-slot-focus"][data-slot="armor"]')?.classList.contains("empty")).toBe(false);

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-panel-tab"][data-tab="stats"]')?.click();
    expect(autoEquip?.closest<HTMLElement>(".equip-candidate-section")?.hidden).toBe(true);
  });

  it("opens the shared talent tree and level-20 skill picker", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.roster.H35.level = 20;
    save.roster.H35.ascendLevel = 1;
    save.gold = TALENT_RESET_GOLD_COST - 1;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="hero-detail"][data-hero-id="H35"]')?.click();

    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile")).toHaveLength(4);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.locked")).toHaveLength(0);
    expect(dialog?.querySelector('[data-skill-kind="signature"]')?.classList.contains("choice-ready")).toBe(true);
    expect(dialog?.querySelector('[data-skill-kind="signature"] .equip-skill-choice-icon')?.textContent).toContain("＋");
    expect(dialog?.querySelector('[data-skill-kind="signature"] .equip-skill-notice')).not.toBeNull();
    expect(dialog?.querySelector('[data-skill-kind="signature"]')?.getAttribute("aria-label")).toBe("选择通用被动");
    expect(dialog?.querySelector('[data-skill-kind="talent"] .equip-skill-name')?.textContent).toBe("天赋");
    expect(dialog?.querySelector('[data-skill-kind="talent"] .equip-skill-notice')).not.toBeNull();
    expect(dialog?.querySelector('[data-skill-kind="talent"]')?.getAttribute("aria-label")).toBe("查看天赋，4点可用");

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="talent"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.talent-tips")).not.toBeNull();
    expect(dialog?.querySelector('[role="region"][aria-label="专精天赋"]')).not.toBeNull();
    expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(dialog?.querySelector('[data-action="close-equip-tips"][aria-label="返回英雄属性"]')).not.toBeNull();
    expect(dialog?.querySelector(".talent-tree-board")).not.toBeNull();
    expect(dialog?.querySelector(".talent-tree")).not.toBeNull();
    expect(dialog?.querySelector(".talent-board-rule")?.textContent).toBe("每 5 级获得 1 点");
    expect(dialog?.querySelector(".talent-board-points")?.textContent).toContain("已获 4/17");
    expect(dialog?.querySelector(".talent-tips-hint")).toBeNull();
    expect(dialog?.querySelectorAll(".talent-tier")).toHaveLength(4);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"] .talent-tier-nodes')?.children).toHaveLength(6);
    expect(dialog?.querySelector('.talent-tier[data-tier="1"] .talent-tier-nodes')?.children).toHaveLength(3);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"]')?.firstElementChild?.classList.contains("talent-tier-nodes")).toBe(true);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"]')?.lastElementChild?.classList.contains("talent-tier-meta")).toBe(true);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"] .talent-tier-nodes')?.getAttribute("style")).toContain("--talent-count:6");
    expect(dialog?.querySelectorAll(".talent-node-icon .talent-icon-svg")).toHaveLength(17);
    expect(dialog?.querySelector(".talent-node-icon .talent-icon-svg")?.getAttribute("stroke-width")).toBe("3.2");
    expect(new Set([...dialog?.querySelectorAll<SVGElement>(".talent-icon-svg") ?? []].map((icon) => icon.dataset.iconKind)).size).toBe(17);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"] .talent-tier-meta')?.textContent?.trim()).toBe("0/10");
    expect(dialog?.querySelectorAll(".talent-tier-copy, .talent-tier-requirement")).toHaveLength(0);
    expect(dialog?.querySelector('[data-talent-id="basic_a"]')?.classList.contains("locked")).toBe(true);
    expect(dialog?.querySelector('[data-talent-id="basic_a"] .talent-node-rank')).toBeNull();
    expect(dialog?.querySelector('[data-talent-id="basic_a"]')?.textContent).not.toContain("未解锁");
    expect(dialog?.querySelector('[data-talent-id="basic_a"] .talent-node-name')?.textContent).toBe("戒备强袭");
    expect(dialog?.querySelector('[data-talent-id="ultimate_a"] .talent-node-name')?.textContent).toBe("盾牌报复");
    const talentTree = dialog?.querySelector<HTMLElement>(".talent-tree-board");
    if (talentTree) talentTree.scrollTop = 24;
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="foundation_power"]')?.click();
    expect(dialog?.querySelector(".talent-node-detail")).not.toBeNull();
    expect(dialog?.querySelector(".talent-node-detail.tier-0 .talent-icon-svg")).not.toBeNull();
    expect(dialog?.querySelector(".talent-node-detail-close")).toBeNull();
    expect(dialog?.querySelector(".talent-node-detail-dismiss")).toBeNull();
    expect(dialog?.querySelector(".talent-tree-board")?.getAttribute("data-action")).toBe("close-talent-node-detail");
    expect(talentTree?.scrollTop).toBe(24);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="foundation_precision"]')?.click();
    expect(dialog?.querySelector(".talent-node-detail-title h3")?.textContent).toBe("铁壁");
    expect(dialog?.querySelector('[data-talent-id="foundation_precision"]')?.classList.contains("selected")).toBe(true);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="foundation_power"]')?.click();
    expect(dialog?.querySelector(".talent-node-detail-title h3")?.textContent).toBe("镇阵");
    expect(dialog?.querySelector(".talent-node-tips-stats")?.textContent).toContain("下一阶");
    expect(dialog?.querySelector(".talent-node-action-state")).toBeNull();
    expect(dialog?.querySelector('[data-action="talent-up"]')?.textContent).toBe("强化1级");
    expect(dialog?.querySelector<HTMLButtonElement>('[data-action="talent-up"]')?.disabled).toBe(false);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="basic_a"]')?.click();
    expect(dialog?.querySelector('[data-action="talent-up"]')?.textContent).toBe("强化1级");
    expect(dialog?.querySelector<HTMLButtonElement>('[data-action="talent-up"]')?.disabled).toBe(true);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="foundation_power"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-up"]')?.click();
    expect(store.getState().save.roster.H35.talentRanks.foundation_power).toBe(1);
    expect(dialog?.querySelector('[data-talent-id="foundation_power"] .talent-node-feedback')?.textContent).toBe("+1");
    expect(dialog?.querySelector(".talent-node-detail")?.classList.contains("no-entry-animation")).toBe(true);
    expect(dialog?.querySelector('[data-action="talent-reset"]')).not.toBeNull();
    expect(dialog?.querySelector(".equip-tips-panel.talent-tips")).not.toBeNull();
    dialog?.querySelector<HTMLElement>('.talent-tree-board[data-action="close-talent-node-detail"]')?.click();
    expect(dialog?.querySelector(".talent-node-detail.empty")).not.toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset"]')?.click();
    const resetDialog = dialog?.querySelector<HTMLElement>(".talent-reset-confirm");
    expect(resetDialog?.getAttribute("role")).toBe("dialog");
    expect(resetDialog?.getAttribute("aria-modal")).toBe("true");
    expect(resetDialog?.closest(".talent-reset-dialog-layer")).not.toBeNull();
    expect(dialog?.querySelector(".talent-board-layout + .talent-reset-dialog-layer")).not.toBeNull();
    expect(resetDialog?.querySelector('[data-action="talent-reset-cancel"]')?.hasAttribute("autofocus")).toBe(true);
    expect(resetDialog?.querySelector(".talent-reset-cost")?.textContent).toContain("重置费用");
    expect(resetDialog?.querySelector(".talent-reset-cost")?.textContent).toContain("10K");
    expect(resetDialog?.querySelector(".talent-reset-cost")?.textContent).toContain("金币不足");
    expect(
      resetDialog?.querySelector<HTMLImageElement>(".talent-reset-cost .inline-currency-icon")?.getAttribute("src"),
    ).toBe("/assets/resources/currency_gold_warm_outline_256.png");
    expect(resetDialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset-confirm"]')?.disabled).toBe(true);
    expect(store.getState().save.roster.H35.talentRanks.foundation_power).toBe(1);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset-cancel"]')?.click();
    expect(dialog?.querySelector(".talent-reset-confirm")).toBeNull();
    store.getState().save.gold = TALENT_RESET_GOLD_COST;
    store.dispatch({ type: "settings:update", patch: {} });
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset"]')?.click();
    expect(dialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset-confirm"]')?.disabled).toBe(false);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-reset-confirm"]')?.click();
    expect(store.getState().save.roster.H35.talentRanks).toEqual({});
    expect(store.getState().save.gold).toBe(0);

    dialog?.querySelector<HTMLButtonElement>('[data-action="close-equip-tips"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="signature"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.skill-pick-tips")).not.toBeNull();
    expect(dialog?.querySelectorAll(".skill-pick-card-icon.skill-icon-sprite")).toHaveLength(8);
    expect(dialog?.querySelectorAll(".skill-pick-grid > article.skill-pick-card")).toHaveLength(8);
    expect(dialog?.querySelectorAll(".skill-pick-card > button.skill-pick-select")).toHaveLength(8);
    expect(dialog?.querySelectorAll(".skill-pick-card > .primary-button")).toHaveLength(8);
    expect(dialog?.querySelector(".skill-pick-head")?.textContent).toContain("玛蒂尔达");
    expect(dialog?.querySelector(".skill-pick-head")?.textContent).toContain("不占用行动");
    expect(dialog?.querySelectorAll(".skill-pick-card-desc")).toHaveLength(8);
    expect(dialog?.querySelector(".skill-pick-card-icon")?.getAttribute("style")).toContain("atlas-shared.png");
    expect(dialog?.querySelector(".skill-pick-tips")?.textContent).toContain("不消耗怒气");
    expect(dialog?.querySelector(".skill-pick-tips")?.textContent).not.toContain("每第 3 次施法");
    dialog?.querySelector<HTMLButtonElement>('[data-action="choose-hero-skill"][data-skill-id="iron-wall"]')?.click();
    expect(store.getState().save.roster.H35.chosenSkillId).toBe("iron-wall");
    expect(dialog?.querySelector('[data-skill-kind="signature"]')?.classList.contains("choice-ready")).toBe(false);
    expect(dialog?.querySelector('[data-skill-kind="signature"] .equip-skill-notice')).toBeNull();
    expect(dialog?.querySelector(".equip-skill-tips-footer")?.textContent).toContain("更换技能");

    store.getState().save.gold = HERO_SKILL_CHANGE_GOLD_COST;
    store.dispatch({ type: "settings:update", patch: {} });
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-pick"]')?.click();
    expect(dialog?.querySelector(".skill-pick-change-cost")?.textContent).toContain("5,000");
    expect(dialog?.querySelector('[data-action="choose-hero-skill"][data-skill-id="quake-slash"]')?.textContent).toBe("更换");
    dialog?.querySelector<HTMLButtonElement>('[data-action="choose-hero-skill"][data-skill-id="quake-slash"]')?.click();
    const changeConfirm = dialog?.querySelector<HTMLElement>(".skill-change-confirm");
    expect(changeConfirm?.textContent).toContain("铁壁意志");
    expect(changeConfirm?.textContent).toContain("破阵余震");
    expect(changeConfirm?.textContent).toContain("5,000");
    expect(store.getState().save.roster.H35.chosenSkillId).toBe("iron-wall");
    changeConfirm?.querySelector<HTMLButtonElement>('[data-action="hero-skill-change-confirm"]')?.click();
    expect(store.getState().save.roster.H35.chosenSkillId).toBe("quake-slash");
    expect(store.getState().save.gold).toBe(0);
  });

  it("groups offensive and defensive hero stats by combat purpose", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestClearedStage = 12;
    save.party = ["H35", "H02", "H03", "H04", "H57"];
    save.tutorialCompleted = true;
    save.roster.H03.ascendLevel = 2;
    save.roster.H03.level = getHeroLevelCap(2);
    save.inventory = [
      {
        instanceId: "stat-gear",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "epic",
        stage: 1,
        stats: { attack: 20 },
        affixes: [
          { affixId: "damage_pct", value: 10 },
          { affixId: "primary_attack_pct", value: 8 },
          { affixId: "skill_damage", value: 8 },
          { affixId: "cast_speed", value: 8 },
          { affixId: "physical_damage_pct", value: 8 },
          { affixId: "magic_damage_pct", value: 8 },
          { affixId: "damage_reduction", value: 4 },
          { affixId: "life_on_hit", value: 3 },
          { affixId: "life_steal", value: 5 },
          { affixId: "hp_regen", value: 2 },
          { affixId: "dodge_chance", value: 4 },
          { affixId: "block_chance", value: 4 },
          { affixId: "move_speed", value: 8 },
        ],
        traitId: "execute",
      },
    ];
    save.roster.H35.equipment.main_weapon = "stat-gear";
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="hero-detail"][data-hero-id="H35"]')?.click();

    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector(".equip-stats-pager")).toBeNull();
    expect(dialog?.querySelector(".equip-stats-tabs")).toBeNull();
    const leftLabels = [...(dialog?.querySelectorAll(".equip-stats-col.left .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    const rightLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(leftLabels).toContain("全伤害");
    expect(leftLabels).toContain("技能伤害");
    expect(leftLabels).not.toContain("处决伤害");
    expect(leftLabels).not.toContain("防御");
    expect(rightLabels[0]).toBe("防御");
    expect(rightLabels).not.toContain("全伤害");
    expect(rightLabels).not.toContain("技能伤害");
    expect(rightLabels).not.toContain("处决伤害");
    expect(rightLabels).not.toContain("守护护盾");
    expect(rightLabels).not.toContain("冷却缩减");
    expect(rightLabels).not.toContain("技能冷却");
    expect(rightLabels).not.toContain("火焰抗性");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("怒气获取");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("施法速度+8%");

    dialog?.querySelector<HTMLButtonElement>('[data-action="open-more-stats"]')?.click();
    const fullStatsText = dialog?.querySelector(".hero-stats-detail-dialog")?.textContent ?? "";
    expect(fullStatsText).toContain("火焰抗性");
    expect(fullStatsText).toContain("每秒回血");
    expect(fullStatsText).not.toContain("处决伤害");
    dialog?.querySelector<HTMLButtonElement>('[data-action="close-more-stats"]')?.click();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H03"]')?.click();
    expect(dialog?.querySelector(".hero-damage-identity")).toBeNull();
    expect(dialog?.querySelector(".character-portrait-tags")?.getAttribute("aria-label")).toBe(
      `职业专精：${HERO_BY_ID.H03.className} · ${HERO_BY_ID.H03.specName}`,
    );
    expect(dialog?.querySelector("[data-hero-specialization]")?.textContent).toBe(
      `${HERO_BY_ID.H03.className} · ${HERO_BY_ID.H03.specName}`,
    );
    expect(dialog?.querySelector(".character-portrait-level")?.textContent).toBe(
      `Lv.${getHeroLevelCap(2)}/${getHeroLevelCap(2)}`,
    );
    expect(dialog?.querySelector(".character-portrait-level")?.classList.contains("capped")).toBe(true);
  });

  it("clears the backpack preview style when common tips close", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.inventory = [
      {
        instanceId: "gear-bag",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 12 },
        affixes: [],
        traitId: null,
      },
    ];
    new AppShell(root, new GameStore(save), {});
    root.querySelector<HTMLButtonElement>(".item-card")?.click();
    expect(root.querySelector(".item-grid .item-card.equipment-previewing")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(root.querySelector(".item-grid .item-card.equipment-previewing")).toBeNull();
  });

  it("salvages an item from the common tips and awards gold", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.gold = 0;
    save.inventory = [
      {
        instanceId: "gear-scrap",
        definitionId: "weapon_guard_blade",
        slot: "main_weapon",
        rarity: "common",
        stage: 1,
        stats: { attack: 12 },
        affixes: [],
        traitId: null,
        setId: "set_moss_crown",
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>(".item-card")?.click();
    const salvageButton = root.querySelector<HTMLButtonElement>('[data-action="item-salvage"]');
    expect(root.querySelector(".equipment-salvage-bonus")).toBeNull();
    expect(salvageButton?.querySelector(".equipment-tips-salvage-label")?.textContent).toBe("分解");
    expect(salvageButton?.querySelector(".equipment-tips-salvage-reward")?.textContent).toMatch(/^\d+$/);
    expect(salvageButton?.querySelector<HTMLImageElement>(".inline-currency-icon")?.getAttribute("src")).toBe(
      "/assets/resources/currency_gold_warm_outline_256.png",
    );
    salvageButton?.click();
    expect(store.getState().save.inventory).toHaveLength(0);
    expect(store.getState().save.gold).toBeGreaterThan(0);
    expect(root.querySelector(".equipment-global-tips-host .equipment-tips-popover")).toBeNull();
    expect(root.querySelector(".toast-stack")?.textContent).toContain("苔冠守望精华 +1");
  });

  it("renders heroes as cards with portrait, specialization, and level", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.party = ["H57", "H03", "H35", "H04", "H02"];
    save.roster.H57.ascendLevel = 5;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    const cards = root.querySelectorAll(".hero-card");
    expect(cards).toHaveLength(40);
    const first = cards[0]!;
    expect(first.querySelector(".hero-card-art img")?.getAttribute("src")).toBe(
      "/assets/characters/hero-h57.webp",
    );
    expect(first.querySelector(".hero-card-name")?.textContent).toBe("温蒂");
    expect(first.querySelector(".hero-card-role")?.textContent).toBe("射击");
    expect(first.querySelector(".hero-card-level")?.textContent).toMatch(/^Lv\./);
    expect(first.querySelector(".hero-card-party-status")?.textContent).toBe("已上阵");
    expect(first.querySelector(".hero-card-stars")).toBeNull();
    expect(first.getAttribute("style")).toContain("--role-color:");
    expect(first.classList.contains("ascend-5")).toBe(true);
    expect(first.querySelector(".hero-ascend-rank-seal")?.getAttribute("data-level")).toBe("5");
    expect(first.querySelector(".hero-ascend-rank-seal")?.textContent).toBe("Ⅴ");
    expect([...cards].slice(0, 6).map((card) => card.getAttribute("data-hero-id"))).toEqual([
      "H57",
      "H03",
      "H35",
      "H04",
      "H02",
      "H09",
    ]);
    expect(root.querySelectorAll(".hero-card-party-status")).toHaveLength(5);
    expect(root.querySelector(".content-panel .hero-detail")).toBeNull();
  });

  it("shows ascend rank seals on progressed heroes", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    (["H35", "H02", "H03", "H04", "H57"] as const).forEach((id, i) => { save.roster[id].ascendLevel = i + 1; });
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    expect(root.querySelector('.hero-card[data-hero-id="H35"] .hero-ascend-rank-seal')?.getAttribute("data-level")).toBe("1");
    expect(root.querySelector('.hero-card[data-hero-id="H02"] .hero-ascend-rank-seal')?.getAttribute("data-level")).toBe("2");
    expect(root.querySelector('.hero-card[data-hero-id="H03"] .hero-ascend-rank-seal')?.getAttribute("data-level")).toBe("3");
    expect(root.querySelector('.hero-card[data-hero-id="H04"] .hero-ascend-rank-seal')?.getAttribute("data-level")).toBe("4");
    expect(root.querySelector('.hero-card[data-hero-id="H57"] .hero-ascend-rank-seal')?.getAttribute("data-level")).toBe("5");
    expect(root.querySelector('.hero-card[data-hero-id="H35"]')?.getAttribute("style")).toContain("--role-color:");
  });

  it("shows an ascend rank seal on hero cards after advancement", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.roster.H71.unlocked = true;
    save.roster.H71.stars = 5;
    save.roster.H71.ascendLevel = 3;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    const card = root.querySelector<HTMLElement>('.hero-card[data-hero-id="H71"]');
    expect(card?.classList.contains("ascended")).toBe(true);
    expect(card?.classList.contains("ascend-3")).toBe(true);
    expect(card?.querySelector(".hero-ascend-rank-seal")?.getAttribute("data-level")).toBe("3");
    expect(card?.querySelector(".hero-ascend-rank-seal")?.textContent).toBe("Ⅲ");
    expect(card?.querySelector(".hero-ascend-crest")).toBeNull();
    expect(card?.querySelector(".hero-card-stars")).toBeNull();
  });

  it("keeps level-up visible and opens star-up and ascend dialogs", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.exp = 500;
    save.roster.H71.marks = 5;
    save.roster.H71.stars = 5;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });

    const beforeLevel = store.getState().save.roster.H71.level;
    const beforeExp = store.getState().save.exp;
    root.querySelector<HTMLButtonElement>('.hero-card[data-hero-id="H71"]')?.click();

    const equip = root.querySelector(".character-equip-modal");
    expect(equip).not.toBeNull();
    expect(equip?.querySelector('.equip-panel-tab[data-tab="stats"]')?.classList.contains("active")).toBe(true);
    expect(equip?.querySelector(".character-portrait-meta strong")?.textContent).toBe("卡珊德拉");
    expect(equip?.querySelector(".equip-skill-list")).not.toBeNull();
    expect(equip?.querySelector(".equip-growth-actions")).not.toBeNull();
    expect(equip?.querySelector('[data-action="hero-level"] strong')?.textContent).toBe("升级");
    expect(equip?.querySelector('[data-action="open-growth-dialog"][data-growth-kind="star"]')).not.toBeNull();
    expect(equip?.querySelector('[data-action="open-growth-dialog"][data-growth-kind="ascend"]')).not.toBeNull();

    equip?.querySelector<HTMLButtonElement>('[data-action="hero-level"]')?.click();
    expect(store.getState().save.roster.H71.level).toBe(beforeLevel + 1);
    expect(store.getState().save.exp).toBeLessThan(beforeExp);
    expect(root.querySelector('.character-portrait-level')?.textContent).toMatch(/^Lv\.2\/\d+$/);
    expect(root.querySelector('.equip-growth-action.level')?.textContent).not.toContain("Lv.2");

    root.querySelector<HTMLButtonElement>('.character-equip-modal [data-action="open-growth-dialog"][data-growth-kind="star"]')?.click();
    expect(root.querySelector('.character-equip-modal .growth-dialog[data-growth-kind="star"]')).not.toBeNull();
    expect(root.querySelectorAll('.growth-dialog .growth-star-orbs:first-child .character-rank-star.silver')).toHaveLength(5);
    expect(root.querySelectorAll('.growth-dialog .growth-star-orbs.next .character-rank-star.gold')).toHaveLength(1);
    expect(root.querySelector('.growth-dialog .growth-star-bonus-pill:first-child b')?.textContent).toBe("+3%");
    expect(root.querySelector('.growth-dialog .growth-star-bonus-pill:nth-child(1) b')?.textContent).toBe("+3%");
    expect(root.querySelector('.growth-dialog .hero-fragment-count')?.textContent).toBe("5/5");
    root.querySelector<HTMLButtonElement>('.character-equip-modal .growth-dialog [data-action="hero-star-up"]')?.click();
    expect(store.getState().save.roster.H71.stars).toBe(6);
    const starResult = root.querySelector<HTMLElement>('.hero-growth-result-modal.star-result');
    expect(starResult).not.toBeNull();
    expect(starResult?.querySelector("h2")?.textContent).toBe("金星突破");
    expect(starResult?.querySelector(".hero-growth-result-copy")?.textContent).toContain("卡珊德拉");
    expect(starResult?.querySelector(".hero-growth-result-rank")?.textContent).toMatch(/银星 5\/5.*金星 1\/5/s);
    expect(starResult?.querySelectorAll(".hero-growth-result-rank .current .character-rank-star.gold")).toHaveLength(1);
    expect(starResult?.querySelectorAll(".hero-growth-result-gain")).toHaveLength(1);
    expect(starResult?.querySelector(".hero-growth-result-gains")?.textContent).toContain("技能效果");
    expect(starResult?.querySelector(".craft-result-dismiss-hint")?.textContent).toBe("点击空白处返回英雄详情");
    starResult?.click();
    expect(root.querySelector(".hero-growth-result-modal")).toBeNull();
    expect(root.querySelector(".character-equip-modal")).not.toBeNull();
    expect(root.querySelector(".character-equip-modal .growth-dialog")).toBeNull();

    root.querySelector<HTMLButtonElement>('.character-equip-modal [data-action="open-growth-dialog"][data-growth-kind="ascend"]')?.click();
    expect(root.querySelector('.character-equip-modal .growth-dialog[data-growth-kind="ascend"]')).not.toBeNull();
    expect(root.querySelector('.character-equip-modal .growth-condition-list')?.textContent).not.toContain("星级");
    expect(root.querySelector<HTMLButtonElement>('.character-equip-modal .growth-dialog [data-action="hero-ascend"]')?.disabled).toBe(true);
  });

  it("marks star-up and ascend actions when their requirements are met", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.roster.H71.unlocked = true;
    save.roster.H71.ascendLevel = 0;
    save.roster.H71.stars = 5;
    save.roster.H71.marks = 5;
    save.roster.H71.level = getHeroLevelCap(0);
    save.materials.mat_ascend_stone = 1;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });

    root.querySelector<HTMLButtonElement>('.hero-card[data-hero-id="H71"]')?.click();

    const starAction = root.querySelector<HTMLButtonElement>(
      '.character-equip-modal [data-action="open-growth-dialog"][data-growth-kind="star"]',
    );
    const ascendAction = root.querySelector<HTMLButtonElement>(
      '.character-equip-modal [data-action="open-growth-dialog"][data-growth-kind="ascend"]',
    );
    expect(starAction?.querySelector(".equip-growth-notice")).not.toBeNull();
    expect(starAction?.getAttribute("aria-label")).toContain("可以升星");
    expect(ascendAction?.querySelector(".equip-growth-notice")).not.toBeNull();
    expect(ascendAction?.getAttribute("aria-label")).toContain("可以进阶");
    ascendAction?.click();
    expect(root.querySelector('.growth-dialog[data-growth-kind="ascend"] .growth-condition-unmet')).toBeNull();
    root.querySelector<HTMLButtonElement>('.growth-dialog [data-action="hero-ascend"]')?.click();
    expect(store.getState().save.roster.H71.ascendLevel).toBe(1);
    const ascendResult = root.querySelector<HTMLElement>(".hero-growth-result-modal.ascend-result");
    expect(ascendResult).not.toBeNull();
    expect(ascendResult?.querySelector("h2")?.textContent).toBe("进阶成功");
    expect(ascendResult?.querySelector(".hero-growth-result-rank")?.textContent).toMatch(/未进阶.*进阶 1/s);
    expect(ascendResult?.querySelector(".hero-growth-result-gains")?.textContent).toMatch(/等级上限.*Lv\.20.*Lv\.40/s);
    expect(ascendResult?.querySelectorAll(".hero-growth-result-gain")).toHaveLength(2);
    root.querySelector<HTMLDivElement>(".modal-backdrop")?.click();
    expect(root.querySelector(".hero-growth-result-modal")).toBeNull();
    expect(root.querySelector(".character-equip-modal")).not.toBeNull();
  });

  it("switches between daily shop and ability upgrades", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gold = 5_000;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "shop" });

    expect(root.querySelector('[data-action="shop-panel"][data-panel="daily"]')).not.toBeNull();
    expect(root.querySelector('[data-action="shop-panel"][data-panel="abilities"]')).not.toBeNull();
    expect(root.querySelector('[data-action="shop-panel"][data-panel="abilities"]')?.textContent).toContain("成长祝福");
    const refreshBar = root.querySelector(".shop-refresh-bar");
    expect(refreshBar?.firstElementChild?.classList.contains("shop-refresh-countdown")).toBe(true);
    expect(refreshBar?.querySelector("[data-shop-refresh-countdown]")).not.toBeNull();
    expect(refreshBar?.textContent).not.toContain("精品补给");
    expect(refreshBar?.querySelector(".shop-refresh-button-face")).not.toBeNull();
    expect(root.querySelector(".shop-grid")).not.toBeNull();
    expect(root.querySelector(".shop-card .shop-buy")).not.toBeNull();
    expect(root.querySelector(".shop-card.material-offer")).not.toBeNull();
    const materialCard = root.querySelector<HTMLButtonElement>(
      '[data-action="shop-material-detail"], [data-action="shop-set-essence-detail"]',
    );
    expect(materialCard?.querySelector(".shop-item-amount")?.textContent).toMatch(/^×\d+$/);
    materialCard?.click();
    const materialTips = root.querySelector<HTMLElement>("#global-material-tips");
    expect(materialTips).not.toBeNull();
    expect(materialTips?.textContent).toContain("材料详情");
    expect(materialTips?.textContent).toContain("库存 ×");
    const equipmentCard = root.querySelector(".shop-card.equipment-offer");
    expect(equipmentCard).not.toBeNull();
    expect(equipmentCard?.lastElementChild?.classList.contains("shop-buy")).toBe(true);
    equipmentCard?.querySelector<HTMLButtonElement>('[data-action="shop-offer-detail"]')?.click();
    const shopTips = root.querySelector<HTMLElement>(".equipment-global-tips-host .equipment-tips-popover");
    expect(shopTips?.querySelector(".equipment-tip-card")).not.toBeNull();
    expect(shopTips?.querySelector(".equipment-tip-footer")).toBeNull();
    expect(shopTips?.querySelector('[data-action="shop-buy"]')).toBeNull();
    expect(root.querySelector(".shop-offer-tips")).toBeNull();
    expect(root.querySelector(".ability-icon-grid")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="shop-panel"][data-panel="abilities"]')?.click();
    expect(root.querySelector(".equipment-global-tips-host .equipment-tips-popover")).toBeNull();
    expect(root.querySelector(".ability-shop-layout")).not.toBeNull();
    expect(root.querySelector('[data-panel="shop-abilities"] .panel-meta')).toBeNull();
    expect(root.querySelectorAll(".ability-category-tab").length).toBe(3);
    expect(root.querySelector(".ability-category-tabs")?.getAttribute("aria-orientation")).toBe("vertical");
    expect(root.querySelectorAll(".ability-icon-tile").length).toBe(5);
    expect(root.textContent).toContain("金币掉落固定值");
    expect(
      root.querySelector<HTMLImageElement>('[data-ability-id="gold_flat"] .ability-art')?.getAttribute("src"),
    ).toBe("/assets/abilities/gold_flat.png");
    expect(root.querySelector('[data-ability-id="gold_flat"] .ability-icon-value')?.textContent).toBe("当前 +0");
    expect(root.querySelector(".ability-icon-level")).toBeNull();
    expect(root.querySelector(".ability-icon-frame")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="ability-category"][data-category="combat"]')?.click();
    expect(root.querySelectorAll(".ability-icon-tile").length).toBe(8);
    expect(root.textContent).toContain("英雄攻击力固定值");

    root.querySelector<HTMLButtonElement>('[data-action="ability-category"][data-category="general"]')?.click();
    expect(root.querySelectorAll(".ability-icon-tile").length).toBe(4);
    expect(root.querySelector('[data-ability-id="backpack_slots"]')).not.toBeNull();
    expect(root.querySelector('[data-ability-id="chest_progress"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="ability-select"][data-ability-id="backpack_slots"]')?.click();
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("背包格子");
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("背包容量 +5");
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("Lv.0 / 32");
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="ability-select"][data-ability-id="chest_progress"]')?.click();
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("宝箱进度加成");
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-action="ability-category"][data-category="economy"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="ability-select"][data-ability-id="gold_flat"]')?.click();
    expect(
      root.querySelector<HTMLImageElement>(".ability-tips-icon .ability-art")?.getAttribute("src"),
    ).toBe("/assets/abilities/gold_flat.png");
    expect(root.querySelector(".ability-tips-heading")?.textContent).toContain("经济祝福");
    expect(root.querySelector(".ability-effect-current")?.textContent).toContain("+0");
    expect(root.querySelector(".ability-effect-next")?.textContent).toContain("+5");
    expect(root.querySelector(".ability-wallet-row")?.textContent).toContain("5,000/600");
    expect(root.querySelector('[data-action="ability-upgrade"]')?.textContent?.trim()).toBe("升级");
    expect(
      root.querySelector<HTMLImageElement>('.ability-wallet-row .inline-currency-icon')?.getAttribute("src"),
    ).toBe("/assets/resources/currency_gold_warm_outline_256.png");
    const before = store.getState().save.abilities.gold_flat;
    const beforeGold = store.getState().save.gold;
    root.querySelector<HTMLButtonElement>('[data-action="ability-upgrade"][data-ability-id="gold_flat"]')?.click();
    expect(store.getState().save.abilities.gold_flat).toBe(before + 1);
    expect(store.getState().save.gold).toBeLessThan(beforeGold);
    expect(root.querySelector(".ability-effect-current")?.textContent).toContain("+5");
    expect(root.querySelector(".ability-tips-body.upgraded")).not.toBeNull();
    expect(root.querySelector(".ability-level-change")?.textContent).toMatch(/Lv\.0.*Lv\.1/s);
    expect(root.querySelector(".ability-effect-change")?.textContent).toMatch(/\+0.*\+5/s);
    expect(root.querySelector(".ability-wallet-change")?.textContent).toMatch(/5,000.*4,400.*-600/s);
    expect(root.querySelector(".ability-level-progress > span.upgraded")?.getAttribute("style")).toContain("--ability-progress-from:0%");
    expect(root.querySelector(".toast-stack")?.textContent).not.toContain("金币掉落固定值 Lv.1");

    root.querySelector<HTMLButtonElement>('[data-action="shop-panel"][data-panel="daily"]')?.click();
    expect(root.querySelector(".ability-icon-grid")).toBeNull();
    expect(root.querySelector(".shop-grid")).not.toBeNull();
    expect(root.querySelector(".gem-shop-item")?.getAttribute("aria-label")).toContain("星石");
  });

  it("shows the newly unlocked hero on the summon result card", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    const shell = new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="summon-open"]')?.click();
    shell.presentBattleEvents([{ type: "battle:defeat", stage: 1 }]);
    expect(root.querySelector(".battle-banner")).toBeNull();
    expect(root.querySelector(".toast-stack")?.textContent).not.toContain("小队正在整备");
    expect(root.querySelector(".summon-balance")?.textContent).toContain("当前星石");
    expect(root.querySelector(".summon-current-theme")?.textContent).toContain("本期主题");
    expect(root.querySelectorAll(".summon-current-theme-portraits img").length).toBeGreaterThanOrEqual(3);
    expect(root.querySelector(".summon-current-theme")?.textContent).not.toContain("60%");
    expect(root.querySelector(".summon-current-theme")?.textContent).not.toContain("保底");
    expect(root.querySelector<HTMLButtonElement>('[data-action="summon-track-open"]')?.textContent).toContain("定轨召唤");
    expect(root.querySelector<HTMLButtonElement>('[data-action="summon-probability-open"]')?.textContent).toContain("召唤概率");
    root.querySelector<HTMLButtonElement>('[data-action="summon-probability-open"]')?.click();
    expect(root.querySelector(".summon-probability-modal h2")?.textContent).toBe("召唤概率");
    expect(root.querySelector(".summon-modal")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelectorAll('[data-action="summon-probability-tab"]')).toHaveLength(3);
    expect(root.querySelectorAll(".summon-probability-table > div")).toHaveLength(6);
    expect(root.querySelector(".summon-formula-list")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="summon-probability-tab"][data-tab="theme"]')?.click();
    expect(root.querySelector(".summon-formula-list")?.textContent).toContain("40%×60%=24%");
    expect(root.querySelector(".summon-formula-list")?.textContent).toContain("40%×40%=16%");
    expect(root.querySelector(".summon-probability-table")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="summon-probability-tab"][data-tab="guarantee"]')?.click();
    expect(root.querySelector(".summon-guarantee-list")?.textContent).toContain("主题保底");
    root.querySelector<HTMLButtonElement>('[data-action="summon-probability-back"]')?.click();
    expect(root.querySelector(".summon-probability-modal")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="summon-track-open"]')?.click();
    expect(root.querySelector(".summon-track-modal h2")?.textContent).toBe("定轨召唤");
    const trackCards = [...root.querySelectorAll<HTMLButtonElement>('[data-action="summon-track-theme"]')];
    expect(trackCards).toHaveLength(13);
    expect(trackCards.every((card) => card.querySelectorAll(".summon-track-portraits img").length >= 3)).toBe(true);
    expect(root.querySelectorAll(".summon-track-portraits .is-owned").length).toBeGreaterThan(0);
    expect(root.querySelectorAll(".summon-track-portraits .is-locked").length).toBeGreaterThan(0);
    const alternateCard = trackCards.find((card) => card.getAttribute("aria-selected") === "false")!;
    const alternateTheme = alternateCard.dataset.classId!;
    const alternateThemeLabel = alternateCard.querySelector(".summon-track-card-copy strong")?.textContent;
    alternateCard.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-theme-confirm"]')?.click();
    expect(store.getState().save.gems).toBe(250);
    expect(store.getState().save.personalSummonTheme?.classId).toBe(alternateTheme);
    expect(root.querySelector(".summon-track-modal")).toBeNull();
    expect(root.querySelector(".summon-current-theme")?.textContent).toContain("选择定轨");
    expect(root.querySelector(".summon-current-theme")?.textContent).toContain(alternateThemeLabel);
    expect(root.querySelector(".summon-current-theme")?.textContent).not.toContain("本期主题");
    root.querySelector<HTMLButtonElement>('[data-action="summon-theme-reset-request"]')?.click();
    expect(root.querySelector(".summon-theme-reset-modal")?.textContent).toContain("本次重置不消耗星石");
    root.querySelector<HTMLButtonElement>('[data-action="summon-theme-reset-cancel"]')?.click();
    expect(root.querySelector(".summon-theme-reset-modal")).toBeNull();
    expect(store.getState().save.personalSummonTheme?.classId).toBe(alternateTheme);
    root.querySelector<HTMLButtonElement>('[data-action="summon-theme-reset-request"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-theme-reset-confirm"]')?.click();
    expect(store.getState().save.gems).toBe(250);
    expect(store.getState().save.personalSummonTheme).toBeNull();
    expect(root.querySelector(".summon-current-theme")?.textContent).toContain("本期主题");
    expect(root.querySelector('[data-action="summon-theme-reset-request"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="summon-single"]')?.click();
    expect(root.querySelector(".summon-modal")?.classList.contains("is-revealing")).toBe(true);
    expect(root.querySelector(".summon-modal")?.classList.contains("is-charging")).toBe(true);
    expect(root.querySelector(".summon-ritual-status")?.textContent).toContain("星辉正在回应");
    expect(root.querySelector(".summon-result")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="summon-reveal-skip"]')?.click();
    expect(root.querySelectorAll(".summon-result")).toHaveLength(1);
    expect(root.querySelector(".summon-result")?.textContent).toContain("埃利奥");
    expect(root.querySelector(".summon-result")?.textContent).toContain("新英雄");
    expect(root.querySelector(".summon-result-identity")?.children).toHaveLength(2);
    expect(root.querySelector(".summon-result-class")?.textContent).toBeTruthy();
    expect(root.querySelector(".summon-result-spec")?.textContent).toBeTruthy();
    expect(root.querySelector(".summon-modal")?.getAttribute("data-action")).toBeNull();
    expect(root.querySelector(".summon-back-button")?.getAttribute("aria-label")).toBe("返回");
    root.querySelector<HTMLElement>(".summon-result")?.click();
    expect(root.querySelector(".summon-modal")).not.toBeNull();
    root.querySelector<HTMLButtonElement>(".summon-modal .modal-close")?.click();
    expect(root.querySelector(".summon-modal")).toBeNull();
  });

  it("shows five summon results after a five-pull", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gems = 1000;
    for (const hero of Object.keys(save.roster) as (keyof typeof save.roster)[]) {
      save.roster[hero].unlocked = true;
    }
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="summon-open"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-five"]')?.click();
    expect(root.querySelector(".summon-modal")?.classList.contains("is-revealing")).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-action="summon-reveal-skip"]')?.click();
    const cards = root.querySelectorAll(".summon-result");
    expect(cards).toHaveLength(5);
    expect(root.querySelector(".summon-result-grid")?.classList.contains("count-5")).toBe(true);
    const heroCards = root.querySelectorAll(".summon-result.unlock, .summon-result.marks");
    expect(heroCards.length).toBeGreaterThanOrEqual(1);
    expect(root.querySelectorAll(".summon-result.marks .summon-duplicate-mask").length).toBeGreaterThanOrEqual(2);
    expect([...heroCards].every((card) => card.querySelector(".summon-result-identity")?.children.length === 2)).toBe(true);
    expect(root.querySelector(".summon-result-summary")?.textContent).toMatch(/新英雄|专属碎片|成长奖励/);
  });

  it("renders one chapter map at a time and switches chapters", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 120;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    expect(root.querySelectorAll(".stage-map")).toHaveLength(1);
    expect(root.querySelectorAll(".chapter-atmosphere")).toHaveLength(1);
    expect(root.querySelectorAll(".stage-node")).toHaveLength(12);
    expect(root.querySelector(".chapter-switch-title")?.textContent).toContain("青丘林地");
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).not.toContain("物理伤害");
    expect(root.querySelector(".mainline-difficulty-tabs")).toBeNull();
    const difficultySelect = root.querySelector<HTMLSelectElement>('[data-action="stages-difficulty-select"]');
    expect(difficultySelect?.closest('[data-panel="stages"]')).not.toBeNull();
    expect(difficultySelect?.options).toHaveLength(1);
    expect(difficultySelect?.disabled).toBe(true);
    expect(difficultySelect?.options[0]?.textContent).toBe("简单");
    expect(difficultySelect?.textContent).not.toContain("困难");
    root.querySelector<HTMLButtonElement>('[data-action="stages-chapter-next"]')?.click();
    expect(root.querySelectorAll(".stage-map")).toHaveLength(1);
    expect(root.querySelectorAll(".stage-node")).toHaveLength(12);
    expect(root.querySelector(".chapter-switch-title")?.textContent).toContain("霜风谷");
    expect(root.querySelector('[data-stage="13"]')).not.toBeNull();
    expect(root.querySelector('[data-stage="1"]')).toBeNull();
  });

  it("shows chapter sets as interactive labels and lays out each set bonus separately", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 120;
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    const chapterDropEntry = root.querySelector<HTMLButtonElement>('[data-action="chapter-drops"]');
    expect(chapterDropEntry?.textContent).toContain("凡品–珍品");
    expect(chapterDropEntry?.textContent).not.toContain("凡品–神辉");
    chapterDropEntry?.click();

    const setButtons = root.querySelectorAll<HTMLButtonElement>('[data-action="chapter-set-tips"]');
    expect(setButtons.length).toBeGreaterThan(0);
    expect(root.querySelector(".chapter-set-mark-summary")).toBeNull();
    expect(root.querySelector(".chapter-drops-modal")?.textContent).not.toContain("每件装备独立判定");

    setButtons[0]?.click();
    const setTips = root.querySelector<HTMLElement>('.chapter-drop-item-tips[data-set-id]');
    expect(setTips?.hidden).toBe(false);
    expect(setTips?.querySelectorAll(".chapter-drop-tips-bonus-row")).toHaveLength(3);

    root.querySelector<HTMLButtonElement>('[data-action="chapter-drop-item-tips-close"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="chapter-drop-item"]')?.click();
    const itemTips = root.querySelector<HTMLElement>('.chapter-drop-item-tips[data-item-id]');
    const setCards = itemTips?.querySelectorAll(".chapter-drop-tips-set-card") ?? [];
    expect(setCards.length).toBeGreaterThan(0);
    expect([...setCards].every((card) => card.querySelectorAll(".chapter-drop-tips-bonus-row").length === 3)).toBe(true);
  });

  it("reveals the next difficulty only after the previous campaign is cleared", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 120;
    save.highestClearedStage = 120;
    save.difficultyProgress.easy = { highestUnlockedStage: 120, highestClearedStage: 120 };
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    const difficultySelect = root.querySelector<HTMLSelectElement>('[data-action="stages-difficulty-select"]')!;
    expect([...difficultySelect.options].map((option) => option.value)).toEqual(["easy", "hard"]);
    expect(difficultySelect.disabled).toBe(false);
    expect(difficultySelect.textContent).not.toContain("噩梦");
  });

  it("selects an unlocked difficulty and explains its equipment rewards", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 120;
    save.highestClearedStage = 120;
    save.difficultyProgress.easy = { highestUnlockedStage: 120, highestClearedStage: 120 };
    save.difficultyProgress.hard = { highestUnlockedStage: 120, highestClearedStage: 120 };
    save.difficultyProgress.nightmare = { highestUnlockedStage: 120, highestClearedStage: 120 };
    save.difficultyProgress.hell = { highestUnlockedStage: 120, highestClearedStage: 120 };
    const onStageSelected = vi.fn();
    const store = new GameStore(save);
    new AppShell(root, store, { onStageSelected });

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    const difficultySelect = root.querySelector<HTMLSelectElement>('[data-action="stages-difficulty-select"]')!;
    expect(difficultySelect.options).toHaveLength(5);
    difficultySelect.value = "torment";
    difficultySelect.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[data-action="stage-select"][data-stage="1"]')?.click();

    expect(root.querySelector(".difficulty-stage-summary")?.textContent).toContain("折磨");
    expect(root.querySelector(".difficulty-loot-note")?.textContent).toContain("本章掉落 Lv.100 装备");
    expect(root.querySelector(".difficulty-loot-note")?.textContent).toContain("章节首领首次通关至少 1 条");
    root.querySelector<HTMLButtonElement>('[data-action="stage-confirm"]')?.click();

    expect(store.getState().save.selectedDifficulty).toBe("torment");
    expect(onStageSelected).toHaveBeenCalledWith(1, "torment");
  });

  it("opens the chapter gift entry and claims each cleared stage reward", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 3;
    save.highestClearedStage = 2;
    save.claimedStageGiftStages = [1];
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    const entry = root.querySelector<HTMLButtonElement>('[data-action="chapter-gifts"]');
    expect(entry?.textContent).toContain("1");
    entry?.click();

    expect(root.querySelector(".chapter-gifts-modal")?.textContent).toContain("第一章关卡礼包");
    expect(root.querySelector(".stage-gift-card")?.textContent).toContain("新芽小径");
    expect(root.querySelector(".stage-gift-reward-list img")).not.toBeNull();
    expect(root.querySelector(".chapter-gifts-actions")).toBeNull();
    expect(root.querySelectorAll('[data-action="stage-gift-claim"]')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-action="stage-gift-claim"]')?.click();

    expect(store.getState().save.claimedStageGiftStages).toEqual([1, 2]);
    expect(store.getState().save.gems).toBe(320);
    expect(root.querySelectorAll('[data-action="stage-gift-claim"]')).toHaveLength(0);
    root.querySelector<HTMLElement>(".modal-backdrop")?.click();
    expect(root.querySelector(".chapter-gifts-modal")).toBeNull();
  });

  it("shows the selected locked chapter without listing later chapters", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.highestUnlockedStage = 12;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    expect(root.querySelectorAll(".stage-node")).toHaveLength(12);
    root.querySelector<HTMLButtonElement>('[data-action="stages-chapter-next"]')?.click();
    expect(root.querySelectorAll(".stage-node")).toHaveLength(0);
    expect(root.querySelectorAll(".chapter-locked-card")).toHaveLength(1);
    expect(root.querySelector(".chapter-locked-card")?.textContent).toContain("通关 1-12 解锁");
    expect(root.querySelectorAll(".chapter-atmosphere")).toHaveLength(1);
    expect(root.querySelector(".chapter-switch-title")?.textContent).toContain("霜风谷");
  });

  it("switches stages panel between mainline and dungeon tabs", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    expect(root.querySelector(".stages-panel-tabs")).not.toBeNull();
    expect(root.querySelectorAll(".stage-node")).toHaveLength(12);
    root.querySelector<HTMLButtonElement>('[data-action="stages-panel-tab"][data-tab="dungeon"]')?.click();
    expect(root.querySelector(".dungeon-daily-tip")).toBeNull();
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("已解锁");
    expect(root.querySelector(".dungeon-section-head")).toBeNull();
    expect(root.querySelectorAll(".dungeon-card")).toHaveLength(3);
    expect(root.querySelector(".dungeon-daily-badge")).toBeNull();
    const expeditionCards = root.querySelectorAll<HTMLButtonElement>('[data-action="dungeon-select"]');
    expect(expeditionCards[0]?.querySelector(".expedition-requirements")).toBeNull();
    expect(expeditionCards[0]?.querySelector(".expedition-heading em")).toBeNull();
    expect(expeditionCards[0]?.querySelector(".expedition-heading > .expedition-meta")).not.toBeNull();
    expect(expeditionCards[0]?.querySelector(".expedition-card-main > .expedition-meta")).toBeNull();
    expect(expeditionCards[0]?.closest(".dungeon-card")?.textContent).not.toContain("派遣");
    expect(expeditionCards[0]?.closest(".dungeon-card")?.textContent).not.toContain("事件消耗");
    expect(root.querySelectorAll(".expedition-requirements")).toHaveLength(2);
    expect(root.querySelectorAll(".dungeon-card.has-requirements")).toHaveLength(2);
    const dropIcon = root.querySelector<HTMLButtonElement>('.expedition-drops [data-action="dispatch-reward-tips"]');
    expect(dropIcon).not.toBeNull();
    expect(dropIcon?.querySelector("img")).not.toBeNull();
    expect(dropIcon?.querySelector("b")).toBeNull();
    expect(dropIcon?.querySelector("small")).toBeNull();
    const dropPopoverId = dropIcon?.getAttribute("aria-controls");
    const dropPopover = dropPopoverId ? root.querySelector<HTMLElement>(`#${dropPopoverId}`) : null;
    expect(dropPopover?.hidden).toBe(true);
    dropIcon?.click();
    expect(dropIcon?.getAttribute("aria-expanded")).toBe("true");
    expect(dropPopover?.hidden).toBe(false);
    expect(dropPopover?.textContent).toContain("预计掉落");
    expeditionCards[1]?.click();
    expect(dropPopover?.hidden).toBe(true);
    expect(root.querySelector(".dispatch-requirement-list")).not.toBeNull();
    expect(root.querySelector(".dispatch-requirement.pending")?.textContent).toMatch(/0\/\d+/);
  });

  it("dispatches a fused-stamina expedition and claims after the team returns", () => {
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.highestClearedStage = 120;
    save.shop.dateKey = "2026-08-18";
    save.party = ["H35", null, null, null, null];
    save.roster.H60.unlocked = true;
    save.roster.H03.ascendLevel = 3;
    save.roster.H08.unlocked = true;
    const root = document.createElement("main");
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    root.querySelector<HTMLButtonElement>('[data-action="stages-panel-tab"][data-tab="dungeon"]')?.click();
    const card = root.querySelector<HTMLButtonElement>('[data-action="dungeon-select"]');
    expect(card).not.toBeNull();
    card!.click();
    expect(root.querySelector(".center-sheet.dispatch-modal")).not.toBeNull();
    expect(root.querySelector(".bottom-sheet")).toBeNull();
    const unlockedHeroCount = Object.values(store.getState().save.roster)
      .filter((hero) => hero.unlocked).length;
    expect(root.querySelectorAll(".dispatch-picker .hero-card")).toHaveLength(unlockedHeroCount);
    expect(root.querySelector(".dispatch-picker .hero-card.locked")).toBeNull();
    expect(root.querySelector('.dispatch-picker [data-hero-id="H09"]')).toBeNull();
    expect(root.querySelector('.dispatch-picker [data-hero-id="H35"]')?.hasAttribute("disabled")).toBe(true);
    expect(root.querySelector('.dispatch-picker [data-hero-id="H35"]')?.textContent).toContain("主线中");
    expect(root.querySelector('[data-action="dispatch-pick"][data-hero-id="H35"]')).toBeNull();
    expect(root.querySelector('.dispatch-picker .hero-ascend-rank-seal[data-level="3"]')).not.toBeNull();
    expect(root.querySelector(".dispatch-picker .hero-ascend-crest")).toBeNull();
    expect(root.querySelector(".dispatch-picker")?.textContent).toContain("进阶3");
    expect(root.querySelector(".dispatch-picker")).not.toBeNull();
    expect(root.querySelector(".dispatch-footer [data-expedition-stamina]")).toBeNull();
    expect(root.querySelector(".dispatch-summary [data-expedition-stamina]")).not.toBeNull();
    expect(root.querySelector('[data-action="dispatch-auto-select"]')).not.toBeNull();
    expect(root.querySelector(".dispatch-summary")?.textContent).toContain("事件体力");
    expect(root.querySelector(".dispatch-summary")?.textContent).toContain("战斗消耗较高");
    expect(root.querySelector(".dispatch-summary")?.textContent).not.toContain("触发时扣");
    expect(root.querySelector(".dispatch-summary")?.textContent).not.toContain("单次消耗");
    expect(root.querySelector(".dispatch-footer")?.textContent).not.toContain("融合体力");
    const rewardIcon = root.querySelector<HTMLButtonElement>('.dispatch-modal [data-action="dispatch-reward-tips"]');
    expect(rewardIcon).not.toBeNull();
    expect(root.querySelector(".expedition-summary-drops b")).toBeNull();
    expect(root.querySelector<HTMLElement>(".dispatch-modal .dispatch-reward-popover")?.hidden).toBe(true);
    rewardIcon!.click();
    expect(rewardIcon!.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector<HTMLElement>(".dispatch-modal .dispatch-reward-popover")?.hidden).toBe(false);
    expect(root.querySelector(".dispatch-modal .dispatch-reward-popover")?.textContent).toContain("预计获得");
    root.querySelector<HTMLElement>(".dispatch-picker-heading")?.click();
    expect(root.querySelector<HTMLElement>(".dispatch-modal .dispatch-reward-popover")?.hidden).toBe(true);
    const dungeonId = card!.dataset.dungeonId as DungeonId;
    const size = DUNGEON_BY_ID[dungeonId].partySize;
    const modal = root.querySelector(".dispatch-modal");
    const firstHero = root.querySelector<HTMLButtonElement>('[data-action="dispatch-pick"]');
    expect(firstHero).not.toBeNull();
    firstHero!.click();
    expect(firstHero!.classList.contains("selected")).toBe(true);
    expect(root.querySelector(".dispatch-modal")).toBe(modal);
    firstHero!.click();
    expect(firstHero!.classList.contains("selected")).toBe(false);
    root.querySelector<HTMLButtonElement>('[data-action="dispatch-auto-select"]')?.click();
    expect(root.querySelectorAll(".dispatch-picker .hero-card.selected")).toHaveLength(size);
    expect(root.querySelector('.dispatch-picker [data-hero-id="H35"].selected')).toBeNull();
    expect(Number(root.querySelector("[data-expedition-stamina]")?.textContent)).toBeGreaterThan(0);
    expect(root.querySelector("[data-expedition-capacity]")?.textContent).toContain("约可探索");
    expect(root.querySelector("[data-expedition-capacity]")?.textContent).toContain("小时");
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-dispatch"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    expect(store.getState().save.dungeonRuns[0]?.maxStamina).toBeGreaterThan(0);
    const progressButton = root.querySelector<HTMLButtonElement>('[data-action="dungeon-progress"]');
    expect(progressButton).not.toBeNull();
    expect(progressButton?.disabled).toBe(false);
    const runningCard = progressButton?.closest(".dungeon-card");
    expect(runningCard?.querySelector(".expedition-card-progress")).not.toBeNull();
    expect(runningCard?.querySelector('.expedition-card-progress [role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
    expect(runningCard?.querySelector(".expedition-card-progress")?.textContent).toContain("100%");
    expect(runningCard?.querySelector(".expedition-run-summary")).toBeNull();
    expect(runningCard?.querySelector(".expedition-drops")).toBeNull();
    expect(runningCard?.querySelector(".expedition-party")).toBeNull();
    expect(runningCard?.textContent).toContain("收获");
    expect(runningCard?.textContent).toContain("体力 ");
    expect(root.querySelector(".stage-chip.dungeon")?.textContent).toContain("远征中");
    store.getState().save.dungeonRuns[0]!.startedAt = Date.now() - getExpeditionEventIntervalMs() * 2;
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-progress"]')?.click();
    expect(root.querySelector(".expedition-detail-modal")).not.toBeNull();
    expect(root.querySelector(".expedition-detail-summary")?.textContent).toContain("队伍体力");
    expect(root.querySelector(".expedition-detail-summary")?.textContent).toContain("经历事件");
    expect(root.querySelector(".expedition-detail-summary")?.textContent).not.toContain("探索进度");
    expect(root.querySelector("[data-expedition-detail-next]")).toBeNull();
    expect(root.querySelector(".expedition-detail-summary")?.textContent).not.toContain("下一次探索记录");
    expect(root.querySelector(".expedition-detail-party")).toBeNull();
    expect(root.querySelector(".expedition-detail-summary-rewards")?.textContent).toContain("已获奖励");
    expect(root.querySelectorAll(".expedition-event-row.reward").length).toBeGreaterThan(0);
    expect(root.querySelector(".expedition-event-row time")).toBeNull();
    const rewardEvent = root.querySelector(".expedition-event-row.reward");
    expect(rewardEvent?.querySelector("p")?.textContent?.length).toBeGreaterThan(20);
    expect(rewardEvent?.querySelectorAll(".expedition-detail-reward-icon")).toHaveLength(1);
    const expeditionLog = root.querySelector(".expedition-detail-log")?.textContent ?? "";
    const expeditionLeaderId = store.getState().save.dungeonRuns[0]!.heroIds[0]!;
    expect(expeditionLog).toContain("营火熄灭之前");
    expect(expeditionLog).toContain(HERO_BY_ID[expeditionLeaderId].name);
    expect(expeditionLog).toContain("我们");
    root.querySelector<HTMLButtonElement>('.expedition-detail-modal [data-action="close-modal"]')?.click();
    store.getState().save.dungeonRuns[0]!.startedAt = Date.now() - 24 * 60 * 60_000;
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    const readyCard = root.querySelector('[data-action="dungeon-progress"]');
    const readyEntry = readyCard?.closest(".dungeon-card");
    expect(readyEntry?.textContent).toContain("已返程");
    expect(readyEntry?.textContent).toContain("收获");
    expect(readyEntry?.textContent).not.toContain("体力");
    expect(readyCard?.querySelector(".expedition-ready-dot")).not.toBeNull();
    expect(readyEntry?.querySelector(".expedition-drops")).toBeNull();
    expect(readyEntry?.querySelector(".dispatch-reward-icon")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-progress"]')?.click();
    expect(root.querySelector(".expedition-detail-modal.returned")).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.expedition-detail-modal [data-action="dungeon-claim"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(root.querySelector(".expedition-ready-dot")).toBeNull();
  });

  it("keeps a completed expedition visible and claimable after the daily rotation changes", () => {
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.highestClearedStage = 120;
    save.highestUnlockedStage = 120;
    save.shop.dateKey = "2026-08-19";
    const currentDailyIds = getDailyDungeonIds(save.shop.dateKey);
    const previousDungeon = DUNGEON_DEFINITIONS.find((dungeon) => !currentDailyIds.includes(dungeon.id))!;
    save.dungeonRuns = [{
      dungeonId: previousDungeon.id,
      heroIds: ["H02", "H03"],
      startedAt: Date.now() - 24 * 60 * 60_000,
      maxStamina: 200,
    }];
    const root = document.createElement("main");
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    root.querySelector<HTMLButtonElement>('[data-action="stages-panel-tab"][data-tab="dungeon"]')?.click();

    expect(root.querySelectorAll(".dungeon-card")).toHaveLength(DAILY_DUNGEON_COUNT + 1);
    const carriedCard = root.querySelector<HTMLButtonElement>(`[data-action="dungeon-progress"][data-dungeon-id="${previousDungeon.id}"]`);
    expect(carriedCard).not.toBeNull();
    expect(carriedCard?.closest(".dungeon-card")?.textContent).toContain("已返程");
    expect(carriedCard?.closest(".dungeon-card")?.textContent).not.toContain("体力");
    expect(root.querySelector(".stage-chip.dungeon")?.textContent).toContain("可领取");

    carriedCard!.click();
    expect(root.querySelector(".expedition-detail-modal.returned")).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.expedition-detail-modal [data-action="dungeon-claim"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(root.querySelectorAll(".dungeon-card")).toHaveLength(DAILY_DUNGEON_COUNT);
  });

  it("recalls a running expedition after inline confirmation and settles earned rewards", () => {
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.highestClearedStage = 120;
    save.highestUnlockedStage = 120;
    save.dungeonRuns = [{
      dungeonId: "D01",
      heroIds: ["H02", "H03"],
      startedAt: Date.now() - 20 * 60_000,
      maxStamina: 1_000,
    }];
    const rewardTotalBefore = save.gold + save.exp
      + Object.values(save.materials).reduce((sum, amount) => sum + amount, 0);
    const root = document.createElement("main");
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    root.querySelector<HTMLButtonElement>('[data-action="stages-panel-tab"][data-tab="dungeon"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-progress"][data-dungeon-id="D01"]')?.click();
    expect(root.querySelector('[data-action="dungeon-recall-request"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="dungeon-recall-request"]')?.click();
    expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(root.querySelector(".expedition-recall-confirm")?.textContent).toContain("结算已获奖励");
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-recall-cancel"]')?.click();
    expect(root.querySelector('[data-action="dungeon-recall-request"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="dungeon-recall-request"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-recall"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
    expect(root.querySelector(".expedition-detail-modal")).toBeNull();
    const recalledSave = store.getState().save;
    const rewardTotalAfter = recalledSave.gold + recalledSave.exp
      + Object.values(recalledSave.materials).reduce((sum, amount) => sum + amount, 0);
    expect(rewardTotalAfter).toBeGreaterThan(rewardTotalBefore);
  });

  it("lets the player select three ranked gems before fusing", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.materials.gem_atk = 4;
    const store = new GameStore(save);
    new AppShell(root, store, {});

    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="fusion"]')?.click();

    expect(root.querySelectorAll(".gem-group-tab")).toHaveLength(3);
    expect(root.querySelector(".gem-fusion-board-heading")?.textContent).toContain("选择材料");
    expect(root.querySelector(".gem-fusion-list-header")).toBeNull();
    expect(root.querySelectorAll(".gem-material-option")).toHaveLength(1);
    expect(root.querySelector('.gem-material-option[data-gem-id="gem_atk"]')).not.toBeNull();

    for (let index = 0; index < 3; index += 1) {
      root.querySelector<HTMLButtonElement>('[data-action="gem-fusion-material-add"][data-gem-id="gem_atk"]')?.click();
    }
    expect(root.querySelectorAll(".gem-fusion-slot.filled")).toHaveLength(3);
    expect(root.querySelector(".gem-fusion-result")?.textContent).toContain("攻击宝石·2级");

    root.querySelector<HTMLButtonElement>('[data-action="craft-fuse-selected-gems"]')?.click();
    expect(store.getState().save.materials.gem_atk).toBe(1);
    expect(store.getState().save.materials.gem_atk_2).toBe(1);
    expect(root.querySelectorAll(".gem-fusion-slot.filled")).toHaveLength(0);
    expect(root.querySelector(".toast-stack")?.textContent).toContain("合成成功 · 攻击宝石·2级");

    root.querySelector<HTMLButtonElement>('[data-action="gem-fusion-group"][data-gem-group="defense"]')?.click();
    expect(root.querySelectorAll(".gem-material-option")).toHaveLength(2);
    expect(root.querySelector('.gem-material-option[data-gem-id="gem_hp"]')).not.toBeNull();
    expect(root.querySelector('.gem-material-option[data-gem-id="gem_def"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="craft-fuse-all-gems"]')?.click();
    expect(store.getState().save.materials.gem_hp_2).toBe(1);
    expect(store.getState().save.materials.gem_def_2).toBe(1);
    expect(store.getState().save.materials.gem_crit_2).toBe(1);
    expect(root.querySelector(".toast-stack")?.textContent).toContain("全部一键合成 3 次 · 3 类宝石");
  });

  it("asks about gems after replacing gear and keeps close as the safe choice", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    const oldItem = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(801));
    const newItem = createEquipment("weapon_oak_staff", 1, "rare", new SeededRandom(802));
    oldItem.sockets = [{ gemId: "gem_atk_2" }];
    save.materials.gem_atk_2 = 0;
    save.inventory = [oldItem, newItem];
    save.roster.H35.equipment.main_weapon = oldItem.instanceId;
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>(`[data-item-id="${newItem.instanceId}"]`)?.click();
    root.querySelector<HTMLButtonElement>('[data-action="item-open-equip"]')?.click();
    root.querySelector<HTMLButtonElement>(`.equip-candidate-grid [data-item-id="${newItem.instanceId}"]`)?.click();
    root.querySelector<HTMLButtonElement>('.equip-tips-layer [data-action="equip-item"]')?.click();

    expect(store.getState().save.roster.H35.equipment.main_weapon).toBe(newItem.instanceId);
    expect(root.querySelector(".gem-return-modal")?.textContent).toMatch(/旧装备仍镶有宝石.*新装备不会自动继承/s);
    root.querySelector<HTMLButtonElement>('[data-action="close-gem-return"]')?.click();
    expect(root.querySelector(".character-equip-modal")).not.toBeNull();
    expect(oldItem.sockets).toEqual([{ gemId: "gem_atk_2" }]);

    store.dispatch({ type: "item:equip", heroId: "H35", itemId: oldItem.instanceId });
    root.querySelector<HTMLButtonElement>(`.equip-candidate-grid [data-item-id="${newItem.instanceId}"]`)?.click();
    root.querySelector<HTMLButtonElement>('.equip-tips-layer [data-action="equip-item"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="equip-gems-remove"]')?.click();

    expect(oldItem.sockets).toEqual([{ gemId: null }]);
    expect(store.getState().save.materials.gem_atk_2).toBe(1);
    expect(root.querySelector(".character-equip-modal")).not.toBeNull();
    expect(root.querySelector(".toast-stack")?.textContent).toContain("宝石已卸下并返还 ×1");
  });

  it("presents a completion state after the final chapter boss", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});
    shell.presentBattleEvents([{ type: "battle:victory", stage: 120 }]);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain("远征通关");
  });
});
