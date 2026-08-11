# Frostland Map Background Art Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify twelve second-chapter Frostland battle backgrounds, one node-free chapter map, and three transparent regional foreground-occlusion layers.

**Architecture:** Preserve the first chapter’s thick-outlined storybook rendering language while establishing three Frostland compositions: snowfield, pinewood, and aurora ruins. Generate one authoritative base per region, derive three landmark variants from it, then use a generic manifest-driven review tool for contact sheets and image validation.

**Tech Stack:** Built-in ImageGen, PNG/JPEG, Python 3.12, Pillow, unittest.

## Global Constraints

- Scope is second chapter only: stages `2-1` through `2-12` plus one chapter-map background.
- Use the latest approved chapter identity, `霜原`; do not modify the older runtime `赤沙古道` preview in this production task.
- Match the first chapter’s thick warm rounded outlines, large hand-drawn shapes, flat muted colors, and restrained shadow detail.
- Keep the central 58% of each battle background low contrast and free from major landmarks.
- Ice must be opaque stylized color blocks; do not use realistic transparency, refraction, or glass rendering.
- Aurora colors are restrained teal and pale violet bands without particles, beams, magic circles, or cinematic bloom.
- Do not render characters, monsters, UI, text, numbers, logos, frames, watermarks, or baked stage nodes.
- Do not overwrite `public/assets/backgrounds/*.svg` or modify chapter progression code.
- Use built-in ImageGen for all raster generation.
- Transparent foreground layers use a flat `#ff00ff` built-in ImageGen source plus local chroma-key removal.
- Every project-bound final must be copied into `docs/art/generated/backgrounds/frostland/`.

---

### Task 1: Frostland Manifest and Exact Prompt Set

**Files:**
- Create: `docs/art/requirements/frostland-background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/frostland/prompts/frostland_background_prompts_v01.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-31-frostland-map-background-art-design.md`
- Produces: thirteen ordered manifest entries and the exact common, regional, per-stage, map, and foreground prompts used by later tasks.

- [ ] **Step 1: Write the ordered manifest**

Create exactly these records in this order:

```json
[
  {"id":"BG-02-01","stage":"2-1","region":"snowfield","name":"雪线驿道","filename":"bg_stage_02_01_snowline_road_v01.png","landmarks":["低矮雪堆","无文字旧路桩","耐寒草"],"reference_id":null,"status":"pending"},
  {"id":"BG-02-02","stage":"2-2","region":"snowfield","name":"霜河浅滩","filename":"bg_stage_02_02_frost_river_shallows_v01.png","landmarks":["冻结浅河","圆润蓝冰","冻土岸"],"reference_id":"BG-02-01","status":"pending"},
  {"id":"BG-02-03","stage":"2-3","region":"snowfield","name":"风蚀雪坡","filename":"bg_stage_02_03_windworn_snow_slope_v01.png","landmarks":["层叠雪坡","外露冻土","压弯矮灌木"],"reference_id":"BG-02-01","status":"pending"},
  {"id":"BG-02-04","stage":"2-4","region":"snowfield","name":"断索冰桥","filename":"bg_stage_02_04_broken_rope_ice_bridge_v01.png","landmarks":["旧木桥头","断裂粗绳","冰壳木桩"],"reference_id":"BG-02-01","status":"pending"},
  {"id":"BG-02-05","stage":"2-5","region":"pinewood","name":"雪松林口","filename":"bg_stage_02_05_snow_pine_gate_v01.png","landmarks":["粗圆雪松","覆雪树冠","中空旧树桩"],"reference_id":null,"status":"pending"},
  {"id":"BG-02-06","stage":"2-6","region":"pinewood","name":"蓝冰溪谷","filename":"bg_stage_02_06_blue_ice_creek_v01.png","landmarks":["窄冰溪","圆润蓝冰石","低矮冷雾"],"reference_id":"BG-02-05","status":"pending"},
  {"id":"BG-02-07","stage":"2-7","region":"pinewood","name":"倒木迷径","filename":"bg_stage_02_07_fallen_timber_path_v01.png","landmarks":["覆雪倒木","抬高树根","折断枝杈"],"reference_id":"BG-02-05","status":"pending"},
  {"id":"BG-02-08","stage":"2-8","region":"pinewood","name":"寒灯营地","filename":"bg_stage_02_08_cold_lantern_camp_v01.png","landmarks":["空白木牌","熄灭提灯","圆石营地圈"],"reference_id":"BG-02-05","status":"pending"},
  {"id":"BG-02-09","stage":"2-9","region":"aurora_ruins","name":"极光石原","filename":"bg_stage_02_09_aurora_stonefield_v01.png","landmarks":["无符号立石","宽极光带","低矮冻岩"],"reference_id":null,"status":"pending"},
  {"id":"BG-02-10","stage":"2-10","region":"aurora_ruins","name":"冻结石环","filename":"bg_stage_02_10_frozen_stone_ring_v01.png","landmarks":["断裂石环","粗冰壳","空白界石"],"reference_id":"BG-02-09","status":"pending"},
  {"id":"BG-02-11","stage":"2-11","region":"aurora_ruins","name":"冰脊门廊","filename":"bg_stage_02_11_ice_ridge_portico_v01.png","landmarks":["不透明冰脊","门廊剪影","开放中央"],"reference_id":"BG-02-09","status":"pending"},
  {"id":"BG-02-12","stage":"2-12","region":"aurora_ruins","name":"霜心堡垒","filename":"bg_stage_02_12_frostheart_fortress_v01.png","landmarks":["冻石内腔","青紫霜心","旧堡垒肩墙"],"reference_id":"BG-02-09","status":"pending"},
  {"id":"BG-MAP-02","stage":null,"region":"chapter","name":"霜原","filename":"bg_chapter_02_frostland_map_v01.png","landmarks":["左侧冻土前哨","中部雪松幽林","右侧极光遗迹","浅灰蓝蜿蜒路线"],"reference_id":null,"status":"pending"}
]
```

