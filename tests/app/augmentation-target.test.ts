import { describe, expect, it } from "vitest";
import { GameSession } from "../../src/app/GameSession";
import { createDefaultSave, repairSaveData } from "../../src/persistence/schema";
import { renderAugmentationTargetControl } from "../../src/ui/features/heroes/AugmentationTargetControl";

function partySave() {
  const save = createDefaultSave(1000);
  save.highestClearedStage = 24;
  save.party = ["H35", "H65", "H57", "H59", "H30"];
  for (const id of save.party) if (id) save.roster[id].unlocked = true;
  return save;
}

describe("augmentation target preference", () => {
  it("persists a selected teammate and defaults an existing save to automatic", () => {
    const save = partySave();
    delete save.roster.H30.augmentationTargetId;
    expect(repairSaveData(save, 1000).roster.H30.augmentationTargetId).toBeNull();
    save.roster.H30.augmentationTargetId = "H59";
    expect(repairSaveData(JSON.parse(JSON.stringify(save)), 1000).roster.H30.augmentationTargetId).toBe("H59");
    save.roster.H30.augmentationTargetId = "H30";
    expect(repairSaveData(save, 1000).roster.H30.augmentationTargetId).toBeNull();
  });

  it("applies a choice to the current battle without restarting and can restore automatic", () => {
    const session = new GameSession(partySave(), 23);
    session.step(50);
    const elapsed = session.snapshot.elapsedMs;
    session.store.dispatch({ type: "hero:setAugmentationTarget", heroId: "H30", targetHeroId: "H59" });
    expect(session.store.getState().save.roster.H30.augmentationTargetId).toBe("H59");
    expect(session.snapshot.units.find((unit) => unit.sourceId === "H30")?.passiveFlags.augmentationTargetId).toBe("H59");
    expect(session.snapshot.elapsedMs).toBe(elapsed);
    session.store.dispatch({ type: "hero:setAugmentationTarget", heroId: "H30", targetHeroId: null });
    expect(session.snapshot.units.find((unit) => unit.sourceId === "H30")?.passiveFlags.augmentationTargetId).toBe("");
    session.destroy();
  });

  it("only accepts another deployed teammate for augmentation heroes", () => {
    const session = new GameSession(partySave(), 23);
    session.store.dispatch({ type: "hero:setAugmentationTarget", heroId: "H30", targetHeroId: "H30" });
    session.store.dispatch({ type: "hero:setAugmentationTarget", heroId: "H30", targetHeroId: "H62" });
    session.store.dispatch({ type: "hero:setAugmentationTarget", heroId: "H35", targetHeroId: "H59" });
    expect(session.store.getState().save.roster.H30.augmentationTargetId).toBeNull();
    expect(session.store.getState().save.roster.H35.augmentationTargetId).toBeNull();
    session.destroy();
  });

  it("shows a retained off-party preference and provides an automatic option", () => {
    const save = partySave(); save.roster.H30.augmentationTargetId = "H59";
    save.party[3] = null;
    expect(renderAugmentationTargetControl(save, "H30")).toContain("（未上阵）");
    expect(renderAugmentationTargetControl(save, "H30")).toContain("自动（优先输出）");
    expect(renderAugmentationTargetControl(save, "H35")).toBe("");
  });
});
