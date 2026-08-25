import { ENEMY_BY_ID } from "../content/enemies";
import { HERO_BY_ID } from "../content/heroes";
import { STAGE_DEFINITIONS } from "../content/stages";
import { ACTIVE_SKILL_BY_HERO } from "../content/skills";
import { HERO_SKILL_BY_ID } from "../content/heroSkills";
import { getHeroStats, type HeroStatGrowth } from "../progression/HeroProgression";
import { SKILL_COOLDOWN_REDUCTION_CAP, DODGE_CHANCE_CAP, BLOCK_CHANCE_CAP } from "../content/affixes";
import { calculateDamage, applyHealing, resolveHit, schoolDamageMultiplier, elementDamageMultiplier, outgoingElementMultiplier } from "./CombatSystem";
import {
  advanceMovement,
  engageRange,
  ENEMY_ENTRY_SPEED,
  ENEMY_ENTRY_STAGGER_MS,
  enemyEntryStartX,
  HERO_ENTRY_SPEED,
  HERO_ENTRY_STAGGER_MS,
  heroEntryStartX,
  heroFormationOffset,
} from "./MovementSystem";
import { SeededRandom } from "./RandomSource";
import { tryCastReadySkill } from "./SkillSystem";
import { advanceStatuses, applyStatus, getStatusMagnitude, isStunned } from "./StatusSystem";
import { selectTarget } from "./TargetingSystem";
import { createEnemyUnits, trashQuotaForStage } from "./WaveSystem";
import type { BattleEvent, BattleSnapshot, HeroId, UnitState } from "./types";

export interface BattleSimulationOptions {
  stage: number;
  party: readonly (HeroId | null)[];
  heroLevels: Partial<Record<HeroId, number>>;
  heroGrowth?: Partial<Record<HeroId, HeroStatGrowth>>;
  heroBonuses?: Partial<Record<HeroId, HeroBattleBonus>>;
  heroStartX?: Partial<Record<HeroId, number>>;
  startWithTravel?: boolean;
  seed: number;
  /** Extra boss-meter fill rate (0.01 = +1%). */
  bossProgressBonus?: number;
}

export interface HeroBattleBonus {
  maxHp?: number;
  maxHpPct?: number;
  attack?: number;
  defense?: number;
  /** Multiplier on final defense (TBH Armor %). */
  defensePct?: number;
  attackSpeedPct?: number;
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
  skillCooldownPct?: number;
  skillDamagePct?: number;
  executeDamagePct?: number;
  attackPct?: number;
  hpRegenMaxHpPct?: number;
  waveStartShieldPct?: number;
  waveStartSkillCdrPct?: number;
  chosenSkillId?: string;
  ultimateUnlocked?: boolean;
  awakeningUnlocked?: boolean;
  guardianShieldPct?: number;
  thornsPct?: number;
  renewalPct?: number;
  frostbiteChance?: number;
  snowguardShieldPct?: number;
  frostfocusCooldownPct?: number;
  sandscarChance?: number;
  mirageGuardPct?: number;
  tailwindPct?: number;
  thunderbrandPct?: number;
  cloudveilShieldPct?: number;
  stormwardShieldPct?: number;
}

const FIXED_STEP = 50;
/** Brief pause after a wave clear before the next foes enter from the right. */
const WAVE_BREAK_MS = 850;
/** Keep next wave just ahead of the party so they enter from the visible right. */
const NEXT_ENCOUNTER_GAP = 320;

export class BattleSimulation {
  private stage: number;
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
  private readonly random: SeededRandom;
  private readonly seed: number;
  private heroGrowth: Partial<Record<HeroId, HeroStatGrowth>>;

