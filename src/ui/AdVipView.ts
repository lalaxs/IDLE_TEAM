import { AD_VIP_LEVELS, getAdVipBenefits, type AdVipBenefits } from "../content/adVip";
import { AD_TICKET } from "../content/checkIn";
import { ACCOUNT_CURRENCY_BY_ID } from "../content/currencies";
import { vipGift } from "../progression/AdVipSystem";
import type { SaveDataV1 } from "../domain/save/SaveData";

export const VIP_ICON = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m5 12 8 6 7-12 7 12 8-6-4 20H9Z" fill="#eccb70" stroke="#352c25" stroke-width="2.5" stroke-linejoin="round"/><path d="M10 27h20" stroke="#9a6634" stroke-width="3"/><path d="m20 16 4 5-4 5-4-5Z" fill="#789e91" stroke="#352c25" stroke-width="2"/></svg>`;

export type VipView = "current" | "next";
export const VIP_NAMES = ["冒险者", "青铜VIP", "白银VIP", "黄金VIP", "铂金VIP", "钻石VIP", "至尊VIP"] as const;
const discount = (rate: number) => rate === 1 ? "原价" : `${Math.round(rate * 100) / 10}折`;
function benefits(tier: AdVipBenefits) {
  return [
    { label: "离线累计上限", value: `${tier.offlineHours}小时`, unlocked: true },
    { label: "战斗最高倍速", value: `${tier.speed}倍`, unlocked: true },
    { label: "装备掉落概率", value: `+${Math.round(tier.equipmentBonus * 100)}%`, unlocked: tier.equipmentBonus > 0 },
    { label: "每日免费刷新", value: `${tier.freeRefreshes}次`, unlocked: tier.freeRefreshes > 0 },
    { label: "精品补给价格", value: discount(tier.priceRate), unlocked: tier.priceRate < 1 },
  ];
}
function crest(level: number) {
  return `<div class="vip-crest vip-tone-${level}" aria-label="${VIP_NAMES[level]}，VIP${level}"><svg viewBox="0 0 100 90" aria-hidden="true">
    ${level >= 4 ? '<path class="vip-wing" d="m31 31-22-9 4 16 15 10M69 31l22-9-4 16-15 10"/>' : ''}
    <path class="vip-shield" d="M24 9h52v43c0 16-26 29-26 29S24 68 24 52Z"/>
    <path class="vip-shield-inner" d="M29 14h42v37c0 11-21 23-21 23S29 62 29 51Z"/>
    ${level >= 5 ? '<path class="vip-jewel" d="m50 20 14 13-14 18-14-18Z"/><path class="vip-jewel-cut" d="m36 33 14-3 14 3M50 20v10l-5 14m5-14 5 14"/>' : '<path class="vip-crown" d="m34 26 8 6 8-13 8 13 8-6-4 20H38Z"/><path class="vip-crown-line" d="M39 40h22"/>'}
    ${level === 6 ? '<path class="vip-crown" d="m32 5 9 4 9-8 9 8 9-4-3 10H35Z"/>' : ''}
    <path class="vip-ribbon" d="M19 53h62v18H19l4-9Z"/>
    <text x="50" y="66" text-anchor="middle">${level ? `VIP ${level}` : 'VIP'}</text>
  </svg></div>`;
}
function rewards(tickets: number, gems: number) {
  return `${tickets > 0 ? `<span><img src="${AD_TICKET.icon}" alt="广告券">×${tickets}</span>` : ""}${gems > 0 ? `<span><img src="${ACCOUNT_CURRENCY_BY_ID.gems.icon}" alt="星石">×${gems}</span>` : ""}`;
}
export function renderAdVip(save: SaveDataV1, busy = false, requestedView: VipView = "current") {
  const current = getAdVipBenefits(save.adVip.watchedAds);
  const next = AD_VIP_LEVELS[current.level + 1];
  const view = next ? requestedView : "current";
  const preview = view === "next";
  const tier = preview ? next! : current;
  const target = next ?? current;
  const owned = benefits(current);
  return `<header class="vip-summary vip-tone-${tier.level}" data-vip-block="summary" data-vip-level="${tier.level}">
    ${crest(tier.level)}<div class="vip-title-line"><h3>${VIP_NAMES[tier.level]}</h3><span>${preview ? "下一档预览" : current.level ? "当前等级" : "尚未解锁"}</span></div>
    <div class="vip-meter"><p><span>${next ? `再看${next.ads - save.adVip.watchedAds}次晋升${VIP_NAMES[next.level]}` : "全部特权已解锁"}</span><strong>${save.adVip.watchedAds} / ${target.ads}</strong></p><div class="vip-progress" role="progressbar" aria-label="累计广告" aria-valuemin="0" aria-valuemax="${target.ads}" aria-valuenow="${save.adVip.watchedAds}"><i style="width:${Math.min(100, save.adVip.watchedAds / target.ads * 100)}%"></i></div></div>
  </header>
  <nav class="vip-view-tabs" data-vip-block="tabs" role="tablist" aria-label="VIP福利档位">${(["current", "next"] as const).filter((key) => key !== "next" || next).map((key) => `<button type="button" role="tab" id="vip-view-${key}" data-action="vip-view" data-vip-view="${key}" aria-selected="${view === key}" aria-controls="vip-benefits-panel" tabindex="${view === key ? 0 : -1}">${key === "current" ? "当前" : "下一档"}</button>`).join("")}</nav>
  <div class="vip-scroll" id="vip-benefits-panel" role="tabpanel" aria-labelledby="vip-view-${view}" data-vip-view="${view}">
    <section class="vip-benefits" data-vip-block="benefits"><h4>${preview ? "解锁后享有" : "当前已享福利"}</h4><dl>${benefits(tier).map((row, index) => row.unlocked ? `<div><dt>${row.label}</dt><dd>${preview && row.value !== owned[index]!.value ? `<span class="vip-upgrade-mark">提升</span>` : ""}${row.value}</dd></div>` : "").join("")}</dl></section>
    <section class="vip-gifts" data-vip-block="gifts" aria-label="${preview ? "下一档" : "当前"}VIP定期奖励">${(["daily", "weekly"] as const).map((period) => {
      const gift = vipGift(save, period);
      const ready = !preview && (gift.gems > 0 || gift.tickets > 0);
      const topUp = !preview && gift.topUp;
      const tickets = topUp ? gift.tickets : period === "daily" ? Number(tier.level > 0) : tier.weeklyTickets;
      const gems = topUp ? gift.gems : period === "daily" ? tier.dailyGems : tier.weeklyGems;
      return `<article class="vip-gift ${ready ? "is-ready" : ""}"><h4>${period === "daily" ? "每日" : "每周"}礼包${topUp ? " · 补领" : ""}</h4><div class="vip-gift-rewards">${tier.level ? rewards(tickets, gems) : '<small>青铜VIP起可领取</small>'}</div>${preview ? `<div class="vip-gift-locked">${VIP_NAMES[tier.level]}解锁</div>` : `<button class="${ready ? "primary-button" : "secondary-button"}" data-action="vip-claim" data-period="${period}" ${!ready ? "disabled" : ""}>${!current.level ? "尚未解锁" : ready ? topUp ? "领取差额" : "领取" : "已领取"}</button>`}<small>${period === "daily" ? "每日" : "周一"}凌晨5点重置</small></article>`;
    }).join("")}</section>
    <p class="vip-note" data-vip-block="note">${preview ? "晋升后永久生效；本周期已领奖励可补领差额。" : "广告券抵扣不计观看次数；装备掉落加成按原概率提升。"}</p>
  </div><footer class="vip-footer" data-vip-block="footer"><button class="primary-button wide" data-action="vip-watch" ${busy || !next ? "disabled" : ""}>${busy ? "广告加载中…" : next ? "观看广告 · 累计 +1" : "已达最高等级"}</button></footer>`;
}
export function syncAdVipContent(host: HTMLElement, save: SaveDataV1, busy: boolean, view: VipView = "current") {
  const template = document.createElement("div");
  template.innerHTML = renderAdVip(save, busy, view);
  const scroll = host.querySelector<HTMLElement>(".vip-scroll");
  const nextScroll = template.querySelector<HTMLElement>(".vip-scroll")!;
  const top = scroll && scroll.dataset.vipView === nextScroll.dataset.vipView ? scroll.scrollTop : 0;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  template.querySelectorAll<HTMLElement>("[data-vip-block]").forEach((next) => {
    const current = host.querySelector(`[data-vip-block="${next.dataset.vipBlock}"]`);
    if (current?.outerHTML !== next.outerHTML) current?.replaceWith(next);
  });
  if (scroll) { scroll.scrollTop = top; scroll.dataset.vipView = nextScroll.dataset.vipView; scroll.setAttribute("aria-labelledby", nextScroll.getAttribute("aria-labelledby")!); }
  if (active?.dataset.action?.startsWith("vip-") && !active.isConnected) {
    const button = host.querySelector<HTMLButtonElement>(`[data-action="${active.dataset.action}"]${active.dataset.period ? `[data-period="${active.dataset.period}"]` : ""}${active.dataset.vipView ? `[data-vip-view="${active.dataset.vipView}"]` : ""}`);
    if (button && !button.disabled) button.focus({ preventScroll: true });
    else { const panel = host.querySelector<HTMLElement>(".activity-panel"); if (panel) { panel.tabIndex = -1; panel.focus({ preventScroll: true }); } }
  }
}
