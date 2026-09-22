import Phaser from "phaser";
import { channelProgress } from "../ui/SpecializationPresentation";
import {
  CHARACTER_FOOT_X,
  ENEMY_RENDER_METRICS,
  enemyDisplayScale,
} from "../content/battleBackgrounds";
import { DAMAGE_ELEMENT_COLOR } from "../content/damageElements";
import { ENEMY_BY_ID } from "../content/enemies";
import { ENEMY_ABILITY_NAMES } from "../content/enemyCombatProfiles";
import { HERO_SKILLS } from "../content/heroSkills";
import { RARITY_COLORS } from "../content/rarities";
import { ACTIVE_SKILLS } from "../content/skills";
import { SceneBridge, type BattleViewAdapter } from "./SceneBridge";
import {
  advanceBattleRenderX,
  battleCameraXForAnchor,
  findFrontmostLivingHero,
  findHeroEntryCameraAnchor,
  interpolateLeaderCameraAnchor,
  projectBattleX,
} from "./BattleCamera";
import { BattleBackgroundView } from "./BattleBackgroundView";
import { BattleAssetLoader } from "./view/BattleAssetLoader";
import { CombatFloatLayer, type FloatTextStyle } from "./view/CombatFloatLayer";
import type {
  AttackMode,
  BattleEvent,
  BattleSnapshot,
  DamageElement,
  UnitState,
} from "../simulation/types";

import { StatusEffectView, type StatusVisualKind } from "./StatusEffectView";
type ProjectileStyle = "arrow" | "orb" | "bolt" | "spit";

interface StatusPresentation {
  label: string;
  textColor: string;
  tint: number;
}

interface UnitView {
  id: string;
  sourceId: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  team: UnitState["team"];
  attackMode: AttackMode;
  damageElement: DamageElement;
  hpBar: Phaser.GameObjects.Graphics;
  hpBarWidth: number;
  shield: Phaser.GameObjects.Graphics;
  castBar: Phaser.GameObjects.Graphics;
  statusArt: StatusEffectView;
  statusBack: Phaser.GameObjects.Graphics;
  statusFront: Phaser.GameObjects.Graphics;
  statusRadius: number;
  statusHeight: number;
  statusTint: number;
  activeStatusKinds: Set<StatusVisualKind>;
  baseScaleX: number;
  baseScaleY: number;
  floatTextOffsetY: number;
  lastHpPercent: number;
  lastShieldPercent: number;
  lastCastProgress: number | null;
  lastUnitX: number;
  locomoting: boolean;
  /** Keep walk pose briefly after tiny steps so micro-nudges do not pop to idle. */
  locomotingHold: number;
  attacking: boolean;
  activeSkillCastId: string | null;
  displayedHp: number;
  displayedMaxHp: number;
  displayedShield: number;
  hitFlashing: boolean;
  hitFlashVersion: number;
  deathPresented: boolean;
}

interface PendingAttackImpact {
  delayMs: number;
  travelMs: number;
}

/** Pivot at the bottom-center of the figure for walk/attack wobble. */
const SPRITE_ORIGIN_Y = 0.91;
const HERO_DISPLAY_SCALE = 1.12;
/** Shared baseline; controlled semantic size classes supply bounded adjustments. */
const ENEMY_MASTER_DISPLAY_SIZE = 128;
const HEALTH_BAR_HEIGHT = 11;
const HEALTH_BAR_OUTLINE = 3;
const SHIELD_BAR_COLOR = 0x69bce8;
const SHIELD_BAR_HIGHLIGHT = 0xc9f1ff;
const CAST_BAR_GAP = 1;
const CAST_BAR_COLOR = 0xffd35a;
/** Move the shared walk lane lower without changing simulation coordinates. */
const BATTLE_LANE_OFFSET_Y = 18;
/** Scene draw order: units Y-sort below bushes; FX stay readable on top. */
const DEPTH_FOREGROUND = 900;
const DEPTH_FX = 1000;
const MOVE_WOBBLE_RAD = Phaser.Math.DegToRad(5);
/** World distance covered by one full left↔right walk cycle. */
const STRIDE_CYCLE_UNITS = 52;
const STRIDE_CYCLE_MIN_MS = 380;
const STRIDE_CYCLE_MAX_MS = 580;
/** A clear, toy-like hop keeps the walk readable at the game's small render size. */
const STRIDE_BOB_PX = 2.25;
const STRIDE_STRETCH_X = 0.025;
const STRIDE_STRETCH_Y = 0.04;
const ATTACK_LEAN_RAD = Phaser.Math.DegToRad(8);
/** Local-pixel lunge toward the target; feet stay planted on the container. */
const ATTACK_LUNGE_PX = 9;
const RANGED_RECOIL_PX = 11;
const ATTACK_RECOVER_SCALE = 1.04;
const RANGED_RELEASE_MS = 70;
const RANGED_PROJECTILE_SPEED_PX_PER_MS = 0.76;
const RANGED_TRAVEL_MIN_MS = 180;
const RANGED_TRAVEL_MAX_MS = 420;
const CAMERA_LEADER_SWITCH_MS = 200;
const MELEE_IMPACT_MS = 70;
const HIT_FLASH_MS = 55;
const HIT_RECOIL_PX = 4;
const DEATH_FLOAT_PX = 12;
const DEATH_SCALE = 0.96;
const DEATH_DURATION_MS = 260;
const ATTACK_FX_COLOR: Record<DamageElement, number> = {
  physical: 0xffe6bf,
  fire: 0xff7a3d,
  frost: 0x79c7ff,
  lightning: 0xf6df58,
  dark: 0xb879ff,
  holy: 0xffe699,
};
const HEAL_FX_COLOR = 0xa8ed82;
const PARTY_HEAL_SKILL_IDS = new Set(["priest_holy-active"]);
const SKILL_NAME_BY_ID = new Map<string, string>(
  [
    ...[...ACTIVE_SKILLS, ...HERO_SKILLS].map(({ id, name }) => [id, name] as const),
    ...ENEMY_ABILITY_NAMES,
  ],
);
const STATUS_PRESENTATION: Record<StatusVisualKind, StatusPresentation> = {
  freeze: { label: "冻结", textColor: "#bdefff", tint: 0xa8dcff },
  stun: { label: "眩晕", textColor: "#ffe47a", tint: 0xffefbd },
  taunt: { label: "嘲讽", textColor: "#ffb07c", tint: 0xffd3bd },
  slow: { label: "减速", textColor: "#8ed9ff", tint: 0xd3ebff },
  haste: { label: "加速", textColor: "#82f0c4", tint: 0xdcfff1 },
  damageReduction: { label: "减伤", textColor: "#ffe094", tint: 0xfff2d2 },
  mirageGuard: { label: "幻影守护", textColor: "#9cecff", tint: 0xe1f8ff },
  armorBreak: { label: "破甲", textColor: "#ffdc45", tint: 0xfff4c4 },
  vulnerability: { label: "易伤", textColor: "#d7a0ff", tint: 0xf0dcff },
};
const STATUS_TINT_PRIORITY: readonly StatusVisualKind[] = [
  "freeze",
  "stun",
  "taunt",
  "vulnerability",
  "armorBreak",
  "slow",
  "mirageGuard",
  "damageReduction",
  "haste",
];

