import { HERO_BY_ID } from "../content/heroes";
import type { HeroId, UnitState } from "../simulation/types";

/** A short state label; all values come from the simulation snapshot. */
export function specializationLabel(unit: UnitState): string {
  if (unit.team !== "heroes" || !unit.alive) return "";
  const flags = unit.passiveFlags;
  const count = (key: string) => Number(flags[key] ?? 0);
  switch (HERO_BY_ID[unit.sourceId as HeroId]?.specId) {
    case "death_knight_frost": return flags.specKillingMachine ? "杀戮就绪" : count("specFrostStrikes") ? `寒锋 ${count("specFrostStrikes")}/4` : "";
    case "demon_hunter_vengeance": return count("specFragments") ? `碎片 ${count("specFragments")}/5` : "";
    case "demon_hunter_devourer": return unit.specialization?.channel
      ? `引导 ${unit.specialization.channel.ticks}` : count("specSouls") ? `灵魂 ${count("specSouls")}/3` : "";
    case "druid_balance": return flags.specBalanceMoon ? "月相" : "日相";
    case "evoker_devastation": return flags.specDragonQuick ? "疾速龙息" : "";
    case "hunter_beast_mastery": return count("specBeastFrenzyMs") > 0 ? "兽王之怒" : "掠食本能";
    case "hunter_marksmanship": return count("specAimStacks") ? `瞄准 ${count("specAimStacks")}/4` : "";
    case "hunter_survival": return flags.specTrapReady ? "伏击就绪" : unit.specialization?.trap ? count("talentSpecialization") === 1 ? "钉刺蓄势" : "拦截陷阱" : "";
    case "mage_arcane": return count("specArcaneSurgeMs") > 0 ? `涌流 ${Math.ceil(count("specArcaneSurgeMs") / 1000)}秒` : count("specArcaneCharges") ? `奥能 ${count("specArcaneCharges")}/4` : "";
    case "mage_fire": return flags.specHotStreak ? count("talentSpecialization") === 1
      ? `炎爆 ${flags.specHotStreakReserve ? 2 : 1}/2` : "炽热就绪" : "";
    case "mage_frost": return flags.specShatterTarget ? "碎冰就绪" : count("specChillStacks") ? `寒意 ${count("specChillStacks")}/2` : "";
    case "monk_brewmaster": return count("specStaggerPool") > 0 ? `醉拳 ${Math.ceil(count("specStaggerPool"))}` : "";
    case "monk_mistweaver": return count("specMistWindowMs") > 0 ? `织雾 ${Math.ceil(count("specMistWindowMs") / 1000)}秒` : "";
    case "monk_windwalker": return count("specComboStep") > 0 ? `连招 ${count("specComboStep")}/3` : flags.specComboQuick ? "升龙就绪" : "";
    case "priest_shadow": return count("specVoidFormMs") > 0 ? "虚空形态" : count("specVoid") ? `虚空 ${count("specVoid")}/4` : "";
    case "rogue_outlaw": return flags.specOpportunity === "focus" ? "集中射击" : flags.specOpportunity === "ricochet" ? "弹射就绪" : "";
    case "rogue_subtlety": return count("specShadowRemainingMs") > 0 ? "暗影之舞" : flags.specShadowStrike ? "伏击就绪" : "";
    case "shaman_enhancement": return flags.specMaelstromReady ? "风暴就绪" : flags.specEnhanceFire ? "火焰附魔" : "风怒附魔";
    case "warlock_demonology": return unit.specialization?.demons.length ? `小恶魔 ×${unit.specialization.demons.length}` : "";
    case "warlock_destruction": return count("specEmbers") ? `余烬 ${count("specEmbers")}/2` : "";
    case "warrior_arms": return flags.specOverpower ? "压制就绪" : "";
    case "warrior_fury": return count("specFuryRemainingMs") > 0 ? "暴怒" : "";
    case "warrior_protection": return flags.specRevenge ? "复仇就绪" : "";
    default: return "";
  }
}

export function channelProgress(unit: UnitState): number | null {
  const channel = unit.specialization?.channel;
  if (!unit.alive || !channel) return null;
  return Math.max(0, Math.min(1, ((channel.ticks - 1) * 500 + channel.untilTickMs) / (channel.totalTicks * 500)));
}
