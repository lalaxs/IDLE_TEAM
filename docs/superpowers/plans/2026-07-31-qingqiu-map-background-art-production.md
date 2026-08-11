# Qingqiu Map Background Art Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify twelve consistent first-chapter battle backgrounds, one chapter-map background, and three transparent regional foreground-occlusion layers for the mobile H5 RPG “青丘远征”.

**Architecture:** Use three authoritative regional compositions—meadow, forest, and ruins—then derive four stage-specific full-scene masters per region while preserving the regional horizon, road, lighting, palette, and central battle-safe area. Keep ImageGen output non-destructive under `docs/art/generated/backgrounds/qingqiu-frontier/`; use a small Pillow-based tool only for deterministic review sheets and dimension reporting.

**Tech Stack:** Built-in ImageGen, PNG/JPEG, Python 3.12, Pillow, unittest.

## Global Constraints

- Scope is first chapter only: stages `1-1` through `1-12` plus one chapter-map background.
- Visual direction is “厚描边童话”.
- Landmarks and close props use thick warm near-black rounded outlines; sky and distant terrain do not use complete black outlines.
- Use muted flat colors, rounded low-frequency shapes, and at most one hard-edged shadow per major object.
- Keep the central 58% of each battle background low contrast and free from major landmarks.
- Do not render characters, monsters, UI, text, logos, frames, watermarks, or baked stage nodes.
- Do not overwrite `public/assets/backgrounds/*.svg`.
- Every built-in ImageGen output consumed by the project must be copied into the workspace.
- Transparent foreground layers use the built-in ImageGen chroma-key workflow with a perfectly flat `#ff00ff` background and local key removal; do not switch to CLI true transparency.

---

### Task 1: Production Manifest and Exact Prompt Set

**Files:**
- Create: `docs/art/requirements/background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/prompts/qingqiu_frontier_background_prompts_v01.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-31-map-background-art-design.md`
- Produces: one ordered JSON record per final master with `id`, `stage`, `region`, `name`, `filename`, `landmarks`, `reference_id`, and `status`; exact shared and per-image prompts used by Tasks 3–6.

- [ ] **Step 1: Create the ordered manifest**

Write thirteen records in this order:

```json
[
  {"id":"BG-01-01","stage":"1-1","region":"meadow","name":"新芽小径","filename":"bg_stage_01_01_sprout_path_v01.png","landmarks":["嫩根拱出地面","双叶幼芽"],"reference_id":null,"status":"pending"},
  {"id":"BG-01-02","stage":"1-2","region":"meadow","name":"蘑菇浅滩","filename":"bg_stage_01_02_mushroom_shallows_v01.png","landmarks":["红帽菌簇","浅水石","低矮湿地边缘"],"reference_id":"BG-01-01","status":"pending"},
  {"id":"BG-01-03","stage":"1-3","region":"meadow","name":"石甲坡地","filename":"bg_stage_01_03_stone_slope_v01.png","landmarks":["层叠灰石坡","短粗岩块","耐旱草"],"reference_id":"BG-01-01","status":"pending"},
  {"id":"BG-01-04","stage":"1-4","region":"meadow","name":"风语栈桥","filename":"bg_stage_01_04_wind_bridge_v01.png","landmarks":["旧木栈桥","悬挂木片","风动种荚"],"reference_id":"BG-01-01","status":"pending"},
  {"id":"BG-01-05","stage":"1-5","region":"forest","name":"守望林口","filename":"bg_stage_01_05_watchwood_gate_v01.png","landmarks":["哨塔形中空树桩","向内收拢的树冠"],"reference_id":null,"status":"pending"},
  {"id":"BG-01-06","stage":"1-6","region":"forest","name":"暮色溪谷","filename":"bg_stage_01_06_twilight_creek_v01.png","landmarks":["圆润溪石","窄溪","贴地薄雾"],"reference_id":"BG-01-05","status":"pending"},
  {"id":"BG-01-07","stage":"1-7","region":"forest","name":"盘根小径","filename":"bg_stage_01_07_tangled_root_path_v01.png","landmarks":["道路两侧粗根","少量棘枝","抬高林地"],"reference_id":"BG-01-05","status":"pending"},
  {"id":"BG-01-08","stage":"1-8","region":"forest","name":"古碑营地","filename":"bg_stage_01_08_stele_camp_v01.png","landmarks":["残碑","熄灭火盆","低矮营地石圈"],"reference_id":"BG-01-05","status":"pending"},
  {"id":"BG-01-09","stage":"1-9","region":"ruins","name":"雾松腹地","filename":"bg_stage_01_09_mist_pine_depths_v01.png","landmarks":["苍白松干","圆团雾气","稀疏松冠"],"reference_id":null,"status":"pending"},
  {"id":"BG-01-10","stage":"1-10","region":"ruins","name":"藤蔓祭场","filename":"bg_stage_01_10_vine_altar_v01.png","landmarks":["低矮石坛","粗藤环","四角残石"],"reference_id":"BG-01-09","status":"pending"},
  {"id":"BG-01-11","stage":"1-11","region":"ruins","name":"巨木门廊","filename":"bg_stage_01_11_giantwood_portico_v01.png","landmarks":["断木柱门形剪影","少量旧石"],"reference_id":"BG-01-09","status":"pending"},
  {"id":"BG-01-12","stage":"1-12","region":"ruins","name":"古树之心","filename":"bg_stage_01_12_ancient_tree_heart_v01.png","landmarks":["琥珀色树心","残碑肩形结构","古树内腔"],"reference_id":"BG-01-09","status":"pending"},
  {"id":"BG-MAP-01","stage":null,"region":"chapter","name":"青丘边境","filename":"bg_chapter_01_qingqiu_frontier_map_v01.png","landmarks":["左侧草地","中部森林","右侧遗迹古树","浅色蜿蜒道路"],"reference_id":null,"status":"pending"}
]
```

