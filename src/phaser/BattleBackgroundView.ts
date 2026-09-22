import Phaser from "phaser";
import {
  BATTLE_FOREGROUND_PROP_NAMES,
  getBattleBackgroundKeys,
  getBattleForegroundPropTextureKey,
  getBattleLayerTextureKey,
  type BattleForegroundPropName,
  type BattleLayerName,
  type BattleLayerPackKey,
} from "../content/battleBackgrounds";
import { calculateMirroredStripLayout } from "./BattleCamera";

const WORLD_WIDTH = 1000;
const DEFAULT_PATH_CENTER_Y_RATIO = 0.8;
const LAYER_DEPTH: Record<BattleLayerName, number> = {
  sky: -50,
  distant: -40,
  rear: -30,
  road: -20,
};
const LAYER_PARALLAX: Record<BattleLayerName, number> = {
  sky: 0.03,
  distant: 0.12,
  rear: 0.32,
  road: 1,
};
const LAYER_Y_OFFSET: Record<BattleLayerName, number> = {
  sky: 0,
  distant: 0.02,
  rear: 0.08,
  road: 0.19,
};
const LAYER_COVER_SCALE: Partial<Record<BattleLayerName, number>> = {
  rear: 1.18,
};
const LAYER_NAMES = ["sky", "distant", "rear", "road"] as const;
const DEPTH_BACKGROUND = -10;
const DEPTH_FOREGROUND = 900;
const FOREGROUND_COVER_SCALE = 0.88;
const FOREGROUND_PROP_DEPTH = 900;
const FOREGROUND_PROP_ORIGIN_Y = 360 / 384;
const FOREGROUND_PROP_PARALLAX = 1.22;
const FOREGROUND_PROP_Y_RATIO = 1.135;
const FOREGROUND_LOOP_WIDTH_RATIO = 4.6;
const FOREGROUND_GAP_MIN_RATIO = 0.36;
const FOREGROUND_GAP_MAX_RATIO = 0.92;

interface ForegroundPropPlacement {
  name: BattleForegroundPropName;
  loopX: number;
  heightRatio: number;
  flipX?: boolean;
}

const FOREGROUND_PROP_MIX: readonly BattleForegroundPropName[] = [
  "grass_clump",
  "grass_clump",
  "stone_cluster",
  "mushroom_cluster",
  "shrub_clump",
];
const FOREGROUND_HEIGHT_RANGE: Record<
  BattleForegroundPropName,
  readonly [number, number]
