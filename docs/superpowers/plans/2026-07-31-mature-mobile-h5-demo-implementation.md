# Mature Mobile H5 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build and deploy the approved one-chapter, eight-hero, mobile-first H5 idle RPG Demo with complete battle presentation, equipment, skills, progression, offline rewards, and interactive UI.

**Architecture:** Serializable TypeScript simulation and player state remain independent of Phaser and DOM. Phaser renders `BattleSnapshot` data and one-shot events; DOM UI dispatches typed actions through `GameStore`; `SaveRepository` persists only schema-validated player data.

**Tech Stack:** Phaser 3.90.0, TypeScript 7.0.2 strict mode, Vite 8.2.0, `@vitejs/plugin-legacy` 8.2.2, Vitest 4.1.10, Playwright 1.62.1, native DOM/CSS, localStorage, SVG, Web Audio API.

## Global Constraints

- Authoritative spec: `docs/superpowers/specs/2026-07-31-mature-mobile-h5-demo-design.md`.
- Mobile portrait H5 first; verify 360 × 640, 390 × 844, and 430 × 932.
- Preserve the approved battle/topbar/nameplates/panel/bottom-nav layout.
- Use Phaser only for the battlefield and effects; use DOM for text-heavy UI.
- Keep all simulation rules outside Phaser scenes.
- Use complete independent SVG assets; no runtime SVG-part animation.
- No React, server, login, payment, ads, social, or copied game assets.
- Use TDD for simulation, persistence, progression, store actions, and data generation.
- Run unit tests after every task and browser smoke tests after every visible milestone.
- This directory is not a Git repository; omit commit steps until repository initialization is explicitly requested.

---

### Task 1: Scaffold the typed mobile H5 shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `playwright.config.ts`
- Create: `src/main.ts`
- Create: `src/styles/theme.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/components.css`
- Create: `tests/setup.ts`

**Interfaces:**
- Produces `#app`, `.game-shell`, `#battle-canvas`, `#dom-ui`, and a Vite entry.
- Produces scripts `dev`, `build`, `test`, `test:run`, and `test:e2e`.

- [x] **Step 1: Create dependency and script declarations**

```json
{
  "name": "idle-squad-h5-demo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "phaser": "3.90.0"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@types/node": "26.1.2",
    "@vitejs/plugin-legacy": "8.2.2",
    "typescript": "7.0.2",
    "vite": "8.2.0",
    "jsdom": "29.1.1",
    "vitest": "4.1.10"
  }
}
```

- [x] **Step 2: Install dependencies**

Run: `npm install`
Expected: exit 0 and `package-lock.json` created.

- [x] **Step 3: Create strict compiler, Vite legacy, and Vitest configuration**

```ts
// vite.config.ts
import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [legacy({ targets: ["iOS >= 14", "Chrome >= 90"] })],
  build: { target: "es2018" },
});

// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", setupFiles: ["tests/setup.ts"] },
});
```

- [x] **Step 4: Create the safe-area mobile shell**

```html
<main id="app">
  <section class="game-shell" aria-label="五人小队放置 RPG">
    <div id="battle-canvas"></div>
    <div id="dom-ui"></div>
  </section>
</main>
```

- [x] **Step 5: Verify the empty shell**

Run: `npm run build`
Expected: TypeScript and Vite exit 0 and `dist/index.html` exists.

### Task 2: Define domain types and deterministic content

**Files:**
- Create: `src/app/events.ts`
- Create: `src/app/actions.ts`
- Create: `src/content/heroes.ts`
- Create: `src/content/skills.ts`
- Create: `src/content/enemies.ts`
- Create: `src/content/stages.ts`
- Create: `src/content/items.ts`
- Create: `src/content/shop.ts`
- Create: `src/simulation/types.ts`
- Create: `src/simulation/RandomSource.ts`
- Test: `tests/content/content.test.ts`
- Test: `tests/simulation/random.test.ts`

**Interfaces:**
- Produces `HeroDefinition`, `SkillDefinition`, `EnemyDefinition`, `StageDefinition`, `InventoryItem`, `GameAction`, `GameEvent`, and `SeededRandom`.
- All IDs and values exactly match the approved spec.

- [x] **Step 1: Write failing content completeness tests**

