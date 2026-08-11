# 80 名职业英雄直生图提示词记录

## 固定风格段

每一次调用都必须把下列固定段与清单中对应角色的 `prompt` 字段完整合并，不依赖前一张图片：

```text
Use case: stylized-concept
Asset type: H5 idle RPG complete single-character hero master
Input image: Image 1 is the sole authoritative style reference. Use only its simplified visual language, proportions, line weight, eyes, hands, feet, flat color treatment, and restrained weapon scale. Do not copy any depicted character.
Primary request: Generate exactly one complete original hero from scratch as one coherent illustration.
Subject: <direct-generated-hero-manifest.json 中对应角色的 prompt>
Composition: right-facing three-quarter side view, both oval eyes visible, neutral combat-ready idle pose, full body, centered, feet on one baseline, 72–80% canvas height, generous padding.
Style: ultra-simple cute fantasy cartoon, 1.45–1.65 heads tall, huge round face, hidden neck, tiny torso, two circle hands, two extremely short legs, very thick rounded near-black outline, minimal inner lines, 4–6 flat colors.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal; one uniform color, no lighting variation.
Constraints: exactly one character; one cohesive body; complete weapon; no mouth, nose, eyebrows, eyelashes, fingers, text, logo, watermark, UI, frame, ground, cast shadow, glow cloud, pet, companion, second character, character sheet, turnaround, callout, panels, separate equipment, spare parts, collage, modular pieces, template or sprite sheet.
Avoid: front-facing pose, realistic anatomy, long legs, small head, sharp chin, thin lines, painterly rendering, glossy 3D, complex armor filigree, oversized weapon, copied game armor, copied artifact weapon, faction insignia. Do not use #ff00ff in the character.
```

## 角色变量

80 项角色变量及准确输出文件名记录于：

[`direct-generated-hero-manifest.json`](./direct-generated-hero-manifest.json)

实际调用时会把对应 `prompt` 内容替换到 `Subject` 行，并原样重复其余全部固定段。每个角色使用单独调用，不把男女放在同一画布，也不以任何已生成角色作为部件底板。
