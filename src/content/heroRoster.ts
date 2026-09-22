/**
 * Canonical roster: H01–H80 playable heroes.
 * artKey → docs/art runtime basename (hero_<key>_runtime_v01.webp).
 * artKey also identifies the hero's fixed class and specialization.
 */
import type { DamageElement, HeroId, TargetStrategy } from "../simulation/types";
import { HERO_DAMAGE_IDENTITIES } from "./heroDamageIdentities";
import {
  expeditionRoleForSpecialization,
  specializationForArtKey,
  type SpecId,
} from "./specializations";

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
  targetStrategy: TargetStrategy;
  tagline: string;
}

/** H01–H08 use confirmed art hashes; H09–H80 map remaining class runtimes by fantasy. */
export const HERO_ROSTER: readonly HeroRosterEntry[] = [
  { id: "H01", role: "盾卫", color: "#6b8b69", maxHp: 1500, attack: 90, defense: 65, attackIntervalMs: 1400, attackRange: 65, moveSpeed: 117, artKey: "wa_pro_m", targetStrategy: "nearestEnemy", tagline: "以坚盾守住队伍的第一道防线" },
  { id: "H02", role: "狂战", color: "#cf7158", maxHp: 1150, attack: 125, defense: 35, attackIntervalMs: 900, attackRange: 60, moveSpeed: 130, artKey: "wa_fur_m", targetStrategy: "nearestEnemy", tagline: "受伤越重，战意越旺" },
  { id: "H03", role: "火法", color: "#d97c55", maxHp: 780, attack: 155, defense: 18, attackIntervalMs: 1450, attackRange: 270, moveSpeed: 98, artKey: "ma_fir_f", targetStrategy: "nearestEnemy", tagline: "爆燃火球席卷密集敌群" },
  { id: "H04", role: "牧师", color: "#e2b958", maxHp: 900, attack: 70, defense: 25, attackIntervalMs: 1600, attackRange: 250, moveSpeed: 94, artKey: "pr_hol_f", targetStrategy: "nearestEnemy", tagline: "晨光治愈伤员并留下护盾" },
  { id: "H05", role: "游侠", color: "#6f9c61", maxHp: 850, attack: 120, defense: 22, attackIntervalMs: 1000, attackRange: 290, moveSpeed: 104, artKey: "hu_mar_m", targetStrategy: "nearestEnemy", tagline: "穿林箭贯穿敌军阵线" },
  { id: "H06", role: "刺客", color: "#67607d", maxHp: 820, attack: 145, defense: 25, attackIntervalMs: 850, attackRange: 55, moveSpeed: 156, artKey: "ro_ass_m", targetStrategy: "lowestHpEnemy", tagline: "锁定残血目标完成处决" },
  { id: "H07", role: "冰法", color: "#72a7c8", maxHp: 800, attack: 130, defense: 20, attackIntervalMs: 1300, attackRange: 250, moveSpeed: 99, artKey: "ma_fro_f", targetStrategy: "nearestEnemy", tagline: "霜环压制整片战区" },
  { id: "H08", role: "萨满", color: "#a171a4", maxHp: 1050, attack: 105, defense: 38, attackIntervalMs: 1200, attackRange: 150, moveSpeed: 111, artKey: "sh_ele_m", targetStrategy: "nearestEnemy", tagline: "雷链与战鼓同时鼓舞全队" },

  { id: "H09", role: "血骑", color: "#8b3a3a", maxHp: 1400, attack: 100, defense: 55, attackIntervalMs: 1300, attackRange: 70, moveSpeed: 110, artKey: "dk_bld_m", targetStrategy: "nearestEnemy", tagline: "以鲜血换取不灭的前线" },
  { id: "H10", role: "霜骑", color: "#6a8fa8", maxHp: 1350, attack: 105, defense: 50, attackIntervalMs: 1250, attackRange: 70, moveSpeed: 112, artKey: "dk_fro_f", targetStrategy: "nearestEnemy", tagline: "冰封脚步，寸土不让" },
  { id: "H11", role: "邪骑", color: "#5a6b4a", maxHp: 1300, attack: 110, defense: 48, attackIntervalMs: 1250, attackRange: 70, moveSpeed: 108, artKey: "dk_uho_f", targetStrategy: "nearestEnemy", tagline: "瘟疫护体，拖垮敌军" },
  { id: "H12", role: "浩劫", color: "#4a3d66", maxHp: 900, attack: 140, defense: 28, attackIntervalMs: 880, attackRange: 60, moveSpeed: 150, artKey: "dh_hav_m", targetStrategy: "lowestHpEnemy", tagline: "双刃切入残阵" },
  { id: "H13", role: "复仇", color: "#7a3d4a", maxHp: 1450, attack: 95, defense: 60, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 115, artKey: "dh_ven_f", targetStrategy: "nearestEnemy", tagline: "以守为攻的恶魔之盾" },
  { id: "H14", role: "噬灭", color: "#3d3a6b", maxHp: 820, attack: 150, defense: 22, attackIntervalMs: 1400, attackRange: 260, moveSpeed: 100, artKey: "dh_dev_f", targetStrategy: "nearestEnemy", tagline: "虚空火焰吞噬阵列" },
  { id: "H15", role: "暗牧", color: "#5c3d6e", maxHp: 860, attack: 135, defense: 20, attackIntervalMs: 1350, attackRange: 255, moveSpeed: 97, artKey: "pr_sha_f", targetStrategy: "nearestEnemy", tagline: "暗影低语冻结意志" },
  { id: "H16", role: "兵器", color: "#8a6a4a", maxHp: 1200, attack: 130, defense: 40, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_arm_f", targetStrategy: "nearestEnemy", tagline: "兵器专精的连斩手" },
  { id: "H17", role: "圣盾", color: "#4a6a9a", maxHp: 1550, attack: 88, defense: 70, attackIntervalMs: 1450, attackRange: 65, moveSpeed: 105, artKey: "pa_pro_m", targetStrategy: "nearestEnemy", tagline: "圣光铸成的移动堡垒" },
  { id: "H18", role: "愈德", color: "#5a9a6a", maxHp: 920, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 245, moveSpeed: 96, artKey: "dr_res_f", targetStrategy: "nearestEnemy", tagline: "芽叶治愈濒危队友" },
  { id: "H19", role: "唤灭", color: "#b04a4a", maxHp: 800, attack: 148, defense: 20, attackIntervalMs: 1420, attackRange: 265, moveSpeed: 99, artKey: "ev_dev_f", targetStrategy: "nearestEnemy", tagline: "龙焰轰碎敌群" },
  { id: "H20", role: "平衡", color: "#4a7a8a", maxHp: 850, attack: 128, defense: 24, attackIntervalMs: 1380, attackRange: 255, moveSpeed: 100, artKey: "dr_bal_f", targetStrategy: "nearestEnemy", tagline: "日月之力压制战场" },
  { id: "H21", role: "惩戒", color: "#b08a3a", maxHp: 1100, attack: 132, defense: 38, attackIntervalMs: 1000, attackRange: 70, moveSpeed: 122, artKey: "pa_ret_f", targetStrategy: "nearestEnemy", tagline: "圣光战锤连连砸下" },
  { id: "H22", role: "驭兽", color: "#5a7a4a", maxHp: 880, attack: 118, defense: 26, attackIntervalMs: 1050, attackRange: 280, moveSpeed: 108, artKey: "hu_bea_m", targetStrategy: "nearestEnemy", tagline: "号角与箭矢协同打击" },
  { id: "H23", role: "生存", color: "#6a7a55", maxHp: 900, attack: 122, defense: 30, attackIntervalMs: 980, attackRange: 75, moveSpeed: 128, artKey: "hu_sur_m", targetStrategy: "nearestEnemy", tagline: "陷阱与矛尖的近战猎手" },
  { id: "H24", role: "痛苦", color: "#6a4a7a", maxHp: 790, attack: 142, defense: 18, attackIntervalMs: 1480, attackRange: 260, moveSpeed: 96, artKey: "wl_aff_f", targetStrategy: "nearestEnemy", tagline: "咒术在敌群间蔓延" },
  { id: "H25", role: "踏风", color: "#3a8a7a", maxHp: 950, attack: 138, defense: 32, attackIntervalMs: 860, attackRange: 55, moveSpeed: 160, artKey: "mo_win_m", targetStrategy: "lowestHpEnemy", tagline: "疾风拳打穿破绽" },
  { id: "H26", role: "织雾", color: "#7ab0a0", maxHp: 910, attack: 72, defense: 26, attackIntervalMs: 1580, attackRange: 250, moveSpeed: 95, artKey: "mo_mis_f", targetStrategy: "nearestEnemy", tagline: "雾气托起队友生命" },
  { id: "H27", role: "狂徒", color: "#3a4a6a", maxHp: 860, attack: 136, defense: 28, attackIntervalMs: 900, attackRange: 60, moveSpeed: 148, artKey: "ro_out_m", targetStrategy: "lowestHpEnemy", tagline: "刀枪并进的街头战法" },
  { id: "H28", role: "增强", color: "#6a5a9a", maxHp: 1080, attack: 120, defense: 36, attackIntervalMs: 1100, attackRange: 80, moveSpeed: 120, artKey: "sh_enh_f", targetStrategy: "nearestEnemy", tagline: "近战雷击带动全队节奏" },
  { id: "H29", role: "奥法", color: "#6a5ab0", maxHp: 770, attack: 152, defense: 17, attackIntervalMs: 1460, attackRange: 275, moveSpeed: 97, artKey: "ma_arc_m", targetStrategy: "nearestEnemy", tagline: "奥术飞弹连锁轰击" },
  { id: "H30", role: "增辉", color: "#8a6a3a", maxHp: 1000, attack: 125, defense: 35, attackIntervalMs: 1150, attackRange: 70, moveSpeed: 118, artKey: "ev_aug_m", targetStrategy: "nearestEnemy", tagline: "晶拳轰鸣鼓舞队友" },
  { id: "H31", role: "恶魔术", color: "#5a4a8a", maxHp: 830, attack: 140, defense: 22, attackIntervalMs: 1320, attackRange: 250, moveSpeed: 102, artKey: "wl_dem_m", targetStrategy: "nearestEnemy", tagline: "恶魔火在敌人间跳跃" },
  { id: "H32", role: "毁灭", color: "#7a3a5a", maxHp: 780, attack: 158, defense: 16, attackIntervalMs: 1500, attackRange: 270, moveSpeed: 95, artKey: "wl_des_f", targetStrategy: "nearestEnemy", tagline: "混乱之箭点燃一切" },
  { id: "H33", role: "野性", color: "#6a8a3a", maxHp: 980, attack: 142, defense: 30, attackIntervalMs: 870, attackRange: 55, moveSpeed: 155, artKey: "dr_fer_m", targetStrategy: "lowestHpEnemy", tagline: "利爪撕开最低血量目标" },
  { id: "H34", role: "敏锐", color: "#4a3a5a", maxHp: 840, attack: 148, defense: 24, attackIntervalMs: 840, attackRange: 55, moveSpeed: 158, artKey: "ro_sub_f", targetStrategy: "lowestHpEnemy", tagline: "阴影中完成致命一击" },
  { id: "H35", role: "铁卫", color: "#7a8a6a", maxHp: 1480, attack: 92, defense: 68, attackIntervalMs: 1380, attackRange: 65, moveSpeed: 108, artKey: "wa_pro_f", targetStrategy: "nearestEnemy", tagline: "铁壁般的前线盾卫" },
  { id: "H36", role: "潮汐", color: "#4a9aaa", maxHp: 930, attack: 78, defense: 30, attackIntervalMs: 1520, attackRange: 245, moveSpeed: 98, artKey: "sh_res_f", targetStrategy: "nearestEnemy", tagline: "潮汐托起伤员" },
  { id: "H37", role: "戒律", color: "#9a8ab0", maxHp: 890, attack: 80, defense: 27, attackIntervalMs: 1560, attackRange: 250, moveSpeed: 96, artKey: "pr_dis_f", targetStrategy: "nearestEnemy", tagline: "戒律之盾护佑队友" },
  { id: "H38", role: "咒术", color: "#5a3a6a", maxHp: 800, attack: 145, defense: 19, attackIntervalMs: 1440, attackRange: 255, moveSpeed: 98, artKey: "wl_aff_m", targetStrategy: "nearestEnemy", tagline: "诅咒在敌群中连锁" },
  { id: "H39", role: "炎法", color: "#c06a3a", maxHp: 790, attack: 156, defense: 18, attackIntervalMs: 1470, attackRange: 270, moveSpeed: 97, artKey: "ma_fir_m", targetStrategy: "nearestEnemy", tagline: "烈焰轰击席卷敌阵" },
  { id: "H40", role: "圣锤", color: "#a08040", maxHp: 1120, attack: 134, defense: 40, attackIntervalMs: 980, attackRange: 70, moveSpeed: 124, artKey: "pa_ret_m", targetStrategy: "nearestEnemy", tagline: "圣光战锤的连段压制" },
  { id: "H41", role: "鲜血", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_bld_f", targetStrategy: "nearestEnemy", tagline: "死亡骑士·鲜血的战场专精" },
  { id: "H42", role: "冰霜", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_fro_m", targetStrategy: "nearestEnemy", tagline: "死亡骑士·冰霜的战场专精" },
  { id: "H43", role: "邪恶", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dk_uho_m", targetStrategy: "nearestEnemy", tagline: "死亡骑士·邪恶的战场专精" },
  { id: "H44", role: "浩劫", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "dh_hav_f", targetStrategy: "lowestHpEnemy", tagline: "恶魔猎手·浩劫的战场专精" },
  { id: "H45", role: "复仇", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dh_ven_m", targetStrategy: "nearestEnemy", tagline: "恶魔猎手·复仇的战场专精" },
  { id: "H46", role: "噬灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "dh_dev_m", targetStrategy: "nearestEnemy", tagline: "恶魔猎手·噬灭的战场专精" },
  { id: "H47", role: "平衡", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "dr_bal_m", targetStrategy: "nearestEnemy", tagline: "德鲁伊·平衡的战场专精" },
  { id: "H48", role: "野性", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "dr_fer_f", targetStrategy: "lowestHpEnemy", tagline: "德鲁伊·野性的战场专精" },
  { id: "H49", role: "守护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dr_gua_m", targetStrategy: "nearestEnemy", tagline: "德鲁伊·守护的战场专精" },
  { id: "H50", role: "守护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "dr_gua_f", targetStrategy: "nearestEnemy", tagline: "德鲁伊·守护的战场专精" },
  { id: "H51", role: "恢复", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "dr_res_m", targetStrategy: "nearestEnemy", tagline: "德鲁伊·恢复的战场专精" },
  { id: "H52", role: "湮灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "ev_dev_m", targetStrategy: "nearestEnemy", tagline: "唤魔师·湮灭的战场专精" },
  { id: "H53", role: "恩护", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "ev_pre_m", targetStrategy: "nearestEnemy", tagline: "唤魔师·恩护的战场专精" },
  { id: "H54", role: "恩护", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "ev_pre_f", targetStrategy: "nearestEnemy", tagline: "唤魔师·恩护的战场专精" },
  { id: "H55", role: "增辉", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "ev_aug_f", targetStrategy: "nearestEnemy", tagline: "唤魔师·增辉的战场专精" },
  { id: "H56", role: "野兽控制", color: "#6f9c61", maxHp: 870, attack: 120, defense: 24, attackIntervalMs: 1020, attackRange: 285, moveSpeed: 106, artKey: "hu_bea_f", targetStrategy: "nearestEnemy", tagline: "猎人·野兽控制的战场专精" },
  { id: "H57", role: "射击", color: "#6f9c61", maxHp: 870, attack: 120, defense: 24, attackIntervalMs: 1020, attackRange: 285, moveSpeed: 106, artKey: "hu_mar_f", targetStrategy: "nearestEnemy", tagline: "猎人·射击的战场专精" },
  { id: "H58", role: "生存", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "hu_sur_f", targetStrategy: "nearestEnemy", tagline: "猎人·生存的战场专精" },
  { id: "H59", role: "奥术", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "ma_arc_f", targetStrategy: "nearestEnemy", tagline: "法师·奥术的战场专精" },
  { id: "H60", role: "冰霜", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "ma_fro_m", targetStrategy: "nearestEnemy", tagline: "法师·冰霜的战场专精" },
  { id: "H61", role: "酒仙", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "mo_bre_m", targetStrategy: "nearestEnemy", tagline: "武僧·酒仙的战场专精" },
  { id: "H62", role: "酒仙", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "mo_bre_f", targetStrategy: "nearestEnemy", tagline: "武僧·酒仙的战场专精" },
  { id: "H63", role: "织雾", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "mo_mis_m", targetStrategy: "nearestEnemy", tagline: "武僧·织雾的战场专精" },
  { id: "H64", role: "踏风", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "mo_win_f", targetStrategy: "lowestHpEnemy", tagline: "武僧·踏风的战场专精" },
  { id: "H65", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pa_hol_m", targetStrategy: "nearestEnemy", tagline: "圣骑士·神圣的战场专精" },
  { id: "H66", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pa_hol_f", targetStrategy: "nearestEnemy", tagline: "圣骑士·神圣的战场专精" },
  { id: "H67", role: "防护", color: "#6b8b69", maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, artKey: "pa_pro_f", targetStrategy: "nearestEnemy", tagline: "圣骑士·防护的战场专精" },
  { id: "H68", role: "戒律", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pr_dis_m", targetStrategy: "nearestEnemy", tagline: "牧师·戒律的战场专精" },
  { id: "H69", role: "神圣", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "pr_hol_m", targetStrategy: "nearestEnemy", tagline: "牧师·神圣的战场专精" },
  { id: "H70", role: "暗影", color: "#72a7c8", maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, artKey: "pr_sha_m", targetStrategy: "nearestEnemy", tagline: "牧师·暗影的战场专精" },
  { id: "H71", role: "奇袭", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_ass_f", targetStrategy: "lowestHpEnemy", tagline: "潜行者·奇袭的战场专精" },
  { id: "H72", role: "狂徒", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_out_f", targetStrategy: "lowestHpEnemy", tagline: "潜行者·狂徒的战场专精" },
  { id: "H73", role: "敏锐", color: "#67607d", maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, artKey: "ro_sub_m", targetStrategy: "lowestHpEnemy", tagline: "潜行者·敏锐的战场专精" },
  { id: "H74", role: "元素", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "sh_ele_f", targetStrategy: "nearestEnemy", tagline: "萨满祭司·元素的战场专精" },
  { id: "H75", role: "增强", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "sh_enh_m", targetStrategy: "nearestEnemy", tagline: "萨满祭司·增强的战场专精" },
  { id: "H76", role: "恢复", color: "#e2b958", maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, artKey: "sh_res_m", targetStrategy: "nearestEnemy", tagline: "萨满祭司·恢复的战场专精" },
  { id: "H77", role: "恶魔学识", color: "#a171a4", maxHp: 1300, attack: 115, defense: 55, attackIntervalMs: 1180, attackRange: 188, moveSpeed: 112, artKey: "wl_dem_f", targetStrategy: "nearestEnemy", tagline: "术士·恶魔学识的战场专精" },
  { id: "H78", role: "毁灭", color: "#d97c55", maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, artKey: "wl_des_m", targetStrategy: "nearestEnemy", tagline: "术士·毁灭的战场专精" },
  { id: "H79", role: "武器", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_arm_m", targetStrategy: "nearestEnemy", tagline: "战士·武器的战场专精" },
  { id: "H80", role: "狂怒", color: "#cf7158", maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, artKey: "wa_fur_f", targetStrategy: "nearestEnemy", tagline: "战士·狂怒的战场专精" },
] as const;

const identityById = Object.fromEntries(HERO_DAMAGE_IDENTITIES.map((row) => [row.id, row]));

/** Authored weapon reach for melee specializations; formation slots never modify it. */
const MELEE_ATTACK_RANGE_BY_SPECIALIZATION: Partial<Record<SpecId, number>> = {
  death_knight_blood: 58,
  death_knight_frost: 72,
  death_knight_unholy: 66,
  demon_hunter_havoc: 54,
  demon_hunter_vengeance: 50,
  druid_feral: 40,
  druid_guardian: 56,
  hunter_survival: 100,
  monk_windwalker: 42,
  paladin_protection: 50,
  paladin_retribution: 92,
  rogue_assassination: 42,
  rogue_outlaw: 68,
  rogue_subtlety: 45,
  shaman_enhancement: 82,
  warrior_arms: 105,
  warrior_fury: 58,
  warrior_protection: 65,
};

export function buildHeroDefinitions() {
  return HERO_ROSTER.map((entry) => {
    const identity = identityById[entry.id];
    if (!identity) throw new Error(`Missing damage identity for ${entry.id}`);
    const specialization = specializationForArtKey(entry.artKey);
    const gender: "male" | "female" = entry.artKey.endsWith("_f") ? "female" : "male";
    const combatRange: "melee" | "ranged" = entry.attackRange >= 120 ? "ranged" : "melee";
    const attackRange = combatRange === "melee"
      ? MELEE_ATTACK_RANGE_BY_SPECIALIZATION[specialization.id] ?? entry.attackRange
      : entry.attackRange;
    return {
      id: entry.id,
      name: identity.name,
      role: entry.role,
      color: entry.color,
      maxHp: entry.maxHp,
      attack: entry.attack,
      defense: entry.defense,
      attackIntervalMs: entry.attackIntervalMs,
      attackRange,
      moveSpeed: entry.moveSpeed,
      damageSchool: identity.damageSchool,
      damageElement: identity.damageElement as DamageElement,
      classId: specialization.classId,
      className: specialization.className,
      specId: specialization.id,
      specName: specialization.name,
      gender,
      combatRange,
      expeditionRole: expeditionRoleForSpecialization(specialization.id),
      activeSkillId: `${specialization.id}-active`,
      passiveSkillId: `${specialization.id}-passive`,
      targetStrategy: entry.targetStrategy,
      tagline: entry.tagline,
      artKey: entry.artKey,
    };
  });
}

export const HERO_IDS = HERO_ROSTER.map(({ id }) => id);

export function heroPublicArtPath(id: HeroId): string {
  return `/assets/characters/hero-h${id.slice(1).toLowerCase()}.webp`;
}
