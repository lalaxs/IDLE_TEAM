export const CRAFT_MATERIAL_IDS = [
  "mat_socket_stone",
  "mat_reset_scroll",
  "mat_smelt_flux",
  "mat_set_inscription",
  "mat_ascend_stone",
] as const;

export const GEM_BASE_IDS = [
  "gem_atk",
  "gem_crit_damage",
  "gem_haste",
  "gem_skill",
  "gem_hp",
  "gem_def",
  "gem_damage_reduction",
  "gem_resist",
  "gem_crit",
  "gem_rage",
  "gem_lifesteal",
  "gem_heal",
] as const;

export const GEM_RANKS = [1, 2, 3, 4, 5, 6] as const;

export type CraftMaterialId = (typeof CRAFT_MATERIAL_IDS)[number];
export type GemBaseId = (typeof GEM_BASE_IDS)[number];
export type GemRank = (typeof GEM_RANKS)[number];
export type GemMaterialId = GemBaseId | `${GemBaseId}_${2 | 3 | 4 | 5 | 6}`;
export type MaterialId = CraftMaterialId | GemMaterialId;

export function getGemMaterialId(baseId: GemBaseId, rank: GemRank): GemMaterialId {
  return (rank === 1 ? baseId : `${baseId}_${rank}`) as GemMaterialId;
}

export const GEM_MATERIAL_IDS: readonly GemMaterialId[] = GEM_BASE_IDS.flatMap((baseId) =>
  GEM_RANKS.map((rank) => getGemMaterialId(baseId, rank)),
);

export const MATERIAL_IDS: readonly MaterialId[] = [
  ...CRAFT_MATERIAL_IDS,
  ...GEM_MATERIAL_IDS,
];

export type MaterialKind = "craft" | "gem" | "ascend";

export const MATERIAL_CATEGORIES = ["inlay", "reset", "smelt", "socket", "imprint", "ascend"] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  inlay: "镶嵌",
  reset: "重置",
  smelt: "熔炼",
  socket: "开孔",
  imprint: "套装刻印",
  ascend: "进阶石",
};

export type GemGroup = "offense" | "defense" | "tactical";

export const GEM_GROUP_LABELS: Record<GemGroup, string> = {
  offense: "进攻",
  defense: "防护",
  tactical: "战术",
};

export interface GemBonus {
  attackPct?: number;
  maxHpPct?: number;
  defensePct?: number;
  critChance?: number;
  critDamagePct?: number;
  attackSpeedPct?: number;
  castSpeedPct?: number;
  skillDamagePct?: number;
  rageGainPct?: number;
  damageReductionPct?: number;
  allResistPct?: number;
  lifeStealPct?: number;
  healPowerPct?: number;
}

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  description: string;
  kind: MaterialKind;
  category: MaterialCategory;
  /** Runtime art used in inventory and crafting surfaces. */
  icon: string;
  /** Short fallback glyph kept for compact text-only contexts. */
  glyph: string;
  /** CSS accent class suffix */
  tone: "socket" | "reset" | "smelt" | "gem" | "set" | "ascend";
  /** Materials are not salvageable unless explicitly marked. */
  salvageable?: boolean;
  gemBaseId?: GemBaseId;
  gemRank?: GemRank;
  gemGroup?: GemGroup;
  gemBonus?: GemBonus;
}

const CRAFT_MATERIAL_DEFINITIONS: readonly MaterialDefinition[] = [
  {
    id: "mat_socket_stone",
    name: "开孔石",
    description: "为装备开辟宝石孔位，每件最多 2 孔。",
    kind: "craft",
    category: "socket",
    icon: "/assets/resources/mat_socket_stone.webp",
    glyph: "◇",
    tone: "socket",
  },
  {
    id: "mat_reset_scroll",
    name: "重置卷轴",
    description: "随机重掷装备已有词条数值，可升可降。",
    kind: "craft",
    category: "reset",
    icon: "/assets/resources/mat_reset_scroll.webp",
    glyph: "卷",
    tone: "reset",
  },
  {
    id: "mat_smelt_flux",
    name: "熔炼触媒",
    description: "为装备熔入一条指定词条，数值随机；再次熔炼会替换原熔炼词条。",
    kind: "craft",
    category: "smelt",
    icon: "/assets/resources/mat_smelt_flux.webp",
    glyph: "熔",
    tone: "smelt",
  },
  {
    id: "mat_set_inscription",
    name: "套装刻印石",
    description: "与指定套装精华一同消耗，将套装标签刻印到一件非套装装备上。",
    kind: "craft",
    category: "imprint",
    icon: "/assets/resources/mat_set_inscription.png",
    glyph: "印",
    tone: "set",
  },
  {
    id: "mat_ascend_stone",
    name: "进阶石",
    description: "英雄达到当前等级上限后消耗，完成进阶并解锁专属边框。",
    kind: "ascend",
    category: "ascend",
    icon: "/assets/resources/mat_ascend_stone.webp",
    glyph: "◆",
    tone: "ascend",
  },
];

