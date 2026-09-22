import {
  DUNGEON_BY_ID,
  EXPEDITION_STAMINA_PER_HOUR,
  getExpeditionRequirements,
  getExpeditionEventIntervalMs,
  isDailyDungeonOpen,
  isExpeditionFeatureAvailable,
  isDungeonUnlocked,
  type DungeonDefinition,
  type DungeonId,
  type ExpeditionRequirement,
} from "../content/dungeons";
import { HERO_BY_ID } from "../content/heroes";
import type { MaterialId } from "../content/materials";
import type { DungeonRun, HeroProgress, SaveDataV1 } from "../domain/save/SaveData";
import { getEquipmentBonuses, getHeroCombatDisplayStats } from "./EquipmentBonuses";
import { heroGrowthFromProgress } from "./HeroProgression";
import { SeededRandom } from "../simulation/RandomSource";
import type { HeroId } from "../simulation/types";

export interface DungeonClearReward {
  dungeonId: DungeonId;
  gold: number;
  exp: number;
  materials: Partial<Record<MaterialId, number>>;
}

export type DungeonRunStatus = "idle" | "running" | "ready";

export interface DungeonRunProgress {
  completedSteps: number;
  rewardSteps: number;
  eventSteps: number;
  totalSteps: number;
  remainingStamina: number;
  maxStamina: number;
  returned: boolean;
}

export type DungeonRunEventKind =
  | "battle-victory"
  | "battle-defeat"
  | "recovery"
  | "treasure"
  | "discovery";

export interface DungeonRunEvent {
  step: number;
  occurredAt: number;
  kind: DungeonRunEventKind;
  /** Actual stamina change after applying the event. Negative values consume stamina. */
  staminaChange: number;
  remainingStamina: number;
  reward?: DungeonClearReward;
}

export interface DungeonRunDetails {
  progress: DungeonRunProgress;
  accumulatedRewards: DungeonClearReward;
  events: DungeonRunEvent[];
  nextEventAt: number | null;
}

type SimulatedRun = DungeonRunProgress;

interface ExpeditionStep {
  kind: DungeonRunEventKind;
  staminaChange: number;
  grantsReward: boolean;
}

export const EXPEDITION_BASE_STAMINA = 100;
export const EXPEDITION_STAMINA_PER_LEVEL = 2;
export const EXPEDITION_STAMINA_PER_STAR = 20;
export const EXPEDITION_STAMINA_PER_HP_GROWTH = 30;
export const EXPEDITION_STAMINA_PER_ATTACK_GROWTH = 30;

export interface HeroExpeditionStamina {
  base: number;
  level: number;
  stars: number;
  maxHp: number;
  attack: number;
  environment: number;
  total: number;
  environmentFavored: boolean;
}

export interface ExpeditionRequirementProgress {
  requirement: ExpeditionRequirement;
  matched: number;
  required: number;
  satisfied: boolean;
}

export function heroMatchesExpeditionRequirement(
  heroId: HeroId,
  requirement: ExpeditionRequirement,
): boolean {
  const hero = HERO_BY_ID[heroId];
  if (!hero) return false;
  switch (requirement.kind) {
    case "gender":
      return requirement.allowed.includes(hero.gender);
    case "range":
      return requirement.allowed.includes(hero.combatRange);
    case "role":
      return requirement.allowed.includes(hero.expeditionRole);
    case "element":
      return requirement.allowed.includes(hero.damageElement);
  }
}

export function getExpeditionRequirementProgress(
  dungeon: DungeonDefinition,
  dateKey: string,
  heroIds: readonly HeroId[],
): ExpeditionRequirementProgress[] {
  return getExpeditionRequirements(dungeon.id, dateKey).map((requirement) => {
    const matched = heroIds.filter((heroId) => heroMatchesExpeditionRequirement(heroId, requirement)).length;
    const required = requirement.count === "all" ? dungeon.partySize : requirement.count;
    return {
      requirement,
      matched,
      required,
      satisfied: matched >= required,
    };
  });
}

export function rollDungeonRewards(
  dungeon: DungeonDefinition,
  seed: number,
  rewardStepIndex = 0,
): DungeonClearReward {
  const random = new SeededRandom(seed);
  const result: DungeonClearReward = {
    dungeonId: dungeon.id,
    gold: 0,
    exp: 0,
    materials: {},
  };
  const rewardKindRoll = rewardStepIndex === 0 ? 0 : random.next();
  if (rewardKindRoll >= 0.55) {
    if (rewardKindRoll < 0.8) result.gold = dungeon.gold;
    else result.exp = dungeon.exp;
    return result;
  }

  const drop = random.pick(dungeon.drops);
  const materials: Partial<Record<MaterialId, number>> = {};
  let amount = drop.amount;
  if (random.next() < drop.bonusChance) amount += 1;
  materials[drop.materialId] = amount;
  result.materials = materials;
  return result;
}

