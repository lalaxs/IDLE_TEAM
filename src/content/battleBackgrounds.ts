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
  E01: 0.484,
  E02: 0.534,
  E03: 0.46,
  E04: 0.588,
  B01: 0.443,
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
}

/**
 * Resolve battle background keys.
 * Ch5–10 reuse Ch1–4 art via visualChapter until dedicated assets land.
 */
export function getBattleBackgroundKeys(stage: number): BattleBackgroundKeys {
  const definition = STAGE_DEFINITIONS[Math.max(1, Math.min(MAX_STAGE, stage)) - 1]!;
  const chapterIndex = ((definition.stage - 1) % 12) + 1;
  const visual = visualChapter(definition.chapter);
  const chapter = String(visual).padStart(2, "0");
  const stageIndex = String(chapterIndex).padStart(2, "0");
  const band = definition.environment === "meadow" ? 0 : definition.environment === "forest" ? 1 : 2;
  const fgName = CHAPTER_FOREGROUNDS[visual][band]!;
  return {
    stageKey: `stage_${chapter}_${stageIndex}`,
    foregroundKey: `fg_${visual}_${fgName}`,
  };
}

void (0 as ChapterId);
