// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave } from "../../src/persistence/schema";
import { AppShell } from "../../src/ui/AppShell";
import type { BattleSnapshot } from "../../src/simulation/types";

const snapshot: BattleSnapshot = {
  stage: 1,
  wave: 1,
  state: "advancing",
  elapsedMs: 0,
  progress: 0,
  seed: 1,
  units: [],
  bossActive: false,
};

describe("AppShell", () => {
  it("keeps the approved topbar, battlefield, nameplates, panel, and nav hierarchy", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});
    shell.renderBattle(snapshot);
    expect([...root.querySelectorAll(".game-shell > :not(.overlay-layer)")].map((node) => node.className)).toEqual([
      "topbar",
      "battle-frame",
      "party-strip",
      "alchemy-tips-host",
      "content-panel",
      "bottom-nav",
    ]);
    expect(root.querySelectorAll(".bottom-nav button")).toHaveLength(5);
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

  it("opens alchemy cube page from the middle nav tab", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    const tabs = [...root.querySelectorAll<HTMLButtonElement>(".bottom-nav button")].map(
      (button) => button.dataset.tab,
    );
    expect(tabs).toEqual(["inventory", "shop", "alchemy", "heroes", "stages"]);
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
    expect(root.querySelector(".alchemy-cube")?.children).toHaveLength(9);
    expect(root.querySelector(".alchemy-guide")?.textContent).toMatch(/同品质/);
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

  it("opens backpack-style tips with salvage and put actions", () => {
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
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-detail"]')?.click();
    const tips = root.querySelector<HTMLElement>(".item-tips-modal");
    expect(tips).not.toBeNull();
    expect(root.querySelector(".alchemy-tips-host .alchemy-tips")).toBeNull();
    expect(tips?.querySelector(".item-detail-name")?.textContent).toMatch(/守望/);
    expect(tips?.querySelector('[data-action="item-salvage"]')).not.toBeNull();
    expect(tips?.querySelector('[data-action="alchemy-item-put"]')?.textContent?.trim()).toBe("放入");
    expect(tips?.querySelector('[data-action="item-open-equip"]')).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(0);

    tips?.querySelector<HTMLButtonElement>('[data-action="alchemy-item-put"]')?.click();
    expect(root.querySelector(".item-tips-modal")).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(1);

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-detail"]')?.click();
    expect(root.querySelector('[data-action="alchemy-item-remove"]')?.textContent?.trim()).toBe("取出");
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-remove"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(0);
  });

  it("closes alchemy item tips via the modal close control", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.inventory.push({
      instanceId: "alchemy-tip-close",
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
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-item-detail"]')?.click();
    expect(root.querySelector(".item-tips-modal")).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.item-tips-modal [data-action="close-modal"]')?.click();
    expect(root.querySelector(".item-tips-modal")).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(0);
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

    expect(root.querySelector('[data-panel="inventory"]')?.textContent).toContain("1/40");
    expect(root.querySelector('[data-item-id="bag-item"]')).not.toBeNull();
    expect(root.querySelector('[data-item-id="worn-item"]')).toBeNull();
  });

  it("renders compact inventory toolbar with capacity, organize, and filter", () => {
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
    expect(heading?.textContent).toContain("2/40");
    expect(heading?.textContent).not.toContain("战利品仓库");
    expect(heading?.querySelector('[data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(heading?.querySelector('[data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(heading?.querySelector('[data-action="inventory-filter"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="inventory-organize"]')?.click();
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId)).toEqual([
      "gear-high",
      "gear-low",
    ]);
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

    dialog?.querySelector<HTMLButtonElement>('[data-action="salvage-confirm"]')?.click();
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId).sort()).toEqual([
      "keep-rare",
      "scrap-one",
    ]);
    expect(store.getState().save.gold).toBeGreaterThan(0);
    expect(root.querySelector(".salvage-modal")).toBeNull();
  });

  it("opens item tips first, then equip flow with candidate list and side-by-side compare", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
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
        stats: { maxHp: 40, defense: 4 },
        affixes: [],
        traitId: null,
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});

    const card = root.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]');
    expect(card?.querySelector("strong")).toBeNull();
    expect(card?.querySelector("small")).toBeNull();
    expect(card?.querySelector<HTMLImageElement>(".equipment-art")?.getAttribute("src")).toBe(
      "/assets/equipment/weapon_guard_blade.webp",
    );

    card?.click();
    const tips = root.querySelector<HTMLElement>(".item-tips-modal");
    expect(tips).not.toBeNull();
    expect(root.querySelector(".character-equip-modal")).toBeNull();
    expect(tips?.querySelector<HTMLImageElement>(".detail-icon .equipment-art")?.getAttribute("src")).toBe(
      "/assets/equipment/weapon_guard_blade.webp",
    );
    expect(tips?.textContent).toContain("守望短刃");
    expect(tips?.textContent).toContain("攻击 +12");
    expect(tips?.querySelector('[data-action="item-salvage"]')).not.toBeNull();
    expect(tips?.querySelector('[data-action="item-open-equip"]')).not.toBeNull();

    tips?.querySelector<HTMLButtonElement>('[data-action="item-open-equip"]')?.click();
    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    expect(root.querySelector(".item-tips-modal")).toBeNull();
    expect(dialog?.querySelector(".character-equip-header h2")?.textContent).toBe("英雄属性");
    expect(dialog?.querySelector(".character-equip-header .modal-close")).not.toBeNull();
    expect(dialog?.querySelector(".equip-party-strip")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-party-strip .nameplate")).toHaveLength(5);
    expect(dialog?.querySelectorAll(".equip-panel-tab")).toHaveLength(2);
    expect(dialog?.querySelector('.equip-panel-tab[data-tab="gear"]')?.classList.contains("active")).toBe(true);
    expect(dialog?.textContent).toContain("洛恩");
    expect(dialog?.querySelectorAll(".equip-slot")).toHaveLength(10);
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

    expect(dialog?.querySelector(".equip-candidate-grid")?.getAttribute("data-drag-scroll-bound")).toBe("1");
    expect(dialog?.getAttribute("data-drag-scroll-bound")).toBeNull();

    const candidates = dialog!.querySelectorAll(".equip-candidate-grid .item-card");
    expect(candidates).toHaveLength(2);
    expect(
      dialog
        ?.querySelector<HTMLImageElement>('.equip-candidate-grid [data-item-id="gear-alt"] .equipment-art')
        ?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");

    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-alt"]')?.click();
    expect(dialog?.querySelector(".equip-tips-layer")).not.toBeNull();
    expect(dialog?.querySelector(".equip-tips-panel.compare")).not.toBeNull();
    const compareLabels = [...(dialog?.querySelectorAll(".equip-tips-layer .compare-label") ?? [])].map(
      (node) => node.textContent,
    );
    expect(compareLabels).toEqual(["已装备", "未装备"]);
    expect(dialog?.querySelector(".equip-tips-layer .equip-compare-card.current")?.textContent).toContain("该槽位暂无装备");
    expect(
      dialog?.querySelector<HTMLImageElement>(".equip-tips-layer .equip-compare-card.selected .equipment-art")?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");
    expect(dialog?.querySelector('[data-item-id="gear-alt"]')?.classList.contains("selected")).toBe(true);

    dialog?.querySelector<HTMLButtonElement>('[data-action="close-equip-tips"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="armor"]')?.click();
    expect(dialog?.querySelector(".equip-candidate-label")?.textContent).toContain("护甲");
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]')?.click();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(root.querySelector(".character-equip-modal")).toBe(dialog);
    expect(root.querySelector(".equip-modal")?.textContent).toContain("布兰");
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
    root.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    expect(dialog?.querySelector(".equip-slot-tips")).not.toBeNull();
    expect(dialog?.querySelector(".equip-tips-layer")).toBeNull();
    expect(dialog?.querySelector(".equip-candidate-label")?.textContent).toContain("主武器");
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(root.querySelector('.equip-slot-tips [data-action="unequip-item"]')?.textContent).toBe("卸下");
    expect(dialog?.querySelector(".equip-slot-tips .item-detail-sheet")).not.toBeNull();
    expect(dialog?.querySelector(".equip-slot-tips .item-detail-name")).not.toBeNull();
    expect(dialog?.querySelector('.equip-slot-tips [aria-label="固定属性"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('.equip-slot-tips [data-action="unequip-item"]')?.click();
    expect(store.getState().save.roster.H02.equipment.main_weapon).toBeNull();
    expect(dialog?.querySelector(".equip-slot-tips")).toBeNull();
    expect(dialog?.querySelector('[data-item-id="gear-test"]')).not.toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-panel-tab"][data-tab="stats"]')?.click();
    expect(dialog?.querySelector('.equip-panel-tab[data-tab="stats"]')?.classList.contains("active")).toBe(true);
    expect(dialog?.querySelector(".character-portrait-art")).not.toBeNull();
    expect(dialog?.querySelector(".equip-slot-grid.gear")?.hasAttribute("hidden")).toBe(true);
    expect(dialog?.querySelector(".equip-candidate-section")?.hasAttribute("hidden")).toBe(true);
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("生命");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("攻击");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("伤害类型");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("冷却缩减");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("冷却缩减");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("技能冷却");
    const leftLabels = [...(dialog?.querySelectorAll(".equip-stats-col.left .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(leftLabels[0]).toBe("生命");
    expect(leftLabels[1]).toBe("攻击");
    expect(leftLabels[2]).toBe("防御");
    expect(leftLabels.at(-1)).toBe("伤害类型");
    const rightLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(rightLabels[0]).toBe("冷却缩减");
    expect(rightLabels[1]).toBe("技能冷却");
    expect(dialog?.querySelector(".equip-skill-list .equip-skill-tile:not(.empty)")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile")).toHaveLength(4);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.empty")).toHaveLength(2);
    expect(dialog?.querySelectorAll(".equip-skill-tile-tag")).toHaveLength(2);
    expect(dialog?.querySelector(".equip-skill-name")?.textContent).toBeTruthy();
    expect(dialog?.querySelector(".equip-level-frame")).not.toBeNull();
    expect(dialog?.querySelector(".equip-level-cost")?.textContent).toMatch(/升级费用|已达上限/);
    expect(dialog?.querySelector('[data-action="hero-level"]')?.textContent).toBe("升级");
    expect(dialog?.querySelector(".equip-star-frame")).not.toBeNull();
    expect(dialog?.querySelector(".equip-fragment-icon")).not.toBeNull();
    expect(dialog?.querySelector(".equip-fragment-meter")).not.toBeNull();
    expect(dialog?.querySelector(".character-portrait-stars")?.textContent).toContain("☆");
    expect(dialog?.querySelector('[data-action="hero-star-up"]')?.textContent).toBe("升星");

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="active"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.skill-tips")).not.toBeNull();
    expect(dialog?.querySelector(".equip-skill-tips-desc")?.textContent).toBeTruthy();
    expect(dialog?.querySelector(".equip-skill-tips-cd")?.textContent).toContain("冷却");
  });

  it("does not keep a selected style on backpack item cards", () => {
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
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    expect(root.querySelector(".item-grid .item-card.selected")).toBeNull();
  });

  it("salvages an item from the tips modal and awards gold", () => {
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
      },
    ];
    const store = new GameStore(save);
    new AppShell(root, store, {});

    root.querySelector<HTMLButtonElement>(".item-card")?.click();
    root.querySelector<HTMLButtonElement>('[data-action="item-salvage"]')?.click();
    expect(store.getState().save.inventory).toHaveLength(0);
    expect(store.getState().save.gold).toBeGreaterThan(0);
    expect(root.querySelector(".item-tips-modal")).toBeNull();
  });

  it("renders heroes as cards with portrait, role, level, and stars", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    const cards = root.querySelectorAll(".hero-card");
    expect(cards).toHaveLength(8);
    const first = cards[0]!;
    expect(first.querySelector(".hero-card-art img")?.getAttribute("src")).toBe(
      "/assets/characters/hero-h01.webp",
    );
    expect(first.querySelector(".hero-card-name")?.textContent).toBe("洛恩");
    expect(first.querySelector(".hero-card-role")?.textContent).toBe("盾卫");
    expect(first.querySelector(".hero-card-level")?.textContent).toMatch(/^Lv\./);
    expect(first.querySelector(".hero-card-stars")?.textContent).toMatch(/[★☆]{5}/);
    expect(root.querySelector(".content-panel .hero-detail")).toBeNull();
  });

  it("opens equip stats from hero card with level-up frame under skills", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gold = 500;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });

    const beforeLevel = store.getState().save.roster.H01.level;
    const beforeGold = store.getState().save.gold;
    root.querySelector<HTMLButtonElement>('.hero-card[data-hero-id="H01"]')?.click();

    const equip = root.querySelector(".character-equip-modal");
    expect(equip).not.toBeNull();
    expect(equip?.querySelector('.equip-panel-tab[data-tab="stats"]')?.classList.contains("active")).toBe(true);
    expect(equip?.querySelector(".character-portrait-meta strong")?.textContent).toBe("洛恩");
    expect(equip?.querySelector(".equip-skill-list")).not.toBeNull();
    expect(equip?.querySelector(".equip-level-frame")).not.toBeNull();
    expect(equip?.querySelector(".equip-level-cost")?.textContent).toMatch(/升级费用/);
    expect(equip?.querySelector('[data-action="hero-level"]')?.textContent).toBe("升级");
    expect(equip?.querySelector(".equip-star-frame")).not.toBeNull();

    equip?.querySelector<HTMLButtonElement>('[data-action="hero-level"]')?.click();
    expect(store.getState().save.roster.H01.level).toBe(beforeLevel + 1);
    expect(store.getState().save.gold).toBeLessThan(beforeGold);
    expect(root.querySelector(".equip-level-cost")?.textContent).toMatch(/升级费用/);
  });

  it("shows the newly unlocked hero on the summon result card", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="summon-open"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-single"]')?.click();
    expect(root.querySelectorAll(".summon-result")).toHaveLength(1);
    expect(root.querySelector(".summon-result")?.textContent).toContain("塞拉");
    expect(root.querySelector(".summon-result")?.textContent).toContain("新英雄");
    expect(root.querySelector(".summon-modal")?.getAttribute("data-action")).toBe("close-modal");
    root.querySelector<HTMLElement>(".summon-dismiss-hint")?.click();
    expect(root.querySelector(".summon-modal")).toBeNull();
  });

  it("shows five summon results after a five-pull", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gems = 1000;
    save.roster.H07.unlocked = true;
    save.roster.H08.unlocked = true;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="summon-open"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-five"]')?.click();
    const cards = root.querySelectorAll(".summon-result");
    expect(cards).toHaveLength(5);
    expect(root.querySelector(".summon-result-grid")?.classList.contains("count-5")).toBe(true);
    expect([...cards].every((card) => card.textContent?.includes("印记"))).toBe(true);
  });

  it("renders ten chapters and all one-hundred-twenty stage nodes", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    expect(root.querySelectorAll(".stage-node")).toHaveLength(120);
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("霜风谷");
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("赤沙荒地");
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("雷崖高地");
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("北风关隘");
    expect(root.querySelector('[data-stage="120"]')?.textContent).toContain("10-12");
  });

  it("presents a completion state after the final chapter boss", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});
    shell.presentBattleEvents([{ type: "battle:victory", stage: 120 }]);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain("远征通关");
  });
});
