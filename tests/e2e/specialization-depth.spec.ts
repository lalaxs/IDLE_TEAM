import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";
import type { HeroId } from "../../src/simulation/types";

test("specialization rotation talents stay readable and can be learned", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.highestClearedStage = 24;
  save.highestUnlockedStage = 25;
  save.currentStage = 24;
  save.party = ["H62", "H65", "H03", "H78", "H14"];
  save.settings.reducedMotion = true;
  const subjects: Array<[HeroId, string, string]> = [
    ["H78", "420%", "余烬循环"], ["H03", "积攒2层", "灼热护衣"],
    ["H02", "续时最多补至6秒", "怒意倾泻"], ["H14", "完整引导", "灵魂回收"],
    ["H62", "45%", "澄净心法"],
  ];
  for (const id of [...save.party, "H02"] as HeroId[]) Object.assign(save.roster[id], {
    unlocked: true, level: 85, stars: 7, ascendLevel: 4,
    talentRanks: { foundation_power: 5, foundation_precision: 5, basic_c: 1, mastery_a: 3, mastery_b: 2 },
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("idle-rpg-save-v1")) localStorage.setItem("idle-rpg-save-v1", value);
  }, JSON.stringify(save));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.locator('[data-action="select-tab"][data-tab="heroes"]').click();
  for (const [id, text, finalName] of subjects) {
    await page.locator(`.hero-roster-card[data-hero-id="${id}"]`).click();
    const dialog = page.locator(".character-equip-modal");
    await dialog.locator('[data-action="equip-skill-tips"][data-skill-kind="talent"]').click();
    await dialog.locator('.talent-node[data-talent-id="ultimate_a"]').click();
    const detail = dialog.locator(".talent-node-detail");
    await expect(detail).toContainText(text);
    await expect(detail.locator('[data-action="talent-up"]')).toBeVisible();
    if (id === "H78") {
      await detail.scrollIntoViewIfNeeded();
      const bounds = await detail.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
      await page.screenshot({ path: testInfo.outputPath("destruction-rotation-talent.png") });
    }
    await page.keyboard.press("Escape");
    await dialog.locator('.talent-node[data-talent-id="ultimate_c"]').click();
    await expect(detail.locator("h3")).toHaveText(finalName);
    await detail.locator('[data-action="talent-up"]').click();
    await expect.poll(() => page.evaluate((heroId) => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster[heroId].talentRanks.ultimate_c, id)).toBe(1);
    await dialog.locator('.talent-back-button[data-action="close-equip-tips"]').click();
    await dialog.locator('button[data-action="close-modal"]').click();
  }
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster.H14.talentRanks.ultimate_c)).toBe(1);
  expect(errors).toEqual([]);
});
