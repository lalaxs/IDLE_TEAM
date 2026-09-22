import { bestIdleProgress, DOUBLE_CLAIMS_PER_DAY, QUICK_REWARDS_PER_DAY, QUICK_REWARD_HOURS } from "../content/numericalModel";
import { normalizeProgressionDaily } from "../progression/ProgressionDaily";
import { specializationLabel } from "./SpecializationPresentation";
import { EXPEDITION_ICONS, EXPEDITION_LOCK_ICON, NAV_ICONS, STAGE_GIFT_ICON } from "./icons";
import { isRewardBoxId, type RewardBoxId } from "../content/checkIn";
import { getCheckInStatus } from "../progression/CheckInSystem";
import { renderBagItemTips, type BoxResult } from "./CheckInView";
import { isActivityTabId, renderActivitiesPage, syncActivityResources, type ActivityTabId } from "./ActivitiesView";
import { isTaskPeriod, RECURRING_TASKS, type TaskPeriod } from "../content/recurringTasks";
import { hasTaskRewards, taskActivity } from "../progression/RecurringTaskSystem";
import { hasVipRewards } from "../progression/AdVipSystem";
import { getAdVipBenefits, type BattleSpeed } from "../content/adVip";
import { syncAdVipContent, type VipView } from "./AdVipView";
import { renderTaskMilestoneTips, syncRecurringTasksContent } from "./RecurringTasksView";
import { ASSET_MANIFEST } from "../assets/manifest";
import {
  HERO_BY_ID,
  HERO_DEFINITIONS,
  RELEASED_HERO_DEFINITIONS,
  STARTER_HERO_IDS,
} from "../content/heroes";
import {
  ACCESSORY_SLOTS,
  EQUIPMENT_SLOTS,
  GEAR_SLOTS,
  ITEM_BY_ID,
  RARITY_LABELS,
  SLOT_LABELS,
  type EquipmentChapter,
  type EquipmentSlot,
  type ItemDefinition,
  type Rarity,
} from "../content/items";
import { CHAPTER_DEFINITIONS, CHAPTER_NUMERAL, MAX_STAGE, STAGES_PER_CHAPTER, chapterStartStage, stageToChapter } from "../content/chapters";
import { SET_BY_ID, getChapterSetIds, type SetId } from "../content/sets";
import { RARITY_ORDER } from "../content/rarities";
import {
  ACTIVE_SKILL_BY_HERO,
  ACTIVE_SKILL_BY_ID,
  PASSIVE_SKILL_BY_HERO,
  PASSIVE_SKILL_BY_ID,
} from "../content/skills";
import {
  HERO_SKILLS,
  HERO_SKILL_BY_ID,
  HERO_SKILL_CHANGE_GOLD_COST,
  isHeroSkillId,
  type HeroSkillId,
} from "../content/heroSkills";
import { ACTIVE_SKILL_RAGE_COST } from "../content/rage";
import type { SkillIconRef } from "../content/skillIcons";
import {
  HERO_SKILL_UNLOCK_LEVEL,
  TALENT_TIERS,
  isTalentId,
  talentByIdForHero,
  talentsInTier,
  type TalentId,
  type TalentNode,
} from "../content/talents";
import { STAGE_DEFINITIONS, STAGE_GIFT_STARSTONE_REWARD } from "../content/stages";
import {
  DIFFICULTY_BY_ID,
  equipmentLevelForDifficulty,
  isDifficultyUnlocked,
  type GameDifficulty,
} from "../content/difficulties";
import {
  DAMAGE_ELEMENT_LABEL,
  chapterThemeElement,
} from "../content/damageElements";
import {
  DUNGEON_BY_ID,
  EXPEDITION_UNLOCK_CLEARED_STAGE,
  getExpeditionRequirements,
  isExpeditionFeatureAvailable,
  type DungeonDefinition,
  type DungeonId,
} from "../content/dungeons";
import { getExpeditionEventStory } from "../content/expeditionStories";
import {
  calculateExpeditionStamina,
  estimateExpeditionDurationMs,
  getBusyHeroIds,
  getExpeditionRequirementProgress,
  getExploringHeroIds,
  getDungeonRun,
  getDungeonRunDetails,
  getDungeonRunStatus,
  heroMatchesExpeditionRequirement,
  type DungeonClearReward,
  type DungeonRunEventKind,
  type DungeonRunDetails,
} from "../progression/DungeonSystem";
import {
  getChapterEquipmentDropPool,
  getEquipmentDropLocalStages,
} from "../progression/EquipmentPool";
import { getNaturalDropRarityBounds } from "../progression/EquipmentDropSystem";
import { getDateKey } from "../domain/time/GameDay";
import {
  backpackItems,
  canHeroEquipItem,
  collectEquippedItemIds,
  compareInventoryItems,
  getEquipmentBaseStatRanges,
  getEquipmentLevel,
  getEquipmentSetId,
  getItemScore,
  getSalvageGold,
  isEquipmentUpgrade,
  type InventoryItem,
} from "../progression/EquipmentSystem";
import {
  getEquipmentBonuses,
  getHeroCombatDisplayStats,
  type HeroCombatDisplayStats,
} from "../progression/EquipmentBonuses";
import {
  ALCHEMY_SLOT_COUNT,
  ALCHEMY_STATION_MAX_LEVEL,
  getAlchemyExperienceToNext,
  getAlchemyStationLevelCap,
} from "../progression/AlchemySystem";
import {
  canFuseGemFamily,
  getSetEssenceSalvageReward,
  SET_IMPRINT_ESSENCE_COST,
  SET_IMPRINT_STONE_COST,
} from "../progression/GearCraftSystem";
import {
  GEM_BASE_IDS,
  MATERIAL_BY_ID,
  MATERIAL_CATEGORY_LABELS,
  formatGemBonus,
  type MaterialId,
} from "../content/materials";
import {
  ACCOUNT_CURRENCY_BY_ID,
  ACCOUNT_CURRENCY_DEFINITIONS,
  isAccountCurrencyId,
  type AccountCurrencyId,
} from "../content/currencies";
import {
  getShopRefreshKey,
} from "../content/shop";
import {
  canAscendHero,
  getAscendStatPct,
  getAscendStoneCost,
  getHeroExperienceRemaining,
  getHeroLevelCap,
  getHeroStarPhase,
  getHeroStarRankLabel,
  getStarRageGainPct,
  getStarSkillEffectPct,
  getStarUpgradeCost,
  getUpgradeCost,
  heroGrowthFromProgress,
  MAX_HERO_ASCEND_LEVEL,
  MAX_HERO_STARS,
} from "../progression/HeroProgression";
import {
  SUMMON_CLASS_LABELS,
  SUMMON_FIVE_COST,
  SUMMON_SINGLE_COST,
  SUMMON_THEME_CLASS_IDS,
  SUMMON_THEME_SELECTION_COST,
  getActiveSummonTheme,
  getGlobalSummonTheme,
  isSummonClassId,
} from "../progression/SummonSystem";
import type { ClassId } from "../content/specializations";
import {
  canLearnHeroSkill,
  canUpgradeTalent,
  describeTalentEffectAtRank,
  getTalentPointsEarned,
  getTalentPointsUnspent,
  getTalentTierProgress,
  isTalentNodeUnlocked,
  isTalentTierUnlocked,
  TALENT_RESET_GOLD_COST,
  talentUpgradeBlocked,
} from "../progression/TalentSystem";
import {
  ABILITY_DEFINITIONS,
  abilityCardMeta,
} from "../progression/AbilitySystem";
import {
  getPartySlotUnlockClearedStage,
  getUnlockedPartySlotCount,
} from "../progression/PartySystem";
import {
  ABILITY_CATEGORY_TABS,
  type AbilityCategory,
  type AbilityId,
} from "../content/abilities";
import type { GameStore, GameStoreState } from "../app/GameStore";
import type { AppEvent, ResourceRewardSource, SummonPullResult } from "../app/events";
import type { BattleEvent, BattleSnapshot, HeroId } from "../simulation/types";
import {
  BattleStatsCollector,
  type BattleStatsMetric,
  type BattleStatsSourceEntry,
} from "../simulation/BattleStats";
import {
  canOpenLootChest,
  getEquipmentChestTier,
  getEquipmentChestTierLabel,
  getLootChestHourlyRates,
  getLootChestAccumulatedMs,
  LOOT_CHEST_CAP_MS,
  previewLootChest,
  type EquipmentChestTier,
} from "../progression/LootChestSystem";
import { bindDragScroll } from "./dragScroll";
import { ResourceRewardAnimator, type ResourceRewardOrigin } from "./ResourceRewardAnimator";
import { renderShopView } from "./features/shop/ShopView";
import { renderHeroesView } from "./features/heroes/HeroesView";
import { renderHeroGrowthResultModal } from "./features/heroes/HeroGrowthModalView";
import { renderStagesView } from "./features/stages/StagesView";
import { InventoryFeature, type InventoryIntent } from "./features/inventory/InventoryFeature";
import {
  AlchemyFeature,
  type AlchemyDowngradeRequest,
  type AlchemyIntent,
} from "./features/alchemy/AlchemyFeature";
import { CraftFeature, type CraftIntent } from "./features/craft/CraftFeature";
import {
  renderCraftList,
  renderCraftListHeader,
  renderCraftModeMenu,
  renderCraftWorkbench,
  type CraftPreviewState,
} from "./features/craft/CraftView";
import {
  renderCraftResultModal,
  renderResetAffixModal,
  renderSetImprintPickerModal,
  renderSmeltAffixModal,
  type SetImprintPickerPayload,
} from "./features/craft/CraftModalView";
import {
  renderEquipmentComparisonLayer,
  renderEquipmentDetailLayer,
} from "./features/equipment/EquipmentDetailView";
import {
  abilityIconMarkup,
  compact,
  equipmentArt,
  equipmentSpecialMarks,
  formatShopRefreshCountdown,
  itemLevelBadge,
  legendaryTraitAria,
  materialArt,
  rarityClass,
  setNameInitial,
} from "./shared/presentation";
import { setBonusText } from "./shared/equipmentPresentation";
import { renderAscendRankSeal, renderHeroStarOrbs } from "./shared/heroPresentation";

export interface AppShellOptions {
  onStageSelected?: (stage: number, difficulty: GameDifficulty) => void;
  onDungeonDispatched?: () => void;
  onPartySaved?: () => void;
  onClearSave?: () => void;
  onSoundRequested?: (kind: string) => void;
}

const BATTLE_DETAILS_METRICS: readonly BattleStatsMetric[] = ["damage", "taken", "healing"];
const EQUIPMENT_CHEST_IMAGE: Record<EquipmentChestTier, string> = {
  wood: "/assets/resources/loot_chest_wood.png",
  bronze: "/assets/resources/loot_chest_bronze.png",
  silver: "/assets/resources/loot_chest_silver.png",
  gold: "/assets/resources/loot_chest_gold.png",
};
const LOOT_CHEST_BOUNCE_INITIAL_DELAY_MS = 1_400;
const LOOT_CHEST_BOUNCE_DURATION_MS = 620;
const LOOT_CHEST_BOUNCE_GAP_MIN_MS = 2_200;
const LOOT_CHEST_BOUNCE_GAP_VARIANCE_MS = 1_400;
const BATTLE_DETAILS_LABEL: Record<BattleStatsMetric, string> = {
  damage: "输出",
  taken: "承伤",
  healing: "治疗",
};

const tabMeta = {
  inventory: { icon: NAV_ICONS.inventory, label: "背包" },
  heroes: { icon: NAV_ICONS.heroes, label: "英雄" },
  alchemy: { icon: NAV_ICONS.alchemy, label: "炼金" },
  stages: { icon: NAV_ICONS.stages, label: "关卡" },
  shop: { icon: NAV_ICONS.shop, label: "商店" },
} as const;

function skillIconStyle(icon: SkillIconRef): string {
  const column = icon.index % 3;
  const row = Math.floor(icon.index / 3);
  return `--skill-icon-image:url(${icon.atlas});--skill-icon-x:${column * 50}%;--skill-icon-y:${row * 50}%`;
}

const TALENT_ICON_PATHS = {
  specFocus: `<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/><circle cx="12" cy="12" r="2"/>`,
  specSpread: `<circle cx="12" cy="18" r="3"/><path d="M12 15V5M12 10 5 5m7 5 7-5M3 8V3h5m8 0h5v5"/>`,
  specGuard: `<path d="M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m7 12 3 3 7-7"/>`,
  blade: `<path d="M14.5 4.5 20 2.5l-2 5.5-8.5 8.5-3 1 1-3Z"/><path d="m8.5 15.5 3 3M7 17l-3 3m1.5-5.5 4 4"/>`,
  doubleBlade: `<path d="M8 4 3 2l2 5.5 5 5M16 4l5-2-2 5.5-5 5M8 12l-4 6m12-6 4 6M3 18l3 3m15-3-3 3"/>`,
  target: `<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>`,
  critical: `<circle cx="12" cy="12" r="8"/><path d="m12 6 1.5 4 4 .5-3 2.7.8 4.3-3.3-2.2-3.3 2.2.8-4.3-3-2.7 4-.5Z"/>`,
  crown: `<path d="m4 8 4 3 4-6 4 6 4-3-1.5 10h-13Z"/><path d="M7 21h10M9 15h6"/>`,
  rune: `<path d="m12 2 8 5v10l-8 5-8-5V7Z"/><path d="M8 13c0-3 2-5 5-5 2 0 3 1 3 2.5 0 2-2 3.5-4 3.5h-2"/>`,
  element: `<path d="M13 2c1 5-4 6-4 10 0 1.8 1.2 3 3 3 2.2 0 3.5-1.8 3-4.5 3 2.3 4 4.3 4 6.2A7 7 0 0 1 5 16.5C5 10 11 8 13 2Z"/>`,
  explosion: `<path d="m12 2 1.8 6.2L20 6l-4.2 4.8L22 13l-6.2 1.2L18 20l-4.8-4.1L11 22l-1.2-6.1L4 18l4.1-4.8L2 11l6.1-1.2L6 4l4.8 4.1Z"/>`,
  heart: `<path d="M12 20S4 15.4 4 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.4C20 15.4 12 20 12 20Z"/>`,
  heartCore: `<path d="M12 20S4 15.4 4 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.4C20 15.4 12 20 12 20Z"/><path d="m12 9 2 3-2 3-2-3Z"/>`,
  helmet: `<path d="M5 19V10a7 7 0 0 1 14 0v9M5 12h14M9 12v5h6v-5M3 19h6m6 0h6"/>`,
  fortress: `<path d="M4 21V7h4v4h3V7h4v4h3V7h2v14M2 21h20M9 21v-5h6v5"/>`,
  parry: `<path d="M7 3 4 2l1 4 6 6M17 3l3-1-1 4-6 6M10 13l-6 6m10-6 6 6M3 18l3 3m15-3-3 3"/>`,
  shield: `<path d="M12 2.5 19 5v5.5c0 4.6-2.8 7.9-7 11-4.2-3.1-7-6.4-7-11V5Z"/>`,
  shieldBar: `<path d="M12 2.5 19 5v5.5c0 4.6-2.8 7.9-7 11-4.2-3.1-7-6.4-7-11V5Z"/><path d="M8 9h8M8 13h8"/>`,
  shieldGem: `<path d="M12 2.5 19 5v5.5c0 4.6-2.8 7.9-7 11-4.2-3.1-7-6.4-7-11V5Z"/><path d="m12 8 3 3-3 4-3-4Z"/>`,
  resist: `<path d="m12 2 8 5v10l-8 5-8-5V7Z"/><circle cx="12" cy="12" r="4"/><path d="M12 8v8M8 12h8"/>`,
  regen: `<path d="M12 21v-9M12 15c-5 0-7-3-7-7 5 0 7 3 7 7ZM12 12c0-5 3-7 7-7 0 5-3 7-7 7Z"/>`,
  wind: `<path d="M3 8h10c2.5 0 2.5-4 0-4-1.1 0-1.8.5-2.2 1.2M3 12h15c3 0 3 5 0 5-1.3 0-2.1-.6-2.5-1.5M3 16h7"/>`,
  haste: `<path d="M4 7c4-3 8-3 12-1l4-2-2 5c1 5-2 10-7 11M3 12h9m-7 4h6"/>`,
  bolt: `<path d="m13.5 2-7 11h5L10.5 22l7-12h-5Z"/>`,
  rageFlare: `<path d="M12 2v4M4.9 4.9l2.8 2.8M2 12h4m12 0h4m-2.9-7.1-2.8 2.8M8 21h8M9 17h6l2-5-5-3-5 3Z"/>`,
  rageLoop: `<path d="M18 7a8 8 0 1 0 1 9M18 3v4h-4"/><path d="m13 8-4 6h3l-1 4 4-7h-3Z"/>`,
  refund: `<path d="M6 7a8 8 0 1 1-1 9M6 3v4h4"/><path d="m13 7-4 6h3l-1 4 4-7h-3Z"/>`,
  drop: `<path d="M12 2.5S6 9.2 6 14a6 6 0 0 0 12 0c0-4.8-6-11.5-6-11.5Z"/><path d="M9.2 15.5c.5 1.5 1.4 2.2 2.8 2.4"/>`,
  fang: `<path d="M6 3c1 8 3 14 6 18 3-4 5-10 6-18-3 2-9 2-12 0Z"/><path d="M9 8h6M12 12v4"/>`,
  healCross: `<circle cx="12" cy="12" r="8"/><path d="M12 7v10M7 12h10"/>`,
  healBurst: `<path d="M12 3v18M3 12h18M6 6l2 2m8 8 2 2m0-12-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="4"/>`,
  mend: `<path d="M5 19c2-4 4-6 7-6h4c3 0 4 2 4 4H9M7 15l-3-2-2 4 6 4"/><path d="M14 4v6M11 7h6"/>`,
  break: `<path d="M12 2.5 19 5v5.5c0 4.6-2.8 7.9-7 11-4.2-3.1-7-6.4-7-11V5Z"/><path d="m13 5-3 6 3 1-3 6"/>`,
  barrier: `<circle cx="12" cy="12" r="9"/><path d="M12 6 17 8v4c0 3-2 5-5 7-3-2-5-4-5-7V8Z"/>`,
  selfShield: `<path d="M12 2.5 19 5v5.5c0 4.6-2.8 7.9-7 11-4.2-3.1-7-6.4-7-11V5Z"/><circle cx="12" cy="9" r="2"/><path d="M8.5 16c.5-2 1.6-3 3.5-3s3 1 3.5 3"/>`,
  teamShield: `<path d="M12 2.5 20 5v6c0 5-3.2 8-8 11-4.8-3-8-6-8-11V5Z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="9" r="1"/><circle cx="16" cy="11" r="1"/>`,
  teamGuard: `<path d="M12 2.5 20 5v6c0 5-3.2 8-8 11-4.8-3-8-6-8-11V5Z"/><path d="M7 16c.4-2 1.4-3 3-3h4c1.6 0 2.6 1 3 3M9 9h6"/>`,
  snow: `<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M8.5 4 12 7.5 15.5 4M8.5 20l3.5-3.5 3.5 3.5"/>`,
  mark: `<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>`,
  expose: `<path d="m12 3 9 16H3Z"/><circle cx="12" cy="13" r="3"/><path d="M12 7v3"/>`,
  partyPulse: `<circle cx="6" cy="9" r="2"/><circle cx="18" cy="9" r="2"/><circle cx="12" cy="6" r="2"/><path d="M3 19c0-3 1-5 3-5s3 2 3 5M15 19c0-3 1-5 3-5s3 2 3 5M9 18c0-3 1-5 3-5s3 2 3 5"/>`,
  warCry: `<path d="M4 14V6l12-3v14L4 14Z"/><path d="M16 7c3 1 4 3 4 5s-1 4-4 5M6 15l2 6"/>`,
  cleanse: `<path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5Z"/><path d="m18.5 14 .8 2.7 2.7.8-2.7.8-.8 2.7-.8-2.7-2.7-.8 2.7-.8Z"/><path d="m5 14 .6 2 1.9 1-2 .6-.5 1.9-.6-2-1.9-.5 2-.6Z"/>`,
} as const;

type TalentIconKind = keyof typeof TALENT_ICON_PATHS;

function talentIconKind(node: TalentNode): TalentIconKind {
  const effect = node.effect;
  if (effect.kind === "stat") {
    const mastery = node.tier === 2;
    if (effect.stat === "attackPct") return "blade";
    if (effect.stat === "critChance") return "target";
    if (effect.stat === "critDamagePct") return "critical";
    if (effect.stat === "skillDamagePct") return mastery ? "explosion" : "rune";
    if (effect.stat === "schoolDamagePct") return "element";
    if (effect.stat === "primaryAttackPct") return "doubleBlade";
    if (effect.stat === "eliteDamagePct") return "crown";
    if (effect.stat === "maxHpPct") return mastery ? "heartCore" : "heart";
    if (effect.stat === "defensePct") return mastery ? "shield" : "helmet";
    if (effect.stat === "damageReductionPct") return mastery ? "fortress" : "shieldBar";
    if (effect.stat === "blockChance") return mastery ? "shieldGem" : "parry";
    if (effect.stat === "allResistPct") return "resist";
    if (effect.stat === "hpRegenMaxHpPct") return "regen";
    if (effect.stat === "attackSpeedPct") return mastery ? "haste" : "wind";
    if (effect.stat === "rageGainPct") return mastery ? "rageFlare" : "bolt";
    if (effect.stat === "lifeStealPct") return mastery ? "fang" : "drop";
    return mastery ? "healBurst" : "healCross";
  }
  if (effect.kind === "specialization") return effect.choice === 1 ? "specFocus" : effect.choice === 2 ? "specSpread" : "specGuard";
  if (effect.kind === "basicDamage") return "doubleBlade";
  if (effect.kind === "basicRage") return "rageLoop";
  if (effect.kind === "activeDamage") return "explosion";
  if (effect.kind === "activeHeal") return "healBurst";
  if (effect.kind === "basicProc") {
    if (effect.proc === "armorBreak") return "break";
    if (effect.proc === "shield") return "barrier";
    if (effect.proc === "heal") return "mend";
    if (effect.proc === "allyRage") return "partyPulse";
    if (effect.proc === "slow") return "snow";
    return "mark";
  }
  if (effect.proc === "vulnerability") return "expose";
  if (effect.proc === "selfShield") return "selfShield";
  if (effect.proc === "teamShield") return "teamShield";
  if (effect.proc === "teamDamageReduction") return "teamGuard";
  if (effect.proc === "cleanse") return "cleanse";
  if (effect.proc === "teamRage") return "warCry";
  return "refund";
}

function talentIconSvg(node: TalentNode): string {
  return `<svg class="talent-icon-svg" data-icon-kind="${talentIconKind(node)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TALENT_ICON_PATHS[talentIconKind(node)]}</svg>`;
}

