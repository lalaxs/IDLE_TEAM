import { DAILY_CHECK_IN_REWARDS, FIRST_WEEK_REWARDS, REWARD_BOXES, isRewardBoxId, type CheckInReward, type RewardBoxId } from "../content/checkIn";
import { getDateKey } from "../domain/time/GameDay";
import type { SaveDataV1 } from "../domain/save/SaveData";

export interface CheckInProgress {
  claimedDays: number;
  lastClaimDate: string;
}

export function getCheckInStatus(progress: CheckInProgress, now = Date.now()) {
  const today = getDateKey(new Date(now));
  const canClaim = progress.lastClaimDate < today;
  // Keep the completed seventh day visible until the next calendar day.
  const displayIndex = Math.max(0, progress.claimedDays - (canClaim ? 0 : 1));
  const firstWeek = displayIndex < 7;
  const cycleStart = firstWeek ? 0 : 7 + Math.floor((displayIndex - 7) / 7) * 7;
  return {
    canClaim, firstWeek, cycleStart,
    claimedInCycle: Math.min(7, progress.claimedDays - cycleStart),
    rewards: firstWeek ? FIRST_WEEK_REWARDS : DAILY_CHECK_IN_REWARDS,
    cycle: firstWeek ? 0 : Math.floor((cycleStart - 7) / 7) + 1,
  };
}

export function claimCheckIn(save: SaveDataV1, now = Date.now()) {
  const status = getCheckInStatus(save.checkIn, now);
  if (!status.canClaim) return null;
  const rewards = status.rewards[save.checkIn.claimedDays - status.cycleStart]!;
  grantActivityRewards(save, rewards);
  save.checkIn.claimedDays += 1;
  save.checkIn.lastClaimDate = getDateKey(new Date(now));
  return rewards;
}

export function grantActivityRewards(save: SaveDataV1, rewards: readonly CheckInReward[]) {
  for (const { id, amount } of rewards) {
    if (id === "gold" || id === "gems" || id === "exp") save[id] += amount;
    else if (id === "mat_ascend_stone") save.materials[id] += amount;
    else if (id === "ad_ticket") save.adTickets += amount;
    else if (isRewardBoxId(id)) save.rewardBoxes[id] += amount;
  }
}

export function openRewardBox(save: SaveDataV1, id: RewardBoxId, random = Math.random) {
  if (save.rewardBoxes[id] <= 0) return null;
  const drops = REWARD_BOXES[id].drops;
  const reward = drops[Math.floor(random() * drops.length)]!;
  save.rewardBoxes[id] -= 1;
  save.materials[reward.materialId] += reward.amount;
  return reward;
}
