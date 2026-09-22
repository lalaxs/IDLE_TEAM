import { expect, test } from "@playwright/test";
import { createDefaultSave } from "../../src/persistence/schema";

for (const orientation of ["portrait", "landscape"] as const) {
  test(`augmentation target selection persists and preserves the open control (${orientation})`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    if (orientation === "landscape") await page.setViewportSize({ width: 740, height: 360 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const save = createDefaultSave(Date.now());
    save.tutorialCompleted = true;
    save.highestClearedStage = 24;
    save.highestUnlockedStage = 25;
    save.currentStage = 24;
    save.party = ["H62", "H65", "H57", "H59", "H30"];
    save.settings.reducedMotion = true;
    for (const id of save.party) if (id) Object.assign(save.roster[id], { unlocked: true, level: 85, stars: 7, ascendLevel: 4 });
    await page.addInitScript((value) => {
      if (!localStorage.getItem("idle-rpg-save-v1")) localStorage.setItem("idle-rpg-save-v1", value);
    }, JSON.stringify(save));
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible();
    if (orientation === "landscape") {
      const rotationPrompt = page.locator(".game-shell");
      await expect.poll(() => rotationPrompt.evaluate((element) => getComputedStyle(element, "::after").content)).toContain("请旋转设备");
      await page.screenshot({ path: testInfo.outputPath("landscape-rotation-prompt.png") });
      await page.setViewportSize({ width: 360, height: 640 });
      await expect.poll(() => rotationPrompt.evaluate((element) => getComputedStyle(element, "::after").content)).not.toContain("请旋转设备");
    }
    const openTarget = async () => {
      await page.locator('[data-action="select-tab"][data-tab="heroes"]').click();
      await page.locator('.hero-roster-card[data-hero-id="H30"]').click();
      await page.locator('[data-action="equip-skill-tips"][data-skill-kind="active"]').click();
      return page.getByLabel("优先增幅队友", { exact: true });
    };
    const select = await openTarget();
    await expect(select).toHaveValue("");
    await select.focus();
    const original = await select.elementHandle();
    await select.selectOption("H59");
    await expect(select).toBeFocused();
    expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster.H30.augmentationTargetId)).toBe("H59");
    const bounds = await page.locator(".equip-skill-popover").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    const headingVisible = await page.locator(".equip-skill-popover-head strong").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === element;
    });
    expect(headingVisible).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("augmentation-target.png") });
    await page.reload();
    const restored = await openTarget();
    await expect(restored).toHaveValue("H59");
    await restored.selectOption("");
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!).roster.H30.augmentationTargetId)).toBeNull();
    await page.keyboard.press("Escape");
    await expect(page.locator(".equip-skill-popover")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
