# Direct-Generated Class Hero Art Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and self-review 80 independent, complete hero images covering 40 modern fantasy RPG specializations in male and female variants, then deliver all approved assets together.

**Architecture:** Every hero is generated from scratch in a separate built-in image generation call using the single authority reference and a fully expanded per-hero prompt. Generated chroma-key masters are converted into transparent project assets, validated mechanically, reviewed visually in class contact sheets, and regenerated whole when they fail.

**Tech Stack:** Built-in ImageGen, local chroma-key removal helper, bundled Python/Pillow, PNG, WebP, Markdown review records.

## Global Constraints

- Authority reference: `docs/art/references/hero-style-master-v1.png`.
- Exactly 40 specializations × 2 genders = 80 independent complete images.
- One built-in ImageGen call per distinct hero asset; no CLI fallback.
- No body templates, equipment overlays, modular pieces, compositing, or sprite sheets.
- One complete right-facing three-quarter character per image.
- Final master format is 1024 × 1024 transparent PNG.
- Delivery occurs only after all 80 assets pass mechanical and visual review.
- No third-party named character, exact armor set, artifact weapon, faction mark, logo, text, or watermark.

---

### Task 1: Lock the Production Manifest and Output Contract

**Files:**
- Create: `docs/art/requirements/direct-generated-hero-manifest.json`
- Create: `docs/art/requirements/direct-generated-hero-prompts.md`
- Create: `scripts/art/validate_hero_assets.py`
- Create: `scripts/art/test_validate_hero_assets.py`

**Interfaces:**
- Consumes: the 40-row table and prompt schema in `docs/superpowers/specs/2026-07-31-direct-generated-class-hero-art-design.md`.
- Produces: an ordered JSON array named `heroes` with 80 entries and the validator command `python scripts/art/validate_hero_assets.py`.

- [ ] **Step 1: Write the manifest validation tests**

Tests must assert exactly 80 unique IDs, exactly two genders for every specialization ID, 54 `kingdom-human` entries, 26 special-race entries, unique output filenames, and non-empty weapon, silhouette, palette, and prompt fields.

- [ ] **Step 2: Run the tests and verify they fail before files exist**

Run:

```bash
python -m unittest scripts/art/test_validate_hero_assets.py -v
```

Expected: failure because the manifest and validator do not yet exist.

- [ ] **Step 3: Create the 80-entry manifest and expanded prompt record**

Use IDs `<specialization-id>-m` and `<specialization-id>-f`. Each prompt repeats the full authority-reference role, composition, style, subject variables, chroma background, constraints, and avoid list; prompts must not depend on previous images.

- [ ] **Step 4: Implement the asset validator**

The validator must check manifest counts, expected filenames, 1024 × 1024 RGBA masters, transparent corners, non-empty Alpha bounds, subject edge clearance, 512 × 512 WebP runtime images, 256 × 256 portrait images, and the presence of review status for all 80 entries.

- [ ] **Step 5: Run the manifest tests**

Run:

```bash
python -m unittest scripts/art/test_validate_hero_assets.py -v
```

Expected: all tests pass.

### Task 2: Prepare Workspace-Bound Asset Directories

**Files:**
- Create: `docs/art/generated/heroes/chroma/.gitkeep`
- Create: `docs/art/generated/heroes/master/.gitkeep`
- Create: `docs/art/generated/heroes/runtime/.gitkeep`
- Create: `docs/art/generated/heroes/portraits/.gitkeep`
- Create: `docs/art/generated/heroes/previews/.gitkeep`
- Create: `docs/art/generated/heroes/review/.gitkeep`

**Interfaces:**
- Consumes: filenames from `direct-generated-hero-manifest.json`.
- Produces: stable workspace locations for every generated and derived artifact.

- [ ] **Step 1: Create all output directories**

Use exactly the directory names defined in the design specification.

- [ ] **Step 2: Verify directory contract**

Run:

```bash
find docs/art/generated/heroes -maxdepth 1 -type d | sort
```

Expected: `chroma`, `master`, `runtime`, `portraits`, `previews`, and `review`.

### Task 3: Generate and Internally Calibrate Six Anchor Heroes