- [ ] **Step 2: Write the exact common prompt**

The prompt document must start with:

```text
Use case: stylized-concept
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”
Primary request: Create one completely original casual fantasy landscape with a thick-outlined storybook game aesthetic.
Style/medium: large rounded hand-drawn shapes; muted flat color blocks; thick warm near-black rounded outlines only on landmarks and close props; at most one hard-edged shadow per major object.
Composition/framing: landscape composition designed to cover mobile battle canvases from 360×228 to 430×308; camera at low side-view battle height; keep the central 58% width clean, continuous, low contrast, and free of large props; place recognizable landmarks at the far left, far right, or upper distance.
Constraints: no characters, monsters, UI, text, numbers, logos, frames, watermark, health-bar-like red or white horizontal marks, high-frequency texture, dense foliage, tiny debris, realistic bark, photorealism, anime rendering, painterly brush texture, cinematic lighting, complex gradients, metallic reflections, or third-party game designs.
```

- [ ] **Step 3: Add the exact regional palette blocks**

```text
Meadow palette: pale teal sky, fresh yellow-green grass, soft sage hills, warm light ochre road, gray-beige stones, small restrained coral-red mushroom accents.
Forest palette: gray-teal sky, deep muted woodland green, moss green, damp brown earth, blue-gray creek stones, no black night shadows.
Ruins palette: misty gray-green sky, desaturated olive terrain, pale weathered wood, warm gray old stone, restrained amber accent, quiet ancient mood without horror.
```

- [ ] **Step 4: Add every stage landmark block verbatim from the manifest**

For edit-derived stage prompts, repeat:

```text
Change only the left/right landmark props and their small supporting details.
Keep the regional sky, horizon, road geometry, camera height, palette, lighting, rendering language, and central battle-safe area unchanged.
```

- [ ] **Step 5: Validate the manifest**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool docs/art/requirements/background-generation-manifest-v01.json >/dev/null
```

Expected: exit code `0`.

- [ ] **Step 6: Commit**

```bash
git add docs/art/requirements/background-generation-manifest-v01.json docs/art/generated/backgrounds/qingqiu-frontier/prompts/qingqiu_frontier_background_prompts_v01.md
git commit -m "Define Qingqiu background generation prompts"
```

### Task 2: Deterministic Contact-Sheet and Validation Tool

**Files:**
- Create: `scripts/art/build_background_contact_sheets.py`
- Create: `scripts/art/test_build_background_contact_sheets.py`

**Interfaces:**
- Consumes: PNG files under `docs/art/generated/backgrounds/qingqiu-frontier/masters/`
- Produces:
  - `build_region_sheet(master_dir: Path, output: Path, filenames: list[str], title: str) -> None`
  - `build_overview(master_dir: Path, output: Path, entries: list[dict[str, object]]) -> None`
  - `inspect_images(master_dir: Path, filenames: list[str]) -> list[dict[str, object]]`

- [ ] **Step 1: Write failing tests**

Tests must create temporary RGB images with Pillow and verify:

```python
def test_build_region_sheet_creates_readable_four_panel_jpeg():
    # Four 600×400 inputs produce an RGB JPEG wider than 1000 px.

