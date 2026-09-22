import type { GameStoreState } from "../../../app/GameStore";
import { CHAPTER_ATMOSPHERES } from "../../../content/chapterMaps";
import {
  CHAPTER_DEFINITIONS,
  CHAPTER_NUMERAL,
  chapterStartStage,
  stageToChapter,
} from "../../../content/chapters";
import { DAMAGE_ELEMENT_LABEL } from "../../../content/damageElements";
import {
  DIFFICULTY_DEFINITIONS,
  isDifficultyUnlocked,
  type GameDifficulty,
} from "../../../content/difficulties";
import {
  DAILY_DUNGEON_COUNT,
  DUNGEON_BY_ID,
  EXPEDITION_UNLOCK_CLEARED_STAGE,
  getDailyDungeonIds,
  getExpeditionRequirements,
  isDungeonUnlocked,
  isExpeditionFeatureAvailable,
} from "../../../content/dungeons";
import { EQUIPMENT_SLOTS, type EquipmentChapter, type ItemDefinition } from "../../../content/items";
import { MATERIAL_BY_ID } from "../../../content/materials";
import { STAGE_DEFINITIONS } from "../../../content/stages";
import { getDateKey } from "../../../domain/time/GameDay";
import {
  getDungeonRun,
  getDungeonRunProgress,
  getDungeonRunStatus,
} from "../../../progression/DungeonSystem";
import { getChapterEquipmentDropPool } from "../../../progression/EquipmentPool";
import { EXPEDITION_ICONS, EXPEDITION_LOCK_ICON, STAGE_GIFT_ICON } from "../../icons";

export interface StagesViewOptions {
  panel: "mainline" | "dungeon";
  chapter: EquipmentChapter | null;
  difficulty: GameDifficulty | null;
  equipmentArt: (src: string) => string;
  equipmentDropRarityRange: (
    items: readonly ItemDefinition[],
    chapter: EquipmentChapter,
    difficulty: GameDifficulty,
  ) => string;
  formatMainlineUnlockCondition: (clearedStage: number) => string;
}

export interface StagesViewResult {
  html: string;
  chapter: EquipmentChapter;
  difficulty: GameDifficulty;
}

export function renderStagesView(state: GameStoreState, options: StagesViewOptions): StagesViewResult {
  const requestedDifficulty = options.difficulty ?? state.save.selectedDifficulty;
  const difficulty = isDifficultyUnlocked(requestedDifficulty, state.save.difficultyProgress)
    ? requestedDifficulty
    : "easy";
  const progress = state.save.difficultyProgress[difficulty];
  const chapter = options.chapter ?? stageToChapter(
    difficulty === state.save.selectedDifficulty ? state.save.currentStage : progress.highestUnlockedStage,
  );
  const claimedStageGiftStages = new Set(state.save.claimedStageGiftStages);
  const mainlineBody = renderChapter(state, options, chapter, difficulty, claimedStageGiftStages);
  const expedition = renderExpeditions(state, options);
  const unlockedDifficulties = DIFFICULTY_DEFINITIONS.filter((entry) =>
    isDifficultyUnlocked(entry.id, state.save.difficultyProgress));
  const canSwitchDifficulty = unlockedDifficulties.length > 1;
  const difficultySelect = `<label class="stages-difficulty-control"><span class="sr-only">主线难度</span><select class="filter-select stages-difficulty-select" data-action="stages-difficulty-select" aria-label="主线难度" ${canSwitchDifficulty ? "" : "disabled"}>${unlockedDifficulties.map((entry) => {
    const entryProgress = state.save.difficultyProgress[entry.id];
    const label = canSwitchDifficulty ? `${entry.shortLabel} · ${entryProgress.highestClearedStage}/120` : entry.shortLabel;
    return `<option value="${entry.id}" ${entry.id === difficulty ? "selected" : ""}>${label}</option>`;
  }).join("")}</select></label>`;
  const html = `<div class="panel-heading compact" data-panel="stages"><div class="stages-panel-tabs" role="tablist" aria-label="关卡模式"><button type="button" class="stages-panel-tab ${options.panel === "mainline" ? "active" : ""}" data-action="stages-panel-tab" data-tab="mainline" role="tab" aria-selected="${options.panel === "mainline"}">主线</button><button type="button" class="stages-panel-tab ${options.panel === "dungeon" ? "active" : ""}" data-action="stages-panel-tab" data-tab="dungeon" role="tab" aria-selected="${options.panel === "dungeon"}" ${expedition.available ? "" : "disabled"} aria-label="${expedition.available ? "远征" : options.formatMainlineUnlockCondition(EXPEDITION_UNLOCK_CLEARED_STAGE)}">远征</button></div>${options.panel === "dungeon" ? `<span class="panel-meta">今日已解锁 ${expedition.dailyReady}/${DAILY_DUNGEON_COUNT}</span>` : difficultySelect}</div>${options.panel === "dungeon" ? expedition.html : mainlineBody}`;
  return { html, chapter, difficulty };
}

