import type { MaterialId } from "./materials";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { DamageElement } from "../simulation/types";
import { STAGES_PER_CHAPTER } from "./chapters";
import {
  HERO_COMBAT_RANGE_LABEL,
  HERO_EXPEDITION_ROLE_LABEL,
  HERO_GENDER_LABEL,
  type HeroCombatRange,
  type HeroGender,
} from "./heroes";
import type { HeroExpeditionRole } from "./specializations";
import { DAMAGE_ELEMENT_LABEL } from "./damageElements";

/** Expedition becomes a progression feature after clearing chapter 2. */
export const EXPEDITION_UNLOCK_CLEARED_STAGE = STAGES_PER_CHAPTER * 2;
/** Keep the feature and every expedition open while expedition content is under development. */
export const EXPEDITION_DEVELOPMENT_OPEN = true;

export function hasUnlockedExpeditionFeature(highestClearedStage: number): boolean {
  return highestClearedStage >= EXPEDITION_UNLOCK_CLEARED_STAGE;
}

export function isExpeditionFeatureAvailable(highestClearedStage: number): boolean {
  return EXPEDITION_DEVELOPMENT_OPEN || hasUnlockedExpeditionFeature(highestClearedStage);
}

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

export interface ExpeditionEnvironment {
  label: string;
  favoredElements: readonly DamageElement[];
  staminaBonusPct: number;
}

interface ExpeditionRequirementBase {
  id: string;
  label: string;
  count: number | "all";
}

export type ExpeditionRequirement =
  | (ExpeditionRequirementBase & {
      kind: "gender";
      allowed: readonly HeroGender[];
    })
  | (ExpeditionRequirementBase & {
      kind: "range";
      allowed: readonly HeroCombatRange[];
    })
  | (ExpeditionRequirementBase & {
      kind: "role";
      allowed: readonly HeroExpeditionRole[];
    })
  | (ExpeditionRequirementBase & {
      kind: "element";
      allowed: readonly DamageElement[];
    });

export interface DungeonDefinition {
  id: DungeonId;
  name: string;
  blurb: string;
  /** Mainline cleared stage required to unlock. */
  unlockClearedStage: number;
  /** Combat difficulty uses this stage number. */
  powerStage: number;
  /** Heroes required to start a dispatch. */
  partySize: number;
  /** Baseline used to scale each expedition event's stamina change. */
  staminaCost: number;
  /** Elements that are especially effective in this expedition environment. */
  environment: ExpeditionEnvironment;
  /** Permanent entry rules reserved for expeditions whose identity requires them. */
  fixedRequirements: readonly ExpeditionRequirement[];
  bonusScope: DungeonBonusScope;
  bonusStats: HeroBattleBonus;
  /** Shown in the card buff strip. */
  bonusLabel: string;
  drops: readonly DungeonDrop[];
  gold: number;
  exp: number;
}

const MINUTE_MS = 60_000;
export const EXPEDITION_EVENT_INTERVAL_MS = 5 * MINUTE_MS;
export const EXPEDITION_STAMINA_PER_HOUR = 100;

export function getExpeditionEventIntervalMs(): number {
  return EXPEDITION_EVENT_INTERVAL_MS;
}

const EXPEDITION_ENVIRONMENTS: Record<DungeonId, ExpeditionEnvironment> = {
  D01: { label: "金属壁垒", favoredElements: ["lightning"], staminaBonusPct: 0.25 },
  D02: { label: "开阔战场", favoredElements: ["physical"], staminaBonusPct: 0.25 },
  D03: { label: "奥术暗廊", favoredElements: ["dark"], staminaBonusPct: 0.25 },
  D04: { label: "晨光圣所", favoredElements: ["holy"], staminaBonusPct: 0.25 },
  D05: { label: "冻结时域", favoredElements: ["fire"], staminaBonusPct: 0.25 },
  D06: { label: "血雾隘口", favoredElements: ["holy"], staminaBonusPct: 0.25 },
  D07: { label: "冰封祭坛", favoredElements: ["fire"], staminaBonusPct: 0.25 },
  D08: { label: "风暴平原", favoredElements: ["lightning"], staminaBonusPct: 0.25 },
  D09: { label: "深层矿脉", favoredElements: ["physical"], staminaBonusPct: 0.25 },
  D10: { label: "岩壁营地", favoredElements: ["physical"], staminaBonusPct: 0.25 },
  D11: { label: "雷鸣祭坛", favoredElements: ["lightning"], staminaBonusPct: 0.25 },
  D12: { label: "干热峡谷", favoredElements: ["frost"], staminaBonusPct: 0.25 },
  D13: { label: "星辉回廊", favoredElements: ["dark"], staminaBonusPct: 0.25 },
  D14: { label: "涌泉湿地", favoredElements: ["lightning"], staminaBonusPct: 0.25 },
  D15: { label: "炽热祭场", favoredElements: ["frost"], staminaBonusPct: 0.25 },
  D16: { label: "潮湿沼泽", favoredElements: ["lightning"], staminaBonusPct: 0.25 },
  D17: { label: "荒野丘陵", favoredElements: ["physical"], staminaBonusPct: 0.25 },
  D18: { label: "战鼓前线", favoredElements: ["physical"], staminaBonusPct: 0.25 },
  D19: { label: "混沌裂隙", favoredElements: ["dark", "holy"], staminaBonusPct: 0.25 },
  D20: { label: "高温熔炉", favoredElements: ["frost"], staminaBonusPct: 0.25 },
};

