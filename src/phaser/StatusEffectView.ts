import Phaser from "phaser";
import type { StatusKind } from "../simulation/types";

export type StatusVisualKind = StatusKind | "freeze";
type ArtKind = "ice" | "star" | "anger" | "wind" | "shield" | "broken" | "armorShard" | "curse" | "ember" | "glow";

/** Shared status textures; animation only transforms existing images. */
function ensureStatusArt(scene: Phaser.Scene): void {
  const kinds: ArtKind[] = ["ice", "star", "anger", "wind", "shield", "broken", "armorShard", "curse", "ember", "glow"];
  for (const kind of kinds) {
    const key = `status-art-${kind}`;
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 128, 128)!;
    const ctx = texture.context;
    const gradient = (top: string, bottom: string) => {
      const fill = ctx.createLinearGradient(30, 12, 92, 116);
      fill.addColorStop(0, top);
      fill.addColorStop(1, bottom);
      return fill;
    };
    const shape = (path: string, fill: string | CanvasGradient, stroke?: string, width = 3) => {
      const outline = new Path2D(path);
      ctx.fillStyle = fill;
      ctx.fill(outline);
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.stroke(outline);
      }
    };
    ctx.lineCap = "round";
    if (kind === "ice") {
      shape("M64 6 L94 39 L103 100 L66 121 L27 100 L36 40 Z", gradient("#d6ffff", "#248cbc"), "#cefbff", 2);
      shape("M64 6 L61 46 L27 100 L36 40 Z", "#efffff");
      shape("M64 6 L94 39 L61 46 Z", "#a4e7f9");
      shape("M61 46 L66 121 L27 100 Z", gradient("#c0f6ff", "#51badd"));
      shape("M61 46 L94 39 L103 100 L66 121 Z", "#398fb8a0");
      shape("M42 38 L54 22 L48 47 L35 83 Z", "#ffffffb0");
      shape("M65 69 L79 82 L72 95 L84 105 L69 97 L75 83 Z", "#d8faffc0");
    } else if (kind === "star") {
      shape("M64 12 Q69 41 80 43 L111 46 L86 69 L92 104 L64 88 L34 104 L40 70 L16 47 L49 42 Z", gradient("#fff8bb", "#ed9a20"), "#8d531e", 4);
      shape("M64 19 L65 65 L23 49 L51 46 Z", "#fffbdc");
      shape("M65 65 L88 98 L64 83 L39 98 Z", "#e99526");
      shape("M59 41 L65 30 L70 46 L66 57 Z", "#ffffff");
    } else if (kind === "anger") {
      shape("M29 63 Q8 45 29 15 Q33 36 47 34 Q45 14 64 5 Q60 29 81 29 Q92 23 94 13 Q123 49 100 73 L95 100 Q65 121 32 101 Z", gradient("#ffe18a", "#df3526"), "#88342a", 3);
      shape("M28 65 L56 72 L51 83 L31 77 Z", "#682629");
      shape("M99 65 L72 72 L77 83 L97 77 Z", "#682629");
      shape("M44 100 Q64 86 85 100 L79 105 Q64 97 48 106 Z", "#fff4c7");
      shape("M37 45 Q32 29 29 27 Q21 45 32 53 Z", "#fff1b5");
    } else if (kind === "wind") {
      shape("M9 86 C28 64 33 31 74 21 Q100 15 120 9 Q108 44 89 62 Q65 84 27 84 L11 101 L22 77 Z", gradient("#f1ffe9", "#43cda2"));
      shape("M16 91 Q64 48 112 17 Q76 53 40 84 Z", "#e8fff5");
      shape("M48 68 L48 46 L56 60 L79 34 L72 50 L96 35 Q71 67 48 68 Z", "#239f8d99");
      shape("M8 107 Q55 99 97 71 Q73 108 8 107 Z", "#b9ffde99");
    } else if (kind === "shield") {
      shape("M64 9 Q86 24 108 24 L104 69 Q99 100 64 119 Q29 100 24 69 L20 24 Q43 24 64 9 Z", gradient("#ffe8ac", "#ae6a25"), "#715032", 4);
      shape("M64 21 Q84 33 96 33 L93 68 Q88 91 64 106 Q40 91 35 68 L32 33 Q46 32 64 21 Z", gradient("#718a94", "#293c52"), "#fff0bf", 2);
      shape("M64 22 L64 106 Q41 91 35 68 L32 33 Q48 31 64 22 Z", "#c1e4e52e");
      shape("M64 36 L73 55 L88 63 L73 72 L64 93 L55 72 L41 63 L55 55 Z", gradient("#fff6ce", "#d39435"));
      shape("M26 29 L33 29 L39 72 L34 63 Z", "#fff6d9");
    } else if (kind === "broken") {
      shape("M55 16 L43 48 L58 62 L40 80 L47 109 Q19 90 17 62 L17 29 Z", "#ffe35a", "#805719", 8);
      shape("M77 16 L111 29 L109 62 Q106 94 71 113 L62 84 L79 63 L64 46 Z", "#f6c934", "#805719", 8);
    } else if (kind === "armorShard") {
      shape("M33 25 L98 38 L82 101 L24 80 Z", "#ffdc45", "#805719", 12);
    } else if (kind === "curse") {
      shape("M33 103 Q9 89 23 58 Q31 47 26 32 Q43 40 42 50 Q40 15 63 6 Q60 31 78 35 Q94 40 96 17 Q113 45 102 62 Q119 88 94 109 Q62 123 33 103 Z", gradient("#dca9ff", "#6631aa"));
      shape("M37 80 C24 46 99 41 92 79 L82 91 L80 108 L48 108 L46 92 Z", gradient("#fff0ff", "#b291d8"), "#623888", 2);
      shape("M40 70 Q51 66 59 77 L55 85 Q39 87 40 70 Z", "#422452");
      shape("M69 77 Q79 66 88 70 Q89 86 73 85 Z", "#422452");
      shape("M64 82 L58 94 L69 94 Z", "#633971");
      shape("M55 100 L58 100 L58 109 L55 109 Z M69 100 L72 100 L72 109 L69 109 Z", "#633971");
    } else if (kind === "ember") {
      shape("M64 11 C58 37 30 56 36 83 C41 115 91 112 95 83 C98 62 77 51 81 37 C68 47 73 57 65 62 C57 53 67 33 64 11 Z", gradient("#f4dcff", "#9c52e6"));
      shape("M62 66 Q47 88 61 99 Q81 106 83 86 Q72 91 62 66 Z", "#fff0ff");
    } else {
      const fill = ctx.createRadialGradient(64, 64, 2, 64, 64, 61);
      fill.addColorStop(0, "#ffffffb0");
      fill.addColorStop(0.25, "#ffffff60");
      fill.addColorStop(1, "#ffffff00");
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, 128, 128);
    }
    texture.refresh();
  }
}