export function getActiveDungeon(dungeonId: string | null | undefined): DungeonDefinition | null {
  if (!dungeonId || !(dungeonId in DUNGEON_BY_ID)) return null;
  return DUNGEON_BY_ID[dungeonId as DungeonId];
}

export function getDungeonRun(runs: readonly DungeonRun[], dungeonId: DungeonId): DungeonRun | undefined {
  return runs.find((run) => run.dungeonId === dungeonId);
}

export function calculateExpeditionStamina(
  save: SaveDataV1,
  dungeon: DungeonDefinition,
  heroIds: readonly HeroId[],
): number {
  const equipmentBonuses = getEquipmentBonuses(save);
  return heroIds.reduce(
    (total, heroId) => total + calculateHeroExpeditionStamina(save, dungeon, heroId, equipmentBonuses).total,
    0,
  );
}

export function calculateHeroExpeditionStamina(
  save: SaveDataV1,
  dungeon: DungeonDefinition,
  heroId: HeroId,
  equipmentBonuses = getEquipmentBonuses(save),
): HeroExpeditionStamina {
  const progress = save.roster[heroId];
  const hero = HERO_BY_ID[heroId];
  if (!progress || !hero) {
    return { base: 0, level: 0, stars: 0, maxHp: 0, attack: 0, environment: 0, total: 0, environmentFavored: false };
  }
  const stats = getHeroCombatDisplayStats(
    heroId,
    progress.level,
    equipmentBonuses[heroId] ?? {},
    heroGrowthFromProgress(progress),
  );
  const hpGrowth = Math.max(0, stats.maxHp / hero.maxHp - 1);
  const attackGrowth = Math.max(0, stats.attack / hero.attack - 1);
  const base = EXPEDITION_BASE_STAMINA;
  const level = Math.max(0, progress.level - 1) * EXPEDITION_STAMINA_PER_LEVEL;
  const stars = Math.max(0, progress.stars) * EXPEDITION_STAMINA_PER_STAR;
  const maxHp = Math.round(hpGrowth * EXPEDITION_STAMINA_PER_HP_GROWTH);
  const attack = Math.round(attackGrowth * EXPEDITION_STAMINA_PER_ATTACK_GROWTH);
  const beforeEnvironment = base + level + stars + maxHp + attack;
  const environmentFavored = dungeon.environment.favoredElements.includes(hero.damageElement);
  const environment = environmentFavored
    ? Math.round(beforeEnvironment * dungeon.environment.staminaBonusPct)
    : 0;
  return {
    base,
    level,
    stars,
    maxHp,
    attack,
    environment,
    total: beforeEnvironment + environment,
    environmentFavored,
  };
}

function expeditionStep(
  run: Pick<DungeonRun, "startedAt">,
  dungeon: DungeonDefinition,
  stepIndex: number,
  remainingStamina: number,
  maxStamina: number,
): ExpeditionStep {
  const seed = (run.startedAt ^ dungeon.powerStage ^ Math.imul(stepIndex + 1, 0x45d9f3b)) >>> 0;
  const random = new SeededRandom(seed);
  const eventRoll = stepIndex === 0 ? 0 : random.next();
  if (eventRoll < 0.34) {
    return {
      kind: "battle-victory",
      staminaChange: -Math.max(1, Math.round(dungeon.staminaCost * (0.85 + random.next() * 0.3))),
      grantsReward: true,
    };
  }
  if (eventRoll < 0.5) {
    return {
      kind: "battle-defeat",
      staminaChange: -Math.max(1, Math.round(dungeon.staminaCost * (1.25 + random.next() * 0.35))),
      grantsReward: false,
    };
  }
  if (eventRoll < 0.65 && remainingStamina < maxStamina) {
    return {
      kind: "recovery",
      staminaChange: Math.max(1, Math.round(dungeon.staminaCost * (0.35 + random.next() * 0.2))),
      grantsReward: false,
    };
  }
  if (eventRoll < 0.84) {
    return {
      kind: "treasure",
      staminaChange: 0,
      grantsReward: true,
    };
  }
  return {
    kind: "discovery",
    staminaChange: -Math.max(1, Math.round(dungeon.staminaCost * (0.55 + random.next() * 0.2))),
    grantsReward: false,
  };
}

