import Phaser from "phaser";
import { ASSET_MANIFEST } from "../assets/manifest";
import { CHARACTER_FOOT_X, getBattleBackgroundKeys } from "../content/battleBackgrounds";
import { SceneBridge, type BattleViewAdapter } from "./SceneBridge";
import {
  calculateBattleCameraX,
  calculateParallaxOffset,
  projectBattleX,
} from "./BattleCamera";
import type { BattleEvent, BattleSnapshot, UnitState } from "../simulation/types";

interface UnitView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  shield: Phaser.GameObjects.Rectangle;
  displaySize: number;
  baseScaleX: number;
  baseScaleY: number;
  lastUnitX: number;
  /** 0–1 walk-cycle progress, advanced only by this unit's own displacement. */
  strideProgress: number;
  locomoting: boolean;
  /** Keep walk pose briefly after tiny steps so micro-nudges do not pop to idle. */
  locomotingHold: number;
  attacking: boolean;
  lastHp: number;
}

/** Pivot at the bottom-center of the figure for walk/attack wobble. */
const SPRITE_ORIGIN_Y = 0.91;
const FOOT_BOTTOM_Y = 0.91;
/** Foot line on the dirt road (canvas fraction). Keep clear of tree line and bottom FG. */
const PATH_CENTER_Y_RATIO = 0.8;
/** Scene draw order: units Y-sort below bushes; FX stay readable on top. */
const DEPTH_BACKGROUND = -10;
const DEPTH_FOREGROUND = 900;
const DEPTH_FX = 1000;
/** Foreground bushes: slightly under full cover so they frame less of the path. */
const FOREGROUND_COVER_SCALE = 0.88;
const MOVE_WOBBLE_RAD = Phaser.Math.DegToRad(2.5);
/** World-x distance for one full left↔right lean cycle. */
const STRIDE_CYCLE_UNITS = 52;
/** Tiny vertical bob in local px — avoid scaleY squash (reads as sliding down). */
const STRIDE_BOB_PX = 1.5;
const ATTACK_LEAN_RAD = Phaser.Math.DegToRad(8);
/** Local-pixel lunge toward the target; feet stay planted on the container. */
const ATTACK_LUNGE_PX = 9;
const ATTACK_RECOVER_SCALE = 1.04;

export class BattleScene extends Phaser.Scene implements BattleViewAdapter {
  private bridge!: SceneBridge;
  private unitViews = new Map<string, UnitView>();
  private pendingSnapshot: BattleSnapshot | null = null;
  private pendingEvents: BattleEvent[] = [];
  private stageBackground!: Phaser.GameObjects.Image;
  private foregroundOcclusion!: Phaser.GameObjects.Image;
  private activeBackgroundKey = "";
  private activeForegroundKey = "";
  private reducedMotion = false;
  private cameraWorldX = 0;
  private lastSimElapsedMs = -1;
  private simPulse = false;

  constructor() {
    super("battle");
  }

  preload(): void {
    for (const [key, path] of Object.entries(ASSET_MANIFEST.characters)) {
      const textureKey = `character-${key}`;
      if (path.endsWith(".svg")) {
        this.load.svg(textureKey, path, { width: 128, height: 128 });
      } else {
        this.load.image(textureKey, path);
      }
    }
    for (const [key, path] of Object.entries(ASSET_MANIFEST.backgrounds.stages)) {
      this.load.image(`background-${key}`, path);
    }
    for (const [key, path] of Object.entries(ASSET_MANIFEST.backgrounds.foregrounds)) {
      this.load.image(`background-${key}`, path);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0xa8cdca);
    this.createBackground();
    this.bridge = new SceneBridge(this);
    this.scale.on("resize", () => this.layoutBackground());
  }

  update(): void {
    if (!this.pendingSnapshot || !this.bridge) return;
    this.syncBackground(this.pendingSnapshot.stage);
    // Only treat a simulation tick as "moved" once; Phaser may render several
    // frames against the same snapshot and would otherwise kill walk blend.
    this.simPulse = this.pendingSnapshot.elapsedMs !== this.lastSimElapsedMs;
    if (this.simPulse) this.lastSimElapsedMs = this.pendingSnapshot.elapsedMs;
    const targetCameraX = this.resolveCameraTarget(this.pendingSnapshot);
    // Smooth party follow — never hard-hold, or heroes walk off the right edge.
    const cameraGap = Math.abs(targetCameraX - this.cameraWorldX);
    const followRate = this.reducedMotion
      ? 0.22
      : cameraGap > 60
        ? 0.06
        : 0.11;
    this.cameraWorldX = Phaser.Math.Linear(this.cameraWorldX, targetCameraX, followRate);
    const width = this.scale.width;
    this.stageBackground.setX(width / 2 + calculateParallaxOffset(this.cameraWorldX, 0.03, 40));
    this.foregroundOcclusion.setX(width / 2 + calculateParallaxOffset(this.cameraWorldX, 0.1, 70));
    this.bridge.sync(this.pendingSnapshot, this.pendingEvents.splice(0));
  }

