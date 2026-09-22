import { ACCOUNT_CURRENCY_BY_ID, type AccountCurrencyId } from "../content/currencies";
import { AD_TICKET, REWARD_BOXES, isRewardBoxId, type CheckInReward, type RewardBoxId } from "../content/checkIn";
import { MATERIAL_BY_ID, type MaterialId } from "../content/materials";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { getCheckInStatus } from "../progression/CheckInSystem";

export interface BoxResult { materialId: MaterialId; amount: number }

export function rewardInfo(id: CheckInReward["id"]) {
  if (id === "mat_ascend_stone") return MATERIAL_BY_ID[id];
  if (id === "ad_ticket") return AD_TICKET;
  return isRewardBoxId(id) ? REWARD_BOXES[id] : ACCOUNT_CURRENCY_BY_ID[id as AccountCurrencyId];
}

function rewardMarkup(reward: CheckInReward) {
  const info = rewardInfo(reward.id);
  if (reward.id === "mat_ascend_stone" || reward.id === "ad_ticket") {
    return `<span class="check-in-reward is-named" aria-label="${info.name} ×${reward.amount}"><img src="${info.icon}" alt=""><span><small>${info.name}</small><b>×${reward.amount}</b></span></span>`;
  }
  return `<span class="check-in-reward" aria-label="${info.name} ×${reward.amount}"><span class="check-in-reward-amount"><img src="${info.icon}" alt="${info.name}"><b>×${reward.amount.toLocaleString("zh-CN")}</b></span>${reward.id !== "gold" && reward.id !== "gems" ? `<span class="check-in-reward-label">${info.name}</span>` : ""}</span>`;
}

function boxPool(id: RewardBoxId) {
  const box = REWARD_BOXES[id];
  return `<p class="reward-box-description">${box.description}</p><ul class="reward-box-pool">${box.drops.map(({ materialId, amount }) => {
    const material = MATERIAL_BY_ID[materialId];
    return `<li><img src="${material.icon}" alt=""><span>${material.name}<b>×${amount}</b></span><small>${box.drops.length === 12 ? "1/12" : "25%"}</small></li>`;
  }).join("")}</ul>`;
}

export function renderCheckInContent(save: SaveDataV1) {
  const status = getCheckInStatus(save.checkIn);
  const complete = status.claimedInCycle === 7;
  return `<div class="check-in-scroll">
    <div class="check-in-progress"><span>累计签到</span><strong aria-label="累计签到${status.claimedInCycle}天"><b>${status.claimedInCycle}</b> / 7</strong></div>
    <div class="check-in-grid">${status.rewards.map((rewards, index) => {
      const claimed = index < status.claimedInCycle;
      const today = status.canClaim && index === status.claimedInCycle;
      return `<section class="check-in-day ${index === 6 ? "check-in-finale" : ""} ${claimed ? "is-claimed" : ""} ${today ? "is-today" : ""}" aria-label="第${index + 1}天，${claimed ? "已领取" : today ? "今日可领" : "待签到"}">
        <div class="check-in-day-heading"><strong>第${index + 1}天</strong>${index === 6 ? `<span>累计大奖</span>` : ""}</div>
        <div class="check-in-rewards">${rewards.map(rewardMarkup).join("")}</div>
        <span class="check-in-day-state">${claimed ? `<span class="check-in-claimed-mark" aria-hidden="true">✓</span>已领取` : today ? "今日可领" : "待签到"}</span>
      </section>`;
    }).join("")}</div>
  </div>
  <footer class="check-in-footer">${complete ? `<p class="check-in-complete">${status.firstWeek ? "凌晨5点开启每日签到" : "凌晨5点开启新一轮签到"}</p>` : ""}<button type="button" class="primary-button" data-action="check-in-claim" ${status.canClaim ? "" : "disabled"}>${status.canClaim ? "领取今日奖励" : "今日已签到"}</button></footer>`;
}

export function renderBagItemTips(save: SaveDataV1, id: RewardBoxId | "ad_ticket", result: BoxResult | null) {
  const box = isRewardBoxId(id);
  const info = box ? REWARD_BOXES[id] : AD_TICKET;
  const count = box ? save.rewardBoxes[id] : save.adTickets;
  return `<div class="equip-tips-layer equipment-choice-layer global-equipment-choice-layer" role="presentation"><div class="equip-tips-backdrop" aria-hidden="true"></div>
    <section class="equipment-tips-popover material-tips-popover inventory-consumable-tips is-single" id="global-material-tips" role="dialog" aria-modal="false" aria-label="${info.name}详情"><div class="equipment-tips-pair"><article class="equipment-tip-card material-tip-card selected">
      <header class="equipment-tip-head"><div class="equipment-tip-icon material-tip-icon"><img class="material-art" src="${info.icon}" alt=""></div><div><span class="equipment-tip-context">道具详情</span><h3>${info.name}</h3><p class="reward-box-summary">库存 ×${count}</p></div></header>
      <div class="equipment-tip-body">${box ? boxPool(id) : `<p class="reward-box-description">${info.description}</p>`}
      ${box && result ? `<div class="reward-box-result" role="status" tabindex="-1"><img src="${MATERIAL_BY_ID[result.materialId].icon}" alt=""><span>获得 <strong>${MATERIAL_BY_ID[result.materialId].name} ×${result.amount}</strong><small>已放入材料背包</small></span></div>` : ""}</div>
      ${box ? `<footer class="equipment-tip-footer"><button type="button" class="primary-button equipment-tips-action" data-action="reward-box-open" data-box-id="${id}" ${count > 0 ? "" : "disabled"}>${count > 0 ? result ? "再打开1个" : "打开1个" : "宝箱已用完"}</button></footer>` : ""}
    </article></div></section></div>`;
}
