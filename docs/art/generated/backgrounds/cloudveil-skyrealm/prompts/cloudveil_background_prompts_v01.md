# 云岚天境背景生成提示词

- 版本：1.0
- 生成模式：内置 ImageGen
- 用途：12 张战斗背景、1 张章节地图、3 张透明前景遮挡层
- 风格参考：前三章已批准战斗背景与章节地图

## 共同提示词

```text
Use case: stylized-concept.
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”.
Input images: approved chapter references used only for low side-view camera, continuous broad battle ground, rounded hand-drawn shapes, low-frequency detail, muted flat colors, and warm near-black close outlines. Do not copy their meadow, snow, desert, ruin, route, character, or prop content.
Primary request: create one completely original Cloudveil Skyrealm landscape in the same thick-outlined casual storybook game aesthetic.
Style/medium: polished 2D mobile game background; large rounded irregular shapes; muted flat color blocks; thick warm near-black rounded outlines only on close props and key landmarks; at most one hard-edged shadow per object; 6–9 major colors.
Composition/framing: 1672×941 landscape; low side-view battle camera; one continuous solid walkable plateau, stone path, or courtyard; keep the central 58% width clean, continuous, low contrast, and free of major props; landmarks remain at far sides or upper distance.
Lighting/mood: soft diffuse high-altitude daylight, friendly adventurous tone; cloud sea is distant scenery only and never covers the battle ground.
Constraints: no characters, monsters, creatures, people silhouettes, UI, text, numbers, logos, frames, watermark, health-bar-like stripes, religious symbols, angels, wings, glyphs, runes, star charts, magic circles, portals, glowing cores, particle storms, light beams, transparent glass, photoreal clouds, cinematic lighting, anime rendering, painterly texture, or copied game designs.
```

## 区域色板

### 云岚高原

```text
Palette: soft gray-cyan sky, warm ivory cloud sea, muted celadon grass, warm gray-brown solid road, pale limestone, restrained lavender flowers and blue-violet distance.
Invariants: solid open highland, cloud sea below the distant outer cliffs, broad rounded slopes, no snowfield resemblance and no floating battle platform.
```

### 浮石风谷

```text
Palette: pale gray-cyan sky, rounded slate-violet rock, dusty blue shadow, warm gray stone road, muted sage vegetation, warm ivory distant clouds.
Invariants: continuous solid valley ledge, floating stones only high in the distance, side walls frame but never cross the center, no magical glow or debris storm.
```

### 天穹古城

```text
Palette: warm ivory limestone, cool gray-violet shade, muted verdigris, warm gray road, restrained old gold, pale gray-cyan sky.
Invariants: friendly rounded high city, blank architecture, solid courtyard, no white religious temple, symbols, star map, magic, or horror.
```

## BG-04-01 · 4-1 云岚驿道

```text
Scene: open solid cloud-highland road with muted celadon slopes, warm-gray earth-and-stone battle ground, pale limestone edges, distant lavender-blue mountains, and warm ivory cloud sea visible only beyond outer cliffs.
Landmarks: one thick blank stacked-stone roadside marker at far right, low pale rocks at outer edges, one broad muted celadon wind-grass tuft at far left.
Keep the central 58% completely open and solid. No snow, floating ground, characters, text, UI, symbols, or magic.
```

## BG-04-02 · 4-2 风铃草坡

```text
Input image: Image 1 is the 4-1 regional edit target.
Change only outer-side landmarks: remove the marker; add broad round-leaf pale-lavender bellflowers at far sides, low gentle celadon slopes, and distant cloud sea outside the cliff edge.
Preserve exact sky, horizon, solid ground, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No literal bells, characters, text, UI, or particles.
```

## BG-04-03 · 4-3 白岩梯田

```text
Input image: Image 1 is the 4-1 regional edit target.
Change only outer-side landmarks: warm-white rounded limestone terrace shelves, one shallow matte gray-blue rainwater basin behind an outer edge, and short celadon grass tufts.
Preserve exact sky, horizon, solid road, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No reflective water, steps across center, snow, text, UI, or magic.
```

## BG-04-04 · 4-4 断索云桥

```text
Input image: Image 1 is the 4-1 regional edit target.
Change only outer-side landmarks: a chunky old pale-stone bridgehead entering from one far edge, two short broken thick rope ends, and low side guard blocks. The bridge deck must not cross or enter the center.
Preserve sky, horizon, solid ground, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No gap under battle ground, bodies, characters, text, UI, or symbols.
```

## BG-04-05 · 4-5 浮石谷口

```text
Scene: friendly high wind valley with rounded slate-violet side pillars, dusty-blue shade, continuous solid warm-gray stone battle road, muted sage scrub, pale gray-cyan sky, and warm ivory cloud sea only beyond the far cliffs.
Landmarks: two separated rounded rock pillars at far sides and exactly three large blunt floating stones high in the distant sky. No arch or bridge across center.
Keep the central 58% open, solid, and low contrast. No small debris, glow, particles, floating battle ground, text, UI, or magic.
```

## BG-04-06 · 4-6 回风石径

```text
Input image: Image 1 is the 4-5 regional edit target.
Change only outer-side landmarks: broad curved layered rock fins, two low soft cloud-stream shapes behind outer cliffs, and simple sage shrubs. Remove distant floating stones.
Preserve exact sky, valley horizon, solid road, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No spiral symbols, wind particles, text, UI, or magic.
```

