import type { GameSession } from "../app/GameSession";
import type { BattleSnapshot } from "../simulation/types";

export class DebugOverlay {
  private readonly element: HTMLElement;
  private readonly stats: HTMLElement;
  private frameCount = 0;
  private lastSample = performance.now();
  private fps = 0;

  constructor(root: HTMLElement, private readonly session: GameSession) {
    this.element = document.createElement("aside");
    this.element.className = "debug-overlay";
    this.element.innerHTML = `
      <header><strong>战斗调试</strong><button data-debug="toggle">收起</button></header>
      <pre></pre>
      <div>
        <button data-debug="enemies" aria-label="清除敌人">清除敌人</button>
        <button data-debug="heroes" aria-label="击倒全队">击倒全队</button>
        <button data-debug="gold">+1000 金币</button>
        <button data-debug="gems">+500 宝石</button>
      </div>
    `;
    this.stats = this.element.querySelector("pre")!;
    this.element.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-debug]");
      if (!button) return;
      const action = button.dataset.debug;
      if (action === "toggle") this.element.classList.toggle("collapsed");
      if (action === "enemies") this.session.debugDefeatEnemies();
      if (action === "heroes") this.session.debugDefeatHeroes();
      if (action === "gold") {
        this.session.store.getState().save.gold += 1000;
        this.session.store.dispatch({ type: "settings:update", patch: {} });
      }
      if (action === "gems") {
        this.session.store.getState().save.gems += 500;
        this.session.store.dispatch({ type: "settings:update", patch: {} });
      }
    });
    root.append(this.element);
  }

  update(snapshot: BattleSnapshot, stepMs: number): void {
    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastSample >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastSample));
      this.frameCount = 0;
      this.lastSample = now;
    }
    const aliveHeroes = snapshot.units.filter(({ team, alive }) => team === "heroes" && alive).length;
    const aliveEnemies = snapshot.units.filter(({ team, alive }) => team === "enemies" && alive).length;
    this.stats.textContent = [
      `渲染 ${this.fps} fps · 步长 ${stepMs.toFixed(2)} ms`,
      `种子 ${snapshot.seed}`,
      `关卡 ${snapshot.stage} · 进度 ${Math.round(snapshot.progress * 100)}%${snapshot.bossActive ? " · Boss" : ""}`,
      `状态 ${snapshot.state}`,
      `英雄 ${aliveHeroes} · 敌人 ${aliveEnemies}`,
    ].join("\n");
  }
}