**Files:**
- Create: six chroma source PNGs in `docs/art/generated/heroes/chroma/`
- Create: six transparent PNGs in `docs/art/generated/heroes/master/`
- Modify: `docs/art/generated/heroes/review/review-status.json`

**Interfaces:**
- Consumes: the six manifest entries `wa-pro-m`, `ma-fir-f`, `hu-mar-m`, `dh-dev-f`, `ev-pre-m`, and `dr-gua-f`.
- Produces: six internally approved style anchors; these are review references only, never body or equipment templates.

- [ ] **Step 1: Generate each complete anchor separately**

Issue one built-in ImageGen call per asset with the authority image as the only image reference and the fully expanded prompt from the manifest.

- [ ] **Step 2: Copy each generated source into the workspace**

Save each selected source as `docs/art/generated/heroes/chroma/hero_<id>_chroma_v01.png`.

- [ ] **Step 3: Remove the chroma-key background**

Run the installed helper with border auto-key, soft matte, transparent threshold 12, opaque threshold 220, and despill. Retry once with edge contraction 1 if a visible fringe remains.

- [ ] **Step 4: Inspect all six anchors**

Check single-character count, right-facing three-quarter pose, 1.45–1.65-head proportion, round face, two oval eyes, absent mouth, circle hands, short legs, thick lines, restrained weapon, palette, and 96 px readability.

- [ ] **Step 5: Regenerate any failing anchor as a complete image**

Change only the failed constraint in the prompt; do not edit or composite body parts.

- [ ] **Step 6: Record internal approval**

Write each anchor’s `approved`, `source_prompt_id`, `generation_version`, and review checklist result to `review-status.json`.

### Task 4: Generate the Remaining Death Knight, Demon Hunter, Druid, and Evoker Heroes

**Files:**
- Create: 22 remaining class-family chroma PNGs and transparent master PNGs.
- Modify: `docs/art/generated/heroes/review/review-status.json`.

**Interfaces:**
- Consumes: the corresponding manifest entries; uses anchors only for visual comparison.
- Produces: all 28 master assets for DK, DH, DR, and EV, including the six anchors where applicable.

- [ ] **Step 1: Generate every missing hero in a separate built-in call**

Pass the authority reference for every call and repeat the full per-hero prompt.

- [ ] **Step 2: Persist and remove chroma for every selected output**

Use the exact manifest filenames and the installed removal helper.

- [ ] **Step 3: Create four class contact sheets**

Arrange male and female variants by specialization without altering individual masters.

- [ ] **Step 4: Review and regenerate failures**

Reject multi-character, front-facing, long-legged, thin-line, extra-feature, oversized-weapon, copied-design, cropped, and poor-96-px-readability outputs.

- [ ] **Step 5: Record review status**

Every asset in these four classes must have an explicit pass result before proceeding.

### Task 5: Generate Hunter, Mage, Monk, and Paladin Heroes

**Files:**
- Create: 24 chroma PNGs and transparent master PNGs.
- Modify: `docs/art/generated/heroes/review/review-status.json`.

**Interfaces:**
- Consumes: HU, MA, MO, and PA manifest entries.
- Produces: 24 approved master assets and four class contact sheets.

- [ ] **Step 1: Generate each of the 24 complete characters independently**

Do not generate gender pairs on one canvas.

- [ ] **Step 2: Persist, de-key, and inspect**

Use the same save, background-removal, edge, and Alpha validation workflow as the anchors.

- [ ] **Step 3: Build contact sheets and review at full and 96 px scale**

Check that each specialization is recognizable through weapon, palette, silhouette, and one restrained magic symbol.

- [ ] **Step 4: Regenerate every failed image whole**

Do not patch from another gender or specialization.

- [ ] **Step 5: Record review status**

All 24 entries must be approved.

### Task 6: Generate Priest, Rogue, Shaman, Warlock, and Warrior Heroes

**Files:**
- Create: 28 remaining chroma PNGs and transparent master PNGs.
- Modify: `docs/art/generated/heroes/review/review-status.json`.

**Interfaces:**
- Consumes: PR, RO, SH, WL, and WA manifest entries.
- Produces: the final 28 approved master assets and five class contact sheets.

- [ ] **Step 1: Generate each complete character independently**

