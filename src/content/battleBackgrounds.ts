import { STAGE_DEFINITIONS } from "./stages";
import { MAX_STAGE, visualChapter, type ChapterId } from "./chapters";

/** Normalized foot X in the character texture (0–1). Used to align ground shadows. */
export const CHARACTER_FOOT_X: Record<string, number> = {
  H01: 0.544,
  H02: 0.494,
  H03: 0.437,
  H04: 0.47,
  H05: 0.48,
  H06: 0.453,
  H07: 0.45,
  H08: 0.44,
  B01: 0.443,
};

export interface EnemyRenderMetrics {
  /** Opaque bounds as a fraction of the square source texture. */
  visibleWidthRatio: number;
  visibleHeightRatio: number;
  /** Normalized Y of the lowest opaque pixel. */
  footY: number;
}

export type EnemyDisplaySizeClass = "small" | "standard" | "large" | "massive";

/** Controlled semantic size steps; arbitrary per-enemy runtime scales are not allowed. */
const ENEMY_DISPLAY_SCALE_BY_CLASS: Record<EnemyDisplaySizeClass, number> = {
  small: 0.9,
  standard: 1,
  large: 1.12,
  massive: 1.18,
};

/**
 * Physical creature scale is independent from combat rank. A fox may stay
 * small while a normal drake or crocodile can read as a large-bodied animal.
 */
export const ENEMY_DISPLAY_SIZE_CLASS: Partial<Record<string, EnemyDisplaySizeClass>> = {
  // Chapter 1 — woodland critters versus rooted/stone heavy bodies.
  E01: "small",
  E02: "small",
  E03: "small",
  E04: "large",
  E05: "small",
  E06: "small",
  E07: "small",
  E08: "large",
  E09: "small",
  E11: "large",

  // Chapter 2 — small snow fauna, with yak/spider/porcupine as heavy bodies.
  E13: "small",
  E14: "small",
  E15: "small",
  E16: "large",
  E17: "small",
  E18: "small",
  E20: "large",
  E21: "small",
  E22: "small",
  E23: "small",
  E24: "large",

  // Chapter 3 — desert wildlife and the approved large drake/crocodile read.
  E25: "small",
  E27: "small",
  E28: "large",
  E29: "small",
  E30: "small",
  E32: "large",
  E33: "small",
  E34: "large",
  E35: "large",
  E36: "large",

  // Chapter 4 — cliff fauna, storm drake, and armored wind beasts.
  E37: "small",
  E39: "small",
  E40: "large",
  E42: "small",
  E43: "small",
  E44: "large",
  E46: "small",
  E47: "small",
  E48: "large",

  // Chapter 5 — wetland vermin remain small; clawed and horned bodies read large.
  E50: "small",
  E51: "small",
  E52: "large",
  E56: "large",
  E57: "small",
  E58: "small",
  E60: "large",

  // Chapter 6 — burrowers and insects versus heavy beasts and the orc foreman.
  E61: "small",
  E62: "small",
  E63: "small",
  E64: "large",
  E66: "small",
  E67: "small",
  E68: "large",
  E72: "large",

  // Chapter 7 — coastal small fauna, pack beasts, shell dragons, and orc guards.
  E73: "small",
  E74: "small",
  E76: "large",
  E78: "small",
  E79: "small",
  E80: "large",
  E84: "large",

  // Chapter 8 — swift hill fauna stays small; armored and stone bodies read large.
  E86: "small",
  E88: "large",
  E92: "large",
  E93: "small",
  E94: "small",
  E95: "large",
  E96: "large",

  // Chapter 9 — small climbers contrasted with beasts, overseers, and stone guards.
  E98: "small",
  E100: "large",
  E104: "large",
  E106: "small",
  E108: "large",

  // Chapter 10 — small runners/insects, heavy guards, and a true cyclops giant.
  E110: "small",
  E112: "large",
  E114: "small",
  E116: "massive",
  E120: "large",

  // Bosses retain role-sized source occupancy; these classes express species scale.
  B01: "large",
  B02: "large",
  B03: "massive",
  B04: "massive",
  B05: "large",
  B06: "massive",
  B07: "massive",
  B08: "massive",
  B12: "large",
  B16: "massive",
  B20: "large",
  B24: "large",
  B28: "massive",
  B32: "massive",
  B36: "massive",
  B40: "massive",
  B44: "massive",
  B48: "massive",
  B52: "massive",
  B56: "large",
  B60: "massive",
  B64: "massive",
  B68: "massive",
  B72: "massive",
  B76: "massive",
  B80: "massive",
  B84: "massive",
  B88: "massive",
  B92: "large",
  B96: "massive",
  B100: "massive",
  B104: "massive",
  B108: "massive",
  B112: "massive",
  B116: "massive",
  B120: "massive",
};

