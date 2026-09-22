import type { AppTab, GameAction } from "./actions";
import { getAdVipBenefits } from "../content/adVip";
import { syncAdVip, claimVipGift } from "../progression/AdVipSystem";
import { showRewardedAd, type AdPlacement, type RewardedAdResult } from "./RewardedAds";
import { recordTaskProgress, syncRecurringTasks } from "../progression/RecurringTaskSystem";
import type { AppEvent, SummonPullResult } from "./events";
import { handleActivityCommand } from "./store/activityCommands";
import { pushResourceReward } from "./store/resourceEvents";
import { handleShopCommand } from "./store/shopCommands";
import {
  canAscendHero,
  getAscendStoneCost,
  getHeroLevelCap,
  getStarUpgradeCost,
  getHeroExperienceRemaining,
  MAX_HERO_ASCEND_LEVEL,
  MAX_HERO_STARS,
} from "../progression/HeroProgression";
import { HERO_SKILL_CHANGE_GOLD_COST, isHeroSkillId } from "../content/heroSkills";
import { HERO_BY_ID, INTRO_SUMMON_HERO_IDS, RELEASED_HERO_DEFINITIONS } from "../content/heroes";
import {
  canLearnHeroSkill,
  TALENT_RESET_GOLD_COST,
  talentUpgradeBlocked,
  upgradeTalent,
} from "../progression/TalentSystem";
import {
  canHeroEquipItem,
  createEquipment,
  collectEquippedItemIds,
  getEquipmentLevel,
  getItemScore,
  getSalvageGold,
  insertInventoryItem,
  isEquipmentUpgrade,
  sortInventoryItems,
  type InventoryItem,
} from "../progression/EquipmentSystem";
import {
  addAlchemyStationExperience,
  craftAlchemyItem,
  getAlchemyStationLevelCap,
} from "../progression/AlchemySystem";
import {
  fuseGemFamily,
  fuseGemRank,
  getSetEssenceSalvageReward,
  getSocketStoneCost,
  imprintSetTag,
  inlayGem,
  openEquipmentSocket,
  removeAllGems,
  removeGem,
  resetEquipmentAffix,
  SMELT_GOLD_COST,
  SOCKET_GOLD_COST,
  smeltEquipmentAffix,
} from "../progression/GearCraftSystem";
import { RARITY_LABELS, type Rarity } from "../content/rarities";
import { EQUIPMENT_SLOTS, ITEM_DEFINITIONS } from "../content/items";
import { formatAffixValue } from "../content/affixes";
import { GEM_BASE_IDS, MATERIAL_BY_ID, MAX_EQUIPMENT_SOCKETS, type GemMaterialId, type GemRank } from "../content/materials";
import { DUNGEON_BY_ID } from "../content/dungeons";
import { createShopOffers } from "../progression/ShopSystem";
import {
  SHOP_SIZE,
  SHOP_GOLD_REFRESH_LIMIT,
  getShopRefreshKey,
} from "../content/shop";
import { getDateKey } from "../domain/time/GameDay";
import {
  calculateExpeditionStamina,
  getBusyHeroIds,
  getDungeonRun,
  isDungeonRunReady,
  rollDungeonRunRewards,
  validateDungeonDispatch,
} from "../progression/DungeonSystem";
import {
  getAbilityUpgradeCost,
  getBackpackCapacity,
} from "../progression/AbilitySystem";
import { checkpointLootChest, openLootChest, previewLootChest, canOpenLootChest, type EquipmentChestTier, type LootChestPreview } from "../progression/LootChestSystem";
import { syncProgressionDaily } from "../progression/ProgressionDaily";
import { ACTIVE_EXPERIENCE_HOURS_PER_DAY, ASCEND_GUARANTEES, bestIdleProgress, DOUBLE_CLAIMS_PER_DAY, idleExperiencePerHour, QUICK_REWARD_HOURS, QUICK_REWARDS_PER_DAY, referenceLevel } from "../content/numericalModel";
import { createNaturalEquipment } from "../progression/EquipmentDropSystem";
import { selectEquipmentDefinition } from "../progression/EquipmentPool";
import { ABILITY_BY_ID } from "../content/abilities";
import { SeededRandom, type RandomSource } from "../simulation/RandomSource";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { getUnlockedPartySlotCount } from "../progression/PartySystem";
import type { HeroId } from "../simulation/types";
import { SET_BY_ID, type SetId } from "../content/sets";
import { isDifficultyUnlocked } from "../content/difficulties";
import { STAGE_GIFT_STARSTONE_REWARD } from "../content/stages";
import {
  SUMMON_FIVE_COST,
  SUMMON_SINGLE_COST,
  SUMMON_THEME_DURATION_MS,
  SUMMON_THEME_PITY_PULLS,
  SUMMON_THEME_SELECTION_COST,
  getActiveSummonTheme,
  getSummonExperienceReward,
  getSummonGoldReward,
  rollSummonRewardKind,
  selectSummonHero,
} from "../progression/SummonSystem";

export interface GameStoreState {
  save: SaveDataV1;
  ui: {
    activeTab: AppTab;
    toast: string | null;
    debugLootChestItems: InventoryItem[];
  };
  revision: number;
}

const DEBUG_CHEST_RARITY: Record<EquipmentChestTier, Rarity> = {
  wood: "common",
  bronze: "uncommon",
  silver: "rare",
  gold: "epic",
};

type Listener = (state: GameStoreState, events: readonly AppEvent[]) => void;

function mergeReturnedGems(
  target: Partial<Record<GemMaterialId, number>>,
  source: Partial<Record<GemMaterialId, number>>,
): void {
  for (const [rawGemId, amount] of Object.entries(source)) {
    const gemId = rawGemId as GemMaterialId;
    target[gemId] = (target[gemId] ?? 0) + (amount ?? 0);
  }
}

