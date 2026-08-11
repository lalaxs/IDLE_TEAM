# Generated Equipment Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 24 character-style equipment icons, validate and export them, then integrate all 24 items into the live game.

**Architecture:** Build one immutable reference sheet from six current hero SVGs, generate one isolated raster asset per item, and process every selected source into transparent master, runtime, and preview outputs. Keep content definitions as the single source of truth for item IDs and public image paths; the reward and shop systems already sample from that list.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 4, generated PNG sources, Pillow-based image processing, transparent WebP runtime assets, Sites hosting.

## Global Constraints

- Exactly 24 items: 8 weapons, 8 armor pieces, and 8 accessories.
- Use H01, H03, H04, H05, H06, and H08 as the sole current-game style anchors.
- Generate one complete item per image; do not generate a collage or icon sheet.
- Use thick rounded warm-dark outlines, 3–5 flat colors, minimal inner lines, and no realistic textures or gradients.
- Preserve the existing rarity, trait, score, reward, and shop behavior.
- Rarity remains a card treatment; item art has no rarity variants.
- Runtime item images are 256 × 256 transparent WebP files under `public/assets/equipment/`.

---

### Task 1: Lock the Equipment Content Contract

**Files:**
- Modify: `tests/content/content.test.ts`
- Modify: `src/content/items.ts`

**Interfaces:**
- Consumes: existing `EquipmentSlot`, `Rarity`, and `ItemDefinition`.
- Produces: `ITEM_DEFINITIONS` with 24 unique entries and public runtime image paths in `ItemDefinition.icon`.

- [ ] **Step 1: Write the failing content test**

Add assertions that `ITEM_DEFINITIONS` has 24 items, contains exactly 8 entries per slot, has unique IDs and names, and gives each item the literal path `/assets/equipment/${id}.webp`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:run -- tests/content/content.test.ts`

Expected: FAIL because the manifest still contains 12 items and Unicode symbols.

- [ ] **Step 3: Add the 12 new definitions and replace all icon values**

Use the exact roster and IDs from `docs/superpowers/specs/2026-07-31-generated-equipment-icon-design.md`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:run -- tests/content/content.test.ts`

Expected: PASS.

### Task 2: Build and Validate the Art Pipeline

**Files:**
- Create: `scripts/art/build_equipment_reference_sheet.mjs`
- Create: `scripts/art/process_equipment_assets.py`
- Create: `scripts/art/test_process_equipment_assets.py`
- Create: `docs/art/generated/equipment/references/equipment-hero-style-reference.png`

**Interfaces:**
- Consumes: six existing SVG paths and generated chroma sources named `<id>_source_v01.png`.
- Produces: transparent 1024 PNG masters, 256 transparent WebP runtime assets, 42 PNG previews, and a contact sheet.

- [ ] **Step 1: Write failing image-processing tests**

Test that processing a synthetic magenta-backed item creates the three required sizes with alpha, transparent corners, non-empty subject bounds, and no edge contact.

- [ ] **Step 2: Run the processor test and verify RED**

Run: `/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts/art/test_process_equipment_assets.py`

Expected: FAIL because `process_equipment_assets.py` does not exist.

- [ ] **Step 3: Implement the reference-sheet and processing scripts**

Use the bundled `sharp` package to rasterize the six SVGs onto a cream reference board without altering them. Use Pillow for transparent normalization, runtime export, preview export, manifest-completeness checks, and contact-sheet output.

- [ ] **Step 4: Run the processor test and verify GREEN**

Run: `/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest scripts/art/test_process_equipment_assets.py`

Expected: PASS.

- [ ] **Step 5: Build and inspect the reference sheet**

Run: `NODE_PATH=/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/art/build_equipment_reference_sheet.mjs`

Expected: the reference PNG contains exactly the six named current-game heroes in two rows.

### Task 3: Generate the 24 Equipment Sources

