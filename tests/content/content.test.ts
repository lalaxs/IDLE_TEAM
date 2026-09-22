import { describe, expect, it } from "vitest";
import { ENEMY_DEFINITIONS } from "../../src/content/enemies";
import { HERO_DAMAGE_IDENTITIES } from "../../src/content/heroDamageIdentities";
import { HERO_DEFINITIONS, RELEASED_HERO_DEFINITIONS, RELEASED_HERO_IDS } from "../../src/content/heroes";
import {
  EQUIPMENT_SLOTS,
  ITEM_DEFINITIONS,
  TRAIT_DEFINITIONS,
} from "../../src/content/items";
import {
  ACTIVE_SKILL_BY_HERO,
  ACTIVE_SKILLS,
  PASSIVE_SKILLS,
} from "../../src/content/skills";
import { SPECIALIZATIONS } from "../../src/content/specializations";
import { HERO_SKILLS } from "../../src/content/heroSkills";
import { TALENT_NODES } from "../../src/content/talents";
import { STAGE_DEFINITIONS } from "../../src/content/stages";
import { MAX_STAGE } from "../../src/content/chapters";
import { DAMAGE_SCHOOL_LABEL, formatHeroDamageIdentity } from "../../src/content/damageElements";
import { getLegendaryTraitId } from "../../src/content/legendaryPowers";
import { selectEquipmentDefinition, selectChapterEquipmentDefinition } from "../../src/progression/EquipmentPool";
import { SeededRandom } from "../../src/simulation/RandomSource";

const LEGACY_SLOTS = ["main_weapon", "armor", "amulet"] as const;

