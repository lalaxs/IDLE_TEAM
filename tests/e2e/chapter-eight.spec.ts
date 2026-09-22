import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

const SAVE_KEY = "idle-rpg-save-v1";

async function openChapterEightStage(
  page: import("@playwright/test").Page,
  stage: 88 | 92 | 96,
) {
  const save = createDefaultSave(Date.now());
  save.currentStage = stage;
  save.highestUnlockedStage = stage;
  save.highestClearedStage = stage - 1;
  save.tutorialCompleted = true;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.goto("/?debug=1");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".debug-overlay")).toContainText(`关卡 ${stage}`);
}

test("renders all three approved chapter-eight regional encounters", async ({ page }, testInfo) => {
  for (const stage of [88, 92, 96] as const) {
    await openChapterEightStage(page, stage);
    await expect(page.locator(".stage-chip")).toContainText(`8-${stage - 84}`);
    const screenshotPath = testInfo.outputPath(`chapter-eight-stage-${stage}.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`chapter eight stage ${stage}`, {
      path: screenshotPath,
      contentType: "image/png",
    });
  }
});
