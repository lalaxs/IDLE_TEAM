import { SKILL_COOLDOWN_REDUCTION_CAP } from "../content/affixes";
import { ENEMY_BY_ID } from "../content/enemies";
import { HERO_SKILL_COMBAT } from "../content/balance";
import { HERO_BY_ID } from "../content/heroes";
import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import { HERO_SKILL_BY_ID, type HeroSkillId } from "../content/heroSkills";
import type { HeroId } from "./types";
import type { RandomSource } from "./RandomSource";
import { applyHealing, calculateDamage, outgoingElementMultiplier, resolveHit, schoolDamageMultiplier, elementDamageMultiplier } from "./CombatSystem";
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
  const huntAmp =
    target.hp / target.maxHp < 0.35 ? Number(source.passiveFlags.kitHuntAmp ?? 0) : 0;
  const slowAmp =
    getStatusMagnitude(target, "slow") > 0 ? Number(source.passiveFlags.kitSlowAmp ?? 0) : 0;
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
      (1 + skillDamage + execute + huntAmp + slowAmp) *
      (1 + damagePct) *
      (1 + elite) *
      schoolDamageMultiplier(source) *
      elementDamageMultiplier(source) *
      outgoingElementMultiplier(source),
    target.defense,
    source.critChance,
    random,
    getStatusMagnitude(target, "armorBreak"),
    critMultiplier,
  );
  const hit = resolveHit(target, roll.damage, random, source.damageElement);
  if (hit.outcome === "dodged") return;
  events.push({
    type: "damage",
    sourceId: source.id,
    targetId: target.id,
    amount: hit.amount,
    critical: roll.critical && !hit.blocked,
    element: source.damageElement,
  });
  if (source.team === "heroes" && source.alive) {
    const lifeSteal = Number(source.passiveFlags.gearLifeStealPct ?? 0);
    if (lifeSteal > 0) applyHealing(source, hit.amount * lifeSteal, false);
    const bloodSteal = Number(source.passiveFlags.kitBloodStealPct ?? 0);
    const bloodLine = Number(source.passiveFlags.kitBloodLine ?? 0.45);
    if (bloodSteal > 0 && source.hp / source.maxHp < bloodLine) {
      applyHealing(source, hit.amount * bloodSteal, false);
    }
  }
  if (!target.alive) events.push({ type: "unit:died", unitId: target.id });
  if (!target.alive && Number(source.passiveFlags.kitHuntKillHaste ?? 0) > 0 && source.alive) {
    applyStatus(source, {
      kind: "haste",
      magnitude: 0.2,
      remainingMs: 3000,
      sourceId: source.id,
    });
  }
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
  const pattern = HERO_BY_ID[heroId]?.skillPattern ?? heroId;
  const definition = ACTIVE_SKILL_BY_HERO[heroId];
  const combat = HERO_SKILL_COMBAT[heroId];
  if (!definition || !combat) return [];
  const enemies = enemiesOf(source, units);
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  if (pattern !== "H04" && enemies.length === 0) return [];
  const events: BattleEvent[] = [
    { type: "skill:started", sourceId: source.id, skillId: definition.id },
  ];
  const targetIds: string[] = [];
  const nearest = [...enemies].sort(
    (a, b) => Math.abs(a.x - source.x) - Math.abs(b.x - source.x),
  );

  if (pattern === "H01") {
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
  } else if (pattern === "H02") {
    const target = nearest[0]!;
    for (const hit of combat.hits) {
      if (!target.alive) break;
      hurt(source, target, hit.multiplier, random, events);
    }
    targetIds.push(target.id);
  } else if (pattern === "H03") {
    const target = nearest[0]!;
    hurt(source, target, combat.hits[0]!.multiplier, random, events);
    targetIds.push(target.id);
    const radius = (combat.splashRadius ?? 90) + Number(source.passiveFlags.kitSplashBonus ?? 0);
    const splash = combat.splashMultiplier ?? 0.9;
    for (const other of enemies.filter(
      (unit) => unit.id !== target.id && Math.abs(unit.x - target.x) <= radius,
    )) {
      hurt(source, other, splash, random, events);
      targetIds.push(other.id);
    }
    source.passiveFlags.ember = true;
    const emberMax = Math.max(1, Number(source.passiveFlags.kitEmberMax ?? 1));
    source.passiveFlags.emberStacks = Math.min(
      emberMax,
      Number(source.passiveFlags.emberStacks ?? 0) + 1,
    );
  } else if (pattern === "H04") {
    const target = [...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? source;
    const healPower = 1 + Number(source.passiveFlags.gearHealPowerPct ?? 0);
    const shieldCap = Number(source.passiveFlags.kitHealShieldCap ?? 0.1);
    const amount =
      Math.max(
        source.attack * (combat.healAttackMultiplier ?? 2.6),
        target.maxHp * (combat.healMaxHpRatio ?? 0.12),
      ) * healPower;
    const result = applyHealing(target, amount, true, shieldCap);
    events.push({ type: "heal", sourceId: source.id, targetId: target.id, amount: result.healed });
    targetIds.push(target.id);
  } else if (pattern === "H05") {
    const target = nearest[0]!;
    hurt(source, target, combat.hits[0]!.multiplier, random, events);
    targetIds.push(target.id);
    const behind = nearest.find((unit) => unit.id !== target.id);
    if (behind) {
      hurt(source, behind, combat.pierceMultiplier ?? 1, random, events);
      targetIds.push(behind.id);
    }
    const extra = Number(source.passiveFlags.kitPierceExtra ?? 0);
    if (extra > 0) {
      const third = nearest.find((unit) => unit.id !== target.id && unit.id !== behind?.id);
      if (third) {
        hurt(source, third, (combat.pierceMultiplier ?? 1) * 0.75, random, events);
        targetIds.push(third.id);
      }
    }
  } else if (pattern === "H06") {
    const target = [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]!;
    const threshold = combat.executeThreshold ?? 0.35;
    const multiplier =
      target.hp / target.maxHp < threshold
        ? (combat.executeMultiplier ?? 3.2)
        : combat.hits[0]!.multiplier;
    hurt(source, target, multiplier, random, events);
    source.x = Math.min(source.x, target.x - engageRange(source));
    targetIds.push(target.id);
  } else if (pattern === "H07") {
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
      if (Number(source.passiveFlags.kitFrostStun ?? 0) > 0 && random.next() < 0.12) {
        applyStatus(enemy, {
          kind: "stun",
          magnitude: 1,
          remainingMs: 600,
          sourceId: source.id,
        });
        events.push({ type: "status:applied", targetId: enemy.id, kind: "stun" });
      }
      targetIds.push(enemy.id);
    }
  } else if (pattern === "H08") {
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

function skillCdr(source: UnitState): number {
  return Math.min(
    SKILL_COOLDOWN_REDUCTION_CAP,
    Number(source.passiveFlags.gearSkillCooldownPct ?? 0),
  );
}

export function tryCastUltimate(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): BattleEvent[] {
  if (!source.alive || source.ultimateCooldownMs > 0 || !source.sourceId.startsWith("H")) return [];
  if (!Number(source.passiveFlags.kitUltimate)) return [];
  const skillId = source.chosenSkillId;
  if (!skillId || !(skillId in HERO_SKILL_BY_ID)) return [];
  const definition = HERO_SKILL_BY_ID[skillId as HeroSkillId];
  const combat = definition.combat;
  const enemies = enemiesOf(source, units);
  const allies = units.filter((unit) => unit.alive && unit.team === source.team);
  const needsEnemy = skillId !== "sanctuary" && skillId !== "iron-wall";
  if (needsEnemy && enemies.length === 0) return [];
  const events: BattleEvent[] = [
    { type: "skill:started", sourceId: source.id, skillId: definition.id },
  ];
  const targetIds: string[] = [];
  const nearest = [...enemies].sort(
    (a, b) => Math.abs(a.x - source.x) - Math.abs(b.x - source.x),
  );

  if (skillId === "iron-wall") {
    const target = nearest[0];
    if (target) {
      hurt(source, target, combat.hits[0]!.multiplier, random, events);
      targetIds.push(target.id);
    }
    const shield = Math.round(source.maxHp * (combat.selfShieldMaxHpRatio ?? 0.18));
    source.shield += shield;
    for (const ally of allies) {
      applyStatus(ally, {
        kind: "damageReduction",
        magnitude: combat.teamDamageReduction ?? 0.12,
        remainingMs: combat.teamDamageReductionMs ?? 4000,
        sourceId: source.id,
      });
    }
  } else if (skillId === "quake-slash") {
    const radius = combat.aoeRadius ?? 90;
    const nearby = enemies.filter((unit) => Math.abs(unit.x - source.x) <= radius);
    const victims = nearby.length ? nearby : nearest.slice(0, 1);
    for (const hit of combat.hits) {
      for (const enemy of victims) {
        if (!enemy.alive) continue;
        hurt(source, enemy, hit.multiplier, random, events);
        if (!targetIds.includes(enemy.id)) targetIds.push(enemy.id);
      }
    }
  } else if (skillId === "meteor") {
    const target = nearest[0]!;
    const radius = combat.aoeRadius ?? 140;
    for (const enemy of enemies.filter((unit) => Math.abs(unit.x - target.x) <= radius)) {
      hurt(source, enemy, combat.hits[0]!.multiplier, random, events);
      targetIds.push(enemy.id);
    }
  } else if (skillId === "sanctuary") {
    const healPower = 1 + Number(source.passiveFlags.gearHealPowerPct ?? 0);
    const shieldCap = Number(source.passiveFlags.kitHealShieldCap ?? 0.1);
    for (const ally of allies) {
      const amount =
        Math.max(
          source.attack * (combat.healAttackMultiplier ?? 2.2),
          ally.maxHp * (combat.healMaxHpRatio ?? 0.1),
        ) * healPower;
      const result = applyHealing(ally, amount, true, shieldCap);
      events.push({ type: "heal", sourceId: source.id, targetId: ally.id, amount: result.healed });
      targetIds.push(ally.id);
    }
  } else if (skillId === "volley") {
    const maxTargets = combat.chainMaxTargets ?? 4;
    for (const enemy of nearest.slice(0, maxTargets)) {
      hurt(source, enemy, combat.hits[0]!.multiplier, random, events);
      targetIds.push(enemy.id);
    }
  } else if (skillId === "execute-flurry") {
    const target = [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]!;
    for (const hit of combat.hits) {
      if (!target.alive) break;
      hurt(source, target, hit.multiplier, random, events);
    }
    source.x = Math.min(source.x, target.x - engageRange(source));
    targetIds.push(target.id);
  } else if (skillId === "blizzard") {
    const target = nearest[0]!;
    const radius = combat.aoeRadius ?? 130;
    for (const enemy of enemies.filter((unit) => Math.abs(unit.x - target.x) <= radius)) {
      hurt(source, enemy, combat.hits[0]!.multiplier, random, events);
      applyStatus(enemy, {
        kind: "slow",
        magnitude: combat.slowMagnitude ?? 0.45,
        remainingMs: combat.slowMs ?? 4000,
        sourceId: source.id,
      });
      events.push({ type: "status:applied", targetId: enemy.id, kind: "slow" });
      targetIds.push(enemy.id);
    }
  } else if (skillId === "storm-chain") {
    const maxTargets = combat.chainMaxTargets ?? 5;
    const decay = combat.chainDecay ?? 0.78;
    const base = combat.hits[0]!.multiplier;
    const chained = nearest.slice(0, maxTargets);
    for (const [index, target] of chained.entries()) {
      hurt(source, target, base * decay ** index, random, events);
      targetIds.push(target.id);
    }
    const last = chained[chained.length - 1];
    if (last && (combat.stunMs ?? 0) > 0) {
      applyStatus(last, {
        kind: "stun",
        magnitude: 1,
        remainingMs: combat.stunMs ?? 600,
        sourceId: source.id,
      });
      events.push({ type: "status:applied", targetId: last.id, kind: "stun" });
    }
  }

  const stormward = Number(source.passiveFlags.gearStormward ?? 0);
  if (stormward > 0 && !source.passiveFlags.gearStormwardUsed) {
    source.shield += Math.round(source.maxHp * stormward);
    source.passiveFlags.gearStormwardUsed = true;
  }

  source.ultimateCooldownMs = Math.round(combat.cooldownMs * (1 - skillCdr(source)));
  source.skillCastCount += 1;
  events.push({
    type: "skill:resolved",
    sourceId: source.id,
    skillId: definition.id,
    targetIds,
  });
  return events;
}

export function tryCastReadySkill(
  source: UnitState,
  units: UnitState[],
  random: RandomSource,
): BattleEvent[] {
  if (Number(source.passiveFlags.kitUltimate) && source.ultimateCooldownMs <= 0) {
    const ultimate = tryCastUltimate(source, units, random);
    if (ultimate.some((event) => event.type === "skill:resolved")) return ultimate;
  }
  if (source.skillCooldownMs <= 0) return tryCastSkill(source, units, random);
  return [];
}
