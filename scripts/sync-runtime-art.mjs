/**
 * Sync runtime art into public/assets and print H41–H80 roster stubs.
 * Run: node scripts/sync-runtime-art.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/assets/characters");
mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(
  readFileSync(join(root, "docs/art/requirements/direct-generated-hero-manifest.json"), "utf8"),
);

/** Current H01–H40 art keys (must stay stable for saves). */
const EXISTING_ART_KEYS = [
  "wa_pro_m", "wa_fur_m", "ma_fir_f", "pr_hol_f", "hu_mar_m", "ro_ass_m", "ma_fro_f", "sh_ele_m",
  "dk_bld_m", "dk_fro_f", "dk_uho_f", "dh_hav_m", "dh_ven_f", "dh_dev_f", "pr_sha_f", "wa_arm_f",
  "pa_pro_m", "dr_res_f", "ev_dev_f", "dr_bal_f", "pa_ret_f", "hu_bea_m", "hu_sur_m", "wl_aff_f",
  "mo_win_m", "mo_mis_f", "ro_out_m", "sh_enh_f", "ma_arc_m", "ev_aug_m", "wl_dem_m", "wl_des_f",
  "dr_fer_m", "ro_sub_f", "wa_pro_f", "sh_res_f", "pr_dis_f", "wl_aff_m", "ma_fir_m", "pa_ret_m",
];

function skillPatternFor(artKey) {
  const [cls, spec] = artKey.split("_");
  if (cls === "dk") return "H01";
  if (cls === "dh") return spec === "hav" ? "H06" : spec === "ven" ? "H01" : "H03";
  if (cls === "dr") return spec === "gua" ? "H01" : spec === "fer" ? "H06" : spec === "res" ? "H04" : "H07";
  if (cls === "ev") return spec === "pre" ? "H04" : spec === "aug" ? "H08" : "H03";
  if (cls === "hu") return spec === "sur" ? "H02" : "H05";
  if (cls === "ma") return spec === "fro" ? "H07" : "H03";
  if (cls === "mo") return spec === "win" ? "H06" : spec === "mis" ? "H04" : "H08";
  if (cls === "pa") return spec === "pro" ? "H01" : spec === "hol" ? "H04" : "H02";
  if (cls === "pr") return spec === "sha" ? "H07" : "H04";
  if (cls === "ro") return "H06";
  if (cls === "sh") return spec === "res" ? "H04" : "H08";
  if (cls === "wl") return spec === "dem" ? "H08" : "H03";
  if (cls === "wa") return spec === "pro" ? "H01" : "H02";
  return "H02";
}

function elementFor(artKey) {
  const [cls, spec] = artKey.split("_");
  if (cls === "dk") return spec === "fro" ? ["physical", "frost"] : spec === "bld" ? ["physical", "dark"] : ["magic", "dark"];
  if (cls === "dh") return spec === "ven" ? ["physical", "fire"] : ["physical", "dark"];
  if (cls === "dr") return spec === "fer" || spec === "gua" ? ["physical", "physical"] : ["magic", "frost"];
  if (cls === "ev") return spec === "aug" ? ["physical", "lightning"] : spec === "pre" ? ["magic", "holy"] : ["magic", "fire"];
  if (cls === "hu") return ["physical", "physical"];
  if (cls === "ma") return spec === "fro" ? ["magic", "frost"] : spec === "arc" ? ["magic", "lightning"] : ["magic", "fire"];
  if (cls === "mo") return spec === "win" ? ["physical", "physical"] : ["magic", "frost"];
  if (cls === "pa") return spec === "ret" ? ["physical", "holy"] : spec === "hol" ? ["magic", "holy"] : ["physical", "physical"];
  if (cls === "pr") return spec === "sha" ? ["magic", "dark"] : ["magic", "holy"];
  if (cls === "ro") return spec === "out" ? ["physical", "physical"] : ["physical", "dark"];
  if (cls === "sh") return ["magic", "lightning"];
  if (cls === "wl") return spec === "dem" ? ["magic", "lightning"] : ["magic", "dark"];
  if (cls === "wa") return ["physical", "physical"];
  return ["physical", "physical"];
}

