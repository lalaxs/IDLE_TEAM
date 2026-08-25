# 青丘边境背景生成提示词

- 版本：1.0
- 生成模式：内置 ImageGen
- 用途：12 张战斗背景母图与 1 张章节地图背景
- 权威风格参考：`docs/art/references/hero-style-master-v1.png`

## 共同提示词

```text
Use case: stylized-concept
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”
Input images:
- Image 1 is the authoritative character-style reference. Use only its visual language: thick warm near-black rounded outlines, large friendly hand-drawn shapes, flat color treatment, restrained detail density, and simple hard-edged shadow shapes. Do not copy any depicted character, weapon, costume, or emblem. Do not place characters in the scene.

Primary request: Create one completely original casual fantasy landscape with a thick-outlined storybook game aesthetic.
Style/medium: polished 2D mobile game background; large rounded hand-drawn shapes; muted flat color blocks; thick warm near-black rounded outlines only on landmarks and close props; at most one hard-edged shadow per major object; background shapes should feel hand-drawn rather than vector-perfect.
Composition/framing: landscape composition designed to cover mobile battle canvases from 360×228 to 430×308; low side-view battle camera; one continuous walkable road or ground plane; keep the central 58% width clean, continuous, low contrast, and free of large props; place recognizable landmarks at the far left, far right, or upper distance; allow cover-cropping at the outer 8% edges.
Lighting/mood: soft diffuse daylight; calm adventurous tone; no dramatic spotlight or cinematic rays.
Constraints: no characters, monsters, creatures, silhouettes of people, UI, text, numbers, logos, frames, watermark, health-bar-like red or white horizontal marks, high-frequency texture, dense foliage, tiny debris, realistic bark, photorealism, anime rendering, painterly brush texture, cinematic lighting, complex gradients, metallic reflections, or third-party game designs.
```

## 区域色板

### 草地

```text
Color palette: pale teal sky, fresh yellow-green grass, soft sage hills, warm light ochre road, gray-beige stones, and only small restrained coral-red mushroom accents.
Regional invariants: open horizon, bright welcoming daylight, broad rounded hills, continuous ochre road, low distant vegetation.
```

### 森林

```text
Color palette: gray-teal sky, deep muted woodland green, moss green, damp brown earth, blue-gray creek stones; do not use black night shadows.
Regional invariants: shaded but friendly woodland, rounded canopy masses, continuous brighter damp-earth road, quiet diffuse daylight.
```

### 遗迹

```text
Color palette: misty gray-green sky, desaturated olive terrain, pale weathered wood, warm gray old stone, restrained amber accent.
Regional invariants: quiet ancient grove, sparse pale trunks, continuous warm-gray road, rounded fog masses kept behind or above the battle corridor, no horror imagery.
```

## 关卡提示词

### BG-01-01 · 1-1 新芽小径

```text
Region/stage: meadow, 1-1 “新芽小径”; do not render this name or any text.
Scene/backdrop: an open young meadow frontier with low rounded distant hills and one continuous warm ochre battle road.
Landmarks: two or three thick young roots arching from the ground near the outer edges, each with one pair of simple leaves; a few very large, simple grass clumps.
Mood: bright, welcoming, early expedition.
```

### BG-01-02 · 1-2 蘑菇浅滩

```text
Input images:
- Image 1 is the 1-1 meadow regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-2 “蘑菇浅滩”; do not render this name or any text.
Landmarks: a small cluster of broad coral-red mushroom caps at one outer edge; two or three rounded shallow-water stones at the other edge; one low wetland strip behind the road, never crossing or obscuring the central battle corridor.
Constraints: keep the meadow sky, horizon, hills, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; remove the previous arching young roots; no characters, creatures, UI, text, logo, or watermark.
```

### BG-01-03 · 1-3 石甲坡地

