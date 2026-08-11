import { GameStore } from "./GameStore";
import { applyItemToBonus } from "../progression/AffixBonuses";
import type { InventoryItem } from "../progression/EquipmentSystem";
import { generateStageRewards } from "../progression/RewardSystem";
import type { SaveDataV1 } from "../persistence/schema";
import { BattleSimulation, type HeroBattleBonus } from "../simulation/BattleSimulation";
import type { BattleEvent, HeroId } from "../simulation/types";
import { ITEM_BY_ID } from "../content/items";
import { activeSetBonuses, type SetId } from "../content/sets";
import { rarityHasLegendaryTrait } from "../content/rarities";

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
      if (events.some(({ type }) => type === "hero:leveled" || type === "item:equipped" || type === "item:unequipped")) {
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
    if (!this.resolved && freshEvents.some(({ type }) => type === "battle:victory")) {
      this.resolved = true;
      const stage = this.snapshot.stage;
      const rewards = generateStageRewards(stage, this.seed);
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
      heroBonuses: this.getEquipmentBonuses(save),
      heroStartX,
      startWithTravel,
      seed: this.seed,
    });
  }

  private refreshBattleHeroes(): void {
    const save = this.store.getState().save;
    const levels = Object.fromEntries(
      Object.entries(save.roster).map(([id, progress]) => [id, progress.level]),
    ) as Partial<Record<HeroId, number>>;
    this.battle.refreshHeroStats(levels, this.getEquipmentBonuses(save));
  }

  private getEquipmentBonuses(save: SaveDataV1): Partial<Record<HeroId, HeroBattleBonus>> {
    const result: Partial<Record<HeroId, HeroBattleBonus>> = {};
    for (const [rawHeroId, progress] of Object.entries(save.roster)) {
      const heroId = rawHeroId as HeroId;
      const items = Object.values(progress.equipment)
        .map((instanceId) => save.inventory.find((item) => item.instanceId === instanceId))
        .filter((item): item is InventoryItem => Boolean(item));
      const bonus: HeroBattleBonus = {};
      const setCounts: Partial<Record<SetId, number>> = {};
      for (const item of items) {
        applyItemToBonus(item, bonus);
        const definition = ITEM_BY_ID[item.definitionId];
        if (definition?.setId) {
          setCounts[definition.setId] = (setCounts[definition.setId] ?? 0) + 1;
        }
        const high = rarityHasLegendaryTrait(item.rarity);
        if (item.traitId === "swift") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 12 : 8);
        if (item.traitId === "tenacious") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.12 : 0.08);
        if (item.traitId === "precision") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.07 : 0.04);
        if (item.traitId === "focus") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + (high ? 0.1 : 0.06);
        if (item.traitId === "sharp") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.12 : 0.08);
        if (item.traitId === "execute") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + (high ? 0.18 : 0.12);
        if (item.traitId === "guardian") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.12 : 0.08);
        if (item.traitId === "thorns") bonus.thornsPct = (bonus.thornsPct ?? 0) + (high ? 0.12 : 0.08);
        if (item.traitId === "renewal") bonus.renewalPct = (bonus.renewalPct ?? 0) + (high ? 0.1 : 0.06);
        if (item.traitId === "frostbite") bonus.frostbiteChance = 0.15;
        if (item.traitId === "snowguard") bonus.snowguardShieldPct = 0.06;
        if (item.traitId === "frostfocus") bonus.frostfocusCooldownPct = 0.18;
        if (item.traitId === "sandscar") bonus.sandscarChance = 0.15;
        if (item.traitId === "mirageguard") bonus.mirageGuardPct = 0.2;
        if (item.traitId === "tailwind") bonus.tailwindPct = 0.15;
        if (item.traitId === "thunderbrand") bonus.thunderbrandPct = 0.35;
        if (item.traitId === "cloudveil") bonus.cloudveilShieldPct = 0.12;
        if (item.traitId === "stormward") bonus.stormwardShieldPct = 0.1;
        if (item.traitId === "aegis") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + (high ? 0.09 : 0.06);
        if (item.traitId === "keen") bonus.critChance = (bonus.critChance ?? 0) + (high ? 0.05 : 0.03);
        if (item.traitId === "fleet") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + (high ? 10 : 6);
        if (item.traitId === "sturdy") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + (high ? 0.1 : 0.06);
        if (item.traitId === "sanguine") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + (high ? 0.1 : 0.06);
        if (item.traitId === "warding") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + (high ? 0.05 : 0.03);
        if (item.traitId === "insight") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + (high ? 0.08 : 0.05);
        // Ch5–10 chapter traits (content-complete stubs; tune later)
        if (item.traitId === "bogvenom") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + 0.08;
        if (item.traitId === "mireguard") bonus.snowguardShieldPct = 0.07;
        if (item.traitId === "fenfocus") bonus.frostfocusCooldownPct = 0.15;
        if (item.traitId === "emberbrand") bonus.thunderbrandPct = 0.28;
        if (item.traitId === "ashplate") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + 0.04;
        if (item.traitId === "cinderfocus") bonus.skillDamagePct = (bonus.skillDamagePct ?? 0) + 0.08;
        if (item.traitId === "tidemark") bonus.frostbiteChance = 0.12;
        if (item.traitId === "saltguard") bonus.guardianShieldPct = (bonus.guardianShieldPct ?? 0) + 0.07;
        if (item.traitId === "seafocus") bonus.critDamagePct = (bonus.critDamagePct ?? 0) + 12;
        if (item.traitId === "wailbrand") bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + 0.1;
        if (item.traitId === "barrowguard") bonus.maxHpPct = (bonus.maxHpPct ?? 0) + 0.08;
        if (item.traitId === "gravefocus") bonus.executeDamagePct = (bonus.executeDamagePct ?? 0) + 0.1;
        if (item.traitId === "fangbrand") bonus.critChance = (bonus.critChance ?? 0) + 0.04;
        if (item.traitId === "stoneguard") bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + 0.05;
        if (item.traitId === "peakfocus") bonus.damagePct = (bonus.damagePct ?? 0) + 0.08;
        if (item.traitId === "northbrand") bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + 8;
        if (item.traitId === "gateguard") bonus.cloudveilShieldPct = 0.1;
        if (item.traitId === "galefocus") bonus.skillCooldownPct = (bonus.skillCooldownPct ?? 0) + 0.07;
      }
      for (const setBonus of activeSetBonuses(setCounts)) {
        if (setBonus.lifePct) bonus.maxHpPct = (bonus.maxHpPct ?? 0) + setBonus.lifePct / 100;
        if (setBonus.damagePct) bonus.damagePct = (bonus.damagePct ?? 0) + setBonus.damagePct / 100;
        if (setBonus.damageReductionPct) {
          bonus.damageReductionPct = (bonus.damageReductionPct ?? 0) + setBonus.damageReductionPct / 100;
        }
        if (setBonus.attackSpeedPct) bonus.attackSpeedPct = (bonus.attackSpeedPct ?? 0) + setBonus.attackSpeedPct;
        if (setBonus.critChancePct) bonus.critChance = (bonus.critChance ?? 0) + setBonus.critChancePct / 100;
        if (setBonus.critDamagePct) bonus.critDamagePct = (bonus.critDamagePct ?? 0) + setBonus.critDamagePct;
        if (setBonus.eliteDamagePct) bonus.eliteDamagePct = (bonus.eliteDamagePct ?? 0) + setBonus.eliteDamagePct / 100;
      }
      result[heroId] = bonus;
    }
    return result;
  }
}
