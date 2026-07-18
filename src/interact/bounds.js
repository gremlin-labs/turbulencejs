function rectLike(value) {
  return value && ['left', 'right', 'top', 'bottom'].every(key => Number.isFinite(Number(value[key])));
}

export function resolveDragBounds(value, target, geometry, view = window) {
  const resolved = typeof value === 'function' ? value({ target, geometry }) : value;
  let rect;
  if (!resolved || resolved === 'viewport') rect = { left: 0, top: 0, right: view.innerWidth, bottom: view.innerHeight };
  else if (resolved?.nodeType === 1) rect = resolved.getBoundingClientRect();
  else if (rectLike(resolved)) rect = resolved;
  else throw new TypeError('Drag bounds must be viewport, an element, a rectangle, or a resolver.');
  return Object.freeze({
    minX: (rect.left - geometry.rect.left) / geometry.scaleX,
    maxX: (rect.right - geometry.rect.right) / geometry.scaleX,
    minY: (rect.top - geometry.rect.top) / geometry.scaleY,
    maxY: (rect.bottom - geometry.rect.bottom) / geometry.scaleY
  });
}

export function constrainPosition(position, bounds, resistance = 0.2) {
  function constrain(value, minimum, maximum) {
    if (value < minimum) return minimum + (value - minimum) * resistance;
    if (value > maximum) return maximum + (value - maximum) * resistance;
    return value;
  }
  return { x: constrain(position.x, bounds.minX, bounds.maxX), y: constrain(position.y, bounds.minY, bounds.maxY) };
}

export function clampPosition(position, bounds) {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y))
  };
}
