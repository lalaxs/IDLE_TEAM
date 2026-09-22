import { HERO_BY_ID } from "../content/heroes";
import {
  HERO_SKILL_UNLOCK_LEVEL,
  TALENT_IDS,
  TALENT_NODES,
  TALENT_POINT_CAP,
  TALENT_POINT_INTERVAL,
  TALENT_TIERS,
  getTalentTierDef,
  isTalentId,
  talentByIdForHero,
  talentsForHero,
  type TalentId,
  type TalentNode,
  type TalentStat,
} from "../content/talents";
import { HERO_SKILL_BY_ID, isHeroSkillId, type HeroSkillId } from "../content/heroSkills";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { HeroId } from "../simulation/types";

export type TalentRanks = Partial<Record<TalentId, number>>;

export const TALENT_RESET_GOLD_COST = 10_000;

const NODE_LIMITS = Object.fromEntries(TALENT_NODES.map(({ id, maxRank }) => [id, maxRank])) as Record<TalentId, number>;
const NODE_TIERS = Object.fromEntries(TALENT_NODES.map(({ id, tier }) => [id, tier])) as Record<TalentId, number>;

export function createEmptyTalentRanks(): TalentRanks {
  return {};
}

function legacyTalentRanks(source: Record<string, unknown>): Record<string, unknown> {
  if (TALENT_IDS.some((id) => Object.prototype.hasOwnProperty.call(source, id))) return source;
  const numberAt = (id: string): number => {
    const value = source[id];
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  };
  const migrated: Record<string, unknown> = {
    foundation_power: numberAt("might_attack"),
    foundation_precision: numberAt("might_crit"),
    foundation_vitality: numberAt("fort_hp"),
    foundation_guard: numberAt("fort_def"),
    foundation_tempo: numberAt("spirit_haste"),
    foundation_focus: numberAt("spirit_cdr"),
    mastery_a: numberAt("might_school"),
    mastery_b: numberAt("fort_block"),
    mastery_c: numberAt("fort_regen"),
    mastery_d: numberAt("spirit_heal"),
    mastery_e: Math.max(numberAt("might_execute"), numberAt("spirit_elite")),
  };
  const basicCandidates = [numberAt("might_skill"), numberAt("fort_dr"), numberAt("spirit_leech")];
  const basicIndex = basicCandidates.indexOf(Math.max(...basicCandidates));
  if (basicCandidates[basicIndex]! > 0) migrated[`basic_${String.fromCharCode(97 + basicIndex)}`] = 1;
  const ultimateCandidates = [numberAt("might_capstone"), numberAt("fort_capstone"), numberAt("spirit_capstone")];
  const ultimateIndex = ultimateCandidates.indexOf(Math.max(...ultimateCandidates));
  if (ultimateCandidates[ultimateIndex]! > 0) migrated[`ultimate_${String.fromCharCode(97 + ultimateIndex)}`] = 1;
  return migrated;
}

export function normalizeTalentRanks(raw: unknown): TalentRanks {
  if (!raw || typeof raw !== "object") return {};
  const source = legacyTalentRanks(raw as Record<string, unknown>);
  const ranks: TalentRanks = {};
  const spentByTier = new Map<number, number>();
  for (const id of TALENT_IDS) {
    const value = source[id];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const tier = NODE_TIERS[id];
    const remaining = getTalentTierDef(tier).pointCap - (spentByTier.get(tier) ?? 0);
    const rank = Math.min(NODE_LIMITS[id], remaining, Math.max(0, Math.floor(value)));
    if (rank <= 0) continue;
    ranks[id] = rank;
    spentByTier.set(tier, (spentByTier.get(tier) ?? 0) + rank);
  }
  return ranks;
}

export function normalizeChosenSkillId(raw: unknown): HeroSkillId | null {
  return typeof raw === "string" && isHeroSkillId(raw) ? raw : null;
}

export function getTalentPointsEarned(level: number): number {
  return Math.min(TALENT_POINT_CAP, Math.floor(Math.max(0, level) / TALENT_POINT_INTERVAL));
}

