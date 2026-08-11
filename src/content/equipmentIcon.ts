import type { EquipmentSlot } from "./equipmentSlots";

export type DamageSchool = "physical" | "magic";

const SLOT_GLYPH: Record<EquipmentSlot, { physical: string; magic: string }> = {
  main_weapon: { physical: "⚔", magic: "✦" },
  off_hand: { physical: "⛨", magic: "◉" },
  helmet: { physical: "⛑", magic: "✧" },
  armor: { physical: "▣", magic: "◈" },
  gloves: { physical: "⚒", magic: "❖" },
  boots: { physical: "ブーツ".slice(0, 1), magic: "◇" },
  ring: { physical: "◎", magic: "◎" },
  bracer: { physical: "▭", magic: "▤" },
  amulet: { physical: "◆", magic: "❖" },
  earring: { physical: "◌", magic: "✧" },
};

/** Avoid CJK in SVG text for font portability — use simple marks. */
const SLOT_MARK: Record<EquipmentSlot, { physical: string; magic: string }> = {
  main_weapon: { physical: "W", magic: "S" },
  off_hand: { physical: "D", magic: "O" },
  helmet: { physical: "H", magic: "C" },
  armor: { physical: "A", magic: "R" },
  gloves: { physical: "G", magic: "M" },
  boots: { physical: "B", magic: "F" },
  ring: { physical: "N", magic: "N" },
  bracer: { physical: "V", magic: "V" },
  amulet: { physical: "U", magic: "U" },
  earring: { physical: "E", magic: "E" },
};

const SCHOOL_FILL: Record<DamageSchool, [string, string, string]> = {
  physical: ["#8a9aaa", "#5a6a4a", "#d8c8a8"],
  magic: ["#6a7ab8", "#9a6ab8", "#e8d8a0"],
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * SVG data-URL placeholder for missing equipment art.
 * Distinct per id; readable at 42px; no rarity frame.
 */
export function svgEquipmentIcon(
  id: string,
  slot: EquipmentSlot,
  school: DamageSchool = "physical",
): string {
  const [c1, c2, c3] = SCHOOL_FILL[school];
  const hueShift = hashSeed(id) % 40;
  const mark = SLOT_MARK[slot][school];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="#2a2430"/>
  <rect x="8" y="8" width="48" height="48" rx="10" fill="${c1}" stroke="#3a3028" stroke-width="3"/>
  <path d="M16 40 L32 16 L48 40 Z" fill="${c2}" opacity="0.9" transform="rotate(${hueShift} 32 32)"/>
  <circle cx="32" cy="36" r="10" fill="${c3}" stroke="#3a3028" stroke-width="2"/>
  <text x="32" y="40" text-anchor="middle" font-size="14" font-family="Segoe UI,sans-serif" font-weight="700" fill="#2a2430">${mark}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// silence unused (glyph table kept for future art briefs)
void SLOT_GLYPH;
