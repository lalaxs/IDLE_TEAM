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

const heroCharacters = Object.fromEntries(
  Array.from({ length: 40 }, (_, index) => {
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
    B01: "/assets/characters/enemy-b01.png",
  },
  backgrounds: {
    stages: stageBackgrounds,
    foregrounds: foregroundBackgrounds,
  },
} as const;
