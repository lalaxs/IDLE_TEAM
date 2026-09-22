import type { GameStoreState } from "../../../app/GameStore";
import type { AppEvent } from "../../../app/events";
import {
  AFFIX_BY_ID,
  SMELT_AFFIX_POWER_MULTIPLIER,
  affixDisplaysPercent,
  formatAffixValue,
  type AffixId,
} from "../../../content/affixes";
import { ITEM_BY_ID, RARITY_LABELS, type Rarity } from "../../../content/items";
import {
  MATERIAL_BY_ID,
  MAX_EQUIPMENT_SOCKETS,
  type MaterialId,
} from "../../../content/materials";
import { SET_BY_ID, SET_DEFINITIONS, type SetId } from "../../../content/sets";
import {
  ALCHEMY_STATION_MAX_LEVEL,
  getAlchemyExperienceToNext,
  getAlchemyStationLevelCap,
} from "../../../progression/AlchemySystem";
import { getEquipmentLevel } from "../../../progression/EquipmentSystem";
import { canImprintSetOnSlot, getSmeltAffixChoices } from "../../../progression/GearCraftSystem";
import {
  equipmentArt,
  equipmentSpecialMarks,
  rarityClass,
} from "../../shared/presentation";
import {
  itemAttributeEntries,
  itemEffectEntries,
  setBonusText,
} from "../../shared/equipmentPresentation";
import type { CraftFeature } from "./CraftFeature";
import { craftAffixRangeText } from "./CraftView";

type CraftResultEvent = Extract<
  AppEvent,
  {
    type:
      | "alchemy:crafted"
      | "craft:imprinted"
      | "craft:socketed"
      | "craft:reset"
      | "craft:smelted"
      | "craft:inlaid"
      | "craft:gemRemoved";
  }
>;

export interface SetImprintPickerPayload {
  itemId?: string;
  draftSetId?: SetId | null;
}

