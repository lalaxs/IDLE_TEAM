# Stormsea Equipment Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable fourth-chapter Stormsea equipment package with 12 generated icons, three functioning regional traits, stage-aware rewards, and stages 4-1 through 4-12.

**Architecture:** Extend the established chapter-tagged equipment and numeric stage model from three chapters to four. Keep all reward consumers on the shared equipment selector, carry the three new trait values through `GameSession` into existing unit flags, and implement their behavior at the smallest owning layer: basic attacks in `BattleSimulation`, lethal damage in `CombatSystem`, and skill completion in `SkillSystem`.

**Tech Stack:** TypeScript, Vitest, Phaser 3, Vite, Playwright, Python/Pillow, built-in ImageGen, OpenAI Sites.

## Global Constraints

- Add exactly 12 chapter-four items: four weapons, four armor pieces, and four accessories.
- Add exactly three chapter-four traits: `thunderbrand`, `cloudveil`, and `stormward`.
- Preserve chapter-one through chapter-three reward behavior.
- Use 35% / 60% / 80% Stormsea weight at stages 37 / 41 / 45.
- Keep save version `1`; raise only the stage upper bound to `48`.
- Generate 1024 px transparent masters, 256 px WebP runtime icons, and 42 px previews.
- Do not add monsters, backgrounds, slots, rarities, sets, enhancement, or rerolling.

---

### Task 1: Lock the fourth-chapter content contract

**Files:**
- Modify: `tests/content/content.test.ts`
- Modify: `tests/progression/equipment-pool.test.ts`
- Modify: `tests/progression/progression.test.ts`

**Interfaces:**
- Consumes: `ITEM_DEFINITIONS`, `TRAIT_DEFINITIONS`, `STAGE_DEFINITIONS`, `getRegionalEquipmentWeight(stage)`, `selectEquipmentDefinition(stage, random)`.
- Produces: executable expectations for 60 items, 18 traits, 48 stages, and chapter-four selection.

- [ ] **Step 1: Change manifest expectations and add the chapter-four item test**

```ts
expect(STAGE_DEFINITIONS).toHaveLength(48);
expect(ITEM_DEFINITIONS).toHaveLength(60);
expect(TRAIT_DEFINITIONS).toHaveLength(18);
expect(ITEM_DEFINITIONS.filter(({ chapter }) => chapter === 4)).toHaveLength(12);
```

- [ ] **Step 2: Add regional weight boundary expectations**

```ts
expect([
  getRegionalEquipmentWeight(36), getRegionalEquipmentWeight(37),
  getRegionalEquipmentWeight(40), getRegionalEquipmentWeight(41),
  getRegionalEquipmentWeight(44), getRegionalEquipmentWeight(45),
  getRegionalEquipmentWeight(48),
]).toEqual([0.8, 0.35, 0.35, 0.6, 0.6, 0.8, 0.8]);
```

- [ ] **Step 3: Add trait-generation expectations**

```ts
expect(createEquipment("weapon_cloudsplitter_glaive", 37, "rare", regionalRandom).traitId)
  .toBe("thunderbrand");
expect(createEquipment("weapon_cloudsplitter_glaive", 37, "epic", baseRandom).traitId)
  .toBe("sharp");
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run: `npm run test:run -- --run tests/content/content.test.ts tests/progression/equipment-pool.test.ts tests/progression/progression.test.ts`

Expected: failures for missing chapter-four data and selection.

### Task 2: Extend definitions, pools, stages, persistence, and UI

**Files:**
- Modify: `src/content/items.ts`
- Modify: `src/content/stages.ts`
- Modify: `src/progression/EquipmentPool.ts`
- Modify: `src/progression/EquipmentSystem.ts`
- Modify: `src/persistence/schema.ts`
- Modify: `src/app/GameStore.ts`
- Modify: `src/ui/AppShell.ts`
- Modify: `src/styles/components.css`
- Modify: `tests/persistence/save.test.ts`
- Modify: `tests/app/store.test.ts`
- Modify: `tests/progression/rewards.test.ts`
- Modify: `tests/progression/shop.test.ts`
- Modify: `tests/ui/app-shell.test.ts`

**Interfaces:**
- Produces: `EquipmentChapter = 1 | 2 | 3 | 4`, 60 definitions, 48 stages, and upper bounds of 48.
- Preserves: the shared `selectEquipmentDefinition(stage, random): ItemDefinition` API.

- [ ] **Step 1: Add failing stage, save, store, reward, shop, and UI tests**

```ts
expect(repairSaveData({ version: 1, currentStage: 99 }, 0).currentStage).toBe(48);
expect(root.querySelectorAll(".stage-node")).toHaveLength(48);
expect(root.querySelector('[data-stage="48"]')?.textContent).toContain("4-12");
```

- [ ] **Step 2: Verify the integration tests fail for the missing fourth chapter**

Run: `npm run test:run -- --run tests/persistence/save.test.ts tests/app/store.test.ts tests/progression/rewards.test.ts tests/progression/shop.test.ts tests/ui/app-shell.test.ts`

Expected: failures at the old 36-stage and three-chapter limits.

- [ ] **Step 3: Add the approved definitions and regional trait map**

```ts
export type EquipmentChapter = 1 | 2 | 3 | 4;

