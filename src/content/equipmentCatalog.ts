import type { ChapterId } from "./chapters";
import { svgEquipmentIcon } from "./equipmentIcon";
import type { DamageSchool } from "./equipmentIcon";
import type { SetId } from "./sets";
import type { EquipmentSlot } from "./equipmentSlots";
import type { Rarity } from "./rarities";

export type BaseTier = 1 | 2 | 3 | 4;

export interface CatalogItemSeed {
  id: string;
  name: string;
  slot: EquipmentSlot;
  school: DamageSchool;
  baseTier: BaseTier;
  unlockChapter: ChapterId;
  retireChapter: number;
  minGrade: Rarity;
  maxGrade: Rarity;
  setId?: SetId;
  /** Prefer existing webp when present; otherwise SVG placeholder. */
  icon?: string;
  /** Legacy chapter field for pool / UI grouping. */
  chapter: ChapterId;
}

const TIER_GRADE: Record<BaseTier, { minGrade: Rarity; maxGrade: Rarity; retireChapter: number }> = {
  1: { minGrade: "common", maxGrade: "uncommon", retireChapter: 2 },
  2: { minGrade: "common", maxGrade: "epic", retireChapter: 5 },
  3: { minGrade: "common", maxGrade: "arcane", retireChapter: 8 },
  4: { minGrade: "common", maxGrade: "sacred", retireChapter: 11 },
};

function tierForChapter(chapter: ChapterId): BaseTier {
  if (chapter <= 1) return 1;
  if (chapter <= 3) return 2;
  if (chapter <= 6) return 3;
  return 4;
}

function unlockForTier(tier: BaseTier, chapter: ChapterId): ChapterId {
  if (tier === 1) return 1;
  if (tier === 2) return Math.max(2, Math.min(chapter, 4)) as ChapterId;
  if (tier === 3) return Math.max(4, Math.min(chapter, 7)) as ChapterId;
  return Math.max(7, chapter) as ChapterId;
}

const MAGIC_ID_HINTS = [
  "staff",
  "scepter",
  "branch",
  "grimoire",
  "codex",
  "tome",
  "robe",
  "lantern",
  "circlet",
  "vial",
  "prism",
  "beads",
  "rune",
  "oasis",
  "aurora",
  "skyweave",
  "leaf_robe",
  "frost_mantle",
  "ward_tome",
  "dawn_lantern",
  "snow_lantern",
  "sun_lantern",
  "sky_lantern",
  "leaf_slippers",
  "aurora_slippers",
  "oasis_slippers",
  "sky_slippers",
  "leaf_band",
  "aurora_cuff",
  "oasis_band",
  "sky_band",
  "leaf_charm",
  "ember_beads",
  "frost_bell",
  "storm_drum",
  "rune_stone",
  "dew_drop",
  "leaf_stud",
];

export function inferSchool(id: string, slot: EquipmentSlot): DamageSchool {
  const lower = id.toLowerCase();
  if (MAGIC_ID_HINTS.some((hint) => lower.includes(hint))) return "magic";
  // Accessories: alternate by hash for coverage.
  if (slot === "ring" || slot === "amulet" || slot === "earring" || slot === "bracer") {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) | 0;
    return Math.abs(hash) % 2 === 0 ? "physical" : "magic";
  }
  return "physical";
}

export function enrichLegacyItem(input: {
  id: string;
  name: string;
  slot: EquipmentSlot;
  icon: string;
  chapter: 1 | 2 | 3 | 4;
  setId?: SetId;
}): CatalogItemSeed {
  const chapter = input.chapter as ChapterId;
  const baseTier = tierForChapter(chapter);
  const grades = TIER_GRADE[baseTier];
  const school = inferSchool(input.id, input.slot);
  return {
    id: input.id,
    name: input.name,
    slot: input.slot,
    icon: input.icon,
    chapter,
    school,
    baseTier,
    unlockChapter: unlockForTier(baseTier, chapter),
    retireChapter: grades.retireChapter,
    minGrade: grades.minGrade,
    maxGrade: grades.maxGrade,
    setId: input.setId,
  };
}

type SlotTheme = { phys: string; magic: string };

