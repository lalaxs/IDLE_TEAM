// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GameStore } from "../../src/app/GameStore";
import { createDefaultSave } from "../../src/persistence/schema";
import { AppShell } from "../../src/ui/AppShell";
import type { BattleSnapshot } from "../../src/simulation/types";
import { DUNGEON_BY_ID, type DungeonId } from "../../src/content/dungeons";

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

  it("craft modes open equipment/material tips with put actions and square sockets", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
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
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "alchemy" });

    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-toggle"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-mode-select"][data-mode="inlay"]')?.click();
    expect(root.querySelector(".alchemy-list-tabs")).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="craft-item-detail"]')?.click();
    expect(root.querySelector(".item-tips-modal .item-detail-name")).not.toBeNull();
    expect(root.querySelector('[data-action="craft-item-put"]')?.textContent?.trim()).toBe("放入");
    root.querySelector<HTMLButtonElement>('[data-action="craft-item-put"]')?.click();
    expect(root.querySelector(".craft-socket-cell")).not.toBeNull();
    expect(root.querySelector(".craft-socket-chip")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="alchemy-list-tab"][data-tab="materials"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="craft-material-detail"]')?.click();
    expect(root.querySelector(".material-tips-modal")).not.toBeNull();
    expect(root.querySelector('[data-action="craft-material-put"]')?.textContent?.trim()).toBe("放入");
    root.querySelector<HTMLButtonElement>('[data-action="craft-material-put"]')?.click();
    expect(root.querySelector(".craft-material-slot.filled")).not.toBeNull();
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
    expect(heading?.querySelector(".inventory-panel-tabs")).toBeNull();
    expect(root.querySelector(".inventory-side-tabs")).not.toBeNull();
    expect(
      root.querySelector('[data-action="inventory-bag-tab"][data-tab="equipment"]')?.classList.contains("active"),
    ).toBe(true);
    expect(heading?.querySelector('[data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(heading?.querySelector('[data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(heading?.querySelector('[data-action="inventory-filter"]')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="inventory-organize"]')?.click();
    expect(store.getState().save.inventory.map(({ instanceId }) => instanceId)).toEqual([
      "gear-high",
      "gear-low",
    ]);
  });

  it("switches inventory between equipment and materials bags", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.materials.mat_socket_stone = 5;
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
    expect(root.querySelector('[data-item-id="bag-gear"]')).toBeNull();
    expect(root.querySelector('[data-panel="inventory"]')?.textContent).toMatch(/\d+\/\d+/);
    const heading = root.querySelector('[data-panel="inventory"]');
    expect(heading?.querySelector('[data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(heading?.querySelector('[data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(heading?.querySelector<HTMLButtonElement>('[data-action="inventory-salvage-open"]')?.disabled).toBe(true);
    const materialFilter = heading?.querySelector<HTMLSelectElement>('[data-action="inventory-material-filter"]');
    expect([...materialFilter?.options ?? []].map((option) => option.textContent)).toEqual([
      "全部",
      "镶嵌",
      "重置",
      "熔炼",
      "开孔",
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
    expect(root.querySelector(".material-tips-modal")).not.toBeNull();
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-organize"]')?.textContent).toBe("整理");
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-salvage-open"]')?.textContent).toBe("分解");
    expect(root.querySelector('[data-panel="inventory"] [data-action="inventory-material-filter"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
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
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("伤害类型");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).not.toContain("冷却缩减");
    expect(dialog?.querySelector(".hero-damage-identity")?.getAttribute("aria-label")).toContain("伤害类型物理");
    expect(dialog?.querySelector(".hero-damage-chip.school")?.textContent).toBe("物理");
    expect(dialog?.querySelector(".hero-damage-chip.element")?.textContent).toBe("物理");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("冷却缩减");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("技能冷却");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("物理抗性");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("火焰抗性");
    const leftLabels = [...(dialog?.querySelectorAll(".equip-stats-col.left .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(leftLabels[0]).toBe("生命");
    expect(leftLabels[1]).toBe("攻击");
    expect(leftLabels[2]).toBe("防御");
    expect(leftLabels[leftLabels.length - 1]).toBe("移动速度");
    const rightLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(rightLabels[0]).toBe("冷却缩减");
    expect(rightLabels[1]).toBe("技能冷却");
    const pager = dialog?.querySelector(".equip-stats-pager");
    expect(pager).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-stats-page")).toHaveLength(2);
    expect(dialog?.querySelector('[data-action="equip-stats-category"][data-category="generic"]')?.textContent).toBe(
      "通用",
    );
    expect(dialog?.querySelector('[data-action="equip-stats-category"][data-category="elemental"]')?.textContent).toBe(
      "元素",
    );
    expect(dialog?.querySelector(".equip-skill-list .equip-skill-tile:not(.empty)")).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile")).toHaveLength(4);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.empty")).toHaveLength(0);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.locked")).toHaveLength(1);
    expect(dialog?.querySelectorAll(".equip-skill-tile-tag")).toHaveLength(4);
    expect(dialog?.querySelector(".equip-skill-name")?.textContent).toBeTruthy();
    expect(dialog?.querySelector(".equip-level-frame")).not.toBeNull();
    expect(dialog?.querySelector(".equip-level-cost")?.textContent).toMatch(/升级费用|已达上限/);
    expect(dialog?.querySelector('[data-action="hero-level"]')?.textContent).toBe("升级");
    expect(dialog?.querySelector(".equip-star-frame")).not.toBeNull();
    expect(dialog?.querySelector(".equip-fragment-icon")).not.toBeNull();
    expect(dialog?.querySelector(".equip-fragment-meter")).not.toBeNull();
    expect(dialog?.querySelector(".character-portrait-stars")?.textContent).toBe("☆☆☆☆☆");
    expect(dialog?.querySelector(".character-portrait-meta")?.textContent).toMatch(/进阶\d/);
    expect(dialog?.querySelector('[data-action="hero-star-up"]')?.textContent).toBe("升星");
    expect(dialog?.querySelector(".equip-ascend-frame")).not.toBeNull();
    expect(dialog?.querySelector('[data-action="hero-ascend"]')?.textContent).toMatch(/进阶|满阶/);

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-stats-category"][data-category="elemental"]')?.click();
    expect(dialog?.querySelector('.equip-stats-page[data-category="elemental"]')?.classList.contains("active")).toBe(
      true,
    );
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("火焰抗性");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).toContain("冰霜抗性");
    expect(dialog?.querySelector(".equip-stats-col.right")?.textContent).not.toContain("冷却缩减");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("生命");

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="active"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.skill-tips")).not.toBeNull();
    expect(dialog?.querySelector(".equip-tips-panel.skill-tips > .modal-close")).not.toBeNull();
    expect(dialog?.querySelector(".equip-skill-tips-desc")?.textContent).toBeTruthy();
    expect(dialog?.querySelector(".equip-skill-tips-cd")?.textContent).toContain("冷却");
  });

  it("opens the shared talent tree and level-20 skill picker", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.roster.H01.level = 20;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="hero-detail"][data-hero-id="H01"]')?.click();

    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile")).toHaveLength(4);
    expect(dialog?.querySelectorAll(".equip-skill-list .equip-skill-tile.locked")).toHaveLength(0);

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="talent"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.talent-tips")).not.toBeNull();
    expect(dialog?.querySelector(".talent-tree-board")).not.toBeNull();
    expect(dialog?.querySelector(".talent-tree")).not.toBeNull();
    expect(dialog?.querySelectorAll(".talent-tier")).toHaveLength(4);
    expect(dialog?.querySelector('.talent-tier[data-tier="0"] .talent-tier-nodes')?.children).toHaveLength(6);
    expect(dialog?.querySelector('.talent-tier[data-tier="1"] .talent-tier-nodes')?.children).toHaveLength(3);
    expect(dialog?.querySelector('[data-talent-id="might_skill"]')?.classList.contains("locked")).toBe(true);
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-select"][data-talent-id="might_attack"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.talent-node-tips")).not.toBeNull();
    expect(dialog?.querySelector(".talent-node-tips-stats")?.textContent).toContain("当前效果");
    dialog?.querySelector<HTMLButtonElement>('[data-action="talent-up"]')?.click();
    expect(store.getState().save.roster.H01.talentRanks.might_attack).toBe(1);
    dialog?.querySelector<HTMLButtonElement>('[data-action="close-talent-node-tips"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.talent-node-tips")).toBeNull();
    expect(dialog?.querySelector(".equip-tips-panel.talent-tips")).not.toBeNull();

    dialog?.querySelector<HTMLButtonElement>('[data-action="close-equip-tips"]')?.click();
    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-skill-tips"][data-skill-kind="signature"]')?.click();
    expect(dialog?.querySelector(".equip-tips-panel.skill-pick-tips")).not.toBeNull();
    dialog?.querySelector<HTMLButtonElement>('[data-action="choose-hero-skill"][data-skill-id="iron-wall"]')?.click();
    expect(store.getState().save.roster.H01.chosenSkillId).toBe("iron-wall");
  });

  it("keeps core stats on the left and switches gear bonuses by category", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.tutorialCompleted = true;
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
    save.roster.H01.equipment.main_weapon = "stat-gear";
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    root.querySelector<HTMLButtonElement>('[data-action="hero-detail"][data-hero-id="H01"]')?.click();

    const dialog = root.querySelector<HTMLElement>(".character-equip-modal");
    expect(dialog).not.toBeNull();
    const pager = dialog?.querySelector(".equip-stats-pager");
    expect(pager).not.toBeNull();
    expect(dialog?.querySelectorAll(".equip-stats-page")).toHaveLength(2);
    expect(dialog?.querySelector(".equip-stats-tabs")).not.toBeNull();
    const genericLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(genericLabels[0]).toBe("全伤害");
    expect(genericLabels).toContain("冷却缩减");
    expect(genericLabels).toContain("处决伤害");
    expect(genericLabels).not.toContain("火焰抗性");

    dialog?.querySelector<HTMLButtonElement>('[data-action="equip-stats-category"][data-category="elemental"]')?.click();
    expect(dialog?.querySelector('.equip-stats-page[data-category="elemental"]')?.classList.contains("active")).toBe(
      true,
    );
    const elementalLabels = [...(dialog?.querySelectorAll(".equip-stats-col.right .equip-stat-row span") ?? [])].map(
      (node) => node.textContent,
    );
    expect(elementalLabels.length).toBeGreaterThan(0);
    expect(elementalLabels).toContain("火焰抗性");
    expect(elementalLabels).not.toContain("全伤害");
    expect(dialog?.querySelector(".equip-stats-col.left")?.textContent).toContain("生命");

    root.querySelector<HTMLButtonElement>('.equip-party-strip [data-hero-id="H03"]')?.click();
    expect(dialog?.querySelector(".hero-damage-chip.school")?.textContent).toBe("魔法");
    expect(dialog?.querySelector(".hero-damage-chip.element")?.textContent).toBe("火焰");
    expect(dialog?.querySelector(".hero-damage-identity")?.getAttribute("aria-label")).toContain("元素火焰");
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

  it("renders heroes as cards with portrait, role, and level", () => {
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
    expect(first.querySelector(".hero-card-stars")).toBeNull();
    expect(first.getAttribute("style")).toContain("--role-color:");
    expect(first.classList.contains("ascend-1")).toBe(true);
    expect(first.querySelector(".hero-ascend-crest")?.getAttribute("data-level")).toBe("1");
    expect(root.querySelector(".content-panel .hero-detail")).toBeNull();
  });

  it("shows five demo ascend crests on the starting party heroes", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    expect(root.querySelector('.hero-card[data-hero-id="H01"] .hero-ascend-crest')?.getAttribute("data-level")).toBe("1");
    expect(root.querySelector('.hero-card[data-hero-id="H02"] .hero-ascend-crest')?.getAttribute("data-level")).toBe("2");
    expect(root.querySelector('.hero-card[data-hero-id="H03"] .hero-ascend-crest')?.getAttribute("data-level")).toBe("3");
    expect(root.querySelector('.hero-card[data-hero-id="H04"] .hero-ascend-crest')?.getAttribute("data-level")).toBe("4");
    expect(root.querySelector('.hero-card[data-hero-id="H05"] .hero-ascend-crest')?.getAttribute("data-level")).toBe("5");
    expect(root.querySelector('.hero-card[data-hero-id="H01"]')?.getAttribute("style")).toContain("--role-color:");
  });

  it("shows ascended crest silhouette on hero cards after advancement", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.roster.H06.unlocked = true;
    save.roster.H06.stars = 5;
    save.roster.H06.ascendLevel = 3;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });
    const card = root.querySelector<HTMLElement>('.hero-card[data-hero-id="H06"]');
    expect(card?.classList.contains("ascended")).toBe(true);
    expect(card?.classList.contains("ascend-3")).toBe(true);
    expect(card?.querySelector(".hero-ascend-crest")?.getAttribute("data-level")).toBe("3");
    expect(card?.querySelector(".hero-ascend-crest svg")).not.toBeNull();
    expect(card?.querySelector(".hero-card-ascend-seals")).toBeNull();
    expect(card?.querySelector(".hero-card-stars")).toBeNull();
  });

  it("opens equip stats from hero card with level-up frame under skills", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.exp = 500;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "heroes" });

    const beforeLevel = store.getState().save.roster.H01.level;
    const beforeExp = store.getState().save.exp;
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
    expect(store.getState().save.exp).toBeLessThan(beforeExp);
    expect(root.querySelector(".equip-level-cost")?.textContent).toMatch(/升级费用/);
  });

  it("switches between daily shop and ability upgrades", () => {
    const root = document.createElement("main");
    const save = createDefaultSave();
    save.gold = 500;
    const store = new GameStore(save);
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "shop" });

    expect(root.querySelector('[data-action="shop-panel"][data-panel="daily"]')).not.toBeNull();
    expect(root.querySelector('[data-action="shop-panel"][data-panel="abilities"]')).not.toBeNull();
    expect(root.querySelector(".shop-grid")).not.toBeNull();
    expect(root.querySelector(".shop-card .shop-buy")).not.toBeNull();
    const equipmentCard = root.querySelector(".shop-card.equipment-offer");
    if (equipmentCard) {
      expect(equipmentCard.lastElementChild?.classList.contains("shop-buy")).toBe(true);
    }
    expect(root.querySelector(".ability-icon-grid")).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="shop-panel"][data-panel="abilities"]')?.click();
    expect(root.querySelector(".ability-shop-layout")).not.toBeNull();
    expect(root.querySelector('[data-panel="shop-abilities"] .panel-meta')).toBeNull();
    expect(root.querySelectorAll(".ability-category-tab").length).toBe(3);
    expect(root.querySelectorAll(".ability-icon-tile").length).toBe(5);
    expect(root.textContent).toContain("金币掉落固定值");
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
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="ability-select"][data-ability-id="chest_progress"]')?.click();
    expect(root.querySelector(".ability-tips-modal")?.textContent).toContain("宝箱进度加成");
    root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')?.click();

    root.querySelector<HTMLButtonElement>('[data-action="ability-category"][data-category="economy"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="ability-select"][data-ability-id="gold_flat"]')?.click();
    const before = store.getState().save.abilities.gold_flat;
    const beforeGold = store.getState().save.gold;
    root.querySelector<HTMLButtonElement>('[data-action="ability-upgrade"][data-ability-id="gold_flat"]')?.click();
    expect(store.getState().save.abilities.gold_flat).toBe(before + 1);
    expect(store.getState().save.gold).toBeLessThan(beforeGold);

    root.querySelector<HTMLButtonElement>('[data-action="shop-panel"][data-panel="daily"]')?.click();
    expect(root.querySelector(".ability-icon-grid")).toBeNull();
    expect(root.querySelector(".shop-grid")).not.toBeNull();
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
    expect(root.querySelector('[data-panel="stages"]')?.parentElement?.textContent).toContain("冰霜伤害");
    expect(root.querySelector('[data-stage="120"]')?.textContent).toContain("10-12");
  });

  it("switches stages panel between mainline and dungeon tabs", () => {
    const root = document.createElement("main");
    const store = new GameStore(createDefaultSave());
    new AppShell(root, store, {});
    store.dispatch({ type: "tutorial:complete" });
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    expect(root.querySelector(".stages-panel-tabs")).not.toBeNull();
    expect(root.querySelectorAll(".stage-node")).toHaveLength(120);
    root.querySelector<HTMLButtonElement>('[data-action="stages-panel-tab"][data-tab="dungeon"]')?.click();
    expect(root.querySelector(".dungeon-daily-tip")?.textContent).toContain("每日随机开放");
    expect(root.querySelector(".dungeon-section-head")?.textContent).toContain("今日开放");
    expect(root.querySelectorAll(".dungeon-card")).toHaveLength(3);
    expect(root.querySelector(".dungeon-daily-badge")).toBeNull();
  });

  it("dispatches heroes from the dungeon panel and claims when the timer is done", () => {
    const save = createDefaultSave();
    save.tutorialCompleted = true;
    save.highestClearedStage = 120;
    save.shop.dateKey = "2026-08-18";
    save.party = ["H01", null, null, null, null];
    save.roster.H07.unlocked = true;
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
    expect(root.querySelectorAll(".dispatch-picker .hero-card")).toHaveLength(8);
    expect(root.querySelector('.dispatch-picker [data-hero-id="H01"]')?.hasAttribute("disabled")).toBe(true);
    expect(root.querySelector('.dispatch-picker [data-hero-id="H01"]')?.textContent).toContain("主线中");
    expect(root.querySelector('[data-action="dispatch-pick"][data-hero-id="H01"]')).toBeNull();
    expect(root.querySelector('.dispatch-picker .hero-ascend-crest[data-level="3"]')).not.toBeNull();
    expect(root.querySelector(".dispatch-picker")?.textContent).toContain("进阶3");
    expect(root.querySelector(".dispatch-picker")).not.toBeNull();
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
    for (let index = 0; index < size; index += 1) {
      const nextHero = root.querySelector<HTMLButtonElement>('[data-action="dispatch-pick"]:not(.selected)');
      expect(nextHero).not.toBeNull();
      nextHero!.click();
    }
    expect(root.querySelectorAll(".dispatch-picker .hero-card.selected")).toHaveLength(size);
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-dispatch"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(1);
    expect(root.querySelector('[data-action="dungeon-progress"]')).not.toBeNull();
    expect(root.querySelector(".stage-chip.dungeon")?.textContent).toContain("派遣中");
    store.getState().save.dungeonRuns[0]!.endsAt = Date.now() - 1;
    store.dispatch({ type: "ui:selectTab", tab: "stages" });
    root.querySelector<HTMLButtonElement>('[data-action="dungeon-claim"]')?.click();
    expect(store.getState().save.dungeonRuns).toHaveLength(0);
  });

  it("presents a completion state after the final chapter boss", () => {
    const root = document.createElement("main");
    const shell = new AppShell(root, new GameStore(createDefaultSave()), {});
    shell.presentBattleEvents([{ type: "battle:victory", stage: 120 }]);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain("远征通关");
  });
});
