import { expect, test } from '@playwright/test';
import { createDefaultSave } from '../../src/persistence/schema';

async function prepare(page: import('@playwright/test').Page) {
  const save = createDefaultSave();
  save.tutorialCompleted = true; save.settings.soundEnabled = false; save.settings.reducedMotion = true;
  save.roster.H35.level = 20; save.roster.H35.stars = 4; save.roster.H35.marks = 5;
  save.materials.mat_ascend_stone = 1; save.adTickets = 2;
  save.lootChest.startedAt = Date.now() - 4 * 3600000;
  await page.addInitScript((save) => {
    if (!localStorage.getItem('idle-rpg-save-v1')) localStorage.setItem('idle-rpg-save-v1', JSON.stringify(save));
  }, save);
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
}

test('mobile star and ascension show distinct gains and keep rewards usable', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await prepare(page);
  await page.locator('[data-action="loot-chest-open"]').click();
  await expect(page.locator('.idle-acceleration-row')).toHaveCount(2);
  const quickAd = page.locator('[data-placement="idle-quick"]:not([data-ticket])');
  await quickAd.click();
  await expect(page.locator('.toast-stack')).toContainText('广告暂不可用');
  await expect(page.locator('.idle-acceleration-row').nth(1)).toContainText('今日剩余 3 次');
  const quickTicket = page.locator('[data-placement="idle-quick"][data-ticket]');
  await quickTicket.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `outputs/balance-model-20260922/playtest-${info.project.name}-idle.png` });
  const box = await quickTicket.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
  await quickTicket.click();
  await expect(page.locator('.idle-acceleration-row').nth(1)).toContainText('今日剩余 2 次');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'英雄',exact:true}).click();
  await page.locator('.hero-card[data-action="hero-detail"][data-hero-id="H35"]').click();
  await page.locator('[data-action="open-growth-dialog"][data-growth-kind="star"]').click();
  const star = page.locator('.growth-dialog[data-growth-kind="star"]');
  await expect(star.locator('.growth-star-bonus')).toContainText('技能效果');
  await expect(star.locator('.growth-star-bonus')).toContainText('怒气获取');
  await expect(star.locator('.growth-star-bonus')).not.toContainText('生命');
  await page.screenshot({ path: `outputs/balance-model-20260922/playtest-${info.project.name}-star.png` });
  await star.locator('[data-action="hero-star-up"]').click();
  await expect(page.locator('.hero-growth-result-gains')).toContainText('怒气获取');
  await page.locator('.modal-backdrop').click({position:{x:2,y:2}});
  await expect(page.locator('.character-equip-modal')).toBeVisible();
  await page.locator('[data-action="open-growth-dialog"][data-growth-kind="ascend"]').click();
  const ascend = page.locator('.growth-dialog[data-growth-kind="ascend"]');
  await expect(ascend.locator('.growth-condition-list')).not.toContainText('星级');
  await expect(ascend).toContainText('通用被动');
  await page.screenshot({ path: `outputs/balance-model-20260922/playtest-${info.project.name}-ascend.png` });
  await ascend.locator('[data-action="hero-ascend"]').click();
  await expect(page.locator('.hero-growth-result-gains')).toContainText('Lv.40');
  await expect(page.locator('.hero-growth-result-gains')).toContainText('通用被动');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(errors).toEqual([]);
});