```ts
import { describe, expect, it } from "vitest";
import { HERO_DEFINITIONS } from "../../src/content/heroes";
import { STAGE_DEFINITIONS } from "../../src/content/stages";

describe("content", () => {
  it("ships eight unique heroes", () => {
    expect(HERO_DEFINITIONS).toHaveLength(8);
    expect(new Set(HERO_DEFINITIONS.map((hero) => hero.id)).size).toBe(8);
  });

  it("ships twelve playable chapter stages", () => {
    expect(STAGE_DEFINITIONS).toHaveLength(12);
    expect(STAGE_DEFINITIONS[11].id).toBe("1-12");
  });
});
```

- [x] **Step 2: Run tests and verify missing modules fail**

Run: `npm run test:run -- tests/content/content.test.ts`
Expected: FAIL because content modules do not exist.

- [x] **Step 3: Implement exact typed definitions**

```ts
export type HeroId = "H01" | "H02" | "H03" | "H04" | "H05" | "H06" | "H07" | "H08";
export type TargetStrategy =
  | "nearestEnemy"
  | "lowestHpEnemy"
  | "lowestHpAlly"
  | "frontmostEnemy";
```

Implement the complete content manifest from the approved spec: all eight heroes, eight active skills, eight passives, five enemies, twelve stages, twelve equipment bases, nine equipment traits, shop configuration, typed actions, and typed events. Add count, ID uniqueness, cross-reference, and numeric-range assertions so omissions fail tests.

- [x] **Step 4: Write deterministic random tests**

```ts
it("replays the same sequence from the same seed", () => {
  const left = new SeededRandom(42);
  const right = new SeededRandom(42);
  expect([left.next(), left.next(), left.next()]).toEqual([
    right.next(),
    right.next(),
    right.next(),
  ]);
});
```

- [x] **Step 5: Implement `SeededRandom`**

```ts
export interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
}
```

Use a 32-bit Mulberry generator and validate that `pick` rejects an empty array.

- [x] **Step 6: Run content and random tests**

Run: `npm run test:run -- tests/content tests/simulation/random.test.ts`
Expected: all tests pass.

### Task 3: Implement movement, targeting, combat, status, and skills

**Files:**
- Create: `src/simulation/TargetingSystem.ts`
- Create: `src/simulation/MovementSystem.ts`
- Create: `src/simulation/CombatSystem.ts`
- Create: `src/simulation/StatusSystem.ts`
- Create: `src/simulation/SkillSystem.ts`
- Test: `tests/simulation/targeting.test.ts`
- Test: `tests/simulation/movement.test.ts`
- Test: `tests/simulation/combat.test.ts`
- Test: `tests/simulation/status.test.ts`
- Test: `tests/simulation/skills.test.ts`

**Interfaces:**
- `selectTarget(unit, units, strategy): UnitState | null`
- `advanceMovement(units, deltaMs): GameEvent[]`
- `resolveBasicAttack(source, target, random): AttackResult`
- `advanceStatuses(unit, deltaMs): void`
- `tryCastSkill(unit, battle, definitions, random): GameEvent[]`

- [x] **Step 1: Write failing targeting and range tests**

```ts
it("stops a ranged hero at its attack range", () => {
  const hero = unit({ x: 100, attackRange: 280, moveSpeed: 100 });
  const enemy = unit({ id: "enemy", team: "enemies", x: 500 });
  advanceMovement([hero, enemy], 1000);
  expect(Math.abs(enemy.x - hero.x)).toBeGreaterThanOrEqual(280);
});
```

- [x] **Step 2: Implement targeting and fixed-step movement**

Movement uses horizontal distance only, prevents enemy/hero visual penetration, and ignores dead units.

- [x] **Step 3: Write failing damage, shield, critical, and healing tests**

```ts
it("consumes shield before hp", () => {
  const result = applyDamage(unit({ hp: 100, shield: 30 }), 50);
  expect(result.hp).toBe(80);
  expect(result.shield).toBe(0);
});
```

- [x] **Step 4: Implement combat formulas from the spec**

Use injected random variance, 1.5× criticals, shield-first damage, and post-defense damage reduction.

- [x] **Step 5: Write and implement four status tests**

Verify stun blocks movement/attacks, slow affects movement/interval, haste affects interval, and stronger same-kind status refreshes duration.

