import { HERO_BY_ID } from "../content/heroes";
import {
  HERO_SKILL_UNLOCK_LEVEL,
  TALENT_BY_ID,
  TALENT_IDS,
  TALENT_NODES,
  TALENT_POINT_INTERVAL,
  TALENT_TIERS,
  getTalentTierDef,
  isTalentId,
  talentsInTier,
  type TalentId,
  type TalentStat,
} from "../content/talents";
import { HERO_SKILL_BY_ID, isHeroSkillId, type HeroSkillId } from "../content/heroSkills";
import type { HeroBattleBonus } from "../simulation/BattleSimulation";
import type { HeroId } from "../simulation/types";

export type TalentRanks = Partial<Record<TalentId, number>>;

export function createEmptyTalentRanks(): TalentRanks {
  return {};
}

export function normalizeTalentRanks(raw: unknown): TalentRanks {
  const ranks: TalentRanks = {};
  if (!raw || typeof raw !== "object") return ranks;
  const source = raw as Record<string, unknown>;
  for (const id of TALENT_IDS) {
    const value = source[id];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const max = TALENT_BY_ID[id].maxRank;
    ranks[id] = Math.min(max, Math.max(0, Math.floor(value)));
  }
  return ranks;
}

export function normalizeChosenSkillId(raw: unknown): HeroSkillId | null {
  return typeof raw === "string" && isHeroSkillId(raw) ? raw : null;
}

export function getTalentPointsEarned(level: number): number {
  return Math.floor(Math.max(0, level) / TALENT_POINT_INTERVAL);
}

export function getTalentPointsSpent(ranks: TalentRanks): number {
  let spent = 0;
  for (const id of TALENT_IDS) spent += ranks[id] ?? 0;
  return spent;
}

export function getTalentPointsUnspent(level: number, ranks: TalentRanks): number {
  return Math.max(0, getTalentPointsEarned(level) - getTalentPointsSpent(ranks));
}

export function getTalentTierProgress(
  ranks: TalentRanks,
  tier: number,
): { spent: number; max: number } {
  let spent = 0;
  let max = 0;
  for (const node of talentsInTier(tier)) {
    spent += ranks[node.id] ?? 0;
    max += node.maxRank;
  }
  return { spent, max };
}

export function isTalentTierUnlocked(ranks: TalentRanks, tier: number): boolean {
  if (tier <= 0) return true;
  const def = getTalentTierDef(tier);
  const previous = getTalentTierProgress(ranks, tier - 1);
  return previous.spent >= def.previousTierPointsRequired;
}

export function canLearnHeroSkill(level: number): boolean {
  return level >= HERO_SKILL_UNLOCK_LEVEL;
}

export function talentUpgradeBlocked(ranks: TalentRanks, talentId: TalentId, level: number): string | null {
  const node = TALENT_BY_ID[talentId];
  const rank = ranks[talentId] ?? 0;
  if (rank >= node.maxRank) return "已满级";
  if (getTalentPointsUnspent(level, ranks) <= 0) return "天赋点不足";
  if (!isTalentTierUnlocked(ranks, node.tier)) {
    const def = getTalentTierDef(node.tier);
    const prevName = getTalentTierDef(node.tier - 1).name;
    return `需在「${prevName}」投入 ${def.previousTierPointsRequired} 点`;
  }
  return null;
}

export function canUpgradeTalent(ranks: TalentRanks, talentId: TalentId, level: number): boolean {
  return talentUpgradeBlocked(ranks, talentId, level) == null;
}

export function isTalentNodeUnlocked(ranks: TalentRanks, talentId: TalentId): boolean {
  return isTalentTierUnlocked(ranks, TALENT_BY_ID[talentId].tier);
}

export function upgradeTalent(ranks: TalentRanks, talentId: string, level: number): TalentRanks | null {
  if (!isTalentId(talentId)) return null;
  if (!canUpgradeTalent(ranks, talentId, level)) return null;
  return { ...ranks, [talentId]: (ranks[talentId] ?? 0) + 1 };
}

