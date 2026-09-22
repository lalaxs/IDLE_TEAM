import type { GameDifficulty } from "../content/difficulties";
import type { Rarity } from "../content/rarities";

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
  | "E09" | "E10" | "E11" | "E12" | "E13" | "E14" | "E15" | "E16"
  | "E17" | "E18" | "E19" | "E20" | "E21" | "E22" | "E23" | "E24"
  | "E25" | "E26" | "E27" | "E28" | "E29" | "E30" | "E31" | "E32"
  | "E33" | "E34" | "E35" | "E36" | "E37" | "E38" | "E39" | "E40"
  | "E41" | "E42" | "E43" | "E44" | "E45" | "E46" | "E47" | "E48"
  | "E49" | "E50" | "E51" | "E52" | "E53" | "E54" | "E55" | "E56"
  | "E57" | "E58" | "E59" | "E60" | "E61" | "E62" | "E63" | "E64"
  | "E65" | "E66" | "E67" | "E68" | "E69" | "E70" | "E71" | "E72"
  | "E73" | "E74" | "E75" | "E76" | "E77" | "E78" | "E79" | "E80"
  | "E81" | "E82" | "E83" | "E84" | "E85" | "E86" | "E87" | "E88"
  | "E89" | "E90" | "E91" | "E92" | "E93" | "E94" | "E95" | "E96"
  | "E97" | "E98" | "E99" | "E100" | "E101" | "E102" | "E103" | "E104"
  | "E105" | "E106" | "E107" | "E108" | "E109" | "E110" | "E111" | "E112"
  | "E113" | "E114" | "E115" | "E116" | "E117" | "E118" | "E119" | "E120"
  | "B01" | "B02" | "B03" | "B04" | "B05" | "B06" | "B07" | "B08"
  | "B12" | "B16" | "B20" | "B24" | "B28" | "B32" | "B36" | "B40"
  | "B44" | "B48" | "B52" | "B56" | "B60" | "B64" | "B68" | "B72"
  | "B76" | "B80" | "B84" | "B88" | "B92" | "B96" | "B100" | "B104" | "B108"
  | "B112" | "B116" | "B120";
export type DamageElement = "physical" | "fire" | "frost" | "lightning" | "dark" | "holy";
export type AttackMode = "melee" | "ranged";
export type HitDelivery = "contact" | "projectile" | "indirect";
export type HitSourceKind = "basic" | "skill" | "periodic" | "reflected";

export type CombatAttributionKind =
  | "basic"
  | "activeSkill"
  | "passive"
  | "talent"
  | "gear"
  | "periodic"
  | "reflect"
  | "other";

export interface CombatAttribution {
  kind: CombatAttributionKind;
  /** Stable content identifier used to aggregate and label one combat source. */
  id: string;
}

export interface HitContext {
  sourceKind: HitSourceKind;
  delivery: HitDelivery;
}

export type Team = "heroes" | "enemies";
export type TargetStrategy =
  | "nearestEnemy"
  | "lowestHpEnemy"
  | "lowestHpAlly"
  | "frontmostEnemy";
export type StatusKind =
  | "stun"
  | "taunt"
  | "slow"
  | "haste"
  | "damageReduction"
  | "mirageGuard"
  | "armorBreak"
  | "vulnerability";

export interface StatusInstance {
  kind: StatusKind;
  /** Stable gameplay identity; different named effects may share one formula kind. */
  effectId?: string;
  sourceId: string;
  magnitude: number;
  remainingMs: number;
}

export interface PeriodicEffect {
  id: string;
  kind: "damage" | "heal";
  sourceId: string;
  attribution?: CombatAttribution;
  amount: number;
  /** Snapshotted additive skill bonus, used to combine live target-dependent damage bonuses. */
  skillDamagePct?: number;
  intervalMs: number;
  untilTickMs: number;
  remainingTicks: number;
  element?: DamageElement;
}