export function getTalentPointsSpent(ranks: TalentRanks): number {
  return TALENT_IDS.reduce((total, id) => total + (ranks[id] ?? 0), 0);
}

export function getTalentPointsUnspent(level: number, ranks: TalentRanks): number {
  return Math.max(0, getTalentPointsEarned(level) - getTalentPointsSpent(ranks));
}

export function getTalentTierProgress(ranks: TalentRanks, tier: number): { spent: number; max: number } {
  const spent = TALENT_IDS
    .filter((id) => NODE_TIERS[id] === tier)
    .reduce((total, id) => total + (ranks[id] ?? 0), 0);
  return { spent, max: getTalentTierDef(tier).pointCap };
}

export function isTalentTierUnlocked(ranks: TalentRanks, tier: number): boolean {
  if (tier <= 0) return true;
  const def = getTalentTierDef(tier);
  return getTalentTierProgress(ranks, tier - 1).spent >= def.previousTierPointsRequired;
}

export function canLearnHeroSkill(level: number, ascendLevel: number): boolean {
  return level >= HERO_SKILL_UNLOCK_LEVEL && ascendLevel >= 1;
}

export function talentUpgradeBlocked(
  ranks: TalentRanks,
  talentId: TalentId,
  level: number,
  heroId: HeroId,
): string | null {
  const node = talentByIdForHero(heroId, talentId);
  const rank = ranks[talentId] ?? 0;
  if (rank >= node.maxRank) return "已满级";
  if (!isTalentTierUnlocked(ranks, node.tier)) {
    const def = getTalentTierDef(node.tier);
    const prevName = getTalentTierDef(node.tier - 1).name;
    return `需在「${prevName}」投入 ${def.previousTierPointsRequired} 点`;
  }
  const progress = getTalentTierProgress(ranks, node.tier);
  if (progress.spent >= progress.max) {
    return progress.max === 1 ? "本层只能选择 1 项，请先重置" : `本层最多投入 ${progress.max} 点`;
  }
  if (getTalentPointsUnspent(level, ranks) <= 0) return "天赋点不足";
  return null;
}

export function canUpgradeTalent(ranks: TalentRanks, talentId: TalentId, level: number, heroId: HeroId): boolean {
  return talentUpgradeBlocked(ranks, talentId, level, heroId) == null;
}

export function isTalentNodeUnlocked(ranks: TalentRanks, talentId: TalentId): boolean {
  return isTalentTierUnlocked(ranks, NODE_TIERS[talentId]);
}

export function upgradeTalent(ranks: TalentRanks, talentId: string, level: number, heroId: HeroId): TalentRanks | null {
  if (!isTalentId(talentId) || !canUpgradeTalent(ranks, talentId, level, heroId)) return null;
  return { ...ranks, [talentId]: (ranks[talentId] ?? 0) + 1 };
}

function addStatBonus(stat: TalentStat, value: number, school: "physical" | "magic", bonus: HeroBattleBonus): void {
  switch (stat) {
    case "attackPct": bonus.attackPct = (bonus.attackPct ?? 0) + value; break;
    case "critChance": bonus.critChance = (bonus.critChance ?? 0) + value; break;
    case "critDamagePct": bonus.critDamagePct = (bonus.critDamagePct ?? 0) + value; break;
    case "skillDamagePct": bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + value; break;
    case "schoolDamagePct":
      if (school === "magic") bonus.magicDamagePct = (bonus.magicDamagePct ?? 0) + value;
      else bonus.physicalDamagePct = (bonus.physicalDamagePct ?? 0) + value;
      break;
    case "primaryAttackPct": bonus.primaryAttackPct = (bonus.primaryAttackPct ?? 0) + value; break;
    case "eliteDamagePct": bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + value; break;
    case "maxHpPct": bonus.maxHpPct = (bonus.maxHpPct ?? 0) + value; break;
    case "defensePct": bonus.defensePct = (bonus.defensePct ?? 0) + value; break;
    case "damageReductionPct": bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + value; break;
    case "blockChance": bonus.blockChance = (bonus.blockChance ?? 0) + value; break;
    case "allResistPct": bonus.allResistPct = (bonus.allResistPct ?? 0) + value; break;
    case "hpRegenMaxHpPct": bonus.hpRegenMaxHpPct = (bonus.hpRegenMaxHpPct ?? 0) + value; break;
    case "attackSpeedPct": bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + value; break;
    case "rageGainPct": bonus.rageGainPct = (bonus.rageGainPct ?? 0) + value; break;
    case "lifeStealPct": bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + value; break;
    case "healPowerPct": bonus.healPowerPct = (bonus.healPowerPct ?? 0) + value; break;
  }
}