function expeditionOf(
  id: DungeonId,
): Pick<DungeonDefinition, "partySize" | "staminaCost" | "environment" | "fixedRequirements"> {
  const index = Number(id.slice(1));
  const partySize = index <= 7 ? 2 : index <= 14 ? 3 : index <= 17 ? 4 : 5;
  return {
    partySize,
    staminaCost: 14,
    environment: EXPEDITION_ENVIRONMENTS[id],
    fixedRequirements: [],
  };
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
    ...expeditionOf("D01"),
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
    ...expeditionOf("D02"),
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
    ...expeditionOf("D03"),
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
    ...expeditionOf("D04"),
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
    ...expeditionOf("D05"),
    name: "迅击沙漏",
    blurb: "时光被压缩，全队攻击节奏显著加快。",
    unlockClearedStage: 12,
    powerStage: 15,
    ...party({ attackSpeedPct: 20, primaryAttackPct: 0.06 }, "全队：攻击速度提升"),
    drops: [{ materialId: "gem_haste", amount: 1, bonusChance: 0.35 }],
    gold: 68,
    exp: 32,
  },
  {
    id: "D06",
    ...expeditionOf("D06"),
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
    ...expeditionOf("D07"),
    name: "霜火祭坛",
    blurb: "元素交汇，法系技能更频繁、更猛烈。",
    unlockClearedStage: 18,
    powerStage: 22,
    ...school("magic", { magicDamagePct: 0.14, rageGainPct: 0.12, skillDamagePct: 0.1 }, "法系英雄：法伤与怒气获取提升"),
    drops: [{ materialId: "gem_def", amount: 1, bonusChance: 0.4 }],
    gold: 82,
    exp: 38,
  },
  {
    id: "D08",
    ...expeditionOf("D08"),
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
    ...expeditionOf("D09"),
    name: "锋刃矿脉",
    blurb: "矿脉锋芒外溢，全队输出全面攀升。",
    unlockClearedStage: 30,
    powerStage: 30,
    ...party({ attack: 18, damagePct: 0.12 }, "全队：攻击与伤害提升"),
    drops: [
      { materialId: "gem_crit_damage", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.25 },
    ],
    gold: 100,
    exp: 46,
  },
  {
    id: "D10",
    ...expeditionOf("D10"),
    name: "磐石营地",
    blurb: "磐石驻军之所，全队更耐打。",
    unlockClearedStage: 36,
    powerStage: 34,
    ...party({ maxHpPct: 0.16, defensePct: 0.14, blockChance: 0.05 }, "全队：生命、防御与格挡提升"),
    drops: [
      { materialId: "gem_damage_reduction", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_socket_stone", amount: 1, bonusChance: 0.35 },
    ],
    gold: 108,
    exp: 50,
  },
  {
    id: "D11",
    ...expeditionOf("D11"),
    name: "连珠祭坛",
    blurb: "咏唱被加速，技能循环显著加快。",
    unlockClearedStage: 42,
    powerStage: 38,
    ...party({ rageGainPct: 0.18, skillDamagePct: 0.06 }, "全队：怒气获取提高"),
    drops: [
      { materialId: "gem_rage", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_reset_scroll", amount: 1, bonusChance: 0.25 },
    ],
    gold: 116,
    exp: 54,
  },
  {
    id: "D12",
    ...expeditionOf("D12"),
    name: "贯甲峡谷",
    blurb: "专为物理小队准备的猎场，物伤再强化。",
    unlockClearedStage: 48,
    powerStage: 42,
    ...school("physical", { physicalDamagePct: 0.28, eliteDamagePct: 0.1 }, "物理英雄：物伤大幅提升"),
    drops: [{ materialId: "gem_crit", amount: 2, bonusChance: 0.3 }],
    gold: 124,
    exp: 58,
  },
  {
    id: "D13",
    ...expeditionOf("D13"),
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
    ...expeditionOf("D14"),
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
    ...expeditionOf("D15"),
    name: "爆裂祭场",
    blurb: "每一次技能释放都更剧烈。",
    unlockClearedStage: 66,
    powerStage: 54,
    ...party({ skillDamagePct: 0.22, critChance: 0.04 }, "全队：技能伤害提升"),
    drops: [
      { materialId: "gem_skill", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.3 },
    ],
    gold: 150,
    exp: 70,
  },
  {
    id: "D16",
    ...expeditionOf("D16"),
    name: "汲魂沼泽",
    blurb: "沼泽化为生机，转化为全队吸血与再生。",
    unlockClearedStage: 72,
    powerStage: 58,
    ...party({ lifeStealPct: 0.09, lifeOnHit: 6, hpRegenPerSec: 5 }, "全队：吸血与生命回复提升"),
    drops: [{ materialId: "gem_lifesteal", amount: 2, bonusChance: 0.35 }],
    gold: 158,
    exp: 74,
  },
  {
    id: "D17",
    ...expeditionOf("D17"),
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
    ...expeditionOf("D18"),
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
    ...expeditionOf("D19"),
    name: "双生裂隙",
    blurb: "物理与法术同时被裂隙加持。",
    unlockClearedStage: 90,
    powerStage: 70,
    ...party({ physicalDamagePct: 0.12, magicDamagePct: 0.12, damagePct: 0.06 }, "全队：物伤与法伤同时提升"),
    drops: [{ materialId: "gem_resist", amount: 2, bonusChance: 0.35 }],
    gold: 186,
    exp: 86,
  },
  {
    id: "D20",
    ...expeditionOf("D20"),
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
        rageGainPct: 0.06,
      },
      "全队：伤害、攻速、治疗与怒气获取综合提升",
    ),
    drops: [
      { materialId: "mat_ascend_stone", amount: 1, bonusChance: 0.45 },
      { materialId: "mat_socket_stone", amount: 1, bonusChance: 0.4 },
      { materialId: "mat_smelt_flux", amount: 1, bonusChance: 0.4 },
      { materialId: "gem_heal", amount: 1, bonusChance: 0.3 },
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
  return EXPEDITION_DEVELOPMENT_OPEN || highestClearedStage >= dungeon.unlockClearedStage;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (const character of dateKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 按日期随机抽出当日开放的 3 个远征（同日结果固定，跨日重随）。 */
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

function dailyRequirementPool(dungeon: DungeonDefinition): ExpeditionRequirement[] {
  const elementLabel = dungeon.environment.favoredElements
    .map((element) => DAMAGE_ELEMENT_LABEL[element])
    .join("或");
  const damageCount = Math.max(1, dungeon.partySize - 1);
  return [
    {
      id: "all-male",
      kind: "gender",
      allowed: ["male"],
      count: "all",
      label: `全员${HERO_GENDER_LABEL.male}`,
    },
    {
      id: "all-female",
      kind: "gender",
      allowed: ["female"],
      count: "all",
      label: `全员${HERO_GENDER_LABEL.female}`,
    },
    {
      id: "all-ranged",
      kind: "range",
      allowed: ["ranged"],
      count: "all",
      label: `全员${HERO_COMBAT_RANGE_LABEL.ranged}`,
    },
    {
      id: "tank-1",
      kind: "role",
      allowed: ["tank"],
      count: 1,
      label: `至少 1 名${HERO_EXPEDITION_ROLE_LABEL.tank}`,
    },
    {
      id: "healer-1",
      kind: "role",
      allowed: ["healer"],
      count: 1,
      label: `至少 1 名${HERO_EXPEDITION_ROLE_LABEL.healer}`,
    },
    {
      id: "support-1",
      kind: "role",
      allowed: ["support"],
      count: 1,
      label: `至少 1 名${HERO_EXPEDITION_ROLE_LABEL.support}`,
    },
    {
      id: `damage-${damageCount}`,
      kind: "role",
      allowed: ["damage"],
      count: damageCount,
      label: `至少 ${damageCount} 名${HERO_EXPEDITION_ROLE_LABEL.damage}`,
    },
    {
      id: `element-${dungeon.environment.favoredElements.join("-")}-1`,
      kind: "element",
      allowed: dungeon.environment.favoredElements,
      count: 1,
      label: `至少 1 名${elementLabel}英雄`,
    },
  ];
}

/**
 * The first daily expedition is always unrestricted. The other two receive one
 * deterministic condition from curated pools, with different condition kinds when possible.
 */
export function getDailyExpeditionRequirements(
  dateKey: string,
): Partial<Record<DungeonId, readonly ExpeditionRequirement[]>> {
  const dailyIds = getDailyDungeonIds(dateKey);
  const result: Partial<Record<DungeonId, readonly ExpeditionRequirement[]>> = {};
  const usedKinds = new Set<ExpeditionRequirement["kind"]>();
  for (let index = 0; index < dailyIds.length; index += 1) {
    const dungeonId = dailyIds[index]!;
    const dungeon = DUNGEON_BY_ID[dungeonId];
    if (index === 0) {
      result[dungeonId] = dungeon.fixedRequirements;
      continue;
    }
    const pool = dailyRequirementPool(dungeon);
    const start = hashDateKey(`expedition-condition-${dateKey}-${dungeonId}`) % pool.length;
    let selected = pool[start]!;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const candidate = pool[(start + offset) % pool.length]!;
      if (!usedKinds.has(candidate.kind)) {
        selected = candidate;
        break;
      }
    }
    usedKinds.add(selected.kind);
    result[dungeonId] = [...dungeon.fixedRequirements, selected];
  }
  return result;
}

export function getExpeditionRequirements(
  dungeonId: DungeonId,
  dateKey: string,
): readonly ExpeditionRequirement[] {
  return getDailyExpeditionRequirements(dateKey)[dungeonId] ?? DUNGEON_BY_ID[dungeonId].fixedRequirements;
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