## BG-04-07 · 4-7 悬根栈道

```text
Input image: Image 1 is the 4-5 regional edit target.
Change only outer-side landmarks: thick rounded exposed roots, one short wooden boardwalk endpoint at each far edge, and low slate-violet ledges. Nothing crosses the center.
Preserve sky, horizon, solid road, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No suspended central bridge, characters, text, UI, or magic.
```

## BG-04-08 · 4-8 云帆营地

```text
Input image: Image 1 is the 4-5 regional edit target.
Change only outer-side landmarks: one folded blank warm-ivory travel sail entirely at far left, two broad unmarked clay jars at far right, and one chunky extinguished wind lamp with no glow, smoke, face, or symbol.
Preserve sky, horizon, solid road, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No people, active fire, text, UI, or magic.
```

## BG-04-09 · 4-9 云门外庭

```text
Scene: quiet high-city outer court with rounded warm-ivory limestone architecture, cool gray-violet shade, muted verdigris details, solid warm-gray courtyard, and pale sky with cloud sea only beyond outer walls.
Landmarks: blank half-buried side walls, one incomplete rounded arch at a far side, and low limestone blocks.
Keep central 58% open and solid. No religious imagery, angel motif, star chart, glyph, portal, character, text, UI, or glowing object.
```

## BG-04-10 · 4-10 青铜风廊

```text
Input image: Image 1 is the 4-9 regional edit target.
Change only outer-side landmarks: broad blank verdigris louver panels in a side wall, one folded muted-lavender shade, and two closed simple benches at far sides.
Preserve sky, architecture horizon, solid courtyard, camera, palette, lighting, dimensions, style, and central 58% safe corridor. No goods, writing, symbols, people, text, UI, or magic.
```

## BG-04-11 · 4-11 高塔门廊

```text
Input image: Image 1 is the 4-9 regional edit target.
Change only side and upper-distance landmarks: two massive rounded blank white-stone tower columns at far sides, one short broken side beam kept outside the central 58%, and broad low steps behind the battle corridor.
Preserve solid courtyard, camera, palette, lighting, dimensions, and style. No connected roof, carving, statue, glyph, text, UI, portal, or magic.
```

## BG-04-12 · 4-12 云冠天城

```text
Input image: Image 1 is the 4-9 regional edit target.
Increase only side and upper-distance architecture: a grand layered high city with rounded towers and terraces far in the distance, broad side shoulder walls, and restrained non-glowing old-gold roof caps. Keep central ground open.
Preserve camera, solid courtyard, muted palette, lighting, dimensions, and style. No crown symbol, sun disk, star, eye, portal, glow, beam, religious motif, text, UI, or magic.
```

## BG-MAP-04 · 云岚天境

```text
Use case: stylized-concept. Asset type: node-free horizontal chapter-map background.
Input images: Images 1–3 are the three regional anchors; Image 4 is an approved map used only for journey readability and low-frequency storybook composition.
Scene: left third is solid celadon cloud highland with cloud sea beyond cliffs; middle is slate-violet floating-stone wind valley with a route turn; right is warm-ivory sky city ending at layered Cloudcrown City. One broad natural warm-gray stone road runs across continuous solid terrain.
Style: rounded hand-drawn shapes, muted flat colors, major-landmark warm outlines, 25% less detail than battle backgrounds.
Critical constraints: no nodes, circles, rings, oval pads, circular clearings, repeated landing areas, stepping stones, dotted paths, pins, locks, flags, numbers, text, labels, UI, characters, creatures, logos, frames, watermarks, glyphs, symbols, star charts, portals, or magic circles.
```

## FG-CLOUD-HIGHLANDS · 云岚高原前景

```text
Use case: background-extraction. Input image: Image 1 is the 4-1 style reference.
Recreate only bottom-left and bottom-right close muted-celadon wind grass, warm-ivory rocks, pale-lavender cloudflowers, and thick warm outlines.
Background: perfectly flat solid #ff00ff. Visible art stays in outermost 34% on each side; x=38%–62% stays completely #ff00ff at every height; top 58% completely empty.
No sky, road, cliff, cloud sea, shadow, gradient, floor, reflection, character, text, UI, or watermark; do not use #ff00ff inside props.
```

## FG-FLOATING-VALLEY · 浮石风谷前景

```text
Use case: background-extraction. Input image: Image 1 is the 4-5 style reference.
Recreate only bottom-left and bottom-right close slate-violet rocks, thick rounded roots, muted sage leaf clusters, and thick warm outlines.
Background: perfectly flat solid #ff00ff. Visible art stays in outermost 34% on each side; x=38%–62% stays completely #ff00ff at every height; top 58% completely empty.
No sky, road, cliff, floating stone, cloud, shadow, gradient, floor, reflection, character, text, UI, or watermark; do not use #ff00ff inside props.
```

## FG-SKY-CITY · 天穹古城前景

```text
Use case: background-extraction. Input image: Image 1 is the 4-9 style reference.
Recreate only bottom-left and bottom-right close warm-ivory limestone rubble, dark muted-verdigris vine leaves, two small non-glowing old-gold fragments, and thick warm outlines.
Background: perfectly flat solid #ff00ff. Visible art stays in outermost 34% on each side; x=38%–62% stays completely #ff00ff at every height; top 58% completely empty.
No sky, courtyard, wall, arch, cloud, shadow, gradient, floor, reflection, character, symbol, text, UI, or watermark; do not use #ff00ff inside props.
```
