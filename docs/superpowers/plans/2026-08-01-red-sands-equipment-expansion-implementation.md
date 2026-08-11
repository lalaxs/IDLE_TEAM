# Red Sands Equipment Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable third-chapter Red Sands equipment package with 12 generated icons, shared region-aware reward selection, three functioning combat traits, and stages 3-1 through 3-12.

**Architecture:** Extend the existing chapter-tagged equipment and flat numeric stage model from two chapters to three. Generalize `EquipmentPool` so battle loot, shop offers, and offline rewards all select the current region at 35% / 60% / 80%, while `BattleSimulation` owns the new armor-break and per-wave trait state. Keep Phaser as a renderer and preserve the current version-one save shape.

**Tech Stack:** TypeScript, Vitest, Phaser 3, Vite, Playwright, Python/Pillow, built-in ImageGen, OpenAI Sites.

## Global Constraints

- Add exactly 12 chapter-three items: four weapons, four armor pieces, and four accessories.
- Add exactly three chapter-three traits: `sandscar`, `mirageguard`, and `tailwind`.
- Preserve chapter-one and chapter-two reward behavior.
- Use 35% / 60% / 80% Red Sands weight at stages 25 / 29 / 33.
- Keep save version `1`; raise only the stage upper bound to `36`.
- Generate 1024 px transparent masters, 256 px WebP runtime icons, and 42 px previews.
- Do not add sets, professions, rarities, enhancement, rerolling, or a new detail UI.

---

### Task 1: Lock the chapter-three content contract

**Files:**
- Modify: `tests/content/content.test.ts`
- Modify: `tests/progression/progression.test.ts`
- Modify: `tests/progression/equipment-pool.test.ts`

**Interfaces:**
- Consumes: existing `ITEM_DEFINITIONS`, `TRAIT_DEFINITIONS`, `selectEquipmentDefinition(stage, random)`.
- Produces: expected counts for 48 items, 15 traits, and chapter-three regional selection behavior.

- [ ] **Step 1: Write failing tests** for 48 unique equipment definitions, 12 chapter-three items, four per slot, and the three Red Sands traits.
- [ ] **Step 2: Add pool boundary assertions** for stages 24, 25, 28, 29, 32, 33, and 36.
- [ ] **Step 3: Add trait-generation assertions** proving rare Red Sands gear can roll its regional trait or a base trait while earlier chapters cannot roll it.
- [ ] **Step 4: Run focused tests** and confirm failures identify the missing chapter-three data and generic selector.

### Task 2: Generalize equipment definitions and selection

**Files:**
- Modify: `src/content/items.ts`
- Modify: `src/progression/EquipmentPool.ts`
- Modify: `src/progression/EquipmentSystem.ts`

**Interfaces:**
- Produces: `type EquipmentChapter = 1 | 2 | 3`, `getRegionalEquipmentWeight(stage: number): number`, and existing `selectEquipmentDefinition(stage, random): ItemDefinition` with three-chapter behavior.

- [ ] **Step 1: Add the 12 approved definitions** with `chapter: 3` and unique runtime icon paths.
- [ ] **Step 2: Add `sandscar`, `mirageguard`, and `tailwind`** to the static trait manifest.
- [ ] **Step 3: Replace the Frostland-only pool split** with current-region and prior-region pools derived from the stage chapter.
- [ ] **Step 4: Generalize regional trait selection** to a chapter-and-slot map while keeping the nine base traits as the fallback branch.
- [ ] **Step 5: Run the focused tests** until green.

### Task 3: Implement Red Sands combat traits

**Files:**
- Modify: `src/simulation/types.ts`
- Modify: `src/simulation/CombatSystem.ts`
- Modify: `src/simulation/BattleSimulation.ts`
- Modify: `src/app/GameSession.ts`
- Modify: `tests/simulation/combat.test.ts`
- Modify: `tests/simulation/systems.test.ts`
- Modify: `tests/simulation/battle.test.ts`
- Modify: `tests/app/game-session.test.ts`

**Interfaces:**
- Produces: `StatusKind` support for `armorBreak`; `HeroBattleBonus.sandscarChance`, `.mirageGuardPct`, and `.tailwindPct`.

