import type { GameStoreState } from "../../../app/GameStore";
import type { GameAction } from "../../../app/actions";
import { AFFIX_BY_ID, type AffixId } from "../../../content/affixes";
import {
  MATERIAL_BY_ID,
  MAX_EQUIPMENT_SOCKETS,
  isGemMaterialId,
  type GemGroup,
  type GemMaterialId,
  type MaterialId,
} from "../../../content/materials";
import { SET_BY_ID, type SetId } from "../../../content/sets";
import { getEquipmentSetId } from "../../../progression/EquipmentSystem";
import {
  CRAFT_MODE_LABELS,
  canImprintSetOnSlot,
  getSetImprintPreview,
  getSmeltAffixChoices,
  type CraftMode,
} from "../../../progression/GearCraftSystem";

export interface CraftInteractionContext {
  selectedEquipmentItemId: string | null;
  selectedMaterialId: MaterialId | null;
  modalPayload: unknown;
}

export type CraftModalName =
  | "reset-affix-tips"
  | "smelt-affix-tips"
  | "set-imprint-picker";

export type CraftIntent =
  | { type: "noop" }
  | { type: "toast"; message: string }
  | {
      type: "updated";
      closeTips?: boolean;
      closeEquipment?: boolean;
      closeModal?: boolean;
      clearSelectedMaterial?: boolean;
      materialPreviewId?: MaterialId;
      openEquipmentItemId?: string;
      toast?: string;
    }
  | { type: "open-equipment"; itemId: string }
  | { type: "open-cost-material"; materialId: MaterialId }
  | { type: "open-imprint-material"; kind: "essence" | "stone"; setId: SetId }
  | { type: "open-modal"; modal: CraftModalName; payload?: unknown }
  | { type: "update-modal"; payload: unknown }
  | { type: "dispatch"; action: GameAction };

export class CraftFeature {
  private currentMode: CraftMode = "upgrade";
  private menuOpen = false;
  private currentListTab: "equipment" | "materials" = "equipment";
  private currentGemGroup: GemGroup = "offense";
  private fusionSlots: (GemMaterialId | null)[] = [null, null, null];
  private currentTargetId: string | null = null;
  private currentSetId: SetId | null = null;
  private currentMaterialId: MaterialId | null = null;
  private currentSmeltAffixId: AffixId | null = null;
  private currentResetAffixIndex: number | null = null;
  private currentSocketIndex = 0;
  private currentOpenSocketIndex: number | null = null;

  get mode(): CraftMode { return this.currentMode; }
  get modeMenuOpen(): boolean { return this.menuOpen; }
  get listTab(): "equipment" | "materials" { return this.currentListTab; }
  get gemGroup(): GemGroup { return this.currentGemGroup; }
  get gemFusionSlots(): readonly (GemMaterialId | null)[] { return this.fusionSlots; }
  get targetId(): string | null { return this.currentTargetId; }
  get selectedSetId(): SetId | null { return this.currentSetId; }
  get materialId(): MaterialId | null { return this.currentMaterialId; }
  get smeltAffixId(): AffixId | null { return this.currentSmeltAffixId; }
  get resetAffixIndex(): number | null { return this.currentResetAffixIndex; }
  get socketIndex(): number { return this.currentSocketIndex; }
  get openSocketIndex(): number | null { return this.currentOpenSocketIndex; }

  sync(state: GameStoreState): void {
    const target = this.target(state);
    if (this.currentTargetId && !target) this.clearTarget();
    if (this.currentMaterialId && (state.save.materials[this.currentMaterialId] ?? 0) <= 0) {
      this.currentMaterialId = null;
    }
    const syncedTarget = this.target(state);
    if (this.currentMode === "socket") {
      const sockets = syncedTarget?.sockets?.length ?? 0;
      if (this.currentOpenSocketIndex != null && this.currentOpenSocketIndex !== sockets) {
        this.currentOpenSocketIndex = null;
      }
    }
    if (this.currentMode === "reset") {
      const affixes = syncedTarget?.affixes ?? [];
      const lockedIndex = typeof syncedTarget?.resetAffixIndex === "number"
        ? syncedTarget.resetAffixIndex
        : null;
      if (
        this.currentResetAffixIndex != null
        && (this.currentResetAffixIndex < 0 || this.currentResetAffixIndex >= affixes.length)
      ) {
        this.currentResetAffixIndex = null;
      }
      if (lockedIndex != null) this.currentResetAffixIndex = lockedIndex;
      else if (this.currentResetAffixIndex == null && affixes.length === 1) {
        this.currentResetAffixIndex = 0;
      }
    }
    if (
      this.currentMode === "smelt"
      && syncedTarget
      && this.currentSmeltAffixId
      && !getSmeltAffixChoices(syncedTarget).includes(this.currentSmeltAffixId)
    ) {
      this.currentSmeltAffixId = null;
    }
    if (this.currentMode === "inlay") {
      const sockets = syncedTarget?.sockets ?? [];
      if (sockets.length && this.currentSocketIndex >= sockets.length) this.currentSocketIndex = 0;
    }
  }

