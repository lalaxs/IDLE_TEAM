import assert from "node:assert/strict";

export async function createBuildFixtures(load) {
  const { RELEASED_HERO_DEFINITIONS: roster } = await load("/src/content/heroes.ts");
  const { createDefaultSave } = await load("/src/persistence/schema.ts");
  const { getHeroStats, getHeroLevelCap } = await load("/src/progression/HeroProgression.ts");
  const { upgradeTalent, getTalentPointsSpent } = await load("/src/progression/TalentSystem.ts");
  const { getEquipmentBonuses } = await load("/src/progression/EquipmentBonuses.ts");
  const { createEquipment, canHeroEquipItem } = await load("/src/progression/EquipmentSystem.ts");
  const { getChapterEquipmentDropPool } = await load("/src/progression/EquipmentPool.ts");
  const { EQUIPMENT_SLOTS } = await load("/src/content/items.ts");
  const { RARITY_RANK } = await load("/src/content/rarities.ts");
  const { SeededRandom } = await load("/src/simulation/RandomSource.ts");
  const profiles = [
    { id: "formed85", level: 85, stars: 7, ascendLevel: 4, gearLevel: 85, rarity: "epic", chapter: 9, stage: 108, difficulty: "hard" },
    { id: "grown100", level: 100, stars: 15, ascendLevel: 5, gearLevel: 100, rarity: "arcane", chapter: 10, stage: 120, difficulty: "nightmare" },
  ];
  const fixtures = [];
  for (const profile of profiles) {
    assert(profile.level <= getHeroLevelCap(profile.ascendLevel));
    const save = createDefaultSave(0);
    save.inventory = [];
    const pool = getChapterEquipmentDropPool(profile.chapter);
    for (const hero of roster) {
      const progress = save.roster[hero.id];
      Object.assign(progress, { unlocked: true, level: profile.level, stars: profile.stars, ascendLevel: profile.ascendLevel });
      progress.chosenSkillId = hero.expeditionRole === "tank" ? "iron-wall" : hero.expeditionRole === "healer" ? "sanctuary" : "meteor";
      const random = new SeededRandom(hero.damageSchool === "magic" ? 9023 : 9007);
      for (const slot of EQUIPMENT_SLOTS) {
        const eligible = pool.filter((item) => item.slot === slot && RARITY_RANK[item.minGrade] <= RARITY_RANK[profile.rarity] && RARITY_RANK[item.maxGrade] >= RARITY_RANK[profile.rarity]);
        const definition = eligible.find((item) => item.school === hero.damageSchool) ?? eligible[0];
        assert(definition, `No legal equipment: ${profile.id}/${slot}`);
        const item = createEquipment(definition.id, profile.stage, profile.rarity, random, profile.gearLevel);
        item.instanceId = `${profile.id}-${hero.id}-${slot}`;
        assert(canHeroEquipItem(profile.level, item));
        save.inventory.push(item);
        progress.equipment[slot] = item.instanceId;
      }
    }
    const variants = new Map();
    for (const basic of [1, 2, 3]) for (const ultimate of [1, 2, 3]) {
      for (const hero of roster) {
        let ranks = {};
        const allocate = (id, count) => {
          for (let rank = 0; rank < count; rank++) {
            const next = upgradeTalent(ranks, id, profile.level, hero.id);
            assert(next, `Illegal talent allocation: ${hero.id}/${id}`);
            ranks = next;
          }
        };
        allocate("foundation_power", 5);
        allocate("foundation_precision", 5);
        allocate(`basic_${String.fromCharCode(96 + basic)}`, 1);
        allocate("mastery_a", 3);
        allocate("mastery_b", 2);
        allocate(`ultimate_${String.fromCharCode(96 + ultimate)}`, 1);
        assert.equal(getTalentPointsSpent(ranks), 17);
        save.roster[hero.id].talentRanks = ranks;
      }
      variants.set(`${basic}/${ultimate}`, { bonuses: getEquipmentBonuses(save), ranks: Object.fromEntries(roster.map((hero) => [hero.id, { ...save.roster[hero.id].talentRanks }])) });
    }
    const stats = Object.fromEntries(roster.map((hero) => [hero.id, getHeroStats(hero.id, profile.level, profile)]));
    fixtures.push({ profile, stats, variants, gear: save.inventory, chosenSkills: Object.fromEntries(roster.map((hero) => [hero.id, save.roster[hero.id].chosenSkillId])) });
  }
  return { roster, fixtures };
}
