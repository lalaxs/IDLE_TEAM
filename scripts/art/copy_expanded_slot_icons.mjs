/**
 * Copy placeholder webp icons for expanded equipment slots from existing donors.
 * Run: node scripts/art/copy_expanded_slot_icons.mjs
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const equipmentDir = join(root, "public/assets/equipment");
const sourcePath = join(root, "src/content/expandedSlots.ts");
const source = readFileSync(sourcePath, "utf8");

const entries = [...source.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?iconDonor:\s*"([^"]+)"/g)].map(
  (match) => ({ id: match[1], iconDonor: match[2] }),
);

if (entries.length === 0) {
  throw new Error("No expanded slot entries parsed from expandedSlots.ts");
}

let copied = 0;
let skipped = 0;
for (const item of entries) {
  const dest = join(equipmentDir, `${item.id}.webp`);
  const src = join(equipmentDir, `${item.iconDonor}.webp`);
  if (!existsSync(src)) {
    throw new Error(`Missing donor icon: ${item.iconDonor}.webp`);
  }
  copyFileSync(src, dest);
  if (existsSync(dest)) copied += 1;
  else skipped += 1;
}

console.log(`Expanded slot icons: wrote ${copied} files from ${entries.length} definitions`);
