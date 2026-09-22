import type { GameStoreState } from "../../../app/GameStore";
import {
  AD_TICKET,
  REWARD_BOXES,
  REWARD_BOX_IDS,
  isRewardBoxId,
  type RewardBoxId,
} from "../../../content/checkIn";
import { ITEM_BY_ID, RARITY_LABELS } from "../../../content/items";
import {
  MATERIAL_BY_ID,
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_DEFINITIONS,
  canSalvageMaterial,
  isMaterialCategory,
  type MaterialCategory,
  type MaterialId,
} from "../../../content/materials";
import { SET_BY_ID, SET_DEFINITIONS, type SetId } from "../../../content/sets";
import { getBackpackCapacity } from "../../../progression/AbilitySystem";
import {
  backpackItems,
  collectEquippedItemIds,
  countBackpackItems,
  type InventoryItem,
} from "../../../progression/EquipmentSystem";
import { NAV_ICONS } from "../../icons";
import {
  equipmentArt,
  equipmentSpecialMarks,
  itemLevelBadge,
  legendaryTraitAria,
  materialArt,
  rarityClass,
  setNameInitial,
} from "../../shared/presentation";

type InventoryBagTab = "equipment" | "materials";
type InventoryMaterialFilter = MaterialCategory | "all" | "items";

export interface InventoryPreviewState {
  equipmentItemId: string | null;
  material: {
    kind: "material" | "set-essence" | "item";
    id: MaterialId | SetId | RewardBoxId | "ad_ticket";
  } | null;
}

export type InventoryIntent =
  | { type: "rerender" }
  | { type: "noop" }
  | { type: "organize" }
  | { type: "open-salvage" }
  | { type: "open-equipment"; itemId: string }
  | { type: "open-material"; kind: "material"; id: MaterialId }
  | { type: "open-material"; kind: "set-essence"; id: SetId }
  | { type: "open-material"; kind: "item"; id: RewardBoxId | "ad_ticket" };

export class InventoryFeature {
  private materialFilter: InventoryMaterialFilter = "all";
  private bagTab: InventoryBagTab = "equipment";

  render(state: GameStoreState, preview: InventoryPreviewState): string {
    const equippedIds = collectEquippedItemIds(state.save.roster);
    const isMaterials = this.bagTab === "materials";
    const bagItems = [...REWARD_BOX_IDS, "ad_ticket"] as const;
    const itemCount = (id: RewardBoxId | "ad_ticket") =>
      id === "ad_ticket" ? state.save.adTickets : state.save.rewardBoxes[id];
    const ownedItems = bagItems.filter((id) => itemCount(id) > 0);

    const toolbar = isMaterials
      ? this.renderMaterialsToolbar(state, bagItems.length, ownedItems.length)
      : this.renderEquipmentToolbar(state, equippedIds);
    const bagBody = isMaterials
      ? this.renderMaterials(state, preview, bagItems, itemCount)
      : this.renderEquipment(state, preview.equipmentItemId, equippedIds);

    return `
      <div class="inventory-page">
        ${toolbar}
        <div class="inventory-layout">
          <nav class="inventory-side-tabs" role="tablist" aria-label="背包分类">
            <button type="button" class="inventory-side-tab ${!isMaterials ? "active" : ""}" data-action="inventory-bag-tab" data-tab="equipment" role="tab" aria-selected="${!isMaterials ? "true" : "false"}"><span class="inventory-tab-icon" aria-hidden="true">${NAV_ICONS.stages}</span><span>装备</span></button>
            <button type="button" class="inventory-side-tab ${isMaterials ? "active" : ""}" data-action="inventory-bag-tab" data-tab="materials" role="tab" aria-selected="${isMaterials ? "true" : "false"}"><span class="inventory-tab-icon" aria-hidden="true">${NAV_ICONS.alchemy}</span><span>材料</span></button>
          </nav>
          <section class="inventory-main" aria-label="${isMaterials ? "材料背包" : "装备背包"}">
            ${bagBody}
          </section>
        </div>
      </div>
    `;
  }

