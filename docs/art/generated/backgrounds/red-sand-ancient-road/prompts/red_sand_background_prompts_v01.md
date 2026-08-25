# 赤沙古道背景生成提示词

- 版本：1.0
- 生成模式：内置 ImageGen
- 用途：12 张战斗背景、1 张章节地图、3 张透明前景遮挡层
- 第一章风格参考：`docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_01_sprout_path_v01.png`
- 第二章风格参考：`docs/art/generated/backgrounds/frostland/masters/bg_stage_02_01_snowline_road_v01.png`
- 遗迹语言参考：`docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_09_mist_pine_depths_v01.png`
- 地图构图参考：`docs/art/generated/backgrounds/frostland/masters/bg_chapter_02_frostland_map_v01.png`

## 共同提示词

```text
Use case: stylized-concept.
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”.
Input images: authoritative approved chapter references. Use only their rendering language, low side-view camera, continuous battle ground, large rounded hand-drawn shapes, low-frequency detail, muted flat colors, composition discipline, and warm near-black rounded outlines on close landmarks. Do not reproduce their meadow, ice, tree, ruin, route, character, emblem, or prop content.
Primary request: create one completely original Red Sand Ancient Road landscape in the same thick-outlined casual storybook game aesthetic.
Style/medium: polished 2D mobile game background; large rounded irregular shapes; muted flat color blocks; thick warm near-black rounded outlines only on close props and key landmarks; at most one hard-edged shadow per major object; hand-drawn rather than vector-perfect; 6–9 major visible colors.
Composition/framing: landscape composition designed for mobile battle canvases from 360×228 to 430×308; low side-view battle camera; one continuous walkable warm-gray sand-and-earth ground band; keep the central 58% width clean, continuous, low contrast, and free of large props; place recognizable landmarks at the far left, far right, or upper distance; allow cover-cropping at the outer 8% edges.
Lighting/mood: soft diffuse daylight, calm adventurous journey, friendly fantasy; no night scene, dramatic spotlight, cinematic rays, heat-haze lens effects, or sandstorm.
Materials/textures: stylized opaque sandstone and wood color blocks, large simple sand shadows, sparse broad wind marks, simplified stone and fabric; no dense grain.
Constraints: no characters, monsters, creatures, people silhouettes, skulls, bones, UI, text, numbers, logos, frames, watermark, health-bar-like red or white horizontal marks, writing, glyphs, runes, religious symbols, magic circles, portals, particles, light beams, high-frequency sand texture, dense grains, blowing sand, photorealism, anime rendering, painterly brush texture, cinematic lighting, metallic reflections, cultural stereotypes, or copied third-party game designs.
```

## 区域色板

### 赤沙驿道

```text
Color palette: soft gray-blue sky, muted ochre sand, terracotta red rock, dusty rose shadow, warm gray-brown road, small dark sage drought-grass accents.
Regional invariants: open horizon, broad rounded dunes, continuous desaturated ground, sparse distant mesas, bright diffuse daylight, no saturated orange-yellow monochrome.
```

### 风蚀峡谷

```text
Color palette: muted terracotta, deep brick brown, dusty mauve shade, gray-blue sky, warm sand floor, restrained sage-green scrub.
Regional invariants: friendly rounded canyon, layered side walls framing but never crossing the center, continuous brighter ground corridor, no threatening spikes or photoreal geology.
```

### 沉沙古城

```text
Color palette: gray-beige sandstone, deep muted teal shade, warm brown, dusty ochre sand, restrained oxidized copper green, tiny non-glowing warm copper accents.
Regional invariants: quiet half-buried city, rounded architecture, blank surfaces, continuous sandy battle ground, no writing, symbols, magic, horror, or stereotyped ornament.
```

## BG-03-01 · 3-1 赤沙驿道

```text
Region/stage: red dunes, 3-1 “赤沙驿道”; do not render this name or any text.
Scene/backdrop: an open Red Sand border road with low rounded dunes, a continuous desaturated warm-gray ochre battle road, distant soft terracotta mesas, and a pale gray-blue sky.
Landmarks: low dunes near the outer edges, one thick blank sandstone roadside post without writing or symbol, one tuft of broad drought-resistant sage grass.
Mood: warm, welcoming, and expansive, the first step onto an old desert trade road.
```

## BG-03-02 · 3-2 盐壳浅滩

