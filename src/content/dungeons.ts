import type { MaterialId } from "./materials";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";

export const DUNGEON_IDS = [
  "D01", "D02", "D03", "D04", "D05",
  "D06", "D07", "D08", "D09", "D10",
  "D11", "D12", "D13", "D14", "D15",
  "D16", "D17", "D18", "D19", "D20",
] as const;

export type DungeonId = (typeof DUNGEON_IDS)[number];

/** Buffs are shared: whole party, or all physical / all magic heroes. */
export type DungeonBonusScope =
  | { kind: "party" }
  | { kind: "school"; school: "physical" | "magic" };

export interface DungeonDrop {
  materialId: MaterialId;
  /** Guaranteed base amount on clear. */
  amount: number;
  /** Extra chance (0–1) to gain +1 of the same material. */
  bonusChance: number;
}

export interface DungeonDefinition {
  id: DungeonId;
  name: string;
  blurb: string;
  /** Mainline cleared stage required to unlock. */
  unlockClearedStage: number;
  /** Combat difficulty uses this stage number. */
  powerStage: number;
  /** Wall-clock dispatch duration. */
  durationMs: number;
  /** Heroes required to start a dispatch. */
  partySize: number;
  bonusScope: DungeonBonusScope;
  bonusStats: HeroBattleBonus;
  /** Shown in the card buff strip. */
  bonusLabel: string;
  drops: readonly DungeonDrop[];
  gold: number;
  exp: number;
}

const MINUTE_MS = 60_000;

function dispatchOf(id: DungeonId): { durationMs: number; partySize: number } {
  const index = Number(id.slice(1));
  if (index <= 7) return { durationMs: 15 * MINUTE_MS, partySize: 2 };
  if (index <= 14) return { durationMs: 30 * MINUTE_MS, partySize: 3 };
  if (index <= 17) return { durationMs: 45 * MINUTE_MS, partySize: 4 };
  return { durationMs: 60 * MINUTE_MS, partySize: 5 };
}

const party = (
  stats: HeroBattleBonus,
  label: string,
): Pick<DungeonDefinition, "bonusScope" | "bonusStats" | "bonusLabel"> => ({
  bonusScope: { kind: "party" },
  bonusStats: stats,
  bonusLabel: label,
});

const school = (
  schoolName: "physical" | "magic",
  stats: HeroBattleBonus,
  label: string,
): Pick<DungeonDefinition, "bonusScope" | "bonusStats" | "bonusLabel"> => ({
  bonusScope: { kind: "school", school: schoolName },
  bonusStats: stats,
  bonusLabel: label,
});

