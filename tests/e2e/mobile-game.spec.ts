import { expect, test } from "@playwright/test";

async function skipTutorial(page: import("@playwright/test").Page) {
  const skip = page.getByRole("button", { name: "跳过" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

async function completeStageWithDebug(page: import("@playwright/test").Page) {
  for (let pack = 1; pack <= 3; pack += 1) {
    await page.getByRole("button", { name: "清除敌人" }).click();
    if (pack < 3) {
      await expect(page.locator(".battle-state-label")).toContainText("敌军逼近");
      await expect(page.locator(".battle-state-label")).not.toContainText("敌军逼近");
      if (pack === 2) {
        await expect(page.locator(".boss-meter-label")).toContainText("首领战");
      }
    } else {
      await expect(page.locator(".stage-chip")).toContainText("1-2");
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await skipTutorial(page);
});

test("boots a live battle and keeps the approved mobile hierarchy", async ({ page }) => {
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".boss-meter-label")).toContainText("讨伐进度");
  await expect(page.locator(".nameplate")).toHaveCount(5);
  await expect(page.locator(".bottom-nav button")).toHaveCount(5);
  const dimensions = await page.evaluate(() => {
    const shell = document.querySelector(".game-shell");
    const app = document.querySelector("#app");
    const stage = document.querySelector("#fit-stage");
    return {
      viewport: document.documentElement.clientWidth,
      shellVisual: shell?.getBoundingClientRect().width ?? 0,
      appLayout: app?.clientWidth ?? 0,
      scaled: stage?.classList.contains("fit-stage--scaled") ?? false,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(dimensions.overflow).toBe(0);
  if (dimensions.viewport <= 430) {
    expect(dimensions.scaled).toBe(false);
    expect(dimensions.shellVisual).toBeLessThanOrEqual(430);
  } else {
    expect(dimensions.scaled).toBe(true);
    expect(dimensions.appLayout).toBe(430);
    expect(dimensions.shellVisual).toBeGreaterThan(430);
    expect(dimensions.shellVisual).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

test("all four management pages remain interactive over continuous combat", async ({ page }) => {
  for (const label of ["商店", "英雄", "关卡", "背包"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(".content-panel")).toContainText(label === "关卡" ? "第一章" : label);
    await expect(page.locator("canvas")).toBeVisible();
  }
});

test("opens formation, summon, stage, and settings flows", async ({ page }) => {
  await page.locator(".nameplate").first().click();
  await expect(page.getByRole("dialog")).toContainText("阵容编辑");
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "英雄", exact: true }).click();
  await page.getByRole("button", { name: "召唤英雄" }).click();
  await expect(page.getByRole("dialog")).toContainText("Demo 固定解锁序列");
  await page.getByRole("button", { name: "关闭" }).click();

  await page.getByRole("button", { name: "游戏设置" }).click();
  await expect(page.getByRole("dialog")).toContainText("减弱动效");
});

test("debug mode can complete a stage and persists the reward", async ({ page }) => {
  await page.goto("/?debug=1");
  await skipTutorial(page);
  await completeStageWithDebug(page);
  const gold = await page.evaluate(() => JSON.parse(localStorage.getItem("idle-rpg-save-v1") ?? "{}").gold ?? 0);
  expect(gold).toBeGreaterThan(0);
});

test("summon sequence unlocks the two demo heroes with result feedback", async ({ page }) => {
  await page.getByRole("button", { name: "英雄", exact: true }).click();
  await page.getByRole("button", { name: "召唤英雄" }).click();
  await page.getByRole("button", { name: /召唤 1 次/ }).click();
  await expect(page.locator(".summon-result")).toContainText("塞拉");
  await page.getByRole("button", { name: /召唤 1 次/ }).click();
  await expect(page.locator(".summon-result")).toContainText("海泽");
});

test("loot can be inspected and equipped after a debug victory", async ({ page }) => {
  await page.goto("/?debug=1");
  await skipTutorial(page);
  await completeStageWithDebug(page);
  await expect(page.locator(".item-card").first()).toBeVisible();
  await page.locator(".item-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("战力");
  await page.locator(".picker-grid button").first().click();
  await expect(page.locator(".toast-stack")).toContainText("装备完成");
});

test("debug currency can purchase a daily shop offer", async ({ page }) => {
  await page.goto("/?debug=1");
  await skipTutorial(page);
  await page.getByRole("button", { name: "+1000 金币" }).click();
  await page.getByRole("button", { name: "商店", exact: true }).click();
  const offer = page.locator(".shop-card").first();
  await offer.locator("button").click();
  await expect(offer).toContainText("已售罄");
});
