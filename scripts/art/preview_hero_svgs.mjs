import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const dir = "public/assets/characters";
const heroes = ["h01", "h02", "h03", "h04", "h05", "h06", "h07", "h08"];
const outDir = "docs/art/generated/heroes/review/svg-q-pass-v01";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 320 } });

const cells = heroes
  .map((id) => {
    const svg = fs.readFileSync(path.join(dir, `hero-${id}.svg`), "utf8");
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
    <div style="width:128px;height:128px;background:#dfe8e4;border-radius:12px;display:flex;align-items:center;justify-content:center">${svg}</div>
    <span style="font:12px sans-serif;color:#333">${id.toUpperCase()}</span>
  </div>`;
  })
  .join("");

await page.setContent(`<html><body style="margin:0;padding:16px;background:#f4f1ea">
<div style="display:flex;gap:12px;flex-wrap:wrap">${cells}</div>
</body></html>`);
await page.screenshot({ path: path.join(outDir, "heroes-contact.png") });

for (const id of heroes) {
  const svg = fs.readFileSync(path.join(dir, `hero-${id}.svg`), "utf8");
  await page.setContent(
    `<html><body style="margin:0;background:#c9d8d2">${svg.replace(
      "<svg",
      '<svg width="256" height="256"',
    )}</body></html>`,
  );
  await page.screenshot({
    path: path.join(outDir, `hero-${id}.png`),
    clip: { x: 0, y: 0, width: 256, height: 256 },
  });
}

await browser.close();
console.log("rendered", outDir);