export function applyTalentBonus(ranks: TalentRanks, heroId: HeroId, bonus: HeroBattleBonus): void {
  const school = HERO_BY_ID[heroId].damageSchool;
  for (const node of TALENT_NODES) {
    const rank = ranks[node.id] ?? 0;
    if (rank <= 0) continue;
    const value = node.perRank * rank;
    switch (node.stat) {
      case "attackPct":
        bonus.attackPct = (bonus.attackPct ?? 0) + value;
        break;
      case "critChance":
        bonus.critChance = (bonus.critChance ?? 0) + value;
        break;
      case "skillDamagePct":
        bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + value;
        break;
      case "schoolDamagePct":
        if (school === "magic") bonus.magicDamagePct = (bonus.magicDamagePct ?? 0) + value;
        else bonus.physicalDamagePct = (bonus.physicalDamagePct ?? 0) + value;
        break;
      case "executeDamagePct":
        bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + value;
        break;
      case "damagePct":
        bonus.damagePct = (bonus.damagePct ?? 0) + value;
        break;
      case "maxHpPct":
        bonus.maxHpPct = (bonus.maxHpPct ?? 0) + value;
        break;
      case "defensePct":
        bonus.defensePct = (bonus.defensePct ?? 0) + value;
        break;
      case "damageReductionPct":
        bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + value;
        break;
      case "blockChance":
        bonus.blockChance = (bonus.blockChance ?? 0) + value;
        break;
      case "hpRegenMaxHpPct":
        bonus.hpRegenMaxHpPct = (bonus.hpRegenMaxHpPct ?? 0) + value;
        break;
      case "waveStartShieldPct":
        bonus.waveStartShieldPct = (bonus.waveStartShieldPct ?? 0) + value;
        break;
      case "attackSpeedPct":
        bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + value;
        break;
      case "skillCooldownPct":
        bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + value;
        break;
      case "lifeStealPct":
        bonus.lifeStealPct = (bonus.lifeStealPct ?? 0) + value;
        break;
      case "healPowerPct":
        bonus.healPowerPct = (bonus.healPowerPct ?? 0) + value;
        break;
      case "eliteDamagePct":
        bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + value;
        break;
      case "waveStartSkillCdrPct":
        bonus.waveStartSkillCdrPct = (bonus.waveStartSkillCdrPct ?? 0) + value;
        break;
    }
  }
}

function formatTalentMagnitude(stat: TalentStat, magnitude: number): string {
  if (stat === "attackSpeedPct") {
    const text = magnitude.toFixed(1).replace(/\.0$/, "");
    return `+${text}%`;
  }
  if (stat === "waveStartSkillCdrPct") {
    return magnitude >= 0.5 ? "技能剩余冷却减半" : `技能剩余冷却 -${Math.round(magnitude * 100)}%`;
  }
  const pct = magnitude * 100;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1).replace(/\.0$/, "");
  return `+${text}%`;
}

export function describeTalentEffectAtRank(talentId: TalentId, rank: number): string {
  const node = TALENT_BY_ID[talentId];
  const clamped = Math.max(0, Math.min(node.maxRank, rank));
  if (clamped <= 0) return "尚未学习";
  const value = formatTalentMagnitude(node.stat, node.perRank * clamped);
  if (node.stat === "waveStartSkillCdrPct") return value;
  if (node.stat === "waveStartShieldPct") return `每波开始获得 ${value.slice(1)} 最大生命护盾`;
  if (node.stat === "hpRegenMaxHpPct") return `每秒回复 ${value.slice(1)} 最大生命`;
  if (node.stat === "executeDamagePct") return `对低血目标伤害 ${value}`;
  if (node.stat === "schoolDamagePct") return `对应物理/法术伤害 ${value}`;
  if (node.stat === "eliteDamagePct") return `对精英与首领伤害 ${value}`;
  if (node.stat === "damagePct") return `全伤害 ${value}`;
  if (node.stat === "skillDamagePct") return `技能伤害 ${value}`;
  if (node.stat === "attackPct") return `攻击 ${value}`;
  if (node.stat === "critChance") return `暴击率 ${value}`;
  if (node.stat === "maxHpPct") return `生命 ${value}`;
  if (node.stat === "defensePct") return `防御 ${value}`;
  if (node.stat === "damageReductionPct") return `伤害减免 ${value}`;
  if (node.stat === "blockChance") return `格挡率 ${value}`;
  if (node.stat === "attackSpeedPct") return `攻击速度 ${value}`;
  if (node.stat === "skillCooldownPct") return `技能冷却缩减 ${value}`;
  if (node.stat === "lifeStealPct") return `生命偷取 ${value}`;
  if (node.stat === "healPowerPct") return `治疗强度 ${value}`;
  return value;
}

export function describeTalentRank(talentId: TalentId, rank: number): string {
  const node = TALENT_BY_ID[talentId];
  const clamped = Math.max(0, Math.min(node.maxRank, rank));
  return `Lv.${clamped}/${node.maxRank} · ${node.blurb}`;
}

export function getChosenSkill(skillId: HeroSkillId | null) {
  return skillId ? HERO_SKILL_BY_ID[skillId] : null;
}

export { TALENT_TIERS, talentsInTier };
