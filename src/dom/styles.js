export const TRANSFORM_DEFAULTS = { x: 0, y: 0, scale: 1, rotate: 0 };
export const TRANSFORM_KEYS = ['x', 'y', 'scale', 'rotate'];

const round3 = number => Math.round(number * 1000) / 1000;

export function transformCss(transform) {
  const parts = [];
  if (transform.x || transform.y) parts.push(`translate3d(${round3(transform.x)}px, ${round3(transform.y)}px, 0)`);
  if (transform.scale !== 1) parts.push(`scale(${round3(transform.scale)})`);
  if (transform.rotate) parts.push(`rotate(${round3(transform.rotate)}deg)`);
  return parts.length ? parts.join(' ') : 'none';
}

export function splitProps(properties) {
  const transformTo = {};
  let hasTransform = false;
  const styleProps = [];
  for (const [key, value] of Object.entries(properties)) {
    if (TRANSFORM_KEYS.includes(key)) {
      transformTo[key] = value;
      hasTransform = true;
    } else {
      styleProps.push([key, value]);
    }
  }
  return { transformTo: hasTransform ? transformTo : null, styleProps };
}

export function applyStyle(element, key, value) {
  if (key.startsWith('--')) element.style.setProperty(key, typeof value === 'number' ? `${value}px` : String(value));
  else element.style[key] = typeof value === 'number' && key !== 'opacity' ? `${value}px` : String(value);
}

export function readStyle(element, key) {
  if (key.startsWith('--')) {
    const value = element.style.getPropertyValue(key).trim();
    return value || '0px';
  }
  if (key === 'opacity') {
    const value = element.style.opacity;
    if (value === '' || value == null) return 1;
    const number = Number.parseFloat(value);
    return Number.isNaN(number) ? 1 : number;
  }
  return element.style[key] || 0;
}

export function coerceStyleValue(from, to) {
  if (typeof to === 'number' && typeof from === 'string') {
    const number = Number.parseFloat(from);
    if (!Number.isNaN(number)) return number;
  }
  return from;
}