  constructor(options: BattleSimulationOptions) {
    this.stage = options.stage;
    this.seed = options.seed;
    this.heroGrowth = options.heroGrowth ?? {};
    this.random = new SeededRandom(options.seed);
    this.baseTrashQuota = Math.max(1, trashQuotaForStage(options.stage, options.seed));
    const progressBonus = Math.max(0, options.bossProgressBonus ?? 0);
    this.trashQuota = Math.max(1, Math.ceil(this.baseTrashQuota / (1 + progressBonus)));
    const heroes = this.createHeroUnits(
      options.party,
      options.heroLevels,
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
    return {
      stage: this.stage,
      wave: this.wave,
      state: this.state,
      elapsedMs: this.elapsedMs,
      units: this.units.map((unit) => ({ ...unit, statuses: unit.statuses.map((status) => ({ ...status })) })),
      progress: Math.min(1, this.trashKills / this.trashQuota),
      bossActive: this.bossActive,
      seed: this.seed,
    };
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
  }

  drainEvents(): BattleEvent[] {
    return this.events.splice(0);
  }

  debugDefeatEnemies(): void {
    for (const enemy of this.units.filter(({ team, alive }) => team === "enemies" && alive)) {
      enemy.hp = 0;
      enemy.alive = false;
      this.events.push({ type: "unit:died", unitId: enemy.id });
      this.onEnemyKilled(enemy);
    }
  }

  debugDefeatHeroes(): void {
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      hero.hp = 0;
      hero.alive = false;
      this.events.push({ type: "unit:died", unitId: hero.id });
    }
  }

  setBossProgressBonus(bonus: number): void {
    this.trashQuota = Math.max(1, Math.ceil(this.baseTrashQuota / (1 + Math.max(0, bonus))));
  }

