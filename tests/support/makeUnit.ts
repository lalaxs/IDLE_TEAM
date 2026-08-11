import type { UnitState } from "../../src/simulation/types";

export function makeUnit(patch: Partial<UnitState> = {}): UnitState {
  return {
    id: "unit",
    team: "heroes",
    sourceId: "H01",
    name: "测试单位",
    x: 100,
    y: 0,
    hp: 100,
    maxHp: 100,
    attack: 100,
    defense: 10,
    critChance: 0.05,
    attackRange: 60,
    moveSpeed: 100,
    attackIntervalMs: 1000,
    attackCooldownMs: 0,
    skillCooldownMs: 0,
    targetId: null,
    shield: 0,
    statuses: [],
    alive: true,
    basicAttackCount: 0,
    skillCastCount: 0,
    passiveFlags: {},
    ...patch,
  };
}
