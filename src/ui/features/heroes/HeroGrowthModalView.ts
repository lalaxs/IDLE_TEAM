import type { GameStoreState } from "../../../app/GameStore";
import type { AppEvent } from "../../../app/events";
import { ASSET_MANIFEST } from "../../../assets/manifest";
import { HERO_BY_ID } from "../../../content/heroes";
import {
  getAscendStatPct,
  getHeroLevelCap,
  getHeroStarPhase,
  getHeroStarRankLabel,
  getHeroStats,
  getStarRageGainPct,
  getStarSkillEffectPct,
} from "../../../progression/HeroProgression";
import { compact } from "../../shared/presentation";
import { renderAscendRankSeal, renderHeroStarOrbs } from "../../shared/heroPresentation";

type HeroGrowthResultEvent = Extract<
  AppEvent,
  { type: "hero:starred" | "hero:ascended" }
>;

export function renderHeroGrowthResultModal(
  state: GameStoreState,
  payload: unknown,
): string | null {
  const event = payload as HeroGrowthResultEvent | null;
  if (!event || (event.type !== "hero:starred" && event.type !== "hero:ascended")) return null;

  const hero = HERO_BY_ID[event.heroId];
  const progress = state.save.roster[event.heroId];
  if (!hero || !progress) return null;

  const isStar = event.type === "hero:starred";
  const currentStars = progress.stars;
  const currentAscend = progress.ascendLevel ?? 0;
  const previousStars = isStar ? Math.max(0, event.stars - 1) : currentStars;
  const previousAscend = isStar ? currentAscend : Math.max(0, event.level - 1);
  const beforeStats = getHeroStats(event.heroId, progress.level, {
    stars: previousStars,
    ascendLevel: previousAscend,
  });
  const afterStats = getHeroStats(event.heroId, progress.level, {
    stars: currentStars,
    ascendLevel: currentAscend,
  });
  const gains: Array<{ label: string; before: string; after: string; delta: string }> = [];
  const statGains = [
    { label: "生命", before: beforeStats.maxHp, after: afterStats.maxHp },
    { label: "攻击", before: beforeStats.attack, after: afterStats.attack },
    { label: "防御", before: beforeStats.defense, after: afterStats.defense },
  ];

  let title: string;
  let resultClass: string;
  let accent: string;
  let rankMarkup: string;
  let changeLabel: string;
  let previousValue: string;
  let resultValue: string;
  let note: string;
  let badge: string;

  if (isStar) {
    const previousPhase = getHeroStarPhase(previousStars);
    const currentPhase = getHeroStarPhase(event.stars);
    const phaseLabel = currentPhase.phase === "silver" ? "银星" : currentPhase.phase === "gold" ? "金星" : "彩星";
    const phaseAccent = currentPhase.phase === "silver"
      ? "#d9e2e8"
      : currentPhase.phase === "gold"
        ? "#f3d765"
        : "#dda2ff";
    const skillBefore = Math.round(getStarSkillEffectPct(previousStars) * 100);
    const skillAfter = Math.round(getStarSkillEffectPct(event.stars) * 100);
    const rageBefore = Math.round(getStarRageGainPct(previousStars) * 100);
    const rageAfter = Math.round(getStarRageGainPct(event.stars) * 100);

    gains.push({
      label: "技能效果",
      before: `${skillBefore}%`,
      after: `${skillAfter}%`,
      delta: `+${skillAfter - skillBefore}%`,
    });
    if (rageAfter > rageBefore) {
      gains.push({
        label: "怒气获取",
        before: `${rageBefore}%`,
        after: `${rageAfter}%`,
        delta: `+${rageAfter - rageBefore}%`,
      });
    }
    title = previousPhase.phase === currentPhase.phase ? "升星成功" : `${phaseLabel}突破`;
    resultClass = `star-result phase-${currentPhase.phase}`;
    accent = phaseAccent;
    previousValue = getHeroStarRankLabel(previousStars);
    resultValue = getHeroStarRankLabel(event.stars);
    changeLabel = "英雄星级";
    rankMarkup = `
      <div class="hero-growth-result-rank star-rank" aria-label="${previousValue}提升至${resultValue}">
        <div><small>${previousValue}</small><span class="hero-growth-result-stars" aria-hidden="true">${renderHeroStarOrbs(previousStars)}</span></div>
        <b aria-hidden="true">→</b>
        <div class="current"><small>${resultValue}</small><span class="hero-growth-result-stars" aria-hidden="true">${renderHeroStarOrbs(event.stars)}</span></div>
      </div>`;
    note = `技能伤害、治疗与护盾等效果提升已生效${rageAfter > rageBefore ? "，新星阶怒气加成同步解锁" : ""}。`;
    badge = `<span class="hero-growth-result-star-mark" aria-hidden="true">★</span>`;
  } else {
    const previousCap = getHeroLevelCap(previousAscend);
    const currentCap = getHeroLevelCap(event.level);
    const ascendPctGain = Math.round((getAscendStatPct(event.level) - getAscendStatPct(previousAscend)) * 100);
    if (currentCap > previousCap) gains.push({
      label: "等级上限",
      before: `Lv.${previousCap}`,
      after: `Lv.${currentCap}`,
      delta: `+${currentCap - previousCap}`,
    });
    if (event.level === 1) gains.push({ label: "通用被动", before: "未解锁", after: "可选择", delta: "解锁" });
    if (ascendPctGain > 0) {
      for (const gain of statGains) {
        gains.push({
          label: gain.label,
          before: compact(gain.before),
          after: compact(gain.after),
          delta: `+${compact(gain.after - gain.before)}`,
        });
      }
    }
    title = "进阶成功";
    resultClass = `ascend-result ascend-${event.level}`;
    accent = "#f0cf70";
    previousValue = previousAscend > 0 ? `进阶 ${previousAscend}` : "未进阶";
    resultValue = `进阶 ${event.level}`;
    changeLabel = "英雄阶位";
    rankMarkup = `
      <div class="hero-growth-result-rank ascend-rank" aria-label="${previousValue}提升至${resultValue}">
        <div><small>${previousValue}</small><span class="hero-growth-result-seal old">${previousAscend > 0 ? renderAscendRankSeal(previousAscend) : "○"}</span></div>
        <b aria-hidden="true">→</b>
        <div class="current"><small>${resultValue}</small><span class="hero-growth-result-seal">${renderAscendRankSeal(event.level)}</span></div>
      </div>`;
    note = currentCap === previousCap
      ? `基础属性获得 ${ascendPctGain}% 进阶加成。`
      : ascendPctGain > 0
      ? `等级上限提升至 Lv.${currentCap}，基础属性获得 ${ascendPctGain}% 进阶加成。`
      : `等级上限提升至 Lv.${currentCap}，可以继续培养英雄。`;
    badge = `<span class="hero-growth-result-portrait-seal" aria-hidden="true">${renderAscendRankSeal(event.level)}</span>`;
  }

  const gainsMarkup = gains.map((gain) => `
    <div class="hero-growth-result-gain">
      <small>${gain.label}</small>
      <span><em>${gain.before}</em><b aria-hidden="true">→</b><strong>${gain.after}</strong></span>
      <i>${gain.delta}</i>
    </div>
  `).join("");

  return `
    <div class="modal-backdrop" data-action="close-modal"></div>
    <section class="center-sheet craft-result-modal hero-growth-result-modal ${resultClass}" style="--craft-result-accent:${accent};--hero-color:${hero.color}" role="dialog" aria-modal="true" aria-labelledby="hero-growth-result-title" aria-describedby="hero-growth-result-note hero-growth-result-dismiss-hint">
      <div class="craft-result-heading">
        <span aria-hidden="true"></span>
        <h2 id="hero-growth-result-title">${title}</h2>
        <span aria-hidden="true"></span>
      </div>
      <div class="craft-result-showcase hero-growth-result-showcase">
        <div class="craft-result-effects" aria-hidden="true">
          <span class="craft-result-rays"></span>
          <span class="craft-result-sparkles"></span>
        </div>
        <div class="hero-growth-result-portrait">
          <img src="${ASSET_MANIFEST.characters[event.heroId]}" alt="" draggable="false">
          ${badge}
        </div>
      </div>
      <div class="craft-result-item-copy hero-growth-result-copy">
        <strong>${hero.name}</strong>
        <span>${hero.className} · ${hero.specName} · Lv.${progress.level}</span>
      </div>
      ${rankMarkup}
      <section class="hero-growth-result-gains ${gains.length === 1 ? "single" : ""}" aria-label="本次提升">
        <span class="craft-result-attributes-title">本次提升</span>
        <div>${gainsMarkup}</div>
      </section>
      <div class="craft-result-change has-before">
        <small>${changeLabel}</small>
        <div class="with-before">
          <span>${previousValue}</span><b aria-hidden="true">→</b><strong>${resultValue}</strong>
        </div>
      </div>
      <p class="craft-result-note" id="hero-growth-result-note">${note}</p>
      <p class="craft-result-dismiss-hint" id="hero-growth-result-dismiss-hint">点击空白处返回英雄详情</p>
    </section>
  `;
}
