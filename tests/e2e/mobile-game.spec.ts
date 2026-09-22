import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

async function skipTutorial(page: import("@playwright/test").Page) {
  const skip = page.getByRole("button", { name: "跳过" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

async function completeStageWithDebug(page: import("@playwright/test").Page) {
  const battleSignature = async () => {
    const text = await page.locator(".debug-overlay").textContent();
    return [
      text?.match(/关卡\s+(\d+)/)?.[1] ?? "",
      text?.match(/进度\s+(\d+)%/)?.[1] ?? "",
      text?.match(/状态\s+(\w+)/)?.[1] ?? "",
      text?.match(/敌人\s+(\d+)/)?.[1] ?? "",
    ].join(":");
  };
  const stageChip = page.locator(".stage-chip");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await stageChip.textContent())?.includes("1-2")) return;
    const previousSignature = await battleSignature();
    await page.getByRole("button", { name: "清除敌人" }).click();
    await expect.poll(async () =>
      (await stageChip.textContent())?.includes("1-2")
        ? "stage-complete"
        : battleSignature(),
    ).not.toBe(previousSignature);
  }
  await expect(stageChip).toContainText("1-2");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await skipTutorial(page);
});

test("boots a live battle and keeps the approved mobile hierarchy", async ({ page }) => {
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".boss-meter-label")).toContainText("讨伐进度");
  await expect(page.locator(".party-strip .party-member-tab")).toHaveCount(5);
  await expect(page.locator(".bottom-nav button")).toHaveCount(5);
  const dimensions = await page.evaluate(() => {
    const shell = document.querySelector(".game-shell");
    const app = document.querySelector("#app");
    const stage = document.querySelector("#fit-stage");
    return {
      viewport: document.documentElement.clientWidth,
      shellVisual: shell?.getBoundingClientRect().width ?? 0,
      appLayout: app?.clientWidth ?? 0,
      scaled: stage?.classList.contains("fit-stage--scaled") ?? false,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(dimensions.overflow).toBe(0);
  if (dimensions.viewport <= 430) {
    expect(dimensions.scaled).toBe(false);
    expect(dimensions.shellVisual).toBeLessThanOrEqual(430);
  } else {
    expect(dimensions.scaled).toBe(true);
    expect(dimensions.appLayout).toBe(430);
    expect(dimensions.shellVisual).toBeGreaterThan(430);
    expect(dimensions.shellVisual).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

test("all four management pages remain interactive over continuous combat", async ({ page }) => {
  const pages = [
    ["商店", '[data-panel="shop"]'],
    ["英雄", '[data-panel="heroes"]'],
    ["关卡", '[data-panel="stages"]'],
    ["背包", '[data-panel="inventory"]'],
  ] as const;
  for (const [label, panel] of pages) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(panel)).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
  }
});

test("reset workbench supports quick toggling without overlapping its controls", async ({ page }, testInfo) => {
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.materials.mat_reset_scroll = 9;
  save.inventory.push({
    instanceId: "reset-layout-gear",
    definitionId: "armor_guard_mail",
    slot: "armor",
    rarity: "rare",
    stage: 10,
    stats: { defense: 14, maxHp: 257 },
    affixes: [{ affixId: "cooldown_reduction", value: 3 }],
    traitId: null,
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: "idle-rpg-save-v1", value: JSON.stringify(save) },
  );
  await page.reload();

  await page.getByRole("button", { name: "炼金", exact: true }).click();
  await page.locator('[data-action="craft-mode-toggle"]').click();
  await page.locator('[data-action="craft-mode-select"][data-mode="reset"]').click();
  const listItem = page.locator('[data-action="craft-item-select"][data-item-id="reset-layout-gear"]');
  await listItem.click();

  const workbench = page.locator(".craft-workbench-reset");
  const layout = await workbench.evaluate((element) => {
    const target = element.querySelector<HTMLElement>(".craft-target")!;
    const picker = element.querySelector<HTMLElement>(".craft-reset-pick")!;
    const targetRect = target.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    return {
      gap: pickerRect.top - targetRect.bottom,
      pickerBackground: getComputedStyle(picker).backgroundColor,
      panelBackground: getComputedStyle(document.querySelector<HTMLElement>(".content-panel")!).backgroundColor,
      cost: element.querySelector(".craft-reset-cost .craft-socket-cost-count")?.textContent ?? "",
      costWidth: element.querySelector<HTMLElement>(".craft-reset-cost")?.getBoundingClientRect().width ?? 0,
      actionWidth: element.querySelector<HTMLElement>('[data-action="craft-reset"]')?.getBoundingClientRect().width ?? 0,
      footer: element.querySelector(".craft-reset-footer")?.textContent ?? "",
    };
  });
  const pickerChannels = layout.pickerBackground.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
  const panelChannels = layout.panelBackground.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
  expect(layout.gap).toBeGreaterThanOrEqual(4);
  expect(pickerChannels.reduce((sum, channel) => sum + channel, 0)).toBeLessThan(300);
  expect(panelChannels.reduce((sum, channel) => sum + channel, 0)).toBeGreaterThan(500);
  expect(layout.cost).toBe("9/1");
  expect(layout.actionWidth).toBeGreaterThan(layout.costWidth);
  expect(layout.footer).not.toContain("×9");

  const screenshotPath = testInfo.outputPath("alchemy-reset-workbench.png");
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach("alchemy reset workbench", { path: screenshotPath, contentType: "image/png" });

  await page.locator('.craft-target[data-action="craft-item-remove"]').click();
  await expect(workbench.locator(".craft-target.empty")).toBeVisible();
  await expect(listItem).toHaveAttribute("aria-pressed", "false");
});

test("set imprint selection stays compact and confirms from the workbench", async ({ page }, testInfo) => {
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.setEssences.set_moss_crown = 4;
  save.materials.mat_set_inscription = 1;
  save.inventory.push({
    instanceId: "imprint-layout-gear",
    definitionId: "weapon_guard_blade",
    slot: "main_weapon",
    rarity: "rare",
    stage: 10,
    stats: { attack: 24 },
    affixes: [{ affixId: "flat_attack", value: 5 }],
    traitId: null,
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: "idle-rpg-save-v1", value: JSON.stringify(save) },
  );
  await page.reload();

  await page.getByRole("button", { name: "炼金", exact: true }).click();
  await page.locator('[data-action="craft-mode-toggle"]').click();
  await page.locator('[data-action="craft-mode-select"][data-mode="imprint"]').click();
  await page.locator('[data-action="craft-item-select"][data-item-id="imprint-layout-gear"]').click();
  await page.locator('[data-action="craft-imprint-request"]').click();

  const modal = page.locator(".set-imprint-picker-modal");
  await expect(modal).toBeVisible();
  const layout = await modal.evaluate((element) => {
    const modalRect = element.getBoundingClientRect();
    const optionHeights = [...element.querySelectorAll<HTMLElement>(".set-imprint-option")]
      .map((option) => option.getBoundingClientRect().height);
    const main = document.querySelector<HTMLElement>("main");
    const scale = main && main.clientWidth > 0 ? main.getBoundingClientRect().width / main.clientWidth : 1;
    return {
      modalTop: modalRect.top,
      modalBottom: modalRect.bottom,
      viewportHeight: document.documentElement.clientHeight,
      maxOptionLayoutHeight: Math.max(...optionHeights) / scale,
    };
  });
  expect(layout.modalTop).toBeGreaterThanOrEqual(0);
  expect(layout.modalBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.maxOptionLayoutHeight).toBeLessThanOrEqual(60);

  await page.locator('[data-action="craft-set-select"][data-set-id="set_moss_crown"]').click();
  await expect(page.locator(".set-imprint-description")).toContainText("苔冠守望");
  await expect(page.locator(".set-imprint-description")).toContainText("2件");
  await expect(page.locator('.set-imprint-picker-modal [data-action="craft-imprint-confirm"]')).toHaveCount(0);

  const pickerScreenshotPath = testInfo.outputPath("set-imprint-picker.png");
  await page.screenshot({ path: pickerScreenshotPath });
  await testInfo.attach("set imprint picker", { path: pickerScreenshotPath, contentType: "image/png" });

  await page.getByRole("button", { name: "返回炼金台", exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator(".craft-imprint-set.selected")).toContainText("苔冠守望");
  await expect(page.locator(".craft-imprint-footer .set-imprint-materials")).toContainText("4/4");
  await expect(page.locator('[data-action="craft-imprint-confirm"]')).toBeEnabled();

  const workbenchScreenshotPath = testInfo.outputPath("set-imprint-workbench.png");
  await page.screenshot({ path: workbenchScreenshotPath });
  await testInfo.attach("set imprint workbench", { path: workbenchScreenshotPath, contentType: "image/png" });
});

test("opens hero detail, summon, stage, and settings flows", async ({ page }) => {
  await page.locator(".party-strip .party-member-tab[data-hero-id]").first().click();
  await expect(page.getByRole("dialog")).toContainText("英雄属性");
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "英雄", exact: true }).click();
  await page.getByRole("button", { name: "召唤英雄" }).click();
  await expect(page.getByRole("dialog")).toContainText("Demo 固定解锁序列");
  await page.getByRole("button", { name: "返回" }).click();

  await page.getByRole("button", { name: "游戏设置" }).click();
  await expect(page.getByRole("dialog")).toContainText("减弱动效");
});

test("difficulty selector fits the viewport and starts the chosen mode", async ({ page }, testInfo) => {
  const save = createDefaultSave(Date.now());
  save.highestUnlockedStage = 120;
  save.highestClearedStage = 120;
  save.difficultyProgress.easy = { highestUnlockedStage: 120, highestClearedStage: 120 };
  save.difficultyProgress.hard = { highestUnlockedStage: 120, highestClearedStage: 120 };
  save.difficultyProgress.nightmare = { highestUnlockedStage: 120, highestClearedStage: 120 };
  save.difficultyProgress.hell = { highestUnlockedStage: 120, highestClearedStage: 120 };
  save.tutorialCompleted = true;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: "idle-rpg-save-v1", value: JSON.stringify(save) },
  );
  await page.reload();

  await page.getByRole("button", { name: "关卡", exact: true }).click();
  const difficultySelect = page.locator('[data-action="stages-difficulty-select"]');
  await expect(difficultySelect.locator("option")).toHaveCount(5);
  await difficultySelect.selectOption("torment");
  const selectorScreenshotPath = testInfo.outputPath("difficulty-campaign-selector.png");
  await page.screenshot({ path: selectorScreenshotPath });
  await testInfo.attach("difficulty campaign selector", {
    path: selectorScreenshotPath,
    contentType: "image/png",
  });
  await page.locator('[data-action="stage-select"][data-stage="1"]').click();
  const modal = page.locator(".difficulty-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".difficulty-stage-summary")).toContainText("折磨");
  const layout = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      viewportHeight: document.documentElement.clientHeight,
      width: rect.width,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);

  const screenshotPath = testInfo.outputPath("difficulty-selector.png");
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach("difficulty selector", { path: screenshotPath, contentType: "image/png" });

  await modal.locator('[data-action="stage-confirm"]').click();
  await expect(page.locator(".battle-stage-slot .stage-chip")).toContainText("折磨");
});

