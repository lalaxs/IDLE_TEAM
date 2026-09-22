import { expect, test } from "@playwright/test";

for (const watchedAds of [0, 99, 500]) {
  test(`VIP page and rewards at ${watchedAds} ads`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(({ watchedAds }) => {
      if (localStorage.getItem("idle-rpg-save-v1")) return;
      localStorage.setItem("idle-rpg-save-v1", JSON.stringify({ version: 1, tutorialCompleted: true, gold: 100000, gems: 0, adVip: { watchedAds }, updatedAt: Date.now(), lastActiveAt: Date.now(), settings: { soundEnabled: false, reducedMotion: true } }));
    }, { watchedAds });
    await page.goto("/");
    await page.locator('[data-action="activities"]').click();
    await page.getByRole("tab", { name: "广告VIP" }).click();
    const area = page.getByRole("region", { name: "活动", exact: true });
    await expect(area.locator('.activities-resources')).toBeVisible();
    await expect(page.locator('.battle-frame')).toBeHidden();
    const headerY = (await area.locator('.activities-page-header').boundingBox())!.y;
    const crest = (await area.locator('.vip-crest').boundingBox())!;
    const bounds = (await area.boundingBox())!;
    expect(Math.abs(crest.x + crest.width / 2 - bounds.x - bounds.width / 2)).toBeLessThan(2);
    const currentTab = area.getByRole('tab', { name: '当前', exact: true });
    const nextTab = area.getByRole('tab', { name: '下一档', exact: true });
    await expect(currentTab).toHaveAttribute('aria-selected', 'true');
    if (watchedAds === 500) await expect(nextTab).toHaveCount(0);
    else {
      const tabsY = (await currentTab.boundingBox())!.y;
      const contentHeight = (await area.locator('.vip-scroll').boundingBox())!.height;
      await nextTab.click();
      await expect(nextTab).toHaveAttribute('aria-selected', 'true');
      await expect(area.locator('[data-action="vip-claim"]')).toHaveCount(0);
      await expect(area.locator('.vip-gift-locked')).toHaveCount(2);
      await expect(area.locator('.vip-summary h3')).toHaveText(watchedAds === 99 ? '黄金VIP' : '青铜VIP');
      expect((await currentTab.boundingBox())!.y).toBe(tabsY);
      expect((await area.locator('.vip-scroll').boundingBox())!.height).toBe(contentHeight);
      await page.keyboard.press('ArrowLeft');
      await expect(currentTab).toBeFocused();
      await expect(currentTab).toHaveAttribute('aria-selected', 'true');
    }
    const rows = await area.locator('.vip-benefits dl > div').all();
    for (let i = 1; i < rows.length; i++) {
      const previous = (await rows[i - 1]!.boundingBox())!;
      const row = (await rows[i]!.boundingBox())!;
      expect(row.x).toBe(previous.x); expect(row.width).toBe(previous.width);
      expect(row.y).toBeGreaterThanOrEqual(previous.y + previous.height);
    }
    await area.locator('.vip-gifts').scrollIntoViewIfNeeded();
    expect((await area.locator('.activities-page-header').boundingBox())!.y).toBe(headerY);
    expect(await area.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(area.locator('[data-action="vip-watch"]')).toBeVisible();
    await area.locator('.vip-scroll').evaluate((element) => { element.scrollTop = 0; });
    if (watchedAds === 0) {
      await expect(area.locator('[data-action="vip-claim"]:disabled')).toHaveCount(2);
      await area.locator('[data-action="vip-watch"]').click();
      await expect(page.locator('.toast-stack')).toHaveText('广告暂不可用，请稍后再试');
      await expect(page.locator('.toast-stack')).toBeVisible();
      await expect(area.locator('.vip-meter strong')).toHaveText('0 / 10');
    } else {
      await area.locator('[data-action="vip-claim"][data-period="daily"]').click();
      await area.locator('[data-action="vip-claim"][data-period="weekly"]').click();
      await expect(area.locator('[data-action="vip-claim"]:disabled')).toHaveCount(2);
      if (watchedAds === 99) {
        await page.evaluate(async () => {
          const url = "/src/app/RewardedAds.ts";
          const { setRewardedAdProvider } = await import(/* @vite-ignore */ url);
          setRewardedAdProvider(async () => "completed");
        });
        await area.locator('[data-action="vip-watch"]').click();
        await expect(area.locator('.vip-summary h3')).toHaveText('黄金VIP');
        await expect(currentTab).toHaveAttribute('aria-selected', 'true');
        await expect(area.locator('.vip-gifts')).toContainText('补领');
        await area.locator('[data-action="vip-claim"][data-period="daily"]').click();
        await area.locator('[data-action="vip-claim"][data-period="weekly"]').click();
        await expect(area.locator('[data-activity-currency="gems"]')).toHaveAttribute('aria-label', '星石 120');
      } else {
        await expect(area.locator('[data-action="vip-watch"]')).toBeDisabled();
        await expect(area.locator('.vip-benefits')).toContainText('24小时');
        await expect(area.locator('[data-activity-currency="gems"]')).toHaveAttribute('aria-label', '星石 240');
      }
      await page.reload();
      await page.locator('[data-action="activities"]').click();
      await page.getByRole("tab", { name: "广告VIP" }).click();
      await expect(area.locator('[data-action="vip-claim"]:disabled')).toHaveCount(2);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!));
      expect(saved.adTickets).toBe(watchedAds === 99 ? 4 : 7);
    }
    await page.screenshot({ path: testInfo.outputPath(`vip-${watchedAds}.png`) });
    if (watchedAds > 0) {
      await area.locator('[data-action="close-activities"]').click();
      await page.locator('[data-action="toggle-speed"]').click();
      await expect(page.locator('[data-action="toggle-speed"]')).toHaveText('1.5×');
      if (watchedAds === 500) {
        await page.locator('[data-action="toggle-speed"]').click();
        await expect(page.locator('[data-action="toggle-speed"]')).toHaveText('2×');
      }
      await page.locator('[data-action="select-tab"][data-tab="shop"]').click();
      await expect(page.locator('[data-action="shop-refresh"]')).toContainText('VIP免费刷新');
      await expect(page.locator('.shop-refresh-countdown')).toContainText(watchedAds === 99 ? '9.5折' : '8.5折');
    }
    expect(errors).toEqual([]);
  });
}

for (const watchedAds of [0, 500]) {
  test(`offline return uses VIP cap at ${watchedAds} ads without a duplicate grant`, async ({ page }) => {
    await page.addInitScript(({ watchedAds }) => {
      if (localStorage.getItem("idle-rpg-save-v1")) return;
      localStorage.setItem("idle-rpg-save-v1", JSON.stringify({ version: 1, tutorialCompleted: true, gold: 0, exp: 0, gems: 0, highestClearedStage: 10, highestUnlockedStage: 11, currentStage: 11, adVip: { watchedAds }, lastActiveAt: Date.now() - 48 * 3600000, updatedAt: Date.now(), settings: { soundEnabled: false, reducedMotion: true } }));
    }, { watchedAds });
    await page.goto("/");
    const receipt = page.getByRole('dialog', { name: '离线收益' });
    const minutes = watchedAds === 500 ? 1440 : 480;
    await expect(receipt).toContainText(`${minutes} 分钟`);
    await expect(receipt).toContainText('收益已到账');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!));
    expect(saved.exp).toBe(minutes * 48);
    await page.reload();
    await expect(receipt).toHaveCount(0);
    const reloaded = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1")!));
    expect(reloaded.exp).toBe(saved.exp);
  });
}