export interface SpecializationState {
  recentDamage: Array<{ amount: number; remainingMs: number }>;
  stagger: Array<{ amount: number; ticks: number; untilTickMs: number }>;
  demons: Array<{ remainingMs: number; untilAttackMs: number }>;
  channel?: { targetId: string; ticks: number; totalTicks: number; untilTickMs: number; multiplier: number };
  trap?: { x: number; remainingMs: number; armMs: number; occupantIds: string[] };
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
  rage: number;
  maxRage: number;
  attack: number;
  defense: number;
  /** Outgoing attack school; monster hits are mitigated by matching hero resist. */
  damageElement: DamageElement;
  critChance: number;
  /** Drives combat rules and presentation without guessing from attackRange. */
  attackMode: AttackMode;
  /** Reach beyond body contact for melee, or projectile travel before the target footprint. */
  attackRange: number;
  moveSpeed: number;
  attackIntervalMs: number;
  castSpeedPct: number;
  attackCooldownMs: number;
  skillTriggerMs: number;
  skillPrepareMs: number | null;
  /** Locked total duration for the current cast, used by simulation and presentation. */
  skillCastDurationMs: number | null;
  /** Correlates the preparation, release, and cancellation of one skill cast. */
  skillCastId: string | null;
  skillCastSequence: number;
  /** Targets locked when a telegraphed cast begins; dead targets are not replaced. */
  skillTargetIds: string[];
  targetId: string | null;
  shield: number;
  statuses: StatusInstance[];
  periodicEffects: PeriodicEffect[];
  alive: boolean;
  basicAttackCount: number;
  skillCastCount: number;
  chosenSkillId?: string | null;
  passiveFlags: Record<string, boolean | number | string>;
  specialization?: SpecializationState;
  /** Summoned escorts do not fill the stage boss meter. */
  countsForBossProgress?: boolean;
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
  | {
      type: "attack";
      attackId: string;
      sourceId: string;
      targetId: string;
      attackMode: AttackMode;
      element: DamageElement;
    }
  | {
      type: "damage";
      sourceId: string;
      targetId: string;
      amount: number;
      critical: boolean;
      element?: DamageElement;
      /** Correlates a resolved basic hit with its presentation timeline. */
      attackId?: string;
      /** Correlates active-skill damage with its projectile presentation. */
      skillCastId?: string;
      attribution?: CombatAttribution;
      hpDamage?: number;
      absorbed?: number;
    }
  | {
      type: "heal";
      sourceId: string;
      targetId: string;
      amount: number;
      /** Correlates an active-skill heal with its supportive travel effect. */
      skillCastId?: string;
      attribution?: CombatAttribution;
      /** Stat-only recovery such as frequent life steal should not create repeated audio or float text. */
      presentation?: "default" | "silent";
    }
  | { type: "skill:started"; castId: string; sourceId: string; skillId: string }
  | {
      type: "skill:resolved";
      castId: string;
      sourceId: string;
      skillId: string;
      targetIds: string[];
    }
  | { type: "skill:cancelled"; castId: string; sourceId: string; skillId: string }
  | { type: "status:applied"; targetId: string; kind: StatusKind }
  | { type: "unit:died"; unitId: string; attackId?: string; skillCastId?: string }
  | { type: "enemy:summoned"; sourceId: string; summonId: string; sourceEnemyId: EnemyId; hpRatio: number; attackRatio: number }
  | {
      type: "enemy:killed";
      unitId: string;
      worldX: number;
      worldY: number;
      kind: "normal" | "elite" | "boss";
      attackId?: string;
      skillCastId?: string;
    }
  | {
      type: "loot:dropped";
      sourceUnitId: string;
      worldX: number;
      worldY: number;
      drop: "gold";
      attackId?: string;
      skillCastId?: string;
    }
  | {
      type: "loot:dropped";
      sourceUnitId: string;
      worldX: number;
      worldY: number;
      drop: "equipment";
      definitionId: string;
      rarity: Rarity;
      attackId?: string;
      skillCastId?: string;
    }
  | { type: "battle:victory"; stage: number }
  | { type: "battle:defeat"; stage: number }
  | { type: "loot:revealed"; itemId: string }
  | { type: "boss:intro"; name: string }
  | { type: "boss:progress"; progress: number };

export interface BattleSnapshot {
  stage: number;
  difficulty: GameDifficulty;
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
