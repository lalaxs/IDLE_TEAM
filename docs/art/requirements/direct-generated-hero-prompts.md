# 80 名职业英雄直生图提示词记录

## 固定风格段

每一次调用都必须把下列固定段与清单中对应角色的 `prompt` 字段完整合并，不依赖前一张图片：

```text
Use case: stylized-concept
Asset type: H5 idle RPG complete single-character hero master
Input image: Image 1 is the sole authoritative style reference. Use only its simplified visual language, proportions, line weight, eyes, hands, feet, flat color treatment, and restrained weapon scale. Do not copy any depicted character.
Primary request: Generate exactly one complete original hero from scratch as one coherent illustration.
Subject: <direct-generated-hero-manifest.json 中对应角色的 prompt>
Composition: right-facing three-quarter side view, both oval eyes visible, neutral combat-ready idle pose, full body. Keep the body anchors—outer head, core torso, circle hands, short legs and feet—at one shared scale: exactly 74% canvas height, horizontally centered, feet on one baseline. Weapons, shields and detached magic symbols may extend beyond the body frame while keeping generous outer padding.
Style: ultra-simple cute fantasy cartoon, 1.45–1.65 heads tall, huge round face, hidden neck, tiny torso, two circle hands, two extremely short legs, very thick rounded near-black outline at the same visual weight as the reference, minimal inner lines, 4–6 flat colors.
Equipment mechanics: the hero faces right and the right side is the combat direction. Validate the full limb chain before the weapon direction: shoulder, elbow, wrist, round hand and grip must form one natural continuous load path. A forward-pointing weapon arm must hang naturally or reach slightly forward with the elbow below the shoulder; never pull the upper arm behind the torso while twisting the weapon forward. Every ready-position attack weapon must extend right or upper-right from its own grip. In a dual-wield loadout, both weapons point in that same screen-right combat direction: both blade or claw tips, axe or hammer working-head centers, and firearm muzzles must have an x-coordinate greater than their own gripping hands. Never mirror a dual-wield pair outward. In every weapon-and-shield loadout, the anatomical left hand on screen-right carries the attack weapon and the anatomical right hand on screen-left carries the shield. Put each round hand on a real grip; keep guards between hand and blade, weapon heads beyond the hand, shield face braced toward front-right, and bow string on the character side with any arrowhead pointing right. No mirrored, backward, upside-down, reverse-gripped or hand-piercing equipment.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal; one uniform color, no lighting variation.
Constraints: exactly one character; one cohesive body; complete weapon; keep the same head width, core torso width, hand diameter and foot size regardless of equipment complexity; never shrink the body to make a weapon, shield, armor, cape or halo fit—simplify or reposition the equipment instead; no mouth, nose, eyebrows, eyelashes, fingers, text, logo, watermark, UI, frame, ground, cast shadow, glow cloud, pet, companion, second character, character sheet, turnaround, callout, panels, separate equipment, spare parts, collage, modular pieces, template or sprite sheet.
Avoid: front-facing pose, realistic anatomy, long legs, small head, sharp chin, thin lines, painterly rendering, glossy 3D, complex armor filigree, oversized weapon, copied game armor, copied artifact weapon, faction insignia. Do not use #ff00ff in the character.
```

## 角色变量

80 项角色变量及准确输出文件名记录于：

[`direct-generated-hero-manifest.json`](./direct-generated-hero-manifest.json)

实际调用时会把对应 `prompt` 内容替换到 `Subject` 行，并原样重复其余全部固定段。每个角色使用单独调用，不把男女放在同一画布，也不以任何已生成角色作为部件底板。
