import { expect, test } from "@playwright/test";

test("check-in placement, claim persistence, daily transition and reward boxes", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (localStorage.getItem("idle-rpg-save-v1")) return;
    localStorage.setItem("idle-rpg-save-v1", JSON.stringify({
      version: 1, tutorialCompleted: true, gold: 0, exp: 120, gems: 300,
      lastActiveAt: Date.now(), updatedAt: Date.now(),
      checkIn: { claimedDays: 6, lastClaimDate: "2026-01-01" },
      settings: { battleSpeed: 1, soundEnabled: false, reducedMotion: true },
    }));
  });
  await page.goto("/");
  const entry = page.locator('[data-action="activities"]').first();
  await expect(entry).toBeVisible();
  const left = (await entry.boundingBox())!;
  const right = (await page.locator('[data-action="battle-details"]').boundingBox())!;
  expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
  expect(left.x + left.width).toBeLessThan(right.x);
  await page.screenshot({ path: testInfo.outputPath("battle-entry.png") });
  await entry.click();
  const dialog = page.getByRole("region", { name: "活动", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("tab", { name: "7日签到", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".check-in-day")).toHaveCount(7);
  const layout = await dialog.evaluate((element) => {
    const scroll = element.querySelector(".check-in-scroll")!;
    const rect = element.getBoundingClientRect();
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, overflow: scroll.scrollHeight - scroll.clientHeight, bottom: rect.bottom, height: innerHeight };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.bottom).toBeLessThanOrEqual(layout.height);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("seven-day.png") });
  await page.getByRole("button", { name: "领取今日奖励" }).click();
  await expect(page.getByRole("button", { name: "今日已签到" })).toBeDisabled();
  await expect(page.locator(".check-in-complete")).toContainText("凌晨5点开启每日签到");
  await expect(page.locator('[data-activity-currency="gems"]')).toHaveAttribute('aria-label', '星石 600');
  await page.getByRole('button', { name: '返回游戏' }).click();
  await expect(entry).toBeFocused();
  await page.reload();
  await expect(entry).toHaveAttribute("data-claimable", "false");
  await page.locator('[data-action="inventory-bag-tab"][data-tab="materials"]').click();
  await page.locator('[data-action="inventory-consumable-detail"][data-consumable-id="gem_box"]').click();
  await expect(page.locator(".reward-box-pool li")).toHaveCount(12);
  await page.getByRole("button", { name: "打开1个", exact: true }).click();
  await expect(page.locator(".reward-box-result")).toContainText("已放入材料背包");
  await expect(page.locator(".reward-box-summary")).toContainText("库存 ×7");
  await page.screenshot({ path: testInfo.outputPath("box-result.png") });
  await page.keyboard.press("Escape");
  await page.reload();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!));
  expect(stored.checkIn.claimedDays).toBe(7);
  expect(stored.gems).toBe(600);
  expect(stored.rewardBoxes.gem_box).toBe(7);
  expect(stored.rewardBoxes.material_box).toBe(8);
  await page.clock.setFixedTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await entry.click();
  await expect(page.getByRole("region", { name: "活动", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "每日签到", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "领取今日奖励" })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("daily-check-in.png") });
  await page.getByRole("button", { name: "返回游戏", exact: true }).click();
  if (testInfo.project.name === "desktop") {
    for (const size of [{ width: 844, height: 390 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(size);
      if (size.width > size.height) {
        const rotationHint = await page.locator(".game-shell").evaluate((element) => getComputedStyle(element, "::after").content);
        expect(rotationHint).toContain("请旋转设备");
        continue;
      }
      await entry.click();
      await expect(page.getByRole("button", { name: "领取今日奖励" })).toBeInViewport();
      const rect = (await page.locator(".activities-page").boundingBox())!;
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height).toBeLessThanOrEqual(size.height + 1);
      await page.screenshot({ path: testInfo.outputPath(`check-in-${size.width}.png`) });
      await page.keyboard.press("Escape");
    }
  }
  expect(errors).toEqual([]);
});