const SPEC_STATS = {
  H01: { maxHp: 1400, attack: 95, defense: 58, attackIntervalMs: 1350, attackRange: 65, moveSpeed: 110, targetStrategy: "nearestEnemy" },
  H02: { maxHp: 1120, attack: 128, defense: 36, attackIntervalMs: 950, attackRange: 65, moveSpeed: 125, targetStrategy: "nearestEnemy" },
  H03: { maxHp: 790, attack: 150, defense: 18, attackIntervalMs: 1450, attackRange: 265, moveSpeed: 97, targetStrategy: "nearestEnemy" },
  H04: { maxHp: 910, attack: 75, defense: 28, attackIntervalMs: 1550, attackRange: 248, moveSpeed: 96, targetStrategy: "nearestEnemy" },
  H05: { maxHp: 870, attack: 120, defense: 24, attackIntervalMs: 1020, attackRange: 285, moveSpeed: 106, targetStrategy: "nearestEnemy" },
  H06: { maxHp: 860, attack: 142, defense: 26, attackIntervalMs: 870, attackRange: 55, moveSpeed: 152, targetStrategy: "lowestHpEnemy" },
  H07: { maxHp: 820, attack: 132, defense: 20, attackIntervalMs: 1360, attackRange: 255, moveSpeed: 98, targetStrategy: "nearestEnemy" },
  H08: { maxHp: 1040, attack: 115, defense: 34, attackIntervalMs: 1180, attackRange: 140, moveSpeed: 112, targetStrategy: "nearestEnemy" },
};

const SPEC_COLORS = {
  H01: "#6b8b69", H02: "#cf7158", H03: "#d97c55", H04: "#e2b958",
  H05: "#6f9c61", H06: "#67607d", H07: "#72a7c8", H08: "#a171a4",
};

const NAMES_M = ["阿伦","布伦","达恩","埃文","费恩","格雷","哈尔","伊恩","乔恩","凯恩","莱恩","诺恩","欧文","佩恩","奎恩","雷恩","肖恩","特恩","乌恩","文恩"];
const NAMES_F = ["艾拉","贝拉","西拉","黛拉","芙拉","菲拉","吉拉","希拉","伊拉","贾拉","卡拉","莱拉","米拉","妮拉","奥拉","皮拉","琪拉","瑞拉","萨拉","蒂拉"];

const used = new Set(EXISTING_ART_KEYS);
const remaining = manifest.heroes
  .map((h) => h.id.replaceAll("-", "_"))
  .filter((key) => !used.has(key));

if (remaining.length !== 40) {
  console.error(`Expected 40 remaining art keys, got ${remaining.length}`);
  process.exit(1);
}

const heroByKey = Object.fromEntries(
  manifest.heroes.map((h) => [h.id.replaceAll("-", "_"), h]),
);

/** Full H01–H80 art key list */
const allArtKeys = [...EXISTING_ART_KEYS, ...remaining];

