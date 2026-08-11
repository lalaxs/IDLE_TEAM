import { SKILL_COOLDOWN_REDUCTION_CAP } from "../content/affixes";
import { ENEMY_BY_ID } from "../content/enemies";
import { HERO_SKILL_COMBAT } from "../content/balance";
import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import type { HeroId } from "./types";
import type { RandomSource } from "./RandomSource";
import { applyHealing, calculateDamage, resolveHit, schoolDamageMultiplier } from "./CombatSystem";
import { engageRange } from "./MovementSystem";
import { applyStatus, getStatusMagnitude } from "./StatusSystem";
import type { BattleEvent, UnitState } from "./types";

function hurt(
  source: UnitState,
  target: UnitState,
  multiplier: number,
  random: RandomSource,
  events: BattleEvent[],
): void {
  const execute =
    target.hp / target.maxHp < 0.35 ? Number(source.passiveFlags.gearExecute ?? 0) : 0;
  const skillDamage = Number(source.passiveFlags.gearSkillDamage ?? 0);
  const damagePct = Number(source.passiveFlags.gearDamagePct ?? 0);
  const enemyKind = ENEMY_BY_ID[target.sourceId as keyof typeof ENEMY_BY_ID]?.kind;
  const elite =
    enemyKind === "elite" || enemyKind === "boss"
      ? Number(source.passiveFlags.gearEliteDamage ?? 0)
      : 0;
  const critMultiplier = 1.5 + Number(source.passiveFlags.gearCritDamagePct ?? 0) / 100;
  const roll = calculateDamage(
    source.attack *
      multiplier *
      (1 + skillDamage + execute) *
      (1 + damagePct) *
      (1 + elite) *
      schoolDamageMultiplier(source),
    target.defense,
    source.critChance,
    random,
    getStatusMagnitude(target, "armorBreak"),
    critMultiplier,
  );
  const hit = resolveHit(target, roll.damage, random);
  if (hit.outcome === "dodged") return;
  events.push({
    type: "damage",
    sourceId: source.id,
    targetId: target.id,
    amount: hit.amount,
    critical: roll.critical && !hit.blocked,
  });
  if (source.team === "heroes" && source.alive) {
    const lifeSteal = Number(source.passiveFlags.gearLifeStealPct ?? 0);
    if (lifeSteal > 0) applyHealing(source, hit.amount * lifeSteal, false);
  }
  if (!target.alive) events.push({ type: "unit:died", unitId: target.id });
}

function enemiesOf(source: UnitState, units: UnitState[]): UnitState[] {
  return units.filter((unit) => unit.alive && unit.team !== source.team);
}