test("debug mode can complete a stage and persists the reward", async ({ page }) => {
  await page.goto("/?debug=1");
  await skipTutorial(page);
  await completeStageWithDebug(page);
  const gold = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1") ?? "{}").gold ?? 0);
  expect(gold).toBeGreaterThan(0);
});

test("summon sequence unlocks the two demo heroes with result feedback", async ({ page }) => {
  await page.getByRole("button", { name: "英雄", exact: true }).click();
  await page.getByRole("button", { name: "召唤英雄" }).click();
  await page.getByRole("button", { name: /召唤 1 次/ }).click();
  await expect(page.locator(".summon-result")).toContainText("埃利奥");
  await page.getByRole("button", { name: /召唤 1 次/ }).click();
  await expect(page.locator(".summon-result")).toContainText("塔格尔");
});

test("keeps the returned expedition log scrollable and the claim action visible", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "关卡", exact: true }).click();
  await page.locator('[data-action="stages-panel-tab"][data-tab="dungeon"]').click();
  await page.locator('[data-action="dungeon-select"]').first().click();
  const dispatch = page.locator('[data-action="dungeon-dispatch"]');
  for (let index = 0; index < 5 && !(await dispatch.isEnabled()); index += 1) {
    await page.locator('[data-action="dispatch-pick"]:not(.selected)').first().click();
  }
  await expect(dispatch).toBeEnabled();
  await dispatch.click();
  await page.waitForTimeout(600);
  await page.addInitScript(() => {
    const key = "idle-rpg-save-v1";
    const save = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (save.dungeonRuns?.[0]) {
      save.dungeonRuns[0].startedAt = Date.now() - 24 * 60 * 60_000;
      localStorage.setItem(key, JSON.stringify(save));
    }
  });
  await page.reload();
  await skipTutorial(page);
  await page.getByRole("button", { name: "关卡", exact: true }).click();
  await page.locator('[data-action="stages-panel-tab"][data-tab="dungeon"]').click();
  await page.locator('[data-action="dungeon-progress"]').first().click();

  const modal = page.locator(".expedition-detail-modal.returned");
  const claim = modal.locator('[data-action="dungeon-claim"]');
  await expect(modal).toBeVisible();
  await expect(claim).toBeVisible();
  const layout = await modal.evaluate((element) => {
    const modalRect = element.getBoundingClientRect();
    const footerRect = element.querySelector(".expedition-detail-footer")!.getBoundingClientRect();
    const log = element.querySelector<HTMLElement>(".expedition-detail-log")!;
    return {
      modalTop: modalRect.top,
      modalBottom: modalRect.bottom,
      footerBottom: footerRect.bottom,
      viewportHeight: document.documentElement.clientHeight,
      logClientHeight: log.clientHeight,
      logScrollHeight: log.scrollHeight,
    };
  });
  expect(layout.modalTop).toBeGreaterThanOrEqual(0);
  expect(layout.modalBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.footerBottom).toBeLessThanOrEqual(layout.modalBottom);
  expect(layout.logScrollHeight).toBeGreaterThan(layout.logClientHeight);

  const screenshotPath = testInfo.outputPath("returned-expedition.png");
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach("returned expedition", { path: screenshotPath, contentType: "image/png" });
});

