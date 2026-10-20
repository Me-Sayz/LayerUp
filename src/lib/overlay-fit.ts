export const FIT_W = "--fit-w";
export const FIT_H = "--fit-h";
const EPSILON = 0.25;

// FIT: skala widget = kotak LIVE Studio dibagi ukuran alami widget (satuan desain = px pada --u 1px)
export function fitVar(name: string, fallback: number): string {
  return `var(${name}, ${fallback})`;
}

export function fitUnit(width: string, height: string): string {
  return `min(100cqw / ${width}, 100cqh / ${height})`;
}

export function writeFit(element: HTMLElement | null, name: string, value: number): boolean {
  if (!element || !Number.isFinite(value) || value <= 0) return false;
  const previous = Number(element.style.getPropertyValue(name));
  if (Math.abs(previous - value) < EPSILON) return false;
  element.style.setProperty(name, String(value));
  return true;
}

export function onFontsReady(callback: () => void): () => void {
  const fonts = typeof document === "undefined" ? undefined : document.fonts;
  if (!fonts) return () => {};
  let live = true;
  const run = () => {
    if (live) callback();
  };
  void fonts.ready.then(run);
  fonts.addEventListener("loadingdone", run);
  return () => {
    live = false;
    fonts.removeEventListener("loadingdone", run);
  };
}
// END FIT
