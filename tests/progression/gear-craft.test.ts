import { describe, expect, it } from "vitest";
import { createStarterMaterials } from "../../src/content/materials";
import { createEquipment } from "../../src/progression/EquipmentSystem";
import {
  inlayGem,
  openEquipmentSocket,
  resetEquipmentAffix,
  smeltEquipmentAffix,
} from "../../src/progression/GearCraftSystem";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("GearCraftSystem", () => {
  it("opens up to two sockets and requires stone", () => {
    const item = createEquipment("weapon_guard_blade", 5, "rare", new SeededRandom(1));
    const materials = createStarterMaterials();
    materials.mat_socket_stone = 2;

    expect(openEquipmentSocket(item, materials)).toEqual({ ok: true });
    expect(item.sockets).toHaveLength(1);
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

  it("smelts a player-chosen affix onto gear", () => {
    const item = createEquipment("weapon_guard_blade", 8, "rare", new SeededRandom(4));
    const before = item.affixes.length;
    const materials = createStarterMaterials();
    materials.mat_smelt_flux = 1;
    const result = smeltEquipmentAffix(item, "flat_attack", materials, new SeededRandom(7));
    expect(result.ok).toBe(true);
    expect(item.affixes).toHaveLength(before + 1);
    expect(item.affixes[item.affixes.length - 1]?.affixId).toBe("flat_attack");
  });
});