> = {
  grass_clump: [0.46, 0.52],
  stone_cluster: [0.48, 0.55],
  mushroom_cluster: [0.5, 0.57],
  shrub_clump: [0.52, 0.59],
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shuffledForegroundMix(): BattleForegroundPropName[] {
  const names = [...FOREGROUND_PROP_MIX];
  for (let index = names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [names[index], names[swapIndex]] = [names[swapIndex]!, names[index]!];
  }
  return names;
}

function createForegroundPropLayout(): ForegroundPropPlacement[] {
  const layout: ForegroundPropPlacement[] = [];
  let names = shuffledForegroundMix();
  let loopX = randomBetween(0.02, 0.16);
  while (loopX < FOREGROUND_LOOP_WIDTH_RATIO - 0.18) {
    if (names.length === 0) names = shuffledForegroundMix();
    const name = names.pop()!;
    const [minHeight, maxHeight] = FOREGROUND_HEIGHT_RANGE[name];
    layout.push({
      name,
      loopX,
      heightRatio: randomBetween(minHeight, maxHeight),
      flipX: Math.random() < 0.5,
    });
    loopX += randomBetween(FOREGROUND_GAP_MIN_RATIO, FOREGROUND_GAP_MAX_RATIO);
  }
  return layout;
}

export class BattleBackgroundView {
  private readonly fallbackStage: Phaser.GameObjects.Image;
  private readonly fallbackForeground: Phaser.GameObjects.Image;
  private readonly layers = new Map<
    BattleLayerName,
    readonly [Phaser.GameObjects.Image, Phaser.GameObjects.Image]
  >();
  private readonly foregroundProps: Array<{
    image: Phaser.GameObjects.Image;
    placement: ForegroundPropPlacement;
  }> = [];
  private travelWorldX = 0;
  private activeStageKey = "";
  private activeForegroundKey = "";
  private activeLayerPackKey: BattleLayerPackKey | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    stage: number,
  ) {
    const keys = getBattleBackgroundKeys(stage);
    this.fallbackStage = scene.add
      .image(0, 0, `background-${keys.stageKey}`)
      .setOrigin(0.5)
      .setDepth(DEPTH_BACKGROUND);
    this.fallbackForeground = scene.add
      .image(0, 0, `background-${keys.foregroundKey}`)
      .setOrigin(0.5)
      .setDepth(DEPTH_FOREGROUND);
    this.activeStageKey = keys.stageKey;
    this.activeForegroundKey = keys.foregroundKey;
    this.sync(stage);
    this.layout();
  }

  get pathCenterYRatio(): number {
    return this.activeLayerPackKey ? 0.68 : DEFAULT_PATH_CENTER_Y_RATIO;
  }

  sync(stage: number): void {
    const keys = getBattleBackgroundKeys(stage);
    let layoutChanged = false;
    if (keys.stageKey !== this.activeStageKey) {
      this.activeStageKey = keys.stageKey;
      const textureKey = `background-${keys.stageKey}`;
      if (this.scene.textures.exists(textureKey)) this.fallbackStage.setTexture(textureKey);
      layoutChanged = true;
    }
    if (keys.foregroundKey !== this.activeForegroundKey) {
      this.activeForegroundKey = keys.foregroundKey;
      const textureKey = `background-${keys.foregroundKey}`;
      if (this.scene.textures.exists(textureKey)) this.fallbackForeground.setTexture(textureKey);
      layoutChanged = true;
    }

    const nextPack = keys.layerPackKey;
    if (nextPack !== this.activeLayerPackKey) {
      this.clearLayerPack();
      layoutChanged = true;
    }
    if (nextPack && this.layers.size === 0 && this.hasCompleteLayerPack(nextPack)) {
      this.createLayerPack(nextPack);
      layoutChanged = true;
    }

    const layered = this.layers.size === LAYER_NAMES.length;
    this.fallbackStage.setVisible(!layered);
    this.fallbackForeground.setVisible(!layered);
    if (layoutChanged) this.layout();
  }

  update(travelWorldX: number): void {
    this.travelWorldX = travelWorldX;
    const width = this.scene.scale.width;
    if (this.activeLayerPackKey) {
      for (const layerName of LAYER_NAMES) {
        const pair = this.layers.get(layerName);
        if (!pair) continue;
        const segmentWidth = Math.max(1, pair[0].displayWidth - 1);
        const scroll = Math.max(
          0,
          (travelWorldX / WORLD_WIDTH) * width * LAYER_PARALLAX[layerName],
        );
        const { segmentIndex, localOffset } = calculateMirroredStripLayout(scroll, segmentWidth);
        for (let slot = 0; slot < pair.length; slot += 1) {
          const layer = pair[slot]!;
          layer.setFlipX((segmentIndex + slot) % 2 !== 0);
          layer.setX(slot * segmentWidth - localOffset + segmentWidth / 2);
        }
      }
      this.positionForegroundProps(width);
      return;
    }

    // Legacy single-image stages are not seamless layers; keep them still so
    // their limited crop never snaps back at a modulo boundary.
    this.fallbackStage.setX(width / 2);
    this.fallbackForeground.setX(width / 2);
  }

  layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.fitCoverLayer(this.fallbackStage, width, height, 1, "center");
    this.fitCoverLayer(
      this.fallbackForeground,
      width,
      height,
      FOREGROUND_COVER_SCALE,
      "bottom",
    );
    for (const [layerName, pair] of this.layers) {
      for (const layer of pair) {
        this.fitCoverLayer(
          layer,
          width,
          height,
          LAYER_COVER_SCALE[layerName] ?? 1,
          "center",
        );
        layer.setY(height / 2 + height * LAYER_Y_OFFSET[layerName]);
      }
    }
    for (const { image, placement } of this.foregroundProps) {
      const displayHeight = height * placement.heightRatio;
      const source = image.texture.getSourceImage() as { width?: number; height?: number };
      const aspectRatio = (source.width || image.width || 1) / (source.height || image.height || 1);
      image.setDisplaySize(displayHeight * aspectRatio, displayHeight);
      image.setY(height * FOREGROUND_PROP_Y_RATIO);
    }
    this.positionForegroundProps(width);
  }

  destroy(): void {
    this.clearLayerPack();
    this.fallbackStage.destroy();
    this.fallbackForeground.destroy();
  }

  private hasCompleteLayerPack(packKey: BattleLayerPackKey): boolean {
    return (
      LAYER_NAMES.every((layer) =>
        this.scene.textures.exists(getBattleLayerTextureKey(packKey, layer)),
      ) &&
      BATTLE_FOREGROUND_PROP_NAMES.every((prop) =>
        this.scene.textures.exists(getBattleForegroundPropTextureKey(packKey, prop)),
      )
    );
  }

  private createLayerPack(packKey: BattleLayerPackKey): void {
    this.activeLayerPackKey = packKey;
    for (const layerName of LAYER_NAMES) {
      const textureKey = getBattleLayerTextureKey(packKey, layerName);
      const first = this.scene.add
        .image(0, 0, textureKey)
        .setOrigin(0.5)
        .setDepth(LAYER_DEPTH[layerName]);
      const second = this.scene.add
        .image(0, 0, textureKey)
        .setOrigin(0.5)
        .setDepth(LAYER_DEPTH[layerName]);
      this.layers.set(layerName, [first, second]);
    }
    for (const placement of createForegroundPropLayout()) {
      const image = this.scene.add
        .image(0, 0, getBattleForegroundPropTextureKey(packKey, placement.name))
        .setOrigin(0.5, FOREGROUND_PROP_ORIGIN_Y)
        .setDepth(FOREGROUND_PROP_DEPTH)
        .setFlipX(Boolean(placement.flipX));
      this.foregroundProps.push({ image, placement });
    }
  }

  private clearLayerPack(): void {
    for (const pair of this.layers.values()) {
      for (const layer of pair) layer.destroy();
    }
    this.layers.clear();
    for (const { image } of this.foregroundProps) image.destroy();
    this.foregroundProps.length = 0;
    this.activeLayerPackKey = undefined;
  }

  private positionForegroundProps(width: number): void {
    const loopWidth = width * FOREGROUND_LOOP_WIDTH_RATIO;
    const margin = width * 0.2;
    const scroll =
      (this.travelWorldX / WORLD_WIDTH) * width * FOREGROUND_PROP_PARALLAX;
    for (const { image, placement } of this.foregroundProps) {
      const rawX = placement.loopX * width - scroll;
      image.setX(Phaser.Math.Wrap(rawX + margin, 0, loopWidth) - margin);
    }
  }

  private fitCoverLayer(
    layer: Phaser.GameObjects.Image,
    width: number,
    height: number,
    coverScale: number,
    anchor: "center" | "bottom",
  ): void {
    const source = layer.texture?.getSourceImage() as { width?: number; height?: number } | undefined;
    const textureWidth = source?.width || layer.width || 1;
    const textureHeight = source?.height || layer.height || 1;
    const cover = Math.max(width / textureWidth, height / textureHeight) * coverScale;
    const displayWidth = textureWidth * cover;
    const displayHeight = textureHeight * cover;
    layer.setDisplaySize(displayWidth, displayHeight);
    layer.setPosition(width / 2, anchor === "bottom" ? height - displayHeight / 2 : height / 2);
  }
}
