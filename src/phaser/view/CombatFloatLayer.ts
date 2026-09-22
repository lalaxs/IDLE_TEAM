import Phaser from "phaser";

export type FloatTextStyle = "ui-label" | "combat-number";

interface ActiveCombatFloat {
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
}

const UI_TEXT_FONT_FAMILY = '"Qingqiu Round", "Microsoft YaHei", "PingFang SC", sans-serif';
const COMBAT_TEXT_FONT_FAMILY = `"Changa One", ${UI_TEXT_FONT_FAMILY}`;
const FLOAT_TEXT_STROKE_COLOR = "#211915";
const COMBAT_FLOAT_GAP_PX = 4;
const COMBAT_FLOAT_EDGE_MARGIN_PX = 6;

export class CombatFloatLayer {
  private activeCombatFloats: ActiveCombatFloat[] = [];
  private direction = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  show(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number,
    reducedMotion: boolean,
    style: FloatTextStyle = "ui-label",
  ): void {
    const emphasized = size >= 22;
    const combatNumber = style === "combat-number";
    const startScale = reducedMotion ? 0.86 : emphasized ? 0.44 : 0.52;
    const impactScale = reducedMotion ? 1.06 : emphasized ? 1.48 : 1.32;
    const label = this.scene.add.text(x, y, text, {
      fontFamily: combatNumber ? COMBAT_TEXT_FONT_FAMILY : UI_TEXT_FONT_FAMILY,
      fontSize: `${size}px`,
      fontStyle: combatNumber ? "normal" : "bold",
      color,
      stroke: FLOAT_TEXT_STROKE_COLOR,
      strokeThickness: combatNumber ? (emphasized ? 5 : 4) : 3,
    }).setOrigin(0.5).setDepth(this.depth).setScale(startScale);
    if (combatNumber) this.place(label, x, y, impactScale);
    const startY = label.y;
    const rise = reducedMotion ? 14 : emphasized ? 60 : 52;
    this.scene.tweens.add({
      targets: label,
      y: startY - (reducedMotion ? 2 : 7),
      scaleX: impactScale,
      scaleY: impactScale,
      duration: reducedMotion ? 60 : emphasized ? 100 : 90,
      ease: "Cubic.Out",
      onComplete: () => {
        if (!label.active) return;
        this.scene.tweens.add({
          targets: label,
          scaleX: 1,
          scaleY: 1,
          y: startY - (reducedMotion ? 4 : 14),
          duration: reducedMotion ? 80 : emphasized ? 150 : 130,
          ease: "Cubic.InOut",
          onComplete: () => {
            if (!label.active) return;
            this.scene.tweens.add({
              targets: label,
              y: startY - rise,
              alpha: 0,
              delay: reducedMotion ? 40 : emphasized ? 180 : 140,
              duration: reducedMotion ? 420 : emphasized ? 840 : 730,
              ease: "Cubic.Out",
              onComplete: () => {
                if (combatNumber) this.remove(label);
                label.destroy();
              },
            });
          },
        });
      },
    });
  }

  reset(): void {
    this.activeCombatFloats.length = 0;
    this.direction = 1;
  }

  private place(label: Phaser.GameObjects.Text, originX: number, originY: number, peakScale: number): void {
    this.activeCombatFloats = this.activeCombatFloats.filter(({ label: activeLabel }) => activeLabel.active);
    const width = label.width * peakScale + COMBAT_FLOAT_GAP_PX * 2;
    const height = label.height * peakScale + COMBAT_FLOAT_GAP_PX * 2;
    const horizontalStep = Phaser.Math.Clamp(width * 0.78, 24, 52);
    const verticalStep = Phaser.Math.Clamp(height * 0.72, 16, 28);
    const direction = this.direction;
    this.direction *= -1;
    const offsets = [
      { x: 0, y: 0 },
      { x: direction * horizontalStep, y: -verticalStep * 0.35 },
      { x: -direction * horizontalStep, y: -verticalStep * 0.35 },
      { x: direction * horizontalStep * 0.62, y: -verticalStep },
      { x: -direction * horizontalStep * 0.62, y: -verticalStep },
      { x: 0, y: -verticalStep * 1.75 },
      { x: direction * horizontalStep, y: -verticalStep * 1.55 },
      { x: -direction * horizontalStep, y: -verticalStep * 1.55 },
    ];
    let bestX = originX;
    let bestY = originY;
    let bestOverlap = Number.POSITIVE_INFINITY;
    for (const offset of offsets) {
      const candidateX = Phaser.Math.Clamp(originX + offset.x, width / 2 + COMBAT_FLOAT_EDGE_MARGIN_PX, this.scene.scale.width - width / 2 - COMBAT_FLOAT_EDGE_MARGIN_PX);
      const candidateY = Math.max(height / 2 + COMBAT_FLOAT_EDGE_MARGIN_PX, originY + offset.y);
      const overlap = this.overlap(candidateX, candidateY, width, height);
      if (overlap < bestOverlap) {
        bestX = candidateX;
        bestY = candidateY;
        bestOverlap = overlap;
      }
      if (overlap === 0) break;
    }
    label.setPosition(bestX, bestY);
    this.activeCombatFloats.push({ label, width, height });
  }

  private overlap(x: number, y: number, width: number, height: number): number {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    let overlap = 0;
    for (const active of this.activeCombatFloats) {
      if (active.label.alpha < 0.35) continue;
      const overlapWidth = Math.min(right, active.label.x + active.width / 2) - Math.max(left, active.label.x - active.width / 2);
      const overlapHeight = Math.min(bottom, active.label.y + active.height / 2) - Math.max(top, active.label.y - active.height / 2);
      if (overlapWidth > 0 && overlapHeight > 0) overlap += overlapWidth * overlapHeight;
    }
    return overlap;
  }

  private remove(label: Phaser.GameObjects.Text): void {
    const index = this.activeCombatFloats.findIndex((active) => active.label === label);
    if (index >= 0) this.activeCombatFloats.splice(index, 1);
  }
}
