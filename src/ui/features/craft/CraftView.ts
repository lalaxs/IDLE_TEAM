import type { GameStoreState } from "../../../app/GameStore";
import {
  AFFIX_BY_ID,
  SMELT_AFFIX_POWER_MULTIPLIER,
  formatAffixRangeLabel,
  formatAffixValue,
  type AffixId,
} from "../../../content/affixes";
import { ACCOUNT_CURRENCY_BY_ID } from "../../../content/currencies";
import { ITEM_BY_ID, RARITY_LABELS } from "../../../content/items";
import {
  GEM_GROUP_LABELS,
  MATERIAL_BY_ID,
  MATERIAL_DEFINITIONS,
  MAX_EQUIPMENT_SOCKETS,
  formatGemBonus,
  getGemMaterialId,
  type GemGroup,
  type GemMaterialId,
  type GemRank,
  type MaterialId,
} from "../../../content/materials";
import { SET_BY_ID } from "../../../content/sets";
import {
  compareInventoryItems,
  getEquipmentLevel,
  getEquipmentSetId,
  getItemBudget,
  type InventoryItem,
} from "../../../progression/EquipmentSystem";
import {
  CRAFT_MODE_LABELS,
  getSetImprintPreview,
  getSocketStoneCost,
  getSmeltAffixChoices,
  SET_IMPRINT_ESSENCE_COST,
  SET_IMPRINT_STONE_COST,
  SMELT_GOLD_COST,
  SOCKET_GOLD_COST,
  type CraftMode,
} from "../../../progression/GearCraftSystem";
import {
  equipmentArt,
  equipmentSpecialMarks,
  itemLevelBadge,
  legendaryTraitAria,
  materialArt,
  rarityClass,
  setNameInitial,
} from "../../shared/presentation";
import type { CraftFeature } from "./CraftFeature";

export interface CraftPreviewState {
  equipmentItemId: string | null;
  materialItemId: MaterialId | null;
  costMaterialId: MaterialId | null;
  imprintMaterialKind: "essence" | "stone" | null;
}

export function craftAffixRangeText(
  item: InventoryItem,
  affixId: AffixId,
  valueScale = 1,
): string {
  if (item.rarity === "common") return "";
  return formatAffixRangeLabel(
    affixId,
    item.rarity,
    getItemBudget(
      getEquipmentLevel(item),
      item.rarity,
      ITEM_BY_ID[item.definitionId]?.baseTier ?? 1,
    ),
    getEquipmentLevel(item),
    valueScale,
  );
}

export function renderCraftModeMenu(feature: CraftFeature): string {
  const modes = Object.keys(CRAFT_MODE_LABELS) as CraftMode[];
  return `
    <div class="craft-mode-wrap">
      <button type="button" class="craft-mode-trigger ${feature.modeMenuOpen ? "open" : ""}" data-action="craft-mode-toggle" aria-expanded="${feature.modeMenuOpen}">
        <span>${CRAFT_MODE_LABELS[feature.mode]}</span>
        <span class="craft-mode-caret" aria-hidden="true">▾</span>
      </button>
      ${feature.modeMenuOpen
        ? `<div class="craft-mode-menu" role="menu">
            ${modes.map((mode) => `
              <button type="button" class="craft-mode-option ${mode === feature.mode ? "active" : ""}" data-action="craft-mode-select" data-mode="${mode}" role="menuitem">
                ${CRAFT_MODE_LABELS[mode]}
              </button>`).join("")}
          </div>`
        : ""}
    </div>
  `;
}

export function renderCraftListHeader(feature: CraftFeature): string {
  if (feature.mode === "imprint") return `<div class="alchemy-list-caption">非套装装备</div>`;
  if (feature.mode === "socket") return `<div class="alchemy-list-caption">装备</div>`;
  if (feature.mode === "fusion") {
    return `<div class="gem-group-tabs" role="tablist" aria-label="宝石分类">
      ${(["offense", "defense", "tactical"] as GemGroup[]).map((group) => `
        <button type="button" class="gem-group-tab ${feature.gemGroup === group ? "active" : ""}" data-action="gem-fusion-group" data-gem-group="${group}" role="tab" aria-selected="${feature.gemGroup === group}">${GEM_GROUP_LABELS[group]}</button>
      `).join("")}
    </div>`;
  }
  return `<div class="alchemy-list-tabs" role="tablist">
    <button type="button" class="alchemy-list-tab ${feature.listTab === "equipment" ? "active" : ""}" data-action="alchemy-list-tab" data-tab="equipment" role="tab">装备</button>
    <button type="button" class="alchemy-list-tab ${feature.listTab === "materials" ? "active" : ""}" data-action="alchemy-list-tab" data-tab="materials" role="tab">材料</button>
  </div>`;
}