let copiedHeroes = 0;
for (let i = 0; i < allArtKeys.length; i += 1) {
  const key = allArtKeys[i];
  const src = join(root, `docs/art/generated/heroes/runtime/hero_${key}_runtime_v01.webp`);
  const dest = join(outDir, `hero-h${String(i + 1).padStart(2, "0")}.webp`);
  if (!existsSync(src)) {
    console.error(`Missing hero art: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  copiedHeroes += 1;
}

const enemyCopies = [
  ["docs/art/generated/monsters/grassland/concepts/transparent/e01_tender-branch-sprite_concept_v01.png", "enemy-e01.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/e02_red-cap-fungus_concept_v01.png", "enemy-e02.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/e03_gray-shell-beetle_concept_v01.png", "enemy-e03.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/e04_old-stump-guard_concept_v01.png", "enemy-e04.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/e05_thorn-badger_concept_v02.png", "enemy-e05.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/e06_mossback-frog_concept_v02.png", "enemy-e06.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/e07_duskwing-bat_concept_v02.png", "enemy-e07.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/e08_coiled-root-guard_concept_v02.png", "enemy-e08.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/b01_thorn-root-beast_concept_v01.png", "enemy-b01.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/b02_broad-cap-matriarch_concept_v01.png", "enemy-b02.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/b03_rock-back-beetle_concept_v01.png", "enemy-b03.png"],
  ["docs/art/generated/monsters/grassland/concepts/transparent/b04_wind-sail-lizard_concept_v04.png", "enemy-b04.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/b05_forest-gate-sentry_concept_v02.png", "enemy-b05.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/b06_dark-creek-giant-frog_concept_v02.png", "enemy-b06.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/b07_entwined-root-tree-beast_concept_v02.png", "enemy-b07.png"],
  ["docs/art/generated/monsters/forest/concepts/transparent/b08_steleback-giant-lizard_concept_v02.png", "enemy-b08.png"],
];

let copiedEnemies = 0;
for (const [rel, name] of enemyCopies) {
  const src = join(root, rel);
  if (!existsSync(src)) {
    console.error(`Missing enemy art: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, join(outDir, name));
  copiedEnemies += 1;
}

const roster41 = [];
const identities41 = [];
for (let i = 0; i < remaining.length; i += 1) {
  const artKey = remaining[i];
  const meta = heroByKey[artKey];
  const spec = artKey.split("_")[1];
  const gender = artKey.endsWith("_f") ? "f" : "m";
  const pattern = skillPatternFor(artKey);
  const stats = SPEC_STATS[pattern];
  const id = `H${String(41 + i).padStart(2, "0")}`;
  const role = meta.specialization_name;
  const name = gender === "f" ? NAMES_F[i % NAMES_F.length] : NAMES_M[i % NAMES_M.length];
  const [school, element] = elementFor(artKey);
  const skillNames = {
    H01: ["盾击", "坚守", "壁垒"],
    H02: ["连斩", "血性", "旋风"],
    H03: ["爆裂", "余烬", "陨落"],
    H04: ["治愈", "余辉", "圣域"],
    H05: ["穿林", "连射", "箭雨"],
    H06: ["影袭", "猎残", "影舞"],
    H07: ["霜环", "寒意", "暴风雪"],
    H08: ["雷链", "战鼓", "风暴"],
  }[pattern];

  roster41.push(
    `  { id: "${id}", role: "${role}", color: "${SPEC_COLORS[pattern]}", maxHp: ${stats.maxHp}, attack: ${stats.attack}, defense: ${stats.defense}, attackIntervalMs: ${stats.attackIntervalMs}, attackRange: ${stats.attackRange}, moveSpeed: ${stats.moveSpeed}, artKey: "${artKey}", skillPattern: "${pattern}", targetStrategy: "${stats.targetStrategy}", tagline: "${meta.class_name}·${meta.specialization_name}的战场专精", activeName: "${skillNames[0]}", passiveName: "${skillNames[1]}", ultimateName: "${skillNames[2]}" },`,
  );
  identities41.push(
    `  { id: "${id}", name: "${name}", damageSchool: "${school}", damageElement: "${element}" },`,
  );
}

writeFileSync(join(root, "scripts/_generated-h41-h80-roster.txt"), roster41.join("\n") + "\n");
writeFileSync(join(root, "scripts/_generated-h41-h80-identities.txt"), identities41.join("\n") + "\n");
writeFileSync(
  join(root, "scripts/_generated-art-keys.json"),
  JSON.stringify({ allArtKeys, remaining }, null, 2),
);

console.log(`Copied ${copiedHeroes} hero webps and ${copiedEnemies} enemy pngs.`);
console.log(`Generated H41–H80 stubs (${roster41.length}).`);