  handleAction(target: HTMLElement, state: GameStoreState): InventoryIntent | null {
    const action = target.dataset.action;
    if (action === "inventory-bag-tab") {
      const tab = target.dataset.tab === "materials" ? "materials" : "equipment";
      if (tab === this.bagTab) return { type: "noop" };
      this.bagTab = tab;
      return { type: "rerender" };
    }
    if (action === "inventory-organize") {
      if (this.bagTab === "materials") {
        this.materialFilter = "all";
        return { type: "rerender" };
      }
      return { type: "organize" };
    }
    if (action === "inventory-salvage-open") {
      return this.bagTab === "materials" ? { type: "noop" } : { type: "open-salvage" };
    }
    if (action === "item-detail") {
      const itemId = target.dataset.itemId;
      if (!itemId || !state.save.inventory.some((item) => item.instanceId === itemId)) return { type: "noop" };
      return { type: "open-equipment", itemId };
    }
    if (action === "inventory-consumable-detail") {
      const id = target.dataset.consumableId;
      return isRewardBoxId(id) || id === "ad_ticket"
        ? { type: "open-material", kind: "item", id }
        : { type: "noop" };
    }
    if (action === "inventory-material-detail") {
      const id = target.dataset.materialId as MaterialId | undefined;
      return id && MATERIAL_BY_ID[id]
        ? { type: "open-material", kind: "material", id }
        : { type: "noop" };
    }
    if (action === "inventory-set-essence-detail") {
      const id = target.dataset.setId as SetId | undefined;
      return id && SET_BY_ID[id]
        ? { type: "open-material", kind: "set-essence", id }
        : { type: "noop" };
    }
    return null;
  }

  handleChange(target: HTMLInputElement | HTMLSelectElement): boolean {
    if (target.dataset.action !== "inventory-material-filter") return false;
    this.materialFilter = target.value === "items"
      ? "items"
      : isMaterialCategory(target.value)
        ? target.value
        : "all";
    return true;
  }

  private renderMaterialsToolbar(
    state: GameStoreState,
    bagItemCount: number,
    ownedItemCount: number,
  ): string {
    const materialKinds = MATERIAL_DEFINITIONS.filter(
      (entry) => (state.save.materials[entry.id] ?? 0) > 0,
    ).length + SET_DEFINITIONS.filter(
      (set) => (state.save.setEssences[set.id] ?? 0) > 0,
    ).length + ownedItemCount;
    const canSalvage = MATERIAL_DEFINITIONS.some(
      (entry) => (state.save.materials[entry.id] ?? 0) > 0 && canSalvageMaterial(entry),
    );
    return `
      <div class="panel-heading compact" data-panel="inventory">
        <span class="panel-meta" aria-label="材料种类">材料 ${materialKinds}/${MATERIAL_DEFINITIONS.length + SET_DEFINITIONS.length + bagItemCount}</span>
        <div class="panel-actions">
          <button class="secondary-button compact" data-action="inventory-organize">整理</button>
          <button class="secondary-button compact" data-action="inventory-salvage-open" ${canSalvage ? "" : "disabled"} aria-disabled="${canSalvage ? "false" : "true"}">分解</button>
          <select class="filter-select" data-action="inventory-material-filter" aria-label="材料筛选">
            <option value="all" ${this.materialFilter === "all" ? "selected" : ""}>全部</option>
            <option value="items" ${this.materialFilter === "items" ? "selected" : ""}>宝箱与广告券</option>
            ${MATERIAL_CATEGORIES.map((category) =>
              `<option value="${category}" ${this.materialFilter === category ? "selected" : ""}>${MATERIAL_CATEGORY_LABELS[category]}</option>`,
            ).join("")}
          </select>
        </div>
      </div>
    `;
  }

  private renderEquipmentToolbar(
    state: GameStoreState,
    equippedIds: ReadonlySet<string>,
  ): string {
    const occupied = countBackpackItems(state.save.inventory, equippedIds);
    return `
      <div class="panel-heading compact" data-panel="inventory">
        <div class="inventory-capacity-summary">
          <span class="panel-meta" aria-label="装备背包容量">装备 ${occupied}/${getBackpackCapacity(state.save.abilities)}</span>
          <button type="button" class="inventory-capacity-add" data-action="ability-select" data-ability-id="backpack_slots" aria-label="提升装备背包容量" aria-haspopup="dialog"><span aria-hidden="true">+</span></button>
        </div>
        <div class="panel-actions">
          <button class="secondary-button compact" data-action="inventory-organize">整理</button>
          <button class="secondary-button compact" data-action="inventory-salvage-open">分解</button>
        </div>
      </div>
    `;
  }