export function tryCastSkill(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): BattleEvent[] {
  if (!source.alive || source.skillCooldownMs > 0 || !source.sourceId.startsWith("H")) return [];
  const heroId = source.sourceId as HeroId;
  const definition = ACTIVE_SKILL_BY_HERO[heroId];
  const combat = HERO_SKILL_COMBAT[heroId];
  if (!definition || !combat) return [];
  const enemies = enemiesOf(source, units);
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  if (heroId !== "H04" && enemies.length === 0) return [];
  const events: BattleEvent[] = [
    { type: "skill:started", sourceId: source.id, skillId: definition.id },
  ];
  const targetIds: string[] = [];
  const nearest = [...enemies].sort(
    (a, b) => Math.abs(a.x - source.x) - Math.abs(b.x - source.x),
  );

  if (heroId === "H01") {
    const target = nearest[0]!;
    hurt(source, target, combat.hits[0]!.multiplier, random, events);
    applyStatus(target, {
      kind: "stun",
      magnitude: 1,
      remainingMs: combat.stunMs ?? 1200,
      sourceId: source.id,
    });
    events.push({ type: "status:applied", targetId: target.id, kind: "stun" });
    targetIds.push(target.id);
  } else if (heroId === "H02") {
    const target = nearest[0]!;
    for (const hit of combat.hits) {
      if (!target.alive) break;
      hurt(source, target, hit.multiplier, random, events);
    }
    targetIds.push(target.id);
  } else if (heroId === "H03") {
    const target = nearest[0]!;
    hurt(source, target, combat.hits[0]!.multiplier, random, events);
    targetIds.push(target.id);
    const radius = combat.splashRadius ?? 90;
    const splash = combat.splashMultiplier ?? 0.9;
    for (const other of enemies.filter(
      (unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= radius,
    )) {
      hurt(source, other, splash, random, events);
      targetIds.push(other.id);
    }
    source.passiveFlags.ember = true;
  } else if (heroId === "H04") {
    const target = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? source;
    const amount = Math.max(
      source.attack * (combat.healAttackMultiplier ?? 2.6),
      target.maxHp * (combat.healMaxHpRatio ?? 0.12),
    );
    const result = applyHealing(target, amount, true);
    events.push({ type: "heal", sourceId: source.id, targetId: target.id, amount: result.healed });
    targetIds.push(target.id);
  } else if (heroId === "H05") {
    const target = nearest[0]!;
    hurt(source, target, combat.hits[0]!.multiplier, random, events);
    targetIds.push(target.id);
    const behind = nearest.find((unit) => unit.id !== target.id);
    if (behind) {
      hurt(source, behind, combat.pierceMultiplier ?? 1, random, events);
      targetIds.push(behind.id);
    }
  } else if (heroId === "H06") {
    const target = [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]!;
    const threshold = combat.executeThreshold ?? 0.35;
    const multiplier =
      target.hp / target.maxHp < threshold
        ? (combat.executeMultiplier ?? 3.2)
        : combat.hits[0]!.multiplier;
    hurt(source, target, multiplier, random, events);
    source.x = Math.min(source.x, target.x - engageRange(source));
    targetIds.push(target.id);
  } else if (heroId === "H07") {
    const target = nearest[0]!;
    const radius = combat.aoeRadius ?? 90;
    for (const enemy of enemies.filter((unit) => Math.abs(unit.x - target.x) <= radius)) {
      hurt(source, enemy, combat.hits[0]!.multiplier, random, events);
      applyStatus(enemy, {
        kind: "slow",
        magnitude: combat.slowMagnitude ?? 0.4,
        remainingMs: combat.slowMs ?? 3000,
        sourceId: source.id,
      });
      events.push({ type: "status:applied", targetId: enemy.id, kind: "slow" });
      targetIds.push(enemy.id);
    }
  } else if (heroId === "H08") {
    const maxTargets = combat.chainMaxTargets ?? 3;
    const decay = combat.chainDecay ?? 0.75;
    const base = combat.hits[0]!.multiplier;
    for (const [index, target] of nearest.slice(0, maxTargets).entries()) {
      hurt(source, target, base * decay ** index, random, events);
      targetIds.push(target.id);
    }
    for (const ally of allies) {
      applyStatus(ally, {
        kind: "haste",
        magnitude: combat.hasteMagnitude ?? 0.1,
        remainingMs: combat.hasteMs ?? 3000,
        sourceId: source.id,
      });
    }
  }

  const stormward = Number(source.passiveFlags.gearStormward ?? 0);
  if (stormward > 0 && !source.passiveFlags.gearStormwardUsed) {
    source.shield += Math.round(source.maxHp * stormward);
    source.passiveFlags.gearStormwardUsed = true;
  }

  const cdr = Math.min(
    SKILL_COOLDOWN_REDUCTION_CAP,
    Number(source.passiveFlags.gearSkillCooldownPct ?? 0),
  );
  source.skillCooldownMs = Math.round(combat.cooldownMs * (1 - cdr));
  source.skillCastCount += 1;
  events.push({
    type: "skill:resolved",
    sourceId: source.id,
    skillId: definition.id,
    targetIds,
  });
  return events;
}
