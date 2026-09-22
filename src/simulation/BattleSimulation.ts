import { ENEMY_BY_ID, resolveEnemyDamageElement } from "../content/enemies";
import { HERO_BY_ID } from "../content/heroes";
import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import { STAGE_DEFINITIONS } from "../content/stages";
import { HERO_MAX_RAGE } from "../content/rage";
import { DODGE_CHANCE_CAP, BLOCK_CHANCE_CAP } from "../content/affixes";
import {
  DIFFICULTY_BY_ID,
  difficultyPowerStage,
  type GameDifficulty,
} from "../content/difficulties";
import { enemyAtkMultiplier, enemyDefMultiplier, enemyHpMultiplier } from "../content/balance";
import { applyHealing, damageEvents, gearDamageMultiplier, outgoingElementMultiplier, resolveDamage } from "./CombatSystem";
import {
  advanceMovement,
  engageRange,
  ENEMY_ENTRY_STAGGER_MS,
  enemyEntryStartX,
  formationLane,
  HERO_ENTRY_SPEED,
  HERO_ENTRY_STAGGER_MS,
  heroEntryStartX,
  heroFormationOffset,
  laneOffsetY,
  movementStep,
} from "./MovementSystem";
import { SeededRandom } from "./RandomSource";
import { hasEnemyInCastRange, tryCastReadySkill } from "./SkillSystem";
import { afterTalentBasicAttack } from "./TalentCombatSystem";
import {
  advanceSkillPreparation,
  cancelSkillPreparation,
  clampCastSpeedPct,
  gainRageFromBasicAttack,
  grantRage,
} from "./RageSystem";
import { addPeriodicEffect, tickPeriodicEffects } from "./PeriodicEffectSystem";
import {
  afterSpecializationBasicAttack,
  onPeriodicEffectEvents,
  specializationBasicAttackModifiers,
  selectSpecializationTarget,
  shouldCastSpecialization,
  specializationCastTime,
  specializationReactions,
  tickSpecializationPassives,
} from "./SpecializationSkillSystem";
import {
  afterSharedHeroPassiveBasicAttack,
  afterSharedHeroPassiveDamage,
  tickSharedHeroPassive,
} from "./SharedHeroPassiveSystem";
import { HERO_SKILL_BY_ID } from "../content/heroSkills";
import { advanceStatuses, applyStatus, getStatusMagnitude, isStunned } from "./StatusSystem";
import { resolveThorns } from "./ThornsSystem";
import { isTankUnit, resolveMeleeFrontTarget, selectTarget } from "./TargetingSystem";
import { createEnemyUnits, trashQuotaForStage } from "./WaveSystem";
import {
  advanceEnemyBehavior,
  activeEnemyAbilityFor,
  applyDifficultySignatureMechanic,
  applyEnemyStatusOnly,
  afterEnemyBasicHit,
  completeEnemyActive,
  enemyBasicAttackMultiplier,
  enemyDeathBurst,
  initialEnemySkillTrigger,
  selectEnemyBasicTarget,
} from "./EnemyBehaviorSystem";
import type { BattleEvent, BattleSnapshot, HeroId, UnitState } from "./types";

export interface BattleSimulationOptions {
  stage: number;
  difficulty?: GameDifficulty;
  party: readonly (HeroId | null)[];
  heroStats: Partial<Record<HeroId, HeroCombatStats>>;
  heroBonuses?: Partial<Record<HeroId, HeroBattleBonus>>;
  heroStartX?: Partial<Record<HeroId, number>>;
  startWithTravel?: boolean;
  seed: number;
  /** Extra boss-meter fill rate (0.01 = +1%). */
  bossProgressBonus?: number;
}

export interface HeroCombatStats {
  maxHp: number;
  attack: number;
  defense: number;
}

export interface HeroBattleBonus {
  maxHp?: number;
  maxHpPct?: number;
  attack?: number;
  defense?: number;
  /** Multiplier on final defense (TBH Armor %). */
  defensePct?: number;
  attackSpeedPct?: number;
  castSpeedPct?: number;
  critChance?: number;
  /** Extra crit damage percent points on top of base 150%. */
  critDamagePct?: number;
  /** All damage multiplier. */
  damagePct?: number;
  /** Basic-attack-only multiplier. */
  primaryAttackPct?: number;
  /** Extra damage vs elite/boss. */
  eliteDamagePct?: number;
  /** Incoming damage reduction. */
  damageReductionPct?: number;
  /** Flat heal on basic-attack hit. */
  lifeOnHit?: number;
  /** Fraction of damage dealt healed (TBH HP Leech). */
  lifeStealPct?: number;
  /** Flat heal per second in combat (TBH HP Regen Per Sec). */
  hpRegenPerSec?: number;
  /** Incoming dodge chance (fraction). */
  dodgeChance?: number;
  /** Incoming block chance (fraction); blocked hits deal 50%. */
  blockChance?: number;
  /** Move speed percent points. */
  moveSpeedPct?: number;
  /** Extra damage when hero damageSchool is physical. */
  physicalDamagePct?: number;
  /** Extra damage when hero damageSchool is magic (spell). */
  magicDamagePct?: number;
  /** Extra outgoing fire-element damage (fraction). */
  fireDamagePct?: number;
  /** Extra outgoing frost-element damage (fraction). */
  frostDamagePct?: number;
  /** Extra outgoing lightning-element damage (fraction). */
  lightningDamagePct?: number;
  /** Extra outgoing dark-element damage (fraction). */
  darkDamagePct?: number;
  /** Incoming physical resist (fraction). */
  physicalResistPct?: number;
  /** Incoming fire resist (fraction). */
  fireResistPct?: number;
  /** Incoming frost resist (fraction). */
  frostResistPct?: number;
  /** Incoming lightning resist (fraction). */
  lightningResistPct?: number;
  /** Incoming dark resist (fraction). */
  darkResistPct?: number;
  /** Incoming holy resist (fraction). */
  holyResistPct?: number;
  /** Incoming resist added to every element (fraction). */
  allResistPct?: number;
  /** Multiplier on outgoing heal amounts (skills / potions). */
  healPowerPct?: number;
  rageGainPct?: number;
  skillDamagePct?: number;
  /** Star-rank multiplier for damage, healing, shields, and positive buff magnitudes. */
  skillEffectPct?: number;
  executeDamagePct?: number;
  attackPct?: number;
  hpRegenMaxHpPct?: number;
  waveStartShieldPct?: number;
  waveStartRage?: number;
  chosenSkillId?: string;
  augmentationTargetId?: HeroId | null;
  awakeningUnlocked?: boolean;
  guardianShieldPct?: number;
  thornsPct?: number;
  renewalPct?: number;
  frostbiteChance?: number;
  snowguardShieldPct?: number;
  frostfocusInitialRage?: number;
  sandscarChance?: number;
  mirageGuardPct?: number;
  tailwindPct?: number;
  thunderbrandPct?: number;
  cloudveilShieldPct?: number;
  stormwardShieldPct?: number;
  talentBasicDamagePct?: number;
  talentBasicRage?: number;
  talentBasicProc?: string;
  talentBasicProcInterval?: number;
  talentBasicProcValue?: number;
  talentBasicProcDurationMs?: number;
  talentActiveDamagePct?: number;
  talentActiveHealPct?: number;
  talentActiveProc?: string;
  talentActiveProcValue?: number;
  talentActiveProcDurationMs?: number;
  talentSpecialization?: number;
}

