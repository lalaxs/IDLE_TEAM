# 霜原背景生成提示词

- 版本：1.0
- 生成模式：内置 ImageGen
- 用途：12 张战斗背景、1 张章节地图、3 张透明前景遮挡层
- 权威风格参考：`docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_01_sprout_path_v01.png`
- 角色线条参考：`docs/art/references/hero-style-master-v1.png`

## 共同提示词

```text
Use case: stylized-concept
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”
Input images:
- Image 1 is the authoritative first-chapter background-style reference. Use only its rendering language, side-view camera, large rounded shapes, low-frequency detail, composition discipline, and warm near-black line treatment. Do not reproduce its meadow content.
- Image 2 is the authoritative character-style reference. Use only its thick rounded outline character, flat color treatment, friendly proportions, and restrained hard-edged shadows. Do not place or copy any character, weapon, costume, emblem, or face.
Primary request: Create one completely original Frostland landscape in the same thick-outlined casual storybook game aesthetic.
Style/medium: polished 2D mobile game background; large rounded hand-drawn shapes; muted flat color blocks; thick warm near-black rounded outlines only on landmarks and close props; at most one hard-edged shadow per major object; hand-drawn rather than vector-perfect.
Composition/framing: landscape composition designed for mobile battle canvases from 360×228 to 430×308; low side-view battle camera; one continuous walkable ground band; keep the central 58% width clean, continuous, low contrast, and free of large props; place recognizable landmarks at the far left, far right, or upper distance; allow cover-cropping at the outer 8% edges.
Lighting/mood: soft diffuse cold daylight; calm adventurous tone; no night scene, dramatic spotlight, cinematic rays, or white-out.
Materials/textures: opaque stylized snow and ice color blocks, large simple snow shadows, sparse broad wind marks, simplified wood and stone.
Constraints: no characters, monsters, creatures, silhouettes of people, UI, text, numbers, logos, frames, watermark, health-bar-like red or white horizontal marks, high-frequency snow texture, dense snow particles, tiny debris, realistic transparent ice, refraction, glass, photorealism, anime rendering, painterly brush texture, cinematic lighting, magic circles, glyphs, runes, particles, light beams, metallic reflections, or third-party game designs.
```

## 区域色板

### 冻土前哨

```text
Color palette: soft gray-blue sky, warm ivory snow, muted frozen-earth brown, cool gray rocks, restrained pale cyan ice, and small dark sage cold-grass accents.
Regional invariants: open horizon, broad rounded snowbanks, exposed warm-gray earth road, sparse distant ridges, bright but diffuse daylight, no blue-white monochrome.
```

### 雪松幽林

```text
Color palette: gray-teal sky, deep muted pine green, blue-gray snow shadows, warm bark brown, ivory snow, restrained pale blue ice.
Regional invariants: friendly snow-covered pinewood, rounded canopy masses closing in from both sides, continuous brighter earth-and-snow road, diffuse daylight, no black night shadows.
```

### 极光遗迹

```text
Color palette: cold gray-blue sky, stone blue, dark blue-green vegetation, ivory snow, muted slate ruins, restrained broad teal and pale-violet aurora bands.
Regional invariants: quiet frozen ruins, wide soft aurora held in the upper distance, continuous blue-gray battle ground, blank stones, opaque ice, no magic or horror.
```

## 关卡提示词

### BG-02-01 · 2-1 雪线驿道

```text
Region/stage: snowfield, 2-1 “雪线驿道”; do not render this name or any text.
Scene/backdrop: an open Frostland border road with low rounded snowy ridges, a continuous exposed warm-gray frozen-earth battle road, and a pale gray-blue sky.
Landmarks: two low snowbanks near the outer edges, one thick old blank roadside post with no writing or symbol, and one tuft of broad cold-resistant grass.
Mood: crisp, welcoming, the first step beyond the snow line.
```

### BG-02-02 · 2-2 霜河浅滩

