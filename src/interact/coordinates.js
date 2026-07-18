export function geometrySnapshot(target, view = window) {
  const rect = target.getBoundingClientRect();
  const width = target.offsetWidth || rect.width || 1;
  const height = target.offsetHeight || rect.height || 1;
  return Object.freeze({
    rect: Object.freeze({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }),
    scrollX: view.scrollX || 0,
    scrollY: view.scrollY || 0,
    scaleX: rect.width / width || 1,
    scaleY: rect.height / height || 1
  });
}

export function pointerDelta(origin, event, view = window) {
  return {
    x: (event.clientX - origin.clientX + (view.scrollX || 0) - origin.scrollX) / origin.geometry.scaleX,
    y: (event.clientY - origin.clientY + (view.scrollY || 0) - origin.scrollY) / origin.geometry.scaleY
  };
}

export function applyAxisGrid(position, options = {}) {
  let x = options.axis === 'y' ? 0 : position.x;
  let y = options.axis === 'x' ? 0 : position.y;
  const grid = typeof options.grid === 'number' ? { x: options.grid, y: options.grid } : options.grid;
  if (grid?.x > 0) x = Math.round(x / grid.x) * grid.x;
  if (grid?.y > 0) y = Math.round(y / grid.y) * grid.y;
  return { x, y };
}
