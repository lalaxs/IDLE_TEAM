# Forest Monster Concept Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the complete 1-5 through 1-8 forest enemy batch: three normal monsters, one elite, and four stage-specific Bosses.

**Architecture:** The approved chapter roster is the design authority. Each enemy is generated as an isolated 1024 × 1024 concept on a flat magenta chroma-key field, normalized into a transparent PNG, then reviewed together at normal and 120 px display sizes. A JSON manifest is the filename and metadata authority for all generation, review, and validation outputs.

**Tech Stack:** Built-in ImageGen, PNG/RGBA assets, Pillow, JSON, Markdown.

## Global Constraints

- Preserve the approved thick warm near-black rounded outline, large friendly shapes, restrained flat-color shading, and three-quarter game-character view.
- Use original creature designs only; do not reproduce third-party characters, species, armor, emblems, weapons, or signature silhouettes.
- Normal monsters use two dominant visual anchors; E08 adds one elite structural layer; Bosses use wider silhouettes and higher detail density than normal monsters.
- Forest materials are deep wood, moss, thorn branches, damp earth, blue-gray creek stone, and blank weathered stele stone.
- No text, UI, frame, watermark, cast shadow, ground plane, environmental scene, small floating particles, cinematic light, or realistic surface noise inside character assets.
- Each source and transparent image is 1024 × 1024 with generous padding and no cropped anatomy.
- Transparent outputs must be RGBA, have four transparent corners, preserve the opaque subject interior, and leave at least 60 px of safety margin.
- The batch must remain distinguishable at 120 px by silhouette and dominant color.

---

### Task 1: Lock the Approved Forest Roster and File Contract

**Files:**
- Create: `docs/art/requirements/forest-monster-concept-manifest-v01.json`
- Create: `docs/art/generated/monsters/forest/forest-generation-prompts-v01.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`
- Produces: eight unique IDs, names, slugs, visual anchors, palettes, source filenames, and transparent filenames.

- [x] **Step 1: Create the eight-entry forest manifest**

Use this exact roster:

1. `E05` / normal / 荆棘獾 / `thorn-badger`
2. `E06` / normal / 苔背蛙 / `mossback-frog`
3. `E07` / normal / 暮翼蝠 / `duskwing-bat`
4. `E08` / elite / 盘根卫 / `coiled-root-guard`
5. `B05` / boss / 林口哨卫 / `forest-gate-sentry`
6. `B06` / boss / 暗溪巨蛙 / `dark-creek-giant-frog`
7. `B07` / boss / 缠根树怪 / `entwined-root-tree-beast`
8. `B08` / boss / 碑背巨蜥 / `steleback-giant-lizard`

- [x] **Step 2: Write the shared style contract and eight subject prompts**

The shared prompt must cite the grassland contact sheet as the batch proportion and rendering reference, the hero style master as the line-and-color reference, and the forest background contact sheet as the palette reference. Each subject section must state its silhouette anchors and explicit exclusions.

- [x] **Step 3: Validate manifest uniqueness and prompt coverage**

Run a JSON/Python check that asserts the ID order above, eight unique source files, eight unique transparent files, and one prompt heading for every ID.

### Task 2: Generate Forest Normal Monsters and Elite

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/source/e05_thorn-badger_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e06_mossback-frog_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e07_duskwing-bat_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e08_coiled-root-guard_concept_source_v01.png`

**Interfaces:**
- Consumes: the shared prompt contract and E05–E08 subject prompts.
- Produces: four isolated 1024 × 1024 chroma-key source concepts.

- [x] **Step 1: Generate E05 荆棘獾**

Use a low, broad badger-like body, blunt snout, two cream facial bands, and one readable belt of thick branch thorns across the back. Keep legs short and detail sparse.

- [x] **Step 2: Generate E06 苔背蛙**

Use a round squat frog, broad mouth line, wide webbed feet, and one large moss-covered creek stone embedded on the back. Avoid repeated warts or tiny vegetation.

- [x] **Step 3: Generate E07 暮翼蝠**

Use a compact dark body, one continuous wide wing silhouette, and two leaf-shaped ears. Keep wing membranes broad and simple, with no fur rendering.

- [x] **Step 4: Generate E08 盘根卫**

Use a heavy root-knot torso, two oversized spiral root arms, short root feet, and a moss shoulder band. It must be visibly larger and denser than E05–E07 without reaching Boss complexity.

- [x] **Step 5: Inspect all four source concepts**

Check identity, silhouette, style match, flat key background, padding, absence of text, and visible distinction from the grassland roster.

### Task 3: Generate Forest Bosses

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/source/b05_forest-gate-sentry_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b06_dark-creek-giant-frog_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b07_entwined-root-tree-beast_concept_source_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b08_steleback-giant-lizard_concept_source_v01.png`

