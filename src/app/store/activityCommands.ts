import type { SaveDataV1 } from "../../domain/save/SaveData";
import { claimCheckIn, openRewardBox } from "../../progression/CheckInSystem";
import { claimRecurringTask, claimTaskMilestone } from "../../progression/RecurringTaskSystem";
import type { GameAction } from "../actions";
import type { AppEvent } from "../events";
import { pushResourceReward } from "./resourceEvents";

type ActivityAction = Extract<GameAction,
  | { type: "tasks:sync" | "tasks:claim" | "tasks:milestone" }
  | { type: "checkIn:claim" | "rewardBox:open" }
>;

function isActivityAction(action: GameAction): action is ActivityAction {
  return action.type === "tasks:sync"
    || action.type === "tasks:claim"
    || action.type === "tasks:milestone"
    || action.type === "checkIn:claim"
    || action.type === "rewardBox:open";
}

export function handleActivityCommand(
  action: GameAction,
  save: SaveDataV1,
  events: AppEvent[],
): boolean {
  if (!isActivityAction(action)) return false;
  if (action.type === "tasks:sync") return true;
  if (action.type === "tasks:claim" || action.type === "tasks:milestone") {
    const rewards = action.type === "tasks:claim"
      ? claimRecurringTask(save, action.period, action.taskId)
      : claimTaskMilestone(save, action.period, action.points);
    if (rewards) {
      pushResourceReward(events, "tasks", Object.fromEntries(rewards
        .filter(({ id }) => id === "gold" || id === "gems" || id === "exp")
        .map(({ id, amount }) => [id, amount])));
      events.push({ type: "toast", message: "任务奖励已领取" });
    }
    return true;
  }
  if (action.type === "checkIn:claim") {
    const rewards = claimCheckIn(save);
    if (rewards) {
      pushResourceReward(events, "check-in", Object.fromEntries(rewards
        .filter(({ id }) => id === "gold" || id === "gems" || id === "exp")
        .map(({ id, amount }) => [id, amount])));
    } else {
      events.push({ type: "toast", message: "今日已签到" });
    }
    return true;
  }
  const reward = openRewardBox(save, action.boxId);
  if (reward) events.push({ type: "rewardBox:opened", boxId: action.boxId, ...reward });
  else events.push({ type: "toast", message: "该宝箱已用完" });
  return true;
}
