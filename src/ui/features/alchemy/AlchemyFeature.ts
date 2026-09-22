import type { GameStoreState } from "../../../app/GameStore";
import { ITEM_BY_ID, RARITY_LABELS } from "../../../content/items";
import {
  ALCHEMY_SLOT_COUNT,
  alchemyCandidateItems,
  canAlchemyMiracle,
  getAlchemyGreaterAffixPreview,
  getAlchemyResultLevel,
  nextAlchemyRarity,
  pickAlchemyAutoFill,
  validateAlchemyInputs,
  type AlchemyGreaterAffixPreview,
} from "../../../progression/AlchemySystem";
import {
  compareInventoryItems,
  getEquipmentLevel,
  type InventoryItem,
} from "../../../progression/EquipmentSystem";
import {
  equipmentArt,
  equipmentSpecialMarks,
  itemLevelBadge,
  legendaryTraitAria,
  rarityClass,
} from "../../shared/presentation";

export interface AlchemyDowngradeRequest {
  itemIds: string[];
  sourceLevel: number;
  resultLevel: number;
  greaterPreview: AlchemyGreaterAffixPreview;
}

export type AlchemyIntent =
  | { type: "noop" }
  | { type: "selection-updated"; toast?: string }
  | { type: "select-item"; itemId: string; toast?: string }
  | { type: "toast"; message: string }
  | { type: "craft"; itemIds: string[] }
  | { type: "confirm-downgrade"; request: AlchemyDowngradeRequest };

export class AlchemyFeature {
  private slots: (string | null)[] = Array.from(
    { length: ALCHEMY_SLOT_COUNT },
    () => null,
  );

  sync(state: GameStoreState): void {
    const candidates = new Set(
      this.candidates(state).map((item) => item.instanceId),
    );
    this.slots = this.slots.map((id) => (id && candidates.has(id) ? id : null));
  }

  getSelectedItemIds(): string[] {
    return this.slots.filter((id): id is string => Boolean(id));
  }

  hasItem(itemId: string): boolean {
    return this.slots.includes(itemId);
  }

  removeItem(itemId: string): boolean {
    const index = this.slots.indexOf(itemId);
    if (index < 0) return false;
    this.slots[index] = null;
    return true;
  }

  resetSelection(): void {
    this.slots = Array.from({ length: ALCHEMY_SLOT_COUNT }, () => null);
  }

