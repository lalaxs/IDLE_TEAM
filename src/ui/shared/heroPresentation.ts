import {
  getHeroStarPhase,
  HERO_STARS_PER_PHASE,
  MAX_HERO_ASCEND_LEVEL,
  MAX_HERO_STARS,
} from "../../progression/HeroProgression";

export function renderHeroStarOrbs(stars: number): string {
  const normalized = Math.max(0, Math.min(MAX_HERO_STARS, Math.floor(stars)));
  const { phase, count } = getHeroStarPhase(normalized);
  return Array.from({ length: HERO_STARS_PER_PHASE }, (_, index) => {
    const starPhase = normalized === 0
      ? null
      : phase === "silver"
        ? index < count ? "silver" : null
        : phase === "gold"
          ? index < count ? "gold" : "silver"
          : index < count ? "rainbow" : "gold";
    return `<i class="character-rank-star${starPhase ? ` filled ${starPhase}` : ""}" aria-hidden="true"><span></span></i>`;
  }).join("");
}

const ASCEND_RANK_ROMAN = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"] as const;

export function renderAscendRankSeal(level: number): string {
  if (level < 1 || level > MAX_HERO_ASCEND_LEVEL) return "";
  return `<span class="hero-ascend-rank-seal" data-level="${level}" aria-label="进阶${level}">${ASCEND_RANK_ROMAN[level]}</span>`;
}
