import type { DamageElement, StatusKind, TargetStrategy } from "../simulation/types";

export type EnemyCombatProfileId = string;

export interface EnemyStatusEffect {
  kind: Extract<StatusKind, "stun" | "slow" | "haste" | "damageReduction" | "armorBreak" | "vulnerability">;
  magnitude: number;
  durationMs: number;
}

export type EnemyCadenceEffect =
  | { id: string; everyHits: number; kind: "bonusDamage"; attackMultiplier: number }
  | { id: string; everyHits: number; kind: "targetStatus"; status: EnemyStatusEffect }
  | { id: string; everyHits: number; kind: "selfStatus"; status: EnemyStatusEffect }
  | { id: string; everyHits: number; kind: "selfShield"; maxHpRatio: number; skipWhileShielded: boolean }
  | { id: string; everyHits: number; kind: "splitHit"; secondaryMultiplier: number }
  | { id: string; everyHits: number; kind: "splitPeriodic"; secondaryMultiplier: number; powerPct: number; intervalMs: number; ticks: number; element?: DamageElement }
  | { id: string; everyHits: number; kind: "periodicDamage"; powerPct: number; intervalMs: number; ticks: number; element?: DamageElement }
  | { id: string; everyHits: number; kind: "allyStatus"; status: EnemyStatusEffect; count: number; includeSelf: boolean }
  | { id: string; everyHits: number; kind: "allyShield"; maxHpRatio: number; count: number; includeSelf: boolean; skipWhileShielded: boolean }
  | { id: string; everyHits: number; kind: "allyHeal"; attackMultiplier: number; maxHpRatio: number };

export interface EnemyHealthPhase {
  id: string;
  name?: string;
  hpRatio: number;
  status?: EnemyStatusEffect;
  shieldMaxHpRatio?: number;
  activeCooldownMs?: number;
  summon?: { id: string; sourceId: string; count: number; hpRatio: number; attackRatio: number; prepareMs?: number };
  active?: EnemyActiveAbility;
  allyStatus?: { status: EnemyStatusEffect; includeSelf: boolean };
  allyShieldMaxHpRatio?: { amountPctMaxHp: number; includeSelf: boolean };
}

export interface EnemyActiveAbility {
  id: string;
  name: string;
  trigger:
    | { kind: "cooldown"; initialMs: number; cooldownMs: number }
    | { kind: "basicHits"; everyHits: number };
  prepareMs: number;
  targetCount: number;
  targetStrategy?: TargetStrategy;
  attackMultiplier: number;
  targetMultipliers?: readonly number[];
  hits?: number;
  targetStatus?: EnemyStatusEffect;
  selfStatus?: EnemyStatusEffect;
  selfShieldMaxHpRatio?: number;
  periodicDamage?: { powerPct: number; intervalMs: number; ticks: number; element?: DamageElement };
  allyStatus?: { status: EnemyStatusEffect; count: number; includeSelf: boolean };
  allyShieldMaxHpRatio?: { amountPctMaxHp: number; count: number; includeSelf: boolean };
  allyHeal?: { attackMultiplier: number; maxHpRatio: number };
}

export interface EnemyCombatProfile {
  id: EnemyCombatProfileId;
  targetStrategy: TargetStrategy;
  lockTargetUntilDeath?: boolean;
  cadence?: EnemyCadenceEffect;
  openingStrikeMultiplier?: number;
  deathBurstMultiplier?: number;
  active?: EnemyActiveAbility;
  healthPhase?: EnemyHealthPhase;
}

const PERMANENT = 999_999;
const status = (kind: EnemyStatusEffect["kind"], magnitude: number, durationMs: number): EnemyStatusEffect => ({ kind, magnitude, durationMs });

