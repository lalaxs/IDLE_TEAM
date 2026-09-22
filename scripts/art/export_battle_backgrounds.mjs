import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const chapters = [
  { dir: "qingqiu-frontier", chapter: 1, fg: ["meadow", "forest", "ruins"] },
  { dir: "frostland", chapter: 2, fg: ["snowfield", "pinewood", "aurora_ruins"] },
  { dir: "red-sand-ancient-road", chapter: 3, fg: ["red_dunes", "wind_canyon", "sunken_city"] },
  { dir: "cloudveil-skyrealm", chapter: 4, fg: ["cloud_highlands", "floating_valley", "sky_city"] },
];

const outBg = "public/assets/backgrounds/stages";
const outFg = "public/assets/backgrounds/foreground";
await mkdir(outBg, { recursive: true });
await mkdir(outFg, { recursive: true });

for (const ch of chapters) {
  const masterDir = path.join("docs/art/generated/backgrounds", ch.dir, "masters");
  const files = (await readdir(masterDir))
    .filter((file) => file.startsWith("bg_stage_") && file.endsWith(".png"))
    .sort();
  for (const file of files) {
    const match = file.match(/^bg_stage_(\d{2})_(\d{2})_/);
    if (!match) continue;
    const key = `stage_${match[1]}_${match[2]}`;
    const outName = `${key}.webp`;
    await sharp(path.join(masterDir, file))
      .resize(860, 484, { fit: "fill" })
      .webp({ quality: 78, effort: 4 })
      .toFile(path.join(outBg, outName));
    console.log("bg", outName);
  }

  const runtimeDir = path.join("docs/art/generated/backgrounds", ch.dir, "runtime");
  for (const name of ch.fg) {
    const key = `fg_${ch.chapter}_${name}`;
    const outName = `${key}.webp`;
    await sharp(path.join(runtimeDir, `fg_${name}_occlusion_v01.png`))
      .resize(860, 484, { fit: "fill" })
      .webp({ quality: 80, alphaQuality: 90, effort: 4 })
      .toFile(path.join(outFg, outName));
    console.log("fg", outName);
  }
}

console.log("done");
