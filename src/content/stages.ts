import {
  CHAPTER_BY_ID,
  CHAPTER_DEFINITIONS,
  type ChapterId,
  STAGES_PER_CHAPTER,
} from "./chapters";

export interface StageDefinition {
  id: string;
  stage: number;
  name: string;
  chapter: ChapterId;
  chapterName: string;
  environment: "meadow" | "forest" | "ruins";
  bossName: string;
}

const STAGE_NAMES: Record<ChapterId, readonly string[]> = {
  1: [
    "新芽小径", "蘑菇浅滩", "石甲坡地", "风语栈桥", "守望林口", "暮色溪谷",
    "盘根小径", "古碑营地", "雾松腹地", "藤蔓祭场", "巨木门廊", "古树之心",
  ],
  2: [
    "霜风隘口", "雪松坡道", "冰湖浅滩", "寒星营地", "白原长路", "冻土岗哨",
    "极光裂谷", "霜岩阶地", "暴雪回廊", "冰脊祭场", "雪冠门庭", "极夜之心",
  ],
  3: [
    "赤岩关口", "驼铃坡道", "枯井集市", "断碑营地", "热风长路", "金沙哨站",
    "绿洲残影", "风蚀阶地", "流沙回廊", "日轮祭场", "古城门庭", "赤沙王庭",
  ],
  4: [
    "云门栈道", "浮石坡径", "风铃驿站", "断虹平台", "穿云长桥", "雷羽哨塔",
    "风暴回廊", "天井祭台", "浮城外庭", "霆光阶梯", "云宫门庭", "苍雷天阙",
  ],
  5: [
    "黑水渡口", "芦苇浅滩", "腐木栈道", "沼灯营地", "泥沼长路", "萤火哨站",
    "沉舟残影", "苔石阶地", "雾沼回廊", "沼心祭场", "苇门门庭", "黑水之心",
  ],
  6: [
    "焦土关口", "熔渣坡道", "烬井营地", "裂岩哨站", "热风荒路", "黑铁岗哨",
    "余烬裂谷", "岩脉阶地", "燃烧回廊", "烬心祭场", "荒城门庭", "燃石王座",
  ],
  7: [
    "暗潮礁口", "盐雾坡道", "沉锚浅滩", "潮灯营地", "岩岸长路", "浪蚀哨塔",
    "碎浪裂谷", "潮石阶地", "暗潮回廊", "海蚀祭场", "礁门门庭", "潮心深渊",
  ],
  8: [
    "哀嚎隘口", "枯丘坡道", "骨环营地", "灰烟哨站", "旧战长路", "残旗岗哨",
    "丘墓裂谷", "荒石阶地", "哀嚎回廊", "墓风祭场", "丘门门庭", "哀嚎之心",
  ],
  9: [
    "石牙关口", "牙峰坡道", "矿灯营地", "岩缝哨站", "矿道长路", "晶脉岗哨",
    "崩石裂谷", "石脊阶地", "矿脉回廊", "牙岩祭场", "山门门庭", "石牙之巅",
  ],
  10: [
    "北风关口", "霜旗坡道", "边关营地", "寒哨岗楼", "关道长路", "铁门哨站",
    "风雪裂谷", "关墙阶地", "北风回廊", "边关祭场", "关塞门庭", "北风王座",
  ],
};

function buildChapter(chapter: ChapterId): StageDefinition[] {
  const meta = CHAPTER_BY_ID[chapter];
  const names = STAGE_NAMES[chapter];
  return names.map((name, index) => ({
    id: `${chapter}-${index + 1}`,
    stage: (chapter - 1) * STAGES_PER_CHAPTER + index + 1,
    name,
    chapter,
    chapterName: meta.name,
    environment: index < 4 ? "meadow" : index < 8 ? "forest" : "ruins",
    bossName: meta.bossName,
  }));
}

export const STAGE_DEFINITIONS: readonly StageDefinition[] = CHAPTER_DEFINITIONS.flatMap((chapter) =>
  buildChapter(chapter.id),
);