const LATER_SLOT_THEMES: Record<ChapterId, Partial<Record<EquipmentSlot, SlotTheme>>> = {
  1: {},
  2: {},
  3: {},
  4: {},
  5: {
    main_weapon: { phys: "黑水刺矛", magic: "沼萤短杖" },
    off_hand: { phys: "芦苇圆盾", magic: "沼灯副册" },
    helmet: { phys: "泥沼皮盔", magic: "萤雾软帽" },
    armor: { phys: "黑水鳞甲", magic: "芦影法袍" },
    gloves: { phys: "沼行护手", magic: "萤丝手套" },
    boots: { phys: "泥滩铁靴", magic: "苇径软靴" },
    ring: { phys: "黑水铁环", magic: "沼萤晶环" },
    bracer: { phys: "芦骨护腕", magic: "萤雾腕箍" },
    amulet: { phys: "沼心徽牌", magic: "黑水瓶坠" },
    earring: { phys: "芦环耳饰", magic: "萤滴耳坠" },
  },
  6: {
    main_weapon: { phys: "烬岩战斧", magic: "余烬权杖" },
    off_hand: { phys: "焦土圆盾", magic: "烬瓶提灯" },
    helmet: { phys: "黑铁盔", magic: "余烬软冠" },
    armor: { phys: "燃烧荒甲", magic: "烬纹法袍" },
    gloves: { phys: "熔渣拳套", magic: "余烬织套" },
    boots: { phys: "焦土铁靴", magic: "烬步软靴" },
    ring: { phys: "黑铁熔环", magic: "余烬晶环" },
    bracer: { phys: "烬铁护腕", magic: "熔纹腕箍" },
    amulet: { phys: "燃石战徽", magic: "烬心晶坠" },
    earring: { phys: "焦环耳饰", magic: "余烬泪坠" },
  },
  7: {
    main_weapon: { phys: "潮岩弯刀", magic: "暗潮法杖" },
    off_hand: { phys: "盐雾圆盾", magic: "潮声宝珠" },
    helmet: { phys: "礁岩盔", magic: "盐雾兜帽" },
    armor: { phys: "暗潮鳞甲", magic: "潮织法袍" },
    gloves: { phys: "浪蚀护手", magic: "珍珠手套" },
    boots: { phys: "岩岸铁靴", magic: "潮径软靴" },
    ring: { phys: "潮铁环", magic: "珍珠晶环" },
    bracer: { phys: "盐雾护腕", magic: "潮蓝腕箍" },
    amulet: { phys: "沉锚徽", magic: "暗潮瓶坠" },
    earring: { phys: "礁环耳饰", magic: "潮铃耳坠" },
  },
  8: {
    main_weapon: { phys: "哀嚎阔剑", magic: "墓风短杖" },
    off_hand: { phys: "丘墓圆盾", magic: "哀嚎符灯" },
    helmet: { phys: "枯丘盔", magic: "墓风软帽" },
    armor: { phys: "哀嚎板甲", magic: "丘墓法袍" },
    gloves: { phys: "骨环拳套", magic: "墓纹织套" },
    boots: { phys: "荒丘铁靴", magic: "墓径软靴" },
    ring: { phys: "骨白铁环", magic: "哀嚎符环" },
    bracer: { phys: "枯丘护腕", magic: "墓风腕箍" },
    amulet: { phys: "残旗战徽", magic: "哀嚎骨坠" },
    earring: { phys: "骨环耳饰", magic: "墓铃耳坠" },
  },
  9: {
    main_weapon: { phys: "石牙重斧", magic: "晶岩权杖" },
    off_hand: { phys: "牙峰圆盾", magic: "矿灯副典" },
    helmet: { phys: "石牙盔", magic: "晶岩冠" },
    armor: { phys: "石脊板甲", magic: "矿纹法袍" },
    gloves: { phys: "牙岩拳套", magic: "晶丝手套" },
    boots: { phys: "矿道铁靴", magic: "晶径软靴" },
    ring: { phys: "石牙环", magic: "晶岩环" },
    bracer: { phys: "岩脉护腕", magic: "晶箍腕" },
    amulet: { phys: "石牙战徽", magic: "矿晶坠" },
    earring: { phys: "牙环耳饰", magic: "晶泪耳坠" },
  },
  10: {
    main_weapon: { phys: "北风关刃", magic: "北风星杖" },
    off_hand: { phys: "关塞圆盾", magic: "极夜符灯" },
    helmet: { phys: "北风角盔", magic: "极夜软冠" },
    armor: { phys: "关塞霜甲", magic: "北风行袍" },
    gloves: { phys: "霜钢拳套", magic: "极夜织套" },
    boots: { phys: "北风关靴", magic: "极夜软靴" },
    ring: { phys: "霜钢环", magic: "北风星环" },
    bracer: { phys: "关塞护腕", magic: "极夜腕箍" },
    amulet: { phys: "北风战徽", magic: "极夜晶坠" },
    earring: { phys: "霜环耳饰", magic: "星泪耳坠" },
  },
};