export const DUNGEON_DEFINITIONS: readonly DungeonDefinition[] = [
  {
    id: "D01",
    ...dispatchOf("D01"),
    name: "铁壁试炼",
    blurb: "壁垒之力笼罩全队，站得更稳、扛得更久。",
    unlockClearedStage: 0,
    powerStage: 3,
    ...party({ maxHpPct: 0.18, defensePct: 0.16, damageReductionPct: 0.05 }, "全队：生命与防御提升"),
    drops: [{ materialId: "mat_socket_stone", amount: 2, bonusChance: 0.35 }],
    gold: 40,
    exp: 18,
  },
  {
    id: "D02",
    ...dispatchOf("D02"),
    name: "裂骨战场",
    blurb: "刀锋与箭矢共鸣，所有物理输出被放大。",
    unlockClearedStage: 3,
    powerStage: 6,
    ...school("physical", { physicalDamagePct: 0.22, critChance: 0.04 }, "物理英雄：物理伤害提升"),
    drops: [{ materialId: "gem_atk", amount: 1, bonusChance: 0.4 }],
    gold: 48,
    exp: 22,
  },
  {
    id: "D03",
    ...dispatchOf("D03"),
    name: "奥术回廊",
    blurb: "法力潮汐涌动，所有法术伤害攀升。",
    unlockClearedStage: 6,
    powerStage: 9,
    ...school("magic", { magicDamagePct: 0.22, skillDamagePct: 0.08 }, "法系英雄：法术伤害提升"),
    drops: [{ materialId: "mat_smelt_flux", amount: 2, bonusChance: 0.3 }],
    gold: 55,
    exp: 26,
  },
  {
    id: "D04",
    ...dispatchOf("D04"),
    name: "晨光圣所",
    blurb: "圣光加持治疗与回复，续航大幅增强。",
    unlockClearedStage: 9,
    powerStage: 12,
    ...party({ healPowerPct: 0.28, renewalPct: 0.06, hpRegenPerSec: 3 }, "全队：治疗与回复提升"),
    drops: [{ materialId: "gem_hp", amount: 1, bonusChance: 0.4 }],
    gold: 60,
    exp: 28,
  },
  {
    id: "D05",
    ...dispatchOf("D05"),
    name: "迅击沙漏",
    blurb: "时光被压缩，全队攻击节奏显著加快。",
    unlockClearedStage: 12,
    powerStage: 15,
    ...party({ attackSpeedPct: 20, primaryAttackPct: 0.06 }, "全队：攻击速度提升"),
    drops: [{ materialId: "gem_crit", amount: 1, bonusChance: 0.35 }],
    gold: 68,
    exp: 32,
  },
  {
    id: "D06",
    ...dispatchOf("D06"),
    name: "血刃隘口",
    blurb: "物理锋芒更锐利，暴击也更致命。",
    unlockClearedStage: 15,
    powerStage: 18,
    ...school("physical", { physicalDamagePct: 0.16, critDamagePct: 18, attack: 12 }, "物理英雄：物伤与暴伤提升"),
    drops: [{ materialId: "mat_reset_scroll", amount: 1, bonusChance: 0.4 }],
    gold: 75,
    exp: 34,
  },
  {
    id: "D07",
    ...dispatchOf("D07"),
    name: "霜火祭坛",
    blurb: "元素交汇，法系技能更频繁、更猛烈。",
    unlockClearedStage: 18,
    powerStage: 22,
    ...school("magic", { magicDamagePct: 0.14, skillCooldownPct: 0.12, skillDamagePct: 0.1 }, "法系英雄：法伤与冷却提升"),
    drops: [{ materialId: "gem_def", amount: 1, bonusChance: 0.4 }],
    gold: 82,
    exp: 38,
  },
  {
    id: "D08",
    ...dispatchOf("D08"),
    name: "疾风平原",
    blurb: "劲风催动肢体，全队动作更加迅捷。",
    unlockClearedStage: 24,
    powerStage: 26,
    ...party({ attackSpeedPct: 14, moveSpeedPct: 16 }, "全队：攻速与移速提升"),
    drops: [{ materialId: "mat_ascend_stone", amount: 1, bonusChance: 0.25 }],
    gold: 90,
    exp: 42,
  },
  {
    id: "D09",
    ...dispatchOf("D09"),
    name: "锋刃矿脉",
    blurb: "矿脉锋芒外溢，全队输出全面攀升。",
    unlockClearedStage: 30,
    powerStage: 30,
    ...party({ attack: 18, damagePct: 0.12 }, "全队：攻击与伤害提升"),
    drops: [
      { materialId: "gem_atk", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.25 },
    ],
    gold: 100,
    exp: 46,
  },
  {
    id: "D10",
    ...dispatchOf("D10"),
    name: "磐石营地",
    blurb: "磐石驻军之所，全队更耐打。",
    unlockClearedStage: 36,
    powerStage: 34,
    ...party({ maxHpPct: 0.16, defensePct: 0.14, blockChance: 0.05 }, "全队：生命、防御与格挡提升"),
    drops: [
      { materialId: "gem_hp", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_socket_stone", amount: 1, bonusChance: 0.35 },
    ],
    gold: 108,
    exp: 50,
  },
  {
    id: "D11",
    ...dispatchOf("D11"),
    name: "连珠祭坛",
    blurb: "咏唱被加速，技能循环显著加快。",
    unlockClearedStage: 42,
    powerStage: 38,
    ...party({ skillCooldownPct: 0.18, skillDamagePct: 0.06 }, "全队：技能冷却缩短"),
    drops: [
      { materialId: "gem_crit", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_reset_scroll", amount: 1, bonusChance: 0.25 },
    ],
    gold: 116,
    exp: 54,
  },
  {
    id: "D12",
    ...dispatchOf("D12"),
    name: "贯甲峡谷",
    blurb: "专为物理小队准备的猎场，物伤再强化。",
    unlockClearedStage: 48,
    powerStage: 42,
    ...school("physical", { physicalDamagePct: 0.28, eliteDamagePct: 0.1 }, "物理英雄：物伤大幅提升"),
    drops: [{ materialId: "gem_atk", amount: 2, bonusChance: 0.3 }],
    gold: 124,
    exp: 58,
  },
  {
    id: "D13",
    ...dispatchOf("D13"),
    name: "星辉回廊",
    blurb: "星辉灌注法力，法术伤害再次抬升。",
    unlockClearedStage: 54,
    powerStage: 46,
    ...school("magic", { magicDamagePct: 0.28, critChance: 0.04 }, "法系英雄：法伤大幅提升"),
    drops: [{ materialId: "mat_smelt_flux", amount: 2, bonusChance: 0.35 }],
    gold: 132,
    exp: 62,
  },
  {
    id: "D14",
    ...dispatchOf("D14"),
    name: "涌泉圣池",
    blurb: "治疗之力奔涌，回复与治疗同时增强。",
    unlockClearedStage: 60,
    powerStage: 50,
    ...party({ healPowerPct: 0.35, lifeStealPct: 0.05, renewalPct: 0.05 }, "全队：治疗与吸血提升"),
    drops: [{ materialId: "mat_reset_scroll", amount: 2, bonusChance: 0.3 }],
    gold: 140,
    exp: 66,
  },
  {
    id: "D15",
    ...dispatchOf("D15"),
    name: "爆裂祭场",
    blurb: "每一次技能释放都更剧烈。",
    unlockClearedStage: 66,
    powerStage: 54,
    ...party({ skillDamagePct: 0.22, critChance: 0.04 }, "全队：技能伤害提升"),
    drops: [
      { materialId: "gem_crit", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.3 },
    ],
    gold: 150,
    exp: 70,
  },
  {
    id: "D16",
    ...dispatchOf("D16"),
    name: "汲魂沼泽",
    blurb: "沼泽化为生机，转化为全队吸血与再生。",
    unlockClearedStage: 72,
    powerStage: 58,
    ...party({ lifeStealPct: 0.09, lifeOnHit: 6, hpRegenPerSec: 5 }, "全队：吸血与生命回复提升"),
    drops: [{ materialId: "gem_hp", amount: 2, bonusChance: 0.35 }],
    gold: 158,
    exp: 74,
  },
  {
    id: "D17",
    ...dispatchOf("D17"),
    name: "猎首丘陵",
    blurb: "专克精英与首领，全队特攻提升。",
    unlockClearedStage: 78,
    powerStage: 62,
    ...party({ eliteDamagePct: 0.28, executeDamagePct: 0.1 }, "全队：精英/Boss 伤害提升"),
    drops: [{ materialId: "mat_ascend_stone", amount: 1, bonusChance: 0.4 }],
    gold: 168,
    exp: 78,
  },
  {
    id: "D18",
    ...dispatchOf("D18"),
    name: "鼓点战场",
    blurb: "战鼓催促出手，攻速再次拉满。",
    unlockClearedStage: 84,
    powerStage: 66,
    ...party({ attackSpeedPct: 24, primaryAttackPct: 0.1 }, "全队：攻速大幅提升"),
    drops: [{ materialId: "mat_socket_stone", amount: 2, bonusChance: 0.4 }],
    gold: 176,
    exp: 82,
  },
  {
    id: "D19",
    ...dispatchOf("D19"),
    name: "双生裂隙",
    blurb: "物理与法术同时被裂隙加持。",
    unlockClearedStage: 90,
    powerStage: 70,
    ...party({ physicalDamagePct: 0.12, magicDamagePct: 0.12, damagePct: 0.06 }, "全队：物伤与法伤同时提升"),
    drops: [{ materialId: "gem_def", amount: 2, bonusChance: 0.35 }],
    gold: 186,
    exp: 86,
  },
  {
    id: "D20",
    ...dispatchOf("D20"),
    name: "万象熔炉",
    blurb: "万象之力熔炼于此，攻防速与治疗综合强化。",
    unlockClearedStage: 96,
    powerStage: 78,
    ...party(
      {
        damagePct: 0.08,
        maxHpPct: 0.08,
        attackSpeedPct: 10,
        healPowerPct: 0.12,
        skillCooldownPct: 0.06,
      },
      "全队：伤害、攻速、治疗与冷却综合提升",
    ),
    drops: [
      { materialId: "mat_ascend_stone", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_socket_stone", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.4 },
      { materialId: "gem_atk", amount: 1, bonusChance: 0.3 },
    ],
    gold: 220,
    exp: 100,
  },
];

export const DUNGEON_BY_ID = Object.fromEntries(
  DUNGEON_DEFINITIONS.map((dungeon) => [dungeon.id, dungeon]),
) as Record<DungeonId, DungeonDefinition>;

export const DAILY_DUNGEON_COUNT = 3;

export function isDungeonId(value: string): value is DungeonId {
  return value in DUNGEON_BY_ID;
}

export function isDungeonUnlocked(dungeon: DungeonDefinition, highestClearedStage: number): boolean {
  return highestClearedStage >= dungeon.unlockClearedStage;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (const character of dateKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 按日期随机抽出当日开放的 3 个副本（同日结果固定，跨日重随）。 */
export function getDailyDungeonIds(dateKey: string): DungeonId[] {
  const pool = [...DUNGEON_IDS];
  let state = hashDateKey(`dungeon-daily-${dateKey}`);
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = next() % (i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, DAILY_DUNGEON_COUNT);
}

export function isDailyDungeonOpen(dungeonId: DungeonId, dateKey: string): boolean {
  return getDailyDungeonIds(dateKey).includes(dungeonId);
}

export function mergeBonus(base: HeroBattleBonus, extra: HeroBattleBonus): HeroBattleBonus {
  const result: HeroBattleBonus = { ...base };
  for (const [rawKey, rawValue] of Object.entries(extra)) {
    if (typeof rawValue !== "number") continue;
    const key = rawKey as keyof HeroBattleBonus;
    const current = result[key];
    result[key] = ((typeof current === "number" ? current : 0) + rawValue) as never;
  }
  return result;
}

export function applyDungeonBonusToHero(
  dungeon: DungeonDefinition,
  _roleName: string,
  damageSchool: "physical" | "magic",
  base: HeroBattleBonus,
): HeroBattleBonus {
  const scope = dungeon.bonusScope;
  const matches =
    scope.kind === "party" || (scope.kind === "school" && scope.school === damageSchool);
  return matches ? mergeBonus(base, dungeon.bonusStats) : base;
}
