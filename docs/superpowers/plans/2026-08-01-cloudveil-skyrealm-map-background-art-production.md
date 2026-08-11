# Cloudveil Skyrealm Map Background Art Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify twelve fourth-chapter Cloudveil Skyrealm battle backgrounds, one node-free chapter map, and three transparent regional foreground-occlusion layers.

**Architecture:** Use a JSON manifest as the source of truth for stage IDs, regions, filenames, landmarks, review labels, and approval status. Generate one anchor per region with built-in ImageGen, derive three tightly controlled variants from each anchor, then generate a clean chapter panorama and three chroma-key foreground layers. Reuse the generic contact-sheet builder and enforce image dimensions, modes, manifest state, and foreground Alpha limits programmatically.

**Tech Stack:** Built-in ImageGen, PNG/JPEG, Python 3, Pillow, JSON, `scripts/art/build_background_contact_sheets.py`, Git.

## Global Constraints

- Scope is fourth chapter only: stages `4-1` through `4-12`, one chapter map, and three regional foreground layers.
- Do not modify runtime chapter data, `public/assets/backgrounds/*.svg`, save data, equipment, or combat values.
- Match the approved Qingqiu, Frostland, and Red Sand casual fantasy style: rounded hand-drawn shapes, thick warm near-black foreground outlines, 6–9 visible colors, and minimal high-frequency texture.
- Keep the central 58% of every battle background low contrast, continuous, and free from major landmarks.
- Cloud sea stays in the distance or outer sides; the battle ground remains a continuous solid plateau, stone road, or courtyard.
- Chapter-map art contains no baked nodes, circles, oval pads, dotted routes, flags, locks, text, numbers, logos, watermarks, or UI.
- Foreground output is RGBA PNG with transparent top corners and no meaningful pixels in the central 38%–62% except within the bottom 36 px.
- Every project-bound final is copied into `docs/art/generated/backgrounds/cloudveil-skyrealm/`.
- Generation and edit passes use only the built-in ImageGen tool; transparent layers use flat `#ff00ff` chroma plus local removal.

---

### Task 1: Manifest and reproducible prompts

**Files:**
- Create: `docs/art/requirements/cloudveil-background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/prompts/cloudveil_background_prompts_v01.md`
- Consumes: `docs/superpowers/specs/2026-08-01-cloudveil-skyrealm-map-background-art-design.md`
- Produces: thirteen manifest entries and sixteen complete asset prompts.

- [ ] **Step 1: Create the manifest**

Define review groups `cloud_highlands`, `floating_valley`, and `sky_city`. Add entries `BG-04-01` through `BG-04-12` and `BG-MAP-04` with exact stage, region, Chinese name, filename, landmark list, regional anchor `reference_id`, and status `pending`.

- [ ] **Step 2: Write the prompt set**

Write one shared style block, three regional palettes, twelve battle prompts, one map prompt, and three foreground prompts. Every battle prompt states the central 58% safety rule. The map prompt includes the complete node/UI prohibition. Foreground prompts request only bottom-side props on uniform `#ff00ff`.

- [ ] **Step 3: Validate and commit controls**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m json.tool docs/art/requirements/cloudveil-background-generation-manifest-v01.json >/dev/null
rg -c '^## (BG-04-|BG-MAP-04|FG-)' docs/art/generated/backgrounds/cloudveil-skyrealm/prompts/cloudveil_background_prompts_v01.md
```

Expected: JSON exits `0` and prompt count is `16`. Commit both files with message `Define Cloudveil background generation prompts`.

### Task 2: Cloud Highlands battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_01_cloudveil_road_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_02_bellflower_slope_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_03_white_rock_terraces_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_04_broken_rope_cloud_bridge_v01.png`
- Consumes: Task 1 prompts plus approved chapter background references.
- Produces: four RGB PNG masters for region `cloud_highlands` at one identical resolution.

- [ ] **Step 1: Generate and inspect the anchor**

Generate `BG-04-01` with the approved Qingqiu and Red Sand anchors as style/composition authority. Require a solid celadon highland road, warm-white rocks, distant cloud sea, and a central prop-free corridor. Reject blue-white snowfield resemblance, floating battle ground, characters, text, or UI.

- [ ] **Step 2: Generate three variants**

Use `BG-04-01` as direct regional reference for `BG-04-02` through `BG-04-04`. Change only outer-side landmarks while preserving camera, horizon, solid ground geometry, palette, lighting, and the central safe area.

- [ ] **Step 3: Validate file properties**

Use Pillow to assert four readable RGB PNG files with identical dimensions and aspect ratio greater than `1.7`.

### Task 3: Floating Valley battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_05_floating_stone_gate_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_06_returning_wind_path_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_07_hanging_root_boardwalk_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_08_cloud_sail_camp_v01.png`
- Consumes: Task 1 prompts and Task 2 anchor.
- Produces: four RGB PNG masters for region `floating_valley` at the same resolution.

- [ ] **Step 1: Generate and inspect the anchor**

Generate `BG-04-05` with rounded gray-violet side pillars, three large distant floating stones held high above the playfield, muted sage plants, and one continuous solid stone road. Reject particle debris, magic glow, rock bridge across the center, or an actual gap beneath the battle ground.

- [ ] **Step 2: Generate three variants**

Use `BG-04-05` as direct reference for `BG-04-06` through `BG-04-08`. Keep roots, boardwalk ends, cloud-sail fabric, jars, and extinguished wind lamp at the outer sides.

