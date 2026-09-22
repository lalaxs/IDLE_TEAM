import { RECURRING_TASKS, TASK_MILESTONES, TASK_PERIODS, type TaskMetric, type TaskPeriod } from "../content/recurringTasks";
import type { CheckInReward } from "../content/checkIn";
import {
  createTaskPeriodState,
  recurringTaskActivity,
  taskPeriodKey,
  type RecurringTaskState,
  type TaskPeriodState,
} from "../domain/activities/RecurringTaskState";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { grantActivityRewards } from "./CheckInSystem";
import { progressExperiencePerHour } from "../content/numericalModel";

export type { RecurringTaskState, TaskPeriodState };
export { taskPeriodKey };
export function syncRecurringTasks(save: SaveDataV1, now = Date.now()) {
  for (const period of TASK_PERIODS) if (taskPeriodKey(period, now) > save.recurringTasks[period].key) save.recurringTasks[period] = createTaskPeriodState(period, now);
}
export function recordTaskProgress(save: SaveDataV1, metric: TaskMetric, amount = 1) {
  for (const period of TASK_PERIODS) {
    const task = RECURRING_TASKS[period].find((task) => task.id === metric);
    if (!task) continue;
    const target = task.target;
    save.recurringTasks[period].progress[metric] = Math.min(target, save.recurringTasks[period].progress[metric] + amount);
  }
}
export function taskActivity(state: TaskPeriodState) { return recurringTaskActivity(state); }
export function claimRecurringTask(save: SaveDataV1, period: TaskPeriod, id: string): readonly CheckInReward[] | null {
  const task = RECURRING_TASKS[period].find((entry) => entry.id === id);
  const state = save.recurringTasks[period];
  if (!task || state.claimed.includes(task.id) || state.progress[task.id] < task.target) return null;
  state.claimed.push(task.id);
  const rewards: CheckInReward[] = [{ id: "gold", amount: task.gold }];
  grantActivityRewards(save, rewards);
  return rewards;
}
export function getTaskMilestoneRewards(save: SaveDataV1, period: TaskPeriod, points: number): readonly CheckInReward[] {
  const step = TASK_MILESTONES[period].find((entry) => entry.points === points);
  if (!step) return [];
  if (!step.expMinutes) return step.rewards;
  const state = save.recurringTasks[period];
  const amount = (state.milestones.includes(points) ? state.claimedExpByMilestone?.[points] ?? (points === 80 ? state.claimedExp : undefined) : undefined)
    ?? Math.round(progressExperiencePerHour(save.difficultyProgress) * step.expMinutes / 60);
  return [{ id: "exp", amount }, ...step.rewards];
}

export function claimTaskMilestone(save: SaveDataV1, period: TaskPeriod, points: number) {
  const step = TASK_MILESTONES[period].find((entry) => entry.points === points);
  const state = save.recurringTasks[period];
  if (!step || state.milestones.includes(points) || taskActivity(state) < points) return null;
  const rewards = getTaskMilestoneRewards(save, period, points);
  const exp = rewards.find((reward) => reward.id === "exp");
  if (exp) {
    (state.claimedExpByMilestone ??= {})[points] = exp.amount;
    if (points === 80) state.claimedExp = exp.amount;
  }
  state.milestones.push(points);
  grantActivityRewards(save, rewards);
  return rewards;
}
export function hasTaskRewards(save: SaveDataV1, period?: TaskPeriod) {
  return (period ? [period] : TASK_PERIODS).some((key) => {
    const state = save.recurringTasks[key];
    return RECURRING_TASKS[key].some((task) => state.progress[task.id] >= task.target && !state.claimed.includes(task.id))
      || TASK_MILESTONES[key].some((step) => taskActivity(state) >= step.points && !state.milestones.includes(step.points));
  });
}