**Files:**
- Create: `docs/art/generated/equipment/chroma/<id>_source_v01.png` for all 24 IDs
- Create: `docs/art/generated/equipment/prompts.md`

**Interfaces:**
- Consumes: the approved reference sheet and per-item prompt variables from the design spec.
- Produces: 24 independent chroma-key source images.

- [ ] **Step 1: Generate one calibration asset**

Generate `weapon_guard_blade` with the complete prompt contract and the reference sheet.

- [ ] **Step 2: Inspect the calibration asset**

Require exactly one complete item, flat `#ff00ff` background, thick rounded outline, 3–5 flat colors, no shadow, and ample padding. If one invariant fails, make one targeted prompt correction and regenerate only that asset.

- [ ] **Step 3: Generate the remaining 23 independent assets**

Use one built-in image-generation call per distinct item. Repeat the full constraints in every prompt and use the same reference sheet path every time.

- [ ] **Step 4: Record the final prompt set**

Write all 24 complete prompts and the built-in generation mode to `docs/art/generated/equipment/prompts.md`.

### Task 4: Process and Review the Complete Art Set

**Files:**
- Create: `docs/art/generated/equipment/master/*.png`
- Create: `docs/art/generated/equipment/previews/*.png`
- Create: `docs/art/generated/equipment/review/equipment-contact-sheet.png`
- Create: `public/assets/equipment/*.webp`

**Interfaces:**
- Consumes: all 24 chroma sources.
- Produces: all project-bound final assets.

- [ ] **Step 1: Process all sources**

Run: `/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/art/process_equipment_assets.py`

Expected: 24 masters, 24 runtime WebPs, 24 previews, and one contact sheet.

- [ ] **Step 2: Run machine validation**

Run: `/Users/jar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/art/process_equipment_assets.py --validate`

Expected: PASS with 24/24 in every category.

- [ ] **Step 3: Inspect the contact sheet at full size**

Check all visual acceptance items from the design spec. Regenerate only assets with a concrete failure.

### Task 5: Render Equipment Images in the UI

**Files:**
- Modify: `tests/ui/app-shell.test.ts`
- Modify: `src/ui/AppShell.ts`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: `ItemDefinition.icon` public image paths.
- Produces: `<img class="equipment-art">` rendering in inventory, shop, and item detail surfaces.

- [ ] **Step 1: Write the failing UI test**

Insert a real inventory item, render inventory and its detail sheet, and assert the image source equals the selected definition path in both surfaces.

- [ ] **Step 2: Run the focused UI test and verify RED**

Run: `npm run test:run -- tests/ui/app-shell.test.ts`

Expected: FAIL because Unicode text is still rendered instead of images.

- [ ] **Step 3: Add one image-rendering helper and use it everywhere**

Render decorative images with empty `alt`, `aria-hidden="true"`, fixed dimensions, `object-fit: contain`, and no pointer events. Preserve existing accessible card and button names.

- [ ] **Step 4: Run the focused UI test and verify GREEN**

Run: `npm run test:run -- tests/ui/app-shell.test.ts`

Expected: PASS.

### Task 6: Validate, Build, and Publish

**Files:**
- Modify: no source files unless verification finds a concrete defect.

**Interfaces:**
- Consumes: the complete generated art and UI integration.
- Produces: a validated production build and deployed Sites version.

- [ ] **Step 1: Run all unit tests**

Run: `npm run test:run`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Build the production site**

Run: `npm run build`

Expected: TypeScript, Vite, and Sites staging complete with exit code 0.

- [ ] **Step 3: Run the existing mobile end-to-end test**

Run: `npm run test:e2e`

Expected: all existing browser flows pass.

- [ ] **Step 4: Package, save, and deploy the exact validated source**

Reuse the existing project ID from `.openai/hosting.json`, save one version, deploy it privately when available, and poll until deployment succeeds or fails.

- [ ] **Step 5: Report the production URL and asset locations**

Include the deployed URL, the 24-item contact sheet, the public runtime asset directory, and the final prompt record.