function renderChapter(
  state: GameStoreState,
  options: StagesViewOptions,
  chapter: EquipmentChapter,
  difficulty: GameDifficulty,
  claimedStageGiftStages: ReadonlySet<number>,
): string {
  const meta = CHAPTER_DEFINITIONS[chapter - 1]!;
  const atmosphere = CHAPTER_ATMOSPHERES[chapter];
  const stages = STAGE_DEFINITIONS.filter((stage) => stage.chapter === chapter);
  const claimableGiftCount = stages.filter((stage) => stage.stage <= state.save.highestClearedStage && !claimedStageGiftStages.has(stage.stage)).length;
  const claimedGiftCount = stages.filter((stage) => claimedStageGiftStages.has(stage.stage)).length;
  const progress = state.save.difficultyProgress[difficulty];
  const unlockedChapter = progress.highestUnlockedStage >= chapterStartStage(chapter);
  const dropPool = getChapterEquipmentDropPool(chapter);
  const dropRarityRange = options.equipmentDropRarityRange(dropPool, chapter, difficulty);
  const dropPreviewItems = EQUIPMENT_SLOTS.flatMap((slot) => {
    const slotItems = dropPool.filter((item) => item.slot === slot);
    return slotItems.find((item) => item.chapter === chapter) ?? slotItems[0] ?? [];
  }).slice(0, 4);
  const dropEntry = `<button type="button" class="chapter-drop-entry" data-action="chapter-drops" data-chapter="${chapter}" aria-label="查看第${CHAPTER_NUMERAL[chapter]}章掉落装备，${dropPool.length}件，${dropRarityRange}"><span class="chapter-drop-entry-copy"><strong>掉落装备</strong><small>${dropPool.length} 件 · ${dropRarityRange}</small></span><span class="chapter-drop-entry-icons" aria-hidden="true">${dropPreviewItems.map((item) => options.equipmentArt(item.icon)).join("")}</span><span class="chapter-drop-entry-link" aria-hidden="true">查看 <b>›</b></span></button>`;
  const atmosphereArt = `<div class="chapter-atmosphere" aria-hidden="true">${atmosphere.layers.map((src, index) => `<img class="chapter-atmosphere-layer layer-${index}" src="${src}" alt="" draggable="false" />`).join("")}</div>`;
  const giftLabel = claimableGiftCount > 0
    ? `第${CHAPTER_NUMERAL[chapter]}章关卡礼包，${claimableGiftCount}份待领取`
    : `第${CHAPTER_NUMERAL[chapter]}章关卡礼包，已领取${claimedGiftCount}/${stages.length}`;
  const navigation = `<div class="chapter-switcher" role="group" aria-label="章节切换"><button type="button" class="chapter-switch-button" data-action="stages-chapter-prev" ${chapter === 1 ? "disabled" : ""} aria-label="上一章">‹</button><div class="chapter-switch-title" aria-live="polite"><small>第${CHAPTER_NUMERAL[chapter]}章</small><span class="chapter-title-row"><strong>${meta.name}</strong><button type="button" class="chapter-gift-entry ${claimableGiftCount > 0 ? "claimable" : ""}" data-action="chapter-gifts" data-chapter="${chapter}" aria-label="${giftLabel}" ${unlockedChapter ? "" : "disabled"}><span aria-hidden="true">${STAGE_GIFT_ICON}</span>${claimableGiftCount > 0 ? `<b>${claimableGiftCount}</b>` : ""}</button></span></div><button type="button" class="chapter-switch-button" data-action="stages-chapter-next" ${chapter === CHAPTER_DEFINITIONS.length ? "disabled" : ""} aria-label="下一章">›</button></div>`;
  if (chapter > 1 && !unlockedChapter) {
    return `<section class="chapter-section chapter-${chapter} locked" aria-label="${meta.name}未解锁">${atmosphereArt}${navigation}<div class="chapter-locked-map"><div class="chapter-locked-card"><span class="chapter-lock-mark" aria-hidden="true"></span><strong>本章尚未解锁</strong><small>通关 ${chapter - 1}-12 解锁</small></div>${dropEntry}</div></section>`;
  }
  return `<section class="chapter-section chapter-${chapter}">${atmosphereArt}${navigation}<div class="stage-map" data-chapter-map="${chapter}" role="list" aria-label="${meta.name}关卡列表">${stages.map((stage, index) => {
    const unlocked = stage.stage <= progress.highestUnlockedStage;
    const isCleared = stage.stage <= progress.highestClearedStage;
    const isCurrent = difficulty === state.save.selectedDifficulty && state.save.currentStage === stage.stage;
    const localStage = index + 1;
    return `<button class="stage-node ${isCurrent ? "current" : ""} ${isCleared ? "cleared" : ""} ${localStage === 12 ? "boss" : ""}" data-action="${unlocked ? "stage-select" : "locked-stage"}" data-stage="${stage.stage}" ${unlocked ? "" : "disabled"} aria-label="${meta.name} ${stage.id}${isCleared ? "，已通关" : unlocked ? "" : "，未解锁"}" role="listitem"><span>${unlocked ? localStage : "🔒"}</span><small>${stage.id}</small></button>`;
  }).join("")}${dropEntry}</div></section>`;
}

