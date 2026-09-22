import type { SaveDataV1 } from "../domain/save/SaveData";
import { RECURRING_TASKS, TASK_MILESTONES, type RecurringTask, type TaskPeriod } from "../content/recurringTasks";
import { taskActivity, hasTaskRewards, getTaskMilestoneRewards } from "../progression/RecurringTaskSystem";
import { rewardInfo } from "./CheckInView";
import type { CheckInReward } from "../content/checkIn";

function rewardIcons(rewards: readonly CheckInReward[]) {
  return rewards.map((reward) => {
    const info = rewardInfo(reward.id);
    return `<span class="task-reward" aria-label="${info.name} ×${reward.amount}"><img src="${info.icon}" alt="${info.name}"><b>×${reward.amount.toLocaleString("zh-CN")}</b></span>`;
  }).join("");
}
export function renderRecurringTasks(save: SaveDataV1, period: TaskPeriod) {
  const state = save.recurringTasks[period];
  const activity = taskActivity(state);
  const priority = (task: RecurringTask) => state.claimed.includes(task.id) ? 2 : state.progress[task.id] >= task.target ? 0 : 1;
  const tasks = [...RECURRING_TASKS[period]].sort((a, b) => priority(a) - priority(b));
  return `<div class="tasks-period-bar"><div class="tasks-period-tabs" role="tablist" aria-label="任务周期">${(["daily", "weekly"] as const).map((key) => `<button type="button" role="tab" id="task-period-${key}" aria-controls="task-period-content" aria-selected="${key === period}" data-action="task-period" data-period="${key}" class="${hasTaskRewards(save, key) ? "has-reward" : ""}">${key === "daily" ? "每日" : "每周"}</button>`).join("")}</div></div>
    <div id="task-period-content" class="tasks-content" role="tabpanel" aria-labelledby="task-period-${period}">
    <section class="task-activity"><div class="task-activity-heading"><strong>${period === "daily" ? "今日" : "本周"}活跃度 <b>${activity}</b><small> / 100</small></strong><span class="tasks-reset-note">${period === "daily" ? "每日凌晨5点重置" : "每周一凌晨5点重置"}</span></div>
    <div class="task-milestones"><div class="task-activity-track" role="progressbar" aria-label="活跃度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${activity}"><i style="width:${activity}%"></i></div>${TASK_MILESTONES[period].map((step) => {
      const claimed = state.milestones.includes(step.points);
      const ready = !claimed && activity >= step.points;
      const chest = step.points === 40 ? "bronze" : step.points === 80 ? "silver" : "gold";
      return `<div class="task-activity-node ${activity >= step.points ? "is-reached" : ""}" style="left:${step.points}%"><span class="task-node-value">${step.points}</span><i class="task-node-dot" aria-hidden="true"></i><button type="button" class="task-milestone ${claimed ? "is-claimed" : ready ? "is-ready" : ""}" data-action="task-milestone-tips" data-period="${period}" data-points="${step.points}" aria-expanded="false" aria-label="${step.points}活跃度宝箱，${claimed ? "已领取，查看奖励" : ready ? "可领取，点击领取" : "未达成，查看奖励"}"><img class="task-milestone-chest" src="/assets/resources/loot_chest_${chest}.png" alt="">${claimed ? '<span class="task-chest-check" aria-hidden="true">✓</span>' : ""}</button></div>`;
    }).join("")}</div></section>
    <div class="recurring-task-list">${tasks.map((task) => {
      const count = state.progress[task.id];
      const claimed = state.claimed.includes(task.id);
      const ready = count >= task.target && !claimed;
      return `<article class="recurring-task ${claimed ? "is-claimed" : ""}" data-task-id="${task.id}"><div class="task-row-main"><div class="task-row-title"><strong>${task.title}</strong><span>${count}/${task.target}</span></div><div class="task-row-rewards">${rewardIcons([{ id: "gold", amount: task.gold }])}<span>活跃度 +20</span></div></div><button type="button" class="${ready ? "primary-button" : "secondary-button"}" data-action="${ready ? "task-claim" : "task-go"}" data-period="${period}" data-task-id="${task.id}" ${claimed ? "disabled" : ""}>${claimed ? "已领取" : ready ? "领取" : "前往"}</button></article>`;
    }).join("")}</div></div><div class="task-reward-tips" id="task-reward-tips" role="tooltip" aria-label="活跃度宝箱奖励" hidden></div>`;
}

