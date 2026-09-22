import {
  AFFIX_BY_ID,
  getAffixRange,
  getAffixesForSlot,
  SMELT_AFFIX_POWER_MULTIPLIER,
  type AffixId,
  type AffixRoll,
} from "../content/affixes";
import {
  GEM_FUSION_COST,
  GEM_RANKS,
  MATERIAL_BY_ID,
  MAX_EQUIPMENT_SOCKETS,
  getGemMaterialId,
  isGemMaterialId,
  type GemBaseId,
  type GemMaterialId,
  type GemRank,
  type MaterialId,
} from "../content/materials";
import { getEquipmentSetId, type InventoryItem, type ItemSocket } from "./EquipmentSystem";
import {
  getEquipmentLevel,
  getItemBudget,
} from "./EquipmentSystem";
import type { RandomSource } from "../simulation/RandomSource";
import type { Rarity } from "../content/rarities";
import { EQUIPMENT_SLOTS, ITEM_BY_ID, type EquipmentSlot } from "../content/items";
import {
  SET_BY_ID,
  type SetEssenceInventory,
  type SetId,
} from "../content/sets";

export type CraftMode = "upgrade" | "fusion" | "imprint" | "inlay" | "reset" | "smelt" | "socket";

export const CRAFT_MODE_LABELS: Record<CraftMode, string> = {
  upgrade: "升品",
  fusion: "宝石合成",
  imprint: "套装刻印",
  inlay: "镶嵌",
  reset: "重置",
  smelt: "熔炼",
  socket: "开孔",
};

export const SOCKET_GOLD_COST = 2_000;
export const SMELT_GOLD_COST = 5_000;

export const CRAFT_MODE_HINTS: Record<CraftMode, string> = {
  upgrade: "放入 9 个同品质装备，可炼成更高级品质装备",
  fusion: "同类同级宝石 3 合 1，一键连续合成至当前最高等级",
  imprint: "选择非套装装备与套装标签，消耗对应套装精华和套装刻印石",
  inlay: "装备须先开孔，再选择宝石镶入空孔（最多 2 孔）",
  reset: "放入装备后选择一条词条重置；材料充足时自动消耗，不足则无法重置",
  smelt: `选择一条熔炼词条，消耗熔炼触媒和 ${SMELT_GOLD_COST} 金币；再次熔炼会替换原熔炼词条`,
  socket: `消耗开孔石和 ${SOCKET_GOLD_COST} 金币，为装备开辟宝石孔位（最多 2 孔）`,
};

export const SET_IMPRINT_ESSENCE_COST = 4;
export const SET_IMPRINT_STONE_COST = 1;
export const SET_ESSENCE_SALVAGE_YIELD = 1;
export const SOCKET_STONE_COSTS = [1, 3] as const;

export function getSocketStoneCost(openedSocketCount: number): number {
  return SOCKET_STONE_COSTS[Math.min(openedSocketCount, SOCKET_STONE_COSTS.length - 1)]!;
}

export interface SetImprintPreview {
  setId: SetId;
  essenceCost: number;
  stoneCost: number;
  reason: string | null;
}

export function canImprintSetOnSlot(setId: SetId, slot: EquipmentSlot): boolean {
  return Boolean(SET_BY_ID[setId]) && EQUIPMENT_SLOTS.includes(slot);
}