Every prompt must include the authority reference role and all negative constraints.

- [ ] **Step 2: Persist, de-key, and inspect**

Reject any missing weapon edge, extra object resembling a second character, copied insignia, or silhouette drift.

- [ ] **Step 3: Build contact sheets and compare consistency**

Compare line weight, head ratio, feet baseline, hand circles, eye shape, flat color count, and weapon scale across all classes.

- [ ] **Step 4: Regenerate every failed image whole**

Record the targeted prompt correction and new generation version.

- [ ] **Step 5: Record review status**

The review file must now contain 80 approved entries.

### Task 7: Export Runtime, Portrait, and Readability Assets

**Files:**
- Create: 80 files in `docs/art/generated/heroes/runtime/`
- Create: 80 files in `docs/art/generated/heroes/portraits/`
- Create: 80 files in `docs/art/generated/heroes/previews/`

**Interfaces:**
- Consumes: the 80 approved transparent master PNGs.
- Produces: 512 WebP runtime assets, 256 WebP portraits, and 96 px previews.

- [ ] **Step 1: Export runtime WebP files**

Fit the full character into a 512 × 512 transparent canvas without changing aspect ratio or cropping.

- [ ] **Step 2: Export portrait WebP files**

Create 256 × 256 head-and-upper-torso crops using Alpha bounds while keeping all hair, ears, and horns inside the frame.

- [ ] **Step 3: Export 96 px readability previews**

Fit the complete character into a 96 × 96 transparent canvas.

- [ ] **Step 4: Decode-check all derived files**

Open every output with Pillow and assert format, size, Alpha support, and non-empty subject bounds.

### Task 8: Build Final Contact Sheets and Review Report

**Files:**
- Create: 13 class contact sheets in `docs/art/generated/heroes/review/`
- Create: `docs/art/generated/heroes/review/all-heroes-contact-sheet.png`
- Create: `docs/art/generated/heroes/review/final-review-report.md`

**Interfaces:**
- Consumes: all masters, previews, and `review-status.json`.
- Produces: compact visual audit surfaces and the final acceptance record.

- [ ] **Step 1: Build the 13 class sheets**

Keep each male/female pair adjacent and label outside the character image area in the sheet only.

- [ ] **Step 2: Build the 80-character overview**

Use 96 px previews so line weight, palette separation, and silhouette consistency can be compared at game scale.

- [ ] **Step 3: Review every class sheet and the overview**

Confirm that the set looks like one coherent game while every specialization remains distinguishable.

- [ ] **Step 4: Regenerate and re-export any late outlier**

If a replacement is required, rerun background removal and every derived export, then rebuild affected contact sheets.

- [ ] **Step 5: Write the final review report**

Include file counts, validation command output, regenerated IDs and reasons, unresolved issues (must be `none` for delivery), and a statement that no modular assembly or compositing was used.

### Task 9: Run Final Validation and Deliver Together

**Files:**
- Modify: `docs/art/generated/heroes/review/final-review-report.md`

**Interfaces:**
- Consumes: all 80 approved master and derived assets.
- Produces: one complete project-local delivery.

- [ ] **Step 1: Run the automated validator**

Run:

```bash
python scripts/art/validate_hero_assets.py
```

Expected: 80/80 masters valid, 80/80 runtime files valid, 80/80 portraits valid, 80/80 previews valid, 80/80 review entries approved.

- [ ] **Step 2: Verify exact file counts**

Run:

```bash
find docs/art/generated/heroes/master -name '*.png' | wc -l
find docs/art/generated/heroes/runtime -name '*.webp' | wc -l
find docs/art/generated/heroes/portraits -name '*.webp' | wc -l
find docs/art/generated/heroes/previews -name '*.png' | wc -l
```

Expected: `80` for every category.

- [ ] **Step 3: Verify no placeholders**

Search the manifest, prompts, status, and report for `TBD`, `TODO`, missing review decisions, or incomplete filenames. Expected: no matches.

- [ ] **Step 4: Append final evidence**

Add the successful validation summary and exact asset paths to `final-review-report.md`.

- [ ] **Step 5: Deliver all assets**

Provide links to the master directory, runtime directory, portrait directory, total overview, design specification, prompt record, and final review report in one final response.
