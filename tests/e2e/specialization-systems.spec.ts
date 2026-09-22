import { expect, test } from "@playwright/test";
import { RELEASED_HERO_DEFINITIONS } from "../../src/content/heroes";
import type { SpecId } from "../../src/content/specializations";
import { createDefaultSave } from "../../src/persistence/schema";

test("capstone systems are readable, selectable and retained after reload", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const subjects: Array<[SpecId, string, string]> = [
    ["mage_frost", "极寒蔓延", "碎冰护体"],
    ["paladin_retribution", "审判接力", "裁决救赎"],
    ["shaman_enhancement", "熔火武器", "漩涡愈流"],
    ["priest_shadow", "虚空扩散", "虚空回流"],
    ["warrior_arms", "粉碎阵线", "压制节奏"],
    ["hunter_beast_mastery", "狂野扫射", "追猎续势"],
  ];
  const heroes = subjects.map(([spec]) => RELEASED_HERO_DEFINITIONS.find((hero) => hero.specId === spec)!);
  const save = createDefaultSave(Date.now());
  save.tutorialCompleted = true;
  save.highestClearedStage = 24;
  save.highestUnlockedStage = 25;
  save.currentStage = 24;
  save.settings.reducedMotion = true;
  for (const hero of heroes) Object.assign(save.roster[hero.id], {
    unlocked: true, level: 85, stars: 7, ascendLevel: 4,
    talentRanks: { foundation_power: 5, foundation_precision: 5, basic_c: 1, mastery_a: 3, mastery_b: 2 },
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("idle-rpg-save-v1")) localStorage.setItem("idle-rpg-save-v1", value);
  }, JSON.stringify(save));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="select-tab"][data-tab="heroes"]').click();
  for (const [index, hero] of heroes.entries()) {
    await page.locator(`.hero-roster-card[data-hero-id="${hero.id}"]`).click();
    const dialog = page.locator(".character-equip-modal");
    await dialog.locator('[data-action="equip-skill-tips"][data-skill-kind="talent"]').click();
    await dialog.locator('[data-talent-id="ultimate_b"]').click();
    const detail = dialog.locator(".talent-node-detail");
    await expect(detail.locator("h3")).toHaveText(subjects[index]![1]);
    if (hero.specId === "warrior_arms") {
      await expect(detail).toContainText("另外两名敌人破甲30%");
      await detail.scrollIntoViewIfNeeded();
      const bounds = await detail.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
      await page.screenshot({ path: testInfo.outputPath("capstone-system.png") });
    }
    await page.keyboard.press("Escape");
    await dialog.locator('[data-talent-id="ultimate_c"]').click();
    await expect(detail.locator("h3")).toHaveText(subjects[index]![2]);
    await detail.locator('[data-action="talent-up"]').click();
    await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster[id].talentRanks.ultimate_c, hero.id)).toBe(1);
    await dialog.locator('.talent-back-button[data-action="close-equip-tips"]').click();
    await dialog.locator('button[data-action="close-modal"]').click();
  }
  await page.reload();
  for (const hero of heroes) expect(await page.evaluate((id) => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster[id].talentRanks.ultimate_c, hero.id)).toBe(1);
  expect(errors).toEqual([]);
});