- [x] **Step 6: Write one result test for every active and passive skill**

Use table-driven tests keyed by H01–H08. Assert target IDs, damage or healing values, status results, and cooldown reset.

- [x] **Step 7: Implement eight active skills and eight passives**

Keep skill resolution pure: return state changes and events; do not create Phaser effects.

- [x] **Step 8: Run simulation system tests**

Run: `npm run test:run -- tests/simulation`
Expected: all targeting, movement, combat, status, and skill tests pass.

### Task 4: Implement battle state machine, waves, rewards, and progression

**Files:**
- Create: `src/simulation/BattleSimulation.ts`
- Create: `src/simulation/WaveSystem.ts`
- Create: `src/simulation/RewardSystem.ts`
- Create: `src/progression/progression.ts`
- Create: `src/progression/equipment.ts`
- Test: `tests/simulation/battle.test.ts`
- Test: `tests/simulation/waves.test.ts`
- Test: `tests/progression/progression.test.ts`
- Test: `tests/progression/equipment.test.ts`

**Interfaces:**
- `BattleSimulation.step(deltaMs): readonly GameEvent[]`
- `BattleSimulation.getSnapshot(): BattleSnapshot`
- `createWave(stage, waveIndex, random): EnemySpawn[]`
- `createLoot(stage, enemyKind, random): RewardBundle`
- `getHeroStats(hero, level, equipment): DerivedHeroStats`
- `generateEquipment(stage, random, forcedRarity?): InventoryItem`

- [x] **Step 1: Write failing three-wave and victory tests**

```ts
it("wins only after clearing the boss wave", () => {
  const battle = createDeterministicBattle({ stage: 1 });
  battle.debugKillWave();
  expect(battle.getSnapshot().waveIndex).toBe(2);
  battle.debugKillWave();
  battle.debugKillWave();
  expect(battle.drainEvents()).toContainEqual(
    expect.objectContaining({ type: "stage:won", stage: 1 }),
  );
});
```

- [x] **Step 2: Implement the battle state machine**

Implement `waveIntro`, `advancing`, `engaging`, `waveClear`, `bossIntro`, `victory`, `defeat`, `stageTransition`, and `retry`.

- [x] **Step 3: Write failing deterministic wave composition tests**

Assert enemy unlock stages, elite arrival at stage 4, and boss adds at stages 7 and 10.

- [x] **Step 4: Implement stage scaling and wave generation**

Use the exact formulas and counts in the spec.

- [x] **Step 5: Write failing progression and equipment tests**

Assert hero level 20 cap, exact level 2 values, rarity budgets, trait eligibility, drop rates under a scripted random source, and item scoring.

- [x] **Step 6: Implement progression, loot, and reward generation**

Use unique deterministic instance IDs derived from seed and reward sequence.

- [x] **Step 7: Run battle and progression tests**

Run: `npm run test:run -- tests/simulation tests/progression`
Expected: all tests pass.

### Task 5: Implement save schema, store actions, shop, summon, and offline rewards

**Files:**
- Create: `src/persistence/schema.ts`
- Create: `src/persistence/migrations.ts`
- Create: `src/persistence/SaveRepository.ts`
- Create: `src/app/GameStore.ts`
- Create: `src/app/GameApp.ts`
- Create: `src/progression/shop.ts`
- Create: `src/progression/summon.ts`
- Create: `src/progression/offline.ts`
- Test: `tests/persistence/save.test.ts`
- Test: `tests/app/store.test.ts`
- Test: `tests/progression/meta.test.ts`

**Interfaces:**
- `createDefaultSave(now): SaveDataV1`
- `repairSave(input, now): SaveDataV1`
- `SaveRepository.load(): LoadResult`
- `SaveRepository.scheduleSave(data): void`
- `GameStore.dispatch(action): DispatchResult`
- `createDailyShop(save, dateKey, random): ShopState`
- `resolveSummon(save, count, random): SummonResult`
- `calculateOfflineRewards(save, now, random): OfflineReward`

- [x] **Step 1: Write failing default, repair, overflow, and debounce tests**

```ts
it("creates the approved default roster and party", () => {
  const save = createDefaultSave(1000);
  expect(save.gems).toBe(300);
  expect(save.party).toEqual(["H01", "H02", "H03", "H04", "H05"]);
  expect(save.roster.H07.unlocked).toBe(false);
});
```

