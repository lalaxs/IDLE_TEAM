import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

test("specialization loops and arcane talent choices remain readable", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.highestClearedStage = 24;
  save.highestUnlockedStage = 25;
  save.currentStage = 24;
  save.party = ["H62", "H65", "H60", "H59", "H23"];
  save.settings.reducedMotion = true;
  for (const id of save.party) {
    if (!id) continue;
    save.roster[id].unlocked = true;
    save.roster[id].level = 30;
  }
  await page.addInitScript((value) => localStorage.setItem("idle-rpg-save-v1", value), JSON.stringify(save));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(6500);
  await page.screenshot({ path: testInfo.outputPath("skill-balance-battle.png") });
  await page.locator('[data-action="select-tab"][data-tab="heroes"]').click();
  await page.locator('.hero-roster-card[data-hero-id="H59"]').click();
  const dialog = page.locator(".character-equip-modal");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-action="equip-skill-tips"][data-skill-kind="active"]').click();
  await expect(dialog.locator(".equip-skill-tips-desc")).toContainText("通常蓄满4层");
  await page.screenshot({ path: testInfo.outputPath("arcane-skill.png") });
  await dialog.locator('[data-action="equip-skill-tips"][data-skill-kind="talent"]').click();
  await expect(dialog.locator('[data-talent-id="ultimate_c"] .talent-node-name')).toHaveText("节能循环");
  await dialog.locator('[data-talent-id="ultimate_c"]').scrollIntoViewIfNeeded();
  await dialog.locator('[data-talent-id="ultimate_c"]').click();
  await expect(dialog.locator(".talent-node-detail")).toContainText("返还6点怒气");
  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
  await page.screenshot({ path: testInfo.outputPath("arcane-talents.png") });
  expect(errors).toEqual([]);
});