const SLOTS: EquipmentSlot[] = [
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
];

/** Set piece slots (6 each). */
const SET_SLOT_PICK: EquipmentSlot[] = [
  "main_weapon",
  "off_hand",
  "helmet",
  "armor",
  "gloves",
  "boots",
];

function buildLaterChapterItems(): CatalogItemSeed[] {
  const items: CatalogItemSeed[] = [];
  for (const chapter of [5, 6, 7, 8, 9, 10] as ChapterId[]) {
    const baseTier = tierForChapter(chapter);
    const grades = TIER_GRADE[baseTier];
    const themes = LATER_SLOT_THEMES[chapter];
    for (const slot of SLOTS) {
      const theme = themes[slot];
      if (!theme) continue;
      for (const school of ["physical", "magic"] as const) {
        const name = school === "physical" ? theme.phys : theme.magic;
        const id = `${slot}_ch${chapter}_${school === "physical" ? "p" : "m"}`;
        items.push({
          id,
          name,
          slot,
          school,
          baseTier,
          unlockChapter: unlockForTier(baseTier, chapter),
          retireChapter: grades.retireChapter,
          minGrade: grades.minGrade,
          maxGrade: grades.maxGrade,
          chapter,
          icon: svgEquipmentIcon(id, slot, school),
        });
      }
    }
  }
  return items;
}

/** Extra T3/T4 set-tagged pieces so each set has 6 wearable definitions. */
function buildSetPieces(): CatalogItemSeed[] {
  const configs: { setId: SetId; school: DamageSchool; chapter: ChapterId; prefix: string }[] = [
    { setId: "set_moss_crown", school: "physical", chapter: 5, prefix: "苔冠" },
    { setId: "set_frost_bite", school: "physical", chapter: 6, prefix: "霜咬" },
    { setId: "set_sand_scar", school: "magic", chapter: 7, prefix: "沙痕" },
    { setId: "set_storm_tide", school: "magic", chapter: 8, prefix: "风暴" },
  ];
  const slotLabels: Record<EquipmentSlot, string> = {
    main_weapon: "主武",
    off_hand: "副手",
    helmet: "头盔",
    armor: "护甲",
    gloves: "手套",
    boots: "鞋子",
    ring: "戒指",
    bracer: "护腕",
    amulet: "护符",
    earring: "耳环",
  };
  const items: CatalogItemSeed[] = [];
  for (const config of configs) {
    const baseTier = tierForChapter(config.chapter);
    const grades = TIER_GRADE[baseTier];
    for (const slot of SET_SLOT_PICK) {
      const id = `${config.setId}_${slot}`;
      items.push({
        id,
        name: `${config.prefix}${slotLabels[slot]}`,
        slot,
        school: config.school,
        baseTier,
        unlockChapter: unlockForTier(baseTier, config.chapter),
        retireChapter: grades.retireChapter,
        minGrade: grades.minGrade,
        maxGrade: grades.maxGrade,
        setId: config.setId,
        chapter: config.chapter,
        icon: svgEquipmentIcon(id, slot, config.school),
      });
    }
  }
  return items;
}

export function buildGeneratedCatalog(): CatalogItemSeed[] {
  return [...buildLaterChapterItems(), ...buildSetPieces()];
}