- [ ] **Step 1: Add failing formula tests** showing `armorBreak: 0.12` reduces effective defense before damage calculation.
- [ ] **Step 2: Add failing battle tests** for guaranteed Sandscar application, once-per-wave Mirage Guard, and per-wave Tailwind haste.
- [ ] **Step 3: Carry trait IDs into hero bonuses** in `GameSession`.
- [ ] **Step 4: Apply Sandscar after basic attacks**, refresh its two-second status, and emit a status event.
- [ ] **Step 5: Reset Mirage Guard each wave** and trigger 20% damage reduction for three seconds at the first below-50% health check.
- [ ] **Step 6: Apply Tailwind at wave spawn** as 15% haste for three seconds.
- [ ] **Step 7: Run simulation and GameSession tests** until green.

### Task 4: Open chapter three and preserve reward integration

**Files:**
- Modify: `src/content/stages.ts`
- Modify: `src/persistence/schema.ts`
- Modify: `src/app/GameStore.ts`
- Modify: `src/ui/AppShell.ts`
- Modify: `src/styles/components.css`
- Modify: `tests/content/content.test.ts`
- Modify: `tests/persistence/save.test.ts`
- Modify: `tests/app/store.test.ts`
- Modify: `tests/progression/rewards.test.ts`
- Modify: `tests/progression/shop.test.ts`
- Modify: `tests/ui/app-shell.test.ts`

**Interfaces:**
- Produces: 36 `StageDefinition` entries and stage bounds through `36`.

- [ ] **Step 1: Add failing tests** for 36 stages, final ID `3-12`, save repair to 36, store progression to 36, and UI rendering of three chapter sections.
- [ ] **Step 2: Add the 12 approved Red Sands stage names** with chapter name `赤沙古道` and boss name `赤沙守卫`.
- [ ] **Step 3: Raise persistence and store clamps** from 24 to 36.
- [ ] **Step 4: Generalize the topbar and stage list** for three Chinese chapter numerals, 36-stage progress, a Red Sands introduction card, and completion at stage 36.
- [ ] **Step 5: Add deterministic reward distribution tests** for chapter-three battle and shop outputs; offline already reuses the selector.
- [ ] **Step 6: Run content, persistence, progression, store, and UI tests** until green.

### Task 5: Generate and normalize 12 Red Sands icons

**Files:**
- Create: `docs/art/generated/equipment/chroma/*_source_v01.png` for 12 IDs
- Create: `docs/art/generated/equipment/master/*_master_v01.png` for 12 IDs
- Create: `docs/art/generated/equipment/previews/*_preview_v01.png` for 12 IDs
- Create: `public/assets/equipment/*.webp` for 12 IDs
- Create: `docs/art/generated/equipment/red-sands-prompts.md`
- Modify: `scripts/art/process_equipment_assets.py`
- Modify: `scripts/art/test_process_equipment_assets.py`
- Modify: `docs/art/generated/equipment/review/equipment-contact-sheet.png`
- Modify: `docs/art/generated/equipment/review/equipment-small-contact-sheet.png`
- Create: `docs/art/generated/equipment/review/red-sands-equipment-contact-sheet.png`
- Create: `docs/art/generated/equipment/review/red-sands-equipment-small-contact-sheet.png`

**Interfaces:**
- Produces: 48 validated runtime equipment icons and Red Sands review sheets.

- [ ] **Step 1: Record one full prompt per item** using the current 36-item sheet and character-style reference.
- [ ] **Step 2: Generate each item independently** on uniform `#ff00ff`, mapping one output to one approved ID.
- [ ] **Step 3: Update processor expectations** from 36 to 48 and add chapter-three review-sheet output.
- [ ] **Step 4: Run the processor** to remove chroma, normalize scale, export WebP/previews, and rebuild all contact sheets.
- [ ] **Step 5: Validate 48/48 assets** and visually inspect both Red Sands sheets at full and 42 px size.

### Task 6: Verify, commit, and publish

**Files:**
- Stage only files created or modified by this plan.

**Interfaces:**
- Consumes: completed code, tests, art assets, existing Sites project ID.
- Produces: one verified Git commit and one successful Sites production deployment.

- [ ] **Step 1: Run** bundled-Python equipment processor tests.
- [ ] **Step 2: Run** equipment asset validation and confirm `48/48`.
- [ ] **Step 3: Run** `npm run test:run`, `npm run build`, and `npm run test:e2e`.
- [ ] **Step 4: Inspect** staged diff and exclude pre-existing unrelated workspace changes.
- [ ] **Step 5: Commit and push** the exact validated source to the configured Sites repository.
- [ ] **Step 6: Package, save, deploy, and poll** the new Sites version to terminal success.