- [x] **Step 2: Implement schema validation and migration**

Repair missing IDs, remove duplicate party members, clamp levels, preserve valid inventory, and fall back to defaults on unrepairable data.

- [x] **Step 3: Implement 500 ms debounced localStorage persistence**

Flush immediately on stage result and `visibilitychange`; switch to in-memory mode and emit `save:failed` if localStorage throws.

- [x] **Step 4: Write failing store mutation-boundary tests**

Assert party save resets stage, level/equipment updates preserve live HP ratio, and stage select resets to wave 1.

- [x] **Step 5: Implement `GameStore` and `GameApp` orchestration**

`GameApp` owns the fixed-step accumulator, BattleSimulation, renderer bridge, DOM shell, and visibility lifecycle.

- [x] **Step 6: Write and implement meta-loop tests**

Test H07/H08 fixed summon sequence, duplicate marks, daily shop offers, sold state, free refresh, offline 5-minute minimum, 8-hour cap, and deterministic equipment rewards.

- [x] **Step 7: Run persistence, store, and meta tests**

Run: `npm run test:run -- tests/persistence tests/app tests/progression`
Expected: all tests pass.

### Task 6: Create the SVG asset pack and Phaser bridge

**Files:**
- Create: `src/assets/manifest.ts`
- Create: `public/assets/svg/backgrounds/ch1-sky.svg`
- Create: `public/assets/svg/backgrounds/ch1-hills.svg`
- Create: `public/assets/svg/backgrounds/ch1-ground.svg`
- Create: `public/assets/svg/backgrounds/ch1-props.svg`
- Create: `public/assets/svg/heroes/h01-lorne.svg` through `h08-haize.svg`
- Create: `public/assets/svg/enemies/e01-sprout.svg` through `b01-ancient-tree.svg`
- Create: `public/assets/svg/items/weapon.svg`
- Create: `public/assets/svg/items/armor.svg`
- Create: `public/assets/svg/items/accessory.svg`
- Create: `src/phaser/PhaserGame.ts`
- Create: `src/phaser/BootScene.ts`
- Create: `src/phaser/BattleScene.ts`
- Create: `src/phaser/SceneBridge.ts`
- Create: `src/phaser/views/UnitView.ts`
- Create: `src/phaser/views/EffectsView.ts`
- Test: `tests/assets/manifest.test.ts`
- Test: `tests/phaser/bridge.test.ts`

**Interfaces:**
- `ASSET_MANIFEST` maps every content ID to a stable texture key and URL.
- `SceneBridge.sync(snapshot, events): void` creates, updates, and removes views.

- [x] **Step 1: Write failing asset coverage tests**

```ts
it("maps every hero and enemy to one SVG", () => {
  expect(Object.keys(ASSET_MANIFEST.heroes)).toHaveLength(8);
  expect(Object.keys(ASSET_MANIFEST.enemies)).toHaveLength(5);
});
```

- [x] **Step 2: Draw four layered backgrounds, eight heroes, and five enemies**

Each SVG uses a 128 × 128 or scene-appropriate viewBox, thick `#2F2925` outlines, flat colors, no text, no copied silhouettes, and at most 80 visible nodes.

- [x] **Step 3: Implement BootScene manifest loading**

Load SVGs with stable keys and explicit texture sizes. Report progress to a DOM loading indicator.

- [x] **Step 4: Write failing SceneBridge lifecycle tests**

Use a fake view factory to assert one create, update, and remove call for snapshot changes and one effect call per event ID.

- [x] **Step 5: Implement the snapshot/event bridge**

Maintain `Map<UnitId, UnitView>`, interpolate positions, and deduplicate one-shot events.

- [x] **Step 6: Implement whole-sprite animation and effects**

Add walking bob, attack lunge, projectiles, hit flash, skill telegraphs, death fade, boss intro, damage numbers, and reduced-motion variants without reading SVG internals.

- [x] **Step 7: Run asset and bridge tests**

Run: `npm run test:run -- tests/assets tests/phaser`
Expected: all tests pass.

### Task 7: Build the persistent combat HUD and mobile layout

