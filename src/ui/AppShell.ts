import { ASSET_MANIFEST } from "../assets/manifest";
import { HERO_BY_ID, HERO_DEFINITIONS } from "../content/heroes";
import {
  ACCESSORY_SLOTS,
  EQUIPMENT_SLOTS,
  GEAR_SLOTS,
  ITEM_BY_ID,
  RARITY_LABELS,
  SLOT_LABELS,
  TRAIT_BY_ID,
  type EquipmentChapter,
  type EquipmentSlot,
  type Rarity,
} from "../content/items";
import { CHAPTER_DEFINITIONS, CHAPTER_NUMERAL, MAX_STAGE, chapterStartStage } from "../content/chapters";
import { SET_BY_ID } from "../content/sets";
import { RARITY_ORDER } from "../content/rarities";
import { ACTIVE_SKILL_BY_HERO, PASSIVE_SKILL_BY_HERO } from "../content/skills";
import { STAGE_DEFINITIONS } from "../content/stages";
import { compareInventoryItems, describeItemAffixes, getItemScore, getSalvageGold, type InventoryItem } from "../progression/EquipmentSystem";
import {
  ALCHEMY_SLOT_COUNT,
  alchemyCandidateItems,
  pickAlchemyAutoFill,
  validateAlchemyInputs,
} from "../progression/AlchemySystem";
import { getHeroStats, getUpgradeCost } from "../progression/HeroProgression";
import type { GameStore, GameStoreState } from "../app/GameStore";
import type { AppEvent } from "../app/events";
import type { BattleEvent, BattleSnapshot, HeroId } from "../simulation/types";
import { bindDragScroll } from "./dragScroll";

export interface AppShellOptions {
  onStageSelected?: (stage: number) => void;
  onPartySaved?: () => void;
  onClearSave?: () => void;
  onSoundRequested?: (kind: string) => void;
}

const tabMeta = {
  inventory: { icon: "🎒", label: "背包" },
  shop: { icon: "✦", label: "商店" },
  alchemy: { icon: "◈", label: "炼金" },
  heroes: { icon: "♟", label: "英雄" },
  stages: { icon: "⚑", label: "关卡" },
} as const;

const rarityClass = (rarity: Rarity): string => `rarity-${rarity}`;
const slotLabel = SLOT_LABELS;
const slotEmptyIcon: Record<EquipmentSlot, string> = {
  main_weapon: "⚔",
  off_hand: "⛨",
  helmet: "⛑",
  armor: "🛡",
  gloves: "✋",
  boots: "🥾",
  ring: "💍",
  bracer: "⛓",
  amulet: "◎",
  earring: "✧",
};
const chapterNumeral = CHAPTER_NUMERAL;

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("zh-CN");
}

function itemBaseLines(item: InventoryItem): string[] {
  return [
    item.stats.attack ? `攻击 +${item.stats.attack}` : "",
    item.stats.maxHp ? `生命 +${item.stats.maxHp}` : "",
    item.stats.defense ? `防御 +${item.stats.defense}` : "",
    item.stats.attackSpeedPct ? `攻速 +${item.stats.attackSpeedPct}%` : "",
  ].filter(Boolean);
}

/** Compact single-line stats for lists and shop rows. */
function itemStats(item: InventoryItem): string {
  return [...itemBaseLines(item), ...describeItemAffixes(item)].join(" · ");
}

/** Structured blocks for detail / compare cards. */
function itemStatsBlocks(item: InventoryItem): string {
  const base = itemBaseLines(item);
  const affixes = describeItemAffixes(item);
  const parts: string[] = [];
  if (base.length) {
    parts.push(`<p class="item-stat-block"><small>底座</small>${base.join(" · ")}</p>`);
  }
  if (affixes.length) {
    parts.push(`<p class="item-stat-block"><small>词条</small>${affixes.join(" · ")}</p>`);
  }
  if (!parts.length) {
    parts.push(`<p class="item-stat-block muted">无基础属性</p>`);
  }
  return parts.join("");
}


function equipmentArt(src: string): string {
  return `<img class="equipment-art" src="${src}" alt="" aria-hidden="true">`;
}

