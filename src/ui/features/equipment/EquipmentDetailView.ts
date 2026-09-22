import { AFFIX_BY_ID, affixDisplaysPercent } from "../../../content/affixes";
import { ITEM_BY_ID, RARITY_LABELS } from "../../../content/items";
import { SET_BY_ID } from "../../../content/sets";
import {
  canHeroEquipItem,
  getEquipmentLevel,
  getEquipmentSetId,
  getGreaterAffixCount,
  getItemScore,
  type InventoryItem,
} from "../../../progression/EquipmentSystem";
import { itemEffectEntries, setBonusText } from "../../shared/equipmentPresentation";
import {
  equipmentArt,
  legendaryTraitAria,
  rarityClass,
} from "../../shared/presentation";

export interface EquipmentTipAttribute {
  key: string;
  label: string;
  value: number;
  percent: boolean;
  kind: "base" | "affix";
  greater: boolean;
}

export function equipmentTipAttributes(item: InventoryItem): EquipmentTipAttribute[] {
  const base = ([
    item.stats.attack
      ? { key: "base:attack", label: "攻击", value: item.stats.attack, percent: false, kind: "base", greater: false }
      : null,
    item.stats.maxHp
      ? { key: "base:maxHp", label: "生命", value: item.stats.maxHp, percent: false, kind: "base", greater: false }
      : null,
    item.stats.defense
      ? { key: "base:defense", label: "防御", value: item.stats.defense, percent: false, kind: "base", greater: false }
      : null,
    item.stats.attackSpeedPct
      ? { key: "base:attackSpeedPct", label: "攻速", value: item.stats.attackSpeedPct, percent: true, kind: "base", greater: false }
      : null,
  ] as Array<EquipmentTipAttribute | null>).filter(
    (entry): entry is EquipmentTipAttribute => entry !== null,
  );
  const affixes = (item.affixes ?? []).flatMap((roll): EquipmentTipAttribute[] => {
    const definition = AFFIX_BY_ID[roll.affixId];
    if (!definition) return [];
    return [{
      key: `affix:${roll.affixId}`,
      label: `${roll.smelted ? "熔炼·" : ""}${roll.greater ? "★" : ""}${definition.name}`,
      value: roll.value,
      percent: affixDisplaysPercent(definition.kind),
      kind: "affix",
      greater: roll.greater === true,
    }];
  });
  return [...base, ...affixes];
}

function itemSchoolLabel(item: InventoryItem): string {
  return ITEM_BY_ID[item.definitionId]!.school === "magic" ? "法系" : "物理";
}