def test_build_overview_includes_all_thirteen_inputs():
    # Thirteen differently colored inputs produce a readable overview file.

def test_inspect_images_reports_dimensions_and_mode():
    # A 600×400 RGB input yields {"width": 600, "height": 400, "mode": "RGB"}.

def test_inspect_images_rejects_missing_file():
    # Missing filename raises FileNotFoundError containing that filename.
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
```

Expected: FAIL because `build_background_contact_sheets.py` does not exist.

- [ ] **Step 3: Implement the minimal tool**

Implementation requirements:

- open inputs with `Image.open(path).convert("RGB")`;
- fit each image into a fixed card using `ImageOps.fit`;
- use a warm review background `(246, 241, 228)`;
- use the existing `/System/Library/Fonts/Hiragino Sans GB.ttc` when available and `ImageFont.load_default()` otherwise;
- create a 2×2 regional sheet with stage label below each image;
- create a 4-column overview grid for thirteen entries;
- save review sheets as JPEG quality `92`;
- never modify the source masters.

- [ ] **Step 4: Run focused tests**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
```

Expected: four tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/art/build_background_contact_sheets.py scripts/art/test_build_background_contact_sheets.py
git commit -m "Add background contact sheet tooling"
```

### Task 3: Meadow Background Masters

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_01_sprout_path_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_02_mushroom_shallows_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_03_stone_slope_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_04_wind_bridge_v01.png`

**Interfaces:**
- Consumes: common prompt and meadow palette from Task 1
- Produces: four readable PNG masters sharing composition, palette, and lighting

- [ ] **Step 1: Generate stage 1-1 with built-in ImageGen**

Use the common prompt plus:

```text
Region/stage: meadow, 1-1 “新芽小径”; do not render this name.
Scene: an open young meadow frontier. Use low rounded distant hills and one continuous warm ochre battle road.
Landmarks: two or three thick young roots arching from the ground near the outer edges, each with one pair of simple leaves.
Mood: bright, welcoming, early expedition.
```

- [ ] **Step 2: Copy the selected output into the exact 1-1 master path and inspect it**

Check the image has no characters or text, and the central 58% remains open.

- [ ] **Step 3: Generate stages 1-2, 1-3, and 1-4 as reference-based variants**

Use the 1-1 image as the sole regional composition reference. Apply each stage landmark block while repeating the edit invariants from Task 1.

- [ ] **Step 4: Inspect all four at thumbnail and original size**

Reject and regenerate any image that changes the horizon or road substantially, adds figures, or puts a major prop in the center.

- [ ] **Step 5: Update manifest statuses to `generated`**

Update only `BG-01-01` through `BG-01-04`.

### Task 4: Forest Background Masters

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_05_watchwood_gate_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_06_twilight_creek_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_07_tangled_root_path_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_08_stele_camp_v01.png`

**Interfaces:**
- Consumes: common prompt and forest palette from Task 1
- Produces: four readable PNG masters sharing composition, palette, and lighting

- [ ] **Step 1: Generate stage 1-5 with built-in ImageGen**

Use the common prompt plus:

```text
Region/stage: forest, 1-5 “守望林口”; do not render this name.
Scene: a deep but friendly woodland entrance, with rounded tree-canopy masses closing inward from both sides and a continuous damp-earth battle road.
Landmarks: one hollow watchtower-like stump at an outer edge and a restrained opposing trunk silhouette.
Mood: shaded and watchful, never dark or frightening.
```

- [ ] **Step 2: Copy and inspect the 1-5 master**

The central battle road must remain brighter than the side trees.

- [ ] **Step 3: Generate stages 1-6, 1-7, and 1-8 as reference-based variants**

Use the 1-5 image as the sole forest composition reference and repeat the edit invariants.

- [ ] **Step 4: Inspect all four**

Reject images with dense leaf texture, black shadows, center-obscuring roots, readable rune text, or active fire.

- [ ] **Step 5: Update manifest statuses to `generated`**

Update only `BG-01-05` through `BG-01-08`.

### Task 5: Ruins Background Masters

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_09_mist_pine_depths_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_10_vine_altar_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_11_giantwood_portico_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_stage_01_12_ancient_tree_heart_v01.png`