const cadenceProfiles: Record<string, EnemyCombatProfile> = {
  baseline: { id: "baseline", targetStrategy: "frontmostEnemy" },
  "cadence-strike": { id: "cadence-strike", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-strike", everyHits: 4, kind: "bonusDamage", attackMultiplier: 0.35 } },
  "cadence-strike-40": { id: "cadence-strike-40", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-strike-40", everyHits: 4, kind: "bonusDamage", attackMultiplier: 0.4 } },
  "cadence-slow-15": { id: "cadence-slow-15", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-slow-15", everyHits: 4, kind: "targetStatus", status: status("slow", 0.15, 1500) } },
  "cadence-slow-18": { id: "cadence-slow-18", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-slow-18", everyHits: 4, kind: "targetStatus", status: status("slow", 0.18, 1800) } },
  "cadence-slow-20": { id: "cadence-slow-20", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-slow-20", everyHits: 4, kind: "targetStatus", status: status("slow", 0.2, 2000) } },
  "cadence-slow-22": { id: "cadence-slow-22", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-slow-22", everyHits: 4, kind: "targetStatus", status: status("slow", 0.22, 2000) } },
  "cadence-expose-8": { id: "cadence-expose-8", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-expose-8", everyHits: 4, kind: "targetStatus", status: status("vulnerability", 0.08, 2000) } },
  "cadence-expose-10": { id: "cadence-expose-10", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-expose-10", everyHits: 4, kind: "targetStatus", status: status("vulnerability", 0.1, 2000) } },
  "cadence-break": { id: "cadence-break", targetStrategy: "frontmostEnemy", cadence: { id: "cadence-break", everyHits: 4, kind: "targetStatus", status: status("armorBreak", 0.12, 2500) } },
  "split-hit-30": { id: "split-hit-30", targetStrategy: "frontmostEnemy", cadence: { id: "split-hit-30", everyHits: 4, kind: "splitHit", secondaryMultiplier: 0.3 } },
  "split-hit-35": { id: "split-hit-35", targetStrategy: "frontmostEnemy", cadence: { id: "split-hit-35", everyHits: 4, kind: "splitHit", secondaryMultiplier: 0.35 } },
  "split-burn-30": { id: "split-burn-30", targetStrategy: "frontmostEnemy", cadence: { id: "split-burn-30", everyHits: 5, kind: "splitPeriodic", secondaryMultiplier: 0.3, powerPct: 0.08, intervalMs: 1000, ticks: 3, element: "fire" } },
  "low-hp-hunter": { id: "low-hp-hunter", targetStrategy: "lowestHpEnemy", lockTargetUntilDeath: true },
  "nearest-ranged": { id: "nearest-ranged", targetStrategy: "nearestEnemy" },
  "opening-strike-125": { id: "opening-strike-125", targetStrategy: "frontmostEnemy", openingStrikeMultiplier: 1.25 },
  "opening-strike-130": { id: "opening-strike-130", targetStrategy: "frontmostEnemy", openingStrikeMultiplier: 1.3 },
  "shell-guard-18": { id: "shell-guard-18", targetStrategy: "frontmostEnemy", healthPhase: { id: "shell-guard-18", hpRatio: 0.5, status: status("damageReduction", 0.18, 3000) } },
  "shell-guard-20": { id: "shell-guard-20", targetStrategy: "frontmostEnemy", healthPhase: { id: "shell-guard-20", hpRatio: 0.5, status: status("damageReduction", 0.2, 3000) } },
  "shell-shield-12": { id: "shell-shield-12", targetStrategy: "frontmostEnemy", healthPhase: { id: "shell-shield-12", hpRatio: 0.5, shieldMaxHpRatio: 0.12 } },
  "self-shield-12": { id: "self-shield-12", targetStrategy: "frontmostEnemy", cadence: { id: "self-shield-12", everyHits: 5, kind: "selfShield", maxHpRatio: 0.12, skipWhileShielded: true } },
  "periodic-wound-10": { id: "periodic-wound-10", targetStrategy: "frontmostEnemy", cadence: { id: "periodic-wound-10", everyHits: 4, kind: "periodicDamage", powerPct: 0.1, intervalMs: 1000, ticks: 3 } },
  "periodic-wound-12": { id: "periodic-wound-12", targetStrategy: "frontmostEnemy", cadence: { id: "periodic-wound-12", everyHits: 4, kind: "periodicDamage", powerPct: 0.12, intervalMs: 1000, ticks: 3 } },
  "death-burst-35": { id: "death-burst-35", targetStrategy: "frontmostEnemy", deathBurstMultiplier: 0.35 },
  "ally-guard-12": { id: "ally-guard-12", targetStrategy: "frontmostEnemy", cadence: { id: "ally-guard-12", everyHits: 6, kind: "allyStatus", status: status("damageReduction", 0.12, 2500), count: 2, includeSelf: true } },
  "ally-guard-15": { id: "ally-guard-15", targetStrategy: "frontmostEnemy", cadence: { id: "ally-guard-15", everyHits: 6, kind: "allyStatus", status: status("damageReduction", 0.15, 2500), count: 2, includeSelf: true } },
  "ally-guard-12-3": { id: "ally-guard-12-3", targetStrategy: "frontmostEnemy", cadence: { id: "ally-guard-12-3", everyHits: 6, kind: "allyStatus", status: status("damageReduction", 0.12, 2500), count: 3, includeSelf: true } },
  "ally-guard-15-3": { id: "ally-guard-15-3", targetStrategy: "frontmostEnemy", cadence: { id: "ally-guard-15-3", everyHits: 6, kind: "allyStatus", status: status("damageReduction", 0.15, 2500), count: 3, includeSelf: true } },
  "ally-haste-14": { id: "ally-haste-14", targetStrategy: "frontmostEnemy", cadence: { id: "ally-haste-14", everyHits: 6, kind: "allyStatus", status: status("haste", 0.14, 2500), count: 3, includeSelf: true } },
  "ally-shield-10": { id: "ally-shield-10", targetStrategy: "frontmostEnemy", cadence: { id: "ally-shield-10", everyHits: 6, kind: "allyShield", maxHpRatio: 0.1, count: 2, includeSelf: true, skipWhileShielded: true } },
  "ally-shield-low-10": { id: "ally-shield-low-10", targetStrategy: "frontmostEnemy", cadence: { id: "ally-shield-low-10", everyHits: 6, kind: "allyShield", maxHpRatio: 0.1, count: 2, includeSelf: false, skipWhileShielded: true } },
  "ally-shield-low-12": { id: "ally-shield-low-12", targetStrategy: "frontmostEnemy", cadence: { id: "ally-shield-low-12", everyHits: 6, kind: "allyShield", maxHpRatio: 0.12, count: 1, includeSelf: false, skipWhileShielded: true } },
  "ally-mend": { id: "ally-mend", targetStrategy: "frontmostEnemy", cadence: { id: "ally-mend", everyHits: 5, kind: "allyHeal", attackMultiplier: 0.45, maxHpRatio: 0.08 } },
  "elite-summon": { id: "elite-summon", targetStrategy: "frontmostEnemy", healthPhase: { id: "elite-summon", name: "残旗集结", hpRatio: 0.5, summon: { id: "grave-squire", sourceId: "E89", count: 1, hpRatio: 0.5, attackRatio: 0.45, prepareMs: 900 } } },
  "elite-guard": { id: "elite-guard", targetStrategy: "frontmostEnemy", cadence: { id: "elite-guard", everyHits: 4, kind: "selfStatus", status: status("damageReduction", 0.2, 2000) } },
  "elite-press": { id: "elite-press", targetStrategy: "frontmostEnemy", active: { id: "elite-press", name: "卸力冲压", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 1, attackMultiplier: 0, targetStatus: status("slow", 0.25, 2000), selfStatus: status("damageReduction", 0.18, 2200) } },
  "elite-guard-22": { id: "elite-guard-22", targetStrategy: "frontmostEnemy", cadence: { id: "elite-guard-22", everyHits: 5, kind: "selfStatus", status: status("damageReduction", 0.22, 2500) } },
  "elite-charge": { id: "elite-charge", targetStrategy: "frontmostEnemy", active: { id: "elite-charge", name: "冲锋卸力", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 1, attackMultiplier: 0.7, selfStatus: status("damageReduction", 0.18, 2200) } },
  "elite-expose-sweep": { id: "elite-expose-sweep", targetStrategy: "frontmostEnemy", active: { id: "elite-expose-sweep", name: "范围易伤", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 2, attackMultiplier: 0.55, targetStatus: status("vulnerability", 0.1, 2000) } },
  "elite-sweep-20": { id: "elite-sweep-20", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-20", name: "泥浪横扫", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 2, attackMultiplier: 0.55, targetStatus: status("slow", 0.2, 2000) } },
  "elite-mud-sweep-20": { id: "elite-mud-sweep-20", targetStrategy: "frontmostEnemy", active: { id: "elite-mud-sweep-20", name: "沼心压冲", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 2, attackMultiplier: 0.55, targetStatus: status("slow", 0.2, 2000) } },
  "elite-scorched-sweep-20": { id: "elite-scorched-sweep-20", targetStrategy: "frontmostEnemy", active: { id: "elite-scorched-sweep-20", name: "焦根横扫", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 2, attackMultiplier: 0.55, targetStatus: status("slow", 0.2, 2000) } },
  "elite-sweep-55": { id: "elite-sweep-55", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-55", name: "焦根横扫", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 3, attackMultiplier: 0.55 } },
  "elite-sweep-55-slow": { id: "elite-sweep-55-slow", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-55-slow", name: "风压横扫", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 3, attackMultiplier: 0.55, targetStatus: status("slow", 0.15, 1500) } },
  "elite-wind-sweep-55-slow": { id: "elite-wind-sweep-55-slow", targetStrategy: "frontmostEnemy", active: { id: "elite-wind-sweep-55-slow", name: "风暴横扫", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 3, attackMultiplier: 0.55, targetStatus: status("slow", 0.15, 1500) } },
  "elite-tide-sweep-55-slow": { id: "elite-tide-sweep-55-slow", targetStrategy: "frontmostEnemy", active: { id: "elite-tide-sweep-55-slow", name: "礁锤横扫", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 3, attackMultiplier: 0.55, targetStatus: status("slow", 0.15, 1500) } },
  "elite-sweep-55-selfguard": { id: "elite-sweep-55-selfguard", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-55-selfguard", name: "炉脊护击", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 800, targetCount: 3, attackMultiplier: 0.55, allyStatus: { status: status("damageReduction", 0.12, 2500), count: 3, includeSelf: true } } },
  "elite-sweep-55-selfguard-2": { id: "elite-sweep-55-selfguard-2", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-55-selfguard-2", name: "横扫护体", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 2, attackMultiplier: 0.55, selfStatus: status("damageReduction", 0.2, 2500) } },
  "elite-sweep-60": { id: "elite-sweep-60", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-60", name: "断拱震击", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 800, targetCount: 3, attackMultiplier: 0.6, targetStatus: status("slow", 0.15, 1500) } },
  "elite-sweep-60-break": { id: "elite-sweep-60-break", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-60-break", name: "范围破甲", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 800, targetCount: 3, attackMultiplier: 0.6, targetStatus: status("armorBreak", 0.1, 2000) } },
  "elite-sweep-65": { id: "elite-sweep-65", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-65", name: "石矛拦截", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 750, targetCount: 2, attackMultiplier: 0.65, targetStatus: status("slow", 0.15, 1500) } },
  "elite-sweep-65-slow": { id: "elite-sweep-65-slow", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep-65-slow", name: "震地推压", trigger: { kind: "cooldown", initialMs: 6200, cooldownMs: 6200 }, prepareMs: 800, targetCount: 3, attackMultiplier: 0.65, targetStatus: status("slow", 0.18, 1500) } },
  "elite-control": { id: "elite-control", targetStrategy: "frontmostEnemy", active: { id: "elite-control", name: "束缚重击", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 1, attackMultiplier: 0, targetStatus: status("stun", 1, 600), selfStatus: status("damageReduction", 0.18, 2000) } },
  "elite-control-stun-only": { id: "elite-control-stun-only", targetStrategy: "frontmostEnemy", active: { id: "elite-control-stun-only", name: "夹击定身", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 700, targetCount: 1, attackMultiplier: 0, targetStatus: status("stun", 1, 600) } },
  "elite-control-shield": { id: "elite-control-shield", targetStrategy: "frontmostEnemy", active: { id: "elite-control-shield", name: "盾尾合击", trigger: { kind: "basicHits", everyHits: 5 }, prepareMs: 750, targetCount: 1, attackMultiplier: 0, targetStatus: status("stun", 1, 600), selfShieldMaxHpRatio: 0.1 } },
  "elite-sweep": { id: "elite-sweep", targetStrategy: "frontmostEnemy", active: { id: "elite-sweep", name: "区域横扫", trigger: { kind: "cooldown", initialMs: 6500, cooldownMs: 6500 }, prepareMs: 750, targetCount: 3, attackMultiplier: 0.55, targetStatus: status("slow", 0.15, 1500) } },
};

const boss = (id: string, name: string, targetStrategy: TargetStrategy, targetCount: number, attackMultiplier: number, initialMs: number, cooldownMs: number, prepareMs: number, phase: EnemyHealthPhase, extra: Partial<EnemyActiveAbility> = {}): EnemyCombatProfile => ({
  id,
  targetStrategy,
  active: { id, name, trigger: { kind: "cooldown", initialMs, cooldownMs }, prepareMs, targetCount, attackMultiplier, ...extra },
  healthPhase: phase,
});

const bossProfiles: Record<string, EnemyCombatProfile> = {
  "default-boss": { ...boss("root-smash", "震地重击", "frontmostEnemy", 2, 1.3, 5000, 5000, 800, { id: "boss-enrage", hpRatio: 0.3, status: status("haste", 0.25, PERMANENT) }, { targetStatus: status("stun", 1, 800) }), id: "default-boss" },
  "b04-sail-sweep": boss("b04-sail-sweep", "风帆横扫", "frontmostEnemy", 3, 1.15, 5000, 4500, 800, { id: "b04-tailwind", hpRatio: 0.5, status: status("haste", 0.15, PERMANENT) }, { targetStatus: status("slow", 0.25, 2200) }),
  "b08-stone-tail": boss("b08-stone-tail", "碑尾横扫", "frontmostEnemy", 2, 1.2, 5500, 5200, 900, { id: "b08-petrify", hpRatio: 0.5, status: status("damageReduction", 0.15, PERMANENT) }, { selfStatus: status("damageReduction", 0.2, 2400) }),
  "b12-wing-pressure": boss("b12-wing-pressure", "翼压重击", "frontmostEnemy", 3, 1.25, 5000, 4800, 800, { id: "b12-echo", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { targetStatus: status("slow", 0.22, 2000) }),
  "b16-snowhill-crush": boss("b16-snowhill-crush", "雪岭震击", "frontmostEnemy", 2, 1.3, 5400, 5000, 900, { id: "b16-snow-shed", hpRatio: 0.5, status: status("damageReduction", 0.18, PERMANENT) }, { targetStatus: status("slow", 0.25, 2500) }),
  "b20-frost-flurry": boss("b20-frost-flurry", "霜鬃连爪", "frontmostEnemy", 2, 0.68, 5200, 4800, 800, { id: "b20-hunt-rhythm", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { hits: 2 }),
  "b24-aurora-featherfall": boss("b24-aurora-featherfall", "极光羽落", "frontmostEnemy", 3, 1.2, 5600, 5200, 900, { id: "b24-aurora-echo", hpRatio: 0.5, shieldMaxHpRatio: 0.18 }, { targetStatus: status("vulnerability", 0.1, 2500) }),
  "b28-dune-pressure": boss("b28-dune-pressure", "沙丘压阵", "frontmostEnemy", 3, 1.15, 5200, 4900, 850, { id: "b28-hot-stride", hpRatio: 0.5, status: status("haste", 0.15, PERMANENT) }, { targetStatus: status("armorBreak", 0.12, 2500) }),
  "b32-horn-combo": boss("b32-horn-combo", "风蚀角击", "frontmostEnemy", 2, 0.72, 5400, 5000, 850, { id: "b32-second-wind", hpRatio: 0.5, status: status("haste", 0.15, PERMANENT) }, { hits: 2, targetStatus: status("slow", 0.15, 1500) }),
  "b36-court-quake": boss("b36-court-quake", "王庭震击", "frontmostEnemy", 3, 1.25, 5600, 5200, 950, { id: "b36-royal-guard", hpRatio: 0.5, status: status("damageReduction", 0.18, PERMANENT) }),
  "b40-cloud-quake": boss("b40-cloud-quake", "云冠震击", "frontmostEnemy", 2, 1.35, 5100, 4800, 850, { id: "b40-dive-rhythm", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { targetStatus: status("slow", 0.18, 1800) }),
  "b44-thunder-chain": boss("b44-thunder-chain", "雷羽链击", "frontmostEnemy", 3, 1.15, 5200, 4800, 850, { id: "b44-storm-tempo", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { targetMultipliers: [1, 0.48, 0.48] }),
  "b48-azure-dive": boss("b48-azure-dive", "苍雷俯冲", "lowestHpEnemy", 1, 1.45, 5500, 5100, 900, { id: "b48-wing-shield", hpRatio: 0.5, shieldMaxHpRatio: 0.2 }),
  "b52-mudwave-crush": boss("b52-mudwave-crush", "泥潮重压", "frontmostEnemy", 2, 1.25, 5300, 5000, 900, { id: "b52-low-armor", hpRatio: 0.5, status: status("damageReduction", 0.18, PERMANENT) }, { periodicDamage: { powerPct: 0.1, intervalMs: 1000, ticks: 3 } }),
  "b56-helmblade-sweep": boss("b56-helmblade-sweep", "沉舟舵刃", "frontmostEnemy", 3, 1.25, 5400, 5000, 900, { id: "b56-rally", hpRatio: 0.5, allyStatus: { status: status("haste", 0.15, PERMANENT), includeSelf: true } }),
  "b60-mist-tide": boss("b60-mist-tide", "雾苇潮袭", "lowestHpEnemy", 1, 1.05, 5200, 4800, 850, { id: "b60-marsh-hunt", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { periodicDamage: { powerPct: 0.12, intervalMs: 1000, ticks: 3 } }),
  "b64-scorched-crush": boss("b64-scorched-crush", "焦原重压", "frontmostEnemy", 2, 1.3, 5300, 5000, 900, { id: "b64-baked-armor", hpRatio: 0.5, status: status("damageReduction", 0.18, PERMANENT) }, { periodicDamage: { powerPct: 0.1, intervalMs: 1000, ticks: 3, element: "fire" } }),
  "b68-vein-quake": boss("b68-vein-quake", "黯脉震击", "frontmostEnemy", 3, 1.25, 5200, 4900, 900, { id: "b68-rift-hunt", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { periodicDamage: { powerPct: 0.08, intervalMs: 1000, ticks: 3, element: "fire" } }),
  "b72-furnace-hammer": boss("b72-furnace-hammer", "烬炉重锤", "frontmostEnemy", 1, 1.55, 5400, 5000, 950, { id: "b72-war-order", hpRatio: 0.5, allyStatus: { status: status("haste", 0.18, PERMANENT), includeSelf: true } }),
  "b76-saltcrown-crush": boss("b76-saltcrown-crush", "盐冠坠击", "frontmostEnemy", 2, 1.3, 5400, 5100, 900, { id: "b76-close-armor", hpRatio: 0.5, status: status("damageReduction", 0.18, PERMANENT) }, { selfShieldMaxHpRatio: 0.12 }),
  "b80-tidebreak-quake": boss("b80-tidebreak-quake", "断潮震击", "frontmostEnemy", 3, 1.25, 5200, 4900, 900, { id: "b80-riptide-hunt", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { targetStatus: status("slow", 0.18, 1800) }),
  "b84-tidewall-hammer": boss("b84-tidewall-hammer", "潮垒重锤", "frontmostEnemy", 1, 1.55, 5400, 5000, 950, { id: "b84-wall-order", hpRatio: 0.5, allyShieldMaxHpRatio: { amountPctMaxHp: 0.12, includeSelf: true } }),
  "b88-witherhorn-sweep": boss("b88-witherhorn-sweep", "枯风角扫", "frontmostEnemy", 2, 1.35, 5200, 4900, 900, { id: "b88-hill-call", hpRatio: 0.5, summon: { id: "hill-whelp", sourceId: "E85", count: 2, hpRatio: 0.45, attackRatio: 0.4 } }, { targetStatus: status("slow", 0.18, 1800) }),
  "b92-shieldline-sweep": boss("b92-shieldline-sweep", "旧战盾压", "frontmostEnemy", 2, 1.35, 5400, 5000, 950, { id: "b92-banner-call", hpRatio: 0.5, summon: { id: "bone-retainer", sourceId: "E89", count: 2, hpRatio: 0.5, attackRatio: 0.45 } }),
  "b96-ringarm-crush": boss("b96-ringarm-crush", "墓环重压", "frontmostEnemy", 3, 1.35, 5600, 5200, 1000, { id: "b96-stonehold", hpRatio: 0.5, status: status("damageReduction", 0.2, PERMANENT) }),
  "b100-ridge-charge": boss("b100-ridge-charge", "裂峰冲阵", "frontmostEnemy", 2, 1.35, 5300, 5000, 900, { id: "b100-second-plate", hpRatio: 0.5, shieldMaxHpRatio: 0.2 }, { targetStatus: status("armorBreak", 0.1, 2000) }),
  "b104-crystal-hammer": boss("b104-crystal-hammer", "晶脉重锤", "frontmostEnemy", 1, 1.55, 5500, 5100, 950, { id: "b104-crystal-plate", hpRatio: 0.5, shieldMaxHpRatio: 0.2 }, { targetStatus: status("armorBreak", 0.12, 2500) }),
  "b108-highridge-crush": boss("b108-highridge-crush", "天脊合压", "frontmostEnemy", 3, 1.35, 5600, 5200, 1000, { id: "b108-stone-pressure", hpRatio: 0.5, status: status("damageReduction", 0.2, PERMANENT) }, { targetStatus: status("slow", 0.2, 2000) }),
  "b112-frostwall-charge": boss("b112-frostwall-charge", "霜垒冲阵", "frontmostEnemy", 2, 1.4, 5200, 4900, 900, { id: "b112-northwind-stride", hpRatio: 0.5, status: status("haste", 0.18, PERMANENT) }, { targetStatus: status("slow", 0.22, 2000) }),
  "b116-rampart-crush": boss("b116-rampart-crush", "城脊碾压", "frontmostEnemy", 2, 1.45, 5500, 5100, 950, { id: "b116-wall-scale", hpRatio: 0.5, shieldMaxHpRatio: 0.18 }, { targetStatus: status("slow", 0.2, 2000) }),
  "b120-glaive-sweep": boss("b120-glaive-sweep", "北风关刀", "frontmostEnemy", 3, 1.4, 5400, 5000, 950, { id: "b120-tail-answer", hpRatio: 0.5, active: { id: "b120-tail-answer", name: "尾刃反击", trigger: { kind: "cooldown", initialMs: 0, cooldownMs: 999999 }, prepareMs: 700, targetCount: 3, attackMultiplier: 0.85, targetStatus: status("slow", 0.2, 2000) } }),
};

export const ENEMY_COMBAT_PROFILES: Record<string, EnemyCombatProfile> = {
  ...cadenceProfiles,
  ...bossProfiles,
  "c1-cadence-strike": { ...cadenceProfiles["cadence-strike"]!, id: "c1-cadence-strike", cadence: { ...cadenceProfiles["cadence-strike"]!.cadence!, id: "mushroom-cap-strike" } },
  "c1-shell-guard": { ...cadenceProfiles["shell-guard-18"]!, id: "c1-shell-guard" },
  "c1-elite-guard": { ...cadenceProfiles["elite-guard"]!, id: "c1-elite-guard" },
  "c1-cadence-slow-18": { ...cadenceProfiles["cadence-slow-18"]!, id: "c1-cadence-slow-18" },
  "c1-low-hp-hunter": { ...cadenceProfiles["low-hp-hunter"]!, id: "c1-low-hp-hunter" },
  "c1-root-bind": { ...cadenceProfiles["elite-control"]!, id: "c1-root-bind", active: { ...cadenceProfiles["elite-control"]!.active!, id: "root-bind", selfStatus: undefined } },
  "c1-cadence-slow-22": { ...cadenceProfiles["cadence-slow-22"]!, id: "c1-cadence-slow-22" },
  "c1-echo-shield": { ...cadenceProfiles["self-shield-12"]!, id: "c1-echo-shield" },
  "c1-sail-sweep": { ...bossProfiles["b04-sail-sweep"]!, id: "c1-sail-sweep" },
  "c1-stone-tail": { ...bossProfiles["b08-stone-tail"]!, id: "c1-stone-tail" },
  "c1-wing-pressure": { ...bossProfiles["b12-wing-pressure"]!, id: "c1-wing-pressure" },
  "snowhill-slam": { ...bossProfiles["b16-snowhill-crush"]!, id: "snowhill-slam" },
  "frost-pounce": { ...bossProfiles["b20-frost-flurry"]!, id: "frost-pounce" },
  "aurora-wingfall": { ...bossProfiles["b24-aurora-featherfall"]!, id: "aurora-wingfall" },
};

const DEFAULT_ELITE_PROFILE: EnemyCombatProfile = cadenceProfiles["elite-guard"]!;
const DEFAULT_BOSS_PROFILE: EnemyCombatProfile = bossProfiles["default-boss"]!;

export function getEnemyCombatProfile(profileId: string | undefined, kind: "normal" | "elite" | "boss"): EnemyCombatProfile {
  if (profileId && ENEMY_COMBAT_PROFILES[profileId]) return ENEMY_COMBAT_PROFILES[profileId]!;
  if (kind === "elite") return DEFAULT_ELITE_PROFILE;
  if (kind === "boss") return DEFAULT_BOSS_PROFILE;
  return ENEMY_COMBAT_PROFILES.baseline!;
}

export const ENEMY_ABILITY_NAMES = Object.values(ENEMY_COMBAT_PROFILES)
  .flatMap((profile) => [
    ...(profile.active ? [[profile.active.id, profile.active.name] as const] : []),
    ...(profile.healthPhase?.active ? [[profile.healthPhase.active.id, profile.healthPhase.active.name] as const] : []),
    ...(profile.healthPhase?.summon ? [[profile.healthPhase.id, profile.healthPhase.name ?? profile.healthPhase.id] as const] : []),
  ]);
