import { EXPANDED_ITEM_DEFINITIONS, EXPANDED_TRAIT_DEFINITIONS } from "./expandedSlots";
import {
  ACCESSORY_SLOTS,
  EQUIPMENT_SLOTS,
  GEAR_SLOTS,
  SLOT_LABELS,
  createEmptyEquipment,
  type EquipmentSlot,
} from "./equipmentSlots";
import {
  buildGeneratedCatalog,
  enrichLegacyItem,
  type BaseTier,
  type CatalogItemSeed,
} from "./equipmentCatalog";
import type { DamageSchool } from "./equipmentIcon";
import type { ChapterId } from "./chapters";
import type { SetId } from "./sets";
import { RARITY_LABELS, type Rarity } from "./rarities";

export type { EquipmentSlot, Rarity, BaseTier, DamageSchool, ChapterId, SetId };
export {
  EQUIPMENT_SLOTS,
  SLOT_LABELS,
  GEAR_SLOTS,
  ACCESSORY_SLOTS,
  createEmptyEquipment,
  RARITY_LABELS,
};

/** @deprecated Prefer ChapterId; kept for call sites that still say EquipmentChapter. */
export type EquipmentChapter = ChapterId;

export interface ItemDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  icon: string;
  /** Primary content chapter / UI grouping. */
  chapter: ChapterId;
  school: DamageSchool;
  baseTier: BaseTier;
  unlockChapter: ChapterId;
  retireChapter: number;
  minGrade: Rarity;
  maxGrade: Rarity;
  setId?: SetId;
}

export interface TraitDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
}

