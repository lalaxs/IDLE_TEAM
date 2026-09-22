export type AdPlacement = "vip" | "shop" | "idle-double" | "idle-quick";
export type RewardedAdResult = "completed" | "cancelled" | "unavailable";
export type RewardedAdProvider = (placement: AdPlacement) => Promise<RewardedAdResult>;

let provider: RewardedAdProvider = async () => "unavailable";
/** Platform integration resolves completed only after the rewarded-video success callback. */
export function setRewardedAdProvider(next: RewardedAdProvider) { provider = next; }
export function showRewardedAd(placement: AdPlacement) { return provider(placement); }
