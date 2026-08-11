export type AudioCue =
  | "attack"
  | "hit"
  | "skill"
  | "heal"
  | "loot"
  | "victory"
  | "defeat"
  | "button";

interface AudioManagerOptions {
  now?: () => number;
  emit?: (kind: AudioCue) => void;
}

const frequencies: Record<AudioCue, [number, number, number]> = {
  attack: [210, 0.035, 0.022],
  hit: [120, 0.05, 0.032],
  skill: [420, 0.14, 0.035],
  heal: [590, 0.18, 0.032],
  loot: [740, 0.13, 0.035],
  victory: [880, 0.3, 0.045],
  defeat: [92, 0.28, 0.04],
  button: [330, 0.035, 0.018],
};

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled = true;
  private suspended = false;
  private readonly lastPlayed = new Map<AudioCue, number>();
  private readonly now: () => number;
  private readonly injectedEmitter?: (kind: AudioCue) => void;

  constructor(options: AudioManagerOptions = {}) {
    this.now = options.now ?? (() => performance.now());
    this.injectedEmitter = options.emit;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }

  async unlock(): Promise<void> {
    if (!this.enabled || this.context) return;
    const Context =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    try {
      this.context = new Context();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      this.context = null;
    }
  }

  play(kind: AudioCue): void {
    if (!this.enabled || this.suspended) return;
    const now = this.now();
    const previous = this.lastPlayed.get(kind);
    if (previous !== undefined && now - previous < 80) return;
    this.lastPlayed.set(kind, now);
    if (this.injectedEmitter) {
      this.injectedEmitter(kind);
      return;
    }
    if (!this.context) return;
    const [frequency, duration, volume] = frequencies[kind];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = kind === "hit" || kind === "defeat" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    if (kind === "victory" || kind === "loot") {
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.context.currentTime + duration);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * 0.82), this.context.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
}