export function enemyDisplayScale(enemyId: string): number {
  const sizeClass = ENEMY_DISPLAY_SIZE_CLASS[enemyId] ?? "standard";
  return ENEMY_DISPLAY_SCALE_BY_CLASS[sizeClass];
}

/**
 * Enemy source art intentionally keeps generous transparent margins. These
 * measurements let the battle view size the figure itself instead of the
 * entire 1024px texture and align each figure to a shared foot baseline.
 */
export const ENEMY_RENDER_METRICS: Record<string, EnemyRenderMetrics> = {
  E01: { visibleWidthRatio: 0.470, visibleHeightRatio: 0.547, footY: 0.908 },
  E02: { visibleWidthRatio: 0.578, visibleHeightRatio: 0.547, footY: 0.908 },
  E03: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.470, footY: 0.908 },
  E04: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.556, footY: 0.908 },
  E05: { visibleWidthRatio: 0.600, visibleHeightRatio: 0.547, footY: 0.908 },
  E06: { visibleWidthRatio: 0.572, visibleHeightRatio: 0.547, footY: 0.908 },
  E07: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.445, footY: 0.908 },
  E08: { visibleWidthRatio: 0.652, visibleHeightRatio: 0.635, footY: 0.908 },
  E09: { visibleWidthRatio: 0.498, visibleHeightRatio: 0.547, footY: 0.908 },
  E10: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.385, footY: 0.908 },
  E11: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.531, footY: 0.908 },
  E12: { visibleWidthRatio: 0.619, visibleHeightRatio: 0.552, footY: 0.908 },
  E13: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.510, footY: 0.908 },
  E14: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.328, footY: 0.908 },
  E15: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.476, footY: 0.908 },
  E16: { visibleWidthRatio: 0.702, visibleHeightRatio: 0.443, footY: 0.907 },
  E17: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.524, footY: 0.908 },
  E18: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.541, footY: 0.908 },
  E19: { visibleWidthRatio: 0.446, visibleHeightRatio: 0.547, footY: 0.908 },
  E20: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.587, footY: 0.908 },
  E21: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.404, footY: 0.908 },
  E22: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.342, footY: 0.908 },
  E23: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.326, footY: 0.908 },
  E24: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.542, footY: 0.908 },
  E25: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.479, footY: 0.908 },
  E26: { visibleWidthRatio: 0.428, visibleHeightRatio: 0.547, footY: 0.908 },
  E27: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.431, footY: 0.908 },
  E28: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.443, footY: 0.908 },
  E29: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.312, footY: 0.908 },
  E30: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.367, footY: 0.908 },
  E31: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.384, footY: 0.908 },
  E32: { visibleWidthRatio: 0.702, visibleHeightRatio: 0.459, footY: 0.908 },
  E33: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.426, footY: 0.908 },
  E34: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.472, footY: 0.908 },
  E35: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.288, footY: 0.908 },
  E36: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.380, footY: 0.908 },
  E37: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.543, footY: 0.908 },
  E38: { visibleWidthRatio: 0.602, visibleHeightRatio: 0.547, footY: 0.908 },
  E39: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.392, footY: 0.908 },
  E40: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.455, footY: 0.908 },
  E41: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.386, footY: 0.908 },
  E42: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.411, footY: 0.908 },
  E43: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.520, footY: 0.908 },
  E44: { visibleWidthRatio: 0.686, visibleHeightRatio: 0.635, footY: 0.908 },
  E45: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.512, footY: 0.908 },
  E46: { visibleWidthRatio: 0.481, visibleHeightRatio: 0.547, footY: 0.908 },
  E47: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.350, footY: 0.908 },
  E48: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.402, footY: 0.908 },
  E49: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.393, footY: 0.908 },
  E50: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.229, footY: 0.908 },
  E51: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.272, footY: 0.908 },
  E52: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.461, footY: 0.908 },
  E53: { visibleWidthRatio: 0.478, visibleHeightRatio: 0.547, footY: 0.908 },
  E54: { visibleWidthRatio: 0.544, visibleHeightRatio: 0.547, footY: 0.908 },
  E55: { visibleWidthRatio: 0.552, visibleHeightRatio: 0.547, footY: 0.908 },
  E56: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.491, footY: 0.908 },
  E57: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.260, footY: 0.908 },
  E58: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.488, footY: 0.908 },
  E59: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.350, footY: 0.908 },
  E60: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.445, footY: 0.908 },
  E61: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.319, footY: 0.908 },
  E62: { visibleWidthRatio: 0.432, visibleHeightRatio: 0.481, footY: 0.908 },
  E63: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.293, footY: 0.908 },
  E64: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.543, footY: 0.908 },
  E65: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.349, footY: 0.908 },
  E66: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.370, footY: 0.908 },
  E67: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.455, footY: 0.908 },
  E68: { visibleWidthRatio: 0.565, visibleHeightRatio: 0.635, footY: 0.908 },
  E69: { visibleWidthRatio: 0.510, visibleHeightRatio: 0.547, footY: 0.908 },
  E70: { visibleWidthRatio: 0.518, visibleHeightRatio: 0.481, footY: 0.908 },
  E71: { visibleWidthRatio: 0.576, visibleHeightRatio: 0.547, footY: 0.908 },
  E72: { visibleWidthRatio: 0.619, visibleHeightRatio: 0.634, footY: 0.908 },
  E73: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.354, footY: 0.908 },
  E74: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.303, footY: 0.908 },
  E75: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.356, footY: 0.908 },
  E76: { visibleWidthRatio: 0.701, visibleHeightRatio: 0.361, footY: 0.908 },
  E77: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.336, footY: 0.908 },
  E78: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.399, footY: 0.908 },
  E79: { visibleWidthRatio: 0.604, visibleHeightRatio: 0.402, footY: 0.908 },
  E80: { visibleWidthRatio: 0.643, visibleHeightRatio: 0.635, footY: 0.908 },
  E81: { visibleWidthRatio: 0.499, visibleHeightRatio: 0.547, footY: 0.908 },
  E82: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.436, footY: 0.908 },
  E83: { visibleWidthRatio: 0.590, visibleHeightRatio: 0.547, footY: 0.908 },
  E84: { visibleWidthRatio: 0.593, visibleHeightRatio: 0.635, footY: 0.908 },
  E85: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.404, footY: 0.908 },
  E86: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.358, footY: 0.908 },
  E87: { visibleWidthRatio: 0.482, visibleHeightRatio: 0.547, footY: 0.908 },
  E88: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.398, footY: 0.908 },
  E89: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.487, footY: 0.908 },
  E90: { visibleWidthRatio: 0.559, visibleHeightRatio: 0.547, footY: 0.908 },
  E91: { visibleWidthRatio: 0.540, visibleHeightRatio: 0.547, footY: 0.908 },
  E92: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.598, footY: 0.908 },
  E93: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.287, footY: 0.908 },
  E94: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.337, footY: 0.908 },
  E95: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.538, footY: 0.908 },
  E96: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.529, footY: 0.908 },
  E97: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.393, footY: 0.908 },
  E98: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.432, footY: 0.908 },
  E99: { visibleWidthRatio: 0.571, visibleHeightRatio: 0.547, footY: 0.908 },
  E100: { visibleWidthRatio: 0.702, visibleHeightRatio: 0.534, footY: 0.908 },
  E101: { visibleWidthRatio: 0.531, visibleHeightRatio: 0.547, footY: 0.908 },
  E102: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.454, footY: 0.908 },
  E103: { visibleWidthRatio: 0.601, visibleHeightRatio: 0.547, footY: 0.908 },
  E104: { visibleWidthRatio: 0.692, visibleHeightRatio: 0.635, footY: 0.908 },
  E105: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.380, footY: 0.908 },
  E106: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.432, footY: 0.908 },
  E107: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.483, footY: 0.908 },
  E108: { visibleWidthRatio: 0.682, visibleHeightRatio: 0.635, footY: 0.908 },
  E109: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.388, footY: 0.908 },
  E110: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.448, footY: 0.908 },
  E111: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.441, footY: 0.908 },
  E112: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.480, footY: 0.908 },
  E113: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.352, footY: 0.908 },
  E114: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.317, footY: 0.908 },
  E115: { visibleWidthRatio: 0.484, visibleHeightRatio: 0.547, footY: 0.908 },
  E116: { visibleWidthRatio: 0.529, visibleHeightRatio: 0.635, footY: 0.908 },
  E117: { visibleWidthRatio: 0.560, visibleHeightRatio: 0.547, footY: 0.908 },
  E118: { visibleWidthRatio: 0.533, visibleHeightRatio: 0.412, footY: 0.908 },
  E119: { visibleWidthRatio: 0.605, visibleHeightRatio: 0.494, footY: 0.908 },
  E120: { visibleWidthRatio: 0.703, visibleHeightRatio: 0.571, footY: 0.908 },
  B01: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.625, footY: 0.908 },
  B02: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.649, footY: 0.908 },
  B03: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.568, footY: 0.908 },
  B04: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.677, footY: 0.908 },
  B05: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.732, footY: 0.908 },
  B06: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.689, footY: 0.908 },
  B07: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.709, footY: 0.908 },
  B08: { visibleWidthRatio: 0.819, visibleHeightRatio: 0.762, footY: 0.908 },
  B12: { visibleWidthRatio: 0.628, visibleHeightRatio: 0.670, footY: 0.908 },
  B16: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.555, footY: 0.908 },
  B20: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.537, footY: 0.908 },
  B24: { visibleWidthRatio: 0.684, visibleHeightRatio: 0.762, footY: 0.908 },
  B28: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.599, footY: 0.908 },
  B32: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.588, footY: 0.908 },
  B36: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.591, footY: 0.908 },
  B40: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.679, footY: 0.908 },
  B44: { visibleWidthRatio: 0.858, visibleHeightRatio: 0.739, footY: 0.908 },
  B48: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.686, footY: 0.908 },
  B52: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.370, footY: 0.908 },
  B56: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.621, footY: 0.908 },
  B60: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.538, footY: 0.908 },
  B64: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.443, footY: 0.908 },
  B68: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.456, footY: 0.908 },
  B72: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.757, footY: 0.908 },
  B76: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.478, footY: 0.908 },
  B80: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.503, footY: 0.908 },
  B84: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.741, footY: 0.908 },
  B88: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.544, footY: 0.908 },
  B92: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.652, footY: 0.908 },
  B96: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.572, footY: 0.908 },
  B100: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.638, footY: 0.908 },
  B104: { visibleWidthRatio: 0.787, visibleHeightRatio: 0.762, footY: 0.908 },
  B108: { visibleWidthRatio: 0.740, visibleHeightRatio: 0.762, footY: 0.908 },
  B112: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.516, footY: 0.908 },
  B116: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.411, footY: 0.908 },
  B120: { visibleWidthRatio: 0.859, visibleHeightRatio: 0.559, footY: 0.908 },
};

