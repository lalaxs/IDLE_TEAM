import { describe, expect, it } from "vitest";
import { AudioManager } from "../../src/audio/AudioManager";

describe("AudioManager", () => {
  it("throttles the same cue inside 80ms and honors the enabled flag", () => {
    let now = 100;
    const played: string[] = [];
    const audio = new AudioManager({
      now: () => now,
      emit: (kind) => played.push(kind),
    });
    audio.play("hit");
    now += 30;
    audio.play("hit");
    now += 90;
    audio.play("hit");
    audio.setEnabled(false);
    now += 90;
    audio.play("victory");
    expect(played).toEqual(["hit", "hit"]);
  });
});
