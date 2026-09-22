import {
  ACCOUNT_CURRENCY_BY_ID,
  type AccountCurrencyId,
} from "../content/currencies";
import type { ResourceRewardSource } from "../app/events";

interface Point {
  x: number;
  y: number;
}

const PARTICLE_FLIGHT_MS = 1_240;
const PARTICLE_STAGGER_MS = 52;
const SCATTER_END = 0.28;
const HOLD_END = 0.48;
const NUMBER_DELAY_MS = 1_420;
const NUMBER_TWEEN_MS = 360;
const CLEANUP_MS = 1_900;
const MAX_TARGET_PULSES = 3;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value ** 3
    : 1 - ((-2 * value + 2) ** 3) / 2;
}

function compact(value: number): string {
  if (value >= 999_500) {
    const millions = value / 1_000_000;
    return `${millions < 10 ? millions.toFixed(1) : Math.round(millions)}m`;
  }
  if (value >= 100_000) return `${Math.round(value / 1_000)}k`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toLocaleString("zh-CN");
}

export interface ResourceRewardOrigin {
  source: ResourceRewardSource;
  point: Point;
}

export class ResourceRewardAnimator {
  private sequence = 0;
  private frame: number | null = null;
  private readonly visibleValues = new Map<AccountCurrencyId, number>();

  constructor(
    private readonly root: HTMLElement,
    private readonly layer: HTMLElement,
  ) {}

  animate(
    rewards: Partial<Record<AccountCurrencyId, number>>,
    source: ResourceRewardSource,
    finalAmounts: Record<AccountCurrencyId, number>,
    reducedMotion: boolean,
    origin: ResourceRewardOrigin | null,
  ): void {
    const entries = (Object.entries(rewards) as [AccountCurrencyId, number][])
      .filter(([, amount]) => amount > 0);
    if (entries.length === 0) return;

    this.cancelActiveAnimation();
    const token = ++this.sequence;
    const layerRect = this.layer.getBoundingClientRect();
    const sourcePoint = origin?.source === source
      ? this.toLocal(origin.point, layerRect)
      : this.resolveSourcePoint(source, layerRect);

    if (reducedMotion) {
      for (const [currencyId] of entries) {
        this.visibleValues.set(currencyId, finalAmounts[currencyId]!);
        this.setBalance(currencyId, finalAmounts[currencyId]!);
        this.resetResourceChip(currencyId);
        this.visibleValues.delete(currencyId);
      }
      return;
    }

    const particles: Array<{
      element: HTMLElement;
      currencyId: AccountCurrencyId;
      target: Point;
      scatter: Point;
      delay: number;
      rotation: number;
      landed: boolean;
    }> = [];
    const startAmounts = new Map<AccountCurrencyId, number>();
    const arrivalStats = new Map<AccountCurrencyId, { landed: number; total: number; pulsed: number }>();

    for (const [currencyId, amount] of entries) {
      const finalAmount = finalAmounts[currencyId]!;
      const startAmount = this.visibleValues.get(currencyId)
        ?? Math.max(0, finalAmount - amount);
      const particleSize = currencyId === "gold" ? 42 : 28;
      startAmounts.set(currencyId, startAmount);
      this.visibleValues.set(currencyId, startAmount);
      this.setBalance(currencyId, startAmount, false);

      const target = this.resolveTargetPoint(currencyId, layerRect);
      const particleCount = currencyId === "gems"
        ? 5
        : Math.min(8, Math.max(5, 3 + Math.ceil(Math.log10(amount + 10))));
      arrivalStats.set(currencyId, { landed: 0, total: particleCount, pulsed: 0 });
      for (let index = 0; index < particleCount; index += 1) {
        const element = document.createElement("span");
        element.className = `resource-fly-particle resource-fly-particle--${ACCOUNT_CURRENCY_BY_ID[currencyId].tone}`;
        element.setAttribute("aria-hidden", "true");
        element.style.left = `${sourcePoint.x - particleSize / 2}px`;
        element.style.top = `${sourcePoint.y - particleSize / 2}px`;
        element.innerHTML = `<img src="${ACCOUNT_CURRENCY_BY_ID[currencyId].icon}" alt="" draggable="false">`;
        this.layer.appendChild(element);
        const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * 0.36;
        const distance = 22 + Math.random() * 34;
        particles.push({
          element,
          currencyId,
          target,
          scatter: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance - 8,
          },
          delay: index * PARTICLE_STAGGER_MS,
          rotation: (Math.random() - 0.5) * 32,
          landed: false,
        });
      }
    }

