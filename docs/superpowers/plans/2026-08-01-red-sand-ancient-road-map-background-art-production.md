# Red Sand Ancient Road Map Background Art Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify twelve third-chapter Red Sand Ancient Road battle backgrounds, one node-free chapter map, and three transparent regional foreground-occlusion layers.

**Architecture:** Use one manifest as the source of truth for stage IDs, regional groupings, filenames, landmarks, review labels, and approval state. Generate each region from one ImageGen anchor plus three tightly controlled variants, then generate a node-free chapter panorama and three chroma-key foreground layers. Reuse the existing generic contact-sheet builder and validate dimensions, image modes, manifest status, and central transparency programmatically.

**Tech Stack:** Built-in ImageGen, PNG/JPEG, Python 3, Pillow, JSON, existing `scripts/art/build_background_contact_sheets.py`, Git.

## Global Constraints

- Scope is third chapter only: stages `3-1` through `3-12`, one chapter map, and three regional foreground layers.
- Treat the old `赤沙古道` second-chapter preview as the third chapter because the approved second chapter is now `霜原`.
- Do not modify runtime chapter data, `public/assets/backgrounds/*.svg`, save data, combat values, or the old preview UI.
- Match the approved Qingqiu/Frostland casual fantasy style: rounded hand-drawn shapes, thick warm near-black foreground outlines, 6–9 visible colors, and minimal high-frequency texture.
- Keep the central 58% of every battle background low contrast and free from major landmarks.
- Chapter-map art must contain no baked nodes, circles, oval pads, dotted routes, flags, locks, text, numbers, logos, watermarks, or UI.
- Foreground output must be RGBA PNG with transparent top corners and no meaningful pixels in the central 38%–62% except within the bottom 36 px.
- Every project-bound generated asset must be copied into `docs/art/generated/backgrounds/red-sand-ancient-road/`.
- Use only the built-in ImageGen tool for generation and edit passes.

---

### Task 1: Generation manifest and reproducible prompt set

**Files:**
- Create: `docs/art/requirements/red-sand-background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/prompts/red_sand_background_prompts_v01.md`
- Consumes: `docs/superpowers/specs/2026-08-01-red-sand-ancient-road-map-background-art-design.md`
- Produces: thirteen manifest entries and sixteen complete prompts with fixed filenames and reference roles.

- [ ] **Step 1: Create the manifest**

Create three review groups: `red_dunes`, `wind_canyon`, and `sunken_city`. Add `BG-03-01` through `BG-03-12` plus `BG-MAP-03`, including exact stage, region, Chinese name, filename, landmark list, regional anchor `reference_id`, and initial status `pending`.

- [ ] **Step 2: Write the full prompt set**

Write one common style block, twelve individual battle-background prompts, one chapter-map prompt, and three foreground prompts. Every battle prompt must name the central 58% safety rule. The map prompt must include the complete UI/node prohibition. Each foreground prompt must request only bottom-side props on a perfectly uniform `#ff00ff` background.

- [ ] **Step 3: Validate the manifest and prompt inventory**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool docs/art/requirements/red-sand-background-generation-manifest-v01.json >/dev/null
rg -n '^## (BG-03-|BG-MAP-03|FG-)' docs/art/generated/backgrounds/red-sand-ancient-road/prompts/red_sand_background_prompts_v01.md
```

Expected: JSON exits `0`; the prompt search prints exactly sixteen asset headings.

- [ ] **Step 4: Commit the production controls**

```bash
git add docs/art/requirements/red-sand-background-generation-manifest-v01.json docs/art/generated/backgrounds/red-sand-ancient-road/prompts/red_sand_background_prompts_v01.md
git commit -m "Define Red Sand background generation prompts"
```

### Task 2: Red Dunes battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_01_red_sand_road_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_02_salt_crust_shallows_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_03_wind_carved_slope_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_04_broken_wheel_trade_road_v01.png`
- Consumes: Task 1 prompt sections `BG-03-01` through `BG-03-04` and the first two approved chapter background overviews as style references.
- Produces: four RGB PNG masters for region `red_dunes` at one identical resolution.

