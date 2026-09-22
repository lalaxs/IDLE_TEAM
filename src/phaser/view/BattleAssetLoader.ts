import Phaser from "phaser";
import {
  getBattleAssetRequests,
  getBattleAssetSignature,
  type BattleAssetRequest,
} from "../../assets/battleAssets";
import type { BattleSnapshot } from "../../simulation/types";

export class BattleAssetLoader {
  private loaderActive = false;
  private pendingTextureKeys = new Set<string>();
  private failedTextureKeys = new Set<string>();
  private assetPlanSignature = "";
  private preparedAssetSignature = "";
  private assetPlan: BattleAssetRequest[] = [];

  private readonly handleFileComplete = (key: string): void => {
    this.pendingTextureKeys.delete(key);
  };

  private readonly handleLoadError = (file: { key: string }): void => {
    this.pendingTextureKeys.delete(file.key);
    this.failedTextureKeys.add(file.key);
  };

  private readonly handleLoadComplete = (): void => {
    for (const key of this.pendingTextureKeys) this.failedTextureKeys.add(key);
    this.pendingTextureKeys.clear();
    this.loaderActive = false;
  };

  constructor(private readonly scene: Phaser.Scene) {}

  preload(snapshot: BattleSnapshot): void {
    this.scene.load.on("filecomplete", this.handleFileComplete);
    this.scene.load.on("loaderror", this.handleLoadError);
    this.scene.load.on("complete", this.handleLoadComplete);
    this.assetPlanSignature = getBattleAssetSignature(snapshot);
    this.assetPlan = getBattleAssetRequests(snapshot);
    for (const asset of this.assetPlan) this.queueAsset(asset);
  }

  prepare(snapshot: BattleSnapshot): boolean {
    const signature = getBattleAssetSignature(snapshot);
    if (signature === this.preparedAssetSignature) return true;
    if (signature !== this.assetPlanSignature) {
      this.assetPlanSignature = signature;
      this.assetPlan = getBattleAssetRequests(snapshot);
    }
    if (!this.ensureAssets(this.assetPlan)) return false;
    this.preparedAssetSignature = signature;
    return true;
  }

  destroy(): void {
    this.scene.load.off("filecomplete", this.handleFileComplete);
    this.scene.load.off("loaderror", this.handleLoadError);
    this.scene.load.off("complete", this.handleLoadComplete);
    this.pendingTextureKeys.clear();
    this.failedTextureKeys.clear();
    this.assetPlan = [];
    this.loaderActive = false;
    this.assetPlanSignature = "";
    this.preparedAssetSignature = "";
  }

  private ensureAssets(requests: readonly BattleAssetRequest[]): boolean {
    if (requests.every(({ textureKey }) => this.scene.textures.exists(textureKey))) return true;
    if (this.loaderActive) return false;
    for (const asset of requests) this.queueAsset(asset);
    if (this.pendingTextureKeys.size === 0) return false;
    this.loaderActive = true;
    this.scene.load.start();
    return false;
  }

  private queueAsset(asset: BattleAssetRequest): void {
    if (
      this.scene.textures.exists(asset.textureKey)
      || this.pendingTextureKeys.has(asset.textureKey)
      || this.failedTextureKeys.has(asset.textureKey)
    ) return;
    this.pendingTextureKeys.add(asset.textureKey);
    if (asset.kind === "svg") {
      this.scene.load.svg(asset.textureKey, asset.path, { width: 128, height: 128 });
    } else {
      this.scene.load.image(asset.textureKey, asset.path);
    }
  }
}
