import { AFFIX_BY_ID, affixDisplaysPercent } from "../../content/affixes";
import { TRAIT_BY_ID } from "../../content/items";
import { MATERIAL_BY_ID, formatGemBonus, type MaterialId } from "../../content/materials";
import { SET_BY_ID, type SetBonusTier } from "../../content/sets";
import { getEquipmentSetId, type InventoryItem } from "../../progression/EquipmentSystem";

export interface ItemAttributeEntry {
  kind: "base" | "affix";
  label: string;
  value: string;
  greater?: boolean;
}

export interface ItemEffectEntry {
  kind: "legendary" | "set" | "socket";
  label: string;
  title: string;
  description?: string;
}

export function itemAttributeEntries(item: InventoryItem): ItemAttributeEntry[] {
  const base = [
    item.stats.attack ? { label: "攻击", value: `+${item.stats.attack}` } : null,
    item.stats.maxHp ? { label: "生命", value: `+${item.stats.maxHp}` } : null,
    item.stats.defense ? { label: "防御", value: `+${item.stats.defense}` } : null,
    item.stats.attackSpeedPct ? { label: "攻速", value: `+${item.stats.attackSpeedPct}%` } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);
  const affixes = (item.affixes ?? []).flatMap((roll) => {
    const definition = AFFIX_BY_ID[roll.affixId];
    if (!definition) return [];
    return [{
      kind: "affix" as const,
      label: `${roll.smelted ? "熔炼·" : ""}${roll.greater ? "★" : ""}${definition.name}`,
      value: `+${roll.value}${affixDisplaysPercent(definition.kind) ? "%" : ""}`,
      greater: roll.greater === true,
    }];
  });
  return [
    ...base.map((entry) => ({ kind: "base" as const, ...entry })),
    ...affixes,
  ];
}

function gemBonusText(gemId: string, display: "named" | "bonus" = "named"): string {
  const gem = MATERIAL_BY_ID[gemId as MaterialId];
  if (!gem) return "未知宝石";
  const bonus = formatGemBonus(gem.gemBonus);
  if (display === "bonus" && bonus) return bonus;
  return bonus ? `${gem.name} · ${bonus}` : gem.name;
}

export function itemEffectEntries(
  item: InventoryItem,
  gemDisplay: "named" | "bonus" = "named",
): ItemEffectEntry[] {
  const entries: ItemEffectEntry[] = [];
  const trait = item.traitId ? TRAIT_BY_ID[item.traitId] : null;
  if (trait) {
    entries.push({
      kind: "legendary",
      label: "传奇",
      title: trait.name,
      description: trait.description,
    });
  }
  const setId = getEquipmentSetId(item);
  const set = setId ? SET_BY_ID[setId] : null;
  if (set) {
    entries.push({
      kind: "set",
      label: "套装",
      title: set.name,
      description: set.bonuses.map((bonus) => `${bonus.pieces}件：${setBonusText(bonus)}`).join("；"),
    });
  }
  for (const socket of item.sockets ?? []) {
    entries.push({
      kind: "socket",
      label: "宝石",
      title: socket.gemId ? gemBonusText(socket.gemId, gemDisplay) : "空孔",
    });
  }
  return entries;
}

export function setBonusText(bonus: SetBonusTier): string {
  return [
    bonus.lifePct ? `生命 +${bonus.lifePct}%` : "",
    bonus.defensePct ? `防御 +${bonus.defensePct}%` : "",
    bonus.damagePct ? `全伤害 +${bonus.damagePct}%` : "",
    bonus.primaryAttackPct ? `普攻伤害 +${bonus.primaryAttackPct}%` : "",
    bonus.skillDamagePct ? `技能伤害 +${bonus.skillDamagePct}%` : "",
    bonus.physicalDamagePct ? `物理伤害 +${bonus.physicalDamagePct}%` : "",
    bonus.magicDamagePct ? `法术伤害 +${bonus.magicDamagePct}%` : "",
    bonus.fireDamagePct ? `火焰伤害 +${bonus.fireDamagePct}%` : "",
    bonus.lightningDamagePct ? `雷电伤害 +${bonus.lightningDamagePct}%` : "",
    bonus.darkDamagePct ? `暗黑伤害 +${bonus.darkDamagePct}%` : "",
    bonus.damageReductionPct ? `伤害减免 +${bonus.damageReductionPct}%` : "",
    bonus.attackSpeedPct ? `攻速 +${bonus.attackSpeedPct}%` : "",
    bonus.castSpeedPct ? `施法速度 +${bonus.castSpeedPct}%` : "",
    bonus.rageGainPct ? `怒气获取 +${bonus.rageGainPct}%` : "",
    bonus.critChancePct ? `暴击率 +${bonus.critChancePct}%` : "",
    bonus.critDamagePct ? `暴击伤害 +${bonus.critDamagePct}%` : "",
    bonus.eliteDamagePct ? `精英伤害 +${bonus.eliteDamagePct}%` : "",
    bonus.executeDamagePct ? `斩杀伤害 +${bonus.executeDamagePct}%` : "",
    bonus.healPowerPct ? `治疗效果 +${bonus.healPowerPct}%` : "",
    bonus.lifeStealPct ? `生命偷取 +${bonus.lifeStealPct}%` : "",
    bonus.blockChancePct ? `格挡 +${bonus.blockChancePct}%` : "",
    bonus.allResistPct ? `全元素抗性 +${bonus.allResistPct}%` : "",
    bonus.thornsPct ? `反伤 +${bonus.thornsPct}%` : "",
    bonus.waveStartShieldPct ? `每波护盾 +${bonus.waveStartShieldPct}%生命` : "",
  ].filter(Boolean).join(" · ");
}