function renderExpeditions(state: GameStoreState, options: StagesViewOptions): { html: string; available: boolean; dailyReady: number } {
  const dateKey = state.save.shop.dateKey || getDateKey();
  const dailyIds = getDailyDungeonIds(dateKey);
  const dailyDungeons = dailyIds.map((id) => DUNGEON_BY_ID[id]);
  const activeRunIds = [...state.save.dungeonRuns]
    .sort((left, right) => Number(getDungeonRunStatus(right) === "ready") - Number(getDungeonRunStatus(left) === "ready"))
    .map((run) => run.dungeonId);
  const visibleIds = [...activeRunIds, ...dailyIds.filter((id) => !activeRunIds.includes(id))];
  const available = isExpeditionFeatureAvailable(state.save.highestClearedStage);
  const dailyReady = available ? dailyDungeons.filter((dungeon) => isDungeonUnlocked(dungeon, state.save.highestClearedStage)).length : 0;
  const html = `<div class="dungeon-grid" role="list" aria-label="远征列表">${visibleIds.map((id) => DUNGEON_BY_ID[id]).map((dungeon) => {
    if (!isDungeonUnlocked(dungeon, state.save.highestClearedStage)) {
      const unlockCondition = options.formatMainlineUnlockCondition(dungeon.unlockClearedStage);
      return `<div class="dungeon-card expedition-card locked" role="listitem" aria-label="${dungeon.name}，未解锁，${unlockCondition}"><span class="expedition-locked-icon" aria-hidden="true">${EXPEDITION_LOCK_ICON}</span><span class="expedition-lock-condition">${unlockCondition}</span></div>`;
    }
    const run = getDungeonRun(state.save.dungeonRuns, dungeon.id);
    const status = getDungeonRunStatus(run);
    const runProgress = run ? getDungeonRunProgress(run) : null;
    const requirements = getExpeditionRequirements(dungeon.id, dateKey);
    const primaryMaterial = MATERIAL_BY_ID[dungeon.drops[0]!.materialId];
    const environmentElements = dungeon.environment.favoredElements.map((element) => DAMAGE_ELEMENT_LABEL[element]).join("/");
    const environmentBonus = Math.round(dungeon.environment.staminaBonusPct * 100);
    const drops = dungeon.drops.map((drop) => {
      const material = MATERIAL_BY_ID[drop.materialId];
      const amount = drop.bonusChance > 0 ? `${drop.amount}–${drop.amount + 1}` : `${drop.amount}`;
      const popoverId = `expedition-drop-${dungeon.id}-${drop.materialId}`;
      return `<span class="dispatch-reward-control expedition-drop-control"><button type="button" class="dispatch-reward-icon expedition-drop-icon" data-action="dispatch-reward-tips" aria-label="查看${material.name}" aria-expanded="false" aria-controls="${popoverId}"><img src="${material.icon}" alt="" aria-hidden="true" draggable="false" /></button><span class="dispatch-reward-popover expedition-drop-popover" id="${popoverId}" role="note" hidden><strong>${material.name}</strong><small>预计掉落 ×${amount}</small></span></span>`;
    }).join("");
    const action = run ? "dungeon-progress" : "dungeon-select";
    const statusLabel = status === "ready" ? "已返程" : status === "running" ? "远征中" : "";
    const staminaPercent = runProgress ? Math.round((runProgress.remainingStamina / runProgress.maxStamina) * 100) : 100;
    const expeditionMeta = runProgress
      ? status === "ready" ? `<span>收获 ${runProgress.rewardSteps}</span>` : `<span>体力 ${runProgress.remainingStamina}/${runProgress.maxStamina}</span><span>收获 ${runProgress.rewardSteps}</span>`
      : `<span>${dungeon.partySize} 名英雄</span><span>${dungeon.environment.label} · ${environmentElements} +${environmentBonus}%</span>`;
    const progressLabel = runProgress ? status === "ready" ? `，已探索 ${runProgress.completedSteps} 次，收获 ${runProgress.rewardSteps} 次` : `，体力 ${runProgress.remainingStamina}/${runProgress.maxStamina}，已探索 ${runProgress.completedSteps} 次` : "";
    const requirementSummary = !run && requirements.length > 0 ? `<span class="expedition-requirements"><b>今日条件</b>${requirements.map((requirement) => `<span>${requirement.label}</span>`).join("")}</span>` : "";
    const requirementLabel = !run && requirements.length > 0 ? `，今日条件：${requirements.map((requirement) => requirement.label).join("，")}` : "";
    return `<article class="dungeon-card expedition-card tone-${primaryMaterial.tone} ${requirementSummary ? "has-requirements" : ""} ${status === "running" ? "current" : ""} ${status === "ready" ? "ready" : ""}" role="listitem" style="--expedition-progress:${staminaPercent}%"><button type="button" class="expedition-card-open" data-action="${action}" data-dungeon-id="${dungeon.id}" aria-label="${dungeon.name}${statusLabel ? `，${statusLabel}` : ""}${progressLabel}${requirementLabel}"><span class="expedition-art" aria-hidden="true">${EXPEDITION_ICONS[dungeon.id]}</span><span class="expedition-card-main"><span class="expedition-heading"><strong>${dungeon.name}</strong>${runProgress ? "" : `<span class="expedition-meta">${expeditionMeta}</span>`}${statusLabel ? `<em>${statusLabel}${status === "ready" ? '<i class="expedition-ready-dot" aria-hidden="true"></i>' : ""}</em>` : ""}</span>${status === "running" && runProgress ? `<span class="expedition-meta expedition-running-meta">${expeditionMeta}</span><span class="expedition-card-progress"><span class="expedition-progress" role="progressbar" aria-label="剩余体力" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${staminaPercent}"><i></i></span><b>${staminaPercent}%</b></span>` : ""}${requirementSummary}</span></button>${status === "ready" && runProgress ? `<span class="expedition-run-summary"><span class="expedition-meta">${expeditionMeta}</span></span>` : runProgress ? "" : `<span class="expedition-drops" aria-label="可能掉落">${drops}</span>`}</article>`;
  }).join("")}</div>`;
  return { html, available, dailyReady };
}