const CHAPTER_FOREGROUNDS = {
  1: ["meadow", "forest", "ruins"],
  2: ["snowfield", "pinewood", "aurora_ruins"],
  3: ["red_dunes", "wind_canyon", "sunken_city"],
  4: ["cloud_highlands", "floating_valley", "sky_city"],
} as const;

export interface BattleBackgroundKeys {
  stageKey: string;
  foregroundKey: string;
  layerPackKey?: BattleLayerPackKey;
}

export type BattleLayerPackKey =
  | "qingqiu_meadow_preview"
  | "qingqiu_forest"
  | "qingqiu_ruins"
  | "frostwind_snowfield"
  | "frostwind_pinewood"
  | "frostwind_aurora_ruins"
  | "redsand_dunes"
  | "redsand_wind_canyon"
  | "redsand_sunken_city"
  | "thundercliff_highlands"
  | "thundercliff_storm_valley"
  | "thundercliff_citadel"
  | "blackwater_shallows"
  | "blackwater_wreck_bog"
  | "blackwater_reed_sanctum"
  | "burning_scorched_frontier"
  | "burning_ember_rift"
  | "burning_ash_citadel"
  | "darktide_salt_reef"
  | "darktide_wave_coast"
  | "darktide_tide_ruins"
  | "wailing_withered_hills"
  | "wailing_old_battlefield"
  | "wailing_barrow_grounds"
  | "stonefang_foothills"
  | "stonefang_crystal_mine"
  | "stonefang_high_ridge"
  | "northwind_frost_outpost"
  | "northwind_wall_road"
  | "northwind_citadel";

