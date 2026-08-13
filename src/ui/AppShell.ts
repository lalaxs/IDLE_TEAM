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
import {
  backpackItems,
  compareInventoryItems,
  countBackpackItems,
  describeItemAffixes,
  getItemScore,
  getSalvageGold,
  type InventoryItem,
} from "../progression/EquipmentSystem";
import {
  getEquipmentBonuses,
  getHeroCombatDisplayStats,
} from "../progression/EquipmentBonuses";
import {
  ALCHEMY_SLOT_COUNT,
  alchemyCandidateItems,
  pickAlchemyAutoFill,
  validateAlchemyInputs,
} from "../progression/AlchemySystem";
import { getStarUpgradeCost, getUpgradeCost, MAX_HERO_STARS } from "../progression/HeroProgression";
import {
  ABILITY_DEFINITIONS,
  COMBAT_ABILITIES,
  ECONOMY_ABILITIES,
  GENERAL_ABILITIES,
  abilityCardMeta,
  getBackpackCapacity,
} from "../progression/AbilitySystem";
import {
  ABILITY_CATEGORY_TABS,
  type AbilityCategory,
  type AbilityId,
} from "../content/abilities";
import type { GameStore, GameStoreState } from "../app/GameStore";
import type { AppEvent, SummonPullResult } from "../app/events";
import type { BattleEvent, BattleSnapshot, HeroId } from "../simulation/types";
import {
  getLootChestLabel,
  getLootChestProgress,
  LOOT_CHEST_MAX_LEVEL,
} from "../progression/LootChestSystem";
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
/** Max attribute rows in the left column before overflowing to the right. */
const EQUIP_STATS_LEFT_CAPACITY = 10;
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
function itemSchoolLabel(item: InventoryItem): string {
  return ITEM_BY_ID[item.definitionId]!.school === "magic" ? "法系" : "物理";
}

function itemKindLabel(item: InventoryItem): string {
  return `${slotLabel[item.slot]} · ${itemSchoolLabel(item)}`;
}