- [ ] **Step 1: Generate the regional anchor**

Generate `BG-03-01` with the approved Qingqiu and Frostland overview images as style authority. Require an open low-side-view battleground, muted ochre/terracotta palette, side-only landmarks, no subjects, and no UI.

- [ ] **Step 2: Inspect the anchor**

Reject and correct the anchor if the central 58% contains a road sign, rock tower, high-contrast stripe, dense sand texture, character, text, or UI.

- [ ] **Step 3: Generate three regional variants**

Use `BG-03-01` as the direct regional style/composition reference and generate `BG-03-02` through `BG-03-04`, changing only the listed landmarks while preserving camera, horizon, lighting, road baseline, and palette.

- [ ] **Step 4: Validate file properties**

Open the four assets with Pillow and assert the same `(width, height)`, `mode == "RGB"`, and `width / height > 1.7`.

### Task 3: Wind Canyon battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_05_canyon_stone_gate_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_06_echo_dry_valley_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_07_coiled_rock_path_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_08_shade_camp_v01.png`
- Consumes: Task 1 prompt sections `BG-03-05` through `BG-03-08` and Task 2 regional anchor.
- Produces: four RGB PNG masters for region `wind_canyon` at the same master resolution.

- [ ] **Step 1: Generate the regional anchor**

Generate `BG-03-05` with `BG-03-01` as the new chapter style reference. Retain the open center while shifting to rounded terracotta canyon pillars, gray-violet shadow, and sage scrub.

- [ ] **Step 2: Inspect the anchor**

Reject and correct the anchor if a rock arch crosses the central playfield, if the canyon reads as photoreal or threatening, or if the palette becomes saturated red-orange.

- [ ] **Step 3: Generate three regional variants**

Use `BG-03-05` as direct reference for `BG-03-06` through `BG-03-08`. Keep camp equipment and dry-stream landmarks at the outer sides.

- [ ] **Step 4: Validate file properties**

Assert all four outputs are readable RGB PNGs matching the Task 2 master size.

### Task 4: Sunken City battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_09_sunken_outer_city_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_10_copper_gate_market_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_11_giant_pillar_portico_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_stage_03_12_red_sand_court_v01.png`
- Consumes: Task 1 prompt sections `BG-03-09` through `BG-03-12`, Task 3 anchor, and the approved Qingqiu ruins reference.
- Produces: four RGB PNG masters for region `sunken_city` at the same master resolution.

- [ ] **Step 1: Generate the regional anchor**

Generate `BG-03-09` with gray-beige sandstone, deep teal shade, restrained oxidized copper, half-buried architecture, and the existing rounded-outline language.

- [ ] **Step 2: Inspect the anchor**

Reject and correct any writing, glyph, religious motif, skull, magic portal, photoreal ruin texture, or large central obstruction.

- [ ] **Step 3: Generate three regional variants**

Use `BG-03-09` as direct reference for `BG-03-10` through `BG-03-12`, preserving camera and palette while increasing architectural scale toward the final court.

- [ ] **Step 4: Validate file properties**

Assert all four outputs are readable RGB PNGs matching the Task 2 master size.

### Task 5: Node-free chapter panorama