- [ ] **Step 2: Write common and regional prompts**

The prompt document must define:

```text
Use case: stylized-concept
Asset type: full-screen battle background master for the mobile H5 idle RPG “青丘远征”
Input images: Image 1 is the authoritative first-chapter visual-style reference. Use only its rendering language and composition discipline.
Primary request: Create one completely original Frostland landscape in the same thick-outlined casual storybook aesthetic.
Style/medium: large rounded hand-drawn shapes; muted flat color blocks; thick warm near-black rounded outlines only on landmarks and close props; at most one hard-edged shadow per major object.
Composition/framing: landscape composition for mobile battle canvases; low side-view camera; continuous walkable ground; central 58% width clean, continuous, low contrast, and free of large props.
Constraints: no characters, monsters, creatures, UI, text, numbers, logos, frames, watermark, health-bar-like red or white horizontal marks, high-frequency snow texture, realistic ice, transparent glass, photorealism, anime rendering, painterly texture, cinematic lighting, magic circles, particles, light beams, or third-party designs.
```

Add exact palette blocks for `snowfield`, `pinewood`, and `aurora_ruins`, repeating the design specification’s colors and avoid rules.

- [ ] **Step 3: Add all twelve stage prompt blocks**

For regional variants repeat:

```text
Change only the left and right landmark props and their small supporting details.
Keep the regional sky, horizon, ground geometry, camera height, palette, lighting, rendering language, dimensions, and central battle-safe area unchanged.
```

- [ ] **Step 4: Add the chapter-map and three foreground prompts**

The map prompt must prohibit nodes, circles, dotted routes, locks, flags, text, and UI. Each foreground prompt must request only the appropriate bottom-side props on a uniform `#ff00ff` chroma background.

- [ ] **Step 5: Validate and commit**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool docs/art/requirements/frostland-background-generation-manifest-v01.json
```

Expected: exit `0`, thirteen entries.

Commit:

```bash
git add docs/art/requirements/frostland-background-generation-manifest-v01.json docs/art/generated/backgrounds/frostland/prompts/frostland_background_prompts_v01.md
git commit -m "Define Frostland background generation prompts"
```

### Task 2: Generalize the Contact-Sheet Tool

**Files:**
- Modify: `scripts/art/build_background_contact_sheets.py`
- Modify: `scripts/art/test_build_background_contact_sheets.py`

**Interfaces:**
- Consumes: a manifest whose entries use arbitrary region IDs and optional top-level review metadata.
- Produces: region sheets named from manifest metadata and an overview whose title is not hard-coded to Qingqiu.

- [ ] **Step 1: Add a failing test**

Add a test using a manifest object:

```python
{
    "review": {
        "title": "FROSTLAND / 12 STAGES + CHAPTER MAP",
        "regions": [
            {"id": "snowfield", "title": "SNOWFIELD / 2-1 — 2-4", "filename": "snowfield_contact_sheet_v01.jpg"}
        ]
    },
    "entries": [...]
}
```

Assert `build_contact_sheets` produces the configured sheet and that the overview title contains visibly different pixels from the Qingqiu title.

- [ ] **Step 2: Run the focused tests to verify failure**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
```

