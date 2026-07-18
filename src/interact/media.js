export function hoverInputAvailable(view = window) {
  return typeof view.matchMedia !== 'function' || view.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function focusVisible(target) {
  try { return target.matches(':focus-visible'); } catch { return true; }
}
