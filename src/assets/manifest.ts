import type { HeroId } from "../simulation/types";

const stageBackgrounds = Object.fromEntries(
  Array.from({ length: 4 }, (_, chapterIndex) =>
    Array.from({ length: 12 }, (_, stageIndex) => {
      const chapter = String(chapterIndex + 1).padStart(2, "0");
      const stage = String(stageIndex + 1).padStart(2, "0");
      const key = `stage_${chapter}_${stage}`;
      return [key, `/assets/backgrounds/stages/${key}.webp`] as const;
    }),
  ).flat(),
);

const foregroundBackgrounds = {
  fg_1_meadow: "/assets/backgrounds/foreground/fg_1_meadow.webp",
  fg_1_forest: "/assets/backgrounds/foreground/fg_1_forest.webp",
  fg_1_ruins: "/assets/backgrounds/foreground/fg_1_ruins.webp",
  fg_2_snowfield: "/assets/backgrounds/foreground/fg_2_snowfield.webp",
  fg_2_pinewood: "/assets/backgrounds/foreground/fg_2_pinewood.webp",
  fg_2_aurora_ruins: "/assets/backgrounds/foreground/fg_2_aurora_ruins.webp",
  fg_3_red_dunes: "/assets/backgrounds/foreground/fg_3_red_dunes.webp",
  fg_3_wind_canyon: "/assets/backgrounds/foreground/fg_3_wind_canyon.webp",
  fg_3_sunken_city: "/assets/backgrounds/foreground/fg_3_sunken_city.webp",
  fg_4_cloud_highlands: "/assets/backgrounds/foreground/fg_4_cloud_highlands.webp",
  fg_4_floating_valley: "/assets/backgrounds/foreground/fg_4_floating_valley.webp",
  fg_4_sky_city: "/assets/backgrounds/foreground/fg_4_sky_city.webp",
} as const;