```text
Input images:
- Image 1 is the 1-1 meadow regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-3 “石甲坡地”; do not render this name or any text.
Landmarks: layered rounded gray-stone slope pieces near both outer edges, two short chunky rocks, and a few large simple dry-grass shapes.
Constraints: keep the meadow sky, horizon, hills, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; remove the previous young-root landmarks; no characters, creatures, UI, text, logo, or watermark.
```

### BG-01-04 · 1-4 风语栈桥

```text
Input images:
- Image 1 is the 1-1 meadow regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-4 “风语栈桥”; do not render this name or any text.
Landmarks: part of an old chunky wooden boardwalk or bridge entering from one outer edge, one restrained timber support at the other edge, two hanging wooden pieces, and two large wind-moved seed pods; keep every prop away from the central battle corridor.
Constraints: keep the meadow sky, horizon, hills, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; remove the previous young-root landmarks; no characters, creatures, UI, text, logo, or watermark.
```

### BG-01-05 · 1-5 守望林口

```text
Region/stage: forest, 1-5 “守望林口”; do not render this name or any text.
Scene/backdrop: a deep but friendly woodland entrance, with rounded tree-canopy masses closing inward from both sides and one continuous brighter damp-earth battle road.
Landmarks: one hollow watchtower-like stump at an outer edge and one restrained opposing trunk silhouette; the stump must be an environment prop with no face, eyes, mouth, limbs, weapon, or creature anatomy.
Mood: shaded and watchful, never dark or frightening.
```

### BG-01-06 · 1-6 暮色溪谷

```text
Input images:
- Image 1 is the 1-5 forest regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-6 “暮色溪谷”; do not render this name or any text.
Landmarks: a narrow calm creek behind one side of the road, several large rounded blue-gray creek stones, and two low rounded mist shapes kept behind the battle corridor.
Constraints: keep the forest sky, canopy horizon, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; remove the hollow watchtower stump; no characters, creatures, UI, text, logo, or watermark.
```

### BG-01-07 · 1-7 盘根小径

```text
Input images:
- Image 1 is the 1-5 forest regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-7 “盘根小径”; do not render this name or any text.
Landmarks: two or three thick rounded roots rising beside the road at the outer edges, a small restrained thorn branch, and slightly raised forest ground on both sides.
Constraints: keep the forest sky, canopy horizon, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; roots must not cross the central corridor; remove the hollow watchtower stump; no characters, creatures, UI, text, logo, or watermark.
```

### BG-01-08 · 1-8 古碑营地

```text
Input images:
- Image 1 is the 1-5 forest regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-8 “古碑营地”; do not render this name or any text.
Landmarks: two or three broad broken steles with blank faces and no writing, one extinguished chunky brazier with no flame or smoke, and a low ring of rounded camp stones, all near the outer edges.
Constraints: keep the forest sky, canopy horizon, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; no glyphs, runes, religious symbols, characters, creatures, UI, text, logo, or watermark.
```

### BG-01-09 · 1-9 雾松腹地

```text
Region/stage: ruins, 1-9 “雾松腹地”; do not render this name or any text.
Scene/backdrop: a quiet ancient grove with pale weathered pine trunks, sparse rounded pine-crown masses, muted olive ground, and one continuous warm-gray battle road.
Landmarks: pale trunks at the far sides and two or three simple rounded fog masses kept above or behind the battle corridor.
Mood: ancient and hushed, never horror.
```

### BG-01-10 · 1-10 藤蔓祭场

```text
Input images:
- Image 1 is the 1-9 ruins regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-10 “藤蔓祭场”; do not render this name or any text.
Landmarks: one low broad stone platform near an outer edge, a single thick rounded vine loop, and four broken blank corner stones; the platform is an old gathering place, not a religious altar.
Constraints: keep the ruins sky, pale-trunk horizon, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; remove excess fog from the foreground; no glowing circles, symbols, skulls, characters, creatures, UI, text, logo, or watermark.
```

### BG-01-11 · 1-11 巨木门廊