  private renderMaterials(
    state: GameStoreState,
    preview: InventoryPreviewState,
    bagItems: readonly (RewardBoxId | "ad_ticket")[],
    itemCount: (id: RewardBoxId | "ad_ticket") => number,
  ): string {
    const ownedMaterials = MATERIAL_DEFINITIONS.filter(
      (entry) => (state.save.materials[entry.id] ?? 0) > 0,
    );
    const ownedSetEssences = SET_DEFINITIONS.filter(
      (set) => (state.save.setEssences[set.id] ?? 0) > 0,
    );
    const visibleMaterials = ownedMaterials.filter(
      (entry) => this.materialFilter === "all" || entry.category === this.materialFilter,
    );
    const visibleSetEssences = ownedSetEssences.filter(
      () => this.materialFilter === "all" || this.materialFilter === "imprint",
    );
    const visibleItems = this.materialFilter === "all" || this.materialFilter === "items"
      ? bagItems.filter((id) => itemCount(id) > 0 || (preview.material?.kind === "item" && preview.material.id === id))
      : [];

    if (!ownedMaterials.length && !ownedSetEssences.length && !visibleItems.length) {
      return `<div class="empty-state"><span>◈</span><strong>材料背包还是空的</strong><p>远征与冒险会掉落工艺材料</p><button data-action="open-stages" class="secondary-button">前往远征</button></div>`;
    }
    if (!visibleMaterials.length && !visibleSetEssences.length && !visibleItems.length) {
      return `<div class="empty-state"><span>◈</span><strong>该分类下没有材料</strong><p>试试其他分类，或前往远征获取</p></div>`;
    }

    return `<div class="item-grid inventory-grid">${visibleItems.map((id) => {
      const info = id === "ad_ticket" ? AD_TICKET : REWARD_BOXES[id];
      const previewing = preview.material?.kind === "item" && preview.material.id === id;
      return `<button type="button" class="item-card material-item-card ${previewing ? "equipment-previewing" : ""}" data-action="inventory-consumable-detail" data-consumable-id="${id}" aria-label="${info.name}，库存 ${itemCount(id)}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${previewing}"><span class="item-icon material-icon" aria-hidden="true">${materialArt(info.icon)}</span><span class="material-stack">×${itemCount(id)}</span></button>`;
    }).join("")}${visibleMaterials.map((entry) => {
      const count = state.save.materials[entry.id] ?? 0;
      const previewing = preview.material?.kind === "material" && preview.material.id === entry.id;
      return `<button type="button" class="item-card material-item-card tone-${entry.tone} ${previewing ? "equipment-previewing" : ""}" data-action="inventory-material-detail" data-material-id="${entry.id}" aria-label="${entry.name}，库存 ${count}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${previewing}">
        <span class="item-icon material-icon" aria-hidden="true">${materialArt(entry.icon)}</span>
        <span class="material-stack">×${count}</span>
      </button>`;
    }).join("")}${visibleSetEssences.map((set) => {
      const count = state.save.setEssences[set.id] ?? 0;
      const previewing = preview.material?.kind === "set-essence" && preview.material.id === set.id;
      return `<button type="button" class="item-card material-item-card set-essence-card ${previewing ? "equipment-previewing" : ""}" data-action="inventory-set-essence-detail" data-set-id="${set.id}" aria-label="${set.name}精华，库存 ${count}" aria-haspopup="dialog" aria-controls="global-material-tips" aria-expanded="${previewing}">
        <span class="item-icon set-essence-icon" aria-hidden="true"><img class="material-art" src="/assets/resources/mat_set_essence.png" alt=""></span>
        <span class="set-essence-badge ${set.school}" aria-hidden="true">${setNameInitial(set.id)}</span>
        <span class="material-stack">×${count}</span>
      </button>`;
    }).join("")}</div>`;
  }

  private renderEquipment(
    state: GameStoreState,
    previewItemId: string | null,
    equippedIds: ReadonlySet<string>,
  ): string {
    const visibleItems = backpackItems(state.save.inventory, equippedIds);
    if (!visibleItems.length) {
      return `<div class="empty-state"><span>🎒</span><strong>装备背包还是空的</strong><p>小队会在战斗中自动收集装备</p><button data-action="open-stages" class="secondary-button">查看当前关卡</button></div>`;
    }
    return `<div class="item-grid inventory-grid">${visibleItems.map((item) =>
      this.renderItemCard(item, previewItemId === item.instanceId),
    ).join("")}</div>`;
  }

  private renderItemCard(item: InventoryItem, previewing: boolean): string {
    const definition = ITEM_BY_ID[item.definitionId]!;
    return `
      <button class="item-card ${rarityClass(item.rarity)} ${previewing ? "equipment-previewing" : ""}" data-action="item-detail" data-item-id="${item.instanceId}" aria-label="${RARITY_LABELS[item.rarity]}${definition.name}${legendaryTraitAria(item)}" aria-haspopup="dialog" aria-controls="global-equipment-tips" aria-expanded="${previewing}">
        <span class="item-icon" aria-hidden="true">${equipmentArt(definition.icon)}</span>
        ${equipmentSpecialMarks(item)}
        ${itemLevelBadge(item)}
      </button>
    `;
  }
}
