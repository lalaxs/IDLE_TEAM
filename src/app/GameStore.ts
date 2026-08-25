import type { AppTab, GameAction } from "./actions";
import type { AppEvent, SummonPullResult } from "./events";
import {
  canAscendHero,
  getAscendStoneCost,
  getHeroLevelCap,
  getStarFlatDelta,
  getStarUpgradeCost,
  getUpgradeCost,
  MAX_HERO_ASCEND_LEVEL,
  MAX_HERO_STARS,
} from "../progression/HeroProgression";
import { isHeroSkillId } from "../content/heroSkills";
import { HERO_DEFINITIONS } from "../content/heroes";
import {
  canLearnHeroSkill,
  talentUpgradeBlocked,
  upgradeTalent,
} from "../progression/TalentSystem";
import {
  collectEquippedItemIds,
  getItemScore,
  getSalvageGold,
  insertInventoryItem,
  sortInventoryItems,
} from "../progression/EquipmentSystem";
import { craftAlchemyItem } from "../progression/AlchemySystem";
import {
  inlayGem,
  openEquipmentSocket,
  removeGem,
  resetEquipmentAffix,
  smeltEquipmentAffix,
} from "../progression/GearCraftSystem";
import { RARITY_LABELS } from "../content/rarities";
import { AFFIX_BY_ID, formatAffixValue } from "../content/affixes";
import { MATERIAL_BY_ID } from "../content/materials";
import { DUNGEON_BY_ID } from "../content/dungeons";
import { createShopOffers } from "../progression/ShopSystem";
import { getDateKey } from "../persistence/schema";
import {
  fillEmptyParty,
  getBusyHeroIds,
  getDungeonRun,
  isDungeonRunReady,
  removeHeroesFromParty,
  rollDungeonRewards,
  validateDungeonDispatch,
} from "../progression/DungeonSystem";
import {
  getAbilityUpgradeCost,
  getBackpackCapacity,
  getChestProgressBonus,
} from "../progression/AbilitySystem";
import {
  applyLootChestCharge,
  canOpenLootChest,
  getLootChestProgress,
  openLootChest,
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
      if (heroes.some((id) => getBusyHeroIds(save.dungeonRuns).has(id))) {
        events.push({ type: "toast", message: "该英雄正在副本中" });
      } else {
        save.party = [...action.party];
      }
    } else if (action.type === "hero:levelUp") {
      const progress = save.roster[action.heroId];
      const cap = getHeroLevelCap(progress.ascendLevel ?? 0);
      const cost = getUpgradeCost(progress.level);
      if (progress.level >= cap) {
        events.push({ type: "toast", message: progress.level >= 100 ? "英雄已达等级上限" : "需进阶后继续升级" });
      } else if (save.exp < cost) {
        events.push({ type: "toast", message: "经验不足" });
      } else {
        save.exp -= cost;
        progress.level += 1;
        events.push({ type: "hero:leveled", heroId: action.heroId, level: progress.level });
      }
    } else if (action.type === "hero:starUp") {
      const progress = save.roster[action.heroId];
      const cost = getStarUpgradeCost(progress.stars, progress.ascendLevel ?? 0);
      if (cost == null || progress.stars >= MAX_HERO_STARS) {
        events.push({ type: "toast", message: "星级已达上限" });
      } else if (progress.marks < cost) {
        events.push({ type: "toast", message: "碎片不足" });
      } else {
        const delta = getStarFlatDelta(action.heroId, progress.level);
        progress.marks -= cost;
        progress.stars += 1;
        progress.starFlatHp = (progress.starFlatHp ?? 0) + delta.maxHp;
        progress.starFlatAtk = (progress.starFlatAtk ?? 0) + delta.attack;
        progress.starFlatDef = (progress.starFlatDef ?? 0) + delta.defense;
        events.push({ type: "hero:starred", heroId: action.heroId, stars: progress.stars });
      }
    } else if (action.type === "hero:ascend") {
      const progress = save.roster[action.heroId];
      const currentLevel = progress.ascendLevel ?? 0;
      const cost = getAscendStoneCost(currentLevel);
      if (!progress.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else if (!canAscendHero(progress.stars, currentLevel, progress.level) || cost == null) {
        events.push({
          type: "toast",
          message:
            currentLevel >= MAX_HERO_ASCEND_LEVEL
              ? "已达最高进阶"
              : progress.stars < MAX_HERO_STARS
                ? "需先升至 5 星"
                : "需先升至当前等级上限",
        });
      } else if ((save.materials.mat_ascend_stone ?? 0) < cost) {
        events.push({ type: "toast", message: "进阶石不足" });
      } else {
        save.materials.mat_ascend_stone -= cost;
        progress.ascendLevel = currentLevel + 1;
        progress.stars = 0;
        events.push({ type: "hero:ascended", heroId: action.heroId, level: progress.ascendLevel });
        this.state.ui.toast = `进阶成功 · ${progress.ascendLevel} 阶`;
      }
    } else if (action.type === "hero:talentUp") {
      const progress = save.roster[action.heroId];
      if (!progress?.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else {
        const nextRanks = upgradeTalent(progress.talentRanks ?? {}, action.talentId, progress.level);
        if (!nextRanks) {
          events.push({
            type: "toast",
            message: talentUpgradeBlocked(progress.talentRanks ?? {}, action.talentId, progress.level) ?? "无法升级天赋",
          });
        } else {
          progress.talentRanks = nextRanks;
          const rank = nextRanks[action.talentId] ?? 0;
          events.push({ type: "hero:talentUpgraded", heroId: action.heroId, talentId: action.talentId, rank });
        }
      }
    } else if (action.type === "hero:chooseSkill") {
      const progress = save.roster[action.heroId];
      if (!progress?.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else if (!canLearnHeroSkill(progress.level)) {
        events.push({ type: "toast", message: "需达到 20 级后选择英雄技能" });
      } else if (!isHeroSkillId(action.skillId)) {
        events.push({ type: "toast", message: "无效的英雄技能" });
      } else {
        progress.chosenSkillId = action.skillId;
        events.push({ type: "hero:skillChosen", heroId: action.heroId, skillId: action.skillId });
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
    } else if (action.type === "craft:socket") {
      this.craftSocket(action.itemId, events);
    } else if (action.type === "craft:reset") {
      this.craftReset(action.itemId, action.affixIndex, events);
    } else if (action.type === "craft:smelt") {
      this.craftSmelt(action.itemId, action.affixId, events);
    } else if (action.type === "craft:inlay") {
      this.craftInlay(action.itemId, action.socketIndex, action.gemId, events);
    } else if (action.type === "craft:removeGem") {
      this.craftRemoveGem(action.itemId, action.socketIndex, events);
    } else if (action.type === "stage:select") {
      if (action.stage > save.highestUnlockedStage) throw new Error("Stage is locked");
      save.currentStage = Math.max(1, Math.min(120, action.stage));
    } else if (action.type === "stage:victory") {
      save.gold += action.gold;
      save.exp += action.exp;
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
    } else if (action.type === "dungeon:dispatch") {
      const dungeon = DUNGEON_BY_ID[action.dungeonId];
      const dateKey = save.shop.dateKey || getDateKey();
      const reason = validateDungeonDispatch({
        dungeonId: action.dungeonId,
        heroIds: action.heroIds,
        save,
        dateKey,
      });
      if (reason || !dungeon) {
        events.push({ type: "toast", message: reason ?? "副本尚未解锁" });
      } else {
        const now = Date.now();
        save.dungeonRuns = [
          ...save.dungeonRuns,
          {
            dungeonId: action.dungeonId,
            heroIds: [...action.heroIds],
            startedAt: now,
            endsAt: now + dungeon.durationMs,
          },
        ];
        const busy = getBusyHeroIds(save.dungeonRuns);
        save.party = fillEmptyParty(removeHeroesFromParty(save.party, action.heroIds), save.roster, busy);
        this.state.ui.toast = `派遣出发 · ${dungeon.name}`;
        events.push({ type: "toast", message: `派遣出发 · ${dungeon.name}` });
      }
    } else if (action.type === "dungeon:claim") {
      const dungeon = DUNGEON_BY_ID[action.dungeonId];
      const run = getDungeonRun(save.dungeonRuns, action.dungeonId);
      if (!dungeon || !run) {
        events.push({ type: "toast", message: "没有可领取的副本" });
      } else if (!isDungeonRunReady(run)) {
        events.push({ type: "toast", message: "副本尚未完成" });
      } else {
        const rewards = rollDungeonRewards(dungeon, run.startedAt ^ dungeon.powerStage);
        save.gold += rewards.gold;
        save.exp += rewards.exp;
        for (const [materialId, amount] of Object.entries(rewards.materials)) {
          if (!amount) continue;
          save.materials[materialId as keyof typeof save.materials] =
            (save.materials[materialId as keyof typeof save.materials] ?? 0) + amount;
        }
        save.dungeonRuns = save.dungeonRuns.filter((entry) => entry.dungeonId !== action.dungeonId);
        events.push({
          type: "dungeon:cleared",
          dungeonId: action.dungeonId,
          materials: rewards.materials,
        });
        const dropSummary = Object.entries(rewards.materials)
          .filter(([, amount]) => (amount ?? 0) > 0)
          .map(([id, amount]) => `${MATERIAL_BY_ID[id as keyof typeof MATERIAL_BY_ID]?.name ?? id}×${amount}`)
          .join(" · ");
        this.state.ui.toast = dropSummary ? `副本结算 · ${dropSummary}` : "副本结算完成";
        events.push({ type: "toast", message: this.state.ui.toast });
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
      );
      save.lootChest = result.chest;
      events.push({
        type: "lootChest:charged",
        level: result.chest.level,
        progress: getLootChestProgress(result.chest),
        ready: canOpenLootChest(result.chest),
      });
      if (result.leveledUp) {
        events.push({ type: "lootChest:leveled", level: result.chest.level });
      }
      if (result.becameReady) {
        events.push({ type: "toast", message: "宝箱已成型，可随时开启" });
      }
    } else if (action.type === "lootChest:open") {
      const dropStage = Math.max(1, save.highestClearedStage || 1);
      const seed =
        (save.lootChest.level * 97_531 +
          save.lootChest.charge * 1_009 +
          dropStage * 17 +
          save.gold +
          save.inventory.length * 13) >>>
        0;
      const result = openLootChest(save.lootChest, dropStage, seed || 1);
      if (!result.ok) {
        events.push({ type: "toast", message: "宝箱仍是空的，先充能到 1 级" });
      } else {
        // Opening always resets both tier and charge progress.
        save.lootChest = { level: 0, charge: 0 };
        save.gold += result.gold;
        save.exp += result.exp;
        for (const item of result.items) {
          const inserted = insertInventoryItem(
            save.inventory,
            save.overflow,
            item,
            collectEquippedItemIds(save.roster),
            getBackpackCapacity(save.abilities),
          );
          save.inventory = inserted.inventory;
          save.overflow = inserted.overflow;
          save.gold += inserted.goldGained;
          if (inserted.rejected) {
            events.push({ type: "toast", message: "溢出区已满，部分装备未能放入" });
          }
        }
        events.push({
          type: "lootChest:opened",
          level: result.openedLevel,
          gold: result.gold,
          exp: result.exp,
          items: result.items,
          lucky: result.lucky,
        });
      }
    } else if (action.type === "offline:claim") {
      save.gold += action.gold;
      save.exp += action.exp;
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
    const pool = HERO_DEFINITIONS.map(({ id }) => id);
    for (let index = 0; index < count; index += 1) {
      const locked = pool.filter((id) => !save.roster[id].unlocked);
      const heroId: HeroId =
        locked[0] ?? pool[save.summonCount % pool.length]!;
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

  private findCraftItem(itemId: string, events: AppEvent[]) {
    const item = this.state.save.inventory.find(({ instanceId }) => instanceId === itemId);
    if (!item) {
      events.push({ type: "toast", message: "装备不在背包中" });
      return null;
    }
    return item;
  }

  private craftSocket(itemId: string, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = openEquipmentSocket(item, this.state.save.materials);
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    events.push({ type: "craft:socketed", itemId, sockets: item.sockets?.length ?? 0 });
    this.state.ui.toast = `开孔成功 · ${item.sockets?.length ?? 0}/2`;
  }

  private craftReset(itemId: string, affixIndex: number, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = resetEquipmentAffix(
      item,
      affixIndex,
      this.state.save.materials,
      new SeededRandom(Date.now() ^ this.state.save.updatedAt),
    );
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    events.push({ type: "craft:reset", itemId });
    this.state.ui.toast = `重置成功 · ${formatAffixValue(result.affix.affixId, result.affix.value)}`;
  }

  private craftSmelt(itemId: string, affixId: import("../content/affixes").AffixId, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = smeltEquipmentAffix(
      item,
      affixId,
      this.state.save.materials,
      new SeededRandom(Date.now() ^ this.state.save.updatedAt ^ item.affixes.length),
    );
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    events.push({
      type: "craft:smelted",
      itemId,
      affixId,
      value: result.roll.value,
    });
    this.state.ui.toast = `熔炼成功 · ${formatAffixValue(affixId, result.roll.value)}`;
  }

  private craftInlay(
    itemId: string,
    socketIndex: number,
    gemId: import("../content/materials").MaterialId,
    events: AppEvent[],
  ): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = inlayGem(item, socketIndex, gemId, this.state.save.materials);
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    events.push({ type: "craft:inlaid", itemId, gemId });
    this.state.ui.toast = `镶嵌成功 · ${MATERIAL_BY_ID[gemId].name}`;
  }

  private craftRemoveGem(itemId: string, socketIndex: number, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = removeGem(item, socketIndex, this.state.save.materials);
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    this.state.ui.toast = `已卸下 · ${MATERIAL_BY_ID[result.gemId].name}`;
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