const GEM_STRENGTH_MULTIPLIERS = [1, 1.7, 2.8, 4.5, 7, 10.5] as const;

interface GemTemplate {
  id: GemBaseId;
  name: string;
  group: GemGroup;
  icon: string;
  glyph: string;
  bonus: (multiplier: number) => GemBonus;
}

const GEM_TEMPLATES: readonly GemTemplate[] = [
  { id: "gem_atk", name: "攻击宝石", group: "offense", icon: "/assets/resources/gem_atk.webp", glyph: "攻", bonus: (m) => ({ attackPct: 0.01 * m }) },
  { id: "gem_crit_damage", name: "暴伤宝石", group: "offense", icon: "/assets/resources/gem_crit.webp", glyph: "烈", bonus: (m) => ({ critDamagePct: 3 * m }) },
  { id: "gem_haste", name: "迅捷宝石", group: "offense", icon: "/assets/resources/gem_crit.webp", glyph: "迅", bonus: (m) => ({ attackSpeedPct: 1.5 * m, castSpeedPct: 1.5 * m }) },
  { id: "gem_skill", name: "技能宝石", group: "offense", icon: "/assets/resources/gem_atk.webp", glyph: "技", bonus: (m) => ({ skillDamagePct: 0.012 * m }) },
  { id: "gem_hp", name: "生命宝石", group: "defense", icon: "/assets/resources/gem_hp.webp", glyph: "生", bonus: (m) => ({ maxHpPct: 0.012 * m }) },
  { id: "gem_def", name: "防御宝石", group: "defense", icon: "/assets/resources/gem_def.webp", glyph: "防", bonus: (m) => ({ defensePct: 0.012 * m }) },
  { id: "gem_damage_reduction", name: "减伤宝石", group: "defense", icon: "/assets/resources/gem_def.webp", glyph: "御", bonus: (m) => ({ damageReductionPct: 0.004 * m }) },
  { id: "gem_resist", name: "抗性宝石", group: "defense", icon: "/assets/resources/gem_def.webp", glyph: "抗", bonus: (m) => ({ allResistPct: 0.007 * m }) },
  { id: "gem_crit", name: "暴击宝石", group: "tactical", icon: "/assets/resources/gem_crit.webp", glyph: "暴", bonus: (m) => ({ critChance: 0.006 * m }) },
  { id: "gem_rage", name: "怒气宝石", group: "tactical", icon: "/assets/resources/gem_crit.webp", glyph: "怒", bonus: (m) => ({ rageGainPct: 0.012 * m }) },
  { id: "gem_lifesteal", name: "汲取宝石", group: "tactical", icon: "/assets/resources/gem_hp.webp", glyph: "汲", bonus: (m) => ({ lifeStealPct: 0.003 * m }) },
  { id: "gem_heal", name: "治愈宝石", group: "tactical", icon: "/assets/resources/gem_hp.webp", glyph: "愈", bonus: (m) => ({ healPowerPct: 0.015 * m }) },
];

function formatPercent(value: number): string {
  return Number((value * 100).toFixed(1)).toString();
}

function formatPercentPoints(value: number): string {
  return Number(value.toFixed(1)).toString();
}