const regionalTraitByChapter = {
  2: { weapon: "frostbite", armor: "snowguard", accessory: "frostfocus" },
  3: { weapon: "sandscar", armor: "mirageguard", accessory: "tailwind" },
  4: { weapon: "thunderbrand", armor: "cloudveil", accessory: "stormward" },
};
```

- [ ] **Step 4: Extend the stage chapter selector and legacy pool**

```ts
if (stage >= 37) return 4;
if (stage >= 25) return 3;
if (stage >= 13) return 2;
return 1;
```

- [ ] **Step 5: Add 4-1 through 4-12 and raise all clamps to 48**

Add the exact names from the design spec, then replace the three persistence/store limits of `36` with `48`.

- [ ] **Step 6: Render four chapters and the Stormsea chapter styles**

Use `chapterNumeral[4] = "四"`, add `stormsea` and `stormsea-preview` classes, show `四章 · 48 关`, and move the completion modal to stage 48.

- [ ] **Step 7: Run the focused content and integration tests until GREEN**

Run: `npm run test:run -- --run tests/content/content.test.ts tests/progression/equipment-pool.test.ts tests/progression/progression.test.ts tests/persistence/save.test.ts tests/app/store.test.ts tests/progression/rewards.test.ts tests/progression/shop.test.ts tests/ui/app-shell.test.ts`

Expected: all listed test files pass.

### Task 3: Implement Thunderbrand, Cloudveil, and Stormward

**Files:**
- Modify: `src/simulation/CombatSystem.ts`
- Modify: `src/simulation/BattleSimulation.ts`
- Modify: `src/simulation/SkillSystem.ts`
- Modify: `src/app/GameSession.ts`
- Modify: `tests/simulation/combat.test.ts`
- Modify: `tests/simulation/battle.test.ts`
- Modify: `tests/simulation/skills.test.ts`
- Modify: `tests/app/game-session.test.ts`

**Interfaces:**
- Produces: `HeroBattleBonus.thunderbrandPct`, `.cloudveilShieldPct`, and `.stormwardShieldPct`.
- Uses flags: `gearThunderbrand`, `gearCloudveil`, `gearCloudveilUsed`, `gearStormward`, `gearStormwardUsed`.

- [ ] **Step 1: Add a failing lethal-damage test for Cloudveil**

```ts
const target = makeUnit({ hp: 20, maxHp: 100, passiveFlags: {
  gearCloudveil: 0.12, gearCloudveilUsed: false,
} });
expect(applyDamage(target, 100)).toMatchObject({ died: false });
expect(target).toMatchObject({ hp: 1, shield: 12, alive: true });
```

- [ ] **Step 2: Add failing battle tests for Thunderbrand and per-wave reset**

Create a battle with `thunderbrandPct: 0.35`, advance until four basic attacks, and assert one extra damage event equal to `Math.round(hero.attack * 0.35)`. Create a Cloudveil battle, trigger lethal damage through `applyDamage`, advance the wave, and assert `gearCloudveilUsed` resets.

- [ ] **Step 3: Add a failing skill test for Stormward**

```ts
source.passiveFlags = { gearStormward: 0.1, gearStormwardUsed: false };
tryCastSkill(source, units, random);
expect(source.shield).toBe(Math.round(source.maxHp * 0.1));
expect(source.passiveFlags.gearStormwardUsed).toBe(true);
```

- [ ] **Step 4: Verify RED**

Run: `npm run test:run -- --run tests/simulation/combat.test.ts tests/simulation/battle.test.ts tests/simulation/skills.test.ts tests/app/game-session.test.ts`

Expected: missing bonus properties, flags, and effects.

- [ ] **Step 5: Implement the three effects at their owning layers**

In `basicAttack`, after incrementing `basicAttackCount`, apply `Math.round(source.attack * gearThunderbrand)` true damage every fourth hit. In `applyDamage`, preserve 1 HP and add `maxHp * gearCloudveil` shield on the first lethal hit. At the end of `tryCastSkill`, grant `maxHp * gearStormward` shield once.

- [ ] **Step 6: Reset and preserve per-wave flags**

Initialize all five flags in `createGearFlags`, preserve used flags in `applyGearFlags`, and reset `gearCloudveilUsed` plus `gearStormwardUsed` in `advanceWave`.

- [ ] **Step 7: Map trait IDs in `GameSession`**

```ts
if (item.traitId === "thunderbrand") bonus.thunderbrandPct = 0.35;
if (item.traitId === "cloudveil") bonus.cloudveilShieldPct = 0.12;
if (item.traitId === "stormward") bonus.stormwardShieldPct = 0.1;
```

- [ ] **Step 8: Run the focused simulation tests until GREEN**

Run: `npm run test:run -- --run tests/simulation/combat.test.ts tests/simulation/battle.test.ts tests/simulation/skills.test.ts tests/app/game-session.test.ts`

Expected: all listed test files pass.

### Task 4: Generate and normalize 12 Stormsea icons

**Files:**
- Create: `docs/art/generated/equipment/stormsea-prompts.md`
- Create locally: `docs/art/generated/equipment/chroma/<id>_source_v01.png` for 12 IDs
- Create: `docs/art/generated/equipment/master/<id>_master_v01.png` for 12 IDs
- Create: `docs/art/generated/equipment/previews/<id>_preview_v01.png` for 12 IDs
- Create: `public/assets/equipment/<id>.webp` for 12 IDs
- Modify: `scripts/art/process_equipment_assets.py`
- Modify: `scripts/art/test_process_equipment_assets.py`
- Modify/Create: equipment review contact sheets

**Interfaces:**
- Produces: 60 validated runtime equipment icons and Stormsea-only review sheets.

- [ ] **Step 1: Change the processor test to expect 60 items and 12 chapter-four IDs**

```py
self.assertEqual(len(processor.load_item_ids()), 60)
stormsea = processor.load_chapter_item_ids(4)
self.assertEqual(len(stormsea), 12)
```

- [ ] **Step 2: Run the processor test and verify RED**

Run: `python3 -m unittest scripts.art.test_process_equipment_assets`

Expected: chapter-four manifest is empty and total count is 48.

- [ ] **Step 3: Record and generate one prompt per approved item**

Use the existing 48-item sheet plus the character-style reference, a uniform `#ff00ff` background, one item per generation, thick rounded dark-brown outlines, and the exact silhouettes from the design spec.