Expected: the new metadata-driven test fails because the implementation expects a JSON array and hard-codes three first-chapter regions.

- [ ] **Step 3: Implement backward-compatible metadata**

Add:

```python
def parse_manifest(document: object) -> tuple[list[dict[str, object]], dict[str, object]]:
    if isinstance(document, list):
        return document, {
            "title": "QINGQIU FRONTIER / 12 STAGES + CHAPTER MAP",
            "regions": [
                {"id": "meadow", "title": "MEADOW / 1-1 — 1-4", "filename": "meadow_contact_sheet_v01.jpg"},
                {"id": "forest", "title": "FOREST / 1-5 — 1-8", "filename": "forest_contact_sheet_v01.jpg"},
                {"id": "ruins", "title": "RUINS / 1-9 — 1-12", "filename": "ruins_contact_sheet_v01.jpg"}
            ]
        }
    if not isinstance(document, dict) or not isinstance(document.get("entries"), list):
        raise ValueError("manifest must be an entry list or an object with entries")
    return document["entries"], document.get("review", {})
```

Update `build_overview` to accept `title: str`, and build region sheets from `review["regions"]`.

- [ ] **Step 4: Run all focused tests**

Expected: all prior tests plus the new Frostland metadata test pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/art/build_background_contact_sheets.py scripts/art/test_build_background_contact_sheets.py
git commit -m "Generalize background review tooling"
```

### Task 3: Generate Snowfield Backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_01_snowline_road_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_02_frost_river_shallows_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_03_windworn_snow_slope_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_04_broken_rope_ice_bridge_v01.png`

**Interfaces:**
- Consumes: first-chapter background reference plus Task 1 prompts.
- Produces: four readable RGB PNGs sharing one snowfield composition.

- [ ] **Step 1: Generate 2-1 as the regional authority**

Use the common prompt, snowfield palette, and 2-1 landmark block.

- [ ] **Step 2: Inspect the center and color balance**

Reject images with a white-out center, realistic ice, dense snow particles, people, signs with writing, or central landmarks.

- [ ] **Step 3: Generate 2-2 through 2-4 as reference variants**

Use 2-1 as the sole edit reference and repeat all regional invariants.

- [ ] **Step 4: Inspect all four together**

Verify a shared horizon, ground band, camera height, lighting, and snow palette.

- [ ] **Step 5: Mark `BG-02-01` through `BG-02-04` generated**

### Task 4: Generate Pinewood Backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_05_snow_pine_gate_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_06_blue_ice_creek_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_07_fallen_timber_path_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_08_cold_lantern_camp_v01.png`

**Interfaces:**
- Consumes: first-chapter background reference plus Task 1 prompts.
- Produces: four readable RGB PNGs sharing one pinewood composition.

- [ ] **Step 1: Generate 2-5 as the regional authority**

Use the common prompt, pinewood palette, and 2-5 landmark block.

- [ ] **Step 2: Inspect the forest base**

Reject black night shadows, dense needles, a face-like stump, center-blocking trunks, or a blue-white monochrome result.

- [ ] **Step 3: Generate 2-6 through 2-8 as reference variants**

Use 2-5 as the sole edit reference and repeat all regional invariants.

- [ ] **Step 4: Inspect all four together**

Verify the central road remains brighter than the side forest and the 2-8 lantern is extinguished.

- [ ] **Step 5: Mark `BG-02-05` through `BG-02-08` generated**

### Task 5: Generate Aurora-Ruins Backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_09_aurora_stonefield_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_10_frozen_stone_ring_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_11_ice_ridge_portico_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_stage_02_12_frostheart_fortress_v01.png`

**Interfaces:**
- Consumes: first-chapter background reference plus Task 1 prompts.
- Produces: four readable RGB PNGs sharing one aurora-ruins composition.

- [ ] **Step 1: Generate 2-9 as the regional authority**

Use the common prompt, aurora-ruins palette, and 2-9 landmark block.

- [ ] **Step 2: Inspect aurora behavior**