export function createEnemySummonUnit(
  event: Extract<BattleEvent, { type: "enemy:summoned" }>,
  parent: UnitState,
  stage: number,
  enemyCount: number,
  difficulty: GameDifficulty = "easy",
): UnitState | null {
  const definition = ENEMY_BY_ID[event.sourceEnemyId];
  if (!definition) return null;
  const id = `${parent.id}:${event.summonId}`;
  const difficultyDefinition = DIFFICULTY_BY_ID[difficulty];
  const powerStage = difficultyPowerStage(stage, difficulty);
  const maxHp = Math.max(1, Math.round(
    definition.maxHp * enemyHpMultiplier(powerStage) * difficultyDefinition.enemyHpMultiplier * event.hpRatio,
  ));
  return {
    id,
    team: "enemies",
    sourceId: event.sourceEnemyId,
    name: definition.name,
    x: parent.x + 46,
    y: laneOffsetY(id, enemyCount, "enemies"),
    hp: maxHp,
    maxHp,
    rage: 0,
    maxRage: 0,
    attack: Math.max(1, Math.round(
      definition.attack * enemyAtkMultiplier(powerStage) * difficultyDefinition.enemyAttackMultiplier * event.attackRatio,
    )),
    defense: Math.round(
      definition.defense * enemyDefMultiplier(powerStage) * difficultyDefinition.enemyDefenseMultiplier,
    ),
    damageElement: resolveEnemyDamageElement(event.sourceEnemyId, stage),
    critChance: 0.05,
    attackMode: definition.attackMode,
    attackRange: definition.attackRange,
    moveSpeed: definition.moveSpeed,
    attackIntervalMs: definition.attackIntervalMs,
    castSpeedPct: 0,
    attackCooldownMs: 0,
    skillTriggerMs: initialEnemySkillTrigger(event.sourceEnemyId),
    skillPrepareMs: null,
    skillCastDurationMs: null,
    skillCastId: null,
    skillCastSequence: 0,
    skillTargetIds: [],
    targetId: null,
    shield: 0,
    statuses: [],
    periodicEffects: [],
    alive: true,
    basicAttackCount: 0,
    skillCastCount: 0,
    passiveFlags: {
      holdX: parent.x + 46,
      entryDone: true,
      formationLane: formationLane(enemyCount, "enemies"),
    },
    countsForBossProgress: false,
  };
}

const FIXED_STEP = 50;
/** Brief pause after a wave clear before the next foes enter from the right. */
const WAVE_BREAK_MS = 850;
/** Keep next wave just ahead of the party so they enter from the visible right. */
const NEXT_ENCOUNTER_GAP = 320;

export class BattleSimulation {
  private stage: number;
  private readonly difficulty: GameDifficulty;
  /** Encounter index for pack seeding — not a player-facing “wave number”. */
  private wave = 1;
  private trashKills = 0;
  private bossActive = false;
  private readonly baseTrashQuota: number;
  private trashQuota: number;
  private state: BattleSnapshot["state"] = "waveIntro";
  /** heroEntry: stage switch march-in from the left. waveBreak: pause before next foes. */
  private travelKind: "heroEntry" | "waveBreak" = "waveBreak";
  private elapsedMs = 0;
  private stateElapsedMs = 0;
  private accumulator = 0;
  private units: UnitState[];
  private events: BattleEvent[] = [];
  private reportedDeaths = new Set<string>();
  private snapshotCache: BattleSnapshot | null = null;
  private readonly random: SeededRandom;
  private readonly seed: number;

  constructor(options: BattleSimulationOptions) {
    this.stage = options.stage;
    this.difficulty = options.difficulty ?? "easy";
    this.seed = options.seed;
    this.random = new SeededRandom(options.seed);
    this.baseTrashQuota = Math.max(1, trashQuotaForStage(options.stage, options.seed));
    const progressBonus = Math.max(0, options.bossProgressBonus ?? 0);
    this.trashQuota = Math.max(1, Math.ceil(this.baseTrashQuota / (1 + progressBonus)));
    const heroes = this.createHeroUnits(
      options.party,
      options.heroStats,
      options.heroBonuses ?? {},
      options.heroStartX ?? {},
    );
    this.units = heroes;
    if (options.startWithTravel) {
      this.beginHeroEntry();
    } else {
      this.spawnCurrentWave();
    }
  }

  getSnapshot(): BattleSnapshot {
    if (this.snapshotCache) return this.snapshotCache;
    this.snapshotCache = {
      stage: this.stage,
      difficulty: this.difficulty,
      wave: this.wave,
      state: this.state,
      elapsedMs: this.elapsedMs,
      units: this.units.map((unit) => ({
        ...unit,
        skillTargetIds: [...unit.skillTargetIds],
        statuses: unit.statuses.map((status) => ({ ...status })),
        periodicEffects: unit.periodicEffects.map((effect) => ({ ...effect })),
        passiveFlags: { ...unit.passiveFlags },
        specialization: unit.specialization ? structuredClone(unit.specialization) : undefined,
      })),
      progress: Math.min(1, this.trashKills / this.trashQuota),
      bossActive: this.bossActive,
      seed: this.seed,
    };
    return this.snapshotCache;
  }

  private get bossProgress(): number {
    return Math.min(1, this.trashKills / this.trashQuota);
  }

  step(deltaMs: number): void {
    if (this.state === "victory" || this.state === "defeat") return;
    this.accumulator += Math.min(deltaMs, 250);
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < 5) {
      this.tick(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === 5) this.accumulator = 0;
    if (steps > 0) this.snapshotCache = null;
  }

  drainEvents(): BattleEvent[] {
    return this.events.splice(0);
  }

  debugDefeatEnemies(): void {
    const events: BattleEvent[] = [];
    for (const enemy of this.units.filter(({ team, alive }) => team === "enemies" && alive)) {
      enemy.hp = 0;
      enemy.alive = false;
      events.push({ type: "unit:died", unitId: enemy.id });
    }
    this.pushCombatEvents(events);
    this.snapshotCache = null;
  }

