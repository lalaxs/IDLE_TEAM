# Grassland Monster Concept Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the first review batch of eight original grassland monsters for stages 1-1 through 1-4: four shared enemies and four independent Bosses.

**Architecture:** Generate each character as a separate built-in ImageGen call using the existing hero master as the authoritative visual reference and the approved moss-crown guardian as a supporting monster reference. Save every chroma-key source in the workspace, remove the key locally, validate transparency and subject bounds, then build one type-scaled contact sheet for user review. Do not produce runtime, portrait, animation, or skill-effect assets until the contact sheet is approved.

**Tech Stack:** Built-in ImageGen, bundled Python 3 and Pillow, installed `remove_chroma_key.py`, Markdown prompt records.

## Global Constraints

- Use `docs/art/references/hero-style-master-v1.png` only for proportions, outline weight, face simplicity, flat-color rendering, and detail density.
- Use the approved `docs/art/generated/bosses/concepts/boss_b01_moss_crown_guardian_concept_v01_preview.jpg` only for Boss scale and monster rendering density; do not copy its tree-crown, moss placement, stone shoulder, or silhouette.
- Generate one distinct asset per built-in ImageGen call.
- Use a perfectly flat `#ff00ff` chroma-key background because the batch contains green subjects.
- Preserve the project language: extra-thick warm near-black outline, simple flat color blocks, compact body, two or three major visual anchors, and clear recognition at 96–120 px.
- Do not use text, UI, logos, watermarks, realistic textures, cinematic lighting, complex gradients, dense leaves, Warcraft-specific symbols, copied creatures, or branded silhouettes.
- Persist all eight source images, transparent concepts, prompt records, and the regional contact sheet inside the workspace.
- Do not create final runtime, portrait, list-preview, animation, or skill-effect assets before user approval.

---

### Task 1: Prepare the Grassland Batch Contract

**Files:**
- Create: `docs/art/requirements/grassland-monster-concept-manifest-v01.json`
- Create: `docs/art/generated/monsters/grassland/grassland-generation-prompts-v01.md`
- Create: `docs/art/generated/monsters/grassland/concepts/source/`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/`
- Create: `docs/art/generated/monsters/grassland/review/`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`
- Produces: an eight-entry ordered manifest with `id`, `stage`, `type`, `name`, `slug`, `visual_anchors`, `palette`, `source_file`, and `transparent_file`.

- [x] **Step 1: Create the manifest with the exact roster**

The ordered roster is:

1. `E01` / normal / 嫩枝精 / `tender-branch-sprite`
2. `E02` / normal / 红帽菌兽 / `red-cap-fungus`
3. `E03` / normal / 灰壳甲虫 / `gray-shell-beetle`
4. `E04` / elite / 老桩卫 / `old-stump-guard`
5. `B01` / boss / 刺根兽 / `thorn-root-beast`
6. `B02` / boss / 大伞菌母 / `broad-cap-matriarch`
7. `B03` / boss / 岩背甲虫 / `rock-back-beetle`
8. `B04` / boss / 风铃木卫 / `wind-chime-wood-guard`

Every source filename must follow:

```text
{id_lower}_{slug}_concept_source_v01.png
```

Every transparent filename must follow:

```text
{id_lower}_{slug}_concept_v01.png
```

- [x] **Step 2: Record the shared ImageGen prompt contract**

The prompt record must include both reference-image roles, the common style constraints, the chroma-key contract, and one full subject section for each roster entry. No Chinese or English text may be rendered inside any image.

- [x] **Step 3: Validate the contract before generation**

Run:

```bash
'/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' -c "import json, pathlib; p=pathlib.Path('docs/art/requirements/grassland-monster-concept-manifest-v01.json'); d=json.loads(p.read_text()); assert [x['id'] for x in d['monsters']]==['E01','E02','E03','E04','B01','B02','B03','B04']; assert len({x['source_file'] for x in d['monsters']})==8; assert len({x['transparent_file'] for x in d['monsters']})==8; print('grassland manifest: 8 unique entries')"
```

Expected: `grassland manifest: 8 unique entries`

### Task 2: Generate and Process the Four Shared Enemies

**Files:**
- Create: `docs/art/generated/monsters/grassland/concepts/source/e01_tender-branch-sprite_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/e02_red-cap-fungus_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/e03_gray-shell-beetle_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/e04_old-stump-guard_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/e01_tender-branch-sprite_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/e02_red-cap-fungus_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/e03_gray-shell-beetle_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/e04_old-stump-guard_concept_v01.png`

**Interfaces:**
- Consumes: the shared prompt contract and the E01–E04 subject sections.
- Produces: four opaque chroma-key sources and four RGBA concept images.

- [x] **Step 1: Generate E01 嫩枝精**

Use one built-in ImageGen call. Subject anchors: pear-shaped pale wood body, exactly two broad green leaves on the head, two black oval eyes, round branch hands, two tiny root feet. Keep it friendly-neutral rather than cute, with no mouth and no weapon.