  publish(snapshot: BattleSnapshot, events: readonly BattleEvent[], reducedMotion: boolean): void {
    this.pendingSnapshot = snapshot;
    this.pendingEvents.push(...events);
    this.reducedMotion = reducedMotion;
  }

  resetViews(): void {
    this.bridge?.reset();
    this.cameraWorldX = 0;
    this.lastSimElapsedMs = -1;
    this.simPulse = false;
  }

  createUnit(unit: UnitState): void {
    const width = this.scale.width;
    const x = projectBattleX(unit.x, this.cameraWorldX, width);
    const baseline = this.getBaseline(unit);
    const displaySize = unit.sourceId === "B01" ? 96 : unit.team === "enemies" ? 72 : 74;
    const flipX = unit.team === "enemies";
    const shadowPos = this.getShadowLocal(unit.sourceId, displaySize, flipX);
    const shadow = this.add.ellipse(
      shadowPos.x,
      shadowPos.y,
      unit.sourceId === "B01" ? 72 : 46,
      13,
      0x314033,
      0.22,
    );
    const sprite = this.add.image(0, 0, `character-${unit.sourceId}`);
    sprite.setOrigin(0.5, SPRITE_ORIGIN_Y);
    sprite.setDisplaySize(displaySize, displaySize);
    if (flipX) sprite.setFlipX(true);
    const hpBack = this.add.rectangle(0, -64, unit.sourceId === "B01" ? 78 : 52, 7, 0x3b302b, 0.9);
    hpBack.setStrokeStyle(1.5, 0xf1e7d1);
    const hpFill = this.add.rectangle(
      -(hpBack.width / 2 - 2),
      -64,
      hpBack.width - 4,
      4,
      unit.team === "heroes" ? 0x789962 : 0xd76b58,
    );
    hpFill.setOrigin(0, 0.5);
    const shield = this.add.rectangle(
      -(hpBack.width / 2 - 2),
      -58,
      0,
      2,
      0x79b8dd,
    );
    shield.setOrigin(0, 0.5);
    const container = this.add.container(x, baseline, [shadow, sprite, hpBack, hpFill, shield]);
    container.setDepth(this.getUnitDepth(baseline));
    container.setAlpha(0);
    // Enemies march in from off-screen — fade only, no scale pop in the middle of the path.
    if (unit.team === "enemies") {
      container.setScale(1);
      this.tweens.add({
        targets: container,
        alpha: 1,
        duration: this.reducedMotion ? 60 : 180,
        ease: "Quad.Out",
      });
    } else {
      container.setScale(0.75);
      this.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration: this.reducedMotion ? 80 : 260,
        ease: "Back.Out",
      });
    }
    this.unitViews.set(unit.id, {
      container,
      sprite,
      shadow,
      hpBack,
      hpFill,
      shield,
      displaySize,
      baseScaleX: sprite.scaleX,
      baseScaleY: sprite.scaleY,
      lastUnitX: unit.x,
      strideProgress: 0,
      locomoting: false,
      locomotingHold: 0,
      attacking: false,
      lastHp: unit.hp,
    });
  }

  updateUnit(unit: UnitState): void {
    const view = this.unitViews.get(unit.id);
    if (!view) return;

    // Snap to sim position; only the camera is smoothed. Extra unit lerps were
    // fighting the camera and reading as micro-jitter while marching.
    view.container.x = projectBattleX(unit.x, this.cameraWorldX, this.scale.width);
    view.container.y = this.getBaseline(unit);
    view.container.setDepth(this.getUnitDepth(view.container.y));

    const hpPercent = Math.max(0, unit.hp / unit.maxHp);
    view.hpFill.width = Math.max(0, (view.hpBack.width - 4) * hpPercent);
    view.hpFill.fillColor = hpPercent < 0.25 ? 0xe26456 : unit.team === "heroes" ? 0x789962 : 0xd76b58;
    view.shield.width = Math.max(0, (view.hpBack.width - 4) * Math.min(1, unit.shield / unit.maxHp));
    view.sprite.setTint(unit.alive ? 0xffffff : 0x827a72);

    if (this.simPulse && unit.alive) {
      const dx = Math.abs(unit.x - view.lastUnitX);
      view.lastUnitX = unit.x;
      // Ignore tiny separation nudges — only real travel drives the walk cycle.
      const walkStep = Math.max(1.2, unit.moveSpeed * 0.015);
      if (dx >= walkStep) {
        view.strideProgress = (view.strideProgress + dx / STRIDE_CYCLE_UNITS) % 1;
        view.locomoting = true;
        view.locomotingHold = 3;
      } else if (view.locomotingHold > 0) {
        view.locomotingHold -= 1;
        view.locomoting = true;
      } else {
        view.locomoting = false;
      }
    }

    if (!view.attacking) {
      if (!this.reducedMotion && view.locomoting) {
        view.sprite.setRotation(this.strideLeanAngle(view.strideProgress));
        view.sprite.setScale(view.baseScaleX, view.baseScaleY);
        view.sprite.y = this.strideBobY(view.strideProgress);
      } else {
        view.sprite.setRotation(0);
        view.sprite.setScale(view.baseScaleX, view.baseScaleY);
        view.sprite.y = 0;
      }
    }

    if (view.lastHp > unit.hp && unit.alive) {
      view.sprite.setTintFill(0xffffff);
      this.time.delayedCall(70, () => view.sprite.setTint(0xffffff));
    }
    view.lastHp = unit.hp;
    if (!unit.alive && view.container.alpha > 0.05 && !view.container.getData("dying")) {
      view.container.setData("dying", true);
      this.tweens.add({
        targets: view.container,
        alpha: 0,
        y: view.container.y + 18,
        duration: this.reducedMotion ? 80 : 320,
        ease: "Quad.In",
      });
    }
  }

  removeUnit(id: string): void {
    const view = this.unitViews.get(id);
    if (!view) return;
    this.tweens.killTweensOf(view.sprite);
    view.container.destroy(true);
    this.unitViews.delete(id);
  }

  playEvent(event: BattleEvent): void {
    if (event.type === "damage") {
      const view = this.unitViews.get(event.targetId);
      if (view) this.floatText(view.container.x, view.container.y - 58, `${event.critical ? "✦ " : "−"}${event.amount}`, event.critical ? "#f4cf58" : "#fff4e4", event.critical ? 18 : 13);
    } else if (event.type === "heal") {
      const view = this.unitViews.get(event.targetId);
      if (view) this.floatText(view.container.x, view.container.y - 58, `+${event.amount}`, "#b7ea86", 14);
    } else if (event.type === "attack") {
      const source = this.unitViews.get(event.sourceId);
      const target = this.unitViews.get(event.targetId);
      if (source && target) {
        this.playAttackMotion(source, target.container.x);
        if (event.ranged) {
          this.projectile(source.container.x, source.container.y - 25, target.container.x, target.container.y - 30);
        }
      }
    } else if (event.type === "boss:intro") {
      if (!this.reducedMotion) this.cameras.main.shake(240, 0.008);
    } else if (event.type === "battle:victory") {
      this.victoryBurst();
    }
  }

  private createBackground(): void {
    const keys = getBattleBackgroundKeys(1);
    this.stageBackground = this.add
      .image(0, 0, `background-${keys.stageKey}`)
      .setOrigin(0.5)
      .setDepth(DEPTH_BACKGROUND);
    this.foregroundOcclusion = this.add
      .image(0, 0, `background-${keys.foregroundKey}`)
      .setOrigin(0.5)
      .setDepth(DEPTH_FOREGROUND);
    this.activeBackgroundKey = keys.stageKey;
    this.activeForegroundKey = keys.foregroundKey;
    this.layoutBackground();
  }

  private syncBackground(stage: number): void {
    const keys = getBattleBackgroundKeys(stage);
    let dirty = false;
    if (keys.stageKey !== this.activeBackgroundKey) {
      this.activeBackgroundKey = keys.stageKey;
      this.stageBackground.setTexture(`background-${keys.stageKey}`);
      dirty = true;
    }
    if (keys.foregroundKey !== this.activeForegroundKey) {
      this.activeForegroundKey = keys.foregroundKey;
      this.foregroundOcclusion.setTexture(`background-${keys.foregroundKey}`);
      dirty = true;
    }
    if (dirty) this.layoutBackground();
  }

  /**
   * Always track the party only. Enemy packs entering from the right must not
   * pull the camera; as heroes advance, the lens follows so they stay on-screen.
   */
  private resolveCameraTarget(snapshot: BattleSnapshot): number {
    const heroes = snapshot.units.filter(({ team, alive }) => team === "heroes" && alive);
    return calculateBattleCameraX(heroes.length > 0 ? heroes : snapshot.units);
  }

  private layoutBackground(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.fitCoverLayer(this.stageBackground, width, height, 1, "center");
    this.fitCoverLayer(this.foregroundOcclusion, width, height, FOREGROUND_COVER_SCALE, "bottom");
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

  /** Continuous lean loop — sin wraps cleanly at 0/1 (no pop). */
  private strideLeanAngle(progress: number): number {
    return Math.sin(progress * Math.PI * 2) * MOVE_WOBBLE_RAD;
  }

  /** Subtle foot bob (up is negative y); keeps feet planted without squash. */
  private strideBobY(progress: number): number {
    return -Math.abs(Math.sin(progress * Math.PI * 2)) * STRIDE_BOB_PX;
  }

  private getShadowLocal(sourceId: string, displaySize: number, flipX: boolean): { x: number; y: number } {
    const footX = CHARACTER_FOOT_X[sourceId] ?? 0.5;
    const offsetX = (footX - 0.5) * displaySize;
    return {
      x: flipX ? -offsetX : offsetX,
      y: displaySize * (FOOT_BOTTOM_Y - SPRITE_ORIGIN_Y) + 4,
    };
  }

  private playAttackMotion(view: UnitView, targetScreenX: number): void {
    const leanSign =
      Math.sign(targetScreenX - view.container.x) || (view.sprite.flipX ? -1 : 1);
    const lean = leanSign * ATTACK_LEAN_RAD;
    const lunge = leanSign * ATTACK_LUNGE_PX;
    view.attacking = true;
    this.tweens.killTweensOf(view.sprite);
    view.sprite.setScale(view.baseScaleX, view.baseScaleY);
    view.sprite.setPosition(0, 0);
    view.sprite.setRotation(0);

    if (this.reducedMotion) {
      view.sprite.setRotation(lean * 0.45);
      view.sprite.x = lunge * 0.5;
      this.time.delayedCall(80, () => {
        view.sprite.setRotation(0);
        view.sprite.x = 0;
        view.sprite.setScale(view.baseScaleX * ATTACK_RECOVER_SCALE, view.baseScaleY * ATTACK_RECOVER_SCALE);
        this.time.delayedCall(70, () => {
          view.sprite.setScale(view.baseScaleX, view.baseScaleY);
          view.attacking = false;
        });
      });
      return;
    }

    // Strike: short lunge + mild lean, then plant again. No squash (that reads as sliding).
    this.tweens.add({
      targets: view.sprite,
      x: lunge,
      rotation: lean,
      duration: 70,
      ease: "Quad.Out",
      onComplete: () => {
        this.tweens.add({
          targets: view.sprite,
          x: 0,
          rotation: 0,
          scaleX: view.baseScaleX * ATTACK_RECOVER_SCALE,
          scaleY: view.baseScaleY * ATTACK_RECOVER_SCALE,
          duration: 110,
          ease: "Back.Out",
          onComplete: () => {
            this.tweens.add({
              targets: view.sprite,
              scaleX: view.baseScaleX,
              scaleY: view.baseScaleY,
              duration: 60,
              ease: "Quad.Out",
              onComplete: () => {
                view.sprite.setPosition(0, 0);
                view.attacking = false;
              },
            });
          },
        });
      },
    });
  }

  private getBaseline(unit: UnitState): number {
    // unit.y is a DNF-style lane offset: negative = farther up the path.
    // Path center sits on the dirt road (not the tree line / upper mid-ground).
    return this.scale.height * PATH_CENTER_Y_RATIO + unit.y;
  }

  /** Keep Y-sorting among units while always staying under foreground bushes. */
  private getUnitDepth(baseline: number): number {
    return Math.min(Math.round(baseline), DEPTH_FOREGROUND - 1);
  }

  private floatText(x: number, y: number, text: string, color: string, size: number): void {
    const label = this.add.text(x, y, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#3a302b",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH_FX);
    this.tweens.add({ targets: label, y: y - 28, alpha: 0, duration: this.reducedMotion ? 300 : 650, ease: "Cubic.Out", onComplete: () => label.destroy() });
  }

  private projectile(x1: number, y1: number, x2: number, y2: number): void {
    const projectile = this.add.circle(x1, y1, 4, 0xffe18a).setStrokeStyle(2, 0xffffff).setDepth(DEPTH_FX);
    this.tweens.add({
      targets: projectile,
      x: x2,
      y: y2,
      duration: this.reducedMotion ? 80 : 180,
      onComplete: () => projectile.destroy(),
    });
  }

  private victoryBurst(): void {
    for (let index = 0; index < 18; index += 1) {
      const particle = this.add.circle(this.scale.width / 2, this.scale.height * 0.48, 2 + (index % 3), [0xf1c85d, 0x7f9b63, 0xffffff][index % 3]!).setDepth(DEPTH_FX);
      const angle = (Math.PI * 2 * index) / 18;
      const distance = 50 + (index % 5) * 8;
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: this.reducedMotion ? 250 : 700,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
