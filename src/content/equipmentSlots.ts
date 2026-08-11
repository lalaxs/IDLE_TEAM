export const EQUIPMENT_SLOTS = [
  "main_weapon",
  "off_hand",
  "helmet",
  "armor",
  "gloves",
  "boots",
  "ring",
  "bracer",
  "amulet",
  "earring",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  main_weapon: "主武器",
  off_hand: "副武器",
  helmet: "头盔",
  armor: "护甲",
  gloves: "手套",
  boots: "鞋子",
  ring: "戒指",
  bracer: "护腕",
  amulet: "护身符",
  earring: "耳环",
};

export const GEAR_SLOTS = [
  "main_weapon",
  "off_hand",
  "helmet",
  "armor",
  "gloves",
  "boots",
] as const satisfies readonly EquipmentSlot[];

export const ACCESSORY_SLOTS = [
  "ring",
  "bracer",
  "amulet",
  "earring",
] as const satisfies readonly EquipmentSlot[];

export function createEmptyEquipment(): Record<EquipmentSlot, string | null> {
  return {
    main_weapon: null,
    off_hand: null,
    helmet: null,
    armor: null,
    gloves: null,
    boots: null,
    ring: null,
    bracer: null,
    amulet: null,
    earring: null,
  };
}
