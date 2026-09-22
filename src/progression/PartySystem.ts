import { STAGES_PER_CHAPTER } from "../content/chapters";

export const PARTY_SLOT_COUNT = 5;
export const PARTY_SLOT_UNLOCK_CLEARED_STAGES = [0, 1, 3, 9, STAGES_PER_CHAPTER + 5] as const;
export const FULL_PARTY_UNLOCK_CLEARED_STAGE = PARTY_SLOT_UNLOCK_CLEARED_STAGES[PARTY_SLOT_COUNT - 1];
type PartySlotCount = 1 | 2 | 3 | 4 | 5;

export function getUnlockedPartySlotCount(highestClearedStage: number): PartySlotCount {
  let unlockedSlots = 1;
  for (let slotIndex = 1; slotIndex < PARTY_SLOT_COUNT; slotIndex += 1) {
    if (highestClearedStage < PARTY_SLOT_UNLOCK_CLEARED_STAGES[slotIndex]!) break;
    unlockedSlots += 1;
  }
  return unlockedSlots as PartySlotCount;
}

export function getPartySlotUnlockClearedStage(slotIndex: number): number {
  const clearedStage = PARTY_SLOT_UNLOCK_CLEARED_STAGES[slotIndex];
  if (clearedStage === undefined) throw new Error("Invalid party slot index");
  return clearedStage;
}