function formatSetEssenceRewards(rewards: Partial<Record<SetId, number>>): string {
  return Object.entries(rewards)
    .filter((entry): entry is [SetId, number] => (entry[1] ?? 0) > 0)
    .map(([setId, amount]) => `${SET_BY_ID[setId].name}精华 +${amount}`)
    .join(" · ");
}

export class GameStore {
  private state: GameStoreState;
  private listeners = new Set<Listener>();
  private adPending = false;

  get isAdPending() { return this.adPending; }

  async watchAd(placement: AdPlacement, ticket = false): Promise<void> {
    if (this.adPending) return;
    const save = this.state.save;
    syncAdVip(save);
    syncProgressionDaily(save);
    if (placement === "idle-double" && (save.progressionDaily.doubleClaims >= DOUBLE_CLAIMS_PER_DAY || !canOpenLootChest(save.lootChest, Date.now(), (save.abilities.chest_progress ?? 0) * 0.005))) return;
    if (placement === "idle-quick" && save.progressionDaily.quickRewards >= QUICK_REWARDS_PER_DAY) return;
    if (placement === "vip" && (ticket || save.adVip.watchedAds >= 500)) return;
    if (placement === "shop" && (save.shop.adRefreshesClaimed || save.shop.goldRefreshesUsed < SHOP_GOLD_REFRESH_LIMIT || save.adVip.freeRefreshesUsed < getAdVipBenefits(save.adVip.watchedAds).freeRefreshes)) return;
    if (ticket && save.adTickets < 1) return;
    this.adPending = true;
    this.dispatch({ type: "tasks:sync" });
    let result: RewardedAdResult = "unavailable";
    try { result = ticket ? "completed" : await showRewardedAd(placement); }
    catch { result = "unavailable"; }
    finally { this.adPending = false; }
    this.dispatch({ type: "ads:result", placement, result, ticket });
  }

  constructor(save: SaveDataV1, private readonly summonRandom?: RandomSource) {
    syncRecurringTasks(save);
    syncAdVip(save);
    syncProgressionDaily(save);
    save.difficultyProgress.easy.highestClearedStage = Math.max(
      save.difficultyProgress.easy.highestClearedStage,
      save.highestClearedStage,
    );
    save.difficultyProgress.easy.highestUnlockedStage = Math.max(
      save.difficultyProgress.easy.highestUnlockedStage,
      save.highestUnlockedStage,
      Math.min(120, save.difficultyProgress.easy.highestClearedStage + 1),
    );
    if (save.shop.offers.length < SHOP_SIZE) {
      const previousOffers = new Map(save.shop.offers.map((offer) => [offer.offerId, offer]));
      save.shop.offers = createShopOffers(
        save.shop.refreshKey || getShopRefreshKey(),
        save.highestUnlockedStage,
        save.shop.refreshSequence,
      ).map((offer) => previousOffers.get(offer.offerId) ?? offer);
    }
    this.state = {
      save,
      ui: {
        activeTab: "inventory",
        toast: null,
        debugLootChestItems: [],
      },
      revision: 0,
    };
  }

