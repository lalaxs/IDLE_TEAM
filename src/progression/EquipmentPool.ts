import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  type ChapterId,
  type ItemDefinition,
  type EquipmentSlot,
} from "../content/items";
import {
  MAX_STAGE,
  STAGES_PER_CHAPTER,
  stageToChapter,
} from "../content/chapters";
import type { RandomSource } from "../simulation/RandomSource";

/** Exact equipment definitions that can drop anywhere in a chapter. */
export function getChapterEquipmentDropPool(chapter: ChapterId): readonly ItemDefinition[] {
  return ITEM_DEFINITIONS.filter((item) =>
    item.chapter === chapter && !item.id.startsWith("set_"),
  );
}

/** Every natural equipment definition belongs to exactly one chapter pool. */
export function getEquipmentDropChapters(item: ItemDefinition): readonly ChapterId[] {
  return item.id.startsWith("set_") ? [] : [item.chapter];
}

const LOCAL_STAGE_SLOTS: Record<number, readonly EquipmentSlot[]> = {
  1: ["main_weapon"],
  2: ["off_hand"],
  3: ["helmet"],
  4: ["main_weapon", "off_hand"],
  5: ["armor"],
  6: ["gloves"],
  7: ["boots"],
  8: ["armor", "gloves"],
  9: ["ring"],
  10: ["bracer"],
  11: ["amulet", "earring"],
  12: EQUIPMENT_SLOTS,
};

function localStageFor(stage: number): number {
  const clampedStage = Math.max(1, Math.min(MAX_STAGE, Math.round(stage)));
  return ((clampedStage - 1) % STAGES_PER_CHAPTER) + 1;
}

function isSlotAvailableAtLocalStage(slot: EquipmentSlot, localStage: number): boolean {
  return LOCAL_STAGE_SLOTS[localStage]!.includes(slot);
}

/** Exact equipment definitions available from one repeatable stage. */
export function getStageEquipmentDropPool(stage: number): readonly ItemDefinition[] {
  const chapter = stageToChapter(stage);
  const localStage = localStageFor(stage);
  return getChapterEquipmentDropPool(chapter).filter((item) =>
    isSlotAvailableAtLocalStage(item.slot, localStage),
  );
}

/** Local chapter stages where one equipment slot can drop. */
export function getEquipmentDropLocalStages(slot: EquipmentSlot): readonly number[] {
  return Object.entries(LOCAL_STAGE_SLOTS)
    .filter(([, slots]) => slots.includes(slot))
    .map(([stage]) => Number(stage));
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
  const localStage = localStageFor(stage);
  if (localStage <= 4) return 0.8;
  if (localStage <= 8) return 0.9;
  if (localStage < STAGES_PER_CHAPTER) return 0.95;
  return 1;
}

export function getFrostlandWeight(stage: number): number {
  if (stage < 13 || stage > 24) return 0;
  return getRegionalEquipmentWeight(stage);
}

/**
 * Uniform slot selection inside the current chapter's authored pool.
 */
function selectFromEquipmentPool(
  _stage: number,
  pool: readonly ItemDefinition[],
  random: RandomSource,
): ItemDefinition {
  return pickByUniformSlot(safePool(pool), random);
}

/** Stage-targeted selection for combat, idle rewards, and loot chests. */
export function selectEquipmentDefinition(
  stage: number,
  random: RandomSource,
): ItemDefinition {
  return selectFromEquipmentPool(stage, getStageEquipmentDropPool(stage), random);
}

/** Full chapter selection for sources such as the daily shop. */
export function selectChapterEquipmentDefinition(
  stage: number,
  random: RandomSource,
): ItemDefinition {
  return selectFromEquipmentPool(stage, getChapterEquipmentDropPool(stageToChapter(stage)), random);
}
