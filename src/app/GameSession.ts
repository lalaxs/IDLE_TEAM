import { GameStore } from "./GameStore";
import { getAdVipBenefits } from "../content/adVip";
import { getEquipmentBonuses } from "../progression/EquipmentBonuses";
import { getHeroStats, heroGrowthFromProgress } from "../progression/HeroProgression";
import { getChestProgressBonus, getGoldDropChance } from "../progression/AbilitySystem";
import { StageRewardTracker } from "../progression/RewardSystem";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { BattleSimulation, type HeroBattleBonus, type HeroCombatStats } from "../simulation/BattleSimulation";
import type { BattleEvent, HeroId } from "../simulation/types";
import type { EquipmentChestTier } from "../progression/LootChestSystem";

export class GameSession {
  readonly store: GameStore;
  private battle: BattleSimulation;
  private rewardTracker: StageRewardTracker;
  private seed: number;
  private resolved = false;
  private events: BattleEvent[] = [];
  private unsubscribeStore: (() => void) | null;

  constructor(save: SaveDataV1, seed = Date.now() & 0xfffffff) {
    this.store = new GameStore(save);
    this.seed = seed;
    this.battle = this.createBattle();
    this.rewardTracker = this.createRewardTracker();
    this.unsubscribeStore = this.store.subscribe((_state, events) => {
      if (events.some(({ type }) =>
        type === "hero:leveled" ||
        type === "hero:starred" ||
        type === "hero:ascended" ||
        type === "hero:talentUpgraded" ||
        type === "hero:skillChosen" ||
        type === "hero:augmentationTargetChanged" ||
        type === "item:equipped" ||
        type === "item:unequipped" ||
        type === "ability:upgraded"
      )) {
        this.refreshBattleHeroes();
      }
    });
  }

  destroy(): void {
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.events = [];
  }

  get snapshot() {
    return this.battle.getSnapshot();
  }

  step(deltaMs: number): void {
    this.battle.step(deltaMs);
    const freshEvents = this.battle.drainEvents();
    for (const event of freshEvents) {
      this.events.push(event);
      if (event.type !== "enemy:killed") continue;
      const save = this.store.getState().save;
      const drop = this.rewardTracker.rollEnemy(event.kind, getGoldDropChance(save.abilities), getAdVipBenefits(save.adVip.watchedAds).equipmentBonus);
      if (drop.gold > 0) {
        this.events.push({
          type: "loot:dropped",
          sourceUnitId: event.unitId,
          worldX: event.worldX,
          worldY: event.worldY,
          drop: "gold",
          attackId: event.attackId,
          skillCastId: event.skillCastId,
        });
      }
      if (drop.item) {
        this.events.push({
          type: "loot:dropped",
          sourceUnitId: event.unitId,
          worldX: event.worldX,
          worldY: event.worldY,
          drop: "equipment",
          definitionId: drop.item.definitionId,
          rarity: drop.item.rarity,
          attackId: event.attackId,
          skillCastId: event.skillCastId,
        });
      }
    }
    if (!this.resolved && freshEvents.some(({ type }) => type === "battle:victory")) {
      this.resolved = true;
      const stage = this.snapshot.stage;
      const save = this.store.getState().save;
      const rewards = this.rewardTracker.settle(save.abilities);
      this.store.dispatch({
        type: "stage:victory",
        stage,
        gold: rewards.gold,
        exp: rewards.exp,
        items: rewards.items,
      });
    }
  }

  drainEvents(): BattleEvent[] {
    return this.events.splice(0);
  }

  restart(): void {
    this.seed += 1;
    this.resolved = false;
    this.events = [];
    this.battle = this.createBattle({}, true);
    this.rewardTracker = this.createRewardTracker();
  }

  continueToNextStage(): void {
    this.seed += 1;
    this.resolved = false;
    this.events = [];
    // Fresh left-edge entry — do not reuse the previous fight's clumped X.
    this.battle = this.createBattle({}, true);
    this.rewardTracker = this.createRewardTracker();
  }

  debugDefeatEnemies(): void {
    this.battle.debugDefeatEnemies();
  }

  debugDefeatHeroes(): void {
    this.battle.debugDefeatHeroes();
  }

  debugGrantAllEquipmentChests(): void {
    const tiers: EquipmentChestTier[] = ["wood", "bronze", "silver", "gold"];
    this.store.dispatch({ type: "debug:grantLootChests", tiers });
  }

  private createBattle(
    heroStartX: Partial<Record<HeroId, number>> = {},
    startWithTravel = false,
  ): BattleSimulation {
    const save = this.store.getState().save;
    const heroStats = this.buildHeroStats(save);
    return new BattleSimulation({
      stage: save.currentStage,
      difficulty: save.selectedDifficulty,
      party: save.party,
      heroStats,
      heroBonuses: this.buildHeroBonuses(save),
      heroStartX,
      startWithTravel,
      seed: this.seed,
      bossProgressBonus: getChestProgressBonus(save.abilities),
    });
  }

  private createRewardTracker(): StageRewardTracker {
    const save = this.store.getState().save;
    const firstClear = save.currentStage
      > save.difficultyProgress[save.selectedDifficulty].highestClearedStage;
    return new StageRewardTracker(
      save.currentStage,
      this.seed,
      save.selectedDifficulty,
      firstClear,
    );
  }

  private buildHeroBonuses(save: SaveDataV1): Partial<Record<HeroId, HeroBattleBonus>> {
    return getEquipmentBonuses(save);
  }

  private buildHeroStats(save: SaveDataV1): Partial<Record<HeroId, HeroCombatStats>> {
    return Object.fromEntries(Object.entries(save.roster).map(([id, progress]) => [
      id,
      getHeroStats(id as HeroId, progress.level, heroGrowthFromProgress(progress)),
    ])) as Partial<Record<HeroId, HeroCombatStats>>;
  }

  private refreshBattleHeroes(): void {
    const save = this.store.getState().save;
    this.battle.refreshHeroStats(this.buildHeroStats(save), this.buildHeroBonuses(save));
    this.battle.setBossProgressBonus(getChestProgressBonus(save.abilities));
  }
}