const CORE_ITEM_DEFINITIONS = [
  { id: "weapon_guard_blade", name: "守望短刃", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_guard_blade.webp", chapter: 1 as const },
  { id: "weapon_ranger_bow", name: "林风短弓", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_ranger_bow.webp", chapter: 1 as const },
  { id: "weapon_oak_staff", name: "橡木法杖", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_oak_staff.webp", chapter: 1 as const },
  { id: "weapon_storm_hammer", name: "雷纹短锤", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_storm_hammer.webp", chapter: 1 as const },
  { id: "weapon_sun_scepter", name: "晨辉权杖", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_sun_scepter.webp", chapter: 1 as const },
  { id: "weapon_frost_branch", name: "霜枝法杖", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_frost_branch.webp", chapter: 1 as const },
  { id: "weapon_raven_blades", name: "暮鸦双刃", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_raven_blades.webp", chapter: 1 as const },
  { id: "weapon_thorn_spear", name: "荆棘短枪", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_thorn_spear.webp", chapter: 1 as const },
  { id: "armor_travel_cloak", name: "远行斗篷", slot: "armor" as const, icon: "/assets/equipment/armor_travel_cloak.webp", chapter: 1 as const },
  { id: "armor_scale_vest", name: "青鳞甲衣", slot: "armor" as const, icon: "/assets/equipment/armor_scale_vest.webp", chapter: 1 as const },
  { id: "armor_guard_mail", name: "守望链甲", slot: "armor" as const, icon: "/assets/equipment/armor_guard_mail.webp", chapter: 1 as const },
  { id: "armor_leaf_robe", name: "林叶法袍", slot: "armor" as const, icon: "/assets/equipment/armor_leaf_robe.webp", chapter: 1 as const },
  { id: "armor_dawn_cuirass", name: "晨曦胸甲", slot: "armor" as const, icon: "/assets/equipment/armor_dawn_cuirass.webp", chapter: 1 as const },
  { id: "armor_frost_mantle", name: "霜纹披肩", slot: "armor" as const, icon: "/assets/equipment/armor_frost_mantle.webp", chapter: 1 as const },
  { id: "armor_shadow_tunic", name: "暮影短衣", slot: "armor" as const, icon: "/assets/equipment/armor_shadow_tunic.webp", chapter: 1 as const },
  { id: "armor_thorn_bark", name: "荆木护甲", slot: "armor" as const, icon: "/assets/equipment/armor_thorn_bark.webp", chapter: 1 as const },
  { id: "accessory_leaf_charm", name: "新芽护符", slot: "amulet" as const, icon: "/assets/equipment/accessory_leaf_charm.webp", chapter: 1 as const },
  { id: "accessory_sun_ring", name: "晨光指环", slot: "amulet" as const, icon: "/assets/equipment/accessory_sun_ring.webp", chapter: 1 as const },
  { id: "accessory_rune_stone", name: "古纹石", slot: "amulet" as const, icon: "/assets/equipment/accessory_rune_stone.webp", chapter: 1 as const },
  { id: "accessory_wind_feather", name: "迅风羽饰", slot: "amulet" as const, icon: "/assets/equipment/accessory_wind_feather.webp", chapter: 1 as const },
  { id: "accessory_ember_beads", name: "余烬念珠", slot: "amulet" as const, icon: "/assets/equipment/accessory_ember_beads.webp", chapter: 1 as const },
  { id: "accessory_frost_bell", name: "霜铃坠", slot: "amulet" as const, icon: "/assets/equipment/accessory_frost_bell.webp", chapter: 1 as const },
  { id: "accessory_raven_badge", name: "暮鸦徽记", slot: "amulet" as const, icon: "/assets/equipment/accessory_raven_badge.webp", chapter: 1 as const },
  { id: "accessory_storm_drum", name: "雷鸣鼓符", slot: "amulet" as const, icon: "/assets/equipment/accessory_storm_drum.webp", chapter: 1 as const },
  { id: "weapon_frost_fang_saber", name: "霜牙弯刀", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_frost_fang_saber.webp", chapter: 2 as const },
  { id: "weapon_snow_pine_crossbow", name: "雪松重弩", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_snow_pine_crossbow.webp", chapter: 2 as const },
  { id: "weapon_aurora_grimoire", name: "极光法典", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_aurora_grimoire.webp", chapter: 2 as const },
  { id: "weapon_frozen_rock_axe", name: "冻岩战斧", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_frozen_rock_axe.webp", chapter: 2 as const },
  { id: "armor_snow_travel_coat", name: "雪行皮袄", slot: "armor" as const, icon: "/assets/equipment/armor_snow_travel_coat.webp", chapter: 2 as const },
  { id: "armor_ice_ridge_plate", name: "冰脊板甲", slot: "armor" as const, icon: "/assets/equipment/armor_ice_ridge_plate.webp", chapter: 2 as const },
  { id: "armor_aurora_robe", name: "极光长袍", slot: "armor" as const, icon: "/assets/equipment/armor_aurora_robe.webp", chapter: 2 as const },
  { id: "armor_frozen_earth_pauldron", name: "冻土护肩", slot: "armor" as const, icon: "/assets/equipment/armor_frozen_earth_pauldron.webp", chapter: 2 as const },
  { id: "accessory_cold_star_pendant", name: "寒星吊坠", slot: "amulet" as const, icon: "/assets/equipment/accessory_cold_star_pendant.webp", chapter: 2 as const },
  { id: "accessory_aurora_vial", name: "极光晶瓶", slot: "amulet" as const, icon: "/assets/equipment/accessory_aurora_vial.webp", chapter: 2 as const },
  { id: "accessory_snowfield_compass", name: "雪原罗盘", slot: "amulet" as const, icon: "/assets/equipment/accessory_snowfield_compass.webp", chapter: 2 as const },
  { id: "accessory_frozen_earth_horn", name: "冻土号角", slot: "amulet" as const, icon: "/assets/equipment/accessory_frozen_earth_horn.webp", chapter: 2 as const },
  { id: "weapon_dune_crescent_sickle", name: "流沙弯镰", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_dune_crescent_sickle.webp", chapter: 3 as const },
  { id: "weapon_sunshot_bow", name: "烈阳短弓", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_sunshot_bow.webp", chapter: 3 as const },
  { id: "weapon_scarab_codex", name: "圣甲虫秘典", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_scarab_codex.webp", chapter: 3 as const },
  { id: "weapon_roadwarden_mace", name: "古道战锤", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_roadwarden_mace.webp", chapter: 3 as const },
  { id: "armor_dustwalker_mantle", name: "踏尘披巾", slot: "armor" as const, icon: "/assets/equipment/armor_dustwalker_mantle.webp", chapter: 3 as const },
  { id: "armor_sunscale_cuirass", name: "烈日鳞甲", slot: "armor" as const, icon: "/assets/equipment/armor_sunscale_cuirass.webp", chapter: 3 as const },
  { id: "armor_oasis_robe", name: "绿洲长袍", slot: "armor" as const, icon: "/assets/equipment/armor_oasis_robe.webp", chapter: 3 as const },
  { id: "armor_ruin_guard_pauldron", name: "遗迹护肩", slot: "armor" as const, icon: "/assets/equipment/armor_ruin_guard_pauldron.webp", chapter: 3 as const },
  { id: "accessory_scarab_seal", name: "圣甲虫印", slot: "amulet" as const, icon: "/assets/equipment/accessory_scarab_seal.webp", chapter: 3 as const },
  { id: "accessory_sundial_disc", name: "日轮盘", slot: "amulet" as const, icon: "/assets/equipment/accessory_sundial_disc.webp", chapter: 3 as const },
  { id: "accessory_sandglass", name: "流沙计时瓶", slot: "amulet" as const, icon: "/assets/equipment/accessory_sandglass.webp", chapter: 3 as const },
  { id: "accessory_caravan_bell", name: "商旅驼铃", slot: "amulet" as const, icon: "/assets/equipment/accessory_caravan_bell.webp", chapter: 3 as const },
  { id: "weapon_cloudsplitter_glaive", name: "破云钺", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_cloudsplitter_glaive.webp", chapter: 4 as const },
  { id: "weapon_thunderwing_crossbow", name: "雷翼弩", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_thunderwing_crossbow.webp", chapter: 4 as const },
  { id: "weapon_skyspire_staff", name: "天穹杖", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_skyspire_staff.webp", chapter: 4 as const },
  { id: "weapon_tempest_codex", name: "苍雷秘典", slot: "main_weapon" as const, icon: "/assets/equipment/weapon_tempest_codex.webp", chapter: 4 as const },
  { id: "armor_cloudwarden_cloak", name: "云卫披风", slot: "armor" as const, icon: "/assets/equipment/armor_cloudwarden_cloak.webp", chapter: 4 as const },
  { id: "armor_thunderplate_cuirass", name: "雷铸胸甲", slot: "armor" as const, icon: "/assets/equipment/armor_thunderplate_cuirass.webp", chapter: 4 as const },
  { id: "armor_skyweave_robe", name: "天织法袍", slot: "armor" as const, icon: "/assets/equipment/armor_skyweave_robe.webp", chapter: 4 as const },
  { id: "armor_wingguard_pauldron", name: "翼卫护肩", slot: "armor" as const, icon: "/assets/equipment/armor_wingguard_pauldron.webp", chapter: 4 as const },
  { id: "accessory_stormeye_brooch", name: "风眼徽", slot: "amulet" as const, icon: "/assets/equipment/accessory_stormeye_brooch.webp", chapter: 4 as const },
  { id: "accessory_thunder_vane", name: "雷羽风标", slot: "amulet" as const, icon: "/assets/equipment/accessory_thunder_vane.webp", chapter: 4 as const },
  { id: "accessory_cloudstep_bell", name: "踏云铃", slot: "amulet" as const, icon: "/assets/equipment/accessory_cloudstep_bell.webp", chapter: 4 as const },
  { id: "accessory_skycrystal_prism", name: "天穹晶", slot: "amulet" as const, icon: "/assets/equipment/accessory_skycrystal_prism.webp", chapter: 4 as const },
];

const LEGACY_SET_TAGS: Partial<Record<string, SetId>> = {
  armor_scale_vest: "set_moss_crown",
  armor_guard_mail: "set_moss_crown",
  weapon_frost_fang_saber: "set_frost_bite",
  armor_ice_ridge_plate: "set_frost_bite",
  weapon_scarab_codex: "set_sand_scar",
  armor_oasis_robe: "set_sand_scar",
  weapon_tempest_codex: "set_storm_tide",
  armor_skyweave_robe: "set_storm_tide",
};

function toDefinition(seed: CatalogItemSeed): ItemDefinition {
  return {
    id: seed.id,
    name: seed.name,
    slot: seed.slot,
    icon: seed.icon ?? "",
    chapter: seed.chapter,
    school: seed.school,
    baseTier: seed.baseTier,
    unlockChapter: seed.unlockChapter,
    retireChapter: seed.retireChapter,
    minGrade: seed.minGrade,
    maxGrade: seed.maxGrade,
    setId: seed.setId,
  };
}

const LEGACY_ITEMS: ItemDefinition[] = [
  ...CORE_ITEM_DEFINITIONS.map((item) =>
    toDefinition(
      enrichLegacyItem({
        ...item,
        setId: LEGACY_SET_TAGS[item.id],
      }),
    ),
  ),
  ...EXPANDED_ITEM_DEFINITIONS.map((item) =>
    toDefinition(
      enrichLegacyItem({
        id: item.id,
        name: item.name,
        slot: item.slot,
        icon: item.icon,
        chapter: item.chapter,
      }),
    ),
  ),
];

const GENERATED_ITEMS: ItemDefinition[] = buildGeneratedCatalog().map(toDefinition);

export const ITEM_DEFINITIONS: readonly ItemDefinition[] = [...LEGACY_ITEMS, ...GENERATED_ITEMS];

const CORE_TRAIT_DEFINITIONS = [
  { id: "sharp", name: "锐利", slot: "main_weapon" as const, description: "技能伤害提高" },
  { id: "swift", name: "迅捷", slot: "main_weapon" as const, description: "普攻速度提高" },
  { id: "execute", name: "处决", slot: "main_weapon" as const, description: "对残血目标增伤" },
  { id: "tenacious", name: "坚韧", slot: "armor" as const, description: "最大生命提高" },
  { id: "guardian", name: "守护", slot: "armor" as const, description: "每波首次受击获得护盾" },
  { id: "thorns", name: "荆棘", slot: "armor" as const, description: "反弹近战伤害" },
  { id: "focus", name: "专注", slot: "amulet" as const, description: "技能冷却缩短" },
  { id: "renewal", name: "复苏", slot: "amulet" as const, description: "波次结束时恢复生命" },
  { id: "precision", name: "精准", slot: "amulet" as const, description: "暴击率提高" },
  { id: "frostbite", name: "霜咬", slot: "main_weapon" as const, description: "普攻有概率使目标移速与攻速降低12%" },
  { id: "snowguard", name: "雪护", slot: "armor" as const, description: "每波开始获得最大生命6%的护盾" },
  { id: "frostfocus", name: "凝霜", slot: "amulet" as const, description: "每波首次主动技能冷却缩短18%" },
  { id: "sandscar", name: "沙痕", slot: "main_weapon" as const, description: "普攻有15%概率使目标防御降低12%，持续2秒" },
  { id: "mirageguard", name: "蜃护", slot: "armor" as const, description: "每波首次低于半血时获得20%减伤，持续3秒" },
  { id: "tailwind", name: "逐风", slot: "amulet" as const, description: "每波开始时移速与攻速提高15%，持续3秒" },
  { id: "thunderbrand", name: "雷铭", slot: "main_weapon" as const, description: "每第4次普攻追加攻击35%的真实伤害" },
  { id: "cloudveil", name: "云障", slot: "armor" as const, description: "每波首次受到致命伤害时保留1点生命并获得最大生命12%的护盾" },
  { id: "stormward", name: "雷佑", slot: "amulet" as const, description: "每波首次施放主动技能时获得最大生命10%的护盾" },
  { id: "bogvenom", name: "沼毒", slot: "main_weapon" as const, description: "普攻有12%概率附加持续伤害" },
  { id: "mireguard", name: "泥护", slot: "armor" as const, description: "每波开始获得最大生命7%的护盾" },
  { id: "fenfocus", name: "萤凝", slot: "amulet" as const, description: "每波首次技能冷却缩短15%" },
  { id: "emberbrand", name: "烬铭", slot: "main_weapon" as const, description: "每第5次普攻追加燃烧真实伤害" },
  { id: "ashplate", name: "灰障", slot: "armor" as const, description: "受击时有概率获得短暂减伤" },
  { id: "cinderfocus", name: "余烬", slot: "amulet" as const, description: "技能伤害提高" },
  { id: "tidemark", name: "潮痕", slot: "main_weapon" as const, description: "普攻有概率降低目标攻速" },
  { id: "saltguard", name: "盐甲", slot: "armor" as const, description: "每波首次受击获得护盾" },
  { id: "seafocus", name: "潮凝", slot: "amulet" as const, description: "暴击伤害提高" },
  { id: "wailbrand", name: "哀铭", slot: "main_weapon" as const, description: "对精英伤害提高" },
  { id: "barrowguard", name: "丘护", slot: "armor" as const, description: "最大生命提高" },
  { id: "gravefocus", name: "墓凝", slot: "amulet" as const, description: "残血增伤提高" },
  { id: "fangbrand", name: "牙铭", slot: "main_weapon" as const, description: "暴击率提高" },
  { id: "stoneguard", name: "岩障", slot: "armor" as const, description: "伤害减免提高" },
  { id: "peakfocus", name: "峰凝", slot: "amulet" as const, description: "全伤害提高" },
  { id: "northbrand", name: "北铭", slot: "main_weapon" as const, description: "普攻速度提高" },
  { id: "gateguard", name: "关障", slot: "armor" as const, description: "每波首次致命伤害保留1生命" },
  { id: "galefocus", name: "风凝", slot: "amulet" as const, description: "技能冷却缩短" },
];

export const TRAIT_DEFINITIONS: readonly TraitDefinition[] = [
  ...CORE_TRAIT_DEFINITIONS,
  ...EXPANDED_TRAIT_DEFINITIONS,
];

export const ITEM_BY_ID = Object.fromEntries(
  ITEM_DEFINITIONS.map((item) => [item.id, item]),
) as Record<string, ItemDefinition>;

export const TRAIT_BY_ID = Object.fromEntries(
  TRAIT_DEFINITIONS.map((trait) => [trait.id, trait]),
) as Record<string, TraitDefinition>;
