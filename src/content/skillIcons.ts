import {
  SPECIALIZATION_BY_ID,
  SPECIALIZATIONS,
  type ClassId,
  type SpecId,
} from "./specializations";

export interface SkillIconRef {
  atlas: string;
  index: number;
}

const CLASS_ATLAS: Record<ClassId, string> = {
  death_knight: "/assets/skills/atlas-death-knight.png",
  demon_hunter: "/assets/skills/atlas-demon-hunter.png",
  druid: "/assets/skills/atlas-druid.png",
  evoker: "/assets/skills/atlas-evoker.png",
  hunter: "/assets/skills/atlas-hunter.png",
  mage: "/assets/skills/atlas-mage.png",
  monk: "/assets/skills/atlas-monk.png",
  paladin: "/assets/skills/atlas-paladin.png",
  priest: "/assets/skills/atlas-priest.png",
  rogue: "/assets/skills/atlas-rogue.png",
  shaman: "/assets/skills/atlas-shaman.png",
  warlock: "/assets/skills/atlas-warlock.png",
  warrior: "/assets/skills/atlas-warrior.png",
};

const specializationOrder = new Map<SpecId, number>();
const classCounts = new Map<ClassId, number>();

const ATLAS_ORDER_OVERRIDE: Partial<Record<SpecId, number>> = {
  warrior_protection: 0,
  warrior_arms: 1,
  warrior_fury: 2,
};

for (const specialization of SPECIALIZATIONS) {
  const order = classCounts.get(specialization.classId) ?? 0;
  specializationOrder.set(specialization.id, order);
  classCounts.set(specialization.classId, order + 1);
}

export function specializationSkillIcon(
  specId: SpecId,
  kind: "active" | "passive",
): SkillIconRef {
  const specialization = SPECIALIZATION_BY_ID[specId];
  const order = ATLAS_ORDER_OVERRIDE[specId] ?? specializationOrder.get(specId) ?? 0;
  return {
    atlas: CLASS_ATLAS[specialization.classId],
    index: order * 2 + (kind === "passive" ? 1 : 0),
  };
}

export function sharedSkillIcon(index: number): SkillIconRef {
  return {
    atlas: "/assets/skills/atlas-shared.png",
    index,
  };
}