/** Two-column equipment detail: left meta, right stats/effects. */
function itemDetailSheet(item: InventoryItem, options: { showPower?: boolean } = {}): string {
  const definition = ITEM_BY_ID[item.definitionId]!;
  const trait = item.traitId ? TRAIT_BY_ID[item.traitId] : null;
  const set = definition.setId ? SET_BY_ID[definition.setId] : null;
  const base = itemBaseLines(item);
  const affixes = describeItemAffixes(item);
  const showPower = options.showPower !== false;

  const baseHtml = base.length
    ? base.map((line) => `<div class="item-stat-line">${line}</div>`).join("")
    : `<div class="item-stat-line muted">无固定属性</div>`;
  const affixHtml = affixes.length
    ? affixes.map((line) => `<div class="item-stat-line affix">${line}</div>`).join("")
    : `<div class="item-stat-line muted">无词条</div>`;

  const effects: string[] = [];
  if (set) {
    effects.push(
      `<div class="item-effect-line">套装 · ${set.name}<small>同套 2/4/6 件激活加成</small></div>`,
    );
  }
  if (trait) {
    effects.push(
      `<div class="item-effect-line">传奇 · ${trait.name}<small>${trait.description}</small></div>`,
    );
  }
  const effectHtml = effects.length
    ? effects.join("")
    : `<div class="item-effect-line muted">无特殊效果</div>`;

  return `
    <div class="item-detail-sheet">
      <div class="item-detail-left">
        <div class="detail-icon item-detail-icon ${rarityClass(item.rarity)}">${equipmentArt(definition.icon)}</div>
        <strong class="item-detail-name">${definition.name}</strong>
        <span class="item-detail-kind">${itemKindLabel(item)}</span>
        <span class="item-detail-rarity">${RARITY_LABELS[item.rarity]}</span>
        ${showPower ? `<p class="equip-power">战力 ${getItemScore(item)}</p>` : ""}
      </div>
      <div class="item-detail-right">
        <section class="item-detail-section" aria-label="固定属性">
          <small class="item-stat-heading">固定属性</small>
          ${baseHtml}
        </section>
        <section class="item-detail-section" aria-label="词条">
          <small class="item-stat-heading">词条</small>
          ${affixHtml}
        </section>
        <section class="item-detail-section" aria-label="特殊效果">
          <small class="item-stat-heading">特殊效果</small>
          ${effectHtml}
        </section>
      </div>
    </div>
  `;
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
  private equipPanelTab: "gear" | "stats" = "gear";
  private equipTipsKind: "compare" | "unequip" | "skill" | null = null;
  private equipSkillTipsKind: "active" | "passive" | null = null;
  private inventoryFilter: EquipmentSlot | "all" = "all";
  private salvageSlotFilter: EquipmentSlot | "all" = "all";
  private salvageRarityFilter: Set<Rarity> = new Set<Rarity>(["common"]);
  private salvageSelectedIds: Set<string> = new Set();
  private shopPanel: "daily" | "abilities" = "daily";
  private abilityCategory: AbilityCategory = "economy";
  private selectedAbilityId: AbilityId | null = null;
  private alchemySlots: (string | null)[] = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
  private alchemyPreviewId: string | null = null;
  private itemTipsSource: "inventory" | "alchemy" = "inventory";
  private modal: string | null = null;
  private modalPayload: unknown = null;
  private tutorialStep = 0;
  private formationDraft: GameStoreState["save"]["party"];
  private formationSlot = 0;
  private summonResults: SummonPullResult[] | null = null;
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
          <div class="loot-chest-dock" aria-label="奖励宝箱">
            <button type="button" class="loot-chest-badge" data-action="loot-chest-info" data-level="1" aria-label="奖励宝箱">
              <span class="loot-chest-icon" aria-hidden="true">▣</span>
              <span class="loot-chest-tier">Lv.1</span>
            </button>
            <div class="loot-chest-meter" role="progressbar" aria-label="宝箱充能" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="loot-chest-fill"></span>
              <span class="loot-chest-label">充能 0%</span>
            </div>
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
      const onlyChestCharge =
        events.length > 0 &&
        events.every(({ type }) => type === "lootChest:charged");
      if (onlyChestCharge) {
        this.renderLootChest(state);
        return;
      }
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
    this.renderLootChest(state);
    this.renderParty(state);
    this.renderPanel(state);
    this.renderNav(state);
    if (this.modal) this.renderModal();
  }

  private renderLootChest(state: GameStoreState): void {
    const chest = state.save.lootChest;
    const progress = getLootChestProgress(chest);
    const percent = Math.round(progress * 100);
    const badge = this.root.querySelector<HTMLElement>(".loot-chest-badge");
    const meter = this.root.querySelector<HTMLElement>(".loot-chest-meter");
    const fill = this.root.querySelector<HTMLElement>(".loot-chest-fill");
    const label = this.root.querySelector<HTMLElement>(".loot-chest-label");
    const tier = this.root.querySelector<HTMLElement>(".loot-chest-tier");
    if (!badge || !meter || !fill || !label || !tier) return;
    badge.dataset.level = String(chest.level);
    badge.setAttribute(
      "aria-label",
      `${getLootChestLabel(chest.level)} Lv.${chest.level}/${LOOT_CHEST_MAX_LEVEL}`,
    );
    tier.textContent = `Lv.${chest.level}`;
    meter.setAttribute("aria-valuenow", String(percent));
    fill.style.width = `${percent}%`;
    label.textContent =
      chest.level >= LOOT_CHEST_MAX_LEVEL
        ? `满级充能 ${percent}%`
        : `充能 ${percent}%`;
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
    const equippedIds = this.equippedInstanceIds(state);
    const sorted = backpackItems(state.save.inventory, equippedIds)
      .filter((item) => this.inventoryFilter === "all" || item.slot === this.inventoryFilter)
      .sort(compareInventoryItems);
    const occupied = countBackpackItems(state.save.inventory, equippedIds);
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="inventory">
        <span class="panel-meta" aria-label="背包容量">${occupied}/${getBackpackCapacity(state.save.abilities)}</span>
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
    const equipped = this.equippedInstanceIds(state);
    return backpackItems(state.save.inventory, equipped)
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
        aria-label="${slotLabel[slot]}${equipped && definition ? `：${definition.name}，点击查看` : "：空，点击筛选该槽位装备"}"
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
          <p>${tone === "current" ? "该槽位暂无装备" : "请选择装备"}</p>
        </article>
      `;
    }
    return `
      <article class="equip-compare-card ${tone} ${rarityClass(item.rarity)}">
        <span class="compare-label">${label}</span>
        ${itemDetailSheet(item)}
      </article>
    `;
  }

  private renderEquipPanelTabs(): string {
    return `
      <div class="equip-panel-tabs" role="tablist" aria-label="装备与属性">
        <button
          type="button"
          role="tab"
          class="equip-panel-tab ${this.equipPanelTab === "gear" ? "active" : ""}"
          data-action="equip-panel-tab"
          data-tab="gear"
          aria-selected="${this.equipPanelTab === "gear" ? "true" : "false"}"
        >装备</button>
        <button
          type="button"
          role="tab"
          class="equip-panel-tab ${this.equipPanelTab === "stats" ? "active" : ""}"
          data-action="equip-panel-tab"
          data-tab="stats"
          aria-selected="${this.equipPanelTab === "stats" ? "true" : "false"}"
        >属性</button>
      </div>
    `;
  }

  private formatStatValue(value: number, digits = 0): string {
    if (!Number.isFinite(value)) return "0";
    if (digits <= 0) return String(Math.round(value));
    const fixed = value.toFixed(digits);
    return fixed.replace(/\.?0+$/, "");
  }

  private getEquipStatsContent(state: GameStoreState, heroId: HeroId): {
    leftHtml: string;
    rightHtml: string;
    skillsHtml: string;
  } {
    const progress = state.save.roster[heroId];
    const bonus = getEquipmentBonuses(state.save)[heroId] ?? {};
    const stats = getHeroCombatDisplayStats(heroId, progress.level, bonus);
    const schoolLabel = stats.damageSchool === "magic" ? "魔法" : "物理";
    const rows: Array<{ label: string; value: string; hide?: boolean }> = [
      { label: "生命", value: this.formatStatValue(stats.maxHp) },
      { label: "攻击", value: this.formatStatValue(stats.attack) },
      { label: "防御", value: this.formatStatValue(stats.defense) },
      { label: "暴击率", value: `${this.formatStatValue(stats.critChancePct, 1)}%` },
      { label: "暴击伤害", value: `${this.formatStatValue(stats.critDamagePct, 1)}%` },
      { label: "攻击间隔", value: `${this.formatStatValue(stats.attackIntervalMs)}ms` },
      { label: "攻击速度", value: `+${this.formatStatValue(stats.attackSpeedPct, 1)}%` },
      { label: "攻击射程", value: this.formatStatValue(stats.attackRange) },
      { label: "移动速度", value: this.formatStatValue(stats.moveSpeed, 1) },
      { label: "伤害类型", value: schoolLabel },
      { label: "全伤害", value: `+${this.formatStatValue(stats.damagePct, 1)}%`, hide: stats.damagePct <= 0 },
      { label: "普攻伤害", value: `+${this.formatStatValue(stats.primaryAttackPct, 1)}%`, hide: stats.primaryAttackPct <= 0 },
      { label: "技能伤害", value: `+${this.formatStatValue(stats.skillDamagePct, 1)}%`, hide: stats.skillDamagePct <= 0 },
      { label: "物理伤害", value: `+${this.formatStatValue(stats.physicalDamagePct, 1)}%`, hide: stats.physicalDamagePct <= 0 },
      { label: "法术伤害", value: `+${this.formatStatValue(stats.magicDamagePct, 1)}%`, hide: stats.magicDamagePct <= 0 },
      { label: "精英伤害", value: `+${this.formatStatValue(stats.eliteDamagePct, 1)}%`, hide: stats.eliteDamagePct <= 0 },
      { label: "冷却缩减", value: `${this.formatStatValue(stats.skillCooldownPct, 1)}%` },
      { label: "技能冷却", value: `${this.formatStatValue(stats.skillCooldownMs)}ms` },
      { label: "伤害减免", value: `${this.formatStatValue(stats.damageReductionPct, 1)}%`, hide: stats.damageReductionPct <= 0 },
      { label: "击中回血", value: this.formatStatValue(stats.lifeOnHit), hide: stats.lifeOnHit <= 0 },
      { label: "生命偷取", value: `${this.formatStatValue(stats.lifeStealPct, 1)}%`, hide: stats.lifeStealPct <= 0 },
      { label: "每秒回血", value: this.formatStatValue(stats.hpRegenPerSec, 1), hide: stats.hpRegenPerSec <= 0 },
      { label: "闪避", value: `${this.formatStatValue(stats.dodgeChancePct, 1)}%`, hide: stats.dodgeChancePct <= 0 },
      { label: "格挡", value: `${this.formatStatValue(stats.blockChancePct, 1)}%`, hide: stats.blockChancePct <= 0 },
      { label: "移动速度加成", value: `+${this.formatStatValue(stats.moveSpeedPct, 1)}%`, hide: stats.moveSpeedPct <= 0 },
      { label: "处决伤害", value: `+${this.formatStatValue(stats.executeDamagePct, 1)}%`, hide: stats.executeDamagePct <= 0 },
      { label: "守护护盾", value: `${this.formatStatValue(stats.guardianShieldPct, 1)}%`, hide: stats.guardianShieldPct <= 0 },
      { label: "反伤", value: `${this.formatStatValue(stats.thornsPct, 1)}%`, hide: stats.thornsPct <= 0 },
      { label: "回春", value: `${this.formatStatValue(stats.renewalPct, 1)}%`, hide: stats.renewalPct <= 0 },
      { label: "霜咬几率", value: `${this.formatStatValue(stats.frostbiteChancePct, 1)}%`, hide: stats.frostbiteChancePct <= 0 },
      { label: "雪护护盾", value: `${this.formatStatValue(stats.snowguardShieldPct, 1)}%`, hide: stats.snowguardShieldPct <= 0 },
      { label: "霜聚冷却", value: `${this.formatStatValue(stats.frostfocusCooldownPct, 1)}%`, hide: stats.frostfocusCooldownPct <= 0 },
      { label: "沙痕几率", value: `${this.formatStatValue(stats.sandscarChancePct, 1)}%`, hide: stats.sandscarChancePct <= 0 },
      { label: "幻影减伤", value: `${this.formatStatValue(stats.mirageGuardPct, 1)}%`, hide: stats.mirageGuardPct <= 0 },
      { label: "迅风", value: `${this.formatStatValue(stats.tailwindPct, 1)}%`, hide: stats.tailwindPct <= 0 },
      { label: "雷霆增伤", value: `${this.formatStatValue(stats.thunderbrandPct, 1)}%`, hide: stats.thunderbrandPct <= 0 },
      { label: "云纱护盾", value: `${this.formatStatValue(stats.cloudveilShieldPct, 1)}%`, hide: stats.cloudveilShieldPct <= 0 },
      { label: "风暴护盾", value: `${this.formatStatValue(stats.stormwardShieldPct, 1)}%`, hide: stats.stormwardShieldPct <= 0 },
    ];
    const visible = rows.filter((row) => !row.hide);
    const left = visible.slice(0, EQUIP_STATS_LEFT_CAPACITY);
    const right = visible.slice(EQUIP_STATS_LEFT_CAPACITY);
    const renderCol = (items: typeof visible) =>
      items
        .map((row) => `<div class="equip-stat-row"><span>${row.label}</span><b>${row.value}</b></div>`)
        .join("");
    return {
      leftHtml: `<div class="equip-stats-side" aria-label="属性左栏">${renderCol(left)}</div>`,
      rightHtml: `<div class="equip-stats-side" aria-label="属性右栏">${
        right.length ? renderCol(right) : ""
      }</div>`,
      skillsHtml: this.renderEquipSkills(state, heroId),
    };
  }

  private renderEquipSkills(state: GameStoreState, heroId: HeroId): string {
    const active = ACTIVE_SKILL_BY_HERO[heroId];
    const passive = PASSIVE_SKILL_BY_HERO[heroId];
    const progress = state.save.roster[heroId];
    const levelCost = getUpgradeCost(progress.level);
    const atMaxLevel = progress.level >= 20;
    const canLevelUp = !atMaxLevel && state.save.gold >= levelCost;
    const starCost = getStarUpgradeCost(progress.stars);
    const atMaxStar = starCost == null || progress.stars >= MAX_HERO_STARS;
    const needed = starCost ?? 0;
    const have = progress.marks;
    const fillPct = atMaxStar ? 100 : Math.min(100, Math.round((have / Math.max(1, needed)) * 100));
    const canStarUp = !atMaxStar && have >= needed;
    return `
      <div class="equip-skill-section" aria-label="英雄技能、升级与升星">
        <div class="equip-skill-list" aria-label="技能栏">
          <button
            type="button"
            class="equip-skill-tile"
            data-action="equip-skill-tips"
            data-skill-kind="active"
            aria-label="查看主动技能 ${active.name}"
          >
            <span class="equip-skill-tile-tag" aria-hidden="true">技</span>
            <strong class="equip-skill-name">${active.name}</strong>
          </button>
          <button
            type="button"
            class="equip-skill-tile"
            data-action="equip-skill-tips"
            data-skill-kind="passive"
            aria-label="查看被动技能 ${passive.name}"
          >
            <span class="equip-skill-tile-tag" aria-hidden="true">被</span>
            <strong class="equip-skill-name">${passive.name}</strong>
          </button>
          <div class="equip-skill-tile empty" aria-hidden="true"></div>
          <div class="equip-skill-tile empty" aria-hidden="true"></div>
        </div>
        <div class="equip-level-frame" aria-label="角色升级">
          <div class="equip-level-icon" aria-hidden="true"><span>Lv</span></div>
          <div class="equip-level-frame-main">
            <div class="equip-level-cost">${
              atMaxLevel ? `Lv.${progress.level} · 已达上限` : `升级费用 · ● ${compact(levelCost)}`
            }</div>
            <button
              type="button"
              class="primary-button compact"
              data-action="hero-level"
              data-hero-id="${heroId}"
              ${canLevelUp ? "" : "disabled"}
            >升级</button>
          </div>
        </div>
        <div class="equip-star-frame" aria-label="角色升星">
          <div class="equip-fragment-icon" aria-hidden="true"><span>碎</span></div>
          <div class="equip-star-frame-main">
            <div class="equip-fragment-meter" role="progressbar" aria-label="角色碎片进度" aria-valuemin="0" aria-valuemax="${
              atMaxStar ? 100 : needed
            }" aria-valuenow="${atMaxStar ? 100 : have}">
              <span class="equip-fragment-fill" style="width:${fillPct}%"></span>
              <span class="equip-fragment-label">${
                atMaxStar ? `碎片 ${have} · 满星` : `碎片 ${have}/${needed}`
              }</span>
            </div>
            <button
              type="button"
              class="primary-button compact"
              data-action="hero-star-up"
              data-hero-id="${heroId}"
              ${canStarUp ? "" : "disabled"}
            >升星</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSkillTips(heroId: HeroId): string {
    const kind = this.equipSkillTipsKind;
    if (!kind) return "";
    const skill = kind === "active" ? ACTIVE_SKILL_BY_HERO[heroId] : PASSIVE_SKILL_BY_HERO[heroId];
    const kindLabel = kind === "active" ? "主动技能" : "被动技能";
    const cooldown =
      kind === "active" && skill.cooldownMs != null
        ? `${Math.round(skill.cooldownMs / 100) / 10}s`
        : null;
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭技能详情"></div>
        <section class="equip-tips-panel skill-tips" role="dialog" aria-modal="true" aria-label="${kindLabel}">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <div class="equip-skill-tips-head">
            <div class="equip-skill-icon large" aria-hidden="true"><span>${kind === "active" ? "技" : "被"}</span></div>
            <div>
              <small>${kindLabel}${cooldown ? ` · CD ${cooldown}` : ""}</small>
              <h3>${skill.name}</h3>
            </div>
          </div>
          <p class="equip-skill-tips-desc">${skill.description}</p>
          ${
            cooldown
              ? `<p class="equip-skill-tips-cd">冷却时间 <b>${cooldown}</b></p>`
              : `<p class="equip-skill-tips-cd muted">被动效果，无冷却</p>`
          }
        </section>
      </div>
    `;
  }

  private renderEquipTipsLayer(
    state: GameStoreState,
    equipped: InventoryItem | null,
    selected: InventoryItem | null,
    heroName: string,
  ): string {
    if (!this.equipTipsKind) return "";
    if (this.equipTipsKind === "unequip") {
      if (!equipped) return "";
      return `
        <div class="equip-slot-tips-host" role="presentation">
          <aside class="equip-slot-tips ${rarityClass(equipped.rarity)}" role="dialog" aria-label="已装备详情">
            <button type="button" class="equip-slot-tips-close" data-action="close-equip-tips" aria-label="关闭">×</button>
            <span class="compare-label">已装备</span>
            ${itemDetailSheet(equipped)}
            <button type="button" class="secondary-button wide compact" data-action="unequip-item">卸下</button>
          </aside>
        </div>
      `;
    }
    if (!selected) return "";
    const currentScore = equipped ? getItemScore(equipped) : 0;
    const nextScore = getItemScore(selected);
    const alreadyEquipped = Boolean(equipped && equipped.instanceId === selected.instanceId);
    const scoreDelta = nextScore - currentScore;
    const summary = alreadyEquipped
      ? "当前角色已装备此物"
      : equipped
        ? `战力 ${currentScore} → ${nextScore}${scoreDelta === 0 ? "" : `（${scoreDelta > 0 ? "+" : ""}${scoreDelta}）`}`
        : `战力 ${nextScore} · 该槽位暂无装备`;
    const summaryClass =
      alreadyEquipped || scoreDelta === 0 || !equipped ? "" : scoreDelta > 0 ? "upgrade" : "downgrade";
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭装备对比"></div>
        <section class="equip-tips-panel compare" role="dialog" aria-modal="true" aria-label="装备对比">
          <div class="equip-tips-board">
            ${this.renderCompareCard(equipped, "已装备", "current")}
            ${this.renderCompareCard(selected, "未装备", "selected")}
          </div>
          <p class="equip-compare-summary ${summaryClass}">${summary}</p>
          <div class="equip-tips-actions">
            ${
              alreadyEquipped
                ? `<button type="button" class="secondary-button wide" data-action="unequip-item">卸下</button>`
                : `<button type="button" class="primary-button wide" data-action="equip-item">装备到 ${heroName}</button>`
            }
          </div>
        </section>
      </div>
    `;
  }

  private renderItemTips(state: GameStoreState): void {
    const item = state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
    if (!item) {
      this.closeModal();
      return;
    }
    const salvageGold = getSalvageGold(item);
    const fromAlchemy = this.itemTipsSource === "alchemy";
    const inCube = fromAlchemy && this.alchemySlots.includes(item.instanceId);
    const actions = fromAlchemy
      ? `
        <div class="item-tips-actions">
          <button class="secondary-button" data-action="item-salvage">分解 · ● ${compact(salvageGold)}</button>
          <button class="primary-button" data-action="${inCube ? "alchemy-item-remove" : "alchemy-item-put"}">
            ${inCube ? "取出" : "放入"}
          </button>
        </div>`
      : `
        <div class="item-tips-actions">
          <button class="secondary-button" data-action="item-salvage">分解 · ● ${compact(salvageGold)}</button>
          <button class="primary-button" data-action="item-open-equip">装备</button>
        </div>`;
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal ${rarityClass(item.rarity)}" role="dialog" aria-modal="true" aria-label="装备详情">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        ${itemDetailSheet(item)}
        ${actions}
      </section>
    `;
  }

  private equipCandidates(state: GameStoreState): InventoryItem[] {
    const equipped = this.equippedInstanceIds(state);
    return backpackItems(state.save.inventory, equipped)
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
    this.selectedItemId = null;
    return null;
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
    const targetProgress = state.save.roster[this.equipTargetHeroId];
    if (!targetProgress?.unlocked) {
      const party = this.partyHeroIds(state);
      this.equipTargetHeroId = party[0] ?? this.selectedHeroId;
    }
    const candidates = this.equipCandidates(state);
    const item = this.resolveSelectedEquipItem(state);
    const focusSlot = this.equipFocusSlot;
    const heroId = this.equipTargetHeroId;
    const hero = HERO_BY_ID[heroId];
    const progress = state.save.roster[heroId];
    const equippedId = progress.equipment[focusSlot];
    const equipped = equippedId
      ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId) ?? null
      : null;

    if (this.equipTipsKind === "compare" && !item) this.equipTipsKind = null;
    if (this.equipTipsKind === "unequip" && !equipped) this.equipTipsKind = null;
    if (this.equipTipsKind === "skill" && this.equipPanelTab !== "stats") {
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
    }

    const portrait = ASSET_MANIFEST.characters[heroId];

    let modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal");
    if (!modal) {
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="equip-modal character-equip-modal" role="dialog" aria-modal="true" aria-label="英雄属性">
          <header class="character-equip-header">
            <h2>英雄属性</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          ${this.renderEquipPartyStrip(state)}
          <div class="equip-panel-tabs-host"></div>
          <div class="equip-panel-body">
            <div class="character-loadout">
              <section class="character-loadout-col left" aria-label="左侧栏">
                <div class="equip-slot-grid gear"></div>
                <div class="equip-stats-col left" hidden></div>
              </section>
              <div class="character-portrait-stage">
                <img class="character-portrait-art" alt="" />
                <div class="character-portrait-meta">
                  <span class="character-portrait-stars" aria-label="星级"></span>
                  <strong></strong>
                  <small></small>
                </div>
              </div>
              <section class="character-loadout-col right" aria-label="右侧栏">
                <div class="equip-slot-grid accessories"></div>
                <div class="equip-stats-col right" hidden></div>
              </section>
            </div>
            <div class="equip-bottom-host">
              <div class="equip-candidate-section">
                <small class="equip-candidate-label"></small>
                <div class="equip-candidate-grid item-grid" aria-label="可选装备"></div>
              </div>
              <div class="equip-skill-host" hidden></div>
            </div>
          </div>
          <div class="equip-tips-host"></div>
        </section>
      `;
      modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal")!;
      const createdGrid = modal.querySelector<HTMLElement>(".equip-candidate-grid");
      if (createdGrid) bindDragScroll(createdGrid);
    }

    const tabsHost = modal.querySelector(".equip-panel-tabs-host");
    if (tabsHost) tabsHost.innerHTML = this.renderEquipPanelTabs();

    for (const plate of modal.querySelectorAll<HTMLElement>(".equip-party-strip .nameplate[data-hero-id]")) {
      const selected = plate.dataset.heroId === heroId;
      plate.classList.toggle("selected", selected);
      plate.setAttribute("aria-pressed", selected ? "true" : "false");
    }

    const showGear = this.equipPanelTab === "gear";
    const gearGrid = modal.querySelector<HTMLElement>(".equip-slot-grid.gear");
    const accessoryGrid = modal.querySelector<HTMLElement>(".equip-slot-grid.accessories");
    const statsLeft = modal.querySelector<HTMLElement>(".equip-stats-col.left");
    const statsRight = modal.querySelector<HTMLElement>(".equip-stats-col.right");
    const candidateSection = modal.querySelector<HTMLElement>(".equip-candidate-section");
    const skillHost = modal.querySelector<HTMLElement>(".equip-skill-host");
    const statsContent = showGear ? null : this.getEquipStatsContent(state, heroId);

    if (gearGrid) {
      gearGrid.hidden = !showGear;
      if (showGear) {
        gearGrid.innerHTML = GEAR_SLOTS.map((slot) => this.renderEquipSlot(state, heroId, slot, focusSlot)).join("");
      }
    }
    if (accessoryGrid) {
      accessoryGrid.hidden = !showGear;
      if (showGear) {
        accessoryGrid.innerHTML = ACCESSORY_SLOTS.map((slot) =>
          this.renderEquipSlot(state, heroId, slot, focusSlot),
        ).join("");
      }
    }
    if (statsLeft) {
      statsLeft.hidden = showGear;
      statsLeft.innerHTML = statsContent?.leftHtml ?? "";
    }
    if (statsRight) {
      statsRight.hidden = showGear;
      statsRight.innerHTML = statsContent?.rightHtml ?? "";
    }
    if (candidateSection) candidateSection.hidden = !showGear;
    if (skillHost) {
      skillHost.hidden = showGear;
      skillHost.innerHTML = statsContent?.skillsHtml ?? "";
    }

    const portraitStage = modal.querySelector<HTMLElement>(".character-portrait-stage");
    const portraitArt = modal.querySelector<HTMLImageElement>(".character-portrait-art");
    const portraitStars = modal.querySelector(".character-portrait-stars");
    const portraitName = modal.querySelector(".character-portrait-meta strong");
    const portraitMeta = modal.querySelector(".character-portrait-meta small");
    if (portraitStage) portraitStage.style.setProperty("--hero-color", hero.color);
    if (portraitArt) {
      if (portraitArt.getAttribute("src") !== portrait) portraitArt.src = portrait;
      portraitArt.alt = hero.name;
    }
    if (portraitStars) {
      portraitStars.textContent =
        "★".repeat(progress.stars) + "☆".repeat(MAX_HERO_STARS - progress.stars);
    }
    if (portraitName) portraitName.textContent = hero.name;
    if (portraitMeta) portraitMeta.textContent = `${hero.role} · Lv.${progress.level}`;

    const candidateLabel = modal.querySelector(".equip-candidate-label");
    if (candidateLabel && showGear) candidateLabel.textContent = `可选装备 · ${slotLabel[focusSlot]}`;
    const candidateGrid = modal.querySelector(".equip-candidate-grid");
    if (candidateGrid && showGear) {
      candidateGrid.innerHTML = candidates.length
        ? candidates.map((candidate) => this.renderCandidateCard(state, candidate)).join("")
        : `<div class="equip-candidate-empty">该槽位暂无可选装备</div>`;
    }

    const tipsHost = modal.querySelector(".equip-tips-host");
    if (tipsHost) {
      if (this.equipTipsKind === "skill") {
        tipsHost.innerHTML = this.renderSkillTips(heroId);
      } else if (showGear) {
        tipsHost.innerHTML = this.renderEquipTipsLayer(state, equipped, item, hero.name);
      } else {
        tipsHost.innerHTML = "";
      }
    }
  }

  private renderShop(state: GameStoreState): void {
    const dailyActive = this.shopPanel === "daily";
    this.content.innerHTML = `
      <div class="shop-section-tabs" role="tablist" aria-label="商店分区">
        <button role="tab" class="shop-section-tab ${dailyActive ? "active" : ""}" data-action="shop-panel" data-panel="daily" aria-selected="${dailyActive}">今日补给</button>
        <button role="tab" class="shop-section-tab ${!dailyActive ? "active" : ""}" data-action="shop-panel" data-panel="abilities" aria-selected="${!dailyActive}">能力提升</button>
      </div>
      ${dailyActive ? this.renderDailyShop(state) : this.renderAbilityShop(state)}
    `;
  }

  private renderDailyShop(state: GameStoreState): string {
    return `
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
          return `<article class="shop-card equipment-offer ${rarityClass(offer.item.rarity)} ${offer.sold ? "sold" : ""}">
            ${itemDetailSheet(offer.item)}
            <button data-action="shop-buy" data-offer-id="${offer.offerId}" ${offer.sold || state.save.gold < offer.priceGold ? "disabled" : ""}>
              ${offer.sold ? "已售罄" : `购买 · ● ${compact(offer.priceGold)}`}
            </button>
          </article>`;
        }).join("")}
      </div>
    `;
  }

  private renderAbilityShop(state: GameStoreState): string {
    const list =
      this.abilityCategory === "combat"
        ? COMBAT_ABILITIES
        : this.abilityCategory === "general"
          ? GENERAL_ABILITIES
          : ECONOMY_ABILITIES;

    return `
      <div class="ability-shop-layout" data-panel="shop-abilities">
        <div class="ability-category-tabs" role="tablist" aria-label="能力分类" aria-orientation="vertical">
          ${ABILITY_CATEGORY_TABS.map(
            (tab) => `<button
              role="tab"
              class="ability-category-tab ${this.abilityCategory === tab.id ? "active" : ""}"
              data-action="ability-category"
              data-category="${tab.id}"
              aria-selected="${this.abilityCategory === tab.id}"
            >${tab.label}</button>`,
          ).join("")}
        </div>
        <div class="ability-icon-grid" role="list">
          ${list
            .map((definition) => {
              const pending = definition.active ? "" : " pending";
              return `<button
                class="ability-icon-tile accent-${definition.accent}${pending}"
                data-action="ability-select"
                data-ability-id="${definition.id}"
                role="listitem"
                aria-label="${definition.name}"
              >
                <span class="ability-icon-glyph" aria-hidden="true">${definition.icon}</span>
                <strong class="ability-icon-name">${definition.name}</strong>
              </button>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  private renderHeroes(state: GameStoreState): void {
    const unlockedCount = Object.values(state.save.roster).filter(({ unlocked }) => unlocked).length;
    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="heroes">
        <span class="panel-meta" aria-label="已解锁英雄">${unlockedCount}/8</span>
        <div class="panel-actions">
          <button class="summon-entry" data-action="summon-open" aria-label="召唤英雄">召唤</button>
        </div>
      </div>
      <div class="hero-card-grid" role="list">
        ${HERO_DEFINITIONS.map((hero) => {
          const heroProgress = state.save.roster[hero.id];
          const unlocked = heroProgress.unlocked;
          const portrait = ASSET_MANIFEST.characters[hero.id];
          const stars =
            "★".repeat(heroProgress.stars) + "☆".repeat(MAX_HERO_STARS - heroProgress.stars);
          return `<button class="hero-card ${this.selectedHeroId === hero.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="${unlocked ? "hero-detail" : "summon-open"}" data-hero-id="${hero.id}" role="listitem" aria-label="${unlocked ? `${hero.name} ${hero.role} Lv.${heroProgress.level}` : `${hero.name}未解锁`}" aria-pressed="${this.selectedHeroId === hero.id ? "true" : "false"}">
            <div class="hero-card-art" style="--hero-color:${hero.color}">
              <img src="${portrait}" alt="" draggable="false" />
            </div>
            <span class="hero-card-stars" aria-label="星级 ${heroProgress.stars}">${unlocked ? stars : "☆☆☆☆☆"}</span>
            <strong class="hero-card-name">${hero.name}</strong>
            <span class="hero-card-meta">
              <span class="hero-card-role">${hero.role}</span>
              <span class="hero-card-level">${unlocked ? `Lv.${heroProgress.level}` : "未解锁"}</span>
            </span>
          </button>`;
        }).join("")}
      </div>
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
                        return `<button type="button" class="item-card ${rarityClass(item.rarity)} ${inCube ? "selected" : ""} ${previewing ? "alchemy-previewing" : ""}" data-action="alchemy-item-detail" data-item-id="${item.instanceId}" aria-label="${RARITY_LABELS[item.rarity]}${definition.name}">
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
    this.alchemyTipsHost.innerHTML = "";
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
          <p>${currency === "gold" ? "击败敌人、离线收益和普通装备溢出可获得金币。金币用于英雄升级、冒险商店和能力提升。" : "首次通关关卡可获得宝石。宝石只用于 Demo 英雄召唤，不包含付费入口。"}</p>
        </div>
      `);
    } else if (this.modal === "loot-chest") {
      const chest = state.save.lootChest;
      const progress = Math.round(getLootChestProgress(chest) * 100);
      this.overlay.innerHTML = this.sheet("奖励宝箱", `
        <div class="info-card loot-chest-info">
          <span class="loot-chest-info-icon" data-level="${chest.level}" aria-hidden="true">▣</span>
          <div>
            <strong>${getLootChestLabel(chest.level)} · Lv.${chest.level}/${LOOT_CHEST_MAX_LEVEL}</strong>
            <p>消灭怪物可为宝箱充能。进度条满后宝箱升级，等级越高奖励越好。当前充能 ${progress}%。</p>
          </div>
        </div>
      `);
    } else if (this.modal === "ability-tips") {
      this.renderAbilityTips(state);
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
      const results = this.summonResults;
      const hasResults = Boolean(results?.length);
      const unlockedCount = results?.filter((pull) => pull.kind === "unlock").length ?? 0;
      const title = !hasResults
        ? "英雄召唤"
        : unlockedCount === results!.length
          ? "新英雄加入"
          : unlockedCount > 0
            ? "召唤结果"
            : "获得印记";
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div><section class="full-modal summon-modal" role="dialog" aria-modal="true" aria-label="${title}" ${hasResults ? 'data-action="close-modal"' : ""}>
          <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          <small>${hasResults ? "星辉回应" : "星辉之门"}</small><h2>${title}</h2>
          ${
            hasResults
              ? `<div class="summon-result-grid count-${results!.length}" aria-label="召唤获得">
                  ${results!
                    .map((pull, index) => {
                      const hero = HERO_BY_ID[pull.heroId];
                      const portrait = ASSET_MANIFEST.characters[pull.heroId];
                      const badge = pull.kind === "unlock" ? "新英雄" : `+${pull.marks} 印记`;
                      return `<article class="summon-result ${pull.kind}" style="--hero-color:${hero.color}; --reveal-delay:${index * 60}ms">
                        <div class="summon-result-art"><img src="${portrait}" alt="" draggable="false" /></div>
                        <h3>${hero.name}</h3>
                        <small>${hero.role}</small>
                        <strong>${badge}</strong>
                      </article>`;
                    })
                    .join("")}
                </div>
                <p class="summon-dismiss-hint">点击空白处返回</p>`
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

  private renderAbilityTips(state: GameStoreState): void {
    const abilityId = (this.modalPayload as AbilityId | null) ?? this.selectedAbilityId;
    const definition = abilityId
      ? ABILITY_DEFINITIONS.find((ability) => ability.id === abilityId) ?? null
      : null;
    if (!definition) {
      this.closeModal();
      return;
    }
    const level = state.save.abilities[definition.id] ?? 0;
    const meta = abilityCardMeta(definition.id, level);
    const canBuy = !meta.atMax && meta.nextCost != null && state.save.gold >= meta.nextCost;
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="bottom-sheet ability-tips-sheet" role="dialog" aria-modal="true" aria-label="${definition.name}">
        <header>
          <h2>${definition.name}</h2>
          <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        </header>
        <div class="ability-tips-body accent-${definition.accent}${definition.active ? "" : " pending"}">
          <div class="ability-tips-icon" aria-hidden="true">${definition.icon}</div>
          <div class="ability-tips-copy">
            <span class="ability-tips-level">Lv.${level}/${definition.maxLevel}</span>
            <strong class="ability-tips-effect">${meta.effectText}</strong>
            <p>${definition.blurb}</p>
          </div>
          <button class="primary-button wide" data-action="ability-upgrade" data-ability-id="${definition.id}" ${meta.atMax || !canBuy ? "disabled" : ""}>
            ${meta.atMax ? "已满级" : `升级 · ● ${compact(meta.nextCost!)}`}
          </button>
        </div>
      </section>
    `;
  }

  private sheet(title: string, content: string): string {
    return `<div class="modal-backdrop" data-action="close-modal"></div><section class="bottom-sheet" role="dialog" aria-modal="true"><header><h2>${title}</h2><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></header>${content}</section>`;
  }

  private onClick(event: Event): void {
    const origin = event.target as Element | null;
    const target = origin?.closest?.<HTMLElement>("[data-action]") ?? null;
    const action = target?.dataset.action;

    if (!target || !action) return;
    this.options.onSoundRequested?.("button");
    if (action === "select-tab") {
      const tab = target.dataset.tab as keyof typeof tabMeta;
      if (tab !== "shop") this.shopPanel = "daily";
      this.store.dispatch({ type: "ui:selectTab", tab });
    }
    else if (action === "open-stages") this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    else if (action === "alchemy-auto-fill") {
      const state = this.store.getState();
      const candidates = alchemyCandidateItems(state.save.inventory, this.alchemyEquipmentMaps(state));
      const picked = pickAlchemyAutoFill(candidates);
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, (_, index) => picked[index] ?? null);
      this.alchemyPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
      this.renderAlchemy(state);
    } else if (action === "alchemy-clear") {
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
      this.alchemyPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-slot-clear") {
      const slot = Number(target.dataset.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= ALCHEMY_SLOT_COUNT) return;
      this.alchemySlots[slot] = null;
      this.alchemyPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-item-detail") {
      const itemId = target.dataset.itemId;
      if (!itemId) return;
      this.alchemyPreviewId = itemId;
      this.selectedItemId = itemId;
      this.itemTipsSource = "alchemy";
      this.renderAlchemy(this.store.getState());
      this.openModal("item-tips");
    } else if (action === "alchemy-item-put") {
      const itemId = this.selectedItemId;
      if (!itemId) return;
      if (this.alchemySlots.includes(itemId)) {
        this.showToast("已在魔方中");
        return;
      }
      const empty = this.alchemySlots.indexOf(null);
      if (empty < 0) {
        this.showToast("魔方已满");
        return;
      }
      this.alchemySlots[empty] = itemId;
      this.alchemyPreviewId = itemId;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast("已放入魔方");
    } else if (action === "alchemy-item-remove") {
      const itemId = this.selectedItemId;
      if (!itemId) return;
      const index = this.alchemySlots.indexOf(itemId);
      if (index < 0) return;
      this.alchemySlots[index] = null;
      this.alchemyPreviewId = itemId;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast("已从魔方取出");
    } else if (action === "alchemy-craft") {
      const itemIds = this.alchemySlots.filter((id): id is string => Boolean(id));
      if (itemIds.length !== ALCHEMY_SLOT_COUNT) return;
      this.store.dispatch({ type: "alchemy:craft", itemIds });
      this.alchemySlots = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
      this.alchemyPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
    } else if (action === "toggle-speed") this.store.dispatch({ type: "battle:setSpeed", speed: this.store.getState().save.settings.battleSpeed === 1 ? 2 : 1 });
    else if (action === "settings") this.openModal("settings");
    else if (action === "currency-info") {
      this.modalPayload = target.dataset.currency;
      this.openModal("currency");
    } else if (action === "close-modal") this.closeModal();
    else if (action === "item-detail") {
      this.selectedItemId = target.dataset.itemId ?? null;
      this.itemTipsSource = "inventory";
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
      const itemId = this.selectedItemId;
      const item = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === itemId);
      const gold = item ? getSalvageGold(item) : 0;
      this.alchemySlots = this.alchemySlots.map((id) => (id === itemId ? null : id));
      this.store.dispatch({ type: "item:salvage", itemId });
      this.selectedItemId = null;
      this.alchemyPreviewId = null;
      this.closeModal();
      if (this.store.getState().ui.activeTab === "alchemy") {
        this.renderAlchemy(this.store.getState());
      }
      if (gold > 0) this.showToast(`分解获得 ● ${gold}`);
    } else if (action === "item-open-equip") {
      const tipItem = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      if (!tipItem) return this.closeModal();
      this.equipFocusSlot = tipItem.slot;
      this.equipTargetHeroId = this.pickEquipTargetHero(this.store.getState());
      this.equipPanelTab = "gear";
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.openModal("equip");
    } else if (action === "equip-panel-tab") {
      const tab = target.dataset.tab === "stats" ? "stats" : "gear";
      if (tab === this.equipPanelTab) return;
      this.equipPanelTab = tab;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-equip-tips") {
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-skill-tips") {
      const kind = target.dataset.skillKind === "passive" ? "passive" : "active";
      this.equipPanelTab = "stats";
      this.equipTipsKind = "skill";
      this.equipSkillTipsKind = kind;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-hero-select") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !this.partyHeroIds(this.store.getState()).includes(heroId)) return;
      if (heroId === this.equipTargetHeroId) return;
      this.equipTargetHeroId = heroId;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.selectedItemId = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-slot-focus") {
      const slot = target.dataset.slot as EquipmentSlot | undefined;
      if (!slot || !(EQUIPMENT_SLOTS as readonly string[]).includes(slot)) return;
      this.equipFocusSlot = slot;
      const equippedId = this.store.getState().save.roster[this.equipTargetHeroId]?.equipment[slot];
      this.selectedItemId = equippedId ?? null;
      this.equipTipsKind = equippedId ? "unequip" : null;
      this.equipSkillTipsKind = null;
      this.equipPanelTab = "gear";
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-candidate-select") {
      const itemId = target.dataset.itemId;
      if (!itemId || this.isOwnedByOtherHero(this.store.getState(), itemId)) return;
      this.selectedItemId = itemId;
      this.equipTipsKind = "compare";
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-item") {
      const heroId = this.equipTargetHeroId;
      if (!this.selectedItemId) return;
      if (this.isOwnedByOtherHero(this.store.getState(), this.selectedItemId)) return;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.store.dispatch({ type: "item:equip", heroId, itemId: this.selectedItemId });
      this.showToast(`已装备到 ${HERO_BY_ID[heroId].name}`);
      this.syncEquipModal(this.store.getState());
    } else if (action === "unequip-item") {
      const heroId = this.equipTargetHeroId;
      const unequipId =
        this.selectedItemId ??
        this.store.getState().save.roster[heroId]?.equipment[this.equipFocusSlot] ??
        null;
      if (!unequipId) return;
      this.selectedItemId = null;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.store.dispatch({ type: "item:unequip", heroId, itemId: unequipId });
      this.showToast("已卸下装备");
      this.syncEquipModal(this.store.getState());
    } else if (action === "shop-buy") this.store.dispatch({ type: "shop:buy", offerId: target.dataset.offerId! });
    else if (action === "shop-refresh") this.store.dispatch({ type: "shop:refresh" });
    else if (action === "shop-panel") {
      const panel = target.dataset.panel === "abilities" ? "abilities" : "daily";
      this.shopPanel = panel;
      this.renderPanel(this.store.getState());
    } else if (action === "ability-category") {
      const category = target.dataset.category as AbilityCategory | undefined;
      if (category !== "economy" && category !== "combat" && category !== "general") return;
      this.abilityCategory = category;
      this.selectedAbilityId = null;
      this.renderPanel(this.store.getState());
    } else if (action === "ability-select") {
      const abilityId = target.dataset.abilityId as AbilityId | undefined;
      if (!abilityId) return;
      this.selectedAbilityId = abilityId;
      this.modalPayload = abilityId;
      this.openModal("ability-tips");
    } else if (action === "ability-upgrade") {
      const abilityId = target.dataset.abilityId as AbilityId | undefined;
      if (!abilityId) return;
      this.selectedAbilityId = abilityId;
      this.modalPayload = abilityId;
      this.store.dispatch({ type: "ability:upgrade", abilityId });
      if (this.modal === "ability-tips") this.renderModal();
    }
    else if (action === "hero-detail") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !this.store.getState().save.roster[heroId]?.unlocked) return;
      this.selectedHeroId = heroId;
      this.equipTargetHeroId = heroId;
      this.equipPanelTab = "stats";
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.selectedItemId = null;
      this.openModal("equip");
    } else if (action === "hero-level") {
      this.store.dispatch({ type: "hero:levelUp", heroId: target.dataset.heroId as HeroId });
      if (this.modal === "equip") this.syncEquipModal(this.store.getState());
    } else if (action === "hero-star-up") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId) return;
      this.store.dispatch({ type: "hero:starUp", heroId });
      if (this.modal === "equip") this.syncEquipModal(this.store.getState());
    }
    else if (action === "summon-open") {
      this.summonResults = null;
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
      if (event.type === "lootChest:leveled") {
        this.showToast(`宝箱升至 Lv.${event.level} · ● ${event.gold}`);
        this.renderTopbar(this.store.getState());
        this.renderLootChest(this.store.getState());
      }
      if (event.type === "lootChest:rewarded") {
        this.showToast(`宝箱奖励 · ● ${event.gold}`);
        this.renderTopbar(this.store.getState());
        this.renderLootChest(this.store.getState());
      }
      if (event.type === "ability:upgraded") {
        const def = ABILITY_DEFINITIONS.find((ability) => ability.id === event.abilityId);
        if (def) this.showToast(def.name + " Lv." + event.level);
      }
      if (event.type === "hero:leveled") this.showToast(`${HERO_BY_ID[event.heroId].name} 升至 Lv.${event.level}`);
      if (event.type === "hero:starred") this.showToast(`${HERO_BY_ID[event.heroId].name} 升至 ${event.stars} 星`);
      if (event.type === "summon:completed") {
        this.summonResults = event.results;
        const unlocked = event.results.filter((pull) => pull.kind === "unlock");
        if (unlocked.length === 1) {
          this.showToast(`新英雄加入 · ${HERO_BY_ID[unlocked[0]!.heroId].name}`);
        } else if (unlocked.length > 1) {
          this.showToast(`新英雄 ×${unlocked.length}`);
        } else if (event.results.length === 1 && event.results[0]!.kind === "marks") {
          const pull = event.results[0]!;
          this.showToast(`${HERO_BY_ID[pull.heroId].name} +${pull.marks} 印记`);
        } else if (event.results.length > 1) {
          const marks = event.results.reduce(
            (sum, pull) => sum + (pull.kind === "marks" ? pull.marks : 0),
            0,
          );
          this.showToast(`召唤完成 · 印记 +${marks}`);
        }
        if (this.modal === "summon") this.renderModal();
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
    this.itemTipsSource = "inventory";
    this.equipTipsKind = null;
    this.equipSkillTipsKind = null;
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
