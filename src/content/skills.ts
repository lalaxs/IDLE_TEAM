import type { HeroId } from "../simulation/types";
import { HERO_SKILL_COMBAT } from "./balance";

export interface SkillDefinition {
  id: string;
  heroId: HeroId;
  name: string;
  description: string;
  cooldownMs?: number;
}

export const ACTIVE_SKILLS: readonly SkillDefinition[] = [
  {
    id: "shield-horn",
    heroId: "H01",
    name: "盾角冲击",
    cooldownMs: HERO_SKILL_COMBAT.H01.cooldownMs,
    description: "造成185%伤害并眩晕1.2秒",
  },
  {
    id: "triple-rend",
    heroId: "H02",
    name: "三段裂击",
    cooldownMs: HERO_SKILL_COMBAT.H02.cooldownMs,
    description: "连续造成3次75%伤害",
  },
  {
    id: "burst-fireball",
    heroId: "H03",
    name: "爆燃火球",
    cooldownMs: HERO_SKILL_COMBAT.H03.cooldownMs,
    description: "主目标200%伤害，邻近敌人95%",
  },
  {
    id: "morning-heal",
    heroId: "H04",
    name: "晨光治愈",
    cooldownMs: HERO_SKILL_COMBAT.H04.cooldownMs,
    description: "治疗生命比例最低的队友（280%攻击或14%最大生命）",
  },
  {
    id: "forest-arrow",
    heroId: "H05",
    name: "穿林箭",
    cooldownMs: HERO_SKILL_COMBAT.H05.cooldownMs,
    description: "贯穿两个目标，造成220%与110%伤害",
  },
  {
    id: "shadow-execute",
    heroId: "H06",
    name: "影袭处决",
    cooldownMs: HERO_SKILL_COMBAT.H06.cooldownMs,
    description: "突进残血目标：250%伤害，低血量时提高到340%",
  },
  {
    id: "frost-ring",
    heroId: "H07",
    name: "霜环",
    cooldownMs: HERO_SKILL_COMBAT.H07.cooldownMs,
    description: "范围160%伤害并减速40%持续3秒",
  },
  {
    id: "chain-lightning",
    heroId: "H08",
    name: "跃动雷链",
    cooldownMs: HERO_SKILL_COMBAT.H08.cooldownMs,
    description: "在最多3名敌人间跳跃（125%起，每跳衰减）",
  },
] as const;

export const PASSIVE_SKILLS: readonly SkillDefinition[] = [
  { id: "hold-fast", heroId: "H01", name: "坚守", description: "生命低于40%时减伤15%" },
  { id: "blood-spirit", heroId: "H02", name: "血性", description: "生命低于45%时攻速提高25%" },
  { id: "ember", heroId: "H03", name: "余烬", description: "技能命中后强化下一次普攻35%" },
  { id: "afterglow", heroId: "H04", name: "余辉", description: "溢出治疗转化为护盾" },
  { id: "rapid-rhythm", heroId: "H05", name: "连射节奏", description: "每4次普攻获得短暂攻速" },
  { id: "hunt-wounded", heroId: "H06", name: "猎残", description: "优先攻击生命比例最低的敌人" },
  { id: "chill", heroId: "H07", name: "寒意", description: "被减速敌人额外降低攻速" },
  { id: "war-drum", heroId: "H08", name: "战鼓图腾", description: "施放技能后全队获得攻速" },
] as const;

export const ACTIVE_SKILL_BY_HERO = Object.fromEntries(
  ACTIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const PASSIVE_SKILL_BY_HERO = Object.fromEntries(
  PASSIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;
