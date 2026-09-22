export type SetId =
  | "set_moss_crown"
  | "set_frost_bite"
  | "set_sand_scar"
  | "set_storm_tide"
  | "set_blackwater_hunt"
  | "set_marshfire_rite"
  | "set_ember_breaker"
  | "set_cinder_chant"
  | "set_tide_oath"
  | "set_deepsea_echo"
  | "set_grave_hunt"
  | "set_grave_whisper"
  | "set_stonefang_bulwark"
  | "set_crystal_resonance"
  | "set_northwind_warsong"
  | "set_polar_astrolabe";

export const SET_IDS: readonly SetId[] = [
  "set_moss_crown",
  "set_frost_bite",
  "set_sand_scar",
  "set_storm_tide",
  "set_blackwater_hunt",
  "set_marshfire_rite",
  "set_ember_breaker",
  "set_cinder_chant",
  "set_tide_oath",
  "set_deepsea_echo",
  "set_grave_hunt",
  "set_grave_whisper",
  "set_stonefang_bulwark",
  "set_crystal_resonance",
  "set_northwind_warsong",
  "set_polar_astrolabe",
];

const SET_ID_SET = new Set<string>(SET_IDS);

export function isSetId(value: unknown): value is SetId {
  return typeof value === "string" && SET_ID_SET.has(value);
}

export type SetEssenceInventory = Record<SetId, number>;

export function createEmptySetEssences(): SetEssenceInventory {
  return Object.fromEntries(SET_IDS.map((id) => [id, 0])) as SetEssenceInventory;
}

export function normalizeSetEssences(raw: unknown): SetEssenceInventory {
  const result = createEmptySetEssences();
  if (!raw || typeof raw !== "object") return result;
  const source = raw as Record<string, unknown>;
  for (const id of SET_IDS) {
    const value = source[id];
    result[id] = typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : 0;
  }
  return result;
}

export interface SetBonusTier {
  pieces: 2 | 4 | 6;
  /** Percent points for UI + combat (e.g. 6 => +6%). */
  lifePct?: number;
  defensePct?: number;
  damagePct?: number;
  primaryAttackPct?: number;
  skillDamagePct?: number;
  physicalDamagePct?: number;
  magicDamagePct?: number;
  fireDamagePct?: number;
  lightningDamagePct?: number;
  darkDamagePct?: number;
  damageReductionPct?: number;
  attackSpeedPct?: number;
  castSpeedPct?: number;
  rageGainPct?: number;
  critChancePct?: number;
  critDamagePct?: number;
  eliteDamagePct?: number;
  executeDamagePct?: number;
  healPowerPct?: number;
  lifeStealPct?: number;
  blockChancePct?: number;
  allResistPct?: number;
  thornsPct?: number;
  waveStartShieldPct?: number;
}

export interface SetDefinition {
  id: SetId;
  name: string;
  school: "physical" | "magic";
  bonuses: readonly SetBonusTier[];
}