export function renderResetAffixModal(
  state: GameStoreState,
  feature: CraftFeature,
): string | null {
  const target = feature.targetId
    ? state.save.inventory.find((item) => item.instanceId === feature.targetId) ?? null
    : null;
  if (!target || target.affixes.length === 0) return null;

  const lockedIndex = typeof target.resetAffixIndex === "number" ? target.resetAffixIndex : null;
  const selectedIndex = feature.resetAffixIndex;
  const rows = target.affixes
    .map((roll, index) => {
      const lockedOut = lockedIndex != null && lockedIndex !== index;
      const selected = selectedIndex === index;
      const label = `${roll.greater ? "★" : ""}${formatAffixValue(roll.affixId, roll.value)}`;
      const range = craftAffixRangeText(target, roll.affixId);
      return `<button type="button" class="reset-affix-tip-option ${roll.greater ? "greater" : ""} ${selected ? "selected" : ""} ${lockedOut ? "locked-out" : ""} ${lockedIndex === index ? "locked" : ""}" data-action="craft-reset-affix" data-affix-index="${index}" ${lockedOut ? "disabled" : ""}>
        <span class="craft-affix-index">词条 ${index + 1}${lockedIndex === index ? " · 已锁定" : ""}</span>
        <strong>${label}</strong>
        ${range ? `<small class="affix-range">${range}</small>` : ""}
      </button>`;
    })
    .join("");

  return `
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

export function renderSmeltAffixModal(
  state: GameStoreState,
  feature: CraftFeature,
): string | null {
  const target = feature.targetId
    ? state.save.inventory.find((item) => item.instanceId === feature.targetId) ?? null
    : null;
  if (!target || target.rarity === "common") return null;

  const choices = getSmeltAffixChoices(target);
  if (!choices.length) return null;
  const rows = choices
    .map((affixId) => {
      const definition = AFFIX_BY_ID[affixId];
      const selected = feature.smeltAffixId === affixId;
      const range = craftAffixRangeText(target, affixId, SMELT_AFFIX_POWER_MULTIPLIER);
      return `<button type="button" class="reset-affix-tip-option smelt-affix-option ${selected ? "selected" : ""}" data-action="craft-smelt-affix" data-affix-id="${affixId}" aria-pressed="${selected}">
        <span class="smelt-affix-kind">${affixDisplaysPercent(definition.kind) ? "百分比" : "固定值"}</span>
        <strong>${definition.name}</strong>
        ${range ? `<small class="affix-range">${range}</small>` : ""}
        <span class="smelt-affix-check" aria-hidden="true">✓</span>
      </button>`;
    })
    .join("");

  return `
    <div class="modal-backdrop" data-action="close-modal"></div>
    <section class="item-tips-modal reset-affix-tips smelt-affix-tips" role="dialog" aria-modal="true" aria-labelledby="smelt-affix-title" aria-describedby="smelt-affix-guide">
      <button class="modal-close" data-action="close-modal" aria-label="关闭">×</button>
      <h2 class="reset-affix-tips-title" id="smelt-affix-title">选择熔炼词条</h2>
      <div class="smelt-affix-guide" id="smelt-affix-guide">
        <p><strong>每件装备限 1 条熔炼词条。</strong>再次熔炼会替换原词条。</p>
      </div>
      <div class="reset-affix-tip-list smelt-affix-list" aria-label="可熔炼词条">${rows}</div>
    </section>
  `;
}

export function renderSetImprintPickerModal(
  state: GameStoreState,
  payload: SetImprintPickerPayload | null,
): string | null {
  const item = payload?.itemId
    ? state.save.inventory.find((entry) => entry.instanceId === payload.itemId) ?? null
    : null;
  if (!item) return null;

  const compatibleSets = SET_DEFINITIONS.filter((set) => canImprintSetOnSlot(set.id, item.slot));
  const draftSetId = payload?.draftSetId && compatibleSets.some((set) => set.id === payload.draftSetId)
    ? payload.draftSetId
    : null;
  const selectedSet = draftSetId ? SET_BY_ID[draftSetId] : null;

  return `
    <div class="modal-backdrop"></div>
    <section class="center-sheet set-imprint-picker-modal" role="dialog" aria-modal="true" aria-label="选择套装刻印">
      <header><h2>选择套装刻印</h2></header>
      <div class="set-imprint-option-list" role="listbox" aria-label="兼容套装">
        ${compatibleSets.map((set) => {
          const selected = selectedSet?.id === set.id;
          const owned = state.save.setEssences[set.id] ?? 0;
          const initial = Array.from(set.name)[0] ?? "套";
          return `
            <button type="button" class="set-imprint-option ${selected ? "selected" : ""}" data-action="craft-set-select" data-set-id="${set.id}" role="option" aria-selected="${selected}">
              <span class="set-imprint-option-sigil" aria-hidden="true">${initial}</span>
              <span class="set-imprint-option-copy">
                <strong>${set.name}</strong>
                <small>${set.school === "magic" ? "法系" : "物理"} · 精华 ×${owned}</small>
              </span>
              <span class="set-imprint-option-check" aria-hidden="true">✓</span>
            </button>
          `;
        }).join("")}
      </div>
      <footer class="set-imprint-picker-footer">
        ${selectedSet
          ? `<section class="set-imprint-description" aria-live="polite" aria-label="套装效果">
              <header>
                <span class="set-imprint-description-sigil" aria-hidden="true">${Array.from(selectedSet.name)[0] ?? "套"}</span>
                <span class="set-imprint-description-title"><strong>${selectedSet.name}</strong><small>${selectedSet.school === "magic" ? "法系套装" : "物理套装"}</small></span>
              </header>
              <div class="set-imprint-description-bonuses">
                ${selectedSet.bonuses.map((bonus) => `<span><b>${bonus.pieces}件</b><em>${setBonusText(bonus)}</em></span>`).join("")}
              </div>
            </section>`
          : ""}
        <div class="set-imprint-picker-actions">
          <button type="button" class="secondary-button" data-action="close-modal">取消</button>
          <button type="button" class="primary-button" data-action="craft-set-apply" ${selectedSet ? "" : "disabled"}>返回炼金台</button>
        </div>
      </footer>
    </section>
  `;
}

export function renderCraftResultModal(
  state: GameStoreState,
  payload: unknown,
): string | null {
  const event = payload as CraftResultEvent | null;
  const validTypes: CraftResultEvent["type"][] = [
    "alchemy:crafted",
    "craft:imprinted",
    "craft:socketed",
    "craft:reset",
    "craft:smelted",
    "craft:inlaid",
    "craft:gemRemoved",
  ];
  if (!event || !validTypes.includes(event.type)) return null;

  const item = event.type === "alchemy:crafted"
    ? event.result
    : [...state.save.inventory, ...state.save.overflow].find(({ instanceId }) => instanceId === event.itemId);
  if (!item) return null;
  const definition = ITEM_BY_ID[item.definitionId];
  if (!definition) return null;

  let title = "工艺完成";
  let changeLabel = "处理结果";
  let previousValue: string | null = null;
  let resultValue = "已完成";
  let note = "装备状态已经更新。";
  let stationProgress = "";
  let bonus = "";
  const attributeEntries = itemAttributeEntries(item);
  const effectEntries = itemEffectEntries(item);
  const itemAttributes = `
    <section class="craft-result-attributes" aria-label="装备完整属性">
      <span class="craft-result-attributes-title">装备属性</span>
      <div class="craft-result-attribute-content" tabindex="0" aria-label="装备全部属性与特殊效果">
        <div class="craft-result-attribute-list">
          ${attributeEntries.map((entry) => `
            <div class="craft-result-attribute ${entry.kind} ${entry.greater ? "greater" : ""}">
              <span>${entry.label}</span>
              <strong>${entry.value}</strong>
            </div>
          `).join("")}
        </div>
        ${effectEntries.length ? `
          <div class="craft-result-effect-list">
            ${effectEntries.map((entry) => `
              <div class="craft-result-effect ${entry.kind}">
                <small>${entry.label}</small>
                <div><strong>${entry.title}</strong>${entry.description ? `<span>${entry.description}</span>` : ""}</div>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    </section>
  `;

  if (event.type === "alchemy:crafted") {
    title = event.miracle ? "奇迹升品" : "炼金成功";
    changeLabel = "装备品阶";
    previousValue = RARITY_LABELS[event.fromRarity as Rarity];
    resultValue = RARITY_LABELS[event.toRarity as Rarity];
    const beforeRequired = getAlchemyExperienceToNext(event.stationLevelBefore);
    const afterRequired = getAlchemyExperienceToNext(event.stationLevel);
    const leveled = event.stationLevel > event.stationLevelBefore;
    const maxed = event.stationLevel >= ALCHEMY_STATION_MAX_LEVEL;
    const beforePercent = beforeRequired > 0
      ? Math.min(100, Math.round((event.stationExperienceBefore / beforeRequired) * 100))
      : 100;
    const afterPercent = maxed || afterRequired <= 0
      ? 100
      : Math.min(100, Math.round((event.stationExperienceAfter / afterRequired) * 100));
    const experienceText = maxed
      ? leveled
        ? `${event.stationExperienceBefore}/${beforeRequired} → 已满级`
        : "已满级"
      : leveled
        ? `${event.stationExperienceBefore}/${beforeRequired} → ${event.stationExperienceAfter}/${afterRequired}`
        : `${event.stationExperienceBefore} → ${event.stationExperienceAfter}/${afterRequired}`;
    stationProgress = `
      <div class="craft-result-station-progress ${leveled ? "leveled" : ""} ${maxed ? "maxed" : ""} ${event.greaterAffixEnergy > 0 ? "with-star" : ""}" id="craft-result-note" style="--station-exp-from:${beforePercent}%;--station-exp-to:${afterPercent}%">
        ${leveled ? `<div class="craft-result-station-levelup" role="status"><span>炼金台升级</span><strong>Lv.${event.stationLevelBefore} → Lv.${event.stationLevel}</strong></div>` : ""}
        <div class="craft-result-station-head">
          <span>炼金台经验</span>
          ${maxed && !leveled ? "" : `<strong>+${event.stationExperience}</strong>`}
        </div>
        <div class="craft-result-station-meter" role="progressbar" aria-label="炼金台经验 ${experienceText}" aria-valuemin="0" aria-valuemax="${maxed ? 1 : afterRequired}" aria-valuenow="${maxed ? 1 : event.stationExperienceAfter}"><i></i><em aria-hidden="true"></em></div>
        ${event.greaterAffixEnergy > 0
          ? `<p class="craft-result-star-note">消耗 ${event.greaterAffixEnergy} 点星能，${event.greaterAffixCount > 0 ? `产物获得 ${event.greaterAffixCount} 条强化词条。` : "本次未生成强化词条。"}</p>`
          : ""}
      </div>
    `;
    if (event.miracle) {
      bonus += `<div class="craft-result-bonus miracle"><span>奇迹升品</span><strong>连续提升 2 阶</strong></div>`;
    }
    if (event.levelsGained > 0) {
      bonus += `<div class="craft-result-bonus"><span>装备合成上限提升</span><strong>Lv.${getAlchemyStationLevelCap(event.stationLevel)}</strong></div>`;
    }
  } else if (event.type === "craft:imprinted") {
    title = "刻印成功";
    changeLabel = "新增套装标签";
    resultValue = SET_BY_ID[event.setId].name;
    note = `已消耗对应套装精华 ×${event.essenceCost}、套装刻印石 ×${event.stoneCost}；装备属性、传奇特性与养成内容均已保留。`;
  } else if (event.type === "craft:socketed") {
    title = "开孔成功";
    changeLabel = "当前孔位";
    resultValue = `${event.sockets}/${MAX_EQUIPMENT_SOCKETS}`;
    note = `已为${definition.name}开启新的宝石孔位。`;
  } else if (event.type === "craft:reset") {
    title = "重置成功";
    changeLabel = "词条变化";
    previousValue = formatAffixValue(event.affixId as AffixId, event.previousValue);
    resultValue = formatAffixValue(event.affixId as AffixId, event.value);
    note = "新的词条数值已经生效。";
  } else if (event.type === "craft:smelted") {
    title = "熔炼成功";
    changeLabel = event.previousAffixId ? "替换熔炼词条" : "新增熔炼词条";
    previousValue = event.previousAffixId && event.previousValue != null
      ? formatAffixValue(event.previousAffixId as AffixId, event.previousValue)
      : null;
    resultValue = formatAffixValue(event.affixId as AffixId, event.value);
    note = event.previousAffixId ? "原熔炼词条已被替换。" : "熔炼词条已经写入装备。";
  } else if (event.type === "craft:inlaid") {
    const gem = MATERIAL_BY_ID[event.gemId as MaterialId];
    title = "镶嵌成功";
    changeLabel = "已镶嵌";
    resultValue = gem?.name ?? "宝石";
    note = gem?.description ?? "宝石效果已经生效。";
  } else {
    const gem = MATERIAL_BY_ID[event.gemId as MaterialId];
    title = "卸下成功";
    changeLabel = "已卸下";
    resultValue = gem?.name ?? "宝石";
    note = "宝石已返回材料背包。";
  }

  return `
    <div class="modal-backdrop" data-action="close-modal"></div>
    <section class="center-sheet craft-result-modal ${event.type === "alchemy:crafted" && event.miracle ? "miracle" : ""}" style="--craft-result-accent:var(--rarity-bg-${item.rarity})" role="dialog" aria-modal="true" aria-labelledby="craft-result-title" aria-describedby="craft-result-note craft-result-dismiss-hint">
      <div class="craft-result-heading">
        <span aria-hidden="true"></span>
        <h2 id="craft-result-title">${title}</h2>
        <span aria-hidden="true"></span>
      </div>
      <div class="craft-result-showcase">
        <div class="craft-result-effects" aria-hidden="true">
          <span class="craft-result-rays"></span>
          <span class="craft-result-sparkles"></span>
        </div>
        <div class="craft-result-item-art ${rarityClass(item.rarity)}">${equipmentArt(definition.icon)}${equipmentSpecialMarks(item)}</div>
      </div>
      <div class="craft-result-item-copy">
        <strong>${definition.name}</strong>
        <span>${RARITY_LABELS[item.rarity]} · Lv.${getEquipmentLevel(item)}</span>
      </div>
      ${itemAttributes}
      <div class="craft-result-change ${previousValue ? "has-before" : ""}">
        <small>${changeLabel}</small>
        <div class="${previousValue ? "with-before" : ""}">
          ${previousValue ? `<span>${previousValue}</span><b aria-hidden="true">→</b>` : ""}
          <strong>${resultValue}</strong>
        </div>
      </div>
      ${stationProgress || `<p class="craft-result-note" id="craft-result-note">${note}</p>`}
      ${bonus}
      <p class="craft-result-dismiss-hint" id="craft-result-dismiss-hint">点击空白处关闭</p>
    </section>
  `;
}
