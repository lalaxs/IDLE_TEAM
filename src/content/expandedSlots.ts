/**
 * Ten-slot content expansion: definitions + basic traits for the 7 previously empty slots.
 * Icons are runtime placeholders (copied from existing art); IDs are stable for later art swaps.
 *
 * Keep this module free of imports from `./items` to avoid circular init.
 */

export type ExpandedEquipmentSlot =
  | "off_hand"
  | "helmet"
  | "gloves"
  | "boots"
  | "ring"
  | "bracer"
  | "earring";

type ExpandedItem = {
  id: string;
  name: string;
  slot: ExpandedEquipmentSlot;
  chapter: 1 | 2 | 3 | 4;
  /** Existing equipment id whose webp is copied as placeholder. */
  iconDonor: string;
};

const CH1: ExpandedItem[] = [
  { id: "offhand_oak_buckler", name: "橡木圆盾", slot: "off_hand", chapter: 1, iconDonor: "armor_scale_vest" },
  { id: "offhand_ward_tome", name: "守望册", slot: "off_hand", chapter: 1, iconDonor: "weapon_oak_staff" },
  { id: "offhand_leaf_parry", name: "林叶格挡刃", slot: "off_hand", chapter: 1, iconDonor: "weapon_guard_blade" },
  { id: "offhand_dawn_lantern", name: "晨辉提灯", slot: "off_hand", chapter: 1, iconDonor: "weapon_sun_scepter" },
  { id: "helmet_frontier_cap", name: "边陲皮帽", slot: "helmet", chapter: 1, iconDonor: "armor_travel_cloak" },
  { id: "helmet_scale_coif", name: "青鳞护头", slot: "helmet", chapter: 1, iconDonor: "armor_scale_vest" },
  { id: "helmet_leaf_circlet", name: "林叶环冠", slot: "helmet", chapter: 1, iconDonor: "armor_leaf_robe" },
  { id: "helmet_guard_visor", name: "守望面罩", slot: "helmet", chapter: 1, iconDonor: "armor_guard_mail" },
  { id: "gloves_travel_wraps", name: "远行裹手", slot: "gloves", chapter: 1, iconDonor: "accessory_leaf_charm" },
  { id: "gloves_ranger_grips", name: "林风扳指", slot: "gloves", chapter: 1, iconDonor: "accessory_wind_feather" },
  { id: "gloves_oak_gauntlets", name: "橡木护手", slot: "gloves", chapter: 1, iconDonor: "accessory_rune_stone" },
  { id: "gloves_dawn_cuffs", name: "晨光袖扣", slot: "gloves", chapter: 1, iconDonor: "accessory_sun_ring" },
  { id: "boots_trail_sandals", name: "青径草履", slot: "boots", chapter: 1, iconDonor: "armor_travel_cloak" },
  { id: "boots_scale_treads", name: "青鳞踏靴", slot: "boots", chapter: 1, iconDonor: "armor_scale_vest" },
  { id: "boots_leaf_slippers", name: "林叶软靴", slot: "boots", chapter: 1, iconDonor: "armor_leaf_robe" },
  { id: "boots_guard_greaves", name: "守望胫甲", slot: "boots", chapter: 1, iconDonor: "armor_guard_mail" },
  { id: "ring_moss_band", name: "青苔指环", slot: "ring", chapter: 1, iconDonor: "accessory_sun_ring" },
  { id: "ring_ember_loop", name: "余烬环", slot: "ring", chapter: 1, iconDonor: "accessory_ember_beads" },
  { id: "ring_rune_seal", name: "古纹印戒", slot: "ring", chapter: 1, iconDonor: "accessory_rune_stone" },
  { id: "ring_wind_hoop", name: "迅风环", slot: "ring", chapter: 1, iconDonor: "accessory_wind_feather" },
  { id: "bracer_bark_guard", name: "树皮护腕", slot: "bracer", chapter: 1, iconDonor: "armor_thorn_bark" },
  { id: "bracer_scale_cuff", name: "青鳞腕甲", slot: "bracer", chapter: 1, iconDonor: "armor_scale_vest" },
  { id: "bracer_leaf_band", name: "林叶腕带", slot: "bracer", chapter: 1, iconDonor: "accessory_leaf_charm" },
  { id: "bracer_guard_plate", name: "守望腕铠", slot: "bracer", chapter: 1, iconDonor: "armor_guard_mail" },
  { id: "earring_dew_drop", name: "晨露耳坠", slot: "earring", chapter: 1, iconDonor: "accessory_frost_bell" },
  { id: "earring_leaf_stud", name: "新芽耳钉", slot: "earring", chapter: 1, iconDonor: "accessory_leaf_charm" },
  { id: "earring_raven_hook", name: "暮鸦耳钩", slot: "earring", chapter: 1, iconDonor: "accessory_raven_badge" },
  { id: "earring_storm_bead", name: "雷纹耳珠", slot: "earring", chapter: 1, iconDonor: "accessory_storm_drum" },
];