export function renderCraftList(
  state: GameStoreState,
  feature: CraftFeature,
  preview: CraftPreviewState,
): string {
  if (feature.mode === "fusion") {
    const selectedCounts = feature.gemFusionSlots.reduce<Partial<Record<GemMaterialId, number>>>((counts, gemId) => {
      if (gemId) counts[gemId] = (counts[gemId] ?? 0) + 1;
      return counts;
    }, {});
    const gems = MATERIAL_DEFINITIONS.filter(
      (entry) => entry.kind === "gem"
        && entry.gemGroup === feature.gemGroup
        && (state.save.materials[entry.id] ?? 0) > 0,
    );
    return `
      <div class="alchemy-list item-grid gem-fusion-inventory" data-scroll="alchemy" aria-label="${GEM_GROUP_LABELS[feature.gemGroup]}宝石">
        ${gems.length
          ? gems.map((definition) => {
              const gemId = definition.id as GemMaterialId;
              const count = state.save.materials[gemId] ?? 0;
              const selected = selectedCounts[gemId] ?? 0;
              const available = count - selected;
              const disabled = definition.gemRank === 6 || available <= 0 || feature.gemFusionSlots.every(Boolean);
              return `<button type="button" class="item-card material-item-card tone-gem gem-material-option ${selected ? "selected" : ""}" data-action="gem-fusion-material-add" data-gem-id="${gemId}" ${disabled ? "disabled" : ""} aria-label="选择${definition.name}，库存${count}${selected ? `，已选${selected}` : ""}">
                <span class="item-icon material-icon" aria-hidden="true">${materialArt(definition.icon)}</span>
                <span class="gem-material-rank">${definition.gemRank}级</span>
                <span class="material-stack">×${count}</span>
                ${selected ? `<span class="gem-material-picked" aria-label="已选择 ${selected} 颗">${selected}</span>` : definition.gemRank === 6 ? `<span class="gem-material-picked max">满级</span>` : ""}
              </button>`;
            }).join("")
          : `<div class="empty-state compact gem-fusion-empty"><strong>暂无${GEM_GROUP_LABELS[feature.gemGroup]}宝石</strong></div>`}
      </div>
    `;
  }
  if (feature.listTab === "materials") {
    const rows = MATERIAL_DEFINITIONS.filter((entry) => {
      if (feature.mode === "inlay") return entry.kind === "gem" && (state.save.materials[entry.id] ?? 0) > 0;
      if (feature.mode === "socket") return false;
      if (feature.mode === "reset") return entry.id === "mat_reset_scroll";
      if (feature.mode === "smelt") return entry.id === "mat_smelt_flux";
      return true;
    });
    return `
      <div class="alchemy-list item-grid" data-scroll="alchemy">
        ${rows.length
          ? rows.map((entry) => {
              const count = state.save.materials[entry.id] ?? 0;
              const selected = feature.materialId === entry.id;
              const previewing = preview.materialItemId === entry.id;
              return `<button type="button" class="item-card material-item-card tone-${entry.tone} ${selected ? "selected" : ""} ${previewing ? "alchemy-previewing" : ""}" data-action="craft-material-detail" data-material-id="${entry.id}" aria-label="${entry.name}">
                <span class="item-icon material-icon" aria-hidden="true">${materialArt(entry.icon)}</span>
                <span class="material-stack">×${count}</span>
              </button>`;
            }).join("")
          : `<div class="empty-state compact"><strong>暂无材料</strong></div>`}
      </div>
    `;
  }

  const items = [...state.save.inventory]
    .filter((item) => feature.mode !== "imprint" || !getEquipmentSetId(item))
    .sort(compareInventoryItems);
  return `
    <div class="alchemy-list item-grid" data-scroll="alchemy">
      ${items.length
        ? items.map((item) => {
            const definition = ITEM_BY_ID[item.definitionId]!;
            const selected = feature.targetId === item.instanceId;
            const previewing = preview.equipmentItemId === item.instanceId;
            return `<button type="button" class="item-card ${rarityClass(item.rarity)} ${selected ? "selected" : ""} ${previewing ? "equipment-previewing" : ""}" data-action="craft-item-select" data-item-id="${item.instanceId}" aria-label="${selected ? "已放入" : "放入"}${RARITY_LABELS[item.rarity]}${definition.name}${legendaryTraitAria(item)}" aria-pressed="${selected}" aria-haspopup="dialog" aria-controls="global-equipment-tips" aria-expanded="${previewing}">
              <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
              ${equipmentSpecialMarks(item)}
              ${itemLevelBadge(item)}
            </button>`;
          }).join("")
        : `<div class="empty-state compact"><strong>${feature.mode === "imprint" ? "暂无非套装装备" : "背包为空"}</strong><p>先去闯关获取装备</p></div>`}
    </div>
  `;
}

