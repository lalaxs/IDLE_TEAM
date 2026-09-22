import type { AccountCurrencyId } from "../../content/currencies";
import type { AppEvent, ResourceRewardSource } from "../events";

export function pushResourceReward(
  events: AppEvent[],
  source: ResourceRewardSource,
  rewards: Partial<Record<AccountCurrencyId, number>>,
): void {
  const positiveRewards: Partial<Record<AccountCurrencyId, number>> = {};
  for (const [currencyId, amount] of Object.entries(rewards) as [AccountCurrencyId, number][]) {
    if (amount > 0) positiveRewards[currencyId] = amount;
  }
  if (Object.keys(positiveRewards).length > 0) {
    events.push({ type: "resources:earned", source, rewards: positiveRewards });
  }
}