**Files:**
- Create: `src/ui/AppShell.ts`
- Create: `src/ui/BattleHUD.ts`
- Create: `src/ui/PartyNameplates.ts`
- Create: `src/ui/uiTypes.ts`
- Modify: `src/styles/layout.css`
- Modify: `src/styles/components.css`
- Test: `tests/ui/hud.test.ts`

**Interfaces:**
- `AppShell.mount(root, store): AppShell`
- `BattleHUD.render(viewModel): void`
- `PartyNameplates.render(party): void`

- [x] **Step 1: Write failing DOM structure tests**

Use a minimal DOM test environment to assert topbar, battle mount, five nameplates, active panel, and four navigation buttons with labels.

- [x] **Step 2: Implement the approved vertical hierarchy**

Use CSS Grid rows for topbar, playfield, nameplates, management panel, and bottom nav. Apply safe-area padding and 44 px tap targets.

- [x] **Step 3: Implement live HUD and nameplate rendering**

Render stage, currencies, wave/Boss status, 1×/2×, full-card HP fills, critical color, death state, cooldown ring, click, and long-press summary.

- [x] **Step 4: Add mobile responsive and landscape guard CSS**

Verify no horizontal scrolling at 360 px and center the 430 px shell on desktop.

- [x] **Step 5: Run HUD tests and build**

Run: `npm run test:run -- tests/ui/hud.test.ts && npm run build`
Expected: tests and build pass.

### Task 8: Build inventory, item comparison, and equipment interactions

**Files:**
- Create: `src/ui/InventoryPanel.ts`
- Create: `src/ui/ItemDetailSheet.ts`
- Create: `src/ui/HeroEquipSheet.ts`
- Test: `tests/ui/inventory.test.ts`
- Test: `tests/app/equipment-flow.test.ts`

**Interfaces:**
- Inventory filters and sorts store-local UI state.
- Equip actions dispatch `item:equip` and receive updated comparison data.

- [x] **Step 1: Write failing inventory render and filter tests**

Assert capacity, overflow notice, rarity/slot filters, score sorting, stronger-item red dot, and disabled empty states.

- [x] **Step 2: Implement inventory grid and item detail sheet**

Render icon, rarity, score, stats, trait, equipped marker, current comparison, recommended heroes, and accessible close behavior.

- [x] **Step 3: Write failing equip-flow integration tests**

Assert chosen item equips once, replaced item returns to inventory, current HP ratio is retained, and auto-equip chooses the highest same-slot score.

- [x] **Step 4: Implement hero selection and equip feedback**

Add value-change summary, item fly animation target, short vibration where supported, and red-dot reconciliation.

- [x] **Step 5: Run inventory and equipment tests**

Run: `npm run test:run -- tests/ui/inventory.test.ts tests/app/equipment-flow.test.ts`
Expected: all tests pass.

### Task 9: Build shop, hero progression, stages, formation, summon, and settings

**Files:**
- Create: `src/ui/ShopPanel.ts`
- Create: `src/ui/HeroPanel.ts`
- Create: `src/ui/ChapterPanel.ts`
- Create: `src/ui/FormationEditor.ts`
- Create: `src/ui/HeroPickerSheet.ts`
- Create: `src/ui/SummonModal.ts`
- Create: `src/ui/OfflineRewardModal.ts`
- Create: `src/ui/SettingsModal.ts`
- Create: `src/ui/TutorialOverlay.ts`
- Test: `tests/ui/meta-panels.test.ts`
- Test: `tests/app/meta-flows.test.ts`

**Interfaces:**
- Every panel mounts into AppShell’s management/modal layers.
- All persistent changes use typed GameActions.

- [x] **Step 1: Write failing panel-state tests**

Assert shop sold/insufficient states, hero locked/max-level states, chapter locked/current states, legal formation save, summon return context, offline claim, settings, and five-step tutorial.

- [x] **Step 2: Implement shop and hero panels**

Provide real purchases, free refresh, attributes, equipment, skills, level-up cost, level cap, silhouettes, and unlock copy.

- [x] **Step 3: Implement chapter and formation flows**

Add stage confirmation, immediate stage reset, five equal slots, duplicate prevention, at-least-one validation, hero picker sheet, and save reset feedback.

- [x] **Step 4: Implement summon, offline, settings, and tutorial modals**

Battle simulation continues under overlays; prevent pointer-through; restore prior context on close; use fixed Demo summon disclosure.