```text
Input images:
- Image 1 is the 1-9 ruins regional composition reference and edit target.
Primary request: Change only the left and right landmark props to create 1-11 “巨木门廊”; do not render this name or any text.
Landmarks: two massive broken wood columns at the far edges implying a doorway silhouette, plus only two or three large old stones; the center remains open and bright enough for combat.
Constraints: keep the ruins sky, pale-trunk horizon, road geometry, camera height, palette, lighting, rendering language, image dimensions, and central battle-safe area unchanged; no roof crossing the image center, no symbols, characters, creatures, UI, text, logo, or watermark.
```

### BG-01-12 · 1-12 古树之心

```text
Input images:
- Image 1 is the 1-9 ruins regional composition reference and edit target.
Primary request: Change only the side and upper-distance landmark props to create 1-12 “古树之心”; do not render this name or any text.
Landmarks: the inside of an immense ancient hollow tree suggested by two broad side walls and an upper arch kept outside the central combat space, one restrained amber heart-shaped resin glow high in the background, and blank old-stone shoulder-like blocks at the outer edges.
Constraints: keep the ruins camera height, road geometry, muted gray-green palette, rendering language, image dimensions, and central battle-safe area unchanged; the amber glow must not become a character eye or combat effect; no face, creature, symbols, characters, UI, text, logo, or watermark.
```

## 第一章关卡地图

### BG-MAP-01 · 青丘边境

```text
Use case: stylized-concept
Asset type: node-free chapter-map background for the mobile H5 idle RPG “青丘远征”
Input images:
- Image 1 is the meadow regional background reference.
- Image 2 is the forest regional background reference.
- Image 3 is the ruins regional background reference.
Primary request: Create one original horizontal illustrated journey map using the same thick-outlined casual storybook visual language and the same three regional palettes.
Scene/backdrop: the left third transitions from bright meadow, the middle third becomes deep friendly forest, and the right third becomes quiet gray-green ruins ending at a huge ancient tree.
Composition/framing: a broad pale winding road moves through all three regions; keep approximately twelve evenly spaced clear landing areas along the road for DOM stage nodes; show the journey left to right; reduce detail density by approximately 25% compared with the battle backgrounds.
Style/medium: large rounded low-frequency hand-drawn shapes; muted flat colors; thick warm near-black rounded outlines only on major landmarks; at most one hard-edged shadow per object.
Constraints: no nodes, circles, dotted paths, locks, flags, numbers, text, labels, UI, characters, monsters, logo, frame, watermark, readable glyphs, or symbols.
```

## 透明前景遮挡层

以下三张图使用内置 ImageGen 生成纯 `#ff00ff` 色键原图，再由本地色键工具输出 RGBA PNG。三张图均不得将完整背景直接烘焙进遮挡层。

### FG-MEADOW · 草地前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 1-1 meadow master and authoritative position/style reference.
Primary request: Recreate only the bottom-left and bottom-right close foreground leaf clusters, low bushes, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: preserve the foreground cluster positions and scale from Image 1; keep the central 58% width completely empty; visible art may touch the bottom and outer side edges.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, hills, distant vegetation, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```

### FG-FOREST · 森林前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 1-5 forest master and authoritative position/style reference.
Primary request: Recreate only the bottom outer deep-green leaf clusters, low bushes, exposed root shapes, one rounded stone, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: preserve the foreground cluster positions and scale from Image 1; keep the central 58% width completely empty; visible art may touch the bottom and outer side edges.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, canopy, distant vegetation, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```

### FG-RUINS · 遗迹前景

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the 1-9 ruins master and authoritative position/style reference.
Primary request: Recreate only the bottom outer dark-olive leaf clusters, pale pine-root shapes, old rounded stones, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: preserve the foreground cluster positions and scale from Image 1; keep the central 58% width completely empty; visible art may touch the bottom and outer side edges.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, mist, distant trunks, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```
