import type { ChapterId } from "./chapters";
import type { DamageElement } from "../simulation/types";

export type { DamageElement };

export const DAMAGE_ELEMENTS = [
  "physical",
  "fire",
  "frost",
  "lightning",
  "dark",
  "holy",
] as const satisfies readonly DamageElement[];

export const DAMAGE_ELEMENT_LABEL: Record<DamageElement, string> = {
  physical: "物理",
  fire: "火焰",
  frost: "冰霜",
  lightning: "雷电",
  dark: "暗黑",
  holy: "圣光",
};

export const DAMAGE_SCHOOL_LABEL: Record<"physical" | "magic", string> = {
  physical: "物理",
  magic: "魔法",
};

/** Hero stat panel: school plus a more precise element when it is not generic physical. */
export function formatHeroDamageIdentity(
  school: "physical" | "magic",
  element: DamageElement,
): string {
  if (element === "physical") return school === "magic" ? "魔法" : "物理";
  const label = DAMAGE_ELEMENT_LABEL[element];
  return school === "magic" ? `${label}魔法` : label;
}

/** Floating combat text / UI accents. */
export const DAMAGE_ELEMENT_COLOR: Record<DamageElement, string> = {
  physical: "#fff4e4",
  fire: "#ff8a4a",
  frost: "#8ec8ff",
  lightning: "#f4de6a",
  dark: "#c49cff",
  holy: "#ffe6a0",
};

/**
 * Diminishing all-element resist from defense.
 * 100 def ≈ 2.4%, 400 def ≈ 9%, 1000 def ≈ 20%.
 */
export const DEFENSE_ALL_RESIST_K = 4000;
/** Soft cap on combined elemental resist. */
export const ELEMENT_RESIST_CAP = 0.75;
/**
 * Extra damage on non-physical monster hits.
 * Matching resist is the clear gate: ~43% resist returns the hit to baseline.
 * Without it, fire/frost/lightning/dark/holy hits hit 75% harder through armor.
 */
export const ELEMENTAL_ATTACK_AMP = 0.75;

export function isDamageElement(value: unknown): value is DamageElement {
  return typeof value === "string" && (DAMAGE_ELEMENTS as readonly string[]).includes(value);
}

/** Chapter identity for elite/boss (and themed trash) attack schools. */
export function chapterThemeElement(chapter: ChapterId): DamageElement {
  switch (chapter) {
    case 1:
    case 9:
      return "physical";
    case 2:
    case 10:
      return "frost";
    case 3:
    case 6:
      return "fire";
    case 4:
    case 7:
      return "lightning";
    case 5:
    case 8:
      return "dark";
  }
}

export function allResistFromDefense(defense: number): number {
  const value = Math.max(0, defense);
  return value / (value + DEFENSE_ALL_RESIST_K);
}

export function clampElementResist(value: number): number {
  return Math.min(ELEMENT_RESIST_CAP, Math.max(0, value));
}