const CHAPTER_ONE_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "qingqiu_meadow_preview",
  forest: "qingqiu_forest",
  ruins: "qingqiu_ruins",
};

const CHAPTER_TWO_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "frostwind_snowfield",
  forest: "frostwind_pinewood",
  ruins: "frostwind_aurora_ruins",
};

const CHAPTER_THREE_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "redsand_dunes",
  forest: "redsand_wind_canyon",
  ruins: "redsand_sunken_city",
};

const CHAPTER_FOUR_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "thundercliff_highlands",
  forest: "thundercliff_storm_valley",
  ruins: "thundercliff_citadel",
};

const CHAPTER_FIVE_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "blackwater_shallows",
  forest: "blackwater_wreck_bog",
  ruins: "blackwater_reed_sanctum",
};

const CHAPTER_SIX_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "burning_scorched_frontier",
  forest: "burning_ember_rift",
  ruins: "burning_ash_citadel",
};

const CHAPTER_SEVEN_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "darktide_salt_reef",
  forest: "darktide_wave_coast",
  ruins: "darktide_tide_ruins",
};

const CHAPTER_EIGHT_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "wailing_withered_hills",
  forest: "wailing_old_battlefield",
  ruins: "wailing_barrow_grounds",
};

const CHAPTER_NINE_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "stonefang_foothills",
  forest: "stonefang_crystal_mine",
  ruins: "stonefang_high_ridge",
};

