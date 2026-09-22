import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

const SAVE_KEY = "idle-rpg-save-v1";

async function openStage(page: import("@playwright/test").Page, stage: number) {
  const save = createDefaultSave(Date.now());
  save.currentStage = stage;
  save.highestUnlockedStage = stage;
  save.highestClearedStage = stage - 1;
  save.tutorialCompleted = true;
  save.roster.H01.level = 100;
  save.roster.H01.stars = 15;
  save.roster.H01.ascendLevel = 5;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
  await page.goto("/?debug=1");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".debug-overlay")).toContainText(`关卡 ${stage}`);
}

test("keeps semantic enemy sizes readable across the campaign", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const stage of [12, 24, 36, 48, 60, 72, 84, 96, 108, 120]) {
    await openStage(page, stage);
    await page.waitForTimeout(800);
    const screenshotPath = testInfo.outputPath(`enemy-scale-stage-${stage}.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`enemy scale stage ${stage}`, {
      path: screenshotPath,
      contentType: "image/png",
    });

    if (stage === 36) {
      for (let pack = 1; pack <= 5; pack += 1) {
        await page.getByRole("button", { name: "清除敌人" }).click();
        await expect(page.locator(".debug-overlay")).toContainText("状态 travelling");
        await expect(page.locator(".debug-overlay")).not.toContainText("状态 travelling");
        if (pack === 1) {
          await page.waitForTimeout(800);
          const secondPackPath = testInfo.outputPath("enemy-scale-stage-36-pack-2.png");
          await page.screenshot({ path: secondPackPath });
          await testInfo.attach("enemy scale stage 36 pack 2", {
            path: secondPackPath,
            contentType: "image/png",
          });
        }
      }
      await expect(page.locator(".debug-overlay")).toContainText("Boss");
      await page.waitForTimeout(800);
      const bossScreenshotPath = testInfo.outputPath("enemy-scale-boss-36.png");
      await page.screenshot({ path: bossScreenshotPath });
      await testInfo.attach("enemy scale boss 36", {
        path: bossScreenshotPath,
        contentType: "image/png",
      });
    }
  }
});
