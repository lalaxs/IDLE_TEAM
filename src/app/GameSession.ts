import { GameStore } from "./GameStore";
import { getEquipmentBonuses } from "../progression/EquipmentBonuses";
import { getChestProgressBonus } from "../progression/AbilitySystem";
import { getLootChestKillCharge } from "../progression/LootChestSystem";
import { generateStageRewards } from "../progression/RewardSystem";
import type { SaveDataV1 } from "../persistence/schema";
import { BattleSimulation } from "../simulation/BattleSimulation";
import type { BattleEvent, HeroId } from "../simulation/types";

export class GameSession {
  readonly store: GameStore;
  private battle: BattleSimulation;
  private seed: number;
  private resolved = false;
  private events: BattleEvent[] = [];

  constructor(save: SaveDataV1, seed = Date.now() & 0xfffffff) {
    this.store = new GameStore(save);
    this.seed = seed;
    this.battle = this.createBattle();
    this.store.subscribe((_state, events) => {
      if (events.some(({ type }) => type === "hero:leveled" || type === "item:equipped" || type === "item:unequipped" || type === "ability:upgraded")) {
        this.refreshBattleHeroes();
      }
    });
  }

  get snapshot() {
    return this.battle.getSnapshot();
  }

  step(deltaMs: number): void {
    this.battle.step(deltaMs);
    const freshEvents = this.battle.drainEvents();
    this.events.push(...freshEvents);
    let chestCharge = 0;
    for (const event of freshEvents) {
      if (event.type === "enemy:killed") chestCharge += getLootChestKillCharge(event.kind);
    }
    if (chestCharge > 0) {
      this.store.dispatch({ type: "lootChest:charge", amount: chestCharge });
    }
    if (!this.resolved && freshEvents.some(({ type }) => type === "battle:victory")) {
      this.resolved = true;
      const stage = this.snapshot.stage;
      const rewards = generateStageRewards(stage, this.seed, this.store.getState().save.abilities);
      this.store.dispatch({ type: "stage:victory", stage, gold: rewards.gold, items: rewards.items });
      this.events.push(...rewards.items.map((item) => ({ type: "loot:revealed" as const, itemId: item.instanceId })));
    }
  }

  drainEvents(): BattleEvent[] {
    return this.events.splice(0);
  }

  restart(stage = this.store.getState().save.currentStage): void {
    this.store.getState().save.currentStage = stage;
    this.seed += 1;
    this.resolved = false;
    this.events = [];
    this.battle = this.createBattle({}, true);
  }

  continueToNextStage(): void {
    this.seed += 1;
    this.resolved = false;
    this.events = [];
    // Fresh left-edge entry — do not reuse the previous fight's clumped X.
    this.battle = this.createBattle({}, true);
  }

  debugDefeatEnemies(): void {
    this.battle.debugDefeatEnemies();
  }

  debugDefeatHeroes(): void {
    this.battle.debugDefeatHeroes();
  }

  private createBattle(
    heroStartX: Partial<Record<HeroId, number>> = {},
    startWithTravel = false,
  ): BattleSimulation {
    const save = this.store.getState().save;
    const heroLevels = Object.fromEntries(
      Object.entries(save.roster).map(([id, progress]) => [id, progress.level]),
    ) as Partial<Record<HeroId, number>>;
    return new BattleSimulation({
      stage: save.currentStage,
      party: save.party,
      heroLevels,
      heroBonuses: getEquipmentBonuses(save),
      heroStartX,
      startWithTravel,
      seed: this.seed,
      bossProgressBonus: getChestProgressBonus(save.abilities),
    });
  }

  private refreshBattleHeroes(): void {
    const save = this.store.getState().save;
    const levels = Object.fromEntries(
      Object.entries(save.roster).map(([id, progress]) => [id, progress.level]),
    ) as Partial<Record<HeroId, number>>;
    this.battle.refreshHeroStats(levels, getEquipmentBonuses(save));
    this.battle.setBossProgressBonus(getChestProgressBonus(save.abilities));
  }
}
