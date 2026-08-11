import { describe, expect, it } from "vitest";
import { DESIGN_HEIGHT, DESIGN_WIDTH, computeFitScale } from "../../src/ui/viewportFit";

describe("computeFitScale", () => {
  it("keeps phone-width viewports fluid without CSS upscaling", () => {
    expect(computeFitScale({ viewportWidth: 390, viewportHeight: 844 })).toEqual({
      scaled: false,
      scale: 1,
      layoutWidth: 390,
      layoutHeight: 844,
    });
  });

  it("height-limits wide desktop windows while preserving the design aspect", () => {
    const fit = computeFitScale({ viewportWidth: 1920, viewportHeight: 1080 });
    expect(fit.scaled).toBe(true);
    expect(fit.scale).toBeCloseTo(1080 / DESIGN_HEIGHT, 5);
    expect(fit.layoutWidth).toBeCloseTo(DESIGN_WIDTH * (1080 / DESIGN_HEIGHT), 5);
    expect(fit.layoutHeight).toBeCloseTo(1080, 5);
  });

  it("width-limits tall narrow desktop windows so the frame stays fully visible", () => {
    const fit = computeFitScale({ viewportWidth: 600, viewportHeight: 2000 });
    expect(fit.scaled).toBe(true);
    expect(fit.scale).toBeCloseTo(600 / DESIGN_WIDTH, 5);
    expect(fit.layoutHeight).toBeCloseTo(DESIGN_HEIGHT * (600 / DESIGN_WIDTH), 5);
  });
});