**Interfaces:**
- Consumes: common prompt and ruins palette from Task 1
- Produces: four readable PNG masters sharing composition, palette, and lighting

- [ ] **Step 1: Generate stage 1-9 with built-in ImageGen**

Use the common prompt plus:

```text
Region/stage: ruins, 1-9 “雾松腹地”; do not render this name.
Scene: a quiet ancient grove with pale weathered pine trunks, sparse rounded pine-crown masses, muted olive ground, and a continuous warm-gray battle road.
Landmarks: pale trunks at the far sides and two or three simple rounded fog masses kept above or behind the battle corridor.
Mood: ancient and hushed, never horror.
```

- [ ] **Step 2: Copy and inspect the 1-9 master**

Fog must not wash out the center or resemble combat effects.

- [ ] **Step 3: Generate stages 1-10, 1-11, and 1-12 as reference-based variants**

Use the 1-9 image as the sole ruins composition reference and repeat the edit invariants.

- [ ] **Step 4: Inspect all four**

Reject readable glyphs, religious symbols, glowing magic circles, skulls, horror imagery, or center-obscuring architecture.

- [ ] **Step 5: Update manifest statuses to `generated`**

Update only `BG-01-09` through `BG-01-12`.

### Task 6: Chapter Map Background

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/masters/bg_chapter_01_qingqiu_frontier_map_v01.png`

**Interfaces:**
- Consumes: all three regional masters as style references
- Produces: one node-free panoramic chapter map background

- [ ] **Step 1: Generate the map with built-in ImageGen**

Use:

```text
Use case: stylized-concept
Asset type: node-free chapter-map background for the mobile H5 idle RPG “青丘远征”
Primary request: Create one original horizontal illustrated journey map in the same thick-outlined casual storybook style as the supplied meadow, forest, and ruins references.
Composition: left third transitions from bright meadow, middle third becomes deep friendly forest, right third becomes quiet gray-green ruins ending at a huge ancient tree. A broad pale winding road moves through all three regions and leaves clear positions for twelve DOM stage nodes arranged along the route.
Style: large rounded low-frequency shapes, muted flat colors, thick warm near-black rounded outlines only on major landmarks, at most one hard-edged shadow per object, approximately 25% less detail than the battle backgrounds.
Constraints: no nodes, circles, dotted paths, locks, flags, numbers, text, labels, UI, characters, monsters, logo, frame, or watermark.
```

- [ ] **Step 2: Copy and inspect the map master**

Verify the route is visible without resembling a pre-rendered dotted UI path and all three regions are distinguishable at thumbnail size.

- [ ] **Step 3: Update `BG-MAP-01` status to `generated`**

### Task 7: Transparent Regional Foreground-Occlusion Layers

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/runtime/fg_meadow_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/runtime/fg_forest_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/runtime/fg_ruins_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/foreground_occlusion_preview_v01.png`

**Interfaces:**
- Consumes: regional base masters `BG-01-01`, `BG-01-05`, and `BG-01-09`
- Produces: three same-size RGBA PNG overlays whose visible pixels occupy the bottom and outer edges, with only minimal bottom-edge intrusion into the central combat area

- [ ] **Step 1: Generate the meadow chroma source**

Use the 1-1 master as the sole position and style reference:

```text
Use case: background-extraction
Asset type: transparent foreground occlusion overlay for a mobile side-view battle scene
Input image: Image 1 is the authoritative position and style reference.
Primary request: Recreate only the bottom-left and bottom-right close foreground leaf clusters, low bushes, and their thick warm rounded outlines. Remove every other part of the scene.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background.
Composition: preserve the foreground cluster positions and scale from Image 1; keep the central 58% width completely empty; visible art may touch the bottom and outer side edges.
Constraints: the background must be one uniform #ff00ff with no shadow, gradient, texture, reflection, floor, halo, or lighting variation; no road, sky, hills, distant vegetation, characters, creatures, UI, text, logo, or watermark; do not use #ff00ff in the foreground art.
```

