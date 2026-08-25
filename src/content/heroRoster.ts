/**
 * Canonical roster: H01–H80 playable heroes.
 * artKey → docs/art runtime basename (hero_<key>_runtime_v01.webp).
 * skillPattern → combat behavior template (H01–H08 skill kits).
 */
import type { DamageElement, HeroId, TargetStrategy } from "../simulation/types";
import { HERO_DAMAGE_IDENTITIES } from "./heroDamageIdentities";

export type SkillPatternId = "H01" | "H02" | "H03" | "H04" | "H05" | "H06" | "H07" | "H08";

export interface HeroRosterEntry {
  id: HeroId;
  role: string;
  color: string;
  maxHp: number;
  attack: number;
  defense: number;
  attackIntervalMs: number;
  attackRange: number;
  moveSpeed: number;
  artKey: string;
  skillPattern: SkillPatternId;
  targetStrategy: TargetStrategy;
  tagline: string;
  activeName: string;
  passiveName: string;
  ultimateName: string;
}

/** H01–H08 use confirmed art hashes; H09–H80 map remaining class runtimes by fantasy. */
export const HERO_ROSTER: readonly HeroRosterEntry[] = [
  { id: "H01", role: "盾卫", color: "#6b8b69", maxHp: 1500, attack: 90, defense: 65, attackIntervalMs: 1400, attackRange: 65, moveSpeed: 117, artKey: "wa_pro_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "以坚盾守住队伍的第一道防线", activeName: "盾角冲击", passiveName: "坚守", ultimateName: "壁垒怒吼" },
  { id: "H02", role: "狂战", color: "#cf7158", maxHp: 1150, attack: 125, defense: 35, attackIntervalMs: 900, attackRange: 60, moveSpeed: 130, artKey: "wa_fur_m", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "受伤越重，战意越旺", activeName: "三段裂击", passiveName: "血性", ultimateName: "血战旋风" },
  { id: "H03", role: "火法", color: "#d97c55", maxHp: 780, attack: 155, defense: 18, attackIntervalMs: 1450, attackRange: 270, moveSpeed: 98, artKey: "ma_fir_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "爆燃火球席卷密集敌群", activeName: "爆燃火球", passiveName: "余烬", ultimateName: "陨星" },
  { id: "H04", role: "牧师", color: "#e2b958", maxHp: 900, attack: 70, defense: 25, attackIntervalMs: 1600, attackRange: 250, moveSpeed: 94, artKey: "pr_hol_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "晨光治愈伤员并留下护盾", activeName: "晨光治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H05", role: "游侠", color: "#6f9c61", maxHp: 850, attack: 120, defense: 22, attackIntervalMs: 1000, attackRange: 290, moveSpeed: 104, artKey: "hu_mar_m", skillPattern: "H05", targetStrategy: "nearestEnemy", tagline: "穿林箭贯穿敌军阵线", activeName: "穿林箭", passiveName: "连射节奏", ultimateName: "箭雨" },
  { id: "H06", role: "刺客", color: "#67607d", maxHp: 820, attack: 145, defense: 25, attackIntervalMs: 850, attackRange: 55, moveSpeed: 156, artKey: "ro_ass_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "锁定残血目标完成处决", activeName: "影袭处决", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H07", role: "冰法", color: "#72a7c8", maxHp: 800, attack: 130, defense: 20, attackIntervalMs: 1300, attackRange: 250, moveSpeed: 99, artKey: "ma_fro_f", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "霜环压制整片战区", activeName: "霜环", passiveName: "寒意", ultimateName: "暴风雪" },
  { id: "H08", role: "萨满", color: "#a171a4", maxHp: 1050, attack: 105, defense: 38, attackIntervalMs: 1200, attackRange: 150, moveSpeed: 111, artKey: "sh_ele_m", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "雷链与战鼓同时鼓舞全队", activeName: "跃动雷链", passiveName: "战鼓图腾", ultimateName: "风暴图腾" },

  { id: "H09", role: "血骑", color: "#8b3a3a", maxHp: 1400, attack: 100, defense: 55, attackIntervalMs: 1300, attackRange: 70, moveSpeed: 110, artKey: "dk_bld_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "以鲜血换取不灭的前线", activeName: "血斧斩", passiveName: "血契", ultimateName: "血魔护盾" },
  { id: "H10", role: "霜骑", color: "#6a8fa8", maxHp: 1350, attack: 105, defense: 50, attackIntervalMs: 1250, attackRange: 70, moveSpeed: 112, artKey: "dk_fro_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "冰封脚步，寸土不让", activeName: "霜刃冲击", passiveName: "冰甲", ultimateName: "永冬壁垒" },
  { id: "H11", role: "邪骑", color: "#5a6b4a", maxHp: 1300, attack: 110, defense: 48, attackIntervalMs: 1250, attackRange: 70, moveSpeed: 108, artKey: "dk_uho_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "瘟疫护体，拖垮敌军", activeName: "邪触", passiveName: "腐甲", ultimateName: "亡者壁垒" },
  { id: "H12", role: "浩劫", color: "#4a3d66", maxHp: 900, attack: 140, defense: 28, attackIntervalMs: 880, attackRange: 60, moveSpeed: 150, artKey: "dh_hav_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "双刃切入残阵", activeName: "浩劫斩", passiveName: "猎影", ultimateName: "刃舞" },
  { id: "H13", role: "复仇", color: "#7a3d4a", maxHp: 1450, attack: 95, defense: 60, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 115, artKey: "dh_ven_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "以守为攻的恶魔之盾", activeName: "复仇斩", passiveName: "魔甲", ultimateName: "恶魔壁垒" },
  { id: "H14", role: "噬灭", color: "#3d3a6b", maxHp: 820, attack: 150, defense: 22, attackIntervalMs: 1400, attackRange: 260, moveSpeed: 100, artKey: "dh_dev_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "虚空火焰吞噬阵列", activeName: "虚空焰", passiveName: "噬烬", ultimateName: "湮灭星" },
  { id: "H15", role: "暗牧", color: "#5c3d6e", maxHp: 860, attack: 135, defense: 20, attackIntervalMs: 1350, attackRange: 255, moveSpeed: 97, artKey: "pr_sha_f", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "暗影低语冻结意志", activeName: "暗言术", passiveName: "虚空寒", ultimateName: "暗影风暴" },
  { id: "H16", role: "兵器", color: "#8a6a4a", maxHp: 1200, attack: 130, defense: 40, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_arm_f", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "兵器专精的连斩手", activeName: "破甲连斩", passiveName: "战意", ultimateName: "旋风斩" },
  { id: "H17", role: "圣盾", color: "#4a6a9a", maxHp: 1550, attack: 88, defense: 70, attackIntervalMs: 1450, attackRange: 65, moveSpeed: 105, artKey: "pa_pro_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "圣光铸成的移动堡垒", activeName: "圣盾猛击", passiveName: "虔诚", ultimateName: "圣光壁垒" },
  { id: "H18", role: "愈德", color: "#5a9a6a", maxHp: 920, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 245, moveSpeed: 96, artKey: "dr_res_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "芽叶治愈濒危队友", activeName: "回春术", passiveName: "萌芽", ultimateName: "林荫圣域" },
  { id: "H19", role: "唤灭", color: "#b04a4a", maxHp: 800, attack: 148, defense: 20, attackIntervalMs: 1420, attackRange: 265, moveSpeed: 99, artKey: "ev_dev_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "龙焰轰碎敌群", activeName: "龙息弹", passiveName: "余焰", ultimateName: "赤炎陨落" },
  { id: "H20", role: "平衡", color: "#4a7a8a", maxHp: 850, attack: 128, defense: 24, attackIntervalMs: 1380, attackRange: 255, moveSpeed: 100, artKey: "dr_bal_f", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "日月之力压制战场", activeName: "星涌", passiveName: "月晕", ultimateName: "超新星" },
  { id: "H21", role: "惩戒", color: "#b08a3a", maxHp: 1100, attack: 132, defense: 38, attackIntervalMs: 1000, attackRange: 70, moveSpeed: 122, artKey: "pa_ret_f", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "圣光战锤连连砸下", activeName: "惩戒锤", passiveName: "热诚", ultimateName: "圣锤风暴" },
  { id: "H22", role: "驭兽", color: "#5a7a4a", maxHp: 880, attack: 118, defense: 26, attackIntervalMs: 1050, attackRange: 280, moveSpeed: 108, artKey: "hu_bea_m", skillPattern: "H05", targetStrategy: "nearestEnemy", tagline: "号角与箭矢协同打击", activeName: "驯兽箭", passiveName: "猎序", ultimateName: "群兽齐射" },
  { id: "H23", role: "生存", color: "#6a7a55", maxHp: 900, attack: 122, defense: 30, attackIntervalMs: 980, attackRange: 75, moveSpeed: 128, artKey: "hu_sur_m", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "陷阱与矛尖的近战猎手", activeName: "猎矛突刺", passiveName: "求生", ultimateName: "狂猎旋风" },
  { id: "H24", role: "痛苦", color: "#6a4a7a", maxHp: 790, attack: 142, defense: 18, attackIntervalMs: 1480, attackRange: 260, moveSpeed: 96, artKey: "wl_aff_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "咒术在敌群间蔓延", activeName: "痛楚爆发", passiveName: "蚀骨", ultimateName: "灾厄星雨" },
  { id: "H25", role: "踏风", color: "#3a8a7a", maxHp: 950, attack: 138, defense: 32, attackIntervalMs: 860, attackRange: 55, moveSpeed: 160, artKey: "mo_win_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "疾风拳打穿破绽", activeName: "风拳", passiveName: "追残", ultimateName: "千拳乱舞" },
  { id: "H26", role: "织雾", color: "#7ab0a0", maxHp: 910, attack: 72, defense: 26, attackIntervalMs: 1580, attackRange: 250, moveSpeed: 95, artKey: "mo_mis_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "雾气托起队友生命", activeName: "复苏雾", passiveName: "润泽", ultimateName: "甘霖领域" },
  { id: "H27", role: "狂徒", color: "#3a4a6a", maxHp: 860, attack: 136, defense: 28, attackIntervalMs: 900, attackRange: 60, moveSpeed: 148, artKey: "ro_out_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "刀枪并进的街头战法", activeName: "快刀火枪", passiveName: "趁乱", ultimateName: "乱舞齐射" },
  { id: "H28", role: "增强", color: "#6a5a9a", maxHp: 1080, attack: 120, defense: 36, attackIntervalMs: 1100, attackRange: 80, moveSpeed: 120, artKey: "sh_enh_f", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "近战雷击带动全队节奏", activeName: "风暴打击", passiveName: "雷鼓", ultimateName: "闪电风暴" },
  { id: "H29", role: "奥法", color: "#6a5ab0", maxHp: 770, attack: 152, defense: 17, attackIntervalMs: 1460, attackRange: 275, moveSpeed: 97, artKey: "ma_arc_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "奥术飞弹连锁轰击", activeName: "奥术弹幕", passiveName: "奥能残响", ultimateName: "奥术轰炸" },
  { id: "H30", role: "增辉", color: "#8a6a3a", maxHp: 1000, attack: 125, defense: 35, attackIntervalMs: 1150, attackRange: 70, moveSpeed: 118, artKey: "ev_aug_m", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "晶拳轰鸣鼓舞队友", activeName: "晶拳连击", passiveName: "增幅鼓点", ultimateName: "辉光爆发" },
  { id: "H31", role: "恶魔术", color: "#5a4a8a", maxHp: 830, attack: 140, defense: 22, attackIntervalMs: 1320, attackRange: 250, moveSpeed: 102, artKey: "wl_dem_m", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "恶魔火在敌人间跳跃", activeName: "魔火链", passiveName: "魔鼓", ultimateName: "恶魔风暴" },
  { id: "H32", role: "毁灭", color: "#7a3a5a", maxHp: 780, attack: 158, defense: 16, attackIntervalMs: 1500, attackRange: 270, moveSpeed: 95, artKey: "wl_des_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "混乱之箭点燃一切", activeName: "混乱箭", passiveName: "余烬咒", ultimateName: "末日陨星" },
  { id: "H33", role: "野性", color: "#6a8a3a", maxHp: 980, attack: 142, defense: 30, attackIntervalMs: 870, attackRange: 55, moveSpeed: 155, artKey: "dr_fer_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "利爪撕开最低血量目标", activeName: "撕咬", passiveName: "猎杀本能", ultimateName: "狂爪乱舞" },
  { id: "H34", role: "敏锐", color: "#4a3a5a", maxHp: 840, attack: 148, defense: 24, attackIntervalMs: 840, attackRange: 55, moveSpeed: 158, artKey: "ro_sub_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "阴影中完成致命一击", activeName: "暗刺", passiveName: "伏杀", ultimateName: "影舞乱舞" },
  { id: "H35", role: "铁卫", color: "#7a8a6a", maxHp: 1480, attack: 92, defense: 68, attackIntervalMs: 1380, attackRange: 65, moveSpeed: 108, artKey: "wa_pro_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "铁壁般的前线盾卫", activeName: "盾墙猛击", passiveName: "铁壁", ultimateName: "女武神壁垒" },
  { id: "H36", role: "潮汐", color: "#4a9aaa", maxHp: 930, attack: 78, defense: 30, attackIntervalMs: 1520, attackRange: 245, moveSpeed: 98, artKey: "sh_res_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "潮汐托起伤员", activeName: "治疗波", passiveName: "潮息", ultimateName: "潮汐圣域" },
  { id: "H37", role: "戒律", color: "#9a8ab0", maxHp: 890, attack: 80, defense: 27, attackIntervalMs: 1560, attackRange: 250, moveSpeed: 96, artKey: "pr_dis_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "戒律之盾护佑队友", activeName: "真言术：盾", passiveName: "戒律余光", ultimateName: "戒律圣域" },
  { id: "H38", role: "咒术", color: "#5a3a6a", maxHp: 800, attack: 145, defense: 19, attackIntervalMs: 1440, attackRange: 255, moveSpeed: 98, artKey: "wl_aff_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "诅咒在敌群中连锁", activeName: "诅咒爆发", passiveName: "咒烬", ultimateName: "灾祸星" },
  { id: "H39", role: "炎法", color: "#c06a3a", maxHp: 790, attack: 156, defense: 18, attackIntervalMs: 1470, attackRange: 270, moveSpeed: 97, artKey: "ma_fir_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "烈焰轰击席卷敌阵", activeName: "炎爆术", passiveName: "炽余", ultimateName: "炎陨" },
  { id: "H40", role: "圣锤", color: "#a08040", maxHp: 1120, attack: 134, defense: 40, attackIntervalMs: 980, attackRange: 70, moveSpeed: 124, artKey: "pa_ret_m", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "圣光战锤的连段压制", activeName: "圣锤连击", passiveName: "热血", ultimateName: "圣光旋风" },
  { id: "H41", role: "鲜血", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_bld_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "死亡骑士·鲜血的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H42", role: "冰霜", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_fro_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "死亡骑士·冰霜的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H43", role: "邪恶", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_uho_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "死亡骑士·邪恶的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H44", role: "浩劫", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "dh_hav_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "恶魔猎手·浩劫的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H45", role: "复仇", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dh_ven_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "恶魔猎手·复仇的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H46", role: "噬灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "dh_dev_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "恶魔猎手·噬灭的战场专精", activeName: "爆裂", passiveName: "余烬", ultimateName: "陨落" },
  { id: "H47", role: "平衡", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "dr_bal_m", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "德鲁伊·平衡的战场专精", activeName: "霜环", passiveName: "寒意", ultimateName: "暴风雪" },
  { id: "H48", role: "野性", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "dr_fer_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "德鲁伊·野性的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H49", role: "守护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dr_gua_m", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "德鲁伊·守护的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H50", role: "守护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dr_gua_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "德鲁伊·守护的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H51", role: "恢复", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "dr_res_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "德鲁伊·恢复的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H52", role: "湮灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "ev_dev_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "唤魔师·湮灭的战场专精", activeName: "爆裂", passiveName: "余烬", ultimateName: "陨落" },
  { id: "H53", role: "恩护", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "ev_pre_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "唤魔师·恩护的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H54", role: "恩护", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "ev_pre_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "唤魔师·恩护的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H55", role: "增辉", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "ev_aug_f", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "唤魔师·增辉的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H56", role: "野兽控制", color: "#6f9c61", maxHp: 870, attack: 120, defense: 24, attackIntervalMs: 1020, attackRange: 285, moveSpeed: 106, artKey: "hu_bea_f", skillPattern: "H05", targetStrategy: "nearestEnemy", tagline: "猎人·野兽控制的战场专精", activeName: "穿林", passiveName: "连射", ultimateName: "箭雨" },
  { id: "H57", role: "射击", color: "#6f9c61", maxHp: 870, attack: 120, defense: 24, attackIntervalMs: 1020, attackRange: 285, moveSpeed: 106, artKey: "hu_mar_f", skillPattern: "H05", targetStrategy: "nearestEnemy", tagline: "猎人·射击的战场专精", activeName: "穿林", passiveName: "连射", ultimateName: "箭雨" },
  { id: "H58", role: "生存", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "hu_sur_f", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "猎人·生存的战场专精", activeName: "连斩", passiveName: "血性", ultimateName: "旋风" },
  { id: "H59", role: "奥术", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "ma_arc_f", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "法师·奥术的战场专精", activeName: "爆裂", passiveName: "余烬", ultimateName: "陨落" },
  { id: "H60", role: "冰霜", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "ma_fro_m", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "法师·冰霜的战场专精", activeName: "霜环", passiveName: "寒意", ultimateName: "暴风雪" },
  { id: "H61", role: "酒仙", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "mo_bre_m", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "武僧·酒仙的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H62", role: "酒仙", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "mo_bre_f", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "武僧·酒仙的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H63", role: "织雾", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "mo_mis_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "武僧·织雾的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H64", role: "踏风", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "mo_win_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "武僧·踏风的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H65", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pa_hol_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "圣骑士·神圣的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H66", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pa_hol_f", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "圣骑士·神圣的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H67", role: "防护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "pa_pro_f", skillPattern: "H01", targetStrategy: "nearestEnemy", tagline: "圣骑士·防护的战场专精", activeName: "盾击", passiveName: "坚守", ultimateName: "壁垒" },
  { id: "H68", role: "戒律", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pr_dis_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "牧师·戒律的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H69", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pr_hol_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "牧师·神圣的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H70", role: "暗影", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "pr_sha_m", skillPattern: "H07", targetStrategy: "nearestEnemy", tagline: "牧师·暗影的战场专精", activeName: "霜环", passiveName: "寒意", ultimateName: "暴风雪" },
  { id: "H71", role: "奇袭", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_ass_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "潜行者·奇袭的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H72", role: "狂徒", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_out_f", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "潜行者·狂徒的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H73", role: "敏锐", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_sub_m", skillPattern: "H06", targetStrategy: "lowestHpEnemy", tagline: "潜行者·敏锐的战场专精", activeName: "影袭", passiveName: "猎残", ultimateName: "影舞" },
  { id: "H74", role: "元素", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "sh_ele_f", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "萨满祭司·元素的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H75", role: "增强", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "sh_enh_m", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "萨满祭司·增强的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H76", role: "恢复", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "sh_res_m", skillPattern: "H04", targetStrategy: "nearestEnemy", tagline: "萨满祭司·恢复的战场专精", activeName: "治愈", passiveName: "余辉", ultimateName: "圣域" },
  { id: "H77", role: "恶魔学识", color: "#a171a4", maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, artKey: "wl_dem_f", skillPattern: "H08", targetStrategy: "nearestEnemy", tagline: "术士·恶魔学识的战场专精", activeName: "雷链", passiveName: "战鼓", ultimateName: "风暴" },
  { id: "H78", role: "毁灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "wl_des_m", skillPattern: "H03", targetStrategy: "nearestEnemy", tagline: "术士·毁灭的战场专精", activeName: "爆裂", passiveName: "余烬", ultimateName: "陨落" },
  { id: "H79", role: "武器", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_arm_m", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "战士·武器的战场专精", activeName: "连斩", passiveName: "血性", ultimateName: "旋风" },
  { id: "H80", role: "狂怒", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_fur_f", skillPattern: "H02", targetStrategy: "nearestEnemy", tagline: "战士·狂怒的战场专精", activeName: "连斩", passiveName: "血性", ultimateName: "旋风" },
] as const;

/** Classic H01–H08 skill ids kept for save/UI compatibility; others derive from hero id. */
export const PATTERN_CLASSIC_SKILL_IDS = {
  H01: { active: "shield-horn", passive: "hold-fast", ultimate: "bulwark-shout", awakening: "unyielding" },
  H02: { active: "triple-rend", passive: "blood-spirit", ultimate: "blood-cyclone", awakening: "frenzy" },
  H03: { active: "burst-fireball", passive: "ember", ultimate: "meteor", awakening: "wildfire" },
  H04: { active: "morning-heal", passive: "afterglow", ultimate: "sanctuary", awakening: "morning-prayer" },
  H05: { active: "forest-arrow", passive: "rapid-rhythm", ultimate: "arrow-rain", awakening: "hunter-mark" },
  H06: { active: "shadow-execute", passive: "hunt-wounded", ultimate: "shadow-flurry", awakening: "kill-hunt" },
  H07: { active: "frost-ring", passive: "chill", ultimate: "blizzard", awakening: "permafrost" },
  H08: { active: "chain-lightning", passive: "war-drum", ultimate: "thunderstorm", awakening: "storm-drum" },
} as const;

export const PATTERN_ACTIVE_DESC: Record<SkillPatternId, string> = {
  H01: "造成185%伤害并眩晕1.2秒",
  H02: "连续造成3次75%伤害",
  H03: "主目标200%伤害，邻近敌人95%",
  H04: "治疗生命比例最低的队友（280%攻击或14%最大生命）",
  H05: "贯穿两个目标，造成220%与110%伤害",
  H06: "突进残血目标：250%伤害，低血量时提高到340%",
  H07: "范围160%伤害并减速40%持续3秒",
  H08: "在最多3名敌人间跳跃（125%起，每跳衰减）",
};

export const PATTERN_PASSIVE_DESC: Record<SkillPatternId, string> = {
  H01: "生命低于40%时减伤15%",
  H02: "生命低于45%时攻速提高25%",
  H03: "技能命中后强化下一次普攻35%",
  H04: "溢出治疗转化为护盾",
  H05: "每4次普攻获得短暂攻速",
  H06: "优先攻击生命比例最低的敌人",
  H07: "被减速敌人额外降低攻速",
  H08: "施放技能后全队获得攻速",
};

export const PATTERN_ULTIMATE_DESC: Record<SkillPatternId, string> = {
  H01: "自身获得18%最大生命护盾，全队减伤12%持续4秒，并对最近敌人造成220%伤害",
  H02: "自身周围连续造成3次110%伤害",
  H03: "对大范围敌人造成300%伤害",
  H04: "治疗全队（220%攻击或10%最大生命，取高）",
  H05: "对前方最多4名敌人各造成140%伤害",
  H06: "对生命比例最低的敌人连续造成4次90%伤害",
  H07: "大范围造成240%伤害并减速45%持续4秒",
  H08: "在最多5名敌人间跳跃，末跳小幅眩晕",
};

export const PATTERN_AWAKENING_DESC: Record<SkillPatternId, string> = {
  H01: "格挡率 +8%；坚守在生命 50% 时触发",
  H02: "低血时吸血 6%；血性攻速提高到 40%",
  H03: "溅射范围扩大；余烬最多保留两层",
  H04: "治疗强度 +10%；溢出护盾上限提高",
  H05: "暴击率 +5%；可贯穿第三个目标",
  H06: "对残血目标伤害 +12%；击杀后短暂加速",
  H07: "对被减速目标伤害 +10%；减速时有几率眩晕",
  H08: "全队常驻攻速 +6%",
};

const identityById = Object.fromEntries(HERO_DAMAGE_IDENTITIES.map((row) => [row.id, row]));

export function skillIdsForHero(entry: HeroRosterEntry) {
  if (entry.id === entry.skillPattern) {
    return PATTERN_CLASSIC_SKILL_IDS[entry.skillPattern];
  }
  const prefix = entry.id.toLowerCase();
  return {
    active: `${prefix}-active`,
    passive: `${prefix}-passive`,
    ultimate: `${prefix}-ultimate`,
    awakening: `${prefix}-awakening`,
  };
}

export function buildHeroDefinitions() {
  return HERO_ROSTER.map((entry) => {
    const identity = identityById[entry.id];
    if (!identity) throw new Error(`Missing damage identity for ${entry.id}`);
    const skills = skillIdsForHero(entry);
    return {
      id: entry.id,
      name: identity.name,
      role: entry.role,
      color: entry.color,
      maxHp: entry.maxHp,
      attack: entry.attack,
      defense: entry.defense,
      attackIntervalMs: entry.attackIntervalMs,
      attackRange: entry.attackRange,
      moveSpeed: entry.moveSpeed,
      damageSchool: identity.damageSchool,
      damageElement: identity.damageElement as DamageElement,
      activeSkillId: skills.active,
      passiveSkillId: skills.passive,
      targetStrategy: entry.targetStrategy,
      tagline: entry.tagline,
      skillPattern: entry.skillPattern,
      artKey: entry.artKey,
    };
  });
}

export const HERO_IDS = HERO_ROSTER.map(({ id }) => id);

export function heroPublicArtPath(id: HeroId): string {
  return `/assets/characters/hero-h${id.slice(1).toLowerCase()}.webp`;
}

export function skillPatternOf(heroId: HeroId): SkillPatternId {
  const entry = HERO_ROSTER.find((row) => row.id === heroId);
  if (!entry) throw new Error(`Unknown hero ${heroId}`);
  return entry.skillPattern;
}