export function formatGemBonus(bonus: GemBonus | undefined): string {
  if (!bonus) return "";
  return [
    bonus.attackPct ? `攻击 +${formatPercent(bonus.attackPct)}%` : "",
    bonus.maxHpPct ? `生命 +${formatPercent(bonus.maxHpPct)}%` : "",
    bonus.defensePct ? `防御 +${formatPercent(bonus.defensePct)}%` : "",
    bonus.critChance ? `暴击率 +${formatPercent(bonus.critChance)}%` : "",
    bonus.critDamagePct ? `暴击伤害 +${formatPercentPoints(bonus.critDamagePct)}%` : "",
    bonus.attackSpeedPct ? `攻速 +${formatPercentPoints(bonus.attackSpeedPct)}%` : "",
    bonus.castSpeedPct ? `施法速度 +${formatPercentPoints(bonus.castSpeedPct)}%` : "",
    bonus.skillDamagePct ? `技能伤害 +${formatPercent(bonus.skillDamagePct)}%` : "",
    bonus.rageGainPct ? `怒气获取 +${formatPercent(bonus.rageGainPct)}%` : "",
    bonus.damageReductionPct ? `伤害减免 +${formatPercent(bonus.damageReductionPct)}%` : "",
    bonus.allResistPct ? `全抗性 +${formatPercent(bonus.allResistPct)}%` : "",
    bonus.lifeStealPct ? `生命偷取 +${formatPercent(bonus.lifeStealPct)}%` : "",
    bonus.healPowerPct ? `治疗效果 +${formatPercent(bonus.healPowerPct)}%` : "",
  ].filter(Boolean).join("、");
}

const GEM_DEFINITIONS: readonly MaterialDefinition[] = GEM_TEMPLATES.flatMap((template) =>
  GEM_RANKS.map((rank, index) => {
    const gemBonus = template.bonus(GEM_STRENGTH_MULTIPLIERS[index]!);
    return {
      id: getGemMaterialId(template.id, rank),
      name: `${template.name}·${rank}级`,
      description: `镶嵌后${formatGemBonus(gemBonus)}。`,
      kind: "gem" as const,
      category: "inlay" as const,
      icon: template.icon,
      glyph: template.glyph,
      tone: "gem" as const,
      gemBaseId: template.id,
      gemRank: rank,
      gemGroup: template.group,
      gemBonus,
    };
  }),
);

export const MATERIAL_DEFINITIONS: readonly MaterialDefinition[] = [
  ...CRAFT_MATERIAL_DEFINITIONS,
  ...GEM_DEFINITIONS,
];

export const MATERIAL_BY_ID = Object.fromEntries(
  MATERIAL_DEFINITIONS.map((entry) => [entry.id, entry]),
) as Record<MaterialId, MaterialDefinition>;

export const MATERIAL_ID_SET = new Set<string>(MATERIAL_IDS);

export const MAX_EQUIPMENT_SOCKETS = 2;
export const GEM_FUSION_COST = 3;

export const CRAFT_COST: Record<"socket" | "reset" | "smelt" | "inlay", MaterialId> = {
  socket: "mat_socket_stone",
  reset: "mat_reset_scroll",
  smelt: "mat_smelt_flux",
  inlay: "gem_atk",
};

export function isMaterialId(value: string): value is MaterialId {
  return MATERIAL_ID_SET.has(value);
}

export function isGemMaterialId(value: string): value is GemMaterialId {
  return MATERIAL_ID_SET.has(value) && MATERIAL_BY_ID[value as MaterialId]?.kind === "gem";
}

export function isGemBaseId(value: string): value is GemBaseId {
  return (GEM_BASE_IDS as readonly string[]).includes(value);
}

export function isMaterialCategory(value: string): value is MaterialCategory {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

export function canSalvageMaterial(definition: MaterialDefinition): boolean {
  return definition.salvageable === true;
}

export function createEmptyMaterials(): Record<MaterialId, number> {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Record<MaterialId, number>;
}

export function createStarterMaterials(): Record<MaterialId, number> {
  const materials = createEmptyMaterials();
  materials.mat_socket_stone = 12;
  materials.mat_reset_scroll = 12;
  materials.mat_smelt_flux = 12;
  materials.mat_ascend_stone = 20;
  materials.gem_atk = 4;
  materials.gem_hp = 4;
  materials.gem_def = 4;
  materials.gem_crit = 4;
  return materials;
}

export function normalizeMaterials(raw: unknown): Record<MaterialId, number> {
  const result = createEmptyMaterials();
  if (!raw || typeof raw !== "object") return result;
  const source = raw as Record<string, unknown>;
  for (const id of MATERIAL_IDS) {
    const value = source[id];
    result[id] = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return result;
}
