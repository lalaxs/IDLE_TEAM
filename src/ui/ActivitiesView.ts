import type { SaveDataV1 } from "../domain/save/SaveData";
import { getCheckInStatus } from "../progression/CheckInSystem";
import { renderCheckInContent } from "./CheckInView";
import { renderRecurringTasks } from "./RecurringTasksView";
import { hasTaskRewards } from "../progression/RecurringTaskSystem";
import type { TaskPeriod } from "../content/recurringTasks";
import { ACCOUNT_CURRENCY_DEFINITIONS } from "../content/currencies";
import { renderAdVip, VIP_ICON } from "./AdVipView";
import { hasVipRewards } from "../progression/AdVipSystem";

const CHECK_IN_TAB_ICON = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M8 8h24a3 3 0 0 1 3 3v23H8a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3Z" fill="#bda373" stroke="#24262d" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 7h24a3 3 0 0 1 3 3v17l-7 7H8a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Z" fill="#fff0cb" stroke="#24262d" stroke-width="2.5" stroke-linejoin="round"/><path d="M5 15h30v-5a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3Z" fill="#dfad53" stroke="#24262d" stroke-width="2.5"/><path d="M12 4v7m16-7v7" stroke="#24262d" stroke-width="4" stroke-linecap="round"/><path d="m12 23 5 5 10-10" fill="none" stroke="#507446" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 34v-7h7" fill="#d7bd87" stroke="#24262d" stroke-width="2" stroke-linejoin="round"/></svg>`;

export const ACTIVITY_TABS = [{
  id: "check-in",
  icon: CHECK_IN_TAB_ICON,
  label: (save: SaveDataV1) => getCheckInStatus(save.checkIn).firstWeek ? "7日签到" : "每日签到",
  render: renderCheckInContent,
}, {
  id: "tasks",
  icon: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 5h23v31H9z" fill="#ead7aa" stroke="#34291f" stroke-width="3" stroke-linejoin="round"/><path d="M14 4h13v6H14z" fill="#c4984c" stroke="#34291f" stroke-width="2"/><path d="m13 18 2 2 4-5m-6 14 2 2 4-5" fill="none" stroke="#507446" stroke-width="3" stroke-linecap="round"/><path d="M23 18h5m-5 10h5" stroke="#735f44" stroke-width="2" stroke-linecap="round"/></svg>`,
  label: (_save: SaveDataV1) => "日常任务",
  render: renderRecurringTasks,
}, {
  id: "vip",
  icon: VIP_ICON,
  label: (_save: SaveDataV1) => "广告VIP",
  render: (save: SaveDataV1) => renderAdVip(save),
}] as const;

export type ActivityTabId = (typeof ACTIVITY_TABS)[number]["id"];

export function isActivityTabId(id: unknown): id is ActivityTabId {
  return ACTIVITY_TABS.some((tab) => tab.id === id);
}

export function renderActivitiesPage(save: SaveDataV1, activeTab: ActivityTabId, taskPeriod: TaskPeriod, formatAmount: (value: number) => string) {
  return `<section class="activities-page" role="region" aria-label="活动" tabindex="-1"><div class="activities-resources resource-row" role="group" aria-label="资源">${ACCOUNT_CURRENCY_DEFINITIONS.map((currency) => `<div class="resource-chip activity-resource ${currency.tone}" data-activity-currency="${currency.id}" aria-label="${currency.name} ${save[currency.id].toLocaleString("zh-CN")}"><span class="resource-balance"><img class="resource-art" src="${currency.icon}" alt="" aria-hidden="true"><b>${formatAmount(save[currency.id])}</b></span></div>`).join("")}</div><header class="activities-page-header"><button type="button" class="activities-back" data-action="close-activities" aria-label="返回游戏"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>返回</span></button><h2>活动</h2></header>${renderActivitiesContent(save, activeTab, taskPeriod)}</section>`;
}

export function syncActivityResources(host: HTMLElement, save: SaveDataV1, formatAmount: (value: number) => string) {
  for (const currency of ACCOUNT_CURRENCY_DEFINITIONS) {
    const chip = host.querySelector<HTMLElement>(`[data-activity-currency="${currency.id}"]`);
    const amount = chip?.querySelector("b");
    const text = formatAmount(save[currency.id]);
    if (amount && amount.textContent !== text) amount.textContent = text;
    const label = `${currency.name} ${save[currency.id].toLocaleString("zh-CN")}`;
    if (chip && chip.getAttribute("aria-label") !== label) chip.setAttribute("aria-label", label);
  }
}

export function renderActivitiesContent(save: SaveDataV1, activeTab: ActivityTabId, taskPeriod: TaskPeriod = "daily") {
  const selected = ACTIVITY_TABS.find((tab) => tab.id === activeTab)!;
  return `<div class="activities-tabbar"><nav class="activities-tabs" role="tablist" aria-label="活动分类">${ACTIVITY_TABS.map((tab) => `<button type="button" id="activity-tab-${tab.id}" role="tab" aria-selected="${tab.id === activeTab}" aria-controls="activity-panel-${tab.id}" tabindex="${tab.id === activeTab ? 0 : -1}" data-action="activity-tab" data-tab="${tab.id}" class="${(tab.id === "tasks" ? hasTaskRewards(save) : tab.id === "vip" ? hasVipRewards(save) : getCheckInStatus(save.checkIn).canClaim) ? "has-reward" : ""}"><span class="activity-tab-emblem">${tab.icon}</span><span class="activity-tab-label">${tab.label(save)}</span></button>`).join("")}</nav></div>
    <section class="activity-panel" id="activity-panel-${selected.id}" role="tabpanel" aria-labelledby="activity-tab-${selected.id}">${selected.render(save, taskPeriod)}</section>`;
}
