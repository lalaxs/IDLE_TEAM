import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSET_MANIFEST } from "../../src/assets/manifest";
import { getBattleBackgroundKeys } from "../../src/content/battleBackgrounds";

describe("runtime character pack", () => {
  it("has a readable file for every hero and enemy", () => {
    const characterAssets = Object.values(ASSET_MANIFEST.characters);
    expect(characterAssets).toHaveLength(96);
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
    expect(stagePaths).toHaveLength(48);
    expect(foregroundPaths).toHaveLength(12);
    for (const publicPath of [...stagePaths, ...foregroundPaths]) {
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
    });
    expect(getBattleBackgroundKeys(7)).toEqual({
      stageKey: "stage_01_07",
      foregroundKey: "fg_1_forest",
    });
    expect(getBattleBackgroundKeys(12)).toEqual({
      stageKey: "stage_01_12",
      foregroundKey: "fg_1_ruins",
    });
    expect(getBattleBackgroundKeys(13)).toEqual({
      stageKey: "stage_02_01",
      foregroundKey: "fg_2_snowfield",
    });
    expect(getBattleBackgroundKeys(48)).toEqual({
      stageKey: "stage_04_12",
      foregroundKey: "fg_4_sky_city",
    });
  });
});