Reject light beams, particles, neon bloom, magic circles, readable runes, transparent glass ice, or a washed-out combat corridor.

- [ ] **Step 3: Generate 2-10 through 2-12 as reference variants**

Use 2-9 as the sole edit reference and repeat all regional invariants.

- [ ] **Step 4: Inspect all four together**

Verify the aurora stays in the upper distance and architecture stays at the sides.

- [ ] **Step 5: Mark `BG-02-09` through `BG-02-12` generated**

### Task 6: Generate the Frostland Chapter Map

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/masters/bg_chapter_02_frostland_map_v01.png`

**Interfaces:**
- Consumes: 2-1, 2-5, and 2-9 as regional style references.
- Produces: one node-free landscape map.

- [ ] **Step 1: Generate the map**

Show snowfield on the left, pinewood in the center, and aurora ruins ending at the frost fortress on the right. Include one broad pale gray-blue winding route with clear landing areas.

- [ ] **Step 2: Inspect and, if necessary, perform one targeted edit**

Reject baked circles, nodes, dotted paths, locks, flags, numbers, labels, characters, or an unreadable route.

- [ ] **Step 3: Mark `BG-MAP-02` generated**

### Task 7: Generate Transparent Regional Foregrounds

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/chroma/fg_snowfield_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/chroma/fg_pinewood_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/chroma/fg_aurora_ruins_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/runtime/fg_snowfield_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/runtime/fg_pinewood_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/runtime/fg_aurora_ruins_occlusion_v01.png`

**Interfaces:**
- Consumes: each regional authority image and its exact foreground prompt.
- Produces: three RGBA overlays at the same dimensions as the masters.

- [ ] **Step 1: Generate one flat-magenta source per region**

Use built-in ImageGen with only bottom-side regional props and a perfectly uniform `#ff00ff` background.

- [ ] **Step 2: Remove chroma key**

Run the installed helper for each file:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input <chroma-source> \
  --out <runtime-output> \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

- [ ] **Step 3: Validate alpha**

Assert RGB masters and RGBA foregrounds are all `1672×941`, top corners are transparent, central visible pixels are at most `0.1%`, and any central pixels occur only in the last 36 rows.

### Task 8: Review, Report, Approve, and Commit

**Files:**
- Create: `docs/art/generated/backgrounds/frostland/review/snowfield_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/frostland/review/pinewood_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/frostland/review/aurora_ruins_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/frostland/review/chapter_background_overview_v01.jpg`
- Create: `docs/art/generated/backgrounds/frostland/review/foreground_occlusion_preview_v01.png`
- Create: `docs/art/generated/backgrounds/frostland/review/validation-report.md`
- Modify: `docs/art/requirements/frostland-background-generation-manifest-v01.json`

**Interfaces:**
- Consumes: all final masters and foregrounds.
- Produces: human-readable review assets and machine-verified approval status.

- [ ] **Step 1: Build review sheets**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/art/build_background_contact_sheets.py \
  --manifest docs/art/requirements/frostland-background-generation-manifest-v01.json \
  --master-dir docs/art/generated/backgrounds/frostland/masters \
  --review-dir docs/art/generated/backgrounds/frostland/review
```

- [ ] **Step 2: Build and inspect the checkerboard foreground preview**

Show all three overlays on a checkerboard at matching scale and confirm the middle corridor is visually open.

- [ ] **Step 3: Write the validation report**

Record counts, dimensions, modes, alpha metrics, rejected variants, retries, style consistency, and map node checks.

- [ ] **Step 4: Mark all thirteen manifest entries approved**

- [ ] **Step 5: Run full verification**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
npm run test:run
git diff --check
```

Assert:

- thirteen `1672×941` RGB masters;
- three `1672×941` RGBA foregrounds;
- four review JPEGs;
- thirteen approved manifest entries.

- [ ] **Step 6: Commit only Frostland and shared-tool files**

```bash
git add \
  docs/superpowers/specs/2026-07-31-frostland-map-background-art-design.md \
  docs/superpowers/plans/2026-07-31-frostland-map-background-art-production.md \
  docs/art/requirements/frostland-background-generation-manifest-v01.json \
  docs/art/generated/backgrounds/frostland \
  scripts/art/build_background_contact_sheets.py \
  scripts/art/test_build_background_contact_sheets.py
git commit -m "Produce Frostland chapter background art"
```