- [ ] **Step 3: Validate file properties**

Assert the four outputs are readable RGB PNGs matching the Task 2 master size.

### Task 4: Sky City battle backgrounds

**Files:**
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_09_cloud_gate_outer_court_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_10_bronze_wind_gallery_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_11_high_tower_portico_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_stage_04_12_cloudcrown_city_v01.png`
- Consumes: Task 1 prompts, Task 3 anchor, and approved rounded-ruin references.
- Produces: four RGB PNG masters for region `sky_city` at the same resolution.

- [ ] **Step 1: Generate and inspect the anchor**

Generate `BG-04-09` with warm-white limestone, cool gray-violet shadow, muted verdigris details, and blank rounded architecture. Reject religious imagery, angelic motifs, star charts, glyphs, magic, portals, and bright white temple rendering.

- [ ] **Step 2: Generate three variants**

Use `BG-04-09` as direct reference for `BG-04-10` through `BG-04-12`, preserving the camera and open ground while increasing architectural scale toward the distant Cloudcrown City.

- [ ] **Step 3: Validate file properties**

Assert the four outputs are readable RGB PNGs matching the Task 2 master size.

### Task 5: Node-free chapter panorama

**Files:**
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/masters/bg_chapter_04_cloudveil_skyrealm_map_v01.png`
- Consumes: three regional anchors, approved map reference, and `BG-MAP-04` prompt.
- Produces: one RGB panorama connecting highlands, floating valley, and sky city.

- [ ] **Step 1: Generate the chapter map**

Use the three anchors as regional references and the approved Red Sand map only for route readability. Show one natural warm-gray stone road across solid terrain, with cloud sea beyond the cliffs.

- [ ] **Step 2: Inspect and correct baked UI**

At native scale reject circles, oval platforms, repeated landing pads, stepping-stone markers, dotted routes, locks, flags, numbers, labels, or interface frames. If present, run one targeted removal edit and reconstruct terrain beneath.

- [ ] **Step 3: Validate the map**

Assert RGB mode, master dimensions, and visible left-to-right presence of all three regions.

### Task 6: Transparent foreground occlusion

**Files:**
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/chroma/fg_cloud_highlands_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/chroma/fg_floating_valley_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/chroma/fg_sky_city_occlusion_chroma_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/runtime/fg_cloud_highlands_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/runtime/fg_floating_valley_occlusion_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/runtime/fg_sky_city_occlusion_v01.png`
- Consumes: Task 1 foreground prompts and corresponding anchors.
- Produces: three chroma sources and three RGBA runtime overlays.

- [ ] **Step 1: Generate chroma sources**

Generate each overlay on perfectly flat `#ff00ff`. Props enter only from bottom-left and bottom-right. Keep x=38%–62% empty at every height and the top 58% empty. Prohibit shadows, background scenery, characters, text, UI, and magenta inside props.

- [ ] **Step 2: Remove the chroma key**

For each source run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py --input INPUT.png --out OUTPUT.png --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

- [ ] **Step 3: Validate Alpha**

Assert `RGBA`, transparent top corners, central alpha-above-16 coverage no more than `0.1%`, and any central pixels restricted to the bottom 36 px. Regenerate only a failing source.

### Task 7: Review artifacts and final verification

**Files:**
- Modify: `docs/art/requirements/cloudveil-background-generation-manifest-v01.json`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/cloud_highlands_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/floating_valley_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/sky_city_contact_sheet_v01.jpg`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/chapter_background_overview_v01.jpg`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/foreground_occlusion_preview_v01.png`
- Create: `docs/art/generated/backgrounds/cloudveil-skyrealm/review/validation-report.md`
- Test: `scripts/art/test_build_background_contact_sheets.py`
- Consumes: Tasks 1–6 and `scripts/art/build_background_contact_sheets.py`.
- Produces: review sheets, thirteen approved manifest entries, and reproducible validation evidence.

- [ ] **Step 1: Build review sheets**

Set thirteen statuses to `generated`, then run the generic contact-sheet builder with the Cloudveil manifest, master directory, and review directory. Expected output is three regional sheets plus one chapter overview.

- [ ] **Step 2: Build the foreground preview**

Composite all three RGBA layers over checkerboard cells labeled `CLOUD HIGHLANDS`, `FLOATING VALLEY`, and `SKY CITY` into `foreground_occlusion_preview_v01.png`.

- [ ] **Step 3: Perform visual review**

Confirm region progression, stage landmark distinction, continuous ground, central safety, node-free map, consistent rendering, and side-only occlusion. Only then change all statuses to `approved`.

- [ ] **Step 4: Write validation report**

Record asset counts, dimensions, modes, Alpha statistics, visual conclusions, verification commands, and the runtime integration boundary.

- [ ] **Step 5: Run complete verification**

Run:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts.art.test_build_background_contact_sheets -v
npm run test:run
git diff --check
```

Run Pillow/JSON assertions for exactly thirteen approved RGB masters, three RGBA overlays, four JPEG review sheets, transparent corners, central Alpha limit, and sixteen prompt headings. All commands must exit `0`.

- [ ] **Step 6: Commit this chapter package**

Stage only the Cloudveil manifest and `docs/art/generated/backgrounds/cloudveil-skyrealm/`, then commit with message `Produce Cloudveil chapter background art`.
