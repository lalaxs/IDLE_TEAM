import { AudioManager, type AudioCue } from "../audio/AudioManager";
import { DebugOverlay } from "../debug/DebugOverlay";
import { SaveRepository } from "../persistence/SaveRepository";
import { getDateKey } from "../domain/time/GameDay";
import type { SaveDataV1 } from "../domain/save/SaveData";
import { getShopRefreshKey } from "../content/shop";
import { createShopOffers } from "../progression/ShopSystem";
import { PhaserGame } from "../phaser/PhaserGame";
import type { BattleEvent, BattleSnapshot } from "../simulation/types";
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
  private clearingSave = false;
  private destroyed = false;
  private rendererReady = false;
  private lastUiSnapshot: BattleSnapshot | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private readonly handleFirstPointerDown = () => void this.audio.unlock();
  private readonly handleVisibilityChange = () => this.onVisibilityChange();
  private readonly handleBeforeUnload = () => this.persistLastActive();

  constructor(private readonly root: HTMLElement) {
    const now = Date.now();
    const save = this.prepareSave(this.repository.load());
    save.lastActiveAt = now;
    this.session = new GameSession(save);
    this.shell = new AppShell(root, this.session.store, {
      onStageSelected: () => this.restart(),
      onDungeonDispatched: () => this.restart(),
      onPartySaved: () => this.restart(),
      onClearSave: () => {
        this.clearingSave = true;
        if (this.repository.clear()) location.reload();
        else {
          this.clearingSave = false;
          root.dataset.storageWarning = "本次进度无法永久保存";
        }
      },
      onSoundRequested: () => this.audio.play("button"),
    });
    this.renderer = new PhaserGame("battle-canvas", this.session.snapshot);
    this.debug = new URLSearchParams(location.search).has("debug")
      ? new DebugOverlay(root.querySelector(".game-shell")!, this.session)
      : null;
    this.audio.setEnabled(save.settings.soundEnabled);
    this.unsubscribeStore = this.session.store.subscribe((state) => {
      this.audio.setEnabled(state.save.settings.soundEnabled);
      this.repository.schedule(state.save);
    });
    this.repository.schedule(save);
    root.addEventListener("pointerdown", this.handleFirstPointerDown, { once: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    if (!this.repository.persistent) {
      root.dataset.storageWarning = "本次进度无法永久保存";
    }
    this.frameRequest = requestAnimationFrame((time) => this.frame(time));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frameRequest);
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.root.removeEventListener("pointerdown", this.handleFirstPointerDown);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.persistLastActive();
    this.renderer.destroy();
    this.debug?.destroy();
    this.shell.destroy();
    this.session.destroy();
    this.audio.destroy();
  }

  private frame(time: number): void {
    if (this.destroyed) return;
    const delta = Math.min(100, time - this.lastFrame);
    this.lastFrame = time;
    let stepDuration = 0;
    let snapshot = this.session.snapshot;
    if (!this.rendererReady) {
      this.rendererReady = this.renderer.prepare(snapshot);
    }
    if (!this.paused && !this.session.store.isAdPending && this.rendererReady) {
      const start = performance.now();
      this.session.step(delta * this.session.store.getState().save.settings.battleSpeed);
      stepDuration = performance.now() - start;
      snapshot = this.session.snapshot;
    }
    const events = this.session.drainEvents();
    this.handleBattleEvents(events);
    if (snapshot !== this.lastUiSnapshot) {
      this.shell.renderBattle(snapshot);
      this.lastUiSnapshot = snapshot;
    }
    this.shell.presentBattleEvents(events);
    if (this.rendererReady) {
      this.renderer.publish(snapshot, events, this.session.store.getState().save.settings.reducedMotion);
    }
    this.debug?.update(snapshot, stepDuration);
    this.frameRequest = requestAnimationFrame((next) => this.frame(next));
  }

  private handleBattleEvents(events: readonly BattleEvent[]): void {
    for (const event of events) {
      const cue: AudioCue | null =
        event.type === "attack"
          ? event.attackMode === "ranged" ? "rangedAttack" : "attack"
          : event.type === "damage"
            ? "hit"
            : event.type === "heal" && event.presentation !== "silent"
              ? "heal"
              : event.type === "skill:started"
                ? "skill"
                : event.type === "loot:revealed" || event.type === "loot:dropped"
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
          this.rendererReady = false;
          this.lastUiSnapshot = null;
        }, this.session.store.getState().save.settings.reducedMotion ? 500 : 1800);
      }
      if (event.type === "battle:defeat" && !this.transitionTimer) {
        this.transitionTimer = setTimeout(() => {
          this.transitionTimer = null;
          this.restart();
        }, this.session.store.getState().save.settings.reducedMotion ? 450 : 1500);
      }
    }
  }

  private restart(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.renderer.resetViews();
    this.session.restart();
    this.rendererReady = false;
    this.lastUiSnapshot = null;
  }

  private prepareSave(save: SaveDataV1): SaveDataV1 {
    const now = new Date();
    const dateKey = getDateKey(now);
    const refreshKey = getShopRefreshKey(now);
    if (save.shop.dateKey !== dateKey) {
      save.shop.dateKey = dateKey;
      save.shop.goldRefreshesUsed = 0;
      save.shop.adRefreshesClaimed = false;
      save.shop.adRefreshesUsed = 0;
    }
    if (save.shop.refreshKey !== refreshKey || save.shop.offers.length === 0) {
      save.shop.refreshKey = refreshKey;
      save.shop.refreshSequence = 0;
      save.shop.offers = createShopOffers(refreshKey, save.highestUnlockedStage);
    }
    return save;
  }

  private onVisibilityChange(): void {
    this.paused = document.hidden;
    this.audio.setSuspended(document.hidden);
    if (document.hidden) {
      this.persistLastActive();
    } else {
      this.lastFrame = performance.now();
      this.session.store.dispatch({ type: "session:touch", now: Date.now() });
    }
  }

  private persistLastActive(): void {
    if (this.clearingSave) return;
    this.session.store.dispatch({ type: "session:touch", now: Date.now() });
    this.repository.saveNow(this.session.store.getState().save);
  }
}