```text
Input images: Image 1 is the 2-1 snowfield regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-2 “霜河浅滩”; do not render this name or any text.
Landmarks: a narrow frozen shallow river strip behind one side of the road, two or three large rounded opaque pale-blue ice pieces, and exposed brown frozen-earth banks at the outer edges.
Constraints: keep the snowfield sky, horizon, ridges, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; remove the old roadside post; ice must be opaque and simple; no characters, creatures, UI, text, logo, or watermark.
```

### BG-02-03 · 2-3 风蚀雪坡

```text
Input images: Image 1 is the 2-1 snowfield regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-3 “风蚀雪坡”; do not render this name or any text.
Landmarks: layered rounded wind-shaped snow slopes at both outer edges, two broad patches of exposed dark frozen earth, and one bent low shrub with large simple leaves.
Constraints: keep the snowfield sky, horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no blowing particle snow; no characters, creatures, UI, text, logo, or watermark.
```

### BG-02-04 · 2-4 断索冰桥

```text
Input images: Image 1 is the 2-1 snowfield regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-4 “断索冰桥”; do not render this name or any text.
Landmarks: a chunky old wooden bridgehead entering only from one outer edge, one ice-crusted timber post at the opposite edge, and two short broken thick rope ends; the bridge deck must not cross the central battle corridor.
Constraints: keep the snowfield sky, horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no hanging body-like shapes; no characters, creatures, UI, text, logo, or watermark.
```

### BG-02-05 · 2-5 雪松林口

```text
Region/stage: pinewood, 2-5 “雪松林口”; do not render this name or any text.
Scene/backdrop: a deep but friendly snow-covered pinewood entrance with rounded pine canopy masses closing inward from both sides and a continuous brighter earth-and-snow battle road.
Landmarks: two thick rounded snow pines at the outer sides, broad cap-like snow resting on the canopies, and one hollow old stump at an outer edge with no face, eyes, mouth, limbs, or creature anatomy.
Mood: sheltered and quiet, never dark or frightening.
```

### BG-02-06 · 2-6 蓝冰溪谷

```text
Input images: Image 1 is the 2-5 pinewood regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-6 “蓝冰溪谷”; do not render this name or any text.
Landmarks: a narrow frozen creek behind one side of the road, several large rounded opaque blue-ice stones, and two low simple cold-mist shapes kept behind the battle corridor.
Constraints: keep the pinewood sky, canopy horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; remove the hollow stump; no transparent ice, characters, creatures, UI, text, logo, or watermark.
```

### BG-02-07 · 2-7 倒木迷径

```text
Input images: Image 1 is the 2-5 pinewood regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-7 “倒木迷径”; do not render this name or any text.
Landmarks: one snow-covered fallen log held near each outer edge, two raised rounded root shapes, and a few thick broken branch ends; nothing crosses the central corridor.
Constraints: keep the pinewood sky, canopy horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no dense needles or thorn mesh; no characters, creatures, UI, text, logo, or watermark.
```

### BG-02-08 · 2-8 寒灯营地

```text
Input images: Image 1 is the 2-5 pinewood regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-8 “寒灯营地”; do not render this name or any text.
Landmarks: one broad blank wooden signboard with no marks, one chunky extinguished travel lantern with no flame, glow, smoke, or face-like openings, and a low ring of large rounded camp stones.
Constraints: keep the pinewood sky, canopy horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no writing, symbols, active fire, characters, creatures, UI, text, logo, or watermark.
```

### BG-02-09 · 2-9 极光石原

```text
Region/stage: aurora ruins, 2-9 “极光石原”; do not render this name or any text.
Scene/backdrop: a quiet frozen stonefield under a cold gray-blue sky, with a continuous muted blue-gray battle ground and sparse dark blue-green vegetation.
Landmarks: broad blank standing stones at the far sides, two or three low rounded frozen rocks, and one wide soft teal-and-pale-violet aurora band held high in the distant sky.
Mood: ancient and serene, never magical combat or horror.
```

### BG-02-10 · 2-10 冻结石环

```text
Input images: Image 1 is the 2-9 aurora-ruins regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-10 “冻结石环”; do not render this name or any text.
Landmarks: two separated pieces of a low broken stone ring near the outer edges, one thick opaque ice crust, and four blank boundary stones; the ring must not form a complete circle in the center.
Constraints: keep the aurora sky, distant horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no magic circle, glyphs, religious symbols, glowing runes, characters, creatures, UI, text, logo, or watermark.
```