export class BattleScene extends Phaser.Scene implements BattleViewAdapter {
  private bridge!: SceneBridge;
  private unitViews = new Map<string, UnitView>();
  private pendingSnapshot: BattleSnapshot | null = null;
  private pendingEvents: BattleEvent[] = [];
  private pendingAttackImpacts = new Map<string, PendingAttackImpact>();
  private pendingSkillImpacts = new Map<string, PendingAttackImpact>();
  private pendingVisualDamage = new Map<string, Set<string>>();
  private pendingVisualHealing = new Map<string, Set<string>>();
  private statusFloatLanes = new Map<string, number>();
  private lootEffects = new Set<Phaser.GameObjects.Container>();
  private combatFloats!: CombatFloatLayer;
  private assetLoader!: BattleAssetLoader;
  private backgroundView!: BattleBackgroundView;
  private reducedMotion = false;
  private cameraWorldX = 0;
  private cameraAnchorWorldX: number | null = null;
  private cameraLeaderId: string | null = null;
  private cameraLeaderTransitionFromX = 0;
  private cameraLeaderTransitionElapsedMs = CAMERA_LEADER_SWITCH_MS;
  private renderWorldXByUnit = new Map<string, number>();
  private lastSimElapsedMs = -1;
  private simPulse = false;
  private readonly handleResize = (): void => this.backgroundView?.layout();
  private readonly handleShutdown = (): void => {
    this.scale.off("resize", this.handleResize);
    this.pendingSnapshot = null;
    this.pendingEvents.length = 0;
    this.pendingAttackImpacts.clear();
    this.pendingSkillImpacts.clear();
    this.pendingVisualDamage.clear();
    this.pendingVisualHealing.clear();
    this.statusFloatLanes.clear();
    for (const effect of this.lootEffects) effect.destroy(true);
    this.lootEffects.clear();
    this.combatFloats?.reset();
    this.unitViews.clear();
    this.assetLoader?.destroy();
    this.backgroundView?.destroy();
  };

  constructor(private readonly initialSnapshot: BattleSnapshot) {
    super("battle");
  }

