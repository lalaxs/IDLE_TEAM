export type ClassId =
  | "death_knight"
  | "demon_hunter"
  | "druid"
  | "evoker"
  | "hunter"
  | "mage"
  | "monk"
  | "paladin"
  | "priest"
  | "rogue"
  | "shaman"
  | "warlock"
  | "warrior";

export type SpecId =
  | "death_knight_blood"
  | "death_knight_frost"
  | "death_knight_unholy"
  | "demon_hunter_havoc"
  | "demon_hunter_vengeance"
  | "demon_hunter_devourer"
  | "druid_balance"
  | "druid_feral"
  | "druid_guardian"
  | "druid_restoration"
  | "evoker_devastation"
  | "evoker_preservation"
  | "evoker_augmentation"
  | "hunter_beast_mastery"
  | "hunter_marksmanship"
  | "hunter_survival"
  | "mage_arcane"
  | "mage_fire"
  | "mage_frost"
  | "monk_brewmaster"
  | "monk_mistweaver"
  | "monk_windwalker"
  | "paladin_holy"
  | "paladin_protection"
  | "paladin_retribution"
  | "priest_discipline"
  | "priest_holy"
  | "priest_shadow"
  | "rogue_assassination"
  | "rogue_outlaw"
  | "rogue_subtlety"
  | "shaman_elemental"
  | "shaman_enhancement"
  | "shaman_restoration"
  | "warlock_affliction"
  | "warlock_demonology"
  | "warlock_destruction"
  | "warrior_arms"
  | "warrior_fury"
  | "warrior_protection";

export function baseBlockChanceForSpecialization(specId: SpecId | undefined): number {
  return specId === "warrior_protection" ? 0.08 : 0;
}

export type HeroExpeditionRole = "tank" | "healer" | "support" | "damage";

const EXPEDITION_TANK_SPECS = new Set<SpecId>([
  "death_knight_blood",
  "demon_hunter_vengeance",
  "druid_guardian",
  "monk_brewmaster",
  "paladin_protection",
  "warrior_protection",
]);

const EXPEDITION_HEALER_SPECS = new Set<SpecId>([
  "druid_restoration",
  "evoker_preservation",
  "monk_mistweaver",
  "paladin_holy",
  "priest_holy",
  "shaman_restoration",
]);

const EXPEDITION_SUPPORT_SPECS = new Set<SpecId>([
  "evoker_augmentation",
  "priest_discipline",
]);

export function expeditionRoleForSpecialization(specId: SpecId): HeroExpeditionRole {
  if (EXPEDITION_TANK_SPECS.has(specId)) return "tank";
  if (EXPEDITION_HEALER_SPECS.has(specId)) return "healer";
  if (EXPEDITION_SUPPORT_SPECS.has(specId)) return "support";
  return "damage";
}

export interface SpecializationDefinition {
  id: SpecId;
  classId: ClassId;
  className: string;
  name: string;
  activeName: string;
  activeDescription: string;
  passiveName: string;
  passiveDescription: string;
  cooldownMs: number;
}

const spec = (
  id: SpecId,
  classId: ClassId,
  className: string,
  name: string,
  activeName: string,
  cooldownMs: number,
  activeDescription: string,
  passiveName: string,
  passiveDescription: string,
): SpecializationDefinition => ({
  id,
  classId,
  className,
  name,
  activeName,
  activeDescription,
  passiveName,
  passiveDescription,
  cooldownMs,
});