  handleAction(
    target: HTMLElement,
    state: GameStoreState,
    selectedPopoverItemId: string | null,
  ): AlchemyIntent | null {
    const action = target.dataset.action;
    if (action === "alchemy-auto-fill") {
      const picked = pickAlchemyAutoFill(
        this.candidates(state),
        state.save.alchemyStation.level,
      );
      this.slots = Array.from(
        { length: ALCHEMY_SLOT_COUNT },
        (_, index) => picked[index] ?? null,
      );
      return {
        type: "selection-updated",
        toast: picked.length ? undefined : "暂无可自动放入的装备",
      };
    }
    if (action === "alchemy-clear") {
      this.resetSelection();
      return { type: "selection-updated" };
    }
    if (action === "alchemy-slot-clear") {
      const slot = Number(target.dataset.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= ALCHEMY_SLOT_COUNT) {
        return { type: "noop" };
      }
      this.slots[slot] = null;
      return { type: "selection-updated" };
    }
    if (action === "alchemy-item-select") {
      const itemId = target.dataset.itemId;
      if (!itemId) return { type: "noop" };
      const item = state.save.inventory.find((entry) => entry.instanceId === itemId);
      if (!item) return { type: "noop" };
      const anchorId = this.getSelectedItemIds()[0];
      const anchor = anchorId
        ? state.save.inventory.find((entry) => entry.instanceId === anchorId)
        : null;
      if (
        anchor
        && (item.rarity !== anchor.rarity
          || getEquipmentLevel(item) !== getEquipmentLevel(anchor))
      ) {
        return { type: "toast", message: "请选择同等级、同品阶装备" };
      }
      let toast: string | undefined;
      if (!this.hasItem(itemId)) {
        const empty = this.slots.indexOf(null);
        if (empty < 0) toast = "魔方已满";
        else this.slots[empty] = itemId;
      }
      return { type: "select-item", itemId, toast };
    }
    if (action === "alchemy-item-put") {
      if (!selectedPopoverItemId) return { type: "noop" };
      if (this.hasItem(selectedPopoverItemId)) {
        return { type: "toast", message: "已在魔方中" };
      }
      const empty = this.slots.indexOf(null);
      if (empty < 0) return { type: "toast", message: "魔方已满" };
      this.slots[empty] = selectedPopoverItemId;
      return { type: "selection-updated" };
    }
    if (action === "alchemy-item-remove") {
      if (!selectedPopoverItemId || !this.removeItem(selectedPopoverItemId)) {
        return { type: "noop" };
      }
      return { type: "selection-updated" };
    }
    if (action !== "alchemy-craft") return null;

    const itemIds = this.getSelectedItemIds();
    if (itemIds.length !== ALCHEMY_SLOT_COUNT) return { type: "noop" };
    const items = itemIds
      .map((id) => state.save.inventory.find((item) => item.instanceId === id))
      .filter((item): item is InventoryItem => Boolean(item));
    const validationError = validateAlchemyInputs(items);
    if (validationError) return { type: "toast", message: validationError };
    const sourceLevel = getEquipmentLevel(items[0]!);
    const resultLevel = getAlchemyResultLevel(items, state.save.alchemyStation.level);
    const greaterPreview = getAlchemyGreaterAffixPreview(items, resultLevel);
    if (resultLevel < sourceLevel) {
      return {
        type: "confirm-downgrade",
        request: { itemIds, sourceLevel, resultLevel, greaterPreview },
      };
    }
    return { type: "craft", itemIds };
  }

  renderUpgradePanel(state: GameStoreState): string {
    const filledIds = this.getSelectedItemIds();
    const filledItems = filledIds
      .map((id) => state.save.inventory.find(({ instanceId }) => instanceId === id))
      .filter((item): item is InventoryItem => Boolean(item));
    const validationError = filledItems.length === ALCHEMY_SLOT_COUNT
      ? validateAlchemyInputs(filledItems)
      : null;
    const canCraft = filledItems.length === ALCHEMY_SLOT_COUNT && !validationError;
    const station = state.save.alchemyStation;
    const sourceLevel = filledItems[0] ? getEquipmentLevel(filledItems[0]) : null;
    const resultLevel = canCraft ? getAlchemyResultLevel(filledItems, station.level) : null;
    const fromRarity = filledItems[0]?.rarity ?? null;
    const toRarity = fromRarity ? nextAlchemyRarity(fromRarity) : null;
    const willDowngrade = sourceLevel != null && resultLevel != null && resultLevel < sourceLevel;
    const greaterPreview = getAlchemyGreaterAffixPreview(filledItems, resultLevel ?? undefined);
    const miracleHint = fromRarity && canAlchemyMiracle(fromRarity)
      ? " · 有机会奇迹升品"
      : "";
    const resultHint = canCraft
      && sourceLevel != null
      && resultLevel != null
      && fromRarity
      && toRarity
      ? `Lv.${sourceLevel} ${RARITY_LABELS[fromRarity]} → Lv.${resultLevel} ${RARITY_LABELS[toRarity]}${willDowngrade ? " · 将降级" : ""}${miracleHint}`
      : validationError ?? `已放入 ${filledIds.length}/${ALCHEMY_SLOT_COUNT} · 需同等级同品阶`;
    const starInheritance = greaterPreview.energy > 0
      ? `<section class="alchemy-star-inheritance" aria-label="强化词条继承概率">
          <div><strong>星能 ${greaterPreview.energy}</strong><small>原强化词条将重新生成</small></div>
          <p><span>至少1条 ${greaterPreview.oneOrMoreChancePct}%</span><span>至少2条 ${greaterPreview.twoOrMoreChancePct}%</span><span>3条 ${greaterPreview.threeChancePct}%</span></p>
        </section>`
      : "";
    return `
      <div class="craft-scroll">
        <div class="alchemy-cube">
        ${this.slots.map((itemId, index) => {
          const item = itemId
            ? state.save.inventory.find(({ instanceId }) => instanceId === itemId)
            : null;
          if (!item) {
            return `<button type="button" class="alchemy-cell empty" data-action="alchemy-slot-clear" data-slot="${index}" aria-label="空槽 ${index + 1}"></button>`;
          }
          const definition = ITEM_BY_ID[item.definitionId]!;
          return `<button type="button" class="alchemy-cell filled ${rarityClass(item.rarity)}" data-action="alchemy-slot-clear" data-slot="${index}" data-item-id="${item.instanceId}" aria-label="移出 ${definition.name}${legendaryTraitAria(item)}">
              ${index === 0 ? '<span class="alchemy-core-badge">主</span>' : ""}
              <span class="alchemy-cell-art">${equipmentArt(definition.icon)}${equipmentSpecialMarks(item)}</span>
            </button>`;
        }).join("")}
        </div>
      </div>
      <div class="craft-footer">
        ${starInheritance}
        <p class="alchemy-hint ${willDowngrade ? "warning" : ""}">${resultHint}</p>
        <button class="primary-button wide" data-action="alchemy-craft" ${canCraft ? "" : "disabled"}>${willDowngrade && resultLevel != null ? `炼金为 Lv.${resultLevel}` : greaterPreview.energy > 0 ? "星能炼金" : "炼金"}</button>
      </div>
    `;
  }