  debugDefeatHeroes(): void {
    const events: BattleEvent[] = [];
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      hero.hp = 0;
      hero.alive = false;
      events.push({ type: "unit:died", unitId: hero.id });
    }
    this.pushCombatEvents(events);
    this.snapshotCache = null;
  }

  setBossProgressBonus(bonus: number): void {
    this.trashQuota = Math.max(1, Math.ceil(this.baseTrashQuota / (1 + Math.max(0, bonus))));
    this.snapshotCache = null;
  }

  refreshHeroStats(
    stats: Partial<Record<HeroId, HeroCombatStats>>,
    bonuses: Partial<Record<HeroId, HeroBattleBonus>>,
  ): void {
    for (const unit of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      const heroId = unit.sourceId as HeroId;
      const definition = HERO_BY_ID[heroId];
      const combatStats = stats[heroId] ?? definition;
      const bonus = bonuses[heroId] ?? {};
      const hpRatio = unit.hp / unit.maxHp;
      const cooldownRatio = unit.attackCooldownMs / Math.max(1, unit.attackIntervalMs);
      const maxHp = Math.round((combatStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0)));
      const interval = Math.round(definition.attackIntervalMs / (1 + (bonus.attackSpeedPct ?? 0) / 100));
      unit.maxHp = maxHp;
      unit.hp = Math.max(1, Math.round(maxHp * hpRatio));
      unit.attack = Math.round((combatStats.attack + (bonus.attack ?? 0)) * (1 + (bonus.attackPct ?? 0)));
      unit.defense = Math.round(
        (combatStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0)),
      );
      unit.critChance = 0.05 + (bonus.critChance ?? 0);
      unit.attackIntervalMs = interval;
      unit.castSpeedPct = clampCastSpeedPct(bonus.castSpeedPct ?? 0);
      unit.attackCooldownMs = Math.max(0, cooldownRatio * interval);
      unit.moveSpeed = definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100);
      this.applyGearFlags(unit, bonus);
    }
    this.snapshotCache = null;
  }

  private tick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    this.stateElapsedMs += deltaMs;
    const aliveHeroes = this.units.filter(({ team, alive }) => team === "heroes" && alive);
    const aliveEnemies = this.units.filter(({ team, alive }) => team === "enemies" && alive);
    if (aliveHeroes.length === 0) {
      this.state = "defeat";
      this.events.push({ type: "battle:defeat", stage: this.stage });
      return;
    }
    if (this.state === "travelling") {
      this.advanceTravel(deltaMs);
      return;
    }
    if (aliveEnemies.length === 0) {
      this.cancelPendingHeroSkills();
      this.advanceWave();
      return;
    }
    if (this.state === "waveIntro" || this.state === "bossIntro") {
      // Foes file in from the right while heroes close; strike as soon as range allows.
      this.advanceEnemyEntry(deltaMs);
      advanceMovement(this.units, deltaMs, {
        skip: (unit) => unit.team === "enemies" && !unit.passiveFlags.entryDone,
      });
      this.tickCombat(deltaMs);
      this.resolveActions();
      const minIntroMs = this.state === "bossIntro" ? 500 : 350;
      if (this.stateElapsedMs >= minIntroMs && this.enemiesReachedHold()) {
        this.state = "advancing";
        this.stateElapsedMs = 0;
      }
      return;
    }

    this.tickCombat(deltaMs);
    advanceMovement(this.units, deltaMs);
    this.state = "engaging";
    this.resolveActions();
  }

  /** Statuses, attack timing, and passive procs shared by intro and open combat. */
  private tickCombat(deltaMs: number): void {
    for (const unit of this.units) {
      advanceStatuses(unit, deltaMs);
      const periodicEvents = tickPeriodicEffects(unit, deltaMs, this.random, this.units);
      onPeriodicEffectEvents(periodicEvents, this.units);
      this.pushCombatEvents(periodicEvents);
      if (!unit.alive) continue;
      this.pushCombatEvents(tickSpecializationPassives(unit, this.units, deltaMs, this.random));
      if (!unit.alive) continue;
      tickSharedHeroPassive(unit, deltaMs);
      const haste = getStatusMagnitude(unit, "haste");
      const slow = getStatusMagnitude(unit, "slow");
      const cooldownRate = Math.max(0.2, 1 + haste - slow);
      unit.attackCooldownMs -= deltaMs * cooldownRate;
      if (unit.team === "enemies") {
        this.pushCombatEvents(advanceEnemyBehavior(unit, this.units, deltaMs, this.difficulty));
      } else {
        const definition = ACTIVE_SKILL_BY_HERO[unit.sourceId as HeroId];
        const hasLivingEnemy = this.units.some(
          (candidate) => candidate.alive && candidate.team !== unit.team,
        );
        const transition = advanceSkillPreparation(
          unit,
          deltaMs,
          Boolean(definition)
            && !isStunned(unit)
            && hasLivingEnemy
            && (unit.skillPrepareMs !== null || shouldCastSpecialization(unit, this.units))
            && (unit.skillPrepareMs !== null || hasEnemyInCastRange(unit, this.units)),
          definition ? specializationCastTime(unit, definition.castTimeMs) : undefined,
        );
        if (transition && definition) {
          this.events.push({
            type: transition.type === "started" ? "skill:started" : "skill:cancelled",
            castId: transition.castId,
            sourceId: unit.id,
            skillId: definition.id,
          });
        }
      }
      const hpRegen =
        Number(unit.passiveFlags.gearHpRegenPerSec ?? 0) +
        unit.maxHp * Number(unit.passiveFlags.kitHpRegenMaxHpPct ?? 0);
      if (unit.team === "heroes" && hpRegen > 0 && unit.hp < unit.maxHp) {
        applyHealing(unit, (hpRegen * deltaMs) / 1000, false);
      }
      const mirageGuard = Number(unit.passiveFlags.gearMirageGuard ?? 0);
      if (
        unit.team === "heroes" &&
        mirageGuard > 0 &&
        unit.hp / unit.maxHp < 0.5 &&
        !unit.passiveFlags.gearMirageGuardUsed
      ) {
        applyStatus(unit, {
          kind: "mirageGuard",
          effectId: "gear-mirage-guard",
          magnitude: mirageGuard,
          remainingMs: 3000,
          sourceId: `${unit.id}:mirageguard`,
        });
        unit.passiveFlags.gearMirageGuardUsed = true;
        this.events.push({ type: "status:applied", targetId: unit.id, kind: "mirageGuard" });
      }
    }
  }

  private resolveActions(): void {
    for (const unit of this.units) {
      if (!unit.alive || isStunned(unit)) continue;
      if (unit.team === "heroes") {
        const skillEvents = tryCastReadySkill(unit, this.units, this.random);
        this.pushCombatEvents(skillEvents);
        if (skillEvents.some((event) => event.type === "skill:resolved")) continue;
        // Preparation owns the hero's action until it resolves or is cancelled.
        if (unit.skillPrepareMs !== null || unit.specialization?.channel) continue;
      } else {
        if (unit.skillPrepareMs === 0 && this.resolveEnemyActive(unit)) continue;
        if (unit.skillPrepareMs !== null) continue;
      }
      if (unit.attackCooldownMs <= 0) this.basicAttack(unit);
    }
  }

  private pushCombatEvents(events: readonly BattleEvent[]): void {
    events = [...events, ...specializationReactions(events, this.units, this.random)];
    const deaths: Extract<BattleEvent, { type: "unit:died" }>[] = [];
    for (const event of events) {
      if (event.type === "unit:died") {
        deaths.push(event);
      } else if (event.type === "enemy:summoned") {
        this.materializeEnemySummon(event);
        this.events.push(event);
      } else {
        this.events.push(event);
      }
    }
    for (const event of deaths) {
      if (this.reportedDeaths.has(event.unitId)) continue;
      this.reportedDeaths.add(event.unitId);
      this.events.push(event);
      const fallen = this.units.find(({ id }) => id === event.unitId);
      if (fallen) this.onEnemyKilled(fallen, event);
    }
  }

  private materializeEnemySummon(event: Extract<BattleEvent, { type: "enemy:summoned" }>): void {
    const parent = this.units.find((unit) => unit.id === event.sourceId && unit.alive);
    if (!parent) return;
    const id = `${parent.id}:${event.summonId}`;
    if (this.units.some((unit) => unit.id === id)) return;
    const summon = createEnemySummonUnit(
      event,
      parent,
      this.stage,
      this.units.filter((unit) => unit.team === "enemies").length,
      this.difficulty,
    );
    if (!summon) return;
    this.units.push(summon);
  }

  private cancelPendingHeroSkills(): void {
    for (const unit of this.units) {
      if (unit.team !== "heroes") continue;
      const transition = cancelSkillPreparation(unit);
      const definition = ACTIVE_SKILL_BY_HERO[unit.sourceId as HeroId];
      if (!transition || !definition) continue;
      this.events.push({
        type: "skill:cancelled",
        castId: transition.castId,
        sourceId: unit.id,
        skillId: definition.id,
      });
    }
  }

  /** Trash kills fill the meter that eventually summons the boss. */
  private onEnemyKilled(
    enemy: UnitState,
    death: Extract<BattleEvent, { type: "unit:died" }>,
  ): void {
    if (enemy.team !== "enemies") return;
    this.pushCombatEvents(enemyDeathBurst(enemy, this.units, this.random));
    const kind = ENEMY_BY_ID[enemy.sourceId as keyof typeof ENEMY_BY_ID]?.kind ?? "normal";
    this.events.push({
      type: "enemy:killed",
      unitId: enemy.id,
      worldX: enemy.x,
      worldY: enemy.y,
      kind,
      attackId: death.attackId,
      skillCastId: death.skillCastId,
    });
    if (enemy.countsForBossProgress === false || this.bossActive || ENEMY_BY_ID[enemy.sourceId as keyof typeof ENEMY_BY_ID]?.kind === "boss") return;
    if (this.trashKills >= this.trashQuota) return;
    this.trashKills += 1;
    this.events.push({ type: "boss:progress", progress: this.bossProgress });
  }

  private basicAttack(source: UnitState): void {
    const heroDef = source.team === "heroes" ? HERO_BY_ID[source.sourceId as HeroId] : undefined;
    const preferredTarget = source.team === "enemies"
      ? selectEnemyBasicTarget(source, this.units)
      : selectSpecializationTarget(source, this.units)
        ?? selectTarget(source, this.units, heroDef?.targetStrategy ?? "nearestEnemy");
    let target = resolveMeleeFrontTarget(source, preferredTarget, this.units);
    if (
      source.attackMode === "melee"
      && !(source.team === "enemies" && target && isTankUnit(target))
      && (!target || Math.abs(target.x - source.x) > engageRange(source, target) + 4)
    ) {
      target = this.units
        .filter((candidate) =>
          candidate.alive
          && candidate.team !== source.team
          && Math.abs(candidate.x - source.x) <= engageRange(source, candidate) + 4,
        )
        .sort(
          (left, right) =>
            Math.abs(left.x - source.x) - Math.abs(right.x - source.x)
            || Math.abs(left.y - source.y) - Math.abs(right.y - source.y)
            || left.id.localeCompare(right.id),
        )[0] ?? target;
    }
    source.targetId = target?.id ?? null;
    if (!target || Math.abs(target.x - source.x) > engageRange(source, target) + 4) return;
    let multiplier = 1;
    if (source.team === "enemies") multiplier *= enemyBasicAttackMultiplier(source);
    const specializationModifiers = specializationBasicAttackModifiers(source, target);
    multiplier *= specializationModifiers.damageMultiplier;
    multiplier *= gearDamageMultiplier(source);
    if (source.team === "heroes") {
      multiplier *= 1 + Number(source.passiveFlags.gearPrimaryAttackPct ?? 0);
      multiplier *= 1 + Number(source.passiveFlags.talentBasicDamagePct ?? 0);
    }
    if (target.hp / target.maxHp < 0.35) {
      multiplier += Number(source.passiveFlags.gearExecute ?? 0);
    }
    const meteorPassive = HERO_SKILL_BY_ID.meteor.passive;
    if (
      source.chosenSkillId === "meteor"
      && target.hp / target.maxHp > (meteorPassive.highHpThreshold ?? 0.7)
    ) {
      multiplier *= 1 + (meteorPassive.highHpDamageBonus ?? 0.15);
    }
    const executePassive = HERO_SKILL_BY_ID["execute-flurry"].passive;
    if (
      source.chosenSkillId === "execute-flurry"
      && target.hp / target.maxHp < (executePassive.executeThreshold ?? 0.35)
    ) {
      multiplier *= 1 + (executePassive.executeDamageBonus ?? 0.2);
    }
    const enemyKind = ENEMY_BY_ID[target.sourceId as keyof typeof ENEMY_BY_ID]?.kind;
    if (enemyKind === "elite" || enemyKind === "boss") {
      multiplier *= 1 + Number(source.passiveFlags.gearEliteDamage ?? 0);
    }
    const critMultiplier = 1.5 + Number(source.passiveFlags.gearCritDamagePct ?? 0) / 100;
    this.prepareGuardian(target);
    source.basicAttackCount += 1;
    const attackId = `${source.id}:basic:${source.basicAttackCount}`;
    source.attackCooldownMs = source.attackIntervalMs;
    this.events.push({
      type: "attack",
      attackId,
      sourceId: source.id,
      targetId: target.id,
      attackMode: source.attackMode,
      element: source.damageElement,
    });
    const delivery = source.attackMode === "melee" ? "contact" : "projectile";
    const hit = resolveDamage({
      attackId,
      sourceId: source.id,
      target,
      context: { sourceKind: "basic", delivery },
      element: source.damageElement,
      baseDamage: source.attack * multiplier * outgoingElementMultiplier(source),
      profile: "standard",
      critChance: source.critChance + specializationModifiers.critChanceBonus,
      critMultiplier,
      defenseReduction: getStatusMagnitude(target, "armorBreak"),
    }, this.random);
    const combatEvents = damageEvents(hit, false);
    if (hit.killed) combatEvents.push({ type: "unit:died", unitId: target.id, attackId });
    if (hit.outcome === "hit") {
      if (source.team === "heroes") gainRageFromBasicAttack(source);
      afterSharedHeroPassiveDamage(
        source,
        target,
        hit.critical,
        combatEvents,
      );
      const lifeOnHit = Number(source.passiveFlags.gearLifeOnHit ?? 0);
      if (source.team === "heroes" && lifeOnHit > 0 && source.alive) {
        const healed = applyHealing(source, lifeOnHit, false).healed;
        if (healed > 0) {
          combatEvents.push({
            type: "heal",
            sourceId: source.id,
            targetId: source.id,
            amount: healed,
            attribution: { kind: "gear", id: "life-on-hit" },
            presentation: "silent",
          });
        }
      }
      const lifeSteal = Number(source.passiveFlags.gearLifeStealPct ?? 0);
      if (source.team === "heroes" && lifeSteal > 0 && source.alive) {
        const healed = applyHealing(source, hit.hpDamage * lifeSteal, false).healed;
        if (healed > 0) {
          combatEvents.push({
            type: "heal",
            sourceId: source.id,
            targetId: source.id,
            amount: healed,
            attribution: { kind: "gear", id: "life-steal" },
            presentation: "silent",
          });
        }
      }
      const thunderbrand = Number(source.passiveFlags.gearThunderbrand ?? 0);
      if (
        source.team === "heroes" &&
        target.alive &&
        thunderbrand > 0 &&
        source.basicAttackCount % 4 === 0
      ) {
        const bonusDamage = Math.round(source.attack * thunderbrand);
        const bonusHit = resolveDamage({
          sourceId: source.id,
          target,
          context: { sourceKind: "basic", delivery: "indirect" },
          element: source.damageElement,
          baseDamage: bonusDamage,
          profile: "proc",
        }, this.random);
        combatEvents.push(...damageEvents(
          bonusHit,
          true,
          undefined,
          { kind: "gear", id: "thunderbrand" },
        ));
      }
      const frostbiteChance = Number(source.passiveFlags.gearFrostbiteChance ?? 0);
      if (source.team === "heroes" && target.alive && frostbiteChance > 0 && this.random.next() < frostbiteChance) {
        applyStatus(target, {
          kind: "slow",
          effectId: "gear-frostbite-slow",
          magnitude: 0.12,
          remainingMs: 2000,
          sourceId: source.id,
        });
        combatEvents.push({ type: "status:applied", targetId: target.id, kind: "slow" });
      }
      const sandscarChance = Number(source.passiveFlags.gearSandscarChance ?? 0);
      if (source.team === "heroes" && target.alive && sandscarChance > 0 && this.random.next() < sandscarChance) {
        applyStatus(target, {
          kind: "armorBreak",
          effectId: "gear-sandscar-armor-break",
          magnitude: 0.12,
          remainingMs: 2000,
          sourceId: source.id,
        });
        combatEvents.push({ type: "status:applied", targetId: target.id, kind: "armorBreak" });
      }
      if (target.alive) {
        afterTalentBasicAttack(source, target, this.units, combatEvents);
      }
      if (target.alive) {
        afterSharedHeroPassiveBasicAttack(source, target, combatEvents);
      }
      afterSpecializationBasicAttack(source, target, this.units, this.random, combatEvents, hit.critical);
      if (source.team === "enemies") {
        combatEvents.push(...afterEnemyBasicHit(source, target, this.random, this.units));
      }
      const thorns = resolveThorns(
        source,
        target,
        hit,
        { sourceKind: "basic", delivery },
        this.random,
      );
      if (thorns) {
        combatEvents.push(...damageEvents(thorns));
      }
    }
    this.pushCombatEvents(combatEvents);
  }

  private resolveEnemyActive(source: UnitState): boolean {
    const ability = activeEnemyAbilityFor(source);
    const castId = source.skillCastId;
    if (!ability || !castId || source.skillPrepareMs !== 0) return false;

    const lockedTargetIds = [...source.skillTargetIds];
    const targets = lockedTargetIds.flatMap((targetId) => {
      const target = this.units.find((unit) => unit.id === targetId && unit.alive);
      return target && target.team !== source.team ? [target] : [];
    });
    const combatEvents: BattleEvent[] = [{
      type: "skill:resolved",
      castId,
      sourceId: source.id,
      skillId: ability.id,
      targetIds: lockedTargetIds,
    }];
    combatEvents.push(...applyEnemyStatusOnly(source, targets, this.units, ability));
    const delivery = source.attackMode === "melee" ? "contact" : "indirect";
    const hitCount = Math.max(1, ability.hits ?? 1);
    for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
      for (const [targetIndex, target] of targets.entries()) {
        if (!source.alive || !target.alive) continue;
        let landed = ability.attackMultiplier <= 0;
        if (ability.attackMultiplier > 0) {
          this.prepareGuardian(target);
          const targetMultiplier = ability.targetMultipliers?.[targetIndex] ?? 1;
          const hit = resolveDamage({
            sourceId: source.id,
            target,
            context: { sourceKind: "skill", delivery },
            element: source.damageElement,
            baseDamage: source.attack
              * ability.attackMultiplier
              * targetMultiplier
              * outgoingElementMultiplier(source),
            profile: "standard",
            critChance: source.critChance,
            defenseReduction: getStatusMagnitude(target, "armorBreak"),
          }, this.random);
          combatEvents.push(...damageEvents(hit, true, castId));
          landed = hit.outcome === "hit";
          const thorns = resolveThorns(
            source,
            target,
            hit,
            { sourceKind: "skill", delivery },
            this.random,
          );
          if (thorns) combatEvents.push(...damageEvents(thorns));
        }
        if (ability.attackMultiplier > 0 && landed && target.alive && ability.targetStatus) {
          applyStatus(target, {
            kind: ability.targetStatus.kind,
            effectId: `${ability.id}-${ability.targetStatus.kind}`,
            magnitude: ability.targetStatus.magnitude,
            remainingMs: ability.targetStatus.durationMs,
            sourceId: source.id,
          });
          combatEvents.push({ type: "status:applied", targetId: target.id, kind: ability.targetStatus.kind });
        }
        if (landed && target.alive && ability.periodicDamage) {
          const periodic = ability.periodicDamage;
          addPeriodicEffect(target, {
            id: ability.id,
            kind: "damage",
            sourceId: source.id,
            amount: source.attack * periodic.powerPct,
            intervalMs: periodic.intervalMs,
            untilTickMs: periodic.intervalMs,
            remainingTicks: periodic.ticks,
            element: periodic.element ?? source.damageElement,
            attribution: { kind: "periodic", id: ability.id },
          });
        }
      }
    }
    if (ability.attackMultiplier > 0 && source.alive && ability.selfStatus) {
      applyStatus(source, {
        kind: ability.selfStatus.kind,
        effectId: `${ability.id}-${ability.selfStatus.kind}`,
        magnitude: ability.selfStatus.magnitude,
        remainingMs: ability.selfStatus.durationMs,
        sourceId: source.id,
      });
      combatEvents.push({
        type: "status:applied",
        targetId: source.id,
        kind: ability.selfStatus.kind,
      });
    }
    if (ability.attackMultiplier > 0 && source.alive && ability.selfShieldMaxHpRatio) {
      source.shield = Math.max(source.shield, Math.round(source.maxHp * ability.selfShieldMaxHpRatio));
    }
    const allies = this.units
      .filter((unit) => unit.alive && unit.team === source.team)
      .sort((left, right) => left.hp / left.maxHp - right.hp / right.maxHp || left.id.localeCompare(right.id));
    if (ability.attackMultiplier > 0 && ability.allyStatus) {
      const { status, count, includeSelf } = ability.allyStatus;
      const allyTargets = includeSelf
        ? [source, ...allies.filter((unit) => unit.id !== source.id)]
        : allies.filter((unit) => unit.id !== source.id);
      for (const ally of allyTargets.slice(0, count)) {
        applyStatus(ally, { kind: status.kind, effectId: `${ability.id}-${status.kind}`, magnitude: status.magnitude, remainingMs: status.durationMs, sourceId: source.id });
        combatEvents.push({ type: "status:applied", targetId: ally.id, kind: status.kind });
      }
    }
    if (ability.attackMultiplier > 0 && ability.allyShieldMaxHpRatio) {
      const { amountPctMaxHp, count, includeSelf } = ability.allyShieldMaxHpRatio;
      const allyTargets = includeSelf
        ? [source, ...allies.filter((unit) => unit.id !== source.id)]
        : allies.filter((unit) => unit.id !== source.id);
      for (const ally of allyTargets.slice(0, count)) {
        ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * amountPctMaxHp));
      }
    }
    if (ability.allyHeal) {
      const heal = ability.allyHeal;
      const ally = allies.find((unit) => unit.id !== source.id && unit.hp < unit.maxHp);
      if (ally) {
        const amount = Math.min(ally.maxHp * heal.maxHpRatio, source.attack * heal.attackMultiplier);
        const result = applyHealing(ally, amount, false);
        if (result.healed > 0) combatEvents.push({ type: "heal", sourceId: source.id, targetId: ally.id, amount: result.healed, attribution: { kind: "activeSkill", id: ability.id } });
      }
    }
    const difficultyEffect = applyDifficultySignatureMechanic(
      source,
      ability.id,
      this.difficulty,
    );
    combatEvents.push(...difficultyEffect.events);
    if (difficultyEffect.echoMultiplier > 0 && ability.attackMultiplier > 0) {
      for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
        for (const [targetIndex, target] of targets.entries()) {
          if (!source.alive || !target.alive) continue;
          const targetMultiplier = ability.targetMultipliers?.[targetIndex] ?? 1;
          const echo = resolveDamage({
            sourceId: source.id,
            target,
            context: { sourceKind: "skill", delivery },
            element: source.damageElement,
            baseDamage: source.attack
              * ability.attackMultiplier
              * targetMultiplier
              * outgoingElementMultiplier(source)
              * difficultyEffect.echoMultiplier,
            profile: "proc",
            critChance: 0,
            defenseReduction: getStatusMagnitude(target, "armorBreak"),
          }, this.random);
          combatEvents.push(...damageEvents(
            echo,
            true,
            castId,
            { kind: "passive", id: "torment-signature-echo" },
          ));
        }
      }
    }
    source.skillCastCount += 1;
    completeEnemyActive(source);
    this.pushCombatEvents(combatEvents);
    return true;
  }

  private advanceWave(): void {
    for (const hero of this.units.filter((unit) => unit.team === "heroes")) {
      if (hero.specialization) { hero.specialization.channel = undefined; hero.specialization.trap = undefined; }
      hero.passiveFlags.specComboStep = 0;
      hero.passiveFlags.specComboRemainingMs = 0;
      hero.passiveFlags.specShadowReturnPending = false;
      hero.statuses = hero.statuses.filter((status) => status.effectId !== "devourer-channel-guard");
    }
    if (this.bossActive) {
      this.state = "victory";
      this.events.push({ type: "battle:victory", stage: this.stage });
      return;
    }
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      const renewal = Number(hero.passiveFlags.gearRenewal ?? 0);
      if (renewal > 0) hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * renewal));
      hero.passiveFlags.gearGuardianUsed = false;
      hero.passiveFlags.gearMirageGuardUsed = false;
      hero.passiveFlags.gearCloudveilUsed = false;
      hero.passiveFlags.gearStormwardUsed = false;
      this.removeSnowguardShield(hero);
    }
    this.wave += 1;
    this.state = "travelling";
    this.travelKind = "waveBreak";
    this.stateElapsedMs = 0;
    this.units = this.units.filter(({ team }) => team === "heroes");
    for (const hero of this.units) {
      hero.targetId = null;
    }
  }

  /** Place the party off-screen left and march each slot in sequence to hold X. */
  private beginHeroEntry(): void {
    this.travelKind = "heroEntry";
    this.state = "travelling";
    this.stateElapsedMs = 0;
    const heroes = this.units.filter(({ team }) => team === "heroes");
    for (const [entryIndex, hero] of heroes.entries()) {
      const holdX = hero.x;
      hero.passiveFlags.holdX = holdX;
      hero.passiveFlags.entrySlot = entryIndex;
      hero.passiveFlags.heroEntryActive = true;
      hero.x = heroEntryStartX(holdX, entryIndex);
      hero.targetId = null;
    }
  }

  private advanceTravel(deltaMs: number): void {
    if (this.travelKind === "waveBreak") {
      // Hold formation — no map push. Next wave walks in from the right.
      if (this.stateElapsedMs < WAVE_BREAK_MS) return;
      this.spawnCurrentWave();
      return;
    }

    let frontArrived = false;
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      hero.targetId = null;
      const slotIndex = Number(hero.passiveFlags.entrySlot ?? 0);
      if (this.stateElapsedMs < slotIndex * HERO_ENTRY_STAGGER_MS) {
        continue;
      }
      const holdX = Number(hero.passiveFlags.holdX ?? hero.x);
      if (hero.x < holdX) {
        hero.x = Math.min(holdX, hero.x + HERO_ENTRY_SPEED * (deltaMs / 1000));
      } else {
        hero.x = holdX;
      }
      if (slotIndex === 0 && hero.x >= holdX) frontArrived = true;
    }
    if (frontArrived) {
      for (const hero of this.units.filter(({ team }) => team === "heroes")) {
        hero.passiveFlags.heroEntryActive = false;
      }
      this.spawnCurrentWave();
    }
  }

  private spawnCurrentWave(): void {
    const heroes = this.units.filter(({ team, alive }) => team === "heroes" && alive);
    const heroFront = Math.max(...heroes.map(({ x }) => x));
    const holdBase = heroFront + NEXT_ENCOUNTER_GAP;
    const summonBoss = !this.bossActive && this.bossProgress >= 1;
    if (summonBoss) this.bossActive = true;
    const enemies = createEnemyUnits(
      this.stage,
      this.wave,
      this.seed,
      holdBase,
      this.bossActive,
      this.difficulty,
    );
    for (const [index, enemy] of enemies.entries()) {
      enemy.passiveFlags.holdX = enemy.x;
      enemy.passiveFlags.entrySlot = index;
      enemy.passiveFlags.entryDone = false;
      enemy.x = enemyEntryStartX(enemy.x, index);
      enemy.targetId = null;
    }
    this.units = [
      ...this.units.filter(({ team }) => team === "heroes"),
      ...enemies,
    ];
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      this.applyWaveEquipmentEffects(hero);
    }
    this.state = this.bossActive ? "bossIntro" : "waveIntro";
    this.stateElapsedMs = 0;
    this.events.push({ type: "wave:started", wave: this.wave });
    if (this.bossActive) {
      const bossName = STAGE_DEFINITIONS[this.stage - 1]?.bossName ?? "区域首领";
      this.events.push({ type: "boss:intro", name: bossName });
    }
  }

  /** Walk newly spawned foes in from the right, one slot after another. */
  private advanceEnemyEntry(deltaMs: number): void {
    const heroes = this.units.filter(({ team, alive }) => team === "heroes" && alive);
    for (const enemy of this.units.filter(({ team, alive }) => team === "enemies" && alive)) {
      if (enemy.passiveFlags.entryDone) continue;
      const slotIndex = Number(enemy.passiveFlags.entrySlot ?? 0);
      if (this.stateElapsedMs < slotIndex * ENEMY_ENTRY_STAGGER_MS) continue;

      const hasTargetInRange = (): boolean => heroes.some(
        (hero) => Math.abs(hero.x - enemy.x) <= engageRange(enemy, hero) + 4,
      );

      // Release the entry rail and make the first attack immediately available.
      if (hasTargetInRange()) {
        enemy.passiveFlags.entryDone = true;
        enemy.attackCooldownMs = 0;
        continue;
      }

      const holdX = Number(enemy.passiveFlags.holdX ?? enemy.x);
      if (enemy.x > holdX) {
        enemy.x = Math.max(holdX, enemy.x - movementStep(enemy, deltaMs));
        if (hasTargetInRange()) {
          enemy.passiveFlags.entryDone = true;
          enemy.attackCooldownMs = 0;
        }
      } else {
        enemy.x = holdX;
        enemy.passiveFlags.entryDone = true;
      }
    }
  }

  private enemiesReachedHold(): boolean {
    const enemies = this.units.filter(({ team, alive }) => team === "enemies" && alive);
    if (enemies.length === 0) return true;
    return enemies.every((enemy) => Boolean(enemy.passiveFlags.entryDone));
  }

  private createHeroUnits(
    party: readonly (HeroId | null)[],
    stats: Partial<Record<HeroId, HeroCombatStats>>,
    bonuses: Partial<Record<HeroId, HeroBattleBonus>>,
    startX: Partial<Record<HeroId, number>>,
  ): UnitState[] {
    return party.flatMap((heroId, index) => {
      if (!heroId) return [];
      const definition = HERO_BY_ID[heroId];
      const combatStats = stats[heroId] ?? definition;
      const bonus = bonuses[heroId] ?? {};
      const maxHp = Math.round((combatStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0)));
      const formation = heroFormationOffset(definition.attackRange, index, heroId);
      return [{
        id: `hero-${index}-${heroId}`,
        team: "heroes" as const,
        sourceId: heroId,
        name: definition.name,
        x: startX[heroId] ?? formation.x,
        y: formation.y,
        hp: maxHp,
        maxHp,
        rage: 0,
        maxRage: HERO_MAX_RAGE,
        attack: Math.round((combatStats.attack + (bonus.attack ?? 0)) * (1 + (bonus.attackPct ?? 0))),
        defense: Math.round(
          (combatStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0)),
        ),
        damageElement: definition.damageElement,
        critChance: 0.05 + (bonus.critChance ?? 0),
        attackMode: definition.combatRange,
        attackRange: definition.attackRange,
        moveSpeed: definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100),
        attackIntervalMs: Math.round(definition.attackIntervalMs / (1 + (bonus.attackSpeedPct ?? 0) / 100)),
        castSpeedPct: clampCastSpeedPct(bonus.castSpeedPct ?? 0),
        attackCooldownMs: index * 100,
        skillTriggerMs: 0,
        skillPrepareMs: null,
        skillCastDurationMs: null,
        skillCastId: null,
        skillCastSequence: 0,
        skillTargetIds: [],
        targetId: null,
        shield: 0,
        statuses: [],
        periodicEffects: [],
        alive: true,
        basicAttackCount: 0,
        skillCastCount: 0,
        chosenSkillId: bonus.chosenSkillId ?? null,
        passiveFlags: {
          ...this.createGearFlags(bonus, definition.damageSchool, heroId),
          formationLane: formationLane(index, "heroes"),
        },
      }];
    });
  }

  private createKitFlags(bonus: HeroBattleBonus): Record<string, boolean | number | string> {
    return {
      kitHpRegenMaxHpPct: bonus.hpRegenMaxHpPct ?? 0,
      kitWaveShieldPct: bonus.waveStartShieldPct ?? 0,
      kitWaveStartRage: bonus.waveStartRage ?? 0,
    };
  }

  private createGearFlags(
    bonus: HeroBattleBonus,
    damageSchool: "physical" | "magic" = "physical",
    heroId?: HeroId,
  ): Record<string, boolean | number | string> {
    return {
      ...(heroId ? this.createKitFlags(bonus) : {}),
      gearSkillDamage: bonus.skillDamagePct ?? 0,
      heroSkillEffect: bonus.skillEffectPct ?? 0,
      gearExecute: bonus.executeDamagePct ?? 0,
      gearDamagePct: bonus.damagePct ?? 0,
      gearPrimaryAttackPct: bonus.primaryAttackPct ?? 0,
      gearEliteDamage: bonus.eliteDamagePct ?? 0,
      gearCritDamagePct: bonus.critDamagePct ?? 0,
      gearDamageReduction: bonus.damageReductionPct ?? 0,
      gearLifeOnHit: bonus.lifeOnHit ?? 0,
      gearLifeStealPct: bonus.lifeStealPct ?? 0,
      gearHpRegenPerSec: bonus.hpRegenPerSec ?? 0,
      gearDodgeChance: Math.min(DODGE_CHANCE_CAP, bonus.dodgeChance ?? 0),
      gearBlockChance: Math.min(BLOCK_CHANCE_CAP, bonus.blockChance ?? 0),
      gearPhysicalDamage: bonus.physicalDamagePct ?? 0,
      gearMagicDamage: bonus.magicDamagePct ?? 0,
      gearFireDamage: bonus.fireDamagePct ?? 0,
      gearFrostDamage: bonus.frostDamagePct ?? 0,
      gearLightningDamage: bonus.lightningDamagePct ?? 0,
      gearDarkDamage: bonus.darkDamagePct ?? 0,
      gearPhysicalResist: bonus.physicalResistPct ?? 0,
      gearFireResist: bonus.fireResistPct ?? 0,
      gearFrostResist: bonus.frostResistPct ?? 0,
      gearLightningResist: bonus.lightningResistPct ?? 0,
      gearDarkResist: bonus.darkResistPct ?? 0,
      gearHolyResist: bonus.holyResistPct ?? 0,
      gearAllResist: bonus.allResistPct ?? 0,
      gearDamageSchoolMagic: damageSchool === "magic" ? 1 : 0,
      gearRageGainPct: bonus.rageGainPct ?? 0,
      gearHealPowerPct: bonus.healPowerPct ?? 0,
      gearGuardian: bonus.guardianShieldPct ?? 0,
      gearThorns: bonus.thornsPct ?? 0,
      gearRenewal: bonus.renewalPct ?? 0,
      gearFrostbiteChance: bonus.frostbiteChance ?? 0,
      gearSnowguard: bonus.snowguardShieldPct ?? 0,
      gearSnowguardShield: 0,
      gearWaveStartRage: bonus.frostfocusInitialRage ?? 0,
      gearSandscarChance: bonus.sandscarChance ?? 0,
      gearMirageGuard: bonus.mirageGuardPct ?? 0,
      gearMirageGuardUsed: false,
      gearTailwind: bonus.tailwindPct ?? 0,
      gearThunderbrand: bonus.thunderbrandPct ?? 0,
      gearCloudveil: bonus.cloudveilShieldPct ?? 0,
      gearCloudveilUsed: false,
      gearStormward: bonus.stormwardShieldPct ?? 0,
      gearStormwardUsed: false,
      talentBasicDamagePct: bonus.talentBasicDamagePct ?? 0,
      talentBasicRage: bonus.talentBasicRage ?? 0,
      talentBasicProc: bonus.talentBasicProc ?? "",
      talentBasicProcInterval: bonus.talentBasicProcInterval ?? 0,
      talentBasicProcValue: bonus.talentBasicProcValue ?? 0,
      talentBasicProcDurationMs: bonus.talentBasicProcDurationMs ?? 0,
      talentActiveDamagePct: bonus.talentActiveDamagePct ?? 0,
      talentSpecialization: bonus.talentSpecialization ?? 0,
      augmentationTargetId: bonus.augmentationTargetId ?? "",
      talentActiveHealPct: bonus.talentActiveHealPct ?? 0,
      talentActiveProc: bonus.talentActiveProc ?? "",
      talentActiveProcValue: bonus.talentActiveProcValue ?? 0,
      talentActiveProcDurationMs: bonus.talentActiveProcDurationMs ?? 0,
      gearGuardianUsed: false,
    };
  }

  private applyGearFlags(unit: UnitState, bonus: HeroBattleBonus): void {
    const guardianUsed = unit.passiveFlags.gearGuardianUsed ?? false;
    const snowguardShield = unit.passiveFlags.gearSnowguardShield ?? 0;
    const mirageGuardUsed = unit.passiveFlags.gearMirageGuardUsed ?? false;
    const cloudveilUsed = unit.passiveFlags.gearCloudveilUsed ?? false;
    const stormwardUsed = unit.passiveFlags.gearStormwardUsed ?? false;
    const heroId = unit.sourceId as HeroId;
    const hero = HERO_BY_ID[heroId];
    const school = hero?.damageSchool ?? "physical";
    const previousSharedPassive = unit.chosenSkillId;
    Object.assign(unit.passiveFlags, this.createGearFlags(bonus, school, heroId));
    unit.passiveFlags.gearGuardianUsed = guardianUsed;
    unit.passiveFlags.gearSnowguardShield = snowguardShield;
    unit.passiveFlags.gearMirageGuardUsed = mirageGuardUsed;
    unit.passiveFlags.gearCloudveilUsed = cloudveilUsed;
    unit.passiveFlags.gearStormwardUsed = stormwardUsed;
    unit.chosenSkillId = bonus.chosenSkillId ?? null;
    if (unit.chosenSkillId !== previousSharedPassive) {
      delete unit.passiveFlags.sharedStormCooldownMs;
      delete unit.passiveFlags.sharedBasicHitCount;
    }
  }

  private applyWaveEquipmentEffects(hero: UnitState): void {
    const snowguard = Number(hero.passiveFlags.gearSnowguard ?? 0);
    if (snowguard > 0) {
      const amount = Math.round(hero.maxHp * snowguard);
      hero.shield += amount;
      hero.passiveFlags.gearSnowguardShield = amount;
    }
    const waveStartRage =
      Number(hero.passiveFlags.gearWaveStartRage ?? 0) +
      Number(hero.passiveFlags.kitWaveStartRage ?? 0);
    if (waveStartRage > 0) grantRage(hero, waveStartRage);
    const tailwind = Number(hero.passiveFlags.gearTailwind ?? 0);
    if (tailwind > 0) {
      applyStatus(hero, {
        kind: "haste",
        effectId: "gear-tailwind-haste",
        magnitude: tailwind,
        remainingMs: 3000,
        sourceId: `${hero.id}:tailwind`,
      });
      this.events.push({ type: "status:applied", targetId: hero.id, kind: "haste" });
    }
    const waveShield = Number(hero.passiveFlags.kitWaveShieldPct ?? 0);
    if (waveShield > 0) {
      hero.shield += Math.round(hero.maxHp * waveShield);
    }
  }

  private removeSnowguardShield(hero: UnitState): void {
    const previous = Number(hero.passiveFlags.gearSnowguardShield ?? 0);
    if (previous > 0) hero.shield = Math.max(0, hero.shield - Math.min(previous, hero.shield));
    hero.passiveFlags.gearSnowguardShield = 0;
  }

  private prepareGuardian(target: UnitState): void {
    const guardian = Number(target.passiveFlags.gearGuardian ?? 0);
    if (guardian > 0 && !target.passiveFlags.gearGuardianUsed) {
      target.shield += Math.round(target.maxHp * guardian);
      target.passiveFlags.gearGuardianUsed = true;
    }
  }
}