export const SPECIALIZATIONS: readonly SpecializationDefinition[] = [
  spec("death_knight_blood", "death_knight", "死亡骑士", "鲜血", "血契重斩", 6500, "造成160%伤害并嘲讽3秒，回复最近4秒生命损失的35%，最低回复6%最大生命；恢复后消耗伤害记录", "鲜血护壳", "主动过量自愈转为护盾，上限为12%最大生命"),
  spec("death_knight_frost", "death_knight", "死亡骑士", "冰霜", "凛冬双斩", 6000, "造成两次105%伤害；杀戮机会使第二击提高至155%并必定暴击，同时冻结0.6秒", "杀戮凛风", "普攻暴击或累计四次普攻获得一次杀戮机会，供下一次双斩消耗；获得机会后重新计数"),
  spec("death_knight_unholy", "death_knight", "死亡骑士", "邪恶", "疫疮爆发", 7000, "造成170%伤害，每层创伤追加40%；主目标受到6次35%疾病伤害，附近一名敌人受到一半疾病伤害", "溃烂创伤", "普攻在目标叠加创伤，最多3层；主动消耗创伤，感染目标死亡后疾病向附近两名敌人传播"),
  spec("demon_hunter_havoc", "demon_hunter", "恶魔猎手", "浩劫", "邪刃回旋", 5500, "突进并对近身敌人造成3次70%伤害；命中至少2人获得20%攻速3秒", "恶魔追猎", "自身击杀后获得12点怒气，并追猎下一名残血敌人"),
  spec("demon_hunter_vengeance", "demon_hunter", "恶魔猎手", "复仇", "裂魂烙印", 6500, "造成150%伤害并嘲讽3秒；吞噬全部灵魂碎片，回复3%加每片2.5%最大生命", "恶魔皮肤", "承受生命伤害时每1.5秒最多获得一片灵魂，最多5片；吞魂获得6%加每片2%减伤，持续3秒"),
  spec("demon_hunter_devourer", "demon_hunter", "恶魔猎手", "噬灭", "虚空射线", 6500, "持续引导，每0.5秒造成90%伤害，共4段；每层灵魂延长一段，目标死亡后转向射程内敌人，眩晕中断引导", "灵魂收割", "有敌人且未引导时每2秒获得1层灵魂，最多3层；开始引导时全部消耗"),
  spec("druid_balance", "druid", "德鲁伊", "平衡", "星辰轮转", 6500, "日相造成210%单体和95%溅射伤害；月相造成160%范围伤害并减速25%，施放后切换日月", "蚀变", "日相期间普攻伤害提高25%；月相期间普攻对附近另一敌人追加30%伤害"),
  spec("druid_feral", "druid", "德鲁伊", "野性", "撕裂扑杀", 5500, "优先扑向已有自身流血的目标，否则选择高生命敌人；造成120%伤害并施加6次25%流血，刷新最多保留2跳", "捕猎本能", "普攻对自身流血目标提高12%伤害，并延长1跳流血，最多保留8跳"),
  spec("druid_guardian", "druid", "德鲁伊", "守护", "铁鬃横扫", 6500, "造成150%近身范围伤害并嘲讽3秒，获得8%最大生命护盾；每命中一人获得2%减伤4秒，最多10%", "厚皮", "每名正在攻击自己的敌人提供2%减伤，最多10%；与铁鬃减伤取高"),
  spec("druid_restoration", "druid", "德鲁伊", "恢复", "新生绽放", 6000, "优先抢救低于35%生命的队友，其次为缺少自身持续治疗者铺设治疗，最多两人；先回复80%攻击或4%最大生命中的较高值，再每秒回复2.5%最大生命，持续6秒", "繁茂", "持续治疗的过量部分以50%转移给另一名受伤队友"),
  spec("evoker_devastation", "evoker", "唤魔师", "湮灭", "龙焰贯袭", 6500, "蓄力龙息对前方射程加80范围内首个敌人造成210%伤害，后续敌人受到130%伤害", "蓄势龙息", "龙息命中至少两人时，下一次龙息的准备时间缩短40%"),
  spec("evoker_preservation", "evoker", "唤魔师", "恩护", "时光回溯", 6000, "优先治疗仍然缺血且最近4秒受伤最多的队友；基础治疗为150%攻击或7%最大生命中的较高值，额外回溯近期生命损失的50%，额外部分最高20%最大生命", "时光记忆", "记录队友最近4秒实际生命损失；回溯后消费该目标的记录，同一笔伤害只能回溯一次"),
  spec("evoker_augmentation", "evoker", "唤魔师", "增辉", "辉鳞增幅", 7000, "造成130%伤害，使优先增幅队友获得12%攻击5秒；自动选择时优先输出职业，再比较攻击，影响攻击系数效果", "共鸣龙鳞", "受增幅队友施放技能时延长增幅0.8秒，最多延长2.4秒"),
  spec("hunter_beast_mastery", "hunter", "猎人", "野兽控制", "兽王之怒", 5500, "射击造成130%攻击伤害，自身进入狂怒5秒，追猎射击间隔缩短至0.9秒", "掠食本能", "自身每1.6秒发动一次55%攻击伤害的追猎射击，优先追击射程内同一目标；眩晕或准备主动技能时暂停射击"),
  spec("hunter_marksmanship", "hunter", "猎人", "射击", "蓄力狙击", 6500, "造成230%伤害，距离越远伤害越高，最多提高25%；享受对该目标的瞄准暴击加成", "稳固瞄准", "持续攻击同一目标每次获得4%普攻与狙击暴击率，最多4层，换目标清空"),
  spec("hunter_survival", "hunter", "猎人", "生存", "爆裂猎矛", 5500, "突进造成170%伤害，在目标后方100处维持一枚6秒拦截陷阱；陷阱成功触发后下一次猎矛提高至230%伤害", "猎人伏击", "陷阱布置0.75秒后就绪，由新进入范围的敌人触发，造成80%范围伤害和35%减速2.5秒，并强化下一次猎矛"),
  spec("mage_arcane", "mage", "法师", "奥术", "奥能齐射", 6500, "造成160%伤害，消耗充能，每层追加30%；通常蓄满4层释放，面对低于35%生命的敌人可提前以2层释放", "奥术积蓄", "普攻获得1层充能，最多4层；满层释放后进入4秒涌流，期间暂停主动和充能，普攻追加60%伤害"),
  spec("mage_fire", "mage", "法师", "火焰", "灼爆火球", 6500, "造成190%伤害并施加3次30%点燃；炎爆机会使直接伤害提高至250%，主动暴击或炎爆会向附近最多两人传播点燃", "燃烧蔓延", "自身暴击获得一次炎爆机会，强化下一次火球"),
  spec("mage_frost", "mage", "法师", "冰霜", "寒潮新星", 6500, "造成150%范围伤害并减速35%持续3秒；目标有2层寒意或已受减速、眩晕时，伤害提高至200%并冻结0.8秒，随后消耗寒意", "碎冰", "普攻对同一目标积累寒意，最多2层；寒潮冻结后获得2.5秒碎冰机会，下一次普攻命中本次冻结过的目标时伤害提高50%并消耗机会"),
  spec("monk_brewmaster", "monk", "武僧", "酒仙", "醉意震掌", 6500, "造成140%近身范围伤害并嘲讽3秒，清除40%尚未偿还的醉拳伤害；优先在醉拳积累较多时净化，兼顾嘲讽和危急自救，最多等待1.2秒", "醉拳", "受到伤害的35%改为4次每秒偿还；主动净化未偿还部分，受到有效治疗时额外净化相当于治疗量30%的醉拳伤害"),
  spec("monk_mistweaver", "monk", "武僧", "织雾", "氤氲回春", 5500, "治疗最低生命队友，取220%攻击或11%最大生命中的较高值，并开启5秒抚风窗口", "抚风拳", "抚风窗口内每次普攻命中治疗最低生命队友，数值为70%攻击，受治疗强度影响"),
  spec("monk_windwalker", "monk", "武僧", "踏风", "疾风连环", 5500, "突进造成100%伤害并启动5秒连招；优先完成连招后再施放主动", "行云流水", "后续两次普攻先追加60%伤害并使目标易伤10%，再追加100%终结击；完成后清除破势、回复5点怒气"),
  spec("paladin_holy", "paladin", "圣骑士", "神圣", "圣光信标", 6000, "治疗最低生命队友，取250%攻击或12%最大生命中的较高值", "圣辉折射", "固定信标优先绑定最前方坦克，否则绑定最大生命最高者；本人治疗其他人时向信标复制35%有效治疗，信标死亡后重新绑定"),
  spec("paladin_protection", "paladin", "圣骑士", "防护", "奉献盾击", 6500, "造成150%伤害、眩晕0.6秒并嘲讽3秒；自身获得12%减伤，附近队友获得6%减伤4秒", "正义壁垒", "受自身奉献保护的其他队友承受生命伤害时，自身获得3点怒气，每秒最多一次"),
  spec("paladin_retribution", "paladin", "圣骑士", "惩戒", "审判重锤", 6000, "造成190%伤害并施加6秒审判；再次命中消耗审判并追加90%伤害", "圣能追击", "普攻对自身审判目标附加20%神圣伤害"),
  spec("priest_discipline", "priest", "牧师", "戒律", "赎罪惩击", 5500, "造成170%伤害，以实际生命伤害的60%治疗最低生命队友，并建立6秒赎罪", "戒律护佑", "自身后续生命伤害以20%治疗赎罪目标；转换治疗受治疗强度影响，过量部分转为最高10%最大生命护盾"),
  spec("priest_holy", "priest", "牧师", "神圣", "祈愿之环", 6500, "治疗全队，取170%攻击或8%最大生命中的较高值；低于35%生命的队友额外获得40%治疗", "希望余辉", "每救急一名低于35%生命的队友积累1点希望；达到3点后下一次主动留下3次每秒2%最大生命治疗"),
  spec("priest_shadow", "priest", "牧师", "暗影", "噬心低语", 6500, "造成150%伤害并施加4次35%侵蚀；虚空形态中改为220%范围爆发并维持主目标侵蚀", "虚空涌动", "自身持续伤害每跳积累1层虚空；4层进入6秒虚空形态，普攻提高25%，形态结束后重新积累"),
  spec("rogue_assassination", "rogue", "潜行者", "奇袭", "毒刃处决", 5500, "优先攻击自身毒层最多的目标，造成120%伤害，消耗毒层和剩余毒伤，每层追加25%伤害", "致命药膏", "普攻叠加1层毒，最多5层，并施加4次每层8%攻击的毒伤；刷新保留跳伤计时，持续攻击叠毒目标"),
  spec("rogue_outlaw", "rogue", "潜行者", "狂徒", "剑火齐鸣", 5000, "剑击造成120%伤害，火枪对另一目标造成100%；集火机会改为同目标170%，弹射机会追加两次55%伤害", "把握机会", "每第四次普攻随机获得一次集火或弹射机会，由下一次主动消耗"),
  spec("rogue_subtlety", "rogue", "潜行者", "敏锐", "暗幕伏击", 6500, "闪至敌方后排造成240%伤害，随后进入暗幕2秒", "无踪", "暗幕期间获得30%闪避；离开后下一次普攻追加60%暗影伤害"),
  spec("shaman_elemental", "shaman", "萨满祭司", "元素", "熔雷爆裂", 6500, "造成260%伤害，有35%概率过载追加130%伤害", "元素回响", "过载后获得8点怒气，推动下一次施法"),
  spec("shaman_enhancement", "shaman", "萨满祭司", "增强", "风火双击", 5500, "造成两次95%伤害；风击追加55%，火击施加3次20%点燃，两种灌注交替", "漩涡武器", "每第三次普攻触发当前灌注；完成风火循环后下一次普攻追加80%伤害"),
  spec("shaman_restoration", "shaman", "萨满祭司", "恢复", "潮汐链愈", 6000, "从最受伤队友出发，最多治疗三名相距180以内的伤员；基础治疗依次为230%/160%/115%攻击，并以11%/8%/6%最大生命保底", "深水滋养", "目标每缺少1%生命，治疗链对其治疗量提高0.3%"),
  spec("warlock_affliction", "warlock", "术士", "痛苦", "灾蚀蔓延", 7000, "主目标受到7次65%持续伤害，并向另一名敌人传播60%强度，优先未感染目标；全员感染时等待诅咒剩余不超过两跳再补咒", "痛楚汲取", "每名受到自身持续伤害影响的敌人使新诅咒伤害提高4%，最多4人；自身生命伤害的6%转为自愈"),
  spec("warlock_demonology", "warlock", "术士", "恶魔学识", "魔群召引", 7000, "召唤两只各自存在6秒的小恶魔，最多4只；每只每2秒造成45%伤害，到期前完成最后一次攻击", "恶魔号令", "施放主动时，所有现存小恶魔立即齐射一次；新召唤物按独立寿命和节奏攻击"),
  spec("warlock_destruction", "warlock", "术士", "毁灭", "混沌炎矢", 7000, "造成200%伤害；有余烬时消耗1层，改为240%伤害并必定暴击", "燃烧余烬", "普攻为尚未燃烧的目标施加3次12%燃烧；每3跳自身持续伤害获得1层余烬，最多2层"),
  spec("warrior_arms", "warrior", "战士", "武器", "破阵重斩", 6500, "造成210%伤害并降低15%防御5秒；低于35%生命的目标受到280%伤害", "压制", "每第三次普攻使下一次主动必定暴击，享受自身暴击伤害加成"),
  spec("warrior_fury", "warrior", "战士", "狂怒", "嗜血连斩", 5500, "造成3次70%伤害，回复8%实际生命伤害，并进入激怒", "狂乱", "激怒获得20%攻速3秒，暴击可延长，单次激怒最多额外延长2秒"),
  spec("warrior_protection", "warrior", "战士", "防护", "盾墙猛击", 6500, "造成160%伤害、眩晕0.8秒并嘲讽3秒，获得8%最大生命护盾；格挡强化时伤害提高至220%", "盾牌戒备", "自带8%格挡率；格挡后获得2%最大生命护盾和5点怒气，并强化下一次盾击"),
] as const;

