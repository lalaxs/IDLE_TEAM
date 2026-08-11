import { describe, expect, it } from "vitest";
import { SeededRandom } from "../../src/simulation/RandomSource";

describe("SeededRandom", () => {
  it("replays the same sequence from the same seed", () => {
    const left = new SeededRandom(42);
    const right = new SeededRandom(42);
    expect([left.next(), left.next(), left.next()]).toEqual([
      right.next(),
      right.next(),
      right.next(),
    ]);
  });

  it("produces inclusive integers and rejects empty picks", () => {
    const random = new SeededRandom(7);
    const values = Array.from({ length: 30 }, () => random.int(2, 4));
    expect(values.every((value) => value >= 2 && value <= 4)).toBe(true);
    expect(() => random.pick([])).toThrow("empty");
  });
});
