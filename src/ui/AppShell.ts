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
import { HERO_SKILLS, HERO_SKILL_BY_ID, isHeroSkillId } from "../content/heroSkills";
import {
  HERO_SKILL_UNLOCK_LEVEL,
  TALENT_BY_ID,
  TALENT_TIERS,
  isTalentId,
  talentsInTier,
  type TalentId,
} from "../content/talents";
import { STAGE_DEFINITIONS } from "../content/stages";
import {
  DAMAGE_ELEMENT_COLOR,
  DAMAGE_ELEMENT_LABEL,
  DAMAGE_SCHOOL_LABEL,
  chapterThemeElement,
} from "../content/damageElements";
import {
  DAILY_DUNGEON_COUNT,
  DUNGEON_BY_ID,
  getDailyDungeonIds,
  isDungeonUnlocked,
  type DungeonId,
} from "../content/dungeons";
import {
  formatDungeonCountdown,
  formatDungeonDuration,
  getBusyHeroIds,
  getExploringHeroIds,
  getDungeonRun,
  getDungeonRunRemainingMs,
  getDungeonRunStatus,
} from "../progression/DungeonSystem";
import { getDateKey } from "../persistence/schema";
import {
  backpackItems,
  compareInventoryItems,
  countBackpackItems,
  describeItemAffixes,
  getItemBudget,
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
import {
  CRAFT_MODE_HINTS,
  CRAFT_MODE_LABELS,
  getSmeltAffixChoices,
  type CraftMode,
} from "../progression/GearCraftSystem";
import {
  MATERIAL_BY_ID,
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_DEFINITIONS,
  MAX_EQUIPMENT_SOCKETS,
  canSalvageMaterial,
  isMaterialCategory,
  type MaterialCategory,
  type MaterialId,
} from "../content/materials";
import { AFFIX_BY_ID, formatAffixRangeLabel, formatAffixValue, affixDisplaysPercent, type AffixId } from "../content/affixes";
import {
  ACCOUNT_CURRENCY_BY_ID,
  ACCOUNT_CURRENCY_DEFINITIONS,
  isAccountCurrencyId,
  type AccountCurrencyId,
} from "../content/currencies";
import {
  canAscendHero,
  getAscendStoneCost,
  getHeroLevelCap,
  getStarUpgradeCost,
  getUpgradeCost,
  heroGrowthFromProgress,
  MAX_HERO_ASCEND_LEVEL,
  MAX_HERO_STARS,
} from "../progression/HeroProgression";
import {
  canLearnHeroSkill,
  canUpgradeTalent,
  describeTalentEffectAtRank,
  getTalentPointsEarned,
  getTalentPointsUnspent,
  getTalentTierProgress,
  isTalentNodeUnlocked,
  isTalentTierUnlocked,
  talentUpgradeBlocked,
} from "../progression/TalentSystem";
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
import type { BattleEvent, BattleSnapshot, DamageElement, HeroId } from "../simulation/types";
import {
  canOpenLootChest,
  getLootChestLabel,
  getLootChestProgress,
  LOOT_CHEST_MAX_LEVEL,
} from "../progression/LootChestSystem";
import { bindDragScroll } from "./dragScroll";

export interface AppShellOptions {
  onStageSelected?: (stage: number) => void;
  onDungeonDispatched?: () => void;
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
type EquipStatsCategory = "generic" | "elemental";
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

/** 每阶外形不同的天使羽翼纹章（非点亮进度条）。 */
function renderAscendCrest(level: number, uid: string): string {
  if (level < 1 || level > MAX_HERO_ASCEND_LEVEL) return "";
  const gid = `ag-${uid}`;
  const fill = `url(#${gid})`;
  const defs = `<defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fffef6"/>
      <stop offset="38%" stop-color="#ffe9a8"/>
      <stop offset="78%" stop-color="#d4b46a"/>
      <stop offset="100%" stop-color="#9a7028"/>
    </linearGradient>
  </defs>`;
  const stroke = `stroke="#8a6a2e" stroke-width=".95" stroke-linejoin="round"`;
  const marks: Record<number, string> = {
    // 1 雏羽：短小天使翼尖
    1: `<svg viewBox="0 0 48 24" aria-hidden="true">${defs}
      <path d="M24 16.5C20.5 11 15 8.2 9.5 8.8c.8-1.6 2.4-3 4.6-3.8C18.2 7.2 21.2 10.5 22.6 14.2L24 16.5z" fill="${fill}" ${stroke}/>
      <path d="M24 16.5c3.5-5.5 9-8.3 14.5-7.7-.8-1.6-2.4-3-4.6-3.8-4.1 2.2-7.1 5.5-8.5 9.2L24 16.5z" fill="${fill}" ${stroke}/>
      <path d="M24 17.2c-2.4-3.2-5.8-5-9.4-5.2 1.8 1.6 3.1 3.4 3.6 5.4H24z" fill="#fffef2" opacity=".65"/>
      <path d="M24 17.2c2.4-3.2 5.8-5 9.4-5.2-1.8 1.6-3.1 3.4-3.6 5.4H24z" fill="#fffef2" opacity=".65"/>
      <circle cx="24" cy="17" r="1.8" fill="#fffef6" stroke="#b8924a" stroke-width=".7"/>
    </svg>`,
    // 2 柔羽：更长弧羽 + 羽脉
    2: `<svg viewBox="0 0 54 26" aria-hidden="true">${defs}
      <path d="M25 18C20 10.5 11.5 6.2 3.5 7.2c1.2-2.2 3.6-4 6.8-5C16.5 5.5 21 10.2 23.2 15.5L25 18z" fill="${fill}" ${stroke}/>
      <path d="M25 18c5-7.5 13.5-11.8 21.5-10.8-1.2-2.2-3.6-4-6.8-5C33.5 5.5 29 10.2 26.8 15.5L25 18z" fill="${fill}" ${stroke}/>
      <path d="M11 10.5c2.4 1.6 4.2 3.6 5.2 5.8" fill="none" stroke="#fffef2" stroke-width=".85" opacity=".8"/>
      <path d="M39 10.5c-2.4 1.6-4.2 3.6-5.2 5.8" fill="none" stroke="#fffef2" stroke-width=".85" opacity=".8"/>
      <path d="M25 18.8c-3-4.2-7.4-6.6-12-6.8 2.4 2 4.2 4.4 4.8 7H25z" fill="#fffef2" opacity=".55"/>
      <path d="M25 18.8c3-4.2 7.4-6.6 12-6.8-2.4 2-4.2 4.4-4.8 7H25z" fill="#fffef2" opacity=".55"/>
      <circle cx="25" cy="18.5" r="2" fill="#fffef6" stroke="#b8924a" stroke-width=".75"/>
    </svg>`,
    // 3 层羽：主翼 + 内层副羽
    3: `<svg viewBox="0 0 58 28" aria-hidden="true">${defs}
      <path d="M27 19.5C21 10 10.5 4.5 1.5 6c1.6-2.4 4.6-4.4 8.4-5.4C17.5 4.5 23 10.5 25.4 16.8L27 19.5z" fill="${fill}" ${stroke}/>
      <path d="M27 19.5c6-9.5 16.5-15 25.5-13.5-1.6-2.4-4.6-4.4-8.4-5.4C36.5 4.5 31 10.5 28.6 16.8L27 19.5z" fill="${fill}" ${stroke}/>
      <path d="M27 20.5C22.2 13.5 14 10 6.5 11.2c3.2 2.2 5.6 4.8 6.6 7.8 2-1.4 4.4-2.2 7.2-2.4L27 20.5z" fill="#fffef2" opacity=".62" stroke="#8a6a2e" stroke-width=".65"/>
      <path d="M27 20.5c4.8-7 13-10.5 20.5-9.3-3.2 2.2-5.6 4.8-6.6 7.8-2-1.4-4.4-2.2-7.2-2.4L27 20.5z" fill="#fffef2" opacity=".62" stroke="#8a6a2e" stroke-width=".65"/>
      <path d="M9.5 9.5c2.8 1.5 5 3.6 6.2 6" fill="none" stroke="#fffef6" stroke-width=".9" opacity=".85"/>
      <path d="M44.5 9.5c-2.8 1.5-5 3.6-6.2 6" fill="none" stroke="#fffef6" stroke-width=".9" opacity=".85"/>
      <circle cx="27" cy="20" r="2.2" fill="#fffef6" stroke="#b8924a" stroke-width=".8"/>
    </svg>`,
    // 4 翔羽：上扬大天使翼
    4: `<svg viewBox="0 0 64 30" aria-hidden="true">${defs}
      <path d="M30 21C23 9.5 10 2.5-.5 4.8c2-2.8 5.8-5.2 10.5-6.2C19 3.2 25.5 10.5 28.2 18L30 21z" fill="${fill}" ${stroke}/>
      <path d="M30 21c7-11.5 20-18.5 30.5-16.2-2-2.8-5.8-5.2-10.5-6.2C41 3.2 34.5 10.5 31.8 18L30 21z" fill="${fill}" ${stroke}/>
      <path d="M30 22c-5.2-8-13.8-12-22.5-11.2 4 2.6 7.2 5.8 8.6 9.6 2.4-1.8 5.4-2.8 8.8-3L30 22z" fill="#fffef2" opacity=".58" stroke="#8a6a2e" stroke-width=".7"/>
      <path d="M30 22c5.2-8 13.8-12 22.5-11.2-4 2.6-7.2 5.8-8.6 9.6-2.4-1.8-5.4-2.8-8.8-3L30 22z" fill="#fffef2" opacity=".58" stroke="#8a6a2e" stroke-width=".7"/>
      <path d="M8 8.2c3.2 1.4 5.8 3.6 7.4 6.2M16 6c2.6 1.6 4.6 3.6 5.8 6" fill="none" stroke="#fffef6" stroke-width=".95" stroke-linecap="round" opacity=".9"/>
      <path d="M52 8.2c-3.2 1.4-5.8 3.6-7.4 6.2M48 6c-2.6 1.6-4.6 3.6-5.8 6" fill="none" stroke="#fffef6" stroke-width=".95" stroke-linecap="round" opacity=".9"/>
      <circle cx="30" cy="21.5" r="2.4" fill="#fffef6" stroke="#b8924a" stroke-width=".85"/>
    </svg>`,
    // 5 圣羽：全展六翼感 + 羽尖高光
    5: `<svg viewBox="0 0 68 32" aria-hidden="true">${defs}
      <path d="M32 22C24 8.5 9 0.8-2 4c2.4-3.2 7-6 12.8-7C21 2.5 28 11 30.4 19L32 22z" fill="${fill}" ${stroke}/>
      <path d="M32 22c8-13.5 23-21.2 34-18-2.4-3.2-7-6-12.8-7C43 2.5 36 11 33.6 19L32 22z" fill="${fill}" ${stroke}/>
      <path d="M32 23C25.5 13 14.5 8 4.5 10c4.6 2.8 8.2 6.2 9.8 10.2 2.8-2 6.4-3.2 10.4-3.5L32 23z" fill="#fffef2" opacity=".55" stroke="#8a6a2e" stroke-width=".7"/>
      <path d="M32 23c6.5-10 17.5-15 27.5-13-4.6 2.8-8.2 6.2-9.8 10.2-2.8-2-6.4-3.2-10.4-3.5L32 23z" fill="#fffef2" opacity=".55" stroke="#8a6a2e" stroke-width=".7"/>
      <path d="M32 24c-3.6-4.8-8.8-7.4-14.5-7.6 2.8 2.2 4.8 4.8 5.4 7.8H32z" fill="#ffe9a8" opacity=".75" stroke="#8a6a2e" stroke-width=".6"/>
      <path d="M32 24c3.6-4.8 8.8-7.4 14.5-7.6-2.8 2.2-4.8 4.8-5.4 7.8H32z" fill="#ffe9a8" opacity=".75" stroke="#8a6a2e" stroke-width=".6"/>
      <path d="M6 7.5l3.5 2.2M14 4.2l2.8 3M54 4.2l-2.8 3M62 7.5l-3.5 2.2" stroke="#fffef6" stroke-width="1.15" stroke-linecap="round" opacity=".95"/>
      <circle cx="32" cy="23" r="2.8" fill="#fffef6" stroke="#b8924a" stroke-width=".9"/>
      <circle cx="32" cy="23" r="1.15" fill="#f0d090"/>
    </svg>`,
  };
  return `<span class="hero-ascend-crest" data-level="${level}" aria-label="进阶${level}">${marks[level]}</span>`;
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
  const sockets = item.sockets ?? [];
  if (sockets.length) {
    const socketText = sockets
      .map((socket, index) => {
        if (!socket.gemId) return `孔${index + 1}：空`;
        return `孔${index + 1}：${MATERIAL_BY_ID[socket.gemId as MaterialId]?.name ?? "宝石"}`;
      })
      .join(" · ");
    effects.push(`<div class="item-effect-line">宝石孔 · ${sockets.length}/${MAX_EQUIPMENT_SOCKETS}<small>${socketText}</small></div>`);
  }
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
  private equipStatsCategory: EquipStatsCategory = "generic";
  private equipTipsKind: "compare" | "unequip" | "skill" | "talent" | "skill-pick" | null = null;
  private equipSkillTipsKind: "active" | "passive" | "signature" | "talent" | null = null;
  private selectedTalentId: TalentId | null = null;
  private inventoryFilter: EquipmentSlot | "all" = "all";
  private materialFilter: MaterialCategory | "all" = "all";
  private inventoryBagTab: "equipment" | "materials" = "equipment";
  private salvageSlotFilter: EquipmentSlot | "all" = "all";
  private salvageRarityFilter: Set<Rarity> = new Set<Rarity>(["common"]);
  private salvageSelectedIds: Set<string> = new Set();
  private shopPanel: "daily" | "abilities" = "daily";
  private abilityCategory: AbilityCategory = "economy";
  private selectedAbilityId: AbilityId | null = null;
  private alchemySlots: (string | null)[] = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
  private alchemyPreviewId: string | null = null;
  private craftMode: CraftMode = "upgrade";
  private craftModeMenuOpen = false;
  private alchemyListTab: "equipment" | "materials" = "equipment";
  private stagesPanelTab: "mainline" | "dungeon" = "mainline";
  private dispatchDraft: HeroId[] = [];
  private dungeonTicker: ReturnType<typeof setInterval> | null = null;
  private craftTargetId: string | null = null;
  private craftMaterialId: MaterialId | null = null;
  private craftSmeltAffixId: AffixId | null = null;
  private craftResetAffixIndex: number | null = null;
  private craftSocketIndex = 0;
  private itemTipsSource: "inventory" | "alchemy" | "craft" = "inventory";
  private materialTipsSource: "inventory" | "craft" = "inventory";
  private selectedMaterialId: MaterialId | null = null;
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
            <button type="button" class="loot-chest-badge" data-action="loot-chest-open" data-level="0" aria-label="奖励宝箱">
              <span class="loot-chest-icon" aria-hidden="true">▣</span>
              <span class="loot-chest-tier">Lv.0</span>
            </button>
            <div class="loot-chest-meter" role="progressbar" aria-label="宝箱充能" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="loot-chest-fill"></span>
              <span class="loot-chest-label">0%</span>
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

  showOfflineReward(
    minutes: number,
    gold: number,
    exp: number,
    gearCount: number,
    onClaim: () => void,
  ): void {
    this.modal = "offline";
    this.modalPayload = { minutes, gold, exp, gearCount, onClaim };
    this.renderModal();
  }

  private renderState(state: GameStoreState): void {
    this.renderTopbar(state);
    this.renderLootChest(state);
    this.renderParty(state);
    this.renderPanel(state);
    this.renderNav(state);
    this.syncDungeonTicker(state);
    if (this.modal) this.renderModal();
  }

  private renderLootChest(state: GameStoreState): void {
    const chest = state.save.lootChest;
    const progress = getLootChestProgress(chest);
    const percent = Math.round(progress * 100);
    const canOpen = canOpenLootChest(chest);
    const badge = this.root.querySelector<HTMLElement>(".loot-chest-badge");
    const meter = this.root.querySelector<HTMLElement>(".loot-chest-meter");
    const fill = this.root.querySelector<HTMLElement>(".loot-chest-fill");
    const label = this.root.querySelector<HTMLElement>(".loot-chest-label");
    const tier = this.root.querySelector<HTMLElement>(".loot-chest-tier");
    if (!badge || !meter || !fill || !label || !tier) return;
    badge.dataset.level = String(chest.level);
    badge.classList.toggle("ready", canOpen);
    badge.setAttribute(
      "aria-label",
      canOpen
        ? `${getLootChestLabel(chest.level)} Lv.${chest.level}，点击开启`
        : `空箱 Lv.0，充能 ${percent}%`,
    );
    tier.textContent = `Lv.${chest.level}`;
    meter.setAttribute("aria-valuenow", String(percent));
    // Force a clean 0% paint after open so leftover width never sticks.
    if (chest.charge <= 0) {
      const previousTransition = fill.style.transition;
      fill.style.transition = "none";
      fill.style.width = "0%";
      void fill.offsetWidth;
      fill.style.transition = previousTransition;
    } else {
      fill.style.width = `${percent}%`;
    }
    if (canOpen) {
      label.textContent =
        chest.level >= LOOT_CHEST_MAX_LEVEL ? "满" : `${percent}%`;
    } else {
      label.textContent = `${percent}%`;
    }
  }

  private renderTopbar(state: GameStoreState): void {
    const stage = STAGE_DEFINITIONS[state.save.currentStage - 1]!;
    const amounts: Record<AccountCurrencyId, number> = {
      exp: state.save.exp,
      gold: state.save.gold,
      gems: state.save.gems,
    };
    const chips = ACCOUNT_CURRENCY_DEFINITIONS.map((currency) => {
      return `<button class="resource-chip ${currency.tone}" data-action="currency-info" data-currency="${currency.id}" aria-label="${currency.name}来源">
          <span aria-hidden="true">${currency.icon}</span><b>${compact(amounts[currency.id])}</b>
        </button>`;
    }).join("");
    const running = state.save.dungeonRuns.filter((run) => getDungeonRunStatus(run) === "running").length;
    const ready = state.save.dungeonRuns.filter((run) => getDungeonRunStatus(run) === "ready").length;
    const dispatchChip =
      running + ready > 0
        ? `<button class="stage-chip dungeon" data-action="open-dungeons" aria-label="打开副本派遣">
        <small>${ready > 0 ? "可领取" : "派遣中"}</small><strong>${ready > 0 ? `${ready} 支` : `${running} 支`}</strong>
      </button>`
        : "";
    const stageChip = `<button class="stage-chip" data-action="open-stages" aria-label="打开关卡选择">
        <small>第${chapterNumeral[stage.chapter]}章 · ${stage.chapterName}</small><strong>${stage.id}</strong>
      </button>`;
    this.topbar.innerHTML = `
      <div class="stage-chip-row">
        ${stageChip}
        ${dispatchChip}
      </div>
      <div class="resource-row">${chips}</div>
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
    const isMaterials = this.inventoryBagTab === "materials";

    const toolbar = (() => {
      if (isMaterials) {
        const materialKinds = MATERIAL_DEFINITIONS.filter(
          (entry) => (state.save.materials[entry.id] ?? 0) > 0,
        ).length;
        const canSalvage = MATERIAL_DEFINITIONS.some(
          (entry) => (state.save.materials[entry.id] ?? 0) > 0 && canSalvageMaterial(entry),
        );
        return `
          <div class="panel-heading compact" data-panel="inventory">
            <span class="panel-meta" aria-label="材料种类">${materialKinds}/${MATERIAL_DEFINITIONS.length}</span>
            <div class="panel-actions">
              <button class="secondary-button compact" data-action="inventory-organize">整理</button>
              <button class="secondary-button compact" data-action="inventory-salvage-open" ${canSalvage ? "" : "disabled"} aria-disabled="${canSalvage ? "false" : "true"}">分解</button>
              <select class="filter-select" data-action="inventory-material-filter" aria-label="材料筛选">
                <option value="all" ${this.materialFilter === "all" ? "selected" : ""}>全部</option>
                ${MATERIAL_CATEGORIES.map(
                  (category) =>
                    `<option value="${category}" ${this.materialFilter === category ? "selected" : ""}>${MATERIAL_CATEGORY_LABELS[category]}</option>`,
                ).join("")}
              </select>
            </div>
          </div>
        `;
      }
      const occupied = countBackpackItems(state.save.inventory, equippedIds);
      return `
        <div class="panel-heading compact" data-panel="inventory">
          <span class="panel-meta" aria-label="装备背包容量">${occupied}/${getBackpackCapacity(state.save.abilities)}</span>
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
      `;
    })();

    const bagBody = (() => {
      if (isMaterials) {
        const ownedMaterials = MATERIAL_DEFINITIONS.filter(
          (entry) => (state.save.materials[entry.id] ?? 0) > 0,
        );
        const visibleMaterials = ownedMaterials.filter(
          (entry) => this.materialFilter === "all" || entry.category === this.materialFilter,
        );
        if (!ownedMaterials.length) {
          return `<div class="empty-state"><span>◈</span><strong>材料背包还是空的</strong><p>副本挂机与冒险会掉落工艺材料</p><button data-action="open-stages" class="secondary-button">前往副本</button></div>`;
        }
        if (!visibleMaterials.length) {
          return `<div class="empty-state"><span>◈</span><strong>该分类下没有材料</strong><p>试试其他分类，或前往副本获取</p></div>`;
        }
        return `<div class="item-grid inventory-grid">${visibleMaterials
          .map((entry) => {
            const count = state.save.materials[entry.id] ?? 0;
            return `<button type="button" class="item-card material-item-card tone-${entry.tone}" data-action="inventory-material-detail" data-material-id="${entry.id}" aria-label="${entry.name}">
              <span class="item-icon material-icon" aria-hidden="true"><span class="material-glyph">${entry.glyph}</span></span>
              <span class="material-stack">×${count}</span>
            </button>`;
          })
          .join("")}</div>`;
      }

      const sorted = backpackItems(state.save.inventory, equippedIds)
        .filter((item) => this.inventoryFilter === "all" || item.slot === this.inventoryFilter)
        .sort(compareInventoryItems);
      if (!sorted.length) {
        return `<div class="empty-state"><span>🎒</span><strong>装备背包还是空的</strong><p>小队会在战斗中自动收集装备</p><button data-action="open-stages" class="secondary-button">查看当前关卡</button></div>`;
      }
      return `<div class="item-grid inventory-grid">${sorted.map((item) => this.itemCard(item)).join("")}</div>`;
    })();

    this.content.innerHTML = `
      <div class="inventory-page">
        ${toolbar}
        <div class="inventory-layout">
          <nav class="inventory-side-tabs" role="tablist" aria-label="背包分类">
            <button type="button" class="inventory-side-tab ${!isMaterials ? "active" : ""}" data-action="inventory-bag-tab" data-tab="equipment" role="tab" aria-selected="${!isMaterials ? "true" : "false"}">装备</button>
            <button type="button" class="inventory-side-tab ${isMaterials ? "active" : ""}" data-action="inventory-bag-tab" data-tab="materials" role="tab" aria-selected="${isMaterials ? "true" : "false"}">材料</button>
          </nav>
          <section class="inventory-main" aria-label="${isMaterials ? "材料背包" : "装备背包"}">
            ${bagBody}
          </section>
        </div>
      </div>
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

  private renderHeroDamageIdentity(school: "physical" | "magic", element: DamageElement): string {
    const schoolLabel = DAMAGE_SCHOOL_LABEL[school];
    const elementLabel = DAMAGE_ELEMENT_LABEL[element];
    return `
      <div
        class="hero-damage-identity"
        aria-label="伤害类型${schoolLabel}，元素${elementLabel}"
      >
        <span class="hero-damage-chip school" data-school="${school}">${schoolLabel}</span>
        <span
          class="hero-damage-chip element"
          data-element="${element}"
          style="--element-color:${DAMAGE_ELEMENT_COLOR[element]}"
        >${elementLabel}</span>
      </div>
    `;
  }

  private getEquipStatsContent(state: GameStoreState, heroId: HeroId): {
    leftHtml: string;
    rightHtml: string;
    tabsHtml: string;
    skillsHtml: string;
  } {
    const progress = state.save.roster[heroId];
    const bonus = getEquipmentBonuses(state.save)[heroId] ?? {};
    const stats = getHeroCombatDisplayStats(heroId, progress.level, bonus, heroGrowthFromProgress(progress));
    type StatRow = { label: string; value: string; hide?: boolean };
    const coreRows: StatRow[] = [
      { label: "生命", value: this.formatStatValue(stats.maxHp) },
      { label: "攻击", value: this.formatStatValue(stats.attack) },
      { label: "防御", value: this.formatStatValue(stats.defense) },
      { label: "暴击率", value: `${this.formatStatValue(stats.critChancePct, 1)}%` },
      { label: "暴击伤害", value: `${this.formatStatValue(stats.critDamagePct, 1)}%` },
      { label: "攻击间隔", value: `${this.formatStatValue(stats.attackIntervalMs)}ms` },
      { label: "攻击速度", value: `+${this.formatStatValue(stats.attackSpeedPct, 1)}%` },
      { label: "攻击射程", value: this.formatStatValue(stats.attackRange) },
      { label: "移动速度", value: this.formatStatValue(stats.moveSpeed, 1) },
    ];
    const genericRows: StatRow[] = [
      { label: "全伤害", value: `+${this.formatStatValue(stats.damagePct, 1)}%`, hide: stats.damagePct <= 0 },
      { label: "普攻伤害", value: `+${this.formatStatValue(stats.primaryAttackPct, 1)}%`, hide: stats.primaryAttackPct <= 0 },
      { label: "技能伤害", value: `+${this.formatStatValue(stats.skillDamagePct, 1)}%`, hide: stats.skillDamagePct <= 0 },
      { label: "物理伤害", value: `+${this.formatStatValue(stats.physicalDamagePct, 1)}%`, hide: stats.physicalDamagePct <= 0 },
      { label: "法术伤害", value: `+${this.formatStatValue(stats.magicDamagePct, 1)}%`, hide: stats.magicDamagePct <= 0 },
      { label: "治疗效果", value: `+${this.formatStatValue(stats.healPowerPct, 1)}%`, hide: stats.healPowerPct <= 0 },
      { label: "精英伤害", value: `+${this.formatStatValue(stats.eliteDamagePct, 1)}%`, hide: stats.eliteDamagePct <= 0 },
      { label: "冷却缩减", value: `${this.formatStatValue(stats.skillCooldownPct, 1)}%` },
      { label: "技能冷却", value: `${this.formatStatValue(stats.skillCooldownMs)}ms` },
      { label: "伤害减免", value: `${this.formatStatValue(stats.damageReductionPct, 1)}%`, hide: stats.damageReductionPct <= 0 },
      { label: "物理抗性", value: `${this.formatStatValue(stats.physicalResistPct, 1)}%` },
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
      { label: "沙痕几率", value: `${this.formatStatValue(stats.sandscarChancePct, 1)}%`, hide: stats.sandscarChancePct <= 0 },
      { label: "幻影减伤", value: `${this.formatStatValue(stats.mirageGuardPct, 1)}%`, hide: stats.mirageGuardPct <= 0 },
      { label: "迅风", value: `${this.formatStatValue(stats.tailwindPct, 1)}%`, hide: stats.tailwindPct <= 0 },
    ];
    const elementalRows: StatRow[] = [
      { label: "火焰伤害", value: `+${this.formatStatValue(stats.fireDamagePct, 1)}%`, hide: stats.fireDamagePct <= 0 },
      { label: "冰霜伤害", value: `+${this.formatStatValue(stats.frostDamagePct, 1)}%`, hide: stats.frostDamagePct <= 0 },
      { label: "雷电伤害", value: `+${this.formatStatValue(stats.lightningDamagePct, 1)}%`, hide: stats.lightningDamagePct <= 0 },
      { label: "暗黑伤害", value: `+${this.formatStatValue(stats.darkDamagePct, 1)}%`, hide: stats.darkDamagePct <= 0 },
      { label: "火焰抗性", value: `${this.formatStatValue(stats.fireResistPct, 1)}%` },
      { label: "冰霜抗性", value: `${this.formatStatValue(stats.frostResistPct, 1)}%` },
      { label: "雷电抗性", value: `${this.formatStatValue(stats.lightningResistPct, 1)}%` },
      { label: "暗黑抗性", value: `${this.formatStatValue(stats.darkResistPct, 1)}%` },
      { label: "圣光抗性", value: `${this.formatStatValue(stats.holyResistPct, 1)}%` },
      { label: "霜咬几率", value: `${this.formatStatValue(stats.frostbiteChancePct, 1)}%`, hide: stats.frostbiteChancePct <= 0 },
      { label: "雪护护盾", value: `${this.formatStatValue(stats.snowguardShieldPct, 1)}%`, hide: stats.snowguardShieldPct <= 0 },
      { label: "霜聚冷却", value: `${this.formatStatValue(stats.frostfocusCooldownPct, 1)}%`, hide: stats.frostfocusCooldownPct <= 0 },
      { label: "雷霆增伤", value: `${this.formatStatValue(stats.thunderbrandPct, 1)}%`, hide: stats.thunderbrandPct <= 0 },
      { label: "云纱护盾", value: `${this.formatStatValue(stats.cloudveilShieldPct, 1)}%`, hide: stats.cloudveilShieldPct <= 0 },
      { label: "风暴护盾", value: `${this.formatStatValue(stats.stormwardShieldPct, 1)}%`, hide: stats.stormwardShieldPct <= 0 },
    ];
    const category = this.equipStatsCategory === "elemental" ? "elemental" : "generic";
    this.equipStatsCategory = category;
    const bonusRows = (category === "elemental" ? elementalRows : genericRows).filter((row) => !row.hide);
    const renderCol = (items: StatRow[], label: string) =>
      `<div class="equip-stats-side" aria-label="${label}">${items
        .map((row) => `<div class="equip-stat-row"><span>${row.label}</span><b>${row.value}</b></div>`)
        .join("")}</div>`;
    const tabsHtml = `
      <div class="equip-stats-pager" role="tablist" aria-label="切换属性">
        <button type="button" class="equip-stats-page ${category === "generic" ? "active" : ""}" data-action="equip-stats-category" data-category="generic" role="tab" aria-selected="${category === "generic" ? "true" : "false"}">通用</button>
        <button type="button" class="equip-stats-page ${category === "elemental" ? "active" : ""}" data-action="equip-stats-category" data-category="elemental" role="tab" aria-selected="${category === "elemental" ? "true" : "false"}">元素</button>
      </div>
    `;
    return {
      leftHtml: renderCol(coreRows, "英雄固定属性"),
      rightHtml: renderCol(bonusRows, category === "elemental" ? "元素属性" : "装备通用属性"),
      tabsHtml,
      skillsHtml: this.renderEquipSkills(state, heroId),
    };
  }

  private renderEquipSkills(state: GameStoreState, heroId: HeroId): string {
    const active = ACTIVE_SKILL_BY_HERO[heroId];
    const passive = PASSIVE_SKILL_BY_HERO[heroId];
    const progress = state.save.roster[heroId];
    const ascendLevel = progress.ascendLevel ?? 0;
    const levelCap = getHeroLevelCap(ascendLevel);
    const worldCap = getHeroLevelCap(MAX_HERO_ASCEND_LEVEL);
    const levelCost = getUpgradeCost(progress.level);
    const atMaxLevel = progress.level >= levelCap;
    const canLevelUp = !atMaxLevel && state.save.exp >= levelCost;
    const starCost = getStarUpgradeCost(progress.stars, ascendLevel);
    const atMaxStar = starCost == null || progress.stars >= MAX_HERO_STARS;
    const needed = starCost ?? 0;
    const have = progress.marks;
    const fillPct = atMaxStar ? 100 : Math.min(100, Math.round((have / Math.max(1, needed)) * 100));
    const canStarUp = !atMaxStar && have >= needed;
    const ascendReady = canAscendHero(progress.stars, ascendLevel, progress.level);
    const ascendCost = getAscendStoneCost(ascendLevel);
    const ascendHave = state.save.materials.mat_ascend_stone ?? 0;
    const atMaxAscend = ascendLevel >= MAX_HERO_ASCEND_LEVEL;
    const canAscend = ascendReady && ascendCost != null && ascendHave >= ascendCost;
    const chosenSkill = progress.chosenSkillId ? HERO_SKILL_BY_ID[progress.chosenSkillId] : null;
    const signatureUnlocked = canLearnHeroSkill(progress.level);
    const unspent = getTalentPointsUnspent(progress.level, progress.talentRanks ?? {});
    const renderTile = (
      kind: "active" | "passive" | "signature" | "talent",
      name: string,
      tag: string,
      unlocked: boolean,
    ) => `
          <button
            type="button"
            class="equip-skill-tile ${unlocked ? "" : "locked"}"
            data-action="equip-skill-tips"
            data-skill-kind="${kind}"
            aria-label="${unlocked ? `查看${kind === "active" ? "主动" : kind === "passive" ? "被动" : kind === "signature" ? "英雄" : "天赋"} ${name}` : `${name}未解锁`}"
          >
            <span class="equip-skill-tile-tag" aria-hidden="true">${unlocked ? tag : "锁"}</span>
            <strong class="equip-skill-name">${name}</strong>
          </button>`;
    const levelCopy = atMaxLevel
      ? progress.level >= worldCap
        ? `Lv.${progress.level} · 已达上限`
        : `Lv.${progress.level}/${levelCap} · 需进阶后继续`
      : `升级费用 · ✧ ${compact(levelCost)} · ${progress.level}/${levelCap}`;
    const ascendCopy = atMaxAscend
      ? `进阶 ${ascendLevel}/${MAX_HERO_ASCEND_LEVEL} · 已满阶`
      : ascendReady
        ? `进阶 ${ascendLevel}/${MAX_HERO_ASCEND_LEVEL} · 石 ${ascendHave}/${ascendCost}`
        : `进阶 · 需满星且满级`;
    return `
      <div class="equip-skill-section" aria-label="英雄技能、升级、升星与进阶">
        <div class="equip-skill-list" aria-label="技能栏">
          ${renderTile("active", active.name, "技", true)}
          ${renderTile("passive", passive.name, "被", true)}
          ${renderTile("signature", chosenSkill?.name ?? (signatureUnlocked ? "选择技能" : "英雄技能"), "英", signatureUnlocked)}
          ${renderTile("talent", unspent > 0 ? `天赋 ${unspent}` : "天赋", "赋", true)}
        </div>
        <div class="equip-level-frame" aria-label="角色升级">
          <div class="equip-level-icon" aria-hidden="true"><span>Lv</span></div>
          <div class="equip-level-frame-main">
            <div class="equip-level-cost">${levelCopy}</div>
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
        <div class="equip-ascend-frame ${atMaxAscend ? "done" : ""} ${ascendReady ? "" : "locked"}" aria-label="角色进阶">
          <div class="equip-ascend-icon" aria-hidden="true"><span>◆</span></div>
          <div class="equip-ascend-frame-main">
            <div class="equip-ascend-cost">${ascendCopy}</div>
            <button
              type="button"
              class="primary-button compact"
              data-action="hero-ascend"
              data-hero-id="${heroId}"
              ${canAscend ? "" : "disabled"}
            >${atMaxAscend ? "满阶" : "进阶"}</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSkillTips(heroId: HeroId): string {
    const kind = this.equipSkillTipsKind;
    if (!kind || kind === "talent") return "";
    const progress = this.store.getState().save.roster[heroId];
    const chosen = progress.chosenSkillId ? HERO_SKILL_BY_ID[progress.chosenSkillId] : null;
    const signatureUnlocked = canLearnHeroSkill(progress.level);
    const activeOrPassive =
      kind === "active" ? ACTIVE_SKILL_BY_HERO[heroId] : kind === "passive" ? PASSIVE_SKILL_BY_HERO[heroId] : null;
    const skill = kind === "signature" ? chosen : activeOrPassive;
    const kindLabel = kind === "active" ? "主动技能" : kind === "passive" ? "被动技能" : "英雄技能";
    const tag = kind === "active" ? "技" : kind === "passive" ? "被" : "英";
    const unlocked = kind === "signature" ? signatureUnlocked : true;
    const lockHint = kind === "signature" && !unlocked ? `英雄 ${HERO_SKILL_UNLOCK_LEVEL} 级解锁` : null;
    const cooldown =
      skill && "cooldownMs" in skill && skill.cooldownMs != null
        ? `${Math.round(skill.cooldownMs / 100) / 10}s`
        : null;
    const title = skill?.name ?? (kind === "signature" ? (unlocked ? "尚未选择" : "英雄技能") : "");
    const description =
      skill?.description ??
      (kind === "signature"
        ? unlocked
          ? "从共用技能中选择 1 个，适配坦克、爆发、治疗或控制。"
          : `升到 ${HERO_SKILL_UNLOCK_LEVEL} 级后，可从共用英雄技能中选择 1 个。`
        : "");
    const footer =
      lockHint
        ? `<p class="equip-skill-tips-cd muted">${lockHint}</p>`
        : kind === "signature" && unlocked && !chosen
          ? `<button type="button" class="primary-button compact" data-action="equip-skill-pick">选择技能</button>`
          : kind === "signature" && chosen
            ? `<p class="equip-skill-tips-cd">冷却时间 <b>${cooldown}</b></p>
          <button type="button" class="secondary-button compact" data-action="equip-skill-pick">更换技能</button>`
            : cooldown
              ? `<p class="equip-skill-tips-cd">冷却时间 <b>${cooldown}</b></p>`
              : `<p class="equip-skill-tips-cd muted">被动效果，无冷却</p>`;
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭技能详情"></div>
        <section class="equip-tips-panel skill-tips" role="dialog" aria-modal="true" aria-label="${kindLabel}">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <div class="equip-skill-tips-head">
            <div class="equip-skill-icon large" aria-hidden="true"><span>${unlocked ? tag : "锁"}</span></div>
            <div>
              <small>${kindLabel}${lockHint ? ` · ${lockHint}` : cooldown ? ` · CD ${cooldown}` : ""}</small>
              <h3>${title}</h3>
            </div>
          </div>
          <p class="equip-skill-tips-desc">${description}</p>
          ${footer}
        </section>
      </div>
    `;
  }

  private renderTalentTips(state: GameStoreState, heroId: HeroId): string {
    const progress = state.save.roster[heroId];
    const ranks = progress.talentRanks ?? {};
    const earned = getTalentPointsEarned(progress.level);
    const unspent = getTalentPointsUnspent(progress.level, ranks);
    const selectedId = this.selectedTalentId;
    const selected = selectedId ? TALENT_BY_ID[selectedId] : null;
    const selectedRank = selectedId ? (ranks[selectedId] ?? 0) : 0;
    const canUpgrade = selectedId ? canUpgradeTalent(ranks, selectedId, progress.level) : false;
    const blocked = selectedId && !canUpgrade ? talentUpgradeBlocked(ranks, selectedId, progress.level) : null;
    const tiersHtml = TALENT_TIERS.map((tierDef, tierIndex) => {
      const { spent, max } = getTalentTierProgress(ranks, tierDef.tier);
      const unlocked = isTalentTierUnlocked(ranks, tierDef.tier);
      const nodes = talentsInTier(tierDef.tier)
        .map((node) => {
          const rank = ranks[node.id] ?? 0;
          const nodeUnlocked = isTalentNodeUnlocked(ranks, node.id);
          const selectedClass = selectedId === node.id ? " selected" : "";
          const learnedClass = rank > 0 ? " learned" : "";
          const lockedClass = !nodeUnlocked && rank <= 0 ? " locked" : "";
          const availableClass = nodeUnlocked && rank <= 0 ? " available" : "";
          return `
            <button
              type="button"
              class="talent-node${learnedClass}${selectedClass}${lockedClass}${availableClass}"
              data-action="talent-select"
              data-talent-id="${node.id}"
              aria-pressed="${selectedId === node.id ? "true" : "false"}"
              aria-label="${node.name} ${rank}/${node.maxRank}${nodeUnlocked ? "" : "（未解锁）"}"
            >
              <span class="talent-node-icon" aria-hidden="true">${node.icon}</span>
              <strong class="talent-node-name">${node.name}</strong>
              <small class="talent-node-rank">${rank}/${node.maxRank}</small>
            </button>`;
        })
        .join("");
      const bridge =
        tierIndex === 0
          ? ""
          : `<div class="talent-tier-bridge${unlocked ? " lit" : ""}" aria-hidden="true"></div>`;
      const lockHint =
        unlocked || tierDef.previousTierPointsRequired <= 0
          ? ""
          : `<span class="talent-tier-lock">需上一层 ${tierDef.previousTierPointsRequired} 点</span>`;
      return `
        ${bridge}
        <section class="talent-tier${unlocked ? "" : " locked"} count-${talentsInTier(tierDef.tier).length}" data-tier="${tierDef.tier}">
          <div class="talent-tier-meta">
            <span class="talent-tier-mark${spent > 0 ? " active" : ""}">${spent}/${max}</span>
            <div class="talent-tier-copy">
              <strong>${tierDef.name}</strong>
              <small>${tierDef.hint}</small>
              ${lockHint}
            </div>
          </div>
          <div class="talent-tier-nodes">${nodes}</div>
        </section>`;
    }).join("");
    const selectedTier = selected ? TALENT_TIERS.find((tier) => tier.tier === selected.tier) : null;
    const nextEffect =
      selected && selectedRank < selected.maxRank
        ? describeTalentEffectAtRank(selected.id, selectedRank + 1)
        : null;
    const unlockHint =
      selected && !isTalentTierUnlocked(ranks, selected.tier)
        ? `需在「${TALENT_TIERS.find((tier) => tier.tier === selected.tier - 1)?.name ?? "上一层"}」投入 ${selectedTier?.previousTierPointsRequired ?? 0} 点`
        : null;
    const unlockedSelected = selectedId ? isTalentNodeUnlocked(ranks, selectedId) : false;
    const nodeTips =
      selected && selectedTier
        ? `
      <div class="talent-node-tips-layer" role="presentation">
        <div class="talent-node-tips-backdrop" data-action="close-talent-node-tips" aria-label="关闭天赋详情"></div>
        <section class="equip-tips-panel talent-node-tips" role="dialog" aria-modal="true" aria-label="${selected.name}">
          <button type="button" class="modal-close" data-action="close-talent-node-tips" aria-label="关闭">×</button>
          <div class="equip-skill-tips-head">
            <div class="talent-node-tips-icon" aria-hidden="true"><span>${selected.icon}</span></div>
            <div>
              <small>${selectedTier.name} · Lv.${selectedRank}/${selected.maxRank}${unlockedSelected ? "" : " · 未解锁"}</small>
              <h3>${selected.name}</h3>
            </div>
          </div>
          <p class="equip-skill-tips-desc">${selected.blurb}</p>
          <ul class="talent-node-tips-stats">
            <li><span>当前效果</span><strong>${describeTalentEffectAtRank(selected.id, selectedRank)}</strong></li>
            ${nextEffect ? `<li><span>下级效果</span><strong>${nextEffect}</strong></li>` : `<li><span>状态</span><strong>已满级</strong></li>`}
            ${unlockHint ? `<li><span>条件</span><strong>${unlockHint}</strong></li>` : ""}
          </ul>
          <div class="talent-node-tips-actions">
            <button type="button" class="secondary-button compact" data-action="close-talent-node-tips">关闭</button>
            <button type="button" class="primary-button compact" data-action="talent-up" data-talent-id="${selected.id}" ${canUpgrade ? "" : "disabled"}>${canUpgrade ? "升级" : blocked ?? "无法升级"}</button>
          </div>
        </section>
      </div>`
        : "";
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭天赋树"></div>
        <section class="equip-tips-panel talent-tips" role="dialog" aria-modal="true" aria-label="天赋">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <header class="talent-board-head">
            <h3>天赋</h3>
            <p>剩余天赋点数：<b>${unspent}</b><span class="talent-board-earned">（已获 ${earned}）</span></p>
          </header>
          <div class="talent-tree-board">
            <div class="talent-tree">${tiersHtml}</div>
          </div>
          <p class="talent-tips-hint">在上一层投入足够点数后解锁下一层。关键层天赋更少、更强，由你衡量是否适合当前英雄。</p>
        </section>
        ${nodeTips}
      </div>
    `;
  }

  private renderSkillPickTips(state: GameStoreState, heroId: HeroId): string {
    const chosenId = state.save.roster[heroId].chosenSkillId;
    const cards = HERO_SKILLS.map((skill) => {
      const selected = chosenId === skill.id;
      const cooldown = `${Math.round(skill.cooldownMs / 100) / 10}s`;
      return `
        <article class="skill-pick-card ${selected ? "selected" : ""}">
          <header>
            <small>${skill.roleLabel}</small>
            <strong>${skill.name}</strong>
          </header>
          <p>${skill.description}</p>
          <div class="skill-pick-card-foot">
            <span>CD ${cooldown}</span>
            <button
              type="button"
              class="primary-button compact"
              data-action="choose-hero-skill"
              data-skill-id="${skill.id}"
              ${selected ? "disabled" : ""}
            >${selected ? "已选择" : "选择"}</button>
          </div>
        </article>`;
    }).join("");
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭技能选择"></div>
        <section class="equip-tips-panel skill-pick-tips" role="dialog" aria-modal="true" aria-label="选择英雄技能">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <header class="talent-tips-head">
            <h3>选择英雄技能</h3>
            <p>所有英雄共用这 8 个技能，到达 ${HERO_SKILL_UNLOCK_LEVEL} 级后任选 1 个。</p>
          </header>
          <div class="skill-pick-grid">${cards}</div>
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
    const fromCraft = this.itemTipsSource === "craft";
    const inCube = fromAlchemy && this.alchemySlots.includes(item.instanceId);
    const inCraft = fromCraft && this.craftTargetId === item.instanceId;
    const actions = fromAlchemy
      ? `
        <div class="item-tips-actions">
          <button class="secondary-button" data-action="item-salvage">分解 · ● ${compact(salvageGold)}</button>
          <button class="primary-button" data-action="${inCube ? "alchemy-item-remove" : "alchemy-item-put"}">
            ${inCube ? "取出" : "放入"}
          </button>
        </div>`
      : fromCraft
        ? `
        <div class="item-tips-actions">
          <button class="secondary-button" data-action="item-salvage">分解 · ● ${compact(salvageGold)}</button>
          <button class="primary-button" data-action="${inCraft ? "craft-item-remove" : "craft-item-put"}">
            ${inCraft ? "取出" : "放入"}
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
                <div class="hero-damage-identity-slot"></div>
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
            <div class="equip-stats-tabs" hidden></div>
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
    const statsTabs = modal.querySelector<HTMLElement>(".equip-stats-tabs");
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
    if (statsTabs) {
      statsTabs.hidden = showGear;
      statsTabs.innerHTML = statsContent?.tabsHtml ?? "";
    }
    if (candidateSection) candidateSection.hidden = !showGear;
    if (skillHost) {
      skillHost.hidden = showGear;
      skillHost.innerHTML = statsContent?.skillsHtml ?? "";
    }

    const portraitStage = modal.querySelector<HTMLElement>(".character-portrait-stage");
    const portraitArt = modal.querySelector<HTMLImageElement>(".character-portrait-art");
    const portraitStars = modal.querySelector(".character-portrait-stars");
    const portraitIdentity = modal.querySelector<HTMLElement>(".hero-damage-identity-slot");
    const portraitName = modal.querySelector(".character-portrait-meta strong");
    const portraitMeta = modal.querySelector(".character-portrait-meta small");
    if (portraitStage) {
      portraitStage.style.setProperty("--hero-color", hero.color);
      const ascendLevel = progress.ascendLevel ?? 0;
      portraitStage.classList.toggle("ascended", ascendLevel > 0);
      portraitStage.dataset.ascend = String(ascendLevel);
      for (let i = 1; i <= MAX_HERO_ASCEND_LEVEL; i++) {
        portraitStage.classList.toggle(`ascend-${i}`, ascendLevel === i);
      }
    }
    if (portraitIdentity) {
      portraitIdentity.innerHTML = this.renderHeroDamageIdentity(hero.damageSchool, hero.damageElement);
    }
    if (portraitArt) {
      if (portraitArt.getAttribute("src") !== portrait) portraitArt.src = portrait;
      portraitArt.alt = hero.name;
    }
    if (portraitStars) {
      portraitStars.textContent =
        "★".repeat(progress.stars) + "☆".repeat(MAX_HERO_STARS - progress.stars);
    }
    if (portraitName) portraitName.textContent = hero.name;
    if (portraitMeta) {
      const ascendLevel = progress.ascendLevel ?? 0;
      portraitMeta.textContent =
        ascendLevel > 0
          ? `${hero.role} · Lv.${progress.level} · 进阶${ascendLevel}`
          : `${hero.role} · Lv.${progress.level}`;
    }

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
      } else if (this.equipTipsKind === "talent") {
        tipsHost.innerHTML = this.renderTalentTips(state, heroId);
      } else if (this.equipTipsKind === "skill-pick") {
        tipsHost.innerHTML = this.renderSkillPickTips(state, heroId);
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
              <div class="gem-offer-body">
                <span class="offer-art">◆</span>
                <small>宝石补给</small>
                <strong>50 宝石</strong>
              </div>
              <button class="shop-buy" data-action="shop-buy" data-offer-id="${offer.offerId}" ${offer.sold || state.save.gold < offer.priceGold ? "disabled" : ""}>
                ${offer.sold ? "已售罄" : `● ${compact(offer.priceGold)}`}
              </button>
            </article>`;
          }
          return `<article class="shop-card equipment-offer ${rarityClass(offer.item.rarity)} ${offer.sold ? "sold" : ""}">
            ${itemDetailSheet(offer.item)}
            <button class="shop-buy" data-action="shop-buy" data-offer-id="${offer.offerId}" ${offer.sold || state.save.gold < offer.priceGold ? "disabled" : ""}>
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
          const roleClass = `role-${hero.role}`;
          const ascendLevel = heroProgress.ascendLevel ?? 0;
          const ascendClass = ascendLevel > 0 ? `ascended ascend-${ascendLevel}` : "";
          const ascendCrest = renderAscendCrest(ascendLevel, hero.id);
          return `<button class="hero-card ${roleClass} ${ascendClass} ${this.selectedHeroId === hero.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="${unlocked ? "hero-detail" : "summon-open"}" data-hero-id="${hero.id}" role="listitem" aria-label="${unlocked ? `${hero.name} ${hero.role} Lv.${heroProgress.level} ${heroProgress.stars}星${ascendLevel > 0 ? ` 进阶${ascendLevel}` : ""}` : `${hero.name}未解锁`}" aria-pressed="${this.selectedHeroId === hero.id ? "true" : "false"}" style="--role-color:${hero.color}">
            <div class="hero-card-art" style="--hero-color:${hero.color}">
              ${ascendCrest}
              <img src="${portrait}" alt="" draggable="false" />
            </div>
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
            <div class="chapter-heading-meta">
              <span class="chapter-element" style="--element-color:${DAMAGE_ELEMENT_COLOR[chapterThemeElement(chapter)]}">${DAMAGE_ELEMENT_LABEL[chapterThemeElement(chapter)]}伤害</span>
              <span class="chapter-progress">${cleared}/12</span>
            </div>
          </header>
          <div class="stage-map">
            ${stages
              .map((stage) => {
                const unlocked = stage.stage <= state.save.highestUnlockedStage;
                const isCleared = stage.stage <= state.save.highestClearedStage;
                const isCurrent = state.save.currentStage === stage.stage;
                return `<button class="stage-node ${isCurrent ? "current" : ""} ${isCleared ? "cleared" : ""}" data-action="${unlocked ? "stage-select" : "locked-stage"}" data-stage="${stage.stage}" ${unlocked ? "" : "disabled"}>
                <span>${isCleared ? "✓" : unlocked ? stage.stage - (chapter - 1) * 12 : "🔒"}</span><small>${stage.id}</small>
              </button>`;
              })
              .join("")}
          </div>
        </section>
      `;
    };

    const dateKey = state.save.shop.dateKey || getDateKey();
    const dailyIds = getDailyDungeonIds(dateKey);
    const dailyDungeons = dailyIds.map((id) => DUNGEON_BY_ID[id]);
    const dailyReady = dailyDungeons.filter((dungeon) =>
      isDungeonUnlocked(dungeon, state.save.highestClearedStage),
    ).length;

    const dungeonPanel = `
      <div class="dungeon-daily-tip" role="note">
        <strong>每日副本</strong>
        <span>每日随机开放 ${DAILY_DUNGEON_COUNT} 个关卡，次日刷新</span>
      </div>
      <div class="dungeon-section-head">
        <h3>今日开放</h3>
        <small>可挑战 ${dailyReady}/${DAILY_DUNGEON_COUNT}</small>
      </div>
      <div class="dungeon-grid" role="list" aria-label="今日开放副本">
        ${dailyDungeons
          .map((dungeon) => {
            const unlocked = isDungeonUnlocked(dungeon, state.save.highestClearedStage);
            const run = getDungeonRun(state.save.dungeonRuns, dungeon.id);
            const status = getDungeonRunStatus(run);
            const drops = dungeon.drops
              .map((drop) => `${MATERIAL_BY_ID[drop.materialId].name}×${drop.amount}+`)
              .join(" · ");
            const names = run
              ? run.heroIds.map((id) => HERO_BY_ID[id].name).join(" · ")
              : `${formatDungeonDuration(dungeon.durationMs)} · ${dungeon.partySize} 人`;
            const action =
              !unlocked ? "locked-dungeon" : status === "ready" ? "dungeon-claim" : status === "running" ? "dungeon-progress" : "dungeon-select";
            const statusLabel =
              !unlocked ? "锁定" : status === "ready" ? "领取" : status === "running" ? formatDungeonCountdown(getDungeonRunRemainingMs(run!)) : "派遣";
            return `<button class="dungeon-card ${status === "running" ? "current" : ""} ${status === "ready" ? "ready" : ""} ${unlocked ? "" : "locked"}" data-action="${action}" data-dungeon-id="${dungeon.id}" role="listitem" ${unlocked && status !== "running" ? "" : unlocked ? "" : "disabled"} aria-label="${dungeon.name}">
            <header>
              <strong>${dungeon.name}</strong>
            </header>
            <p>${dungeon.blurb}</p>
            <div class="dungeon-bonus">${dungeon.bonusLabel}</div>
            <div class="dungeon-meta">${names}</div>
            <footer>
              <small>${unlocked ? `掉落 ${drops}` : `通关主线 ${dungeon.unlockClearedStage} 解锁`}</small>
              <span>${statusLabel}</span>
            </footer>
          </button>`;
          })
          .join("")}
      </div>
    `;

    const mainlineBody = CHAPTER_DEFINITIONS.map((chapter) => renderChapter(chapter.id)).join("");

    this.content.innerHTML = `
      <div class="panel-heading compact" data-panel="stages">
        <div class="stages-panel-tabs" role="tablist" aria-label="关卡模式">
          <button type="button" class="stages-panel-tab ${this.stagesPanelTab === "mainline" ? "active" : ""}" data-action="stages-panel-tab" data-tab="mainline" role="tab" aria-selected="${this.stagesPanelTab === "mainline" ? "true" : "false"}">主线</button>
          <button type="button" class="stages-panel-tab ${this.stagesPanelTab === "dungeon" ? "active" : ""}" data-action="stages-panel-tab" data-tab="dungeon" role="tab" aria-selected="${this.stagesPanelTab === "dungeon" ? "true" : "false"}">副本</button>
        </div>
        <span class="panel-meta">${this.stagesPanelTab === "dungeon" ? `今日开放 ${DAILY_DUNGEON_COUNT}` : `通关 ${state.save.highestClearedStage}/${MAX_STAGE}`}</span>
      </div>
      ${this.stagesPanelTab === "dungeon" ? dungeonPanel : mainlineBody}
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

  private pruneCraftSelection(state: GameStoreState): void {
    if (this.craftTargetId && !state.save.inventory.some((item) => item.instanceId === this.craftTargetId)) {
      this.craftTargetId = null;
      this.craftSmeltAffixId = null;
      this.craftResetAffixIndex = null;
      this.craftSocketIndex = 0;
    }
    if (this.craftMaterialId && (state.save.materials[this.craftMaterialId] ?? 0) <= 0) {
      this.craftMaterialId = null;
    }
  }

  private materialDetailSheet(materialId: MaterialId, count: number): string {
    const definition = MATERIAL_BY_ID[materialId];
    const kindLabel = MATERIAL_CATEGORY_LABELS[definition.category];
    const bonusLines: string[] = [];
    if (definition.gemBonus?.attack) bonusLines.push(`攻击 +${definition.gemBonus.attack}`);
    if (definition.gemBonus?.maxHp) bonusLines.push(`生命 +${definition.gemBonus.maxHp}`);
    if (definition.gemBonus?.defense) bonusLines.push(`防御 +${definition.gemBonus.defense}`);
    if (definition.gemBonus?.critRate) {
      bonusLines.push(`暴击率 +${Math.round(definition.gemBonus.critRate * 100)}%`);
    }
    return `
      <div class="item-detail-sheet material-detail-sheet">
        <div class="item-detail-left">
          <div class="detail-icon item-detail-icon material-tone-${definition.tone}">
            <span class="material-glyph" aria-hidden="true">${definition.glyph}</span>
          </div>
          <strong class="item-detail-name">${definition.name}</strong>
          <span class="item-detail-kind">${kindLabel}</span>
          <span class="item-detail-rarity">库存 ×${count}</span>
        </div>
        <div class="item-detail-right">
          <div class="item-stat-heading">说明</div>
          <div class="item-stat-line">${definition.description}</div>
          <div class="item-stat-heading">效果</div>
          ${
            bonusLines.length
              ? bonusLines.map((line) => `<div class="item-stat-line affix">${line}</div>`).join("")
              : `<div class="item-stat-line muted">用于装备工艺</div>`
          }
        </div>
      </div>
    `;
  }

  private craftAffixBudget(item: InventoryItem): number {
    return getItemBudget(item.stage, item.rarity, 1);
  }

  private craftAffixRangeText(item: InventoryItem, affixId: AffixId): string {
    if (item.rarity === "common") return "";
    return formatAffixRangeLabel(affixId, item.rarity, this.craftAffixBudget(item));
  }

  private renderResetAffixTips(state: GameStoreState): void {
    const target = this.craftTargetId
      ? state.save.inventory.find((item) => item.instanceId === this.craftTargetId) ?? null
      : null;
    if (!target || target.affixes.length === 0) {
      this.closeModal();
      return;
    }
    const lockedIndex =
      typeof target.resetAffixIndex === "number" ? target.resetAffixIndex : null;
    const selectedIndex = this.craftResetAffixIndex;
    const rows = target.affixes
      .map((roll, index) => {
        const lockedOut = lockedIndex != null && lockedIndex !== index;
        const selected = selectedIndex === index;
        const label = formatAffixValue(roll.affixId, roll.value);
        const range = this.craftAffixRangeText(target, roll.affixId);
        return `<button type="button" class="reset-affix-tip-option ${selected ? "selected" : ""} ${lockedOut ? "locked-out" : ""} ${lockedIndex === index ? "locked" : ""}" data-action="craft-reset-affix" data-affix-index="${index}" ${lockedOut ? "disabled" : ""}>
          <span class="craft-affix-index">词条 ${index + 1}${lockedIndex === index ? " · 已锁定" : ""}</span>
          <strong>${label}</strong>
          ${range ? `<small class="affix-range">${range}</small>` : ""}
        </button>`;
      })
      .join("");
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal reset-affix-tips" role="dialog" aria-modal="true" aria-label="选择重置词条">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <h2 class="reset-affix-tips-title">选择重置词条</h2>
        <p class="sheet-note">${
          lockedIndex != null
            ? "该装备已锁定一条词条，只能继续重置它"
            : "每件装备只能锁定重置同一条词条 · 重置后数值在区间内随机"
        }</p>
        <div class="reset-affix-tip-list">${rows}</div>
      </section>
    `;
  }

  private renderSmeltAffixTips(state: GameStoreState): void {
    const target = this.craftTargetId
      ? state.save.inventory.find((item) => item.instanceId === this.craftTargetId) ?? null
      : null;
    if (!target || target.rarity === "common") {
      this.closeModal();
      return;
    }
    const choices = getSmeltAffixChoices(target);
    if (!choices.length) {
      this.closeModal();
      return;
    }
    const rows = choices
      .map((affixId) => {
        const def = AFFIX_BY_ID[affixId];
        const selected = this.craftSmeltAffixId === affixId;
        const range = this.craftAffixRangeText(target, affixId);
        return `<button type="button" class="reset-affix-tip-option ${selected ? "selected" : ""}" data-action="craft-smelt-affix" data-affix-id="${affixId}">
          <span class="craft-affix-index">${affixDisplaysPercent(def.kind) ? "百分比词条" : "数值词条"}</span>
          <strong>${def.name}</strong>
          ${range ? `<small class="affix-range">${range}</small>` : ""}
        </button>`;
      })
      .join("");
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal reset-affix-tips" role="dialog" aria-modal="true" aria-label="选择熔炼词条">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <h2 class="reset-affix-tips-title">选择熔炼词条</h2>
        <p class="sheet-note">熔入后数值在区间内随机生成，可重复熔炼添加多条</p>
        <div class="reset-affix-tip-list">${rows}</div>
      </section>
    `;
  }

  private renderSmeltResultTips(): void {
    const payload = this.modalPayload as { affixId?: AffixId; value?: number } | null;
    if (!payload?.affixId || typeof payload.value !== "number") {
      this.closeModal();
      return;
    }
    const line = formatAffixValue(payload.affixId, payload.value);
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal craft-result-tips" role="dialog" aria-modal="true" aria-label="熔炼结果">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <h2 class="reset-affix-tips-title">熔炼成功</h2>
        <p class="sheet-note">本次获得属性</p>
        <div class="craft-result-value">${line}</div>
        <button type="button" class="primary-button wide" data-action="close-modal">确定</button>
      </section>
    `;
  }

  private renderMaterialTips(state: GameStoreState): void {
    const materialId = this.selectedMaterialId;
    if (!materialId || !MATERIAL_BY_ID[materialId]) {
      this.closeModal();
      return;
    }
    const count = state.save.materials[materialId] ?? 0;
    const inSlot = this.craftMaterialId === materialId;
    const canInteract =
      this.materialTipsSource === "craft" &&
      this.craftMode !== "upgrade" &&
      this.craftMode !== "reset" &&
      this.craftMode !== "smelt";
    const actions = canInteract
      ? `<div class="item-tips-actions">
          <button class="primary-button" data-action="${inSlot ? "craft-material-remove" : "craft-material-put"}" ${!inSlot && count <= 0 ? "disabled" : ""}>
            ${inSlot ? "取出" : "放入"}
          </button>
        </div>`
      : "";
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal material-tips-modal" role="dialog" aria-modal="true" aria-label="材料详情">
        <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        ${this.materialDetailSheet(materialId, count)}
        ${actions}
      </section>
    `;
  }

  private renderCraftModeMenu(): string {
    const modes = Object.keys(CRAFT_MODE_LABELS) as CraftMode[];
    return `
      <div class="craft-mode-wrap">
        <button type="button" class="craft-mode-trigger ${this.craftModeMenuOpen ? "open" : ""}" data-action="craft-mode-toggle" aria-expanded="${this.craftModeMenuOpen}">
          <span>${CRAFT_MODE_LABELS[this.craftMode]}</span>
          <span class="craft-mode-caret" aria-hidden="true">▾</span>
        </button>
        ${
          this.craftModeMenuOpen
            ? `<div class="craft-mode-menu" role="menu">
                ${modes
                  .map(
                    (mode) => `
                  <button type="button" class="craft-mode-option ${mode === this.craftMode ? "active" : ""}" data-action="craft-mode-select" data-mode="${mode}" role="menuitem">
                    ${CRAFT_MODE_LABELS[mode]}
                  </button>`,
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `;
  }

  private renderCraftTargetCard(target: InventoryItem | null, meta: string): string {
    if (!target) {
      return `<div class="craft-target empty"><span class="craft-target-empty">点击右侧装备查看详情并放入</span></div>`;
    }
    const definition = ITEM_BY_ID[target.definitionId]!;
    return `
      <button type="button" class="craft-target ${rarityClass(target.rarity)}" data-action="craft-item-detail" data-item-id="${target.instanceId}">
        <span class="craft-target-art">${equipmentArt(definition.icon)}</span>
        <span class="craft-target-meta">${definition.name}<small>${meta}</small></span>
      </button>
    `;
  }

  private renderCraftMaterialSlot(state: GameStoreState, hint: string): string {
    const materialId = this.craftMaterialId;
    if (!materialId) {
      return `<div class="craft-material-slot empty"><span>${hint}</span></div>`;
    }
    const definition = MATERIAL_BY_ID[materialId];
    const count = state.save.materials[materialId] ?? 0;
    return `
      <button type="button" class="craft-material-slot filled tone-${definition.tone}" data-action="craft-material-detail" data-material-id="${materialId}">
        <span class="material-glyph" aria-hidden="true">${definition.glyph}</span>
        <span class="craft-material-meta">${definition.name}<small>库存 ×${count}</small></span>
      </button>
    `;
  }

  private renderCraftWorkbench(state: GameStoreState): string {
    const target = this.craftTargetId
      ? state.save.inventory.find((item) => item.instanceId === this.craftTargetId) ?? null
      : null;
    const materials = state.save.materials;
    const selectedMaterial = this.craftMaterialId;

    if (this.craftMode === "socket") {
      const have = materials.mat_socket_stone ?? 0;
      const sockets = target?.sockets?.length ?? 0;
      const materialReady = selectedMaterial === "mat_socket_stone" && have >= 1;
      const can = Boolean(target) && sockets < MAX_EQUIPMENT_SOCKETS && materialReady;
      return `
        <div class="craft-workbench">
          ${this.renderCraftTargetCard(target, `孔位 ${sockets}/${MAX_EQUIPMENT_SOCKETS}`)}
          ${this.renderCraftMaterialSlot(state, "点击右侧材料查看详情并放入")}
          <p class="alchemy-hint">消耗开孔石 ×1</p>
          <button class="primary-button wide" data-action="craft-socket" ${can ? "" : "disabled"}>开孔</button>
        </div>
      `;
    }

    if (this.craftMode === "reset") {
      const have = materials.mat_reset_scroll ?? 0;
      const materialReady = have >= 1;
      const affixes = target?.affixes ?? [];
      const lockedIndex =
        typeof target?.resetAffixIndex === "number" ? target.resetAffixIndex : null;
      if (
        this.craftResetAffixIndex != null &&
        (this.craftResetAffixIndex < 0 || this.craftResetAffixIndex >= affixes.length)
      ) {
        this.craftResetAffixIndex = null;
      }
      if (lockedIndex != null) {
        this.craftResetAffixIndex = lockedIndex;
      } else if (this.craftResetAffixIndex == null && affixes.length === 1) {
        this.craftResetAffixIndex = 0;
      }
      const selectedIndex = this.craftResetAffixIndex;
      const selectedRoll = selectedIndex != null ? affixes[selectedIndex] : null;
      const selectedRange =
        target && selectedRoll ? this.craftAffixRangeText(target, selectedRoll.affixId) : "";
      const can =
        Boolean(target) &&
        affixes.length > 0 &&
        target?.rarity !== "common" &&
        selectedIndex != null &&
        materialReady &&
        (lockedIndex == null || lockedIndex === selectedIndex);
      const pickEnabled = Boolean(target) && affixes.length > 0;
      return `
        <div class="craft-workbench craft-workbench-reset">
          ${this.renderCraftTargetCard(
            target,
            lockedIndex != null
              ? `已锁定第 ${lockedIndex + 1} 条 · 仅可继续重置该条`
              : target
                ? "点击下方框架选择词条"
                : "点击右侧装备查看详情并放入",
          )}
          <button type="button" class="craft-reset-pick ${selectedRoll ? "filled" : "empty"} ${lockedIndex != null ? "locked" : ""}" data-action="craft-reset-affix-open" ${pickEnabled ? "" : "disabled"}>
            <span class="craft-reset-pick-label">所需重置词条</span>
            ${
              selectedRoll
                ? `<strong class="craft-reset-pick-value">${formatAffixValue(selectedRoll.affixId, selectedRoll.value)}</strong>
                   <small>${selectedRange || "区间未知"}${lockedIndex != null ? " · 已锁定" : " · 点击更换"}</small>`
                : `<strong class="craft-reset-pick-value muted">点击选择词条</strong>
                   <small>${target ? "从装备词条中挑选一条" : "请先放入装备"}</small>`
            }
          </button>
          <p class="alchemy-hint">${
            materialReady
              ? `重置卷轴充足（×${have}）· 确认后自动消耗 1 个`
              : `重置卷轴不足（×${have}）· 无法重置`
          }</p>
          <button class="primary-button wide" data-action="craft-reset" ${can ? "" : "disabled"}>重置词条</button>
        </div>
      `;
    }

    if (this.craftMode === "smelt") {
      const have = materials.mat_smelt_flux ?? 0;
      const choices = target ? getSmeltAffixChoices(target) : [];
      if (target && this.craftSmeltAffixId && !choices.includes(this.craftSmeltAffixId)) {
        this.craftSmeltAffixId = null;
      }
      const materialReady = have >= 1;
      const selectedDef = this.craftSmeltAffixId ? AFFIX_BY_ID[this.craftSmeltAffixId] : null;
      const selectedRange =
        target && this.craftSmeltAffixId ? this.craftAffixRangeText(target, this.craftSmeltAffixId) : "";
      const can =
        Boolean(target) &&
        target?.rarity !== "common" &&
        Boolean(this.craftSmeltAffixId) &&
        materialReady;
      const pickEnabled = Boolean(target) && target?.rarity !== "common" && choices.length > 0;
      return `
        <div class="craft-workbench craft-workbench-reset">
          ${this.renderCraftTargetCard(
            target,
            target
              ? target.rarity === "common"
                ? "普通品质无法熔炼"
                : "点击下方框架选择词条"
              : "点击右侧装备查看详情并放入",
          )}
          <button type="button" class="craft-reset-pick ${selectedDef ? "filled" : "empty"}" data-action="craft-smelt-affix-open" ${pickEnabled ? "" : "disabled"}>
            <span class="craft-reset-pick-label">所需熔炼词条</span>
            ${
              selectedDef
                ? `<strong class="craft-reset-pick-value">${selectedDef.name}</strong>
                   <small>${selectedRange || "区间未知"} · 点击更换</small>`
                : `<strong class="craft-reset-pick-value muted">点击选择词条</strong>
                   <small>${target ? "从可用词条中挑选一条熔入" : "请先放入装备"}</small>`
            }
          </button>
          <p class="alchemy-hint">${
            materialReady
              ? `熔炼触媒充足（×${have}）· 确认后自动消耗 1 个`
              : `熔炼触媒不足（×${have}）· 无法熔炼`
          }</p>
          <button class="primary-button wide" data-action="craft-smelt" ${can ? "" : "disabled"}>熔炼</button>
        </div>
      `;
    }

    // inlay
    const sockets = target?.sockets ?? [];
    if (sockets.length && this.craftSocketIndex >= sockets.length) {
      this.craftSocketIndex = 0;
    }
    const gemReady =
      Boolean(selectedMaterial) &&
      MATERIAL_BY_ID[selectedMaterial!]?.kind === "gem" &&
      (materials[selectedMaterial!] ?? 0) >= 1;
    const selectedSocket = sockets[this.craftSocketIndex];
    const can =
      Boolean(target) &&
      Boolean(selectedSocket) &&
      !selectedSocket?.gemId &&
      gemReady;
    return `
      <div class="craft-workbench">
        ${this.renderCraftTargetCard(target, `孔位 ${sockets.length}/${MAX_EQUIPMENT_SOCKETS}`)}
        <div class="craft-socket-grid" aria-label="宝石孔位">
          ${
            sockets.length
              ? sockets
                  .map((socket, index) => {
                    const filled = Boolean(socket.gemId);
                    const gemDef = socket.gemId
                      ? MATERIAL_BY_ID[socket.gemId as MaterialId]
                      : null;
                    return `<button type="button" class="craft-socket-cell ${this.craftSocketIndex === index ? "selected" : ""} ${filled ? "filled" : "empty"}" data-action="craft-socket-pick" data-socket-index="${index}" aria-label="孔位 ${index + 1}">
                      ${
                        filled
                          ? `<span class="material-glyph" aria-hidden="true">${gemDef?.glyph ?? "◆"}</span>`
                          : `<span class="craft-socket-empty" aria-hidden="true"></span>`
                      }
                    </button>`;
                  })
                  .join("")
              : `<p class="alchemy-hint socket-empty-hint">该装备尚未开孔</p>`
          }
        </div>
        ${this.renderCraftMaterialSlot(state, "点击右侧宝石查看详情并放入")}
        <div class="craft-action-row">
          <button class="primary-button wide" data-action="craft-inlay" ${can ? "" : "disabled"}>镶嵌</button>
          <button class="secondary-button" data-action="craft-remove-gem" ${target && selectedSocket?.gemId ? "" : "disabled"}>卸下</button>
        </div>
      </div>
    `;
  }

  private renderAlchemyUpgradePanel(state: GameStoreState): string {
    const filledIds = this.alchemySlots.filter((id): id is string => Boolean(id));
    const filledItems = filledIds
      .map((id) => state.save.inventory.find(({ instanceId }) => instanceId === id))
      .filter((item): item is InventoryItem => Boolean(item));
    const validationError = filledItems.length === ALCHEMY_SLOT_COUNT ? validateAlchemyInputs(filledItems) : null;
    const canCraft = filledItems.length === ALCHEMY_SLOT_COUNT && !validationError;
    return `
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
    `;
  }

  private renderAlchemyList(state: GameStoreState): string {
    if (this.alchemyListTab === "materials") {
      const rows = MATERIAL_DEFINITIONS.filter((entry) => {
        if (this.craftMode === "inlay") return entry.kind === "gem";
        if (this.craftMode === "socket") return entry.id === "mat_socket_stone";
        if (this.craftMode === "reset") return entry.id === "mat_reset_scroll";
        if (this.craftMode === "smelt") return entry.id === "mat_smelt_flux";
        return true;
      });
      return `
        <div class="alchemy-list item-grid" data-scroll="alchemy">
          ${
            rows.length
              ? rows
                  .map((entry) => {
                    const count = state.save.materials[entry.id] ?? 0;
                    const selected = this.craftMaterialId === entry.id;
                    const previewing = this.selectedMaterialId === entry.id;
                    return `<button type="button" class="item-card material-item-card tone-${entry.tone} ${selected ? "selected" : ""} ${previewing ? "alchemy-previewing" : ""}" data-action="craft-material-detail" data-material-id="${entry.id}" aria-label="${entry.name}">
                      <span class="item-icon material-icon" aria-hidden="true"><span class="material-glyph">${entry.glyph}</span></span>
                      <span class="material-stack">×${count}</span>
                    </button>`;
                  })
                  .join("")
              : `<div class="empty-state compact"><strong>暂无材料</strong></div>`
          }
        </div>
      `;
    }

    if (this.craftMode === "upgrade") {
      const candidates = alchemyCandidateItems(state.save.inventory, this.alchemyEquipmentMaps(state)).sort(
        compareInventoryItems,
      );
      return `
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
      `;
    }

    const items = [...state.save.inventory].sort(compareInventoryItems);
    return `
      <div class="alchemy-list item-grid" data-scroll="alchemy">
        ${
          items.length
            ? items
                .map((item) => {
                  const definition = ITEM_BY_ID[item.definitionId]!;
                  const selected = this.craftTargetId === item.instanceId;
                  const previewing = this.alchemyPreviewId === item.instanceId;
                  return `<button type="button" class="item-card ${rarityClass(item.rarity)} ${selected ? "selected" : ""} ${previewing ? "alchemy-previewing" : ""}" data-action="craft-item-detail" data-item-id="${item.instanceId}" aria-label="${RARITY_LABELS[item.rarity]}${definition.name}">
                    <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
                  </button>`;
                })
                .join("")
            : `<div class="empty-state compact"><strong>背包为空</strong><p>先去闯关获取装备</p></div>`
        }
      </div>
    `;
  }

  private renderAlchemy(state: GameStoreState): void {
    this.pruneAlchemySlots(state);
    this.pruneCraftSelection(state);
    const filledIds = this.alchemySlots.filter((id): id is string => Boolean(id));
    const showUpgradeActions = this.craftMode === "upgrade";

    this.content.innerHTML = `
      <div class="alchemy-page" data-panel="alchemy">
        <div class="panel-heading compact alchemy-heading">
          ${this.renderCraftModeMenu()}
          <span class="panel-meta alchemy-guide">${CRAFT_MODE_HINTS[this.craftMode]}</span>
          ${
            showUpgradeActions
              ? `<div class="panel-actions">
                  <button class="secondary-button compact" data-action="alchemy-auto-fill">一键放入</button>
                  <button class="secondary-button compact" data-action="alchemy-clear" ${filledIds.length ? "" : "disabled"}>清空</button>
                </div>`
              : `<div class="panel-actions"></div>`
          }
        </div>
        <div class="alchemy-layout">
          <section class="alchemy-cube-panel" aria-label="工艺台">
            ${
              this.craftMode === "upgrade"
                ? this.renderAlchemyUpgradePanel(state)
                : this.renderCraftWorkbench(state)
            }
          </section>
          <section class="alchemy-list-panel" aria-label="道具列表">
            <div class="alchemy-list-tabs" role="tablist">
              <button type="button" class="alchemy-list-tab ${this.alchemyListTab === "equipment" ? "active" : ""}" data-action="alchemy-list-tab" data-tab="equipment" role="tab">装备</button>
              <button type="button" class="alchemy-list-tab ${this.alchemyListTab === "materials" ? "active" : ""}" data-action="alchemy-list-tab" data-tab="materials" role="tab">材料</button>
            </div>
            ${this.renderAlchemyList(state)}
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
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="center-sheet settings-modal" role="dialog" aria-modal="true" aria-label="设置">
          <header>
            <h2>设置</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          <div class="settings-list">
            <label><span><b>游戏音效</b><small>攻击、技能与奖励提示</small></span><input type="checkbox" data-action="sound-toggle" ${state.save.settings.soundEnabled ? "checked" : ""}></label>
            <label><span><b>减弱动效</b><small>减少跳动、震动和飞行动画</small></span><input type="checkbox" data-action="motion-toggle" ${state.save.settings.reducedMotion ? "checked" : ""}></label>
            <button class="danger-button" data-action="clear-save">清除本地存档</button>
            <p class="version">青丘远征 Demo · v1.0.0</p>
          </div>
        </section>
      `;
    } else if (this.modal === "currency") {
      const currencyId = isAccountCurrencyId(this.modalPayload) ? this.modalPayload : "gold";
      const currency = ACCOUNT_CURRENCY_BY_ID[currencyId];
      this.overlay.innerHTML = this.sheet(`${currency.name}来源`, `
        <div class="info-card"><span>${currency.icon}</span>
          <p>${currency.blurb}</p>
        </div>
      `);
    } else if (this.modal === "loot-chest") {
      const payload = this.modalPayload as {
        level: number;
        gold: number;
        exp: number;
        items: InventoryItem[];
        lucky: boolean;
      } | null;
      if (!payload) {
        const chest = state.save.lootChest;
        const progress = Math.round(getLootChestProgress(chest) * 100);
        const canOpen = canOpenLootChest(chest);
        this.overlay.innerHTML = `
          <div class="modal-backdrop" data-action="close-modal"></div>
          <section class="item-tips-modal loot-chest-tips" role="dialog" aria-modal="true" aria-label="奖励宝箱">
            <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
            <div class="loot-chest-tips-head">
              <span class="loot-chest-info-icon" data-level="${chest.level}" aria-hidden="true">▣</span>
              <div>
                <strong>${getLootChestLabel(chest.level)} · Lv.${chest.level}/${LOOT_CHEST_MAX_LEVEL}</strong>
                <small>充能 ${progress}%${canOpen ? " · 可开启" : ""}</small>
              </div>
            </div>
            <p class="loot-chest-tips-copy">消灭怪物为宝箱充能，满条后升级（0→5）。1–5 级均可随时开启，开箱后回到 0 级。掉落对齐最高通关关卡；仅五级宝匣有极低概率更高掉落。</p>
          </section>
        `;
      } else {
        const itemRows = payload.items
          .map((item) => {
            const definition = ITEM_BY_ID[item.definitionId]!;
            return `<div class="loot-chest-reward-item ${rarityClass(item.rarity)}">
              <span class="loot-chest-reward-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
              <div>
                <strong>${definition.name}</strong>
                <small>${RARITY_LABELS[item.rarity]} · 掉落等级 ${item.stage}</small>
              </div>
            </div>`;
          })
          .join("");
        this.overlay.innerHTML = `
          <div class="modal-backdrop" data-action="close-modal"></div>
          <section class="item-tips-modal loot-chest-tips" role="dialog" aria-modal="true" aria-label="${payload.lucky ? "幸运开箱" : "开启宝箱"}">
            <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
            <h2 class="loot-chest-tips-title">${payload.lucky ? "幸运开箱！" : "开启宝箱"}</h2>
            <p class="sheet-note">${getLootChestLabel(payload.level)} · ● ${compact(payload.gold)} · ✧ ${compact(payload.exp)}${payload.lucky ? " · 稀有掉落" : ""}</p>
            <div class="loot-chest-reward-list">${itemRows || "<p class=\"sheet-note\">未获得装备</p>"}</div>
            <button type="button" class="primary-button wide" data-action="close-modal">收下</button>
          </section>
        `;
      }
    } else if (this.modal === "ability-tips") {
      this.renderAbilityTips(state);
    } else if (this.modal === "item-tips") {
      this.renderItemTips(state);
    } else if (this.modal === "material-tips") {
      this.renderMaterialTips(state);
    } else if (this.modal === "reset-affix-tips") {
      this.renderResetAffixTips(state);
    } else if (this.modal === "smelt-affix-tips") {
      this.renderSmeltAffixTips(state);
    } else if (this.modal === "smelt-result-tips") {
      this.renderSmeltResultTips();
    } else if (this.modal === "equip") {
      this.syncEquipModal(state);
    } else if (this.modal === "salvage") {
      this.renderSalvageModal(state);
    } else if (this.modal === "formation") {
      const busy = getBusyHeroIds(state.save.dungeonRuns);
      this.overlay.innerHTML = this.sheet("阵容编辑", `
        <p class="sheet-note">五个位置等价，点击位置后选择英雄。副本中的英雄无法上阵。</p>
        <div class="formation-slots">${this.formationDraft.map((heroId, index) => `<button class="${this.formationSlot === index ? "selected" : ""}" data-action="formation-slot" data-slot="${index}"><span>${heroId ? HERO_BY_ID[heroId].name.slice(0, 1) : "+"}</span><small>${heroId ? HERO_BY_ID[heroId].name : "空位"}</small></button>`).join("")}</div>
        <div class="formation-picker">${HERO_DEFINITIONS.filter(({ id }) => state.save.roster[id].unlocked).map((hero) => {
          const busyInDungeon = busy.has(hero.id);
          return `<button class="${this.formationDraft.includes(hero.id) ? "in-party" : ""} ${busyInDungeon ? "busy" : ""}" data-action="${busyInDungeon ? "formation-busy" : "formation-pick"}" data-hero-id="${hero.id}" ${busyInDungeon ? "disabled" : ""}><span style="--hero-color:${hero.color}">${hero.name.slice(0, 1)}</span><div><strong>${hero.name}</strong><small>${busyInDungeon ? "副本中" : `${hero.role} · ${hero.tagline}`}</small></div></button>`;
        }).join("")}</div>
        <button class="primary-button wide" data-action="formation-save">保存并重新挑战</button>
      `);
    } else if (this.modal === "dungeon-confirm") {
      if (this.overlay.querySelector(".dispatch-modal")) {
        this.syncDispatchSelection();
        return;
      }
      const dungeonId = String(this.modalPayload) as DungeonId;
      const dungeon = DUNGEON_BY_ID[dungeonId];
      const busy = getBusyHeroIds(state.save.dungeonRuns);
      const exploring = getExploringHeroIds(state.save.party);
      const drops = dungeon.drops
        .map((drop) => `${MATERIAL_BY_ID[drop.materialId].name}×${drop.amount}+`)
        .join(" · ");
      const selected = this.dispatchDraft.length;
      const ready = selected === dungeon.partySize;
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="center-sheet dispatch-modal" role="dialog" aria-modal="true" aria-label="派遣小队">
          <header>
            <h2>派遣小队</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          <div class="dispatch-summary">
            <strong>${dungeon.name}</strong>
            <p>${dungeon.blurb}</p>
            <p class="sheet-note">${formatDungeonDuration(dungeon.durationMs)} · ${dungeon.partySize} 人 · ${dungeon.bonusLabel}<br/>掉落 ${drops}</p>
          </div>
          <div class="hero-card-grid dispatch-picker" role="list" aria-label="选择派遣英雄">
            ${HERO_DEFINITIONS.map((hero) => {
              const heroProgress = state.save.roster[hero.id];
              const unlocked = heroProgress.unlocked;
              const occupied = busy.has(hero.id);
              const onMainline = exploring.has(hero.id);
              const blocked = occupied || onMainline;
              const picked = this.dispatchDraft.includes(hero.id);
              const portrait = ASSET_MANIFEST.characters[hero.id];
              const roleClass = `role-${hero.role}`;
              const ascendLevel = heroProgress.ascendLevel ?? 0;
              const ascendClass = ascendLevel > 0 ? `ascended ascend-${ascendLevel}` : "";
              const ascendCrest = renderAscendCrest(ascendLevel, `dispatch-${hero.id}`);
              const action = !unlocked
                ? ""
                : occupied
                  ? "dispatch-busy"
                  : onMainline
                    ? "dispatch-mainline"
                    : "dispatch-pick";
              const status = !unlocked
                ? "未解锁"
                : occupied
                  ? "副本中"
                  : onMainline
                    ? "主线中"
                    : ascendLevel > 0
                      ? `进阶${ascendLevel}`
                      : `Lv.${heroProgress.level}`;
              const label = unlocked
                ? `${hero.name} ${hero.role} Lv.${heroProgress.level}${ascendLevel > 0 ? ` 进阶${ascendLevel}` : ""}${occupied ? " 副本中" : onMainline ? " 主线中" : ""}`
                : `${hero.name}未解锁`;
              return `<button class="hero-card ${roleClass} ${ascendClass} ${picked ? "selected" : ""} ${blocked ? "busy" : ""} ${unlocked ? "" : "locked"}" ${action ? `data-action="${action}"` : ""} data-hero-id="${hero.id}" role="listitem" aria-label="${label}" aria-pressed="${picked ? "true" : "false"}" style="--role-color:${hero.color}" ${!unlocked || blocked ? "disabled" : ""}>
                <div class="hero-card-art" style="--hero-color:${hero.color}">
                  ${ascendCrest}
                  <img src="${portrait}" alt="" draggable="false" />
                </div>
                <strong class="hero-card-name">${hero.name}</strong>
                <span class="hero-card-meta">
                  <span class="hero-card-role">${hero.role}</span>
                  <span class="hero-card-level">${status}</span>
                </span>
              </button>`;
            }).join("")}
          </div>
          <button class="primary-button wide" data-action="dungeon-dispatch" data-dungeon-id="${dungeon.id}" ${ready ? "" : "disabled"}>出发 · ${selected}/${dungeon.partySize}</button>
        </section>
      `;
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
      this.overlay.innerHTML = this.sheet("切换关卡", `<div class="confirm-card"><strong>${definition.id} · ${definition.name}</strong><p>切换后将回到主线讨伐，进度条会清空。</p><p>本关精英与首领主要造成${DAMAGE_ELEMENT_LABEL[chapterThemeElement(definition.chapter)]}伤害，对应抗性可显著减伤。</p><button class="primary-button wide" data-action="stage-confirm" data-stage="${stage}">开始挑战</button></div>`);
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
      const reward = this.modalPayload as { minutes: number; gold: number; exp: number; gearCount: number };
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="reward-modal offline-reward-modal" role="dialog" aria-modal="true" aria-label="离线收益">
          <span class="reward-sun">☀</span>
          <small>欢迎归队</small>
          <h2>离线收益</h2>
          <p>小队巡逻了 ${reward.minutes} 分钟</p>
          <div class="reward-row reward-row-exp">
            <div><span>✧</span><strong>${compact(reward.exp)}</strong><small>经验</small></div>
            <div><span>●</span><strong>${compact(reward.gold)}</strong><small>金币</small></div>
            <div><span>🎒</span><strong>${reward.gearCount}</strong><small>装备</small></div>
          </div>
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
      <section class="item-tips-modal ability-tips-modal" role="dialog" aria-modal="true" aria-label="${definition.name}">
        <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <h2 class="ability-tips-title">${definition.name}</h2>
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

  private syncDispatchSelection(): void {
    const dungeon = DUNGEON_BY_ID[String(this.modalPayload) as DungeonId];
    if (!dungeon) return;
    const picked = new Set(this.dispatchDraft);
    for (const card of this.overlay.querySelectorAll<HTMLButtonElement>(".dispatch-picker .hero-card[data-hero-id]")) {
      const selected = picked.has(card.dataset.heroId as HeroId);
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    const submit = this.overlay.querySelector<HTMLButtonElement>('[data-action="dungeon-dispatch"]');
    if (!submit) return;
    const selected = this.dispatchDraft.length;
    submit.disabled = selected !== dungeon.partySize;
    submit.textContent = `出发 · ${selected}/${dungeon.partySize}`;
  }

  private onClick(event: Event): void {
    const origin = event.target as Element | null;
    const target = origin?.closest?.<HTMLElement>("[data-action]") ?? null;
    const action = target?.dataset.action;

    if (!target || !action) return;
    if (target instanceof HTMLButtonElement && target.disabled) return;
    this.options.onSoundRequested?.("button");
    if (action === "select-tab") {
      const tab = target.dataset.tab as keyof typeof tabMeta;
      if (tab !== "shop") this.shopPanel = "daily";
      if (tab === "stages") {
        this.stagesPanelTab = "mainline";
      }
      this.store.dispatch({ type: "ui:selectTab", tab });
    }
    else if (action === "open-stages") {
      this.stagesPanelTab = "mainline";
      this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    }
    else if (action === "open-dungeons") {
      this.stagesPanelTab = "dungeon";
      this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    }
    else if (action === "loot-chest-open") {
      const chest = this.store.getState().save.lootChest;
      if (!canOpenLootChest(chest)) {
        this.modalPayload = null;
        this.openModal("loot-chest");
        return;
      }
      this.store.dispatch({ type: "lootChest:open" });
    } else if (action === "alchemy-auto-fill") {
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
    } else if (action === "craft-mode-toggle") {
      this.craftModeMenuOpen = !this.craftModeMenuOpen;
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-mode-select") {
      const mode = target.dataset.mode as CraftMode | undefined;
      if (!mode || !(mode in CRAFT_MODE_LABELS)) return;
      this.craftMode = mode;
      this.craftModeMenuOpen = false;
      this.craftSmeltAffixId = null;
      this.craftResetAffixIndex = null;
      this.craftMaterialId = null;
      this.selectedMaterialId = null;
      if (mode === "inlay" || mode === "socket" || mode === "reset" || mode === "smelt") {
        this.alchemyListTab = "equipment";
      }
      this.renderAlchemy(this.store.getState());
    } else if (action === "alchemy-list-tab") {
      const tab = target.dataset.tab === "materials" ? "materials" : "equipment";
      this.alchemyListTab = tab;
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-item-detail") {
      const itemId = target.dataset.itemId;
      if (!itemId) return;
      this.alchemyPreviewId = itemId;
      this.selectedItemId = itemId;
      this.itemTipsSource = "craft";
      this.renderAlchemy(this.store.getState());
      this.openModal("item-tips");
    } else if (action === "craft-item-put") {
      const itemId = this.selectedItemId;
      if (!itemId) return;
      this.craftTargetId = itemId;
      this.craftSmeltAffixId = null;
      this.craftResetAffixIndex = null;
      this.craftSocketIndex = 0;
      const putItem = this.store.getState().save.inventory.find((entry) => entry.instanceId === itemId);
      if (this.craftMode === "reset" && putItem) {
        if (typeof putItem.resetAffixIndex === "number") {
          this.craftResetAffixIndex = putItem.resetAffixIndex;
        } else if (putItem.affixes.length === 1) {
          this.craftResetAffixIndex = 0;
        }
      }
      this.alchemyPreviewId = itemId;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast(this.craftMode === "reset" ? "已放入，请选择要重置的词条" : "已放入工艺台");
    } else if (action === "craft-item-remove") {
      if (!this.selectedItemId || this.craftTargetId !== this.selectedItemId) return;
      this.craftTargetId = null;
      this.craftSmeltAffixId = null;
      this.craftResetAffixIndex = null;
      this.craftSocketIndex = 0;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast("已从工艺台取出");
    } else if (action === "craft-material-detail") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return;
      this.selectedMaterialId = materialId;
      this.materialTipsSource = "craft";
      this.alchemyListTab = "materials";
      this.renderAlchemy(this.store.getState());
      this.openModal("material-tips");
    } else if (action === "inventory-material-detail") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return;
      this.selectedMaterialId = materialId;
      this.materialTipsSource = "inventory";
      this.openModal("material-tips");
    } else if (action === "inventory-bag-tab") {
      const tab = target.dataset.tab === "materials" ? "materials" : "equipment";
      if (tab === this.inventoryBagTab) return;
      this.inventoryBagTab = tab;
      this.renderInventory(this.store.getState());
    } else if (action === "craft-material-put") {
      const materialId = this.selectedMaterialId;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return;
      if ((this.store.getState().save.materials[materialId] ?? 0) <= 0) {
        this.showToast("材料不足");
        return;
      }
      if (this.craftMode === "inlay" && MATERIAL_BY_ID[materialId].kind !== "gem") {
        this.showToast("请选择宝石");
        return;
      }
      if (this.craftMode === "socket" && materialId !== "mat_socket_stone") {
        this.showToast("请放入开孔石");
        return;
      }
      if (this.craftMode === "reset" && materialId !== "mat_reset_scroll") {
        this.showToast("请放入重置卷轴");
        return;
      }
      if (this.craftMode === "smelt" && materialId !== "mat_smelt_flux") {
        this.showToast("请放入熔炼触媒");
        return;
      }
      this.craftMaterialId = materialId;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast("已放入材料");
    } else if (action === "craft-material-remove") {
      if (!this.selectedMaterialId || this.craftMaterialId !== this.selectedMaterialId) return;
      this.craftMaterialId = null;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast("已取出材料");
    } else if (action === "craft-reset-affix-open") {
      if (!this.craftTargetId) return;
      const item = this.store.getState().save.inventory.find((entry) => entry.instanceId === this.craftTargetId);
      if (!item || item.affixes.length === 0) {
        this.showToast("该装备没有可重置词条");
        return;
      }
      this.openModal("reset-affix-tips");
    } else if (action === "craft-reset-affix") {
      const index = Number(target.dataset.affixIndex);
      if (!Number.isInteger(index) || index < 0) return;
      const item = this.craftTargetId
        ? this.store.getState().save.inventory.find((entry) => entry.instanceId === this.craftTargetId)
        : null;
      if (!item) return;
      if (typeof item.resetAffixIndex === "number" && item.resetAffixIndex !== index) {
        this.showToast("只能继续重置已锁定的词条");
        return;
      }
      this.craftResetAffixIndex = index;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast(`已选择词条 ${index + 1}`);
    } else if (action === "craft-smelt-affix-open") {
      if (!this.craftTargetId) return;
      const item = this.store.getState().save.inventory.find((entry) => entry.instanceId === this.craftTargetId);
      if (!item || item.rarity === "common") {
        this.showToast("请先放入可熔炼的装备");
        return;
      }
      if (!getSmeltAffixChoices(item).length) {
        this.showToast("该部位暂无可熔炼词条");
        return;
      }
      this.openModal("smelt-affix-tips");
    } else if (action === "craft-smelt-affix") {
      const affixId = target.dataset.affixId as AffixId | undefined;
      if (!affixId || !AFFIX_BY_ID[affixId]) return;
      this.craftSmeltAffixId = affixId;
      this.closeModal();
      this.renderAlchemy(this.store.getState());
      this.showToast(`已选择 ${AFFIX_BY_ID[affixId].name}`);
    } else if (action === "craft-socket-pick") {
      const index = Number(target.dataset.socketIndex);
      if (!Number.isInteger(index) || index < 0 || index >= MAX_EQUIPMENT_SOCKETS) return;
      this.craftSocketIndex = index;
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-socket") {
      if (!this.craftTargetId) return;
      this.store.dispatch({ type: "craft:socket", itemId: this.craftTargetId });
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-reset") {
      if (!this.craftTargetId || this.craftResetAffixIndex == null) return;
      this.store.dispatch({
        type: "craft:reset",
        itemId: this.craftTargetId,
        affixIndex: this.craftResetAffixIndex,
      });
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-smelt") {
      if (!this.craftTargetId || !this.craftSmeltAffixId) return;
      this.store.dispatch({
        type: "craft:smelt",
        itemId: this.craftTargetId,
        affixId: this.craftSmeltAffixId,
      });
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-inlay") {
      if (!this.craftTargetId || !this.craftMaterialId) return;
      this.store.dispatch({
        type: "craft:inlay",
        itemId: this.craftTargetId,
        socketIndex: this.craftSocketIndex,
        gemId: this.craftMaterialId,
      });
      if ((this.store.getState().save.materials[this.craftMaterialId] ?? 0) <= 0) {
        this.craftMaterialId = null;
      }
      this.renderAlchemy(this.store.getState());
    } else if (action === "craft-remove-gem") {
      if (!this.craftTargetId) return;
      this.store.dispatch({
        type: "craft:removeGem",
        itemId: this.craftTargetId,
        socketIndex: this.craftSocketIndex,
      });
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
      if (this.inventoryBagTab === "materials") {
        this.materialFilter = "all";
        this.renderInventory(this.store.getState());
        this.showToast("背包已整理");
        return;
      }
      this.inventoryFilter = "all";
      this.store.dispatch({ type: "item:organize" });
      this.showToast("背包已整理");
    } else if (action === "inventory-salvage-open") {
      if (this.inventoryBagTab === "materials") return;
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
    } else if (action === "equip-stats-category") {
      const category: EquipStatsCategory = target.dataset.category === "elemental" ? "elemental" : "generic";
      if (category === this.equipStatsCategory) return;
      this.equipStatsCategory = category;
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-equip-tips") {
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.selectedTalentId = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-talent-node-tips") {
      this.selectedTalentId = null;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-skill-tips") {
      const raw = target.dataset.skillKind;
      const kind =
        raw === "passive" || raw === "signature" || raw === "talent" || raw === "active" ? raw : null;
      if (!kind) return;
      this.equipPanelTab = "stats";
      this.equipSkillTipsKind = kind;
      const progress = this.store.getState().save.roster[this.equipTargetHeroId];
      if (kind === "talent") {
        this.equipTipsKind = "talent";
      } else if (kind === "signature" && canLearnHeroSkill(progress.level) && !progress.chosenSkillId) {
        this.equipTipsKind = "skill-pick";
      } else {
        this.equipTipsKind = "skill";
      }
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-skill-pick") {
      this.equipPanelTab = "stats";
      this.equipTipsKind = "skill-pick";
      this.equipSkillTipsKind = "signature";
      this.syncEquipModal(this.store.getState());
    } else if (action === "talent-select") {
      const talentId = target.dataset.talentId;
      if (!talentId || !isTalentId(talentId)) return;
      this.selectedTalentId = talentId;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.syncEquipModal(this.store.getState());
    } else if (action === "talent-up") {
      const talentId = target.dataset.talentId ?? this.selectedTalentId;
      if (!talentId || !isTalentId(talentId)) return;
      this.store.dispatch({ type: "hero:talentUp", heroId: this.equipTargetHeroId, talentId });
      this.selectedTalentId = talentId;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.syncEquipModal(this.store.getState());
    } else if (action === "choose-hero-skill") {
      const skillId = target.dataset.skillId;
      if (!skillId || !isHeroSkillId(skillId)) return;
      this.store.dispatch({ type: "hero:chooseSkill", heroId: this.equipTargetHeroId, skillId });
      this.equipTipsKind = "skill";
      this.equipSkillTipsKind = "signature";
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-hero-select") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !this.partyHeroIds(this.store.getState()).includes(heroId)) return;
      if (heroId === this.equipTargetHeroId) return;
      this.equipTargetHeroId = heroId;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.selectedTalentId = null;
      this.selectedItemId = null;
      this.equipStatsCategory = "generic";
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
      this.selectedTalentId = null;
      this.selectedItemId = null;
      this.equipStatsCategory = "generic";
      this.openModal("equip");
    } else if (action === "hero-level") {
      this.store.dispatch({ type: "hero:levelUp", heroId: target.dataset.heroId as HeroId });
      if (this.modal === "equip") this.syncEquipModal(this.store.getState());
    } else if (action === "hero-star-up") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId) return;
      this.store.dispatch({ type: "hero:starUp", heroId });
      if (this.modal === "equip") this.syncEquipModal(this.store.getState());
    } else if (action === "hero-ascend") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId) return;
      this.store.dispatch({ type: "hero:ascend", heroId });
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
    } else if (action === "formation-busy") {
      this.showToast("该英雄正在副本中");
    } else if (action === "formation-save") {
      this.store.dispatch({ type: "party:commit", party: [...this.formationDraft] });
      this.options.onPartySaved?.();
      this.closeModal();
      this.showToast("阵容已应用，重新挑战当前关");
    } else if (action === "stages-panel-tab") {
      const tab = target.dataset.tab === "dungeon" ? "dungeon" : "mainline";
      if (tab === this.stagesPanelTab) return;
      this.stagesPanelTab = tab;
      this.renderStages(this.store.getState());
      this.syncDungeonTicker(this.store.getState());
    } else if (action === "stage-select") {
      this.modalPayload = Number(target.dataset.stage);
      this.openModal("stage-confirm");
    } else if (action === "stage-confirm") {
      const stage = Number(target.dataset.stage);
      this.store.dispatch({ type: "stage:select", stage });
      this.stagesPanelTab = "mainline";
      this.options.onStageSelected?.(stage);
      this.closeModal();
    } else if (action === "dungeon-select") {
      this.modalPayload = target.dataset.dungeonId;
      this.dispatchDraft = [];
      this.openModal("dungeon-confirm");
    } else if (action === "dispatch-pick") {
      const dungeonId = String(this.modalPayload) as DungeonId;
      const dungeon = DUNGEON_BY_ID[dungeonId];
      const heroId = target.dataset.heroId as HeroId;
      const save = this.store.getState().save;
      if (getBusyHeroIds(save.dungeonRuns).has(heroId) || getExploringHeroIds(save.party).has(heroId)) {
        return;
      }
      const index = this.dispatchDraft.indexOf(heroId);
      if (index >= 0) {
        this.dispatchDraft.splice(index, 1);
      } else if (this.dispatchDraft.length < dungeon.partySize) {
        this.dispatchDraft.push(heroId);
      } else {
        return;
      }
      this.syncDispatchSelection();
    } else if (action === "dispatch-busy") {
      this.showToast("该英雄正在副本中");
    } else if (action === "dispatch-mainline") {
      this.showToast("该英雄正在主线探索");
    } else if (action === "dungeon-dispatch") {
      const dungeonId = target.dataset.dungeonId as DungeonId;
      const before = this.store.getState().save.dungeonRuns.length;
      this.store.dispatch({ type: "dungeon:dispatch", dungeonId, heroIds: [...this.dispatchDraft] });
      if (this.store.getState().save.dungeonRuns.length <= before) return;
      this.stagesPanelTab = "dungeon";
      this.options.onDungeonDispatched?.();
      this.closeModal();
    } else if (action === "dungeon-claim") {
      const dungeonId = target.dataset.dungeonId as DungeonId;
      this.store.dispatch({ type: "dungeon:claim", dungeonId });
      this.stagesPanelTab = "dungeon";
    } else if (action === "dungeon-progress") {
      this.showToast("小队正在副本中");
    } else if (action === "locked-dungeon") {
      this.showToast("需通关对应主线，且为今日开放副本");
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
    } else if (action === "inventory-material-filter") {
      this.materialFilter = isMaterialCategory(target.value) ? target.value : "all";
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
      if (event.type === "craft:smelted") {
        this.modalPayload = { affixId: event.affixId, value: event.value };
        this.openModal("smelt-result-tips");
      }
      if (event.type === "lootChest:leveled") {
        this.showToast(`宝箱升至 Lv.${event.level}`);
        this.renderLootChest(this.store.getState());
      }
      if (event.type === "lootChest:opened") {
        const label = getLootChestLabel(event.level);
        this.showToast(
          event.lucky
            ? `${label}幸运掉落 · 装备×${event.items.length} · ✧ ${event.exp} · ● ${event.gold}`
            : `${label}开启 · 装备×${event.items.length} · ✧ ${event.exp} · ● ${event.gold}`,
        );
        this.modalPayload = {
          level: event.level,
          gold: event.gold,
          exp: event.exp,
          items: event.items,
          lucky: event.lucky,
        };
        this.openModal("loot-chest");
        this.renderTopbar(this.store.getState());
        this.renderLootChest(this.store.getState());
        if (this.store.getState().ui.activeTab === "inventory") {
          this.renderPanel(this.store.getState());
        }
      }
      if (event.type === "ability:upgraded") {
        const def = ABILITY_DEFINITIONS.find((ability) => ability.id === event.abilityId);
        if (def) this.showToast(def.name + " Lv." + event.level);
      }
      if (event.type === "hero:leveled") this.showToast(`${HERO_BY_ID[event.heroId].name} 升至 Lv.${event.level}`);
      if (event.type === "hero:starred") this.showToast(`${HERO_BY_ID[event.heroId].name} 升至 ${event.stars} 星`);
      if (event.type === "hero:ascended") {
        this.showToast(`${HERO_BY_ID[event.heroId].name} 进阶至 ${event.level} 阶`);
      }
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
    this.dispatchDraft = [];
    this.itemTipsSource = "inventory";
    this.equipTipsKind = null;
    this.equipSkillTipsKind = null;
    this.renderModal();
  }

  private syncDungeonTicker(state: GameStoreState): void {
    const needsTick = state.save.dungeonRuns.some((run) => getDungeonRunStatus(run) === "running");
    if (!needsTick) {
      if (this.dungeonTicker) {
        clearInterval(this.dungeonTicker);
        this.dungeonTicker = null;
      }
      return;
    }
    if (this.dungeonTicker) return;
    this.dungeonTicker = setInterval(() => {
      const current = this.store.getState();
      this.renderTopbar(current);
      if (current.ui.activeTab === "stages" && this.stagesPanelTab === "dungeon") {
        this.renderStages(current);
      }
      if (!current.save.dungeonRuns.some((run) => getDungeonRunStatus(run) === "running") && this.dungeonTicker) {
        clearInterval(this.dungeonTicker);
        this.dungeonTicker = null;
      }
    }, 1000);
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