const layeredBackgrounds = {
  qingqiu_meadow_preview: {
    sky: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/distant.webp",
    rear: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/rear_v03.webp",
    road: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/road_v08.webp",
  },
  qingqiu_forest: {
    sky: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/qingqiu_forest/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/qingqiu_forest/rear_v02.webp",
    road: "/assets/backgrounds/roads/runtime/qingqiu_forest/road_v04.webp",
  },
  qingqiu_ruins: {
    sky: "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/qingqiu_ruins/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/qingqiu_ruins/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/qingqiu_ruins/road_v03.webp",
  },
  frostwind_snowfield: {
    sky: "/assets/backgrounds/roads/runtime/frostwind_snowfield/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/frostwind_snowfield/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/frostwind_snowfield/rear_v02.webp",
    road: "/assets/backgrounds/roads/runtime/frostwind_snowfield/road_v01.webp",
  },
  frostwind_pinewood: {
    sky: "/assets/backgrounds/roads/runtime/frostwind_snowfield/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/frostwind_pinewood/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/frostwind_pinewood/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/frostwind_pinewood/road_v01.webp",
  },
  frostwind_aurora_ruins: {
    sky: "/assets/backgrounds/roads/runtime/frostwind_snowfield/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/frostwind_aurora_ruins/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/frostwind_aurora_ruins/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/frostwind_aurora_ruins/road_v01.webp",
  },
  redsand_dunes: {
    sky: "/assets/backgrounds/roads/runtime/redsand_dunes/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/redsand_dunes/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/redsand_dunes/rear_v05.webp",
    road: "/assets/backgrounds/roads/runtime/redsand_dunes/road_v01.webp",
  },
  redsand_wind_canyon: {
    sky: "/assets/backgrounds/roads/runtime/redsand_dunes/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/redsand_wind_canyon/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/redsand_wind_canyon/rear_v02.webp",
    road: "/assets/backgrounds/roads/runtime/redsand_wind_canyon/road_v01.webp",
  },
  redsand_sunken_city: {
    sky: "/assets/backgrounds/roads/runtime/redsand_dunes/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/redsand_sunken_city/distant_v02.webp",
    rear: "/assets/backgrounds/roads/runtime/redsand_sunken_city/rear_v04.webp",
    road: "/assets/backgrounds/roads/runtime/redsand_sunken_city/road_v01.webp",
  },
  thundercliff_highlands: {
    sky: "/assets/backgrounds/roads/runtime/thundercliff_highlands/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/thundercliff_highlands/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/thundercliff_highlands/rear_v04.webp",
    road: "/assets/backgrounds/roads/runtime/thundercliff_highlands/road_v01.webp",
  },
  thundercliff_storm_valley: {
    sky: "/assets/backgrounds/roads/runtime/thundercliff_highlands/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/thundercliff_storm_valley/distant_v04.webp",
    rear: "/assets/backgrounds/roads/runtime/thundercliff_storm_valley/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/thundercliff_storm_valley/road_v01.webp",
  },
  thundercliff_citadel: {
    sky: "/assets/backgrounds/roads/runtime/thundercliff_highlands/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/thundercliff_citadel/distant_v03.webp",
    rear: "/assets/backgrounds/roads/runtime/thundercliff_citadel/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/thundercliff_citadel/road_v01.webp",
  },
  blackwater_shallows: {
    sky: "/assets/backgrounds/roads/runtime/blackwater_shallows/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/blackwater_shallows/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/blackwater_shallows/rear_v02.webp",
    road: "/assets/backgrounds/roads/runtime/blackwater_shallows/road_v01.webp",
  },
  blackwater_wreck_bog: {
    sky: "/assets/backgrounds/roads/runtime/blackwater_shallows/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/blackwater_wreck_bog/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/blackwater_wreck_bog/rear_v03.webp",
    road: "/assets/backgrounds/roads/runtime/blackwater_wreck_bog/road_v01.webp",
  },
  blackwater_reed_sanctum: {
    sky: "/assets/backgrounds/roads/runtime/blackwater_shallows/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/blackwater_reed_sanctum/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/blackwater_reed_sanctum/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/blackwater_reed_sanctum/road_v01.webp",
  },
  burning_scorched_frontier: {
    sky: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/road_v01.webp",
  },
  burning_ember_rift: {
    sky: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/burning_ember_rift/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/burning_ember_rift/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/burning_ember_rift/road_v01.webp",
  },
  burning_ash_citadel: {
    sky: "/assets/backgrounds/roads/runtime/burning_scorched_frontier/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/burning_ash_citadel/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/burning_ash_citadel/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/burning_ash_citadel/road_v01.webp",
  },
  darktide_salt_reef: {
    sky: "/assets/backgrounds/roads/runtime/darktide_salt_reef/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/darktide_salt_reef/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/darktide_salt_reef/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/darktide_salt_reef/road_v01.webp",
  },
  darktide_wave_coast: {
    sky: "/assets/backgrounds/roads/runtime/darktide_salt_reef/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/darktide_wave_coast/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/darktide_wave_coast/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/darktide_wave_coast/road_v01.webp",
  },
  darktide_tide_ruins: {
    sky: "/assets/backgrounds/roads/runtime/darktide_salt_reef/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/darktide_tide_ruins/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/darktide_tide_ruins/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/darktide_tide_ruins/road_v01.webp",
  },
  wailing_withered_hills: {
    sky: "/assets/backgrounds/roads/runtime/wailing_withered_hills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/wailing_withered_hills/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/wailing_withered_hills/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/wailing_withered_hills/road_v01.webp",
  },
  wailing_old_battlefield: {
    sky: "/assets/backgrounds/roads/runtime/wailing_withered_hills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/wailing_old_battlefield/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/wailing_old_battlefield/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/wailing_old_battlefield/road_v01.webp",
  },
  wailing_barrow_grounds: {
    sky: "/assets/backgrounds/roads/runtime/wailing_withered_hills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/wailing_barrow_grounds/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/wailing_barrow_grounds/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/wailing_barrow_grounds/road_v01.webp",
  },
  stonefang_foothills: {
    sky: "/assets/backgrounds/roads/runtime/stonefang_foothills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/stonefang_foothills/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/stonefang_foothills/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/stonefang_foothills/road_v01.webp",
  },
  stonefang_crystal_mine: {
    sky: "/assets/backgrounds/roads/runtime/stonefang_foothills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/stonefang_crystal_mine/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/stonefang_crystal_mine/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/stonefang_crystal_mine/road_v01.webp",
  },
  stonefang_high_ridge: {
    sky: "/assets/backgrounds/roads/runtime/stonefang_foothills/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/stonefang_high_ridge/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/stonefang_high_ridge/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/stonefang_high_ridge/road_v01.webp",
  },
  northwind_frost_outpost: {
    sky: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/road_v01.webp",
  },
  northwind_wall_road: {
    sky: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/northwind_wall_road/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/northwind_wall_road/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/northwind_wall_road/road_v01.webp",
  },
  northwind_citadel: {
    sky: "/assets/backgrounds/roads/runtime/northwind_frost_outpost/sky.webp",
    distant: "/assets/backgrounds/roads/runtime/northwind_citadel/distant_v01.webp",
    rear: "/assets/backgrounds/roads/runtime/northwind_citadel/rear_v01.webp",
    road: "/assets/backgrounds/roads/runtime/northwind_citadel/road_v01.webp",
  },
} as const;

