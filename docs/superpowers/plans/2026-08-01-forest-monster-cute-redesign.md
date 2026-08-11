# Forest Monster Cute Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected forest v01 batch with eight simpler, rounder, cuter v02 enemy concepts while preserving names, species, stages, and forest landmarks.

**Architecture:** The grassland v04 contact sheet is the sole creature-style and proportion authority; the forest background sheet supplies palette only. Each v02 creature is regenerated from a reduced silhouette contract on a flat magenta field, normalized into a transparent PNG, reviewed at full and 120 px sizes, and promoted in the manifest only after all eight assets pass. Forest v01 source and transparent assets remain recoverable under `review/rejected/v01/`.

**Tech Stack:** Built-in ImageGen, PNG/RGBA, Pillow, JSON, Markdown.

## Global Constraints

- Do not use forest v01 character images as generation references.
- Match grassland v04's cute rounded proportions, large oval eyes, short limbs, thick warm near-black outlines, flat opaque colors, and low detail density.
- Normal enemies have two dominant visual anchors; E08 has three; each Boss has three to four large structures.
- Boss complexity comes from body mass and one stage landmark, never repeated plates, small stones, dense roots, fine bark, or realistic anatomy.
- Use a friendly alert expression, closed mouth or one short mouth line, and no angry brow, fangs, snarling, or horror pose.
- Generate on a perfectly flat `#ff00ff` field with no shadow, floor, text, UI, frame, particles, or scenery.
- Final transparent files are 1024 × 1024 RGBA, have at least 60 px safety margins, transparent corners, and no visible magenta fringe.

---

### Task 1: Write the v02 Prompt Contract

**Files:**
- Create: `docs/art/generated/monsters/forest/forest-generation-prompts-v02.md`
- Modify: `docs/art/requirements/forest-monster-concept-manifest-v01.json`

**Interfaces:**
- Consumes: the approved v02 section in `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`.
- Produces: eight v02 source filenames, eight v02 transparent filenames, and exact per-character simplified prompts.

- [x] **Step 1: Write the shared cute-style prompt**

Use the grassland v04 sheet as Image 1 and the forest background sheet as Image 2. State that Image 1 controls proportions and detail density, while Image 2 controls palette only.

- [x] **Step 2: Write eight reduced subject prompts**

Use the exact structures in spec section 5.1. Every prompt must include a maximum large-structure count and explicit exclusions for v01's dense plates, root cages, small stones, and realistic muscles.

- [x] **Step 3: Prepare manifest version 1.1**

Keep all IDs, names, slugs, types, stages, and palette families unchanged. Change only version, visual anchors, and filenames from `v01` to `v02`.

### Task 2: Generate Cute Normal Monsters and Elite

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/source/e05_thorn-badger_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e06_mossback-frog_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e07_duskwing-bat_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/e08_coiled-root-guard_concept_source_v02.png`

**Interfaces:**
- Consumes: shared v02 prompt contract and grassland v04 reference.
- Produces: four isolated cute v02 chroma-key sources.

- [x] **Step 1: Generate E05 with a round body and three blunt thorn buds**
- [x] **Step 2: Generate E06 with a large head and one moss-stone cap**
- [x] **Step 3: Generate E07 with a ball body, short wide wings, and leaf ears**
- [x] **Step 4: Generate E08 with a root-ball body, mitten arms, and one moss tuft**
- [x] **Step 5: Inspect cuteness and two/three-anchor limits**

Reject any output with realistic anatomy, dense surface marks, an angry expression, or v01-level structure density.

### Task 3: Generate Cute Bosses

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/source/b05_forest-gate-sentry_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b06_dark-creek-giant-frog_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b07_entwined-root-tree-beast_concept_source_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/source/b08_steleback-giant-lizard_concept_source_v02.png`

**Interfaces:**
- Consumes: shared v02 prompt contract and grassland v04 Boss reference.
- Produces: four isolated cute v02 Boss sources.

- [x] **Step 1: Generate B05 as a round stump sentry with a shallow hollow crown**
- [x] **Step 2: Generate B06 as a chubby giant frog with three large creek stones**
- [x] **Step 3: Generate B07 as a low root beast with three thick embracing roots**
- [x] **Step 4: Generate B08 as a round-headed short-legged lizard with one rounded stele**
- [x] **Step 5: Inspect the three/four-structure limits and Boss hierarchy**

Each Boss must remain larger and richer than its related normal enemy, but its silhouette must be understandable before surface details are visible.

### Task 4: Normalize v02 and Archive v01

**Files:**
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e05_thorn-badger_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e06_mossback-frog_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e07_duskwing-bat_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/e08_coiled-root-guard_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b05_forest-gate-sentry_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b06_dark-creek-giant-frog_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b07_entwined-root-tree-beast_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/concepts/transparent/b08_steleback-giant-lizard_concept_v02.png`
- Create: `docs/art/generated/monsters/forest/review/rejected/v01/`
- Move: all eight v01 source concepts into `docs/art/generated/monsters/forest/review/rejected/v01/source/`
- Move: all eight v01 transparent concepts into `docs/art/generated/monsters/forest/review/rejected/v01/transparent/`

**Interfaces:**
- Consumes: eight approved v02 chroma-key sources and sixteen rejected v01 files.
- Produces: eight current v02 source files, eight current v02 transparent files, and a recoverable v01 archive.

- [x] **Step 1: Remove magenta with soft matte, despill, and one-pixel edge contraction**
- [x] **Step 2: Fit each v02 subject within an 880 × 800 safe box anchored at y=930**
- [x] **Step 3: Rebuild normalized 1024 × 1024 magenta sources from the transparent masters**
- [x] **Step 4: Move v01 current assets into the rejected archive**
- [x] **Step 5: Validate exact v02 current file sets and v01 archive completeness**

### Task 5: Build and Review v02 Batch Artifacts

**Files:**
- Create: `docs/art/generated/monsters/forest/review/forest-monsters-contact-sheet-v02.png`
- Create: `docs/art/generated/monsters/forest/review/forest-monsters-120px-check-v02.png`
- Create: `docs/art/generated/monsters/forest/review/forest-validation-v02.json`

**Interfaces:**
- Consumes: manifest 1.1 and eight transparent v02 masters.
- Produces: one 4 × 2 full review sheet, one 120 px sheet, and one validation report.

- [x] **Step 1: Build the v02 4 × 2 contact sheet**
- [x] **Step 2: Build the v02 120 px check sheet**
- [x] **Step 3: Review cuteness, simplified structure count, silhouette separation, and Boss hierarchy**
- [x] **Step 4: Record automated and manual pass/fail evidence per asset**

### Task 6: Promote v02 and Verify

**Files:**
- Modify: `docs/superpowers/specs/2026-07-31-qingqiu-frontier-monster-roster-design.md`
- Modify: `docs/superpowers/plans/2026-08-01-forest-monster-cute-redesign.md`

**Interfaces:**
- Consumes: the eight reviewed v02 assets and v02 validation report.
- Produces: the final current forest batch and completed production record.

- [x] **Step 1: Mark forest v02 as current and v01 as rejected**
- [x] **Step 2: Run full manifest, file-set, alpha, margin, magenta-fringe, and report validation**
- [x] **Step 3: Run `git diff --check` on all v02 text artifacts**
- [x] **Step 4: Confirm the production plan has no unchecked task items**