```text
Input image: Image 1 is the 3-1 red-dunes regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-2 “盐壳浅滩”; do not render this name or any text.
Landmarks: a shallow pale salt-crust basin behind one side of the road, two or three large rounded ochre stones, and one narrow dry-water trace at the outer edge.
Constraints: keep the red-dunes sky, horizon, dunes, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; remove the roadside post; no reflective water, glitter, dense cracks, characters, UI, text, logo, or watermark.
```

## BG-03-03 · 3-3 风刻沙坡

```text
Input image: Image 1 is the 3-1 red-dunes regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-3 “风刻沙坡”; do not render this name or any text.
Landmarks: layered rounded wind-shaped sand slopes at both outer edges, broad exposed terracotta rock bands, and one low wind-bent sage shrub.
Constraints: keep the red-dunes sky, horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; no sand particles or storm; no characters, UI, text, logo, or watermark.
```

## BG-03-04 · 3-4 断轮商道

```text
Input image: Image 1 is the 3-1 red-dunes regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-4 “断轮商道”; do not render this name or any text.
Landmarks: one chunky broken wooden cart wheel entering only from an outer edge, one short axle at the opposite edge, and one simple half-buried blank cargo box; no complete wagon.
Constraints: keep the red-dunes sky, horizon, dunes, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; debris must not enter the central corridor; no goods, bodies, characters, UI, text, symbols, logo, or watermark.
```

## BG-03-05 · 3-5 峡口石门

```text
Region/stage: wind canyon, 3-5 “峡口石门”; do not render this name or any text.
Scene/backdrop: a friendly rounded wind-carved canyon entrance with muted terracotta side walls, dusty mauve shade, and one continuous brighter warm-sand battle road under a gray-blue sky.
Landmarks: two massive rounded sandstone pillars at the far outer sides suggesting a natural gateway, three low layered rocks, and sparse sage-green scrub.
Composition: the pillars remain separated with no arch, roof, rope, or beam across the center; central 58% stays open and low contrast.
```

## BG-03-06 · 3-6 回声旱谷

```text
Input image: Image 1 is the 3-5 wind-canyon regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-6 “回声旱谷”; do not render this name or any text.
Landmarks: a shallow dry creek bed behind one side of the road, several large smooth rounded stones, and two broad pale mud-crack shapes at the outer edge.
Constraints: keep canyon sky, side-wall horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; cracks must stay large and sparse; no water, characters, UI, text, logo, or watermark.
```

## BG-03-07 · 3-7 盘岩小径

```text
Input image: Image 1 is the 3-5 wind-canyon regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-7 “盘岩小径”; do not render this name or any text.
Landmarks: broad curled layered rock shelves near the outer sides, two raised rounded ledges, and a few simple drought-resistant shrubs.
Constraints: keep canyon sky, side-wall horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; no thin spikes, overhang across the center, maze, characters, UI, text, logo, or watermark.
```

## BG-03-08 · 3-8 遮阳营地

```text
Input image: Image 1 is the 3-5 wind-canyon regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-8 “遮阳营地”; do not render this name or any text.
Landmarks: one weathered muted fabric shade awning held entirely at an outer side, two broad blank clay water jars without marks, and one chunky extinguished brazier with no glow, smoke, or face-like openings.
Constraints: keep canyon sky, side-wall horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; no tent across the center, active fire, people, goods, writing, UI, text, logo, or watermark.
```

## BG-03-09 · 3-9 沉沙外城

```text
Region/stage: sunken city, 3-9 “沉沙外城”; do not render this name or any text.
Scene/backdrop: a quiet half-buried ancient city edge with rounded gray-beige sandstone architecture, deep muted teal shade, a continuous dusty ochre battle road, and a pale gray-blue sky.
Landmarks: blank half-buried outer walls at both far sides, one incomplete rounded arch that does not span the center, several low sandstone blocks, and tiny restrained oxidized-copper-green details.
Mood: old, inviting, and mysterious without magic, horror, or cultural stereotype.
```

## BG-03-10 · 3-10 铜门集市

```text
Input image: Image 1 is the 3-9 sunken-city regional composition reference and edit target.
Primary request: change only the left and right landmark props to create 3-10 “铜门集市”; do not render this name or any text.
Landmarks: two broad blank oxidized-copper door panels at an outer wall, one folded muted fabric shade, and two closed empty market tables held at the far sides.
Constraints: keep city sky, architecture horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; no goods, writing, numbers, symbols, people, characters, UI, logo, or watermark.
```

## BG-03-11 · 3-11 巨柱门廊