- [x] **Step 2: Generate E02 红帽菌兽**

Use one built-in ImageGen call. Subject anchors: wide muted-red mushroom cap, compact cream-colored fungus body, two black oval eyes, two round hands, two tiny feet. Avoid spots, spores, extra mushrooms, a face on the cap, and a mouth.

- [x] **Step 3: Generate E03 灰壳甲虫**

Use one built-in ImageGen call. Subject anchors: round gray stone-like shell, warm brown underside, one short front horn, four simplified visible legs, two amber oval eyes. Avoid realistic insect anatomy, spikes, metallic armor, and extra leg detail.

- [x] **Step 4: Generate E04 老桩卫**

Use one built-in ImageGen call. Subject anchors: flat-cut stump head with two growth rings, thick branch arms, compact trunk body, two root feet, two amber oval eyes, one small leaf shoot. It is an elite, so its silhouette is approximately 25% broader than the normal enemies; it has no shield or weapon.

- [x] **Step 5: Copy every generated source into the exact manifest path**

Leave the built-in ImageGen originals in place and copy each selected output to its declared workspace filename.

- [x] **Step 6: Remove the chroma key from E01–E04**

For each source, run the installed helper with:

```bash
'/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3' \
  '/Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py' \
  --input 'docs/art/generated/monsters/grassland/concepts/source/e01_tender-branch-sprite_concept_source_v01.png' \
  --out 'docs/art/generated/monsters/grassland/concepts/transparent/e01_tender-branch-sprite_concept_v01.png' \
  --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Run the command again for E02, E03, and E04 using each exact source and transparent filename listed in the task file contract.

- [x] **Step 7: Validate E01–E04**

Each transparent PNG must:

- include an alpha channel;
- have four fully transparent corners;
- have a non-empty alpha bounding box;
- keep at least 6% clear margin on every canvas edge;
- use 25%–65% of the canvas as visible subject coverage;
- have fewer than 1.5% partially transparent pixels.

If chroma-key fringe is visible, rerun only that asset with `--edge-contract 1`.

### Task 3: Generate and Process the Four Bosses

**Files:**
- Create: `docs/art/generated/monsters/grassland/concepts/source/b01_thorn-root-beast_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/b02_broad-cap-matriarch_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/b03_rock-back-beetle_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/source/b04_wind-chime-wood-guard_concept_source_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b01_thorn-root-beast_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b02_broad-cap-matriarch_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b03_rock-back-beetle_concept_v01.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b04_wind-chime-wood-guard_concept_v01.png`

**Interfaces:**
- Consumes: the shared prompt contract, approved B12 style reference, and B01–B04 subject sections.
- Produces: four opaque chroma-key sources and four RGBA Boss concept images.

- [x] **Step 1: Generate B01 刺根兽**

Use one built-in ImageGen call. Subject anchors: low broad quadruped built from a root bulb, one small sprout crest, two short thorn-fist forelimbs, two amber oval eyes, thick rear root legs. Avoid boar tusks, a visible mouth, long vines, antlers, and armor.

- [x] **Step 2: Generate B02 大伞菌母**

Use one built-in ImageGen call. Subject anchors: one enormous muted ochre-red umbrella cap, thick cream stalk body, two rounded pouch-like fungus arms, three short feet, two black oval eyes. Avoid breasts, humanoid femininity, a crown, cap spots, spores, and extra mushrooms.

- [x] **Step 3: Generate B03 岩背甲虫**

Use one built-in ImageGen call. Subject anchors: wide low beetle, three large gray rock plates on the back, two heavy forelegs, one restrained wedge horn, amber oval eyes. It must remain distinct from E03 through its wider body, layered shell, and heavier front silhouette. Avoid realistic mandibles, many legs, spikes, and metallic armor.

- [x] **Step 4: Generate B04 风铃木卫**

Use one built-in ImageGen call. Subject anchors: awakened old bridge-post body, two long branch arms, two hanging wooden seed pods that suggest wind chimes without metal bells, flat wooden brow, two amber oval eyes, two short post-like feet. Avoid a literal building, ropes across the body, text carvings, glowing runes, weapons, and copied tree-guardian silhouettes.

- [x] **Step 5: Copy every generated source into the exact manifest path**

Leave the built-in ImageGen originals in place and copy each selected output to its declared workspace filename.

- [x] **Step 6: Remove the chroma key from B01–B04**

Use the bundled Python executable:

```text
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
```

Use the installed helper:

```text
/Users/jar/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py
```

For every B01–B04 source and output filename listed in the task file contract, pass:

```text
--auto-key border
--soft-matte
--transparent-threshold 12
--opaque-threshold 220
--despill
```

- [x] **Step 7: Validate B01–B04**

Each transparent Boss PNG must:

- include an alpha channel;
- have four fully transparent corners;
- have a non-empty alpha bounding box;
- keep at least 6% clear margin on every canvas edge;
- use 25%–65% of the canvas as visible subject coverage;
- have fewer than 1.5% partially transparent pixels;
- have a visibly broader silhouette than E01–E03;
- contain exactly one stage-specific environmental motif.

If chroma-key fringe is visible, rerun only that asset with `--edge-contract 1`.

### Task 4: Build and Review the Grassland Contact Sheet

**Files:**
- Create: `docs/art/generated/monsters/grassland/review/grassland-monsters-contact-sheet-v01.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-validation-v01.json`

**Interfaces:**
- Consumes: all eight transparent concept PNGs and manifest metadata.
- Produces: one labeled regional review image and one machine-readable validation report.

- [x] **Step 1: Build a 4 × 2 contact sheet**

Use a warm off-white background, rounded cream cells, and near-black labels. Place E01–E04 in the first row and B01–B04 in the second row. Render normals at 62% of cell height, the elite at 72%, and Bosses at 88% so the review sheet preserves the intended hierarchy.

- [x] **Step 2: Inspect the contact sheet at full size**

Confirm:

- the eight outer silhouettes are distinct;
- E03 and B03 do not look like size variants of one design;
- E01, E04, B01, and B04 do not collapse into the same tree-creature silhouette;
- the palette reads as one grassland family without making all characters the same green-brown mix;
- Bosses remain no more detailed than the approved B12 reference.

- [x] **Step 3: Inspect a 120 px thumbnail of every character**

Every asset must retain its two primary recognition anchors at 120 px. Record `pass` or the exact failed anchor in `grassland-validation-v01.json`.

- [x] **Step 4: Run the final batch validator**

The validator must confirm eight manifest entries, eight source PNGs, eight transparent PNGs, one contact sheet, one validation report, unique filenames, transparent corners, non-empty alpha bounds, and no asset touching a canvas edge.

- [x] **Step 5: Present the review checkpoint**

The v01 sheet was presented. The user rejected B04「风铃木卫」and requested a simpler creature replacement; Task 5 records the resulting revision.

### Task 5: Replace the Rejected B04 with 风耳兽

**Files:**
- Create: `docs/art/generated/monsters/grassland/b04-wind-ear-beast-generation-prompt-v02.md`
- Create: `docs/art/generated/monsters/grassland/concepts/source/b04_wind-ear-beast_concept_source_v02.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b04_wind-ear-beast_concept_v02.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-monsters-contact-sheet-v02.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-monsters-120px-check-v02.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-validation-v02.json`
- Move: rejected B04 v01 source and transparent concept into `docs/art/generated/monsters/grassland/review/rejected/`

**Interfaces:**
- Consumes: the user-approved B04「风耳兽」revision in `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`.
- Produces: a simpler non-woodland B04 and revised grassland review sheets.

- [x] **Step 1: Update the manifest and record the v02 prompt**

- [x] **Step 2: Generate B04 风耳兽 with a round body and two backward fan ears**

- [x] **Step 3: Correct the generated perspective so four short legs are visible**

- [x] **Step 4: Preserve the rejected wooden B04 under `review/rejected/`**

- [x] **Step 5: Remove the chroma key and normalize the new B04**

- [x] **Step 6: Rebuild the full-size and 120 px grassland sheets as v02**

- [x] **Step 7: Validate all eight current concepts and record the v02 manual review**

### Task 6: Replace 风耳兽 with 风帆蜥

**Files:**
- Create: `docs/art/generated/monsters/grassland/b04-wind-sail-lizard-generation-prompt-v04.md`
- Create: `docs/art/generated/monsters/grassland/concepts/source/b04_wind-sail-lizard_concept_source_v04.png`
- Create: `docs/art/generated/monsters/grassland/concepts/transparent/b04_wind-sail-lizard_concept_v04.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-monsters-contact-sheet-v04.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-monsters-120px-check-v04.png`
- Create: `docs/art/generated/monsters/grassland/review/grassland-validation-v04.json`
- Move: rejected 风耳兽 v03 source and transparent concept into `docs/art/generated/monsters/grassland/review/rejected/`

**Interfaces:**
- Consumes: user feedback that the wind-ear beast image remains structurally unsuitable.
- Produces: a new sail-backed lizard species with Boss-level detail and revised review sheets.

- [x] **Step 1: Replace the B04 roster entry with 风帆蜥**

- [x] **Step 2: Generate a new four-legged lizard with two dorsal sails**

- [x] **Step 3: Preserve the rejected 风耳兽 v03 under `review/rejected/`**

- [x] **Step 4: Remove the chroma key and normalize 风帆蜥**

- [x] **Step 5: Rebuild the full-size and 120 px grassland sheets as v04**

- [x] **Step 6: Validate all eight current concepts and record the v04 manual review**
