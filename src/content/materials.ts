export const MATERIAL_IDS = [
  "mat_socket_stone",
  "mat_reset_scroll",
  "mat_smelt_flux",
  "mat_ascend_stone",
  "gem_atk",
  "gem_hp",
  "gem_def",
  "gem_crit",
] as const;

export type MaterialId = (typeof MATERIAL_IDS)[number];

export type MaterialKind = "craft" | "gem" | "ascend";

export const MATERIAL_CATEGORIES = ["inlay", "reset", "smelt", "socket", "ascend"] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  inlay: "镶嵌",
  reset: "重置",
  smelt: "熔炼",
  socket: "开孔",
  ascend: "进阶石",
};

export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  description: string;
  kind: MaterialKind;
  category: MaterialCategory;
  /** Short glyph shown in inventory-style cards */
  glyph: string;
  /** CSS accent class suffix */
  tone: "socket" | "reset" | "smelt" | "gem" | "ascend";
  /** Materials are not salvageable unless explicitly marked. */
  salvageable?: boolean;
  gemBonus?: Partial<{
    attack: number;
    maxHp: number;
    defense: number;
    critRate: number;
  }>;
}

export const MATERIAL_DEFINITIONS: readonly MaterialDefinition[] = [
  {
    id: "mat_socket_stone",
    name: "开孔石",
    description: "为装备开辟宝石孔位，每件最多 2 孔。",
    kind: "craft",
    category: "socket",
    glyph: "◇",
    tone: "socket",
  },
  {
    id: "mat_reset_scroll",
    name: "重置卷轴",
    description: "随机重掷装备已有词条数值，可升可降。",
    kind: "craft",
    category: "reset",
    glyph: "卷",
    tone: "reset",
  },
  {
    id: "mat_smelt_flux",
    name: "熔炼触媒",
    description: "为装备熔入一条指定词条，数值随机，可重复熔炼。",
    kind: "craft",
    category: "smelt",
    glyph: "熔",
    tone: "smelt",
  },
  {
    id: "mat_ascend_stone",
    name: "进阶石",
    description: "英雄满 5 星后消耗，完成进阶并解锁专属边框。",
    kind: "ascend",
    category: "ascend",
    glyph: "◆",
    tone: "ascend",
  },
  {
    id: "gem_atk",
    name: "攻击宝石",
    description: "镶嵌后提升攻击。",
    kind: "gem",
    category: "inlay",
    glyph: "攻",
    tone: "gem",
    gemBonus: { attack: 8 },
  },
  {
    id: "gem_hp",
    name: "生命宝石",
    description: "镶嵌后提升生命。",
    kind: "gem",
    category: "inlay",
    glyph: "生",
    tone: "gem",
    gemBonus: { maxHp: 120 },
  },
  {
    id: "gem_def",
    name: "防御宝石",
    description: "镶嵌后提升防御。",
    kind: "gem",
    category: "inlay",
    glyph: "防",
    tone: "gem",
    gemBonus: { defense: 6 },
  },
  {
    id: "gem_crit",
    name: "暴击宝石",
    description: "镶嵌后提升暴击率。",
    kind: "gem",
    category: "inlay",
    glyph: "暴",
    tone: "gem",
    gemBonus: { critRate: 0.02 },
  },
];

export const MATERIAL_BY_ID = Object.fromEntries(
  MATERIAL_DEFINITIONS.map((entry) => [entry.id, entry]),
) as Record<MaterialId, MaterialDefinition>;

export const MATERIAL_ID_SET = new Set<string>(MATERIAL_IDS);

export const MAX_EQUIPMENT_SOCKETS = 2;

export const CRAFT_COST: Record<"socket" | "reset" | "smelt" | "inlay", MaterialId> = {
  socket: "mat_socket_stone",
  reset: "mat_reset_scroll",
  smelt: "mat_smelt_flux",
  inlay: "gem_atk",
};

export function isMaterialId(value: string): value is MaterialId {
  return MATERIAL_ID_SET.has(value);
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
  return {
    mat_socket_stone: 12,
    mat_reset_scroll: 12,
    mat_smelt_flux: 12,
    mat_ascend_stone: 20,
    gem_atk: 4,
    gem_hp: 4,
    gem_def: 4,
    gem_crit: 4,
  };
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
