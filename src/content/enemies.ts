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
  { id: "E01", name: "小树怪", maxHp: 320, attack: 55, defense: 10, attackIntervalMs: 1500, attackRange: 55, moveSpeed: 88, kind: "normal", color: "#80965c", damageElement: "physical" },
  { id: "E02", name: "蘑菇怪", maxHp: 240, attack: 74, defense: 8, attackIntervalMs: 1250, attackRange: 65, moveSpeed: 101, kind: "normal", color: "#d77b69", damageElement: "dark" },
  { id: "E03", name: "石甲虫", maxHp: 520, attack: 45, defense: 30, attackIntervalMs: 1700, attackRange: 50, moveSpeed: 72, kind: "normal", color: "#7f8273", damageElement: "physical" },
  { id: "E04", name: "木桩精英", maxHp: 900, attack: 82, defense: 34, attackIntervalMs: 1450, attackRange: 60, moveSpeed: 75, kind: "elite", color: "#806447", damageElement: "physical" },
  { id: "B01", name: "古树守卫", maxHp: 1800, attack: 98, defense: 42, attackIntervalMs: 1600, attackRange: 80, moveSpeed: 62, kind: "boss", color: "#5d7551", damageElement: "physical" },
] as const;

/** Elite/boss follow the chapter school; mushroom trash carries the theme so mixed packs still pressure resist. */
export function resolveEnemyDamageElement(enemyId: EnemyId, stage: number): DamageElement {
  const definition = ENEMY_BY_ID[enemyId];
  if (!definition) return "physical";
  const theme = chapterThemeElement(stageToChapter(stage));
  if (definition.kind === "elite" || definition.kind === "boss") return theme;
  if (enemyId === "E02" && theme !== "physical") return theme;
  return definition.damageElement;
}

export const ENEMY_BY_ID = Object.fromEntries(
  ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
) as Record<EnemyId, EnemyDefinition>;
