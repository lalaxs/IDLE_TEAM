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
}

export const ENEMY_DEFINITIONS: readonly EnemyDefinition[] = [
  { id: "E01", name: "小树怪", maxHp: 320, attack: 55, defense: 10, attackIntervalMs: 1500, attackRange: 55, moveSpeed: 88, kind: "normal", color: "#80965c" },
  { id: "E02", name: "蘑菇怪", maxHp: 240, attack: 74, defense: 8, attackIntervalMs: 1250, attackRange: 65, moveSpeed: 101, kind: "normal", color: "#d77b69" },
  { id: "E03", name: "石甲虫", maxHp: 520, attack: 45, defense: 30, attackIntervalMs: 1700, attackRange: 50, moveSpeed: 72, kind: "normal", color: "#7f8273" },
  { id: "E04", name: "木桩精英", maxHp: 900, attack: 82, defense: 34, attackIntervalMs: 1450, attackRange: 60, moveSpeed: 75, kind: "elite", color: "#806447" },
  { id: "B01", name: "古树守卫", maxHp: 1800, attack: 98, defense: 42, attackIntervalMs: 1600, attackRange: 80, moveSpeed: 62, kind: "boss", color: "#5d7551" },
] as const;

export const ENEMY_BY_ID = Object.fromEntries(
  ENEMY_DEFINITIONS.map((enemy) => [enemy.id, enemy]),
) as Record<EnemyId, EnemyDefinition>;