test("an inventory item can be inspected and equipped", async ({ page }) => {
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.inventory.push({
    instanceId: "inventory-equip-check",
    definitionId: "armor_guard_mail",
    slot: "armor",
    rarity: "rare",
    stage: 1,
    stats: { defense: 12, maxHp: 180 },
    affixes: [{ affixId: "flat_defense", value: 4 }],
    traitId: null,
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: "idle-rpg-save-v1", value: JSON.stringify(save) },
  );
  await page.reload();
  await expect(page.locator(".item-card").first()).toBeVisible();
  await page.locator(".item-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("战力");
  await page.getByRole("button", { name: "装备", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "英雄属性" })).toBeVisible();
  await page.locator('.equip-candidate-grid .item-card[aria-pressed="true"]').click();
  await page.locator('[data-action="equip-item"]').click();
  await expect(page.locator(".toast-stack")).toBeEmpty();
  await expect(page.locator(".character-equip-modal .equip-slot:not(.empty)").first()).toBeVisible();
});

test("debug currency can purchase a daily shop offer", async ({ page }) => {
  await page.goto("/?debug=1");
  await skipTutorial(page);
  await page.getByRole("button", { name: "+1000 金币" }).click();
  await page.getByRole("button", { name: "商店", exact: true }).click();
  const offer = page.locator(".shop-card").first();
  await offer.locator('[data-action="shop-buy"]').click();
  await expect(offer).toContainText("已售罄");
});
