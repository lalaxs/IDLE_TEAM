/** Mobile design frame used for desktop contain/FIT upscaling. */
export const DESIGN_WIDTH = 430;
export const DESIGN_HEIGHT = 844;

export interface FitScaleInput {
  viewportWidth: number;
  viewportHeight: number;
  designWidth?: number;
  designHeight?: number;
}

export interface FitScaleResult {
  /** When false, the shell stays fluid at phone width (no CSS transform). */
  scaled: boolean;
  scale: number;
  layoutWidth: number;
  layoutHeight: number;
}

/**
 * Classic H5 contain/FIT: grow the design frame as large as possible while
 * keeping aspect ratio and remaining fully visible (letterbox/pillarbox OK).
 * On viewports at or below design width, leave scaling off for native layout.
 */
export function computeFitScale(input: FitScaleInput): FitScaleResult {
  const designWidth = input.designWidth ?? DESIGN_WIDTH;
  const designHeight = input.designHeight ?? DESIGN_HEIGHT;
  const { viewportWidth, viewportHeight } = input;

  if (viewportWidth <= designWidth) {
    return {
      scaled: false,
      scale: 1,
      layoutWidth: viewportWidth,
      layoutHeight: viewportHeight,
    };
  }

  const scale = Math.min(viewportWidth / designWidth, viewportHeight / designHeight);
  return {
    scaled: true,
    scale,
    layoutWidth: designWidth * scale,
    layoutHeight: designHeight * scale,
  };
}

/**
 * Wraps `#app` in a layout slot and applies desktop FIT scaling on resize.
 * Returns a disposer that removes listeners (does not tear down the DOM slot).
 */
export function mountViewportFit(stage: HTMLElement, app: HTMLElement): () => void {
  let slot = stage.querySelector<HTMLElement>(".fit-stage__slot");
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "fit-stage__slot";
    stage.appendChild(slot);
  }
  if (app.parentElement !== slot) {
    slot.appendChild(app);
  }

  const apply = (): void => {
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const fit = computeFitScale({ viewportWidth, viewportHeight });

    if (!fit.scaled) {
      stage.classList.remove("fit-stage--scaled");
      slot.style.width = "";
      slot.style.height = "";
      app.style.width = "";
      app.style.height = "";
      app.style.minHeight = "";
      app.style.transform = "";
      return;
    }

    stage.classList.add("fit-stage--scaled");
    slot.style.width = `${fit.layoutWidth}px`;
    slot.style.height = `${fit.layoutHeight}px`;
    app.style.width = `${DESIGN_WIDTH}px`;
    app.style.height = `${DESIGN_HEIGHT}px`;
    app.style.minHeight = `${DESIGN_HEIGHT}px`;
    app.style.transform = `scale(${fit.scale})`;
  };

  apply();
  window.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("scroll", apply);

  return () => {
    window.removeEventListener("resize", apply);
    window.visualViewport?.removeEventListener("resize", apply);
    window.visualViewport?.removeEventListener("scroll", apply);
  };
}
