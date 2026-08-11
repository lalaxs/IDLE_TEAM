# Frostland Equipment Expansion Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a playable Frostland chapter equipment expansion with 12 new icons, shared chapter-aware loot selection, three functioning combat traits, and access to stages 2-1 through 2-12.

**Architecture:** Keep equipment definitions static in `src/content/items.ts`, tag them with `chapter`, and route battle loot, shop offers, and offline gear through one `EquipmentPool` selector. Carry the three new trait effects into `HeroBattleBonus` and apply their per-hit/per-wave behavior inside `BattleSimulation`, preserving simulation ownership outside Phaser and the save schema. Extend the existing flat numeric stage model from 12 to 24 while presenting two chapter groups in the stage UI.

**Tech Stack:** TypeScript, Vitest, Phaser 3, Vite, Playwright, Python/Pillow, built-in ImageGen, OpenAI Sites.

---

## Task 1: Lock the Frostland content contract with failing tests

**Files:**
- Modify: `tests/content/content.test.ts`
- Modify: `tests/progression/progression.test.ts`
- Create: `tests/progression/equipment-pool.test.ts`

**Steps:**

1. Add assertions for 36 total equipment definitions, 12 chapter-two items, four per slot, unique IDs/icons, and the three slot-specific Frostland traits.
2. Add deterministic equipment-generation tests proving chapter-one gear cannot roll Frostland traits and rare/epic chapter-two gear can choose either its chapter trait or a legacy slot trait.
3. Add boundary tests for chapter weights at stages 12, 13, 16, 17, 20, 21, and 24.
4. Run the focused tests and confirm they fail for missing content and selector behavior.

## Task 2: Implement definitions and the shared equipment pool

**Files:**
- Modify: `src/content/items.ts`
- Create: `src/progression/EquipmentPool.ts`
- Modify: `src/progression/EquipmentSystem.ts`

**Steps:**

1. Add `chapter: 1 | 2` to `ItemDefinition`, mark the original 24 items as chapter one, and add the approved 12 Frostland definitions.
2. Add `frostbite`, `snowguard`, and `frostfocus` to the trait manifest.
3. Implement stage-to-Frostland-weight lookup and deterministic definition selection with a chapter-one fallback.
4. Restrict chapter traits to rare/epic chapter-two gear with a 50/50 chapter-versus-legacy roll.
5. Run the focused content, pool, and progression tests until green.

## Task 3: Connect battle loot, shop, and offline rewards

**Files:**
- Modify: `src/progression/RewardSystem.ts`
- Modify: `src/progression/ShopSystem.ts`
- Modify: `src/app/GameApp.ts`
- Modify: `src/app/GameStore.ts`
- Modify: `tests/progression/rewards.test.ts`
- Modify: `tests/progression/shop.test.ts`

**Steps:**

1. Add failing deterministic tests proving stage rewards and shops use the shared selector and chapter thresholds.
2. Replace direct `ITEM_DEFINITIONS` picks in stage rewards and shop generation with the shared selector.
3. Generate offline equipment using the highest unlocked stage and the same selector.
4. Pass `highestUnlockedStage` rather than the highest cleared stage into shop generation.
5. Run progression and store tests until green.

## Task 4: Implement the three combat traits

**Files:**
- Modify: `src/simulation/BattleSimulation.ts`
- Modify: `src/app/GameSession.ts`
- Modify: `tests/app/game-session.test.ts`
- Modify: `tests/simulation/battle-simulation.test.ts`
- Modify: `tests/simulation/status-system.test.ts`

**Steps:**

1. Add failing tests for a full-strength 12% Frostbite slow with source refresh, a 6% Snowguard shield at every wave start without carry-over, and one 18% Frostfocus cooldown reduction per wave.
2. Extend `HeroBattleBonus` and gear flags for the three effects.
3. Apply Frostbite after a successful hero basic attack using the battle RNG.
4. Reset wave-scoped shields and Frostfocus usage, then apply Snowguard and the first-cooldown reduction at wave spawn.
5. Run GameSession and simulation tests until green.

## Task 5: Open the second chapter

**Files:**
- Modify: `src/content/stages.ts`
- Modify: `src/persistence/schema.ts`
- Modify: `src/app/GameStore.ts`
- Modify: `src/ui/AppShell.ts`
- Modify: `tests/content/content.test.ts`
- Modify: `tests/persistence/save.test.ts`
- Modify: `tests/app/store.test.ts`

**Steps:**

1. Add failing tests for 24 stage definitions, chapter IDs, and save/store bounds through stage 24.
2. Add the 12 approved Frostland stage entries and chapter metadata.
3. Raise persistence and store clamps to 24 while retaining version-one save compatibility.
4. Render first- and second-chapter stage groups with chapter-local progress.
5. Run content, persistence, store, and UI tests until green.

## Task 6: Generate and normalize the 12 Frostland equipment icons

**Files:**
- Create: `docs/art/generated/equipment/chroma/*_source_v01.png` (12 files)
- Create: `docs/art/generated/equipment/master/*_master_v01.png` (12 files)
- Create: `docs/art/generated/equipment/previews/*_preview_v01.png` (12 files)
- Create: `public/assets/equipment/*.webp` (12 files)
- Create: `docs/art/generated/equipment/frostland-prompts.md`
- Modify: `scripts/art/process_equipment_assets.py`
- Modify: `scripts/art/test_process_equipment_assets.py`
- Modify: `docs/art/generated/equipment/review/equipment-contact-sheet.png`
- Modify: `docs/art/generated/equipment/review/equipment-small-contact-sheet.png`
- Create: `docs/art/generated/equipment/review/frostland-equipment-contact-sheet.png`
- Create: `docs/art/generated/equipment/review/frostland-equipment-small-contact-sheet.png`

**Steps:**

1. Generate each approved item independently against the current equipment/hero style reference on a flat chroma background.
2. Save prompt provenance and map each generated source to its equipment ID.
3. Update the processor expectation to 36 total items and add Frostland-only review sheets.
4. Remove chroma, normalize transparent masters, export 256px WebP and 42px PNG previews.
5. Validate all assets and visually inspect both Frostland review sheets.

## Task 7: Verify the complete player flow

**Files:**
- Modify as required by test findings only.

**Steps:**

1. Run `python3 -m unittest scripts.art.test_process_equipment_assets`.
2. Run `python3 scripts/art/process_equipment_assets.py --validate`.
3. Run `npm run test:run`.
4. Run `npm run build`.
5. Run `npm run test:e2e`.
6. Inspect the built game at mobile viewport, including chapter navigation, inventory cards, shop offers, and Frostland equipment details.

## Task 8: Commit and publish the exact verified source

**Files:**
- Stage only files created or modified by this plan.

**Steps:**

1. Review `git diff` and exclude unrelated dirty files already present in the workspace.
2. Commit the verified Frostland source and art assets.
3. Push the exact commit to the existing Sites repository.
4. Package that commit, save a new site version, deploy it privately, and poll until terminal success.
5. Open the production URL and deliver the implementation summary, verification evidence, art contact sheets, commit, and deployment URL.