interface EffectParts {
  images: Phaser.GameObjects.Image[];
  startedAt: number;
}

export class StatusEffectView {
  readonly back: Phaser.GameObjects.Container;
  readonly front: Phaser.GameObjects.Container;
  private readonly effects = new Map<StatusVisualKind, EffectParts>();

  constructor(private readonly scene: Phaser.Scene) {
    ensureStatusArt(scene);
    this.back = scene.add.container();
    this.front = scene.add.container();
  }

  update(kinds: readonly StatusVisualKind[], sprite: Phaser.GameObjects.Image, radius: number, height: number, headY: number, centerOffsetX: number, reducedMotion: boolean): void {
    // The body's foot axis is offset from the texture center on asymmetric art.
    const anchorX = sprite.x + centerOffsetX * Math.cos(sprite.rotation);
    const anchorY = sprite.y + centerOffsetX * Math.sin(sprite.rotation);
    this.back.setPosition(anchorX, anchorY).setRotation(sprite.rotation);
    this.front.setPosition(anchorX, anchorY).setRotation(sprite.rotation);
    for (const [kind, effect] of this.effects) {
      if (!kinds.includes(kind)) {
        for (const image of effect.images) image.destroy();
        this.effects.delete(kind);
      }
    }
    for (const kind of kinds) {
      if (kind === "slow") continue;
      let effect = this.effects.get(kind);
      if (!effect) {
        effect = { images: this.createParts(kind, sprite), startedAt: this.scene.time.now };
        this.effects.set(kind, effect);
      }
      const elapsed = this.scene.time.now - effect.startedAt;
      const t = reducedMotion ? 0.7 : elapsed / 1000;
      const appear = reducedMotion ? 1 : Phaser.Math.Clamp(elapsed / 220, 0, 1);
      const breathe = reducedMotion ? 0.5 : (Math.sin(t * 3) + 1) * 0.5;
      const direction = sprite.flipX ? 1 : -1;
      const pose = (index: number, x: number, y: number, width: number, h: number, angle = 0, alpha = 1) => {
        const image = effect!.images[index]!;
        image.setPosition(x, y).setDisplaySize(width, h).setRotation(angle).setAlpha(alpha * appear);
        return image;
      };
      if (kind === "freeze") {
        // Rear ice surrounds the silhouette; transparent front facets keep the actor visible.
        for (let i = 0; i < 5; i += 1) {
          const x = (i - 2) * radius * 0.32;
          const h = height * (i % 2 === 0 ? 0.84 : 1.02);
          pose(i, x, -h * 0.46, radius * 0.64, h, (i - 2) * 0.1, 0.7);
        }
        for (let i = 0; i < 3; i += 1) {
          pose(5 + i, (i - 1) * radius * 0.56, -height * (0.14 + i % 2 * 0.07), radius * 0.55, height * (0.34 + i % 2 * 0.13), (i - 1) * 0.19, 0.8);
        }
        pose(8, 0, -height * 0.23, radius * 1.8, height * 0.8, 0, 0.28 + breathe * 0.1);
      } else if (kind === "stun") {
        for (let i = 0; i < 3; i += 1) {
          const angle = t * 2.7 + i * Math.PI * 2 / 3;
          const depth = (Math.sin(angle) + 1) / 2;
          const size = 11 + depth * 5;
          pose(i, Math.cos(angle) * radius * 0.55, headY - 14 + Math.sin(angle) * 5, size, size, Math.sin(angle) * 0.3, 0.65 + depth * 0.35);
        }
      } else if (kind === "taunt") {
        const bob = Math.sin(t * 5) * 2;
        const top = headY - (kinds.includes("stun") ? 35 : 13);
        pose(0, 0, top + bob, 25 + breathe * 2, 29 + breathe * 2, Math.sin(t * 7) * 0.08);
        for (let i = 0; i < 3; i += 1) {
          const travel = (t * 0.65 + i / 3) % 1;
          pose(i + 1, (i - 1) * radius * 0.18, top + 18 - travel * 22, 8, 13, 0.15, Math.sin(travel * Math.PI) * 0.7).setTint(0xff9b55);
        }
      } else if (kind === "haste") {
        for (let i = 0; i < 4; i += 1) {
          const travel = (t * 0.9 + i * 0.25) % 1;
          pose(i, direction * radius * (0.22 + travel * 0.85), -height * (0.12 + i * 0.15) + travel * 8, 27 + travel * 12, 15, direction * -0.2, Math.sin(travel * Math.PI) * 0.8).setFlipX(direction > 0);
        }
      } else if (kind === "damageReduction") {
        pose(0, 0, -height * 0.36, radius * 2, height * 0.95, 0, 0.24).setTint(0xffc66b);
        for (let i = 0; i < 2; i += 1) {
          const side = i === 0 ? -1 : 1;
          pose(i + 1, side * radius * 0.64, -height * 0.36 + Math.sin(t * 2.3 + i) * 2, 25, 34, side * 0.13, 0.88);
        }
        pose(3, radius * 0.64 - 5, -height * 0.44, 22, 22, 0, breathe * 0.5).setTint(0xffefb0);
      } else if (kind === "mirageGuard") {
        for (let i = 0; i < 2; i += 1) {
          const ghost = effect.images[i]!;
          const side = i === 0 ? -1 : 1;
          ghost.setOrigin(sprite.originX, sprite.originY).setFlipX(sprite.flipX)
            .setPosition(-centerOffsetX + side * (10 + breathe * 5), -2)
            .setScale(sprite.scaleX, sprite.scaleY).setRotation(0)
            .setAlpha((0.2 + breathe * 0.09) * appear);
        }
        for (let i = 0; i < 3; i += 1) {
          const angle = t * 1.4 + i * Math.PI * 2 / 3;
          pose(i + 2, Math.cos(angle) * radius * 0.85, -height * (0.37 + Math.sin(angle) * 0.27), 11, 23, -angle * 0.3, 0.65).setTint(0x9aeeff);
        }
      } else if (kind === "armorBreak") {
        const plateX = 0;
        const plateY = -height * (kinds.includes("vulnerability") ? 0.22 : 0.4);
        pose(0, plateX, plateY, 32, 37, -0.12, 0.94);
        for (let i = 0; i < 4; i += 1) {
          const fall = (t * 0.55 + i * 0.25) % 1;
          pose(i + 1, plateX + (i - 1.5) * 7, plateY + 10 + fall * 24, 8, 8, i + fall * 1.5, Math.sin(fall * Math.PI) * 0.85);
        }
      } else if (kind === "vulnerability") {
        pose(0, 0, -height * 0.57 + Math.sin(t * 2.4) * 2, 29, 33, 0, 0.92);
        for (let i = 0; i < 4; i += 1) {
          const rise = (t * 0.45 + i * 0.25) % 1;
          const side = i % 2 === 0 ? -1 : 1;
          pose(i + 1, side * radius * (0.57 + Math.sin(rise * 4 + i) * 0.13), -height * (0.08 + rise * 0.52), 10 + rise * 3, 19, side * 0.15, Math.sin(rise * Math.PI) * 0.7);
        }
      }
    }
  }

