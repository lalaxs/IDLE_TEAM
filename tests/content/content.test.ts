import { describe, expect, it } from "vitest";
import { ENEMY_DEFINITIONS } from "../../src/content/enemies";
import { HERO_DAMAGE_IDENTITIES } from "../../src/content/heroDamageIdentities";
import { HERO_DEFINITIONS } from "../../src/content/heroes";
import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  TRAIT_DEFINITIONS,
} from "../../src/content/items";
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from "../../src/content/skills";
import { HERO_SKILLS } from "../../src/content/heroSkills";
import { TALENT_NODES } from "../../src/content/talents";
import { STAGE_DEFINITIONS } from "../../src/content/stages";
import { MAX_STAGE } from "../../src/content/chapters";
import { DAMAGE_SCHOOL_LABEL, formatHeroDamageIdentity } from "../../src/content/damageElements";
import { selectEquipmentDefinition } from "../../src/progression/EquipmentPool";
import { SeededRandom } from "../../src/simulation/RandomSource";

const LEGACY_SLOTS = ["main_weapon", "armor", "amulet"] as const;

describe("approved content manifest", () => {
  it("ships eighty differentiated heroes and skills", () => {
    expect(HERO_DEFINITIONS).toHaveLength(80);
    expect(new Set(HERO_DEFINITIONS.map(({ id }) => id)).size).toBe(80);
    expect(ACTIVE_SKILLS).toHaveLength(80);
    expect(PASSIVE_SKILLS).toHaveLength(80);
    expect(HERO_SKILLS).toHaveLength(8);
    expect(new Set(HERO_SKILLS.map(({ id }) => id)).size).toBe(8);
    expect(TALENT_NODES).toHaveLength(18);
    expect(new Set(TALENT_NODES.map(({ id }) => id)).size).toBe(18);
    for (const hero of HERO_DEFINITIONS) {
      expect(ACTIVE_SKILLS.some(({ heroId }) => heroId === hero.id)).toBe(true);
      expect(PASSIVE_SKILLS.some(({ heroId }) => heroId === hero.id)).toBe(true);
      expect(["physical", "magic"]).toContain(hero.damageSchool);
      expect(["physical", "fire", "frost", "lightning", "dark", "holy"]).toContain(hero.damageElement);
      expect(hero.skillPattern).toMatch(/^H0[1-8]$/);
    }
    expect(HERO_DEFINITIONS.find(({ id }) => id === "H03")?.damageElement).toBe("fire");
    expect(HERO_DEFINITIONS.find(({ id }) => id === "H04")?.damageElement).toBe("holy");
    expect(HERO_DEFINITIONS.find(({ id }) => id === "H07")?.damageElement).toBe("frost");
    expect(HERO_DEFINITIONS.find(({ id }) => id === "H08")?.damageElement).toBe("lightning");
    expect(HERO_DEFINITIONS.find(({ id }) => id === "H06")?.damageElement).toBe("dark");
    expect(HERO_DAMAGE_IDENTITIES).toHaveLength(80);
    expect(new Set(HERO_DAMAGE_IDENTITIES.map(({ id }) => id)).size).toBe(80);
    for (const hero of HERO_DEFINITIONS) {
      const identity = HERO_DAMAGE_IDENTITIES.find(({ id }) => id === hero.id);
      expect(identity?.damageSchool).toBe(hero.damageSchool);
      expect(identity?.damageElement).toBe(hero.damageElement);
    }
    expect(formatHeroDamageIdentity("magic", "fire")).toBe("火焰魔法");
    expect(formatHeroDamageIdentity("magic", "frost")).toBe("冰霜魔法");
    expect(formatHeroDamageIdentity("magic", "lightning")).toBe("雷电魔法");
    expect(formatHeroDamageIdentity("magic", "holy")).toBe("圣光魔法");
    expect(formatHeroDamageIdentity("physical", "dark")).toBe("暗黑");
    expect(formatHeroDamageIdentity("physical", "physical")).toBe("物理");
    expect(formatHeroDamageIdentity("magic", "physical")).toBe("魔法");
    expect(DAMAGE_SCHOOL_LABEL.physical).toBe("物理");
    expect(DAMAGE_SCHOOL_LABEL.magic).toBe("魔法");
  });

  it("ships ten chapters, enemies, equipment bands, and traits", () => {
    expect(ENEMY_DEFINITIONS).toHaveLength(16);
    expect(STAGE_DEFINITIONS).toHaveLength(MAX_STAGE);
    expect(STAGE_DEFINITIONS[STAGE_DEFINITIONS.length - 1]?.id).toBe("10-12");
    expect(ITEM_DEFINITIONS.length).toBeGreaterThanOrEqual(240);
    expect(TRAIT_DEFINITIONS.length).toBeGreaterThanOrEqual(25);
    expect(EQUIPMENT_SLOTS).toEqual([
      "main_weapon",
      "off_hand",
      "helmet",
      "armor",
      "gloves",
      "boots",
      "ring",
      "bracer",
      "amulet",
      "earring",
    ]);
    for (const item of ITEM_DEFINITIONS) {
      expect(item.school === "physical" || item.school === "magic").toBe(true);
      expect([1, 2, 3, 4]).toContain(item.baseTier);
      expect(item.unlockChapter).toBeGreaterThanOrEqual(1);
      expect(item.retireChapter).toBeGreaterThan(item.unlockChapter);
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });

  it("keeps unique ids/names and fills all ten slots", () => {
    expect(new Set(ITEM_DEFINITIONS.map(({ id }) => id)).size).toBe(ITEM_DEFINITIONS.length);
    expect(new Set(ITEM_DEFINITIONS.map(({ name }) => name)).size).toBe(ITEM_DEFINITIONS.length);
    for (const slot of EQUIPMENT_SLOTS) {
      expect(ITEM_DEFINITIONS.filter((item) => item.slot === slot).length).toBeGreaterThanOrEqual(16);
    }
  });

  it("marks chapter regional traits for Ch2–4 legacy slots", () => {
    for (const chapter of [2, 3, 4] as const) {
      const legacy = ITEM_DEFINITIONS.filter(
        ({ chapter: itemChapter, slot }) =>
          itemChapter === chapter && LEGACY_SLOTS.includes(slot as (typeof LEGACY_SLOTS)[number]),
      );
      expect(legacy).toHaveLength(12);
    }
    expect(
      TRAIT_DEFINITIONS.filter(({ id }) =>
        ["frostbite", "snowguard", "frostfocus"].includes(id),
      ).map(({ id, slot }) => ({ id, slot })),
    ).toEqual([
      { id: "frostbite", slot: "main_weapon" },
      { id: "snowguard", slot: "armor" },
      { id: "frostfocus", slot: "amulet" },
    ]);
  });

  it("gives each expanded slot one basic trait", () => {
    expect(
      TRAIT_DEFINITIONS.filter(({ id }) =>
        ["aegis", "keen", "fleet", "sturdy", "sanguine", "warding", "insight"].includes(id),
      ).map(({ id, slot }) => ({ id, slot })),
    ).toEqual([
      { id: "aegis", slot: "off_hand" },
      { id: "keen", slot: "helmet" },
      { id: "fleet", slot: "gloves" },
      { id: "sturdy", slot: "boots" },
      { id: "sanguine", slot: "ring" },
      { id: "warding", slot: "bracer" },
      { id: "insight", slot: "earring" },
    ]);
  });

  it("samples all ten slots fairly from chapter-one drops", () => {
    const counts = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, 0])) as Record<
      string,
      number
    >;
    for (let seed = 1; seed <= 400; seed += 1) {
      const item = selectEquipmentDefinition(1, new SeededRandom(seed));
      counts[item.slot] = (counts[item.slot] ?? 0) + 1;
    }
    for (const slot of EQUIPMENT_SLOTS) {
      expect(counts[slot] ?? 0).toBeGreaterThan(15);
    }
  });

  it("drops later-chapter items inside their unlock window", () => {
    const samples = Array.from({ length: 80 }, (_, seed) =>
      selectEquipmentDefinition(55, new SeededRandom(seed + 1)),
    );
    expect(samples.some((item) => item.chapter >= 5)).toBe(true);
    for (const item of samples) {
      expect(item.unlockChapter).toBeLessThanOrEqual(5);
      expect(item.retireChapter).toBeGreaterThan(5);
    }
  });
});