  renderEquipmentList(state: GameStoreState, previewItemId: string | null): string {
    const selectedItemId = this.getSelectedItemIds()[0];
    const selectedItem = selectedItemId
      ? state.save.inventory.find((item) => item.instanceId === selectedItemId) ?? null
      : null;
    const candidates = this.candidates(state)
      .filter((item) => !selectedItem
        || (item.rarity === selectedItem.rarity
          && getEquipmentLevel(item) === getEquipmentLevel(selectedItem)))
      .sort(compareInventoryItems);
    return `
      <div class="alchemy-list item-grid" data-scroll="alchemy">
        ${candidates.length
          ? candidates.map((item) => {
              const definition = ITEM_BY_ID[item.definitionId]!;
              const inCube = this.hasItem(item.instanceId);
              const previewing = previewItemId === item.instanceId;
              return `<button type="button" class="item-card ${rarityClass(item.rarity)} ${inCube ? "selected" : ""} ${previewing ? "equipment-previewing" : ""}" data-action="alchemy-item-select" data-item-id="${item.instanceId}" aria-label="${inCube ? "已放入" : "放入"}${RARITY_LABELS[item.rarity]}${definition.name}${legendaryTraitAria(item)}" aria-pressed="${inCube}" aria-haspopup="dialog" aria-controls="global-equipment-tips" aria-expanded="${previewing}">
                <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
                ${equipmentSpecialMarks(item)}
                ${itemLevelBadge(item)}
              </button>`;
            }).join("")
          : `<div class="empty-state compact"><strong>暂无可炼金装备</strong><p>${selectedItem ? "没有更多同等级、同品阶装备" : "需要未装备且未达混元的装备"}</p></div>`}
      </div>
    `;
  }

  private candidates(state: GameStoreState): InventoryItem[] {
    const equipmentMaps = Object.values(state.save.roster).map(
      (progress) => progress.equipment,
    );
    return alchemyCandidateItems(state.save.inventory, equipmentMaps);
  }
}