const layeredForegroundProps = {
  qingqiu_meadow_preview: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/grass_clump_v03.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/shrub_clump_v03.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/stone_cluster_v03.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/mushroom_cluster_v03.webp",
  },
  qingqiu_forest: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_forest/foreground/forest_fern_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_forest/foreground/forest_root_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/stone_cluster_v03.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/mushroom_cluster_v03.webp",
  },
  qingqiu_ruins: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_ruins/foreground/ruins_stele_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/qingqiu_ruins/foreground/ruins_vine_column_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/stone_cluster_v03.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/qingqiu_meadow_preview/foreground/mushroom_cluster_v03.webp",
  },
  frostwind_snowfield: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/snowfield_hardy_grass_snowbank_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_frozen_grass_ice_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_snow_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/snowfield_frost_rock_stump_clump_v01.webp",
  },
  frostwind_pinewood: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/frostwind_pinewood/foreground/pinewood_drooping_pine_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/frostwind_pinewood/foreground/pinewood_snow_root_log_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_snow_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_frozen_grass_ice_clump_v01.webp",
  },
  frostwind_aurora_ruins: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/frostwind_aurora_ruins/foreground/aurora_ruins_frost_stone_ice_ridge_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/frostwind_aurora_ruins/foreground/aurora_ruins_frozen_leaf_ice_shell_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_snow_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/frostwind_snowfield/foreground/frostwind_frozen_grass_ice_clump_v01.webp",
  },
  redsand_dunes: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_dry_grass_leaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_dunes_windpressed_grass_sand_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_weathered_sandstone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_dunes_blank_waystone_rock_clump_v01.webp",
  },
  redsand_wind_canyon: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/redsand_wind_canyon/foreground/redsand_canyon_dead_branch_broadleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/redsand_wind_canyon/foreground/redsand_canyon_layered_rock_sage_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_weathered_sandstone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_dry_grass_leaf_clump_v01.webp",
  },
  redsand_sunken_city: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/redsand_sunken_city/foreground/redsand_sunken_city_darkleaf_copper_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/redsand_sunken_city/foreground/redsand_sunken_city_sandstone_wall_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_weathered_sandstone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/redsand_dunes/foreground/redsand_dry_grass_leaf_clump_v01.webp",
  },
  thundercliff_highlands: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_wind_grass_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_highlands_mint_flower_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_round_storm_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_highlands_limestone_grass_clump_v01.webp",
  },
  thundercliff_storm_valley: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_storm_valley/foreground/thundercliff_storm_valley_slate_sage_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_storm_valley/foreground/thundercliff_storm_valley_root_plank_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_round_storm_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_wind_grass_clump_v01.webp",
  },
  thundercliff_citadel: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_citadel/foreground/thundercliff_citadel_white_stone_darkleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/thundercliff_citadel/foreground/thundercliff_citadel_copper_vane_plinth_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_round_storm_rock_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/thundercliff_highlands/foreground/thundercliff_wind_grass_clump_v01.webp",
  },
  blackwater_shallows: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_low_reed_broadleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_shallows_reed_bank_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_mossy_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_shallows_driftwood_wetstone_clump_v01.webp",
  },
  blackwater_wreck_bog: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_low_reed_broadleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/blackwater_wreck_bog/foreground/blackwater_wreck_bog_mosswood_fern_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_mossy_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_wreck_bog/foreground/blackwater_wreck_bog_reedroot_wetleaf_clump_v01.webp",
  },
  blackwater_reed_sanctum: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_low_reed_broadleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/blackwater_reed_sanctum/foreground/blackwater_reed_sanctum_dark_reed_root_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_shallows/foreground/blackwater_mossy_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/blackwater_reed_sanctum/foreground/blackwater_reed_sanctum_wreck_rib_mossstone_clump_v01.webp",
  },
  burning_scorched_frontier: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_scorched_frontier_chargrass_dryleaf_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_scorched_frontier_stump_blackrock_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_round_blackrock_chargrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_low_slagstone_clump_v01.webp",
  },
  burning_ember_rift: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_low_slagstone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/burning_ember_rift/foreground/burning_ember_rift_hardgrass_rock_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_round_blackrock_chargrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/burning_ember_rift/foreground/burning_ember_rift_slagvent_root_clump_v01.webp",
  },
  burning_ash_citadel: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_low_slagstone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/burning_ash_citadel/foreground/burning_ash_citadel_brazier_wall_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/foreground/burning_round_blackrock_chargrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/burning_ash_citadel/foreground/burning_ash_citadel_flagbase_stone_clump_v02.webp",
  },
  darktide_salt_reef: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_low_seagrass_shellstone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_salt_reef_broadleaf_stone_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_waveworn_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_salt_reef_anchor_rope_clump_v02.webp",
  },
  darktide_wave_coast: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/darktide_wave_coast/foreground/darktide_wave_coast_windgrass_rock_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/darktide_wave_coast/foreground/darktide_wave_coast_tidepool_rock_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_waveworn_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_low_seagrass_shellstone_clump_v01.webp",
  },
  darktide_tide_ruins: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/darktide_tide_ruins/foreground/darktide_tide_ruins_broadseaweed_stone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/darktide_tide_ruins/foreground/darktide_tide_ruins_column_stone_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_waveworn_round_stone_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/foreground/darktide_low_seagrass_shellstone_clump_v01.webp",
  },
  wailing_withered_hills: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_withered_hills_thistle_grass_stone_clump_v02.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_withered_hills_stump_palerock_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_cold_roundstone_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_pale_weathered_rock_drygrass_clump_v02.webp",
  },
  wailing_old_battlefield: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/wailing_old_battlefield/foreground/wailing_old_battlefield_banner_shield_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/wailing_old_battlefield/foreground/wailing_old_battlefield_wheel_woodgrass_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_cold_roundstone_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_pale_weathered_rock_drygrass_clump_v02.webp",
  },
  wailing_barrow_grounds: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/wailing_barrow_grounds/foreground/wailing_barrow_grounds_stele_thornstone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/wailing_barrow_grounds/foreground/wailing_barrow_grounds_arch_moundstone_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_cold_roundstone_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/foreground/wailing_pale_weathered_rock_drygrass_clump_v02.webp",
  },
  stonefang_foothills: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_foothills_fangrock_alpinegrass_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_foothills_lamppost_rock_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_round_granite_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_pale_fangrock_lowleaf_clump_v01.webp",
  },
  stonefang_crystal_mine: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/stonefang_crystal_mine/foreground/stonefang_crystal_mine_crystalrock_clump_v02.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/stonefang_crystal_mine/foreground/stonefang_crystal_mine_timber_stone_clump_v02.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_round_granite_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_pale_fangrock_lowleaf_clump_v01.webp",
  },
  stonefang_high_ridge: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/stonefang_high_ridge/foreground/stonefang_high_ridge_fangstone_windgrass_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/stonefang_high_ridge/foreground/stonefang_high_ridge_gateplinth_stone_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_round_granite_shortgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/stonefang_foothills/foreground/stonefang_pale_fangrock_lowleaf_clump_v01.webp",
  },
  northwind_frost_outpost: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_frost_outpost_lowpalisade_stone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_frost_outpost_shortflag_woodbase_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_froststeel_roundrock_windgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_snowbank_darkborderstone_clump_v01.webp",
  },
  northwind_wall_road: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/northwind_wall_road/foreground/northwind_wall_road_frostwall_stone_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/northwind_wall_road/foreground/northwind_wall_road_low_barricade_ironpost_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_froststeel_roundrock_windgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_snowbank_darkborderstone_clump_v01.webp",
  },
  northwind_citadel: {
    grass_clump:
      "/assets/backgrounds/roads/runtime/northwind_citadel/foreground/northwind_citadel_fortress_base_clump_v01.webp",
    shrub_clump:
      "/assets/backgrounds/roads/runtime/northwind_citadel/foreground/northwind_citadel_extinguished_brazier_stone_clump_v01.webp",
    stone_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_froststeel_roundrock_windgrass_clump_v01.webp",
    mushroom_cluster:
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/foreground/northwind_snowbank_darkborderstone_clump_v01.webp",
  },
} as const;

