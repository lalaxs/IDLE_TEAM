import { stageToChapter } from "./chapters";
import { chapterThemeElement, type DamageElement } from "./damageElements";
import type { EnemyId } from "../simulation/types";

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  attackIntervalMs: number;
  attackRange: number;
  moveSpeed: number;
  kind: "normal" | "elite" | "boss";
  color: string;
  /** Base attack school; elites/bosses follow the chapter theme instead. */
  damageElement: DamageElement;
}

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = [
  { id: "E01", name: "嫩枝精", maxHp: 320, attack: 55, defense: 10, attackIntervalMs: 1500, attackRange: 55, moveSpeed: 88, kind: "normal", color: "#80965c", damageElement: "physical" },
  { id: "E02", name: "红帽菌兽", maxHp: 240, attack: 74, defense: 8, attackIntervalMs: 1250, attackRange: 65, moveSpeed: 101, kind: "normal", color: "#d77b69", damageElement: "dark" },
  { id: "E03", name: "灰壳甲虫", maxHp: 520, attack: 45, defense: 30, attackIntervalMs: 1700, attackRange: 50, moveSpeed: 72, kind: "normal", color: "#7f8273", damageElement: "physical" },
  { id: "E04", name: "老桩卫", maxHp: 900, attack: 82, defense: 34, attackIntervalMs: 1450, attackRange: 60, moveSpeed: 75, kind: "elite", color: "#806447", damageElement: "physical" },
  { id: "E05", name: "荆棘獾", maxHp: 360, attack: 62, defense: 14, attackIntervalMs: 1400, attackRange: 55, moveSpeed: 96, kind: "normal", color: "#6a7a4a", damageElement: "physical" },
  { id: "E06", name: "苔背蛙", maxHp: 300, attack: 70, defense: 12, attackIntervalMs: 1300, attackRange: 60, moveSpeed: 90, kind: "normal", color: "#5a8a5a", damageElement: "frost" },
  { id: "E07", name: "暮翼蝠", maxHp: 280, attack: 78, defense: 10, attackIntervalMs: 1200, attackRange: 70, moveSpeed: 110, kind: "normal", color: "#5a5a7a", damageElement: "dark" },
  { id: "E08", name: "盘根卫", maxHp: 980, attack: 88, defense: 36, attackIntervalMs: 1500, attackRange: 60, moveSpeed: 70, kind: "elite", color: "#5d6b45", damageElement: "physical" },
  { id: "B01", name: "刺根兽", maxHp: 1800, attack: 98, defense: 42, attackIntervalMs: 1600, attackRange: 80, moveSpeed: 62, kind: "boss", color: "#5d7551", damageElement: "physical" },
  { id: "B02", name: "大伞菌母", maxHp: 1900, attack: 102, defense: 40, attackIntervalMs: 1550, attackRange: 85, moveSpeed: 58, kind: "boss", color: "#b05a4a", damageElement: "dark" },
  { id: "B03", name: "岩背甲虫王", maxHp: 2100, attack: 95, defense: 55, attackIntervalMs: 1700, attackRange: 75, moveSpeed: 55, kind: "boss", color: "#7a7a6a", damageElement: "physical" },
  { id: "B04", name: "风帆蜥", maxHp: 1850, attack: 108, defense: 38, attackIntervalMs: 1450, attackRange: 90, moveSpeed: 68, kind: "boss", color: "#8a7a4a", damageElement: "physical" },
  { id: "B05", name: "林门哨卫", maxHp: 2000, attack: 105, defense: 48, attackIntervalMs: 1600, attackRange: 80, moveSpeed: 60, kind: "boss", color: "#4a6a4a", damageElement: "physical" },
  { id: "B06", name: "暗溪巨蛙", maxHp: 1950, attack: 110, defense: 36, attackIntervalMs: 1500, attackRange: 95, moveSpeed: 64, kind: "boss", color: "#3a6a6a", damageElement: "frost" },
  { id: "B07", name: "缠根树兽", maxHp: 2200, attack: 100, defense: 52, attackIntervalMs: 1650, attackRange: 85, moveSpeed: 52, kind: "boss", color: "#4a5a3a", damageElement: "physical" },
  { id: "B08", name: "碑背巨蜥", maxHp: 2300, attack: 112, defense: 50, attackIntervalMs: 1580, attackRange: 90, moveSpeed: 56, kind: "boss", color: "#6a5a4a", damageElement: "physical" },
] as const;

/** Elite/boss follow the chapter school; theme trash can carry the chapter element. */
export function resolveEnemyDamageElement(enemyId: EnemyId, stage: number): DamageElement {
  const definition = ENEMY_BY_ID[enemyId];
  if (!definition) return "physical";
  const theme = chapterThemeElement(stageToChapter(stage));
  if (definition.kind === "elite" || definition.kind === "boss") return theme;
  if ((enemyId === "E02" || enemyId === "E07") && theme !== "physical") return theme;
  return definition.damageElement;
}

export const ENEMY_BY_ID = Object.fromEntries(
  ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
) as Record<EnemyId, EnemyDefinition>;

export const NORMAL_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "normal").map((e) => e.id);
export const ELITE_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "elite").map((e) => e.id);
export const BOSS_ENEMY_IDS = ENEMY_DEFINITIONS.filter((e) => e.kind === "boss").map((e) => e.id);

/** Stage boss cycles through available boss arts. */
export function bossIdForStage(stage: number): EnemyId {
  const index = Math.max(0, stage - 1) % BOSS_ENEMY_IDS.length;
  return BOSS_ENEMY_IDS[index]!;
}
