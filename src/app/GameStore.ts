import type { AppTab, GameAction } from "./actions";
import type { AppEvent, SummonPullResult } from "./events";
import { getStarUpgradeCost, getUpgradeCost, MAX_HERO_STARS } from "../progression/HeroProgression";
import {
  collectEquippedItemIds,
  getItemScore,
  getSalvageGold,
  insertInventoryItem,
  sortInventoryItems,
} from "../progression/EquipmentSystem";
import { craftAlchemyItem } from "../progression/AlchemySystem";
import { RARITY_LABELS } from "../content/rarities";
import { createShopOffers } from "../progression/ShopSystem";
import {
  getAbilityUpgradeCost,
  getBackpackCapacity,
  getChestProgressBonus,
} from "../progression/AbilitySystem";
import {
  applyLootChestCharge,
  getLootChestProgress,
} from "../progression/LootChestSystem";
import { ABILITY_BY_ID } from "../content/abilities";
import { SeededRandom } from "../simulation/RandomSource";
import type { SaveDataV1 } from "../persistence/schema";
import type { HeroId } from "../simulation/types";

export interface GameStoreState {
  save: SaveDataV1;
  ui: {
    activeTab: AppTab;
    selectedHeroId: HeroId;
    selectedItemId: string | null;
    modal: string | null;
    toast: string | null;
  };
  revision: number;
}

type Listener = (state: GameStoreState, events: readonly AppEvent[]) => void;

export class GameStore {
  private state: GameStoreState;
  private listeners = new Set<Listener>();

  constructor(save: SaveDataV1) {
    if (save.shop.offers.length === 0) {
      save.shop.offers = createShopOffers(save.shop.dateKey, save.highestUnlockedStage);
    }
    this.state = {
      save,
      ui: {
        activeTab: "inventory",
        selectedHeroId: "H01",
        selectedItemId: null,
        modal: save.tutorialCompleted ? null : "tutorial",
        toast: null,
      },
      revision: 0,
    };
  }

