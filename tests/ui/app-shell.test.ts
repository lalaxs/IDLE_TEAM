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

  it("toggles cube selection from the list and shows info-only tips", () => {
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
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-toggle"]')?.click();
    const tipsHost = root.querySelector(".alchemy-tips-host");
    expect(tipsHost?.querySelector(".alchemy-tips-layer")).not.toBeNull();
    expect(root.querySelector(".content-panel .alchemy-tips-layer")).toBeNull();
    expect(tipsHost?.querySelector(".alchemy-tips strong")?.textContent).toMatch(/守望/);
    expect(tipsHost?.querySelector('[data-action="alchemy-tips-put"]')).toBeNull();
    expect(tipsHost?.querySelector('[data-action="alchemy-tips-close"]')).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-toggle"]')?.click();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(0);
  });

  it("closes alchemy tips when clicking blank space", () => {
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
    root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-toggle"]')?.click();
    expect(root.querySelector(".alchemy-tips-host .alchemy-tips")).not.toBeNull();
    root.querySelector(".content-panel")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(root.querySelector(".alchemy-tips-host .alchemy-tips")).toBeNull();
    expect(root.querySelectorAll(".alchemy-cell.filled")).toHaveLength(1);
  });

  it("renders buttons with mobile-sized semantic targets", () => {
    const root = document.createElement("main");
    new AppShell(root, new GameStore(createDefaultSave()), {});
    expect(root.querySelectorAll("button[aria-label], button .nav-label").length).toBeGreaterThan(4);
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
    expect(dialog?.querySelector<HTMLButtonElement>('[data-item-id="scrap-one"]')?.disabled).toBe(true);
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
    expect(dialog?.querySelector(".character-equip-header h2")?.textContent).toBe("更换装备");
    expect(dialog?.querySelector(".character-equip-header .modal-close")).not.toBeNull();
    expect(dialog?.querySelector(".equip-party-strip")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-party-strip .nameplate")).toHaveLength(5);
    expect(dialog?.textContent).toContain("洛恩");
    expect(dialog?.querySelectorAll(".equip-slot")).toHaveLength(10);
    expect(dialog?.querySelector(".character-loadout-col.gear")).not.toBeNull();
    expect(dialog?.querySelector(".character-loadout-col.accessories")).not.toBeNull();
    expect(dialog?.querySelector<HTMLImageElement>(".character-portrait-art")?.getAttribute("src")).toBe(
      "/assets/characters/hero-h01.webp",
    );
    expect(dialog?.querySelectorAll(".equip-compare-card")).toHaveLength(2);
    const compareCards = [...dialog!.querySelectorAll(".equip-compare-card")].map((node) =>
      node.classList.contains("current") ? "current" : "selected",
    );
    expect(compareCards).toEqual(["current", "selected"]);
    expect(dialog?.textContent).toContain("当前装备");
    expect(dialog?.textContent).toContain("所选装备");
    expect(
      dialog?.querySelector<HTMLImageElement>(".equip-compare-card.selected .equipment-art")?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_guard_blade.webp");

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
    expect(
      dialog?.querySelector<HTMLImageElement>(".equip-compare-card.selected .equipment-art")?.getAttribute("src"),
    ).toBe("/assets/equipment/weapon_oak_staff.webp");
    expect(dialog?.querySelector('[data-item-id="gear-alt"]')?.classList.contains("selected")).toBe(true);

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="armor"]')?.click();
    expect(dialog?.querySelector(".equip-candidate-label")?.textContent).toContain("护甲");
    expect(dialog?.querySelectorAll(".equip-candidate-grid .item-card")).toHaveLength(1);
    expect(
      dialog?.querySelector<HTMLImageElement>(".equip-compare-card.selected .equipment-art")?.getAttribute("src"),
    ).toBe("/assets/equipment/armor_scale_vest.webp");

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]')?.click();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    expect(root.querySelector(".character-equip-modal")).toBe(dialog);
    expect(root.querySelector(".equip-modal")?.textContent).toContain("布兰");

    root.querySelector<HTMLButtonElement>('[data-action="equip-item"]')?.click();
    expect(store.getState().save.roster.H02.equipment.main_weapon).toBe("gear-test");
    expect(root.querySelector(".character-equip-modal")).toBe(dialog);
    expect(root.querySelector('[data-action="unequip-item"]')?.textContent).toBe("卸下");

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H01"]')?.click();
    const locked = dialog?.querySelector<HTMLButtonElement>('[data-item-id="gear-test"]');
    expect(locked?.classList.contains("owned-elsewhere")).toBe(true);
    expect(locked?.disabled).toBe(true);
    expect(locked?.textContent).toContain("布兰");
    expect(locked?.textContent).not.toContain("已装备");
    expect(dialog?.querySelector('[data-item-id="gear-test"].selected')).toBeNull();

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H02"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="equip-slot-focus"][data-slot="main_weapon"]')?.click();
    expect(root.querySelector('[data-action="unequip-item"]')?.textContent).toBe("卸下");
    root.querySelector<HTMLButtonElement>('[data-action="unequip-item"]')?.click();
    expect(store.getState().save.roster.H02.equipment.main_weapon).toBeNull();
    expect(root.querySelector('[data-action="equip-item"]')?.textContent).toContain("装备到");
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

  it("shows the newly unlocked hero on the summon result card", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="summon-open"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="summon-single"]')?.click();
    expect(root.querySelector(".summon-result")?.textContent).toContain("塞拉");
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
