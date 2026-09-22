import type { ChapterId } from "./chapters";

export interface ChapterAtmosphereDefinition {
  layers: readonly string[];
}

export const CHAPTER_ATMOSPHERES: Record<ChapterId, ChapterAtmosphereDefinition> = {
  1: { layers: ["/assets/backgrounds/stages/stage_01_06.webp"] },
  2: { layers: ["/assets/backgrounds/stages/stage_02_06.webp"] },
  3: { layers: ["/assets/backgrounds/stages/stage_03_06.webp"] },
  4: { layers: ["/assets/backgrounds/stages/stage_04_06.webp"] },
  5: {
    layers: [
      "/assets/backgrounds/roads/runtime/blackwater_shallows/sky.webp",
      "/assets/backgrounds/roads/runtime/blackwater_shallows/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/blackwater_shallows/rear_v02.webp",
    ],
  },
  6: {
    layers: [
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/sky.webp",
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/burning_scorched_frontier/rear_v01.webp",
    ],
  },
  7: {
    layers: [
      "/assets/backgrounds/roads/runtime/darktide_salt_reef/sky.webp",
      "/assets/backgrounds/roads/runtime/darktide_wave_coast/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/darktide_wave_coast/rear_v01.webp",
    ],
  },
  8: {
    layers: [
      "/assets/backgrounds/roads/runtime/wailing_withered_hills/sky.webp",
      "/assets/backgrounds/roads/runtime/wailing_old_battlefield/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/wailing_old_battlefield/rear_v01.webp",
    ],
  },
  9: {
    layers: [
      "/assets/backgrounds/roads/runtime/stonefang_foothills/sky.webp",
      "/assets/backgrounds/roads/runtime/stonefang_foothills/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/stonefang_foothills/rear_v01.webp",
    ],
  },
  10: {
    layers: [
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/sky.webp",
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/distant_v01.webp",
      "/assets/backgrounds/roads/runtime/northwind_frost_outpost/rear_v01.webp",
    ],
  },
};