function equipSkillSymbolSvg(kind: "talent" | "lock"): string {
  const body = kind === "talent"
    ? '<path d="M12 5v5M5.5 10h13M5.5 10v4M12 10v4M18.5 10v4"/><circle cx="12" cy="4" r="2.5"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="12" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/>'
    : '<path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10"/><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M12 14v3"/>';
  const strokeWidth = kind === "talent" ? "2" : "3.2";
  return `<svg class="equip-skill-symbol" data-icon-kind="${kind}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function talentNodeDisplayName(node: TalentNode): string {
  const separator = node.name.lastIndexOf("·");
  if (separator <= 0 || Array.from(node.name).length <= 4) return node.name;
  const skillName = Array.from(node.name.slice(0, separator)).slice(-2).join("");
  return `${skillName}${node.name.slice(separator + 1)}`;
}

const slotLabel = SLOT_LABELS;
const chapterNumeral = CHAPTER_NUMERAL;

function formatIdleDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const minuteSecond = `${hours > 0 ? String(minutes).padStart(2, "0") : minutes}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}小时${minuteSecond}` : minuteSecond;
}

function formatIdleButtonDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 1) return `${minutes} 分钟`;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function formatExpeditionDuration(durationMs: number): string {
  const roundedMinutes = Math.max(10, Math.round(durationMs / 600_000) * 10);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours < 1) return `${minutes} 分钟`;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}

function formatMainlineUnlockCondition(clearedStage: number): string {
  const safeStage = Math.max(1, clearedStage);
  const chapter = stageToChapter(safeStage);
  const stage = ((safeStage - 1) % STAGES_PER_CHAPTER) + 1;
  return `通关主线第${chapter}章第${stage}关后解锁`;
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
  return marks[level] ? renderAscendRankSeal(level) : "";
}

function collectSetEssenceRewards(items: readonly InventoryItem[]): Partial<Record<SetId, number>> {
  const rewards: Partial<Record<SetId, number>> = {};
  for (const item of items) {
    const reward = getSetEssenceSalvageReward(item);
    if (reward) rewards[reward.setId] = (rewards[reward.setId] ?? 0) + reward.amount;
  }
  return rewards;
}

function formatSetEssenceRewards(rewards: Partial<Record<SetId, number>>): string {
  return Object.entries(rewards)
    .filter((entry): entry is [SetId, number] => (entry[1] ?? 0) > 0)
    .map(([setId, amount]) => `${SET_BY_ID[setId].name}精华 +${amount}`)
    .join(" · ");
}

function currencyIconMarkup(
  currencyId: AccountCurrencyId,
  className = "inline-currency-icon",
): string {
  return `<img class="${className}" src="${ACCOUNT_CURRENCY_BY_ID[currencyId].icon}" alt="" aria-hidden="true">`;
}

function equipmentDropRarityRange(
  _items: readonly ItemDefinition[],
  chapter: EquipmentChapter,
  difficulty: GameDifficulty,
): string {
  const bounds = getNaturalDropRarityBounds(chapterStartStage(chapter), difficulty);
  return bounds.min === bounds.max
    ? RARITY_LABELS[bounds.min]
    : `${RARITY_LABELS[bounds.min]}–${RARITY_LABELS[bounds.max]}`;
}

function chapterEquipmentLevelRange(chapter: EquipmentChapter, difficulty: GameDifficulty): string {
  const { min, max } = chapterEquipmentLevelBounds(chapter, difficulty);
  return min === max ? `Lv.${min}` : `Lv.${min}–${max}`;
}

function chapterEquipmentLevelBounds(chapter: EquipmentChapter, difficulty: GameDifficulty): { min: number; max: number } {
  const firstStage = chapterStartStage(chapter);
  const level = equipmentLevelForDifficulty(firstStage, difficulty);
  return { min: level, max: level };
}

function chapterEquipmentStageRange(chapter: EquipmentChapter, slot: EquipmentSlot): string {
  const stages = getEquipmentDropLocalStages(slot);
  const ranges: string[] = [];
  let start = stages[0]!;
  let end = start;
  for (const stage of stages.slice(1)) {
    if (stage === end + 1) {
      end = stage;
      continue;
    }
    ranges.push(start === end ? `${chapter}-${start}` : `${chapter}-${start}～${chapter}-${end}`);
    start = stage;
    end = stage;
  }
  ranges.push(start === end ? `${chapter}-${start}` : `${chapter}-${start}～${chapter}-${end}`);
  return ranges.join("、");
}

type HeroStatRow = { label: string; value: string };

export class AppShell {
  private snapshot: BattleSnapshot | null = null;
  private battleDetailsMetric: BattleStatsMetric = "damage";
  private battleDetailsHeroId: HeroId | null = null;
  private readonly battleStats = new BattleStatsCollector();
  private readonly inventoryFeature = new InventoryFeature();
  private readonly alchemyFeature = new AlchemyFeature();
  private readonly craftFeature = new CraftFeature();
  private battleDetailsRenderedRevision = -1;
  private battleDetailsRenderedSecond = -1;
  private battleDetailsLastSyncElapsedMs = Number.NEGATIVE_INFINITY;
  private selectedItemId: string | null = null;
  private selectedHeroId: HeroId = STARTER_HERO_IDS[0];
  private equipTargetHeroId: HeroId = STARTER_HERO_IDS[0];
  private equipFocusSlot: EquipmentSlot = "main_weapon";
  private equipPanelTab: "gear" | "stats" = "gear";
  private equipTipsKind: "compare" | "unequip" | "skill" | "talent" | "skill-pick" | "growth" | "stats-detail" | null = null;
  private equipSkillTipsKind: "active" | "passive" | "signature" | "talent" | null = null;
  private equipGrowthKind: "star" | "ascend" | null = null;
  private selectedTalentId: TalentId | null = null;
  private talentUpgradeFeedbackId: TalentId | null = null;
  private abilityUpgradeFeedback: { abilityId: AbilityId; previousLevel: number; level: number } | null = null;
  private suppressTalentDetailAnimation = false;
  private talentResetPending = false;
  private pendingHeroSkillId: HeroSkillId | null = null;
  private checkInRenderKey = "";
  private activityTab: ActivityTabId = "check-in";
  private taskPeriod: TaskPeriod = "daily";
  private vipView: VipView = "current";
  private vipViewedLevel = -1;
  private checkInDateKey = "";
  private rewardBoxResult: BoxResult | null = null;
  private bagItemTipsRenderKey = "";
  private salvageSlotFilter: EquipmentSlot | "all" = "all";
  private salvageRarityFilter: Set<Rarity> = new Set<Rarity>(["common"]);
  private salvageSelectedIds: Set<string> = new Set();
  private shopPanel: "daily" | "abilities" = "daily";
  private abilityCategory: AbilityCategory = "economy";
  private selectedAbilityId: AbilityId | null = null;
  private alchemyPreviewId: string | null = null;
  private alchemyMaterialPreviewId: MaterialId | null = null;
  private alchemyTipsTimer: ReturnType<typeof setTimeout> | null = null;
  private stagesPanelTab: "mainline" | "dungeon" = "mainline";
  private stagesChapter: EquipmentChapter | null = null;
  private stagesDifficulty: GameDifficulty | null = null;
  private dispatchDraft: HeroId[] = [];
  private dungeonRecallPending = false;
  private dungeonTicker: ReturnType<typeof setInterval> | null = null;
  private shopTicker: ReturnType<typeof setInterval> | null = null;
  private lootChestTicker: ReturnType<typeof setInterval> | null = null;
  private lootChestBounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lootChestBounceIndex = -1;
  private lootChestPreviewItems: InventoryItem[] = [];
  private lootChestCloseAfterClaim = false;
  private lootChestEquipmentPreviewKey = "";
  private lootChestHasEquipment = false;
  private pendingGemReturnItemId: string | null = null;
  private equipmentPopoverSource: "inventory" | "shop" | "alchemy" | "craft" | "loot-chest" | null = null;
  private equipmentPopoverAnchorId: string | null = null;
  private equipmentPopoverAnchorElement: HTMLElement | null = null;
  private materialPopoverSource: "inventory" | "shop" | "imprint" | "craft" | "growth" | null = null;
  private materialPopoverKind: "material" | "set-essence" | "imprint-essence" | "imprint-stone" | "item" | null = null;
  private materialPopoverId: MaterialId | SetId | RewardBoxId | "ad_ticket" | null = null;
  private materialPopoverAnchorElement: HTMLElement | null = null;
  private materialTipsSource: "inventory" | "craft" = "inventory";
  private selectedMaterialId: MaterialId | null = null;
  private modal: string | null = null;
  private modalPayload: unknown = null;
  private tutorialStep = 0;
  private partyDraft: GameStoreState["save"]["party"];
  private partyEditSlot = 0;
  private partyEditSlotExplicit = false;
  private equipPartyEditing = false;
  private summonResults: SummonPullResult[] | null = null;
  private summonPendingResults: SummonPullResult[] | null = null;
  private summonRevealPhase: "charging" | "omen" | null = null;
  private summonThemeDraft: ClassId | null = null;
  private summonSubview: "track" | "probability" | "reset" | null = null;
  private summonProbabilityTab: "pool" | "theme" | "guarantee" = "pool";
  private readonly summonRevealTimers = new Set<ReturnType<typeof setTimeout>>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private partyStructureKey = "";
  private renderedNavTab: GameStoreState["ui"]["activeTab"] | null = null;
  private renderedModal: string | null = null;
  private readonly topbar: HTMLElement;
  private readonly partyStrip: HTMLElement;
  private readonly alchemyTipsHost: HTMLElement;
  private readonly equipmentTipsHost: HTMLElement;
  private readonly content: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly liveRegion: HTMLElement;
  private readonly resourceRewardAnimator: ResourceRewardAnimator;
  private pendingResourceRewardOrigin: ResourceRewardOrigin | null = null;

  private get craftMode() { return this.craftFeature.mode; }
  private get alchemyListTab() { return this.craftFeature.listTab; }
  private get craftTargetId() { return this.craftFeature.targetId; }
  private get craftMaterialId() { return this.craftFeature.materialId; }
  private modalReturnFocus: HTMLElement | null = null;
  private readonly handleRootClick = (event: Event) => {
    this.onClick(event);
    this.syncModalFocus();
  };
  private readonly handleRootChange = (event: Event) => this.onChange(event);
  private readonly handleViewportResize = () => {
    const modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal");
    if (modal && (this.equipTipsKind === "compare" || this.equipTipsKind === "unequip")) {
      this.positionEquipmentTips(modal);
    }
    if (this.equipmentPopoverSource || this.materialPopoverSource) this.positionGlobalEquipmentTips();
  };
  private readonly handleModalKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.overlay.querySelector(".task-reward-tips:not([hidden])")) {
      event.preventDefault();
      this.closeTaskRewardTips(true);
      return;
    }
    const focusedTab = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('.activities-tabs [role="tab"], .tasks-period-tabs [role="tab"], .vip-view-tabs [role="tab"]') : null;
    if (focusedTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      const tabs = [...focusedTab.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      const current = tabs.indexOf(focusedTab);
      const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[index]?.click();
      return;
    }
    if (event.key === "Escape" && this.equipmentPopoverSource) {
      const anchor = this.resolveEquipmentPopoverAnchor();
      event.preventDefault();
      this.closeEquipmentPopover();
      anchor?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && this.materialPopoverSource) {
      const anchor = this.resolveMaterialPopoverAnchor();
      event.preventDefault();
      this.closeMaterialPopover();
      const focusTarget = anchor?.isConnected ? anchor : this.content.querySelector<HTMLElement>('[data-action="inventory-bag-tab"][data-tab="materials"]');
      focusTarget?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "Escape" && this.alchemyTipsHost.childElementCount > 0) {
      event.preventDefault();
      this.closeAlchemyTips();
      return;
    }
    if (event.key === "Escape" && this.modal === "loot-chest") {
      event.preventDefault();
      this.dismissLootChest();
      return;
    }
    if (event.key === "Escape") {
      const chapterDropTips = this.overlay.querySelector<HTMLElement>(".chapter-drop-item-tips:not([hidden])");
      if (chapterDropTips) {
        const itemId = chapterDropTips.dataset.itemId;
        const setId = chapterDropTips.dataset.setId;
        event.preventDefault();
        this.closeChapterDropItemTips();
        if (itemId) {
          this.overlay.querySelector<HTMLButtonElement>(`[data-action="chapter-drop-item"][data-item-id="${itemId}"]`)?.focus({ preventScroll: true });
        } else if (setId) {
          this.overlay.querySelector<HTMLButtonElement>(`[data-action="chapter-set-tips"][data-set-id="${setId}"]`)?.focus({ preventScroll: true });
        }
        return;
      }
      if (
        this.equipTipsKind === "skill" &&
        (this.equipSkillTipsKind === "active" || this.equipSkillTipsKind === "passive")
      ) {
        const skillKind = this.equipSkillTipsKind;
        event.preventDefault();
        this.equipTipsKind = null;
        this.equipSkillTipsKind = null;
        this.syncEquipModal(this.store.getState());
        this.overlay
          .querySelector<HTMLElement>(`[data-action="equip-skill-tips"][data-skill-kind="${skillKind}"]`)
          ?.focus({ preventScroll: true });
        return;
      }
    }
    const dialogs = this.overlay.querySelectorAll<HTMLElement>('[role="dialog"], .activities-page');
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
      .filter((control) => control.getClientRects().length > 0);
    if (event.key === "Escape") {
      const rewardPopover = dialog.querySelector<HTMLElement>(".dispatch-reward-popover:not([hidden])");
      if (rewardPopover) {
        const rewardButton = dialog.querySelector<HTMLButtonElement>(`[aria-controls="${rewardPopover.id}"]`);
        event.preventDefault();
        this.closeDispatchRewardTips();
        rewardButton?.focus({ preventScroll: true });
        return;
      }
      if (this.equipPartyEditing && dialog.classList.contains("character-equip-modal")) {
        event.preventDefault();
        dialog.querySelector<HTMLButtonElement>('[data-action="party-edit-cancel"]')?.click();
        return;
      }
      if (this.equipTipsKind === "compare" || this.equipTipsKind === "unequip") {
        const closingKind = this.equipTipsKind;
        const itemId = this.selectedItemId;
        event.preventDefault();
        this.equipTipsKind = null;
        this.syncEquipModal(this.store.getState());
        const returnTarget = closingKind === "compare" && itemId
          ? this.overlay.querySelector<HTMLElement>(`[data-action="equip-candidate-select"][data-item-id="${itemId}"]`)
          : this.overlay.querySelector<HTMLElement>(`[data-action="equip-slot-focus"][data-slot="${this.equipFocusSlot}"]`);
        returnTarget?.focus({ preventScroll: true });
        return;
      }
      if (this.pendingHeroSkillId) {
        event.preventDefault();
        dialog.querySelector<HTMLButtonElement>('[data-action="hero-skill-change-cancel"]')?.click();
        return;
      }
      if (this.talentResetPending) {
        event.preventDefault();
        dialog.querySelector<HTMLButtonElement>('[data-action="talent-reset-cancel"]')?.click();
        return;
      }
      if (this.equipTipsKind === "talent" && this.selectedTalentId) {
        const talentId = this.selectedTalentId;
        event.preventDefault();
        this.selectedTalentId = null;
        this.syncEquipModal(this.store.getState());
        this.overlay.querySelector<HTMLElement>(`[data-talent-id="${talentId}"]`)?.focus({ preventScroll: true });
        return;
      }
      if (dialog.classList.contains("summon-subview-modal")) {
        event.preventDefault();
        this.closeModal();
        return;
      }
      const close = dialog.querySelector<HTMLButtonElement>('button[data-action^="close-"]');
      if (close) {
        event.preventDefault();
        close.click();
      } else if (dialog.classList.contains("craft-result-modal")) {
        event.preventDefault();
        this.closeModal();
      }
    } else if (event.key === "Tab" && controls.length) {
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      if (!dialog.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
  };
  private readonly unsubscribeStore: () => void;
  private readonly bannerTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private readonly root: HTMLElement,
    private readonly store: GameStore,
    private readonly options: AppShellOptions,
  ) {
    this.partyDraft = [...store.getState().save.party];
    root.innerHTML = `
      <section class="game-shell">
        <header class="topbar"></header>
        <section class="battle-frame" aria-label="自动战斗区域">
          <div id="battle-canvas"></div>
          <div class="battle-vignette" aria-hidden="true"></div>
          <div class="battle-utility-actions">
            <button type="button" class="activity-entry" data-action="activities" data-claimable="false" aria-label="活动签到" aria-haspopup="dialog"><span aria-hidden="true">${STAGE_GIFT_ICON}</span><span>活动</span></button>
            <button class="icon-button battle-details-button" data-action="battle-details" aria-label="战斗详情" title="战斗详情"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V11M12 19V5M19 19v-9"/><path d="M3 19h18"/></svg></button>
          </div>
          <div class="battle-stage-slot"></div>
          <div class="battle-bottom-hud">
            <div class="loot-chest-dock" aria-label="挂机宝箱">
              <button type="button" class="loot-chest-badge" data-action="loot-chest-open" data-full="false" aria-label="挂机宝箱">
                <span class="loot-chest-icon" aria-hidden="true"><img class="loot-chest-art" src="/assets/resources/loot_chest.webp" alt=""></span>
                <span class="loot-chest-time" aria-hidden="true">0:00</span>
              </button>
            </div>
            <div class="battle-status">
              <div class="battle-meter-group">
                <div class="battle-meter-heading">
                  <span class="boss-meter-label">讨伐进度 0%</span>
                </div>
                <div class="boss-meter" role="progressbar" aria-label="首领召唤进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                  <span class="boss-meter-fill"></span>
                </div>
              </div>
              <button class="speed-button" data-action="toggle-speed" aria-label="切换战斗速度">1×</button>
            </div>
          </div>
        </section>
        <section class="party-strip" aria-label="当前小队"></section>
        <div class="alchemy-tips-host" aria-live="polite"></div>
        <section class="content-panel" aria-live="polite"></section>
        <nav class="bottom-nav" aria-label="管理菜单"></nav>
        <div class="overlay-layer">
          <div class="equipment-global-tips-host" aria-live="polite"></div>
          <div class="resource-flyout-layer" aria-hidden="true"></div>
          <div class="modal-host"></div>
          <div class="toast-stack" aria-live="polite" aria-atomic="true"></div>
          <div class="sr-only" aria-live="assertive"></div>
        </div>
      </section>
    `;
    this.topbar = root.querySelector(".topbar")!;
    this.partyStrip = root.querySelector(".party-strip")!;
    this.alchemyTipsHost = root.querySelector(".alchemy-tips-host")!;
    this.equipmentTipsHost = root.querySelector(".equipment-global-tips-host")!;
    this.content = root.querySelector(".content-panel")!;
    this.nav = root.querySelector(".bottom-nav")!;
    this.overlay = root.querySelector(".modal-host")!;
    this.liveRegion = root.querySelector(".sr-only")!;
    this.resourceRewardAnimator = new ResourceRewardAnimator(
      root,
      root.querySelector<HTMLElement>(".resource-flyout-layer")!,
    );
    root.addEventListener("click", this.handleRootClick);
    root.addEventListener("change", this.handleRootChange);
    document.addEventListener("keydown", this.handleModalKeydown);
    window.addEventListener("resize", this.handleViewportResize);
    this.unsubscribeStore = store.subscribe((state, events) => {
      const augmentationChanged = events.find((event) => event.type === "hero:augmentationTargetChanged");
      if (augmentationChanged) {
        const select = this.overlay.querySelector<HTMLSelectElement>(`[data-action="augmentation-target"][data-hero-id="${augmentationChanged.heroId}"]`);
        if (select) select.value = augmentationChanged.targetHeroId ?? "";
        this.liveRegion.textContent = augmentationChanged.targetHeroId
          ? `优先增幅${HERO_BY_ID[augmentationChanged.targetHeroId].name}，下次施法生效`
          : "增幅对象改为自动选择";
        this.presentAppEvents(events);
        return;
      }
      const boxOpened = events.find((event) => event.type === "rewardBox:opened");
      if (boxOpened) this.rewardBoxResult = { materialId: boxOpened.materialId, amount: boxOpened.amount };
      if (this.modal === "loot-chest" && events.some(({ type }) => type === "lootChest:opened")) {
        this.renderTopbar(state);
        this.renderLootChest(state);
        this.renderParty(state);
        this.renderPanel(state);
        this.presentAppEvents(events);
        return;
      }
      const talentUpgrade = events.find((event) => event.type === "hero:talentUpgraded");
      if (talentUpgrade && this.modal === "equip" && this.equipTipsKind === "talent") {
        this.talentUpgradeFeedbackId = talentUpgrade.talentId;
        this.suppressTalentDetailAnimation = true;
      }
      const abilityUpgrade = events.find((event) => event.type === "ability:upgraded");
      const openAbilityId = (this.modalPayload as AbilityId | null) ?? this.selectedAbilityId;
      if (abilityUpgrade && this.modal === "ability-tips" && openAbilityId === abilityUpgrade.abilityId) {
        this.abilityUpgradeFeedback = {
          abilityId: abilityUpgrade.abilityId,
          previousLevel: Math.max(0, abilityUpgrade.level - 1),
          level: abilityUpgrade.level,
        };
      }
      this.renderState(state);
      this.talentUpgradeFeedbackId = null;
      this.abilityUpgradeFeedback = null;
      this.suppressTalentDetailAnimation = false;
      this.presentAppEvents(events);
    });
    this.renderState(store.getState());
    this.tickShopRefresh();
    this.shopTicker = setInterval(() => this.tickShopRefresh(), 1000);
    this.lootChestTicker = setInterval(() => this.renderLootChest(this.store.getState()), 1_000);
    if (!store.getState().save.tutorialCompleted) {
      this.modal = "tutorial";
      this.renderModal();
    }
  }

  destroy(): void {
    this.root.removeEventListener("click", this.handleRootClick);
    this.root.removeEventListener("change", this.handleRootChange);
    document.removeEventListener("keydown", this.handleModalKeydown);
    window.removeEventListener("resize", this.handleViewportResize);
    this.unsubscribeStore();
    if (this.alchemyTipsTimer) clearTimeout(this.alchemyTipsTimer);
    if (this.dungeonTicker) clearInterval(this.dungeonTicker);
    if (this.shopTicker) clearInterval(this.shopTicker);
    if (this.lootChestTicker) clearInterval(this.lootChestTicker);
    this.stopLootChestBounceLoop();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    for (const timer of this.bannerTimers) clearTimeout(timer);
    this.bannerTimers.clear();
    this.clearSummonRevealTimers();
    this.alchemyTipsTimer = null;
    this.dungeonTicker = null;
    this.shopTicker = null;
    this.lootChestTicker = null;
    this.toastTimer = null;
    this.resourceRewardAnimator.destroy();
  }

  renderBattle(snapshot: BattleSnapshot): void {
    this.snapshot = snapshot;
    const wasShowingBattleSource = this.battleDetailsHeroId !== null;
    const encounterReset = this.battleStats.syncSnapshot(
      snapshot,
      this.store.getState().save.party,
    );
    if (encounterReset) this.battleDetailsHeroId = null;
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
    this.renderParty(this.store.getState());
    if (this.modal === "battle-details") {
      if (encounterReset && wasShowingBattleSource) {
        this.renderModal();
        return;
      }
      const elapsedSecond = Math.floor(snapshot.elapsedMs / 1000);
      const dataChanged = this.battleDetailsRenderedRevision !== this.battleStats.revision;
      const timeChanged = this.battleDetailsRenderedSecond !== elapsedSecond;
      const refreshDue = snapshot.elapsedMs - this.battleDetailsLastSyncElapsedMs >= 100;
      if ((dataChanged && refreshDue) || timeChanged || encounterReset) {
        this.syncBattleDetailsModal();
      }
    }
  }

  presentBattleEvents(events: readonly BattleEvent[]): void {
    this.battleStats.record(events);
    const summonIsOpen = this.modal === "summon";
    for (const event of events) {
      if (event.type === "boss:intro") {
        if (!summonIsOpen) this.showBanner("首领来袭", "boss", event.name);
      } else if (event.type === "battle:victory") {
        if (!summonIsOpen) {
          this.showBanner("挑战成功", "victory", "关卡完成");
        }
        if (event.stage === MAX_STAGE && !summonIsOpen) {
          this.modal = "complete";
          this.renderModal();
        }
      } else if (event.type === "battle:defeat") {
        if (!summonIsOpen) {
          this.showBanner("挑战失败", "defeat", "小队整备中");
        }
      } else if (event.type === "skill:started") {
        if (!summonIsOpen) this.playPartySkillFeedback(event.sourceId);
      } else if (event.type === "wave:started") {
        // Trash packs stay quiet; boss arrival is announced by boss:intro.
      }
    }
  }

  private playPartySkillFeedback(sourceUnitId: string): void {
    const unit = this.snapshot?.units.find(
      ({ id, team }) => id === sourceUnitId && team === "heroes",
    );
    if (!unit?.sourceId.startsWith("H")) return;
    const tab = this.partyStrip.querySelector<HTMLElement>(
      `.party-member-tab[data-hero-id="${unit.sourceId}"]`,
    );
    if (!tab) return;

    const feedbackClass = this.store.getState().save.settings.reducedMotion
      ? "skill-cast-feedback-reduced"
      : "skill-cast-feedback";
    tab.classList.remove("skill-cast-feedback", "skill-cast-feedback-reduced");
    // Restart the one-shot animation when the same hero casts again quickly.
    void tab.offsetWidth;
    tab.classList.add(feedbackClass);
    tab.addEventListener(
      "animationend",
      () => tab.classList.remove(feedbackClass),
      { once: true },
    );
  }

  showOfflineReward(
    minutes: number,
    gold: number,
    exp: number,
    gearCount: number,
    onClaim: () => void,
    credited = false,
  ): void {
    this.modal = "offline";
    this.modalPayload = { minutes, gold, exp, gearCount, onClaim, credited };
    this.renderModal();
  }

  private renderState(state: GameStoreState): void {
    this.syncCheckInEntry();
    this.root.classList.toggle("reduced-motion", state.save.settings.reducedMotion);
    this.renderTopbar(state);
    this.renderLootChest(state);
    this.renderParty(state);
    this.renderPanel(state);
    this.renderNav(state);
    if (this.equipmentPopoverSource) this.renderGlobalEquipmentTips(state);
    else if (this.materialPopoverSource) this.renderGlobalMaterialTips(state);
    else this.equipmentTipsHost.innerHTML = "";
    this.syncDungeonTicker(state);
    if (this.modal) this.renderModal();
  }

  private renderLootChest(state: GameStoreState): void {
    const chest = state.save.lootChest;
    const now = Date.now();
    const speedBonus = (state.save.abilities.chest_progress ?? 0) * 0.005;
    const accumulatedMs = getLootChestAccumulatedMs(chest, now, speedBonus);
    const hasDebugChests = state.ui.debugLootChestItems.length > 0;
    const canOpen = canOpenLootChest(chest, now, speedBonus) || hasDebugChests;
    const { difficulty, stage: dropStage } = bestIdleProgress(state.save.difficultyProgress);
    const completedMinutes = Math.floor(accumulatedMs / 60_000);
    const equipmentPreviewKey = [
      chest.startedAt,
      completedMinutes,
      difficulty,
      dropStage,
    ].join(":");
    if (equipmentPreviewKey !== this.lootChestEquipmentPreviewKey) {
      this.lootChestEquipmentPreviewKey = equipmentPreviewKey;
      this.lootChestHasEquipment =
        completedMinutes > 0 &&
        previewLootChest(chest, now, dropStage, difficulty, state.save.abilities).items.length > 0;
    }
    const hasOpenableEquipmentChest =
      canOpen && (hasDebugChests || this.lootChestHasEquipment);
    const full = accumulatedMs >= LOOT_CHEST_CAP_MS;
    const badge = this.root.querySelector<HTMLElement>(".loot-chest-badge");
    const time = this.root.querySelector<HTMLElement>(".loot-chest-time");
    if (!badge || !time) return;
    badge.dataset.full = String(full);
    badge.classList.toggle("ready", hasOpenableEquipmentChest);
    badge.setAttribute(
      "aria-label",
      full
        ? "挂机收益已满，点击查看"
        : hasDebugChests
          ? "调试宝箱已就绪，点击查看"
          : `已累计 ${formatIdleDuration(accumulatedMs)}，${canOpen ? "点击查看" : "继续挂机"}`,
    );
    time.textContent = formatIdleDuration(accumulatedMs);
    const daily = normalizeProgressionDaily(state.save.progressionDaily, now);
    for (const button of this.overlay.querySelectorAll<HTMLButtonElement>('[data-action="idle-accelerate"]')) {
      const doubled = button.dataset.placement === "idle-double";
      const remaining = doubled ? DOUBLE_CLAIMS_PER_DAY - daily.doubleClaims : QUICK_REWARDS_PER_DAY - daily.quickRewards;
      button.disabled = this.store.isAdPending || remaining <= 0 || (doubled && !canOpenLootChest(chest, now, speedBonus)) || (button.dataset.ticket === "true" && state.save.adTickets < 1);
      button.textContent = this.store.isAdPending ? "处理中…" : button.dataset.ticket === "true" ? "用券" : "看广告";
      const label = button.closest('.idle-acceleration-row')?.querySelector('[data-remaining]');
      if (label) label.textContent = '今日剩余 ' + Math.max(0, remaining) + ' 次';
    }
    const modalButton = this.overlay.querySelector<HTMLButtonElement>(
      '.idle-chest-open-all[data-action="loot-chest-claim"]',
    );
    const modalDurationRow = this.overlay.querySelector<HTMLElement>(".idle-chest-duration");
    const modalDuration = this.overlay.querySelector<HTMLElement>(".idle-chest-duration strong");
    if (modalDuration) modalDuration.textContent = formatIdleButtonDuration(accumulatedMs);
    if (modalDurationRow) {
      modalDurationRow.setAttribute("aria-label", `已挂机 ${formatIdleButtonDuration(accumulatedMs)}`);
    }
    if (modalButton && modalButton.dataset.revealing !== "true") {
      modalButton.textContent = "领取奖励";
      modalButton.disabled = !canOpen;
      modalButton.setAttribute(
        "aria-label",
        canOpen
          ? `已挂机 ${formatIdleButtonDuration(accumulatedMs)}，点击领取并开启装备`
          : `已挂机 ${formatIdleButtonDuration(accumulatedMs)}，满 5 分钟后可领取`,
      );
    }
  }

  private startLootChestBounceLoop(initialDelay = true): void {
    this.stopLootChestBounceLoop(false);
    const systemReducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (
      this.modal !== "loot-chest"
      || this.root.classList.contains("reduced-motion")
      || systemReducedMotion
      || !this.overlay.querySelector(".idle-small-chest:not(.revealed)")
    ) {
      return;
    }
    const delay = initialDelay
      ? LOOT_CHEST_BOUNCE_INITIAL_DELAY_MS
      : LOOT_CHEST_BOUNCE_GAP_MIN_MS
        + Math.floor(Math.random() * LOOT_CHEST_BOUNCE_GAP_VARIANCE_MS);
    this.lootChestBounceTimer = setTimeout(() => {
      this.lootChestBounceTimer = null;
      if (this.modal !== "loot-chest") return;
      const boxes = [
        ...this.overlay.querySelectorAll<HTMLElement>(
          ".idle-small-chest:not(.revealed)",
        ),
      ];
      if (!boxes.length) return;
      let nextIndex = Math.floor(Math.random() * boxes.length);
      if (boxes.length > 1 && nextIndex === this.lootChestBounceIndex) {
        nextIndex = (nextIndex + 1) % boxes.length;
      }
      this.lootChestBounceIndex = nextIndex;
      const target = boxes[nextIndex]!;
      target.classList.add("is-bouncing");
      this.lootChestBounceTimer = setTimeout(() => {
        this.lootChestBounceTimer = null;
        target.classList.remove("is-bouncing");
        this.startLootChestBounceLoop(false);
      }, LOOT_CHEST_BOUNCE_DURATION_MS);
    }, delay);
  }

  private stopLootChestBounceLoop(resetIndex = true): void {
    if (this.lootChestBounceTimer) clearTimeout(this.lootChestBounceTimer);
    this.lootChestBounceTimer = null;
    this.overlay
      .querySelectorAll<HTMLElement>(".idle-small-chest.is-bouncing")
      .forEach((box) => box.classList.remove("is-bouncing"));
    if (resetIndex) this.lootChestBounceIndex = -1;
  }

  private populateLootChestSlot(slot: HTMLElement, item: InventoryItem): boolean {
    const flipper = slot.querySelector<HTMLElement>(".idle-chest-flipper");
    const definition = ITEM_BY_ID[item.definitionId];
    if (!flipper || !definition) return false;
    slot.setAttribute(
      "aria-label",
      `${RARITY_LABELS[item.rarity]}${definition.name}，装备等级 ${getEquipmentLevel(item)}${legendaryTraitAria(item)}，点击查看属性`,
    );
    if (!flipper.querySelector(".idle-chest-item-face")) {
      flipper.insertAdjacentHTML("beforeend", `
        <div class="idle-chest-face idle-chest-item-face item-card ${rarityClass(item.rarity)}" aria-hidden="true">
          <span class="item-icon">${equipmentArt(definition.icon)}</span>
          ${equipmentSpecialMarks(item)}
          ${itemLevelBadge(item)}
        </div>
      `);
    }
    return true;
  }

  private revealSingleLootChest(slot: HTMLButtonElement): void {
    const index = Number(slot.dataset.lootIndex);
    const item = Number.isInteger(index) ? this.lootChestPreviewItems[index] : null;
    if (!item) return;
    if (slot.classList.contains("revealed")) {
      this.openEquipmentPopover("loot-chest", String(index), item.instanceId, slot);
      return;
    }
    if (this.equipmentPopoverSource === "loot-chest") this.closeEquipmentPopover();
    this.stopLootChestBounceLoop(false);
    if (!this.populateLootChestSlot(slot, item)) return;
    slot.classList.add("revealed");
    const hasClosedChest = Boolean(
      this.overlay.querySelector(".idle-small-chest:not(.revealed)"),
    );
    if (hasClosedChest) {
      this.startLootChestBounceLoop(false);
    } else {
      const claimButton = this.overlay.querySelector<HTMLButtonElement>(
        '.idle-chest-open-all[data-action="loot-chest-claim"]',
      );
      if (claimButton) {
        claimButton.dataset.action = "loot-chest-claim-close";
        claimButton.textContent = "收下";
        claimButton.setAttribute("aria-label", "收下全部挂机奖励");
      }
    }
  }

  private dismissLootChest(): void {
    if (this.modal !== "loot-chest") return;
    const state = this.store.getState();
    const speedBonus = (state.save.abilities.chest_progress ?? 0) * 0.005;
    const hasClaimableRewards = state.ui.debugLootChestItems.length > 0
      || canOpenLootChest(state.save.lootChest, Date.now(), speedBonus);
    const hasEquipmentRewards = this.lootChestPreviewItems.length > 0;
    if (!hasClaimableRewards || !hasEquipmentRewards) {
      this.closeModal();
      return;
    }
    this.lootChestCloseAfterClaim = true;
    const claimButton = this.overlay.querySelector<HTMLButtonElement>(".idle-chest-open-all");
    if (claimButton) {
      claimButton.disabled = true;
      claimButton.dataset.revealing = "true";
    }
    this.store.dispatch({ type: "lootChest:open", now: Date.now() });
  }

  private revealLootChestRewards(
    event: Extract<AppEvent, { type: "lootChest:opened" }>,
  ): void {
    this.stopLootChestBounceLoop();
    this.lootChestPreviewItems = event.items;
    if (this.lootChestCloseAfterClaim) {
      this.lootChestCloseAfterClaim = false;
      this.closeModal();
      return;
    }
    const modal = this.overlay.querySelector<HTMLElement>(".idle-chest-modal");
    if (!modal) return;
    modal.setAttribute("aria-label", event.items.length ? "装备揭晓" : "挂机收益已领取");
    const heading = modal.querySelector<HTMLElement>(".idle-chest-heading h2");
    if (heading) heading.textContent = event.items.length ? "装备揭晓" : "挂机收益";
    const section = modal.querySelector<HTMLElement>(".idle-chest-equipment-section");
    if (section) section.setAttribute("aria-label", "获得的装备");

    const slots = [...modal.querySelectorAll<HTMLElement>(".idle-small-chest")];
    const allWereRevealed = slots.length > 0
      && slots.every((slot) => slot.classList.contains("revealed"));
    event.items.forEach((item, index) => {
      const slot = slots[index];
      if (!slot || !this.populateLootChestSlot(slot, item)) return;
      slot.style.setProperty("--loot-reveal-index", String(Math.min(index, 12)));
    });

    const empty = modal.querySelector<HTMLElement>(".idle-chest-empty");
    if (empty) empty.textContent = "本次未掉落装备";
    const button = modal.querySelector<HTMLButtonElement>(".idle-chest-open-all");
    if (button) {
      button.disabled = true;
      button.textContent = "领取奖励";
    }
    requestAnimationFrame(() => {
      slots.forEach((slot) => slot.classList.add("revealed"));
    });

    const reducedMotion = this.root.classList.contains("reduced-motion");
    const revealDuration = reducedMotion || event.items.length === 0 || allWereRevealed
      ? 0
      : Math.min(event.items.length - 1, 12) * 90 + 460;
    const finishReveal = () => {
      if (!button?.isConnected) return;
      button.disabled = false;
      button.dataset.action = "close-modal";
      button.textContent = "收下";
    };
    if (revealDuration === 0) {
      finishReveal();
      return;
    }
    const timer = setTimeout(() => {
      this.bannerTimers.delete(timer);
      finishReveal();
    }, revealDuration);
    this.bannerTimers.add(timer);
  }

  private renderTopbar(state: GameStoreState): void {
    if (this.modal === "activities") syncActivityResources(this.overlay, state.save, compact);
    const stage = STAGE_DEFINITIONS[state.save.currentStage - 1]!;
    const amounts: Record<AccountCurrencyId, number> = {
      exp: state.save.exp,
      gold: state.save.gold,
      gems: state.save.gems,
    };
    const chips = ACCOUNT_CURRENCY_DEFINITIONS.map((currency) => {
      const amount = amounts[currency.id];
      return `<button class="resource-chip ${currency.tone}" data-action="currency-info" data-currency="${currency.id}" aria-label="${currency.name} ${amount.toLocaleString("zh-CN")}，查看详情">
          <span class="resource-balance"><img class="resource-art" src="${currency.icon}" alt="" aria-hidden="true"><b>${compact(amount)}</b></span>
          <span class="resource-add" aria-hidden="true">+</span>
        </button>`;
    }).join("");
    const running = state.save.dungeonRuns.filter((run) => getDungeonRunStatus(run) === "running").length;
    const ready = state.save.dungeonRuns.filter((run) => getDungeonRunStatus(run) === "ready").length;
    const dispatchChip =
      running + ready > 0
        ? `<button class="stage-chip dungeon" data-action="open-dungeons" aria-label="打开远征">
        <small>${ready > 0 ? "可领取" : "远征中"}</small><strong>${ready > 0 ? `${ready} 支` : `${running} 支`}</strong>
      </button>`
        : "";
    const stageChip = `<button class="stage-chip" data-action="open-stages" title="第${chapterNumeral[stage.chapter]}章 · ${stage.chapterName}" aria-label="打开关卡选择，第${chapterNumeral[stage.chapter]}章 ${stage.id} ${stage.name}">
        <small>${stage.id} · ${DIFFICULTY_BY_ID[state.save.selectedDifficulty].shortLabel}</small><strong>${stage.name}</strong>
      </button>`;
    this.topbar.innerHTML = `
      <div class="resource-row">${chips}</div>
      <button class="icon-button" data-action="settings" aria-label="游戏设置"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 3.8 10.4 2h3.2l.7 1.8 1.8.8 1.8-.6 2.3 2.3-.6 1.8.8 1.8 1.8.7v3.2l-1.8.7-.8 1.8.6 1.8-2.3 2.3-1.8-.6-1.8.8-.7 1.8h-3.2l-.7-1.8-1.8-.8-1.8.6-2.3-2.3.6-1.8-.8-1.8-1.8-.7v-3.2l1.8-.7.8-1.8-.6-1.8L6 4l1.8.6 1.9-.8Z"/><circle cx="12" cy="12" r="3"/></svg></button>
    `;
    const stageSlot = this.root.querySelector<HTMLElement>(".battle-stage-slot");
    if (stageSlot) stageSlot.innerHTML = `${stageChip}${dispatchChip}`;
    const speed = this.root.querySelector<HTMLElement>(".battle-status .speed-button");
    if (speed) speed.textContent = `${state.save.settings.battleSpeed}×`;
  }

  private renderParty(state: GameStoreState): void {
    const battleHeroes = this.snapshot?.units.filter(({ team }) => team === "heroes") ?? [];
    const unlockedSlots = getUnlockedPartySlotCount(state.save.highestClearedStage);
    const structureKey = `${unlockedSlots}|${state.save.party
      .map((heroId) => heroId ?? "empty")
      .join("|")}`;
    if (structureKey !== this.partyStructureKey) {
      this.partyStructureKey = structureKey;
      const heroTabs = state.save.party
        .map((heroId, index) => {
        if (index >= unlockedSlots) {
          const unlockCondition = formatMainlineUnlockCondition(getPartySlotUnlockClearedStage(index));
          return `
            <span class="party-member-entry locked">
              <span class="party-member-slot locked"><button type="button" class="party-member-tab locked" data-action="party-slot-locked" data-slot="${index}" aria-label="第 ${index + 1} 个小队位置未解锁，${unlockCondition}"><span class="party-member-empty-icon" aria-hidden="true">${EXPEDITION_LOCK_ICON}</span></button></span>
              <span class="party-member-vitals" aria-hidden="true">
                <span class="party-member-bar hp"><i></i></span>
              </span>
            </span>
          `;
        }
        if (!heroId) {
          return `
            <span class="party-member-entry empty">
              <span class="party-member-slot empty"><button type="button" class="party-member-tab empty" data-action="party-edit-open" data-slot="${index}" aria-label="空阵容位，点击上阵英雄" aria-haspopup="dialog"><span class="party-member-empty-icon" aria-hidden="true">+</span></button></span>
              <span class="party-member-vitals" aria-hidden="true">
                <span class="party-member-bar hp"><i></i></span>
              </span>
            </span>
          `;
        }
        const hero = HERO_BY_ID[heroId];
        return `
          <span class="party-member-entry" data-hero-id="${heroId}">
            <span class="party-member-slot">
              <button
                class="party-member-tab"
                data-action="hero-detail"
                data-hero-id="${heroId}"
                aria-label="${hero.name}，查看英雄属性"
                aria-haspopup="dialog"
              >
                <span class="party-member-portrait"><img src="${ASSET_MANIFEST.characters[heroId]}" alt="" /></span>
                <span class="party-specialization-state" data-spec-state hidden></span>
              </button>
            </span>
            <span class="party-member-vitals" aria-hidden="true">
              <span class="party-member-bar hp"><i></i></span>
            </span>
          </span>
        `;
      })
      .join("");
      this.partyStrip.innerHTML = `
        <div class="party-member-list" aria-label="我方小队">${heroTabs}</div>
      `;
    }
    for (const entry of this.partyStrip.querySelectorAll<HTMLElement>(".party-member-entry[data-hero-id]")) {
      const heroId = entry.dataset.heroId as HeroId;
      const tab = entry.querySelector<HTMLElement>(".party-member-tab")!;
      const unit = battleHeroes.find(({ sourceId }) => sourceId === heroId);
      const hpRemaining = unit ? Math.min(1, Math.max(0, unit.hp / unit.maxHp)) : 0;
      const requiredRage = ACTIVE_SKILL_RAGE_COST;
      const rageProgress = unit ? Math.min(1, Math.max(0, unit.rage / requiredRage)) : 0;
      const skillReady = Boolean(unit?.alive && unit.skillPrepareMs !== null && unit.rage >= requiredRage);
      const rageBuilding = Boolean(unit?.alive && rageProgress > 0 && rageProgress < 1);
      entry.classList.toggle("dead", unit ? !unit.alive : false);
      tab.classList.toggle("skill-ready", skillReady);
      tab.classList.toggle("rage-building", rageBuilding);
      const beacon = unit?.alive && battleHeroes.some((hero) => hero.alive && hero.passiveFlags.specBeaconTarget === unit.id);
      const mechanicText = unit ? specializationLabel(unit) || (beacon ? "信标守护" : "") : "";
      const mechanicLabel = entry.querySelector<HTMLElement>("[data-spec-state]");
      if (mechanicLabel) {
        if (mechanicLabel.textContent !== mechanicText) mechanicLabel.textContent = mechanicText;
        mechanicLabel.hidden = !mechanicText;
      }
      const label = `${HERO_BY_ID[heroId].name}${mechanicText ? `，${mechanicText}` : ""}，主动技能${ACTIVE_SKILL_BY_HERO[heroId].name}${unit && !unit.alive ? "，已阵亡" : skillReady ? "，技能已就绪" : ""}，查看英雄属性`;
      if (tab.getAttribute("aria-label") !== label) tab.setAttribute("aria-label", label);
      const portrait = entry.querySelector<HTMLElement>(".party-member-portrait");
      const rageLevel = `${(rageProgress * 100).toFixed(2)}%`;
      if (portrait && portrait.style.getPropertyValue("--party-rage-level") !== rageLevel) {
        portrait.style.setProperty("--party-rage-level", rageLevel);
      }
      entry.querySelector<HTMLElement>(".party-member-bar.hp i")?.style.setProperty("--party-vital", hpRemaining.toFixed(4));
    }
  }

  private renderNav(state: GameStoreState): void {
    const activeTabIndex = Object.keys(tabMeta).indexOf(state.ui.activeTab);
    this.nav.style.setProperty(
      "--nav-active-x",
      `calc(${Math.max(0, activeTabIndex) * 100}% + ${Math.max(0, activeTabIndex) * 3}px)`,
    );
    const activeTabChanged = this.renderedNavTab !== null && this.renderedNavTab !== state.ui.activeTab;
    this.renderedNavTab = state.ui.activeTab;
    this.nav.innerHTML = Object.entries(tabMeta)
      .map(([id, meta]) => {
        const isActive = state.ui.activeTab === id;
        return `
          <button data-action="select-tab" data-tab="${id}" class="${isActive ? `active${activeTabChanged ? " tab-enter" : ""}` : ""}" aria-current="${isActive ? "page" : "false"}" aria-label="${meta.label}">
            <span class="nav-icon" aria-hidden="true">${meta.icon}</span>
            <span class="nav-label">${meta.label}</span>
          </button>
        `;
      })
      .join("");
  }

  private renderPanel(state: GameStoreState): void {
    if (state.ui.activeTab !== "alchemy") this.closeAlchemyTips();
    if (state.ui.activeTab === "inventory") this.renderInventory(state);
    if (state.ui.activeTab === "shop") this.renderShop(state);
    if (state.ui.activeTab === "heroes") this.renderHeroes(state);
    if (state.ui.activeTab === "stages") this.renderStages(state);
    if (state.ui.activeTab === "alchemy") this.renderAlchemy(state);
  }

  private renderInventory(state: GameStoreState): void {
    const material = this.materialPopoverSource === "inventory"
      && (this.materialPopoverKind === "material"
        || this.materialPopoverKind === "set-essence"
        || this.materialPopoverKind === "item")
      && this.materialPopoverId
      ? { kind: this.materialPopoverKind, id: this.materialPopoverId }
      : null;
    this.content.innerHTML = this.inventoryFeature.render(state, {
      equipmentItemId: this.equipmentPopoverSource === "inventory"
        ? this.equipmentPopoverAnchorId
        : null,
      material,
    });
  }

  private applyInventoryIntent(intent: InventoryIntent, target: HTMLElement): void {
    if (intent.type === "noop") return;
    if (intent.type === "rerender") {
      this.renderInventory(this.store.getState());
      return;
    }
    if (intent.type === "organize") {
      this.store.dispatch({ type: "item:organize" });
      return;
    }
    if (intent.type === "open-salvage") {
      this.openSalvageModal();
      return;
    }
    if (intent.type === "open-material") {
      this.openMaterialPopover("inventory", intent.kind, intent.id, target);
      return;
    }
    const item = this.store.getState().save.inventory.find(
      ({ instanceId }) => instanceId === intent.itemId,
    );
    if (!item) return;
    this.openEquipmentPopover("inventory", intent.itemId, intent.itemId, target);
    this.equipFocusSlot = item.slot;
    this.equipTargetHeroId = this.pickEquipTargetHero(this.store.getState());
  }

  private applyAlchemyIntent(intent: AlchemyIntent): void {
    if (intent.type === "noop") return;
    if (intent.type === "toast") {
      this.showToast(intent.message);
      return;
    }
    if (intent.type === "confirm-downgrade") {
      this.modalPayload = intent.request;
      this.openModal("alchemy-downgrade");
      return;
    }
    if (intent.type === "craft") {
      this.store.dispatch({ type: "alchemy:craft", itemIds: intent.itemIds });
      this.alchemyFeature.resetSelection();
      this.closeAlchemyTips();
      return;
    }

    this.closeAlchemyTips();
    const state = this.store.getState();
    this.renderAlchemy(state);
    if (intent.toast) this.showToast(intent.toast);
    if (intent.type !== "select-item") return;
    const selectedCard = this.resolveAlchemySelectionTipsAnchor("alchemy", intent.itemId);
    if (selectedCard) {
      this.openEquipmentPopover("alchemy", intent.itemId, intent.itemId, selectedCard);
    }
  }

  private applyCraftIntent(intent: CraftIntent, target: HTMLElement): void {
    if (intent.type === "noop") return;
    if (intent.type === "toast") {
      this.showToast(intent.message);
      return;
    }
    if (intent.type === "open-equipment") {
      this.clearAlchemyTipsTimer();
      this.alchemyMaterialPreviewId = null;
      this.alchemyTipsHost.innerHTML = "";
      this.openEquipmentPopover("craft", intent.itemId, intent.itemId, target);
      return;
    }
    if (intent.type === "open-cost-material") {
      this.openMaterialPopover("craft", "material", intent.materialId, target);
      return;
    }
    if (intent.type === "open-imprint-material") {
      this.openMaterialPopover(
        "imprint",
        intent.kind === "essence" ? "imprint-essence" : "imprint-stone",
        intent.kind === "essence" ? intent.setId : "mat_set_inscription",
        target,
      );
      return;
    }
    if (intent.type === "open-modal") {
      this.modalPayload = intent.payload ?? null;
      this.openModal(intent.modal);
      return;
    }
    if (intent.type === "update-modal") {
      this.modalPayload = intent.payload;
      this.renderModal();
      this.syncModalFocus();
      return;
    }
    if (intent.type === "dispatch") {
      this.store.dispatch(intent.action);
      const state = this.store.getState();
      this.craftFeature.sync(state);
      this.renderAlchemy(state);
      return;
    }

    if (intent.clearSelectedMaterial) this.selectedMaterialId = null;
    if (intent.closeModal) this.closeModal();
    if (intent.closeTips) this.closeAlchemyTips();
    else if (intent.closeEquipment) this.closeEquipmentPopover();
    if (intent.materialPreviewId) {
      this.selectedMaterialId = intent.materialPreviewId;
      this.materialTipsSource = "craft";
      this.alchemyPreviewId = null;
      this.alchemyMaterialPreviewId = intent.materialPreviewId;
    }
    this.renderAlchemy(this.store.getState());
    if (intent.materialPreviewId) this.scheduleAlchemyTipsAutoClose();
    if (intent.toast) this.showToast(intent.toast);
    if (intent.openEquipmentItemId) {
      const selectedCard = this.resolveAlchemySelectionTipsAnchor(
        "craft",
        intent.openEquipmentItemId,
      );
      if (selectedCard) {
        this.openEquipmentPopover(
          "craft",
          intent.openEquipmentItemId,
          intent.openEquipmentItemId,
          selectedCard,
        );
      }
    }
  }

  private itemOwnerHeroId(state: GameStoreState, itemId: string): HeroId | null {
    for (const [heroId, progress] of Object.entries(state.save.roster)) {
      for (const equippedId of Object.values(progress.equipment)) {
        if (equippedId === itemId) return heroId as HeroId;
      }
    }
    return null;
  }

  private equippedSetPieceCount(
    state: GameStoreState,
    heroId: HeroId,
    item: InventoryItem,
  ): number {
    const setId = getEquipmentSetId(item);
    if (!setId) return 0;
    return Object.values(state.save.roster[heroId].equipment)
      .map((itemId) => state.save.inventory.find((candidate) => candidate.instanceId === itemId))
      .filter((candidate): candidate is InventoryItem => Boolean(candidate))
      .filter((candidate) => getEquipmentSetId(candidate) === setId)
      .length;
  }

  private previewSetPieceCount(
    state: GameStoreState,
    heroId: HeroId,
    equipped: InventoryItem | null,
    selected: InventoryItem,
  ): number {
    const setId = getEquipmentSetId(selected);
    if (!setId) return 0;
    const currentCount = this.equippedSetPieceCount(state, heroId, selected);
    const replacedPiece = equipped && getEquipmentSetId(equipped) === setId ? 1 : 0;
    return Math.max(0, currentCount - replacedPiece + 1);
  }

  private isOwnedByOtherHero(state: GameStoreState, itemId: string): boolean {
    const owner = this.itemOwnerHeroId(state, itemId);
    return owner != null && owner !== this.equipTargetHeroId;
  }

  private salvageCandidates(state: GameStoreState): InventoryItem[] {
    const equipped = collectEquippedItemIds(state.save.roster);
    return backpackItems(state.save.inventory, equipped)
      .filter((item) => {
        if (!this.salvageRarityFilter.has(item.rarity)) return false;
        if (this.salvageSlotFilter !== "all" && item.slot !== this.salvageSlotFilter) return false;
        return true;
      })
      .sort(compareInventoryItems);
  }

  private syncSalvageSelection(state: GameStoreState): void {
    const equipped = collectEquippedItemIds(state.save.roster);
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
    const equipped = collectEquippedItemIds(state.save.roster);
    const candidates = this.salvageCandidates(state);
    const selectedItems = candidates.filter(
      (item) => this.salvageSelectedIds.has(item.instanceId) && !equipped.has(item.instanceId),
    );
    const totalGold = selectedItems.reduce((sum, item) => sum + getSalvageGold(item), 0);
    const essenceRewards = collectSetEssenceRewards(selectedItems);
    const essenceCount = Object.values(essenceRewards).reduce((sum, amount) => sum + (amount ?? 0), 0);
    const rewardSummary = `<span class="salvage-gold-reward">${currencyIconMarkup("gold")}<b>${compact(totalGold)}</b></span>${essenceCount > 0 ? `<span class="salvage-essence-reward"><img src="/assets/resources/mat_set_essence.png" alt=""><b>精华 ×${essenceCount}</b></span>` : ""}`;
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
          <span class="salvage-summary">已选 ${selectedItems.length} · ${rewardSummary}</span>
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
                          aria-label="${RARITY_LABELS[item.rarity]}${definition.name}${legendaryTraitAria(item)}${isEquipped ? "，已装备不可分解" : ""}"
                        >
                          <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
                          ${equipmentSpecialMarks(item)}
                          ${itemLevelBadge(item)}
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
            确认分解 · ${rewardSummary}
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

    const capable = party.filter((heroId) =>
      canHeroEquipItem(state.save.roster[heroId].level, item),
    );
    const candidates = capable.length ? capable : party;
    let best = candidates.includes(this.selectedHeroId) ? this.selectedHeroId : candidates[0]!;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const heroId of candidates) {
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
    const unlockedSlots = getUnlockedPartySlotCount(state.save.highestClearedStage);
    const party = this.equipPartyEditing ? this.partyDraft : state.save.party;
    const partyKey = `${this.equipPartyEditing ? "edit" : "view"}:${this.partyEditSlot}:${unlockedSlots}:${party.map((heroId) => heroId ?? "empty").join("|")}`;
    return `
      <div class="equip-party-strip" aria-label="当前小队" data-party-key="${partyKey}">
        ${party
          .map((heroId, index) => {
            if (index >= unlockedSlots) {
              const unlockCondition = formatMainlineUnlockCondition(getPartySlotUnlockClearedStage(index));
              return `<button type="button" class="party-member-tab locked" data-action="party-slot-locked" data-slot="${index}" aria-label="第 ${index + 1} 个小队位置未解锁，${unlockCondition}"><span class="party-member-empty-icon" aria-hidden="true">${EXPEDITION_LOCK_ICON}</span></button>`;
            }
            if (!heroId) {
              const selected = this.equipPartyEditing && index === this.partyEditSlot;
              return `<button type="button" class="party-member-tab empty ${selected ? "selected" : ""}" data-action="${this.equipPartyEditing ? "party-edit-slot" : "party-edit-open"}" data-slot="${index}" aria-label="第 ${index + 1} 位，空位${selected ? "，正在编辑" : "，点击上阵英雄"}" aria-pressed="${selected}"><span class="party-member-empty-icon" aria-hidden="true">+</span></button>`;
            }
            const hero = HERO_BY_ID[heroId];
            const selected = this.equipPartyEditing ? index === this.partyEditSlot : heroId === this.equipTargetHeroId;
            return `
              <button
                class="party-member-tab ${selected ? "selected" : ""}"
                data-action="${this.equipPartyEditing ? "party-edit-slot" : "equip-hero-select"}"
                data-hero-id="${heroId}"
                data-slot="${index}"
                aria-label="第 ${index + 1} 位，${hero.name}，${this.equipPartyEditing ? selected ? "正在编辑" : "点击编辑此栏位" : selected ? "已选中，点击换人" : "选中英雄"}"
                aria-pressed="${selected ? "true" : "false"}"
              >
                <span class="party-member-portrait"><img src="${ASSET_MANIFEST.characters[heroId]}" alt="" /></span>
                <span class="party-member-selected-meta" aria-hidden="true"><strong>${hero.name}</strong><small>${this.equipPartyEditing ? "当前栏位" : "点击换人"}</small></span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  private renderPartyEditor(state: GameStoreState): string {
    const busy = getBusyHeroIds(state.save.dungeonRuns);
    const partyCount = this.partyDraft.filter((heroId): heroId is HeroId => heroId !== null).length;
    const unlockedSlots = getUnlockedPartySlotCount(state.save.highestClearedStage);
    const partyOrder = new Map(
      this.partyDraft
        .filter((heroId): heroId is HeroId => heroId !== null)
        .map((heroId, index) => [heroId, index]),
    );
    const orderedHeroes = HERO_DEFINITIONS
      .filter((hero) => state.save.roster[hero.id].unlocked)
      .map((hero, index) => ({ hero, index, partyIndex: partyOrder.get(hero.id) }))
      .sort((left, right) => {
        if (left.partyIndex !== undefined && right.partyIndex !== undefined) {
          return left.partyIndex - right.partyIndex;
        }
        if (left.partyIndex !== undefined) return -1;
        if (right.partyIndex !== undefined) return 1;
        return left.index - right.index;
      })
      .map(({ hero }) => hero);
    const cards = orderedHeroes.map((hero) => {
      const progress = state.save.roster[hero.id];
      const inParty = this.partyDraft.includes(hero.id);
      const busyInDungeon = busy.has(hero.id);
      const lastPartyHero = inParty && partyCount === 1;
      const disabled = busyInDungeon || lastPartyHero;
      const action = inParty ? "party-edit-remove" : "party-edit-add";
      const actionLabel = busyInDungeon ? "远征中" : lastPartyHero ? "需保留1人" : inParty ? "下阵" : "上阵";
      const ascendLevel = progress.ascendLevel ?? 0;
      const ascendClass = ascendLevel > 0 ? `ascended ascend-${ascendLevel}` : "";
      return `<button type="button" class="hero-card hero-roster-card party-edit-card role-${hero.role} ${ascendClass} ${inParty ? "selected in-party" : ""} ${busyInDungeon ? "busy" : ""}" data-action="${action}" data-hero-id="${hero.id}" role="listitem" aria-label="${hero.name}，${actionLabel}" aria-pressed="${inParty}" ${disabled ? "disabled" : ""} style="--role-color:${hero.color}">
        ${renderAscendRankSeal(ascendLevel)}
        <div class="hero-card-art" style="--hero-color:${hero.color}">
          <img src="${ASSET_MANIFEST.characters[hero.id]}" alt="" draggable="false" />
        </div>
        ${inParty ? `<span class="party-edit-card-status" aria-hidden="true">已上阵</span>` : ""}
        <strong class="hero-card-name">${hero.name}</strong>
        <span class="hero-card-meta">
          <span class="hero-card-role">${hero.specName}</span>
          <span class="hero-card-level">Lv.${progress.level}</span>
        </span>
      </button>`;
    }).join("");
    return `
      <div class="party-edit-heading">
        <span><strong>选择英雄</strong><small>空位按顺序上阵，点上方栏位可调整位置</small></span>
        <b>已上阵 ${partyCount}/${unlockedSlots}</b>
      </div>
      <div class="hero-card-grid party-edit-picker" role="list" aria-label="已解锁英雄">${cards}</div>
      <footer class="party-edit-actions">
        <button type="button" class="secondary-button" data-action="party-edit-cancel">取消</button>
        <button type="button" class="primary-button" data-action="party-edit-save">保存阵容</button>
      </footer>
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
        aria-label="${slotLabel[slot]}${equipped && definition ? `：${definition.name}${legendaryTraitAria(equipped)}，点击查看` : "：空，点击筛选该槽位装备"}"
      >

        <span class="equip-slot-art" aria-hidden="true">${
          equipped && definition ? `${equipmentArt(definition.icon)}${equipmentSpecialMarks(equipped)}` : "空"
        }</span>
        <small>${slotLabel[slot]}</small>
      </button>
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

  private playEquipPanelTransition(): void {
    const modal = this.overlay.querySelector<HTMLElement>(".character-equip-modal");
    const panelBody = modal?.querySelector<HTMLElement>(".equip-panel-body");
    if (!panelBody) return;

    panelBody.classList.remove("equip-tab-sections-enter");
    void panelBody.offsetWidth;
    panelBody.classList.add("equip-tab-sections-enter");
  }

  private formatStatValue(value: number, digits = 0): string {
    if (!Number.isFinite(value)) return "0";
    if (digits <= 0) return String(Math.round(value));
    const fixed = value.toFixed(digits);
    return fixed.replace(/\.?0+$/, "");
  }

  private getHeroStatRows(stats: HeroCombatDisplayStats): {
    offensiveRows: HeroStatRow[];
    defensiveRows: HeroStatRow[];
  } {
    const offensiveRows: HeroStatRow[] = [
      { label: "攻击", value: this.formatStatValue(stats.attack) },
      { label: "全伤害", value: `+${this.formatStatValue(stats.damagePct, 1)}%` },
      { label: "普攻伤害", value: `+${this.formatStatValue(stats.primaryAttackPct, 1)}%` },
      { label: "技能伤害", value: `+${this.formatStatValue(stats.skillDamagePct, 1)}%` },
      { label: "技能效果", value: `+${this.formatStatValue(stats.skillEffectPct, 1)}%` },
      { label: "物理伤害", value: `+${this.formatStatValue(stats.physicalDamagePct, 1)}%` },
      { label: "法术伤害", value: `+${this.formatStatValue(stats.magicDamagePct, 1)}%` },
      { label: "火焰伤害", value: `+${this.formatStatValue(stats.fireDamagePct, 1)}%` },
      { label: "冰霜伤害", value: `+${this.formatStatValue(stats.frostDamagePct, 1)}%` },
      { label: "雷电伤害", value: `+${this.formatStatValue(stats.lightningDamagePct, 1)}%` },
      { label: "暗黑伤害", value: `+${this.formatStatValue(stats.darkDamagePct, 1)}%` },
      { label: "暴击率", value: `${this.formatStatValue(stats.critChancePct, 1)}%` },
      { label: "暴击伤害", value: `${this.formatStatValue(stats.critDamagePct, 1)}%` },
      { label: "攻击间隔", value: `${this.formatStatValue(stats.attackIntervalMs)}ms` },
      { label: "攻击速度", value: `+${this.formatStatValue(stats.attackSpeedPct, 1)}%` },
      { label: "施法速度", value: `+${this.formatStatValue(stats.castSpeedPct, 1)}%` },
      { label: "怒气上限", value: this.formatStatValue(stats.maxRage) },
      { label: "怒气获取", value: `${this.formatStatValue(stats.rageGainPct, 1)}%` },
      { label: "攻击射程", value: this.formatStatValue(stats.attackRange) },
      { label: "移动速度", value: this.formatStatValue(stats.moveSpeed, 1) },
      { label: "移动速度加成", value: `+${this.formatStatValue(stats.moveSpeedPct, 1)}%` },
    ];
    const defensiveRows: HeroStatRow[] = [
      { label: "防御", value: this.formatStatValue(stats.defense) },
      { label: "最大生命", value: this.formatStatValue(stats.maxHp) },
      { label: "伤害减免", value: `${this.formatStatValue(stats.damageReductionPct, 1)}%` },
      { label: "闪避", value: `${this.formatStatValue(stats.dodgeChancePct, 1)}%` },
      { label: "格挡", value: `${this.formatStatValue(stats.blockChancePct, 1)}%` },
      { label: "治疗效果", value: `+${this.formatStatValue(stats.healPowerPct, 1)}%` },
      { label: "击中回血", value: this.formatStatValue(stats.lifeOnHit) },
      { label: "生命偷取", value: `${this.formatStatValue(stats.lifeStealPct, 1)}%` },
      { label: "每秒回血", value: this.formatStatValue(stats.hpRegenPerSec, 1) },
      { label: "物理抗性", value: `${this.formatStatValue(stats.physicalResistPct, 1)}%` },
      { label: "火焰抗性", value: `${this.formatStatValue(stats.fireResistPct, 1)}%` },
      { label: "冰霜抗性", value: `${this.formatStatValue(stats.frostResistPct, 1)}%` },
      { label: "雷电抗性", value: `${this.formatStatValue(stats.lightningResistPct, 1)}%` },
      { label: "暗黑抗性", value: `${this.formatStatValue(stats.darkResistPct, 1)}%` },
      { label: "圣光抗性", value: `${this.formatStatValue(stats.holyResistPct, 1)}%` },
    ];
    return { offensiveRows, defensiveRows };
  }

  private renderHeroStatRows(rows: readonly HeroStatRow[]): string {
    return rows
      .map((row) => `<div class="equip-stat-row"><span>${row.label}</span><b>${row.value}</b></div>`)
      .join("");
  }

  private getEquipStatsContent(state: GameStoreState, heroId: HeroId, stats: HeroCombatDisplayStats): {
    leftHtml: string;
    rightHtml: string;
    skillsHtml: string;
  } {
    const { offensiveRows, defensiveRows } = this.getHeroStatRows(stats);
    const offensivePreview = new Set(["攻击", "全伤害", "技能伤害", "暴击率", "暴击伤害", "攻击间隔", "攻击速度", "施法速度", "怒气获取"]);
    const defensivePreview = new Set(["防御", "伤害减免", "闪避", "格挡", "治疗效果", "生命偷取", "每秒回血"]);
    const renderCol = (items: readonly HeroStatRow[], label: string, showMore = false) =>
      `<div class="equip-stats-side" aria-label="${label}"><strong class="equip-stats-heading">${label}</strong>${this.renderHeroStatRows(items)}${showMore ? `<button type="button" class="equip-more-stats-button" data-action="open-more-stats" aria-haspopup="dialog" aria-label="查看全部属性"><span>更多</span></button>` : ""}</div>`;
    return {
      leftHtml: renderCol(offensiveRows.filter(({ label }) => offensivePreview.has(label)), "进攻属性"),
      rightHtml: renderCol(defensiveRows.filter(({ label }) => defensivePreview.has(label)), "防御属性", true),
      skillsHtml: this.renderEquipSkills(state, heroId),
    };
  }

  private renderHeroStatsDetail(heroId: HeroId, stats: HeroCombatDisplayStats): string {
    const hero = HERO_BY_ID[heroId];
    const { offensiveRows, defensiveRows } = this.getHeroStatRows(stats);
    return `
      <div class="equip-tips-layer hero-stats-detail-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-more-stats" aria-label="关闭全部属性"></div>
        <section class="equip-tips-panel hero-stats-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-stats-detail-title">
          <header>
            <div><h3 id="hero-stats-detail-title">全部属性</h3><small>${hero.name} · ${hero.className}</small></div>
            <button type="button" class="modal-close" data-action="close-more-stats" aria-label="关闭">×</button>
          </header>
          <div class="hero-stats-detail-body">
            <section class="hero-stats-detail-group" aria-label="进攻属性">
              <h4>进攻属性</h4>
              ${this.renderHeroStatRows(offensiveRows)}
            </section>
            <section class="hero-stats-detail-group" aria-label="防御属性">
              <h4>防御属性</h4>
              ${this.renderHeroStatRows(defensiveRows)}
            </section>
          </div>
        </section>
      </div>`;
  }

  private renderEquipSkills(state: GameStoreState, heroId: HeroId): string {
    const active = ACTIVE_SKILL_BY_HERO[heroId];
    const passive = PASSIVE_SKILL_BY_HERO[heroId];
    const progress = state.save.roster[heroId];
    const ascendLevel = progress.ascendLevel ?? 0;
    const levelCap = getHeroLevelCap(ascendLevel);
    const worldCap = getHeroLevelCap(MAX_HERO_ASCEND_LEVEL);
    const levelExperience = progress.experience ?? 0;
    const levelCurrencyCost = getHeroExperienceRemaining(progress.level, levelExperience);
    const atMaxLevel = progress.level >= levelCap;
    const canLevelUp = !atMaxLevel && state.save.exp >= levelCurrencyCost;
    const starCost = getStarUpgradeCost(progress.stars);
    const atMaxStar = starCost == null || progress.stars >= MAX_HERO_STARS;
    const needed = starCost ?? 0;
    const have = progress.marks + state.save.universalHeroMarks;
    const canStarUp = !atMaxStar && have >= needed;
    const ascendReady = canAscendHero(ascendLevel, progress.level);
    const ascendCost = getAscendStoneCost(ascendLevel);
    const ascendHave = state.save.materials.mat_ascend_stone ?? 0;
    const atMaxAscend = ascendLevel >= MAX_HERO_ASCEND_LEVEL;
    const canAscend = ascendReady && ascendCost != null && ascendHave >= ascendCost;
    const chosenSkill = progress.chosenSkillId ? HERO_SKILL_BY_ID[progress.chosenSkillId] : null;
    const signatureUnlocked = canLearnHeroSkill(progress.level, progress.ascendLevel);
    const unspent = getTalentPointsUnspent(progress.level, progress.talentRanks ?? {});
    const renderTile = (
      kind: "active" | "passive" | "signature" | "talent",
      name: string,
      tag: string,
      unlocked: boolean,
      icon?: SkillIconRef,
    ) => {
      const isInnate = kind === "active" || kind === "passive";
      const tipsOpen = isInnate && this.equipTipsKind === "skill" && this.equipSkillTipsKind === kind;
      const choiceReady = kind === "signature" && unlocked && !chosenSkill;
      const talentReady = kind === "talent" && unspent > 0;
      const hasNotice = choiceReady || talentReady;
      const ariaLabel = !unlocked
        ? `${name}未解锁`
        : choiceReady
          ? "选择通用被动"
          : talentReady
            ? `查看天赋，${unspent}点可用`
            : `查看${kind === "active" ? "主动" : kind === "passive" ? "被动" : kind === "signature" ? "通用被动" : "天赋"} ${name}`;
      const fallbackIcon = !unlocked
        ? `<span class="equip-skill-tile-tag equip-skill-lock-icon" aria-hidden="true">${equipSkillSymbolSvg("lock")}</span>`
        : choiceReady
          ? `<span class="equip-skill-tile-tag equip-skill-choice-icon" aria-hidden="true"><span>＋</span></span>`
        : kind === "talent"
          ? `<span class="equip-skill-tile-tag equip-talent-entry-icon" aria-hidden="true">${equipSkillSymbolSvg("talent")}</span>`
          : `<span class="equip-skill-tile-tag" aria-hidden="true">${tag}</span>`;
      return `
          <button
            type="button"
            class="equip-skill-tile ${unlocked ? "" : "locked"} ${choiceReady ? "choice-ready" : ""}"
            data-action="equip-skill-tips"
            data-skill-kind="${kind}"
            aria-label="${ariaLabel}"
            ${isInnate ? `aria-expanded="${tipsOpen}" aria-controls="equip-innate-skill-tips"` : ""}
          >
            <span class="equip-skill-tile-icon" aria-hidden="true">
              ${unlocked && icon
                ? `<span class="equip-skill-tile-tag skill-icon-sprite" style="${skillIconStyle(icon)}"></span>`
                : fallbackIcon}
              ${hasNotice ? `<span class="equip-skill-notice"></span>` : ""}
            </span>
            <strong class="equip-skill-name">${name}</strong>
          </button>`;
    };
    const levelStatus = atMaxLevel
      ? progress.level >= worldCap
        ? "已满级"
        : "需进阶"
      : "";
    const levelCostMarkup = atMaxLevel
      ? ""
      : `<span class="equip-growth-currency-cost"><img src="${ACCOUNT_CURRENCY_BY_ID.exp.icon}" alt="" aria-hidden="true"><b>${compact(levelCurrencyCost)}</b></span>`;
    const starSummary = atMaxStar ? "已满星" : `碎片 ${have}/${needed}`;
    const ascendSummary = atMaxAscend
      ? "已满阶"
      : canAscend
        ? "可以进阶"
        : `${ascendLevel}/${MAX_HERO_ASCEND_LEVEL} 阶`;
    const innateSkillTips =
      this.equipTipsKind === "skill" &&
      (this.equipSkillTipsKind === "active" || this.equipSkillTipsKind === "passive")
        ? this.renderSkillTips(heroId)
        : "";
    return `
      <div class="equip-skill-section" aria-label="英雄技能、通用被动、升级、升星与进阶">
        <div class="equip-skill-list" aria-label="技能栏">
          ${renderTile("active", active.name, "技", true, active.icon)}
          ${renderTile("passive", passive.name, "被", true, passive.icon)}
          ${renderTile("signature", chosenSkill?.name ?? "通用被动", "通", signatureUnlocked, chosenSkill?.icon)}
          ${renderTile("talent", "天赋", "赋", true)}
        </div>
        ${innateSkillTips}
        <div class="equip-growth-actions" aria-label="角色养成">
          <button
            type="button"
            class="equip-growth-action level"
            data-action="hero-level"
            data-hero-id="${heroId}"
            aria-label="${atMaxLevel ? `升级，${levelStatus}` : `升级，消耗经验${levelCurrencyCost}`}"
            ${canLevelUp ? "" : "disabled"}
          >
            <span class="equip-growth-action-icon" aria-hidden="true">Lv</span>
            <span class="equip-growth-action-copy"><strong>升级</strong>${levelStatus ? `<small>${levelStatus}</small>` : ""}${levelCostMarkup}</span>
          </button>
          <button
            type="button"
            class="equip-growth-action star"
            data-action="open-growth-dialog"
            data-growth-kind="star"
            data-hero-id="${heroId}"
            aria-label="${canStarUp ? "查看升星，可以升星" : `查看${atMaxStar ? "满星状态" : "升星"}`}"
          >
            ${canStarUp ? `<span class="equip-growth-notice" aria-hidden="true"></span>` : ""}
            <span class="equip-growth-action-icon" aria-hidden="true">★</span>
            <span><strong>升星</strong><small>${starSummary}</small></span>
          </button>
          <button
            type="button"
            class="equip-growth-action ascend"
            data-action="open-growth-dialog"
            data-growth-kind="ascend"
            data-hero-id="${heroId}"
            aria-label="${canAscend ? "查看进阶，可以进阶" : `查看${atMaxAscend ? "满阶状态" : "进阶"}`}"
          >
            ${canAscend ? `<span class="equip-growth-notice" aria-hidden="true"></span>` : ""}
            <span class="equip-growth-action-icon" aria-hidden="true">◆</span>
            <span><strong>进阶</strong><small>${ascendSummary}</small></span>
          </button>
        </div>
      </div>
    `;
  }

  private renderGrowthDialog(state: GameStoreState, heroId: HeroId): string {
    const kind = this.equipGrowthKind;
    if (!kind) return "";
    const hero = HERO_BY_ID[heroId];
    const progress = state.save.roster[heroId];
    const ascendLevel = progress.ascendLevel ?? 0;
    const levelCap = getHeroLevelCap(ascendLevel);

    if (kind === "star") {
      const cost = getStarUpgradeCost(progress.stars);
      const atMax = cost == null || progress.stars >= MAX_HERO_STARS;
      const needed = cost ?? 0;
      const personalMarks = progress.marks;
      const universalMarks = state.save.universalHeroMarks;
      const have = personalMarks + universalMarks;
      const canUpgrade = !atMax && have >= needed;
      const currentRankLabel = getHeroStarRankLabel(progress.stars);
      const nextRankLabel = getHeroStarRankLabel(progress.stars + 1);
      const skillEffectDelta = Math.round(
        (getStarSkillEffectPct(progress.stars + 1) - getStarSkillEffectPct(progress.stars)) * 100,
      );
      const rageGainDelta = Math.round(
        (getStarRageGainPct(progress.stars + 1) - getStarRageGainPct(progress.stars)) * 100,
      );
      const bonusItems = [
        { label: "技能效果", value: `+${skillEffectDelta}%` },
        ...(rageGainDelta > 0 ? [{ label: "怒气获取", value: `+${rageGainDelta}%` }] : []),
      ];
      return `
        <div class="equip-tips-layer growth-dialog-layer star-growth-dialog-layer" role="presentation">
          <div class="equip-tips-backdrop" data-action="close-growth-dialog" aria-label="关闭升星弹窗"></div>
          <section class="equip-tips-panel growth-dialog" data-growth-kind="star" role="dialog" aria-modal="true" aria-label="${hero.name}升星">
            <header class="growth-dialog-head growth-dialog-main-head">
              <h3>英雄升星</h3>
              <span class="growth-hero-name">${hero.name}</span>
            </header>
            <div class="growth-star-rank" aria-label="当前${currentRankLabel}${atMax ? "" : `，升星后${nextRankLabel}`}">
              <span class="growth-star-orbs" data-star-phase="${getHeroStarPhase(progress.stars).phase}" aria-hidden="true">${renderHeroStarOrbs(progress.stars)}</span>
              ${atMax ? "" : `<b aria-hidden="true">→</b><span class="growth-star-orbs next" data-star-phase="${getHeroStarPhase(progress.stars + 1).phase}" aria-hidden="true">${renderHeroStarOrbs(progress.stars + 1)}</span>`}
            </div>
            ${atMax ? "" : `<div class="growth-star-bonus" aria-label="本次提升：${bonusItems.map(({ label, value }) => `${label} ${value}`).join("，")}"><small>本次提升</small><div>${bonusItems.map(({ label, value }) => `<span class="growth-star-bonus-pill"><em>${label}</em><b>${value}</b></span>`).join("")}</div></div>`}
            <div class="growth-resource-row hero-fragment-cost" aria-label="专属碎片 ${personalMarks}，通用英雄碎片 ${universalMarks}">
              <small class="hero-fragment-title">升星消耗</small>
              <span class="hero-fragment-art" aria-hidden="true"><img src="${ASSET_MANIFEST.characters[heroId]}" alt=""></span>
              <b class="hero-fragment-count${!atMax && have < needed ? " insufficient" : ""}">${atMax ? have : `${have}/${needed}`}</b>
              <small class="hero-fragment-breakdown">专属 ${personalMarks} · 通用 ${universalMarks}</small>
            </div>
            <footer class="growth-dialog-actions single-action">
              <button type="button" class="primary-button" data-action="hero-star-up" data-hero-id="${heroId}" ${canUpgrade ? "" : "disabled"}>${atMax ? "已满星" : "升星"}</button>
            </footer>
          </section>
        </div>`;
    }

    const cost = getAscendStoneCost(ascendLevel);
    const atMax = ascendLevel >= MAX_HERO_ASCEND_LEVEL || cost == null;
    const have = state.save.materials.mat_ascend_stone ?? 0;
    const levelReady = progress.level >= levelCap;
    const stonesReady = cost != null && have >= cost;
    const canUpgrade = !atMax && canAscendHero(ascendLevel, progress.level) && stonesReady;
    const nextAscendLevel = Math.min(MAX_HERO_ASCEND_LEVEL, ascendLevel + 1);
    const nextLevelCap = getHeroLevelCap(nextAscendLevel);
    const ascendPctDelta = Math.round(
      (getAscendStatPct(nextAscendLevel) - getAscendStatPct(ascendLevel)) * 100,
    );
    const bonusItems = [
      ...(ascendLevel === 0 ? [{ label: "能力解锁", value: "通用被动" }] : []),
      ...(nextLevelCap > levelCap
        ? [{ label: "等级上限", value: `Lv.${levelCap} → Lv.${nextLevelCap}` }]
        : []),
      ...(ascendPctDelta > 0
        ? [
            { label: "生命", value: `+${ascendPctDelta}%` },
            { label: "攻击", value: `+${ascendPctDelta}%` },
            { label: "防御", value: `+${ascendPctDelta}%` },
          ]
        : []),
    ];
    return `
      <div class="equip-tips-layer growth-dialog-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-growth-dialog" aria-label="关闭进阶弹窗"></div>
        <section class="equip-tips-panel growth-dialog" data-growth-kind="ascend" role="dialog" aria-modal="true" aria-label="${hero.name}进阶">
          <header class="growth-dialog-head growth-dialog-main-head">
            <h3>英雄进阶</h3>
            <span class="growth-hero-name">${hero.name}</span>
          </header>
          <div class="growth-ascend-rank${atMax ? " single" : ""}" aria-label="当前进阶${ascendLevel}${atMax ? "，已满阶" : `，进阶后${nextAscendLevel}`}">
            <span class="growth-ascend-rank-card">
              <small>当前阶位</small>
              ${ascendLevel > 0 ? renderAscendRankSeal(ascendLevel) : `<i class="growth-ascend-rank-zero" aria-hidden="true">0</i>`}
              <strong>${ascendLevel > 0 ? `进阶 ${ascendLevel}` : "未进阶"}</strong>
            </span>
            ${atMax ? "" : `
              <b aria-hidden="true">→</b>
              <span class="growth-ascend-rank-card next">
                <small>进阶后</small>
                ${renderAscendRankSeal(nextAscendLevel)}
                <strong>进阶 ${nextAscendLevel}</strong>
              </span>
            `}
          </div>
          ${atMax || bonusItems.length === 0 ? "" : `
            <div class="growth-star-bonus growth-ascend-bonus${bonusItems.length === 1 ? " single" : ""}" aria-label="本次提升：${bonusItems.map(({ label, value }) => `${label} ${value}`).join("，")}">
              <small>本次提升</small>
              <div>${bonusItems.map(({ label, value }) => `<span class="growth-star-bonus-pill"><em>${label}</em><b>${value}</b></span>`).join("")}</div>
            </div>
          `}
          ${atMax ? `<div class="growth-ascend-complete"><strong>已达到最高进阶</strong><small>当前等级上限 Lv.${levelCap}</small></div>` : `
            <div class="growth-condition-list growth-ascend-requirements" aria-label="进阶条件">
              <small class="growth-section-title">进阶条件</small>
              <div class="growth-condition ${levelReady ? "met" : ""}"><span>等级${levelReady ? "" : `<em class="growth-condition-unmet">（未达成）</em>`}</span><b class="growth-condition-target-level">Lv.${levelCap}</b></div>
              <div class="growth-ascend-cost-block" aria-label="进阶消耗">
                <small>进阶消耗</small>
                <button type="button" class="growth-ascend-stone-cost ${stonesReady ? "" : "insufficient"} ${this.materialPopoverSource === "growth" && this.materialPopoverId === "mat_ascend_stone" ? "equipment-previewing" : ""}" data-action="growth-cost-material-tip" data-material-id="mat_ascend_stone" aria-label="查看进阶石详情，消耗 ${cost ?? 0} 个，持有 ${have} 个" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${this.materialPopoverSource === "growth" && this.materialPopoverId === "mat_ascend_stone"}">
                  <span class="craft-socket-cost-art">${materialArt(MATERIAL_BY_ID.mat_ascend_stone.icon)}</span>
                  <span class="craft-socket-cost-count" aria-hidden="true"><b>${have}</b><i>/${cost ?? 0}</i></span>
                </button>
              </div>
            </div>
          `}
          <footer class="growth-dialog-actions single-action">
            <button type="button" class="primary-button" data-action="hero-ascend" data-hero-id="${heroId}" ${canUpgrade ? "" : "disabled"}>${atMax ? "已满阶" : "进阶"}</button>
          </footer>
        </section>
      </div>`;
  }

  private renderSkillTips(heroId: HeroId): string {
    const kind = this.equipSkillTipsKind;
    if (!kind || kind === "talent") return "";
    const augmentationControl = kind === "active" ? renderAugmentationTargetControl(this.store.getState().save, heroId) : "";
    const progress = this.store.getState().save.roster[heroId];
    const chosen = progress.chosenSkillId ? HERO_SKILL_BY_ID[progress.chosenSkillId] : null;
    const signatureUnlocked = canLearnHeroSkill(progress.level, progress.ascendLevel);
    const activeOrPassive =
      kind === "active" ? ACTIVE_SKILL_BY_HERO[heroId] : kind === "passive" ? PASSIVE_SKILL_BY_HERO[heroId] : null;
    const skill = kind === "signature" ? chosen : activeOrPassive;
    const icon = skill?.icon;
    const kindLabel = kind === "active" ? "主动技能" : kind === "passive" ? "被动技能" : "通用被动";
    const tag = kind === "active" ? "技" : kind === "passive" ? "被" : "通";
    const unlocked = kind === "signature" ? signatureUnlocked : true;
    const lockHint = kind === "signature" && !unlocked ? `英雄 ${HERO_SKILL_UNLOCK_LEVEL} 级并进阶 1 次解锁` : null;
    const rageCost = kind === "active" ? ACTIVE_SKILL_RAGE_COST : null;
    const title = skill?.name ?? (kind === "signature" ? (unlocked ? "尚未选择" : "通用被动") : "");
    const description =
      skill?.description ??
      (kind === "signature"
        ? unlocked
          ? "从共用被动中选择 1 个，装备后持续生效或满足条件时自动触发。"
          : `达到 ${HERO_SKILL_UNLOCK_LEVEL} 级并完成一阶突破后，可选择 1 个通用被动。`
        : "");
    const footer =
      lockHint
        ? `<p class="equip-skill-tips-cd muted">${lockHint}</p>`
        : kind === "signature" && unlocked && !chosen
          ? `<button type="button" class="primary-button compact" data-action="equip-skill-pick">选择技能</button>`
          : kind === "signature" && chosen
            ? `<p class="equip-skill-tips-cd">被动效果 · 不消耗怒气 · 不占用行动</p>
          <button type="button" class="secondary-button compact" data-action="equip-skill-pick">更换技能</button>`
            : rageCost
              ? `<p class="equip-skill-tips-cd">需要怒气 <b>${rageCost}</b></p>`
              : `<p class="equip-skill-tips-cd muted">被动效果</p>`;
    if (kind === "active" || kind === "passive") {
      return `
        <aside
          id="equip-innate-skill-tips"
          class="equip-skill-popover${augmentationControl ? " with-augmentation-target" : ""}"
          data-skill-kind="${kind}"
          role="region"
          aria-label="${kindLabel}详情"
        >
          <div class="equip-skill-popover-head">
            ${icon ? `<span class="equip-skill-popover-icon skill-icon-sprite" style="${skillIconStyle(icon)}" aria-hidden="true"></span>` : ""}
            <div><small>${kindLabel}</small><strong>${title}</strong></div>
          </div>
          <p class="equip-skill-tips-desc">${description}</p>
          ${footer}
          ${augmentationControl}
        </aside>`;
    }
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭技能详情"></div>
        <section class="equip-tips-panel skill-tips" role="dialog" aria-modal="true" aria-label="${kindLabel}">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <div class="equip-skill-tips-head">
            ${unlocked && icon
              ? `<div class="equip-skill-icon large skill-icon-sprite" style="${skillIconStyle(icon)}" aria-hidden="true"></div>`
              : `<div class="equip-skill-icon large${unlocked ? "" : " equip-skill-lock-detail"}" aria-hidden="true">${unlocked ? `<span>${tag}</span>` : equipSkillSymbolSvg("lock")}</div>`}
            <div>
              <small>${kindLabel}${lockHint ? ` · ${lockHint}` : ""}</small>
              <h3>${title}</h3>
            </div>
          </div>
          <p class="equip-skill-tips-desc">${description}</p>
          <footer class="equip-skill-tips-footer">${footer}</footer>
        </section>
      </div>
    `;
  }

  private renderTalentTips(state: GameStoreState, heroId: HeroId): string {
    const progress = state.save.roster[heroId];
    const ranks = progress.talentRanks ?? {};
    const earned = getTalentPointsEarned(progress.level);
    const unspent = getTalentPointsUnspent(progress.level, ranks);
    const canAffordReset = state.save.gold >= TALENT_RESET_GOLD_COST;
    const resetCostLabel = `${TALENT_RESET_GOLD_COST / 1_000}K`;
    const selectedId = this.selectedTalentId;
    const selected = selectedId ? talentByIdForHero(heroId, selectedId) : null;
    const selectedRank = selectedId ? (ranks[selectedId] ?? 0) : 0;
    const canUpgrade = selectedId ? canUpgradeTalent(ranks, selectedId, progress.level, heroId) : false;
    const blocked = selectedId && !canUpgrade ? talentUpgradeBlocked(ranks, selectedId, progress.level, heroId) : null;
    const tiersHtml = TALENT_TIERS.map((tierDef, tierIndex) => {
      const { spent, max } = getTalentTierProgress(ranks, tierDef.tier);
      const unlocked = isTalentTierUnlocked(ranks, tierDef.tier);
      const tierNodes = talentsInTier(heroId, tierDef.tier);
      const nodes = tierNodes
        .map((node) => {
          const rank = ranks[node.id] ?? 0;
          const nodeUnlocked = isTalentNodeUnlocked(ranks, node.id);
          const nodeBlocked = talentUpgradeBlocked(ranks, node.id, progress.level, heroId);
          const nodeCanUpgrade = nodeBlocked == null;
          const selectedClass = selectedId === node.id ? " selected" : "";
          const learnedClass = rank > 0 ? " learned" : "";
          const upgradedClass = this.talentUpgradeFeedbackId === node.id ? " upgraded" : "";
          const lockedClass = !nodeUnlocked && rank <= 0 ? " locked" : "";
          const availableClass = nodeCanUpgrade ? " available" : "";
          const unavailableClass = nodeUnlocked && rank <= 0 && !nodeCanUpgrade ? " unavailable" : "";
          const rankLabel = rank > 0
            ? `${rank}/${node.maxRank}`
            : !nodeUnlocked
              ? ""
              : nodeBlocked?.startsWith("本层")
                ? "已定"
                : nodeBlocked === "天赋点不足"
                  ? "无点数"
                  : `0/${node.maxRank}`;
          const accessibleState = [
            rankLabel,
            nodeBlocked && rank < node.maxRank ? nodeBlocked : null,
          ].filter(Boolean).join("，");
          return `
            <button
              type="button"
              class="talent-node${learnedClass}${selectedClass}${lockedClass}${availableClass}${unavailableClass}${upgradedClass}"
              data-action="talent-select"
              data-talent-id="${node.id}"
              aria-pressed="${selectedId === node.id ? "true" : "false"}"
              aria-label="${node.name}${accessibleState ? `，${accessibleState}` : ""}"
            >
              <span class="talent-node-icon" aria-hidden="true">${talentIconSvg(node)}</span>
              ${this.talentUpgradeFeedbackId === node.id ? '<span class="talent-node-feedback" aria-hidden="true">+1</span>' : ""}
              <strong class="talent-node-name">${talentNodeDisplayName(node)}</strong>
              ${rankLabel ? `<small class="talent-node-rank">${rankLabel}</small>` : ""}
            </button>`;
        })
        .join("");
      const bridge =
        tierIndex === 0
          ? ""
          : `<div class="talent-tier-bridge${unlocked ? " lit" : ""}" aria-hidden="true"></div>`;
      return `
        ${bridge}
        <section class="talent-tier${unlocked ? "" : " locked"}${spent > 0 ? " active" : ""} count-${tierNodes.length}" data-tier="${tierDef.tier}">
          <div class="talent-tier-nodes" style="--talent-count:${tierNodes.length}">${nodes}</div>
          <div class="talent-tier-meta">
            <span class="talent-tier-mark${spent > 0 ? " active" : ""}" aria-label="${tierDef.name}，已投入 ${spent}/${max}">${spent}/${max}</span>
          </div>
        </section>`;
    }).join("");
    const selectedTier = selected ? TALENT_TIERS.find((tier) => tier.tier === selected.tier) : null;
    const nextEffect =
      selected && selectedRank < selected.maxRank
        ? describeTalentEffectAtRank(heroId, selected.id, selectedRank + 1)
        : null;
    const unlockedSelected = selectedId ? isTalentNodeUnlocked(ranks, selectedId) : false;
    const currentEffect = selected && selectedRank > 0
      ? describeTalentEffectAtRank(heroId, selected.id, selectedRank)
      : null;
    const upgradeLabel = selected
      ? selectedRank >= selected.maxRank
        ? "已满级"
        : "强化1级"
      : "强化1级";
    const nodeDetail =
      selected && selectedTier
        ? `
        <section class="talent-node-detail tier-${selected.tier}${this.suppressTalentDetailAnimation ? " no-entry-animation" : ""}" aria-label="${selected.name}" aria-live="polite">
          <header class="talent-node-detail-head">
            <div class="talent-node-tips-icon" aria-hidden="true">${talentIconSvg(selected)}</div>
            <div class="talent-node-detail-title">
              <small>${selectedTier.name}<span>${selectedRank}/${selected.maxRank}</span>${unlockedSelected ? "" : "<em>未解锁</em>"}</small>
              <h3>${selected.name}</h3>
            </div>
          </header>
          <div class="talent-node-tips-stats${selected.maxRank === 1 ? " single" : ""}">
            ${selected.maxRank > 1
              ? `<div><span>当前</span><strong>${currentEffect ?? "尚未投入"}</strong></div>
                 <i aria-hidden="true">›</i>
                 <div><span>下一阶</span><strong>${nextEffect ?? "已满级"}</strong></div>`
              : `<div><span>天赋效果</span><strong>${selected.blurb}</strong></div>`}
          </div>
          <div class="talent-node-tips-actions">
            <button type="button" class="primary-button compact" data-action="talent-up" data-talent-id="${selected.id}" aria-label="${canUpgrade ? upgradeLabel : `${upgradeLabel}，${blocked ?? "不可用"}`}" ${canUpgrade ? "" : "disabled"}>${upgradeLabel}</button>
          </div>
        </section>`
        : `<div class="talent-node-detail empty"><strong>选择一个天赋</strong><span>查看效果并分配天赋点</span></div>`;
    const resetConfirm = this.talentResetPending
      ? `<div class="talent-reset-dialog-layer" role="presentation">
          <div class="talent-reset-dialog-backdrop" aria-hidden="true"></div>
          <section class="talent-reset-confirm" role="dialog" aria-modal="true" aria-labelledby="talent-reset-title" aria-describedby="talent-reset-description talent-reset-cost">
            <header>
              <span class="talent-reset-emblem" aria-hidden="true">↺</span>
              <div><small>专精天赋</small><h3 id="talent-reset-title">重置天赋</h3></div>
            </header>
            <p id="talent-reset-description">清空当前加点并返还 <strong>${earned - unspent}</strong> 点</p>
            <div id="talent-reset-cost" class="talent-reset-cost${canAffordReset ? "" : " insufficient"}">
              <span>重置费用</span>
              <strong>${currencyIconMarkup("gold")}${resetCostLabel}</strong>
              <small>${canAffordReset ? `持有 ${currencyIconMarkup("gold")}${compact(state.save.gold)}` : `金币不足 · 持有 ${currencyIconMarkup("gold")}${compact(state.save.gold)}`}</small>
            </div>
            <footer class="talent-reset-actions">
              <button type="button" class="secondary-button compact" data-action="talent-reset-cancel" autofocus>取消</button>
              <button type="button" class="danger-button compact" data-action="talent-reset-confirm" aria-label="${canAffordReset ? `确认重置，消耗 ${resetCostLabel} 金币` : "确认重置，金币不足"}" ${canAffordReset ? "" : "disabled"}>确认重置</button>
            </footer>
          </section>
        </div>`
      : "";
    return `
      <div class="equip-tips-layer talent-surface" role="presentation">
        <section class="equip-tips-panel talent-tips" role="region" aria-label="专精天赋">
          <header class="talent-board-head">
            <button type="button" class="talent-back-button" data-action="close-equip-tips" aria-label="返回英雄属性">‹</button>
            <div class="talent-board-title">
              <h3>专精天赋</h3>
              <p><span class="talent-board-rule">每 5 级获得 1 点</span><span class="talent-board-points">剩余 <b>${unspent}</b> · 已获 ${earned}/17</span></p>
            </div>
            <button type="button" class="secondary-button compact talent-reset-button" data-action="talent-reset" ${earned - unspent <= 0 || this.talentResetPending ? "disabled" : ""}>重置</button>
          </header>
          <div class="talent-board-layout">
            <div class="talent-tree-board"${selected ? ' data-action="close-talent-node-detail"' : ""}>
              <div class="talent-tree">${tiersHtml}</div>
            </div>
            ${nodeDetail}
          </div>
          ${resetConfirm}
        </section>
      </div>
    `;
  }

  private renderSkillPickTips(state: GameStoreState, heroId: HeroId): string {
    const chosenId = state.save.roster[heroId].chosenSkillId;
    const hero = HERO_BY_ID[heroId];
    const chosenSkill = chosenId ? HERO_SKILL_BY_ID[chosenId] : null;
    const pendingSkill = this.pendingHeroSkillId ? HERO_SKILL_BY_ID[this.pendingHeroSkillId] : null;
    const changeCostLabel = compact(HERO_SKILL_CHANGE_GOLD_COST);
    if (chosenSkill && pendingSkill && pendingSkill.id !== chosenSkill.id) {
      const canAffordChange = state.save.gold >= HERO_SKILL_CHANGE_GOLD_COST;
      const skillSummary = (label: string, skill: NonNullable<typeof chosenSkill>) => `
        <div class="skill-change-option">
          <span class="skill-change-option-icon skill-icon-sprite" style="${skillIconStyle(skill.icon)}" aria-hidden="true"></span>
          <span class="skill-change-option-copy">
            <small>${label} · ${skill.roleLabel}</small>
            <strong>${skill.name}</strong>
            <span>${skill.description}</span>
          </span>
        </div>`;
      return `
        <div class="equip-tips-layer" role="presentation">
          <div class="equip-tips-backdrop" aria-hidden="true"></div>
          <section class="equip-tips-panel skill-pick-tips skill-change-confirm" role="dialog" aria-modal="true" aria-labelledby="skill-change-title" aria-describedby="skill-change-description">
            <header class="skill-pick-head">
              <h3 id="skill-change-title">确认更换通用被动</h3>
              <p id="skill-change-description">确认后将替换${hero.name}当前装备的通用被动。</p>
            </header>
            <div class="skill-change-body">
              <div class="skill-change-route">
                ${skillSummary("当前", chosenSkill)}
                <span class="skill-change-arrow" aria-hidden="true">↓</span>
                ${skillSummary("更换为", pendingSkill)}
              </div>
              <div class="skill-change-cost${canAffordChange ? "" : " insufficient"}">
                <span>更换费用</span>
                <strong>${currencyIconMarkup("gold")}${changeCostLabel}</strong>
                <small>${canAffordChange ? `持有 ${currencyIconMarkup("gold")}${compact(state.save.gold)}` : `金币不足 · 持有 ${currencyIconMarkup("gold")}${compact(state.save.gold)}`}</small>
              </div>
              <footer class="skill-change-actions">
                <button type="button" class="secondary-button" data-action="hero-skill-change-cancel" autofocus>取消</button>
                <button type="button" class="primary-button" data-action="hero-skill-change-confirm" aria-label="${canAffordChange ? `确认更换，消耗 ${changeCostLabel} 金币` : "确认更换，金币不足"}" ${canAffordChange ? "" : "disabled"}>确认更换</button>
              </footer>
            </div>
          </section>
        </div>`;
    }
    const cards = HERO_SKILLS.map((skill) => {
      const selected = chosenId === skill.id;
      return `
        <article class="skill-pick-card ${selected ? "selected" : ""}" aria-label="${skill.roleLabel} ${skill.name}">
          <span class="skill-pick-card-icon skill-icon-sprite" style="${skillIconStyle(skill.icon)}" aria-hidden="true"></span>
          <span class="skill-pick-card-copy">
            <span class="skill-pick-card-title"><small>${skill.roleLabel}</small><strong>${skill.name}</strong></span>
            <span class="skill-pick-card-desc">${skill.description}</span>
          </span>
          <button
            type="button"
            class="${selected ? "secondary-button" : "primary-button"} compact skill-pick-select"
            data-action="choose-hero-skill"
            data-skill-id="${skill.id}"
            aria-pressed="${selected}"
            ${selected ? "disabled" : ""}
          >${selected ? "已选择" : chosenId ? "更换" : "选择"}</button>
        </article>`;
    }).join("");
    return `
      <div class="equip-tips-layer" role="presentation">
        <div class="equip-tips-backdrop" data-action="close-equip-tips" aria-label="关闭技能选择"></div>
        <section class="equip-tips-panel skill-pick-tips" role="dialog" aria-modal="true" aria-label="选择通用被动">
          <button class="modal-close" data-action="close-equip-tips" aria-label="关闭">×</button>
          <header class="skill-pick-head">
            <h3>选择通用被动</h3>
            <p>为${hero.name}选择 1 个，选择后自动生效。</p>
            <span>被动效果 · 不消耗怒气 · 不占用行动</span>
            ${chosenId ? `<span class="skill-pick-change-cost">更换费用 ${currencyIconMarkup("gold")}${changeCostLabel}</span>` : ""}
          </header>
          <div class="skill-pick-grid">${cards}</div>
        </section>
      </div>
    `;
  }

  private renderEquipTipsLayer(
    state: GameStoreState,
    heroId: HeroId,
    equipped: InventoryItem | null,
    selected: InventoryItem | null,
    heroName: string,
    heroLevel: number,
  ): string {
    if (this.equipTipsKind !== "compare" && this.equipTipsKind !== "unequip") return "";
    return renderEquipmentComparisonLayer({
      kind: this.equipTipsKind,
      equipped,
      selected,
      heroName,
      heroLevel,
      selectedSetPieces: selected
        ? this.previewSetPieceCount(state, heroId, equipped, selected)
        : 0,
      equippedSetPieces: equipped
        ? this.equippedSetPieceCount(state, heroId, equipped)
        : 0,
    });
  }

  private resolveEquipmentPopoverAnchor(): HTMLElement | null {
    if (this.equipmentPopoverAnchorElement?.isConnected) return this.equipmentPopoverAnchorElement;
    const source = this.equipmentPopoverSource;
    const anchorId = this.equipmentPopoverAnchorId;
    if (!source || !anchorId) return null;
    if (source === "loot-chest") {
      return this.overlay.querySelector<HTMLElement>(
        `[data-action="loot-chest-reveal-one"][data-loot-index="${anchorId}"]`,
      );
    }
    const actions = {
      inventory: ["item-detail"],
      shop: ["shop-offer-detail"],
      alchemy: ["alchemy-item-select", "alchemy-slot-clear"],
      craft: ["craft-item-select", "craft-item-remove"],
    }[source];
    const key = source === "shop" ? "offerId" : "itemId";
    return actions.flatMap((action) => [...this.root.querySelectorAll<HTMLElement>(`[data-action="${action}"]`)])
      .find((candidate) => candidate.dataset[key] === anchorId) ?? null;
  }

  private openEquipmentPopover(
    source: Exclude<AppShell["equipmentPopoverSource"], null>,
    anchorId: string,
    itemId: string | null,
    anchor: HTMLElement,
  ): void {
    this.closeMaterialPopover();
    this.closeEquipmentPopover();
    this.equipmentPopoverSource = source;
    this.equipmentPopoverAnchorId = anchorId;
    this.equipmentPopoverAnchorElement = anchor;
    this.selectedItemId = itemId;
    if (source === "alchemy" || source === "craft") this.alchemyPreviewId = itemId;
    if (source !== "loot-chest") anchor.classList.add("equipment-previewing");
    anchor.setAttribute("aria-haspopup", "dialog");
    anchor.setAttribute("aria-controls", "global-equipment-tips");
    anchor.setAttribute("aria-expanded", "true");
    this.renderGlobalEquipmentTips(this.store.getState());
  }

  private closeEquipmentPopover(clearSelection = true): void {
    const source = this.equipmentPopoverSource;
    if (source === "alchemy") this.clearAlchemyTipsTimer();
    const anchor = this.resolveEquipmentPopoverAnchor();
    anchor?.classList.remove("equipment-previewing");
    anchor?.setAttribute("aria-expanded", "false");
    this.equipmentPopoverSource = null;
    this.equipmentPopoverAnchorId = null;
    this.equipmentPopoverAnchorElement = null;
    this.equipmentTipsHost.innerHTML = "";
    if (source === "alchemy" || source === "craft") this.alchemyPreviewId = null;
    if (clearSelection) this.selectedItemId = null;
  }

  private resolveMaterialPopoverAnchor(): HTMLElement | null {
    if (this.materialPopoverAnchorElement?.isConnected) return this.materialPopoverAnchorElement;
    const source = this.materialPopoverSource;
    const kind = this.materialPopoverKind;
    const id = this.materialPopoverId;
    if (!source || !kind || !id) return null;
    if (source === "inventory") {
      if (kind === "item") return this.content.querySelector<HTMLElement>(`[data-action="inventory-consumable-detail"][data-consumable-id="${id}"]`);
      const selector = kind === "material"
        ? `[data-action="inventory-material-detail"][data-material-id="${id}"]`
        : `[data-action="inventory-set-essence-detail"][data-set-id="${id}"]`;
      return this.content.querySelector<HTMLElement>(selector);
    }
    if (source === "shop") {
      const selector = kind === "material"
        ? `[data-action="shop-material-detail"][data-material-id="${id}"]`
        : `[data-action="shop-set-essence-detail"][data-set-id="${id}"]`;
      return this.content.querySelector<HTMLElement>(selector);
    }
    if (source === "craft") {
      return this.content.querySelector<HTMLElement>(
        `[data-action="craft-cost-material-tip"][data-material-id="${id}"]`,
      );
    }
    if (source === "growth") {
      return this.overlay.querySelector<HTMLElement>(
        `[data-action="growth-cost-material-tip"][data-material-id="${id}"]`,
      );
    }
    const materialKind = kind === "imprint-essence" ? "essence" : "stone";
    return this.content.querySelector<HTMLElement>(
      `[data-action="craft-imprint-material-tip"][data-material-kind="${materialKind}"]`,
    );
  }

  private openMaterialPopover(
    source: Exclude<AppShell["materialPopoverSource"], null>,
    kind: Exclude<AppShell["materialPopoverKind"], null>,
    id: MaterialId | SetId | RewardBoxId | "ad_ticket",
    anchor: HTMLElement,
  ): void {
    const closingCurrent =
      this.materialPopoverSource === source &&
      this.materialPopoverKind === kind &&
      this.materialPopoverId === id;
    this.closeMaterialPopover();
    if (closingCurrent) return;
    this.closeEquipmentPopover();
    this.closeAlchemyTips();
    this.materialPopoverSource = source;
    this.materialPopoverKind = kind;
    this.materialPopoverId = id;
    this.materialPopoverAnchorElement = anchor;
    if (kind === "item") this.rewardBoxResult = null;
    anchor.classList.add("equipment-previewing");
    anchor.setAttribute("aria-expanded", "true");
    this.renderGlobalMaterialTips(this.store.getState());
  }

  private closeMaterialPopover(): void {
    const exhaustedBox = this.materialPopoverKind === "item" && isRewardBoxId(this.materialPopoverId)
      && this.store.getState().save.rewardBoxes[this.materialPopoverId] === 0;
    const anchor = this.resolveMaterialPopoverAnchor();
    anchor?.classList.remove("equipment-previewing");
    anchor?.setAttribute("aria-expanded", "false");
    this.materialPopoverSource = null;
    this.materialPopoverKind = null;
    this.materialPopoverId = null;
    this.materialPopoverAnchorElement = null;
    this.bagItemTipsRenderKey = "";
    this.equipmentTipsHost.innerHTML = "";
    if (exhaustedBox && this.store.getState().ui.activeTab === "inventory") this.renderInventory(this.store.getState());
  }

  private renderGlobalMaterialTips(state: GameStoreState): void {
    const source = this.materialPopoverSource;
    const kind = this.materialPopoverKind;
    const id = this.materialPopoverId;
    const expectedTab = source === "inventory" ? "inventory" : source === "shop" ? "shop" : "alchemy";
    const sourceIsVisible = source === "growth"
      ? this.modal === "equip" && this.equipGrowthKind === "ascend"
      : state.ui.activeTab === expectedTab;
    if (!source || !kind || !id || !sourceIsVisible) {
      this.closeMaterialPopover();
      return;
    }
    if (!this.resolveMaterialPopoverAnchor()) {
      this.closeMaterialPopover();
      return;
    }

    if (kind === "item" && (isRewardBoxId(id) || id === "ad_ticket")) {
      const count = id === "ad_ticket" ? state.save.adTickets : state.save.rewardBoxes[id];
      const key = `${id}:${count}:${JSON.stringify(this.rewardBoxResult)}`;
      if (key !== this.bagItemTipsRenderKey) {
        const hadFocus = Boolean(this.equipmentTipsHost.contains(document.activeElement));
        this.bagItemTipsRenderKey = key;
        this.equipmentTipsHost.innerHTML = renderBagItemTips(state.save, id, this.rewardBoxResult);
        if (hadFocus) this.equipmentTipsHost.querySelector<HTMLElement>('[data-action="reward-box-open"]:not(:disabled), [role="status"]')?.focus({ preventScroll: true });
      }
      this.positionGlobalEquipmentTips();
      return;
    }

    let name = "";
    let category = "";
    let description = "";
    let icon = "";
    let count = 0;
    let cost: number | null = null;

    if (kind === "material" || kind === "imprint-stone") {
      const materialId = id as MaterialId;
      const definition = MATERIAL_BY_ID[materialId];
      if (!definition) return this.closeMaterialPopover();
      name = definition.name;
      category = MATERIAL_CATEGORY_LABELS[definition.category];
      description = definition.description;
      icon = materialArt(definition.icon);
      count = state.save.materials[materialId] ?? 0;
      if (kind === "imprint-stone") cost = SET_IMPRINT_STONE_COST;
      if (source === "growth" && materialId === "mat_ascend_stone") {
        cost = getAscendStoneCost(state.save.roster[this.equipTargetHeroId].ascendLevel);
      }
    } else {
      const setId = id as SetId;
      const set = SET_BY_ID[setId];
      if (!set) return this.closeMaterialPopover();
      name = `${set.name}精华`;
      category = "套装精华";
      description = `分解带有${set.name}套装标签的装备获得，用于为非套装装备刻印该套装标签。`;
      icon = `<img class="material-art" src="/assets/resources/mat_set_essence.png" alt=""><span class="set-essence-badge ${set.school}">${setNameInitial(set.id)}</span>`;
      count = state.save.setEssences[set.id] ?? 0;
      if (kind === "imprint-essence") cost = SET_IMPRINT_ESSENCE_COST;
    }

    this.equipmentTipsHost.innerHTML = `
      <div class="equip-tips-layer equipment-choice-layer global-equipment-choice-layer ${source === "growth" ? "growth-material-tips-layer" : ""}" role="presentation">
        <div class="equip-tips-backdrop" aria-hidden="true"></div>
        <section class="equipment-tips-popover material-tips-popover is-single" id="global-material-tips" role="dialog" aria-modal="false" aria-label="${name}详情">
          <div class="equipment-tips-pair">
            <article class="equipment-tip-card material-tip-card selected">
              <header class="equipment-tip-head">
                <div class="equipment-tip-icon material-tip-icon" aria-hidden="true">${icon}</div>
                <div>
                  <span class="equipment-tip-context">材料详情</span>
                  <h3>${name}</h3>
                  <p>${category} · 库存 ×${count}</p>
                </div>
              </header>
              <div class="equipment-tip-body">
                ${cost === null ? "" : `<div class="equipment-tip-power ${count >= cost ? "upgrade" : "downgrade"}"><span>本次消耗</span><b>${count}/${cost}</b></div>`}
                <div class="equipment-tip-effects material-tip-effects">
                  <div class="equipment-tip-effect material">
                    <small>说明</small>
                    <div><p>${description}</p></div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    `;
    this.positionGlobalEquipmentTips();
  }

  private renderGlobalEquipmentTips(state: GameStoreState): void {
    const source = this.equipmentPopoverSource;
    const anchorId = this.equipmentPopoverAnchorId;
    if (!source || !anchorId) {
      this.equipmentTipsHost.innerHTML = "";
      return;
    }
    const sourceIsVisible = source === "loot-chest"
      ? this.modal === "loot-chest"
      : state.ui.activeTab === (source === "craft" ? "alchemy" : source);
    if (!sourceIsVisible) {
      this.closeEquipmentPopover();
      return;
    }

    const offer = source === "shop"
      ? state.save.shop.offers.find((entry) => entry.offerId === anchorId)
      : null;
    const item = source === "loot-chest"
      ? this.lootChestPreviewItems.find(({ instanceId }) => instanceId === this.selectedItemId) ?? null
      : source === "shop"
        ? offer?.kind === "equipment" ? offer.item : null
        : state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId) ?? null;
    if (!item) {
      this.closeEquipmentPopover();
      return;
    }

    let footer = "";
    if (source === "inventory") {
      footer = `
        <div class="equipment-tip-actions">
          <button type="button" class="secondary-button equipment-tips-action equipment-tips-salvage" data-action="item-salvage" aria-label="分解，获得金币 ${compact(getSalvageGold(item))}">
            <span class="equipment-tips-salvage-label">分解</span>
            <span class="equipment-tips-salvage-reward">${currencyIconMarkup("gold")}<span>${compact(getSalvageGold(item))}</span></span>
          </button>
          <button type="button" class="primary-button equipment-tips-action" data-action="item-open-equip">装备</button>
        </div>
      `;
    } else if (source === "craft") {
      const inCraft = this.craftTargetId === item.instanceId;
      if (!inCraft) {
        footer = `
          <button type="button" class="primary-button equipment-tips-equip" data-action="craft-item-put">放入</button>
        `;
      }
    } else if (source === "alchemy") {
      const inCube = this.alchemyFeature.hasItem(item.instanceId);
      if (!inCube) {
        footer = `
          <button type="button" class="primary-button equipment-tips-equip" data-action="alchemy-item-put">放入</button>
        `;
      }
    }

    const ownerHeroId = this.itemOwnerHeroId(state, item.instanceId);
    const activeSetPieces = ownerHeroId ? this.equippedSetPieceCount(state, ownerHeroId, item) : 0;
    const contextOwnerHeroId = source === "craft" && (this.craftMode === "inlay" || this.craftMode === "socket")
      ? ownerHeroId
      : null;
    const contextLabel = contextOwnerHeroId ? `${HERO_BY_ID[contextOwnerHeroId].name}已装备` : null;
    this.equipmentTipsHost.innerHTML = renderEquipmentDetailLayer({
      item,
      contextLabel,
      footerHtml: footer,
      activeSetPieces,
      layerClassName: `global-equipment-choice-layer ${source === "loot-chest" ? "loot-chest-equipment-tips-layer" : ""}`,
      popoverId: "global-equipment-tips",
    });
    this.positionGlobalEquipmentTips();
  }

  private positionGlobalEquipmentTips(): void {
    const layer = this.equipmentTipsHost.querySelector<HTMLElement>(".equipment-choice-layer");
    const popover = layer?.querySelector<HTMLElement>(".equipment-tips-popover");
    const anchor = this.equipmentPopoverSource
      ? this.resolveEquipmentPopoverAnchor()
      : this.resolveMaterialPopoverAnchor();
    if (!layer || !popover || !anchor) return;
    this.positionAnchoredEquipmentTips(layer, popover, anchor);
  }

  private positionEquipmentTips(modal: HTMLElement): void {
    const layer = modal.querySelector<HTMLElement>(".equipment-choice-layer");
    const popover = layer?.querySelector<HTMLElement>(".equipment-tips-popover");
    const anchor = this.equipTipsKind === "unequip"
      ? [...modal.querySelectorAll<HTMLElement>('[data-action="equip-slot-focus"][data-slot]')]
        .find((slot) => slot.dataset.slot === this.equipFocusSlot)
      : [...modal.querySelectorAll<HTMLElement>('[data-action="equip-candidate-select"][data-item-id]')]
        .find((candidate) => candidate.dataset.itemId === this.selectedItemId);
    if (!layer || !popover || !anchor) return;
    this.positionAnchoredEquipmentTips(layer, popover, anchor);
  }

  private positionAnchoredEquipmentTips(
    layer: HTMLElement,
    popover: HTMLElement,
    anchor: HTMLElement,
  ): void {
    const layerRect = layer.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const layerWidth = layer.clientWidth;
    const layerHeight = layer.clientHeight;
    if (!layerRect.width || !layerRect.height || !layerWidth || !layerHeight || !anchorRect.width) return;

    const edgeInset = 8;
    const gap = 8;
    const scaleX = layerRect.width / layerWidth;
    const scaleY = layerRect.height / layerHeight;
    const anchorTop = (anchorRect.top - layerRect.top) / scaleY;
    const anchorBottom = (anchorRect.bottom - layerRect.top) / scaleY;
    const anchorLeft = (anchorRect.left - layerRect.left) / scaleX;
    const anchorWidth = anchorRect.width / scaleX;
    const popoverWidth = popover.offsetWidth;
    const popoverHeight = popover.offsetHeight;
    const centeredLeft = anchorLeft + (anchorWidth - popoverWidth) / 2;
    const left = Math.min(
      layerWidth - popoverWidth - edgeInset,
      Math.max(edgeInset, centeredLeft),
    );
    const placeBelow = anchorTop - popoverHeight - gap < edgeInset;
    const top = placeBelow
      ? Math.min(layerHeight - popoverHeight - edgeInset, anchorBottom + gap)
      : anchorTop - popoverHeight - gap;

    popover.classList.toggle("is-below", placeBelow);
    popover.style.setProperty("--equipment-tips-left", `${Math.round(left)}px`);
    popover.style.setProperty("--equipment-tips-top", `${Math.round(Math.max(edgeInset, top))}px`);
  }

  private equipCandidates(state: GameStoreState): InventoryItem[] {
    const equipped = collectEquippedItemIds(state.save.roster);
    const equippedId = state.save.roster[this.equipTargetHeroId].equipment[this.equipFocusSlot];
    const equippedItem = equippedId
      ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId) ?? null
      : null;
    const heroLevel = state.save.roster[this.equipTargetHeroId].level;
    return backpackItems(state.save.inventory, equipped)
      .filter((item) => item.slot === this.equipFocusSlot)
      .sort((a, b) => {
        const aIsUpgrade = canHeroEquipItem(heroLevel, a) && isEquipmentUpgrade(a, equippedItem);
        const bIsUpgrade = canHeroEquipItem(heroLevel, b) && isEquipmentUpgrade(b, equippedItem);
        if (aIsUpgrade !== bIsUpgrade) return aIsUpgrade ? -1 : 1;
        return compareInventoryItems(a, b);
      });
  }

  private hasAutoEquipUpgrade(state: GameStoreState, heroId: HeroId): boolean {
    const progress = state.save.roster[heroId];
    const equipped = collectEquippedItemIds(state.save.roster);
    return backpackItems(state.save.inventory, equipped).some((item) => {
      if (!canHeroEquipItem(progress.level, item)) return false;
      const equippedId = progress.equipment[item.slot];
      const equippedItem = equippedId
        ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId) ?? null
        : null;
      return isEquipmentUpgrade(item, equippedItem);
    });
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
    const heroLevel = state.save.roster[this.equipTargetHeroId].level;
    const levelLocked = !canHeroEquipItem(heroLevel, item);
    const equippedId = state.save.roster[this.equipTargetHeroId].equipment[item.slot];
    const equipped = equippedId
      ? state.save.inventory.find(({ instanceId }) => instanceId === equippedId) ?? null
      : null;
    const isUpgrade = !ownedElsewhere && !levelLocked && isEquipmentUpgrade(item, equipped);
    return `
      <button
        type="button"
        class="item-card ${rarityClass(item.rarity)} ${selected ? "selected" : ""} ${ownedElsewhere ? "owned-elsewhere" : ""} ${levelLocked ? "level-locked" : ""} ${isUpgrade ? "upgrade-candidate" : ""}"
        data-action="${ownedElsewhere ? "noop" : "equip-candidate-select"}"
        data-item-id="${item.instanceId}"
        ${ownedElsewhere ? "disabled" : ""}
        aria-label="${RARITY_LABELS[item.rarity]}${definition.name}，装备等级${getEquipmentLevel(item)}${legendaryTraitAria(item)}${ownedElsewhere ? `，已被${ownerName}装备` : levelLocked ? `，需要英雄${getEquipmentLevel(item)}级` : isUpgrade ? "，可提升当前装备" : ""}"
        aria-pressed="${selected ? "true" : "false"}"
        aria-disabled="${ownedElsewhere ? "true" : "false"}"
        aria-haspopup="dialog"
        aria-controls="equipment-choice-tips"
        aria-expanded="${selected && this.equipTipsKind === "compare" ? "true" : "false"}"
      >
        <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
        ${equipmentSpecialMarks(item)}
        ${itemLevelBadge(item, levelLocked)}
        ${
          isUpgrade
            ? `<span class="equip-upgrade-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path class="equip-upgrade-arrow-shape" d="M12 2.6 21 11.1h-5v8.3H8v-8.3H3Z" />
                  <path class="equip-upgrade-arrow-shine" d="m8.4 9.1 3.6-3.4 3.6 3.4" />
                </svg>
              </span>`
            : ""
        }
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
    if (this.equipTipsKind === "stats-detail" && this.equipPanelTab !== "stats") {
      this.equipTipsKind = null;
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
          <div class="equip-party-editor" hidden></div>
          <div class="equip-panel-tabs-host"></div>
          <div class="equip-panel-body">
            <div class="character-loadout">
              <section class="character-loadout-col left" aria-label="左侧栏">
                <div class="equip-slot-grid gear"></div>
                <div class="equip-stats-col left" hidden></div>
              </section>
              <div class="character-portrait-stage">
                <div class="character-rank-summary">
                  <span class="character-portrait-stars" aria-label="星级"></span>
                  <span class="character-portrait-level"></span>
                </div>
                <div class="character-portrait-tags">
                  <span data-hero-specialization></span>
                </div>
                <img class="character-portrait-art" alt="" />
                <div class="character-portrait-meta">
                  <strong></strong>
                </div>
                <div class="character-resource-bars">
                  <div class="character-resource-bar hp" aria-label="最大生命"><i></i><b></b></div>
                  <div class="character-resource-bar experience" role="progressbar" aria-label="英雄经验" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i></i><b></b></div>
                </div>
              </div>
              <section class="character-loadout-col right" aria-label="右侧栏">
                <div class="equip-slot-grid accessories"></div>
                <div class="equip-stats-col right" hidden></div>
              </section>
            </div>
            <div class="equip-bottom-host">
              <div class="equip-candidate-section">
                <div class="equip-candidate-heading">
                  <small class="equip-candidate-label"></small>
                  <button type="button" class="secondary-button equip-auto-button" data-action="equip-auto">
                    <span aria-hidden="true">✦</span>自动装备
                  </button>
                </div>
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

    const tabsHost = modal.querySelector<HTMLElement>(".equip-panel-tabs-host");
    if (tabsHost) tabsHost.innerHTML = this.renderEquipPanelTabs();

    const displayedParty = this.equipPartyEditing ? this.partyDraft : state.save.party;
    const partyKey = `${this.equipPartyEditing ? "edit" : "view"}:${this.partyEditSlot}:${getUnlockedPartySlotCount(state.save.highestClearedStage)}:${displayedParty.map((partyHeroId) => partyHeroId ?? "empty").join("|")}`;
    const partyStrip = modal.querySelector<HTMLElement>(".equip-party-strip");
    if (partyStrip && partyStrip.dataset.partyKey !== partyKey) {
      partyStrip.outerHTML = this.renderEquipPartyStrip(state);
    }

    for (const plate of modal.querySelectorAll<HTMLElement>(".equip-party-strip .party-member-tab[data-hero-id]")) {
      const plateHeroId = plate.dataset.heroId as HeroId;
      const plateSlot = Number(plate.dataset.slot);
      const selected = this.equipPartyEditing ? plateSlot === this.partyEditSlot : plateHeroId === heroId;
      plate.classList.toggle("selected", selected);
      plate.setAttribute("aria-pressed", selected ? "true" : "false");
      plate.setAttribute("aria-label", `第 ${plateSlot + 1} 位，${HERO_BY_ID[plateHeroId].name}，${this.equipPartyEditing ? selected ? "正在编辑" : "点击编辑此栏位" : selected ? "已选中，点击换人" : "选中英雄"}`);
      const name = plate.querySelector<HTMLElement>(".party-member-selected-meta strong");
      const action = plate.querySelector<HTMLElement>(".party-member-selected-meta small");
      if (name) name.textContent = HERO_BY_ID[plateHeroId].name;
      if (action) action.textContent = this.equipPartyEditing ? "当前栏位" : "点击换人";
    }

    const title = modal.querySelector<HTMLElement>(".character-equip-header h2");
    const backdrop = this.overlay.querySelector<HTMLElement>(".modal-backdrop");
    const closeButton = modal.querySelector<HTMLButtonElement>(".character-equip-header .modal-close");
    const panelBody = modal.querySelector<HTMLElement>(".equip-panel-body");
    const tipsHost = modal.querySelector<HTMLElement>(".equip-tips-host");
    const partyEditor = modal.querySelector<HTMLElement>(".equip-party-editor");
    modal.classList.toggle("party-edit-mode", this.equipPartyEditing);
    modal.setAttribute("aria-label", this.equipPartyEditing ? "更换阵容" : "英雄属性");
    if (title) title.textContent = this.equipPartyEditing ? "更换阵容" : "英雄属性";
    if (backdrop) backdrop.dataset.action = this.equipPartyEditing ? "party-edit-cancel" : "close-modal";
    if (closeButton) closeButton.hidden = this.equipPartyEditing;
    if (tabsHost) tabsHost.hidden = this.equipPartyEditing;
    if (panelBody) panelBody.hidden = this.equipPartyEditing;
    if (tipsHost) tipsHost.hidden = this.equipPartyEditing;
    if (partyEditor) {
      partyEditor.hidden = !this.equipPartyEditing;
      if (this.equipPartyEditing) {
        const scrollTop = partyEditor.querySelector<HTMLElement>(".party-edit-picker")?.scrollTop ?? 0;
        partyEditor.innerHTML = this.renderPartyEditor(state);
        const picker = partyEditor.querySelector<HTMLElement>(".party-edit-picker");
        if (picker) picker.scrollTop = scrollTop;
      } else {
        partyEditor.innerHTML = "";
      }
    }
    if (this.equipPartyEditing) return;

    const showGear = this.equipPanelTab === "gear";
    modal.classList.toggle("stats-mode", !showGear);
    const gearGrid = modal.querySelector<HTMLElement>(".equip-slot-grid.gear");
    const accessoryGrid = modal.querySelector<HTMLElement>(".equip-slot-grid.accessories");
    const statsLeft = modal.querySelector<HTMLElement>(".equip-stats-col.left");
    const statsRight = modal.querySelector<HTMLElement>(".equip-stats-col.right");
    const candidateSection = modal.querySelector<HTMLElement>(".equip-candidate-section");
    const skillHost = modal.querySelector<HTMLElement>(".equip-skill-host");
    const bottomHost = modal.querySelector<HTMLElement>(".equip-bottom-host");
    const displayBonus = getEquipmentBonuses(state.save)[heroId] ?? {};
    const displayStats = getHeroCombatDisplayStats(
      heroId,
      progress.level,
      displayBonus,
      heroGrowthFromProgress(progress),
    );
    const statsContent = showGear ? null : this.getEquipStatsContent(state, heroId, displayStats);

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
    if (bottomHost) bottomHost.classList.toggle("skill-mode", !showGear);
    if (skillHost) {
      skillHost.hidden = showGear;
      skillHost.innerHTML = statsContent?.skillsHtml ?? "";
    }

    const portraitStage = modal.querySelector<HTMLElement>(".character-portrait-stage");
    const portraitArt = modal.querySelector<HTMLImageElement>(".character-portrait-art");
    const portraitStars = modal.querySelector(".character-portrait-stars");
    const portraitLevel = modal.querySelector<HTMLElement>(".character-portrait-level");
    const portraitHpValue = modal.querySelector<HTMLElement>(".character-resource-bar.hp b");
    const portraitExperienceBar = modal.querySelector<HTMLElement>(".character-resource-bar.experience");
    const portraitExperienceValue = portraitExperienceBar?.querySelector<HTMLElement>("b") ?? null;
    const portraitName = modal.querySelector(".character-portrait-meta strong");
    const portraitSpecialization = modal.querySelector<HTMLElement>("[data-hero-specialization]");
    const portraitTags = modal.querySelector<HTMLElement>(".character-portrait-tags");
    if (portraitStage) {
      portraitStage.style.setProperty("--hero-color", hero.color);
      const ascendLevel = progress.ascendLevel ?? 0;
      portraitStage.classList.toggle("ascended", ascendLevel > 0);
      portraitStage.dataset.ascend = String(ascendLevel);
      for (let i = 1; i <= MAX_HERO_ASCEND_LEVEL; i++) {
        portraitStage.classList.toggle(`ascend-${i}`, ascendLevel === i);
      }
    }
    if (portraitHpValue) portraitHpValue.textContent = this.formatStatValue(displayStats.maxHp);
    if (portraitExperienceBar) {
      const requiredExperience = getUpgradeCost(progress.level);
      const currentExperience = Math.min(requiredExperience, progress.experience ?? 0);
      portraitExperienceBar.setAttribute("aria-label", `英雄经验 ${currentExperience}/${requiredExperience}`);
      portraitExperienceBar.setAttribute("aria-valuemax", String(requiredExperience));
      portraitExperienceBar.setAttribute("aria-valuenow", String(currentExperience));
      portraitExperienceBar.style.setProperty(
        "--hero-experience-progress",
        String(requiredExperience > 0 ? currentExperience / requiredExperience : 1),
      );
      if (portraitExperienceValue) {
        portraitExperienceValue.textContent = `${compact(currentExperience)}/${compact(requiredExperience)}`;
      }
    }
    if (portraitArt) {
      if (portraitArt.getAttribute("src") !== portrait) portraitArt.src = portrait;
      portraitArt.alt = hero.name;
    }
    if (portraitStars) {
      portraitStars.innerHTML = renderHeroStarOrbs(progress.stars);
      portraitStars.setAttribute("aria-label", `星级 ${getHeroStarRankLabel(progress.stars)}`);
    }
    if (portraitName) portraitName.textContent = hero.name;
    const ascendLevel = progress.ascendLevel ?? 0;
    const specializationLabel = `${hero.className} · ${hero.specName}`;
    if (portraitSpecialization) portraitSpecialization.textContent = specializationLabel;
    if (portraitLevel) {
      const levelCap = getHeroLevelCap(ascendLevel);
      const atLevelCap = progress.level >= levelCap;
      const atWorldCap = progress.level >= getHeroLevelCap(MAX_HERO_ASCEND_LEVEL);
      portraitLevel.textContent = `Lv.${progress.level}/${levelCap}${atWorldCap ? " · 已满级" : ""}`;
      portraitLevel.classList.toggle("capped", atLevelCap);
    }
    if (portraitTags) {
      portraitTags.setAttribute("aria-label", `职业专精：${specializationLabel}`);
    }

    const candidateLabel = modal.querySelector(".equip-candidate-label");
    if (candidateLabel && showGear) candidateLabel.textContent = `可选装备 · ${slotLabel[focusSlot]}`;
    const autoEquipButton = modal.querySelector<HTMLButtonElement>('[data-action="equip-auto"]');
    if (autoEquipButton) {
      const hasUpgrade = this.hasAutoEquipUpgrade(state, heroId);
      autoEquipButton.classList.toggle("has-upgrade", hasUpgrade);
      autoEquipButton.setAttribute(
        "aria-label",
        hasUpgrade ? "自动装备，有可提升装备" : "自动装备",
      );
    }
    const candidateGrid = modal.querySelector(".equip-candidate-grid");
    if (candidateGrid && showGear) {
      candidateGrid.innerHTML = candidates.length
        ? candidates.map((candidate) => this.renderCandidateCard(state, candidate)).join("")
        : `<div class="equip-candidate-empty">该槽位暂无可选装备</div>`;
    }

    if (tipsHost) {
      const talentScrollTop = tipsHost.querySelector<HTMLElement>(".talent-tree-board")?.scrollTop ?? 0;
      const focusedTalentId = document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.talentId
        : undefined;
      if (this.equipTipsKind === "stats-detail") {
        tipsHost.innerHTML = this.renderHeroStatsDetail(heroId, displayStats);
      } else if (this.equipTipsKind === "growth") {
        tipsHost.innerHTML = this.renderGrowthDialog(state, heroId);
      } else if (this.equipTipsKind === "skill") {
        tipsHost.innerHTML =
          this.equipSkillTipsKind === "active" || this.equipSkillTipsKind === "passive"
            ? ""
            : this.renderSkillTips(heroId);
      } else if (this.equipTipsKind === "talent") {
        tipsHost.innerHTML = this.renderTalentTips(state, heroId);
      } else if (this.equipTipsKind === "skill-pick") {
        tipsHost.innerHTML = this.renderSkillPickTips(state, heroId);
      } else if (showGear) {
        tipsHost.innerHTML = this.renderEquipTipsLayer(state, heroId, equipped, item, hero.name, progress.level);
        if (this.equipTipsKind === "compare" || this.equipTipsKind === "unequip") {
          this.positionEquipmentTips(modal);
        }
      } else {
        tipsHost.innerHTML = "";
      }
      if (this.equipTipsKind === "talent") {
        const talentTree = tipsHost.querySelector<HTMLElement>(".talent-tree-board");
        if (talentTree) talentTree.scrollTop = talentScrollTop;
        if (focusedTalentId) {
          tipsHost.querySelector<HTMLElement>(`[data-talent-id="${focusedTalentId}"]`)?.focus({ preventScroll: true });
        }
      }
    }
  }

  private renderShop(state: GameStoreState): void {
    this.content.innerHTML = renderShopView(state, {
      panel: this.shopPanel,
      abilityCategory: this.abilityCategory,
      equipmentPopoverSource: this.equipmentPopoverSource,
      equipmentPopoverAnchorId: this.equipmentPopoverAnchorId,
      materialPopoverSource: this.materialPopoverSource,
      materialPopoverKind: this.materialPopoverKind,
      materialPopoverId: this.materialPopoverId,
    });
  }

  private tickShopRefresh(): void {
    const checkInDate = getDateKey();
    if (checkInDate !== this.checkInDateKey) {
      this.checkInDateKey = checkInDate;
      this.store.dispatch({ type: "tasks:sync" });
      this.syncCheckInEntry();
      if (this.modal === "activities") {
        this.renderModal();
        this.syncModalFocus();
      }
    }
    const state = this.store.getState();
    const now = Date.now();
    const dateKey = getDateKey(new Date(now));
    const refreshKey = getShopRefreshKey(new Date(now));
    if (state.save.shop.dateKey !== dateKey || state.save.shop.refreshKey !== refreshKey) {
      this.store.dispatch({ type: "shop:sync", now });
      return;
    }
    if (state.ui.activeTab !== "shop" || this.shopPanel !== "daily") return;
    const countdown = this.content.querySelector<HTMLElement>("[data-shop-refresh-countdown]");
    if (countdown) countdown.textContent = formatShopRefreshCountdown(now);
  }

  private renderHeroes(state: GameStoreState): void {
    this.content.innerHTML = renderHeroesView(state, {
      selectedHeroId: this.selectedHeroId,
      partyHeroIds: this.partyHeroIds(state),
      renderAscendRankSeal,
    });
  }

  private chapterDropItemsMarkup(
    chapter: EquipmentChapter,
    difficulty: GameDifficulty,
    items: ItemDefinition[],
  ): string {
    const levelRange = chapterEquipmentLevelRange(chapter, difficulty);
    return items.map((item) => `<button type="button" class="chapter-drop-item" data-action="chapter-drop-item" data-item-id="${item.id}" aria-haspopup="dialog" aria-expanded="false" aria-controls="chapter-drop-item-tips" aria-label="查看${item.name}，本章掉落等级${levelRange}，掉落关卡${chapterEquipmentStageRange(chapter, item.slot)}">
      <span class="chapter-drop-item-icon" aria-hidden="true">${equipmentArt(item.icon)}</span>
    </button>`).join("");
  }

  private chapterDropGroupMarkup(
    chapter: EquipmentChapter,
    difficulty: GameDifficulty,
    label: string,
    items: ItemDefinition[],
  ): string {
    const content = items.length > 0
      ? this.chapterDropItemsMarkup(chapter, difficulty, items)
      : `<div class="chapter-drop-empty">本章没有${label}掉落</div>`;
    return `<section class="chapter-drop-group" aria-label="${label}，共${items.length}件">
      <header class="chapter-drop-group-title">
        <h3>${label}</h3>
        <span>${items.length}件</span>
      </header>
      <div class="chapter-drop-grid">${content}</div>
    </section>`;
  }

  private chapterDropsModal(chapter: EquipmentChapter, difficulty: GameDifficulty): string {
    const pool = getChapterEquipmentDropPool(chapter);
    const setIds = getChapterSetIds(chapter);
    return `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="center-sheet chapter-drops-modal" role="dialog" aria-modal="true" aria-label="${DIFFICULTY_BY_ID[difficulty].label}第${chapterNumeral[chapter]}章掉落装备">
        <header>
          <h2>${DIFFICULTY_BY_ID[difficulty].label} · 第${chapterNumeral[chapter]}章掉落</h2>
          <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        </header>
        <div class="chapter-drop-list" aria-label="可掉落装备，共${pool.length}件">
          <nav class="chapter-set-list" aria-label="本章套装">
            ${setIds.map((setId) => `<button type="button" class="chapter-set-tag" data-action="chapter-set-tips" data-set-id="${setId}" aria-haspopup="dialog" aria-expanded="false" aria-controls="chapter-drop-item-tips">${SET_BY_ID[setId].name}</button>`).join("")}
          </nav>
          ${this.chapterDropGroupMarkup(chapter, difficulty, "本章装备", [...pool])}
        </div>
        <aside class="chapter-drop-item-tips" id="chapter-drop-item-tips" role="dialog" aria-label="装备掉落详情" hidden></aside>
      </section>`;
  }

  private renderStages(state: GameStoreState): void {
    const result = renderStagesView(state, {
      panel: this.stagesPanelTab,
      chapter: this.stagesChapter,
      difficulty: this.stagesDifficulty,
      equipmentArt,
      equipmentDropRarityRange,
      formatMainlineUnlockCondition,
    });
    this.stagesChapter = result.chapter;
    this.stagesDifficulty = result.difficulty;
    this.content.innerHTML = result.html;
  }

  private materialDetailSheet(materialId: MaterialId, count: number): string {
    const definition = MATERIAL_BY_ID[materialId];
    const kindLabel = MATERIAL_CATEGORY_LABELS[definition.category];
    const bonusText = formatGemBonus(definition.gemBonus);
    const bonusLines = bonusText ? bonusText.split("、") : [];
    return `
      <div class="item-detail-sheet material-detail-sheet">
        <div class="item-detail-left">
          <div class="detail-icon item-detail-icon material-tone-${definition.tone}">
            ${materialArt(definition.icon)}
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

  private renderResetAffixTips(state: GameStoreState): void {
    const markup = renderResetAffixModal(state, this.craftFeature);
    if (!markup) {
      this.closeModal();
      return;
    }
    this.overlay.innerHTML = markup;
  }

  private renderSmeltAffixTips(state: GameStoreState): void {
    const markup = renderSmeltAffixModal(state, this.craftFeature);
    if (!markup) {
      this.closeModal();
      return;
    }
    this.overlay.innerHTML = markup;
  }

  private renderCraftResultModal(state: GameStoreState): void {
    const markup = renderCraftResultModal(state, this.modalPayload);
    if (!markup) {
      this.closeModal();
      return;
    }
    this.overlay.innerHTML = markup;
  }

  private renderHeroGrowthResultModal(state: GameStoreState): void {
    const markup = renderHeroGrowthResultModal(state, this.modalPayload);
    if (!markup) {
      this.closeModal();
      return;
    }
    this.overlay.innerHTML = markup;
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
      this.craftMode !== "socket" &&
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

  private renderAlchemyStationTrigger(state: GameStoreState): string {
    const level = state.save.alchemyStation.level;
    return `<button type="button" class="craft-mode-trigger alchemy-station-trigger" data-action="alchemy-station-detail" aria-haspopup="dialog" aria-label="炼金台等级 Lv.${level}，查看详情">Lv.${level}</button>`;
  }

  private clearAlchemyTipsTimer(): void {
    if (!this.alchemyTipsTimer) return;
    clearTimeout(this.alchemyTipsTimer);
    this.alchemyTipsTimer = null;
  }

  private scheduleAlchemyTipsAutoClose(): void {
    this.clearAlchemyTipsTimer();
    this.alchemyTipsTimer = setTimeout(() => {
      this.alchemyTipsTimer = null;
      this.closeAlchemyTips();
    }, 5000);
  }

  private closeAlchemyTips(): void {
    this.clearAlchemyTipsTimer();
    const hasEquipmentPopover =
      this.equipmentPopoverSource === "alchemy" || this.equipmentPopoverSource === "craft";
    const hadTips =
      hasEquipmentPopover ||
      Boolean(this.alchemyMaterialPreviewId) ||
      this.alchemyTipsHost.childElementCount > 0;
    if (hasEquipmentPopover) this.closeEquipmentPopover();
    else this.alchemyPreviewId = null;
    this.alchemyMaterialPreviewId = null;
    this.alchemyTipsHost.innerHTML = "";
    if (!hadTips) return;
    this.content.querySelectorAll(".alchemy-previewing").forEach((el) => {
      el.classList.remove("alchemy-previewing");
    });
  }

  private renderAlchemyFloatingTips(state: GameStoreState): void {
    if (this.alchemyMaterialPreviewId) {
      const materialId = this.alchemyMaterialPreviewId;
      if (!MATERIAL_BY_ID[materialId]) {
        this.closeAlchemyTips();
        return;
      }
      const count = state.save.materials[materialId] ?? 0;
      this.alchemyTipsHost.innerHTML = `
        <div class="alchemy-tips-layer" role="presentation">
          <div class="alchemy-tips" id="alchemy-material-tips" role="tooltip">
            ${this.materialDetailSheet(materialId, count)}
          </div>
        </div>
      `;
      return;
    }
    this.alchemyTipsHost.innerHTML = "";
  }

  private resolveAlchemySelectionTipsAnchor(source: "alchemy" | "craft", itemId: string): HTMLElement | null {
    const actions = source === "alchemy"
      ? ["alchemy-item-select", "alchemy-slot-clear"]
      : ["craft-item-select", "craft-item-remove"];
    return actions.flatMap((action) => [...this.content.querySelectorAll<HTMLElement>(`[data-action="${action}"]`)])
      .find((candidate) => candidate.dataset.itemId === itemId) ?? null;
  }

  private craftPreviewState(): CraftPreviewState {
    return {
      equipmentItemId: this.equipmentPopoverSource === "craft" ? this.alchemyPreviewId : null,
      materialItemId: this.alchemyMaterialPreviewId,
      costMaterialId:
        this.materialPopoverSource === "craft"
        && this.materialPopoverKind === "material"
        && this.materialPopoverId
          ? this.materialPopoverId as MaterialId
          : null,
      imprintMaterialKind:
        this.materialPopoverSource === "imprint"
          ? this.materialPopoverKind === "imprint-essence"
            ? "essence"
            : this.materialPopoverKind === "imprint-stone"
              ? "stone"
              : null
          : null,
    };
  }

  private renderAlchemy(state: GameStoreState): void {
    this.alchemyFeature.sync(state);
    this.craftFeature.sync(state);
    const filledIds = this.alchemyFeature.getSelectedItemIds();
    const showUpgradeActions = this.craftMode === "upgrade";
    const showFusionActions = this.craftMode === "fusion";
    const canFuseAll = showFusionActions
      && GEM_BASE_IDS.some((baseId) => canFuseGemFamily(state.save.materials, baseId));
    const craftPreview = this.craftPreviewState();

    this.content.innerHTML = `
      <div class="alchemy-page" data-panel="alchemy">
        <div class="panel-heading compact alchemy-heading">
          ${renderCraftModeMenu(this.craftFeature)}
          ${showUpgradeActions ? this.renderAlchemyStationTrigger(state) : ""}
          ${
            showUpgradeActions
              ? `<div class="panel-actions">
                  <button class="secondary-button compact" data-action="alchemy-auto-fill">一键放入</button>
                  <button class="secondary-button compact" data-action="alchemy-clear" ${filledIds.length ? "" : "disabled"}>清空</button>
                </div>`
              : showFusionActions
                ? `<div class="panel-actions"><button class="secondary-button compact gem-fusion-all-action" data-action="craft-fuse-all-gems" ${canFuseAll ? "" : "disabled"}>全部合成</button></div>`
              : `<div class="panel-actions"></div>`
          }
        </div>
        <div class="alchemy-layout">
          <section class="alchemy-cube-panel" aria-label="工艺台">
            ${
              this.craftMode === "upgrade"
                ? this.alchemyFeature.renderUpgradePanel(state)
                : renderCraftWorkbench(state, this.craftFeature, craftPreview)
            }
          </section>
          <section class="alchemy-list-panel" aria-label="道具列表">
            ${renderCraftListHeader(this.craftFeature)}
            ${this.craftMode === "upgrade" && this.alchemyListTab === "equipment"
              ? this.alchemyFeature.renderEquipmentList(
                  state,
                  this.equipmentPopoverSource === "alchemy" ? this.alchemyPreviewId : null,
                )
              : renderCraftList(state, this.craftFeature, craftPreview)}
          </section>
        </div>
      </div>
    `;
    if (this.alchemyMaterialPreviewId) this.renderAlchemyFloatingTips(state);
    else this.alchemyTipsHost.innerHTML = "";
    const list = this.content.querySelector<HTMLElement>('[data-scroll="alchemy"]');
    if (list) bindDragScroll(list);
  }

  private renderModal(): void {
    const activitiesOpen = this.modal === "activities";
    this.overlay.classList.toggle("activities-page-host", activitiesOpen);
    this.root.querySelector(".game-shell")?.classList.toggle("activities-open", activitiesOpen);
    if (this.modal !== "loot-chest") {
      if (this.equipmentPopoverSource === "loot-chest") this.closeEquipmentPopover();
      this.stopLootChestBounceLoop();
      this.lootChestPreviewItems = [];
    }
    if (!this.modal) {
      this.renderedModal = null;
      this.overlay.innerHTML = "";
      this.overlay.classList.remove("open", "is-entering");
      return;
    }
    const isEntering = this.renderedModal !== this.modal;
    this.renderedModal = this.modal;
    this.overlay.classList.add("open");
    this.overlay.classList.toggle("is-entering", isEntering);
    if (!isEntering && this.modal === "loot-chest" && this.overlay.querySelector(".idle-chest-modal")) {
      return;
    }
    if (
      !isEntering &&
      (this.modal === "craft-result" || this.modal === "hero-growth-result") &&
      this.overlay.querySelector(".craft-result-modal")
    ) {
      return;
    }
    if (!isEntering && this.modal === "dungeon-progress" && this.overlay.querySelector(".expedition-detail-modal")) {
      this.syncDungeonProgressModal(this.store.getState());
      return;
    }
    const state = this.store.getState();
    if (this.modal === "activities") {
      const vipLevel = getAdVipBenefits(state.save.adVip.watchedAds).level;
      if (vipLevel === 6 || (this.vipViewedLevel >= 0 && this.vipViewedLevel !== vipLevel)) this.vipView = "current";
      this.vipViewedLevel = vipLevel;
      const taskKey = this.activityTab === "tasks" ? `${state.save.currentStage}:${JSON.stringify(state.save.recurringTasks)}` : String(hasTaskRewards(state.save));
      const key = `${this.activityTab}:${this.taskPeriod}:${this.vipView}:${getDateKey()}:${state.save.checkIn.claimedDays}:${state.save.checkIn.lastClaimDate}:${taskKey}:${JSON.stringify(state.save.adVip)}:${this.store.isAdPending}`;
      if (!isEntering && key === this.checkInRenderKey) return;
      this.checkInRenderKey = key;
      const previousScroll = this.overlay.querySelector(".recurring-task-list")?.scrollTop ?? 0;
      const tabScroll = this.overlay.querySelector(".activities-tabs")?.scrollLeft ?? 0;
      const active = document.activeElement instanceof HTMLElement && this.overlay.contains(document.activeElement) ? document.activeElement : null;
      const action = active?.dataset.action;
      const taskId = active?.dataset.taskId;
      const points = active?.dataset.points;
      if (!isEntering && this.activityTab === "tasks" && this.overlay.querySelector(`#task-period-${this.taskPeriod}[aria-selected="true"]`)) {
        syncRecurringTasksContent(this.overlay, state.save, this.taskPeriod);
      } else if (!isEntering && this.activityTab === "vip" && this.overlay.querySelector(".vip-scroll")) {
        syncAdVipContent(this.overlay, state.save, this.store.isAdPending, this.vipView);
      } else {
        this.overlay.innerHTML = renderActivitiesPage(state.save, this.activityTab, this.taskPeriod, compact);
        if (this.activityTab === "vip") syncAdVipContent(this.overlay, state.save, this.store.isAdPending, this.vipView);
      }
      this.overlay.querySelector('#activity-tab-vip')?.classList.toggle("has-reward", hasVipRewards(state.save));
      const signInTab = this.overlay.querySelector('#activity-tab-check-in');
      const signInLabel = signInTab?.querySelector('.activity-tab-label');
      const signIn = getCheckInStatus(state.save.checkIn);
      const signInText = signIn.firstWeek ? "7日签到" : "每日签到";
      if (signInLabel && signInLabel.textContent !== signInText) signInLabel.textContent = signInText;
      signInTab?.classList.toggle("has-reward", signIn.canClaim);
      this.overlay.querySelector('#activity-tab-tasks')?.classList.toggle("has-reward", hasTaskRewards(state.save));
      const taskContent = this.overlay.querySelector(".recurring-task-list");
      if (taskContent) taskContent.scrollTop = previousScroll;
      const tabBar = this.overlay.querySelector(".activities-tabs");
      if (tabBar) tabBar.scrollLeft = tabScroll;
      if (action === "task-claim") {
        const button = this.overlay.querySelector<HTMLElement>(taskId ? `[data-task-id="${taskId}"] button` : `[data-points="${points}"]`);
        if (button && !(button as HTMLButtonElement).disabled) button.focus({ preventScroll: true });
        else { const panel = this.overlay.querySelector<HTMLElement>(".activity-panel"); if (panel) { panel.tabIndex = -1; panel.focus({ preventScroll: true }); } }
      }
    } else if (this.modal === "alchemy-station") {
      const station = state.save.alchemyStation;
      const stationCap = getAlchemyStationLevelCap(station.level);
      const expToNext = getAlchemyExperienceToNext(station.level);
      const isMaxLevel = station.level >= ALCHEMY_STATION_MAX_LEVEL;
      const expPercent = expToNext > 0 ? Math.min(100, Math.floor((station.exp / expToNext) * 100)) : 100;
      const nextCap = isMaxLevel ? stationCap : getAlchemyStationLevelCap(station.level + 1);
      this.overlay.innerHTML = this.centerModal("炼金台", `
        <div class="alchemy-station-detail">
          <div class="alchemy-station-detail-level">
            <span>当前等级</span>
            <strong>Lv.${station.level}</strong>
          </div>
          <div class="alchemy-station-detail-stats">
            <div><span>装备合成上限</span><strong>Lv.${stationCap}</strong></div>
            <div><span>${isMaxLevel ? "等级状态" : "下一等级上限"}</span><strong>${isMaxLevel ? "已满级" : `Lv.${nextCap}`}</strong></div>
          </div>
          <div class="alchemy-station-detail-exp">
            <div><span>炼金台经验</span><strong>${isMaxLevel ? "已满级" : `${station.exp}/${expToNext}`}</strong></div>
            <div class="alchemy-station-detail-meter" role="progressbar" aria-label="炼金台经验" aria-valuemin="0" aria-valuemax="${expToNext || 1}" aria-valuenow="${expToNext ? station.exp : 1}">
              <span style="width:${expPercent}%"></span>
            </div>
          </div>
          <p>${isMaxLevel ? `炼金台已达到最高等级，当前可合成最高 Lv.${stationCap} 的装备。` : `成功炼金可获得经验；升至 Lv.${station.level + 1} 后，装备合成上限提高至 Lv.${nextCap}。`}</p>
        </div>
      `, "alchemy-station-modal");
    } else if (this.modal === "alchemy-downgrade") {
      const payload = this.modalPayload as AlchemyDowngradeRequest;
      const usesStarEnergy = payload.greaterPreview.energy > 0;
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div>
        <section class="center-sheet alchemy-downgrade-modal" role="dialog" aria-modal="true" aria-label="确认降级炼金">
          <header><h2>确认降级炼金</h2></header>
          <div class="confirm-card danger">
            <strong>Lv.${payload.sourceLevel} → Lv.${payload.resultLevel}</strong>
            <p>当前炼金台最高只能合成 Lv.${payload.resultLevel} 装备，继续后产物等级无法恢复。</p>
            ${usesStarEnergy ? `<div class="alchemy-confirm-star-chances"><span>至少1条 ${payload.greaterPreview.oneOrMoreChancePct}%</span><span>至少2条 ${payload.greaterPreview.twoOrMoreChancePct}%</span><span>3条 ${payload.greaterPreview.threeChancePct}%</span></div><p>九件装备都会被消耗；强化词条数量按上方概率判定，具体词条将重新生成。</p>` : `<p>继续后，九件装备将被消耗。</p>`}
            <div class="alchemy-confirm-actions">
              <button type="button" class="secondary-button" data-action="close-modal" autofocus>取消</button>
              <button type="button" class="danger-button" data-action="alchemy-craft-confirm">降为 Lv.${payload.resultLevel} 并炼金</button>
            </div>
          </div>
        </section>
      `;
    } else if (this.modal === "battle-details") {
      const detailsHero = this.battleDetailsHeroId
        ? HERO_BY_ID[this.battleDetailsHeroId]
        : null;
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="center-sheet battle-details-modal" data-metric="${this.battleDetailsMetric}" role="dialog" aria-modal="true" aria-label="战斗详情">
          <header>
            ${detailsHero
              ? `<button type="button" class="battle-details-back" data-action="battle-details-back" aria-label="返回角色统计">‹</button>`
              : `<span class="battle-details-live" aria-hidden="true"><i></i>本次挑战</span>`}
            <h2>${detailsHero ? "数据来源" : "战斗详情"}</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          <div class="battle-details-scope">
            <span data-battle-details-stage>第 ${this.snapshot?.stage ?? state.save.currentStage} 关</span>
            <strong data-battle-details-time>${this.formatBattleDetailsDuration(this.snapshot?.elapsedMs ?? 0)}</strong>
            <small>${detailsHero ? `${detailsHero.name} · ${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}` : "实际生效值 · 切换战斗后重置"}</small>
          </div>
          <div class="battle-details-tabs" role="tablist" aria-label="统计排序方式">
            ${BATTLE_DETAILS_METRICS.map((metric) => `<button type="button" role="tab" data-action="battle-details-metric" data-metric="${metric}" aria-selected="${metric === this.battleDetailsMetric}">${BATTLE_DETAILS_LABEL[metric]}</button>`).join("")}
          </div>
          <div class="battle-details-list${detailsHero ? " is-source-detail" : ""}" aria-live="polite">
            ${detailsHero
              ? this.renderBattleDetailsSources(this.battleDetailsHeroId!)
              : this.renderBattleDetailsRows()}
          </div>
        </section>
      `;
      this.syncBattleDetailsModal();
    } else if (this.modal === "settings") {
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
      const amount = {
        exp: state.save.exp,
        gold: state.save.gold,
        gems: state.save.gems,
      }[currencyId];
      this.overlay.innerHTML = this.centerModal(`${currency.name}详情`, `
        <div class="currency-info-card" data-currency="${currency.id}">
          <div class="currency-info-summary">
            <img class="currency-info-art" src="${currency.icon}" alt="" aria-hidden="true">
            <div class="currency-info-balance"><small>当前拥有</small><strong>${amount.toLocaleString("zh-CN")}</strong></div>
          </div>
          <section class="currency-info-source" aria-label="获取方式">
            <h3>获取方式</h3>
            <p>${currency.blurb}</p>
          </section>
        </div>
      `);
    } else if (this.modal === "loot-chest") {
      const chest = state.save.lootChest;
      const now = Date.now();
      const { difficulty, stage: dropStage } = bestIdleProgress(state.save.difficultyProgress);
      const preview = previewLootChest(
        chest,
        now,
        dropStage,
        difficulty,
        state.save.abilities,
      );
      const hourlyRates = getLootChestHourlyRates(
        dropStage,
        state.save.abilities,
        difficulty,
      );
      const boxedRewards = [...preview.items, ...state.ui.debugLootChestItems];
      this.lootChestPreviewItems = boxedRewards;
      const canOpen = state.ui.debugLootChestItems.length > 0 || canOpenLootChest(
        chest,
        now,
        (state.save.abilities.chest_progress ?? 0) * 0.005,
      );
      const resourceRows = (["gold", "exp"] as const)
        .map((currencyId) => {
          const currency = ACCOUNT_CURRENCY_BY_ID[currencyId];
          return `<div class="idle-chest-resource" data-currency="${currency.id}">
            <img src="${currency.icon}" alt="" aria-hidden="true">
            <span>
              <small>${currency.name}</small>
              <strong>+${compact(preview[currencyId])}</strong>
              <em>${compact(hourlyRates[currencyId])}/小时</em>
            </span>
          </div>`;
        })
        .join("");
      const boxedItems = boxedRewards.length
        ? boxedRewards
          .map((item, index) => {
            const tier = getEquipmentChestTier(item.rarity);
            const tierLabel = getEquipmentChestTierLabel(tier);
            return `<div class="idle-small-chest-slot" role="listitem">
              <button type="button" class="idle-small-chest" data-action="loot-chest-reveal-one" data-tier="${tier}" data-loot-index="${index}" aria-label="${tierLabel}，点击开启">
                <span class="idle-chest-flipper">
                  <span class="idle-chest-face idle-chest-box-face" aria-hidden="true"><img src="${EQUIPMENT_CHEST_IMAGE[tier]}" alt=""></span>
                </span>
              </button>
            </div>`;
          })
          .join("")
        : `<p class="idle-chest-empty">暂未获得装备宝箱</p>`;
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="loot-chest-dismiss"></div>
        <section class="item-tips-modal loot-chest-tips idle-chest-modal" role="dialog" aria-modal="true" aria-label="挂机宝箱">
          <header class="idle-chest-heading">
            <h2>挂机宝箱</h2>
          </header>
          <div class="idle-chest-resource-summary" aria-label="已累计基础收益">${resourceRows}</div>
          <section class="idle-chest-equipment-section" aria-label="待开启装备宝箱">
            <div class="idle-chest-section-heading">
              <h3>宝箱</h3>
            </div>
            <div class="idle-small-chest-grid" role="list">${boxedItems}</div>
          </section>
          <div class="idle-chest-duration" aria-label="已挂机 ${formatIdleButtonDuration(preview.accumulatedMs)}">
            <span>挂机时长</span><strong>${formatIdleButtonDuration(preview.accumulatedMs)}</strong>
          </div>
          <button type="button" class="primary-button wide idle-chest-open-all" data-action="loot-chest-claim" aria-label="${canOpen ? `已挂机 ${formatIdleButtonDuration(preview.accumulatedMs)}，点击领取并开启装备` : `已挂机 ${formatIdleButtonDuration(preview.accumulatedMs)}，满 5 分钟后可领取`}" ${canOpen ? "" : "disabled"}>领取奖励</button>
          <div class="idle-acceleration" aria-label="可选加速">
            ${(["idle-double", "idle-quick"] as const).map((placement) => {
              const doubled = placement === "idle-double";
              const daily = normalizeProgressionDaily(state.save.progressionDaily, now);
              const remaining = doubled ? DOUBLE_CLAIMS_PER_DAY - daily.doubleClaims : QUICK_REWARDS_PER_DAY - daily.quickRewards;
              const label = doubled ? "领取翻倍" : `快速收益 ${QUICK_REWARD_HOURS} 小时`;
              const disabled = this.store.isAdPending || remaining <= 0 || (doubled && !canOpen);
              return `<div class="idle-acceleration-row"><span><strong>${label}</strong><small data-remaining>今日剩余 ${remaining} 次</small></span><button type="button" class="secondary-button" data-action="idle-accelerate" data-placement="${placement}" aria-label="看广告${label}" ${disabled ? "disabled" : ""}>看广告</button>${state.save.adTickets > 0 ? `<button type="button" class="secondary-button" data-action="idle-accelerate" data-placement="${placement}" data-ticket="true" aria-label="消耗一张广告券${label}" ${disabled ? "disabled" : ""}>用券</button>` : ""}</div>`;
            }).join("")}
          </div>
        </section>

      `;
      this.startLootChestBounceLoop();
    } else if (this.modal === "ability-tips") {
      this.renderAbilityTips(state);
    } else if (this.modal === "material-tips") {
      this.renderMaterialTips(state);
    } else if (this.modal === "reset-affix-tips") {
      this.renderResetAffixTips(state);
    } else if (this.modal === "smelt-affix-tips") {
      this.renderSmeltAffixTips(state);
    } else if (this.modal === "set-imprint-picker") {
      const markup = renderSetImprintPickerModal(
        state,
        this.modalPayload as SetImprintPickerPayload | null,
      );
      if (!markup) {
        this.closeModal();
        return;
      }
      this.overlay.innerHTML = markup;
    } else if (this.modal === "gem-return") {
      const item = this.pendingGemReturnItemId
        ? state.save.inventory.find(({ instanceId }) => instanceId === this.pendingGemReturnItemId) ?? null
        : null;
      const gemCount = item?.sockets?.filter((socket) => Boolean(socket.gemId)).length ?? 0;
      if (!item || gemCount <= 0) {
        this.pendingGemReturnItemId = null;
        this.modalPayload = null;
        this.modal = "equip";
        this.syncEquipModal(state);
        return;
      }
      const definition = ITEM_BY_ID[item.definitionId];
      const itemName = definition?.name ?? "旧装备";
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-gem-return"></div>
        <section class="center-sheet gem-return-modal" role="dialog" aria-modal="true" aria-labelledby="gem-return-title" aria-describedby="gem-return-copy">
          <header><h2 id="gem-return-title">旧装备仍镶有宝石</h2><button type="button" class="modal-close" data-action="close-gem-return" aria-label="保留宝石并关闭">×</button></header>
          <div class="confirm-card">
            <p id="gem-return-copy">是否将「${itemName}」上的 ${gemCount} 颗宝石卸回材料背包？新装备不会自动继承。</p>
            <div class="gem-return-actions">
              <button type="button" class="secondary-button" data-action="close-gem-return" autofocus>保留在旧装备</button>
              <button type="button" class="primary-button" data-action="equip-gems-remove">全部卸下</button>
            </div>
          </div>
        </section>
      `;
    } else if (this.modal === "craft-result") {
      this.renderCraftResultModal(state);
    } else if (this.modal === "hero-growth-result") {
      this.renderHeroGrowthResultModal(state);
    } else if (this.modal === "equip") {
      this.syncEquipModal(state);
    } else if (this.modal === "salvage") {
      this.renderSalvageModal(state);
    } else if (this.modal === "dungeon-progress") {
      this.renderDungeonProgressModal(state);
    } else if (this.modal === "dungeon-confirm") {
      if (this.overlay.querySelector(".dispatch-modal")) {
        this.syncDispatchSelection();
        return;
      }
      const dungeonId = String(this.modalPayload) as DungeonId;
      const dungeon = DUNGEON_BY_ID[dungeonId];
      const dateKey = state.save.shop.dateKey || getDateKey();
      const requirements = getExpeditionRequirements(dungeon.id, dateKey);
      const busy = getBusyHeroIds(state.save.dungeonRuns);
      const exploring = getExploringHeroIds(state.save.party);
      const drops = dungeon.drops
        .map((drop) => {
          const material = MATERIAL_BY_ID[drop.materialId];
          const amount = drop.bonusChance > 0 ? `${drop.amount}–${drop.amount + 1}` : `${drop.amount}`;
          const popoverId = `dispatch-reward-${drop.materialId}`;
          return `<span class="dispatch-reward-control">
            <button type="button" class="dispatch-reward-icon" data-action="dispatch-reward-tips" aria-label="查看${material.name}" aria-expanded="false" aria-controls="${popoverId}">
              <img src="${material.icon}" alt="" aria-hidden="true" draggable="false" />
            </button>
            <span class="dispatch-reward-popover" id="${popoverId}" role="note" hidden><strong>${material.name}</strong><small>预计获得 ×${amount}</small></span>
          </span>`;
        })
        .join("");
      const selected = this.dispatchDraft.length;
      const requirementProgress = getExpeditionRequirementProgress(dungeon, dateKey, this.dispatchDraft);
      const failedRequirement = requirementProgress.find((progress) => !progress.satisfied);
      const ready = selected === dungeon.partySize && !failedRequirement;
      const fusionStamina = calculateExpeditionStamina(state.save, dungeon, this.dispatchDraft);
      const estimatedDuration = formatExpeditionDuration(estimateExpeditionDurationMs(fusionStamina));
      const environmentElements = dungeon.environment.favoredElements
        .map((element) => DAMAGE_ELEMENT_LABEL[element])
        .join("/");
      const environmentBonus = Math.round(dungeon.environment.staminaBonusPct * 100);
      const requirementRows = `<div class="dispatch-summary-section dispatch-condition-section">
          <span class="dispatch-summary-label">派遣条件</span>
          ${requirementProgress.length > 0
            ? `<div class="dispatch-requirement-list" aria-label="今日派遣条件">
                ${requirementProgress.map((progress) => `<span class="dispatch-requirement ${progress.satisfied ? "complete" : "pending"}" data-requirement-id="${progress.requirement.id}"><b>${progress.requirement.label}</b><small data-requirement-progress>${progress.matched}/${progress.required}</small></span>`).join("")}
              </div>`
            : `<strong class="dispatch-no-requirement">无额外限制</strong>`}
        </div>`;
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="center-sheet dispatch-modal" role="dialog" aria-modal="true" aria-label="远征派遣">
          <header>
            <h2>远征派遣</h2>
            <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          <div class="dispatch-summary">
            <div class="dispatch-mission-head">
              <strong>${dungeon.name}</strong>
              <span>${dungeon.environment.label}</span>
            </div>
            <div class="expedition-summary-meta" aria-label="远征概要">
              <span><small>队伍</small><b>${dungeon.partySize} 人</b></span>
              <span><small>事件体力</small><b>战斗消耗较高 · 休整可恢复</b></span>
              <span><small>环境适配</small><b>${environmentElements} +${environmentBonus}%</b></span>
            </div>
            <div class="expedition-stamina-preview">
              <span>队伍体力</span>
              <strong data-expedition-stamina>${fusionStamina}</strong>
              <small data-expedition-capacity>${ready ? `约可探索 ${estimatedDuration}` : selected < dungeon.partySize ? `还需选择 ${dungeon.partySize - selected} 名英雄` : `未满足：${failedRequirement?.requirement.label ?? "今日派遣条件"}`}</small>
            </div>
            ${requirementRows}
            <div class="dispatch-summary-section dispatch-loot-section">
              <span class="dispatch-summary-label">远征收获</span>
              <div class="expedition-summary-drops">${drops}</div>
            </div>
          </div>
          <div class="dispatch-picker-heading"><strong>选择英雄</strong><small>选择 ${dungeon.partySize} 名</small></div>
          <div class="hero-card-grid dispatch-picker" role="list" aria-label="选择派遣英雄">
            ${HERO_DEFINITIONS.filter((hero) => state.save.roster[hero.id].unlocked).map((hero) => {
              const heroProgress = state.save.roster[hero.id];
              const occupied = busy.has(hero.id);
              const onMainline = exploring.has(hero.id);
              const restrictedBy = requirements.find((requirement) => requirement.count === "all" && !heroMatchesExpeditionRequirement(hero.id, requirement));
              const blocked = occupied || onMainline || Boolean(restrictedBy);
              const picked = this.dispatchDraft.includes(hero.id);
              const portrait = ASSET_MANIFEST.characters[hero.id];
              const roleClass = `role-${hero.role}`;
              const ascendLevel = heroProgress.ascendLevel ?? 0;
              const ascendClass = ascendLevel > 0 ? `ascended ascend-${ascendLevel}` : "";
              const ascendCrest = renderAscendCrest(ascendLevel, `dispatch-${hero.id}`);
              const environmentFavored = dungeon.environment.favoredElements.includes(hero.damageElement);
              const action = occupied
                ? "dispatch-busy"
                : onMainline
                  ? ""
                  : restrictedBy
                    ? ""
                    : "dispatch-pick";
              const status = occupied
                ? "远征中"
                : onMainline
                  ? "主线中"
                  : restrictedBy
                    ? "不符合条件"
                    : ascendLevel > 0
                      ? `进阶${ascendLevel}`
                      : `Lv.${heroProgress.level}`;
              const label = `${hero.name} ${hero.className} ${hero.specName} Lv.${heroProgress.level}${ascendLevel > 0 ? ` 进阶${ascendLevel}` : ""}${occupied ? " 远征中" : onMainline ? " 主线中" : restrictedBy ? ` 不符合${restrictedBy.label}` : ""}${environmentFavored ? ` 环境适配体力增加${environmentBonus}%` : ""}`;
              return `<button class="hero-card hero-roster-card ${roleClass} ${ascendClass} ${picked ? "selected" : ""} ${occupied ? "busy" : ""} ${onMainline ? "mainline" : ""} ${restrictedBy ? "restricted" : ""}" ${action ? `data-action="${action}"` : ""} data-hero-id="${hero.id}" role="listitem" aria-label="${label}" aria-pressed="${picked ? "true" : "false"}" style="--role-color:${hero.color}" ${blocked ? "disabled" : ""}>
                ${ascendCrest}
                <div class="hero-card-art" style="--hero-color:${hero.color}">
                  <img src="${portrait}" alt="" draggable="false" />
                  ${environmentFavored ? `<span class="dispatch-affinity-badge">环境 +${environmentBonus}%</span>` : ""}
                </div>
                <strong class="hero-card-name">${hero.name}</strong>
                <span class="hero-card-meta">
                  <span class="hero-card-role">${hero.specName}</span>
                  <span class="hero-card-level">${status}</span>
                </span>
              </button>`;
            }).join("")}
          </div>
          <footer class="dispatch-footer">
            <button type="button" class="secondary-button dispatch-auto-select" data-action="dispatch-auto-select">自动选择</button>
            <button class="primary-button wide" data-action="dungeon-dispatch" data-dungeon-id="${dungeon.id}" ${ready ? "" : "disabled"}>派遣 · ${selected}/${dungeon.partySize}</button>
          </footer>
        </section>
      `;
    } else if (this.modal === "summon") {
      const results = this.summonResults;
      const pendingResults = this.summonPendingResults;
      const hasResults = Boolean(results?.length);
      const isRevealing = Boolean(pendingResults?.length && this.summonRevealPhase);
      const omenPull = pendingResults?.find((pull) => pull.kind === "unlock")
        ?? pendingResults?.find((pull) => pull.kind === "marks")
        ?? pendingResults?.[0]
        ?? null;
      const omenIsHero = omenPull?.kind === "unlock" || omenPull?.kind === "marks";
      const omenHero = omenIsHero ? HERO_BY_ID[omenPull.heroId] : null;
      const omenPortrait = omenHero ? ASSET_MANIFEST.characters[omenHero.id] : "";
      const omenLabel = omenPull?.kind === "unlock"
        ? "新的英雄气息"
        : omenPull?.kind === "marks"
          ? "英雄共鸣"
          : "星辉凝成奖励";
      const unlockedCount = results?.filter((pull) => pull.kind === "unlock").length ?? 0;
      const marksCount = results?.reduce(
        (sum, pull) => sum + (pull.kind === "marks" ? pull.marks : 0),
        0,
      ) ?? 0;
      const heroCount = results?.filter((pull) => pull.kind === "unlock" || pull.kind === "marks").length ?? 0;
      const resourceCount = (results?.length ?? 0) - heroCount;
      const activeTheme = getActiveSummonTheme(state.save.personalSummonTheme);
      const globalTheme = getGlobalSummonTheme();
      const personalThemeActive = activeTheme.source === "personal";
      const activeThemeHeroes = RELEASED_HERO_DEFINITIONS.filter(
        (hero) => hero.classId === activeTheme.classId,
      );
      const themeRemainingHours = Math.max(1, Math.ceil((activeTheme.expiresAt - Date.now()) / 3_600_000));
      const themeRemaining = themeRemainingHours > 24
        ? `${Math.ceil(themeRemainingHours / 24)} 天`
        : `${themeRemainingHours} 小时`;
      const title = isRevealing
        ? this.summonRevealPhase === "omen" ? "命运显形" : "星辉汇聚"
        : !hasResults
          ? "英雄召唤"
        : unlockedCount === results!.length
          ? "新英雄加入"
          : "召唤结果";
      const subtitle = isRevealing ? "召唤仪式" : hasResults ? "星辉回应" : "星辉之门";
      const modalState = isRevealing
        ? `is-revealing is-${this.summonRevealPhase}`
        : hasResults
          ? "has-results"
          : "is-ready";
      this.overlay.innerHTML = `
        <div class="modal-backdrop"></div><section class="full-modal summon-modal ${modalState} ${this.summonSubview ? "has-subview" : ""}" ${this.summonSubview ? 'aria-hidden="true" inert' : `role="dialog" aria-modal="true" aria-label="${title}"`}>
          <div class="summon-atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <button type="button" class="modal-close summon-back-button" data-action="close-modal" aria-label="返回"><span aria-hidden="true">‹</span><b>返回</b></button>
          ${isRevealing ? "" : `<button type="button" class="summon-track-entry" data-action="summon-track-open" aria-label="打开定轨召唤">
              <span aria-hidden="true">◎</span><b>定轨召唤</b>
            </button>
            <button type="button" class="summon-probability-entry" data-action="summon-probability-open" aria-label="查看召唤概率">
              <span aria-hidden="true">%</span><b>召唤概率</b>
            </button>`}
          <header class="summon-heading">
            <small>${subtitle}</small>
            <h2>${title}</h2>
            <span class="summon-title-ornament" aria-hidden="true"><i></i></span>
          </header>
          <div class="summon-body ${isRevealing ? "is-revealing" : hasResults ? "has-results" : "is-ready"}">
            ${
              isRevealing
                ? `<div class="summon-ritual">
                    <div class="summon-ritual-stage" aria-hidden="true">
                      <div class="summon-energy-streams"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                      <div class="summon-portal">
                        <span class="summon-portal-orbit"></span>
                        <span class="summon-portal-star">✦</span>
                        <i></i><i></i><i></i><i></i>
                      </div>
                      <span class="summon-ritual-burst"></span>
                      <div class="summon-omen ${omenPull?.kind === "unlock" ? "is-new" : ""} ${omenHero ? "" : "is-resource"}" style="--hero-color:${omenHero?.color ?? "#7797b5"}">
                        ${omenHero
                          ? `<div class="summon-omen-portrait"><img src="${omenPortrait}" alt="" draggable="false" /></div><span>${omenHero.className} · ${omenHero.specName}</span>`
                          : `<div class="summon-omen-portrait summon-omen-resource" aria-hidden="true">✦</div><span>成长奖励</span>`}
                      </div>
                    </div>
                    <div class="summon-ritual-status" role="status" aria-live="polite">
                      <strong>${this.summonRevealPhase === "omen" ? omenLabel : "星辉正在回应"}</strong>
                      <span>${this.summonRevealPhase === "omen" ? "命运即将揭晓" : "召唤仪式进行中"}</span>
                    </div>
                    <button type="button" class="summon-skip-button" data-action="summon-reveal-skip">跳过动画</button>
                  </div>`
                : hasResults
                ? `${results!.length > 1 ? `<div class="summon-result-summary" aria-label="英雄奖励 ${heroCount}，其他奖励 ${resourceCount}">
                    ${unlockedCount > 0 ? `<span class="unlock"><small>新英雄</small><strong>${unlockedCount}</strong></span>` : ""}
                    ${marksCount > 0 ? `<span class="marks"><small>专属碎片</small><strong>+${marksCount}</strong></span>` : ""}
                    ${resourceCount > 0 ? `<span class="resources"><small>成长奖励</small><strong>${resourceCount}</strong></span>` : ""}
                  </div>` : ""}
                  <div class="summon-result-grid count-${results!.length}" aria-label="召唤获得">
                  ${results!
                    .map((pull, index) => {
                      if (pull.kind === "unlock" || pull.kind === "marks") {
                        const hero = HERO_BY_ID[pull.heroId];
                        const portrait = ASSET_MANIFEST.characters[pull.heroId];
                        const badge = pull.kind === "unlock" ? "新英雄" : "+1 专属碎片";
                        const resultLabel = pull.kind === "unlock"
                          ? `${hero.name}，新英雄`
                          : `${hero.name}，已转化为 1 个专属碎片`;
                        return `<article class="summon-result ${pull.kind}" style="--hero-color:${hero.color}; --reveal-delay:${index * 60}ms" aria-label="${resultLabel}">
                          <div class="summon-result-art">
                            <img src="${portrait}" alt="" draggable="false" />
                            ${pull.kind === "marks" ? `<span class="summon-duplicate-mask" aria-hidden="true">已转化为碎片</span>` : ""}
                          </div>
                          <h3>${hero.name}</h3>
                          <small class="summon-result-identity"><span class="summon-result-class">${hero.className}</span><span class="summon-result-spec">${hero.specName}</span></small>
                          <strong>${badge}</strong>
                        </article>`;
                      }
                      const reward = pull.kind === "universalMarks"
                        ? { name: "通用英雄碎片", detail: "任意英雄升星可用", icon: "", glyph: "✦", color: "#ba8ed3" }
                        : pull.kind === "ascendStone"
                          ? { name: "进阶石", detail: "英雄进阶材料", icon: MATERIAL_BY_ID.mat_ascend_stone.icon, glyph: "", color: "#76b9b0" }
                          : pull.kind === "exp"
                            ? { name: "英雄经验", detail: "用于英雄升级", icon: ACCOUNT_CURRENCY_BY_ID.exp.icon, glyph: "", color: "#75aeca" }
                            : { name: "金币", detail: "通用养成货币", icon: ACCOUNT_CURRENCY_BY_ID.gold.icon, glyph: "", color: "#d1aa54" };
                      return `<article class="summon-result summon-resource ${pull.kind}" style="--hero-color:${reward.color}; --reveal-delay:${index * 60}ms" aria-label="${reward.name} ${pull.amount}">
                        <div class="summon-result-art summon-resource-art">${reward.icon ? `<img src="${reward.icon}" alt="" draggable="false" />` : `<span aria-hidden="true">${reward.glyph}</span>`}</div>
                        <h3>${reward.name}</h3>
                        <small class="summon-result-identity"><span>${reward.detail}</span></small>
                        <strong>+${compact(pull.amount)}</strong>
                      </article>`;
                    })
                    .join("")}
                </div>`
                : `<div class="summon-portal" aria-hidden="true">
                    <span class="summon-portal-orbit"></span>
                    <span class="summon-portal-star">✦</span>
                    <i></i><i></i><i></i><i></i>
                  </div>
                  <section class="summon-current-theme ${personalThemeActive ? "is-personal" : ""}" aria-label="${personalThemeActive ? "选择定轨" : "本期召唤主题"} ${SUMMON_CLASS_LABELS[activeTheme.classId]}，剩余 ${themeRemaining}" style="--theme-color:${activeThemeHeroes[0]?.color ?? "#6988a5"}">
                    <span class="summon-current-theme-portraits" aria-hidden="true">
                      ${activeThemeHeroes.slice(0, 4).map((hero) => {
                        const owned = state.save.roster[hero.id]?.unlocked;
                        return `<span class="${owned ? "is-owned" : "is-locked"}" style="--hero-color:${hero.color}"><img src="${ASSET_MANIFEST.characters[hero.id]}" alt="" draggable="false"></span>`;
                      }).join("")}
                    </span>
                    <span class="summon-current-theme-copy">
                      <small>${personalThemeActive ? "选择定轨" : "本期主题"}</small>
                      <strong>${SUMMON_CLASS_LABELS[activeTheme.classId]}</strong>
                      <span>剩余 ${themeRemaining}</span>
                    </span>
                    ${personalThemeActive ? `<button type="button" class="summon-theme-reset" data-action="summon-theme-reset-request">重置</button>` : ""}
                  </section>`
            }
          </div>
          ${isRevealing ? "" : `<div class="summon-command">
              <div class="summon-balance" aria-label="当前星石 ${state.save.gems.toLocaleString("zh-CN")}">
                <span>当前星石</span>
                <strong><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="" aria-hidden="true">${state.save.gems.toLocaleString("zh-CN")}</strong>
              </div>
              <div class="summon-actions">
                <button class="summon-action summon-action-single" data-action="summon-single" ${state.save.gems < SUMMON_SINGLE_COST ? "disabled" : ""}><span>召唤 1 次</span><small><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="" aria-hidden="true">${SUMMON_SINGLE_COST}</small></button>
                <button class="summon-action summon-action-five" data-action="summon-five" ${state.save.gems < SUMMON_FIVE_COST ? "disabled" : ""}><span>召唤 5 次</span><small><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="" aria-hidden="true">${SUMMON_FIVE_COST}</small></button>
              </div>
            </div>`}
        </section>
      `;
      if (this.summonSubview === "track") {
        const selectedClassId = this.summonThemeDraft ?? activeTheme.classId;
        const personalThemeActive = Boolean(
          state.save.personalSummonTheme && state.save.personalSummonTheme.expiresAt > Date.now(),
        );
        const selectedAlreadyActive = personalThemeActive
          && state.save.personalSummonTheme?.classId === selectedClassId;
        const canConfirm = !selectedAlreadyActive && state.save.gems >= SUMMON_THEME_SELECTION_COST;
        this.overlay.insertAdjacentHTML("beforeend", `
          <div class="modal-backdrop summon-subview-backdrop" data-action="summon-track-back"></div>
          <section class="center-sheet summon-track-modal summon-subview-modal" role="dialog" aria-modal="true" aria-labelledby="summon-track-title">
            <header class="summon-track-header">
              <span class="summon-track-emblem" aria-hidden="true">◎</span>
              <div><small>职业主题定轨</small><h2 id="summon-track-title">定轨召唤</h2></div>
              <span class="summon-track-wallet" aria-label="当前星石 ${state.save.gems.toLocaleString("zh-CN")}"><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="" aria-hidden="true">${compact(state.save.gems)}</span>
            </header>
            <div class="summon-track-copy">
              <strong>选择想要的职业主题</strong>
              <span>定轨后持续 3 天，英雄结果中该职业出现率提升至 60%</span>
            </div>
            <div class="summon-track-list" role="listbox" aria-label="选择职业主题">
              ${SUMMON_THEME_CLASS_IDS.map((classId) => {
                const heroes = RELEASED_HERO_DEFINITIONS.filter((hero) => hero.classId === classId);
                const selected = selectedClassId === classId;
                const active = activeTheme.classId === classId;
                const specs = heroes.map((hero) => hero.specName).join(" · ");
                return `<button type="button" class="summon-track-card ${selected ? "selected" : ""}" data-action="summon-track-theme" data-class-id="${classId}" role="option" aria-selected="${selected}" aria-label="${SUMMON_CLASS_LABELS[classId]}，${specs}" style="--track-color:${heroes[0]?.color ?? "#6988a5"}">
                  <span class="summon-track-portraits" aria-hidden="true">
                    ${heroes.slice(0, 4).map((hero) => {
                      const owned = state.save.roster[hero.id]?.unlocked;
                      return `<span class="${owned ? "is-owned" : "is-locked"}" style="--hero-color:${hero.color}"><img src="${ASSET_MANIFEST.characters[hero.id]}" alt="" draggable="false"></span>`;
                    }).join("")}
                  </span>
                  <span class="summon-track-card-copy"><strong>${SUMMON_CLASS_LABELS[classId]}</strong><small>${specs}</small></span>
                  ${active ? `<span class="summon-track-active">当前</span>` : ""}
                  <span class="summon-track-check" aria-hidden="true">${selected ? "✓" : ""}</span>
                </button>`;
              }).join("")}
            </div>
            <footer class="summon-track-actions">
              <button type="button" class="secondary-button" data-action="summon-track-back">取消</button>
              <button type="button" class="primary-button" data-action="summon-theme-confirm" ${canConfirm ? "" : "disabled"}>
                <span>${selectedAlreadyActive ? "当前定轨已生效" : "确认定轨"}</span>
                <small ${selectedAlreadyActive ? "hidden" : ""}><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="" aria-hidden="true">${SUMMON_THEME_SELECTION_COST}</small>
              </button>
            </footer>
            ${state.save.gems < SUMMON_THEME_SELECTION_COST ? `<p class="summon-track-error">星石不足，定轨需要 ${SUMMON_THEME_SELECTION_COST} 星石</p>` : ""}
          </section>`);
      } else if (this.summonSubview === "probability") {
        const probabilityPanel = this.summonProbabilityTab === "pool"
          ? `<section class="summon-probability-group" role="tabpanel" aria-labelledby="summon-probability-tab-pool">
              <h3><span>01</span>基础奖池</h3>
              <div class="summon-probability-table" role="table" aria-label="基础奖池概率">
                <div role="row"><span class="summon-probability-icon hero" aria-hidden="true">✦</span><strong role="cell">英雄</strong><code role="cell">40%</code></div>
                <div role="row"><span class="summon-probability-icon marks" aria-hidden="true">◆</span><strong role="cell">通用英雄碎片 ×1</strong><code role="cell">25%</code></div>
                <div role="row"><span class="summon-probability-icon asset" aria-hidden="true"><img src="${ACCOUNT_CURRENCY_BY_ID.exp.icon}" alt=""></span><strong role="cell">英雄经验</strong><code role="cell">15%</code></div>
                <div role="row"><span class="summon-probability-icon asset" aria-hidden="true"><img src="${MATERIAL_BY_ID.mat_ascend_stone.icon}" alt=""></span><strong role="cell">进阶石</strong><code role="cell">10%</code></div>
                <div role="row"><span class="summon-probability-icon asset" aria-hidden="true"><img src="${ACCOUNT_CURRENCY_BY_ID.gold.icon}" alt=""></span><strong role="cell">金币</strong><code role="cell">10%</code></div>
                <div class="summon-probability-total" role="row"><span></span><strong role="cell">合计</strong><code role="cell">100%</code></div>
              </div>
            </section>`
          : this.summonProbabilityTab === "theme"
            ? `<section class="summon-probability-group" role="tabpanel" aria-labelledby="summon-probability-tab-theme">
                <h3><span>02</span>主题概率</h3>
                <div class="summon-formula-list">
                  <div><span>本期主题职业英雄</span><strong><b>40%</b><i>×</i><b>60%</b><i>=</i><em>24%</em></strong><small>单次召唤获得任意本期主题职业英雄的基础概率</small></div>
                  <div><span>其他职业英雄</span><strong><b>40%</b><i>×</i><b>40%</b><i>=</i><em>16%</em></strong><small>单次召唤获得任意非主题职业英雄的基础概率</small></div>
                  <div><span>未解锁英雄权重</span><strong><b>已解锁英雄</b><i>×</i><em>2</em></strong><small>同一职业范围内，未解锁英雄更容易出现</small></div>
                </div>
              </section>`
            : `<section class="summon-probability-group" role="tabpanel" aria-labelledby="summon-probability-tab-guarantee">
                <h3><span>03</span>保底规则</h3>
                <div class="summon-guarantee-list">
                  <div><strong>五连保底</strong><span>每次召唤 5 次，至少获得 1 次英雄结果</span></div>
                  <div><strong>主题保底</strong><span>连续 10 抽未获得主题职业英雄，第 10 抽必定获得主题职业英雄</span></div>
                  <div><strong>重复转化</strong><span>重复英雄转化为该英雄专属碎片 ×1</span></div>
                </div>
              </section>`;
        this.overlay.insertAdjacentHTML("beforeend", `
          <div class="modal-backdrop summon-subview-backdrop" data-action="summon-probability-back"></div>
          <section class="center-sheet summon-probability-modal summon-subview-modal" role="dialog" aria-modal="true" aria-labelledby="summon-probability-title">
            <header class="summon-probability-header">
              <span class="summon-probability-emblem" aria-hidden="true">%</span>
              <div><small>星辉之门规则</small><h2 id="summon-probability-title">召唤概率</h2></div>
              <button type="button" class="modal-close" data-action="summon-probability-back" aria-label="关闭">×</button>
            </header>
            <div class="summon-probability-tabs" role="tablist" aria-label="概率规则分类">
              ${(["pool", "theme", "guarantee"] as const).map((tab) => {
                const labels = { pool: "基础奖池", theme: "主题概率", guarantee: "保底规则" };
                const selected = this.summonProbabilityTab === tab;
                return `<button type="button" id="summon-probability-tab-${tab}" class="${selected ? "selected" : ""}" data-action="summon-probability-tab" data-tab="${tab}" role="tab" aria-selected="${selected}">${labels[tab]}</button>`;
              }).join("")}
            </div>
            <div class="summon-probability-content">${probabilityPanel}</div>
          </section>`);
      } else if (this.summonSubview === "reset") {
        this.overlay.insertAdjacentHTML("beforeend", `
          <div class="modal-backdrop summon-subview-backdrop"></div>
          <section class="center-sheet summon-theme-reset-modal summon-subview-modal" role="dialog" aria-modal="true" aria-labelledby="summon-theme-reset-title">
            <span class="summon-theme-reset-emblem" aria-hidden="true">↺</span>
            <h2 id="summon-theme-reset-title">重置定轨</h2>
            <p>将取消当前定轨，并恢复本期主题“${SUMMON_CLASS_LABELS[globalTheme.classId]}”。</p>
            <small>本次重置不消耗星石</small>
            <footer>
              <button type="button" class="secondary-button" data-action="summon-theme-reset-cancel" autofocus>取消</button>
              <button type="button" class="primary-button" data-action="summon-theme-reset-confirm">重置定轨</button>
            </footer>
          </section>`);
      }
    } else if (this.modal === "chapter-drops") {
      const payload = this.modalPayload as { chapter: EquipmentChapter; difficulty: GameDifficulty };
      this.overlay.innerHTML = this.chapterDropsModal(payload.chapter, payload.difficulty);
    } else if (this.modal === "chapter-gifts") {
      const chapter = this.modalPayload as EquipmentChapter;
      const stages = STAGE_DEFINITIONS.filter((stage) => stage.chapter === chapter);
      const claimedStages = new Set(state.save.claimedStageGiftStages);
      const clearedCount = stages.filter((stage) => stage.stage <= state.save.highestClearedStage).length;
      const claimedCount = stages.filter((stage) => claimedStages.has(stage.stage)).length;
      const rewards = [{
        name: ACCOUNT_CURRENCY_BY_ID.gems.name,
        icon: ACCOUNT_CURRENCY_BY_ID.gems.icon,
        amount: STAGE_GIFT_STARSTONE_REWARD,
      }];
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="center-sheet chapter-gifts-modal" role="dialog" aria-modal="true" aria-label="第${chapterNumeral[chapter]}章关卡礼包">
          <header>
            <h2>第${chapterNumeral[chapter]}章关卡礼包</h2>
            <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
          </header>
          <div class="chapter-gifts-summary">
            <span><small>通关进度</small><strong>${clearedCount}/${stages.length}</strong></span>
            <span><small>已领取</small><strong>${claimedCount}/${stages.length}</strong></span>
          </div>
          <div class="chapter-gift-grid" role="list" aria-label="关卡礼包列表">
            ${stages.map((stage) => {
              const claimed = claimedStages.has(stage.stage);
              const cleared = stage.stage <= state.save.highestClearedStage;
              const status = claimed ? "已领取" : cleared ? "可领取" : "未通关";
              const content = `
                <span class="stage-gift-stage"><small>${stage.id}</small><strong>${stage.name}</strong></span>
                <span class="stage-gift-contents">
                  <span class="stage-gift-box" aria-hidden="true">${STAGE_GIFT_ICON}</span>
                  <span class="stage-gift-reward-list" aria-label="礼包奖励">
                    ${rewards.map((reward) => `<span class="stage-gift-reward"><img src="${reward.icon}" alt="" aria-hidden="true"><b>×${reward.amount}</b><span class="sr-only">${reward.name}</span></span>`).join("")}
                  </span>
                </span>`;
              return cleared && !claimed
                ? `<button type="button" class="stage-gift-card claimable" data-action="stage-gift-claim" data-stage="${stage.stage}" role="listitem" aria-label="领取${stage.id}${stage.name}礼包，${STAGE_GIFT_STARSTONE_REWARD}星石">${content}</button>`
                : `<div class="stage-gift-card ${claimed ? "claimed" : "locked"}" role="listitem" aria-label="${stage.id}关卡礼包，${status}">${content}</div>`;
            }).join("")}
          </div>
        </section>`;
    } else if (this.modal === "stage-confirm") {
      const payload = this.modalPayload as { stage: number; difficulty: GameDifficulty };
      const stage = payload.stage;
      const definition = STAGE_DEFINITIONS[stage - 1]!;
      const difficulty = DIFFICULTY_BY_ID[payload.difficulty];
      this.overlay.innerHTML = this.centerModal("确认挑战", `<div class="confirm-card difficulty-confirm-card">
        <div class="difficulty-stage-heading"><strong>${definition.id} · ${definition.name}</strong><small>${DAMAGE_ELEMENT_LABEL[chapterThemeElement(definition.chapter)]}伤害为主</small></div>
        <div class="difficulty-stage-summary">
          <strong>${difficulty.label}</strong>
          <span>${difficulty.mechanic}</span>
          <small>金币经验 ×${difficulty.currencyMultiplier} · 装备率 ×${difficulty.equipmentDropMultiplier} · 品质随全局进度提升</small>
        </div>
        <p class="difficulty-loot-note">本章掉落 Lv.${equipmentLevelForDifficulty(stage, payload.difficulty)} 装备；套装标识基础概率 ${Math.round(difficulty.setMarkChance * 100)}%。${payload.difficulty === "hell" ? "传奇及以上装备有机会出现 1～2 条强化词条。" : payload.difficulty === "torment" ? "传奇及以上装备有机会出现 1～3 条强化词条，章节首领首次通关至少 1 条。" : "强化词条从地狱难度开始出现。"}</p>
        <button class="primary-button wide" data-action="stage-confirm" data-stage="${stage}" data-difficulty="${payload.difficulty}" autofocus>开始挑战 · ${difficulty.label}</button>
      </div>`, "difficulty-modal");
    } else if (this.modal === "clear-confirm") {
      this.overlay.innerHTML = this.centerModal("确认清除存档？", `<div class="confirm-card danger"><p>英雄、装备、货币和关卡进度都会回到初始状态。此操作无法撤销。</p><button class="danger-button wide" data-action="clear-confirm">确认清除</button></div>`);
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
      const reward = this.modalPayload as { minutes: number; gold: number; exp: number; gearCount: number; credited?: boolean };
      this.overlay.innerHTML = `
        <div class="modal-backdrop" data-action="close-modal"></div>
        <section class="reward-modal offline-reward-modal" role="dialog" aria-modal="true" aria-label="离线收益">
          <span class="reward-sun">☀</span>
          <small>欢迎归队</small>
          <h2>离线收益</h2>
          <p>小队巡逻了 ${reward.minutes} 分钟</p>
          <div class="reward-row reward-row-exp">
            <div><span class="reward-currency-icon">${currencyIconMarkup("exp", "reward-currency-art")}</span><strong>${compact(reward.exp)}</strong><small>经验</small></div>
            <div><span class="reward-currency-icon">${currencyIconMarkup("gold", "reward-currency-art")}</span><strong>${compact(reward.gold)}</strong><small>金币</small></div>
            <div><span>🎒</span><strong>${reward.gearCount}</strong><small>装备</small></div>
          </div>
          ${reward.credited ? "<p>收益已到账，装备已放入背包</p>" : ""}
          <button class="primary-button wide" data-action="offline-claim">${reward.credited ? "收下" : "一键领取"}</button>
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
    this.syncModalFocus();
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
    const nextMeta = meta.atMax ? null : abilityCardMeta(definition.id, level + 1);
    const upgradeFeedback = this.abilityUpgradeFeedback?.abilityId === definition.id
      ? this.abilityUpgradeFeedback
      : null;
    const previousMeta = upgradeFeedback
      ? abilityCardMeta(definition.id, upgradeFeedback.previousLevel)
      : null;
    const canBuy = !meta.atMax && meta.nextCost != null && state.save.gold >= meta.nextCost;
    const categoryLabel = ABILITY_CATEGORY_TABS.find((tab) => tab.id === definition.category)?.label ?? "成长";
    const currentEffect = meta.effectText.replace(/^当前\s*/, "");
    const previousEffect = previousMeta?.effectText.replace(/^当前\s*/, "") ?? currentEffect;
    const nextEffect = nextMeta?.effectText.replace(/^当前\s*/, "") ?? currentEffect;
    const progress = Math.min(100, Math.max(0, (level / definition.maxLevel) * 100));
    const previousProgress = upgradeFeedback
      ? Math.min(100, Math.max(0, (upgradeFeedback.previousLevel / definition.maxLevel) * 100))
      : progress;
    const spentGold = previousMeta?.nextCost ?? 0;
    const previousGold = state.save.gold + spentGold;
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="item-tips-modal ability-tips-modal" role="dialog" aria-modal="true" aria-label="${definition.name}">
        <button type="button" class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        <div class="ability-tips-body accent-${definition.accent}${definition.active ? "" : " pending"}${upgradeFeedback ? " upgraded" : ""}">
          <header class="ability-tips-header">
            <div class="ability-tips-icon" aria-hidden="true">${abilityIconMarkup(definition.id)}</div>
            <div class="ability-tips-heading">
              <small>${categoryLabel}祝福</small>
              <h2 class="ability-tips-title">${definition.name}</h2>
              <span class="ability-tips-level${upgradeFeedback ? " upgraded" : ""}">
                <span>Lv.${level} / ${definition.maxLevel}</span>
                ${upgradeFeedback ? `<span class="ability-level-change" aria-hidden="true"><b>Lv.${upgradeFeedback.previousLevel}</b><i>›</i><strong>Lv.${level}</strong></span>` : ""}
              </span>
            </div>
          </header>
          <div class="ability-level-progress" aria-label="等级进度 ${level}/${definition.maxLevel}">
            <span class="${upgradeFeedback ? "upgraded" : ""}" style="--ability-progress-from:${previousProgress}%;--ability-progress-to:${progress}%;width:${progress}%"></span>
          </div>
          <div class="ability-tips-rule">
            <small>每级提升</small>
            <strong>${definition.blurb.replace(/^每级/, "")}</strong>
          </div>
          <div class="ability-effect-compare" aria-label="效果对比">
            <div class="ability-effect-current${upgradeFeedback ? " upgraded" : ""}" aria-label="当前效果 ${currentEffect}${upgradeFeedback ? `，由 ${previousEffect} 提升` : ""}">
              <small>当前效果</small>
              <strong>${currentEffect}</strong>
              ${upgradeFeedback ? `<span class="ability-effect-change" aria-hidden="true"><b>${previousEffect}</b><i>›</i><strong>${currentEffect}</strong></span>` : ""}
            </div>
            <span class="ability-effect-arrow" aria-hidden="true">›</span>
            <div class="ability-effect-next">
              <small>${meta.atMax ? "最高效果" : "升级后"}</small>
              <strong>${nextEffect}</strong>
            </div>
          </div>
          <div class="ability-upgrade-area ${meta.atMax ? "maxed" : canBuy ? "ready" : "insufficient"}">
            <div class="ability-wallet-row" aria-label="${meta.atMax ? "已达到最高等级" : `持有 ${state.save.gold} 金币，升级消耗 ${meta.nextCost} 金币`}">
              ${meta.atMax
                ? "<strong>已达到最高等级</strong>"
                : `<span aria-hidden="true">${currencyIconMarkup("gold")}<b>${compact(state.save.gold)}</b><i>/${compact(meta.nextCost!)}</i></span>`}
              ${upgradeFeedback ? `<span class="ability-wallet-change" aria-hidden="true">${currencyIconMarkup("gold")}<b>${compact(previousGold)}</b><i>›</i><strong>${compact(state.save.gold)}</strong><em>-${compact(spentGold)}</em></span>` : ""}
            </div>
            <button class="primary-button wide" data-action="ability-upgrade" data-ability-id="${definition.id}" aria-label="${meta.atMax ? "已满级" : canBuy ? `升级，消耗 ${meta.nextCost} 金币` : `升级，金币不足，需要 ${meta.nextCost} 金币`}" ${meta.atMax || !canBuy ? "disabled" : ""}>
              ${meta.atMax ? "已满级" : "升级"}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  private renderExpeditionRewardIcons(reward: DungeonClearReward, prefix: string): string {
    const items: Array<{ name: string; icon: string; amount: number }> = [];
    for (const currencyId of ["gold", "exp"] as const) {
      const amount = reward[currencyId];
      if (amount > 0) {
        const currency = ACCOUNT_CURRENCY_BY_ID[currencyId];
        items.push({ name: currency.name, icon: currency.icon, amount });
      }
    }
    for (const [materialId, amount] of Object.entries(reward.materials)) {
      if (!amount) continue;
      const material = MATERIAL_BY_ID[materialId as MaterialId];
      if (material) items.push({ name: material.name, icon: material.icon, amount });
    }
    if (!items.length) return `<span class="expedition-detail-empty-reward">尚未获得奖励</span>`;
    return items.map((item, index) => {
      const popoverId = `${prefix}-${index}`;
      return `<span class="dispatch-reward-control expedition-detail-reward-control">
        <button type="button" class="dispatch-reward-icon expedition-detail-reward-icon" data-action="dispatch-reward-tips" aria-label="查看${item.name}" aria-expanded="false" aria-controls="${popoverId}">
          <img src="${item.icon}" alt="" aria-hidden="true" draggable="false" />
          <b>×${compact(item.amount)}</b>
        </button>
        <span class="dispatch-reward-popover" id="${popoverId}" role="note" hidden><strong>${item.name}</strong><small>已获得 ×${item.amount.toLocaleString("zh-CN")}</small></span>
      </span>`;
    }).join("");
  }

  private renderExpeditionEventLog(
    details: DungeonRunDetails,
    dungeon: DungeonDefinition,
    heroIds: readonly HeroId[],
  ): string {
    const storyIndexes = new Map<number, number>();
    const storyCounts = new Map<DungeonRunEventKind, number>();
    for (const entry of details.events) {
      const storyIndex = storyCounts.get(entry.kind) ?? 0;
      storyIndexes.set(entry.step, storyIndex);
      storyCounts.set(entry.kind, storyIndex + 1);
    }
    const eventLabels: Record<DungeonRunEventKind, string> = {
      "battle-victory": "战斗胜利",
      "battle-defeat": "战斗失利",
      recovery: "休整恢复",
      treasure: "意外收获",
      discovery: "途中见闻",
    };
    const eventMarkers: Record<DungeonRunEventKind, string> = {
      "battle-victory": "胜",
      "battle-defeat": "败",
      recovery: "+",
      treasure: "◆",
      discovery: "!",
    };
    const eventRows = [...details.events].reverse().map((entry) => {
      const actorId = heroIds[(entry.step - 1) % Math.max(heroIds.length, 1)];
      const actorName = actorId ? HERO_BY_ID[actorId].name : "斥候";
      const story = getExpeditionEventStory(
        dungeon.id,
        entry.kind,
        storyIndexes.get(entry.step) ?? 0,
        actorName,
      );
      const reward = entry.reward
        ? this.renderExpeditionRewardIcons(entry.reward, `expedition-event-${dungeon.id}-${entry.step}`)
        : "";
      const staminaText = entry.staminaChange > 0
        ? `体力 +${entry.staminaChange} · 剩余 ${entry.remainingStamina}`
        : entry.staminaChange < 0
          ? `体力 -${Math.abs(entry.staminaChange)} · 剩余 ${entry.remainingStamina}`
          : `未消耗体力 · 剩余 ${entry.remainingStamina}`;
      return `<li class="expedition-event-row ${entry.kind}${entry.reward ? " reward" : ""}" role="listitem">
        <span class="expedition-event-marker" aria-hidden="true">${eventMarkers[entry.kind]}</span>
        <div class="expedition-event-content">
          <div class="expedition-event-heading"><strong>${story.title}</strong><span>${eventLabels[entry.kind]}</span></div>
          <p>${story.body}</p>
          ${entry.reward ? `<div class="expedition-event-rewards">${reward}</div>` : ""}
          <small class="${entry.staminaChange > 0 ? "recovered" : ""}">${staminaText}</small>
        </div>
      </li>`;
    }).join("");
    const leaderName = heroIds[0] ? HERO_BY_ID[heroIds[0]].name : "斥候";
    return `${eventRows}<li class="expedition-event-row departed" role="listitem">
      <span class="expedition-event-marker" aria-hidden="true">➜</span>
      <div class="expedition-event-content">
        <div class="expedition-event-heading"><strong>营火熄灭之前</strong></div>
        <p>${details.events.length ? `${leaderName}把绳索又检查了一遍。我们在营火熄灭前离开营地，朝${dungeon.name}进发。` : `营火已经看不见了。${leaderName}走在最前面，我们正沿着通往${dungeon.name}的路继续前进。`}</p>
      </div>
    </li>`;
  }

  private renderDungeonProgressModal(state: GameStoreState): void {
    const dungeonId = String(this.modalPayload) as DungeonId;
    const dungeon = DUNGEON_BY_ID[dungeonId];
    const run = dungeon ? getDungeonRun(state.save.dungeonRuns, dungeonId) : undefined;
    if (!dungeon || !run) {
      this.closeModal();
      return;
    }
    const details = getDungeonRunDetails(run);
    const progress = details.progress;
    const returned = progress.returned;
    const staminaPercent = progress.maxStamina > 0
      ? Math.round((progress.remainingStamina / progress.maxStamina) * 100)
      : 0;
    const primaryMaterial = MATERIAL_BY_ID[dungeon.drops[0]!.materialId];
    this.overlay.innerHTML = `
      <div class="modal-backdrop" data-action="close-modal"></div>
      <section class="center-sheet expedition-detail-modal tone-${primaryMaterial.tone} ${returned ? "returned" : "running"}" data-completed-steps="${progress.completedSteps}" role="dialog" aria-modal="true" aria-label="${dungeon.name}远征详情">
        <header>
          <h2>远征详情</h2>
          <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
        </header>
        <section class="expedition-detail-summary">
          <div class="expedition-detail-mission">
            <span class="expedition-detail-art" aria-hidden="true">${EXPEDITION_ICONS[dungeon.id]}</span>
            <span><small data-expedition-detail-status>${returned ? "已返程" : "远征中"}</small><strong>${dungeon.name}</strong><em>${dungeon.environment.label}</em></span>
          </div>
          <div class="expedition-detail-stamina-heading"><span>队伍体力</span><strong data-expedition-detail-stamina>${progress.remainingStamina}/${progress.maxStamina}</strong></div>
          <div class="expedition-detail-stamina" data-expedition-detail-meter role="progressbar" aria-label="远征队伍体力" aria-valuemin="0" aria-valuemax="${progress.maxStamina}" aria-valuenow="${progress.remainingStamina}"><i style="width:${staminaPercent}%"></i></div>
          <div class="expedition-detail-stats">
            <span><small>经历事件</small><b data-expedition-detail-steps>${progress.completedSteps} 次</b></span>
            <span><small>奖励记录</small><b data-expedition-detail-reward-count>${progress.rewardSteps}</b></span>
            <span><small>途中事件</small><b data-expedition-detail-event-count>${progress.eventSteps}</b></span>
          </div>
          <section class="expedition-detail-summary-rewards" aria-label="已获奖励">
            <div class="expedition-detail-section-title"><strong>已获奖励</strong><small data-expedition-detail-reward-steps>${progress.rewardSteps} 次</small></div>
            <div class="expedition-detail-rewards" data-expedition-detail-rewards>${this.renderExpeditionRewardIcons(details.accumulatedRewards, `expedition-total-${dungeon.id}`)}</div>
          </section>
        </section>
        <section class="expedition-detail-log-section" aria-label="远征记录">
          <div class="expedition-detail-section-title"><strong>远征记录</strong><small>最新在前</small></div>
          <ol class="expedition-detail-log" data-expedition-detail-log role="list">${this.renderExpeditionEventLog(details, dungeon, run.heroIds)}</ol>
        </section>
        <footer class="expedition-detail-footer" data-expedition-detail-footer>
          ${this.renderDungeonDetailFooter(dungeon.id, returned)}
        </footer>
      </section>
    `;
  }

  private renderDungeonDetailFooter(dungeonId: DungeonId, returned: boolean): string {
    if (returned) {
      return `<button type="button" class="primary-button wide" data-action="dungeon-claim" data-dungeon-id="${dungeonId}">领取累计奖励</button>`;
    }
    if (this.dungeonRecallPending) {
      return `<div class="expedition-recall-confirm" role="group" aria-label="确认提前召回">
        <span>立即结束探索并结算已获奖励？</span>
        <div>
          <button type="button" class="secondary-button" data-action="dungeon-recall-cancel">继续远征</button>
          <button type="button" class="danger-button" data-action="dungeon-recall" data-dungeon-id="${dungeonId}">确认召回</button>
        </div>
      </div>`;
    }
    return `<button type="button" class="secondary-button wide" data-action="dungeon-recall-request" data-dungeon-id="${dungeonId}">提前召回</button>`;
  }

  private syncDungeonProgressModal(state: GameStoreState): void {
    const modal = this.overlay.querySelector<HTMLElement>(".expedition-detail-modal");
    if (!modal) return;
    const dungeonId = String(this.modalPayload) as DungeonId;
    const run = getDungeonRun(state.save.dungeonRuns, dungeonId);
    if (!run) {
      this.closeModal();
      return;
    }
    const details = getDungeonRunDetails(run);
    const progress = details.progress;
    const returned = progress.returned;
    const staminaPercent = progress.maxStamina > 0
      ? Math.round((progress.remainingStamina / progress.maxStamina) * 100)
      : 0;
    modal.classList.toggle("running", !returned);
    modal.classList.toggle("returned", returned);
    const status = modal.querySelector<HTMLElement>("[data-expedition-detail-status]");
    const stamina = modal.querySelector<HTMLElement>("[data-expedition-detail-stamina]");
    const meter = modal.querySelector<HTMLElement>("[data-expedition-detail-meter]");
    const fill = meter?.querySelector<HTMLElement>("i");
    const steps = modal.querySelector<HTMLElement>("[data-expedition-detail-steps]");
    const rewardCount = modal.querySelector<HTMLElement>("[data-expedition-detail-reward-count]");
    const eventCount = modal.querySelector<HTMLElement>("[data-expedition-detail-event-count]");
    const rewardSteps = modal.querySelector<HTMLElement>("[data-expedition-detail-reward-steps]");
    if (status) status.textContent = returned ? "已返程" : "远征中";
    if (stamina) stamina.textContent = `${progress.remainingStamina}/${progress.maxStamina}`;
    if (meter) meter.setAttribute("aria-valuenow", String(progress.remainingStamina));
    if (fill) fill.style.width = `${staminaPercent}%`;
    if (steps) steps.textContent = `${progress.completedSteps} 次`;
    if (rewardCount) rewardCount.textContent = String(progress.rewardSteps);
    if (eventCount) eventCount.textContent = String(progress.eventSteps);
    if (rewardSteps) rewardSteps.textContent = `${progress.rewardSteps} 次`;
    if (modal.dataset.completedSteps !== String(progress.completedSteps)) {
      const log = modal.querySelector<HTMLElement>("[data-expedition-detail-log]");
      const scrollTop = log?.scrollTop ?? 0;
      if (log) {
        log.innerHTML = this.renderExpeditionEventLog(details, DUNGEON_BY_ID[dungeonId], run.heroIds);
        log.scrollTop = scrollTop;
      }
      const rewards = modal.querySelector<HTMLElement>("[data-expedition-detail-rewards]");
      if (rewards) rewards.innerHTML = this.renderExpeditionRewardIcons(details.accumulatedRewards, `expedition-total-${dungeonId}`);
      modal.dataset.completedSteps = String(progress.completedSteps);
    }
    const footer = modal.querySelector<HTMLElement>("[data-expedition-detail-footer]");
    if (footer) {
      footer.innerHTML = this.renderDungeonDetailFooter(dungeonId, returned);
    }
  }

  private centerModal(title: string, content: string, className = ""): string {
    const classes = `center-sheet${className ? ` ${className}` : ""}`;
    return `<div class="modal-backdrop" data-action="close-modal"></div><section class="${classes}" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></header>${content}</section>`;
  }

  private battleDetailsEntries() {
    return this.battleStats.sortedEntries(
      this.store.getState().save.party,
      this.battleDetailsMetric,
    );
  }

  private renderBattleDetailsRows(): string {
    const entries = this.battleDetailsEntries();
    if (!entries.length) return `<p class="battle-details-empty">上阵角色后即可查看战斗统计</p>`;
    return entries.map(({ heroId }) => {
      const hero = HERO_BY_ID[heroId];
      return `
        <button type="button" class="battle-details-row" data-action="battle-details-hero" data-hero-id="${heroId}">
          <span class="battle-details-rank" data-detail-rank></span>
          <span class="battle-details-portrait" style="--hero-accent:${hero.color}"><img src="${ASSET_MANIFEST.characters[heroId]}" alt=""></span>
          <span class="battle-details-info">
            <span class="battle-details-identity"><strong>${hero.name}</strong><small>${hero.role}</small></span>
            <span class="battle-details-bar" aria-hidden="true"><i></i></span>
          </span>
          <span class="battle-details-primary"><small data-detail-metric-label>${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}</small><b data-detail-value>0</b></span>
          <span class="battle-details-drilldown" aria-hidden="true">›</span>
        </button>
      `;
    }).join("");
  }

  private battleDetailsSourceLabel(source: BattleStatsSourceEntry): string {
    const { kind, id } = source.attribution;
    if (kind === "basic") return "普通攻击";
    if (kind === "activeSkill") return ACTIVE_SKILL_BY_ID[id]?.name ?? "主动技能";
    if (kind === "passive") {
      if (isHeroSkillId(id)) return HERO_SKILL_BY_ID[id].name;
      return PASSIVE_SKILL_BY_ID[id]?.name ?? "专精被动";
    }
    if (kind === "talent") return "天赋效果";
    if (kind === "reflect") return "反伤";
    if (kind === "periodic") return id === "stagger" ? "延迟承伤" : "持续效果";
    if (kind === "gear") {
      return {
        "life-on-hit": "装备·击中回复",
        "life-steal": "装备·生命偷取",
        thunderbrand: "装备·雷霆烙印",
      }[id] ?? "装备效果";
    }
    return "其他效果";
  }

  private renderBattleDetailsSources(heroId: HeroId): string {
    const sources = this.battleStats.sources(heroId, this.battleDetailsMetric);
    if (!sources.length) {
      return `<p class="battle-details-empty">暂无${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}记录</p>`;
    }
    const maxValue = Math.max(1, ...sources.map(({ amount }) => amount));
    return sources.map((source) => {
      const share = Math.max(0, Math.min(100, (source.amount / maxValue) * 100));
      const label = this.battleDetailsSourceLabel(source);
      return `
        <article class="battle-details-source-row" data-source-key="${source.key}" style="--detail-share:${share}%">
          <span class="battle-details-source-info">
            <span><strong data-source-label>${label}</strong><small data-source-events>${source.events} 次</small></span>
            <span class="battle-details-bar" aria-hidden="true"><i></i></span>
          </span>
          <b data-source-value title="${source.amount.toLocaleString("zh-CN")}">${compact(source.amount)}</b>
        </article>
      `;
    }).join("");
  }

  private syncBattleDetailsModal(): void {
    const modal = this.overlay.querySelector<HTMLElement>(".battle-details-modal");
    if (!modal) return;
    const list = modal.querySelector<HTMLElement>(".battle-details-list");
    if (!list) return;
    modal.dataset.metric = this.battleDetailsMetric;
    const time = modal.querySelector<HTMLElement>("[data-battle-details-time]");
    const stage = modal.querySelector<HTMLElement>("[data-battle-details-stage]");
    if (time) time.textContent = this.formatBattleDetailsDuration(this.snapshot?.elapsedMs ?? 0);
    if (stage) stage.textContent = `第 ${this.snapshot?.stage ?? this.store.getState().save.currentStage} 关`;
    for (const tab of modal.querySelectorAll<HTMLButtonElement>('[data-action="battle-details-metric"]')) {
      const selected = tab.dataset.metric === this.battleDetailsMetric;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    }
    if (this.battleDetailsHeroId) {
      const sources = this.battleStats.sources(this.battleDetailsHeroId, this.battleDetailsMetric);
      const renderedKeys = [...list.querySelectorAll<HTMLElement>(".battle-details-source-row")]
        .map((row) => row.dataset.sourceKey ?? "");
      const sourceKeys = sources.map(({ key }) => key);
      if (
        renderedKeys.length !== sourceKeys.length
        || renderedKeys.some((key) => !sourceKeys.includes(key))
      ) {
        list.innerHTML = this.renderBattleDetailsSources(this.battleDetailsHeroId);
      }
      const rows = [...list.querySelectorAll<HTMLElement>(".battle-details-source-row")];
      const maxValue = Math.max(1, ...sources.map(({ amount }) => amount));
      sources.forEach((source, index) => {
        const row = rows.find((candidate) => candidate.dataset.sourceKey === source.key);
        if (!row) return;
        list.append(row);
        row.style.setProperty("--detail-share", `${Math.max(0, Math.min(100, (source.amount / maxValue) * 100))}%`);
        const label = this.battleDetailsSourceLabel(source);
        const labelNode = row.querySelector<HTMLElement>("[data-source-label]");
        const eventsNode = row.querySelector<HTMLElement>("[data-source-events]");
        const value = row.querySelector<HTMLElement>("[data-source-value]");
        if (labelNode) labelNode.textContent = label;
        if (eventsNode) eventsNode.textContent = `${source.events} 次`;
        if (value) {
          value.textContent = compact(source.amount);
          value.title = source.amount.toLocaleString("zh-CN");
        }
        row.setAttribute("aria-label", `${label}，${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]} ${source.amount.toLocaleString("zh-CN")}，${source.events} 次`);
        row.dataset.rank = String(index + 1);
      });
      const context = modal.querySelector<HTMLElement>(".battle-details-scope small");
      if (context) {
        context.textContent = `${HERO_BY_ID[this.battleDetailsHeroId].name} · ${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}`;
      }
      list.setAttribute("aria-label", `${HERO_BY_ID[this.battleDetailsHeroId].name}的${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}来源`);
    } else {
      const entries = this.battleDetailsEntries();
      const renderedIds = [...list.querySelectorAll<HTMLElement>(".battle-details-row")]
        .map((row) => row.dataset.heroId ?? "");
      const entryIds = entries.map(({ heroId }) => heroId);
      if (renderedIds.length !== entryIds.length || renderedIds.some((id) => !entryIds.includes(id as HeroId))) {
        list.innerHTML = this.renderBattleDetailsRows();
      }
      const maxValue = Math.max(1, ...entries.map((entry) => entry[this.battleDetailsMetric]));
      entries.forEach((entry, index) => {
        const row = list.querySelector<HTMLElement>(`[data-hero-id="${entry.heroId}"]`);
        if (!row) return;
        list.append(row);
        row.style.setProperty("--detail-share", `${Math.max(0, Math.min(100, (entry[this.battleDetailsMetric] / maxValue) * 100))}%`);
        const rank = row.querySelector<HTMLElement>("[data-detail-rank]");
        if (rank) rank.textContent = String(index + 1);
        const metricLabel = row.querySelector<HTMLElement>("[data-detail-metric-label]");
        const value = row.querySelector<HTMLElement>("[data-detail-value]");
        if (metricLabel) metricLabel.textContent = BATTLE_DETAILS_LABEL[this.battleDetailsMetric];
        if (value) {
          value.textContent = compact(entry[this.battleDetailsMetric]);
          value.title = entry[this.battleDetailsMetric].toLocaleString("zh-CN");
        }
        const heroName = HERO_BY_ID[entry.heroId].name;
        row.setAttribute("aria-label", `第 ${index + 1} 名，${heroName}，${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]} ${entry[this.battleDetailsMetric].toLocaleString("zh-CN")}，查看数据来源`);
      });
      list.setAttribute("aria-label", `按${BATTLE_DETAILS_LABEL[this.battleDetailsMetric]}排序的角色统计`);
    }
    this.battleDetailsRenderedRevision = this.battleStats.revision;
    this.battleDetailsRenderedSecond = Math.floor((this.snapshot?.elapsedMs ?? 0) / 1000);
    this.battleDetailsLastSyncElapsedMs = this.snapshot?.elapsedMs ?? 0;
  }

  private formatBattleDetailsDuration(elapsedMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${String(minutes).padStart(2, "0")}:${seconds}`;
  }

  private closeDispatchRewardTips(): void {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-action="dispatch-reward-tips"]')) {
      button.setAttribute("aria-expanded", "false");
    }
    for (const popover of this.root.querySelectorAll<HTMLElement>(".dispatch-reward-popover")) {
      popover.hidden = true;
    }
  }

  private closeChapterDropItemTips(): void {
    const tips = this.overlay.querySelector<HTMLElement>(".chapter-drop-item-tips");
    if (!tips) return;
    tips.hidden = true;
    tips.removeAttribute("data-item-id");
    tips.removeAttribute("data-set-id");
    tips.style.removeProperty("top");
    for (const button of this.overlay.querySelectorAll<HTMLButtonElement>('[data-action="chapter-drop-item"], [data-action="chapter-set-tips"]')) {
      button.setAttribute("aria-expanded", "false");
      button.classList.remove("selected");
    }
  }

  private chapterDropSetBonusMarkup(setId: SetId): string {
    return SET_BY_ID[setId].bonuses.map((bonus) => `<div class="chapter-drop-tips-bonus-row">
      <b>${bonus.pieces}件</b>
      <span>${setBonusText(bonus)}</span>
    </div>`).join("");
  }

  private positionChapterDropTips(
    tips: HTMLElement,
    modal: HTMLElement,
    anchor: HTMLButtonElement,
  ): void {
    const modalRect = modal.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const tipsHeight = tips.offsetHeight;
    const gap = 6;
    const below = anchorRect.bottom - modalRect.top + gap;
    const above = anchorRect.top - modalRect.top - tipsHeight - gap;
    const minTop = 58;
    const maxTop = Math.max(minTop, modal.clientHeight - tipsHeight - 8);
    const preferred = anchorRect.bottom + tipsHeight + gap <= modalRect.bottom ? below : above;
    tips.style.top = `${Math.max(minTop, Math.min(preferred, maxTop))}px`;
  }

  private toggleChapterSetTips(setId: SetId, anchor: HTMLButtonElement): void {
    const set = SET_BY_ID[setId];
    const tips = this.overlay.querySelector<HTMLElement>(".chapter-drop-item-tips");
    const modal = this.overlay.querySelector<HTMLElement>(".chapter-drops-modal");
    if (!set || !tips || !modal) return;
    const closingCurrent = !tips.hidden && tips.dataset.setId === setId;
    this.closeChapterDropItemTips();
    if (closingCurrent) return;

    tips.innerHTML = `
      <button type="button" class="chapter-drop-tips-close" data-action="chapter-drop-item-tips-close" aria-label="关闭套装详情">×</button>
      <div class="chapter-drop-tips-head chapter-drop-set-tips-head">
        <span class="chapter-drop-set-emblem" aria-hidden="true">${setNameInitial(setId)}</span>
        <span>
          <strong>${set.name}</strong>
          <small>${set.school === "physical" ? "物理" : "法术"}套装</small>
          <em>2 / 4 / 6 件套效果</em>
        </span>
      </div>
      <div class="chapter-drop-tips-scroll">
        <section class="chapter-drop-tips-section chapter-drop-tips-set-detail">
          <h4>套装效果</h4>
          <div class="chapter-drop-tips-bonuses">${this.chapterDropSetBonusMarkup(setId)}</div>
        </section>
      </div>`;
    tips.setAttribute("aria-label", `${set.name}套装详情`);
    tips.dataset.setId = setId;
    tips.hidden = false;
    anchor.setAttribute("aria-expanded", "true");
    anchor.classList.add("selected");
    this.positionChapterDropTips(tips, modal, anchor);
  }

  private toggleChapterDropItemTips(itemId: string, anchor: HTMLButtonElement): void {
    const item = ITEM_BY_ID[itemId];
    const tips = this.overlay.querySelector<HTMLElement>(".chapter-drop-item-tips");
    const modal = this.overlay.querySelector<HTMLElement>(".chapter-drops-modal");
    if (!item || !tips || !modal) return;
    const closingCurrent = !tips.hidden && tips.dataset.itemId === itemId;
    this.closeChapterDropItemTips();
    if (closingCurrent) return;

    const payload = this.modalPayload as { chapter: EquipmentChapter; difficulty: GameDifficulty };
    const chapter = payload.chapter;
    const levelBounds = chapterEquipmentLevelBounds(chapter, payload.difficulty);
    const levelRange = chapterEquipmentLevelRange(chapter, payload.difficulty);
    const rarityBounds = getNaturalDropRarityBounds(chapterStartStage(chapter), payload.difficulty);
    const stageRange = chapterEquipmentStageRange(chapter, item.slot);
    const statLabels = {
      attack: "攻击",
      maxHp: "生命",
      defense: "防御",
      attackSpeedPct: "攻速",
    } as const;
    const statRows = getEquipmentBaseStatRanges(
      item,
      levelBounds.min,
      levelBounds.max,
      rarityBounds.min,
      rarityBounds.max,
    )
      .map((stat) => `<div><span>${statLabels[stat.key]}</span><strong>+${stat.min}${stat.min === stat.max ? "" : `～${stat.max}`}${stat.key === "attackSpeedPct" ? "%" : ""}</strong></div>`)
      .join("");
    const possibleSetIds = getChapterSetIds(chapter);
    const setSection = `<section class="chapter-drop-tips-section chapter-drop-tips-set">
      <h4>可能出现的套装标识</h4>
      <div class="chapter-drop-tips-set-list">
        ${possibleSetIds.map((setId) => `<article class="chapter-drop-tips-set-card">
          <strong>${SET_BY_ID[setId].name}</strong>
          <div class="chapter-drop-tips-bonuses">${this.chapterDropSetBonusMarkup(setId)}</div>
        </article>`).join("")}
      </div>
      <small>套装标识随机出现，不改变装备名称与图标；无标识装备可后续刻印。</small>
    </section>`;
    tips.innerHTML = `
      <button type="button" class="chapter-drop-tips-close" data-action="chapter-drop-item-tips-close" aria-label="关闭装备详情">×</button>
      <div class="chapter-drop-tips-head">
        <span class="chapter-drop-tips-icon" aria-hidden="true">${equipmentArt(item.icon)}</span>
        <span>
          <strong>${item.name}</strong>
          <small>${SLOT_LABELS[item.slot]} · ${item.school === "magic" ? "法系" : "物理"}</small>
          <em>${levelRange} · ${equipmentDropRarityRange([item], chapter, payload.difficulty)}</em>
        </span>
      </div>
      <div class="chapter-drop-tips-scroll">
        <section class="chapter-drop-tips-section">
          <h4>基础属性范围</h4>
          <div class="chapter-drop-tips-stats">${statRows}</div>
        </section>
        ${setSection}
        <div class="chapter-drop-tips-stage"><small>本章掉落</small><strong>${stageRange}</strong></div>
      </div>`;
    tips.setAttribute("aria-label", `${item.name}掉落详情`);
    tips.dataset.itemId = itemId;
    tips.hidden = false;
    anchor.setAttribute("aria-expanded", "true");
    anchor.classList.add("selected");

    this.positionChapterDropTips(tips, modal, anchor);
  }

  private autoSelectDispatchHeroes(): void {
    const dungeon = DUNGEON_BY_ID[String(this.modalPayload) as DungeonId];
    if (!dungeon) return;
    const save = this.store.getState().save;
    const dateKey = save.shop.dateKey || getDateKey();
    const requirements = getExpeditionRequirements(dungeon.id, dateKey);
    const busy = getBusyHeroIds(save.dungeonRuns);
    const exploring = getExploringHeroIds(save.party);
    const universalRequirements = requirements.filter((requirement) => requirement.count === "all");
    const candidates = HERO_DEFINITIONS
      .filter((hero) => save.roster[hero.id].unlocked)
      .filter((hero) => !busy.has(hero.id))
      .filter((hero) => !exploring.has(hero.id))
      .filter((hero) => universalRequirements.every((requirement) => heroMatchesExpeditionRequirement(hero.id, requirement)))
      .map((hero) => ({
        heroId: hero.id,
        stamina: calculateExpeditionStamina(save, dungeon, [hero.id]),
      }));
    const selected: HeroId[] = [];
    while (selected.length < dungeon.partySize && selected.length < candidates.length) {
      const unmetRequirements = getExpeditionRequirementProgress(dungeon, dateKey, selected)
        .filter((progress) => !progress.satisfied && progress.requirement.count !== "all");
      const next = candidates
        .filter((candidate) => !selected.includes(candidate.heroId))
        .sort((left, right) => {
          const coverage = (heroId: HeroId): number => unmetRequirements.reduce(
            (score, progress) => score + (heroMatchesExpeditionRequirement(heroId, progress.requirement)
              ? Math.max(1, progress.required - progress.matched)
              : 0),
            0,
          );
          return coverage(right.heroId) - coverage(left.heroId)
            || right.stamina - left.stamina
            || left.heroId.localeCompare(right.heroId);
        })[0];
      if (!next) break;
      selected.push(next.heroId);
    }
    this.dispatchDraft = selected;
    this.syncDispatchSelection();
    const failedRequirement = getExpeditionRequirementProgress(dungeon, dateKey, selected)
      .find((progress) => !progress.satisfied);
    if (selected.length < dungeon.partySize || failedRequirement) {
      this.showToast("没有足够的可派遣英雄满足条件");
    }
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
    const dateKey = this.store.getState().save.shop.dateKey || getDateKey();
    const requirementProgress = getExpeditionRequirementProgress(dungeon, dateKey, this.dispatchDraft);
    const failedRequirement = requirementProgress.find((progress) => !progress.satisfied);
    for (const progress of requirementProgress) {
      const row = this.overlay.querySelector<HTMLElement>(`[data-requirement-id="${progress.requirement.id}"]`);
      if (!row) continue;
      row.classList.toggle("complete", progress.satisfied);
      row.classList.toggle("pending", !progress.satisfied);
      const value = row.querySelector<HTMLElement>("[data-requirement-progress]");
      if (value) value.textContent = `${progress.matched}/${progress.required}`;
    }
    const fusionStamina = calculateExpeditionStamina(this.store.getState().save, dungeon, this.dispatchDraft);
    const estimatedDuration = formatExpeditionDuration(estimateExpeditionDurationMs(fusionStamina));
    const stamina = this.overlay.querySelector<HTMLElement>("[data-expedition-stamina]");
    const capacity = this.overlay.querySelector<HTMLElement>("[data-expedition-capacity]");
    if (stamina) stamina.textContent = String(fusionStamina);
    if (capacity) {
      capacity.textContent = selected < dungeon.partySize
        ? `还需选择 ${dungeon.partySize - selected} 名英雄`
        : failedRequirement
          ? `未满足：${failedRequirement.requirement.label}`
          : `约可探索 ${estimatedDuration}`;
    }
    submit.disabled = selected !== dungeon.partySize || Boolean(failedRequirement);
    submit.textContent = `派遣 · ${selected}/${dungeon.partySize}`;
  }

  private onClick(event: Event): void {
    const origin = event.target as Element | null;
    if (!origin?.closest?.('.task-reward-tips, [data-action="task-milestone-tips"]')) this.closeTaskRewardTips();
    const craftResultModal = origin?.closest?.<HTMLElement>(".craft-result-modal") ?? null;
    if ((this.modal === "craft-result" || this.modal === "hero-growth-result") && origin === craftResultModal) {
      this.closeModal();
      return;
    }
    const target = origin?.closest?.<HTMLElement>("[data-action]") ?? null;
    const action = target?.dataset.action;
    if (target && (action === "dungeon-claim" || action === "offline-claim" || action === "loot-chest-claim" || action === "loot-chest-claim-close" || action === "salvage-confirm" || action === "item-salvage" || action === "stage-gift-claim")) {
      const source: ResourceRewardSource = action === "dungeon-claim"
        ? "dungeon"
        : action === "offline-claim"
          ? "offline"
          : action === "loot-chest-claim" || action === "loot-chest-claim-close"
            ? "loot-chest"
            : action === "stage-gift-claim"
              ? "stage-gift"
              : "salvage";
      const rect = target.getBoundingClientRect();
      this.pendingResourceRewardOrigin = {
        source,
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      };
    }
    const tipsVisible = this.alchemyTipsHost.childElementCount > 0;
    const insideAlchemyTips = Boolean(origin?.closest?.(".alchemy-tips"));
    const keepAlchemyTips =
      action === "alchemy-item-detail" ||
      action === "craft-item-detail" ||
      action === "craft-material-detail" ||
      action === "craft-cost-material-tip" ||
      action === "craft-imprint-material-tip";
    if (tipsVisible && !insideAlchemyTips && !keepAlchemyTips) {
      this.closeAlchemyTips();
    }
    const insideDispatchRewardTips = Boolean(origin?.closest?.('.dispatch-reward-popover, [data-action="dispatch-reward-tips"]'));
    if (!insideDispatchRewardTips) this.closeDispatchRewardTips();

    const insideChapterDropTips = Boolean(origin?.closest?.('.chapter-drop-item-tips, [data-action="chapter-drop-item"], [data-action="chapter-set-tips"]'));
    if (!insideChapterDropTips) this.closeChapterDropItemTips();

    const insideGlobalEquipmentTips = Boolean(origin?.closest?.(".equipment-global-tips-host .equipment-tips-popover"));
    const keepGlobalEquipmentTips =
      action === "item-detail" ||
      action === "loot-chest-reveal-one" ||
      action === "shop-offer-detail" ||
      action === "alchemy-item-detail" ||
      action === "craft-item-detail" ||
      action === "inventory-material-detail" ||
      action === "inventory-consumable-detail" ||
      action === "inventory-set-essence-detail" ||
      action === "shop-material-detail" ||
      action === "shop-set-essence-detail" ||
      action === "craft-cost-material-tip" ||
      action === "growth-cost-material-tip" ||
      action === "craft-imprint-material-tip";
    if (this.equipmentPopoverSource && !insideGlobalEquipmentTips && !keepGlobalEquipmentTips) {
      this.closeEquipmentPopover();
    }
    if (this.materialPopoverSource && !insideGlobalEquipmentTips && !keepGlobalEquipmentTips) {
      this.closeMaterialPopover();
    }

    const equipmentTipsOpen =
      this.modal === "equip" && (this.equipTipsKind === "compare" || this.equipTipsKind === "unequip");
    const insideEquipmentTips = Boolean(origin?.closest?.(".equipment-tips-popover"));
    if (equipmentTipsOpen && !insideEquipmentTips && !target) {
      this.equipTipsKind = null;
      this.syncEquipModal(this.store.getState());
      return;
    }

    const innateSkillTipsOpen =
      this.modal === "equip" &&
      this.equipTipsKind === "skill" &&
      (this.equipSkillTipsKind === "active" || this.equipSkillTipsKind === "passive");
    const insideInnateSkillTips = Boolean(origin?.closest?.(".equip-skill-popover"));
    const onInnateSkillTrigger =
      action === "equip-skill-tips" &&
      (target?.dataset.skillKind === "active" || target?.dataset.skillKind === "passive");
    if (innateSkillTipsOpen && !insideInnateSkillTips && !onInnateSkillTrigger) {
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
      if (!target) return;
    }

    if (!target || !action) return;
    if (target instanceof HTMLButtonElement && target.disabled) return;
    this.options.onSoundRequested?.("button");
    const inventoryIntent = this.inventoryFeature.handleAction(target, this.store.getState());
    if (inventoryIntent) {
      this.applyInventoryIntent(inventoryIntent, target);
      return;
    }
    const alchemyIntent = this.alchemyFeature.handleAction(
      target,
      this.store.getState(),
      this.selectedItemId,
    );
    if (alchemyIntent) {
      this.applyAlchemyIntent(alchemyIntent);
      return;
    }
    const craftIntent = this.craftFeature.handleAction(target, this.store.getState(), {
      selectedEquipmentItemId: this.selectedItemId,
      selectedMaterialId: this.selectedMaterialId,
      modalPayload: this.modalPayload,
    });
    if (craftIntent) {
      this.applyCraftIntent(craftIntent, target);
      return;
    }
    if (action === "select-tab") {
      const tab = target.dataset.tab as keyof typeof tabMeta;
      if (tab !== "shop") this.shopPanel = "daily";
      if (tab === "stages") {
        this.stagesPanelTab = "mainline";
        this.stagesChapter = stageToChapter(this.store.getState().save.currentStage);
      }
      this.store.dispatch({ type: "ui:selectTab", tab });
    }
    else if (action === "open-stages") {
      this.stagesPanelTab = "mainline";
      this.stagesChapter = stageToChapter(this.store.getState().save.currentStage);
      this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    }
    else if (action === "open-dungeons") {
      if (!isExpeditionFeatureAvailable(this.store.getState().save.highestClearedStage)) {
        this.showToast(formatMainlineUnlockCondition(EXPEDITION_UNLOCK_CLEARED_STAGE));
        return;
      }
      this.stagesPanelTab = "dungeon";
      this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
    }
    else if (action === "loot-chest-open") {
      this.modalPayload = null;
      this.lootChestCloseAfterClaim = false;
      this.openModal("loot-chest");
    } else if (action === "loot-chest-dismiss") {
      this.dismissLootChest();
    } else if (action === "loot-chest-reveal-one") {
      if (target instanceof HTMLButtonElement) this.revealSingleLootChest(target);
    } else if (action === "loot-chest-claim" || action === "loot-chest-claim-close") {
      this.lootChestCloseAfterClaim = action === "loot-chest-claim-close";
      if (target instanceof HTMLButtonElement) {
        target.disabled = true;
        target.dataset.revealing = "true";
      }
      this.store.dispatch({ type: "lootChest:open", now: Date.now() });
    } else if (action === "alchemy-station-detail") {
      this.openModal("alchemy-station");
    } else if (action === "growth-cost-material-tip") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      if (this.modal !== "equip" || this.equipGrowthKind !== "ascend" || materialId !== "mat_ascend_stone") return;
      this.openMaterialPopover("growth", "material", materialId, target);
    } else if (action === "shop-material-detail") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return;
      this.openMaterialPopover("shop", "material", materialId, target);
    } else if (action === "shop-set-essence-detail") {
      const setId = target.dataset.setId as SetId | undefined;
      if (!setId || !SET_BY_ID[setId]) return;
      this.openMaterialPopover("shop", "set-essence", setId, target);
    } else if (action === "alchemy-craft-confirm") {
      const payload = this.modalPayload as { itemIds?: string[] } | null;
      const itemIds = payload?.itemIds ?? [];
      if (itemIds.length !== ALCHEMY_SLOT_COUNT) return;
      this.closeModal();
      this.store.dispatch({ type: "alchemy:craft", itemIds });
      this.alchemyFeature.resetSelection();
      this.closeAlchemyTips();
    } else if (action === "toggle-speed") {
      const save = this.store.getState().save;
      const speeds = ([1, 1.5, 2] as BattleSpeed[]).filter((speed) => speed <= getAdVipBenefits(save.adVip.watchedAds).speed);
      if (speeds.length === 1) { this.activityTab = "vip"; this.modal = "activities"; this.renderModal(); }
      else this.store.dispatch({ type: "battle:setSpeed", speed: speeds[(speeds.indexOf(save.settings.battleSpeed) + 1) % speeds.length]! });
    }
    else if (action === "idle-accelerate") {
      const placement = target?.dataset.placement;
      if (placement === "idle-double" || placement === "idle-quick") void this.store.watchAd(placement, target?.dataset.ticket === "true");
    }
    else if (action === "vip-watch") void this.store.watchAd("vip");
    else if (action === "vip-view" && (target.dataset.vipView === "current" || target.dataset.vipView === "next")) {
      this.vipView = target.dataset.vipView;
      this.renderModal();
      this.overlay.querySelector<HTMLElement>(`#vip-view-${this.vipView}`)?.focus({ preventScroll: true });
    }
    else if (action === "vip-claim" && isTaskPeriod(target.dataset.period)) this.store.dispatch({ type: "vip:claim", period: target.dataset.period });
    else if (action === "activities") this.openModal("activities");
    else if (action === "close-activities") this.closeModal();
    else if (action === "activity-tab" && isActivityTabId(target.dataset.tab)) {
      if (this.activityTab !== target.dataset.tab) {
        const scrollLeft = this.overlay.querySelector(".activities-tabs")?.scrollLeft ?? 0;
        this.activityTab = target.dataset.tab;
        this.renderModal();
        const tabs = this.overlay.querySelector(".activities-tabs");
        if (tabs) tabs.scrollLeft = scrollLeft;
        const selectedTab = this.overlay.querySelector<HTMLButtonElement>(`#activity-tab-${this.activityTab}`);
        selectedTab?.focus({ preventScroll: true });
        selectedTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    else if (action === "task-period" && isTaskPeriod(target.dataset.period)) {
      if (this.taskPeriod !== target.dataset.period) {
        this.taskPeriod = target.dataset.period;
        this.renderModal();
        this.overlay.querySelector<HTMLElement>(`.tasks-period-tabs [data-period="${this.taskPeriod}"]`)?.focus();
      }
    }
    else if (action === "task-milestone-tips" && isTaskPeriod(target.dataset.period)) {
      const points = Number(target.dataset.points);
      const state = this.store.getState().save.recurringTasks[target.dataset.period];
      if (!state.milestones.includes(points) && taskActivity(state) >= points) {
        this.closeTaskRewardTips();
        this.store.dispatch({ type: "tasks:milestone", period: target.dataset.period, points });
        this.overlay.querySelector<HTMLElement>(`[data-action="task-milestone-tips"][data-points="${points}"]`)?.focus({ preventScroll: true });
      } else this.openTaskRewardTips(target, target.dataset.period, points);
    }
    else if (action === "task-claim" && isTaskPeriod(target.dataset.period)) {
      this.store.dispatch({ type: "tasks:claim", period: target.dataset.period, taskId: target.dataset.taskId ?? "" });
    }
    else if (action === "task-go" && isTaskPeriod(target.dataset.period)) {
      const task = RECURRING_TASKS[target.dataset.period].find((entry) => entry.id === target.dataset.taskId);
      if (!task) return;
      this.closeModal();
      if (task.id === "loot") this.openModal("loot-chest");
      else if (task.destination === "stages") {
        if (!isExpeditionFeatureAvailable(this.store.getState().save.highestClearedStage)) { this.showToast(formatMainlineUnlockCondition(EXPEDITION_UNLOCK_CLEARED_STAGE)); return; }
        this.stagesPanelTab = "dungeon";
        this.store.dispatch({ type: "ui:selectTab", tab: "stages" });
      } else if (task.destination === "alchemy") {
        this.craftFeature.selectTaskMode(
          task.id === "gem_fusion" ? "fusion" : task.id === "socket" ? "socket" : "upgrade",
        );
        this.closeAlchemyTips();
        this.store.dispatch({ type: "ui:selectTab", tab: "alchemy" });
      } else if (task.destination === "heroes") {
        this.store.dispatch({ type: "ui:selectTab", tab: "heroes" });
      } else if (task.destination === "summon") {
        this.openSummon();
      } else if (task.destination === "shop") {
        this.shopPanel = "daily";
        this.store.dispatch({ type: "ui:selectTab", tab: "shop" });
      }
    }
    else if (action === "check-in-claim") this.store.dispatch({ type: "checkIn:claim" });
    else if (action === "reward-box-open" && isRewardBoxId(target.dataset.boxId)) {
      this.store.dispatch({ type: "rewardBox:open", boxId: target.dataset.boxId });
    }
    else if (action === "settings") this.openModal("settings");
    else if (action === "battle-details") {
      this.battleDetailsHeroId = null;
      this.openModal("battle-details");
    }
    else if (action === "battle-details-metric") {
      const metric = target.dataset.metric as BattleStatsMetric | undefined;
      if (!metric || !BATTLE_DETAILS_METRICS.includes(metric)) return;
      this.battleDetailsMetric = metric;
      this.syncBattleDetailsModal();
    }
    else if (action === "battle-details-hero") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !HERO_BY_ID[heroId]) return;
      this.battleDetailsHeroId = heroId;
      this.renderModal();
    }
    else if (action === "battle-details-back") {
      this.battleDetailsHeroId = null;
      this.renderModal();
    }
    else if (action === "currency-info") {
      this.modalPayload = target.dataset.currency;
      this.openModal("currency");
    } else if (action === "close-gem-return") {
      this.finishGemReturnPrompt();
    } else if (action === "equip-gems-remove") {
      const itemId = this.pendingGemReturnItemId;
      if (itemId) this.store.dispatch({ type: "item:returnGems", itemId });
      this.finishGemReturnPrompt();
    } else if (action === "close-modal") this.closeModal();
    else if (action === "shop-offer-detail") {
      const offerId = target.dataset.offerId;
      if (!offerId) return;
      this.openEquipmentPopover("shop", offerId, null, target);
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
      const selectedItems = this.store.getState().save.inventory.filter((item) => ids.includes(item.instanceId));
      const essenceText = formatSetEssenceRewards(collectSetEssenceRewards(selectedItems));
      const returnedGemCount = selectedItems
        .reduce((sum, item) => sum + (item.sockets?.filter((socket) => Boolean(socket.gemId)).length ?? 0), 0);
      const beforeGold = this.store.getState().save.gold;
      this.store.dispatch({ type: "item:salvageMany", itemIds: ids });
      const gained = this.store.getState().save.gold - beforeGold;
      this.salvageSelectedIds.clear();
      this.closeModal();
      this.showToast(gained > 0
        ? `分解获得 金币 +${gained}${essenceText ? ` · ${essenceText}` : ""}${returnedGemCount > 0 ? ` · 宝石返还 ×${returnedGemCount}` : ""}`
        : "没有可分解的装备");
    } else if (action === "item-salvage") {
      if (!this.selectedItemId) return;
      const itemId = this.selectedItemId;
      const item = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === itemId);
      const gold = item ? getSalvageGold(item) : 0;
      const essence = item ? getSetEssenceSalvageReward(item) : null;
      const returnedGemCount = item?.sockets?.filter((socket) => Boolean(socket.gemId)).length ?? 0;
      this.alchemyFeature.removeItem(itemId);
      this.closeEquipmentPopover();
      this.store.dispatch({ type: "item:salvage", itemId });
      this.closeAlchemyTips();
      this.closeModal();
      if (this.store.getState().ui.activeTab === "alchemy") {
        this.renderAlchemy(this.store.getState());
      }
      if (gold > 0) this.showToast(`分解获得 金币 +${gold}${essence ? ` · ${SET_BY_ID[essence.setId].name}精华 +${essence.amount}` : ""}${returnedGemCount > 0 ? ` · 宝石返还 ×${returnedGemCount}` : ""}`);
    } else if (action === "item-open-equip") {
      const tipItem = this.store.getState().save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      if (!tipItem) return this.closeEquipmentPopover();
      this.closeEquipmentPopover(false);
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
      this.equipGrowthKind = null;
      this.selectedTalentId = null;
      this.talentResetPending = false;
      this.pendingHeroSkillId = null;
      this.syncEquipModal(this.store.getState());
      this.playEquipPanelTransition();
    } else if (action === "open-more-stats") {
      this.equipPanelTab = "stats";
      this.equipTipsKind = "stats-detail";
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-more-stats") {
      this.equipTipsKind = null;
      this.syncEquipModal(this.store.getState());
      this.overlay.querySelector<HTMLButtonElement>('[data-action="open-more-stats"]')?.focus({ preventScroll: true });
    } else if (action === "equip-auto") {
      const heroId = this.equipTargetHeroId;
      this.selectedItemId = null;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.store.dispatch({ type: "item:autoEquip", heroId });
      const feedback = this.store.getState().ui.toast;
      if (feedback === "暂无可自动装备的装备" || feedback === "英雄未解锁") {
        this.showToast(feedback);
      }
    } else if (action === "open-growth-dialog") {
      const kind = target.dataset.growthKind === "ascend" ? "ascend" : target.dataset.growthKind === "star" ? "star" : null;
      if (!kind) return;
      this.equipGrowthKind = kind;
      this.equipTipsKind = "growth";
      this.equipSkillTipsKind = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-growth-dialog") {
      const closingGrowthKind = this.equipGrowthKind;
      this.equipGrowthKind = null;
      this.equipTipsKind = null;
      this.syncEquipModal(this.store.getState());
      if (closingGrowthKind) {
        this.overlay
          .querySelector<HTMLElement>(`[data-action="open-growth-dialog"][data-growth-kind="${closingGrowthKind}"]`)
          ?.focus({ preventScroll: true });
      }
    } else if (action === "close-equip-tips") {
      const closingKind = this.equipTipsKind;
      const closingSkillKind = this.equipSkillTipsKind;
      const itemId = this.selectedItemId;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.equipGrowthKind = null;
      this.selectedTalentId = null;
      this.talentResetPending = false;
      this.pendingHeroSkillId = null;
      this.syncEquipModal(this.store.getState());
      const returnTarget = closingKind === "compare" && itemId
        ? this.overlay.querySelector<HTMLElement>(`[data-action="equip-candidate-select"][data-item-id="${itemId}"]`)
        : closingKind === "unequip"
          ? this.overlay.querySelector<HTMLElement>(`[data-action="equip-slot-focus"][data-slot="${this.equipFocusSlot}"]`)
          : closingKind === "skill" && (closingSkillKind === "active" || closingSkillKind === "passive")
            ? this.overlay.querySelector<HTMLElement>(`[data-action="equip-skill-tips"][data-skill-kind="${closingSkillKind}"]`)
            : null;
      returnTarget?.focus({ preventScroll: true });
    } else if (action === "equip-skill-tips") {
      const raw = target.dataset.skillKind;
      const kind =
        raw === "passive" || raw === "signature" || raw === "talent" || raw === "active" ? raw : null;
      if (!kind) return;
      this.pendingHeroSkillId = null;
      this.equipPanelTab = "stats";
      const toggleInnateTips =
        (kind === "active" || kind === "passive") &&
        this.equipTipsKind === "skill" &&
        this.equipSkillTipsKind === kind;
      this.equipSkillTipsKind = toggleInnateTips ? null : kind;
      const progress = this.store.getState().save.roster[this.equipTargetHeroId];
      if (toggleInnateTips) {
        this.equipTipsKind = null;
      } else if (kind === "talent") {
        this.equipTipsKind = "talent";
      } else if (kind === "signature" && canLearnHeroSkill(progress.level, progress.ascendLevel) && !progress.chosenSkillId) {
        this.talentResetPending = false;
        this.equipTipsKind = "skill-pick";
      } else {
        this.talentResetPending = false;
        this.equipTipsKind = "skill";
      }
      this.syncEquipModal(this.store.getState());
      if (toggleInnateTips) {
        this.overlay
          .querySelector<HTMLElement>(`[data-action="equip-skill-tips"][data-skill-kind="${kind}"]`)
          ?.focus({ preventScroll: true });
      }
    } else if (action === "equip-skill-pick") {
      this.equipPanelTab = "stats";
      this.equipTipsKind = "skill-pick";
      this.equipSkillTipsKind = "signature";
      this.pendingHeroSkillId = null;
      this.syncEquipModal(this.store.getState());
    } else if (action === "talent-select") {
      const talentId = target.dataset.talentId;
      if (!talentId || !isTalentId(talentId)) return;
      this.selectedTalentId = talentId;
      this.talentResetPending = false;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.syncEquipModal(this.store.getState());
    } else if (action === "close-talent-node-detail") {
      const talentId = this.selectedTalentId;
      this.selectedTalentId = null;
      this.syncEquipModal(this.store.getState());
      if (talentId) {
        this.overlay.querySelector<HTMLElement>(`[data-talent-id="${talentId}"]`)?.focus({ preventScroll: true });
      }
    } else if (action === "talent-up") {
      const talentId = target.dataset.talentId ?? this.selectedTalentId;
      if (!talentId || !isTalentId(talentId)) return;
      this.selectedTalentId = talentId;
      this.talentResetPending = false;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.store.dispatch({ type: "hero:talentUp", heroId: this.equipTargetHeroId, talentId });
    } else if (action === "talent-reset") {
      this.talentResetPending = true;
      this.syncEquipModal(this.store.getState());
      this.overlay.querySelector<HTMLElement>('[data-action="talent-reset-cancel"]')?.focus({ preventScroll: true });
    } else if (action === "talent-reset-cancel") {
      this.talentResetPending = false;
      this.syncEquipModal(this.store.getState());
      this.overlay.querySelector<HTMLElement>('[data-action="talent-reset"]')?.focus({ preventScroll: true });
    } else if (action === "talent-reset-confirm") {
      this.store.dispatch({ type: "hero:talentReset", heroId: this.equipTargetHeroId });
      this.selectedTalentId = null;
      this.talentResetPending = false;
      this.equipTipsKind = "talent";
      this.equipSkillTipsKind = "talent";
      this.syncEquipModal(this.store.getState());
      this.overlay.querySelector<HTMLElement>('[data-action="talent-select"]')?.focus({ preventScroll: true });
    } else if (action === "hero-skill-change-cancel") {
      const pendingSkillId = this.pendingHeroSkillId;
      this.pendingHeroSkillId = null;
      this.syncEquipModal(this.store.getState());
      if (pendingSkillId) {
        this.overlay
          .querySelector<HTMLElement>(`[data-action="choose-hero-skill"][data-skill-id="${pendingSkillId}"]`)
          ?.focus({ preventScroll: true });
      }
    } else if (action === "hero-skill-change-confirm") {
      const skillId = this.pendingHeroSkillId;
      if (!skillId) return;
      this.store.dispatch({ type: "hero:chooseSkill", heroId: this.equipTargetHeroId, skillId });
      if (this.store.getState().save.roster[this.equipTargetHeroId].chosenSkillId !== skillId) {
        this.syncEquipModal(this.store.getState());
        return;
      }
      this.pendingHeroSkillId = null;
      this.equipTipsKind = "skill";
      this.equipSkillTipsKind = "signature";
      this.syncEquipModal(this.store.getState());
    } else if (action === "choose-hero-skill") {
      const skillId = target.dataset.skillId;
      if (!skillId || !isHeroSkillId(skillId)) return;
      const chosenId = this.store.getState().save.roster[this.equipTargetHeroId].chosenSkillId;
      if (chosenId && chosenId !== skillId) {
        this.pendingHeroSkillId = skillId;
        this.syncEquipModal(this.store.getState());
        this.overlay.querySelector<HTMLElement>('[data-action="hero-skill-change-cancel"]')?.focus({ preventScroll: true });
        return;
      }
      this.store.dispatch({ type: "hero:chooseSkill", heroId: this.equipTargetHeroId, skillId });
      this.pendingHeroSkillId = null;
      this.equipTipsKind = "skill";
      this.equipSkillTipsKind = "signature";
      this.syncEquipModal(this.store.getState());
    } else if (action === "equip-hero-select") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      const state = this.store.getState();
      if (!heroId || !this.partyHeroIds(state).includes(heroId)) return;
      if (heroId === this.equipTargetHeroId) {
        const slot = state.save.party.indexOf(heroId);
        if (slot < 0 || slot >= getUnlockedPartySlotCount(state.save.highestClearedStage)) return;
        this.partyDraft = [...state.save.party];
        this.partyEditSlot = slot;
        this.partyEditSlotExplicit = true;
        this.equipPartyEditing = true;
        this.equipTipsKind = null;
        this.equipSkillTipsKind = null;
        this.equipGrowthKind = null;
        this.selectedTalentId = null;
        this.pendingHeroSkillId = null;
        this.selectedItemId = null;
        this.syncEquipModal(state);
        return;
      }
      this.equipTargetHeroId = heroId;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.equipGrowthKind = null;
      this.selectedTalentId = null;
      this.talentResetPending = false;
      this.pendingHeroSkillId = null;
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
      const state = this.store.getState();
      if (this.isOwnedByOtherHero(state, this.selectedItemId)) return;
      const item = state.save.inventory.find(({ instanceId }) => instanceId === this.selectedItemId);
      const progress = state.save.roster[heroId];
      if (!item || !canHeroEquipItem(progress.level, item)) {
        if (item) this.showToast(`需要英雄达到 ${getEquipmentLevel(item)} 级`);
        return;
      }
      const replacedItemId = progress.equipment[item.slot];
      const replacedItem = replacedItemId && replacedItemId !== item.instanceId
        ? state.save.inventory.find(({ instanceId }) => instanceId === replacedItemId) ?? null
        : null;
      const replacedGemCount = replacedItem?.sockets?.filter((socket) => Boolean(socket.gemId)).length ?? 0;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.store.dispatch({ type: "item:equip", heroId, itemId: this.selectedItemId });
      if (replacedItem && replacedGemCount > 0) {
        this.pendingGemReturnItemId = replacedItem.instanceId;
        this.openModal("gem-return");
      } else {
        this.syncEquipModal(this.store.getState());
      }
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
      this.syncEquipModal(this.store.getState());
    } else if (action === "shop-buy") {
      const offerId = target.dataset.offerId;
      if (!offerId) return;
      if (this.equipmentPopoverSource === "shop" && this.equipmentPopoverAnchorId === offerId) {
        this.closeEquipmentPopover();
      }
      this.store.dispatch({ type: "shop:buy", offerId });
    }
    else if (action === "shop-refresh") this.store.dispatch({ type: "shop:refresh" });
    else if (action === "shop-ad-refresh") void this.store.watchAd("shop");
    else if (action === "shop-ticket-refresh") void this.store.watchAd("shop", true);
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
    }
    else if (action === "hero-detail") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId || !this.store.getState().save.roster[heroId]?.unlocked) return;
      this.selectedHeroId = heroId;
      this.equipTargetHeroId = heroId;
      this.equipPartyEditing = false;
      this.partyEditSlotExplicit = false;
      this.partyDraft = [...this.store.getState().save.party];
      this.equipPanelTab = "stats";
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.equipGrowthKind = null;
      this.selectedTalentId = null;
      this.pendingHeroSkillId = null;
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
    } else if (action === "hero-ascend") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId) return;
      this.store.dispatch({ type: "hero:ascend", heroId });
      if (this.modal === "equip") this.syncEquipModal(this.store.getState());
    }
    else if (action === "summon-open") {
      this.openSummon();
    }
    else if (action === "summon-reveal-skip") this.completeSummonReveal();
    else if (action === "summon-single") this.store.dispatch({ type: "summon:single" });
    else if (action === "summon-five") this.store.dispatch({ type: "summon:five" });
    else if (action === "summon-track-open") {
      this.summonThemeDraft = getActiveSummonTheme(
        this.store.getState().save.personalSummonTheme,
      ).classId;
      this.summonSubview = "track";
      this.renderModal();
      this.syncModalFocus();
    }
    else if (action === "summon-probability-open") {
      this.summonProbabilityTab = "pool";
      this.summonSubview = "probability";
      this.renderModal();
      this.syncModalFocus();
    }
    else if (action === "summon-probability-tab") {
      const tab = target.dataset.tab;
      if (tab !== "pool" && tab !== "theme" && tab !== "guarantee") return;
      this.summonProbabilityTab = tab;
      this.renderModal();
      this.syncModalFocus();
      this.overlay.querySelector<HTMLElement>(`[data-action="summon-probability-tab"][data-tab="${tab}"]`)?.focus({ preventScroll: true });
    }
    else if (action === "summon-track-theme") {
      const classId = target.dataset.classId;
      if (!isSummonClassId(classId)) return;
      this.summonThemeDraft = classId;
      this.syncSummonTrackSelection();
    }
    else if (action === "summon-track-back") {
      this.summonSubview = null;
      this.renderModal();
      this.syncModalFocus();
      this.overlay.querySelector<HTMLElement>('[data-action="summon-track-open"]')?.focus({ preventScroll: true });
    }
    else if (action === "summon-probability-back") {
      this.summonSubview = null;
      this.renderModal();
      this.syncModalFocus();
      this.overlay.querySelector<HTMLElement>('[data-action="summon-probability-open"]')?.focus({ preventScroll: true });
    }
    else if (action === "summon-theme-reset-request") {
      this.summonSubview = "reset";
      this.renderModal();
      this.syncModalFocus();
    }
    else if (action === "summon-theme-reset-cancel") {
      this.summonSubview = null;
      this.renderModal();
      this.syncModalFocus();
      this.overlay.querySelector<HTMLElement>('[data-action="summon-theme-reset-request"]')?.focus({ preventScroll: true });
    }
    else if (action === "summon-theme-reset-confirm") {
      this.summonSubview = null;
      this.summonThemeDraft = getGlobalSummonTheme().classId;
      this.store.dispatch({ type: "summon:resetTheme" });
    }
    else if (action === "summon-theme-confirm" && this.summonThemeDraft) {
      this.summonSubview = null;
      this.store.dispatch({
        type: "summon:selectTheme",
        classId: this.summonThemeDraft,
        now: Date.now(),
      });
    }
    else if (action === "party-edit-open") {
      const state = this.store.getState();
      const unlockedSlots = getUnlockedPartySlotCount(state.save.highestClearedStage);
      const requestedSlot = Number(target.dataset.slot);
      this.partyDraft = [...state.save.party];
      this.partyEditSlot = Number.isInteger(requestedSlot) && requestedSlot >= 0 && requestedSlot < unlockedSlots
        ? requestedSlot
        : Math.min(this.partyEditSlot, unlockedSlots - 1);
      this.partyEditSlotExplicit = true;
      const firstPartyHero = this.partyDraft.find((heroId): heroId is HeroId => heroId !== null);
      if (firstPartyHero && !this.partyDraft.includes(this.equipTargetHeroId)) {
        this.equipTargetHeroId = firstPartyHero;
      }
      this.equipPartyEditing = true;
      this.equipTipsKind = null;
      this.equipSkillTipsKind = null;
      this.equipGrowthKind = null;
      this.selectedTalentId = null;
      this.selectedItemId = null;
      if (this.modal === "equip") this.syncEquipModal(state);
      else this.openModal("equip");
    } else if (action === "party-slot-locked") {
      const slotIndex = Number(target.dataset.slot);
      this.showToast(`第 ${slotIndex + 1} 个小队位置：${formatMainlineUnlockCondition(getPartySlotUnlockClearedStage(slotIndex))}`);
    } else if (action === "party-edit-slot") {
      const slot = Number(target.dataset.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= getUnlockedPartySlotCount(this.store.getState().save.highestClearedStage)) return;
      this.partyEditSlot = slot;
      this.partyEditSlotExplicit = true;
      this.syncEquipModal(this.store.getState());
    } else if (action === "party-edit-add") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      const state = this.store.getState();
      const unlockedSlots = getUnlockedPartySlotCount(state.save.highestClearedStage);
      if (!heroId || this.partyEditSlot < 0 || this.partyEditSlot >= unlockedSlots) return;
      if (!state.save.roster[heroId]?.unlocked || getBusyHeroIds(state.save.dungeonRuns).has(heroId)) return;
      if (this.partyDraft.includes(heroId)) return;
      const filledSlot = this.partyEditSlot;
      this.partyDraft[filledSlot] = heroId;
      const nextEmptySlot = this.partyDraft.findIndex((partyHeroId, index) => index < unlockedSlots && partyHeroId === null);
      this.partyEditSlot = nextEmptySlot >= 0 ? nextEmptySlot : filledSlot;
      this.partyEditSlotExplicit = false;
      this.syncEquipModal(state);
    } else if (action === "party-edit-remove") {
      const heroId = target.dataset.heroId as HeroId | undefined;
      if (!heroId) return;
      const slot = this.partyDraft.indexOf(heroId);
      if (slot < 0) return;
      if (this.partyEditSlotExplicit && slot !== this.partyEditSlot) {
        const targetHero = this.partyDraft[this.partyEditSlot] ?? null;
        this.partyDraft[this.partyEditSlot] = heroId;
        this.partyDraft[slot] = targetHero;
        const unlockedSlots = getUnlockedPartySlotCount(this.store.getState().save.highestClearedStage);
        const nextEmptySlot = this.partyDraft.findIndex((partyHeroId, index) => index < unlockedSlots && partyHeroId === null);
        if (nextEmptySlot >= 0) this.partyEditSlot = nextEmptySlot;
        this.partyEditSlotExplicit = false;
        this.syncEquipModal(this.store.getState());
        return;
      }
      if (this.partyDraft.filter((partyHeroId) => partyHeroId !== null).length === 1) {
        this.showToast("小队至少保留 1 名英雄");
        return;
      }
      this.partyDraft[slot] = null;
      this.partyEditSlot = slot;
      this.partyEditSlotExplicit = false;
      this.syncEquipModal(this.store.getState());
    } else if (action === "party-edit-cancel") {
      this.equipPartyEditing = false;
      this.partyEditSlotExplicit = false;
      this.partyDraft = [...this.store.getState().save.party];
      this.syncEquipModal(this.store.getState());
      this.overlay.querySelector<HTMLElement>(`.equip-party-strip [data-hero-id="${this.equipTargetHeroId}"]`)?.focus({ preventScroll: true });
    } else if (action === "party-edit-save") {
      const nextHero = this.partyDraft[this.partyEditSlot] ?? this.partyDraft.find((heroId): heroId is HeroId => heroId !== null);
      if (!nextHero) return;
      this.equipTargetHeroId = nextHero;
      this.selectedHeroId = nextHero;
      this.equipPartyEditing = false;
      this.partyEditSlotExplicit = false;
      this.store.dispatch({ type: "party:commit", party: [...this.partyDraft] });
      this.options.onPartySaved?.();
      this.showToast("阵容已应用，重新挑战当前关");
    } else if (action === "stages-panel-tab") {
      const tab = target.dataset.tab === "dungeon" ? "dungeon" : "mainline";
      if (tab === "dungeon" && !isExpeditionFeatureAvailable(this.store.getState().save.highestClearedStage)) {
        this.showToast(formatMainlineUnlockCondition(EXPEDITION_UNLOCK_CLEARED_STAGE));
        return;
      }
      if (tab === this.stagesPanelTab) return;
      this.stagesPanelTab = tab;
      this.renderStages(this.store.getState());
      this.syncDungeonTicker(this.store.getState());
    } else if (action === "stages-chapter-prev" || action === "stages-chapter-next") {
      const current = this.stagesChapter ?? stageToChapter(this.store.getState().save.currentStage);
      const delta = action === "stages-chapter-prev" ? -1 : 1;
      this.stagesChapter = Math.max(1, Math.min(CHAPTER_DEFINITIONS.length, current + delta)) as EquipmentChapter;
      this.renderStages(this.store.getState());
    } else if (action === "chapter-drops") {
      const chapter = Number(target.dataset.chapter) as EquipmentChapter;
      this.modalPayload = {
        chapter,
        difficulty: this.stagesDifficulty ?? this.store.getState().save.selectedDifficulty,
      };
      this.openModal("chapter-drops");
    } else if (action === "chapter-gifts") {
      this.modalPayload = Number(target.dataset.chapter) as EquipmentChapter;
      this.openModal("chapter-gifts");
    } else if (action === "stage-gift-claim") {
      const stage = Number(target.dataset.stage);
      this.store.dispatch({ type: "stageGift:claim", stage });
      (this.overlay.querySelector<HTMLButtonElement>('[data-action="stage-gift-claim"]')
        ?? this.overlay.querySelector<HTMLButtonElement>(".chapter-gifts-modal .modal-close"))
        ?.focus({ preventScroll: true });
    } else if (action === "chapter-drop-item") {
      const itemId = target.dataset.itemId;
      if (itemId && target instanceof HTMLButtonElement) this.toggleChapterDropItemTips(itemId, target);
    } else if (action === "chapter-set-tips") {
      const setId = target.dataset.setId as SetId | undefined;
      if (setId && SET_BY_ID[setId] && target instanceof HTMLButtonElement) this.toggleChapterSetTips(setId, target);
    } else if (action === "chapter-drop-item-tips-close") {
      const openTips = this.overlay.querySelector<HTMLElement>(".chapter-drop-item-tips");
      const itemId = openTips?.dataset.itemId;
      const setId = openTips?.dataset.setId;
      this.closeChapterDropItemTips();
      if (itemId) {
        this.overlay.querySelector<HTMLButtonElement>(`[data-action="chapter-drop-item"][data-item-id="${itemId}"]`)?.focus({ preventScroll: true });
      } else if (setId) {
        this.overlay.querySelector<HTMLButtonElement>(`[data-action="chapter-set-tips"][data-set-id="${setId}"]`)?.focus({ preventScroll: true });
      }
    } else if (action === "stage-select") {
      this.modalPayload = {
        stage: Number(target.dataset.stage),
        difficulty: this.stagesDifficulty ?? this.store.getState().save.selectedDifficulty,
      };
      this.openModal("stage-confirm");
    } else if (action === "stage-confirm") {
      const stage = Number(target.dataset.stage);
      const difficulty = target.dataset.difficulty as GameDifficulty;
      this.store.dispatch({ type: "stage:select", stage, difficulty });
      this.stagesPanelTab = "mainline";
      this.stagesDifficulty = difficulty;
      this.stagesChapter = stageToChapter(stage);
      this.options.onStageSelected?.(stage, difficulty);
      this.closeModal();
    } else if (action === "dungeon-select") {
      this.modalPayload = target.dataset.dungeonId;
      this.dispatchDraft = [];
      this.openModal("dungeon-confirm");
    } else if (action === "dispatch-reward-tips") {
      const popoverId = target.getAttribute("aria-controls");
      const popover = popoverId ? this.root.querySelector<HTMLElement>(`#${popoverId}`) : null;
      if (!popover) return;
      const shouldOpen = popover.hidden;
      this.closeDispatchRewardTips();
      if (shouldOpen) {
        popover.hidden = false;
        target.setAttribute("aria-expanded", "true");
      }
    } else if (action === "dispatch-auto-select") {
      this.autoSelectDispatchHeroes();
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
      this.showToast("该英雄正在远征中");
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
      if (this.modal === "dungeon-progress") this.closeModal();
      this.store.dispatch({ type: "dungeon:claim", dungeonId });
      this.stagesPanelTab = "dungeon";
    } else if (action === "dungeon-recall-request") {
      this.dungeonRecallPending = true;
      this.syncDungeonProgressModal(this.store.getState());
    } else if (action === "dungeon-recall-cancel") {
      this.dungeonRecallPending = false;
      this.syncDungeonProgressModal(this.store.getState());
    } else if (action === "dungeon-recall") {
      const dungeonId = target.dataset.dungeonId as DungeonId;
      this.dungeonRecallPending = false;
      if (this.modal === "dungeon-progress") this.closeModal();
      this.store.dispatch({ type: "dungeon:recall", dungeonId });
      this.stagesPanelTab = "dungeon";
    } else if (action === "dungeon-progress") {
      this.modalPayload = target.dataset.dungeonId;
      this.dungeonRecallPending = false;
      this.openModal("dungeon-progress");
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
    }
  }

  private onChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const action = target.dataset.action;
    if (this.inventoryFeature.handleChange(target)) {
      this.closeMaterialPopover();
      this.renderPanel(this.store.getState());
      return;
    }
    if (action === "augmentation-target") {
      const heroId = target.dataset.heroId as HeroId;
      this.store.dispatch({ type: "hero:setAugmentationTarget", heroId, targetHeroId: (target.value || null) as HeroId | null });
    } else if (action === "salvage-slot-filter") {
      this.salvageSlotFilter = target.value as typeof this.salvageSlotFilter;
      this.syncSalvageSelection(this.store.getState());
      this.renderModal();
    } else if (action === "stages-difficulty-select") {
      const difficulty = target.value as GameDifficulty;
      const state = this.store.getState();
      if (!DIFFICULTY_BY_ID[difficulty]
        || !isDifficultyUnlocked(difficulty, state.save.difficultyProgress)) return;
      this.stagesDifficulty = difficulty;
      const progress = state.save.difficultyProgress[difficulty];
      this.stagesChapter = stageToChapter(
        difficulty === state.save.selectedDifficulty
          ? state.save.currentStage
          : progress.highestUnlockedStage,
      );
      this.renderStages(state);
    } else if (action === "sound-toggle") {
      this.store.dispatch({ type: "settings:update", patch: { soundEnabled: (target as HTMLInputElement).checked } });
    } else if (action === "motion-toggle") {
      this.store.dispatch({ type: "settings:update", patch: { reducedMotion: (target as HTMLInputElement).checked } });
    }
  }

  private syncSummonTrackSelection(): void {
    if (this.modal !== "summon" || this.summonSubview !== "track" || !this.summonThemeDraft) return;
    const state = this.store.getState();
    for (const card of this.overlay.querySelectorAll<HTMLButtonElement>('[data-action="summon-track-theme"]')) {
      const selected = card.dataset.classId === this.summonThemeDraft;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-selected", String(selected));
      const check = card.querySelector<HTMLElement>(".summon-track-check");
      if (check) check.textContent = selected ? "✓" : "";
    }
    const selectedAlreadyActive = Boolean(
      state.save.personalSummonTheme
      && state.save.personalSummonTheme.expiresAt > Date.now()
      && state.save.personalSummonTheme.classId === this.summonThemeDraft,
    );
    const confirm = this.overlay.querySelector<HTMLButtonElement>('[data-action="summon-theme-confirm"]');
    if (!confirm) return;
    confirm.disabled = selectedAlreadyActive || state.save.gems < SUMMON_THEME_SELECTION_COST;
    const label = confirm.querySelector<HTMLElement>("span");
    const cost = confirm.querySelector<HTMLElement>("small");
    if (label) label.textContent = selectedAlreadyActive ? "当前定轨已生效" : "确认定轨";
    if (cost) cost.hidden = selectedAlreadyActive;
  }

  private clearSummonRevealTimers(): void {
    for (const timer of this.summonRevealTimers) clearTimeout(timer);
    this.summonRevealTimers.clear();
  }

  private scheduleSummonRevealStep(callback: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.summonRevealTimers.delete(timer);
      callback();
    }, delay);
    this.summonRevealTimers.add(timer);
  }

  private startSummonReveal(results: SummonPullResult[]): void {
    this.clearSummonRevealTimers();
    this.summonResults = null;
    this.summonPendingResults = [...results];
    this.summonRevealPhase = "charging";

    if (this.modal !== "summon") {
      this.completeSummonReveal();
      return;
    }

    this.renderModal();
    this.syncModalFocus();
    const reducedMotion = this.store.getState().save.settings.reducedMotion;
    this.scheduleSummonRevealStep(() => {
      if (!this.summonPendingResults || this.modal !== "summon") return;
      this.summonRevealPhase = "omen";
      this.syncSummonRevealPhase();
    }, reducedMotion ? 80 : 720);
    this.scheduleSummonRevealStep(
      () => this.completeSummonReveal(),
      reducedMotion ? 280 : 1700,
    );
  }

  private syncSummonRevealPhase(): void {
    const modal = this.overlay.querySelector<HTMLElement>(".summon-modal.is-revealing");
    if (!modal || !this.summonRevealPhase) return;
    modal.classList.toggle("is-charging", this.summonRevealPhase === "charging");
    modal.classList.toggle("is-omen", this.summonRevealPhase === "omen");
    modal.setAttribute("aria-label", this.summonRevealPhase === "omen" ? "命运显形" : "星辉汇聚");
    const title = modal.querySelector<HTMLElement>(".summon-heading h2");
    const statusTitle = modal.querySelector<HTMLElement>(".summon-ritual-status strong");
    const statusCopy = modal.querySelector<HTMLElement>(".summon-ritual-status span");
    const omenPull = this.summonPendingResults?.find((pull) => pull.kind === "unlock")
      ?? this.summonPendingResults?.[0];
    if (title) title.textContent = this.summonRevealPhase === "omen" ? "命运显形" : "星辉汇聚";
    if (statusTitle) {
      statusTitle.textContent = this.summonRevealPhase === "omen"
        ? omenPull?.kind === "unlock"
          ? "新的英雄气息"
          : omenPull?.kind === "marks"
            ? "英雄共鸣"
            : "星辉凝成奖励"
        : "星辉正在回应";
    }
    if (statusCopy) statusCopy.textContent = this.summonRevealPhase === "omen" ? "命运即将揭晓" : "召唤仪式进行中";
  }

  private completeSummonReveal(): void {
    const results = this.summonPendingResults;
    if (!results) return;
    this.clearSummonRevealTimers();
    this.summonPendingResults = null;
    this.summonRevealPhase = null;
    this.summonResults = results;
    this.announceSummonResults(results);
    if (this.modal === "summon") {
      this.renderModal();
      this.syncModalFocus();
    }
  }

  private announceSummonResults(results: SummonPullResult[]): void {
    if (this.modal === "summon") return;
    const unlocked = results.filter((pull) => pull.kind === "unlock");
    if (unlocked.length === 1) {
      this.showToast(`新英雄加入 · ${HERO_BY_ID[unlocked[0]!.heroId].name}`);
    } else if (unlocked.length > 1) {
      this.showToast(`新英雄 ×${unlocked.length}`);
    } else if (results.length === 1 && results[0]!.kind === "marks") {
      const pull = results[0]!;
      this.showToast(`${HERO_BY_ID[pull.heroId].name} +${pull.marks} 碎片`);
    } else if (results.length === 1) {
      const pull = results[0]!;
      if (pull.kind === "unlock" || pull.kind === "marks") return;
      const name = pull.kind === "universalMarks"
        ? "通用英雄碎片"
        : pull.kind === "ascendStone"
          ? "进阶石"
          : pull.kind === "exp"
            ? "英雄经验"
            : "金币";
      this.showToast(`${name} +${pull.amount}`);
    } else if (results.length > 1) {
      this.showToast("召唤完成 · 奖励已领取");
    }
  }

  private presentAppEvents(events: readonly AppEvent[]): void {
    for (const event of events) {
      if (event.type === "toast") this.showToast(event.message);
      if (event.type === "craft:gemRankFused") {
        this.showToast(`合成成功 · ${MATERIAL_BY_ID[event.resultId].name}`);
      }
      if (event.type === "craft:allGemsFused") {
        this.showToast(`全部一键合成 ${event.crafted} 次 · ${event.families} 类宝石`);
      }
      if (event.type === "gems:returned") {
        if (event.source !== "salvage") {
          const prefix = event.source === "equipment" ? "宝石已卸下并返还" : "宝石已自动卸下并返还";
          this.showToast(`${prefix} ×${event.count}`);
        }
      }
      if (event.type === "resources:earned") {
        const state = this.store.getState();
        this.resourceRewardAnimator.animate(
          event.rewards,
          event.source,
          {
            exp: state.save.exp,
            gold: state.save.gold,
            gems: state.save.gems,
          },
          state.save.settings.reducedMotion,
          this.pendingResourceRewardOrigin?.source === event.source
            ? this.pendingResourceRewardOrigin
            : null,
        );
        this.pendingResourceRewardOrigin = null;
      }
      if (
        event.type === "alchemy:crafted" ||
        event.type === "craft:imprinted" ||
        event.type === "craft:socketed" ||
        event.type === "craft:reset" ||
        event.type === "craft:smelted" ||
        event.type === "craft:inlaid" ||
        event.type === "craft:gemRemoved"
      ) {
        this.modalPayload = event;
        this.openModal("craft-result");
      }
      if (event.type === "lootChest:opened") {
        this.revealLootChestRewards(event);
        this.renderTopbar(this.store.getState());
        this.renderLootChest(this.store.getState());
        if (this.store.getState().ui.activeTab === "inventory") {
          this.renderPanel(this.store.getState());
        }
      }
      if (event.type === "ability:upgraded") {
        const definition = ABILITY_DEFINITIONS.find((ability) => ability.id === event.abilityId);
        if (definition) this.liveRegion.textContent = `${definition.name}已升至 ${event.level} 级`;
      }
      if (event.type === "hero:starred" || event.type === "hero:ascended") {
        this.modalPayload = event;
        this.openModal("hero-growth-result");
      }
      if (event.type === "summon:completed") {
        this.startSummonReveal(event.results);
      }
    }
  }

  private syncCheckInEntry(): void {
    const entry = this.root.querySelector<HTMLButtonElement>(".activity-entry");
    const save = this.store.getState().save;
    const available = getCheckInStatus(save.checkIn).canClaim || hasTaskRewards(save) || hasVipRewards(save);
    if (entry && entry.dataset.claimable !== String(available)) {
      entry.dataset.claimable = String(available);
      entry.setAttribute("aria-label", available ? "活动，有奖励可领取" : "活动");
    }
  }

  private syncModalFocus(): void {
    const dialogs = this.overlay.querySelectorAll<HTMLElement>('[role="dialog"], .activities-page');
    const dialog = dialogs[dialogs.length - 1];
    for (const surface of this.root.querySelectorAll<HTMLElement>('.game-shell > :not(.overlay-layer)')) {
      surface.inert = Boolean(dialog);
    }
    if (dialog && !dialog.contains(document.activeElement)) {
      const preferred = dialog.querySelector<HTMLElement>("[autofocus]");
      if (preferred) {
        preferred.focus({ preventScroll: true });
      } else {
        dialog.tabIndex = -1;
        dialog.focus({ preventScroll: true });
      }
    } else if (!dialog && this.modalReturnFocus) {
      const target = this.modalReturnFocus.isConnected
        ? this.modalReturnFocus
        : this.nav.querySelector<HTMLElement>('button.active');
      this.modalReturnFocus = null;
      target?.focus({ preventScroll: true });
    }
  }

  private openSummon(): void {
    this.clearSummonRevealTimers();
    this.summonResults = null;
    this.summonPendingResults = null;
    this.summonRevealPhase = null;
    this.summonSubview = null;
    this.summonProbabilityTab = "pool";
    this.summonThemeDraft = getActiveSummonTheme(this.store.getState().save.personalSummonTheme).classId;
    this.openModal("summon");
  }

  private openModal(name: string): void {
    if (this.equipmentPopoverSource) this.closeEquipmentPopover(name !== "equip");
    if (this.materialPopoverSource) this.closeMaterialPopover();
    if (!this.modal && document.activeElement instanceof HTMLElement) this.modalReturnFocus = document.activeElement;
    this.modal = name;
    this.renderModal();
    this.syncModalFocus();
  }

  private finishGemReturnPrompt(): void {
    this.pendingGemReturnItemId = null;
    this.modalPayload = null;
    this.modal = "equip";
    this.renderModal();
    this.syncModalFocus();
  }

  private finishHeroGrowthResult(): void {
    this.modalPayload = null;
    this.equipGrowthKind = null;
    this.modal = "equip";
    this.renderModal();
    this.syncModalFocus();
  }

  private openTaskRewardTips(anchor: HTMLElement, period: TaskPeriod, points: number): void {
    const tips = this.overlay.querySelector<HTMLElement>(".task-reward-tips");
    if (!tips) return;
    const wasOpen = !tips.hidden && tips.dataset.points === String(points);
    this.closeTaskRewardTips();
    if (wasOpen) return;
    const save = this.store.getState().save;
    tips.innerHTML = renderTaskMilestoneTips(save, period, points);
    if (!tips.innerHTML) return;
    tips.dataset.points = String(points);
    tips.dataset.key = save.recurringTasks[period].key;
    tips.hidden = false;
    anchor.setAttribute("aria-expanded", "true");
    anchor.setAttribute("aria-describedby", "task-reward-tips");
    const rect = anchor.getBoundingClientRect();
    const bounds = this.overlay.querySelector(".activities-page")!.getBoundingClientRect();
    const parent = tips.offsetParent as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const scaleX = parentRect.width / parent.offsetWidth;
    const scaleY = parentRect.height / parent.offsetHeight;
    const tipRect = tips.getBoundingClientRect();
    const left = Math.max(bounds.left + 8, Math.min(rect.left + rect.width / 2 - tipRect.width / 2, bounds.right - tipRect.width - 8));
    const below = rect.bottom + 10 + tipRect.height <= bounds.bottom - 8;
    const top = below ? rect.bottom + 10 : Math.max(bounds.top + 8, rect.top - tipRect.height - 10);
    tips.dataset.side = below ? "below" : "above";
    tips.style.setProperty("--tip-anchor", `${Math.max(12, Math.min(tips.offsetWidth - 16, (rect.left + rect.width / 2 - left) / scaleX))}px`);
    tips.style.left = `${(left - parentRect.left) / scaleX - parent.clientLeft}px`;
    tips.style.top = `${(top - parentRect.top) / scaleY - parent.clientTop}px`;
    const scroller = this.overlay.querySelector<HTMLElement>(".recurring-task-list");
    if (scroller) scroller.onscroll = () => this.closeTaskRewardTips();
  }

  private closeTaskRewardTips(restoreFocus = false): void {
    const tips = this.overlay.querySelector<HTMLElement>(".task-reward-tips:not([hidden])");
    if (!tips) return;
    tips.hidden = true;
    const anchor = this.overlay.querySelector<HTMLElement>(`[data-action="task-milestone-tips"][data-points="${tips.dataset.points}"]`);
    anchor?.setAttribute("aria-expanded", "false");
    anchor?.removeAttribute("aria-describedby");
    if (restoreFocus) anchor?.focus({ preventScroll: true });
  }

  private closeModal(): void {
    if (this.modal === "summon" && this.summonSubview) {
      const returnAction = this.summonSubview === "track"
        ? "summon-track-open"
        : this.summonSubview === "probability"
          ? "summon-probability-open"
          : "summon-theme-reset-request";
      this.summonSubview = null;
      this.renderModal();
      this.syncModalFocus();
      this.overlay.querySelector<HTMLElement>(`[data-action="${returnAction}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (this.modal === "gem-return") {
      this.finishGemReturnPrompt();
      return;
    }
    if (this.modal === "hero-growth-result") {
      this.finishHeroGrowthResult();
      return;
    }
    if (this.modal === "summon") {
      this.clearSummonRevealTimers();
      this.summonPendingResults = null;
      this.summonRevealPhase = null;
      this.summonSubview = null;
    }
    this.modal = null;
    this.modalPayload = null;
    this.dispatchDraft = [];
    this.dungeonRecallPending = false;
    this.lootChestCloseAfterClaim = false;
    this.equipTipsKind = null;
    this.equipSkillTipsKind = null;
    this.equipGrowthKind = null;
    this.equipPartyEditing = false;
    this.battleDetailsHeroId = null;
    this.partyEditSlotExplicit = false;
    this.partyDraft = [...this.store.getState().save.party];
    this.selectedTalentId = null;
    this.talentResetPending = false;
    this.pendingHeroSkillId = null;
    this.renderModal();
    this.syncModalFocus();
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
      if (this.modal === "dungeon-progress") this.syncDungeonProgressModal(current);
      if (!current.save.dungeonRuns.some((run) => getDungeonRunStatus(run) === "running") && this.dungeonTicker) {
        clearInterval(this.dungeonTicker);
        this.dungeonTicker = null;
      }
    }, 5000);
  }

  private showToast(message: string): void {
    const toast = this.root.querySelector<HTMLElement>(".toast-stack")!;
    toast.textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    this.liveRegion.textContent = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  private showBanner(
    title: string,
    kind: "boss" | "victory" | "defeat",
    detail: string,
  ): void {
    const frame = this.root.querySelector(".battle-frame");
    frame?.querySelector(".battle-banner")?.remove();
    const banner = document.createElement("div");
    banner.className = `battle-banner ${kind}`;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-atomic", "true");
    banner.setAttribute("aria-label", `${title}，${detail}`);
    const icon = kind === "boss"
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 4 4m10-4-4 4"/><path d="M6.5 10.5 12 5l5.5 5.5v5.8L12 20l-5.5-3.7Z"/><path d="M9.5 13h.01m5 0h.01M10 16h4"/></svg>`
      : kind === "victory"
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 19 6v5.1c0 4.4-2.7 7.7-7 9.7-4.3-2-7-5.3-7-9.7V6Z"/><path d="m8.2 12.1 2.5 2.5 5.3-5.4"/></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 19 6v5.1c0 4.4-2.7 7.7-7 9.7-4.3-2-7-5.3-7-9.7V6Z"/><path d="m13.6 6.8-3 5.1h3l-3.2 5.5"/></svg>`;
    banner.innerHTML = `
      <span class="battle-banner-sweep" aria-hidden="true"></span>
      <span class="battle-banner-emblem" aria-hidden="true">${icon}</span>
      <span class="battle-banner-copy">
        <strong></strong>
        <small></small>
      </span>
    `;
    banner.querySelector("strong")!.textContent = title;
    banner.querySelector("small")!.textContent = detail;
    frame?.append(banner);
    const reducedMotion = this.root.classList.contains("reduced-motion");
    const duration = reducedMotion ? 500 : kind === "boss" ? 1500 : kind === "victory" ? 1300 : 1450;
    const timer = setTimeout(() => {
      banner.remove();
      this.bannerTimers.delete(timer);
    }, duration);
    this.bannerTimers.add(timer);
  }
}
import { renderAugmentationTargetControl } from "./features/heroes/AugmentationTargetControl";
