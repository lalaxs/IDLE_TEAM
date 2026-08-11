import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const dir = "public/assets/characters";
const ids = ["enemy-e01", "enemy-e02", "enemy-e03", "enemy-e04", "enemy-b01"];
const outDir = "docs/art/generated/heroes/review/svg-q-pass-v01";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 220 } });

const cells = ids
  .map((id) => {
    const svg = fs.readFileSync(path.join(dir, `${id}.svg`), "utf8");
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="width:128px;height:128px;background:#dfe8e4;border-radius:12px;display:flex;align-items:center;justify-content:center">${svg}</div>
      <span style="font:12px sans-serif">${id}</span>
    </div>`;
  })
  .join("");

await page.setContent(`<html><body style="margin:0;padding:16px;background:#f4f1ea">
<div style="display:flex;gap:12px;flex-wrap:wrap">${cells}</div>
</body></html>`);
await page.screenshot({ path: path.join(outDir, "enemies-contact.png") });
await page.screenshot({
  path: path.join(outDir, "enemy-e01.png"),
  clip: { x: 16, y: 16, width: 128, height: 148 },
});
await browser.close();
console.log("ok");