function renderCraftTargetCard(target: InventoryItem | null, meta: string): string {
  if (!target) {
    return `<div class="craft-target empty"><span class="craft-target-empty">未放入装备</span></div>`;
  }
  const definition = ITEM_BY_ID[target.definitionId]!;
  return `
    <button type="button" class="craft-target" data-action="craft-item-remove" data-item-id="${target.instanceId}" aria-label="卸下${definition.name}${legendaryTraitAria(target)}">
      <span class="craft-target-art ${rarityClass(target.rarity)}">${equipmentArt(definition.icon)}${equipmentSpecialMarks(target)}</span>
      <span class="craft-target-meta"><strong>${definition.name}</strong><small>${meta}</small></span>
    </button>
  `;
}

function renderImprintBase(target: InventoryItem | null): string {
  if (!target) {
    return `<section class="craft-imprint-base empty" aria-label="基底装备">
      <span class="craft-imprint-base-label">基底装备</span>
      <span class="craft-imprint-base-empty">从右侧选择装备</span>
    </section>`;
  }
  const definition = ITEM_BY_ID[target.definitionId]!;
  return `<button type="button" class="craft-imprint-base" data-action="craft-item-remove" data-item-id="${target.instanceId}" aria-label="卸下${definition.name}">
    <span class="craft-imprint-base-label">基底装备</span>
    <span class="craft-imprint-base-art ${rarityClass(target.rarity)}" aria-hidden="true">
      ${equipmentArt(definition.icon)}${equipmentSpecialMarks(target)}${itemLevelBadge(target)}
    </span>
    <span class="craft-imprint-base-meta"><strong>${definition.name}</strong><small>${RARITY_LABELS[target.rarity]}</small></span>
  </button>`;
}

function renderGemFusionWorkbench(feature: CraftFeature): string {
  const filled = feature.gemFusionSlots.filter((gemId): gemId is GemMaterialId => Boolean(gemId));
  const sourceId = filled[0] ?? null;
  const source = sourceId ? MATERIAL_BY_ID[sourceId] : null;
  const sameMaterial = filled.length > 0 && filled.every((gemId) => gemId === sourceId);
  const sourceRank = source?.gemRank ?? null;
  const canFuse = filled.length === 3 && sameMaterial && sourceRank != null && sourceRank < 6;
  const resultId = canFuse && source?.gemBaseId
    ? getGemMaterialId(source.gemBaseId, (sourceRank + 1) as GemRank)
    : null;
  const result = resultId ? MATERIAL_BY_ID[resultId] : null;
  const status = filled.length === 0
    ? "从右侧选择三颗宝石"
    : filled.length < 3
      ? `已放入 ${filled.length}/3 颗`
      : !sameMaterial
        ? "需要三颗同类型、同等级宝石"
        : sourceRank === 6
          ? "六级宝石已是最高等级"
          : `将合成为${result?.name ?? "高一级宝石"}`;
  return `
    <div class="craft-workbench gem-fusion-workbench">
      <div class="gem-fusion-board">
        <div class="gem-fusion-board-heading"><strong>选择材料</strong><span>3 颗同级 → 1 颗高一级</span></div>
        <div class="gem-fusion-slots" aria-label="宝石合成材料槽">
          ${feature.gemFusionSlots.map((gemId, index) => {
            if (!gemId) return `<button type="button" class="gem-fusion-slot empty" data-action="gem-fusion-slot-clear" data-slot="${index}" aria-label="空材料槽 ${index + 1}" disabled><span>${index + 1}</span></button>`;
            const definition = MATERIAL_BY_ID[gemId];
            return `<button type="button" class="gem-fusion-slot filled" data-action="gem-fusion-slot-clear" data-slot="${index}" aria-label="移出${definition.name}">
              ${materialArt(definition.icon)}<b>${definition.gemRank}级</b>
            </button>`;
          }).join("")}
        </div>
        <div class="gem-fusion-flow" aria-hidden="true">▼</div>
        <section class="gem-fusion-result ${result ? "ready" : "empty"}" aria-label="合成结果">
          ${result
            ? `<span class="gem-fusion-result-icon">${materialArt(result.icon)}</span><span><small>合成结果</small><strong>${result.name}</strong><em>${formatGemBonus(result.gemBonus)}</em></span>`
            : `<span class="gem-fusion-result-placeholder">?</span><span><small>合成结果</small><strong>等待材料</strong></span>`}
        </section>
        <p class="gem-fusion-selection-status ${canFuse ? "ready" : ""}" role="status">${status}</p>
      </div>
      <div class="craft-footer gem-fusion-footer">
        <button type="button" class="primary-button wide" data-action="craft-fuse-selected-gems" ${canFuse && sourceId ? `data-gem-id="${sourceId}"` : "disabled"}>合成</button>
      </div>
    </div>
  `;
}