export const SET_DEFINITIONS: readonly SetDefinition[] = [
  {
    id: "set_moss_crown",
    name: "苔冠守望",
    school: "physical",
    bonuses: [
      { pieces: 2, lifePct: 6 },
      { pieces: 4, blockChancePct: 4, damageReductionPct: 4 },
      { pieces: 6, eliteDamagePct: 10 },
    ],
  },
  {
    id: "set_frost_bite",
    name: "霜咬行者",
    school: "physical",
    bonuses: [
      { pieces: 2, physicalDamagePct: 6 },
      { pieces: 4, critDamagePct: 12, attackSpeedPct: 4 },
      { pieces: 6, critChancePct: 5 },
    ],
  },
  {
    id: "set_sand_scar",
    name: "沙痕旅人",
    school: "magic",
    bonuses: [
      { pieces: 2, magicDamagePct: 6 },
      { pieces: 4, castSpeedPct: 6, critChancePct: 5 },
      { pieces: 6, eliteDamagePct: 12 },
    ],
  },
  {
    id: "set_storm_tide",
    name: "风暴潮声",
    school: "magic",
    bonuses: [
      { pieces: 2, damageReductionPct: 5 },
      { pieces: 4, lightningDamagePct: 10, lifePct: 6 },
      { pieces: 6, attackSpeedPct: 8 },
    ],
  },
  {
    id: "set_blackwater_hunt",
    name: "黑水猎团",
    school: "physical",
    bonuses: [
      { pieces: 2, lifeStealPct: 2 },
      { pieces: 4, primaryAttackPct: 10, attackSpeedPct: 4 },
      { pieces: 6, executeDamagePct: 12 },
    ],
  },
  {
    id: "set_marshfire_rite",
    name: "沼萤秘仪",
    school: "magic",
    bonuses: [
      { pieces: 2, rageGainPct: 6 },
      { pieces: 4, skillDamagePct: 8, healPowerPct: 10 },
      { pieces: 6, castSpeedPct: 8 },
    ],
  },
  {
    id: "set_ember_breaker",
    name: "烬岩破阵",
    school: "physical",
    bonuses: [
      { pieces: 2, physicalDamagePct: 8 },
      { pieces: 4, critChancePct: 5, critDamagePct: 14 },
      { pieces: 6, damagePct: 8 },
    ],
  },
  {
    id: "set_cinder_chant",
    name: "余烬咏火",
    school: "magic",
    bonuses: [
      { pieces: 2, fireDamagePct: 10 },
      { pieces: 4, skillDamagePct: 10, rageGainPct: 5 },
      { pieces: 6, castSpeedPct: 8 },
    ],
  },
  {
    id: "set_tide_oath",
    name: "潮岩守誓",
    school: "physical",
    bonuses: [
      { pieces: 2, defensePct: 8 },
      { pieces: 4, blockChancePct: 5, damageReductionPct: 4 },
      { pieces: 6, waveStartShieldPct: 10 },
    ],
  },
  {
    id: "set_deepsea_echo",
    name: "暗潮回响",
    school: "magic",
    bonuses: [
      { pieces: 2, magicDamagePct: 6 },
      { pieces: 4, castSpeedPct: 6, skillDamagePct: 8 },
      { pieces: 6, lifeStealPct: 3 },
    ],
  },
  {
    id: "set_grave_hunt",
    name: "丘墓追猎",
    school: "physical",
    bonuses: [
      { pieces: 2, eliteDamagePct: 8 },
      { pieces: 4, critChancePct: 4, executeDamagePct: 10 },
      { pieces: 6, damagePct: 10 },
    ],
  },
  {
    id: "set_grave_whisper",
    name: "墓风低语",
    school: "magic",
    bonuses: [
      { pieces: 2, darkDamagePct: 10 },
      { pieces: 4, skillDamagePct: 10, lifeStealPct: 2 },
      { pieces: 6, rageGainPct: 8 },
    ],
  },
  {
    id: "set_stonefang_bulwark",
    name: "石牙壁垒",
    school: "physical",
    bonuses: [
      { pieces: 2, lifePct: 8 },
      { pieces: 4, blockChancePct: 5, thornsPct: 10 },
      { pieces: 6, damageReductionPct: 8 },
    ],
  },
  {
    id: "set_crystal_resonance",
    name: "晶岩共鸣",
    school: "magic",
    bonuses: [
      { pieces: 2, allResistPct: 8 },
      { pieces: 4, rageGainPct: 6, skillDamagePct: 8 },
      { pieces: 6, waveStartShieldPct: 10 },
    ],
  },
  {
    id: "set_northwind_warsong",
    name: "北风战歌",
    school: "physical",
    bonuses: [
      { pieces: 2, attackSpeedPct: 5 },
      { pieces: 4, primaryAttackPct: 12, physicalDamagePct: 8 },
      { pieces: 6, critDamagePct: 18 },
    ],
  },
  {
    id: "set_polar_astrolabe",
    name: "极夜星仪",
    school: "magic",
    bonuses: [
      { pieces: 2, magicDamagePct: 8 },
      { pieces: 4, skillDamagePct: 10, critChancePct: 5 },
      { pieces: 6, castSpeedPct: 8 },
    ],
  },
];

export const SET_BY_ID = Object.fromEntries(
  SET_DEFINITIONS.map((set) => [set.id, set]),
) as Record<SetId, SetDefinition>;

export type SetChapter = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Natural set marks available in each chapter. The mark is rolled per item. */
export const CHAPTER_SET_IDS: Record<SetChapter, readonly SetId[]> = {
  1: ["set_moss_crown"],
  2: ["set_frost_bite"],
  3: ["set_sand_scar"],
  4: ["set_storm_tide"],
  5: ["set_blackwater_hunt", "set_marshfire_rite"],
  6: ["set_ember_breaker", "set_cinder_chant"],
  7: ["set_tide_oath", "set_deepsea_echo"],
  8: ["set_grave_hunt", "set_grave_whisper"],
  9: ["set_stonefang_bulwark", "set_crystal_resonance"],
  10: ["set_northwind_warsong", "set_polar_astrolabe"],
};

export function getChapterSetIds(chapter: number): readonly SetId[] {
  const normalized = Math.max(1, Math.min(10, Math.round(chapter))) as SetChapter;
  return CHAPTER_SET_IDS[normalized];
}

export function activeSetBonuses(equippedCounts: Partial<Record<SetId, number>>): SetBonusTier[] {
  const active: SetBonusTier[] = [];
  for (const set of SET_DEFINITIONS) {
    const count = equippedCounts[set.id] ?? 0;
    for (const bonus of set.bonuses) {
      if (count >= bonus.pieces) active.push(bonus);
    }
  }
  return active;
}
