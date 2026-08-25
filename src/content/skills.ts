import type { HeroId } from "../simulation/types";
import { HERO_SKILL_COMBAT, HERO_ULTIMATE_COMBAT } from "./balance";

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

export const ULTIMATE_SKILLS: readonly SkillDefinition[] = [
  {
    id: "bulwark-shout",
    heroId: "H01",
    name: "壁垒怒吼",
    cooldownMs: HERO_ULTIMATE_COMBAT.H01.cooldownMs,
    description: "自身获得18%最大生命护盾，全队减伤12%持续4秒，并对最近敌人造成220%伤害",
  },
  {
    id: "blood-cyclone",
    heroId: "H02",
    name: "血战旋风",
    cooldownMs: HERO_ULTIMATE_COMBAT.H02.cooldownMs,
    description: "自身周围连续造成3次110%伤害",
  },
  {
    id: "meteor",
    heroId: "H03",
    name: "陨星",
    cooldownMs: HERO_ULTIMATE_COMBAT.H03.cooldownMs,
    description: "对大范围敌人造成300%伤害",
  },
  {
    id: "sanctuary",
    heroId: "H04",
    name: "圣域",
    cooldownMs: HERO_ULTIMATE_COMBAT.H04.cooldownMs,
    description: "治疗全队（220%攻击或10%最大生命，取高）",
  },
  {
    id: "arrow-rain",
    heroId: "H05",
    name: "箭雨",
    cooldownMs: HERO_ULTIMATE_COMBAT.H05.cooldownMs,
    description: "对前方最多4名敌人各造成140%伤害",
  },
  {
    id: "shadow-flurry",
    heroId: "H06",
    name: "影袭连刺",
    cooldownMs: HERO_ULTIMATE_COMBAT.H06.cooldownMs,
    description: "对生命比例最低的敌人连续造成4次90%伤害",
  },
  {
    id: "blizzard",
    heroId: "H07",
    name: "暴风雪",
    cooldownMs: HERO_ULTIMATE_COMBAT.H07.cooldownMs,
    description: "大范围造成240%伤害并减速45%持续4秒",
  },
  {
    id: "thunderstorm",
    heroId: "H08",
    name: "雷暴",
    cooldownMs: HERO_ULTIMATE_COMBAT.H08.cooldownMs,
    description: "在最多5名敌人间跳跃，末跳小幅眩晕",
  },
] as const;

export const AWAKENING_SKILLS: readonly SkillDefinition[] = [
  { id: "unyielding", heroId: "H01", name: "不屈", description: "格挡率 +8%；坚守在生命 50% 时触发" },
  { id: "frenzy", heroId: "H02", name: "狂怒", description: "低血时吸血 6%；血性攻速提高到 40%" },
  { id: "wildfire", heroId: "H03", name: "焚天", description: "溅射范围扩大；余烬最多保留两层" },
  { id: "morning-prayer", heroId: "H04", name: "晨祷", description: "治疗强度 +10%；溢出护盾上限提高" },
  { id: "hunter-mark", heroId: "H05", name: "猎手", description: "暴击率 +5%；可贯穿第三个目标" },
  { id: "kill-hunt", heroId: "H06", name: "猎杀", description: "对残血目标伤害 +12%；击杀后短暂加速" },
  { id: "permafrost", heroId: "H07", name: "极寒", description: "对被减速目标伤害 +10%；减速时有几率眩晕" },
  { id: "storm-drum", heroId: "H08", name: "雷鼓", description: "全队常驻攻速 +6%" },
] as const;

export const ACTIVE_SKILL_BY_HERO = Object.fromEntries(
  ACTIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const PASSIVE_SKILL_BY_HERO = Object.fromEntries(
  PASSIVE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const ULTIMATE_SKILL_BY_HERO = Object.fromEntries(
  ULTIMATE_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;

export const AWAKENING_SKILL_BY_HERO = Object.fromEntries(
  AWAKENING_SKILLS.map((skill) => [skill.heroId, skill]),
) as Record<HeroId, SkillDefinition>;
