import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  type ChapterId,
  type ItemDefinition,
  type EquipmentSlot,
} from "../content/items";
import { stageToChapter } from "../content/chapters";
import type { RandomSource } from "../simulation/RandomSource";

function isInDropWindow(item: ItemDefinition, chapter: ChapterId): boolean {
  return item.unlockChapter <= chapter && chapter < item.retireChapter;
}

function safePool(pool: readonly ItemDefinition[]): readonly ItemDefinition[] {
  if (pool.length > 0) return pool;
  console.warn("Equipment drop pool is empty; falling back to chapter-one items.");
  return ITEM_DEFINITIONS.filter((item) => item.chapter === 1);
}

/** Uniform slot pick so ten slots stay fair even when definition counts differ. */
function pickByUniformSlot(
  pool: readonly ItemDefinition[],
  random: RandomSource,
): ItemDefinition {
  const bySlot = new Map<EquipmentSlot, ItemDefinition[]>();
  for (const item of pool) {
    const list = bySlot.get(item.slot) ?? [];
    list.push(item);
    bySlot.set(item.slot, list);
  }
  const slots = EQUIPMENT_SLOTS.filter((slot) => (bySlot.get(slot)?.length ?? 0) > 0);
  if (slots.length === 0) return random.pick(safePool(ITEM_DEFINITIONS.filter((item) => item.chapter === 1)));
  const slot = random.pick(slots);
  return random.pick(bySlot.get(slot)!);
}

export function getRegionalEquipmentWeight(stage: number): number {
  if (stage < 13) return 0;
  const localStage = ((Math.max(13, stage) - 1) % 12) + 1;
  if (localStage <= 4) return 0.35;
  if (localStage <= 8) return 0.6;
  return 0.8;
}

export function getFrostlandWeight(stage: number): number {
  if (stage < 13 || stage > 24) return 0;
  return getRegionalEquipmentWeight(stage);
}

/**
 * Drop window (baseTier) + chapter-themed weighting.
 * Current chapter items vs older-in-window items.
 */
export function selectEquipmentDefinition(
  stage: number,
  random: RandomSource,
): ItemDefinition {
  const chapter = stageToChapter(stage);
  const windowPool = ITEM_DEFINITIONS.filter((item) => isInDropWindow(item, chapter));
  const currentPool = windowPool.filter((item) => item.chapter === chapter);
  const olderPool = windowPool.filter((item) => item.chapter < chapter);

  if (chapter === 1) return pickByUniformSlot(safePool(currentPool.length ? currentPool : windowPool), random);

  const regionalWeight = getRegionalEquipmentWeight(stage);
  const preferCurrent = currentPool.length > 0 && random.next() < regionalWeight;
  const selectedPool = preferCurrent
    ? currentPool
    : olderPool.length > 0
      ? olderPool
      : windowPool;
  return pickByUniformSlot(safePool(selectedPool), random);
}