  getState(): GameStoreState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action: GameAction): void {
    const events: AppEvent[] = [];
    const save = this.state.save;
    if (action.type === "ui:selectTab") {
      this.state.ui.activeTab = action.tab;
    } else if (action.type === "battle:setSpeed") {
      save.settings.battleSpeed = action.speed;
    } else if (action.type === "party:commit") {
      const heroes = action.party.filter((value): value is HeroId => value !== null);
      if (heroes.length === 0) throw new Error("Party must keep at least one hero");
      if (new Set(heroes).size !== heroes.length) throw new Error("Party contains duplicate heroes");
      if (heroes.some((id) => !save.roster[id].unlocked)) throw new Error("Party contains locked hero");
      save.party = [...action.party];
    } else if (action.type === "hero:levelUp") {
      const progress = save.roster[action.heroId];
      const cost = getUpgradeCost(progress.level);
      if (progress.level < 20 && save.gold >= cost) {
        save.gold -= cost;
        progress.level += 1;
        events.push({ type: "hero:leveled", heroId: action.heroId, level: progress.level });
      } else {
        events.push({ type: "toast", message: progress.level >= 20 ? "英雄已达等级上限" : "金币不足" });
      }
    } else if (action.type === "hero:starUp") {
      const progress = save.roster[action.heroId];
      const cost = getStarUpgradeCost(progress.stars);
      if (cost == null || progress.stars >= MAX_HERO_STARS) {
        events.push({ type: "toast", message: "星级已达上限" });
      } else if (progress.marks < cost) {
        events.push({ type: "toast", message: "碎片不足" });
      } else {
        progress.marks -= cost;
        progress.stars += 1;
        events.push({ type: "hero:starred", heroId: action.heroId, stars: progress.stars });
      }
    } else if (action.type === "item:add") {
      const result = insertInventoryItem(
        save.inventory,
        save.overflow,
        action.item,
        collectEquippedItemIds(save.roster),
        getBackpackCapacity(save.abilities),
      );
      save.inventory = result.inventory;
      save.overflow = result.overflow;
      save.gold += result.goldGained;
      if (result.rejected) events.push({ type: "toast", message: "溢出区已满，暂时无法获得更多装备" });
    } else if (action.type === "item:equip") {
      this.equipItem(action.heroId, action.itemId, events);
    } else if (action.type === "item:unequip") {
      this.unequipItem(action.heroId, action.itemId, events);
    } else if (action.type === "item:salvage") {
      this.salvageItem(action.itemId, events);
    } else if (action.type === "item:salvageMany") {
      this.salvageMany(action.itemIds, events);
    } else if (action.type === "item:organize") {
      save.inventory = sortInventoryItems(save.inventory);
      events.push({ type: "toast", message: "背包已整理" });
    } else if (action.type === "alchemy:craft") {
      this.craftAlchemy(action.itemIds, events);
    } else if (action.type === "stage:select") {
      if (action.stage > save.highestUnlockedStage) throw new Error("Stage is locked");
      save.currentStage = Math.max(1, Math.min(120, action.stage));
    } else if (action.type === "stage:victory") {
      save.gold += action.gold;
      if (action.stage > save.highestClearedStage) {
        save.highestClearedStage = action.stage;
        save.gems += 20;
      }
      save.highestUnlockedStage = Math.max(save.highestUnlockedStage, Math.min(120, action.stage + 1));
      save.currentStage = Math.min(120, action.stage + 1);
      for (const item of action.items) {
        const result = insertInventoryItem(
          save.inventory,
          save.overflow,
          item,
          collectEquippedItemIds(save.roster),
          getBackpackCapacity(save.abilities),
        );
        save.inventory = result.inventory;
        save.overflow = result.overflow;
        save.gold += result.goldGained;
      }
    } else if (action.type === "summon:single") {
      this.summon(1, 100, events);
    } else if (action.type === "summon:five") {
      this.summon(5, 450, events);
    } else if (action.type === "shop:buy") {
      const offer = save.shop.offers.find(({ offerId }) => offerId === action.offerId);
      if (!offer || offer.sold || save.gold < offer.priceGold) {
        events.push({ type: "toast", message: "金币不足或商品已售罄" });
      } else {
        save.gold -= offer.priceGold;
        offer.sold = true;
        if (offer.kind === "gems") save.gems += offer.gemAmount;
        else {
          const result = insertInventoryItem(
            save.inventory,
            save.overflow,
            offer.item,
            collectEquippedItemIds(save.roster),
            getBackpackCapacity(save.abilities),
          );
          save.inventory = result.inventory;
          save.overflow = result.overflow;
          save.gold += result.goldGained;
        }
      }
    } else if (action.type === "shop:refresh") {
      if (!save.shop.freeRefreshUsed) {
        save.shop.freeRefreshUsed = true;
        save.shop.offers = createShopOffers(save.shop.dateKey, save.highestUnlockedStage, 1);
      }
    } else if (action.type === "ability:upgrade") {
      const definition = ABILITY_BY_ID[action.abilityId];
      const level = save.abilities[action.abilityId] ?? 0;
      if (!definition) {
        events.push({ type: "toast", message: "未知能力" });
      } else if (level >= definition.maxLevel) {
        events.push({ type: "toast", message: "能力已达上限" });
      } else {
        const cost = getAbilityUpgradeCost(level);
        if (save.gold < cost) {
          events.push({ type: "toast", message: "金币不足" });
        } else {
          save.gold -= cost;
          save.abilities[action.abilityId] = level + 1;
          events.push({
            type: "ability:upgraded",
            abilityId: action.abilityId,
            level: save.abilities[action.abilityId],
          });
          this.state.ui.toast = definition.name + " Lv." + save.abilities[action.abilityId];
        }
      }
    } else if (action.type === "lootChest:charge") {
      const result = applyLootChestCharge(
        save.lootChest,
        action.amount,
        getChestProgressBonus(save.abilities),
        Math.max(1, save.highestClearedStage || save.highestUnlockedStage),
      );
      save.lootChest = result.chest;
      if (result.goldGained > 0) save.gold += result.goldGained;
      events.push({
        type: "lootChest:charged",
        level: result.chest.level,
        progress: getLootChestProgress(result.chest),
      });
      if (result.leveledUp) {
        events.push({
          type: "lootChest:leveled",
          level: result.chest.level,
          gold: result.goldGained,
        });
      } else if (result.rewarded) {
        events.push({
          type: "lootChest:rewarded",
          level: result.chest.level,
          gold: result.goldGained,
        });
      }
    } else if (action.type === "offline:claim") {
      save.gold += action.gold;
      for (const item of action.items) {
        const result = insertInventoryItem(
          save.inventory,
          save.overflow,
          item,
          collectEquippedItemIds(save.roster),
          getBackpackCapacity(save.abilities),
        );
        save.inventory = result.inventory;
        save.overflow = result.overflow;
        save.gold += result.goldGained;
      }
    } else if (action.type === "settings:update") {
      Object.assign(save.settings, action.patch);
    } else if (action.type === "tutorial:complete") {
      save.tutorialCompleted = true;
      this.state.ui.modal = null;
    }
    save.updatedAt = Date.now();
    this.state.revision += 1;
    for (const listener of this.listeners) listener(this.state, events);
  }

  private summon(count: number, cost: number, events: AppEvent[]): void {
    const save = this.state.save;
    if (save.gems < cost) {
      events.push({ type: "toast", message: "宝石不足" });
      return;
    }
    save.gems -= cost;
    const results: SummonPullResult[] = [];
    for (let index = 0; index < count; index += 1) {
      const heroId: HeroId =
        !save.roster.H07.unlocked ? "H07" : !save.roster.H08.unlocked ? "H08" : (["H01", "H02", "H03", "H04", "H05", "H06", "H07", "H08"][save.summonCount % 8] as HeroId);
      if (!save.roster[heroId].unlocked) {
        save.roster[heroId].unlocked = true;
        results.push({ kind: "unlock", heroId });
        events.push({ type: "hero:unlocked", heroId });
      } else {
        save.roster[heroId].marks += 20;
        results.push({ kind: "marks", heroId, marks: 20 });
      }
      save.summonCount += 1;
    }
    events.push({ type: "summon:completed", results });
  }

  private equipItem(heroId: HeroId, itemId: string, events: AppEvent[]): void {
    const save = this.state.save;
    const item = save.inventory.find(({ instanceId }) => instanceId === itemId);
    if (!item) return;
    const hero = save.roster[heroId];
    for (const progress of Object.values(save.roster)) {
      if (progress.equipment[item.slot] === item.instanceId) {
        progress.equipment[item.slot] = null;
      }
    }
    hero.equipment[item.slot] = item.instanceId;
    events.push({ type: "item:equipped", heroId, itemId });
    this.state.ui.toast = `装备成功 · 战力 ${getItemScore(item)}`;
  }

  private unequipItem(heroId: HeroId, itemId: string, events: AppEvent[]): void {
    const save = this.state.save;
    const item = save.inventory.find(({ instanceId }) => instanceId === itemId);
    if (!item) return;
    const hero = save.roster[heroId];
    if (hero.equipment[item.slot] !== item.instanceId) return;
    hero.equipment[item.slot] = null;
    events.push({ type: "item:unequipped", heroId, itemId });
    this.state.ui.toast = "已卸下装备";
  }

  private salvageItem(itemId: string, events: AppEvent[]): void {
    const save = this.state.save;
    const index = save.inventory.findIndex(({ instanceId }) => instanceId === itemId);
    if (index < 0) return;
    const item = save.inventory[index]!;
    for (const progress of Object.values(save.roster)) {
      if (progress.equipment[item.slot] === item.instanceId) {
        progress.equipment[item.slot] = null;
      }
    }
    save.inventory.splice(index, 1);
    const gold = getSalvageGold(item);
    save.gold += gold;
    events.push({ type: "item:salvaged", itemId, gold });
    this.state.ui.toast = `分解获得 ● ${gold}`;
  }

  private salvageMany(itemIds: readonly string[], events: AppEvent[]): void {
    const save = this.state.save;
    const idSet = new Set(itemIds);
    let gold = 0;
    let count = 0;
    const remaining: typeof save.inventory = [];
    for (const item of save.inventory) {
      if (!idSet.has(item.instanceId)) {
        remaining.push(item);
        continue;
      }
      for (const progress of Object.values(save.roster)) {
        if (progress.equipment[item.slot] === item.instanceId) {
          progress.equipment[item.slot] = null;
        }
      }
      gold += getSalvageGold(item);
      count += 1;
    }
    if (count === 0) return;
    save.inventory = remaining;
    save.gold += gold;
    events.push({ type: "item:salvagedMany", count, gold });
    this.state.ui.toast = `分解 ${count} 件 · ● ${gold}`;
  }

  private craftAlchemy(itemIds: readonly string[], events: AppEvent[]): void {
    const save = this.state.save;
    const uniqueIds = [...new Set(itemIds)];
    const inputs = uniqueIds
      .map((id) => save.inventory.find(({ instanceId }) => instanceId === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (inputs.length !== uniqueIds.length) {
      events.push({ type: "toast", message: "部分材料已不在背包中" });
      return;
    }
    for (const item of inputs) {
      for (const progress of Object.values(save.roster)) {
        if (progress.equipment[item.slot] === item.instanceId) {
          events.push({ type: "toast", message: "已装备的道具不能炼金" });
          return;
        }
      }
    }
    const outcome = craftAlchemyItem(inputs, new SeededRandom(Date.now() ^ save.updatedAt));
    if (!outcome.ok) {
      events.push({ type: "toast", message: outcome.message });
      return;
    }
    const consumed = new Set(outcome.consumedIds);
    save.inventory = save.inventory.filter(({ instanceId }) => !consumed.has(instanceId));
    const inserted = insertInventoryItem(
      save.inventory,
      save.overflow,
      outcome.result,
      collectEquippedItemIds(save.roster),
      getBackpackCapacity(save.abilities),
    );
    save.inventory = inserted.inventory;
    save.overflow = inserted.overflow;
    save.gold += inserted.goldGained;
    events.push({
      type: "alchemy:crafted",
      resultId: outcome.result.instanceId,
      fromRarity: outcome.fromRarity,
      toRarity: outcome.toRarity,
    });
    this.state.ui.toast = `炼金成功 · ${RARITY_LABELS[outcome.fromRarity]} → ${RARITY_LABELS[outcome.toRarity]}`;
  }
}