  preload(): void {
    this.assetLoader = new BattleAssetLoader(this);
    this.assetLoader.preload(this.initialSnapshot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0xa8cdca);
    this.bridge = new SceneBridge(this);
    this.combatFloats = new CombatFloatLayer(this, DEPTH_FX);
    this.scale.on("resize", this.handleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
  }

  update(_time: number, deltaMs: number): void {
    if (!this.pendingSnapshot || !this.bridge) return;
    this.syncBackground(this.pendingSnapshot.stage);
    // Only treat a simulation tick as "moved" once; Phaser may render several
    // frames against the same snapshot and would otherwise kill walk blend.
    this.simPulse = this.pendingSnapshot.elapsedMs !== this.lastSimElapsedMs;
    if (this.simPulse) this.lastSimElapsedMs = this.pendingSnapshot.elapsedMs;
    this.advanceRenderWorldPositions(this.pendingSnapshot, deltaMs);
    this.cameraWorldX = this.resolveCameraTarget(this.pendingSnapshot, deltaMs);
    this.backgroundView.update(this.cameraWorldX);
    const events = this.pendingEvents.splice(0);
    this.statusFloatLanes.clear();
    this.reserveVisualHealthChanges(events);
    this.bridge.sync(this.pendingSnapshot, events);
  }

  publish(snapshot: BattleSnapshot, events: readonly BattleEvent[], reducedMotion: boolean): void {
    this.pendingSnapshot = snapshot;
    this.pendingEvents.push(...events);
    this.reducedMotion = reducedMotion;
  }

  prepare(snapshot: BattleSnapshot): boolean {
    if (!this.bridge) return false;
    if (!this.assetLoader.prepare(snapshot)) return false;
    if (!this.backgroundView) this.createBackground();
    return true;
  }

  resetViews(): void {
    this.bridge?.reset();
    this.pendingEvents.length = 0;
    this.pendingSnapshot = null;
    this.pendingAttackImpacts.clear();
    this.pendingSkillImpacts.clear();
    this.pendingVisualDamage.clear();
    this.pendingVisualHealing.clear();
    this.statusFloatLanes.clear();
    this.combatFloats?.reset();
    for (const effect of this.lootEffects) effect.destroy(true);
    this.lootEffects.clear();
    this.cameraWorldX = 0;
    this.cameraAnchorWorldX = null;
    this.cameraLeaderId = null;
    this.cameraLeaderTransitionFromX = 0;
    this.cameraLeaderTransitionElapsedMs = CAMERA_LEADER_SWITCH_MS;
    this.renderWorldXByUnit.clear();
    this.lastSimElapsedMs = -1;
    this.simPulse = false;
  }

  createUnit(unit: UnitState): void {
    const width = this.scale.width;
    const renderWorldX = this.renderWorldXByUnit.get(unit.id) ?? unit.x;
    this.renderWorldXByUnit.set(unit.id, renderWorldX);
    const x = projectBattleX(renderWorldX, this.cameraWorldX, width);
    const baseline = Math.round(this.getBaseline(unit));
    const enemyKind = unit.team === "enemies"
      ? ENEMY_BY_ID[unit.sourceId as keyof typeof ENEMY_BY_ID]?.kind
      : undefined;
    const renderMetrics = unit.team === "enemies"
      ? ENEMY_RENDER_METRICS[unit.sourceId]
      : undefined;
    const displaySize = unit.team === "enemies"
      ? Math.round(ENEMY_MASTER_DISPLAY_SIZE * enemyDisplayScale(unit.sourceId))
      : Math.round(74 * HERO_DISPLAY_SCALE);
    const visibleWidth = displaySize * (renderMetrics?.visibleWidthRatio ?? 0.72);
    const visibleHeight = displaySize * (renderMetrics?.visibleHeightRatio ?? 1);
    const flipX = unit.team === "enemies";
    const footX = CHARACTER_FOOT_X[unit.sourceId] ?? 0.5;
    const footOffsetX = (footX - 0.5) * displaySize;
    const shadowWidth = Phaser.Math.Clamp(
      visibleWidth * 0.62,
      enemyKind === "boss" ? 48 : enemyKind === "elite" ? 40 : 34,
      enemyKind === "boss" ? 78 : enemyKind === "elite" ? 64 : 56,
    );
    const shadowHeight = enemyKind === "boss" ? 9 : enemyKind === "elite" ? 8 : 7;
    const shadow = this.add.ellipse(
      flipX ? -footOffsetX : footOffsetX,
      unit.team === "enemies" ? -2 : 0,
      shadowWidth,
      shadowHeight,
      0x263027,
      0.34,
    );
    const sprite = this.add.image(0, 0, `character-${unit.sourceId}`);
    sprite.setOrigin(0.5, renderMetrics?.footY ?? SPRITE_ORIGIN_Y);
    sprite.setDisplaySize(displaySize, displaySize);
    if (flipX) sprite.setFlipX(true);
    const statusArt = new StatusEffectView(this);
    const statusBack = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const statusFront = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const hpY = unit.team === "enemies" ? -Math.ceil(visibleHeight) - 10 : -64;
    const hpBarWidth = enemyKind === "boss" ? 70 : enemyKind === "elite" ? 58 : 48;
    const hpPercent = Phaser.Math.Clamp(unit.hp / unit.maxHp, 0, 1);
    const hpBar = this.add.graphics().setPosition(0, hpY);
    this.drawHealthBar(
      hpBar,
      hpBarWidth,
      hpPercent,
      hpPercent < 0.25 ? 0xed594b : unit.team === "heroes" ? 0x78b85e : 0xe26f55,
    );
    const shieldPercent = Phaser.Math.Clamp(unit.shield / Math.max(1, unit.maxHp), 0, 1);
    const shield = this.add.graphics().setPosition(0, hpY);
    this.drawShieldBar(shield, hpBarWidth, shieldPercent);
    const castBarY = hpY + HEALTH_BAR_HEIGHT + CAST_BAR_GAP;
    const castBar = this.add.graphics().setPosition(0, castBarY).setVisible(false);
    this.drawCastBar(castBar, hpBarWidth, 0);
    const container = this.add.container(
      x,
      baseline,
      [shadow, statusBack, statusArt.back, sprite, statusFront, statusArt.front, hpBar, shield, castBar],
    );
    container.setDepth(this.getUnitDepth(baseline));
    const enteringHero = unit.team === "heroes"
      && unit.passiveFlags.heroEntryActive === true;
    container.setAlpha(enteringHero ? 1 : 0);
    // Enemies march in from off-screen — fade only, no scale pop in the middle of the path.
    if (unit.team === "enemies") {
      container.setScale(1);
      this.tweens.add({
        targets: container,
        alpha: 1,
        duration: this.reducedMotion ? 60 : 180,
        ease: "Quad.Out",
      });
    } else if (enteringHero) {
      container.setScale(1);
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
    const view: UnitView = {
      id: unit.id,
      sourceId: unit.sourceId,
      container,
      sprite,
      shadow,
      team: unit.team,
      attackMode: unit.attackMode,
      damageElement: unit.damageElement,
      hpBar,
      hpBarWidth,
      shield,
      castBar,
      statusArt,
      statusBack,
      statusFront,
      statusRadius: Phaser.Math.Clamp(visibleWidth * 0.7, 34, 66),
      // The health bar sits 10 px above the body; texture padding is not body height.
      statusHeight: -hpY - 10,
      statusTint: 0xffffff,
      activeStatusKinds: new Set<StatusVisualKind>(),
      baseScaleX: sprite.scaleX,
      baseScaleY: sprite.scaleY,
      floatTextOffsetY: hpY - 10,
      lastHpPercent: hpPercent,
      lastShieldPercent: shieldPercent,
      lastCastProgress: null,
      lastUnitX: unit.x,
      locomoting: false,
      locomotingHold: 0,
      attacking: false,
      activeSkillCastId: null,
      displayedHp: unit.hp,
      displayedMaxHp: unit.maxHp,
      displayedShield: unit.shield,
      hitFlashing: false,
      hitFlashVersion: 0,
      deathPresented: false,
    };
    this.unitViews.set(unit.id, view);
    this.syncStatusPresentation(view, unit);
  }

  updateUnit(unit: UnitState): void {
    const view = this.unitViews.get(unit.id);
    if (!view) return;

    if (!view.deathPresented) {
      const renderWorldX = this.renderWorldXByUnit.get(unit.id) ?? unit.x;
      view.container.x = projectBattleX(renderWorldX, this.cameraWorldX, this.scale.width);
      view.container.y = Math.round(this.getBaseline(unit));
    }
    view.container.setDepth(this.getUnitDepth(view.container.y));

    if (!this.pendingVisualDamage.has(unit.id) && !this.pendingVisualHealing.has(unit.id)) {
      view.displayedHp = unit.hp;
      view.displayedMaxHp = unit.maxHp;
      view.displayedShield = unit.shield;
      this.renderUnitBars(view);
    }
    this.syncCastBar(view, unit);

    if (this.simPulse && unit.alive) {
      const dx = Math.abs(unit.x - view.lastUnitX);
      view.lastUnitX = unit.x;
      // Ignore tiny separation nudges — only real travel drives the walk cycle.
      const walkStep = Math.max(1.2, unit.moveSpeed * 0.015);
      if (dx >= walkStep) {
        view.locomoting = true;
        view.locomotingHold = 3;
      } else if (view.locomotingHold > 0) {
        view.locomotingHold -= 1;
        view.locomoting = true;
      } else {
        view.locomoting = false;
      }
    }

    if (!view.attacking && !view.deathPresented) {
      if (!this.reducedMotion && view.locomoting) {
        const strideCycleMs = Phaser.Math.Clamp(
          (STRIDE_CYCLE_UNITS / Math.max(1, unit.moveSpeed)) * 1000,
          STRIDE_CYCLE_MIN_MS,
          STRIDE_CYCLE_MAX_MS,
        );
        const strideProgress =
          ((this.pendingSnapshot?.elapsedMs ?? 0) % strideCycleMs) / strideCycleMs;
        const lift = this.strideLift(strideProgress);
        view.sprite.setRotation(this.strideLeanAngle(strideProgress));
        view.sprite.setScale(
          view.baseScaleX * (1 - lift * STRIDE_STRETCH_X),
          view.baseScaleY * (1 + lift * STRIDE_STRETCH_Y),
        );
        view.sprite.y = -lift * STRIDE_BOB_PX;
      } else {
        view.sprite.setRotation(0);
        view.sprite.setScale(view.baseScaleX, view.baseScaleY);
        view.sprite.y = 0;
      }
    }

    this.syncStatusPresentation(view, unit);
    if (!view.hitFlashing) {
      view.sprite.setTint(view.deathPresented ? 0x827a72 : view.statusTint);
    }
  }

  removeUnit(id: string): void {
    const view = this.unitViews.get(id);
    if (!view) return;
    this.tweens.killTweensOf(view.sprite);
    this.tweens.killTweensOf(view.shadow);
    this.tweens.killTweensOf(view.hpBar);
    this.tweens.killTweensOf(view.shield);
    this.tweens.killTweensOf(view.statusBack);
    this.tweens.killTweensOf(view.statusFront);
    this.tweens.killTweensOf(view.container);
    view.container.destroy(true);
    this.unitViews.delete(id);
    this.renderWorldXByUnit.delete(id);
    this.pendingVisualDamage.delete(id);
    this.pendingVisualHealing.delete(id);
  }

  /** Hold health presentation until a correlated projectile reaches its impact frame. */
  private reserveVisualHealthChanges(events: readonly BattleEvent[]): void {
    for (const event of events) {
      if (event.type === "damage") {
        const correlationId = this.damageCorrelationId(event);
        if (!correlationId) continue;
        const pending = this.pendingVisualDamage.get(event.targetId) ?? new Set<string>();
        pending.add(correlationId);
        this.pendingVisualDamage.set(event.targetId, pending);
      } else if (event.type === "heal" && event.skillCastId) {
        const correlationId = this.skillImpactKey(event.skillCastId, event.targetId);
        const pending = this.pendingVisualHealing.get(event.targetId) ?? new Set<string>();
        pending.add(correlationId);
        this.pendingVisualHealing.set(event.targetId, pending);
      }
    }
  }

  private damageCorrelationId(
    event: Extract<BattleEvent, { type: "damage" }>,
  ): string | null {
    if (event.attackId) return `attack:${event.attackId}`;
    if (event.skillCastId) return this.skillImpactKey(event.skillCastId, event.targetId);
    return null;
  }

  private skillImpactKey(castId: string, targetId: string): string {
    return `skill:${castId}:${targetId}`;
  }

  private completeVisualDamage(targetId: string, correlationId: string): void {
    const pending = this.pendingVisualDamage.get(targetId);
    if (!pending) return;
    pending.delete(correlationId);
    if (pending.size === 0) this.pendingVisualDamage.delete(targetId);
  }

  private completeVisualHealing(targetId: string, correlationId: string): void {
    const pending = this.pendingVisualHealing.get(targetId);
    if (!pending) return;
    pending.delete(correlationId);
    if (pending.size === 0) this.pendingVisualHealing.delete(targetId);
  }

  private renderUnitBars(view: UnitView): void {
    const hpPercent = Phaser.Math.Clamp(
      view.displayedHp / Math.max(1, view.displayedMaxHp),
      0,
      1,
    );
    if (hpPercent !== view.lastHpPercent) {
      this.drawHealthBar(
        view.hpBar,
        view.hpBarWidth,
        hpPercent,
        hpPercent < 0.25 ? 0xed594b : view.team === "heroes" ? 0x78b85e : 0xe26f55,
      );
      view.lastHpPercent = hpPercent;
    }
    const shieldPercent = Phaser.Math.Clamp(
      view.displayedShield / Math.max(1, view.displayedMaxHp),
      0,
      1,
    );
    if (shieldPercent !== view.lastShieldPercent) {
      this.drawShieldBar(view.shield, view.hpBarWidth, shieldPercent);
      view.lastShieldPercent = shieldPercent;
    }
  }

  private syncCastBar(view: UnitView, unit: UnitState): void {
    const channel = channelProgress(unit);
    const preparing = unit.alive && unit.skillPrepareMs !== null && unit.skillCastDurationMs !== null;
    if (channel === null && !preparing) {
      view.castBar.setVisible(false);
      view.lastCastProgress = null;
      return;
    }
    const progress = channel ?? Phaser.Math.Clamp(1 - unit.skillPrepareMs! / unit.skillCastDurationMs!, 0, 1);
    view.castBar.setVisible(true);
    if (progress !== view.lastCastProgress) {
      this.drawCastBar(view.castBar, view.hpBarWidth, progress);
      view.lastCastProgress = progress;
    }
  }

  playEvent(event: BattleEvent): void {
    if (event.type === "damage") {
      const showDamage = (): void => {
        const view = this.unitViews.get(event.targetId);
        if (!view) return;
        const correlationId = this.damageCorrelationId(event);
        if (correlationId) {
          view.displayedShield = Math.max(0, view.displayedShield - (event.absorbed ?? 0));
          view.displayedHp = Math.max(0, view.displayedHp - (event.hpDamage ?? 0));
          this.renderUnitBars(view);
          this.completeVisualDamage(event.targetId, correlationId);
        }
        const color = event.critical
          ? "#f4cf58"
          : DAMAGE_ELEMENT_COLOR[event.element ?? "physical"] ?? "#fff4e4";
        const floatX = view.container.x + Phaser.Math.Between(-10, 10);
        const floatY = view.container.y
          + view.floatTextOffsetY
          + Phaser.Math.Between(-5, 5);
        this.floatText(
          floatX,
          floatY,
          `${event.critical ? "✦ " : "−"}${event.amount}`,
          color,
          event.critical ? 26 : 19,
          "combat-number",
        );
        const source = this.unitViews.get(event.sourceId);
        this.playHitReaction(
          view,
          source?.container.x,
        );
      };
      const impact = event.attackId
        ? this.pendingAttackImpacts.get(event.attackId)
        : event.skillCastId
          ? this.pendingSkillImpacts.get(this.skillImpactKey(event.skillCastId, event.targetId))
          : undefined;
      if (impact) {
        this.time.delayedCall(impact.delayMs, showDamage);
      } else {
        showDamage();
      }
    } else if (event.type === "heal" && event.presentation !== "silent") {
      const showHeal = (): void => {
        const view = this.unitViews.get(event.targetId);
        if (!view) return;
        if (event.skillCastId) {
          const correlationId = this.skillImpactKey(event.skillCastId, event.targetId);
          view.displayedHp = Math.min(view.displayedMaxHp, view.displayedHp + event.amount);
          this.renderUnitBars(view);
          this.completeVisualHealing(event.targetId, correlationId);
        }
        this.floatText(
          view.container.x,
          view.container.y + view.floatTextOffsetY,
          `+${event.amount}`,
          "#b7ea86",
          18,
          "combat-number",
        );
      };
      const impact = event.skillCastId
        ? this.pendingSkillImpacts.get(this.skillImpactKey(event.skillCastId, event.targetId))
        : undefined;
      if (impact) this.time.delayedCall(impact.delayMs, showHeal);
      else showHeal();
    } else if (event.type === "attack") {
      const source = this.unitViews.get(event.sourceId);
      const target = this.unitViews.get(event.targetId);
      if (source && target) {
        const color = ATTACK_FX_COLOR[event.element];
        const impact = this.createAttackImpact(source, target, event.attackMode);
        this.pendingAttackImpacts.set(event.attackId, impact);
        this.playAttackMotion(source, target.container.x, event.attackMode);
        if (event.attackMode === "ranged") {
          const releaseMs = impact.delayMs - impact.travelMs;
          this.time.delayedCall(releaseMs, () => {
            const liveSource = this.unitViews.get(event.sourceId);
            const liveTarget = this.unitViews.get(event.targetId);
            if (!liveSource || !liveTarget) return;
            const direction = Math.sign(liveTarget.container.x - liveSource.container.x) || 1;
            const origin = this.projectileOrigin(liveSource, direction);
            const destination = this.projectileDestination(liveTarget);
            this.projectile(
              origin.x,
              origin.y,
              destination.x,
              destination.y,
              color,
              impact.travelMs,
              this.projectileStyle(liveSource),
              false,
            );
          });
        } else {
          this.time.delayedCall(impact.delayMs, () => {
            const liveSource = this.unitViews.get(event.sourceId);
            const liveTarget = this.unitViews.get(event.targetId);
            if (!liveSource || !liveTarget) return;
            this.meleeStrike(
              liveSource.container.x,
              liveSource.container.y - 22,
              liveTarget.container.x,
              liveTarget.container.y - 28,
              color,
            );
          });
        }
        this.time.delayedCall(impact.delayMs + HIT_FLASH_MS + 100, () => {
          this.pendingAttackImpacts.delete(event.attackId);
        });
      }
    } else if (event.type === "skill:started") {
      const view = this.unitViews.get(event.sourceId);
      const skillName = SKILL_NAME_BY_ID.get(event.skillId);
      if (view) this.playSkillWindup(view, event.castId);
      if (view && skillName) {
        this.floatText(
          view.container.x,
          view.container.y + view.floatTextOffsetY - 8,
          skillName,
          view.team === "heroes" ? "#ffd66f" : "#ffb07c",
          19,
        );
      }
    } else if (event.type === "skill:resolved") {
      const view = this.unitViews.get(event.sourceId);
      if (view) {
        this.playSkillRelease(view, event.castId);
        if (view.attackMode === "ranged") {
          if (PARTY_HEAL_SKILL_IDS.has(event.skillId)) {
            const impact: PendingAttackImpact = {
              delayMs: this.reducedMotion ? 55 : 140,
              travelMs: 0,
            };
            const targets: UnitView[] = [];
            for (const targetId of event.targetIds) {
              const target = this.unitViews.get(targetId);
              if (!target || target.team !== view.team) continue;
              targets.push(target);
              const key = this.skillImpactKey(event.castId, targetId);
              this.pendingSkillImpacts.set(key, impact);
              this.time.delayedCall(impact.delayMs + HIT_FLASH_MS + 120, () => {
                this.pendingSkillImpacts.delete(key);
              });
            }
            this.partyHealingWave(view, targets, impact.delayMs);
          } else {
            for (const [index, targetId] of event.targetIds.entries()) {
              if (targetId === event.sourceId) continue;
              const target = this.unitViews.get(targetId);
              if (!target) continue;
              const supportive = target.team === view.team;
              const impact = this.createAttackImpact(view, target, "ranged");
              impact.delayMs += index * 24;
              const key = this.skillImpactKey(event.castId, targetId);
              this.pendingSkillImpacts.set(key, impact);
              const releaseMs = impact.delayMs - impact.travelMs;
              this.time.delayedCall(releaseMs, () => {
                const liveSource = this.unitViews.get(event.sourceId);
                const liveTarget = this.unitViews.get(targetId);
                if (!liveSource || !liveTarget) return;
                if (supportive) {
                  this.healingProjectile(liveSource, liveTarget, impact.travelMs);
                } else {
                  const direction = Math.sign(liveTarget.container.x - liveSource.container.x) || 1;
                  const origin = this.projectileOrigin(liveSource, direction);
                  const destination = this.projectileDestination(liveTarget);
                  this.projectile(
                    origin.x,
                    origin.y,
                    destination.x,
                    destination.y,
                    ATTACK_FX_COLOR[liveSource.damageElement],
                    impact.travelMs,
                    this.projectileStyle(liveSource),
                    true,
                  );
                }
              });
              this.time.delayedCall(impact.delayMs + HIT_FLASH_MS + 120, () => {
                this.pendingSkillImpacts.delete(key);
              });
            }
          }
        }
      }
    } else if (event.type === "skill:cancelled") {
      const view = this.unitViews.get(event.sourceId);
      if (view) {
        this.cancelSkillMotion(view, event.castId);
        this.floatText(
          view.container.x,
          view.container.y + view.floatTextOffsetY - 4,
          "施法中断",
          "#ff9a72",
          16,
        );
      }
    } else if (event.type === "boss:intro") {
      if (!this.reducedMotion) this.cameras.main.shake(240, 0.008);
    } else if (event.type === "unit:died") {
      const die = (): void => {
        const view = this.unitViews.get(event.unitId);
        if (view) this.playDeath(view);
      };
      const impact = event.attackId
        ? this.pendingAttackImpacts.get(event.attackId)
        : event.skillCastId
          ? this.pendingSkillImpacts.get(this.skillImpactKey(event.skillCastId, event.unitId))
          : undefined;
      if (impact) this.time.delayedCall(impact.delayMs, die);
      else die();
    } else if (event.type === "loot:dropped") {
      const impact = event.attackId
        ? this.pendingAttackImpacts.get(event.attackId)
        : event.skillCastId
          ? this.pendingSkillImpacts.get(this.skillImpactKey(event.skillCastId, event.sourceUnitId))
          : undefined;
      const delayMs = (impact?.delayMs ?? 0) + (this.reducedMotion ? 20 : 110);
      this.time.delayedCall(delayMs, () => this.playLootDrop(event));
    } else if (event.type === "battle:victory") {
      this.victoryBurst();
    }
  }

  private playLootDrop(event: Extract<BattleEvent, { type: "loot:dropped" }>): void {
    const source = this.unitViews.get(event.sourceUnitId);
    const originX = source?.container.x
      ?? projectBattleX(event.worldX, this.cameraWorldX, this.scale.width);
    const originY = source?.container.y ?? Math.round(event.worldY + BATTLE_LANE_OFFSET_Y);
    const side = event.drop === "gold" ? 1 : -1;
    const groundX = Phaser.Math.Clamp(originX + side * 20, 24, this.scale.width - 24);
    const groundY = Phaser.Math.Clamp(originY - 6, 54, this.scale.height - 24);
    const size = event.drop === "gold" ? 29 : 35;
    const textureKey = event.drop === "gold"
      ? "loot-gold"
      : `loot-equipment-${event.definitionId}`;
    if (!this.textures.exists(textureKey)) return;

    const shadow = this.add.ellipse(0, size * 0.44, size * 0.72, 7, 0x171b1c, 0.34);
    const children: Phaser.GameObjects.GameObject[] = [shadow];
    if (event.drop === "equipment") {
      const frameColor = Number.parseInt(RARITY_COLORS[event.rarity].slice(1), 16);
      const frame = this.add.graphics();
      frame.fillStyle(0x2e333d, 0.96);
      frame.lineStyle(3, frameColor, 1);
      frame.fillRoundedRect(-size / 2, -size / 2, size, size, 7);
      frame.strokeRoundedRect(-size / 2, -size / 2, size, size, 7);
      children.push(frame);
    }
    const icon = this.add.image(0, event.drop === "gold" ? -1 : 0, textureKey);
    icon.setDisplaySize(
      event.drop === "gold" ? size : size - 7,
      event.drop === "gold" ? size : size - 7,
    );
    children.push(icon);

    const effect = this.add.container(originX, originY - 38, children)
      .setDepth(DEPTH_FX + 30)
      .setScale(0.72)
      .setAlpha(0);
    this.lootEffects.add(effect);
    const dropDuration = this.reducedMotion ? 80 : 240;
    const holdDuration = this.reducedMotion ? 45 : 320;
    const flyDuration = this.reducedMotion ? 170 : 440;
    this.tweens.add({
      targets: effect,
      x: groundX,
      y: groundY,
      alpha: 1,
      scale: 1,
      angle: this.reducedMotion ? 0 : side * 6,
      duration: dropDuration,
      ease: this.reducedMotion ? "Quad.Out" : "Bounce.Out",
      onComplete: () => {
        this.time.delayedCall(holdDuration, () => {
          if (!effect.active) return;
          this.tweens.add({
            targets: effect,
            x: this.scale.width * 0.52,
            y: this.scale.height + 26,
            scale: 0.42,
            alpha: 0.12,
            angle: 0,
            duration: flyDuration,
            ease: "Cubic.In",
            onComplete: () => {
              this.lootEffects.delete(effect);
              effect.destroy(true);
            },
          });
        });
      },
    });
  }

  private createAttackImpact(
    source: UnitView,
    target: UnitView,
    attackMode: AttackMode,
  ): PendingAttackImpact {
    if (attackMode === "melee") {
      return {
        delayMs: this.reducedMotion ? 45 : MELEE_IMPACT_MS,
        travelMs: 0,
      };
    }
    const distance = Phaser.Math.Distance.Between(
      source.container.x,
      source.container.y - 27,
      target.container.x,
      target.container.y - 30,
    );
    const releaseMs = this.reducedMotion ? 35 : RANGED_RELEASE_MS;
    const travelMs = this.reducedMotion
      ? Phaser.Math.Clamp(distance / 2.4, 55, 100)
      : Phaser.Math.Clamp(
          distance / RANGED_PROJECTILE_SPEED_PX_PER_MS,
          RANGED_TRAVEL_MIN_MS,
          RANGED_TRAVEL_MAX_MS,
        );
    return {
      delayMs: Math.round(releaseMs + travelMs),
      travelMs: Math.round(travelMs),
    };
  }

  private playHitReaction(view: UnitView, sourceScreenX?: number): void {
    view.hitFlashVersion += 1;
    const version = view.hitFlashVersion;
    view.hitFlashing = true;
    view.sprite.setTintFill(0xffffff);

    if (!this.reducedMotion && !view.attacking && Math.abs(view.sprite.x) < 0.5) {
      const direction = sourceScreenX === undefined
        ? 1
        : Math.sign(view.container.x - sourceScreenX) || 1;
      this.tweens.add({
        targets: view.sprite,
        x: direction * HIT_RECOIL_PX,
        duration: 45,
        ease: "Quad.Out",
        yoyo: true,
      });
    }

    this.time.delayedCall(this.reducedMotion ? 35 : HIT_FLASH_MS, () => {
      if (!view.sprite.active || view.hitFlashVersion !== version) return;
      view.hitFlashing = false;
      view.sprite.setTint(view.deathPresented ? 0x827a72 : view.statusTint);
    });
  }

  private playDeath(view: UnitView): void {
    if (view.container.getData("dying")) return;
    view.container.setData("dying", true);
    view.deathPresented = true;
    view.locomoting = false;
    view.activeSkillCastId = null;
    this.tweens.add({
      targets: [view.hpBar, view.shield],
      alpha: 0,
      duration: this.reducedMotion ? 35 : 70,
      ease: "Quad.Out",
    });

    const dissolve = (): void => {
      if (!view.container.active) return;
      this.tweens.killTweensOf(view.sprite);
      this.tweens.killTweensOf(view.shadow);
      view.sprite.setTint(0x827a72);
      this.tweens.add({
        targets: view.shadow,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: this.reducedMotion ? 70 : 140,
        ease: "Quad.In",
      });
      this.tweens.add({
        targets: view.sprite,
        alpha: 0,
        y: view.sprite.y - (this.reducedMotion ? 6 : DEATH_FLOAT_PX),
        scaleX: view.baseScaleX * DEATH_SCALE,
        scaleY: view.baseScaleY * DEATH_SCALE,
        rotation: (view.sprite.flipX ? -1 : 1) * Phaser.Math.DegToRad(4),
        duration: this.reducedMotion ? 90 : DEATH_DURATION_MS,
        ease: "Quad.In",
        onComplete: () => {
          if (view.container.active) view.container.setAlpha(0);
        },
      });
    };
    if (view.hitFlashing) {
      // Let the short hit recoil settle before the character separates from its shadow.
      this.time.delayedCall(this.reducedMotion ? 35 : 90, dissolve);
    } else {
      dissolve();
    }
  }

  private createBackground(): void {
    this.backgroundView = new BattleBackgroundView(this, this.initialSnapshot.stage);
  }

  private syncBackground(stage: number): void {
    this.backgroundView.sync(stage);
  }

  private advanceRenderWorldPositions(snapshot: BattleSnapshot, deltaMs: number): void {
    for (const unit of snapshot.units) {
      const currentX = this.renderWorldXByUnit.get(unit.id) ?? unit.x;
      this.renderWorldXByUnit.set(
        unit.id,
        advanceBattleRenderX(currentX, unit.x, deltaMs, this.reducedMotion),
      );
    }
  }

  /** Follow the interpolated front hero; only leader changes receive a short reframe. */
  private resolveCameraTarget(snapshot: BattleSnapshot, deltaMs: number): number {
    const leader = findFrontmostLivingHero(snapshot.units);
    if (!leader) return this.cameraWorldX;

    const entryAnchorWorldX = findHeroEntryCameraAnchor(snapshot.units);
    if (entryAnchorWorldX !== null) {
      this.cameraAnchorWorldX = entryAnchorWorldX;
      // Force the normal leader hand-off easing when entry framing releases.
      this.cameraLeaderId = null;
      this.cameraLeaderTransitionElapsedMs = CAMERA_LEADER_SWITCH_MS;
      return battleCameraXForAnchor(entryAnchorWorldX);
    }

    const leaderWorldX = this.renderWorldXByUnit.get(leader.id) ?? leader.x;
    if (this.cameraAnchorWorldX === null) {
      this.cameraAnchorWorldX = leaderWorldX;
      this.cameraLeaderId = leader.id;
      return battleCameraXForAnchor(leaderWorldX);
    }

    if (leader.id !== this.cameraLeaderId) {
      this.cameraLeaderId = leader.id;
      this.cameraLeaderTransitionFromX = this.cameraAnchorWorldX;
      this.cameraLeaderTransitionElapsedMs = 0;
    }

    if (this.cameraLeaderTransitionElapsedMs < CAMERA_LEADER_SWITCH_MS) {
      this.cameraLeaderTransitionElapsedMs = Math.min(
        CAMERA_LEADER_SWITCH_MS,
        this.cameraLeaderTransitionElapsedMs + Math.max(0, deltaMs),
      );
      this.cameraAnchorWorldX = interpolateLeaderCameraAnchor(
        this.cameraLeaderTransitionFromX,
        leaderWorldX,
        this.cameraLeaderTransitionElapsedMs,
        this.reducedMotion ? 0 : CAMERA_LEADER_SWITCH_MS,
      );
    } else {
      this.cameraAnchorWorldX = leaderWorldX;
    }

    return battleCameraXForAnchor(this.cameraAnchorWorldX);
  }

  /** Continuous lean loop — sin wraps cleanly at 0/1 (no pop). */
  private strideLeanAngle(progress: number): number {
    return Math.sin(progress * Math.PI * 2) * MOVE_WOBBLE_RAD;
  }

  private strideLift(progress: number): number {
    return Math.abs(Math.sin(progress * Math.PI * 2));
  }

  private playAttackMotion(
    view: UnitView,
    targetScreenX: number,
    attackMode: AttackMode,
  ): void {
    const leanSign =
      Math.sign(targetScreenX - view.container.x) || (view.sprite.flipX ? -1 : 1);
    const melee = attackMode === "melee";
    const lean = melee
      ? leanSign * ATTACK_LEAN_RAD
      : -leanSign * Phaser.Math.DegToRad(6);
    const lunge = melee
      ? leanSign * ATTACK_LUNGE_PX
      : -leanSign * RANGED_RECOIL_PX;
    view.activeSkillCastId = null;
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

    // Melee commits forward; ranged attacks recoil before settling back on the same foot point.
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

  private playSkillWindup(view: UnitView, castId: string): void {
    const direction = view.sprite.flipX ? -1 : 1;
    const prepLean = -direction * Phaser.Math.DegToRad(6);

    this.tweens.killTweensOf(view.sprite);
    view.activeSkillCastId = castId;
    view.attacking = true;
    view.sprite.setPosition(0, 0);
    view.sprite.setRotation(0);
    view.sprite.setScale(view.baseScaleX, view.baseScaleY);

    this.tweens.add({
      targets: view.sprite,
      x: (this.reducedMotion ? -2 : -4) * direction,
      y: this.reducedMotion ? 1 : 2,
      rotation: prepLean * (this.reducedMotion ? 0.45 : 1),
      scaleX: view.baseScaleX * (this.reducedMotion ? 0.96 : 0.9),
      scaleY: view.baseScaleY * (this.reducedMotion ? 1.04 : 1.1),
      duration: this.reducedMotion ? 80 : 130,
      ease: "Quad.In",
      onComplete: () => {
        if (!view.sprite.active || view.activeSkillCastId !== castId) return;
        this.tweens.add({
          targets: view.sprite,
          y: this.reducedMotion ? 0 : 1,
          scaleX: view.baseScaleX * (this.reducedMotion ? 0.98 : 0.93),
          scaleY: view.baseScaleY * (this.reducedMotion ? 1.02 : 1.07),
          duration: this.reducedMotion ? 140 : 180,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1,
        });
      },
    });
  }

  private playSkillRelease(view: UnitView, castId: string): void {
    if (view.activeSkillCastId !== castId || !view.sprite.active) return;
    const direction = view.sprite.flipX ? -1 : 1;

    this.tweens.killTweensOf(view.sprite);
    view.sprite.setPosition((this.reducedMotion ? 6 : 11) * direction, -3);
    view.sprite.setRotation(direction * Phaser.Math.DegToRad(this.reducedMotion ? 3 : 8));
    view.sprite.setScale(
      view.baseScaleX * (this.reducedMotion ? 1.07 : 1.16),
      view.baseScaleY * (this.reducedMotion ? 1.07 : 1.16),
    );
    this.tweens.add({
      targets: view.sprite,
      x: (this.reducedMotion ? 4 : 7) * direction,
      rotation: -direction * Phaser.Math.DegToRad(this.reducedMotion ? 1 : 3),
      scaleX: view.baseScaleX * (this.reducedMotion ? 1.03 : 1.08),
      scaleY: view.baseScaleY * (this.reducedMotion ? 1.04 : 1.1),
      duration: this.reducedMotion ? 45 : 70,
      ease: "Cubic.Out",
      onComplete: () => this.recoverSkillMotion(
        view,
        this.reducedMotion ? 80 : 140,
        castId,
      ),
    });
  }

  private cancelSkillMotion(view: UnitView, castId: string): void {
    if (view.activeSkillCastId !== castId || !view.sprite.active) return;
    this.tweens.killTweensOf(view.sprite);
    this.recoverSkillMotion(view, this.reducedMotion ? 60 : 100, castId);
  }

  private recoverSkillMotion(view: UnitView, duration: number, castId: string): void {
    this.tweens.add({
      targets: view.sprite,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: view.baseScaleX,
      scaleY: view.baseScaleY,
      duration,
      ease: "Back.Out",
      onComplete: () => {
        if (!view.sprite.active || view.activeSkillCastId !== castId) return;
        view.sprite.setPosition(0, 0);
        view.sprite.setRotation(0);
        view.sprite.setScale(view.baseScaleX, view.baseScaleY);
        view.activeSkillCastId = null;
        view.attacking = false;
      },
    });
  }

  private isFreezeStatus(effectId?: string): boolean {
    return effectId?.toLowerCase().includes("freeze") ?? false;
  }

  private getStatusVisualKinds(unit: UnitState): StatusVisualKind[] {
    const kinds = new Set<StatusVisualKind>();
    for (const status of unit.statuses) {
      if (status.remainingMs <= 0) continue;
      kinds.add(
        status.kind === "stun" && this.isFreezeStatus(status.effectId)
          ? "freeze"
          : status.kind,
      );
    }
    return STATUS_TINT_PRIORITY.filter((kind) => kinds.has(kind));
  }

  /** Derive every persistent status cue from the simulation snapshot. */
  private syncStatusPresentation(view: UnitView, unit: UnitState): void {
    const back = view.statusBack;
    const front = view.statusFront;
    back.clear();
    front.clear();

    const kinds = unit.alive ? this.getStatusVisualKinds(unit) : [];
    for (const kind of kinds) {
      if (!view.activeStatusKinds.has(kind)) this.presentStatusApplied(view, kind);
    }
    view.activeStatusKinds = new Set(kinds);
    const primaryKind = kinds[0];
    view.statusTint = primaryKind
      ? STATUS_PRESENTATION[primaryKind].tint
      : 0xffffff;
    back.setPosition(view.shadow.x, 0);
    front.setPosition(view.shadow.x, 0);
    view.statusArt.update(kinds, view.sprite, view.statusRadius, view.statusHeight, view.hpBar.y, view.shadow.x, this.reducedMotion);
    if (!primaryKind) return;

    const radius = view.statusRadius;
    const height = view.statusHeight;
    const phase = this.reducedMotion ? 0 : this.time.now / 760;
    const pulse = this.reducedMotion ? 0.5 : (Math.sin(phase * Math.PI * 2) + 1) / 2;

    if (kinds.includes("slow")) {
      const color = 0x67c8ff;
      back.lineStyle(3.2, color, 0.6 + pulse * 0.22);
      back.strokeEllipse(0, -1, radius * (1.62 + pulse * 0.16), 13 + pulse * 3);
      for (let index = 0; index < 3; index += 1) {
        const angle = phase * 0.65 + index * (Math.PI * 2 / 3);
        this.drawSnowflake(
          front,
          Math.cos(angle) * radius * 0.78,
          -height * (0.45 + Math.sin(angle) * 0.22),
          4.6,
          color,
          0.86,
        );
      }
    }
  }

  private drawSnowflake(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
  ): void {
    graphics.lineStyle(2, color, alpha);
    for (let index = 0; index < 3; index += 1) {
      const angle = index * Math.PI / 3;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      graphics.lineBetween(x - dx, y - dy, x + dx, y + dy);
    }
  }

  private presentStatusApplied(view: UnitView, kind: StatusVisualKind): void {
    const presentation = STATUS_PRESENTATION[kind];
    const lane = this.statusFloatLanes.get(view.id) ?? 0;
    this.statusFloatLanes.set(view.id, lane + 1);
    this.floatText(
      view.container.x + (lane % 2 === 0 ? -5 : 5),
      view.container.y + view.floatTextOffsetY - 8 - lane * 19,
      presentation.label,
      presentation.textColor,
      23,
    );
  }

  private getBaseline(unit: UnitState): number {
    // unit.y is a DNF-style lane offset: negative = farther up the path.
    // Path center sits on the dirt road (not the tree line / upper mid-ground).
    return this.scale.height * this.backgroundView.pathCenterYRatio + unit.y + BATTLE_LANE_OFFSET_Y;
  }

  /** Keep Y-sorting among units while always staying under foreground bushes. */
  private getUnitDepth(baseline: number): number {
    return Math.min(Math.round(baseline), DEPTH_FOREGROUND - 1);
  }

  private drawHealthBar(
    bar: Phaser.GameObjects.Graphics,
    width: number,
    percent: number,
    color: number,
  ): void {
    this.drawRoundedBar(
      bar,
      width,
      HEALTH_BAR_HEIGHT,
      HEALTH_BAR_OUTLINE,
      percent,
      color,
    );
  }

  private drawShieldBar(
    bar: Phaser.GameObjects.Graphics,
    width: number,
    percent: number,
  ): void {
    const innerHeight = HEALTH_BAR_HEIGHT - HEALTH_BAR_OUTLINE * 2;
    const innerWidth = width - HEALTH_BAR_OUTLINE * 2;
    const fillWidth = innerWidth * Phaser.Math.Clamp(percent, 0, 1);
    bar.clear();
    bar.setVisible(fillWidth > 0);
    if (fillWidth <= 0) return;

    const left = -width / 2 + HEALTH_BAR_OUTLINE;
    const radius = Math.min(innerHeight / 2, fillWidth / 2);
    bar.fillStyle(SHIELD_BAR_COLOR, 0.98);
    bar.fillRoundedRect(left, -innerHeight / 2, fillWidth, innerHeight, radius);
    bar.lineStyle(1, SHIELD_BAR_HIGHLIGHT, 0.9);
    bar.lineBetween(left + radius, -innerHeight / 2 + 1, left + fillWidth - radius, -innerHeight / 2 + 1);
  }

  private drawCastBar(
    bar: Phaser.GameObjects.Graphics,
    width: number,
    percent: number,
  ): void {
    this.drawRoundedBar(
      bar,
      width,
      HEALTH_BAR_HEIGHT,
      HEALTH_BAR_OUTLINE,
      percent,
      CAST_BAR_COLOR,
    );
  }

  private drawRoundedBar(
    bar: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    outline: number,
    percent: number,
    color: number,
  ): void {
    const innerHeight = height - outline * 2;
    const innerWidth = width - outline * 2;
    const fillWidth = innerWidth * Phaser.Math.Clamp(percent, 0, 1);
    bar.clear();
    bar.fillStyle(0x343840, 0.96);
    bar.fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    if (fillWidth > 0) {
      bar.fillStyle(color, 1);
      bar.fillRoundedRect(
        -width / 2 + outline,
        -innerHeight / 2,
        fillWidth,
        innerHeight,
        Math.min(innerHeight / 2, fillWidth / 2),
      );
    }
    bar.lineStyle(outline, 0x171a20, 1);
    bar.strokeRoundedRect(
      -width / 2 + outline / 2,
      -height / 2 + outline / 2,
      width - outline,
      height - outline,
      (height - outline) / 2,
    );
  }

  private floatText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    style: FloatTextStyle = "ui-label",
  ): void {
    this.combatFloats.show(x, y, text, color, size, this.reducedMotion, style);
  }

  private meleeStrike(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
  ): void {
    const direction = Math.sign(x2 - x1) || 1;
    const slash = this.add
      .arc(
        Phaser.Math.Linear(x1, x2, 0.72),
        Phaser.Math.Linear(y1, y2, 0.72),
        17,
        -65,
        65,
        false,
        color,
        0,
      )
      .setStrokeStyle(4, color, 0.95)
      .setRotation(direction > 0 ? 0 : Math.PI)
      .setScale(0.65)
      .setDepth(DEPTH_FX);
    this.tweens.add({
      targets: slash,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: this.reducedMotion ? 80 : 160,
      ease: "Cubic.Out",
      onComplete: () => slash.destroy(),
    });
    this.impactBurst(x2, y2, color);
  }

  private projectileOrigin(view: UnitView, direction: number): { x: number; y: number } {
    return {
      x: view.container.x + direction * view.statusRadius * 0.48,
      y: view.container.y - view.statusHeight * 0.5,
    };
  }

  private projectileDestination(view: UnitView): { x: number; y: number } {
    return {
      x: view.container.x,
      y: view.container.y - view.statusHeight * 0.46,
    };
  }

  private projectileStyle(view: UnitView): ProjectileStyle {
    if (view.damageElement === "physical") return "arrow";
    if (view.damageElement === "lightning") return "bolt";
    if (view.team === "enemies") return "spit";
    return "orb";
  }

  private projectile(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    duration: number,
    style: ProjectileStyle,
    skill: boolean,
  ): void {
    const children: Phaser.GameObjects.GameObject[] = [];
    if (style === "arrow") {
      const glow = this.add.ellipse(-7, 0, 46, 10, color, 0.42);
      const arrow = this.add.graphics();
      arrow.lineStyle(skill ? 4 : 3, color, 1);
      arrow.lineBetween(-18, 0, 13, 0);
      arrow.fillStyle(0xffffff, 0.95);
      arrow.fillTriangle(12, -6, 22, 0, 12, 6);
      arrow.lineStyle(2, color, 0.9);
      arrow.lineBetween(-17, 0, -23, -6);
      arrow.lineBetween(-17, 0, -23, 6);
      children.push(glow, arrow);
    } else if (style === "bolt") {
      const glow = this.add.ellipse(-7, 0, 50, 15, color, 0.44);
      const bolt = this.add.graphics();
      bolt.lineStyle(skill ? 5 : 3.5, 0xffffff, 0.95);
      bolt.beginPath();
      bolt.moveTo(-23, 4);
      bolt.lineTo(-9, -5);
      bolt.lineTo(1, 4);
      bolt.lineTo(13, -4);
      bolt.lineTo(24, 0);
      bolt.strokePath();
      children.push(glow, bolt);
    } else if (style === "spit") {
      const trail = this.add.ellipse(-12, 0, 48, 14, color, 0.4);
      const core = this.add.circle(8, 0, skill ? 9 : 7, color, 1)
        .setStrokeStyle(2, 0xffffff, 0.78);
      children.push(trail, core);
    } else {
      const glow = this.add.ellipse(-9, 0, skill ? 58 : 48, skill ? 21 : 17, color, 0.46);
      const core = this.add.circle(8, 0, skill ? 9 : 7, color, 1)
        .setStrokeStyle(2, 0xffffff, 0.92);
      const spark = this.add.circle(-12, 0, skill ? 4 : 3, 0xffffff, 0.8);
      children.push(glow, core, spark);
    }
    const projectile = this.add
      .container(x1, y1, children)
      .setRotation(Math.atan2(y2 - y1, x2 - x1))
      .setScale(skill ? 1.35 : 1.08)
      .setDepth(DEPTH_FX);
    this.tweens.add({
      targets: projectile,
      x: x2,
      y: y2,
      duration,
      ease: "Linear",
      onComplete: () => {
        projectile.destroy(true);
        this.impactBurst(x2, y2, color, skill ? 1.45 : 1);
      },
    });
  }

  private partyHealingWave(
    source: UnitView,
    targets: readonly UnitView[],
    duration: number,
  ): void {
    const maxDistance = targets.reduce(
      (largest, target) => Math.max(largest, Math.abs(target.container.x - source.container.x)),
      42,
    );
    const wave = this.add
      .ellipse(source.container.x, source.container.y - 24, 28, 13, HEAL_FX_COLOR, 0.12)
      .setStrokeStyle(3, HEAL_FX_COLOR, 0.92)
      .setDepth(DEPTH_FX);
    const inner = this.add
      .ellipse(source.container.x, source.container.y - 24, 18, 8, 0xf5ffe9, 0.18)
      .setStrokeStyle(2, 0xf5ffe9, 0.88)
      .setDepth(DEPTH_FX);
    this.tweens.add({
      targets: wave,
      scaleX: Math.max(3, maxDistance / 13),
      scaleY: 3.2,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
      onUpdate: () => wave.setPosition(source.container.x, source.container.y - 24),
      onComplete: () => wave.destroy(),
    });
    this.tweens.add({
      targets: inner,
      scaleX: Math.max(2.4, maxDistance / 17),
      scaleY: 2.4,
      alpha: 0,
      duration,
      ease: "Quad.Out",
      onUpdate: () => inner.setPosition(source.container.x, source.container.y - 24),
      onComplete: () => {
        inner.destroy();
        for (const target of targets) {
          if (!target.container.active) continue;
          const impact = this.projectileDestination(target);
          this.impactBurst(impact.x, impact.y, HEAL_FX_COLOR, 1.2);
        }
      },
    });
  }

  private healingProjectile(source: UnitView, target: UnitView, duration: number): void {
    const direction = Math.sign(target.container.x - source.container.x) || 1;
    const origin = this.projectileOrigin(source, direction);
    const destination = this.projectileDestination(target);
    const launchCameraX = this.cameraWorldX;
    const arcHeight = this.reducedMotion
      ? 10
      : Phaser.Math.Clamp(Math.abs(destination.x - origin.x) * 0.2, 20, 46);
    const glow = this.add.circle(0, 0, 11, HEAL_FX_COLOR, 0.28);
    const core = this.add.circle(0, 0, 5, 0xf5ffe9, 1)
      .setStrokeStyle(2, HEAL_FX_COLOR, 0.95);
    const moteTop = this.add.circle(-5, -7, 2, 0xffffff, 0.9);
    const moteBottom = this.add.circle(6, 6, 2, HEAL_FX_COLOR, 0.85);
    const projectile = this.add
      .container(origin.x, origin.y, [glow, core, moteTop, moteBottom])
      .setDepth(DEPTH_FX);
    const progress = { value: 0 };

    this.tweens.add({
      targets: progress,
      value: 1,
      duration,
      ease: "Sine.InOut",
      onUpdate: () => {
        const t = progress.value;
        const cameraShiftX = projectBattleX(
          launchCameraX,
          this.cameraWorldX,
          this.scale.width,
        );
        const liveDestination = target.container.active
          ? this.projectileDestination(target)
          : destination;
        const targetMotionX = liveDestination.x - destination.x - cameraShiftX;
        const targetMotionY = liveDestination.y - destination.y;
        projectile.setPosition(
          Phaser.Math.Linear(origin.x, destination.x, t)
            + cameraShiftX
            + targetMotionX * t,
          Phaser.Math.Linear(origin.y, destination.y, t)
            + targetMotionY * t
            - Math.sin(Math.PI * t) * arcHeight,
        );
        const pulse = 1 + Math.sin(Math.PI * t) * 0.22;
        projectile.setScale(pulse);
      },
      onComplete: () => {
        const impact = target.container.active
          ? this.projectileDestination(target)
          : destination;
        projectile.destroy(true);
        this.impactBurst(impact.x, impact.y, HEAL_FX_COLOR, 1.2);
      },
    });
  }

  private impactBurst(x: number, y: number, color: number, scale = 1): void {
    const ring = this.add
      .circle(x, y, 5 * scale, color, 0)
      .setStrokeStyle(3 * scale, color, 0.9)
      .setDepth(DEPTH_FX);
    this.tweens.add({
      targets: ring,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: this.reducedMotion ? 90 : 180,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
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
