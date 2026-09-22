import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";

const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: "custom", logLevel: "error" });
try {
  const { specializationScenario } = await server.ssrLoadModule("/tests/support/specializationScenario.ts");
  const { SPECIALIZATIONS } = await server.ssrLoadModule("/src/content/specializations.ts");
  const rows = [];
  for (const spec of SPECIALIZATIONS) {
    const samples = [1, 3].map((enemyCount) => {
      const runs = [7, 23, 71].map((seed) => specializationScenario(spec.id, enemyCount, 0, seed));
      const mean = (field) => Math.round(runs.reduce((sum, run) => sum + run[field], 0) / runs.length);
      return { enemyCount, damage: mean("damage"), healing: mean("healing"), teamDamage: mean("teamDamage"),
        casts: mean("casts"), basicHits: mean("basicHits"), passiveDamage: mean("passiveDamage"), hp: mean("hp"), shield: mean("shield") };
    });
    rows.push({ spec: spec.id, name: `${spec.className}·${spec.name}`, samples });
  }
  const directory = "docs/delivery";
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/2026-09-22-specialization-benchmark.json`, JSON.stringify(rows, null, 2) + "\n");
  const markdown = ["# 专精同条件战斗对照", "", "30秒自动战斗，每种场景取固定种子7、23、71的平均值，共240场。测试英雄攻击100、生命上限5000、初始生命3000、暴击15%、格挡15%、普攻间隔1秒、初始怒气0，不装备终层天赋；四名普通队友各攻击60、初始生命2500。敌人攻击40、普攻间隔1.5秒、生命100万，分别设置单体和三目标。使用正式战斗调度与伤害结算。", "", "伤害为个人实际伤害，治疗为实际恢复生命，末盾为结束时剩余护盾，均为三次平均。该场景用于观察机制和持续战斗差异；敌人不会死亡，无法体现斩杀、死亡传播与清怪收益，坦克承伤和治疗也不能用输出排名评价。", "", "| 专精 | 单体伤害 | 三目标伤害 | 三目标治疗 | 三目标施法 | 三目标末生命 | 三目标末盾 |", "|---|---:|---:|---:|---:|---:|---:|"];
  for (const row of rows) { const [single, pack] = row.samples; markdown.push(`| ${row.name} | ${single.damage} | ${pack.damage} | ${pack.healing} | ${pack.casts} | ${pack.hp} | ${pack.shield} |`); }
  await writeFile(`${directory}/2026-09-22-specialization-benchmark.md`, markdown.join("\n") + "\n");
  console.log(`Recorded ${rows.length} specializations across ${rows.length * 6} arena battles.`);
} finally { await server.close(); }
