import { chromium } from "@playwright/test";
import fs from "fs";

const id = process.argv[2] || "hero-h01";
const svg = fs.readFileSync(`public/assets/characters/${id}.svg`, "utf8");
const out = `docs/art/generated/heroes/review/svg-q-pass-v01/${id}-zoom.png`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
await page.setContent(
  `<!doctype html><html><body style="margin:0;background:#cfd6d2;display:grid;place-items:center;height:100vh">${svg.replace(
    "<svg",
    '<svg width="280" height="280"',
  )}</body></html>`,
);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