export const SPECIALIZATION_BY_ID = Object.fromEntries(
  SPECIALIZATIONS.map((definition) => [definition.id, definition]),
) as Record<SpecId, SpecializationDefinition>;

const SPEC_BY_ART_CODE: Record<string, SpecId> = {
  dk_bld: "death_knight_blood",
  dk_fro: "death_knight_frost",
  dk_uho: "death_knight_unholy",
  dh_hav: "demon_hunter_havoc",
  dh_ven: "demon_hunter_vengeance",
  dh_dev: "demon_hunter_devourer",
  dr_bal: "druid_balance",
  dr_fer: "druid_feral",
  dr_gua: "druid_guardian",
  dr_res: "druid_restoration",
  ev_dev: "evoker_devastation",
  ev_pre: "evoker_preservation",
  ev_aug: "evoker_augmentation",
  hu_bea: "hunter_beast_mastery",
  hu_mar: "hunter_marksmanship",
  hu_sur: "hunter_survival",
  ma_arc: "mage_arcane",
  ma_fir: "mage_fire",
  ma_fro: "mage_frost",
  mo_bre: "monk_brewmaster",
  mo_mis: "monk_mistweaver",
  mo_win: "monk_windwalker",
  pa_hol: "paladin_holy",
  pa_pro: "paladin_protection",
  pa_ret: "paladin_retribution",
  pr_dis: "priest_discipline",
  pr_hol: "priest_holy",
  pr_sha: "priest_shadow",
  ro_ass: "rogue_assassination",
  ro_out: "rogue_outlaw",
  ro_sub: "rogue_subtlety",
  sh_ele: "shaman_elemental",
  sh_enh: "shaman_enhancement",
  sh_res: "shaman_restoration",
  wl_aff: "warlock_affliction",
  wl_dem: "warlock_demonology",
  wl_des: "warlock_destruction",
  wa_arm: "warrior_arms",
  wa_fur: "warrior_fury",
  wa_pro: "warrior_protection",
};

export function specializationForArtKey(artKey: string): SpecializationDefinition {
  const artCode = artKey.split("_").slice(0, 2).join("_");
  const specId = SPEC_BY_ART_CODE[artCode];
  if (!specId) throw new Error(`Unknown specialization art key: ${artKey}`);
  return SPECIALIZATION_BY_ID[specId];
}