export function renderCraftWorkbench(
  state: GameStoreState,
  feature: CraftFeature,
  preview: CraftPreviewState,
): string {
  if (feature.mode === "fusion") return renderGemFusionWorkbench(feature);
  const target = feature.targetId
    ? state.save.inventory.find((item) => item.instanceId === feature.targetId) ?? null
    : null;
  const materials = state.save.materials;
  const selectedMaterial = feature.materialId;

  if (feature.mode === "imprint") {
    const selectedSet = feature.selectedSetId ? SET_BY_ID[feature.selectedSetId] : null;
    const imprintPreview = target && selectedSet
      ? getSetImprintPreview(target, selectedSet.id, state.save.setEssences, state.save.materials)
      : null;
    const essenceHave = selectedSet ? state.save.setEssences[selectedSet.id] ?? 0 : 0;
    const stoneHave = state.save.materials.mat_set_inscription ?? 0;
    const inscriptionStone = MATERIAL_BY_ID.mat_set_inscription;
    const canConfirm = Boolean(target && selectedSet && imprintPreview && !imprintPreview.reason);
    return `
      <div class="craft-workbench craft-workbench-imprint">
        <div class="craft-scroll">
          ${renderImprintBase(target)}
          <button type="button" class="craft-imprint-set ${selectedSet ? "selected" : "empty"}" data-action="craft-imprint-request" ${target ? "" : "disabled"} aria-label="${selectedSet ? `更换${selectedSet.name}` : "选择套装刻印"}">
            <span class="craft-imprint-set-sigil" aria-hidden="true">套</span>
            <span class="craft-imprint-set-copy">
              <small>套装刻印</small>
              <strong>${selectedSet?.name ?? "尚未选择"}</strong>
              <em>${selectedSet ? `${selectedSet.school === "magic" ? "法系" : "物理"}套装` : "点击选择套装"}</em>
            </span>
            <b>${selectedSet ? "更换" : "选择"}</b>
          </button>
        </div>
        <div class="craft-footer craft-imprint-footer">
          ${selectedSet
            ? `<div class="set-imprint-materials" aria-label="刻印消耗">
                <button type="button" class="set-imprint-material ${essenceHave >= SET_IMPRINT_ESSENCE_COST ? "ready" : "short"} ${preview.imprintMaterialKind === "essence" ? "equipment-previewing" : ""}" data-action="craft-imprint-material-tip" data-material-kind="essence" aria-label="${selectedSet.name}精华，持有 ${essenceHave}，需要 ${SET_IMPRINT_ESSENCE_COST}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${preview.imprintMaterialKind === "essence"}">
                  <span class="set-imprint-material-icon" aria-hidden="true">
                    <img class="material-art" src="/assets/resources/mat_set_essence.png" alt="">
                    <i class="set-imprint-material-badge ${selectedSet.school}">${setNameInitial(selectedSet.id)}</i>
                  </span>
                  <em>${essenceHave}/${SET_IMPRINT_ESSENCE_COST}</em>
                </button>
                <button type="button" class="set-imprint-material ${stoneHave >= SET_IMPRINT_STONE_COST ? "ready" : "short"} ${preview.imprintMaterialKind === "stone" ? "equipment-previewing" : ""}" data-action="craft-imprint-material-tip" data-material-kind="stone" aria-label="${inscriptionStone.name}，持有 ${stoneHave}，需要 ${SET_IMPRINT_STONE_COST}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${preview.imprintMaterialKind === "stone"}">
                  <span class="set-imprint-material-icon" aria-hidden="true">${materialArt(inscriptionStone.icon)}</span>
                  <em>${stoneHave}/${SET_IMPRINT_STONE_COST}</em>
                </button>
              </div>
              <button type="button" class="primary-button wide" data-action="craft-imprint-confirm" ${canConfirm ? "" : "disabled"}>${canConfirm ? "确认刻印" : "所需消耗材料不足"}</button>`
            : `<p class="alchemy-hint">${target ? "先选择套装刻印" : "先选择一件非套装装备"}</p>
              <button type="button" class="primary-button wide" data-action="craft-imprint-confirm" disabled>确认刻印</button>`}
        </div>
      </div>
    `;
  }

  if (feature.mode === "socket") {
    const have = materials.mat_socket_stone ?? 0;
    const sockets = target?.sockets?.length ?? 0;
    const socketStoneCost = getSocketStoneCost(sockets);
    const materialReady = have >= socketStoneCost;
    const goldReady = state.save.gold >= SOCKET_GOLD_COST;
    const selectedOpenSocket = feature.openSocketIndex === sockets && sockets < MAX_EQUIPMENT_SOCKETS;
    const can = Boolean(target) && selectedOpenSocket && materialReady && goldReady;
    const socketActionLabel = sockets >= MAX_EQUIPMENT_SOCKETS
      ? "已满孔"
      : !target
        ? "选择装备"
        : !materialReady
          ? "开孔石不足"
          : !goldReady
            ? "金币不足"
            : !selectedOpenSocket
              ? "选择孔位"
              : "开孔";
    const socketStone = MATERIAL_BY_ID.mat_socket_stone;
    const socketPicker = target
      ? `<section class="craft-open-sockets" aria-labelledby="craft-open-sockets-title">
          <header><strong id="craft-open-sockets-title">选择孔位</strong><small>${sockets}/${MAX_EQUIPMENT_SOCKETS} 已开启</small></header>
          <div class="craft-open-socket-grid">
            ${Array.from({ length: MAX_EQUIPMENT_SOCKETS }, (_, index) => {
              const socket = target.sockets?.[index];
              const opened = index < sockets;
              const available = index === sockets && sockets < MAX_EQUIPMENT_SOCKETS;
              const selected = available && feature.openSocketIndex === index;
              const gem = socket?.gemId ? MATERIAL_BY_ID[socket.gemId as MaterialId] : null;
              return `<button type="button" class="craft-open-socket-cell ${opened ? "opened" : available ? "available" : "queued"} ${selected ? "selected" : ""}" data-action="craft-open-socket-pick" data-socket-index="${index}" ${available ? "" : "disabled"} aria-label="孔位 ${index + 1}，${opened ? "已开启" : available ? "可开启" : "后续孔位"}" aria-pressed="${selected}">
                <span class="craft-open-socket-number">${index + 1}</span>
                ${gem ? materialArt(gem.icon) : `<span class="craft-open-socket-mark" aria-hidden="true">${opened ? "◇" : available ? "+" : "·"}</span>`}
                <small>${opened ? "已开启" : available ? "待开启" : "后续"}</small>
              </button>`;
            }).join("")}
          </div>
        </section>`
      : `<section class="craft-inlay-empty-state craft-socket-empty-state">
          <span class="craft-inlay-step" aria-hidden="true">1</span>
          <span><strong>选择装备</strong><small>点击右侧装备放入炼金台</small></span>
        </section>`;
    return `
      <div class="craft-workbench craft-workbench-socket">
        <div class="craft-scroll">
          ${renderCraftTargetCard(target, target ? `孔位 ${sockets}/${MAX_EQUIPMENT_SOCKETS}` : "未放入装备")}
          ${socketPicker}
        </div>
        <div class="craft-footer craft-socket-footer">
          <div class="craft-socket-costs" aria-label="开孔消耗">
            <button type="button" class="craft-socket-cost ${materialReady ? "" : "insufficient"} ${preview.costMaterialId === socketStone.id ? "equipment-previewing" : ""}" data-action="craft-cost-material-tip" data-material-id="${socketStone.id}" aria-label="查看${socketStone.name}详情，消耗 ${socketStoneCost} 个，持有 ${have} 个" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${preview.costMaterialId === socketStone.id}">
              <span class="craft-socket-cost-art">${materialArt(socketStone.icon)}</span>
              <span class="craft-socket-cost-count" aria-hidden="true"><b>${have}</b><i>/${socketStoneCost}</i></span>
            </button>
            <button type="button" class="craft-socket-cost craft-socket-gold-cost ${goldReady ? "" : "insufficient"}" data-action="currency-info" data-currency="gold" aria-label="${goldReady ? `查看金币详情，开孔消耗 ${SOCKET_GOLD_COST} 金币` : `金币不足，开孔需要 ${SOCKET_GOLD_COST} 金币`}" aria-haspopup="dialog">
              <span class="craft-socket-cost-art"><img class="craft-socket-currency-art" src="${ACCOUNT_CURRENCY_BY_ID.gold.icon}" alt="" aria-hidden="true"></span>
              <span class="craft-socket-cost-count" aria-hidden="true"><b>${SOCKET_GOLD_COST}</b></span>
            </button>
          </div>
          <button class="primary-button wide" data-action="craft-socket" ${can ? "" : "disabled"}>${socketActionLabel}</button>
        </div>
      </div>
    `;
  }

  if (feature.mode === "reset") {
    const have = materials.mat_reset_scroll ?? 0;
    const materialReady = have >= 1;
    const affixes = target?.affixes ?? [];
    const lockedIndex = typeof target?.resetAffixIndex === "number" ? target.resetAffixIndex : null;
    const selectedIndex = feature.resetAffixIndex;
    const selectedRoll = selectedIndex != null ? affixes[selectedIndex] : null;
    const selectedRange = target && selectedRoll ? craftAffixRangeText(target, selectedRoll.affixId) : "";
    const resetScroll = MATERIAL_BY_ID.mat_reset_scroll;
    const can = Boolean(target)
      && affixes.length > 0
      && target?.rarity !== "common"
      && selectedIndex != null
      && materialReady
      && (lockedIndex == null || lockedIndex === selectedIndex);
    const pickEnabled = Boolean(target) && affixes.length > 0;
    return `
      <div class="craft-workbench craft-workbench-reset">
        <div class="craft-scroll">
          ${renderCraftTargetCard(target, lockedIndex != null ? `已锁定第 ${lockedIndex + 1} 条` : target ? `${affixes.length} 条词条` : "未放入装备")}
          <button type="button" class="craft-reset-pick ${selectedRoll ? "filled" : "empty"} ${lockedIndex != null ? "locked" : ""}" data-action="craft-reset-affix-open" ${pickEnabled ? "" : "disabled"}>
            <span class="craft-reset-pick-label">重置词条</span>
            ${selectedRoll
              ? `<strong class="craft-reset-pick-value">${formatAffixValue(selectedRoll.affixId, selectedRoll.value)}</strong><small>${selectedRange || RARITY_LABELS[target!.rarity]}${lockedIndex != null ? " · 已锁定" : ""}</small>`
              : `<strong class="craft-reset-pick-value muted">未选择</strong>`}
          </button>
        </div>
        <div class="craft-footer craft-reset-footer">
          <button type="button" class="craft-socket-cost craft-reset-cost ${materialReady ? "" : "insufficient"} ${preview.costMaterialId === resetScroll.id ? "equipment-previewing" : ""}" data-action="craft-cost-material-tip" data-material-id="${resetScroll.id}" aria-label="查看${resetScroll.name}详情，消耗 1 个，持有 ${have} 个" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${preview.costMaterialId === resetScroll.id}">
            <span class="craft-socket-cost-art">${materialArt(resetScroll.icon)}</span>
            <span class="craft-socket-cost-count" aria-hidden="true"><b>${have}</b><i>/1</i></span>
          </button>
          <button class="primary-button wide" data-action="craft-reset" ${can ? "" : "disabled"}>重置词条</button>
        </div>
      </div>
    `;
  }

  if (feature.mode === "smelt") {
    const have = materials.mat_smelt_flux ?? 0;
    const choices = target ? getSmeltAffixChoices(target) : [];
    const hasSmeltedAffix = target?.affixes.some((roll) => roll.smelted === true) ?? false;
    const materialReady = have >= 1;
    const goldReady = state.save.gold >= SMELT_GOLD_COST;
    const smeltFlux = MATERIAL_BY_ID.mat_smelt_flux;
    const selectedDef = feature.smeltAffixId ? AFFIX_BY_ID[feature.smeltAffixId] : null;
    const selectedRange = target && feature.smeltAffixId
      ? craftAffixRangeText(target, feature.smeltAffixId, SMELT_AFFIX_POWER_MULTIPLIER)
      : "";
    const can = Boolean(target)
      && target?.rarity !== "common"
      && Boolean(feature.smeltAffixId)
      && materialReady
      && goldReady;
    const pickEnabled = Boolean(target) && target?.rarity !== "common" && choices.length > 0;
    const actionLabel = !target
      ? "选择装备"
      : target.rarity === "common"
        ? "普通装备无法熔炼"
        : !materialReady
          ? "熔炼触媒不足"
          : !goldReady
            ? "金币不足"
            : !feature.smeltAffixId
              ? "选择词条"
              : hasSmeltedAffix
                ? "替换熔炼"
                : "熔炼";
    return `
      <div class="craft-workbench craft-workbench-reset">
        <div class="craft-scroll">
          ${renderCraftTargetCard(target, target ? `熔炼 ${hasSmeltedAffix ? 1 : 0}/1` : "未放入装备")}
          <button type="button" class="craft-reset-pick ${selectedDef ? "filled" : "empty"}" data-action="craft-smelt-affix-open" ${pickEnabled ? "" : "disabled"}>
            <span class="craft-reset-pick-label">熔炼词条</span>
            ${selectedDef
              ? `<strong class="craft-reset-pick-value">${selectedDef.name}</strong><small>${selectedRange || RARITY_LABELS[target!.rarity]}</small>`
              : `<strong class="craft-reset-pick-value muted">未选择</strong>`}
          </button>
        </div>
        <div class="craft-footer craft-socket-footer craft-smelt-footer">
          <div class="craft-socket-costs" aria-label="熔炼消耗">
            <button type="button" class="craft-socket-cost craft-smelt-cost ${materialReady ? "" : "insufficient"} ${preview.costMaterialId === smeltFlux.id ? "equipment-previewing" : ""}" data-action="craft-cost-material-tip" data-material-id="${smeltFlux.id}" aria-label="查看${smeltFlux.name}详情，消耗 1 个，持有 ${have} 个" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${preview.costMaterialId === smeltFlux.id}">
              <span class="craft-socket-cost-art">${materialArt(smeltFlux.icon)}</span>
              <span class="craft-socket-cost-count" aria-hidden="true"><b>${have}</b><i>/1</i></span>
            </button>
            <button type="button" class="craft-socket-cost craft-socket-gold-cost craft-smelt-gold-cost ${goldReady ? "" : "insufficient"}" data-action="currency-info" data-currency="gold" aria-label="${goldReady ? `查看金币详情，熔炼消耗 ${SMELT_GOLD_COST} 金币` : `金币不足，熔炼需要 ${SMELT_GOLD_COST} 金币`}" aria-haspopup="dialog">
              <span class="craft-socket-cost-art"><img class="craft-socket-currency-art" src="${ACCOUNT_CURRENCY_BY_ID.gold.icon}" alt="" aria-hidden="true"></span>
              <span class="craft-socket-cost-count" aria-hidden="true"><b>${SMELT_GOLD_COST}</b></span>
            </button>
          </div>
          <button class="primary-button wide" data-action="craft-smelt" ${can ? "" : "disabled"}>${actionLabel}</button>
        </div>
      </div>
    `;
  }

  const sockets = target?.sockets ?? [];
  const gemReady = Boolean(selectedMaterial)
    && MATERIAL_BY_ID[selectedMaterial!]?.kind === "gem"
    && (materials[selectedMaterial!] ?? 0) >= 1;
  const selectedSocket = sockets[feature.socketIndex];
  const can = Boolean(target) && Boolean(selectedSocket) && !selectedSocket?.gemId && gemReady;
  const installedGem = selectedSocket?.gemId ? MATERIAL_BY_ID[selectedSocket.gemId as MaterialId] : null;
  const selectedGem = selectedMaterial && MATERIAL_BY_ID[selectedMaterial]?.kind === "gem"
    ? MATERIAL_BY_ID[selectedMaterial]
    : null;
  const socketPanel = target && sockets.length
    ? `<section class="craft-inlay-sockets" aria-label="选择宝石孔位">
        <div class="craft-socket-grid" aria-label="宝石孔位">
          ${sockets.map((socket, index) => {
            const filled = Boolean(socket.gemId);
            const gemDef = socket.gemId ? MATERIAL_BY_ID[socket.gemId as MaterialId] : null;
            const selected = feature.socketIndex === index;
            return `<button type="button" class="craft-socket-cell ${selected ? "selected" : ""} ${filled ? "filled" : "empty"}" data-action="craft-socket-pick" data-socket-index="${index}" aria-label="孔位 ${index + 1}，${filled ? `已镶嵌${gemDef?.name ?? "宝石"}` : "空"}" aria-pressed="${selected}">
              <span class="craft-socket-number">${index + 1}</span>
              ${filled ? materialArt(gemDef?.icon ?? "/assets/resources/gem_atk.webp") : `<span class="craft-socket-empty" aria-hidden="true"></span>`}
            </button>`;
          }).join("")}
        </div>
      </section>`
    : "";
  const gemPanel = installedGem
    ? `<section class="craft-inlay-gem installed" aria-label="当前孔位已镶嵌${installedGem.name}">
        <span class="craft-inlay-gem-art">${materialArt(installedGem.icon)}</span>
        <span class="craft-inlay-gem-copy"><small>当前孔位</small><strong>${installedGem.name}</strong><em>${formatGemBonus(installedGem.gemBonus)}</em></span>
      </section>`
    : selectedGem
      ? `<button type="button" class="craft-inlay-gem selected" data-action="craft-material-remove" data-material-id="${selectedGem.id}" aria-label="移出${selectedGem.name}">
          <span class="craft-inlay-gem-art">${materialArt(selectedGem.icon)}</span>
          <span class="craft-inlay-gem-copy"><small>待镶嵌宝石</small><strong>${selectedGem.name}</strong><em>${formatGemBonus(selectedGem.gemBonus)}</em></span>
          <span class="craft-inlay-gem-remove" aria-hidden="true">×</span>
        </button>`
      : `<div class="craft-inlay-gem empty">
          <span class="craft-inlay-gem-placeholder" aria-hidden="true">◇</span>
          <span class="craft-inlay-gem-copy"><small>待镶嵌宝石</small><strong>从右侧选择宝石</strong></span>
        </div>`;
  const body = !target
    ? `<section class="craft-inlay-empty-state"><span class="craft-inlay-step" aria-hidden="true">1</span><span><strong>选择装备</strong><small>点击右侧装备放入炼金台</small></span></section>`
    : sockets.length === 0
      ? `<section class="craft-inlay-empty-state no-socket"><span class="craft-inlay-step" aria-hidden="true">◇</span><span><strong>该装备尚未开孔</strong><small>先开启孔位，才能镶嵌宝石</small></span></section>`
      : `${socketPanel}${gemPanel}`;
  const footer = !target
    ? ""
    : sockets.length === 0
      ? `<div class="craft-footer craft-inlay-footer"><button class="primary-button wide" data-action="craft-inlay-open-socket">前往开孔</button></div>`
      : installedGem
        ? `<div class="craft-footer craft-inlay-footer"><button class="secondary-button wide craft-inlay-remove" data-action="craft-remove-gem">卸下宝石</button></div>`
        : `<div class="craft-footer craft-inlay-footer"><button class="primary-button wide" data-action="craft-inlay" ${can ? "" : "disabled"}>镶嵌</button></div>`;
  return `
    <div class="craft-workbench craft-workbench-inlay">
      <div class="craft-scroll">
        ${renderCraftTargetCard(target, target ? `孔位 ${sockets.length}/${MAX_EQUIPMENT_SOCKETS}` : "未放入装备")}
        ${body}
      </div>
      ${footer}
    </div>
  `;
}
