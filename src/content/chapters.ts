/** Product chapter table (10 chapters × 12 stages). */

export const CHAPTER_COUNT = 10;
export const STAGES_PER_CHAPTER = 12;
export const MAX_STAGE = CHAPTER_COUNT * STAGES_PER_CHAPTER;

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ChapterDefinition {
  id: ChapterId;
  name: string;
  bossName: string;
  /** Short blurb for stage panel. */
  blurb: string;
}

export const CHAPTER_DEFINITIONS: readonly ChapterDefinition[] = [
  { id: 1, name: "青丘林地", bossName: "古树守卫", blurb: "林地与村落的边境远征。" },
  { id: 2, name: "霜风谷", bossName: "冰封古树", blurb: "越深入雪谷，霜风装备权重越高。" },
  { id: 3, name: "赤沙荒地", bossName: "赤沙守卫", blurb: "穿过干河与遗迹，赤沙装备权重升高。" },
  { id: 4, name: "雷崖高地", bossName: "苍雷守卫", blurb: "踏过雷崖，苍雷装备权重升高。" },
  { id: 5, name: "黑水湿地", bossName: "沼心守卫", blurb: "黑水漫过浅滩，湿地装备开始成型。" },
  { id: 6, name: "燃烧荒地", bossName: "烬岩守卫", blurb: "焦土岩脉中，燃烧系装备权重升高。" },
  { id: 7, name: "暗潮海岸", bossName: "潮岩守卫", blurb: "岩岸潮汐带来暗潮装备。" },
  { id: 8, name: "哀嚎丘陵", bossName: "丘墓守卫", blurb: "荒丘旧战场，毕业档开始出现。" },
  { id: 9, name: "石牙山脉", bossName: "石牙守卫", blurb: "石山矿道中掉落高档装备。" },
  { id: 10, name: "北风关隘", bossName: "北风关将", blurb: "苦寒边关，主线收束与高档验证。" },
] as const;

export const CHAPTER_BY_ID = Object.fromEntries(
  CHAPTER_DEFINITIONS.map((chapter) => [chapter.id, chapter]),
) as Record<ChapterId, ChapterDefinition>;

export function stageToChapter(stage: number): ChapterId {
  const clamped = Math.max(1, Math.min(MAX_STAGE, Math.floor(stage)));
  return Math.ceil(clamped / STAGES_PER_CHAPTER) as ChapterId;
}

export function chapterStartStage(chapter: ChapterId): number {
  return (chapter - 1) * STAGES_PER_CHAPTER + 1;
}

export const CHAPTER_NUMERAL: Record<ChapterId, string> = {
  1: "一",
  2: "二",
  3: "三",
  4: "四",
  5: "五",
  6: "六",
  7: "七",
  8: "八",
  9: "九",
  10: "十",
};

/** Reuse Ch1–4 background assets for Ch5–10 until art lands. */
export function visualChapter(chapter: ChapterId): 1 | 2 | 3 | 4 {
  return (((chapter - 1) % 4) + 1) as 1 | 2 | 3 | 4;
}