    const startTime = performance.now();
    const update = (now: number) => {
      if (token !== this.sequence) return;
      const elapsed = now - startTime;
      for (const particle of particles) {
        const progress = clamp((elapsed - particle.delay) / PARTICLE_FLIGHT_MS);
        const scatterProgress = clamp(progress / SCATTER_END);
        const flightProgress = clamp((progress - HOLD_END) / (1 - HOLD_END));
        const scatterEase = easeOutCubic(scatterProgress);
        const flightEase = easeInOutCubic(flightProgress);
        const scatterX = particle.scatter.x * scatterEase;
        const scatterY = particle.scatter.y * scatterEase;
        if (flightProgress >= 1 && !particle.landed) {
          particle.landed = true;
          const stats = arrivalStats.get(particle.currencyId);
          if (stats) {
            stats.landed += 1;
            const middleArrival = Math.ceil(stats.total / 2);
            const shouldPulse = stats.landed === 1
              || stats.landed === middleArrival
              || stats.landed === stats.total;
            if (shouldPulse && stats.pulsed < MAX_TARGET_PULSES) {
              stats.pulsed += 1;
              this.pulseTarget(particle.currencyId);
            }
          }
        }
        const x = flightProgress > 0
          ? particle.scatter.x * (1 - flightEase) + (particle.target.x - sourcePoint.x) * flightEase
          : scatterX;
        const y = flightProgress > 0
          ? particle.scatter.y * (1 - flightEase) + (particle.target.y - sourcePoint.y) * flightEase
          : scatterY;
        const scale = particle.currencyId === "gold"
          ? progress < SCATTER_END
            ? 0.76 + scatterEase * 0.4
            : 1.16 - flightEase * 0.58
          : progress < SCATTER_END
            ? 0.62 + scatterEase * 0.42
            : 1.04 - flightEase * 0.5;
        const opacity = progress <= 0 ? 0 : progress < 0.18 ? progress / 0.18 : 1 - Math.max(0, flightProgress - 0.8) / 0.2;
        particle.element.style.opacity = String(clamp(opacity));
        particle.element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${particle.rotation * (1 - flightEase)}deg)`;
      }

      const numberProgress = clamp((elapsed - NUMBER_DELAY_MS) / NUMBER_TWEEN_MS);
      if (numberProgress > 0) {
        const numberEase = easeOutCubic(numberProgress);
        for (const [currencyId] of entries) {
          const finalAmount = finalAmounts[currencyId]!;
          const startAmount = startAmounts.get(currencyId) ?? finalAmount;
          const current = startAmount + (finalAmount - startAmount) * numberEase;
          this.visibleValues.set(currencyId, current);
          this.setBalance(currencyId, current, false);
        }
      }

      if (elapsed < CLEANUP_MS) {
        this.frame = requestAnimationFrame(update);
      } else {
        for (const [currencyId] of entries) {
          this.visibleValues.set(currencyId, finalAmounts[currencyId]!);
          this.setBalance(currencyId, finalAmounts[currencyId]!);
          this.resetResourceChip(currencyId);
          this.visibleValues.delete(currencyId);
        }
        for (const particle of particles) particle.element.remove();
        this.frame = null;
      }
    };

    this.frame = requestAnimationFrame(update);
  }

  destroy(): void {
    this.cancelActiveAnimation();
    this.visibleValues.clear();
  }

  private cancelActiveAnimation(): void {
    this.sequence += 1;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.layer.replaceChildren();
    for (const currencyId of this.visibleValues.keys()) this.resetResourceChip(currencyId);
  }

  private toLocal(point: Point, layerRect: DOMRect): Point {
    const scaleX = layerRect.width / Math.max(1, this.layer.clientWidth);
    const scaleY = layerRect.height / Math.max(1, this.layer.clientHeight);
    return {
      x: (point.x - layerRect.left) / scaleX,
      y: (point.y - layerRect.top) / scaleY,
    };
  }

  private resolveSourcePoint(source: ResourceRewardSource, layerRect: DOMRect): Point {
    const selector = source === "check-in" || source === "tasks" || source === "vip" ? ".activities-page" : source === "battle"
      ? ".battle-frame"
      : source === "dungeon"
        ? ".expedition-detail-modal"
      : source === "offline"
          ? ".offline-reward-modal"
          : source === "loot-chest"
            ? ".loot-chest-badge"
            : source === "stage-gift"
              ? ".stage-gift-card.claimable"
              : ".equipment-tips-popover";
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      return this.toLocal({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, layerRect);
    }
    return { x: this.layer.clientWidth / 2, y: this.layer.clientHeight / 2 };
  }

  private resolveTargetPoint(currencyId: AccountCurrencyId, layerRect: DOMRect): Point {
    const target = this.root.querySelector<HTMLElement>(`.resource-chip[data-currency="${currencyId}"] .resource-art`);
    if (!target) return { x: this.layer.clientWidth / 2, y: 24 };
    const rect = target.getBoundingClientRect();
    return this.toLocal({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, layerRect);
  }

  private setBalance(currencyId: AccountCurrencyId, amount: number, updateLabel = true): void {
    const chip = this.root.querySelector<HTMLElement>(`.resource-chip[data-currency="${currencyId}"]`);
    const balance = chip?.querySelector<HTMLElement>(".resource-balance b");
    if (balance) balance.textContent = compact(amount);
    if (chip && updateLabel) {
      const currency = ACCOUNT_CURRENCY_BY_ID[currencyId];
      chip.setAttribute("aria-label", `${currency.name} ${Math.round(amount).toLocaleString("zh-CN")}，查看详情`);
    }
  }

  private resetResourceChip(currencyId: AccountCurrencyId): void {
    const chip = this.root.querySelector<HTMLElement>(`.resource-chip[data-currency="${currencyId}"]`);
    chip?.classList.remove("resource-chip--collecting", "resource-chip--arrived");
  }

  private pulseTarget(currencyId: AccountCurrencyId): void {
    const chip = this.root.querySelector<HTMLElement>(`.resource-chip[data-currency="${currencyId}"]`);
    if (!chip) return;
    chip.classList.remove("resource-chip--arrived");
    void chip.offsetWidth;
    chip.classList.add("resource-chip--arrived");
  }
}
