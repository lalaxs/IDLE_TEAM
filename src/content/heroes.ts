import type { HeroId, TargetStrategy } from "../simulation/types";

export interface HeroDefinition {
  id: HeroId;
  name: string;
  role: string;
  color: string;
  maxHp: number;
  attack: number;
  defense: number;
  attackIntervalMs: number;
  attackRange: number;
  moveSpeed: number;
  /** Physical vs elemental (magic) damage school for gear affixes. */
  damageSchool: "physical" | "magic";
  activeSkillId: string;
  passiveSkillId: string;
  targetStrategy: TargetStrategy;
  tagline: string;
}

export const HERO_DEFINITIONS: readonly HeroDefinition[] = [
  { id: "H01", name: "洛恩", role: "盾卫", color: "#6b8b69", maxHp: 1500, attack: 90, defense: 65, attackIntervalMs: 1400, attackRange: 65, moveSpeed: 117, damageSchool: "physical", activeSkillId: "shield-horn", passiveSkillId: "hold-fast", targetStrategy: "nearestEnemy", tagline: "以坚盾守住队伍的第一道防线" },
  { id: "H02", name: "布兰", role: "狂战", color: "#cf7158", maxHp: 1150, attack: 125, defense: 35, attackIntervalMs: 900, attackRange: 60, moveSpeed: 130, damageSchool: "physical", activeSkillId: "triple-rend", passiveSkillId: "blood-spirit", targetStrategy: "nearestEnemy", tagline: "受伤越重，战意越旺" },
  { id: "H03", name: "米娅", role: "火法", color: "#d97c55", maxHp: 780, attack: 155, defense: 18, attackIntervalMs: 1450, attackRange: 270, moveSpeed: 98, damageSchool: "magic", activeSkillId: "burst-fireball", passiveSkillId: "ember", targetStrategy: "nearestEnemy", tagline: "爆燃火球席卷密集敌群" },
  { id: "H04", name: "诺拉", role: "牧师", color: "#e2b958", maxHp: 900, attack: 70, defense: 25, attackIntervalMs: 1600, attackRange: 250, moveSpeed: 94, damageSchool: "magic", activeSkillId: "morning-heal", passiveSkillId: "afterglow", targetStrategy: "nearestEnemy", tagline: "晨光治愈伤员并留下护盾" },
  { id: "H05", name: "塔林", role: "游侠", color: "#6f9c61", maxHp: 850, attack: 120, defense: 22, attackIntervalMs: 1000, attackRange: 290, moveSpeed: 104, damageSchool: "physical", activeSkillId: "forest-arrow", passiveSkillId: "rapid-rhythm", targetStrategy: "nearestEnemy", tagline: "穿林箭贯穿敌军阵线" },
  { id: "H06", name: "乌鸦", role: "刺客", color: "#67607d", maxHp: 820, attack: 145, defense: 25, attackIntervalMs: 850, attackRange: 55, moveSpeed: 156, damageSchool: "physical", activeSkillId: "shadow-execute", passiveSkillId: "hunt-wounded", targetStrategy: "lowestHpEnemy", tagline: "锁定残血目标完成处决" },
  { id: "H07", name: "塞拉", role: "冰法", color: "#72a7c8", maxHp: 800, attack: 130, defense: 20, attackIntervalMs: 1300, attackRange: 250, moveSpeed: 99, damageSchool: "magic", activeSkillId: "frost-ring", passiveSkillId: "chill", targetStrategy: "nearestEnemy", tagline: "霜环压制整片战区" },
  { id: "H08", name: "海泽", role: "萨满", color: "#a171a4", maxHp: 1050, attack: 105, defense: 38, attackIntervalMs: 1200, attackRange: 150, moveSpeed: 111, damageSchool: "magic", activeSkillId: "chain-lightning", passiveSkillId: "war-drum", targetStrategy: "nearestEnemy", tagline: "雷链与战鼓同时鼓舞全队" },
] as const;

export const HERO_BY_ID = Object.fromEntries(
  HERO_DEFINITIONS.map((hero) => [hero.id, hero]),
) as Record<HeroId, HeroDefinition>;
