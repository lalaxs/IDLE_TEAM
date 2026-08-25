import { AudioManager, type AudioCue } from "../audio/AudioManager";
import { DebugOverlay } from "../debug/DebugOverlay";
import { SaveRepository } from "../persistence/SaveRepository";
import { getDateKey, type SaveDataV1 } from "../persistence/schema";
import { calculateOfflineReward, createOfflineEquipment } from "../progression/OfflineRewards";
import { createShopOffers } from "../progression/ShopSystem";
import { PhaserGame } from "../phaser/PhaserGame";
import type { BattleEvent } from "../simulation/types";
import { AppShell } from "../ui/AppShell";
import { GameSession } from "./GameSession";

export class GameApp {
  private readonly repository = new SaveRepository();
  private readonly audio = new AudioManager();
  private readonly session: GameSession;
  private readonly shell: AppShell;
  private readonly renderer: PhaserGame;
  private readonly debug: DebugOverlay | null;
  private frameRequest = 0;
  private lastFrame = performance.now();
  private paused = false;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly root: HTMLElement) {
    const now = Date.now();
    const save = this.prepareSave(this.repository.load());
    const offline = calculateOfflineReward(now - save.lastActiveAt, save.highestClearedStage, save.lastActiveAt, save.abilities);
    save.lastActiveAt = now;
    this.session = new GameSession(save);
    this.shell = new AppShell(root, this.session.store, {
      onStageSelected: (stage) => this.restart(stage),
      onDungeonDispatched: () => this.restart(),
      onPartySaved: () => this.restart(),
      onClearSave: () => {
        this.repository.clear();
        location.reload();
      },
      onSoundRequested: () => this.audio.play("button"),
    });
    this.renderer = new PhaserGame("battle-canvas");
    this.debug = new URLSearchParams(location.search).has("debug")
      ? new DebugOverlay(root.querySelector(".game-shell")!, this.session)
      : null;
    this.audio.setEnabled(save.settings.soundEnabled);
    this.session.store.subscribe((state) => {
      this.audio.setEnabled(state.save.settings.soundEnabled);
      this.repository.schedule(state.save);
    });
    root.addEventListener("pointerdown", () => void this.audio.unlock(), { once: true });
    document.addEventListener("visibilitychange", () => this.onVisibilityChange());
    window.addEventListener("beforeunload", () => {
      save.lastActiveAt = Date.now();
      this.repository.flush();
    });
    if (!this.repository.persistent) {
      root.dataset.storageWarning = "本次进度无法永久保存";
    }
    if (offline.minutes > 0) {
      window.setTimeout(() => this.presentOfflineReward(offline), 750);
    }
    this.frameRequest = requestAnimationFrame((time) => this.frame(time));
  }

  destroy(): void {
    cancelAnimationFrame(this.frameRequest);
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.renderer.destroy();
    this.repository.flush();
  }

  private frame(time: number): void {
    const delta = Math.min(100, time - this.lastFrame);
    this.lastFrame = time;
    let stepDuration = 0;
    if (!this.paused) {
      const start = performance.now();
      this.session.step(delta * this.session.store.getState().save.settings.battleSpeed);
      stepDuration = performance.now() - start;
    }
    const events = this.session.drainEvents();
    const snapshot = this.session.snapshot;
    this.handleBattleEvents(events);
    this.shell.renderBattle(snapshot);
    this.shell.presentBattleEvents(events);
    this.renderer.publish(snapshot, events, this.session.store.getState().save.settings.reducedMotion);
    this.debug?.update(snapshot, stepDuration);
    this.frameRequest = requestAnimationFrame((next) => this.frame(next));
  }

  private handleBattleEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      const cue: AudioCue | null =
        event.type === "attack"
          ? "attack"
          : event.type === "damage"
            ? "hit"
            : event.type === "heal"
              ? "heal"
              : event.type === "skill:started"
                ? "skill"
                : event.type === "loot:revealed"
                  ? "loot"
                  : event.type === "battle:victory"
                    ? "victory"
                    : event.type === "battle:defeat"
                      ? "defeat"
                      : null;
      if (cue) this.audio.play(cue);
      if (event.type === "battle:victory" && !this.transitionTimer) {
        this.repository.flush();
        this.transitionTimer = setTimeout(() => {
          this.transitionTimer = null;
          this.renderer.resetViews();
          this.session.continueToNextStage();
        }, this.session.store.getState().save.settings.reducedMotion ? 350 : 1250);
      }
      if (event.type === "battle:defeat" && !this.transitionTimer) {
        this.transitionTimer = setTimeout(() => {
          this.transitionTimer = null;
          this.restart();
        }, this.session.store.getState().save.settings.reducedMotion ? 450 : 1500);
      }
    }
  }

  private restart(stage?: number): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.renderer.resetViews();
    this.session.restart(stage);
  }

  private prepareSave(save: SaveDataV1): SaveDataV1 {
    const dateKey = getDateKey();
    if (save.shop.dateKey !== dateKey) {
      save.shop = {
        dateKey,
        freeRefreshUsed: false,
        offers: createShopOffers(dateKey, save.highestUnlockedStage),
      };
    }
    return save;
  }

  private presentOfflineReward(reward: ReturnType<typeof calculateOfflineReward>): void {
    const save = this.session.store.getState().save;
    const items = createOfflineEquipment(
      reward.gearCount,
      save.highestUnlockedStage,
      save.lastActiveAt,
    );
    this.shell.showOfflineReward(reward.minutes, reward.gold, reward.exp, reward.gearCount, () => {
      this.session.store.dispatch({
        type: "offline:claim",
        gold: reward.gold,
        exp: reward.exp,
        items,
      });
      this.repository.flush();
    });
  }

  private onVisibilityChange(): void {
    this.paused = document.hidden;
    this.audio.setSuspended(document.hidden);
    if (document.hidden) {
      this.session.store.getState().save.lastActiveAt = Date.now();
      this.repository.flush();
    } else {
      this.lastFrame = performance.now();
    }
  }
}
