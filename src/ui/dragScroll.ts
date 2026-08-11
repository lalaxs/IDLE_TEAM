/** Enable click-and-drag / touch-drag scrolling on an overflow container. */
export function bindDragScroll(element: HTMLElement): void {
  if (element.dataset.dragScrollBound === "1") return;
  element.dataset.dragScrollBound = "1";

  const DRAG_THRESHOLD_PX = 10;
  let pointerId: number | null = null;
  let originY = 0;
  let originScroll = 0;
  let dragging = false;
  let suppressClick = false;

  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (element.scrollHeight <= element.clientHeight + 1) return;
    pointerId = event.pointerId;
    originY = event.clientY;
    originScroll = element.scrollTop;
    dragging = false;
    suppressClick = false;
  });

  element.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const delta = event.clientY - originY;
    if (!dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      suppressClick = true;
      element.classList.add("is-drag-scrolling");
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture failures in environments without PointerEvent capture.
      }
    }
    element.scrollTop = originScroll - delta;
    event.preventDefault();
  });

  const finish = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    element.classList.remove("is-drag-scrolling");
    try {
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore release failures when capture was never taken.
    }
  };

  element.addEventListener("pointerup", finish);
  element.addEventListener("pointercancel", finish);
  element.addEventListener("lostpointercapture", () => {
    pointerId = null;
    element.classList.remove("is-drag-scrolling");
  });
  element.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}