```text
Input image: Image 1 is the 3-9 sunken-city regional composition reference and edit target.
Primary request: change only the side and upper-distance landmark props to create 3-11 “巨柱门廊”; do not render this name or any text.
Landmarks: two massive rounded blank sandstone columns at the far outer sides, one broken beam segment resting only on a side ruin, and broad low steps kept behind the battle corridor.
Constraints: keep city sky, architecture horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; no connected roof across the center, readable carving, glyphs, statues, characters, UI, text, logo, or watermark.
```

## BG-03-12 · 3-12 赤砂王庭

```text
Input image: Image 1 is the 3-9 sunken-city regional composition reference and edit target.
Primary request: change only the side and upper-distance landmark props to create 3-12 “赤砂王庭”; do not render this name or any text.
Landmarks: a grand half-buried palace court suggested by two broad outer shoulder walls and a distant rounded central hall held above the battle ground, plus one restrained non-glowing warm-copper sunlit color patch high on the architecture.
Constraints: keep city camera height, ground geometry, muted palette, lighting, rendering language, dimensions, and central 58% battle-safe area unchanged; the copper patch is natural sunlight, not a sun symbol, eye, portal, crystal, magic effect, or light beam; no faces, glyphs, religious motifs, statues, characters, UI, text, logo, or watermark.
```

## BG-MAP-03 · 赤沙古道

```text
Use case: stylized-concept.
Asset type: node-free chapter-map background for the mobile H5 idle RPG “青丘远征”.
Input images: Image 1 is the 3-1 red-dunes regional anchor; Image 2 is the 3-5 wind-canyon regional anchor; Image 3 is the 3-9 sunken-city regional anchor; Image 4 is the approved Frostland chapter map layout reference. Use the regional references for palette and landmarks. Use the map reference only for horizontal journey readability, natural terrain-route composition, low-frequency detail, and thick-outlined storybook language. Do not copy its snow, pine, aurora, fortress, or route geometry.
Primary request: create one original horizontal illustrated journey map for Chapter 3 Red Sand Ancient Road in the same thick-outlined casual storybook visual language.
Scene/backdrop: the left third is open muted-ochre red dunes and an old roadside outpost, the middle third becomes a rounded terracotta wind canyon with a visible turn in the route, and the right third becomes a gray-beige half-buried city ending at the Red Sand Court.
Composition/framing: one broad natural pale-ochre winding road moves through all three regions and leaves approximately twelve evenly spaced clear terrain areas for later DOM stage nodes; show the journey left to right; reduce detail density by approximately 25% compared with battle backgrounds.
Style/medium: large rounded low-frequency hand-drawn shapes, muted flat colors, thick warm near-black rounded outlines only on major landmarks, at most one hard-edged shadow per object.
Constraints: the road is natural terrain only; no baked nodes, circles, rings, oval pads, circular clearings, dotted paths, stepping-stone markers, locks, flags, numbers, text, labels, UI, characters, monsters, creatures, logo, frame, watermark, readable glyphs, symbols, portals, magic circles, or religious motifs.
```

## FG-RED-DUNES · 赤沙驿道前景

```text
Use case: background-extraction.
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene.
Input image: Image 1 is the 3-1 red-dunes master and authoritative position/style reference.
Primary request: recreate only bottom-left and bottom-right close foreground drought-grass tufts, low rounded sand banks, one or two warm stones, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep x=38% through x=62% completely empty above the bottom 36 pixels; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, dunes, mesas, distant plants, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff inside foreground art.
```

## FG-WIND-CANYON · 风蚀峡谷前景

```text
Use case: background-extraction.
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene.
Input image: Image 1 is the 3-5 wind-canyon master and authoritative position/style reference.
Primary request: recreate only bottom-left and bottom-right close terracotta rock fragments, two thick dry branch shapes, simple sage-green scrub, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep x=38% through x=62% completely empty above the bottom 36 pixels; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, canyon walls, distant rocks, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff inside foreground art.
```

## FG-SUNKEN-CITY · 沉沙古城前景

```text
Use case: background-extraction.
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene.
Input image: Image 1 is the 3-9 sunken-city master and authoritative position/style reference.
Primary request: recreate only bottom-left and bottom-right close rounded sandstone rubble, dark muted teal hardy leaf clusters, two small non-glowing copper fragments, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: visible art occupies only the bottom outer sides; keep x=38% through x=62% completely empty above the bottom 36 pixels; art may touch the bottom and outer side edges; keep the top 58% of the canvas empty.
Constraints: one uniform #ff00ff background with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, walls, arches, distant ruins, characters, creatures, writing, symbols, UI, text, logo, or watermark; do not use #ff00ff inside foreground art.
```