**Files:**
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/masters/bg_chapter_03_red_sand_ancient_road_map_v01.png`
- Consumes: the three regional anchors and Task 1 `BG-MAP-03` prompt.
- Produces: one RGB PNG panorama connecting dunes, canyon, and ancient city.

- [ ] **Step 1: Generate the chapter map**

Use the three regional anchors as content references and the approved Frostland map as layout authority. Show a naturally winding pale-ochre road without built-in node pads or UI.

- [ ] **Step 2: Inspect for baked UI**

Check the full panorama at native scale. If any circles, oval platforms, dotted lines, locks, flags, numbers, labels, or interface frames are present, run one targeted edit that removes only those elements and reconstructs the underlying terrain.

- [ ] **Step 3: Validate the final map**

Assert `mode == "RGB"`, master dimensions match the battle backgrounds, and all three regions are visibly present from left to right.

### Task 6: Transparent regional foreground occlusion

**Files:**
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/chroma/fg_red_dunes_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/chroma/fg_wind_canyon_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/chroma/fg_sunken_city_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/runtime/fg_red_dunes_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/runtime/fg_wind_canyon_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/runtime/fg_sunken_city_occlusion_v01.png`
- Consumes: Task 1 foreground prompts and the corresponding regional anchor.
- Produces: three chroma source images and three RGBA runtime layers.

- [ ] **Step 1: Generate the chroma masters**

Generate each foreground on perfectly flat `#ff00ff`. Props may enter only from the bottom-left and bottom-right edges. Keep x=38%–62% empty above the bottom 36 px and prohibit shadows, scene background, characters, text, UI, and use of magenta inside props.

- [ ] **Step 2: Remove the chroma key**

Run for each file:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py --input INPUT_CHROMA.png --out OUTPUT_RUNTIME.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

- [ ] **Step 3: Validate transparency and revise if needed**

For each runtime layer assert `mode == "RGBA"`, both top-corner alpha values are `0`, and alpha greater than `16` within x=38%–62% is no more than `0.1%` and exists only inside the bottom 36 px. If a layer fails, edit only its chroma source and repeat key removal and validation.

### Task 7: Review artifacts, approval state, and final verification

**Files:**
- Modify: `docs/art/requirements/red-sand-background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/red_dunes_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/wind_canyon_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/sunken_city_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/chapter_background_overview_v01.jpg`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/foreground_occlusion_preview_v01.png`
- Create: `docs/art/generated/backgrounds/red-sand-ancient-road/review/validation-report.md`
- Test: `scripts/art/test_build_background_contact_sheets.py`
- Consumes: Tasks 1–6 outputs and `scripts/art/build_background_contact_sheets.py`.
- Produces: review-ready JPEG/PNG sheets, thirteen approved manifest entries, and a reproducible validation report.

- [ ] **Step 1: Mark generated assets and build review sheets**

After confirming file existence, change the thirteen manifest statuses to `generated`, then run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/art/build_background_contact_sheets.py --manifest docs/art/requirements/red-sand-background-generation-manifest-v01.json --master-dir docs/art/generated/backgrounds/red-sand-ancient-road/masters --review-dir docs/art/generated/backgrounds/red-sand-ancient-road/review
```

Expected: three regional contact sheets and one full chapter overview are created.

- [ ] **Step 2: Build the foreground checkerboard preview**

Composite all three RGBA runtime layers over checkerboard cells, label them `RED DUNES`, `WIND CANYON`, and `SUNKEN CITY`, and save the result as `foreground_occlusion_preview_v01.png`.

- [ ] **Step 3: Perform visual review and finalize status**

Inspect the chapter overview and foreground preview. Confirm region progression, landmark distinction, central playfield safety, map cleanliness, consistent rendering, and side-only occlusion. Change all thirteen manifest statuses from `generated` to `approved` only after this review passes.

- [ ] **Step 4: Write the validation report**

Record the exact asset counts, dimensions, color modes, alpha statistics, review conclusions, test commands, and the explicit runtime integration boundary in `validation-report.md`.

- [ ] **Step 5: Run complete verification**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
npm run test:run
git diff --check
```

Then run a Pillow/JSON assertion script requiring exactly thirteen approved RGB masters, three RGBA runtime overlays, four JPEG review sheets, transparent top corners, and the central-alpha limit. All commands must exit `0`.

- [ ] **Step 6: Commit only this chapter package**

```bash
git add docs/art/requirements/red-sand-background-generation-manifest-v01.json docs/art/generated/backgrounds/red-sand-ancient-road
git commit -m "Produce Red Sand chapter background art"
```
