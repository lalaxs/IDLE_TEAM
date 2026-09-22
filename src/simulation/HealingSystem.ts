import { HERO_BY_ID } from "../content/heroes";
import { applyHealing } from "./CombatSystem";
import { specializationTalent } from "./SpecializationState";
import type { BattleEvent, CombatAttribution, HeroId, UnitState } from "./types";

export function healingMultiplier(source: UnitState, active = true): number {
  return (1 + Number(source.passiveFlags.gearHealPowerPct ?? 0))
    * (1 + Number(source.passiveFlags.heroSkillEffect ?? 0))
    * (active ? 1 + Number(source.passiveFlags.talentActiveHealPct ?? 0) : 1);
}

export function ensureBeacon(source: UnitState, units: readonly UnitState[]): UnitState | undefined {
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  const existing = allies.find((unit) => unit.id === source.passiveFlags.specBeaconTarget);
  if (existing) return existing;
  const tanks = allies.filter((unit) => HERO_BY_ID[unit.sourceId as HeroId]?.expeditionRole === "tank");
  const selected = tanks.sort((a, b) => b.x - a.x)[0]
    ?? allies.sort((a, b) => b.maxHp - a.maxHp)[0];
  source.passiveFlags.specBeaconTarget = selected?.id ?? "";
  return selected;
}

/** Amount already includes the originating effect's healing bonuses. Copies resolve once. */
export function healCombatTarget(
  source: UnitState,
  target: UnitState,
  amount: number,
  units: readonly UnitState[],
  events: BattleEvent[],
  options: { attribution?: CombatAttribution; overflowShield?: number; periodicId?: string } = {},
): number {
  if (!target.alive) return 0;
  const result = applyHealing(target, amount, Boolean(options.overflowShield), options.overflowShield);
  events.push({ type: "heal", sourceId: source.id, targetId: target.id, amount: result.healed,
    ...(options.attribution ? { attribution: options.attribution } : {}) });
  const spec = HERO_BY_ID[source.sourceId as HeroId]?.specId;
  const transfer = (recipient: UnitState | undefined, value: number) => {
    if (!recipient?.alive || value <= 0) return;
    const healed = applyHealing(recipient, value, false).healed;
    if (healed > 0) events.push({ type: "heal", sourceId: source.id, targetId: recipient.id, amount: healed,
      attribution: { kind: "passive", id: `${spec}-passive` } });
  };
  if (spec === "paladin_holy") {
    const beacon = ensureBeacon(source, units);
    const ratio = specializationTalent(source, 1) ? 0.5 : specializationTalent(source, 2) ? 0.25 : 0.35;
    if (beacon?.id !== target.id) transfer(beacon, result.healed * ratio);
    if (specializationTalent(source, 2)) {
      const second = units.filter((unit) => unit.alive && unit.team === source.team
        && unit.id !== beacon?.id && unit.id !== target.id)
        .sort((a, b) => b.maxHp - a.maxHp)[0];
      transfer(second, result.healed * 0.2);
    }
    if (specializationTalent(source, 3) && beacon && beacon.hp / beacon.maxHp < 0.4
      && Number(source.passiveFlags.specBeaconGuardMs ?? 0) <= 0) {
      beacon.shield += Math.round(beacon.maxHp * 0.1);
      source.passiveFlags.specBeaconGuardMs = 8000;
    }
  }
  if (spec === "druid_restoration" && options.periodicId === "restoration-hot") {
    const overflow = Math.max(0, Math.round(amount) - result.healed);
    const wounded = units.filter((unit) => unit.alive && unit.team === source.team && unit.id !== target.id && unit.hp < unit.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    transfer(wounded, overflow * (specializationTalent(source, 3) ? 0.8 : 0.5));
  }
  return result.healed;
}