export function getSetImprintPreview(
  item: InventoryItem,
  setId: SetId,
  setEssences: SetEssenceInventory,
  materials: Record<MaterialId, number>,
): SetImprintPreview {
  const result: SetImprintPreview = {
    setId,
    essenceCost: SET_IMPRINT_ESSENCE_COST,
    stoneCost: SET_IMPRINT_STONE_COST,
    reason: null,
  };
  if (getEquipmentSetId(item)) {
    return { ...result, reason: "该装备已有套装标签" };
  }
  if (!SET_BY_ID[setId]) {
    return { ...result, reason: "套装标签无效" };
  }
  if (!canImprintSetOnSlot(setId, item.slot)) {
    return { ...result, reason: "该套装不支持此装备部位" };
  }
  if ((setEssences[setId] ?? 0) < SET_IMPRINT_ESSENCE_COST) {
    return { ...result, reason: `${SET_BY_ID[setId].name}精华不足` };
  }
  if ((materials.mat_set_inscription ?? 0) < SET_IMPRINT_STONE_COST) {
    return { ...result, reason: "套装刻印石不足" };
  }
  return result;
}

export function imprintSetTag(
  item: InventoryItem,
  setId: SetId,
  setEssences: SetEssenceInventory,
  materials: Record<MaterialId, number>,
): { ok: true; setId: SetId; essenceCost: number; stoneCost: number } | { ok: false; reason: string } {
  const preview = getSetImprintPreview(item, setId, setEssences, materials);
  if (preview.reason) return { ok: false, reason: preview.reason };
  setEssences[setId] -= preview.essenceCost;
  materials.mat_set_inscription -= preview.stoneCost;
  item.setId = setId;
  return {
    ok: true,
    setId,
    essenceCost: preview.essenceCost,
    stoneCost: preview.stoneCost,
  };
}

export function getSetEssenceSalvageReward(item: InventoryItem): { setId: SetId; amount: number } | null {
  const setId = getEquipmentSetId(item);
  return setId ? { setId, amount: SET_ESSENCE_SALVAGE_YIELD } : null;
}

function ensureSockets(item: InventoryItem): ItemSocket[] {
  if (!Array.isArray(item.sockets)) item.sockets = [];
  return item.sockets;
}

