import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

const SAVE_KEY = "idle-rpg-save-v1";

async function openChapterSevenStage(
  page: import("@playwright/test").Page,
  stage: 76 | 80 | 84,
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

test("renders all three approved chapter-seven regional encounters", async ({ page }, testInfo) => {
  for (const stage of [76, 80, 84] as const) {
    await openChapterSevenStage(page, stage);
    await expect(page.locator(".stage-chip")).toContainText(`7-${stage - 72}`);
    const screenshotPath = testInfo.outputPath(`chapter-seven-stage-${stage}.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`chapter seven stage ${stage}`, {
      path: screenshotPath,
      contentType: "image/png",
    });
  }
});
