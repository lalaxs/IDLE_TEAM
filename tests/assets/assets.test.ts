import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSET_MANIFEST } from "../../src/assets/manifest";
import { getBattleAssetRequests } from "../../src/assets/battleAssets";
import { getBattleBackgroundKeys } from "../../src/content/battleBackgrounds";
import { createDefaultSave } from "../../src/persistence/schema";
import { GameSession } from "../../src/app/GameSession";

describe("runtime character pack", () => {
  it("has a readable file for every hero and enemy", () => {
    const characterAssets = Object.values(ASSET_MANIFEST.characters);
    expect(characterAssets).toHaveLength(236);
    for (const publicPath of characterAssets) {
      const diskPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
      expect(existsSync(diskPath), diskPath).toBe(true);
      if (publicPath.endsWith(".svg")) {
        const source = readFileSync(diskPath, "utf8");
        expect(source).toContain('viewBox="0 0 128 128"');
        expect(source).toContain("<svg");
      } else {
        expect(readFileSync(diskPath).byteLength).toBeGreaterThan(1024);
      }
    }
  });

  it("ships compressed battle backgrounds and foreground occlusions", () => {
    const stagePaths = Object.values(ASSET_MANIFEST.backgrounds.stages);
    const foregroundPaths = Object.values(ASSET_MANIFEST.backgrounds.foregrounds);
    const layeredPaths = Object.values(ASSET_MANIFEST.backgrounds.layerPacks).flatMap((pack) =>
      Object.values(pack),
    );
    const propPaths = Object.values(ASSET_MANIFEST.backgrounds.foregroundProps).flatMap((pack) =>
      Object.values(pack),
    );
    expect(stagePaths).toHaveLength(48);
    expect(foregroundPaths).toHaveLength(12);
    expect(layeredPaths).toHaveLength(120);
    expect(propPaths).toHaveLength(120);
    for (const publicPath of [...stagePaths, ...foregroundPaths, ...layeredPaths, ...propPaths]) {
      const diskPath = resolve(process.cwd(), "public", publicPath.replace(/^\//, ""));
      expect(existsSync(diskPath), diskPath).toBe(true);
      expect(publicPath.endsWith(".webp")).toBe(true);
      expect(readFileSync(diskPath).byteLength).toBeGreaterThan(1024);
    }
  });

  it("maps stage environments onto chapter foreground bands", () => {
    expect(getBattleBackgroundKeys(1)).toEqual({
      stageKey: "stage_01_01",
      foregroundKey: "fg_1_meadow",
      layerPackKey: "qingqiu_meadow_preview",
    });
    expect(getBattleBackgroundKeys(4).layerPackKey).toBe("qingqiu_meadow_preview");
    expect(getBattleBackgroundKeys(5).layerPackKey).toBe("qingqiu_forest");
    expect(getBattleBackgroundKeys(7)).toEqual({
      stageKey: "stage_01_07",
      foregroundKey: "fg_1_forest",
      layerPackKey: "qingqiu_forest",
    });
    expect(getBattleBackgroundKeys(8).layerPackKey).toBe("qingqiu_forest");
    expect(getBattleBackgroundKeys(9).layerPackKey).toBe("qingqiu_ruins");
    expect(getBattleBackgroundKeys(12)).toEqual({
      stageKey: "stage_01_12",
      foregroundKey: "fg_1_ruins",
      layerPackKey: "qingqiu_ruins",
    });
    expect(getBattleBackgroundKeys(13)).toEqual({
      stageKey: "stage_02_01",
      foregroundKey: "fg_2_snowfield",
      layerPackKey: "frostwind_snowfield",
    });
    expect(getBattleBackgroundKeys(16).layerPackKey).toBe("frostwind_snowfield");
    expect(getBattleBackgroundKeys(17).layerPackKey).toBe("frostwind_pinewood");
    expect(getBattleBackgroundKeys(20).layerPackKey).toBe("frostwind_pinewood");
    expect(getBattleBackgroundKeys(21).layerPackKey).toBe("frostwind_aurora_ruins");
    expect(getBattleBackgroundKeys(24)).toEqual({
      stageKey: "stage_02_12",
      foregroundKey: "fg_2_aurora_ruins",
      layerPackKey: "frostwind_aurora_ruins",
    });
    expect(getBattleBackgroundKeys(25)).toEqual({
      stageKey: "stage_03_01",
      foregroundKey: "fg_3_red_dunes",
      layerPackKey: "redsand_dunes",
    });
    expect(getBattleBackgroundKeys(28).layerPackKey).toBe("redsand_dunes");
    expect(getBattleBackgroundKeys(29).layerPackKey).toBe("redsand_wind_canyon");
    expect(getBattleBackgroundKeys(32).layerPackKey).toBe("redsand_wind_canyon");
    expect(getBattleBackgroundKeys(33).layerPackKey).toBe("redsand_sunken_city");
    expect(getBattleBackgroundKeys(36)).toEqual({
      stageKey: "stage_03_12",
      foregroundKey: "fg_3_sunken_city",
      layerPackKey: "redsand_sunken_city",
    });
    expect(getBattleBackgroundKeys(37)).toEqual({
      stageKey: "stage_04_01",
      foregroundKey: "fg_4_cloud_highlands",
      layerPackKey: "thundercliff_highlands",
    });
    expect(getBattleBackgroundKeys(40).layerPackKey).toBe("thundercliff_highlands");
    expect(getBattleBackgroundKeys(41).layerPackKey).toBe("thundercliff_storm_valley");
    expect(getBattleBackgroundKeys(44).layerPackKey).toBe("thundercliff_storm_valley");
    expect(getBattleBackgroundKeys(45).layerPackKey).toBe("thundercliff_citadel");
    expect(getBattleBackgroundKeys(48)).toEqual({
      stageKey: "stage_04_12",
      foregroundKey: "fg_4_sky_city",
      layerPackKey: "thundercliff_citadel",
    });
    expect(getBattleBackgroundKeys(49)).toEqual({
      stageKey: "stage_01_01",
      foregroundKey: "fg_1_meadow",
      layerPackKey: "blackwater_shallows",
    });
    expect(getBattleBackgroundKeys(52).layerPackKey).toBe("blackwater_shallows");
    expect(getBattleBackgroundKeys(53).layerPackKey).toBe("blackwater_wreck_bog");
    expect(getBattleBackgroundKeys(56).layerPackKey).toBe("blackwater_wreck_bog");
    expect(getBattleBackgroundKeys(57).layerPackKey).toBe("blackwater_reed_sanctum");
    expect(getBattleBackgroundKeys(60)).toEqual({
      stageKey: "stage_01_12",
      foregroundKey: "fg_1_ruins",
      layerPackKey: "blackwater_reed_sanctum",
    });
    expect(getBattleBackgroundKeys(61)).toEqual({
      stageKey: "stage_02_01",
      foregroundKey: "fg_2_snowfield",
      layerPackKey: "burning_scorched_frontier",
    });
    expect(getBattleBackgroundKeys(64).layerPackKey).toBe("burning_scorched_frontier");
    expect(getBattleBackgroundKeys(65).layerPackKey).toBe("burning_ember_rift");
    expect(getBattleBackgroundKeys(68).layerPackKey).toBe("burning_ember_rift");
    expect(getBattleBackgroundKeys(69).layerPackKey).toBe("burning_ash_citadel");
    expect(getBattleBackgroundKeys(72)).toEqual({
      stageKey: "stage_02_12",
      foregroundKey: "fg_2_aurora_ruins",
      layerPackKey: "burning_ash_citadel",
    });
    expect(getBattleBackgroundKeys(73)).toEqual({
      stageKey: "stage_03_01",
      foregroundKey: "fg_3_red_dunes",
      layerPackKey: "darktide_salt_reef",
    });
    expect(getBattleBackgroundKeys(76).layerPackKey).toBe("darktide_salt_reef");
    expect(getBattleBackgroundKeys(77).layerPackKey).toBe("darktide_wave_coast");
    expect(getBattleBackgroundKeys(80).layerPackKey).toBe("darktide_wave_coast");
    expect(getBattleBackgroundKeys(81).layerPackKey).toBe("darktide_tide_ruins");
    expect(getBattleBackgroundKeys(84)).toEqual({
      stageKey: "stage_03_12",
      foregroundKey: "fg_3_sunken_city",
      layerPackKey: "darktide_tide_ruins",
    });
    expect(getBattleBackgroundKeys(85)).toEqual({
      stageKey: "stage_04_01",
      foregroundKey: "fg_4_cloud_highlands",
      layerPackKey: "wailing_withered_hills",
    });
    expect(getBattleBackgroundKeys(88).layerPackKey).toBe("wailing_withered_hills");
    expect(getBattleBackgroundKeys(89).layerPackKey).toBe("wailing_old_battlefield");
    expect(getBattleBackgroundKeys(92).layerPackKey).toBe("wailing_old_battlefield");
    expect(getBattleBackgroundKeys(93).layerPackKey).toBe("wailing_barrow_grounds");
    expect(getBattleBackgroundKeys(96)).toEqual({
      stageKey: "stage_04_12",
      foregroundKey: "fg_4_sky_city",
      layerPackKey: "wailing_barrow_grounds",
    });
    expect(getBattleBackgroundKeys(97)).toEqual({
      stageKey: "stage_01_01",
      foregroundKey: "fg_1_meadow",
      layerPackKey: "stonefang_foothills",
    });
    expect(getBattleBackgroundKeys(100).layerPackKey).toBe("stonefang_foothills");
    expect(getBattleBackgroundKeys(101).layerPackKey).toBe("stonefang_crystal_mine");
    expect(getBattleBackgroundKeys(104).layerPackKey).toBe("stonefang_crystal_mine");
    expect(getBattleBackgroundKeys(105).layerPackKey).toBe("stonefang_high_ridge");
    expect(getBattleBackgroundKeys(108)).toEqual({
      stageKey: "stage_01_12",
      foregroundKey: "fg_1_ruins",
      layerPackKey: "stonefang_high_ridge",
    });
    expect(getBattleBackgroundKeys(109)).toEqual({
      stageKey: "stage_02_01",
      foregroundKey: "fg_2_snowfield",
      layerPackKey: "northwind_frost_outpost",
    });
    expect(getBattleBackgroundKeys(112).layerPackKey).toBe("northwind_frost_outpost");
    expect(getBattleBackgroundKeys(113).layerPackKey).toBe("northwind_wall_road");
    expect(getBattleBackgroundKeys(116).layerPackKey).toBe("northwind_wall_road");
    expect(getBattleBackgroundKeys(117).layerPackKey).toBe("northwind_citadel");
    expect(getBattleBackgroundKeys(120)).toEqual({
      stageKey: "stage_02_12",
      foregroundKey: "fg_2_aurora_ruins",
      layerPackKey: "northwind_citadel",
    });
  });

  it("loads only the current party and current stage encounter assets", () => {
    const requests = getBattleAssetRequests(new GameSession(createDefaultSave(1_000), 1).snapshot);
    const keys = new Set(requests.map(({ textureKey }) => textureKey));
    expect(keys.has("character-H35")).toBe(true);
    expect(keys.has("character-E01")).toBe(true);
    expect(keys.has("character-E02")).toBe(true);
    expect(keys.has("character-B04")).toBe(true);
    expect(keys.has("background-stage_01_01")).toBe(true);
    expect(keys.has("background-fg_1_meadow")).toBe(true);
    expect([...keys].some((key) => key.startsWith("character-E1"))).toBe(false);
  });

  it("updates the asset plan for a changed party and stage", () => {
    const snapshot = new GameSession(createDefaultSave(1_000), 99).snapshot;
    const requests = getBattleAssetRequests({
      ...snapshot,
      stage: 4,
      units: [
        {
          ...snapshot.units[0]!,
          sourceId: "H80",
        },
      ],
    });
    const keys = new Set(requests.map(({ textureKey }) => textureKey));
    expect(keys.has("character-H80")).toBe(true);
    expect(keys.has("character-E04")).toBe(true);
    expect(keys.has("character-B04")).toBe(true);
    expect(keys.has("background-stage_01_04")).toBe(true);
    expect(keys.has("character-H01")).toBe(false);
  });

  it("does not create invalid requests for unknown unit ids", () => {
    const snapshot = new GameSession(createDefaultSave(1_000), 7).snapshot;
    const requests = getBattleAssetRequests({
      ...snapshot,
      units: [{ ...snapshot.units[0]!, sourceId: "UNKNOWN" }],
    });
    expect(requests.some(({ textureKey }) => textureKey === "character-UNKNOWN")).toBe(false);
    expect(requests.every(({ path }) => typeof path === "string" && path.length > 0)).toBe(true);
  });

  it("produces unique resolvable battle requests across all stages", () => {
    const snapshot = new GameSession(createDefaultSave(1_000), 7).snapshot;
    for (let stage = 1; stage <= 120; stage += 1) {
      const requests = getBattleAssetRequests({ ...snapshot, stage, seed: stage * 17 });
      const keys = requests.map(({ textureKey }) => textureKey);
      expect(new Set(keys).size, `stage ${stage}`).toBe(keys.length);
      expect(requests.every(({ path }) => path.startsWith("/assets/")), `stage ${stage}`).toBe(true);
    }
  });
});
