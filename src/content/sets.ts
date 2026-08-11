export type SetId =
  | "set_moss_crown"
  | "set_frost_bite"
  | "set_sand_scar"
  | "set_storm_tide";

export interface SetBonusTier {
  pieces: 2 | 4 | 6;
  /** Percent points for UI + combat (e.g. 6 => +6%). */
  lifePct?: number;
  damagePct?: number;
  damageReductionPct?: number;
  attackSpeedPct?: number;
  critChancePct?: number;
  critDamagePct?: number;
  eliteDamagePct?: number;
}

export interface SetDefinition {
  id: SetId;
  name: string;
  school: "physical" | "magic";
  bonuses: readonly SetBonusTier[];
}

export const SET_DEFINITIONS: readonly SetDefinition[] = [
  {
    id: "set_moss_crown",
    name: "苔冠守望",
    school: "physical",
    bonuses: [
      { pieces: 2, lifePct: 6 },
      { pieces: 4, damagePct: 8, damageReductionPct: 4 },
      { pieces: 6, eliteDamagePct: 10 },
    ],
  },
  {
    id: "set_frost_bite",
    name: "霜咬行者",
    school: "physical",
    bonuses: [
      { pieces: 2, damagePct: 5 },
      { pieces: 4, critDamagePct: 8, attackSpeedPct: 4 },
      { pieces: 6, damageReductionPct: 6 },
    ],
  },
  {
    id: "set_sand_scar",
    name: "沙痕旅人",
    school: "magic",
    bonuses: [
      { pieces: 2, attackSpeedPct: 6 },
      { pieces: 4, damagePct: 10, critChancePct: 5 },
      { pieces: 6, eliteDamagePct: 12 },
    ],
  },
  {
    id: "set_storm_tide",
    name: "风暴潮声",
    school: "magic",
    bonuses: [
      { pieces: 2, damageReductionPct: 5 },
      { pieces: 4, damagePct: 8, lifePct: 6 },
      { pieces: 6, attackSpeedPct: 8 },
    ],
  },
];

export const SET_BY_ID = Object.fromEntries(
  SET_DEFINITIONS.map((set) => [set.id, set]),
) as Record<SetId, SetDefinition>;

export function activeSetBonuses(equippedCounts: Partial<Record<SetId, number>>): SetBonusTier[] {
  const active: SetBonusTier[] = [];
  for (const set of SET_DEFINITIONS) {
    const count = equippedCounts[set.id] ?? 0;
    for (const bonus of set.bonuses) {
      if (count >= bonus.pieces) active.push(bonus);
    }
  }
  return active;
}