### BG-02-11 · 2-11 冰脊门廊

```text
Input images: Image 1 is the 2-9 aurora-ruins regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 2-11 “冰脊门廊”; do not render this name or any text.
Landmarks: two massive opaque slate-blue ice ridges at the far outer edges suggesting a doorway silhouette, plus two or three broad old stones; keep the center open with no connecting roof or beam.
Constraints: keep the aurora sky, distant horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged; no transparent glass ice, light beams, symbols, characters, creatures, UI, text, logo, or watermark.
```

### BG-02-12 · 2-12 霜心堡垒

```text
Input images: Image 1 is the 2-9 aurora-ruins regional composition reference and edit target.
Primary request: Change only the side and upper-distance landmark props to create 2-12 “霜心堡垒”; do not render this name or any text.
Landmarks: the inner hollow of a colossal frozen-stone fortress suggested by two broad side walls and an upper arch kept outside the central combat space, one restrained rounded teal-and-pale-violet frostheart color accent high in the distance, and two blank old fortress shoulder walls at the outer edges.
Constraints: keep the aurora-ruins camera height, ground geometry, muted palette, rendering language, dimensions, and central battle-safe area unchanged; the frostheart must be a quiet environmental color accent, not an eye, crystal character, portal, magic effect, or light beam; no faces, glyphs, characters, creatures, UI, text, logo, or watermark.
```

## 第二章地图

### BG-MAP-02 · 霜原

```text
Use case: stylized-concept
Asset type: node-free chapter-map background for the mobile H5 idle RPG “青丘远征”
Input images:
- Image 1 is the 2-1 snowfield regional background reference.
- Image 2 is the 2-5 pinewood regional background reference.
- Image 3 is the 2-9 aurora-ruins regional background reference.
- Image 4 is the first-chapter map reference; use only its panoramic route readability, low-frequency detail, and thick-outlined storybook language. Do not copy its meadow, forest, ancient tree, or route geometry.
Primary request: Create one original horizontal illustrated journey map for Chapter 2 Frostland in the same thick-outlined casual storybook visual language.
Scene/backdrop: the left third is open warm-gray snowfield and frozen-earth outpost, the middle third becomes deep snow-covered pinewood, and the right third becomes cold blue-gray aurora ruins ending at a massive frozen-stone fortress.
Composition/framing: one broad pale gray-blue winding road moves through all three regions and leaves approximately twelve evenly spaced clear landing areas for DOM stage nodes; show the journey left to right; reduce detail density by approximately 25% compared with battle backgrounds.
Style/medium: large rounded low-frequency hand-drawn shapes; muted flat colors; thick warm near-black rounded outlines only on major landmarks; at most one hard-edged shadow per object; opaque stylized ice.
Constraints: no nodes, circles, rings, dotted paths, locks, flags, numbers, text, labels, UI, characters, monsters, creatures, logo, frame, watermark, readable glyphs, symbols, portals, or magic circles.
```

## 透明前景遮挡层

### FG-SNOWFIELD · 冻土前哨前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 2-1 snowfield master and authoritative position/style reference.
Primary request: Recreate only the bottom-left and bottom-right close foreground snow-covered grass tufts, low rounded snowbanks, one or two frozen rocks, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep the central 58% width completely empty; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, ridges, distant vegetation, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```

### FG-PINEWOOD · 雪松幽林前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 2-5 pinewood master and authoritative position/style reference.
Primary request: Recreate only the bottom-left and bottom-right close snow-covered pine branch clusters, thick root shapes, low bushes, one rounded stone, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep the central 58% width completely empty; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, canopy, distant trunks, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```

### FG-AURORA-RUINS · 极光遗迹前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 2-9 aurora-ruins master and authoritative position/style reference.
Primary request: Recreate only the bottom-left and bottom-right close frozen stones, short opaque ice ridges, dark blue-green hardy leaf clusters, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep the central 58% width completely empty; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, aurora, distant stones, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```
