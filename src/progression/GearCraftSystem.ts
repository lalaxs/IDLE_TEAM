import { AFFIX_BY_ID, getAffixRange, getAffixesForSlot, type AffixId, type AffixRoll } from "../content/affixes";
import {
  MATERIAL_BY_ID,
  MAX_EQUIPMENT_SOCKETS,
  type MaterialId,
} from "../content/materials";
import type { InventoryItem, ItemSocket } from "./EquipmentSystem";
import { getItemBudget } from "./EquipmentSystem";
import type { RandomSource } from "../simulation/RandomSource";
import type { Rarity } from "../content/rarities";

export type CraftMode = "upgrade" | "inlay" | "reset" | "smelt" | "socket";

export const CRAFT_MODE_LABELS: Record<CraftMode, string> = {
  upgrade: "升品",
  inlay: "镶嵌",
  reset: "重置",
  smelt: "熔炼",
  socket: "开孔",
};

export const CRAFT_MODE_HINTS: Record<CraftMode, string> = {
  upgrade: "放入 9 个同品质装备，可炼成更高级品质装备",
  inlay: "装备须先开孔，再选择宝石镶入空孔（最多 2 孔）",
  reset: "放入装备后选择一条词条重置；材料充足时自动消耗，不足则无法重置",
  smelt: "放入装备后选择要熔入的词条；材料充足时自动消耗，不足则无法熔炼",
  socket: "消耗开孔石，为装备开辟宝石孔位（最多 2 孔）",
};

function ensureSockets(item: InventoryItem): ItemSocket[] {
  if (!Array.isArray(item.sockets)) item.sockets = [];
  return item.sockets;
}

function rollValueForAffix(
  affixId: AffixId,
  rarity: Rarity,
  budget: number,
  random: RandomSource,
): number {
  if (rarity === "common") return 1;
  const definition = AFFIX_BY_ID[affixId];
  const range = getAffixRange(definition, rarity);
  if (definition.kind === "percent") {
    return random.int(Math.round(range.min), Math.round(range.max));
  }
  const mult = range.min + random.next() * (range.max - range.min);
  return Math.max(1, Math.round(budget * mult));
}

export function spendMaterial(
  materials: Record<MaterialId, number>,
  materialId: MaterialId,
  amount = 1,
): boolean {
  const have = materials[materialId] ?? 0;
  if (have < amount) return false;
  materials[materialId] = have - amount;
  return true;
}

export function openEquipmentSocket(
  item: InventoryItem,
  materials: Record<MaterialId, number>,
): { ok: true } | { ok: false; reason: string } {
  const sockets = ensureSockets(item);
  if (sockets.length >= MAX_EQUIPMENT_SOCKETS) {
    return { ok: false, reason: "已达最大孔位数" };
  }
  if (!spendMaterial(materials, "mat_socket_stone", 1)) {
    return { ok: false, reason: "开孔石不足" };
  }
  sockets.push({ gemId: null });
  return { ok: true };
}

export function resetEquipmentAffix(
  item: InventoryItem,
  affixIndex: number,
  materials: Record<MaterialId, number>,
  random: RandomSource,
): { ok: true; affix: AffixRoll; affixIndex: number } | { ok: false; reason: string } {
  const affixes = item.affixes ?? [];
  if (affixes.length === 0) {
    return { ok: false, reason: "该装备没有可重置的词条" };
  }
  if (item.rarity === "common") {
    return { ok: false, reason: "普通品质没有词条" };
  }
  if (!Number.isInteger(affixIndex) || affixIndex < 0 || affixIndex >= affixes.length) {
    return { ok: false, reason: "请选择要重置的词条" };
  }
  const locked = item.resetAffixIndex;
  if (typeof locked === "number" && locked !== affixIndex) {
    return { ok: false, reason: "该装备只能继续重置已锁定的词条" };
  }
  const target = affixes[affixIndex];
  if (!target) return { ok: false, reason: "请选择要重置的词条" };
  if (!spendMaterial(materials, "mat_reset_scroll", 1)) {
    return { ok: false, reason: "重置卷轴不足" };
  }
  const budget = getItemBudget(item.stage, item.rarity, 1);
  const next: AffixRoll = {
    affixId: target.affixId,
    value: rollValueForAffix(target.affixId, item.rarity, budget, random),
  };
  affixes[affixIndex] = next;
  item.affixes = affixes;
  item.resetAffixIndex = affixIndex;
  return { ok: true, affix: next, affixIndex };
}

export function smeltEquipmentAffix(
  item: InventoryItem,
  affixId: AffixId,
  materials: Record<MaterialId, number>,
  random: RandomSource,
): { ok: true; roll: AffixRoll } | { ok: false; reason: string } {
  if (item.rarity === "common") {
    return { ok: false, reason: "普通品质无法熔炼词条" };
  }
  const allowed = getAffixesForSlot(item.slot);
  if (!allowed.some((entry) => entry.id === affixId)) {
    return { ok: false, reason: "该词条不适用于此部位" };
  }
  if (!spendMaterial(materials, "mat_smelt_flux", 1)) {
    return { ok: false, reason: "熔炼触媒不足" };
  }
  const budget = getItemBudget(item.stage, item.rarity, 1);
  const roll: AffixRoll = {
    affixId,
    value: rollValueForAffix(affixId, item.rarity, budget, random),
  };
  if (!item.affixes) item.affixes = [];
  item.affixes.push(roll);
  return { ok: true, roll };
}

export function inlayGem(
  item: InventoryItem,
  socketIndex: number,
  gemId: MaterialId,
  materials: Record<MaterialId, number>,
): { ok: true } | { ok: false; reason: string } {
  const sockets = ensureSockets(item);
  const socket = sockets[socketIndex];
  if (!socket) return { ok: false, reason: "孔位未开启" };
  if (socket.gemId) return { ok: false, reason: "该孔位已有宝石" };
  const definition = MATERIAL_BY_ID[gemId];
  if (!definition || definition.kind !== "gem") {
    return { ok: false, reason: "请选择宝石" };
  }
  if (!spendMaterial(materials, gemId, 1)) {
    return { ok: false, reason: "宝石不足" };
  }
  socket.gemId = gemId;
  return { ok: true };
}

export function removeGem(
  item: InventoryItem,
  socketIndex: number,
  materials: Record<MaterialId, number>,
): { ok: true; gemId: MaterialId } | { ok: false; reason: string } {
  const sockets = ensureSockets(item);
  const socket = sockets[socketIndex];
  if (!socket?.gemId) return { ok: false, reason: "孔位为空" };
  const gemId = socket.gemId as MaterialId;
  socket.gemId = null;
  materials[gemId] = (materials[gemId] ?? 0) + 1;
  return { ok: true, gemId };
}

export function normalizeSockets(raw: unknown): ItemSocket[] {
  if (!Array.isArray(raw)) return [];
  const result: ItemSocket[] = [];
  for (const entry of raw) {
    if (result.length >= MAX_EQUIPMENT_SOCKETS) break;
    if (!entry || typeof entry !== "object") {
      result.push({ gemId: null });
      continue;
    }
    const gemId = (entry as { gemId?: unknown }).gemId;
    if (typeof gemId === "string" && MATERIAL_BY_ID[gemId as MaterialId]?.kind === "gem") {
      result.push({ gemId });
    } else {
      result.push({ gemId: null });
    }
  }
  return result;
}

export function getSmeltAffixChoices(item: InventoryItem): AffixId[] {
  return getAffixesForSlot(item.slot).map((entry) => entry.id);
}
