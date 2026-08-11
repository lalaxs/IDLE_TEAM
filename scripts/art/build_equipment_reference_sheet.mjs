import path from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../..");
const target = path.join(
  root,
  "docs/art/generated/equipment/references/equipment-hero-style-reference.png",
);
await mkdir(path.dirname(target), { recursive: true });
const heroes = [
  ["H01", "洛恩", "hero-h01.svg"],
  ["H03", "米娅", "hero-h03.svg"],
  ["H04", "诺拉", "hero-h04.svg"],
  ["H05", "塔林", "hero-h05.svg"],
  ["H06", "乌鸦", "hero-h06.svg"],
  ["H08", "海泽", "hero-h08.svg"],
];

const width = 960;
const height = 660;
const cellWidth = 300;
const cellHeight = 270;
const composites = [];

for (const [index, [id, name, filename]] of heroes.entries()) {
  const row = Math.floor(index / 3);
  const column = index % 3;
  const input = path.join(root, "public/assets/characters", filename);
  const art = await sharp(input)
    .resize(220, 220, { fit: "contain" })
    .png()
    .toBuffer();
  const label = Buffer.from(`
    <svg width="${cellWidth}" height="38" xmlns="http://www.w3.org/2000/svg">
      <text x="150" y="25" text-anchor="middle"
        font-family="PingFang SC, Microsoft YaHei, sans-serif"
        font-size="20" font-weight="700" fill="#3a302b">${id} ${name}</text>
    </svg>
  `);
  composites.push({
    input: art,
    left: 40 + column * cellWidth + 40,
    top: 70 + row * cellHeight,
  });
  composites.push({
    input: label,
    left: 30 + column * cellWidth,
    top: 70 + row * cellHeight + 218,
  });
}

const heading = Buffer.from(`
  <svg width="${width}" height="60" xmlns="http://www.w3.org/2000/svg">
    <text x="480" y="38" text-anchor="middle"
      font-family="PingFang SC, Microsoft YaHei, sans-serif"
      font-size="28" font-weight="800" fill="#3a302b">青丘远征 · 装备图标角色风格参考</text>
  </svg>
`);
composites.push({ input: heading, left: 0, top: 8 });

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: "#f7efd9",
  },
})
  .composite(composites)
  .png()
  .toFile(target);

console.log(`Wrote ${target}`);