  getState(): Readonly<GameStoreState> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action: GameAction): void {
    const events: AppEvent[] = [];
    const save = this.state.save;
    syncRecurringTasks(save);
    syncAdVip(save);
    syncProgressionDaily(save);
    if (action.type === "vip:claim") {
      const gift = claimVipGift(save, action.period);
      if (gift) {
        pushResourceReward(events, "vip", { gems: gift.gems });
        events.push({ type: "toast", message: `已${gift.topUp ? "补领" : "领取"}VIP${action.period === "daily" ? "每日" : "每周"}奖励` });
      }
    } else if (action.type === "ads:result") {
      if (action.result !== "completed") events.push({ type: "toast", message: action.result === "cancelled" ? "广告未完成，未消耗次数" : "广告暂不可用，请稍后再试" });
      else if ((!action.ticket || (action.placement !== "vip" && save.adTickets > 0)) && (action.placement !== "shop" || !save.shop.adRefreshesClaimed)) {
        if (action.placement === "idle-double" || action.placement === "idle-quick") {
          const now = Date.now();
          const { stage, difficulty } = bestIdleProgress(save.difficultyProgress);
          const doubled = action.placement === "idle-double";
          const used = doubled ? save.progressionDaily.doubleClaims : save.progressionDaily.quickRewards;
          const limit = doubled ? DOUBLE_CLAIMS_PER_DAY : QUICK_REWARDS_PER_DAY;
          if (used >= limit || (doubled && !canOpenLootChest(save.lootChest, now, (save.abilities.chest_progress ?? 0) * 0.005))) {
            events.push({ type: "toast", message: used >= limit ? "今日加速次数已用完" : "挂机时间不足 5 分钟" });
          } else {
            const reward = doubled
              ? previewLootChest(save.lootChest, now, stage, difficulty, save.abilities)
              : previewLootChest({ startedAt: now - QUICK_REWARD_HOURS * 3_600_000 }, now, stage, difficulty);
            if (doubled) {
              reward.gold *= 2; reward.exp *= 2;
              reward.items = [...reward.items, ...reward.items.map((item, i) => ({ ...structuredClone(item), instanceId: `${item.instanceId}-bonus-${now}-${i}` }))];
              save.lootChest = { startedAt: now };
              save.progressionDaily.doubleClaims += 1;
            } else save.progressionDaily.quickRewards += 1;
            this.grantIdleReward(reward, events, doubled ? reward.minutes : 0);
            if (action.ticket) save.adTickets -= 1;
            else save.adVip.watchedAds = Math.min(500, save.adVip.watchedAds + 1);
          }
        } else {
        const previous = getAdVipBenefits(save.adVip.watchedAds).level;
        if (action.ticket) save.adTickets -= 1;
        else save.adVip.watchedAds = Math.min(500, save.adVip.watchedAds + 1);
        if (action.placement === "shop") { save.shop.adRefreshesClaimed = true; save.shop.adRefreshesUsed = 0; }
        const level = getAdVipBenefits(save.adVip.watchedAds).level;
        events.push({ type: "toast", message: level > previous ? `已晋升VIP${level}，新福利已生效` : action.placement === "shop" ? "已获得2次商店刷新" : "累计广告 +1" });
        }
      }
    } else if (handleActivityCommand(action, save, events)) {
      // Activity commands own their complete state transition.
    } else if (action.type === "ui:selectTab") {
      this.state.ui.activeTab = action.tab;
    } else if (action.type === "battle:setSpeed") {
      if (action.speed <= getAdVipBenefits(save.adVip.watchedAds).speed) save.settings.battleSpeed = action.speed;
      else events.push({ type: "toast", message: action.speed === 2 ? "VIP6解锁2倍速" : "VIP3解锁1.5倍速" });
    } else if (action.type === "session:touch") {
      save.lastActiveAt = action.now;
    } else if (action.type === "party:commit") {
      const heroes = action.party.filter((value): value is HeroId => value !== null);
      const unlockedSlots = getUnlockedPartySlotCount(save.highestClearedStage);
      if (heroes.length === 0) throw new Error("Party must keep at least one hero");
      if (new Set(heroes).size !== heroes.length) throw new Error("Party contains duplicate heroes");
      if (heroes.some((id) => !save.roster[id].unlocked)) throw new Error("Party contains locked hero");
      if (action.party.slice(unlockedSlots).some((heroId) => heroId !== null)) {
        throw new Error("Party contains hero in locked slot");
      }
      if (heroes.some((id) => getBusyHeroIds(save.dungeonRuns).has(id))) {
        events.push({ type: "toast", message: "该英雄正在远征中" });
      } else {
        save.party = [...action.party];
      }
    } else if (action.type === "hero:levelUp") {
      const progress = save.roster[action.heroId];
      const cap = getHeroLevelCap(progress.ascendLevel ?? 0);
      const cost = getHeroExperienceRemaining(progress.level, progress.experience ?? 0);
      if (progress.level >= cap) {
        events.push({ type: "toast", message: progress.level >= 100 ? "英雄已达等级上限" : "需进阶后继续升级" });
      } else if (save.exp < cost) {
        events.push({ type: "toast", message: "经验货币不足" });
      } else {
        save.exp -= cost;
        const required = getHeroExperienceRemaining(progress.level, 0);
        progress.experience = Math.max(0, (progress.experience ?? 0) - required);
        progress.level += 1;
        this.grantStarterEquipment(action.heroId);
        events.push({ type: "hero:leveled", heroId: action.heroId, level: progress.level });
      }
    } else if (action.type === "hero:starUp") {
      const progress = save.roster[action.heroId];
      const cost = getStarUpgradeCost(progress.stars);
      if (cost == null || progress.stars >= MAX_HERO_STARS) {
        events.push({ type: "toast", message: "星级已达上限" });
      } else if (progress.marks + save.universalHeroMarks < cost) {
        events.push({ type: "toast", message: "碎片不足" });
      } else {
        const personalSpent = Math.min(progress.marks, cost);
        progress.marks -= personalSpent;
        save.universalHeroMarks -= cost - personalSpent;
        progress.stars += 1;
        events.push({ type: "hero:starred", heroId: action.heroId, stars: progress.stars });
      }
    } else if (action.type === "hero:ascend") {
      const progress = save.roster[action.heroId];
      const currentLevel = progress.ascendLevel ?? 0;
      const cost = getAscendStoneCost(currentLevel);
      if (!progress.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else if (!canAscendHero(currentLevel, progress.level) || cost == null) {
        events.push({
          type: "toast",
          message:
            currentLevel >= MAX_HERO_ASCEND_LEVEL
              ? "已达最高进阶"
              : "需先升至当前等级上限",
        });
      } else if ((save.materials.mat_ascend_stone ?? 0) < cost) {
        events.push({ type: "toast", message: "进阶石不足" });
      } else {
        save.materials.mat_ascend_stone -= cost;
        progress.ascendLevel = currentLevel + 1;
        events.push({ type: "hero:ascended", heroId: action.heroId, level: progress.ascendLevel });
        this.state.ui.toast = `进阶成功 · ${progress.ascendLevel} 阶`;
      }
    } else if (action.type === "hero:talentUp") {
      const progress = save.roster[action.heroId];
      if (!progress?.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else {
        const nextRanks = upgradeTalent(progress.talentRanks ?? {}, action.talentId, progress.level, action.heroId);
        if (!nextRanks) {
          events.push({
            type: "toast",
            message: talentUpgradeBlocked(progress.talentRanks ?? {}, action.talentId, progress.level, action.heroId) ?? "无法升级天赋",
          });
        } else {
          progress.talentRanks = nextRanks;
          const rank = nextRanks[action.talentId] ?? 0;
          events.push({ type: "hero:talentUpgraded", heroId: action.heroId, talentId: action.talentId, rank });
        }
      }
    } else if (action.type === "hero:talentReset") {
      const progress = save.roster[action.heroId];
      if (!progress?.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else if (Object.keys(progress.talentRanks ?? {}).length > 0) {
        if (save.gold < TALENT_RESET_GOLD_COST) {
          events.push({ type: "toast", message: "金币不足" });
        } else {
          save.gold -= TALENT_RESET_GOLD_COST;
          progress.talentRanks = {};
          events.push({ type: "hero:talentsReset", heroId: action.heroId });
        }
      }
    } else if (action.type === "hero:setAugmentationTarget") {
      const progress = save.roster[action.heroId];
      const targetId = action.targetHeroId;
      if (!progress?.unlocked || HERO_BY_ID[action.heroId]?.specId !== "evoker_augmentation") {
        events.push({ type: "toast", message: "仅增辉英雄可指定增幅对象" });
      } else if (targetId && (targetId === action.heroId || !save.roster[targetId]?.unlocked || !save.party.includes(targetId))) {
        events.push({ type: "toast", message: "请选择已上阵的其他队友" });
      } else {
        progress.augmentationTargetId = targetId;
        events.push({ type: "hero:augmentationTargetChanged", heroId: action.heroId, targetHeroId: targetId });
      }
    } else if (action.type === "hero:chooseSkill") {
      const progress = save.roster[action.heroId];
      if (!progress?.unlocked) {
        events.push({ type: "toast", message: "英雄未解锁" });
      } else if (!canLearnHeroSkill(progress.level, progress.ascendLevel)) {
        events.push({ type: "toast", message: "需达到 20 级并完成一阶突破后选择通用被动" });
      } else if (!isHeroSkillId(action.skillId)) {
        events.push({ type: "toast", message: "无效的通用被动" });
      } else if (progress.chosenSkillId === action.skillId) {
        events.push({ type: "toast", message: "已装备该通用被动" });
      } else if (progress.chosenSkillId && save.gold < HERO_SKILL_CHANGE_GOLD_COST) {
        events.push({ type: "toast", message: "金币不足" });
      } else {
        const changing = progress.chosenSkillId !== null;
        if (changing) save.gold -= HERO_SKILL_CHANGE_GOLD_COST;
        progress.chosenSkillId = action.skillId;
        events.push({ type: "hero:skillChosen", heroId: action.heroId, skillId: action.skillId });
      }
    } else if (action.type === "debug:grantLootChests") {
      const difficulty = save.selectedDifficulty;
      const dropStage = Math.max(
        1,
        save.difficultyProgress[difficulty].highestClearedStage || 1,
      );
      const seed = Date.now() ^ this.state.revision;
      for (const [index, tier] of action.tiers.entries()) {
        const random = new SeededRandom(seed ^ ((index + 1) * 104_729));
        const definition = selectEquipmentDefinition(dropStage, random);
        this.state.ui.debugLootChestItems.push(createNaturalEquipment(
          definition.id,
          dropStage,
          difficulty,
          "chest",
          random,
          { forcedRarity: DEBUG_CHEST_RARITY[tier] },
        ));
      }
      events.push({ type: "toast", message: "已添加木、铜、银、金宝箱" });
    } else if (action.type === "debug:addCurrency") {
      save.gold += Math.max(0, Math.floor(action.gold ?? 0));
      save.gems += Math.max(0, Math.floor(action.gems ?? 0));
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
    } else if (action.type === "item:autoEquip") {
      this.autoEquipItems(action.heroId, events);
    } else if (action.type === "item:unequip") {
      this.unequipItem(action.heroId, action.itemId, events);
    } else if (action.type === "item:salvage") {
      this.salvageItem(action.itemId, events);
    } else if (action.type === "item:salvageMany") {
      this.salvageMany(action.itemIds, events);
    } else if (action.type === "item:returnGems") {
      this.returnItemGems(action.itemId, events);
    } else if (action.type === "item:organize") {
      save.inventory = sortInventoryItems(save.inventory);
    } else if (action.type === "alchemy:craft") {
      this.craftAlchemy(action.itemIds, events);
    } else if (action.type === "craft:imprint") {
      this.craftImprint(action.itemId, action.setId, events);
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
    } else if (action.type === "craft:fuseGemRank") {
      this.craftFuseGemRank(action.gemId, events);
    } else if (action.type === "craft:fuseAllGems") {
      this.craftFuseAllGems(events);
    } else if (action.type === "stage:select") {
      const difficulty = action.difficulty ?? save.selectedDifficulty;
      if (!isDifficultyUnlocked(difficulty, save.difficultyProgress)) {
        throw new Error("Difficulty is locked");
      }
      if (action.stage > save.difficultyProgress[difficulty].highestUnlockedStage) {
        throw new Error("Stage is locked");
      }
      save.currentStage = Math.max(1, Math.min(120, action.stage));
      save.selectedDifficulty = difficulty;
    } else if (action.type === "stage:victory") {
      recordTaskProgress(save, "victory");
      save.gold += action.gold;
      const rate = idleExperiencePerHour(referenceLevel(action.stage, save.selectedDifficulty));
      const availableHours = Math.max(0, ACTIVE_EXPERIENCE_HOURS_PER_DAY - save.progressionDaily.activeHours);
      const exp = Math.min(action.exp, Math.floor(availableHours * rate));
      save.progressionDaily.activeHours = Math.min(ACTIVE_EXPERIENCE_HOURS_PER_DAY, save.progressionDaily.activeHours + exp / rate);
      save.exp += exp;
      let goldGained = action.gold;
      const difficultyProgress = save.difficultyProgress[save.selectedDifficulty];
      if (action.stage > difficultyProgress.highestClearedStage) {
        const previous = bestIdleProgress(save.difficultyProgress);
        checkpointLootChest(save.lootChest, Date.now(), previous.stage, previous.difficulty, save.abilities);
        const stones = ASCEND_GUARANTEES.filter((gift) => gift.difficulty === save.selectedDifficulty
          && gift.stage > difficultyProgress.highestClearedStage && gift.stage <= action.stage)
          .reduce((sum, gift) => sum + gift.stones, 0);
        if (stones > 0) {
          save.materials.mat_ascend_stone += stones;
          events.push({ type: "toast", message: `主线进阶奖励：进阶石 +${stones}` });
        }
      }
      difficultyProgress.highestClearedStage = Math.max(
        difficultyProgress.highestClearedStage,
        action.stage,
      );
      difficultyProgress.highestUnlockedStage = Math.max(
        difficultyProgress.highestUnlockedStage,
        Math.min(120, action.stage + 1),
      );
      if (save.selectedDifficulty === "easy") {
        if (action.stage > save.highestClearedStage) {
          save.highestClearedStage = action.stage;
        }
        save.highestUnlockedStage = Math.max(
          save.highestUnlockedStage,
          difficultyProgress.highestUnlockedStage,
        );
      }
      save.currentStage = Math.min(
        difficultyProgress.highestUnlockedStage,
        action.stage + 1,
      );
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
        goldGained += result.goldGained;
      }
      pushResourceReward(events, "battle", { gold: goldGained, exp });
    } else if (action.type === "stageGift:claim") {
      const stage = Math.floor(action.stage);
      if (
        stage >= 1
        && stage <= save.highestClearedStage
        && !save.claimedStageGiftStages.includes(stage)
      ) {
        save.claimedStageGiftStages = [...save.claimedStageGiftStages, stage]
          .sort((left, right) => left - right);
        save.gems += STAGE_GIFT_STARSTONE_REWARD;
        pushResourceReward(events, "stage-gift", { gems: STAGE_GIFT_STARSTONE_REWARD });
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
        events.push({ type: "toast", message: reason ?? "远征尚未解锁" });
      } else {
        const now = Date.now();
        const maxStamina = calculateExpeditionStamina(save, dungeon, action.heroIds);
        save.dungeonRuns = [
          ...save.dungeonRuns,
          {
            dungeonId: action.dungeonId,
            heroIds: [...action.heroIds],
            startedAt: now,
            maxStamina,
          },
        ];
      }
    } else if (action.type === "dungeon:claim" || action.type === "dungeon:recall") {
      const dungeon = DUNGEON_BY_ID[action.dungeonId];
      const run = getDungeonRun(save.dungeonRuns, action.dungeonId);
      if (!dungeon || !run) {
        events.push({
          type: "toast",
          message: action.type === "dungeon:recall" ? "没有可召回的远征队" : "没有可领取的远征",
        });
      } else if (action.type === "dungeon:claim" && !isDungeonRunReady(run)) {
        events.push({ type: "toast", message: "远征队尚未返程" });
      } else {
        const rewards = rollDungeonRunRewards(run);
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
        pushResourceReward(events, "dungeon", { gold: rewards.gold, exp: rewards.exp });
        const dropSummary = Object.entries(rewards.materials)
          .filter(([, amount]) => (amount ?? 0) > 0)
          .map(([id, amount]) => `${MATERIAL_BY_ID[id as keyof typeof MATERIAL_BY_ID]?.name ?? id}×${amount}`)
          .join(" · ");
        const resultLabel = action.type === "dungeon:recall" ? "队伍已召回" : "远征返程";
        this.state.ui.toast = dropSummary ? `${resultLabel} · ${dropSummary}` : `${resultLabel}，奖励已结算`;
        events.push({ type: "toast", message: this.state.ui.toast });
      }
    } else if (action.type === "summon:single") {
      this.summon(1, SUMMON_SINGLE_COST, events);
    } else if (action.type === "summon:five") {
      this.summon(5, SUMMON_FIVE_COST, events);
    } else if (action.type === "summon:selectTheme") {
      const current = save.personalSummonTheme;
      if (current?.classId === action.classId && current.expiresAt > action.now) {
        events.push({ type: "toast", message: "该职业主题已生效" });
      } else if (save.gems < SUMMON_THEME_SELECTION_COST) {
        events.push({ type: "toast", message: "星石不足" });
      } else {
        save.gems -= SUMMON_THEME_SELECTION_COST;
        save.personalSummonTheme = {
          classId: action.classId,
          expiresAt: action.now + SUMMON_THEME_DURATION_MS,
        };
      }
    } else if (action.type === "summon:resetTheme") {
      save.personalSummonTheme = null;
    } else if (handleShopCommand(action, save, events)) {
      // Shop commands own their complete state transition.
    } else if (action.type === "ability:upgrade") {
      const definition = ABILITY_BY_ID[action.abilityId];
      const level = save.abilities[action.abilityId] ?? 0;
      if (!definition) {
        events.push({ type: "toast", message: "未知能力" });
      } else if (level >= definition.maxLevel) {
        events.push({ type: "toast", message: "能力已达上限" });
      } else {
        const cost = getAbilityUpgradeCost(action.abilityId, level);
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
    } else if (action.type === "lootChest:open") {
      const { difficulty, stage: dropStage } = bestIdleProgress(save.difficultyProgress);
      const result = openLootChest(
        save.lootChest,
        action.now,
        dropStage,
        difficulty,
        save.abilities,
      );
      const debugItems = this.state.ui.debugLootChestItems;
      if (!result.ok && debugItems.length === 0) {
        events.push({ type: "toast", message: "挂机时间不足 5 分钟" });
      } else {
        const minutes = result.ok ? result.minutes : 0;
        const gold = result.ok ? result.gold : 0;
        const exp = result.ok ? result.exp : 0;
        const items = [...(result.ok ? result.items : []), ...debugItems];
        if (result.ok) save.lootChest = result.chest;
        save.gold += gold;
        save.exp += exp;
        let goldGained = gold;
        for (const item of items) {
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
          goldGained += inserted.goldGained;
          if (inserted.rejected) {
            events.push({ type: "toast", message: "溢出区已满，部分装备未能放入" });
          }
        }
        this.state.ui.debugLootChestItems = [];
        pushResourceReward(events, "loot-chest", { gold: goldGained, exp });
        events.push({
          type: "lootChest:opened",
          minutes,
          gold,
          exp,
          items,
        });
      }
    } else if (action.type === "offline:claim") {
      save.gold += action.gold;
      save.exp += action.exp;
      let goldGained = action.gold;
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
        goldGained += result.goldGained;
      }
      pushResourceReward(events, "offline", { gold: goldGained, exp: action.exp });
    } else if (action.type === "settings:update") {
      Object.assign(save.settings, action.patch);
      if (save.settings.battleSpeed > getAdVipBenefits(save.adVip.watchedAds).speed) save.settings.battleSpeed = 1;
    } else if (action.type === "tutorial:complete") {
      save.tutorialCompleted = true;
    }
    for (const event of events) {
      if (event.type === "alchemy:crafted") recordTaskProgress(save, "alchemy");
      if (event.type === "hero:leveled" && action.type === "hero:levelUp") recordTaskProgress(save, "hero_level");
      if (event.type === "hero:ascended") recordTaskProgress(save, "hero_ascend");
      if (event.type === "craft:socketed") recordTaskProgress(save, "socket");
      if (event.type === "summon:completed") recordTaskProgress(save, "summon", event.results.length);
      if (event.type === "craft:gemRankFused") recordTaskProgress(save, "gem_fusion");
      if (event.type === "craft:allGemsFused") recordTaskProgress(save, "gem_fusion", event.crafted);
      if (event.type === "dungeon:cleared" && action.type === "dungeon:claim") recordTaskProgress(save, "expedition");
      if (event.type === "lootChest:opened" && event.minutes >= 5) recordTaskProgress(save, "loot");
    }
    save.updatedAt = Date.now();
    this.state.revision += 1;
    for (const listener of this.listeners) listener(this.state, events);
  }

  private grantIdleReward(reward: LootChestPreview, events: AppEvent[], taskMinutes: number): void {
    const save = this.state.save;
    save.gold += reward.gold; save.exp += reward.exp;
    let gold = reward.gold;
    for (const item of reward.items) {
      const result = insertInventoryItem(save.inventory, save.overflow, item, collectEquippedItemIds(save.roster), getBackpackCapacity(save.abilities));
      save.inventory = result.inventory; save.overflow = result.overflow;
      save.gold += result.goldGained; gold += result.goldGained;
    }
    pushResourceReward(events, "loot-chest", { gold, exp: reward.exp });
    events.push({ type: "lootChest:opened", minutes: taskMinutes, gold: reward.gold, exp: reward.exp, items: reward.items });
  }

  private grantStarterEquipment(heroId: HeroId): void {
    const save = this.state.save, hero = save.roster[heroId];
    const bands: Record<number, readonly [number, number]> = { 5: [0, 2], 10: [2, 5], 15: [5, 7], 20: [7, 10] };
    const band = bands[hero.level];
    if (!band) return;
    const random = new SeededRandom(hero.level * 7919 + Number(heroId.slice(1)));
    for (const slot of EQUIPMENT_SLOTS.slice(band[0], band[1])) {
      const definition = ITEM_DEFINITIONS.find((item) => item.slot === slot && item.chapter === 1 && item.school === HERO_BY_ID[heroId].damageSchool)
        ?? ITEM_DEFINITIONS.find((item) => item.slot === slot)!;
      const item = createEquipment(definition.id, 1, "common", random, hero.level);
      const result = insertInventoryItem(save.inventory, save.overflow, item, collectEquippedItemIds(save.roster), getBackpackCapacity(save.abilities));
      save.inventory = result.inventory; save.overflow = result.overflow; save.gold += result.goldGained;
      if (!hero.equipment[slot] && save.inventory.some((entry) => entry.instanceId === item.instanceId)) hero.equipment[slot] = item.instanceId;
    }
  }

  private summon(count: number, cost: number, events: AppEvent[]): void {
    const save = this.state.save;
    if (save.gems < cost) {
      events.push({ type: "toast", message: "星石不足" });
      return;
    }
    save.gems -= cost;
    const results: SummonPullResult[] = [];
    const now = Date.now();
    const activeTheme = getActiveSummonTheme(save.personalSummonTheme, now);
    const random = this.summonRandom ?? new SeededRandom(
      (now ^ save.updatedAt ^ Math.imul(save.summonCount + 1, 0x9e3779b1)) >>> 0 || 1,
    );
    let heroResults = 0;
    for (let index = 0; index < count; index += 1) {
      const introHeroId = INTRO_SUMMON_HERO_IDS[save.summonCount];
      const themePity = save.summonThemeMisses >= SUMMON_THEME_PITY_PULLS - 1;
      const fivePullGuarantee = count === 5 && index === count - 1 && heroResults === 0;
      const rewardKind = introHeroId || themePity || fivePullGuarantee
        ? "hero"
        : rollSummonRewardKind(random);

      if (rewardKind === "hero") {
        const heroId: HeroId = introHeroId ?? selectSummonHero(
          random,
          RELEASED_HERO_DEFINITIONS,
          (id) => save.roster[id].unlocked,
          activeTheme.classId,
          themePity,
        );
        if (!save.roster[heroId].unlocked) {
          save.roster[heroId].unlocked = true;
          results.push({ kind: "unlock", heroId });
          events.push({ type: "hero:unlocked", heroId });
        } else {
          save.roster[heroId].marks += 1;
          results.push({ kind: "marks", heroId, marks: 1 });
        }
        heroResults += 1;
        save.summonThemeMisses = HERO_BY_ID[heroId].classId === activeTheme.classId
          ? 0
          : Math.min(SUMMON_THEME_PITY_PULLS - 1, save.summonThemeMisses + 1);
      } else if (rewardKind === "universalMarks") {
        save.universalHeroMarks += 1;
        results.push({ kind: "universalMarks", amount: 1 });
        save.summonThemeMisses = Math.min(SUMMON_THEME_PITY_PULLS - 1, save.summonThemeMisses + 1);
      } else if (rewardKind === "ascendStone") {
        save.materials.mat_ascend_stone += 1;
        results.push({ kind: "ascendStone", amount: 1 });
        save.summonThemeMisses = Math.min(SUMMON_THEME_PITY_PULLS - 1, save.summonThemeMisses + 1);
      } else if (rewardKind === "exp") {
        const amount = getSummonExperienceReward(save.highestClearedStage);
        save.exp += amount;
        results.push({ kind: "exp", amount });
        save.summonThemeMisses = Math.min(SUMMON_THEME_PITY_PULLS - 1, save.summonThemeMisses + 1);
      } else {
        const amount = getSummonGoldReward(save.highestClearedStage);
        save.gold += amount;
        results.push({ kind: "gold", amount });
        save.summonThemeMisses = Math.min(SUMMON_THEME_PITY_PULLS - 1, save.summonThemeMisses + 1);
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
    if (!canHeroEquipItem(hero.level, item)) {
      this.state.ui.toast = `需要英雄达到 ${getEquipmentLevel(item)} 级`;
      return;
    }
    const replacedItemId = hero.equipment[item.slot] && hero.equipment[item.slot] !== item.instanceId
      ? hero.equipment[item.slot] ?? undefined
      : undefined;
    for (const progress of Object.values(save.roster)) {
      if (progress.equipment[item.slot] === item.instanceId) {
        progress.equipment[item.slot] = null;
      }
    }
    hero.equipment[item.slot] = item.instanceId;
    events.push({ type: "item:equipped", heroId, itemId, replacedItemId });
    this.state.ui.toast = `装备成功 · 战力 ${getItemScore(item)}`;
  }

  private autoEquipItems(heroId: HeroId, events: AppEvent[]): void {
    const save = this.state.save;
    const hero = save.roster[heroId];
    if (!hero?.unlocked) {
      this.state.ui.toast = "英雄未解锁";
      return;
    }

    const equippedIds = collectEquippedItemIds(save.roster);
    let equippedCount = 0;
    for (const slot of EQUIPMENT_SLOTS) {
      const currentItemId = hero.equipment[slot];
      const currentItem = currentItemId
        ? save.inventory.find(({ instanceId }) => instanceId === currentItemId) ?? null
        : null;

      let bestItem: (typeof save.inventory)[number] | null = null;
      for (const item of save.inventory) {
        if (item.slot !== slot || equippedIds.has(item.instanceId) || !canHeroEquipItem(hero.level, item)) continue;
        if (!isEquipmentUpgrade(item, currentItem)) continue;
        if (bestItem && getItemScore(item) <= getItemScore(bestItem)) continue;
        bestItem = item;
      }
      if (!bestItem) continue;

      if (currentItemId) equippedIds.delete(currentItemId);
      hero.equipment[slot] = bestItem.instanceId;
      equippedIds.add(bestItem.instanceId);
      equippedCount += 1;
      events.push({
        type: "item:equipped",
        heroId,
        itemId: bestItem.instanceId,
        replacedItemId: currentItemId ?? undefined,
      });
    }

    this.state.ui.toast = equippedCount > 0
      ? `已自动装备 ${equippedCount} 件`
      : "暂无可自动装备的装备";
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
    const returned = removeAllGems(item, save.materials);
    save.inventory.splice(index, 1);
    const gold = getSalvageGold(item);
    const essence = getSetEssenceSalvageReward(item);
    const setEssences: Partial<Record<SetId, number>> = essence
      ? { [essence.setId]: essence.amount }
      : {};
    if (essence) {
      save.setEssences[essence.setId] += essence.amount;
    }
    save.gold += gold;
    events.push({ type: "item:salvaged", itemId, gold, setEssences });
    if (returned.count > 0) {
      events.push({
        type: "gems:returned",
        source: "salvage",
        itemIds: [itemId],
        count: returned.count,
        gems: returned.gems,
      });
    }
    pushResourceReward(events, "salvage", { gold });
    const essenceText = formatSetEssenceRewards(setEssences);
    this.state.ui.toast = `分解获得 金币 +${gold}${essenceText ? ` · ${essenceText}` : ""}`;
  }

  private salvageMany(itemIds: readonly string[], events: AppEvent[]): void {
    const save = this.state.save;
    const idSet = new Set(itemIds);
    let gold = 0;
    let count = 0;
    const setEssences: Partial<Record<SetId, number>> = {};
    const returnedGems: Partial<Record<GemMaterialId, number>> = {};
    const returnedItemIds: string[] = [];
    let returnedGemCount = 0;
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
      const returned = removeAllGems(item, save.materials);
      if (returned.count > 0) {
        returnedGemCount += returned.count;
        returnedItemIds.push(item.instanceId);
        mergeReturnedGems(returnedGems, returned.gems);
      }
      const essence = getSetEssenceSalvageReward(item);
      if (essence) {
        setEssences[essence.setId] = (setEssences[essence.setId] ?? 0) + essence.amount;
      }
      count += 1;
    }
    if (count === 0) return;
    save.inventory = remaining;
    save.gold += gold;
    for (const [rawSetId, amount] of Object.entries(setEssences)) {
      const setId = rawSetId as SetId;
      save.setEssences[setId] += amount ?? 0;
    }
    events.push({ type: "item:salvagedMany", count, gold, setEssences });
    if (returnedGemCount > 0) {
      events.push({
        type: "gems:returned",
        source: "salvage",
        itemIds: returnedItemIds,
        count: returnedGemCount,
        gems: returnedGems,
      });
    }
    pushResourceReward(events, "salvage", { gold });
    const essenceText = formatSetEssenceRewards(setEssences);
    this.state.ui.toast = `分解 ${count} 件 · 金币 +${gold}${essenceText ? ` · ${essenceText}` : ""}`;
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
    const socketCount = item.sockets?.length ?? 0;
    if (socketCount >= MAX_EQUIPMENT_SOCKETS) {
      events.push({ type: "toast", message: "已达最大孔位数" });
      return;
    }
    const stoneCost = getSocketStoneCost(socketCount);
    if ((this.state.save.materials.mat_socket_stone ?? 0) < stoneCost) {
      events.push({ type: "toast", message: "开孔石不足" });
      return;
    }
    if (this.state.save.gold < SOCKET_GOLD_COST) {
      events.push({ type: "toast", message: "金币不足" });
      return;
    }
    const result = openEquipmentSocket(item, this.state.save.materials);
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    this.state.save.gold -= SOCKET_GOLD_COST;
    events.push({ type: "craft:socketed", itemId, sockets: item.sockets?.length ?? 0 });
    this.state.ui.toast = `开孔成功 · ${item.sockets?.length ?? 0}/2`;
  }

  private craftReset(itemId: string, affixIndex: number, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const previousAffix = item.affixes[affixIndex];
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
    events.push({
      type: "craft:reset",
      itemId,
      affixId: result.affix.affixId,
      previousValue: previousAffix!.value,
      value: result.affix.value,
    });
    this.state.ui.toast = `重置成功 · ${formatAffixValue(result.affix.affixId, result.affix.value)}`;
  }

  private craftSmelt(itemId: string, affixId: import("../content/affixes").AffixId, events: AppEvent[]): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    if ((this.state.save.materials.mat_smelt_flux ?? 0) < 1) {
      events.push({ type: "toast", message: "熔炼触媒不足" });
      return;
    }
    if (this.state.save.gold < SMELT_GOLD_COST) {
      events.push({ type: "toast", message: "金币不足" });
      return;
    }
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
    this.state.save.gold -= SMELT_GOLD_COST;
    events.push({
      type: "craft:smelted",
      itemId,
      affixId,
      value: result.roll.value,
      previousAffixId: result.previous?.affixId ?? null,
      previousValue: result.previous?.value ?? null,
    });
    this.state.ui.toast = `熔炼成功 · ${formatAffixValue(affixId, result.roll.value)}`;
  }

  private craftInlay(
    itemId: string,
    socketIndex: number,
    gemId: import("../content/materials").GemMaterialId,
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
    events.push({ type: "craft:gemRemoved", itemId, gemId: result.gemId });
    this.state.ui.toast = `已卸下 · ${MATERIAL_BY_ID[result.gemId].name}`;
  }

  private returnItemGems(itemId: string, events: AppEvent[]): void {
    const item = this.state.save.inventory.find(({ instanceId }) => instanceId === itemId);
    if (!item) return;
    const returned = removeAllGems(item, this.state.save.materials);
    if (returned.count <= 0) return;
    events.push({
      type: "gems:returned",
      source: "equipment",
      itemIds: [itemId],
      count: returned.count,
      gems: returned.gems,
    });
  }

  private craftFuseGemRank(
    gemId: GemMaterialId,
    events: AppEvent[],
  ): void {
    const result = fuseGemRank(this.state.save.materials, gemId);
    if (!result.ok || !result.resultId) {
      events.push({ type: "toast", message: "需要三颗相同的非满级宝石" });
      return;
    }
    events.push({
      type: "craft:gemRankFused",
      sourceId: gemId,
      resultId: result.resultId,
    });
    this.state.ui.toast = "宝石合成完成";
  }

  private craftFuseAllGems(events: AppEvent[]): void {
    let crafted = 0;
    let families = 0;
    let highestRank: GemRank = 1;
    for (const gemBaseId of GEM_BASE_IDS) {
      const result = fuseGemFamily(this.state.save.materials, gemBaseId);
      if (!result.ok) continue;
      crafted += result.crafted;
      families += 1;
      if (result.highestRank > highestRank) highestRank = result.highestRank;
    }
    if (crafted <= 0) {
      events.push({ type: "toast", message: "当前没有可合成的同级宝石" });
      return;
    }
    events.push({ type: "craft:allGemsFused", crafted, families, highestRank });
    this.state.ui.toast = `全部一键合成完成 · ${crafted} 次`;
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
    const outcome = craftAlchemyItem(
      inputs,
      save.alchemyStation.level,
      new SeededRandom(Date.now() ^ save.updatedAt),
    );
    if (!outcome.ok) {
      events.push({ type: "toast", message: outcome.message });
      return;
    }
    const returnedGems: Partial<Record<GemMaterialId, number>> = {};
    const returnedItemIds: string[] = [];
    let returnedGemCount = 0;
    for (const item of inputs) {
      const returned = removeAllGems(item, save.materials);
      if (returned.count <= 0) continue;
      returnedGemCount += returned.count;
      returnedItemIds.push(item.instanceId);
      mergeReturnedGems(returnedGems, returned.gems);
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
    const stationBefore = { ...save.alchemyStation };
    const stationProgress = addAlchemyStationExperience(
      stationBefore,
      outcome.stationExperience,
    );
    save.alchemyStation = stationProgress.station;
    if (returnedGemCount > 0) {
      events.push({
        type: "gems:returned",
        source: "alchemy",
        itemIds: returnedItemIds,
        count: returnedGemCount,
        gems: returnedGems,
      });
    }
    events.push({
      type: "alchemy:crafted",
      resultId: outcome.result.instanceId,
      fromRarity: outcome.fromRarity,
      toRarity: outcome.toRarity,
      miracle: outcome.miracle,
      sourceLevel: outcome.sourceLevel,
      resultLevel: outcome.resultLevel,
      stationExperience: outcome.stationExperience,
      stationLevelBefore: stationBefore.level,
      stationExperienceBefore: stationBefore.exp,
      stationExperienceAfter: save.alchemyStation.exp,
      stationLevel: save.alchemyStation.level,
      levelsGained: stationProgress.levelsGained,
      greaterAffixEnergy: outcome.greaterAffixEnergy,
      greaterAffixCount: outcome.greaterAffixCount,
      result: outcome.result,
    });
    this.state.ui.toast = stationProgress.levelsGained > 0
      ? `炼金台升至 Lv.${save.alchemyStation.level} · 装备上限 Lv.${getAlchemyStationLevelCap(save.alchemyStation.level)}`
      : `${outcome.miracle ? "奇迹升品" : "炼金成功"} · Lv.${outcome.resultLevel} ${RARITY_LABELS[outcome.toRarity]}${outcome.greaterAffixCount > 0 ? ` · ${"★".repeat(outcome.greaterAffixCount)}` : ""} · 经验 +${outcome.stationExperience}`;
  }

  private craftImprint(
    itemId: string,
    setId: SetId,
    events: AppEvent[],
  ): void {
    const item = this.findCraftItem(itemId, events);
    if (!item) return;
    const result = imprintSetTag(
      item,
      setId,
      this.state.save.setEssences,
      this.state.save.materials,
    );
    if (!result.ok) {
      events.push({ type: "toast", message: result.reason });
      return;
    }
    events.push({
      type: "craft:imprinted",
      itemId,
      setId: result.setId,
      essenceCost: result.essenceCost,
      stoneCost: result.stoneCost,
    });
    this.state.ui.toast = "套装刻印成功";
  }
}