  private createParts(kind: Exclude<StatusVisualKind, "slow">, sprite: Phaser.GameObjects.Image): Phaser.GameObjects.Image[] {
    const parts: Phaser.GameObjects.Image[] = [];
    const add = (art: ArtKind, count: number, back = false) => {
      for (let i = 0; i < count; i += 1) {
        const image = this.scene.add.image(0, 0, `status-art-${art}`);
        (back ? this.back : this.front).add(image);
        parts.push(image);
      }
    };
    if (kind === "freeze") { add("ice", 5, true); add("ice", 3); add("glow", 1, true); }
    if (kind === "stun") add("star", 3);
    if (kind === "taunt") { add("anger", 1); add("ember", 3, true); }
    if (kind === "haste") add("wind", 4, true);
    if (kind === "damageReduction") { add("glow", 1, true); add("shield", 2); add("glow", 1); }
    if (kind === "mirageGuard") {
      for (let i = 0; i < 2; i += 1) {
        const ghost = this.scene.add.image(0, 0, sprite.texture.key, sprite.frame.name).setTint(0x8cdfff);
        this.back.add(ghost);
        parts.push(ghost);
      }
      add("wind", 3);
    }
    if (kind === "armorBreak") { add("broken", 1); add("armorShard", 4); }
    if (kind === "vulnerability") { add("curse", 1); add("ember", 4); }
    return parts;
  }
}
