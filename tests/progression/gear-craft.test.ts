import { describe, expect, it } from "vitest";
import { SMELT_AFFIX_POWER_MULTIPLIER, getAffixValueBounds } from "../../src/content/affixes";
import { createStarterMaterials } from "../../src/content/materials";
import { createEmptySetEssences } from "../../src/content/sets";
import { createEquipment, getEquipmentLevel } from "../../src/progression/EquipmentSystem";
import {
  getSetImprintPreview,
  fuseGemFamily,
  fuseGemRank,
  imprintSetTag,
  inlayGem,
  openEquipmentSocket,
  removeAllGems,
  resetEquipmentAffix,
  smeltEquipmentAffix,
} from "../../src/progression/GearCraftSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("GearCraftSystem", () => {
  it("opens up to two sockets and requires stone", () => {
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(1));
    const materials = createStarterMaterials();
    materials.mat_socket_stone = 4;

    expect(openEquipmentSocket(item, materials)).toEqual({ ok: true });
    expect(item.sockets).toHaveLength(1);
    expect(materials.mat_socket_stone).toBe(3);
    expect(openEquipmentSocket(item, materials)).toEqual({ ok: true });
    expect(item.sockets).toHaveLength(2);
    expect(openEquipmentSocket(item, materials)).toEqual({ ok: false, reason: "已达最大孔位数" });
    expect(materials.mat_socket_stone).toBe(0);
  });

  it("rejects inlay without an open empty socket", () => {
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(2));
    const materials = createStarterMaterials();
    expect(inlayGem(item, 0, "gem_atk", materials)).toEqual({ ok: false, reason: "孔位未开启" });

    materials.mat_socket_stone = 1;
    openEquipmentSocket(item, materials);
    expect(inlayGem(item, 0, "gem_atk", materials).ok).toBe(true);
    expect(item.sockets?.[0]?.gemId).toBe("gem_atk");
    expect(inlayGem(item, 0, "gem_hp", materials)).toEqual({ ok: false, reason: "该孔位已有宝石" });
  });

  it("resets only the selected affix and locks future resets to it", () => {
    const item = createEquipment("weapon_guard_blade", 8, "epic", new SeededRandom(3));
    item.affixes = [
      { affixId: "flat_attack", value: 10 },
      { affixId: "crit_chance", value: 5 },
    ];
    const before = item.affixes.map((roll) => ({ ...roll }));
    const materials = createStarterMaterials();
    materials.mat_reset_scroll = 2;

    const first = resetEquipmentAffix(item, 1, materials, new SeededRandom(99));
    expect(first.ok).toBe(true);
    expect(item.resetAffixIndex).toBe(1);
    expect(item.affixes[0]).toEqual(before[0]);
    expect(item.affixes[1]?.affixId).toBe(before[1]?.affixId);

    const blocked = resetEquipmentAffix(item, 0, materials, new SeededRandom(100));
    expect(blocked).toEqual({ ok: false, reason: "该装备只能继续重置已锁定的词条" });

    const again = resetEquipmentAffix(item, 1, materials, new SeededRandom(101));
    expect(again.ok).toBe(true);
    expect(item.resetAffixIndex).toBe(1);
    expect(materials.mat_reset_scroll).toBe(0);
  });

  it("keeps one player-chosen smelted affix and replaces it on later smelts", () => {
    const item = createEquipment("weapon_guard_blade", 8, "rare", new SeededRandom(4));
    const before = item.affixes.length;
    const materials = createStarterMaterials();
    materials.mat_smelt_flux = 2;
    const first = smeltEquipmentAffix(item, "flat_attack", materials, new SeededRandom(7));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.previous).toBeNull();
    expect(item.affixes).toHaveLength(before + 1);
    expect(item.affixes[item.affixes.length - 1]).toMatchObject({ affixId: "flat_attack", smelted: true });

    const second = smeltEquipmentAffix(item, "damage_pct", materials, new SeededRandom(8));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const smeltBounds = getAffixValueBounds(
      "damage_pct",
      "rare",
      1,
      getEquipmentLevel(item),
      SMELT_AFFIX_POWER_MULTIPLIER,
    );
    expect(second.previous).toMatchObject({ affixId: "flat_attack", smelted: true });
    expect(second.roll.value).toBeGreaterThanOrEqual(smeltBounds.min);
    expect(second.roll.value).toBeLessThanOrEqual(smeltBounds.max);
    expect(item.affixes).toHaveLength(before + 1);
    expect(item.affixes.filter((roll) => roll.smelted)).toEqual([
      expect.objectContaining({ affixId: "damage_pct", smelted: true }),
    ]);
    expect(materials.mat_smelt_flux).toBe(0);
  });

  it("chains one-click gem fusion through every available rank", () => {
    const materials = createStarterMaterials();
    materials.gem_atk = 29;

    expect(fuseGemFamily(materials, "gem_atk")).toEqual({
      ok: true,
      crafted: 13,
      highestRank: 4,
    });
    expect(materials.gem_atk).toBe(2);
    expect(materials.gem_atk_2).toBe(0);
    expect(materials.gem_atk_3).toBe(0);
    expect(materials.gem_atk_4).toBe(1);
  });

  it("fuses exactly three player-selected gems into the next rank", () => {
    const materials = createStarterMaterials();
    materials.gem_atk_2 = 4;

    expect(fuseGemRank(materials, "gem_atk_2")).toEqual({
      ok: true,
      resultId: "gem_atk_3",
    });
    expect(materials.gem_atk_2).toBe(1);
    expect(materials.gem_atk_3).toBe(1);
  });

  it("returns every ranked socket gem to the material bag", () => {
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(22));
    item.sockets = [{ gemId: "gem_atk_3" }, { gemId: "gem_resist_2" }];
    const materials = createStarterMaterials();

    expect(removeAllGems(item, materials)).toEqual({
      count: 2,
      gems: { gem_atk_3: 1, gem_resist_2: 1 },
    });
    expect(item.sockets).toEqual([{ gemId: null }, { gemId: null }]);
    expect(materials.gem_atk_3).toBe(1);
    expect(materials.gem_resist_2).toBe(1);
  });

  it("turns a reset Greater Affix back into a normal affix", () => {
    const item = createEquipment("weapon_guard_blade", 8, "epic", new SeededRandom(3));
    item.affixes = [{ affixId: "flat_attack", value: 999, greater: true, smelted: true }];
    const materials = createStarterMaterials();
    materials.mat_reset_scroll = 1;

    expect(resetEquipmentAffix(item, 0, materials, new SeededRandom(99)).ok).toBe(true);
    expect(item.affixes[0]?.greater).toBeUndefined();
    expect(item.affixes[0]?.smelted).toBe(true);
  });

  it("imprints a set tag onto current gear without erasing its build", () => {
    const item = createEquipment("weapon_ranger_bow", 97, "epic", new SeededRandom(8));
    item.sockets = [{ gemId: "gem_atk" }];
    const before = structuredClone(item);
    const beforeAffixIds = item.affixes.map((roll) => roll.affixId);
    const materials = createStarterMaterials();
    materials.mat_set_inscription = 1;
    const setEssences = createEmptySetEssences();
    setEssences.set_moss_crown = 4;
    const preview = getSetImprintPreview(item, "set_moss_crown", setEssences, materials);

    expect(preview).toMatchObject({ setId: "set_moss_crown", essenceCost: 4, stoneCost: 1, reason: null });
    const result = imprintSetTag(item, "set_moss_crown", setEssences, materials);

    expect(result).toEqual({
      ok: true,
      setId: "set_moss_crown",
      essenceCost: 4,
      stoneCost: 1,
    });
    expect(item.setId).toBe("set_moss_crown");
    expect(item.definitionId).toBe(before.definitionId);
    expect(item.level).toBe(before.level);
    expect(item.rarity).toBe(before.rarity);
    expect(item.stats).toEqual(before.stats);
    expect(item.traitId).toBe(before.traitId);
    expect(item.affixes.map((roll) => roll.affixId)).toEqual(beforeAffixIds);
    expect(item.sockets).toEqual([{ gemId: "gem_atk" }]);
    expect(setEssences.set_moss_crown).toBe(0);
    expect(materials.mat_set_inscription).toBe(0);
  });

  it("does not overwrite an existing set tag", () => {
    const item = createEquipment("weapon_guard_blade", 1, "rare", new SeededRandom(9));
    item.setId = "set_moss_crown";
    const materials = createStarterMaterials();
    materials.mat_set_inscription = 1;
    const setEssences = createEmptySetEssences();
    setEssences.set_frost_bite = 4;
    expect(getSetImprintPreview(item, "set_frost_bite", setEssences, materials).reason).toBe("该装备已有套装标签");
    expect(imprintSetTag(item, "set_frost_bite", setEssences, materials)).toEqual({
      ok: false,
      reason: "该装备已有套装标签",
    });
  });
});
