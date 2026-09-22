import { HERO_BY_ID } from "../../../content/heroes";
import type { SaveDataV1 } from "../../../domain/save/SaveData";
import type { HeroId } from "../../../simulation/types";

export function renderAugmentationTargetControl(save: SaveDataV1, heroId: HeroId): string {
  if (HERO_BY_ID[heroId].specId !== "evoker_augmentation") return "";
  const selected = save.roster[heroId].augmentationTargetId ?? null;
  const candidates = save.party.filter((id): id is HeroId => Boolean(id && id !== heroId));
  const absent = selected && !candidates.includes(selected) ? selected : null;
  return `<div class="augmentation-target-control">
    <label for="augmentation-target-${heroId}">优先增幅队友</label>
    <select id="augmentation-target-${heroId}" data-action="augmentation-target" data-hero-id="${heroId}" aria-describedby="augmentation-target-hint">
      <option value="" ${selected ? "" : "selected"}>自动（优先输出）</option>
      ${candidates.map((id) => `<option value="${id}" ${selected === id ? "selected" : ""}>${HERO_BY_ID[id].name}</option>`).join("")}
      ${absent ? `<option value="${absent}" selected disabled>${HERO_BY_ID[absent].name}（未上阵）</option>` : ""}
    </select>
    <p id="augmentation-target-hint">下次施法生效；对象离队或阵亡时自动选择。</p>
  </div>`;
}
