// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { bindDragScroll } from "../../src/ui/dragScroll";

function createScroller(): HTMLDivElement {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 100 });
  Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 300 });
  scroller.scrollTop = 0;
  scroller.setPointerCapture = vi.fn();
  scroller.releasePointerCapture = vi.fn();
  scroller.hasPointerCapture = vi.fn(() => true);
  document.body.append(scroller);
  return scroller;
}

describe("bindDragScroll", () => {
  it("scrolls the container when the pointer is dragged vertically", () => {
    const scroller = createScroller();
    bindDragScroll(scroller);

    scroller.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientY: 120, button: 0, bubbles: true }),
    );
    scroller.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientY: 80, bubbles: true, cancelable: true }),
    );
    expect(scroller.scrollTop).toBe(40);
    expect(scroller.classList.contains("is-drag-scrolling")).toBe(true);
    expect(scroller.setPointerCapture).toHaveBeenCalledWith(1);

    scroller.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientY: 80, bubbles: true }));
    expect(scroller.classList.contains("is-drag-scrolling")).toBe(false);
  });

  it("still allows clicks when the pointer barely moves", () => {
    const scroller = createScroller();
    const button = document.createElement("button");
    scroller.append(button);
    bindDragScroll(scroller);

    const click = vi.fn();
    button.addEventListener("click", click);

    scroller.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 3, clientY: 100, button: 0, bubbles: true }),
    );
    scroller.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 3, clientY: 96, bubbles: true, cancelable: true }),
    );
    scroller.dispatchEvent(new PointerEvent("pointerup", { pointerId: 3, clientY: 96, bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(scroller.scrollTop).toBe(0);
    expect(scroller.setPointerCapture).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("suppresses the following click after a drag", () => {
    const scroller = createScroller();
    const button = document.createElement("button");
    scroller.append(button);
    bindDragScroll(scroller);

    const click = vi.fn();
    button.addEventListener("click", click);

    scroller.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 7, clientY: 100, button: 0, bubbles: true }),
    );
    scroller.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 7, clientY: 40, bubbles: true, cancelable: true }),
    );
    scroller.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, clientY: 40, bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(click).not.toHaveBeenCalled();
  });
});