  selectTaskMode(mode: "upgrade" | "socket" | "fusion"): void {
    this.currentMode = mode;
    this.menuOpen = false;
    this.currentListTab = mode === "fusion" ? "materials" : "equipment";
  }

  isTarget(itemId: string): boolean {
    return this.currentTargetId === itemId;
  }

  isMaterialSelected(materialId: MaterialId): boolean {
    return this.currentMaterialId === materialId;
  }

  materialCanInteract(): boolean {
    return this.currentMode !== "upgrade"
      && this.currentMode !== "socket"
      && this.currentMode !== "reset"
      && this.currentMode !== "smelt";
  }

  applySetSelection(itemId: string, setId: SetId): boolean {
    if (itemId !== this.currentTargetId) return false;
    this.currentSetId = setId;
    return true;
  }

  handleAction(
    target: HTMLElement,
    state: GameStoreState,
    context: CraftInteractionContext,
  ): CraftIntent | null {
    const action = target.dataset.action;
    if (action === "craft-mode-toggle") {
      this.menuOpen = !this.menuOpen;
      return { type: "updated" };
    }
    if (action === "craft-mode-select") {
      const mode = target.dataset.mode as CraftMode | undefined;
      if (!mode || !(mode in CRAFT_MODE_LABELS)) return { type: "noop" };
      this.currentMode = mode;
      this.menuOpen = false;
      this.currentSmeltAffixId = null;
      this.currentResetAffixIndex = null;
      this.currentSetId = null;
      this.currentMaterialId = null;
      this.currentOpenSocketIndex = null;
      this.fusionSlots = [null, null, null];
      if (mode === "fusion") {
        this.currentListTab = "materials";
        this.currentTargetId = null;
      } else if (["imprint", "inlay", "socket", "reset", "smelt"].includes(mode)) {
        this.currentListTab = "equipment";
      }
      return { type: "updated", closeTips: true, clearSelectedMaterial: true };
    }
    if (action === "alchemy-list-tab") {
      this.currentListTab = target.dataset.tab === "materials" ? "materials" : "equipment";
      return { type: "updated", closeTips: true };
    }
    if (action === "gem-fusion-group") {
      const group = target.dataset.gemGroup as GemGroup | undefined;
      if (!group || !(["offense", "defense", "tactical"] as const).includes(group)) {
        return { type: "noop" };
      }
      this.currentGemGroup = group;
      return { type: "updated", closeTips: true };
    }
    if (action === "gem-fusion-material-add") {
      const gemId = target.dataset.gemId;
      if (!gemId || !isGemMaterialId(gemId) || MATERIAL_BY_ID[gemId].gemRank === 6) {
        return { type: "noop" };
      }
      const selected = this.fusionSlots.filter((slot) => slot === gemId).length;
      if (selected >= (state.save.materials[gemId] ?? 0)) return { type: "noop" };
      const emptyIndex = this.fusionSlots.findIndex((slot) => slot === null);
      if (emptyIndex < 0) return { type: "noop" };
      this.fusionSlots[emptyIndex] = gemId;
      return { type: "updated" };
    }
    if (action === "gem-fusion-slot-clear") {
      const slot = Number(target.dataset.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot >= this.fusionSlots.length) {
        return { type: "noop" };
      }
      this.fusionSlots[slot] = null;
      return { type: "updated" };
    }
    if (action === "craft-item-select") {
      const itemId = target.dataset.itemId;
      if (!itemId || this.currentMode === "upgrade" || this.currentMode === "fusion") {
        return { type: "noop" };
      }
      const item = state.save.inventory.find((entry) => entry.instanceId === itemId);
      if (!item || (this.currentMode === "imprint" && getEquipmentSetId(item))) {
        return { type: "noop" };
      }
      if (this.currentTargetId === itemId) return { type: "noop" };
      this.selectTarget(item);
      return {
        type: "updated",
        closeTips: true,
        clearSelectedMaterial: this.currentMode === "inlay",
        openEquipmentItemId: itemId,
      };
    }
    if (action === "craft-item-detail") {
      const itemId = target.dataset.itemId;
      return itemId && state.save.inventory.some((item) => item.instanceId === itemId)
        ? { type: "open-equipment", itemId }
        : { type: "noop" };
    }
    if (action === "craft-item-put") {
      const itemId = context.selectedEquipmentItemId;
      if (!itemId) return { type: "noop" };
      const item = state.save.inventory.find((entry) => entry.instanceId === itemId);
      if (!item) return { type: "noop" };
      this.selectTarget(item);
      return {
        type: "updated",
        closeTips: true,
        closeEquipment: true,
        clearSelectedMaterial: this.currentMode === "inlay",
      };
    }
    if (action === "craft-item-remove") {
      const itemId = target.dataset.itemId ?? context.selectedEquipmentItemId;
      if (!itemId || this.currentTargetId !== itemId) return { type: "noop" };
      const inlay = this.currentMode === "inlay";
      this.clearTarget();
      if (inlay) this.currentListTab = "equipment";
      return {
        type: "updated",
        closeTips: inlay,
        closeEquipment: true,
        clearSelectedMaterial: inlay,
      };
    }
    if (action === "craft-material-detail") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return { type: "noop" };
      this.currentListTab = "materials";
      const count = state.save.materials[materialId] ?? 0;
      let toast: string | undefined;
      const needsMaterialSlot = ["inlay", "reset", "smelt"].includes(this.currentMode);
      if (needsMaterialSlot) {
        if (count <= 0) toast = "材料不足";
        else if (this.currentMode === "inlay" && MATERIAL_BY_ID[materialId].kind !== "gem") {
          toast = "请选择宝石";
        } else if (this.currentMode === "reset" && materialId !== "mat_reset_scroll") {
          toast = "请放入重置卷轴";
        } else if (this.currentMode === "smelt" && materialId !== "mat_smelt_flux") {
          toast = "请放入熔炼触媒";
        } else if (this.currentMode === "inlay") {
          this.currentMaterialId = materialId;
        }
      }
      return { type: "updated", closeModal: true, materialPreviewId: materialId, toast };
    }
    if (action === "craft-cost-material-tip") {
      const materialId = target.dataset.materialId as MaterialId | undefined;
      return materialId && MATERIAL_BY_ID[materialId]
        ? { type: "open-cost-material", materialId }
        : { type: "noop" };
    }
    if (action === "craft-imprint-material-tip") {
      const kind = target.dataset.materialKind;
      if (
        this.currentMode !== "imprint"
        || !this.currentSetId
        || (kind !== "essence" && kind !== "stone")
      ) return { type: "noop" };
      return { type: "open-imprint-material", kind, setId: this.currentSetId };
    }
    if (action === "craft-material-put") {
      const materialId = context.selectedMaterialId;
      if (!materialId || !MATERIAL_BY_ID[materialId]) return { type: "noop" };
      if ((state.save.materials[materialId] ?? 0) <= 0) return { type: "toast", message: "材料不足" };
      if (this.currentMode === "inlay" && MATERIAL_BY_ID[materialId].kind !== "gem") {
        return { type: "toast", message: "请选择宝石" };
      }
      if (this.currentMode === "reset" && materialId !== "mat_reset_scroll") {
        return { type: "toast", message: "请放入重置卷轴" };
      }
      if (this.currentMode === "smelt" && materialId !== "mat_smelt_flux") {
        return { type: "toast", message: "请放入熔炼触媒" };
      }
      this.currentMaterialId = materialId;
      return { type: "updated", closeModal: true, materialPreviewId: materialId };
    }
    if (action === "craft-material-remove") {
      const materialId = (target.dataset.materialId as MaterialId | undefined)
        ?? context.selectedMaterialId;
      if (!materialId || this.currentMaterialId !== materialId) return { type: "noop" };
      this.currentMaterialId = null;
      return {
        type: "updated",
        closeTips: true,
        closeModal: true,
        clearSelectedMaterial: true,
      };
    }
    if (action === "craft-reset-affix-open") {
      const item = this.target(state);
      if (!item || item.affixes.length === 0) {
        return { type: "toast", message: "该装备没有可重置词条" };
      }
      return { type: "open-modal", modal: "reset-affix-tips" };
    }
    if (action === "craft-reset-affix") {
      const index = Number(target.dataset.affixIndex);
      const item = this.target(state);
      if (!item || !Number.isInteger(index) || index < 0) return { type: "noop" };
      if (typeof item.resetAffixIndex === "number" && item.resetAffixIndex !== index) {
        return { type: "toast", message: "只能继续重置已锁定的词条" };
      }
      this.currentResetAffixIndex = index;
      return { type: "updated", closeModal: true };
    }
    if (action === "craft-smelt-affix-open") {
      const item = this.target(state);
      if (!item || item.rarity === "common") {
        return { type: "toast", message: "请先放入可熔炼的装备" };
      }
      if (!getSmeltAffixChoices(item).length) {
        return { type: "toast", message: "该部位暂无可熔炼词条" };
      }
      return { type: "open-modal", modal: "smelt-affix-tips" };
    }
    if (action === "craft-smelt-affix") {
      const affixId = target.dataset.affixId as AffixId | undefined;
      if (!affixId || !AFFIX_BY_ID[affixId]) return { type: "noop" };
      this.currentSmeltAffixId = affixId;
      return { type: "updated", closeModal: true };
    }
    if (action === "craft-set-select") {
      const setId = target.dataset.setId as SetId | undefined;
      const payload = context.modalPayload as { itemId?: string; draftSetId?: SetId | null } | null;
      const item = payload?.itemId
        ? state.save.inventory.find((entry) => entry.instanceId === payload.itemId)
        : null;
      if (!setId || !SET_BY_ID[setId] || !item || !canImprintSetOnSlot(setId, item.slot)) {
        return { type: "noop" };
      }
      return { type: "update-modal", payload: { itemId: item.instanceId, draftSetId: setId } };
    }
    if (action === "craft-set-apply") {
      const payload = context.modalPayload as { itemId?: string; draftSetId?: SetId | null } | null;
      const setId = payload?.draftSetId ?? null;
      const item = payload?.itemId
        ? state.save.inventory.find((entry) => entry.instanceId === payload.itemId)
        : null;
      if (!item || !setId || !canImprintSetOnSlot(setId, item.slot) || !this.applySetSelection(item.instanceId, setId)) {
        return { type: "noop" };
      }
      return { type: "updated", closeModal: true };
    }
    if (action === "craft-inlay-open-socket") {
      if (!this.currentTargetId || this.currentMode !== "inlay") return { type: "noop" };
      this.currentMode = "socket";
      this.menuOpen = false;
      this.currentMaterialId = null;
      this.currentOpenSocketIndex = null;
      this.currentListTab = "equipment";
      return { type: "updated", closeTips: true, clearSelectedMaterial: true };
    }
    if (action === "craft-open-socket-pick") {
      const index = Number(target.dataset.socketIndex);
      const item = this.target(state);
      const nextSocketIndex = item?.sockets?.length ?? 0;
      if (!item || !Number.isInteger(index) || index !== nextSocketIndex || index >= MAX_EQUIPMENT_SOCKETS) {
        return { type: "noop" };
      }
      this.currentOpenSocketIndex = index;
      return { type: "updated" };
    }
    if (action === "craft-socket-pick") {
      const index = Number(target.dataset.socketIndex);
      const item = this.target(state);
      if (!Number.isInteger(index) || index < 0 || index >= (item?.sockets?.length ?? 0)) {
        return { type: "noop" };
      }
      this.currentSocketIndex = index;
      if (this.currentMode === "inlay" && !item?.sockets?.[index]?.gemId) {
        this.currentListTab = "materials";
      }
      return { type: "updated" };
    }
    if (action === "craft-fuse-selected-gems") {
      const gemId = target.dataset.gemId;
      const filled = this.fusionSlots.filter((slot): slot is GemMaterialId => Boolean(slot));
      if (!gemId || !isGemMaterialId(gemId) || filled.length !== 3 || !filled.every((slot) => slot === gemId)) {
        return { type: "noop" };
      }
      this.fusionSlots = [null, null, null];
      return { type: "dispatch", action: { type: "craft:fuseGemRank", gemId } };
    }
    if (action === "craft-fuse-all-gems") {
      this.fusionSlots = [null, null, null];
      return { type: "dispatch", action: { type: "craft:fuseAllGems" } };
    }
    if (action === "craft-socket") {
      const item = this.target(state);
      const nextSocketIndex = item?.sockets?.length ?? 0;
      if (!item || this.currentOpenSocketIndex !== nextSocketIndex || nextSocketIndex >= MAX_EQUIPMENT_SOCKETS) {
        return { type: "noop" };
      }
      this.currentOpenSocketIndex = null;
      return { type: "dispatch", action: { type: "craft:socket", itemId: item.instanceId } };
    }
    if (action === "craft-imprint-request") {
      if (!this.currentTargetId) return { type: "noop" };
      return {
        type: "open-modal",
        modal: "set-imprint-picker",
        payload: { itemId: this.currentTargetId, draftSetId: this.currentSetId },
      };
    }
    if (action === "craft-imprint-confirm") {
      const item = this.target(state);
      const setId = this.currentSetId;
      if (!item || !setId || !SET_BY_ID[setId]) return { type: "noop" };
      const preview = getSetImprintPreview(item, setId, state.save.setEssences, state.save.materials);
      if (preview.reason) return { type: "updated", toast: preview.reason };
      this.currentTargetId = null;
      this.currentSetId = null;
      return { type: "dispatch", action: { type: "craft:imprint", itemId: item.instanceId, setId } };
    }
    if (action === "craft-reset") {
      if (!this.currentTargetId || this.currentResetAffixIndex == null) return { type: "noop" };
      return {
        type: "dispatch",
        action: { type: "craft:reset", itemId: this.currentTargetId, affixIndex: this.currentResetAffixIndex },
      };
    }
    if (action === "craft-smelt") {
      if (!this.currentTargetId || !this.currentSmeltAffixId) return { type: "noop" };
      return {
        type: "dispatch",
        action: { type: "craft:smelt", itemId: this.currentTargetId, affixId: this.currentSmeltAffixId },
      };
    }
    if (action === "craft-inlay") {
      if (!this.currentTargetId || !this.currentMaterialId || !isGemMaterialId(this.currentMaterialId)) {
        return { type: "noop" };
      }
      return {
        type: "dispatch",
        action: {
          type: "craft:inlay",
          itemId: this.currentTargetId,
          socketIndex: this.currentSocketIndex,
          gemId: this.currentMaterialId,
        },
      };
    }
    if (action === "craft-remove-gem") {
      if (!this.currentTargetId) return { type: "noop" };
      this.currentListTab = "materials";
      return {
        type: "dispatch",
        action: { type: "craft:removeGem", itemId: this.currentTargetId, socketIndex: this.currentSocketIndex },
      };
    }
    return null;
  }

  private target(state: GameStoreState) {
    return this.currentTargetId
      ? state.save.inventory.find((item) => item.instanceId === this.currentTargetId) ?? null
      : null;
  }

  private selectTarget(item: GameStoreState["save"]["inventory"][number]): void {
    this.currentTargetId = item.instanceId;
    this.currentSetId = null;
    this.currentSmeltAffixId = null;
    this.currentResetAffixIndex = null;
    this.currentSocketIndex = 0;
    this.currentOpenSocketIndex = null;
    if (this.currentMode === "inlay") {
      this.currentMaterialId = null;
      this.currentListTab = (item.sockets?.length ?? 0) > 0 ? "materials" : "equipment";
    }
    if (this.currentMode === "reset") {
      if (typeof item.resetAffixIndex === "number") this.currentResetAffixIndex = item.resetAffixIndex;
      else if (item.affixes.length === 1) this.currentResetAffixIndex = 0;
    }
  }

  private clearTarget(): void {
    this.currentTargetId = null;
    this.currentSmeltAffixId = null;
    this.currentResetAffixIndex = null;
    this.currentSetId = null;
    this.currentSocketIndex = 0;
    this.currentOpenSocketIndex = null;
    if (this.currentMode === "inlay") this.currentMaterialId = null;
  }
}
