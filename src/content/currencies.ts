/** Account currencies shown in the topbar (experience first, then gold/gems). */

export type AccountCurrencyId = "exp" | "gold" | "gems";

export interface AccountCurrencyDefinition {
  id: AccountCurrencyId;
  name: string;
  icon: string;
  /** CSS modifier on .resource-chip */
  tone: "exp" | "gold" | "gem";
  /** Short source blurb for the currency tips sheet. */
  blurb: string;
}

/** Display order in the topbar resource row. */
export const ACCOUNT_CURRENCY_DEFINITIONS: readonly AccountCurrencyDefinition[] = [
  {
    id: "exp",
    name: "经验",
    icon: "/assets/resources/currency_exp.webp",
    tone: "exp",
    blurb: "通关讨伐、离线巡逻与宝箱获得；精英与首领掉落更多。用于英雄升级。",
  },
  {
    id: "gold",
    name: "金币",
    icon: "/assets/resources/currency_gold_warm_outline_256.png",
    tone: "gold",
    blurb: "击败敌人时有几率掉落（基础 15%），离线收益和普通装备溢出也可获得。用于冒险商店与能力提升。",
  },
  {
    id: "gems",
    name: "星石",
    icon: "/assets/resources/currency_gems.webp",
    tone: "gem",
    blurb: "首次通关主线关卡可获得，也可在冒险商店使用金币购买。用于英雄召唤。",
  },
] as const;

export const ACCOUNT_CURRENCY_BY_ID = Object.fromEntries(
  ACCOUNT_CURRENCY_DEFINITIONS.map((currency) => [currency.id, currency]),
) as Record<AccountCurrencyId, AccountCurrencyDefinition>;

export function isAccountCurrencyId(value: unknown): value is AccountCurrencyId {
  return typeof value === "string" && value in ACCOUNT_CURRENCY_BY_ID;
}