- [x] **Step 5: Run meta panel and flow tests**

Run: `npm run test:run -- tests/ui/meta-panels.test.ts tests/app/meta-flows.test.ts`
Expected: all tests pass.

### Task 10: Add audio, debug tools, battle reward presentation, and completion state

**Files:**
- Create: `src/audio/AudioManager.ts`
- Create: `src/debug/DebugOverlay.ts`
- Modify: `src/phaser/views/EffectsView.ts`
- Modify: `src/ui/BattleHUD.ts`
- Modify: `src/app/GameApp.ts`
- Test: `tests/audio/audio.test.ts`
- Test: `tests/debug/debug.test.ts`

**Interfaces:**
- `AudioManager.handle(event): void` maps events to throttled sound cues.
- DebugOverlay dispatches debug-only actions and never changes schema.

- [x] **Step 1: Write failing audio throttle and hidden-page tests**

Assert same cue coalesces within 80 ms, disabled sound produces no calls, and page-hidden state mutes output.

- [x] **Step 2: Implement gesture-unlocked Web Audio cues**

Generate lightweight attack, hit, skill, heal, loot, win, lose, and click cues; silently degrade when AudioContext is unavailable.

- [x] **Step 3: Implement victory, defeat, loot flight, and Demo-complete sequences**

Follow the exact timing order in the spec and add reduced-motion timing.

- [x] **Step 4: Implement `?debug=1` overlay**

Expose FPS, step cost, seed, positions, ranges, targets, cooldowns, wave, state, and approved mutation buttons.

- [x] **Step 5: Run audio/debug tests and the full suite**

Run: `npm run test:run`
Expected: all unit and integration tests pass.

### Task 11: Add end-to-end mobile browser coverage

**Files:**
- Create: `tests/e2e/boot.spec.ts`
- Create: `tests/e2e/combat.spec.ts`
- Create: `tests/e2e/inventory.spec.ts`
- Create: `tests/e2e/formation.spec.ts`
- Create: `tests/e2e/meta.spec.ts`
- Create: `tests/e2e/persistence.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Playwright starts `npm run dev -- --host 127.0.0.1`.
- Debug actions make battle outcomes deterministic.

- [x] **Step 1: Configure mobile and desktop projects**

Use viewports 360×640, 390×844, 430×932, and 1440×900 with touch enabled on mobile projects.

- [x] **Step 2: Test boot and continuous combat**

Assert battle starts within 3 seconds, units move, three waves advance, victory moves to the next stage, defeat retries, and speed 2× preserves order.

- [x] **Step 3: Test every management flow**

Exercise inventory/equip, hero upgrade, formation change, summon H07/H08, shop purchase/refresh, stage select, offline claim, settings, and tutorial completion.

- [x] **Step 4: Test persistence and responsive constraints**

Reload after state changes, assert no horizontal overflow, assert safe-area variables, verify tap targets, and assert no unhandled console errors.

- [x] **Step 5: Run all E2E tests**

Run: `npx playwright install chromium && npm run test:e2e`
Expected: all projects pass.

### Task 12: Optimize, verify, and prepare production deployment

**Files:**
- Modify: `vite.config.ts`
- Create: `.openai/hosting.json` only through the Sites workflow
- Create: `README.md`

**Interfaces:**
- Produces a static `dist/` build and deployed production URL.

- [x] **Step 1: Add production asset and chunk policy**

Split Phaser into a vendor chunk, keep SVGs cacheable, and preserve legacy output.

- [x] **Step 2: Run complete verification**

Run:

```bash
npm run test:run
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [x] **Step 3: Inspect bundle and asset budgets**

Verify app JS + CSS excluding Phaser is below 1.5 MB compressed, SVG node counts are at most 80, and production console has no errors.

- [x] **Step 4: Perform screenshot-based mobile playtest**

Capture and inspect battle, inventory, formation, summon, and chapter screens at 390×844 plus the smallest 360×640 viewport.

- [x] **Step 5: Write delivery documentation**

Document local commands, system boundaries, save reset, debug mode, supported browsers, implemented content, and known non-goals.

- [x] **Step 6: Deploy the exact verified source through Sites**

Create or reuse the Sites project, push the exact source state, save a version, deploy that saved version, and wait for terminal success.