const CH2: ExpandedItem[] = [
  { id: "offhand_frost_buckler", name: "霜壳圆盾", slot: "off_hand", chapter: 2, iconDonor: "armor_ice_ridge_plate" },
  { id: "offhand_aurora_codex", name: "极光副典", slot: "off_hand", chapter: 2, iconDonor: "weapon_aurora_grimoire" },
  { id: "offhand_snow_lantern", name: "雪原提灯", slot: "off_hand", chapter: 2, iconDonor: "accessory_aurora_vial" },
  { id: "offhand_ice_parry", name: "冰棱格挡刃", slot: "off_hand", chapter: 2, iconDonor: "weapon_frost_fang_saber" },
  { id: "helmet_snow_hood", name: "雪行风帽", slot: "helmet", chapter: 2, iconDonor: "armor_snow_travel_coat" },
  { id: "helmet_ice_visor", name: "冰脊面甲", slot: "helmet", chapter: 2, iconDonor: "armor_ice_ridge_plate" },
  { id: "helmet_aurora_circlet", name: "极光冠环", slot: "helmet", chapter: 2, iconDonor: "armor_aurora_robe" },
  { id: "helmet_frozen_helm", name: "冻土盔", slot: "helmet", chapter: 2, iconDonor: "armor_frozen_earth_pauldron" },
  { id: "gloves_frost_grips", name: "霜咬护手", slot: "gloves", chapter: 2, iconDonor: "accessory_cold_star_pendant" },
  { id: "gloves_aurora_wraps", name: "极光裹腕", slot: "gloves", chapter: 2, iconDonor: "accessory_aurora_vial" },
  { id: "gloves_snow_mitts", name: "雪松手套", slot: "gloves", chapter: 2, iconDonor: "accessory_snowfield_compass" },
  { id: "gloves_ice_cuffs", name: "冻岩腕扣", slot: "gloves", chapter: 2, iconDonor: "accessory_frozen_earth_horn" },
  { id: "boots_snow_tread", name: "雪行靴", slot: "boots", chapter: 2, iconDonor: "armor_snow_travel_coat" },
  { id: "boots_ice_greaves", name: "冰脊胫甲", slot: "boots", chapter: 2, iconDonor: "armor_ice_ridge_plate" },
  { id: "boots_aurora_slippers", name: "极光软靴", slot: "boots", chapter: 2, iconDonor: "armor_aurora_robe" },
  { id: "boots_frozen_steps", name: "冻土踏靴", slot: "boots", chapter: 2, iconDonor: "armor_frozen_earth_pauldron" },
  { id: "ring_cold_star", name: "寒星戒", slot: "ring", chapter: 2, iconDonor: "accessory_cold_star_pendant" },
  { id: "ring_aurora_band", name: "极光环", slot: "ring", chapter: 2, iconDonor: "accessory_aurora_vial" },
  { id: "ring_snow_compass", name: "雪针戒", slot: "ring", chapter: 2, iconDonor: "accessory_snowfield_compass" },
  { id: "ring_frost_horn", name: "霜号戒", slot: "ring", chapter: 2, iconDonor: "accessory_frozen_earth_horn" },
  { id: "bracer_snow_wrap", name: "雪绒护腕", slot: "bracer", chapter: 2, iconDonor: "armor_snow_travel_coat" },
  { id: "bracer_ice_plate", name: "冰脊腕铠", slot: "bracer", chapter: 2, iconDonor: "armor_ice_ridge_plate" },
  { id: "bracer_aurora_cuff", name: "极光腕带", slot: "bracer", chapter: 2, iconDonor: "armor_aurora_robe" },
  { id: "bracer_frozen_guard", name: "冻土护腕", slot: "bracer", chapter: 2, iconDonor: "armor_frozen_earth_pauldron" },
  { id: "earring_cold_star_drop", name: "寒星耳坠", slot: "earring", chapter: 2, iconDonor: "accessory_cold_star_pendant" },
  { id: "earring_aurora_stud", name: "极光耳钉", slot: "earring", chapter: 2, iconDonor: "accessory_aurora_vial" },
  { id: "earring_snow_needle", name: "雪针耳饰", slot: "earring", chapter: 2, iconDonor: "accessory_snowfield_compass" },
  { id: "earring_frost_bead", name: "霜铃耳珠", slot: "earring", chapter: 2, iconDonor: "accessory_frost_bell" },
];