- [ ] **Step 2: Generate forest and ruins chroma sources**

Repeat Step 1 using the 1-5 and 1-9 masters. Preserve only:

- forest: bottom outer leaf clusters, low bushes, exposed roots, and one rounded stone;
- ruins: bottom outer dark-olive leaf clusters, pine-root shapes, and old stones.

- [ ] **Step 3: Copy chroma sources into a temporary workspace folder and remove the key**

For each source run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  /Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input <chroma-source.png> \
  --out <runtime-output.png> \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

- [ ] **Step 4: Validate transparency and dimensions**

Use Pillow to assert:

- every output mode is `RGBA`;
- every output size matches its regional base master;
- both top-corner alpha values are `0`; bottom corners may remain opaque because the artwork intentionally touches the lower edge;
- in the center rectangle from x `38%` to `62%`, pixels with alpha above `16` occupy no more than `0.1%` of the rectangle and appear only near the bottom;
- visible alpha bounding boxes touch the bottom or outer side edges.

- [ ] **Step 5: Build the checkerboard preview**

Composite the three overlays over a 32 px light/dark checkerboard in one vertical review image. Label each panel outside the overlay area as `MEADOW`, `FOREST`, or `RUINS`.

### Task 8: Review Sheets, Validation Report, and Final Commit

**Files:**
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/meadow_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/forest_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/ruins_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/chapter_background_overview_v01.jpg`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/foreground_occlusion_preview_v01.png`
- Create: `docs/art/generated/backgrounds/qingqiu-frontier/review/validation-report.md`
- Modify: `docs/art/requirements/background-generation-manifest-v01.json`

**Interfaces:**
- Consumes: all thirteen master images, three foreground overlays, and Task 2 tooling
- Produces: complete human-review and machine-inspection package

- [ ] **Step 1: Run the contact-sheet tool**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/art/build_background_contact_sheets.py \
  --manifest docs/art/requirements/background-generation-manifest-v01.json \
  --master-dir docs/art/generated/backgrounds/qingqiu-frontier/masters \
  --review-dir docs/art/generated/backgrounds/qingqiu-frontier/review
```

Expected: four JPEG files are created.

- [ ] **Step 2: Write the validation report**

Record:

- all thirteen filenames;
- each image width, height, and mode;
- region consistency observations;
- center-safe-area observations;
- confirmation that map art has no baked nodes or text;
- foreground-overlay dimensions, alpha modes, transparent-center checks, and fringe observations;
- any regenerated asset and its reason.

- [ ] **Step 3: Mark every passing manifest record `approved`**

Do not mark an asset approved until it passes both original-size and contact-sheet inspection.

- [ ] **Step 4: Run automated checks**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool docs/art/requirements/background-generation-manifest-v01.json >/dev/null
find docs/art/generated/backgrounds/qingqiu-frontier/masters -maxdepth 1 -name '*.png' | wc -l
find docs/art/generated/backgrounds/qingqiu-frontier/review -maxdepth 1 -name '*.jpg' | wc -l
find docs/art/generated/backgrounds/qingqiu-frontier/runtime -maxdepth 1 -name '*.png' | wc -l
```

Expected:

- all Python tests pass;
- JSON validation exits `0`;
- PNG count is `13`;
- JPEG count is `4`.
- runtime PNG count is `3`.

- [ ] **Step 5: Inspect all review sheets**

Open each JPEG and confirm:

- no missing or duplicated panel;
- the four images of each region share palette, horizon, and road;
- every stage landmark is legible without text;
- the chapter overview contains all thirteen images.

- [ ] **Step 6: Commit only background-production files**

```bash
git add \
  docs/art/requirements/background-generation-manifest-v01.json \
  docs/art/generated/backgrounds/qingqiu-frontier \
  scripts/art/build_background_contact_sheets.py \
  scripts/art/test_build_background_contact_sheets.py
git commit -m "Produce Qingqiu chapter background art"
```