const heroCharacters = Object.fromEntries(
  Array.from({ length: 80 }, (_, index) => {
    const id = `H${String(index + 1).padStart(2, "0")}` as HeroId;
    const file = `hero-h${String(index + 1).padStart(2, "0")}.webp`;
    return [id, `/assets/characters/${file}`] as const;
  }),
) as Record<HeroId, string>;

export const ASSET_MANIFEST = {
  characters: {
    ...heroCharacters,
    E01: "/assets/characters/enemy-e01.png",
    E02: "/assets/characters/enemy-e02.png",
    E03: "/assets/characters/enemy-e03.png",
    E04: "/assets/characters/enemy-e04.png",
    E05: "/assets/characters/enemy-e05.png",
    E06: "/assets/characters/enemy-e06.png",
    E07: "/assets/characters/enemy-e07.png",
    E08: "/assets/characters/enemy-e08.png",
    E09: "/assets/characters/enemy-e09.png",
    E10: "/assets/characters/enemy-e10.png",
    E11: "/assets/characters/enemy-e11.png",
    E12: "/assets/characters/enemy-e12.png",
    E13: "/assets/characters/enemy-e13.png",
    E14: "/assets/characters/enemy-e14.png",
    E15: "/assets/characters/enemy-e15.png",
    E16: "/assets/characters/enemy-e16.png",
    E17: "/assets/characters/enemy-e17.png",
    E18: "/assets/characters/enemy-e18.png",
    E19: "/assets/characters/enemy-e19.png",
    E20: "/assets/characters/enemy-e20.png",
    E21: "/assets/characters/enemy-e21.png",
    E22: "/assets/characters/enemy-e22.png",
    E23: "/assets/characters/enemy-e23.png",
    E24: "/assets/characters/enemy-e24.png",
    E25: "/assets/characters/enemy-e25.png",
    E26: "/assets/characters/enemy-e26.png",
    E27: "/assets/characters/enemy-e27.png",
    E28: "/assets/characters/enemy-e28.png",
    E29: "/assets/characters/enemy-e29.png",
    E30: "/assets/characters/enemy-e30.png",
    E31: "/assets/characters/enemy-e31.png",
    E32: "/assets/characters/enemy-e32.png",
    E33: "/assets/characters/enemy-e33.png",
    E34: "/assets/characters/enemy-e34.png",
    E35: "/assets/characters/enemy-e35.png",
    E36: "/assets/characters/enemy-e36.png",
    E37: "/assets/characters/enemy-e37.png",
    E38: "/assets/characters/enemy-e38.png",
    E39: "/assets/characters/enemy-e39.png",
    E40: "/assets/characters/enemy-e40.png",
    E41: "/assets/characters/enemy-e41.png",
    E42: "/assets/characters/enemy-e42.png",
    E43: "/assets/characters/enemy-e43.png",
    E44: "/assets/characters/enemy-e44.png",
    E45: "/assets/characters/enemy-e45.png",
    E46: "/assets/characters/enemy-e46.png",
    E47: "/assets/characters/enemy-e47.png",
    E48: "/assets/characters/enemy-e48.png",
    E49: "/assets/characters/enemy-e49.png",
    E50: "/assets/characters/enemy-e50.png",
    E51: "/assets/characters/enemy-e51.png",
    E52: "/assets/characters/enemy-e52.png",
    E53: "/assets/characters/enemy-e53.png",
    E54: "/assets/characters/enemy-e54.png",
    E55: "/assets/characters/enemy-e55.png",
    E56: "/assets/characters/enemy-e56.png",
    E57: "/assets/characters/enemy-e57.png",
    E58: "/assets/characters/enemy-e58.png",
    E59: "/assets/characters/enemy-e59.png",
    E60: "/assets/characters/enemy-e60.png",
    E61: "/assets/characters/enemy-e61.png",
    E62: "/assets/characters/enemy-e62.png",
    E63: "/assets/characters/enemy-e63.png",
    E64: "/assets/characters/enemy-e64.png",
    E65: "/assets/characters/enemy-e65.png",
    E66: "/assets/characters/enemy-e66.png",
    E67: "/assets/characters/enemy-e67.png",
    E68: "/assets/characters/enemy-e68.png",
    E69: "/assets/characters/enemy-e69.png",
    E70: "/assets/characters/enemy-e70.png",
    E71: "/assets/characters/enemy-e71.png",
    E72: "/assets/characters/enemy-e72.png",
    E73: "/assets/characters/enemy-e73.png",
    E74: "/assets/characters/enemy-e74.png",
    E75: "/assets/characters/enemy-e75.png",
    E76: "/assets/characters/enemy-e76.png",
    E77: "/assets/characters/enemy-e77.png",
    E78: "/assets/characters/enemy-e78.png",
    E79: "/assets/characters/enemy-e79.png",
    E80: "/assets/characters/enemy-e80.png",
    E81: "/assets/characters/enemy-e81.png",
    E82: "/assets/characters/enemy-e82.png",
    E83: "/assets/characters/enemy-e83.png",
    E84: "/assets/characters/enemy-e84.png",
    E85: "/assets/characters/enemy-e85.png",
    E86: "/assets/characters/enemy-e86.png",
    E87: "/assets/characters/enemy-e87.png",
    E88: "/assets/characters/enemy-e88.png",
    E89: "/assets/characters/enemy-e89.png",
    E90: "/assets/characters/enemy-e90.png",
    E91: "/assets/characters/enemy-e91.png",
    E92: "/assets/characters/enemy-e92.png",
    E93: "/assets/characters/enemy-e93.png",
    E94: "/assets/characters/enemy-e94.png",
    E95: "/assets/characters/enemy-e95.png",
    E96: "/assets/characters/enemy-e96.png",
    E97: "/assets/characters/enemy-e97.png",
    E98: "/assets/characters/enemy-e98.png",
    E99: "/assets/characters/enemy-e99.png",
    E100: "/assets/characters/enemy-e100.png",
    E101: "/assets/characters/enemy-e101.png",
    E102: "/assets/characters/enemy-e102.png",
    E103: "/assets/characters/enemy-e103.png",
    E104: "/assets/characters/enemy-e104.png",
    E105: "/assets/characters/enemy-e105.png",
    E106: "/assets/characters/enemy-e106.png",
    E107: "/assets/characters/enemy-e107.png",
    E108: "/assets/characters/enemy-e108.png",
    E109: "/assets/characters/enemy-e109.png",
    E110: "/assets/characters/enemy-e110.png",
    E111: "/assets/characters/enemy-e111.png",
    E112: "/assets/characters/enemy-e112.png",
    E113: "/assets/characters/enemy-e113.png",
    E114: "/assets/characters/enemy-e114.png",
    E115: "/assets/characters/enemy-e115.png",
    E116: "/assets/characters/enemy-e116.png",
    E117: "/assets/characters/enemy-e117.png",
    E118: "/assets/characters/enemy-e118.png",
    E119: "/assets/characters/enemy-e119.png",
    E120: "/assets/characters/enemy-e120.png",
    B01: "/assets/characters/enemy-b01.png",
    B02: "/assets/characters/enemy-b02.png",
    B03: "/assets/characters/enemy-b03.png",
    B04: "/assets/characters/enemy-b04.png",
    B05: "/assets/characters/enemy-b05.png",
    B06: "/assets/characters/enemy-b06.png",
    B07: "/assets/characters/enemy-b07.png",
    B08: "/assets/characters/enemy-b08.png",
    B12: "/assets/characters/enemy-b12.png",
    B16: "/assets/characters/enemy-b16.png",
    B20: "/assets/characters/enemy-b20.png",
    B24: "/assets/characters/enemy-b24.png",
    B28: "/assets/characters/enemy-b28.png",
    B32: "/assets/characters/enemy-b32.png",
    B36: "/assets/characters/enemy-b36.png",
    B40: "/assets/characters/enemy-b40.png",
    B44: "/assets/characters/enemy-b44.png",
    B48: "/assets/characters/enemy-b48.png",
    B52: "/assets/characters/enemy-b52.png",
    B56: "/assets/characters/enemy-b56.png",
    B60: "/assets/characters/enemy-b60.png",
    B64: "/assets/characters/enemy-b64.png",
    B68: "/assets/characters/enemy-b68.png",
    B72: "/assets/characters/enemy-b72.png",
    B76: "/assets/characters/enemy-b76.png",
    B80: "/assets/characters/enemy-b80.png",
    B84: "/assets/characters/enemy-b84.png",
    B88: "/assets/characters/enemy-b88.png",
    B92: "/assets/characters/enemy-b92.png",
    B96: "/assets/characters/enemy-b96.png",
    B100: "/assets/characters/enemy-b100.png",
    B104: "/assets/characters/enemy-b104.png",
    B108: "/assets/characters/enemy-b108.png",
    B112: "/assets/characters/enemy-b112.png",
    B116: "/assets/characters/enemy-b116.png",
    B120: "/assets/characters/enemy-b120.png",
  },
  backgrounds: {
    stages: stageBackgrounds,
    foregrounds: foregroundBackgrounds,
    layerPacks: layeredBackgrounds,
    foregroundProps: layeredForegroundProps,
  },
} as const;