- [ ] **Step 4: Extend the processor to chapter four and 60-item validation**

Allow chapter regex `[1234]`, validate 60 total IDs and 12 Stormsea IDs, and produce `stormsea-equipment-contact-sheet.png` plus `stormsea-equipment-small-contact-sheet.png`.

- [ ] **Step 5: Process all sources and validate**

Run: `python3 scripts/art/process_equipment_assets.py`

Expected: `Equipment validation: 60/60 masters, runtime assets, and previews passed.`

- [ ] **Step 6: Inspect both Stormsea sheets**

Confirm all 12 silhouettes remain distinct at 42 px and no subject touches the canvas edge.

### Task 5: Verify, commit, and publish

**Files:**
- Stage only files created or modified by this plan; preserve unrelated dirty worktree content.

**Interfaces:**
- Consumes: completed code, tests, art assets, and existing Sites project metadata.
- Produces: one verified implementation commit and one successful Sites production deployment.

- [ ] **Step 1: Run asset and processor validation**

Run: `python3 -m unittest scripts.art.test_process_equipment_assets && python3 scripts/art/process_equipment_assets.py --validate`

- [ ] **Step 2: Run all automated verification**

Run: `npm run test:run && npm run build && npm run test:e2e`

- [ ] **Step 3: Inspect and commit only the Stormsea change set**

Run `git diff --cached --check`, confirm unrelated user files are unstaged, and commit with message `Add playable Stormsea equipment chapter`.

- [ ] **Step 4: Publish the validated commit**

Push the exact implementation commit to the existing Sites source branch, package the successful build, save one new version, use private deployment, and poll to terminal success.
