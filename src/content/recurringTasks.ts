import type { CheckInReward } from "./checkIn";

export const TASK_PERIODS = ["daily", "weekly"] as const;
export type TaskPeriod = (typeof TASK_PERIODS)[number];
export const TASK_METRICS = ["victory", "expedition", "loot", "purchase", "alchemy", "hero_level", "summon", "gem_fusion", "hero_ascend", "socket"] as const;
export type TaskMetric = (typeof TASK_METRICS)[number];
export interface RecurringTask { id: TaskMetric; title: string; target: number; gold: number; destination: "battle" | "stages" | "shop" | "alchemy" | "heroes" | "summon" }
export const RECURRING_TASKS: Record<TaskPeriod, readonly RecurringTask[]> = {
  daily: [
    { id: "victory", title: "赢得10场战斗", target: 10, gold: 1000, destination: "battle" },
    { id: "loot", title: "开启1次讨伐宝箱", target: 1, gold: 1000, destination: "battle" },
    { id: "purchase", title: "在商店购买1次", target: 1, gold: 1000, destination: "shop" },
    { id: "alchemy", title: "炼金台合成1次", target: 1, gold: 1000, destination: "alchemy" },
    { id: "hero_level", title: "升级英雄1次", target: 1, gold: 1000, destination: "heroes" },
    { id: "expedition", title: "领取1次远征奖励", target: 1, gold: 1000, destination: "stages" },
    { id: "gem_fusion", title: "合成宝石1次", target: 1, gold: 1000, destination: "alchemy" },
  ],
  weekly: [
    { id: "victory", title: "赢得100场战斗", target: 100, gold: 5000, destination: "battle" },
    { id: "expedition", title: "领取5次远征奖励", target: 5, gold: 5000, destination: "stages" },
    { id: "alchemy", title: "炼金台合成10次", target: 10, gold: 5000, destination: "alchemy" },
    { id: "hero_level", title: "升级英雄10次", target: 10, gold: 5000, destination: "heroes" },
    { id: "summon", title: "召唤英雄5次", target: 5, gold: 5000, destination: "summon" },
    { id: "gem_fusion", title: "合成宝石3次", target: 3, gold: 5000, destination: "alchemy" },
    { id: "hero_ascend", title: "英雄进阶1次", target: 1, gold: 5000, destination: "heroes" },
    { id: "socket", title: "装备开孔2次", target: 2, gold: 5000, destination: "alchemy" },
  ],
};
export const TASK_MILESTONES: Record<TaskPeriod, readonly { points: number; rewards: readonly CheckInReward[]; expMinutes?: number }[]> = {
  daily: [
    { points: 40, expMinutes: 60, rewards: [{ id: "gold", amount: 5000 }, { id: "material_box", amount: 1 }] },
    { points: 80, expMinutes: 60, rewards: [{ id: "gem_box", amount: 2 }] },
    { points: 100, rewards: [{ id: "gems", amount: 80 }, { id: "ad_ticket", amount: 1 }] },
  ],
  weekly: [
    { points: 40, rewards: [{ id: "gold", amount: 20000 }, { id: "material_box", amount: 3 }] },
    { points: 80, rewards: [{ id: "gold", amount: 20000 }, { id: "gem_box", amount: 5 }] },
    { points: 100, rewards: [{ id: "gems", amount: 400 }, { id: "ad_ticket", amount: 3 }] },
  ],
};
export function isTaskPeriod(value: unknown): value is TaskPeriod { return value === "daily" || value === "weekly"; }
