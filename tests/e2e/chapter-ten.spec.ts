import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

const SAVE_KEY = "idle-rpg-save-v1";

async function openChapterTenStage(
  page: import("@playwright/test").Page,
  stage: 112 | 116 | 120,
) {
  const save = createDefaultSave(Date.now());
  save.currentStage = stage;
  save.highestUnlockedStage = stage;
  save.highestClearedStage = stage - 1;
  save.tutorialCompleted = true;
  for (const progress of Object.values(save.roster)) {
    progress.unlocked = true;
    progress.level = 100;
    progress.stars = 15;
    progress.ascendLevel = 5;
  }
  save.party = ["H01", "H02", "H03", "H04", "H05"];
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.goto("/?debug=1");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".debug-overlay")).toContainText(`关卡 ${stage}`);
}

async function advanceToBoss(page: import("@playwright/test").Page) {
  for (let pack = 1; pack <= 5; pack += 1) {
    await page.getByRole("button", { name: "清除敌人" }).click();
    await expect(page.locator(".debug-overlay")).toContainText("状态 travelling");
    await expect(page.locator(".debug-overlay")).not.toContainText("状态 travelling");
  }
  await expect(page.locator(".debug-overlay")).toContainText("Boss");
}

test("renders all three approved chapter-ten regional encounters", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  for (const stage of [112, 116, 120] as const) {
    await openChapterTenStage(page, stage);
    await expect(page.locator(".stage-chip")).toContainText(`10-${stage - 108}`);
    await page.waitForTimeout(800);
    const screenshotPath = testInfo.outputPath(`chapter-ten-stage-${stage}.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`chapter ten stage ${stage}`, {
      path: screenshotPath,
      contentType: "image/png",
    });

    await advanceToBoss(page);
    await page.waitForTimeout(800);
    const bossScreenshotPath = testInfo.outputPath(`chapter-ten-boss-${stage}.png`);
    await page.screenshot({ path: bossScreenshotPath });
    await testInfo.attach(`chapter ten boss ${stage}`, {
      path: bossScreenshotPath,
      contentType: "image/png",
    });
  }
});