export class AppShell {
  private snapshot: BattleSnapshot | null = null;
  private selectedItemId: string | null = null;
  private selectedHeroId: HeroId = "H01";
  private equipTargetHeroId: HeroId = "H01";
  private equipFocusSlot: EquipmentSlot = "main_weapon";
  private inventoryFilter: EquipmentSlot | "all" = "all";
  private salvageSlotFilter: EquipmentSlot | "all" = "all";
  private salvageRarityFilter: Set<Rarity> = new Set<Rarity>(["common"]);
  private salvageSelectedIds: Set<string> = new Set();
  private alchemySlots: (string | null)[] = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
  private alchemyPreviewId: string | null = null;
  private modal: string | null = null;
  private modalPayload: unknown = null;
  private tutorialStep = 0;
  private formationDraft: GameStoreState["save"]["party"];
  private formationSlot = 0;
  private summonResultHero: HeroId | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private partyStructureKey = "";
  private readonly topbar: HTMLElement;
  private readonly partyStrip: HTMLElement;
  private readonly alchemyTipsHost: HTMLElement;
  private readonly content: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly liveRegion: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly store: GameStore,
    private readonly options: AppShellOptions,
  ) {
    this.formationDraft = [...store.getState().save.party];
    root.innerHTML = `
      <section class="game-shell">
        <header class="topbar"></header>
        <section class="battle-frame" aria-label="自动战斗区域">
          <div id="battle-canvas"></div>
          <div class="battle-vignette" aria-hidden="true"></div>
          <div class="battle-status">
            <div class="boss-meter" role="progressbar" aria-label="首领召唤进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="boss-meter-fill"></span>
              <span class="boss-meter-label">讨伐进度</span>
            </div>
            <span class="battle-state-label">正在前进</span>
          </div>
        </section>
        <section class="party-strip" aria-label="当前小队"></section>
        <div class="alchemy-tips-host" aria-live="polite"></div>
        <section class="content-panel" aria-live="polite"></section>
        <nav class="bottom-nav" aria-label="管理菜单"></nav>
        <div class="overlay-layer">
          <div class="modal-host"></div>
          <div class="toast-stack" aria-live="polite" aria-atomic="true"></div>
          <div class="sr-only" aria-live="assertive"></div>
        </div>
      </section>
    `;
    this.topbar = root.querySelector(".topbar")!;
    this.partyStrip = root.querySelector(".party-strip")!;
    this.alchemyTipsHost = root.querySelector(".alchemy-tips-host")!;
    this.content = root.querySelector(".content-panel")!;
    this.nav = root.querySelector(".bottom-nav")!;
    this.overlay = root.querySelector(".modal-host")!;
    this.liveRegion = root.querySelector(".sr-only")!;
    root.addEventListener("click", (event) => this.onClick(event));
    root.addEventListener("change", (event) => this.onChange(event));
    store.subscribe((state, events) => {
      this.renderState(state);
      this.presentAppEvents(events);
    });
    this.renderState(store.getState());
    if (!store.getState().save.tutorialCompleted) {
      this.modal = "tutorial";
      this.renderModal();
    }
  }

  renderBattle(snapshot: BattleSnapshot): void {
    this.snapshot = snapshot;
    const meter = this.root.querySelector<HTMLElement>(".boss-meter");
    const fill = this.root.querySelector<HTMLElement>(".boss-meter-fill");
    const meterLabel = this.root.querySelector(".boss-meter-label");
    if (meter && fill && meterLabel) {
      const percent = snapshot.bossActive ? 100 : Math.round(Math.min(1, Math.max(0, snapshot.progress)) * 100);
      meter.setAttribute("aria-valuenow", String(percent));
      meter.classList.toggle("is-boss", snapshot.bossActive);
      fill.style.width = `${percent}%`;
      meterLabel.textContent = snapshot.bossActive ? "首领战" : `讨伐进度 ${percent}%`;
    }
    const state = this.root.querySelector(".battle-state-label");
    if (state) {
      const travelLabel = snapshot.wave <= 1 && snapshot.progress <= 0 ? "小队入场" : "敌军逼近";
      state.textContent = {
        boot: "正在集结",
        waveIntro: "敌人来袭",
        travelling: travelLabel,
        advancing: "正在前进",
        engaging: "激战中",
        waveClear: "继续推进",
        bossIntro: "首领出现",
        victory: "挑战胜利",
        defeat: "整备重试",
      }[snapshot.state];
    }
    this.renderParty(this.store.getState());
  }

  presentBattleEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      if (event.type === "boss:intro") {
        this.showBanner(`首领来袭 · ${event.name}`, "boss");
      } else if (event.type === "battle:victory") {
        this.showBanner("胜 利", "victory");
        this.showToast("关卡完成，战利品已收入背包");
        if (event.stage === MAX_STAGE) {
          this.modal = "complete";
          this.renderModal();
        }
      } else if (event.type === "battle:defeat") {
        this.showBanner("挑战失败", "defeat");
        this.showToast("小队正在整备，稍后自动重试");
      } else if (event.type === "wave:started") {
        // Trash packs stay quiet; boss arrival is announced by boss:intro.
      }
    }
  }

  showOfflineReward(minutes: number, gold: number, gearCount: number, onClaim: () => void): void {
    this.modal = "offline";
    this.modalPayload = { minutes, gold, gearCount, onClaim };
    this.renderModal();
  }

  private renderState(state: GameStoreState): void {
    this.renderTopbar(state);
    this.renderParty(state);
    this.renderPanel(state);
    this.renderNav(state);
    if (this.modal) this.renderModal();
  }

  private renderTopbar(state: GameStoreState): void {
    const stage = STAGE_DEFINITIONS[state.save.currentStage - 1]!;
    this.topbar.innerHTML = `
      <button class="stage-chip" data-action="open-stages" aria-label="打开关卡选择">
        <small>第${chapterNumeral[stage.chapter]}章 · ${stage.chapterName}</small><strong>${stage.id}</strong>
      </button>
      <div class="resource-row">
        <button class="resource-chip" data-action="currency-info" data-currency="gold" aria-label="金币来源">
          <span aria-hidden="true">●</span><b>${compact(state.save.gold)}</b>
        </button>
        <button class="resource-chip gem" data-action="currency-info" data-currency="gems" aria-label="宝石来源">
          <span aria-hidden="true">◆</span><b>${compact(state.save.gems)}</b>
        </button>
      </div>
      <button class="speed-button" data-action="toggle-speed" aria-label="切换战斗速度">
        ${state.save.settings.battleSpeed}×
      </button>
      <button class="icon-button" data-action="settings" aria-label="游戏设置">⚙</button>
    `;
  }

  private renderParty(state: GameStoreState): void {
    const battleHeroes = this.snapshot?.units.filter(({ team }) => team === "heroes") ?? [];
    const structureKey = state.save.party
      .map((heroId) => heroId ? `${heroId}:${state.save.roster[heroId].level}` : "empty")
      .join("|");
    if (structureKey !== this.partyStructureKey) {
      this.partyStructureKey = structureKey;
      this.partyStrip.innerHTML = state.save.party
        .map((heroId) => {
        if (!heroId) {
          return `<button class="nameplate empty" data-action="formation" aria-label="空阵容位"><span>+</span><small>空位</small></button>`;
        }
        const hero = HERO_BY_ID[heroId];
        return `
          <button class="nameplate" data-hero-id="${heroId}" data-action="formation" aria-label="${hero.name}，点击编辑阵容">
            <span class="hp-fill"></span>
            <span class="plate-name">${hero.name}</span>
            <span class="skill-ring" aria-hidden="true"></span>
            <small>Lv.${state.save.roster[heroId].level}</small>
          </button>
        `;
      })
      .join("");
    }
    for (const plate of this.partyStrip.querySelectorAll<HTMLElement>(".nameplate[data-hero-id]")) {
      const heroId = plate.dataset.heroId as HeroId;
      const unit = battleHeroes.find(({ sourceId }) => sourceId === heroId);
      const hpPercent = unit ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 100;
      const cooldown = unit
        ? Math.min(100, Math.max(0, 100 - (unit.skillCooldownMs / (ACTIVE_SKILL_BY_HERO[heroId].cooldownMs ?? 6000)) * 100))
        : 0;
      plate.classList.toggle("low", hpPercent < 25);
      plate.classList.toggle("dead", unit ? !unit.alive : false);
      plate.querySelector<HTMLElement>(".hp-fill")?.style.setProperty("--hp", `${hpPercent}%`);
      plate.querySelector<HTMLElement>(".skill-ring")?.style.setProperty("--cooldown", `${cooldown * 3.6}deg`);
    }
  }

  private renderNav(state: GameStoreState): void {
    const hasUpgrade = state.save.inventory.some((item) =>
      state.save.party.some((heroId) => {
        if (!heroId) return false;
        const equippedId = state.save.roster[heroId].equipment[item.slot];
        const equipped = state.save.inventory.find(({ instanceId }) => instanceId === equippedId);
        return !equipped || getItemScore(item) > getItemScore(equipped);
      }),
    );
    this.nav.innerHTML = Object.entries(tabMeta)
      .map(([id, meta]) => `
        <button data-action="select-tab" data-tab="${id}" class="${state.ui.activeTab === id ? "active" : ""}" aria-label="${meta.label}">
          <span class="nav-icon" aria-hidden="true">${meta.icon}</span>
          <span class="nav-label">${meta.label}</span>
          ${id === "inventory" && hasUpgrade ? '<i class="notice-dot" aria-label="有更强装备"></i>' : ""}
        </button>
      `)
      .join("");
  }

  private renderPanel(state: GameStoreState): void {
    if (state.ui.activeTab !== "alchemy") this.alchemyTipsHost.innerHTML = "";
    if (state.ui.activeTab === "inventory") this.renderInventory(state);
    if (state.ui.activeTab === "shop") this.renderShop(state);
    if (state.ui.activeTab === "heroes") this.renderHeroes(state);
    if (state.ui.activeTab === "stages") this.renderStages(state);
    if (state.ui.activeTab === "alchemy") this.renderAlchemy(state);
  }

  private renderInventory(state: GameStoreState): void {
    const sorted = [...state.save.inventory]
      .filter((item) => this.inventoryFilter === "all" || item.slot === this.inventoryFilter)
      .sort(compareInventoryItems);
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="inventory">
        <span class="panel-meta" aria-label="背包容量">${state.save.inventory.length}/40</span>
        <div class="panel-actions">
          <button class="secondary-button compact" data-action="inventory-organize">整理</button>
          <button class="secondary-button compact" data-action="inventory-salvage-open">分解</button>
          <select class="filter-select" data-action="inventory-filter" aria-label="装备筛选">
            <option value="all" ${this.inventoryFilter === "all" ? "selected" : ""}>全部</option>
            ${EQUIPMENT_SLOTS.map(
              (slot) =>
                `<option value="${slot}" ${this.inventoryFilter === slot ? "selected" : ""}>${slotLabel[slot]}</option>`,
            ).join("")}
          </select>
        </div>
      </div>
      ${
        sorted.length
          ? `<div class="item-grid">${sorted.map((item) => this.itemCard(item)).join("")}</div>`
          : `<div class="empty-state"><span>🎒</span><strong>背包还是空的</strong><p>小队会在战斗中自动收集装备</p><button data-action="open-stages" class="secondary-button">查看当前关卡</button></div>`
      }
    `;
  }

  private itemCard(item: InventoryItem): string {
    const definition = ITEM_BY_ID[item.definitionId]!;
    return `
      <button class="item-card ${rarityClass(item.rarity)}" data-action="item-detail" data-item-id="${item.instanceId}" aria-label="${RARITY_LABELS[item.rarity]}${definition.name}">
        <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
      </button>
    `;
  }

  private equippedInstanceIds(state: GameStoreState): Set<string> {
    const equipped = new Set<string>();
    for (const progress of Object.values(state.save.roster)) {
      for (const itemId of Object.values(progress.equipment)) {
        if (itemId) equipped.add(itemId);
      }
    }
    return equipped;
  }

  private itemOwnerHeroId(state: GameStoreState, itemId: string): HeroId | null {
    for (const [heroId, progress] of Object.entries(state.save.roster)) {
      for (const equippedId of Object.values(progress.equipment)) {
        if (equippedId === itemId) return heroId as HeroId;
      }
    }
    return null;
  }

  private isOwnedByOtherHero(state: GameStoreState, itemId: string): boolean {
    const owner = this.itemOwnerHeroId(state, itemId);
    return owner != null && owner !== this.equipTargetHeroId;
  }

  private salvageCandidates(state: GameStoreState): InventoryItem[] {
    return [...state.save.inventory]
      .filter((item) => {
        if (!this.salvageRarityFilter.has(item.rarity)) return false;
        if (this.salvageSlotFilter !== "all" && item.slot !== this.salvageSlotFilter) return false;
        return true;
      })
      .sort(compareInventoryItems);
  }

  private syncSalvageSelection(state: GameStoreState): void {
    const equipped = this.equippedInstanceIds(state);
    const visibleIds = new Set(
      this.salvageCandidates(state)
        .filter((item) => !equipped.has(item.instanceId))
        .map((item) => item.instanceId),
    );
    for (const id of [...this.salvageSelectedIds]) {
      if (!visibleIds.has(id)) this.salvageSelectedIds.delete(id);
    }
    for (const id of visibleIds) this.salvageSelectedIds.add(id);
  }

  private openSalvageModal(): void {
    this.salvageSlotFilter = "all";
    this.salvageRarityFilter = new Set<Rarity>(["common"]);
    this.salvageSelectedIds = new Set();
    this.syncSalvageSelection(this.store.getState());
    this.openModal("salvage");
  }

  private renderSalvageModal(state: GameStoreState): void {
    const equipped = this.equippedInstanceIds(state);
    const candidates = this.salvageCandidates(state);
    const selectedItems = candidates.filter(
      (item) => this.salvageSelectedIds.has(item.instanceId) && !equipped.has(item.instanceId),
    );
    const totalGold = selectedItems.reduce((sum, item) => sum + getSalvageGold(item), 0);
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="salvage-modal" role="dialog" aria-modal="true" aria-label="分解装备">
        <header class="salvage-modal-header">
          <h2>分解装备</h2>
          <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        </header>
        <div class="salvage-filters">
          <div class="salvage-rarity-chips" aria-label="稀有度筛选">
            ${RARITY_ORDER.map((rarity) => {
              const active = this.salvageRarityFilter.has(rarity);
              return `<button
                type="button"
                class="salvage-chip ${rarityClass(rarity)} ${active ? "active" : ""}"
                data-action="salvage-rarity-toggle"
                data-rarity="${rarity}"
                aria-pressed="${active ? "true" : "false"}"
              >${RARITY_LABELS[rarity]}</button>`;
            }).join("")}
          </div>
          <select class="filter-select" data-action="salvage-slot-filter" aria-label="槽位筛选">
            <option value="all" ${this.salvageSlotFilter === "all" ? "selected" : ""}>全部槽位</option>
            ${EQUIPMENT_SLOTS.map(
              (slot) =>
                `<option value="${slot}" ${this.salvageSlotFilter === slot ? "selected" : ""}>${slotLabel[slot]}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="salvage-toolbar">
          <button type="button" class="text-button" data-action="salvage-select-visible">全选筛选</button>
          <button type="button" class="text-button" data-action="salvage-clear-selection">清空选择</button>
          <span class="salvage-summary">已选 ${selectedItems.length} · ● ${compact(totalGold)}</span>
        </div>
        <div class="salvage-grid" aria-label="可分解装备">
          ${
            candidates.length
              ? candidates
                  .map((item) => {
                    const definition = ITEM_BY_ID[item.definitionId]!;
                    const isEquipped = equipped.has(item.instanceId);
                    const selected = this.salvageSelectedIds.has(item.instanceId);
                    return `
                      <div class="salvage-cell">
                        <button
                          type="button"
                          class="item-card ${rarityClass(item.rarity)} ${selected ? "selected" : ""} ${isEquipped ? "equipped" : ""}"
                          data-action="${isEquipped ? "noop" : "salvage-toggle-item"}"
                          data-item-id="${item.instanceId}"
                          ${isEquipped ? "disabled" : ""}
                          aria-pressed="${selected ? "true" : "false"}"
                          aria-label="${RARITY_LABELS[item.rarity]}${definition.name}${isEquipped ? "，已装备不可分解" : ""}"
                        >
                          <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
                          ${isEquipped ? `<span class="salvage-equipped-tag">装</span>` : ""}
                        </button>
                      </div>
                    `;
                  })
                  .join("")
              : `<div class="salvage-empty">当前筛选下没有可分解装备</div>`
          }
        </div>
        <div class="salvage-actions">
          <button class="secondary-button" data-action="close-modal">取消</button>
          <button class="danger-button" data-action="salvage-confirm" ${selectedItems.length ? "" : "disabled"}>
            确认分解 · ● ${compact(totalGold)}
          </button>
        </div>
      </section>
    `;
  }

  private partyHeroIds(state: GameStoreState): HeroId[] {
    return state.save.party.filter((heroId): heroId is HeroId => heroId != null);
  }

  private pickEquipTargetHero(state: GameStoreState): HeroId {
    const party = this.partyHeroIds(state);
    if (!party.length) return this.selectedHeroId;
    const item = state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
    if (!item) return party.includes(this.selectedHeroId) ? this.selectedHeroId : party[0]!;

    let best = party.includes(this.selectedHeroId) ? this.selectedHeroId : party[0]!;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const heroId of party) {
      const equippedId = state.save.roster[heroId].equipment[item.slot];
      const equipped = equippedId
        ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId)
        : null;
      const score = equipped ? getItemScore(equipped) : 0;
      if (score < bestScore) {
        bestScore = score;
        best = heroId;
      }
    }
    return best;
  }

  private renderEquipPartyStrip(state: GameStoreState): string {
    const battleHeroes = this.snapshot?.units.filter(({ team }) => team === "heroes") ?? [];
    return `
      <div class="equip-party-strip" aria-label="当前小队">
        ${state.save.party
          .map((heroId) => {
            if (!heroId) {
              return `<div class="nameplate empty" aria-label="空阵容位"><span>+</span><small>空位</small></div>`;
            }
            const hero = HERO_BY_ID[heroId];
            const unit = battleHeroes.find(({ sourceId }) => sourceId === heroId);
            const hpPercent = unit ? Math.max(0, (unit.hp / unit.maxHp) * 100) : 100;
            const cooldown = unit
              ? Math.min(
                  100,
                  Math.max(0, 100 - (unit.skillCooldownMs / (ACTIVE_SKILL_BY_HERO[heroId].cooldownMs ?? 6000)) * 100),
                )
              : 0;
            const low = hpPercent < 25;
            const dead = unit ? !unit.alive : false;
            const selected = heroId === this.equipTargetHeroId;
            return `
              <button
                class="nameplate ${selected ? "selected" : ""} ${low ? "low" : ""} ${dead ? "dead" : ""}"
                data-action="equip-hero-select"
                data-hero-id="${heroId}"
                aria-label="${hero.name}，点击切换装备角色"
                aria-pressed="${selected ? "true" : "false"}"
              >
                <span class="hp-fill" style="--hp:${hpPercent}%"></span>
                <span class="plate-name">${hero.name}</span>
                <span class="skill-ring" style="--cooldown:${cooldown * 3.6}deg" aria-hidden="true"></span>
                <small>Lv.${state.save.roster[heroId].level}</small>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  private renderEquipSlot(
    state: GameStoreState,
    heroId: HeroId,
    slot: EquipmentSlot,
    focusSlot: EquipmentSlot,
  ): string {
    const equippedId = state.save.roster[heroId].equipment[slot];
    const equipped = equippedId
      ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId)
      : null;
    const definition = equipped ? ITEM_BY_ID[equipped.definitionId] : null;
    return `
      <button
        type="button"
        class="equip-slot ${slot === focusSlot ? "focus" : ""} ${equipped ? rarityClass(equipped.rarity) : "empty"}"
        data-action="equip-slot-focus"
        data-slot="${slot}"
        aria-pressed="${slot === focusSlot ? "true" : "false"}"
        aria-label="${slotLabel[slot]}${equipped && definition ? `：${definition.name}` : "：空"}，点击筛选该槽位装备"
      >
        <span class="equip-slot-art" aria-hidden="true">${
          equipped && definition ? equipmentArt(definition.icon) : slotEmptyIcon[slot]
        }</span>
        <small>${slotLabel[slot]}</small>
      </button>
    `;
  }

  private renderCompareCard(
    item: InventoryItem | null,
    label: string,
    tone: "current" | "selected",
  ): string {
    if (!item) {
      return `
        <article class="equip-compare-card empty ${tone}">
          <span class="compare-label">${label}</span>
          <div class="compare-empty">空</div>
          <p>${tone === "current" ? "当前槽位未装备" : "请在下方选择装备"}</p>
        </article>
      `;
    }
    const definition = ITEM_BY_ID[item.definitionId]!;
    const trait = item.traitId ? TRAIT_BY_ID[item.traitId] : null;
    const set = definition.setId ? SET_BY_ID[definition.setId] : null;
    const schoolLabel = definition.school === "magic" ? "法系" : "物理";
    return `
      <article class="equip-compare-card ${tone} ${rarityClass(item.rarity)}">
        <span class="compare-label">${label}</span>
        <div class="compare-head">
          <div class="detail-icon">${equipmentArt(definition.icon)}</div>
          <div>
            <span class="rarity-label">${RARITY_LABELS[item.rarity]} · ${slotLabel[item.slot]} · ${schoolLabel}</span>
            <h3>${definition.name}</h3>
            <p class="equip-power">战力 ${getItemScore(item)}</p>
          </div>
        </div>
        ${itemStatsBlocks(item)}
        ${
          set
            ? `<p class="trait-line">套装 · ${set.name}</p>`
            : ""
        }
        ${
          trait
            ? `<p class="trait-line">传奇 · ${trait.name}<small>${trait.description}</small></p>`
            : `<p class="trait-line muted">无传奇特效</p>`
        }
      </article>
    `;
  }

  private renderItemTips(state: GameStoreState): void {
    const item = state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
    if (!item) {
      this.closeModal();
      return;
    }
    const definition = ITEM_BY_ID[item.definitionId]!;
    const trait = item.traitId ? TRAIT_BY_ID[item.traitId] : null;
    const set = definition.setId ? SET_BY_ID[definition.setId] : null;
    const schoolLabel = definition.school === "magic" ? "法系" : "物理";
    const salvageGold = getSalvageGold(item);
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal ${rarityClass(item.rarity)}" role="dialog" aria-modal="true" aria-label="装备详情">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <div class="item-tips-head">
          <div class="detail-icon item-tips-icon">${equipmentArt(definition.icon)}</div>
          <div>
            <span class="rarity-label">${RARITY_LABELS[item.rarity]} · ${slotLabel[item.slot]} · ${schoolLabel}</span>
            <h2>${definition.name}</h2>
            <p class="equip-power">战力 ${getItemScore(item)}</p>
          </div>
        </div>
        <div class="item-tips-stats">${itemStatsBlocks(item)}</div>
        ${
          set
            ? `<p class="trait-line">套装 · ${set.name}<small>同套 2/4/6 件激活加成</small></p>`
            : ""
        }
        ${
          trait
            ? `<p class="trait-line">传奇 · ${trait.name}<small>${trait.description}</small></p>`
            : `<p class="trait-line muted">无传奇特效</p>`
        }
        <div class="item-tips-actions">
          <button class="secondary-button" data-action="item-salvage">分解 · ● ${compact(salvageGold)}</button>
          <button class="primary-button" data-action="item-open-equip">装备</button>
        </div>
      </section>
    `;
  }

  private equipCandidates(state: GameStoreState): InventoryItem[] {
    return [...state.save.inventory]
      .filter((item) => item.slot === this.equipFocusSlot)
      .sort(compareInventoryItems);
  }

  private resolveSelectedEquipItem(state: GameStoreState): InventoryItem | null {
    const current = state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
    if (
      current &&
      current.slot === this.equipFocusSlot &&
      !this.isOwnedByOtherHero(state, current.instanceId)
    ) {
      return current;
    }

    const equippedId = state.save.roster[this.equipTargetHeroId]?.equipment[this.equipFocusSlot];
    if (equippedId) {
      const equipped = state.save.inventory.find(({ instanceId }) => instanceId === equippedId);
      if (equipped) {
        this.selectedItemId = equipped.instanceId;
        return equipped;
      }
    }

    const first = this.equipCandidates(state).find(
      (item) => !this.isOwnedByOtherHero(state, item.instanceId),
    );
    this.selectedItemId = first?.instanceId ?? null;
    return first ?? null;
  }

  private renderCandidateCard(state: GameStoreState, item: InventoryItem): string {
    const definition = ITEM_BY_ID[item.definitionId]!;
    const ownedElsewhere = this.isOwnedByOtherHero(state, item.instanceId);
    const selected = !ownedElsewhere && this.selectedItemId === item.instanceId;
    const owner = ownedElsewhere ? this.itemOwnerHeroId(state, item.instanceId) : null;
    const ownerName = owner ? HERO_BY_ID[owner].name : "";
    return `
      <button
        type="button"
        class="item-card ${rarityClass(item.rarity)} ${selected ? "selected" : ""} ${ownedElsewhere ? "owned-elsewhere" : ""}"
        data-action="${ownedElsewhere ? "noop" : "equip-candidate-select"}"
        data-item-id="${item.instanceId}"
        ${ownedElsewhere ? "disabled" : ""}
        aria-label="${RARITY_LABELS[item.rarity]}${definition.name}${ownedElsewhere ? `，已被${ownerName}装备` : ""}"
        aria-pressed="${selected ? "true" : "false"}"
        aria-disabled="${ownedElsewhere ? "true" : "false"}"
      >
        <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
        ${
          ownedElsewhere
            ? `<span class="equip-owned-overlay">${ownerName}</span>`
            : ""
        }
      </button>
    `;
  }

  private syncEquipModal(state: GameStoreState): void {
    const party = this.partyHeroIds(state);
    if (party.length && !party.includes(this.equipTargetHeroId)) {
      this.equipTargetHeroId = party[0]!;
    }
    const candidates = this.equipCandidates(state);
    const item = this.resolveSelectedEquipItem(state);
    if (!item && candidates.length === 0) {
      this.closeModal();
      return;
    }
    const focusSlot = item?.slot ?? this.equipFocusSlot;
    const heroId = this.equipTargetHeroId;
    const hero = HERO_BY_ID[heroId];
    const progress = state.save.roster[heroId];
    const equippedId = progress.equipment[focusSlot];
    const equipped = equippedId
      ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId)
      : null;
    const nextScore = item ? getItemScore(item) : 0;
    const currentScore = equipped ? getItemScore(equipped) : 0;
    const alreadyEquipped = Boolean(item && equippedId === item.instanceId);
    const scoreDelta = item ? nextScore - currentScore : 0;
    const portrait = ASSET_MANIFEST.characters[heroId];
    const summary = !item
      ? "请选择一件可装备的道具"
      : alreadyEquipped
        ? "当前角色已装备此物，可卸下"
        : `战力 ${currentScore} → ${nextScore}${scoreDelta === 0 ? "" : `（${scoreDelta > 0 ? "+" : ""}${scoreDelta}）`}`;
    const actionLabel = alreadyEquipped ? "卸下" : `装备到 ${hero.name}`;

    let modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal");
    if (!modal) {
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="equip-modal character-equip-modal" role="dialog" aria-modal="true" aria-label="更换装备">
          <header class="character-equip-header">
            <h2>更换装备</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          ${this.renderEquipPartyStrip(state)}
          <div class="character-loadout">
            <section class="character-loadout-col gear" aria-label="装备栏">
              <div class="equip-slot-grid gear"></div>
            </section>
            <div class="character-portrait-stage">
              <img class="character-portrait-art" alt="" />
              <div class="character-portrait-meta">
                <strong></strong>
                <small></small>
              </div>
            </div>
            <section class="character-loadout-col accessories" aria-label="饰品栏">
              <div class="equip-slot-grid accessories"></div>
            </section>
          </div>
          <div class="equip-compare-board" aria-label="装备对比"></div>
          <p class="equip-compare-summary"></p>
          <div class="equip-candidate-section">
            <small class="equip-candidate-label"></small>
            <div class="equip-candidate-grid item-grid" aria-label="可选装备"></div>
          </div>
          <button class="primary-button wide" data-action="equip-item"></button>
        </section>
      `;
      modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal")!;
      const createdGrid = modal.querySelector<HTMLElement>(".equip-candidate-grid");
      if (createdGrid) bindDragScroll(createdGrid);
    }

    for (const plate of modal.querySelectorAll<HTMLElement>(".equip-party-strip .nameplate[data-hero-id]")) {
      const selected = plate.dataset.heroId === heroId;
      plate.classList.toggle("selected", selected);
      plate.setAttribute("aria-pressed", selected ? "true" : "false");
    }

    const gearGrid = modal.querySelector(".equip-slot-grid.gear");
    const accessoryGrid = modal.querySelector(".equip-slot-grid.accessories");
    if (gearGrid) {
      gearGrid.innerHTML = GEAR_SLOTS.map((slot) => this.renderEquipSlot(state, heroId, slot, focusSlot)).join("");
    }
    if (accessoryGrid) {
      accessoryGrid.innerHTML = ACCESSORY_SLOTS.map((slot) =>
        this.renderEquipSlot(state, heroId, slot, focusSlot),
      ).join("");
    }

    const portraitStage = modal.querySelector<HTMLElement>(".character-portrait-stage");
    const portraitArt = modal.querySelector<HTMLImageElement>(".character-portrait-art");
    const portraitName = modal.querySelector(".character-portrait-meta strong");
    const portraitMeta = modal.querySelector(".character-portrait-meta small");
    if (portraitStage) portraitStage.style.setProperty("--hero-color", hero.color);
    if (portraitArt) {
      if (portraitArt.getAttribute("src") !== portrait) portraitArt.src = portrait;
      portraitArt.alt = hero.name;
    }
    if (portraitName) portraitName.textContent = hero.name;
    if (portraitMeta) portraitMeta.textContent = `${hero.role} · Lv.${progress.level}`;

    const compareBoard = modal.querySelector(".equip-compare-board");
    if (compareBoard) {
      compareBoard.innerHTML = `
        ${this.renderCompareCard(equipped ?? null, "当前装备", "current")}
        ${this.renderCompareCard(item, "所选装备", "selected")}
      `;
    }

    const summaryEl = modal.querySelector(".equip-compare-summary");
    if (summaryEl) {
      summaryEl.className = `equip-compare-summary ${
        !item ? "" : scoreDelta > 0 ? "upgrade" : scoreDelta < 0 ? "downgrade" : ""
      }`;
      summaryEl.textContent = summary;
    }

    const candidateLabel = modal.querySelector(".equip-candidate-label");
    if (candidateLabel) candidateLabel.textContent = `可选装备 · ${slotLabel[focusSlot]}`;
    const candidateGrid = modal.querySelector(".equip-candidate-grid");
    if (candidateGrid) {
      candidateGrid.innerHTML = candidates.length
        ? candidates.map((candidate) => this.renderCandidateCard(state, candidate)).join("")
        : `<div class="equip-candidate-empty">该槽位暂无可选装备</div>`;
    }

    const actionButton = modal.querySelector<HTMLButtonElement>('[data-action="equip-item"], [data-action="unequip-item"]');
    if (actionButton) {
      actionButton.dataset.action = alreadyEquipped ? "unequip-item" : "equip-item";
      actionButton.disabled = !item || !party.length;
      actionButton.textContent = actionLabel;
      actionButton.classList.toggle("secondary-button", alreadyEquipped);
      actionButton.classList.toggle("primary-button", !alreadyEquipped);
    }
  }

  private renderShop(state: GameStoreState): void {
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="shop">
        <span class="panel-meta">今日补给</span>
        <div class="panel-actions">
          <button class="secondary-button compact" data-action="shop-refresh" ${state.save.shop.freeRefreshUsed ? "disabled" : ""}>
            ${state.save.shop.freeRefreshUsed ? "今日已刷新" : "免费刷新"}
          </button>
        </div>
      </div>
      <div class="shop-grid">
        ${state.save.shop.offers.map((offer) => {
          if (offer.kind === "gems") {
            return `<article class="shop-card gem-offer ${offer.sold ? "sold" : ""}">
              <span class="offer-art">◆</span><small>宝石补给</small><strong>50 宝石</strong>
              <button data-action="shop-buy" data-offer-id="${offer.offerId}" ${offer.sold || state.save.gold < offer.priceGold ? "disabled" : ""}>
                ${offer.sold ? "已售罄" : `● ${compact(offer.priceGold)}`}
              </button>
            </article>`;
          }
          const definition = ITEM_BY_ID[offer.item.definitionId]!;
          return `<article class="shop-card ${rarityClass(offer.item.rarity)} ${offer.sold ? "sold" : ""}">
            <span class="offer-art">${equipmentArt(definition.icon)}</span><small>${RARITY_LABELS[offer.item.rarity]} · ${slotLabel[offer.item.slot]}</small>
            <strong>${definition.name}</strong><em>${itemStats(offer.item)}</em>
            <button data-action="shop-buy" data-offer-id="${offer.offerId}" ${offer.sold || state.save.gold < offer.priceGold ? "disabled" : ""}>
              ${offer.sold ? "已售罄" : `● ${compact(offer.priceGold)}`}
            </button>
          </article>`;
        }).join("")}
      </div>
    `;
  }

  private renderHeroes(state: GameStoreState): void {
    const selected = HERO_BY_ID[this.selectedHeroId];
    const progress = state.save.roster[this.selectedHeroId];
    const stats = getHeroStats(this.selectedHeroId, progress.level);
    const active = ACTIVE_SKILL_BY_HERO[this.selectedHeroId];
    const passive = PASSIVE_SKILL_BY_HERO[this.selectedHeroId];
    const cost = getUpgradeCost(progress.level);
    const unlockedCount = Object.values(state.save.roster).filter(({ unlocked }) => unlocked).length;
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="heroes">
        <span class="panel-meta" aria-label="已解锁英雄">${unlockedCount}/8</span>
        <div class="panel-actions">
          <button class="summon-entry" data-action="summon-open">召唤</button>
        </div>
      </div>
      <div class="hero-roster">
        ${HERO_DEFINITIONS.map((hero) => {
          const unlocked = state.save.roster[hero.id].unlocked;
          return `<button class="hero-token ${this.selectedHeroId === hero.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="${unlocked ? "hero-detail" : "summon-open"}" data-hero-id="${hero.id}" aria-label="${unlocked ? hero.name : `${hero.name}未解锁`}">
            <span style="--hero-color:${hero.color}">${unlocked ? hero.name.slice(0, 1) : "?"}</span>
            <small>${unlocked ? hero.name : "未解锁"}</small>
          </button>`;
        }).join("")}
      </div>
      <article class="hero-detail">
        <header><div class="hero-portrait" style="--hero-color:${selected.color}">${selected.name.slice(0, 1)}</div>
          <div><small>${selected.role}</small><h3>${selected.name} <em>Lv.${progress.level}</em></h3><p>${selected.tagline}</p></div></header>
        <div class="stat-row"><span>生命 <b>${stats.maxHp}</b></span><span>攻击 <b>${stats.attack}</b></span><span>防御 <b>${stats.defense}</b></span></div>
        <div class="skill-list">
          <div><i>主动</i><strong>${active.name}</strong><p>${active.description}</p></div>
          <div><i>被动</i><strong>${passive.name}</strong><p>${passive.description}</p></div>
        </div>
        <button class="primary-button wide" data-action="hero-level" data-hero-id="${selected.id}" ${progress.level >= 20 || state.save.gold < cost ? "disabled" : ""}>
          ${progress.level >= 20 ? "已达等级上限" : `升级 · ● ${compact(cost)}`}
        </button>
      </article>
    `;
  }

  private renderStages(state: GameStoreState): void {
    const renderChapter = (chapter: EquipmentChapter): string => {
      const meta = CHAPTER_DEFINITIONS[chapter - 1]!;
      const stages = STAGE_DEFINITIONS.filter((stage) => stage.chapter === chapter);
      const cleared = stages.filter((stage) => stage.stage <= state.save.highestClearedStage).length;
      const unlockAt = chapterStartStage(chapter);
      const unlockedChapter = state.save.highestUnlockedStage >= unlockAt;
      return `
        ${
          chapter > 1
            ? `<article class="chapter-preview">
          <div><small>第${chapterNumeral[chapter]}章 · ${meta.name}</small><strong>${meta.name}</strong><p>${meta.blurb}</p></div>
          <span>${unlockedChapter ? "已开放" : `通关 ${chapter - 1}-12 解锁`}</span>
        </article>`
            : ""
        }
        <section class="chapter-section chapter-${chapter}">
          <header class="chapter-heading">
            <div><small>第${chapterNumeral[chapter]}章</small><h3>${meta.name}</h3></div>
            <span class="chapter-progress">${cleared}/12</span>
          </header>
          <div class="stage-map">
            ${stages
              .map((stage) => {
                const unlocked = stage.stage <= state.save.highestUnlockedStage;
                const isCleared = stage.stage <= state.save.highestClearedStage;
                return `<button class="stage-node ${state.save.currentStage === stage.stage ? "current" : ""} ${isCleared ? "cleared" : ""}" data-action="${unlocked ? "stage-select" : "locked-stage"}" data-stage="${stage.stage}" ${unlocked ? "" : "disabled"}>
                <span>${isCleared ? "✓" : unlocked ? stage.stage - (chapter - 1) * 12 : "🔒"}</span><small>${stage.id}</small>
              </button>`;
              })
              .join("")}
          </div>
        </section>
      `;
    };
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="stages">
        <span class="panel-meta" aria-label="通关进度">通关 ${state.save.highestClearedStage}/${MAX_STAGE}</span>
      </div>
      ${CHAPTER_DEFINITIONS.map((chapter) => renderChapter(chapter.id)).join("")}
    `;
  }

  private alchemyEquipmentMaps(state: GameStoreState) {
    return Object.values(state.save.roster).map((progress) => progress.equipment);
  }

  private pruneAlchemySlots(state: GameStoreState): void {
    const candidates = new Set(
      alchemyCandidateItems(state.save.inventory, this.alchemyEquipmentMaps(state)).map(
        (item) => item.instanceId,
      ),
    );
    this.alchemySlots = this.alchemySlots.map((id) => (id && candidates.has(id) ? id : null));
  }

  private renderAlchemy(state: GameStoreState): void {
    this.pruneAlchemySlots(state);
    const candidates = alchemyCandidateItems(state.save.inventory, this.alchemyEquipmentMaps(state)).sort(
      compareInventoryItems,
    );
    const filledIds = this.alchemySlots.filter((id): id is string => Boolean(id));
    const filledItems = filledIds
      .map((id) => state.save.inventory.find(({ instanceId }) => instanceId === id))
      .filter((item): item is InventoryItem => Boolean(item));
    const validationError = filledItems.length === ALCHEMY_SLOT_COUNT ? validateAlchemyInputs(filledItems) : null;
    const canCraft = filledItems.length === ALCHEMY_SLOT_COUNT && !validationError;
    if (this.alchemyPreviewId && !candidates.some((item) => item.instanceId === this.alchemyPreviewId)) {
      this.alchemyPreviewId = null;
    }
    const preview = this.alchemyPreviewId
      ? state.save.inventory.find(({ instanceId }) => instanceId === this.alchemyPreviewId) ?? null
      : null;

    this.content.innerHTML = `
      <div class="alchemy-page" data-panel="alchemy">
        <div class="panel-heading compact alchemy-heading">
          <span class="panel-meta alchemy-guide">放入 9 个同品质装备，可炼成更高一级品质装备</span>
          <div class="panel-actions">
            <button class="secondary-button compact" data-action="alchemy-auto-fill">一键放入</button>
            <button class="secondary-button compact" data-action="alchemy-clear" ${filledIds.length ? "" : "disabled"}>清空</button>
          </div>
        </div>
        <div class="alchemy-layout">
          <section class="alchemy-cube-panel" aria-label="炼金魔方">
            <div class="alchemy-cube">
              ${this.alchemySlots
                .map((itemId, index) => {
                  const item = itemId
                    ? state.save.inventory.find(({ instanceId }) => instanceId === itemId)
                    : null;
                  if (!item) {
                    return `<button type="button" class="alchemy-cell empty" data-action="alchemy-slot-clear" data-slot="${index}" aria-label="空槽 ${index + 1}"></button>`;
                  }
                  const definition = ITEM_BY_ID[item.definitionId]!;
                  return `<button type="button" class="alchemy-cell filled ${rarityClass(item.rarity)}" data-action="alchemy-slot-clear" data-slot="${index}" aria-label="移出 ${definition.name}">
                    <span class="alchemy-cell-art">${equipmentArt(definition.icon)}</span>
                  </button>`;
                })
                .join("")}
            </div>
            <p class="alchemy-hint">${validationError ?? (canCraft ? "材料齐全，可以炼金" : `已放入 ${filledIds.length}/${ALCHEMY_SLOT_COUNT}`)}</p>
            <button class="primary-button wide" data-action="alchemy-craft" ${canCraft ? "" : "disabled"}>炼金</button>
          </section>
          <section class="alchemy-list-panel" aria-label="可炼金道具">
            <div class="alchemy-list item-grid" data-scroll="alchemy">
              ${
                candidates.length
                  ? candidates
                      .map((item) => {
                        const definition = ITEM_BY_ID[item.definitionId]!;
                        const inCube = this.alchemySlots.includes(item.instanceId);
                        const previewing = this.alchemyPreviewId === item.instanceId;
                        return `<button type="button" class="item-card ${rarityClass(item.rarity)} ${inCube ? "selected" : ""} ${previewing ? "alchemy-previewing" : ""}" data-action="alchemy-list-toggle" data-item-id="${item.instanceId}" aria-label="${RARITY_LABELS[item.rarity]}${definition.name}">
                          <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
                        </button>`;
                      })
                      .join("")
                  : `<div class="empty-state compact"><strong>暂无可炼金装备</strong><p>需要未装备且未达混元的装备</p></div>`
              }
            </div>
          </section>
        </div>
      </div>
    `;
    this.alchemyTipsHost.innerHTML = preview
      ? `<div class="alchemy-tips-layer">
        <section class="alchemy-tips" role="status" aria-label="装备详情">
          <div class="alchemy-tips-icon detail-icon ${rarityClass(preview.rarity)}">${equipmentArt(ITEM_BY_ID[preview.definitionId]!.icon)}</div>
          <div class="alchemy-tips-body">
            <span class="rarity-label">${RARITY_LABELS[preview.rarity]} · ${slotLabel[preview.slot]} · ${ITEM_BY_ID[preview.definitionId]!.school === "magic" ? "法系" : "物理"}</span>
            <strong>${ITEM_BY_ID[preview.definitionId]!.name}</strong>
            <p class="equip-power">战力 ${getItemScore(preview)}</p>
            <div class="alchemy-tips-stats">${itemStatsBlocks(preview)}</div>
          </div>
        </section>
      </div>`
      : "";
    const list = this.content.querySelector<HTMLElement>('[data-scroll="alchemy"]');
    if (list) bindDragScroll(list);
  }

  private renderModal(): void {
    if (!this.modal) {
      this.overlay.innerHTML = "";
      this.overlay.classList.remove("open");
      return;
    }
    this.overlay.classList.add("open");
    const state = this.store.getState();
    if (this.modal === "settings") {
      this.overlay.innerHTML = this.sheet("设置", `
        <div class="settings-list">
          <label><span><b>游戏音效</b><small>攻击、技能与奖励提示</small></span><input type="checkbox" data-action="sound-toggle" ${state.save.settings.soundEnabled ? "checked" : ""}></label>
          <label><span><b>减弱动效</b><small>减少跳动、震动和飞行动画</small></span><input type="checkbox" data-action="motion-toggle" ${state.save.settings.reducedMotion ? "checked" : ""}></label>
          <button class="danger-button" data-action="clear-save">清除本地存档</button>
          <p class="version">青丘远征 Demo · v1.0.0</p>
        </div>
      `);
    } else if (this.modal === "currency") {
      const currency = this.modalPayload as string;
      this.overlay.innerHTML = this.sheet(currency === "gold" ? "金币来源" : "宝石来源", `
        <div class="info-card"><span>${currency === "gold" ? "●" : "◆"}</span>
          <p>${currency === "gold" ? "击败敌人、离线收益和普通装备溢出可获得金币。金币用于英雄升级和冒险商店。" : "首次通关关卡可获得宝石。宝石只用于 Demo 英雄召唤，不包含付费入口。"}</p>
        </div>
      `);
    } else if (this.modal === "item-tips") {
      this.renderItemTips(state);
    } else if (this.modal === "equip") {
      this.syncEquipModal(state);
    } else if (this.modal === "salvage") {
      this.renderSalvageModal(state);
    } else if (this.modal === "formation") {
      this.overlay.innerHTML = this.sheet("阵容编辑", `
        <p class="sheet-note">五个位置等价，点击位置后选择英雄。</p>
        <div class="formation-slots">${this.formationDraft.map((heroId, index) => `<button class="${this.formationSlot === index ? "selected" : ""}" data-action="formation-slot" data-slot="${index}"><span>${heroId ? HERO_BY_ID[heroId].name.slice(0, 1) : "+"}</span><small>${heroId ? HERO_BY_ID[heroId].name : "空位"}</small></button>`).join("")}</div>
        <div class="formation-picker">${HERO_DEFINITIONS.filter(({ id }) => state.save.roster[id].unlocked).map((hero) => `<button class="${this.formationDraft.includes(hero.id) ? "in-party" : ""}" data-action="formation-pick" data-hero-id="${hero.id}"><span style="--hero-color:${hero.color}">${hero.name.slice(0, 1)}</span><div><strong>${hero.name}</strong><small>${hero.role} · ${hero.tagline}</small></div></button>`).join("")}</div>
        <button class="primary-button wide" data-action="formation-save">保存并重新挑战</button>
      `);
    } else if (this.modal === "summon") {
      const summonResult = this.summonResultHero ? HERO_BY_ID[this.summonResultHero] : null;
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div><section class="full-modal summon-modal" role="dialog" aria-modal="true">
          <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          <small>${summonResult ? "星辉回应" : "星辉之门"}</small><h2>${summonResult ? "新英雄加入" : "英雄召唤"}</h2>
          ${
            summonResult
              ? `<div class="summon-result" style="--hero-color:${summonResult.color}"><div>${summonResult.name.slice(0, 1)}</div><h3>${summonResult.name} · ${summonResult.role}</h3><p>${summonResult.tagline}</p><strong>${ACTIVE_SKILL_BY_HERO[summonResult.id].name}</strong></div>`
              : `<div class="summon-orb"><span>✦</span></div><p>首次有效召唤固定解锁塞拉，第二次固定解锁海泽。之后重复英雄转为 20 印记。</p>`
          }
          <div class="summon-actions">
            <button data-action="summon-single" ${state.save.gems < 100 ? "disabled" : ""}>召唤 1 次<small>◆ 100</small></button>
            <button data-action="summon-five" ${state.save.gems < 450 ? "disabled" : ""}>召唤 5 次<small>◆ 450</small></button>
          </div>
          <em>Demo 固定解锁序列 · 非商业概率系统</em>
        </section>
      `;
    } else if (this.modal === "stage-confirm") {
      const stage = this.modalPayload as number;
      const definition = STAGE_DEFINITIONS[stage - 1]!;
      this.overlay.innerHTML = this.sheet("切换关卡", `<div class="confirm-card"><strong>${definition.id} · ${definition.name}</strong><p>切换后将重新开始本关讨伐，进度条会清空。</p><button class="primary-button wide" data-action="stage-confirm" data-stage="${stage}">开始挑战</button></div>`);
    } else if (this.modal === "clear-confirm") {
      this.overlay.innerHTML = this.sheet("确认清除存档？", `<div class="confirm-card danger"><p>英雄、装备、货币和关卡进度都会回到初始状态。此操作无法撤销。</p><button class="danger-button wide" data-action="clear-confirm">确认清除</button></div>`);
    } else if (this.modal === "tutorial") {
      const tutorial = [
        ["自动战斗", "小队会自动行走、寻找敌人并施放技能。"],
        ["自由阵容", "点击任意姓名板，可以替换五人阵容。"],
        ["收集战利品", "击败敌人后，装备会飞入背包。"],
        ["突破首领", "升级英雄、换上更强装备来击败首领。"],
        ["回刷关卡", "在关卡页可以选择已经解锁的关卡。"],
      ][this.tutorialStep]!;
      this.overlay.innerHTML = `
        <div class="tutorial-focus"></div><section class="tutorial-card" role="dialog" aria-modal="true">
          <small>${this.tutorialStep + 1} / 5</small><span class="tutorial-icon">${["⚔", "♟", "🎒", "⬆", "⚑"][this.tutorialStep]}</span>
          <h2>${tutorial[0]}</h2><p>${tutorial[1]}</p>
          <div><button class="text-button" data-action="tutorial-skip">跳过</button><button class="primary-button" data-action="tutorial-next">${this.tutorialStep === 4 ? "开始远征" : "下一步"}</button></div>
        </section>
      `;
    } else if (this.modal === "offline") {
      const reward = this.modalPayload as { minutes: number; gold: number; gearCount: number };
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div><section class="reward-modal" role="dialog" aria-modal="true">
          <span class="reward-sun">☀</span><small>欢迎归队</small><h2>离线收益</h2><p>小队巡逻了 ${reward.minutes} 分钟</p>
          <div class="reward-row"><div><span>●</span><strong>${compact(reward.gold)}</strong><small>金币</small></div><div><span>🎒</span><strong>${reward.gearCount}</strong><small>装备</small></div></div>
          <button class="primary-button wide" data-action="offline-claim">一键领取</button>
        </section>
      `;
    } else if (this.modal === "complete") {
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div><section class="reward-modal complete-modal" role="dialog" aria-modal="true">
          <span class="reward-sun">✦</span><small>第十章 · 北风关隘</small><h2>远征通关</h2>
          <p>北风关将已经倒下，小队走完青丘林地到北风关隘的十条主线。</p>
          <div class="completion-stats"><span><b>${MAX_STAGE}</b>关卡</span><span><b>${Object.keys(ITEM_BY_ID).length}</b>装备</span><span><b>10</b>品阶</span></div>
          <button class="primary-button wide" data-action="close-modal">继续回刷 10-12</button>
        </section>
      `;
    }
  }

  private sheet(title: string, content: string): string {
    return `<div class="modal-backdrop" data-action="close-modal"></div><section class="bottom-sheet" role="dialog" aria-modal="true"><header><h2>${title}</h2><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></header>${content}</section>`;
  }

  private onClick(event: Event): void {
    const origin = event.target as Element | null;
    const target = origin?.closest?.<HTMLElement>("[data-action]") ?? null;
    const action = target?.dataset.action;

    if (this.alchemyPreviewId && action !== "alchemy-list-toggle") {
      this.alchemyPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
      if (!action) {
        if (this.store.getState().ui.activeTab === "alchemy") {
          this.renderAlchemy(this.store.getState());
        }
        return;
      }
    }

    if (!target || !action) return;
    this.options.onSoundRequested?.("button");
    if (action === "select-tab") this.store.dispatch({ type: "ui:selectTab", tab: target.dataset.tab as keyof typeof tabMeta });
    else if (action === "open-stages") this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    else if (action === "alchemy-auto-fill") {
      const state = this.store.getState();
      const candidates = alchemyCandidateItems(state.save.inventory, this.alchemyEquipmentMaps(state));
      const picked = pickAlchemyAutoFill(candidates);
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, (_, index) => picked[index] ?? null);
      this.alchemyPreviewId = null;
      this.renderAlchemy(state);
    } else if (action === "alchemy-clear") {
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
      this.alchemyPreviewId = null;
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-slot-clear") {
      const slot = Number(target.dataset.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= ALCHEMY_SLOT_COUNT) return;
      this.alchemySlots[slot] = null;
      this.alchemyPreviewId = null;
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-list-toggle") {
      const itemId = target.dataset.itemId;
      if (!itemId) return;
      const existing = this.alchemySlots.indexOf(itemId);
      if (existing >= 0) {
        this.alchemySlots[existing] = null;
      } else {
        const empty = this.alchemySlots.indexOf(null);
        if (empty < 0) {
          this.showToast("魔方已满");
        } else {
          this.alchemySlots[empty] = itemId;
        }
      }
      this.alchemyPreviewId = itemId;
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-craft") {
      const itemIds = this.alchemySlots.filter((id): id is string => Boolean(id));
      if (itemIds.length !== ALCHEMY_SLOT_COUNT) return;
      this.store.dispatch({ type: "alchemy:craft", itemIds });
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
      this.alchemyPreviewId = null;
    } else if (action === "toggle-speed") this.store.dispatch({ type: "battle:setSpeed", speed: this.store.getState().save.settings.battleSpeed === 1 ? 2 : 1 });
    else if (action === "settings") this.openModal("settings");
    else if (action === "currency-info") {
      this.modalPayload = target.dataset.currency;
      this.openModal("currency");
    } else if (action === "close-modal") this.closeModal();
    else if (action === "item-detail") {
      this.selectedItemId = target.dataset.itemId ?? null;
      const tipItem = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      if (tipItem) this.equipFocusSlot = tipItem.slot;
      this.equipTargetHeroId = this.pickEquipTargetHero(this.store.getState());
      this.openModal("item-tips");
    } else if (action === "inventory-organize") {
      this.inventoryFilter = "all";
      this.store.dispatch({ type: "item:organize" });
      this.showToast("背包已整理");
    } else if (action === "inventory-salvage-open") {
      this.openSalvageModal();
    } else if (action === "salvage-rarity-toggle") {
      const rarity = target.dataset.rarity as Rarity | undefined;
      if (!rarity || !(RARITY_ORDER as readonly string[]).includes(rarity)) return;
      if (this.salvageRarityFilter.has(rarity)) {
        if (this.salvageRarityFilter.size <= 1) return;
        this.salvageRarityFilter.delete(rarity);
      } else {
        this.salvageRarityFilter.add(rarity);
      }
      this.syncSalvageSelection(this.store.getState());
      this.renderModal();
    } else if (action === "salvage-toggle-item") {
      const itemId = target.dataset.itemId;
      if (!itemId) return;
      if (this.salvageSelectedIds.has(itemId)) this.salvageSelectedIds.delete(itemId);
      else this.salvageSelectedIds.add(itemId);
      this.renderModal();
    } else if (action === "salvage-select-visible") {
      this.syncSalvageSelection(this.store.getState());
      this.renderModal();
    } else if (action === "salvage-clear-selection") {
      this.salvageSelectedIds.clear();
      this.renderModal();
    } else if (action === "salvage-confirm") {
      const ids = [...this.salvageSelectedIds];
      if (!ids.length) return;
      const beforeGold = this.store.getState().save.gold;
      this.store.dispatch({ type: "item:salvageMany", itemIds: ids });
      const gained = this.store.getState().save.gold - beforeGold;
      this.salvageSelectedIds.clear();
      this.closeModal();
      this.showToast(gained > 0 ? `分解获得 ● ${gained}` : "没有可分解的装备");
    } else if (action === "item-salvage") {
      if (!this.selectedItemId) return;
      const item = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      const gold = item ? getSalvageGold(item) : 0;
      this.store.dispatch({ type: "item:salvage", itemId: this.selectedItemId });
      this.selectedItemId = null;
      this.closeModal();
      if (gold > 0) this.showToast(`分解获得 ● ${gold}`);
    } else if (action === "item-open-equip") {
      const tipItem = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      if (!tipItem) return this.closeModal();
      this.equipFocusSlot = tipItem.slot;
      this.equipTargetHeroId = this.pickEquipTargetHero(this.store.getState());
      this.openModal("equip");
    } else if (action === "equip-hero-select") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !this.partyHeroIds(this.store.getState()).includes(heroId)) return;
      if (heroId === this.equipTargetHeroId) return;
      this.equipTargetHeroId = heroId;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-slot-focus") {
      const slot = target.dataset.slot as EquipmentSlot | undefined;
      if (!slot || !(EQUIPMENT_SLOTS as readonly string[]).includes(slot)) return;
      this.equipFocusSlot = slot;
      const equippedId = this.store.getState().save.roster[this.equipTargetHeroId]?.equipment[slot];
      this.selectedItemId = equippedId ?? null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-candidate-select") {
      const itemId = target.dataset.itemId;
      if (!itemId || itemId === this.selectedItemId) return;
      if (this.isOwnedByOtherHero(this.store.getState(), itemId)) return;
      this.selectedItemId = itemId;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-item") {
      const heroId = this.equipTargetHeroId;
      if (!this.selectedItemId) return;
      if (this.isOwnedByOtherHero(this.store.getState(), this.selectedItemId)) return;
      this.store.dispatch({ type: "item:equip", heroId, itemId: this.selectedItemId });
      this.showToast(`已装备到 ${HERO_BY_ID[heroId].name}`);
    } else if (action === "unequip-item") {
      const heroId = this.equipTargetHeroId;
      if (!this.selectedItemId) return;
      this.store.dispatch({ type: "item:unequip", heroId, itemId: this.selectedItemId });
      this.showToast("已卸下装备");
      this.syncEquipModal(this.store.getState());
    } else if (action === "shop-buy") this.store.dispatch({ type: "shop:buy", offerId: target.dataset.offerId! });
    else if (action === "shop-refresh") this.store.dispatch({ type: "shop:refresh" });
    else if (action === "hero-detail") {
      this.selectedHeroId = target.dataset.heroId as HeroId;
      this.renderPanel(this.store.getState());
    } else if (action === "hero-level") this.store.dispatch({ type: "hero:levelUp", heroId: target.dataset.heroId as HeroId });
    else if (action === "summon-open") {
      this.summonResultHero = null;
      this.openModal("summon");
    }
    else if (action === "summon-single") this.store.dispatch({ type: "summon:single" });
    else if (action === "summon-five") this.store.dispatch({ type: "summon:five" });
    else if (action === "formation") {
      this.formationDraft = [...this.store.getState().save.party];
      this.openModal("formation");
    } else if (action === "formation-slot") {
      this.formationSlot = Number(target.dataset.slot);
      this.renderModal();
    } else if (action === "formation-pick") {
      const heroId = target.dataset.heroId as HeroId;
      const previousIndex = this.formationDraft.indexOf(heroId);
      if (previousIndex >= 0) this.formationDraft[previousIndex] = this.formationDraft[this.formationSlot] ?? null;
      this.formationDraft[this.formationSlot] = heroId;
      this.formationSlot = Math.min(4, this.formationSlot + 1);
      this.renderModal();
    } else if (action === "formation-save") {
      this.store.dispatch({ type: "party:commit", party: [...this.formationDraft] });
      this.options.onPartySaved?.();
      this.closeModal();
      this.showToast("阵容已应用，重新挑战当前关");
    } else if (action === "stage-select") {
      this.modalPayload = Number(target.dataset.stage);
      this.openModal("stage-confirm");
    } else if (action === "stage-confirm") {
      const stage = Number(target.dataset.stage);
      this.store.dispatch({ type: "stage:select", stage });
      this.options.onStageSelected?.(stage);
      this.closeModal();
    } else if (action === "tutorial-next") {
      if (this.tutorialStep >= 4) {
        this.store.dispatch({ type: "tutorial:complete" });
        this.closeModal();
      } else {
        this.tutorialStep += 1;
        this.renderModal();
      }
    } else if (action === "tutorial-skip") {
      this.store.dispatch({ type: "tutorial:complete" });
      this.closeModal();
    } else if (action === "clear-save") this.openModal("clear-confirm");
    else if (action === "clear-confirm") this.options.onClearSave?.();
    else if (action === "offline-claim") {
      const payload = this.modalPayload as { onClaim?: () => void };
      payload.onClaim?.();
      this.closeModal();
      this.showToast("离线收益已领取");
    }
  }

  private onChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const action = target.dataset.action;
    if (action === "inventory-filter") {
      this.inventoryFilter = target.value as typeof this.inventoryFilter;
      this.renderPanel(this.store.getState());
    } else if (action === "salvage-slot-filter") {
      this.salvageSlotFilter = target.value as typeof this.salvageSlotFilter;
      this.syncSalvageSelection(this.store.getState());
      this.renderModal();
    } else if (action === "sound-toggle") {
      this.store.dispatch({ type: "settings:update", patch: { soundEnabled: (target as HTMLInputElement).checked } });
    } else if (action === "motion-toggle") {
      this.store.dispatch({ type: "settings:update", patch: { reducedMotion: (target as HTMLInputElement).checked } });
    }
  }

  private presentAppEvents(events: readonly AppEvent[]): void {
    for (const event of events) {
      if (event.type === "toast") this.showToast(event.message);
      if (event.type === "hero:leveled") this.showToast(`${HERO_BY_ID[event.heroId].name} 升至 Lv.${event.level}`);
      if (event.type === "hero:unlocked") {
        this.summonResultHero = event.heroId;
        this.showToast(`新英雄加入 · ${HERO_BY_ID[event.heroId].name}`);
        this.renderModal();
      }
    }
  }

  private openModal(name: string): void {
    this.modal = name;
    this.renderModal();
  }

  private closeModal(): void {
    this.modal = null;
    this.modalPayload = null;
    this.renderModal();
  }

  private showToast(message: string): void {
    const toast = this.root.querySelector<HTMLElement>(".toast-stack")!;
    toast.textContent = message;
    toast.classList.add("show");
    this.liveRegion.textContent = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  private showBanner(message: string, kind: string): void {
    const frame = this.root.querySelector(".battle-frame");
    frame?.querySelector(".battle-banner")?.remove();
    const banner = document.createElement("div");
    banner.className = `battle-banner ${kind}`;
    banner.textContent = message;
    frame?.append(banner);
    setTimeout(() => banner.remove(), kind === "boss" ? 1100 : 800);
  }
}