export function renderEquipmentTipCard(
  item: InventoryItem,
  label: string | null,
  tone: "current" | "selected",
  comparisonItem: InventoryItem | null,
  attributeKeys: string[],
  footerHtml = "",
  activeSetPieces = 0,
): string {
  const definition = ITEM_BY_ID[item.definitionId]!;
  const attributes = new Map(equipmentTipAttributes(item).map((entry) => [entry.key, entry]));
  const comparisonAttributes = new Map(
    (comparisonItem ? equipmentTipAttributes(comparisonItem) : []).map((entry) => [entry.key, entry]),
  );
  const showChanges = tone === "selected" && comparisonItem !== null;
  const scoreDelta = showChanges ? getItemScore(item) - getItemScore(comparisonItem) : 0;
  const changeArrow = (delta: number): string => {
    if (!showChanges || delta === 0) return "";
    const upgrade = delta > 0;
    return `<span class="equipment-tip-change ${upgrade ? "upgrade" : "downgrade"}" aria-label="${upgrade ? "提升" : "下降"}"></span>`;
  };
  const rows = attributeKeys.map((key) => {
    const entry = attributes.get(key);
    const previous = comparisonAttributes.get(key);
    const delta = (entry?.value ?? 0) - (previous?.value ?? 0);
    const percent = entry?.percent ?? previous?.percent ?? false;
    return `
      <div class="equipment-tip-stat ${entry?.kind ?? previous?.kind ?? "base"} ${entry?.greater ?? previous?.greater ? "greater" : ""} ${showChanges && delta !== 0 ? delta > 0 ? "upgrade" : "downgrade" : ""}">
        <span>${entry?.label ?? previous?.label ?? "属性"}</span>
        <b>${entry ? `+${entry.value}${percent ? "%" : ""}` : "—"}</b>
        ${changeArrow(delta)}
      </div>
    `;
  }).join("");
  const effects = itemEffectEntries(item, "bonus");
  const effectsHtml = effects.length
    ? `<div class="equipment-tip-effects">
        ${effects.map((entry) => {
          if (entry.kind === "set") {
            const setId = getEquipmentSetId(item);
            const set = setId ? SET_BY_ID[setId] : null;
            if (!set) return "";
            return `
              <div class="equipment-tip-effect set">
                <div class="equipment-tip-set-heading"><small>${entry.label}</small><b>${entry.title}</b></div>
                <div class="equipment-tip-set-bonuses">
                  ${set.bonuses.map((bonus) => {
                    const active = activeSetPieces >= bonus.pieces;
                    const bonusText = setBonusText(bonus);
                    return `<div class="equipment-tip-set-bonus ${active ? "active" : "inactive"}" aria-label="${bonus.pieces}件套，${active ? "已激活" : "未激活"}，${bonusText}">
                      <b>${bonus.pieces}件套</b><span>${bonusText}</span><em aria-hidden="true">${active ? "✓" : "○"}</em>
                    </div>`;
                  }).join("")}
                </div>
              </div>
            `;
          }
          return `
            <div class="equipment-tip-effect ${entry.kind}">
              ${entry.kind === "legendary"
                ? `<small class="equipment-tip-effect-mark"><span class="legendary-trait-mark" aria-hidden="true"></span><span>${entry.label}</span></small>`
                : `<small>${entry.label}</small>`}
              <div><b>${entry.title}</b>${entry.description ? `<p>${entry.description}</p>` : ""}</div>
            </div>
          `;
        }).join("")}
      </div>`
    : "";
  const greaterAffixCount = getGreaterAffixCount(item);
  const greaterStars = greaterAffixCount
    ? `<span class="equipment-tip-greater-stars" aria-label="${greaterAffixCount} 条高阶词条">${"★".repeat(greaterAffixCount)}</span>`
    : "";

  return `
    <article class="equipment-tip-card ${tone} ${rarityClass(item.rarity)}" aria-label="${label ? `${label}：` : ""}${definition.name}${legendaryTraitAria(item)}">
      <header class="equipment-tip-head">
        <div class="equipment-tip-icon" aria-hidden="true">${equipmentArt(definition.icon)}</div>
        <div>
          ${label ? `<span class="equipment-tip-context">${label}</span>` : ""}
          <h3><span class="equipment-tip-name">${definition.name}</span></h3>
          ${greaterStars}
          <p>${RARITY_LABELS[item.rarity]} · Lv.${getEquipmentLevel(item)} · ${itemSchoolLabel(item)}</p>
        </div>
      </header>
      <div class="equipment-tip-body">
        <div class="equipment-tip-power ${showChanges && scoreDelta !== 0 ? scoreDelta > 0 ? "upgrade" : "downgrade" : ""}">
          <span>战力</span><b>${getItemScore(item)}</b>${changeArrow(scoreDelta)}
        </div>
        <div class="equipment-tip-stats">${rows}</div>
        ${effectsHtml}
      </div>
      ${footerHtml ? `<footer class="equipment-tip-footer">${footerHtml}</footer>` : ""}
    </article>
  `;
}

export interface EquipmentDetailLayerOptions {
  item: InventoryItem;
  contextLabel: string | null;
  footerHtml?: string;
  activeSetPieces?: number;
  layerClassName?: string;
  popoverId: string;
  ariaLabel?: string;
}