const CH3: ExpandedItem[] = [
  { id: "offhand_dune_buckler", name: "流沙圆盾", slot: "off_hand", chapter: 3, iconDonor: "armor_sunscale_cuirass" },
  { id: "offhand_scarab_tome", name: "圣甲虫副册", slot: "off_hand", chapter: 3, iconDonor: "weapon_scarab_codex" },
  { id: "offhand_sun_lantern", name: "烈日提灯", slot: "off_hand", chapter: 3, iconDonor: "accessory_sundial_disc" },
  { id: "offhand_sand_parry", name: "沙镰格挡刃", slot: "off_hand", chapter: 3, iconDonor: "weapon_dune_crescent_sickle" },
  { id: "helmet_dust_hood", name: "踏尘风帽", slot: "helmet", chapter: 3, iconDonor: "armor_dustwalker_mantle" },
  { id: "helmet_sunscale_helm", name: "烈日鳞盔", slot: "helmet", chapter: 3, iconDonor: "armor_sunscale_cuirass" },
  { id: "helmet_oasis_circlet", name: "绿洲冠环", slot: "helmet", chapter: 3, iconDonor: "armor_oasis_robe" },
  { id: "helmet_ruin_visor", name: "遗迹面甲", slot: "helmet", chapter: 3, iconDonor: "armor_ruin_guard_pauldron" },
  { id: "gloves_dust_grips", name: "踏尘护手", slot: "gloves", chapter: 3, iconDonor: "accessory_scarab_seal" },
  { id: "gloves_sun_cuffs", name: "日轮腕扣", slot: "gloves", chapter: 3, iconDonor: "accessory_sundial_disc" },
  { id: "gloves_sand_wraps", name: "流沙裹手", slot: "gloves", chapter: 3, iconDonor: "accessory_sandglass" },
  { id: "gloves_caravan_mitts", name: "商旅手套", slot: "gloves", chapter: 3, iconDonor: "accessory_caravan_bell" },
  { id: "boots_dust_tread", name: "踏尘靴", slot: "boots", chapter: 3, iconDonor: "armor_dustwalker_mantle" },
  { id: "boots_sunscale_greaves", name: "烈日胫甲", slot: "boots", chapter: 3, iconDonor: "armor_sunscale_cuirass" },
  { id: "boots_oasis_slippers", name: "绿洲软靴", slot: "boots", chapter: 3, iconDonor: "armor_oasis_robe" },
  { id: "boots_ruin_steps", name: "遗迹踏靴", slot: "boots", chapter: 3, iconDonor: "armor_ruin_guard_pauldron" },
  { id: "ring_scarab_band", name: "圣甲虫戒", slot: "ring", chapter: 3, iconDonor: "accessory_scarab_seal" },
  { id: "ring_sundial_loop", name: "日轮环", slot: "ring", chapter: 3, iconDonor: "accessory_sundial_disc" },
  { id: "ring_sandglass", name: "流沙戒", slot: "ring", chapter: 3, iconDonor: "accessory_sandglass" },
  { id: "ring_caravan_bell", name: "驼铃戒", slot: "ring", chapter: 3, iconDonor: "accessory_caravan_bell" },
  { id: "bracer_dust_wrap", name: "踏尘护腕", slot: "bracer", chapter: 3, iconDonor: "armor_dustwalker_mantle" },
  { id: "bracer_sunscale_cuff", name: "烈日腕铠", slot: "bracer", chapter: 3, iconDonor: "armor_sunscale_cuirass" },
  { id: "bracer_oasis_band", name: "绿洲腕带", slot: "bracer", chapter: 3, iconDonor: "armor_oasis_robe" },
  { id: "bracer_ruin_guard", name: "遗迹护腕", slot: "bracer", chapter: 3, iconDonor: "armor_ruin_guard_pauldron" },
  { id: "earring_scarab_drop", name: "圣甲虫耳坠", slot: "earring", chapter: 3, iconDonor: "accessory_scarab_seal" },
  { id: "earring_sun_stud", name: "日轮耳钉", slot: "earring", chapter: 3, iconDonor: "accessory_sundial_disc" },
  { id: "earring_sand_bead", name: "流沙耳珠", slot: "earring", chapter: 3, iconDonor: "accessory_sandglass" },
  { id: "earring_caravan_hook", name: "驼铃耳钩", slot: "earring", chapter: 3, iconDonor: "accessory_caravan_bell" },
];