const CHAPTER_TEN_LAYER_PACKS: Record<
  (typeof STAGE_DEFINITIONS)[number]["environment"],
  BattleLayerPackKey
> = {
  meadow: "northwind_frost_outpost",
  forest: "northwind_wall_road",
  ruins: "northwind_citadel",
};

const CHAPTER_LAYER_PACKS: Partial<
  Record<
    ChapterId,
    Record<(typeof STAGE_DEFINITIONS)[number]["environment"], BattleLayerPackKey>
  >
> = {
  1: CHAPTER_ONE_LAYER_PACKS,
  2: CHAPTER_TWO_LAYER_PACKS,
  3: CHAPTER_THREE_LAYER_PACKS,
  4: CHAPTER_FOUR_LAYER_PACKS,
  5: CHAPTER_FIVE_LAYER_PACKS,
  6: CHAPTER_SIX_LAYER_PACKS,
  7: CHAPTER_SEVEN_LAYER_PACKS,
  8: CHAPTER_EIGHT_LAYER_PACKS,
  9: CHAPTER_NINE_LAYER_PACKS,
  10: CHAPTER_TEN_LAYER_PACKS,
};

export type BattleLayerName = "sky" | "distant" | "rear" | "road";

export const BATTLE_FOREGROUND_PROP_NAMES = [
  "grass_clump",
  "shrub_clump",
  "stone_cluster",
  "mushroom_cluster",
] as const;

export type BattleForegroundPropName = (typeof BATTLE_FOREGROUND_PROP_NAMES)[number];

export function getBattleLayerTextureKey(
  packKey: BattleLayerPackKey,
  layer: BattleLayerName,
): string {
  return `background-layer-${packKey}-${layer}`;
}

export function getBattleForegroundPropTextureKey(
  packKey: BattleLayerPackKey,
  prop: BattleForegroundPropName,
): string {
  return `background-prop-${packKey}-${prop}`;
}

/** Resolve battle background keys. */
export function getBattleBackgroundKeys(stage: number): BattleBackgroundKeys {
  const definition = STAGE_DEFINITIONS[Math.max(1, Math.min(MAX_STAGE, stage)) - 1]!;
  const chapterIndex = ((definition.stage - 1) % 12) + 1;
  const visual = visualChapter(definition.chapter);
  const chapter = String(visual).padStart(2, "0");
  const stageIndex = String(chapterIndex).padStart(2, "0");
  const band = definition.environment === "meadow" ? 0 : definition.environment === "forest" ? 1 : 2;
  const fgName = CHAPTER_FOREGROUNDS[visual][band]!;
  const layerPackKey = CHAPTER_LAYER_PACKS[definition.chapter]?.[definition.environment];
  return {
    stageKey: `stage_${chapter}_${stageIndex}`,
    foregroundKey: `fg_${visual}_${fgName}`,
    ...(layerPackKey ? { layerPackKey } : {}),
  };
}

void (0 as ChapterId);