export function renderEquipmentDetailLayer(options: EquipmentDetailLayerOptions): string {
  const attributeKeys = equipmentTipAttributes(options.item).map(({ key }) => key);
  const definition = ITEM_BY_ID[options.item.definitionId]!;
  return `
    <div class="equip-tips-layer equipment-choice-layer ${options.layerClassName ?? ""}" role="presentation">
      <div class="equip-tips-backdrop" aria-hidden="true"></div>
      <section
        class="equipment-tips-popover is-single"
        id="${options.popoverId}"
        role="dialog"
        aria-modal="false"
        aria-label="${options.ariaLabel ?? `${definition.name}详情`}"
      >
        <div class="equipment-tips-pair">
          ${renderEquipmentTipCard(
            options.item,
            options.contextLabel,
            "selected",
            null,
            attributeKeys,
            options.footerHtml ?? "",
            options.activeSetPieces ?? 0,
          )}
        </div>
      </section>
    </div>
  `;
}

export interface EquipmentComparisonLayerOptions {
  kind: "compare" | "unequip";
  equipped: InventoryItem | null;
  selected: InventoryItem | null;
  heroName: string;
  heroLevel: number;
  selectedSetPieces: number;
  equippedSetPieces: number;
}

export function renderEquipmentComparisonLayer(options: EquipmentComparisonLayerOptions): string {
  if (options.kind === "unequip") {
    if (!options.equipped) return "";
    const attributeKeys = equipmentTipAttributes(options.equipped).map(({ key }) => key);
    const footer = `<button type="button" class="secondary-button equipment-tips-equip" data-action="unequip-item">卸下</button>`;
    return `
      <div class="equip-tips-layer equipment-choice-layer" role="presentation">
        <div class="equip-tips-backdrop" aria-hidden="true"></div>
        <section class="equipment-tips-popover is-single" id="equipment-choice-tips" role="dialog" aria-modal="false" aria-label="已装备详情">
          <div class="equipment-tips-pair">
            ${renderEquipmentTipCard(options.equipped, "当前装备", "current", null, attributeKeys, footer, options.equippedSetPieces)}
          </div>
        </section>
      </div>
    `;
  }

  if (!options.selected) return "";
  const requiredLevel = getEquipmentLevel(options.selected);
  const levelLocked = !canHeroEquipItem(options.heroLevel, options.selected);
  const currentAttributes = options.equipped ? equipmentTipAttributes(options.equipped) : [];
  const selectedAttributes = equipmentTipAttributes(options.selected);
  const attributeKeys = [...new Set([
    ...selectedAttributes.map((entry) => entry.key),
    ...currentAttributes.map((entry) => entry.key),
  ])];
  const status = levelLocked
    ? `<p class="equipment-tips-status">${options.heroName} 当前 Lv.${options.heroLevel} · 需要 Lv.${requiredLevel}</p>`
    : "";
  const selectedFooter = `
    ${status}
    <button type="button" class="primary-button equipment-tips-equip" data-action="equip-item" ${levelLocked ? "disabled" : ""}>装备</button>
  `;
  return `
    <div class="equip-tips-layer equipment-choice-layer" role="presentation">
      <div class="equip-tips-backdrop" aria-hidden="true"></div>
      <section class="equipment-tips-popover ${options.equipped ? "is-comparison" : "is-single"}" id="equipment-choice-tips" role="dialog" aria-modal="false" aria-label="${options.equipped ? "装备对比" : "装备详情"}">
        <div class="equipment-tips-pair">
          ${renderEquipmentTipCard(options.selected, "选择装备", "selected", options.equipped, attributeKeys, selectedFooter, options.selectedSetPieces)}
          ${options.equipped ? renderEquipmentTipCard(options.equipped, "当前装备", "current", null, attributeKeys, "", options.equippedSetPieces) : ""}
        </div>
      </section>
    </div>
  `;
}
