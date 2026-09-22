import type { GameStoreState } from "../../../app/GameStore";
import { ASSET_MANIFEST } from "../../../assets/manifest";
import { RELEASED_HERO_DEFINITIONS } from "../../../content/heroes";
import { getHeroStarRankLabel } from "../../../progression/HeroProgression";
import type { HeroId } from "../../../simulation/types";

export interface HeroesViewOptions {
  selectedHeroId: HeroId;
  partyHeroIds: readonly HeroId[];
  renderAscendRankSeal: (level: number) => string;
}

export function renderHeroesView(state: GameStoreState, options: HeroesViewOptions): string {
  const unlockedCount = RELEASED_HERO_DEFINITIONS.filter(({ id }) => state.save.roster[id].unlocked).length;
  const partyOrder = new Map(options.partyHeroIds.map((heroId, index) => [heroId, index]));
  const orderedHeroes = RELEASED_HERO_DEFINITIONS
    .map((hero, index) => ({ hero, index, partyIndex: partyOrder.get(hero.id) }))
    .sort((left, right) => {
      if (left.partyIndex !== undefined && right.partyIndex !== undefined) return left.partyIndex - right.partyIndex;
      if (left.partyIndex !== undefined) return -1;
      if (right.partyIndex !== undefined) return 1;
      return left.index - right.index;
    })
    .map(({ hero }) => hero);

  return `<section class="heroes-page" data-panel="heroes" aria-label="英雄"><div class="hero-summon-dock"><button type="button" class="summon-entry hero-summon-banner" data-action="summon-open" aria-label="召唤英雄，已解锁 ${unlockedCount}/${RELEASED_HERO_DEFINITIONS.length}"><span class="hero-summon-emblem" aria-hidden="true"><i>✦</i></span><span class="hero-summon-copy"><strong>召唤英雄</strong><small>英雄 ${unlockedCount}/${RELEASED_HERO_DEFINITIONS.length}</small></span><span class="hero-summon-filigree" aria-hidden="true"><i></i><i></i><i></i></span><span class="hero-summon-chevron" aria-hidden="true">›</span></button></div><div class="hero-roster-scroll"><div class="hero-card-grid" role="list" aria-label="英雄名册">${orderedHeroes.map((hero) => {
    const heroProgress = state.save.roster[hero.id];
    const unlocked = heroProgress.unlocked;
    const inParty = partyOrder.has(hero.id);
    const portrait = ASSET_MANIFEST.characters[hero.id];
    const ascendLevel = heroProgress.ascendLevel ?? 0;
    const ascendClass = ascendLevel > 0 ? `ascended ascend-${ascendLevel}` : "";
    return `<button class="hero-card hero-roster-card role-${hero.role} ${ascendClass} ${inParty ? "in-party" : ""} ${options.selectedHeroId === hero.id ? "selected" : ""} ${unlocked ? "" : "locked"}" data-action="${unlocked ? "hero-detail" : "summon-open"}" data-hero-id="${hero.id}" role="listitem" aria-label="${unlocked ? `${hero.name} ${hero.className} ${hero.specName} Lv.${heroProgress.level} ${getHeroStarRankLabel(heroProgress.stars)}${ascendLevel > 0 ? ` 进阶${ascendLevel}` : ""}${inParty ? " 已上阵" : ""}` : `${hero.name}未解锁`}" aria-pressed="${options.selectedHeroId === hero.id ? "true" : "false"}" style="--role-color:${hero.color}">${options.renderAscendRankSeal(ascendLevel)}<div class="hero-card-art" style="--hero-color:${hero.color}"><img src="${portrait}" alt="" draggable="false" /></div>${inParty ? '<span class="hero-card-party-status" aria-hidden="true">已上阵</span>' : ""}<strong class="hero-card-name">${hero.name}</strong><span class="hero-card-meta"><span class="hero-card-role">${hero.specName}</span><span class="hero-card-level">${unlocked ? `Lv.${heroProgress.level}` : "未解锁"}</span></span></button>`;
  }).join("")}</div></div></section>`;
}