describe("approved content manifest", () => {
  it("locks one approved hero for every first-release specialization", () => {
    expect(RELEASED_HERO_IDS).toEqual([
      "H09", "H10", "H43", "H12", "H13", "H14", "H20", "H33", "H49", "H18",
      "H19", "H54", "H30", "H22", "H57", "H23", "H59", "H03", "H60", "H62",
      "H63", "H64", "H65", "H17", "H21", "H68", "H04", "H15", "H71", "H27",
      "H73", "H08", "H28", "H36", "H24", "H31", "H78", "H79", "H02", "H35",
    ]);
    expect(RELEASED_HERO_DEFINITIONS).toHaveLength(40);
    expect(new Set(RELEASED_HERO_DEFINITIONS.map(({ specId }) => specId)).size).toBe(40);
  });

  it("ships eighty differentiated heroes and skills", () => {
    expect(HERO_DEFINITIONS).toHaveLength(80);
    expect(new Set(HERO_DEFINITIONS.map(({ id }) => id)).size).toBe(80);
    expect(ACTIVE_SKILLS).toHaveLength(80);
    expect(PASSIVE_SKILLS).toHaveLength(80);
    expect(SPECIALIZATIONS).toHaveLength(40);
    expect(new Set(HERO_DEFINITIONS.map(({ specId }) => specId)).size).toBe(40);
    expect(new Set(ACTIVE_SKILLS.map(({ id }) => id)).size).toBe(40);
    expect(new Set(PASSIVE_SKILLS.map(({ id }) => id)).size).toBe(40);
    for (const specialization of SPECIALIZATIONS) {
      const heroes = HERO_DEFINITIONS.filter(({ specId }) => specId === specialization.id);
      expect(heroes).toHaveLength(2);
      expect(
        new Set(
          heroes.map(({ id }) => ACTIVE_SKILLS.find(({ heroId }) => heroId === id)?.id),
        ).size,
      ).toBe(1);
      expect(
        new Set(
          heroes.map(({ id }) => PASSIVE_SKILLS.find(({ heroId }) => heroId === id)?.id),
        ).size,
      ).toBe(1);
    }
    expect(HERO_SKILLS).toHaveLength(8);
    expect(new Set(HERO_SKILLS.map(({ id }) => id)).size).toBe(8);
    for (const skill of [...ACTIVE_SKILLS, ...PASSIVE_SKILLS, ...HERO_SKILLS]) {
      expect(skill.icon.atlas).toMatch(/^\/assets\/skills\/atlas-[a-z-]+\.png$/);
      expect(skill.icon.index).toBeGreaterThanOrEqual(0);
      expect(skill.icon.index).toBeLessThan(9);
    }
    expect(TALENT_NODES).toHaveLength(17);
    expect(new Set(TALENT_NODES.map(({ id }) => id)).size).toBe(17);
    for (const hero of HERO_DEFINITIONS) {
      expect(ACTIVE_SKILLS.some(({ heroId }) => heroId === hero.id)).toBe(true);
      expect(PASSIVE_SKILLS.some(({ heroId }) => heroId === hero.id)).toBe(true);
      expect(["physical", "magic"]).toContain(hero.damageSchool);
      expect(["physical", "fire", "frost", "lightning", "dark", "holy"]).toContain(hero.damageElement);
      expect(SPECIALIZATIONS.some(({ id }) => id === hero.specId)).toBe(true);
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
    expect(ACTIVE_SKILL_BY_HERO.H12.description).toContain("3次70%暗黑伤害");
    expect(ACTIVE_SKILL_BY_HERO.H01.description).toContain("160%物理伤害");
    expect(ACTIVE_SKILL_BY_HERO.H04.description).not.toContain("伤害类型");
    expect(formatHeroDamageIdentity("magic", "physical")).toBe("魔法");
    expect(DAMAGE_SCHOOL_LABEL.physical).toBe("物理");
    expect(DAMAGE_SCHOOL_LABEL.magic).toBe("魔法");
  });

  it("ships ten chapters, enemies, equipment bands, and traits", () => {
    expect(ENEMY_DEFINITIONS).toHaveLength(156);
    expect(STAGE_DEFINITIONS).toHaveLength(MAX_STAGE);
    expect(STAGE_DEFINITIONS[STAGE_DEFINITIONS.length - 1]?.id).toBe("10-12");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 25)?.bossName).toBe("双丘巨驼");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 29)?.bossName).toBe("风蚀盘羊");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 33)?.bossName).toBe("王庭拱背兽");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 37)?.bossName).toBe("云冠狮鹫");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 41)?.bossName).toBe("雷羽巨枭");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 45)?.bossName).toBe("苍雷守卫");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 61)?.bossName).toBe("焦原楔兽");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 65)?.bossName).toBe("黯脉壳龙");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 69)?.bossName).toBe("烬炉督军");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 73)?.bossName).toBe("盐冠礁王");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 77)?.bossName).toBe("断潮壳龙");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 81)?.bossName).toBe("潮垒酋领");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 85)?.bossName).toBe("枯风角王");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 89)?.bossName).toBe("旧战骨将");
    expect(STAGE_DEFINITIONS.find(({ stage }) => stage === 93)?.bossName).toBe("墓环石王");
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

  it("gives every expanded slot a three-power legendary pool", () => {
    const pools = {
      off_hand: ["aegis", "deflect", "reprisal"],
      helmet: ["keen", "foresight", "resolve"],
      gloves: ["fleet", "combo", "leeching"],
      boots: ["sturdy", "windstep", "elusive"],
      ring: ["sanguine", "cruelty", "surge"],
      bracer: ["warding", "parry", "barbed"],
      earring: ["insight", "echoing", "vitality"],
    } as const;

    for (const [slot, traitIds] of Object.entries(pools)) {
      expect(
        TRAIT_DEFINITIONS.filter((trait) => trait.slot === slot).map(({ id }) => id),
      ).toEqual(traitIds);
      expect(
        new Set(
          ITEM_DEFINITIONS.filter((item) => item.slot === slot).map((item) =>
            getLegendaryTraitId(item.id),
          ),
        ),
      ).toEqual(new Set(traitIds));
    }
  });

  it("samples all ten slots fairly from chapter-one drops", () => {
    const counts = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, 0])) as Record<
      string,
      number
    >;
    for (let seed = 1; seed <= 400; seed += 1) {
      const item = selectChapterEquipmentDefinition(1, new SeededRandom(seed));
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
