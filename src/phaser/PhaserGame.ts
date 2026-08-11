import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import type { BattleEvent, BattleSnapshot } from "../simulation/types";

export class PhaserGame {
  private readonly scene: BattleScene;
  private readonly game: Phaser.Game;

  constructor(parentId: string) {
    this.scene = new BattleScene();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentId,
      backgroundColor: "#a8cdca",
      transparent: false,
      antialias: true,
      // Soft cartoon sprites look smoother without integer pixel snapping.
      roundPixels: false,
      render: {
        powerPreference: "low-power",
        antialias: true,
        pixelArt: false,
        roundPixels: false,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: 430,
        height: 280,
      },
      scene: [this.scene],
      audio: { noAudio: true },
      banner: false,
    });
  }

  publish(snapshot: BattleSnapshot, events: readonly BattleEvent[], reducedMotion: boolean): void {
    this.scene.publish(snapshot, events, reducedMotion);
  }

  resetViews(): void {
    this.scene.resetViews();
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