function expeditionStepIntervalMs(
  run: Pick<DungeonRun, "startedAt">,
  dungeon: DungeonDefinition,
  stepIndex: number,
): number {
  const seed = (run.startedAt ^ dungeon.powerStage ^ Math.imul(stepIndex + 1, 0x119de1f3)) >>> 0;
  const random = new SeededRandom(seed);
  const baseInterval = getExpeditionEventIntervalMs();
  const interval = baseInterval * (0.8 + random.next() * 0.4);
  return Math.round(interval / 15_000) * 15_000;
}

function applyStaminaChange(current: number, maxStamina: number, change: number): number {
  return Math.max(0, Math.min(maxStamina, current + change));
}

function simulateDungeonRun(
  run: DungeonRun,
  dungeon: DungeonDefinition,
  stepLimit: number,
  endAt = Number.POSITIVE_INFINITY,
): SimulatedRun {
  let remainingStamina = run.maxStamina;
  let rewardSteps = 0;
  let eventSteps = 0;
  let completedSteps = 0;
  let nextEventAt = run.startedAt;
  const safeLimit = Math.min(10_000, Math.max(0, Math.floor(stepLimit)));
  while (completedSteps < safeLimit && remainingStamina > 0) {
    nextEventAt += expeditionStepIntervalMs(run, dungeon, completedSteps);
    if (nextEventAt > endAt) break;
    const step = expeditionStep(run, dungeon, completedSteps, remainingStamina, run.maxStamina);
    remainingStamina = applyStaminaChange(remainingStamina, run.maxStamina, step.staminaChange);
    if (step.grantsReward) {
      rewardSteps += 1;
    } else {
      eventSteps += 1;
    }
    completedSteps += 1;
  }
  return {
    completedSteps,
    rewardSteps,
    eventSteps,
    totalSteps: completedSteps,
    remainingStamina,
    maxStamina: run.maxStamina,
    returned: remainingStamina <= 0,
  };
}

export function estimateExpeditionDurationMs(maxStamina: number): number {
  return Math.max(0, maxStamina) / EXPEDITION_STAMINA_PER_HOUR * 60 * 60_000;
}

export function getDungeonRunProgress(run: DungeonRun, now = Date.now()): DungeonRunProgress {
  const dungeon = DUNGEON_BY_ID[run.dungeonId];
  const current = simulateDungeonRun(run, dungeon, 10_000, now);
  const total = current.returned ? current : simulateDungeonRun(run, dungeon, 10_000);
  return { ...current, totalSteps: total.completedSteps };
}

export function getDungeonRunDetails(run: DungeonRun, now = Date.now()): DungeonRunDetails {
  const dungeon = DUNGEON_BY_ID[run.dungeonId];
  const progress = getDungeonRunProgress(run, now);
  const accumulatedRewards: DungeonClearReward = {
    dungeonId: dungeon.id,
    gold: 0,
    exp: 0,
    materials: {},
  };
  const events: DungeonRunEvent[] = [];
  let remainingStamina = run.maxStamina;
  let occurredAt = run.startedAt;

  for (let stepIndex = 0; stepIndex < progress.completedSteps; stepIndex += 1) {
    occurredAt += expeditionStepIntervalMs(run, dungeon, stepIndex);
    const step = expeditionStep(run, dungeon, stepIndex, remainingStamina, run.maxStamina);
    const nextStamina = applyStaminaChange(remainingStamina, run.maxStamina, step.staminaChange);
    const actualStaminaChange = nextStamina - remainingStamina;
    remainingStamina = nextStamina;
    const reward = step.grantsReward
      ? rollDungeonRewards(
        dungeon,
        (run.startedAt ^ dungeon.powerStage ^ Math.imul(stepIndex + 1, 0x27d4eb2d)) >>> 0,
        stepIndex,
      )
      : undefined;
    if (reward) {
      accumulatedRewards.gold += reward.gold;
      accumulatedRewards.exp += reward.exp;
      for (const [materialId, amount] of Object.entries(reward.materials)) {
        if (!amount) continue;
        const id = materialId as MaterialId;
        accumulatedRewards.materials[id] = (accumulatedRewards.materials[id] ?? 0) + amount;
      }
    }
    events.push({
      step: stepIndex + 1,
      occurredAt,
      kind: step.kind,
      staminaChange: actualStaminaChange,
      remainingStamina,
      reward,
    });
  }

  return {
    progress,
    accumulatedRewards,
    events,
    nextEventAt: progress.returned
      ? null
      : occurredAt + expeditionStepIntervalMs(run, dungeon, progress.completedSteps),
  };
}