const CH4: ExpandedItem[] = [
  { id: "offhand_cloud_buckler", name: "云卫圆盾", slot: "off_hand", chapter: 4, iconDonor: "armor_cloudwarden_cloak" },
  { id: "offhand_tempest_tome", name: "苍雷副典", slot: "off_hand", chapter: 4, iconDonor: "weapon_tempest_codex" },
  { id: "offhand_sky_lantern", name: "天穹提灯", slot: "off_hand", chapter: 4, iconDonor: "accessory_skycrystal_prism" },
  { id: "offhand_thunder_parry", name: "雷羽格挡刃", slot: "off_hand", chapter: 4, iconDonor: "weapon_cloudsplitter_glaive" },
  { id: "helmet_cloud_hood", name: "云卫风帽", slot: "helmet", chapter: 4, iconDonor: "armor_cloudwarden_cloak" },
  { id: "helmet_thunder_helm", name: "雷铸盔", slot: "helmet", chapter: 4, iconDonor: "armor_thunderplate_cuirass" },
  { id: "helmet_sky_circlet", name: "天织冠环", slot: "helmet", chapter: 4, iconDonor: "armor_skyweave_robe" },
  { id: "helmet_wing_visor", name: "翼卫面甲", slot: "helmet", chapter: 4, iconDonor: "armor_wingguard_pauldron" },
  { id: "gloves_cloud_grips", name: "云卫护手", slot: "gloves", chapter: 4, iconDonor: "accessory_stormeye_brooch" },
  { id: "gloves_thunder_cuffs", name: "雷羽腕扣", slot: "gloves", chapter: 4, iconDonor: "accessory_thunder_vane" },
  { id: "gloves_sky_wraps", name: "踏云裹手", slot: "gloves", chapter: 4, iconDonor: "accessory_cloudstep_bell" },
  { id: "gloves_prism_mitts", name: "天穹手套", slot: "gloves", chapter: 4, iconDonor: "accessory_skycrystal_prism" },
  { id: "boots_cloud_tread", name: "云卫靴", slot: "boots", chapter: 4, iconDonor: "armor_cloudwarden_cloak" },
  { id: "boots_thunder_greaves", name: "雷铸胫甲", slot: "boots", chapter: 4, iconDonor: "armor_thunderplate_cuirass" },
  { id: "boots_sky_slippers", name: "天织软靴", slot: "boots", chapter: 4, iconDonor: "armor_skyweave_robe" },
  { id: "boots_wing_steps", name: "翼卫踏靴", slot: "boots", chapter: 4, iconDonor: "armor_wingguard_pauldron" },
  { id: "ring_stormeye", name: "风眼戒", slot: "ring", chapter: 4, iconDonor: "accessory_stormeye_brooch" },
  { id: "ring_thunder_vane", name: "雷羽环", slot: "ring", chapter: 4, iconDonor: "accessory_thunder_vane" },
  { id: "ring_cloudstep", name: "踏云戒", slot: "ring", chapter: 4, iconDonor: "accessory_cloudstep_bell" },
  { id: "ring_skycrystal", name: "天穹晶戒", slot: "ring", chapter: 4, iconDonor: "accessory_skycrystal_prism" },
  { id: "bracer_cloud_wrap", name: "云卫护腕", slot: "bracer", chapter: 4, iconDonor: "armor_cloudwarden_cloak" },
  { id: "bracer_thunder_cuff", name: "雷铸腕铠", slot: "bracer", chapter: 4, iconDonor: "armor_thunderplate_cuirass" },
  { id: "bracer_sky_band", name: "天织腕带", slot: "bracer", chapter: 4, iconDonor: "armor_skyweave_robe" },
  { id: "bracer_wing_guard", name: "翼卫护腕", slot: "bracer", chapter: 4, iconDonor: "armor_wingguard_pauldron" },
  { id: "earring_stormeye_drop", name: "风眼耳坠", slot: "earring", chapter: 4, iconDonor: "accessory_stormeye_brooch" },
  { id: "earring_thunder_stud", name: "雷羽耳钉", slot: "earring", chapter: 4, iconDonor: "accessory_thunder_vane" },
  { id: "earring_cloud_bead", name: "踏云耳珠", slot: "earring", chapter: 4, iconDonor: "accessory_cloudstep_bell" },
  { id: "earring_sky_hook", name: "天穹耳钩", slot: "earring", chapter: 4, iconDonor: "accessory_skycrystal_prism" },
];

export const EXPANDED_SLOT_SOURCE = [...CH1, ...CH2, ...CH3, ...CH4] as const;

export const EXPANDED_ITEM_DEFINITIONS = EXPANDED_SLOT_SOURCE.map(({ id, name, slot, chapter }) => ({
  id,
  name,
  slot,
  icon: `/assets/equipment/${id}.webp` as const,
  chapter,
}));

export const EXPANDED_TRAIT_DEFINITIONS = [
  { id: "aegis", name: "御守", slot: "off_hand" as const, description: "每波首次受击获得护盾" },
  { id: "keen", name: "锐目", slot: "helmet" as const, description: "暴击率提高" },
  { id: "fleet", name: "疾手", slot: "gloves" as const, description: "普攻速度提高" },
  { id: "sturdy", name: "稳行", slot: "boots" as const, description: "最大生命提高" },
  { id: "sanguine", name: "饮血", slot: "ring" as const, description: "技能伤害提高" },
  { id: "warding", name: "护脉", slot: "bracer" as const, description: "受到伤害降低" },
  { id: "insight", name: "灵息", slot: "earring" as const, description: "技能冷却缩短" },
] as const;
