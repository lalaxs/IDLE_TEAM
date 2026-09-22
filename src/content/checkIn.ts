import { GEM_BASE_IDS, type MaterialId } from "./materials";
import type { AccountCurrencyId } from "./currencies";

export const REWARD_BOX_IDS = ["gem_box", "material_box"] as const;
export type RewardBoxId = (typeof REWARD_BOX_IDS)[number];
export type CheckInReward = { id: AccountCurrencyId | RewardBoxId | "mat_ascend_stone" | "ad_ticket"; amount: number };
export const AD_TICKET = {
  name: "广告券",
  icon: "/assets/resources/ad_ticket.webp",
  description: "抵扣一次激励广告，领取对应奖励。",
};
export interface RewardBoxDefinition {
  id: RewardBoxId;
  name: string;
  icon: string;
  description: string;
  drops: readonly { materialId: MaterialId; amount: number }[];
}

export const REWARD_BOXES: Record<RewardBoxId, RewardBoxDefinition> = {
  gem_box: {
    id: "gem_box", name: "随机宝石箱", icon: "/assets/resources/checkin_gem_box.webp",
    description: "开启后随机获得一种一级宝石，每种宝石等概率。",
    drops: GEM_BASE_IDS.map((materialId) => ({ materialId, amount: 1 })),
  },
  material_box: {
    id: "material_box", name: "随机材料箱", icon: "/assets/resources/checkin_material_box.webp",
    description: "开启后随机获得以下一组材料，每组概率25%。",
    drops: [
      { materialId: "mat_socket_stone", amount: 2 },
      { materialId: "mat_reset_scroll", amount: 3 },
      { materialId: "mat_smelt_flux", amount: 2 },
      { materialId: "mat_set_inscription", amount: 1 },
    ],
  },
};

export const FIRST_WEEK_REWARDS: readonly (readonly CheckInReward[])[] = [
  [{ id: "gold", amount: 15000 }, { id: "mat_ascend_stone", amount: 5 }],
  [{ id: "gems", amount: 100 }, { id: "ad_ticket", amount: 1 }],
  [{ id: "gem_box", amount: 5 }],
  [{ id: "gold", amount: 30000 }, { id: "mat_ascend_stone", amount: 10 }],
  [{ id: "material_box", amount: 6 }],
  [{ id: "gems", amount: 150 }, { id: "ad_ticket", amount: 2 }],
  [{ id: "gems", amount: 300 }, { id: "gem_box", amount: 8 }, { id: "material_box", amount: 8 }],
];

export const DAILY_CHECK_IN_REWARDS: readonly (readonly CheckInReward[])[] = [
  [{ id: "gold", amount: 10000 }],
  [{ id: "mat_ascend_stone", amount: 5 }],
  [{ id: "gem_box", amount: 3 }],
  [{ id: "gold", amount: 20000 }],
  [{ id: "material_box", amount: 3 }],
  [{ id: "gems", amount: 50 }, { id: "ad_ticket", amount: 1 }],
  [{ id: "gems", amount: 100 }, { id: "gem_box", amount: 5 }, { id: "ad_ticket", amount: 2 }],
];

export function isRewardBoxId(id: unknown): id is RewardBoxId {
  return REWARD_BOX_IDS.includes(id as RewardBoxId);
}
