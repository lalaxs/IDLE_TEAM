# Modular Character Art Production Implementation Plan

> **Status: superseded.** Do not execute this plan. The project no longer uses
> the 92-asset modular character-art pipeline. Follow
> `docs/superpowers/specs/2026-07-31-core-game-framework-design.md` instead.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and verify 52 race-and-gender base character boards plus 40 specialization equipment boards in the approved flat, thick-outline character style.

**Architecture:** Treat the approved master lineup as the sole style anchor. Generate one raster asset per manifest entry, persist every accepted version in the workspace, and validate each batch visually before advancing. Race boards and specialization boards remain separate concept modules; they are not assumed to be pixel-perfect runtime layers.

**Tech Stack:** Built-in ImageGen, local PNG chroma-key removal helper, ImageMagick inspection tools when available, Markdown manifest and contact sheets.

## Global Constraints

- Produce exactly 92 accepted assets: 52 race-and-gender base boards and 40 specialization equipment boards.
- Use `/Users/jar/Documents/idle/docs/art/references/hero-style-master-v1.png` as the style reference for every generation.
- Character height is 1.6–1.9 heads; head occupies 48%–55% of total height.
- Faces contain exactly two black oval eyes and no mouth, nose, eyebrows, or realistic eye whites.
- Hands are circles or rounded ovals; legs and feet are extremely short.
- Outer outline thickness is 7%–9% of head width; internal lines are 60%–70% of the outer outline.
- Use 4–6 dominant flat colors per asset; avoid realistic textures, complex gradients, backgrounds, shadows, text, logos, and watermarks.
- Do not reproduce Blizzard armor sets, emblems, weapons, named characters, or UI marks.
- Do not label characters as front-row or back-row; use only attack range and combat role metadata.
- Keep every accepted workspace asset versioned; never overwrite an accepted image.

---

### Task 1: Freeze the production source of truth

**Files:**
- Verify: `docs/superpowers/specs/2026-07-31-modular-character-art-system-design.md`
- Verify: `docs/art/requirements/modular-character-art-manifest.md`
- Create directories: `docs/art/generated/pilots`, `docs/art/generated/race-bases`, `docs/art/generated/specialization-kits`, `docs/art/generated/contact-sheets`

**Interfaces:**
- Consumes: approved design decision B and the master style reference.
- Produces: the canonical 92-entry manifest and fixed output directory layout.

- [x] **Step 1: Count manifest entries**

Run:

```bash
rg -c '^\| R[0-9]{2}-[MF] ' docs/art/requirements/modular-character-art-manifest.md
rg -c '^\| S[0-9]{2} ' docs/art/requirements/modular-character-art-manifest.md
```

Expected: `52` race entries and `40` specialization entries.

- [x] **Step 2: Check that every ID is unique**

Run:

```bash
sed -n 's/^| \\(R[0-9][0-9]-[MF]\\|S[0-9][0-9]\\) |.*/\\1/p' docs/art/requirements/modular-character-art-manifest.md | sort | uniq -d
```

Expected: no output.

- [x] **Step 3: Create the output directories**

Run:

```bash
mkdir -p docs/art/generated/pilots docs/art/generated/race-bases docs/art/generated/specialization-kits docs/art/generated/contact-sheets
```

- [x] **Step 4: Verify the style reference exists**

Run:

```bash
file docs/art/references/hero-style-master-v1.png
```

Expected: a readable PNG image.

### Task 2: Generate and review the four pilot boards

**Files:**
- Create: `docs/art/generated/pilots/R01-M-kingdom-human-base-v1.png`
- Create: `docs/art/generated/pilots/R01-F-kingdom-human-base-v1.png`
- Create: `docs/art/generated/pilots/S18-fire-mage-kit-v1.png`
- Create: `docs/art/generated/pilots/S40-protection-warrior-kit-v1.png`
- Modify: `docs/art/requirements/modular-character-art-manifest.md`

**Interfaces:**
- Consumes: master style reference, R01/S18/S40 specification rows, fixed module interface.
- Produces: four approved visual anchors for all later generations.

- [x] **Step 1: Generate R01-M from the master reference**

Use one built-in ImageGen call with the master reference labeled as a style reference. Ask for one original male kingdom-human base board, empty circular hands, neutral underclothes, no equipment, no text, and a perfectly flat chroma-key background.

- [x] **Step 2: Inspect R01-M**

Check full-body completeness, two eyes only, no mouth, circular hands, short legs, thick outline, 4–6 colors, empty hands, generous padding, and flat background. If one invariant fails, regenerate with only that correction added.

- [x] **Step 3: Generate and inspect R01-F**

Use the accepted R01-M prompt structure and request the approved female presentation differences without changing head size, eye style, body anchors, line weight, or palette family.

- [x] **Step 4: Generate and inspect S18**

Generate a fire-mage equipment concept board with a neutral mannequin, detached hood/shoulder/chest/belt pieces, restrained short staff, three circular flame-effect samples, and a 4–6-color palette. The equipment must be original and must not use franchise emblems.

- [x] **Step 5: Generate and inspect S40**

Generate a protection-warrior equipment concept board with a neutral mannequin, blue-gold heavy armor pieces, a restrained short weapon, a round shield whose diameter is 32%–42% of head width, three defensive-effect samples, and a 4–6-color palette.

- [x] **Step 6: Persist accepted source files**

Copy each selected built-in output from the generated-image directory into the exact pilot path. Never overwrite an accepted file; use `-v2` for a revision.

- [x] **Step 7: Remove chroma-key backgrounds**

Run for each pilot source:

```bash
/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input docs/art/generated/pilots/<source-file>.png \
  --out docs/art/generated/pilots/<final-file>.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Expected: PNG with transparent corners and no visible key-color fringe.

- [x] **Step 8: Mark accepted pilots**

Change only R01-M, R01-F, S18, and S40 from `待生成` to `已验收` after visual approval.

### Task 3: Produce the remaining 50 race base boards

**Files:**
- Create: `docs/art/generated/race-bases/R02-M-*.png` through `R26-F-*.png`
- Modify: `docs/art/requirements/modular-character-art-manifest.md`

**Interfaces:**
- Consumes: accepted R01-M and R01-F anchors, race table R02–R26.
- Produces: all 52 accepted base boards including the pilots.

- [ ] **Step 1: Generate humanoid races in paired gender order**

Generate R02, R03, R04, R07, R08, R09, R10, R11, R16, R18, R20, and R21 as male/female pairs. Reuse the accepted R01 layout and modify only the required anatomy, palette, hair, ear, horn, rune, or mechanical traits from the specification.

- [ ] **Step 2: Review each humanoid pair before advancing**

For each pair, compare head size, eye line, hand centers, waist line, and foot line with R01. Reject extra facial features, fingers, long legs, realistic anatomy, class equipment, and franchise symbols.

- [ ] **Step 3: Generate beast and nonhuman races in paired gender order**

Generate R05, R06, R12, R13, R14, R15, R17, R19, R22, R23, R24, R25, and R26. Preserve the no-mouth rule even when using muzzle color blocks, tusk-side plates, beaks, fangs, or snouts.

- [ ] **Step 4: Review each nonhuman pair**

Require a round readable face, exactly two eyes, circular hands or hand caps, short feet, flat colors, and no realistic fur, scales, decay, exposed machinery, or anatomy.

- [ ] **Step 5: Remove backgrounds and validate Alpha**

Use `#00ff00` for assets without green subject colors and `#ff00ff` for green or nature-colored subjects. Run the chroma-key helper and inspect every corner plus the outer black outline.

- [ ] **Step 6: Update the manifest**

Mark an entry `已验收` only after its final transparent PNG exists and passes the visual checklist.

### Task 4: Produce the remaining 38 specialization equipment boards

**Files:**
- Create: `docs/art/generated/specialization-kits/S01-*.png` through `S39-*.png`
- Modify: `docs/art/requirements/modular-character-art-manifest.md`

**Interfaces:**
- Consumes: accepted S18 and S40 anchors plus specialization rows S01–S40.
- Produces: all 40 accepted specialization equipment boards including the pilots.

- [ ] **Step 1: Generate plate-oriented kits**

Generate S01–S06, S23–S25, and S38–S39 using the accepted S40 board layout. Keep each weapon within the exact size limits and separate specialization identity through palette, weapon pairing, and effect samples.

- [ ] **Step 2: Generate leather-oriented kits**

Generate S07–S10, S20–S22, and S29–S31. Add alternate-form silhouettes only for S08 and S09; keep those silhouettes below 22% of the canvas.

- [ ] **Step 3: Generate mail-oriented kits**

Generate S11–S16 and S32–S34. Use original dragon, beast, trap, elemental, and totem motifs without copying recognizable franchise shapes.

- [ ] **Step 4: Generate cloth-oriented kits**

Generate S17, S19, S26–S28, and S35–S37 using the accepted S18 board layout. Keep effect swatches simple enough to remain readable at 128 px.

- [ ] **Step 5: Review every specialization board**

Verify neutral mannequin, detached equipment groups, restrained weapon scale, 3–5 effect samples, 4–6 colors, no race anatomy, no labels, and no copyrighted emblem or set silhouette.

- [ ] **Step 6: Remove backgrounds and update the manifest**

Process accepted files through the chroma-key helper, validate Alpha, and mark only completed entries `已验收`.

### Task 5: Build contact sheets and run final audit

**Files:**
- Create: `docs/art/generated/contact-sheets/race-bases-contact-sheet-v1.png`
- Create: `docs/art/generated/contact-sheets/specialization-kits-contact-sheet-v1.png`
- Modify: `docs/art/requirements/modular-character-art-manifest.md`

**Interfaces:**
- Consumes: all 92 accepted PNGs.
- Produces: two overview sheets and a fully accepted manifest.

- [ ] **Step 1: Verify file counts**

Run:

```bash
find docs/art/generated -type f -name 'R*.png' | wc -l
find docs/art/generated -type f -name 'S*.png' | wc -l
```

Expected: at least `52` accepted R assets and `40` accepted S assets, excluding explicitly versioned rejected drafts.

- [ ] **Step 2: Verify manifest completion**

Run:

```bash
rg -c '已验收' docs/art/requirements/modular-character-art-manifest.md
rg -n '待生成|待复核' docs/art/requirements/modular-character-art-manifest.md
```

Expected: `92` accepted rows and no pending rows.

- [ ] **Step 3: Build two labeled contact sheets**

Place race bases in R01–R26 order with male before female; place specialization kits in S01–S40 order. Add labels outside the artwork cells during contact-sheet assembly, never inside the source PNG.

- [ ] **Step 4: Perform visual drift audit**

Compare every thumbnail against the master reference and pilot anchors. Reject any image with a smaller head, thinner outline, extra facial feature, detailed hand, long legs, oversized weapon, extra background element, or inconsistent rendering style.

- [ ] **Step 5: Confirm production completeness**

Deliver links to the design spec, manifest, pilot images, race contact sheet, and specialization contact sheet, together with the exact built-in prompt families used.