**Interfaces:**
- Consumes: the shared prompt contract and B05–B08 subject prompts.
- Produces: four isolated 1024 × 1024 chroma-key Boss concepts with higher complexity than E05–E08.

- [x] **Step 1: Generate B05 林口哨卫**

Use a wide hollow-stump torso, small watchful head set inside an upper wood collar, layered shoulder boughs, thick branch forearms, root feet, and a restrained moss mantle. The torso hollow is structural and must not become a second face.

- [x] **Step 2: Generate B06 暗溪巨蛙**

Use a huge deep-green frog with a wide head, layered throat plates, powerful webbed forelimbs, a broken blue-gray creek-stone carapace, and thick moss ridges. Keep the body organic and the stone structure asymmetrical.

- [x] **Step 3: Generate B07 缠根树怪**

Use an asymmetric trunk core trapped inside a cage of thick roots, long root-lattice arms ending in heavy palms, a split crown, and three large moss masses. Avoid fine vines and avoid the cylindrical stump silhouette of B05.

- [x] **Step 4: Generate B08 碑背巨蜥**

Use a muscular low giant lizard with a square head, broad stone-scaled shoulders, a blank broken half-stele fused along its back, heavy legs, and a thick sweeping tail. It must not use B04's sails, olive palette, or pointed wedge head.

- [x] **Step 5: Inspect all four Boss concepts**

Check Boss-level complexity, wide silhouette, stage landmark connection, species readability, no cropped anatomy, and no accidental overlap with B01–B04.

### Task 4: Remove Chroma Keys and Normalize Transparent Masters

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e05_thorn-badger_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e06_mossback-frog_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e07_duskwing-bat_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e08_coiled-root-guard_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b05_forest-gate-sentry_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b06_dark-creek-giant-frog_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b07_entwined-root-tree-beast_concept_v01.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b08_steleback-giant-lizard_concept_v01.png`

**Interfaces:**
- Consumes: eight flat-magenta source concepts.
- Produces: eight normalized RGBA concept masters.

- [x] **Step 1: Remove the magenta background from all eight assets**

Run the installed ImageGen chroma helper with border auto-key sampling, soft matte, thresholds `12` and `220`, despill, and one-pixel edge contraction when needed.

- [x] **Step 2: Normalize each subject into a 1024 × 1024 canvas**

Preserve aspect ratio, keep the alpha bounding box fully visible, and leave at least 60 px on every side.

- [x] **Step 3: Validate alpha and key-color cleanup**

Assert RGBA mode, transparent corners, non-empty alpha bounds, safe margins, plausible visible coverage, and a low partially transparent pixel ratio.

### Task 5: Build Review Artifacts

**Files:**
- Create: `docs/art/generated/monsters/forest/review/forest-monsters-contact-sheet-v01.png`
- Create: `docs/art/generated/monsters/forest/review/forest-monsters-120px-check-v01.png`
- Create: `docs/art/generated/monsters/forest/review/forest-validation-v01.json`

**Interfaces:**
- Consumes: the forest manifest and eight transparent masters.
- Produces: one labeled 4 × 2 review sheet, one 120 px silhouette sheet, and one machine-readable report.

- [x] **Step 1: Build the 4 × 2 contact sheet**

Place E05–E08 in the top row and B05–B08 in the bottom row. Use warm off-white cells and show Bosses larger than normal monsters without cropping.

- [x] **Step 2: Build the 120 px game-size check**

Render each subject within a 120 px box on a neutral checker-free background, with ID labels outside the character box.

- [x] **Step 3: Record validation metrics**

Store image size, alpha bounding box, margins, visible coverage, partial-alpha ratio, corner alpha, automated status, manual thumbnail status, and concise manual notes per asset.

### Task 6: Final Verification and Roster Handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`
- Modify: `docs/superpowers/plans/2026-07-31-forest-monster-concept-production.md`

**Interfaces:**
- Consumes: all forest batch outputs and the approved roster.
- Produces: a fully checked production record and a final visual handoff.

- [x] **Step 1: Mark the grassland batch as locked and the forest batch as produced**

Update the roster status/version without changing approved names or stage assignments.

- [x] **Step 2: Perform manual visual review**

Confirm 8/8 silhouette readability, palette coherence, normal/elite/Boss hierarchy, Boss detail density, and no third-party-specific design.

- [x] **Step 3: Run the full batch validator**

Assert exact current file sets, all manifest references, image dimensions, alpha properties, report statuses, and review artifact presence.

- [x] **Step 4: Run whitespace and document checks**

Run `git diff --check` on the manifest, prompt file, roster spec, plan, and validation JSON.