export function applyTalentBonus(ranks: TalentRanks, heroId: HeroId, bonus: HeroBattleBonus): void {
  const school = HERO_BY_ID[heroId].damageSchool;
  for (const node of talentsForHero(heroId)) {
    const rank = ranks[node.id] ?? 0;
    if (rank <= 0) continue;
    const effect = node.effect;
    if (effect.kind === "stat") addStatBonus(effect.stat, effect.perRank * rank, school, bonus);
    else if (effect.kind === "specialization") bonus.talentSpecialization = effect.choice;
    else if (effect.kind === "basicDamage") bonus.talentBasicDamagePct = effect.value;
    else if (effect.kind === "basicRage") bonus.talentBasicRage = effect.value;
    else if (effect.kind === "basicProc") {
      bonus.talentBasicProc = effect.proc;
      bonus.talentBasicProcInterval = effect.interval;
      bonus.talentBasicProcValue = effect.value;
      bonus.talentBasicProcDurationMs = effect.durationMs ?? 0;
    } else if (effect.kind === "activeDamage") bonus.talentActiveDamagePct = effect.value;
    else if (effect.kind === "activeHeal") bonus.talentActiveHealPct = effect.value;
    else {
      bonus.talentActiveProc = effect.proc;
      bonus.talentActiveProcValue = effect.value ?? 0;
      bonus.talentActiveProcDurationMs = effect.durationMs ?? 0;
    }
  }
}

function formatMagnitude(stat: TalentStat, magnitude: number): string {
  if (stat === "attackSpeedPct" || stat === "critDamagePct") {
    return `+${magnitude.toFixed(1).replace(/\.0$/, "")}%`;
  }
  const pct = magnitude * 100;
  return `+${(Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace(/\.0$/, ""))}%`;
}

const STAT_LABELS: Record<TalentStat, string> = {
  attackPct: "攻击", critChance: "暴击率", critDamagePct: "暴击伤害", skillDamagePct: "技能伤害",
  schoolDamagePct: "对应物理/法术伤害", primaryAttackPct: "普攻伤害", eliteDamagePct: "对精英与首领伤害",
  maxHpPct: "生命", defensePct: "防御", damageReductionPct: "伤害减免", blockChance: "格挡率",
  allResistPct: "全抗性", hpRegenMaxHpPct: "每秒回复最大生命", attackSpeedPct: "攻击速度",
  rageGainPct: "怒气获取", lifeStealPct: "生命偷取", healPowerPct: "治疗强度",
};

function describeNodeAtRank(node: TalentNode, rank: number): string {
  const clamped = Math.max(0, Math.min(node.maxRank, rank));
  if (clamped <= 0) return "尚未学习";
  if (node.effect.kind !== "stat") return node.blurb;
  return `${STAT_LABELS[node.effect.stat]} ${formatMagnitude(node.effect.stat, node.effect.perRank * clamped)}`;
}

export function describeTalentEffectAtRank(heroId: HeroId, talentId: TalentId, rank: number): string {
  return describeNodeAtRank(talentByIdForHero(heroId, talentId), rank);
}

export function describeTalentRank(heroId: HeroId, talentId: TalentId, rank: number): string {
  const node = talentByIdForHero(heroId, talentId);
  const clamped = Math.max(0, Math.min(node.maxRank, rank));
  return `Lv.${clamped}/${node.maxRank} · ${node.blurb}`;
}

export function getChosenSkill(skillId: HeroSkillId | null) {
  return skillId ? HERO_SKILL_BY_ID[skillId] : null;
}

export { TALENT_TIERS };
