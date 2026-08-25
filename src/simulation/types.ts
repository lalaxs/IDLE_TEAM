export type HeroId =
  | "H01"
  | "H02"
  | "H03"
  | "H04"
  | "H05"
  | "H06"
  | "H07"
  | "H08"
  | "H09"
  | "H10"
  | "H11"
  | "H12"
  | "H13"
  | "H14"
  | "H15"
  | "H16"
  | "H17"
  | "H18"
  | "H19"
  | "H20"
  | "H21"
  | "H22"
  | "H23"
  | "H24"
  | "H25"
  | "H26"
  | "H27"
  | "H28"
  | "H29"
  | "H30"
  | "H31"
  | "H32"
  | "H33"
  | "H34"
  | "H35"
  | "H36"
  | "H37"
  | "H38"
  | "H39"
  | "H40"
  | "H41"
  | "H42"
  | "H43"
  | "H44"
  | "H45"
  | "H46"
  | "H47"
  | "H48"
  | "H49"
  | "H50"
  | "H51"
  | "H52"
  | "H53"
  | "H54"
  | "H55"
  | "H56"
  | "H57"
  | "H58"
  | "H59"
  | "H60"
  | "H61"
  | "H62"
  | "H63"
  | "H64"
  | "H65"
  | "H66"
  | "H67"
  | "H68"
  | "H69"
  | "H70"
  | "H71"
  | "H72"
  | "H73"
  | "H74"
  | "H75"
  | "H76"
  | "H77"
  | "H78"
  | "H79"
  | "H80";

export type EnemyId =
  | "E01" | "E02" | "E03" | "E04" | "E05" | "E06" | "E07" | "E08"
  | "B01" | "B02" | "B03" | "B04" | "B05" | "B06" | "B07" | "B08";
export type DamageElement = "physical" | "fire" | "frost" | "lightning" | "dark" | "holy";
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
  /** Outgoing attack school; monster hits are mitigated by matching hero resist. */
  damageElement: DamageElement;
  critChance: number;
  attackRange: number;
  moveSpeed: number;
  attackIntervalMs: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  ultimateCooldownMs: number;
  targetId: string | null;
  shield: number;
  statuses: StatusInstance[];
  alive: boolean;
  basicAttackCount: number;
  skillCastCount: number;
  chosenSkillId?: string | null;
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
  | { type: "damage"; sourceId: string; targetId: string; amount: number; critical: boolean; element?: DamageElement }
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