function rollValueForAffix(
  affixId: AffixId,
  rarity: Rarity,
  budget: number,
  itemLevel: number,
  random: RandomSource,
  valueScale = 1,
): number {
  if (rarity === "common") return 1;
  const definition = AFFIX_BY_ID[affixId];
  const range = getAffixRange(definition, rarity, itemLevel);
  if (definition.kind === "percent") {
    return random.int(
      Math.max(1, Math.round(range.min * valueScale)),
      Math.max(1, Math.round(range.max * valueScale)),
    );
  }
  const mult = range.min + random.next() * (range.max - range.min);
  return Math.max(1, Math.round(budget * mult * valueScale));
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
  const stoneCost = getSocketStoneCost(sockets.length);
  if (!spendMaterial(materials, "mat_socket_stone", stoneCost)) {
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
  const itemLevel = getEquipmentLevel(item);
  const budget = getItemBudget(
    itemLevel,
    item.rarity,
    ITEM_BY_ID[item.definitionId]?.baseTier ?? 1,
  );
  const next: AffixRoll = {
    affixId: target.affixId,
    value: rollValueForAffix(target.affixId, item.rarity, budget, itemLevel, random),
    ...(target.smelted === true ? { smelted: true } : {}),
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
): { ok: true; roll: AffixRoll; previous: AffixRoll | null } | { ok: false; reason: string } {
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
  const itemLevel = getEquipmentLevel(item);
  const budget = getItemBudget(
    itemLevel,
    item.rarity,
    ITEM_BY_ID[item.definitionId]?.baseTier ?? 1,
  );
  const roll: AffixRoll = {
    affixId,
    value: rollValueForAffix(
      affixId,
      item.rarity,
      budget,
      itemLevel,
      random,
      SMELT_AFFIX_POWER_MULTIPLIER,
    ),
    smelted: true,
  };
  if (!item.affixes) item.affixes = [];
  const smeltedIndex = item.affixes.findIndex((entry) => entry.smelted === true);
  const previous = smeltedIndex >= 0 ? item.affixes[smeltedIndex] ?? null : null;
  if (smeltedIndex >= 0) {
    item.affixes[smeltedIndex] = roll;
  } else {
    item.affixes.push(roll);
  }
  return { ok: true, roll, previous };
}

export function inlayGem(
  item: InventoryItem,
  socketIndex: number,
  gemId: GemMaterialId,
  materials: Record<MaterialId, number>,
): { ok: true } | { ok: false; reason: string } {
  const sockets = ensureSockets(item);
  const socket = sockets[socketIndex];
  if (!socket) return { ok: false, reason: "孔位未开启" };
  if (socket.gemId) return { ok: false, reason: "该孔位已有宝石" };
  if (!isGemMaterialId(gemId)) {
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
): { ok: true; gemId: GemMaterialId } | { ok: false; reason: string } {
  const sockets = ensureSockets(item);
  const socket = sockets[socketIndex];
  if (!socket?.gemId) return { ok: false, reason: "孔位为空" };
  const gemId = socket.gemId;
  if (!isGemMaterialId(gemId)) {
    socket.gemId = null;
    return { ok: false, reason: "宝石数据无效" };
  }
  socket.gemId = null;
  materials[gemId] = (materials[gemId] ?? 0) + 1;
  return { ok: true, gemId };
}

export interface GemReturnSummary {
  count: number;
  gems: Partial<Record<GemMaterialId, number>>;
}

export function removeAllGems(
  item: InventoryItem,
  materials: Record<MaterialId, number>,
): GemReturnSummary {
  const gems: Partial<Record<GemMaterialId, number>> = {};
  let count = 0;
  for (const socket of ensureSockets(item)) {
    if (!socket.gemId || !isGemMaterialId(socket.gemId)) continue;
    const gemId = socket.gemId;
    materials[gemId] = (materials[gemId] ?? 0) + 1;
    gems[gemId] = (gems[gemId] ?? 0) + 1;
    socket.gemId = null;
    count += 1;
  }
  return { count, gems };
}

export function canFuseGemFamily(
  materials: Record<MaterialId, number>,
  baseId: GemBaseId,
): boolean {
  return GEM_RANKS.slice(0, -1).some((rank) =>
    (materials[getGemMaterialId(baseId, rank)] ?? 0) >= GEM_FUSION_COST,
  );
}

export interface GemFusionResult {
  ok: boolean;
  crafted: number;
  highestRank: GemRank;
}

export interface GemRankFusionResult {
  ok: boolean;
  resultId: GemMaterialId | null;
}

export function fuseGemRank(
  materials: Record<MaterialId, number>,
  gemId: GemMaterialId,
): GemRankFusionResult {
  const definition = MATERIAL_BY_ID[gemId];
  const rank = definition.gemRank;
  const baseId = definition.gemBaseId;
  if (!rank || !baseId || rank >= 6 || (materials[gemId] ?? 0) < GEM_FUSION_COST) {
    return { ok: false, resultId: null };
  }
  const resultId = getGemMaterialId(baseId, (rank + 1) as GemRank);
  materials[gemId] -= GEM_FUSION_COST;
  materials[resultId] = (materials[resultId] ?? 0) + 1;
  return { ok: true, resultId };
}

export function fuseGemFamily(
  materials: Record<MaterialId, number>,
  baseId: GemBaseId,
): GemFusionResult {
  let crafted = 0;
  let highestRank: GemRank = 1;
  for (const rank of GEM_RANKS.slice(0, -1)) {
    const currentId = getGemMaterialId(baseId, rank);
    const nextRank = (rank + 1) as GemRank;
    const nextId = getGemMaterialId(baseId, nextRank);
    const amount = Math.floor((materials[currentId] ?? 0) / GEM_FUSION_COST);
    if (amount <= 0) continue;
    materials[currentId] -= amount * GEM_FUSION_COST;
    materials[nextId] = (materials[nextId] ?? 0) + amount;
    crafted += amount;
    highestRank = nextRank;
  }
  return { ok: crafted > 0, crafted, highestRank };
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
