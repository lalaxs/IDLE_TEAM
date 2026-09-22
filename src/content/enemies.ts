import { STAGES_PER_CHAPTER, stageToChapter, type ChapterId } from "./chapters";
import { chapterThemeElement, type DamageElement } from "./damageElements";
import type { AttackMode, EnemyId } from "../simulation/types";
import type { EnemyCombatProfileId } from "./enemyCombatProfiles";

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  attackIntervalMs: number;
  /** Authored combat behavior; never inferred from the numeric range. */
  attackMode: AttackMode;
  /** Melee reach beyond body contact, or the final stop distance for ranged units. */
  attackRange: number;
  moveSpeed: number;
  kind: "normal" | "elite" | "boss";
  color: string;
  /** Base attack school; elites/bosses follow the chapter theme instead. */
  damageElement: DamageElement;
  /** Data-driven combat behavior. Missing profiles retain the established kind default. */
  combatProfileId?: EnemyCombatProfileId;
}

const RAW_ENEMY_DEFINITIONS: readonly EnemyDefinition[] = [
  { id: "E01", name: "嫩枝精", maxHp: 320, attack: 55, defense: 10, attackIntervalMs: 1500, attackMode: "melee", attackRange: 55, moveSpeed: 116, kind: "normal", color: "#80965c", damageElement: "physical", combatProfileId: "baseline" },
  { id: "E02", name: "红帽菌兽", maxHp: 240, attack: 74, defense: 8, attackIntervalMs: 1250, attackMode: "melee", attackRange: 65, moveSpeed: 122, kind: "normal", color: "#d77b69", damageElement: "dark", combatProfileId: "c1-cadence-strike" },
  { id: "E03", name: "灰壳甲虫", maxHp: 520, attack: 45, defense: 30, attackIntervalMs: 1700, attackMode: "melee", attackRange: 50, moveSpeed: 108, kind: "normal", color: "#7f8273", damageElement: "physical", combatProfileId: "c1-shell-guard" },
  { id: "E04", name: "老桩卫", maxHp: 900, attack: 82, defense: 34, attackIntervalMs: 1450, attackMode: "melee", attackRange: 60, moveSpeed: 110, kind: "elite", color: "#806447", damageElement: "physical", combatProfileId: "c1-elite-guard" },
  { id: "E05", name: "荆棘獾", maxHp: 360, attack: 62, defense: 14, attackIntervalMs: 1400, attackMode: "melee", attackRange: 55, moveSpeed: 118, kind: "normal", color: "#6a7a4a", damageElement: "physical", combatProfileId: "baseline" },
  { id: "E06", name: "苔背蛙", maxHp: 300, attack: 70, defense: 12, attackIntervalMs: 1300, attackMode: "melee", attackRange: 60, moveSpeed: 116, kind: "normal", color: "#5a8a5a", damageElement: "frost", combatProfileId: "c1-cadence-slow-18" },
  { id: "E07", name: "暮翼蝠", maxHp: 280, attack: 78, defense: 10, attackIntervalMs: 1200, attackMode: "melee", attackRange: 70, moveSpeed: 124, kind: "normal", color: "#5a5a7a", damageElement: "dark", combatProfileId: "c1-low-hp-hunter" },
  { id: "E08", name: "盘根卫", maxHp: 980, attack: 88, defense: 36, attackIntervalMs: 1500, attackMode: "melee", attackRange: 60, moveSpeed: 108, kind: "elite", color: "#5d6b45", damageElement: "physical", combatProfileId: "c1-root-bind" },
  { id: "E09", name: "雾松灵", maxHp: 380, attack: 72, defense: 16, attackIntervalMs: 1350, attackMode: "melee", attackRange: 58, moveSpeed: 114, kind: "normal", color: "#c7c8aa", damageElement: "frost", combatProfileId: "baseline" },
  { id: "E10", name: "缚藤兽", maxHp: 440, attack: 76, defense: 18, attackIntervalMs: 1400, attackMode: "melee", attackRange: 58, moveSpeed: 117, kind: "normal", color: "#8c8a7d", damageElement: "physical", combatProfileId: "c1-cadence-slow-22" },
  { id: "E11", name: "碎碑傀", maxHp: 620, attack: 58, defense: 38, attackIntervalMs: 1750, attackMode: "melee", attackRange: 52, moveSpeed: 108, kind: "normal", color: "#aaa89f", damageElement: "physical", combatProfileId: "baseline" },
  { id: "E12", name: "雾钟灵", maxHp: 1120, attack: 92, defense: 44, attackIntervalMs: 1550, attackMode: "melee", attackRange: 64, moveSpeed: 109, kind: "elite", color: "#71838a", damageElement: "physical", combatProfileId: "c1-echo-shield" },
  { id: "E13", name: "雪耳兔", maxHp: 340, attack: 60, defense: 12, attackIntervalMs: 1450, attackMode: "melee", attackRange: 55, moveSpeed: 118, kind: "normal", color: "#91857c", damageElement: "frost" },
  { id: "E14", name: "冰腹鼬", maxHp: 300, attack: 72, defense: 10, attackIntervalMs: 1200, attackMode: "melee", attackRange: 55, moveSpeed: 122, kind: "normal", color: "#7e858d", damageElement: "frost" },
  { id: "E15", name: "冻壳蜗", maxHp: 520, attack: 50, defense: 30, attackIntervalMs: 1650, attackMode: "melee", attackRange: 52, moveSpeed: 114, kind: "normal", color: "#768594", damageElement: "frost" },
  { id: "E16", name: "霜角牦", maxHp: 950, attack: 86, defense: 38, attackIntervalMs: 1500, attackMode: "melee", attackRange: 64, moveSpeed: 116, kind: "elite", color: "#756a62", damageElement: "frost" },
  { id: "E17", name: "松果鼠", maxHp: 300, attack: 70, defense: 10, attackIntervalMs: 1350, attackMode: "ranged", attackRange: 250, moveSpeed: 116, kind: "normal", color: "#706754", damageElement: "frost" },
  { id: "E18", name: "雾翅蛾", maxHp: 280, attack: 76, defense: 10, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 235, moveSpeed: 120, kind: "normal", color: "#65717a", damageElement: "frost" },
  { id: "E19", name: "冰芽鹿", maxHp: 360, attack: 62, defense: 18, attackIntervalMs: 1450, attackMode: "melee", attackRange: 90, moveSpeed: 118, kind: "normal", color: "#827d76", damageElement: "frost" },
  { id: "E20", name: "霜丝蛛", maxHp: 1040, attack: 88, defense: 42, attackIntervalMs: 1500, attackMode: "melee", attackRange: 72, moveSpeed: 114, kind: "elite", color: "#3d6252", damageElement: "frost" },
  { id: "E21", name: "霜环雪獾", maxHp: 400, attack: 68, defense: 20, attackIntervalMs: 1450, attackMode: "melee", attackRange: 58, moveSpeed: 116, kind: "normal", color: "#655b55", damageElement: "frost" },
  { id: "E22", name: "辉带岩蜥", maxHp: 300, attack: 78, defense: 12, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 230, moveSpeed: 120, kind: "normal", color: "#77728a", damageElement: "frost" },
  { id: "E23", name: "冻纹龟", maxHp: 560, attack: 56, defense: 34, attackIntervalMs: 1650, attackMode: "melee", attackRange: 52, moveSpeed: 114, kind: "normal", color: "#5d6f82", damageElement: "frost" },
  { id: "E24", name: "冰脊豪猪", maxHp: 1100, attack: 94, defense: 44, attackIntervalMs: 1550, attackMode: "melee", attackRange: 62, moveSpeed: 114, kind: "elite", color: "#4e6274", damageElement: "frost" },
  { id: "E25", name: "沙耳狐", maxHp: 380, attack: 68, defense: 16, attackIntervalMs: 1350, attackMode: "melee", attackRange: 55, moveSpeed: 120, kind: "normal", color: "#9a765d", damageElement: "physical" },
  { id: "E26", name: "疾足沙鸵", maxHp: 300, attack: 76, defense: 10, attackIntervalMs: 1150, attackMode: "melee", attackRange: 55, moveSpeed: 126, kind: "normal", color: "#a7856d", damageElement: "physical" },
  { id: "E27", name: "砂钳蝎", maxHp: 460, attack: 64, defense: 24, attackIntervalMs: 1550, attackMode: "melee", attackRange: 65, moveSpeed: 114, kind: "normal", color: "#9b6658", damageElement: "fire" },
  { id: "E28", name: "驿甲犀", maxHp: 980, attack: 90, defense: 40, attackIntervalMs: 1450, attackMode: "melee", attackRange: 64, moveSpeed: 118, kind: "elite", color: "#8f6c5d", damageElement: "fire" },
  { id: "E29", name: "层甲犰狳", maxHp: 480, attack: 62, defense: 26, attackIntervalMs: 1500, attackMode: "melee", attackRange: 58, moveSpeed: 114, kind: "normal", color: "#966b58", damageElement: "physical" },
  { id: "E30", name: "疾足走鹃", maxHp: 300, attack: 80, defense: 10, attackIntervalMs: 1150, attackMode: "melee", attackRange: 80, moveSpeed: 126, kind: "normal", color: "#87766f", damageElement: "physical" },
  { id: "E31", name: "裂风颚兽", maxHp: 340, attack: 78, defense: 14, attackIntervalMs: 1350, attackMode: "ranged", attackRange: 250, moveSpeed: 118, kind: "normal", color: "#806f78", damageElement: "fire" },
  { id: "E32", name: "峡脊鬣狗", maxHp: 1020, attack: 94, defense: 38, attackIntervalMs: 1450, attackMode: "melee", attackRange: 72, moveSpeed: 120, kind: "elite", color: "#855c4b", damageElement: "fire" },
  { id: "E33", name: "砂掌灵猫", maxHp: 380, attack: 72, defense: 16, attackIntervalMs: 1350, attackMode: "melee", attackRange: 55, moveSpeed: 120, kind: "normal", color: "#8c735f", damageElement: "physical" },
  { id: "E34", name: "铜翼幼龙", maxHp: 320, attack: 82, defense: 12, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 240, moveSpeed: 124, kind: "normal", color: "#55726e", damageElement: "fire" },
  { id: "E35", name: "拱背砂鳄", maxHp: 540, attack: 58, defense: 34, attackIntervalMs: 1650, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#745c4f", damageElement: "physical" },
  { id: "E36", name: "拱盾兽", maxHp: 1120, attack: 92, defense: 48, attackIntervalMs: 1550, attackMode: "melee", attackRange: 68, moveSpeed: 114, kind: "elite", color: "#847263", damageElement: "fire" },
  { id: "E37", name: "风耳跳兽", maxHp: 400, attack: 74, defense: 18, attackIntervalMs: 1350, attackMode: "melee", attackRange: 55, moveSpeed: 122, kind: "normal", color: "#7f9586", damageElement: "physical" },
  { id: "E38", name: "云帆走兽", maxHp: 320, attack: 84, defense: 12, attackIntervalMs: 1150, attackMode: "melee", attackRange: 62, moveSpeed: 128, kind: "normal", color: "#7e8e82", damageElement: "lightning" },
  { id: "E39", name: "白岩甲虫", maxHp: 560, attack: 60, defense: 36, attackIntervalMs: 1650, attackMode: "melee", attackRange: 52, moveSpeed: 114, kind: "normal", color: "#aaa79e", damageElement: "physical" },
  { id: "E40", name: "云脊角兽", maxHp: 1080, attack: 98, defense: 44, attackIntervalMs: 1450, attackMode: "melee", attackRange: 68, moveSpeed: 120, kind: "elite", color: "#779080", damageElement: "lightning" },
  { id: "E41", name: "风切岩兽", maxHp: 360, attack: 86, defense: 16, attackIntervalMs: 1300, attackMode: "ranged", attackRange: 260, moveSpeed: 120, kind: "normal", color: "#6d7480", damageElement: "lightning" },
  { id: "E42", name: "雷尾迅兽", maxHp: 330, attack: 88, defense: 12, attackIntervalMs: 1100, attackMode: "melee", attackRange: 58, moveSpeed: 130, kind: "normal", color: "#716986", damageElement: "lightning" },
  { id: "E43", name: "暴风绒蛾", maxHp: 340, attack: 80, defense: 14, attackIntervalMs: 1400, attackMode: "ranged", attackRange: 245, moveSpeed: 118, kind: "normal", color: "#65787a", damageElement: "lightning" },
  { id: "E44", name: "风暴翼龙", maxHp: 1140, attack: 104, defense: 42, attackIntervalMs: 1400, attackMode: "melee", attackRange: 90, moveSpeed: 122, kind: "elite", color: "#5f697d", damageElement: "lightning" },
  { id: "E45", name: "塔冠跃兽", maxHp: 420, attack: 78, defense: 20, attackIntervalMs: 1350, attackMode: "melee", attackRange: 55, moveSpeed: 122, kind: "normal", color: "#506760", damageElement: "physical" },
  { id: "E46", name: "铜足疾鸟", maxHp: 340, attack: 90, defense: 12, attackIntervalMs: 1100, attackMode: "melee", attackRange: 58, moveSpeed: 130, kind: "normal", color: "#7b8177", damageElement: "physical" },
  { id: "E47", name: "白壁盾龟", maxHp: 600, attack: 62, defense: 40, attackIntervalMs: 1700, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#78837d", damageElement: "physical" },
  { id: "E48", name: "导风甲兽", maxHp: 1200, attack: 100, defense: 50, attackIntervalMs: 1500, attackMode: "melee", attackRange: 72, moveSpeed: 116, kind: "elite", color: "#506f69", damageElement: "lightning" },
  { id: "E49", name: "沼冠伏兽", maxHp: 440, attack: 82, defense: 22, attackIntervalMs: 1350, attackMode: "melee", attackRange: 55, moveSpeed: 120, kind: "normal", color: "#849065", damageElement: "physical" },
  { id: "E50", name: "苇尾泥蜥", maxHp: 350, attack: 92, defense: 14, attackIntervalMs: 1100, attackMode: "melee", attackRange: 58, moveSpeed: 130, kind: "normal", color: "#718b86", damageElement: "physical" },
  { id: "E51", name: "浮壳钳虫", maxHp: 620, attack: 64, defense: 42, attackIntervalMs: 1700, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#9a8465", damageElement: "physical" },
  { id: "E52", name: "黑水钳兽", maxHp: 1260, attack: 106, defense: 54, attackIntervalMs: 1500, attackMode: "melee", attackRange: 72, moveSpeed: 116, kind: "elite", color: "#536c68", damageElement: "dark" },
  { id: "E53", name: "沉舟骨卒", maxHp: 450, attack: 84, defense: 20, attackIntervalMs: 1350, attackMode: "melee", attackRange: 60, moveSpeed: 120, kind: "normal", color: "#999486", damageElement: "physical" },
  { id: "E54", name: "沉泥骨手", maxHp: 360, attack: 94, defense: 14, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 250, moveSpeed: 120, kind: "normal", color: "#77766d", damageElement: "dark" },
  { id: "E55", name: "锚盾骨卫", maxHp: 640, attack: 66, defense: 44, attackIntervalMs: 1700, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#705c47", damageElement: "physical" },
  { id: "E56", name: "舟脊骨尉", maxHp: 1300, attack: 108, defense: 56, attackIntervalMs: 1500, attackMode: "melee", attackRange: 78, moveSpeed: 116, kind: "elite", color: "#667252", damageElement: "dark" },
  { id: "E57", name: "雾苇潜兽", maxHp: 470, attack: 86, defense: 22, attackIntervalMs: 1350, attackMode: "melee", attackRange: 58, moveSpeed: 120, kind: "normal", color: "#536c68", damageElement: "physical" },
  { id: "E58", name: "雾幕绒蛾", maxHp: 360, attack: 92, defense: 16, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 245, moveSpeed: 122, kind: "normal", color: "#59664a", damageElement: "dark" },
  { id: "E59", name: "苔甲盘兽", maxHp: 660, attack: 68, defense: 46, attackIntervalMs: 1700, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#59664a", damageElement: "physical" },
  { id: "E60", name: "沼心角兽", maxHp: 1340, attack: 110, defense: 58, attackIntervalMs: 1450, attackMode: "melee", attackRange: 72, moveSpeed: 118, kind: "elite", color: "#536c68", damageElement: "dark" },
  { id: "E61", name: "焦背掘兽", maxHp: 490, attack: 88, defense: 24, attackIntervalMs: 1350, attackMode: "melee", attackRange: 58, moveSpeed: 120, kind: "normal", color: "#746b58", damageElement: "physical" },
  { id: "E62", name: "炭鳍跃兽", maxHp: 380, attack: 96, defense: 16, attackIntervalMs: 1150, attackMode: "melee", attackRange: 60, moveSpeed: 130, kind: "normal", color: "#72755d", damageElement: "physical" },
  { id: "E63", name: "渣壳钳虫", maxHp: 680, attack: 70, defense: 48, attackIntervalMs: 1700, attackMode: "melee", attackRange: 52, moveSpeed: 112, kind: "normal", color: "#766a5b", damageElement: "physical" },
  { id: "E64", name: "枯根角兽", maxHp: 1380, attack: 112, defense: 60, attackIntervalMs: 1500, attackMode: "melee", attackRange: 78, moveSpeed: 118, kind: "elite", color: "#625b4c", damageElement: "fire" },
  { id: "E65", name: "孔背岩兽", maxHp: 500, attack: 94, defense: 24, attackIntervalMs: 1350, attackMode: "ranged", attackRange: 250, moveSpeed: 120, kind: "normal", color: "#6c6259", damageElement: "fire" },
  { id: "E66", name: "裂尾疾兽", maxHp: 380, attack: 98, defense: 16, attackIntervalMs: 1100, attackMode: "melee", attackRange: 62, moveSpeed: 132, kind: "normal", color: "#77584d", damageElement: "physical" },
  { id: "E67", name: "冷渣甲蛾", maxHp: 400, attack: 94, defense: 18, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 240, moveSpeed: 122, kind: "normal", color: "#665f5a", damageElement: "fire" },
  { id: "E68", name: "炉脊锤兽", maxHp: 1420, attack: 114, defense: 62, attackIntervalMs: 1450, attackMode: "melee", attackRange: 82, moveSpeed: 118, kind: "elite", color: "#6a5047", damageElement: "fire" },
  { id: "E69", name: "烬炉地精", maxHp: 520, attack: 92, defense: 24, attackIntervalMs: 1350, attackMode: "melee", attackRange: 62, moveSpeed: 122, kind: "normal", color: "#7d8065", damageElement: "physical" },
  { id: "E70", name: "灰刃斥候", maxHp: 400, attack: 102, defense: 16, attackIntervalMs: 1100, attackMode: "melee", attackRange: 60, moveSpeed: 132, kind: "normal", color: "#777a61", damageElement: "physical" },
  { id: "E71", name: "炉罐投手", maxHp: 420, attack: 98, defense: 18, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 255, moveSpeed: 122, kind: "normal", color: "#7f8063", damageElement: "fire" },
  { id: "E72", name: "黑铁监工", maxHp: 1460, attack: 116, defense: 64, attackIntervalMs: 1450, attackMode: "melee", attackRange: 82, moveSpeed: 118, kind: "elite", color: "#74765f", damageElement: "fire" },
  { id: "E73", name: "盐甲钳兽", maxHp: 540, attack: 96, defense: 26, attackIntervalMs: 1350, attackMode: "melee", attackRange: 58, moveSpeed: 122, kind: "normal", color: "#7f8f83", damageElement: "physical" },
  { id: "E74", name: "潮鳍跃兽", maxHp: 410, attack: 106, defense: 16, attackIntervalMs: 1100, attackMode: "melee", attackRange: 60, moveSpeed: 132, kind: "normal", color: "#78939a", damageElement: "physical" },
  { id: "E75", name: "盐喙喷兽", maxHp: 430, attack: 102, defense: 18, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 255, moveSpeed: 122, kind: "normal", color: "#9b9882", damageElement: "lightning" },
  { id: "E76", name: "礁盾驮兽", maxHp: 1500, attack: 120, defense: 66, attackIntervalMs: 1450, attackMode: "melee", attackRange: 82, moveSpeed: 120, kind: "elite", color: "#7f8c82", damageElement: "lightning" },
  { id: "E77", name: "蚀岸颚兽", maxHp: 550, attack: 98, defense: 26, attackIntervalMs: 1350, attackMode: "melee", attackRange: 60, moveSpeed: 122, kind: "normal", color: "#687988", damageElement: "physical" },
  { id: "E78", name: "裂鳍疾兽", maxHp: 420, attack: 108, defense: 16, attackIntervalMs: 1100, attackMode: "melee", attackRange: 60, moveSpeed: 134, kind: "normal", color: "#6b7f91", damageElement: "physical" },
  { id: "E79", name: "潮幕甲蛾", maxHp: 440, attack: 104, defense: 18, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 255, moveSpeed: 122, kind: "normal", color: "#77858c", damageElement: "lightning" },
  { id: "E80", name: "岸脊锤兽", maxHp: 1540, attack: 122, defense: 68, attackIntervalMs: 1450, attackMode: "melee", attackRange: 84, moveSpeed: 120, kind: "elite", color: "#61768c", damageElement: "lightning" },
  { id: "E81", name: "潮垒兽卒", maxHp: 560, attack: 100, defense: 26, attackIntervalMs: 1350, attackMode: "melee", attackRange: 62, moveSpeed: 124, kind: "normal", color: "#78979a", damageElement: "physical" },
  { id: "E82", name: "盐刃掠手", maxHp: 430, attack: 110, defense: 18, attackIntervalMs: 1100, attackMode: "melee", attackRange: 62, moveSpeed: 134, kind: "normal", color: "#779395", damageElement: "physical" },
  { id: "E83", name: "礁盘投手", maxHp: 450, attack: 106, defense: 20, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 260, moveSpeed: 124, kind: "normal", color: "#78979a", damageElement: "physical" },
  { id: "E84", name: "沉甲护卫", maxHp: 1580, attack: 124, defense: 70, attackIntervalMs: 1450, attackMode: "melee", attackRange: 84, moveSpeed: 120, kind: "elite", color: "#6f8f93", damageElement: "lightning" },
  { id: "E85", name: "枯冠掘兽", maxHp: 580, attack: 102, defense: 28, attackIntervalMs: 1350, attackMode: "melee", attackRange: 60, moveSpeed: 124, kind: "normal", color: "#8c7d6d", damageElement: "physical" },
  { id: "E86", name: "风尾跃怪", maxHp: 440, attack: 112, defense: 18, attackIntervalMs: 1100, attackMode: "melee", attackRange: 62, moveSpeed: 136, kind: "normal", color: "#777662", damageElement: "physical" },
  { id: "E87", name: "灰喙鸣兽", maxHp: 460, attack: 108, defense: 20, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 260, moveSpeed: 124, kind: "normal", color: "#756875", damageElement: "dark" },
  { id: "E88", name: "荒丘甲卫", maxHp: 1620, attack: 128, defense: 72, attackIntervalMs: 1450, attackMode: "melee", attackRange: 86, moveSpeed: 122, kind: "elite", color: "#737376", damageElement: "dark" },
  { id: "E89", name: "残矛骨卒", maxHp: 590, attack: 104, defense: 28, attackIntervalMs: 1350, attackMode: "melee", attackRange: 64, moveSpeed: 124, kind: "normal", color: "#85766b", damageElement: "physical" },
  { id: "E90", name: "灰瓮骨手", maxHp: 450, attack: 114, defense: 18, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 265, moveSpeed: 124, kind: "normal", color: "#766a73", damageElement: "dark" },
  { id: "E91", name: "旧盾骨卫", maxHp: 620, attack: 98, defense: 36, attackIntervalMs: 1500, attackMode: "melee", attackRange: 60, moveSpeed: 120, kind: "normal", color: "#756f6b", damageElement: "physical" },
  { id: "E92", name: "残旗骨尉", maxHp: 1660, attack: 130, defense: 74, attackIntervalMs: 1450, attackMode: "melee", attackRange: 88, moveSpeed: 122, kind: "elite", color: "#74666f", damageElement: "dark" },
  { id: "E93", name: "石趾伏兽", maxHp: 600, attack: 106, defense: 30, attackIntervalMs: 1350, attackMode: "melee", attackRange: 62, moveSpeed: 124, kind: "normal", color: "#7d7772", damageElement: "physical" },
  { id: "E94", name: "环角疾兽", maxHp: 460, attack: 116, defense: 18, attackIntervalMs: 1100, attackMode: "melee", attackRange: 64, moveSpeed: 136, kind: "normal", color: "#726d73", damageElement: "physical" },
  { id: "E95", name: "墓门偶卫", maxHp: 640, attack: 100, defense: 38, attackIntervalMs: 1500, attackMode: "melee", attackRange: 62, moveSpeed: 120, kind: "normal", color: "#706c6c", damageElement: "dark" },
  { id: "E96", name: "断拱石将", maxHp: 1700, attack: 132, defense: 76, attackIntervalMs: 1450, attackMode: "melee", attackRange: 90, moveSpeed: 122, kind: "elite", color: "#706a70", damageElement: "dark" },
  { id: "E97", name: "岩冠掘兽", maxHp: 620, attack: 108, defense: 30, attackIntervalMs: 1350, attackMode: "melee", attackRange: 62, moveSpeed: 124, kind: "normal", color: "#8a776b", damageElement: "physical" },
  { id: "E98", name: "钩尾跃怪", maxHp: 470, attack: 118, defense: 18, attackIntervalMs: 1100, attackMode: "melee", attackRange: 64, moveSpeed: 136, kind: "normal", color: "#777d72", damageElement: "physical" },
  { id: "E99", name: "震颚鸣兽", maxHp: 480, attack: 114, defense: 20, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 265, moveSpeed: 124, kind: "normal", color: "#6f7483", damageElement: "physical" },
  { id: "E100", name: "岩肩护兽", maxHp: 1740, attack: 136, defense: 78, attackIntervalMs: 1450, attackMode: "melee", attackRange: 90, moveSpeed: 122, kind: "elite", color: "#7d7b72", damageElement: "physical" },
  { id: "E101", name: "灰岩矿徒", maxHp: 630, attack: 110, defense: 30, attackIntervalMs: 1350, attackMode: "melee", attackRange: 64, moveSpeed: 124, kind: "normal", color: "#75806d", damageElement: "physical" },
  { id: "E102", name: "晶镐斥手", maxHp: 480, attack: 120, defense: 20, attackIntervalMs: 1100, attackMode: "melee", attackRange: 64, moveSpeed: 136, kind: "normal", color: "#73806d", damageElement: "physical" },
  { id: "E103", name: "矿钉掷手", maxHp: 490, attack: 116, defense: 22, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 270, moveSpeed: 124, kind: "normal", color: "#71806d", damageElement: "physical" },
  { id: "E104", name: "石肩监工", maxHp: 1780, attack: 138, defense: 80, attackIntervalMs: 1450, attackMode: "melee", attackRange: 92, moveSpeed: 122, kind: "elite", color: "#68766b", damageElement: "physical" },
  { id: "E105", name: "锁趾伏兽", maxHp: 640, attack: 112, defense: 32, attackIntervalMs: 1350, attackMode: "melee", attackRange: 64, moveSpeed: 124, kind: "normal", color: "#68778a", damageElement: "physical" },
  { id: "E106", name: "断翼疾怪", maxHp: 490, attack: 122, defense: 20, attackIntervalMs: 1100, attackMode: "melee", attackRange: 66, moveSpeed: 136, kind: "normal", color: "#65718c", damageElement: "physical" },
  { id: "E107", name: "峰喙哨怪", maxHp: 500, attack: 118, defense: 22, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 270, moveSpeed: 124, kind: "normal", color: "#6a748a", damageElement: "physical" },
  { id: "E108", name: "脊门矛卫", maxHp: 1820, attack: 140, defense: 82, attackIntervalMs: 1450, attackMode: "melee", attackRange: 100, moveSpeed: 122, kind: "elite", color: "#5f687d", damageElement: "physical" },
  { id: "E109", name: "霜额掘怪", maxHp: 650, attack: 114, defense: 32, attackIntervalMs: 1350, attackMode: "melee", attackRange: 64, moveSpeed: 124, kind: "normal", color: "#667789", damageElement: "physical" },
  { id: "E110", name: "风鳍跃怪", maxHp: 500, attack: 124, defense: 20, attackIntervalMs: 1100, attackMode: "melee", attackRange: 66, moveSpeed: 136, kind: "normal", color: "#64758c", damageElement: "physical" },
  { id: "E111", name: "砾尾投怪", maxHp: 510, attack: 120, defense: 22, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 275, moveSpeed: 124, kind: "normal", color: "#68798b", damageElement: "physical" },
  { id: "E112", name: "旗肩护兽", maxHp: 1860, attack: 142, defense: 84, attackIntervalMs: 1450, attackMode: "melee", attackRange: 92, moveSpeed: 122, kind: "elite", color: "#6b7480", damageElement: "frost" },
  { id: "E113", name: "墙趾伏兽", maxHp: 660, attack: 116, defense: 34, attackIntervalMs: 1350, attackMode: "melee", attackRange: 64, moveSpeed: 124, kind: "normal", color: "#647487", damageElement: "physical" },
  { id: "E114", name: "铰足钩虫", maxHp: 510, attack: 126, defense: 20, attackIntervalMs: 1100, attackMode: "melee", attackRange: 66, moveSpeed: 136, kind: "normal", color: "#667487", damageElement: "physical" },
  { id: "E115", name: "风帽咒师", maxHp: 520, attack: 122, defense: 24, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 275, moveSpeed: 124, kind: "normal", color: "#596783", damageElement: "frost" },
  { id: "E116", name: "关墙独眼巨人", maxHp: 1900, attack: 144, defense: 86, attackIntervalMs: 1450, attackMode: "melee", attackRange: 94, moveSpeed: 122, kind: "elite", color: "#60738c", damageElement: "frost" },
  { id: "E117", name: "霜鳞关卒", maxHp: 670, attack: 118, defense: 34, attackIntervalMs: 1350, attackMode: "melee", attackRange: 66, moveSpeed: 124, kind: "normal", color: "#5e7087", damageElement: "physical" },
  { id: "E118", name: "钩尾斥候", maxHp: 520, attack: 128, defense: 20, attackIntervalMs: 1100, attackMode: "melee", attackRange: 66, moveSpeed: 136, kind: "normal", color: "#596b82", damageElement: "physical" },
  { id: "E119", name: "环刃投手", maxHp: 530, attack: 124, defense: 24, attackIntervalMs: 1250, attackMode: "ranged", attackRange: 275, moveSpeed: 124, kind: "normal", color: "#5d6f86", damageElement: "physical" },
  { id: "E120", name: "关铠蜥尉", maxHp: 1940, attack: 146, defense: 88, attackIntervalMs: 1450, attackMode: "melee", attackRange: 96, moveSpeed: 122, kind: "elite", color: "#53657d", damageElement: "frost" },
  { id: "B01", name: "刺根兽", maxHp: 1800, attack: 98, defense: 42, attackIntervalMs: 1600, attackMode: "melee", attackRange: 80, moveSpeed: 108, kind: "boss", color: "#5d7551", damageElement: "physical" },
  { id: "B02", name: "大伞菌母", maxHp: 1900, attack: 102, defense: 40, attackIntervalMs: 1550, attackMode: "melee", attackRange: 85, moveSpeed: 110, kind: "boss", color: "#b05a4a", damageElement: "dark" },
  { id: "B03", name: "岩背甲虫王", maxHp: 2100, attack: 95, defense: 55, attackIntervalMs: 1700, attackMode: "melee", attackRange: 75, moveSpeed: 106, kind: "boss", color: "#7a7a6a", damageElement: "physical" },
  { id: "B04", name: "风帆蜥", maxHp: 1850, attack: 108, defense: 38, attackIntervalMs: 1450, attackMode: "melee", attackRange: 90, moveSpeed: 112, kind: "boss", color: "#8a7a4a", damageElement: "physical", combatProfileId: "c1-sail-sweep" },
  { id: "B05", name: "林门哨卫", maxHp: 2000, attack: 105, defense: 48, attackIntervalMs: 1600, attackMode: "melee", attackRange: 80, moveSpeed: 108, kind: "boss", color: "#4a6a4a", damageElement: "physical" },
  { id: "B06", name: "暗溪巨蛙", maxHp: 1950, attack: 110, defense: 36, attackIntervalMs: 1500, attackMode: "melee", attackRange: 95, moveSpeed: 110, kind: "boss", color: "#3a6a6a", damageElement: "frost" },
  { id: "B07", name: "缠根树兽", maxHp: 2200, attack: 100, defense: 52, attackIntervalMs: 1650, attackMode: "melee", attackRange: 85, moveSpeed: 106, kind: "boss", color: "#4a5a3a", damageElement: "physical" },
  { id: "B08", name: "碑背巨蜥", maxHp: 2300, attack: 112, defense: 50, attackIntervalMs: 1580, attackMode: "melee", attackRange: 90, moveSpeed: 108, kind: "boss", color: "#6a5a4a", damageElement: "physical", combatProfileId: "c1-stone-tail" },
  { id: "B12", name: "碑翼古鸮", maxHp: 2600, attack: 118, defense: 58, attackIntervalMs: 1650, attackMode: "melee", attackRange: 88, moveSpeed: 106, kind: "boss", color: "#5f6977", damageElement: "physical", combatProfileId: "c1-wing-pressure" },
  { id: "B16", name: "雪岭眠熊", maxHp: 2400, attack: 112, defense: 54, attackIntervalMs: 1600, attackMode: "melee", attackRange: 82, moveSpeed: 114, kind: "boss", color: "#706963", damageElement: "frost", combatProfileId: "snowhill-slam" },
  { id: "B20", name: "霜鬃猞猁", maxHp: 2550, attack: 118, defense: 46, attackIntervalMs: 1450, attackMode: "melee", attackRange: 92, moveSpeed: 116, kind: "boss", color: "#53667a", damageElement: "frost", combatProfileId: "frost-pounce" },
  { id: "B24", name: "极光冠鸮", maxHp: 2800, attack: 122, defense: 50, attackIntervalMs: 1550, attackMode: "ranged", attackRange: 255, moveSpeed: 114, kind: "boss", color: "#625b58", damageElement: "frost", combatProfileId: "aurora-wingfall" },
  { id: "B28", name: "双丘巨驼", maxHp: 2500, attack: 116, defense: 52, attackIntervalMs: 1600, attackMode: "melee", attackRange: 90, moveSpeed: 114, kind: "boss", color: "#8d6f59", damageElement: "fire" },
  { id: "B32", name: "风蚀盘羊", maxHp: 2650, attack: 120, defense: 54, attackIntervalMs: 1500, attackMode: "melee", attackRange: 95, moveSpeed: 116, kind: "boss", color: "#786b72", damageElement: "fire" },
  { id: "B36", name: "王庭拱背兽", maxHp: 2800, attack: 124, defense: 60, attackIntervalMs: 1600, attackMode: "melee", attackRange: 88, moveSpeed: 112, kind: "boss", color: "#75645a", damageElement: "fire" },
  { id: "B40", name: "云冠狮鹫", maxHp: 2700, attack: 128, defense: 54, attackIntervalMs: 1500, attackMode: "melee", attackRange: 96, moveSpeed: 118, kind: "boss", color: "#74897e", damageElement: "lightning" },
  { id: "B44", name: "雷羽巨枭", maxHp: 2900, attack: 132, defense: 52, attackIntervalMs: 1450, attackMode: "ranged", attackRange: 265, moveSpeed: 120, kind: "boss", color: "#596474", damageElement: "lightning" },
  { id: "B48", name: "苍雷守卫", maxHp: 3100, attack: 136, defense: 64, attackIntervalMs: 1550, attackMode: "melee", attackRange: 98, moveSpeed: 116, kind: "boss", color: "#496c6d", damageElement: "lightning" },
  { id: "B52", name: "黑水铠鳄", maxHp: 3250, attack: 142, defense: 68, attackIntervalMs: 1550, attackMode: "melee", attackRange: 98, moveSpeed: 116, kind: "boss", color: "#536c68", damageElement: "dark" },
  { id: "B56", name: "沉舟骨舵主", maxHp: 3400, attack: 146, defense: 70, attackIntervalMs: 1550, attackMode: "melee", attackRange: 100, moveSpeed: 116, kind: "boss", color: "#705c47", damageElement: "dark" },
  { id: "B60", name: "雾苇沼龙", maxHp: 3600, attack: 150, defense: 72, attackIntervalMs: 1500, attackMode: "ranged", attackRange: 250, moveSpeed: 118, kind: "boss", color: "#536c68", damageElement: "dark" },
  { id: "B64", name: "焦原楔兽", maxHp: 3800, attack: 154, defense: 76, attackIntervalMs: 1550, attackMode: "melee", attackRange: 100, moveSpeed: 118, kind: "boss", color: "#5c554b", damageElement: "fire" },
  { id: "B68", name: "黯脉壳龙", maxHp: 4000, attack: 158, defense: 78, attackIntervalMs: 1500, attackMode: "melee", attackRange: 105, moveSpeed: 118, kind: "boss", color: "#594b46", damageElement: "fire" },
  { id: "B72", name: "烬炉督军", maxHp: 4200, attack: 162, defense: 80, attackIntervalMs: 1450, attackMode: "melee", attackRange: 100, moveSpeed: 120, kind: "boss", color: "#79775b", damageElement: "fire" },
  { id: "B76", name: "盐冠礁王", maxHp: 4400, attack: 166, defense: 82, attackIntervalMs: 1500, attackMode: "melee", attackRange: 105, moveSpeed: 120, kind: "boss", color: "#7d8b83", damageElement: "lightning" },
  { id: "B80", name: "断潮壳龙", maxHp: 4600, attack: 170, defense: 84, attackIntervalMs: 1480, attackMode: "melee", attackRange: 108, moveSpeed: 120, kind: "boss", color: "#64788a", damageElement: "lightning" },
  { id: "B84", name: "潮垒酋领", maxHp: 4800, attack: 174, defense: 86, attackIntervalMs: 1450, attackMode: "melee", attackRange: 105, moveSpeed: 122, kind: "boss", color: "#6e8d91", damageElement: "lightning" },
  { id: "B88", name: "枯风角王", maxHp: 5000, attack: 178, defense: 88, attackIntervalMs: 1480, attackMode: "melee", attackRange: 110, moveSpeed: 122, kind: "boss", color: "#756875", damageElement: "dark" },
  { id: "B92", name: "旧战骨将", maxHp: 5200, attack: 182, defense: 90, attackIntervalMs: 1450, attackMode: "melee", attackRange: 108, moveSpeed: 124, kind: "boss", color: "#78695e", damageElement: "dark" },
  { id: "B96", name: "墓环石王", maxHp: 5400, attack: 186, defense: 92, attackIntervalMs: 1500, attackMode: "melee", attackRange: 112, moveSpeed: 120, kind: "boss", color: "#737376", damageElement: "dark" },
  { id: "B100", name: "裂峰牙王", maxHp: 5600, attack: 190, defense: 94, attackIntervalMs: 1500, attackMode: "melee", attackRange: 114, moveSpeed: 122, kind: "boss", color: "#7c7b73", damageElement: "physical" },
  { id: "B104", name: "晶脉酋长", maxHp: 5800, attack: 194, defense: 96, attackIntervalMs: 1450, attackMode: "melee", attackRange: 112, moveSpeed: 124, kind: "boss", color: "#6e7c68", damageElement: "physical" },
  { id: "B108", name: "天脊岩主", maxHp: 6000, attack: 198, defense: 98, attackIntervalMs: 1500, attackMode: "melee", attackRange: 116, moveSpeed: 122, kind: "boss", color: "#5b6479", damageElement: "physical" },
  { id: "B112", name: "霜垒角王", maxHp: 6200, attack: 202, defense: 100, attackIntervalMs: 1500, attackMode: "melee", attackRange: 118, moveSpeed: 122, kind: "boss", color: "#68788a", damageElement: "frost" },
  { id: "B116", name: "城脊巨蜥", maxHp: 6400, attack: 206, defense: 102, attackIntervalMs: 1500, attackMode: "melee", attackRange: 120, moveSpeed: 122, kind: "boss", color: "#62758a", damageElement: "frost" },
  { id: "B120", name: "北风关将", maxHp: 6600, attack: 210, defense: 104, attackIntervalMs: 1450, attackMode: "melee", attackRange: 118, moveSpeed: 124, kind: "boss", color: "#53667e", damageElement: "frost" },
] as const;

/** Every authored encounter enemy points at a stable data recipe. */
const COMBAT_PROFILE_BY_ENEMY_ID: Partial<Record<EnemyId, EnemyCombatProfileId>> = {
  E01: "baseline", E02: "c1-cadence-strike", E03: "c1-shell-guard", E04: "c1-elite-guard",
  E05: "baseline", E06: "c1-cadence-slow-18", E07: "c1-low-hp-hunter", E08: "c1-root-bind",
  E09: "baseline", E10: "c1-cadence-slow-22", E11: "baseline", E12: "c1-echo-shield",
  E13: "baseline", E14: "cadence-slow-15", E15: "cadence-slow-20", E16: "elite-press",
  E17: "nearest-ranged", E18: "low-hp-hunter", E19: "cadence-expose-8", E20: "elite-control",
  E21: "baseline", E22: "split-hit-30", E23: "shell-guard-18", E24: "elite-guard-22",
  E25: "baseline", E26: "opening-strike-125", E27: "cadence-break", E28: "elite-charge",
  E29: "baseline", E30: "low-hp-hunter", E31: "cadence-slow-15", E32: "elite-expose-sweep",
  E33: "baseline", E34: "split-hit-30", E35: "shell-guard-18", E36: "ally-guard-15-3",
  E37: "baseline", E38: "cadence-strike", E39: "shell-guard-18", E40: "ally-guard-12-3",
  E41: "nearest-ranged", E42: "cadence-strike-40", E43: "cadence-slow-18", E44: "elite-wind-sweep-55-slow",
  E45: "baseline", E46: "opening-strike-125", E47: "shell-shield-12", E48: "ally-haste-14",
  E49: "baseline", E50: "periodic-wound-10", E51: "shell-shield-12", E52: "elite-control-stun-only",
  E53: "baseline", E54: "periodic-wound-12", E55: "shell-guard-18", E56: "elite-sweep-55-selfguard-2",
  E57: "baseline", E58: "cadence-slow-18", E59: "ally-mend", E60: "elite-mud-sweep-20",
  E61: "baseline", E62: "periodic-wound-12", E63: "death-burst-35", E64: "elite-scorched-sweep-20",
  E65: "nearest-ranged", E66: "opening-strike-130", E67: "cadence-slow-18", E68: "elite-sweep-55",
  E69: "baseline", E70: "low-hp-hunter", E71: "split-burn-30", E72: "elite-sweep-55-selfguard",
  E73: "baseline", E74: "opening-strike-130", E75: "split-hit-30", E76: "ally-shield-10",
  E77: "baseline", E78: "low-hp-hunter", E79: "cadence-slow-18", E80: "elite-tide-sweep-55-slow",
  E81: "baseline", E82: "cadence-strike-40", E83: "split-hit-35", E84: "ally-shield-low-10",
  E85: "baseline", E86: "opening-strike-130", E87: "cadence-expose-10", E88: "ally-guard-15",
  E89: "baseline", E90: "periodic-wound-12", E91: "shell-guard-20", E92: "elite-summon",
  E93: "baseline", E94: "low-hp-hunter", E95: "self-shield-12", E96: "elite-sweep-60",
  E97: "baseline", E98: "opening-strike-130", E99: "cadence-slow-18", E100: "ally-shield-low-12",
  E101: "baseline", E102: "low-hp-hunter", E103: "cadence-break", E104: "elite-sweep-60-break",
  E105: "baseline", E106: "opening-strike-130", E107: "cadence-slow-20", E108: "elite-sweep-65",
  E109: "baseline", E110: "opening-strike-130", E111: "cadence-break", E112: "ally-guard-15",
  E113: "baseline", E114: "cadence-strike-40", E115: "low-hp-hunter", E116: "elite-sweep-65-slow",
  E117: "baseline", E118: "cadence-strike-40", E119: "split-hit-35", E120: "elite-control-shield",
  B01: "default-boss", B02: "default-boss", B03: "default-boss", B05: "default-boss", B06: "default-boss", B07: "default-boss",
  B04: "c1-sail-sweep", B08: "c1-stone-tail", B12: "c1-wing-pressure",
  B16: "snowhill-slam", B20: "frost-pounce", B24: "aurora-wingfall",
  B28: "b28-dune-pressure", B32: "b32-horn-combo", B36: "b36-court-quake",
  B40: "b40-cloud-quake", B44: "b44-thunder-chain", B48: "b48-azure-dive",
  B52: "b52-mudwave-crush", B56: "b56-helmblade-sweep", B60: "b60-mist-tide",
  B64: "b64-scorched-crush", B68: "b68-vein-quake", B72: "b72-furnace-hammer",
  B76: "b76-saltcrown-crush", B80: "b80-tidebreak-quake", B84: "b84-tidewall-hammer",
  B88: "b88-witherhorn-sweep", B92: "b92-shieldline-sweep", B96: "b96-ringarm-crush",
  B100: "b100-ridge-charge", B104: "b104-crystal-hammer", B108: "b108-highridge-crush",
  B112: "b112-frostwall-charge", B116: "b116-rampart-crush", B120: "b120-glaive-sweep",
};

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = RAW_ENEMY_DEFINITIONS.map((enemy) => ({
  ...enemy,
  combatProfileId: COMBAT_PROFILE_BY_ENEMY_ID[enemy.id] ?? enemy.combatProfileId,
}));

/** Elite/boss follow the chapter school; theme trash can carry the chapter element. */
export function resolveEnemyDamageElement(enemyId: EnemyId, stage: number): DamageElement {
  const definition = ENEMY_BY_ID[enemyId];
  if (!definition) return "physical";
  const theme = chapterThemeElement(stageToChapter(stage));
  if (definition.kind === "elite" || definition.kind === "boss") return theme;
  if ((enemyId === "E02" || enemyId === "E07") && theme !== "physical") return theme;
  return definition.damageElement;
}

export const ENEMY_BY_ID = Object.fromEntries(
  ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
) as Record<EnemyId, EnemyDefinition>;

export const NORMAL_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "normal").map((e) => e.id);
export const ELITE_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "elite").map((e) => e.id);
export const BOSS_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "boss").map((e) => e.id);

const CHAPTER_ONE_REGION_BOSSES = ["B04", "B08", "B12"] as const satisfies readonly EnemyId[];
const CHAPTER_TWO_REGION_BOSSES = ["B16", "B20", "B24"] as const satisfies readonly EnemyId[];
const CHAPTER_THREE_REGION_BOSSES = ["B28", "B32", "B36"] as const satisfies readonly EnemyId[];
const CHAPTER_FOUR_REGION_BOSSES = ["B40", "B44", "B48"] as const satisfies readonly EnemyId[];
const CHAPTER_FIVE_REGION_BOSSES = ["B52", "B56", "B60"] as const satisfies readonly EnemyId[];
const CHAPTER_SIX_REGION_BOSSES = ["B64", "B68", "B72"] as const satisfies readonly EnemyId[];
const CHAPTER_SEVEN_REGION_BOSSES = ["B76", "B80", "B84"] as const satisfies readonly EnemyId[];
const CHAPTER_EIGHT_REGION_BOSSES = ["B88", "B92", "B96"] as const satisfies readonly EnemyId[];
const CHAPTER_NINE_REGION_BOSSES = ["B100", "B104", "B108"] as const satisfies readonly EnemyId[];
const CHAPTER_TEN_REGION_BOSSES = ["B112", "B116", "B120"] as const satisfies readonly EnemyId[];
const CHAPTER_BOSS_ROSTERS: Record<ChapterId, readonly [EnemyId, EnemyId, EnemyId]> = {
  1: CHAPTER_ONE_REGION_BOSSES,
  2: CHAPTER_TWO_REGION_BOSSES,
  3: CHAPTER_THREE_REGION_BOSSES,
  4: CHAPTER_FOUR_REGION_BOSSES,
  5: CHAPTER_FIVE_REGION_BOSSES,
  6: CHAPTER_SIX_REGION_BOSSES,
  7: CHAPTER_SEVEN_REGION_BOSSES,
  8: CHAPTER_EIGHT_REGION_BOSSES,
  9: CHAPTER_NINE_REGION_BOSSES,
  10: CHAPTER_TEN_REGION_BOSSES,
};
const FALLBACK_BOSS_CYCLE = [
  "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08",
] as const satisfies readonly EnemyId[];

/**
 * Rotate all three chapter bosses through ordinary stages while keeping each
 * four-stage region's own boss as its finale.
 */
export function bossIdForStage(stage: number): EnemyId {
  const safeStage = Math.max(1, Math.floor(stage));
  if (safeStage <= STAGES_PER_CHAPTER * 10) {
    const chapter = stageToChapter(safeStage);
    const bosses = CHAPTER_BOSS_ROSTERS[chapter];
    const localStage = (safeStage - 1) % STAGES_PER_CHAPTER;
    const region = Math.floor(localStage / 4);
    const stageInRegion = localStage % 4;
    const bossIndex = stageInRegion === 3
      ? region
      : (region + stageInRegion) % bosses.length;
    return bosses[bossIndex]!;
  }
  return FALLBACK_BOSS_CYCLE[(safeStage - 1) % FALLBACK_BOSS_CYCLE.length]!;
}

export function bossNameForStage(stage: number): string {
  return ENEMY_BY_ID[bossIdForStage(stage)]?.name ?? "区域首领";
}