  refreshHeroStats(
    levels: Partial<Record<HeroId, number>>,
    bonuses: Partial<Record<HeroId, HeroBattleBonus>>,
    growth?: Partial<Record<HeroId, HeroStatGrowth>>,
  ): void {
    if (growth) this.heroGrowth = growth;
    for (const unit of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      const heroId = unit.sourceId as HeroId;
      const definition = HERO_BY_ID[heroId];
      const levelStats = getHeroStats(heroId, levels[heroId] ?? 1, this.heroGrowth[heroId]);
      const bonus = bonuses[heroId] ?? {};
      const hpRatio = unit.hp / unit.maxHp;
      const cooldownRatio = unit.attackCooldownMs / Math.max(1, unit.attackIntervalMs);
      const maxHp = Math.round((levelStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0)));
      const interval = Math.round(definition.attackIntervalMs / (1 + (bonus.attackSpeedPct ?? 0) / 100));
      unit.maxHp = maxHp;
      unit.hp = Math.max(1, Math.round(maxHp * hpRatio));
      unit.attack = Math.round((levelStats.attack + (bonus.attack ?? 0)) * (1 + (bonus.attackPct ?? 0)));
      unit.defense = Math.round(
        (levelStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0)),
      );
      unit.critChance = 0.05 + (bonus.critChance ?? 0);
      unit.attackIntervalMs = interval;
      unit.attackCooldownMs = Math.max(0, cooldownRatio * interval);
      unit.moveSpeed = definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100);
      this.applyGearFlags(unit, bonus);
    }
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

  /** Statuses, cooldowns, and passive procs shared by intro and open combat. */
  private tickCombat(deltaMs: number): void {
    for (const unit of this.units) {
      advanceStatuses(unit, deltaMs);
      if (!unit.alive) continue;
      const haste = getStatusMagnitude(unit, "haste");
      const slow = getStatusMagnitude(unit, "slow");
      const cooldownRate = Math.max(0.2, 1 + haste - slow);
      unit.attackCooldownMs -= deltaMs * cooldownRate;
      unit.skillCooldownMs -= deltaMs;
      unit.ultimateCooldownMs -= deltaMs;
      const hpRegen =
        Number(unit.passiveFlags.gearHpRegenPerSec ?? 0) +
        unit.maxHp * Number(unit.passiveFlags.kitHpRegenMaxHpPct ?? 0);
      if (unit.team === "heroes" && hpRegen > 0 && unit.hp < unit.maxHp) {
        applyHealing(unit, (hpRegen * deltaMs) / 1000, false);
      }
      const holdLine = Number(unit.passiveFlags.kitHoldLine ?? 0.4);
      const holdPattern = HERO_BY_ID[unit.sourceId as HeroId]?.skillPattern === "H01";
      if (holdPattern && unit.hp / unit.maxHp < holdLine && !unit.passiveFlags.hold) {
        applyStatus(unit, { kind: "damageReduction", magnitude: 0.15, remainingMs: 999_999, sourceId: unit.id });
        unit.passiveFlags.hold = true;
      }
      const bloodLine = Number(unit.passiveFlags.kitBloodLine ?? 0.45);
      const bloodHaste = Number(unit.passiveFlags.kitBloodHaste ?? 0.25);
      const bloodPattern = HERO_BY_ID[unit.sourceId as HeroId]?.skillPattern === "H02";
      if (bloodPattern && unit.hp / unit.maxHp < bloodLine && !unit.passiveFlags.blood) {
        applyStatus(unit, { kind: "haste", magnitude: bloodHaste, remainingMs: 999_999, sourceId: unit.id });
        unit.passiveFlags.blood = true;
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
        // Only skip the auto-attack when a skill actually resolved this tick.
        if (skillEvents.some((event) => event.type === "skill:resolved")) continue;
      }
      if (ENEMY_BY_ID[unit.sourceId as keyof typeof ENEMY_BY_ID]?.kind === "boss" && unit.skillCooldownMs <= 0) {
        this.castBossSkill(unit);
        continue;
      }
      if (unit.attackCooldownMs <= 0) this.basicAttack(unit);
    }
  }

  private pushCombatEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      this.events.push(event);
      if (event.type === "unit:died") {
        const fallen = this.units.find(({ id }) => id === event.unitId);
        if (fallen) this.onEnemyKilled(fallen);
      }
    }
  }

  /** Trash kills fill the meter that eventually summons the boss. */
  private onEnemyKilled(enemy: UnitState): void {
    if (enemy.team !== "enemies") return;
    const kind = ENEMY_BY_ID[enemy.sourceId as keyof typeof ENEMY_BY_ID]?.kind ?? "normal";
    this.events.push({ type: "enemy:killed", kind });
    if (this.bossActive || ENEMY_BY_ID[enemy.sourceId as keyof typeof ENEMY_BY_ID]?.kind === "boss") return;
    if (this.trashKills >= this.trashQuota) return;
    this.trashKills += 1;
    this.events.push({ type: "boss:progress", progress: this.bossProgress });
  }

  private basicAttack(source: UnitState): void {
    const heroDef = source.team === "heroes" ? HERO_BY_ID[source.sourceId as HeroId] : undefined;
    const strategy =
      heroDef?.targetStrategy ??
      (source.team === "enemies" ? "frontmostEnemy" : "nearestEnemy");
    const target = selectTarget(source, this.units, strategy);
    if (!target || Math.abs(target.x - source.x) > engageRange(source) + 4) return;
    let emberStacks = Number(source.passiveFlags.emberStacks ?? 0);
    if (source.passiveFlags.ember) emberStacks = Math.max(emberStacks, 1);
    let multiplier = emberStacks > 0 ? 1.35 : 1;
    multiplier *= 1 + Number(source.passiveFlags.gearDamagePct ?? 0);
    multiplier *= schoolDamageMultiplier(source);
    multiplier *= elementDamageMultiplier(source);
    if (source.team === "heroes") {
      multiplier *= 1 + Number(source.passiveFlags.gearPrimaryAttackPct ?? 0);
    }
    if (target.hp / target.maxHp < 0.35) {
      multiplier += Number(source.passiveFlags.gearExecute ?? 0);
    }
    const enemyKind = ENEMY_BY_ID[target.sourceId as keyof typeof ENEMY_BY_ID]?.kind;
    if (enemyKind === "elite" || enemyKind === "boss") {
      multiplier *= 1 + Number(source.passiveFlags.gearEliteDamage ?? 0);
    }
    source.passiveFlags.ember = false;
    if (emberStacks > 0) source.passiveFlags.emberStacks = emberStacks - 1;
    const critMultiplier = 1.5 + Number(source.passiveFlags.gearCritDamagePct ?? 0) / 100;
    const roll = calculateDamage(
      source.attack * multiplier * outgoingElementMultiplier(source),
      target.defense,
      source.critChance,
      this.random,
      getStatusMagnitude(target, "armorBreak"),
      critMultiplier,
    );
    this.prepareGuardian(target);
    source.basicAttackCount += 1;
    source.attackCooldownMs = source.attackIntervalMs;
    this.events.push({
      type: "attack",
      sourceId: source.id,
      targetId: target.id,
      ranged: source.attackRange > 100,
    });
    const hit = resolveHit(target, roll.damage, this.random, source.damageElement);
    if (hit.outcome === "hit") {
      this.events.push({
        type: "damage",
        sourceId: source.id,
        targetId: target.id,
        amount: hit.amount,
        critical: roll.critical && !hit.blocked,
        element: source.damageElement,
      });
      const lifeOnHit = Number(source.passiveFlags.gearLifeOnHit ?? 0);
      if (source.team === "heroes" && lifeOnHit > 0 && source.alive) {
        applyHealing(source, lifeOnHit, false);
      }
      const lifeSteal = Number(source.passiveFlags.gearLifeStealPct ?? 0);
      if (source.team === "heroes" && lifeSteal > 0 && source.alive) {
        applyHealing(source, hit.amount * lifeSteal, false);
      }
      const bloodSteal = Number(source.passiveFlags.kitBloodStealPct ?? 0);
      const bloodLine = Number(source.passiveFlags.kitBloodLine ?? 0.45);
      if (
        source.team === "heroes" &&
        bloodSteal > 0 &&
        source.alive &&
        source.hp / source.maxHp < bloodLine
      ) {
        applyHealing(source, hit.amount * bloodSteal, false);
      }
      const thunderbrand = Number(source.passiveFlags.gearThunderbrand ?? 0);
      if (
        source.team === "heroes" &&
        thunderbrand > 0 &&
        source.basicAttackCount % 4 === 0
      ) {
        const bonusDamage = Math.round(source.attack * thunderbrand);
        const bonusHit = resolveHit(target, bonusDamage, this.random, source.damageElement);
        if (bonusHit.outcome === "hit") {
          this.events.push({
            type: "damage",
            sourceId: source.id,
            targetId: target.id,
            amount: bonusHit.amount,
            critical: false,
            element: source.damageElement,
          });
        }
      }
      const frostbiteChance = Number(source.passiveFlags.gearFrostbiteChance ?? 0);
      if (source.team === "heroes" && frostbiteChance > 0 && this.random.next() < frostbiteChance) {
        applyStatus(target, {
          kind: "slow",
          magnitude: 0.12,
          remainingMs: 2000,
          sourceId: source.id,
        });
        this.events.push({ type: "status:applied", targetId: target.id, kind: "slow" });
      }
      const sandscarChance = Number(source.passiveFlags.gearSandscarChance ?? 0);
      if (source.team === "heroes" && sandscarChance > 0 && this.random.next() < sandscarChance) {
        applyStatus(target, {
          kind: "armorBreak",
          magnitude: 0.12,
          remainingMs: 2000,
          sourceId: source.id,
        });
        this.events.push({ type: "status:applied", targetId: target.id, kind: "armorBreak" });
      }
      if (!target.alive) {
        this.events.push({ type: "unit:died", unitId: target.id });
        this.onEnemyKilled(target);
      }
      const thorns = Number(target.passiveFlags.gearThorns ?? 0);
      if (thorns > 0 && source.attackRange <= 80 && source.alive) {
        const reflected = Math.max(1, Math.round(target.attack * thorns));
        const thornsHit = resolveHit(source, reflected, this.random, "physical");
        if (thornsHit.outcome === "hit") {
          this.events.push({
            type: "damage",
            sourceId: target.id,
            targetId: source.id,
            amount: thornsHit.amount,
            critical: false,
            element: "physical",
          });
        }
      }
    }
    const rapidEvery = Math.max(1, Number(source.passiveFlags.kitRapidEvery ?? 4));
    if (
      HERO_BY_ID[source.sourceId as HeroId]?.skillPattern === "H05" &&
      source.basicAttackCount % rapidEvery === 0
    ) {
      applyStatus(source, { kind: "haste", magnitude: 0.2, remainingMs: 2500, sourceId: source.id });
    }
    if (
      ENEMY_BY_ID[source.sourceId as keyof typeof ENEMY_BY_ID]?.kind === "elite" &&
      source.basicAttackCount % 4 === 0
    ) {
      applyStatus(source, { kind: "damageReduction", magnitude: 0.2, remainingMs: 2000, sourceId: source.id });
    }
  }

  private castBossSkill(boss: UnitState): void {
    const targets = this.units
      .filter(({ team, alive }) => team === "heroes" && alive)
      .sort((a, b) => b.x - a.x)
      .slice(0, 2);
    this.events.push({ type: "skill:started", sourceId: boss.id, skillId: "root-smash" });
    for (const target of targets) {
      const roll = calculateDamage(
        boss.attack * 1.3 * outgoingElementMultiplier(boss),
        target.defense,
        boss.critChance,
        this.random,
        getStatusMagnitude(target, "armorBreak"),
      );
      this.prepareGuardian(target);
      const hit = resolveHit(target, roll.damage, this.random, boss.damageElement);
      if (hit.outcome === "hit") {
        this.events.push({
          type: "damage",
          sourceId: boss.id,
          targetId: target.id,
          amount: hit.amount,
          critical: roll.critical && !hit.blocked,
          element: boss.damageElement,
        });
      }
      applyStatus(target, { kind: "stun", magnitude: 1, remainingMs: 800, sourceId: boss.id });
      this.events.push({ type: "status:applied", targetId: target.id, kind: "stun" });
    }
    boss.skillCooldownMs = 5000;
    boss.skillCastCount += 1;
    this.events.push({ type: "skill:resolved", sourceId: boss.id, skillId: "root-smash", targetIds: targets.map(({ id }) => id) });
    if (boss.hp / boss.maxHp < 0.3 && !boss.passiveFlags.enraged) {
      applyStatus(boss, { kind: "haste", magnitude: 0.25, remainingMs: 999_999, sourceId: boss.id });
      boss.passiveFlags.enraged = true;
    }
  }

  private advanceWave(): void {
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
    for (const hero of this.units.filter(({ team }) => team === "heroes")) {
      const slotIndex = Number(hero.id.split("-")[1] ?? 0);
      const holdX = hero.x;
      hero.passiveFlags.holdX = holdX;
      hero.passiveFlags.entrySlot = slotIndex;
      hero.x = heroEntryStartX(holdX, slotIndex);
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

    let allArrived = true;
    for (const hero of this.units.filter(({ team, alive }) => team === "heroes" && alive)) {
      hero.targetId = null;
      const slotIndex = Number(hero.passiveFlags.entrySlot ?? 0);
      if (this.stateElapsedMs < slotIndex * HERO_ENTRY_STAGGER_MS) {
        allArrived = false;
        continue;
      }
      const holdX = Number(hero.passiveFlags.holdX ?? hero.x);
      if (hero.x < holdX) {
        hero.x = Math.min(holdX, hero.x + HERO_ENTRY_SPEED * (deltaMs / 1000));
        allArrived = false;
      } else {
        hero.x = holdX;
      }
    }
    if (allArrived) this.spawnCurrentWave();
  }

  private spawnCurrentWave(): void {
    const heroes = this.units.filter(({ team, alive }) => team === "heroes" && alive);
    const heroFront = Math.max(...heroes.map(({ x }) => x));
    const holdBase = heroFront + NEXT_ENCOUNTER_GAP;
    const summonBoss = !this.bossActive && this.bossProgress >= 1;
    if (summonBoss) this.bossActive = true;
    const enemies = createEnemyUnits(this.stage, this.wave, this.seed, holdBase, this.bossActive);
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
      const bossName = STAGE_DEFINITIONS[this.stage - 1]?.bossName ?? "古树守卫";
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

      // Already in someone's strike window — release the entry rail and let combat take over.
      if (heroes.some((hero) => Math.abs(hero.x - enemy.x) <= engageRange(hero) + 4
        || Math.abs(hero.x - enemy.x) <= engageRange(enemy) + 4)) {
        enemy.passiveFlags.entryDone = true;
        continue;
      }

      const holdX = Number(enemy.passiveFlags.holdX ?? enemy.x);
      if (enemy.x > holdX) {
        enemy.x = Math.max(holdX, enemy.x - ENEMY_ENTRY_SPEED * (deltaMs / 1000));
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
    levels: Partial<Record<HeroId, number>>,
    bonuses: Partial<Record<HeroId, HeroBattleBonus>>,
    startX: Partial<Record<HeroId, number>>,
  ): UnitState[] {
    return party.flatMap((heroId, index) => {
      if (!heroId) return [];
      const definition = HERO_BY_ID[heroId];
      const levelStats = getHeroStats(heroId, levels[heroId] ?? 1, this.heroGrowth[heroId]);
      const bonus = bonuses[heroId] ?? {};
      const maxHp = Math.round((levelStats.maxHp + (bonus.maxHp ?? 0)) * (1 + (bonus.maxHpPct ?? 0)));
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
        attack: Math.round((levelStats.attack + (bonus.attack ?? 0)) * (1 + (bonus.attackPct ?? 0))),
        defense: Math.round(
          (levelStats.defense + (bonus.defense ?? 0)) * (1 + (bonus.defensePct ?? 0)),
        ),
        damageElement: definition.damageElement,
        critChance: 0.05 + (bonus.critChance ?? 0),
        attackRange: definition.attackRange,
        moveSpeed: definition.moveSpeed * (1 + (bonus.moveSpeedPct ?? 0) / 100),
        attackIntervalMs: Math.round(definition.attackIntervalMs / (1 + (bonus.attackSpeedPct ?? 0) / 100)),
        attackCooldownMs: index * 100,
        skillCooldownMs: Math.round(
          (ACTIVE_SKILL_BY_HERO[heroId].cooldownMs ?? 6000) *
            (1 - Math.min(SKILL_COOLDOWN_REDUCTION_CAP, bonus.skillCooldownPct ?? 0)),
        ),
        ultimateCooldownMs: bonus.chosenSkillId
          ? Math.round(
              (HERO_SKILL_BY_ID[bonus.chosenSkillId as keyof typeof HERO_SKILL_BY_ID]?.cooldownMs ?? 12000) *
                (1 - Math.min(SKILL_COOLDOWN_REDUCTION_CAP, bonus.skillCooldownPct ?? 0)),
            )
          : Number.POSITIVE_INFINITY,
        targetId: null,
        shield: 0,
        statuses: [],
        alive: true,
        basicAttackCount: 0,
        skillCastCount: 0,
        chosenSkillId: bonus.chosenSkillId ?? null,
        passiveFlags: this.createGearFlags(bonus, definition.damageSchool, heroId),
      }];
    });
  }

  private createKitFlags(heroId: HeroId, bonus: HeroBattleBonus): Record<string, boolean | number> {
    return {
      kitUltimate: bonus.chosenSkillId ? 1 : 0,
      kitHoldLine: 0.4,
      kitBloodLine: 0.45,
      kitBloodHaste: 0.25,
      kitBloodStealPct: 0,
      kitEmberMax: 1,
      kitSplashBonus: 0,
      kitHealShieldCap: 0.1,
      kitPierceExtra: 0,
      kitHuntAmp: 0,
      kitHuntKillHaste: 0,
      kitSlowAmp: 0,
      kitFrostStun: 0,
      kitRapidEvery: 4,
      kitHpRegenMaxHpPct: bonus.hpRegenMaxHpPct ?? 0,
      kitWaveShieldPct: bonus.waveStartShieldPct ?? 0,
      kitWaveSkillCdrPct: bonus.waveStartSkillCdrPct ?? 0,
    };
  }

  private createGearFlags(
    bonus: HeroBattleBonus,
    damageSchool: "physical" | "magic" = "physical",
    heroId?: HeroId,
  ): Record<string, boolean | number> {
    return {
      ...(heroId ? this.createKitFlags(heroId, bonus) : {}),
      gearSkillDamage: bonus.skillDamagePct ?? 0,
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
      gearSkillCooldownPct: Math.min(SKILL_COOLDOWN_REDUCTION_CAP, bonus.skillCooldownPct ?? 0),
      gearHealPowerPct: bonus.healPowerPct ?? 0,
      gearGuardian: bonus.guardianShieldPct ?? 0,
      gearThorns: bonus.thornsPct ?? 0,
      gearRenewal: bonus.renewalPct ?? 0,
      gearFrostbiteChance: bonus.frostbiteChance ?? 0,
      gearSnowguard: bonus.snowguardShieldPct ?? 0,
      gearSnowguardShield: 0,
      gearFrostfocus: bonus.frostfocusCooldownPct ?? 0,
      gearFrostfocusTriggered: false,
      gearSandscarChance: bonus.sandscarChance ?? 0,
      gearMirageGuard: bonus.mirageGuardPct ?? 0,
      gearMirageGuardUsed: false,
      gearTailwind: bonus.tailwindPct ?? 0,
      gearThunderbrand: bonus.thunderbrandPct ?? 0,
      gearCloudveil: bonus.cloudveilShieldPct ?? 0,
      gearCloudveilUsed: false,
      gearStormward: bonus.stormwardShieldPct ?? 0,
      gearStormwardUsed: false,
      gearGuardianUsed: false,
    };
  }

  private applyGearFlags(unit: UnitState, bonus: HeroBattleBonus): void {
    const guardianUsed = unit.passiveFlags.gearGuardianUsed ?? false;
    const snowguardShield = unit.passiveFlags.gearSnowguardShield ?? 0;
    const frostfocusTriggered = unit.passiveFlags.gearFrostfocusTriggered ?? false;
    const mirageGuardUsed = unit.passiveFlags.gearMirageGuardUsed ?? false;
    const cloudveilUsed = unit.passiveFlags.gearCloudveilUsed ?? false;
    const stormwardUsed = unit.passiveFlags.gearStormwardUsed ?? false;
    const hold = unit.passiveFlags.hold ?? false;
    const blood = unit.passiveFlags.blood ?? false;
    const ember = unit.passiveFlags.ember ?? false;
    const emberStacks = unit.passiveFlags.emberStacks ?? 0;
    const heroId = unit.sourceId as HeroId;
    const hero = HERO_BY_ID[heroId];
    const school = hero?.damageSchool ?? "physical";
    Object.assign(unit.passiveFlags, this.createGearFlags(bonus, school, heroId));
    unit.passiveFlags.gearGuardianUsed = guardianUsed;
    unit.passiveFlags.gearSnowguardShield = snowguardShield;
    unit.passiveFlags.gearFrostfocusTriggered = frostfocusTriggered;
    unit.passiveFlags.gearMirageGuardUsed = mirageGuardUsed;
    unit.passiveFlags.gearCloudveilUsed = cloudveilUsed;
    unit.passiveFlags.gearStormwardUsed = stormwardUsed;
    unit.passiveFlags.hold = hold;
    unit.passiveFlags.blood = blood;
    unit.passiveFlags.ember = ember;
    unit.passiveFlags.emberStacks = emberStacks;
    unit.chosenSkillId = bonus.chosenSkillId ?? null;
    if (bonus.chosenSkillId) {
      if (!Number.isFinite(unit.ultimateCooldownMs)) unit.ultimateCooldownMs = 0;
    } else {
      unit.ultimateCooldownMs = Number.POSITIVE_INFINITY;
    }
  }

  private applyWaveEquipmentEffects(hero: UnitState): void {
    const snowguard = Number(hero.passiveFlags.gearSnowguard ?? 0);
    if (snowguard > 0) {
      const amount = Math.round(hero.maxHp * snowguard);
      hero.shield += amount;
      hero.passiveFlags.gearSnowguardShield = amount;
    }
    const frostfocus = Number(hero.passiveFlags.gearFrostfocus ?? 0);
    hero.passiveFlags.gearFrostfocusTriggered = false;
    if (frostfocus > 0) {
      hero.skillCooldownMs = Math.round(hero.skillCooldownMs * (1 - frostfocus));
      hero.passiveFlags.gearFrostfocusTriggered = true;
    }
    const tailwind = Number(hero.passiveFlags.gearTailwind ?? 0);
    if (tailwind > 0) {
      applyStatus(hero, {
        kind: "haste",
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
    const waveCdr = Number(hero.passiveFlags.kitWaveSkillCdrPct ?? 0);
    if (waveCdr > 0) {
      hero.skillCooldownMs = Math.round(hero.skillCooldownMs * (1 - waveCdr));
      if (Number.isFinite(hero.ultimateCooldownMs)) {
        hero.ultimateCooldownMs = Math.round(hero.ultimateCooldownMs * (1 - waveCdr));
      }
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
