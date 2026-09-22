import {
  RECURRING_TASKS,
  TASK_METRICS,
  TASK_MILESTONES,
  TASK_PERIODS,
  type TaskMetric,
  type TaskPeriod,
} from "../../content/recurringTasks";
import { getDateKey, getGameDayDate } from "../time/GameDay";

export interface TaskPeriodState {
  key: string;
  progress: Record<TaskMetric, number>;
  claimed: TaskMetric[];
  milestones: number[];
  claimedExp?: number;
  claimedExpByMilestone?: Record<number, number>;
}

export type RecurringTaskState = Record<TaskPeriod, TaskPeriodState>;

export function taskPeriodKey(period: TaskPeriod, now = Date.now()): string {
  const date = getGameDayDate(new Date(now));
  if (period === "weekly") date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return getDateKey(date);
}

export function createTaskPeriodState(period: TaskPeriod, now: number): TaskPeriodState {
  return {
    key: taskPeriodKey(period, now),
    progress: Object.fromEntries(TASK_METRICS.map((metric) => [metric, 0])) as Record<TaskMetric, number>,
    claimed: [],
    milestones: [],
  };
}

export function recurringTaskActivity(state: TaskPeriodState): number {
  return Math.min(100, state.claimed.length * 20);
}

export function normalizeRecurringTasks(value: unknown, now: number): RecurringTaskState {
  const source = value as Partial<RecurringTaskState> | null;
  return Object.fromEntries(TASK_PERIODS.map((period) => {
    const entry = source?.[period];
    const state = createTaskPeriodState(period, now);
    if (entry?.key === state.key) {
      for (const task of RECURRING_TASKS[period]) {
        const count = entry.progress?.[task.id];
        state.progress[task.id] = typeof count === "number" && Number.isFinite(count)
          ? Math.max(0, Math.min(task.target, Math.floor(count)))
          : 0;
      }
      state.claimed = RECURRING_TASKS[period]
        .filter((task) => state.progress[task.id] >= task.target
          && Array.isArray(entry.claimed)
          && entry.claimed.includes(task.id))
        .map((task) => task.id);
      state.milestones = TASK_MILESTONES[period]
        .filter((step) => Array.isArray(entry.milestones)
          && entry.milestones.includes(step.points))
        .map((step) => step.points);
      if (state.milestones.includes(80) && typeof entry.claimedExp === "number" && Number.isFinite(entry.claimedExp)) {
        state.claimedExp = Math.max(0, Math.floor(entry.claimedExp));
      }
      for (const points of state.milestones) {
        const amount = entry.claimedExpByMilestone?.[points];
        if (typeof amount === "number" && Number.isFinite(amount)) {
          (state.claimedExpByMilestone ??= {})[points] = Math.max(0, Math.floor(amount));
        }
      }
    }
    return [period, state];
  })) as RecurringTaskState;
}
