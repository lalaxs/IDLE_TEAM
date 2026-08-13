export type HeroId =
  | "H01"
  | "H02"
  | "H03"
  | "H04"
  | "H05"
  | "H06"
  | "H07"
  | "H08";

export type EnemyId = "E01" | "E02" | "E03" | "E04" | "B01";
export type Team = "heroes" | "enemies";
export type TargetStrategy =
  | "nearestEnemy"
  | "lowestHpEnemy"
  | "lowestHpAlly"
  | "frontmostEnemy";
export type StatusKind = "stun" | "slow" | "haste" | "damageReduction" | "mirageGuard" | "armorBreak";

export interface StatusInstance {
  kind: StatusKind;
  sourceId: string;
  magnitude: number;
  remainingMs: number;
}

export interface UnitState {
  id: string;
  team: Team;
  sourceId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  critChance: number;
  attackRange: number;
  moveSpeed: number;
  attackIntervalMs: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  targetId: string | null;
  shield: number;
  statuses: StatusInstance[];
  alive: boolean;
  basicAttackCount: number;
  skillCastCount: number;
  passiveFlags: Record<string, boolean | number>;
}

export type BattleState =
  | "boot"
  | "waveIntro"
  | "travelling"
  | "advancing"
  | "engaging"
  | "waveClear"
  | "bossIntro"
  | "victory"
  | "defeat";

export type BattleEvent =
  | { type: "wave:started"; wave: number }
  | { type: "attack"; sourceId: string; targetId: string; ranged: boolean }
  | { type: "damage"; sourceId: string; targetId: string; amount: number; critical: boolean }
  | { type: "heal"; sourceId: string; targetId: string; amount: number }
  | { type: "skill:started"; sourceId: string; skillId: string }
  | { type: "skill:resolved"; sourceId: string; skillId: string; targetIds: string[] }
  | { type: "status:applied"; targetId: string; kind: StatusKind }
  | { type: "unit:died"; unitId: string }
  | { type: "enemy:killed"; kind: "normal" | "elite" | "boss" }
  | { type: "battle:victory"; stage: number }
  | { type: "battle:defeat"; stage: number }
  | { type: "loot:revealed"; itemId: string }
  | { type: "boss:intro"; name: string }
  | { type: "boss:progress"; progress: number };

export interface BattleSnapshot {
  stage: number;
  /** Internal encounter index used for pack seeding (not shown as “wave N”). */
  wave: number;
  state: BattleState;
  elapsedMs: number;
  units: UnitState[];
  /** 0–1 meter filled by trash kills; reaches 1 to summon the boss. */
  progress: number;
  /** True once the boss pack has been summoned this stage. */
  bossActive: boolean;
  seed: number;
}
