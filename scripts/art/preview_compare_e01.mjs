import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const dir = "public/assets/characters";
const outDir = "docs/art/generated/heroes/review/svg-q-pass-v01";
fs.mkdirSync(outDir, { recursive: true });

const files = [
  "enemy-e01",
  "hero-h01",
  "hero-h02",
  "hero-h03",
  "hero-h04",
  "hero-h05",
  "hero-h06",
  "hero-h07",
  "hero-h08",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 320 } });

const cells = files
  .map((id) => {
    const svg = fs.readFileSync(path.join(dir, `${id}.svg`), "utf8");
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:128px;height:128px;background:#dfe8e4;border-radius:12px;display:flex;align-items:center;justify-content:center">${svg}</div>
      <span style="font:12px sans-serif;color:#333">${id}</span>
    </div>`;
  })
  .join("");

await page.setContent(`<html><body style="margin:0;padding:16px;background:#f4f1ea">
<div style="display:flex;gap:10px;flex-wrap:wrap">${cells}</div>
</body></html>`);
await page.screenshot({ path: path.join(outDir, "compare-e01-heroes.png") });

for (const id of ["enemy-e01", "hero-h01", "hero-h02", "hero-h05"]) {
  const svg = fs.readFileSync(path.join(dir, `${id}.svg`), "utf8");
  await page.setContent(
    `<html><body style="margin:0;background:#c9d8d2">${svg.replace(
      "<svg",
      '<svg width="256" height="256"',
    )}</body></html>`,
  );
  await page.screenshot({
    path: path.join(outDir, `${id}.png`),
    clip: { x: 0, y: 0, width: 256, height: 256 },
  });
}

await browser.close();
console.log("ok");