export function rollDungeonRunRewards(
  run: DungeonRun,
  now = Date.now(),
): DungeonClearReward {
  return getDungeonRunDetails(run, now).accumulatedRewards;
}

export function getBusyHeroIds(runs: readonly DungeonRun[]): Set<HeroId> {
  return new Set(runs.flatMap((run) => run.heroIds));
}

export function getExploringHeroIds(party: SaveDataV1["party"]): Set<HeroId> {
  return new Set(party.filter((id): id is HeroId => id != null));
}

export function isHeroBusy(runs: readonly DungeonRun[], heroId: HeroId): boolean {
  return runs.some((run) => run.heroIds.includes(heroId));
}

export function isDungeonRunReady(run: DungeonRun, now = Date.now()): boolean {
  return getDungeonRunProgress(run, now).returned;
}

export function getDungeonRunStatus(run: DungeonRun | undefined, now = Date.now()): DungeonRunStatus {
  if (!run) return "idle";
  return isDungeonRunReady(run, now) ? "ready" : "running";
}

export function countIdleUnlockedHeroes(
  roster: Record<HeroId, HeroProgress>,
  busyHeroes: ReadonlySet<HeroId>,
): number {
  return Object.values(roster).filter((progress) => progress.unlocked && !busyHeroes.has(progress.heroId)).length;
}

export function removeHeroesFromParty(
  party: SaveDataV1["party"],
  heroIds: readonly HeroId[],
): SaveDataV1["party"] {
  const removing = new Set(heroIds);
  return party.map((id) => (id && removing.has(id) ? null : id)) as SaveDataV1["party"];
}

export function fillEmptyParty(
  party: SaveDataV1["party"],
  roster: Record<HeroId, HeroProgress>,
  busyHeroes: ReadonlySet<HeroId>,
): SaveDataV1["party"] {
  const next = [...party] as SaveDataV1["party"];
  const assigned = new Set(next.filter((id): id is HeroId => id !== null));
  const idleHeroes = Object.values(roster)
    .filter((progress) => progress.unlocked && !busyHeroes.has(progress.heroId) && !assigned.has(progress.heroId))
    .map((progress) => progress.heroId);
  for (let index = 0; index < next.length && idleHeroes.length > 0; index += 1) {
    if (next[index] === null) next[index] = idleHeroes.shift() ?? null;
  }
  return next;
}

export function validateDungeonDispatch(options: {
  dungeonId: DungeonId;
  heroIds: readonly HeroId[];
  save: SaveDataV1;
  dateKey: string;
  now?: number;
}): string | null {
  const dungeon = DUNGEON_BY_ID[options.dungeonId];
  if (!isExpeditionFeatureAvailable(options.save.highestClearedStage)) {
    return "通关主线 2-12 后解锁远征";
  }
  if (!dungeon || !isDungeonUnlocked(dungeon, options.save.highestClearedStage)) {
    return "远征尚未解锁";
  }
  if (!isDailyDungeonOpen(options.dungeonId, options.dateKey)) {
    return "今日未开放该远征";
  }
  if (getDungeonRun(options.save.dungeonRuns, options.dungeonId)) {
    return "该远征正在派遣中";
  }
  const heroes = [...new Set(options.heroIds)];
  if (heroes.length !== dungeon.partySize || heroes.length !== options.heroIds.length) {
    return `需要派出 ${dungeon.partySize} 名英雄`;
  }
  const failedRequirement = getExpeditionRequirementProgress(dungeon, options.dateKey, heroes)
    .find((progress) => !progress.satisfied);
  if (failedRequirement) {
    return `未满足派遣条件：${failedRequirement.requirement.label}`;
  }
  const busy = getBusyHeroIds(options.save.dungeonRuns);
  const exploring = getExploringHeroIds(options.save.party);
  for (const heroId of heroes) {
    if (!options.save.roster[heroId]?.unlocked) return "英雄未解锁";
    if (busy.has(heroId)) return "该英雄正在远征中";
    if (exploring.has(heroId)) return "主线队伍中的英雄无法派遣";
  }
  const nextBusy = new Set(busy);
  for (const heroId of heroes) nextBusy.add(heroId);
  if (countIdleUnlockedHeroes(options.save.roster, nextBusy) < 1) {
    return "至少留一名英雄继续主线";
  }
  return null;
}
