/**
 * Diablo Immortal–style legendary powers: fixed per item definition.
 * Shown when rarity >= epic (传奇). Unmapped ids fall back by slot/chapter.
 */

const LEGENDARY_TRAIT_BY_ITEM_ID: Readonly<Record<string, string>> = {
  weapon_guard_blade: "sharp",
  weapon_ranger_bow: "swift",
  weapon_oak_staff: "sharp",
  weapon_storm_hammer: "execute",
  weapon_sun_scepter: "sharp",
  weapon_frost_branch: "swift",
  weapon_raven_blades: "execute",
  weapon_thorn_spear: "swift",
  armor_travel_cloak: "tenacious",
  armor_scale_vest: "guardian",
  armor_guard_mail: "guardian",
  armor_leaf_robe: "tenacious",
  armor_dawn_cuirass: "thorns",
  armor_frost_mantle: "tenacious",
  armor_shadow_tunic: "thorns",
  armor_thorn_bark: "thorns",
  accessory_leaf_charm: "renewal",
  accessory_sun_ring: "precision",
  accessory_rune_stone: "focus",
  accessory_wind_feather: "precision",
  accessory_ember_beads: "focus",
  accessory_frost_bell: "renewal",
  accessory_raven_badge: "precision",
  accessory_storm_drum: "focus",
  weapon_frost_fang_saber: "frostbite",
  weapon_snow_pine_crossbow: "frostbite",
  weapon_aurora_grimoire: "frostbite",
  weapon_frozen_rock_axe: "frostbite",
  armor_snow_travel_coat: "snowguard",
  armor_ice_ridge_plate: "snowguard",
  armor_aurora_robe: "snowguard",
  armor_frozen_earth_pauldron: "snowguard",
  accessory_cold_star_pendant: "frostfocus",
  accessory_aurora_vial: "frostfocus",
  accessory_snowfield_compass: "frostfocus",
  accessory_frozen_earth_horn: "frostfocus",
  weapon_dune_crescent_sickle: "sandscar",
  weapon_sunshot_bow: "sandscar",
  weapon_scarab_codex: "sandscar",
  weapon_roadwarden_mace: "sandscar",
  armor_dustwalker_mantle: "mirageguard",
  armor_sunscale_cuirass: "mirageguard",
  armor_oasis_robe: "mirageguard",
  armor_ruin_guard_pauldron: "mirageguard",
  accessory_scarab_seal: "tailwind",
  accessory_sundial_disc: "tailwind",
  accessory_sandglass: "tailwind",
  accessory_caravan_bell: "tailwind",
  weapon_cloudsplitter_glaive: "thunderbrand",
  weapon_thunderwing_crossbow: "thunderbrand",
  weapon_skyspire_staff: "thunderbrand",
  weapon_tempest_codex: "thunderbrand",
  armor_cloudwarden_cloak: "cloudveil",
  armor_thunderplate_cuirass: "cloudveil",
  armor_skyweave_robe: "cloudveil",
  armor_wingguard_pauldron: "cloudveil",
  accessory_stormeye_brooch: "stormward",
  accessory_thunder_vane: "stormward",
  accessory_cloudstep_bell: "stormward",
  accessory_skycrystal_prism: "stormward",
};

const SLOT_FALLBACK: Record<string, string> = {
  off_hand: "aegis",
  helmet: "keen",
  gloves: "fleet",
  boots: "sturdy",
  ring: "sanguine",
  bracer: "warding",
  earring: "insight",
};

const CHAPTER_WEAPON: Record<number, string> = {
  5: "bogvenom",
  6: "emberbrand",
  7: "tidemark",
  8: "wailbrand",
  9: "fangbrand",
  10: "northbrand",
};
const CHAPTER_ARMOR: Record<number, string> = {
  5: "mireguard",
  6: "ashplate",
  7: "saltguard",
  8: "barrowguard",
  9: "stoneguard",
  10: "gateguard",
};
const CHAPTER_AMULET: Record<number, string> = {
  5: "fenfocus",
  6: "cinderfocus",
  7: "seafocus",
  8: "gravefocus",
  9: "peakfocus",
  10: "galefocus",
};

function detectSlot(definitionId: string): string | null {
  if (definitionId.startsWith("weapon_") || definitionId.startsWith("main_weapon")) return "main_weapon";
  if (definitionId.startsWith("armor_") || definitionId.includes("_armor") || /set_.*_armor$/.test(definitionId))
    return "armor";
  if (definitionId.startsWith("accessory_") || definitionId.startsWith("amulet_") || /_amulet$/.test(definitionId))
    return "amulet";
  for (const slot of Object.keys(SLOT_FALLBACK)) {
    if (definitionId.startsWith(`${slot}_`) || definitionId.endsWith(`_${slot}`) || definitionId.includes(`_${slot}_`)) {
      return slot;
    }
  }
  if (definitionId.includes("off_hand") || definitionId.startsWith("offhand_")) return "off_hand";
  return null;
}

function detectChapter(definitionId: string): number {
  const match = definitionId.match(/_ch(\d+)_/);
  if (match) return Number(match[1]);
  if (definitionId.includes("set_moss_crown")) return 5;
  if (definitionId.includes("set_frost_bite")) return 6;
  if (definitionId.includes("set_sand_scar")) return 7;
  if (definitionId.includes("set_storm_tide")) return 8;
  return 0;
}

function fallbackTrait(definitionId: string): string | null {
  const slot = detectSlot(definitionId);
  if (!slot) return null;
  if (SLOT_FALLBACK[slot]) return SLOT_FALLBACK[slot]!;
  const chapter = detectChapter(definitionId);
  if (slot === "main_weapon") return CHAPTER_WEAPON[chapter] ?? "sharp";
  if (slot === "armor") return CHAPTER_ARMOR[chapter] ?? "tenacious";
  if (slot === "amulet") return CHAPTER_AMULET[chapter] ?? "focus";
  return null;
}

/** Seed expanded-slot Ch1–4 ids into the fixed map at module load. */
function expandLegacyMap(): Record<string, string> {
  const map: Record<string, string> = { ...LEGENDARY_TRAIT_BY_ITEM_ID };
  const prefixes: Array<[string, string]> = [
    ["offhand_", "aegis"],
    ["helmet_", "keen"],
    ["gloves_", "fleet"],
    ["boots_", "sturdy"],
    ["ring_", "sanguine"],
    ["bracer_", "warding"],
    ["earring_", "insight"],
  ];
  // Known expanded ids are already listed historically; keep map for explicit Ch1–4 donors.
  // Fallback covers anything missing.
  void prefixes;
  return map;
}

const RESOLVED_MAP = expandLegacyMap();

export function getLegendaryTraitId(definitionId: string): string | null {
  return RESOLVED_MAP[definitionId] ?? fallbackTrait(definitionId);
}

export { LEGENDARY_TRAIT_BY_ITEM_ID };