export function renderTaskMilestoneTips(save: SaveDataV1, period: TaskPeriod, points: number): string {
  const step = TASK_MILESTONES[period].find((entry) => entry.points === points);
  if (!step) return "";
  const state = save.recurringTasks[period];
  const claimed = state.milestones.includes(points);
  return `<strong class="task-tips-title">${points}活跃度奖励</strong><div class="task-tips-rewards">${getTaskMilestoneRewards(save, period, points).map((reward) => {
    const info = rewardInfo(reward.id);
    return `<div><img src="${info.icon}" alt=""><span>${info.name}</span><b>×${reward.amount.toLocaleString("zh-CN")}</b></div>`;
  }).join("")}</div><small class="task-tips-state">${claimed ? "已领取" : `尚未达成 · ${taskActivity(state)}/${points}`}</small>`;
}

export function syncRecurringTasksContent(host: HTMLElement, save: SaveDataV1, period: TaskPeriod) {
  const template = document.createElement("div");
  template.innerHTML = renderRecurringTasks(save, period);
  const tips = host.querySelector<HTMLElement>(".task-reward-tips");
  if (tips && !tips.hidden && tips.dataset.key === save.recurringTasks[period].key) {
    const anchor = template.querySelector(`[data-action="task-milestone-tips"][data-points="${tips.dataset.points}"]`);
    anchor?.setAttribute("aria-expanded", "true");
    anchor?.setAttribute("aria-describedby", "task-reward-tips");
  }
  for (const selector of [".task-activity-heading", ".task-activity-track", ".task-activity-node"]) {
    const current = host.querySelectorAll(selector);
    template.querySelectorAll(selector).forEach((next, index) => {
      if (current[index]?.outerHTML !== next.outerHTML) current[index]?.replaceWith(next);
    });
  }
  const list = host.querySelector<HTMLElement>(".recurring-task-list");
  if (list) {
    const focused = list.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const current = new Map([...list.querySelectorAll<HTMLElement>(".recurring-task")].map((row) => [row.dataset.taskId, row]));
    template.querySelectorAll<HTMLElement>(".recurring-task").forEach((next, index) => {
      let row = current.get(next.dataset.taskId);
      if (!row || row.outerHTML !== next.outerHTML) {
        row?.replaceWith(next);
        row = next;
      }
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
    });
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
  }
  for (const key of ["daily", "weekly"] as const) host.querySelector(`.tasks-period-tabs [data-period="${key}"]`)?.classList.toggle("has-reward", hasTaskRewards(save, key));
  if (tips && !tips.hidden) {
    if (tips.dataset.key !== save.recurringTasks[period].key) {
      const focused = tips.contains(document.activeElement);
      tips.hidden = true;
      if (focused) host.querySelector<HTMLElement>(`[data-action="task-milestone-tips"][data-points="${tips.dataset.points}"]`)?.focus({ preventScroll: true });
    }
    else {
      const content = document.createElement("div");
      content.innerHTML = renderTaskMilestoneTips(save, period, Number(tips.dataset.points));
      if (tips.innerHTML !== content.innerHTML) {
        tips.replaceChildren(...content.childNodes);
      }
      host.querySelector(`[data-action="task-milestone-tips"][data-points="${tips.dataset.points}"]`)?.setAttribute("aria-expanded", "true");
      host.querySelector(`[data-action="task-milestone-tips"][data-points="${tips.dataset.points}"]`)?.setAttribute("aria-describedby", "task-reward-tips");
    }
  }
}
