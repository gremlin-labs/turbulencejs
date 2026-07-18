// Value interpolation. `interpolate(a, b)` returns t → value for numbers,
// colors, unit strings ("120px", "50%"), rects, arrays, and plain objects.

export const lerp = (a, b, t) => a + (b - a) * t;

// ---- Color ----------------------------------------------------------------

const HEX_RE = /^#([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const HSL_RE = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i;

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

// Returns [r, g, b, a] (0-255, alpha 0-1) or null if not a color.
export function parseColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().toLowerCase();
  if (s === 'transparent') return [0, 0, 0, 0];
  let m = HEX_RE.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
      return [r, g, b, a];
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [r, g, b, a];
    }
    return null;
  }
  m = RGB_RE.exec(s);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  m = HSL_RE.exec(s);
  if (m) {
    const [r, g, b] = hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
    return [r, g, b, m[4] === undefined ? 1 : +m[4]];
  }
  return null;
}

export function formatColor([r, g, b, a]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v)));
  if (a >= 1) return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
  return `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${Math.max(0, Math.min(1, +a.toFixed(4)))})`;
}

// ---- Unit strings ----------------------------------------------------------

const UNIT_RE = /^(-?[\d.]+)([a-z%]*)$/i;

// ---- Rects -----------------------------------------------------------------

export const isRect = (v) =>
  v != null &&
  typeof v === 'object' &&
  typeof v.x === 'number' &&
  typeof v.y === 'number' &&
  typeof v.width === 'number' &&
  typeof v.height === 'number';

// Seam-safe rounding: right/bottom edges are rounded, then width/height derived,
// so adjacent rects sharing an edge stay flush while animating.
export function roundRect(r) {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  return {
    x,
    y,
    width: Math.round(r.x + r.width) - x,
    height: Math.round(r.y + r.height) - y,
  };
}

export const lerpRect = (a, b, t) => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  width: lerp(a.width, b.width, t),
  height: lerp(a.height, b.height, t),
});

// ---- Dispatch ---------------------------------------------------------------

export function interpolate(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return (t) => lerp(a, b, t);
  }
  if (typeof a === 'string' && typeof b === 'string') {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (ca && cb) {
      return (t) => formatColor([
        lerp(ca[0], cb[0], t),
        lerp(ca[1], cb[1], t),
        lerp(ca[2], cb[2], t),
        lerp(ca[3], cb[3], t),
      ]);
    }
    const ua = UNIT_RE.exec(a.trim());
    const ub = UNIT_RE.exec(b.trim());
    if (ua && ub && (ua[2] === ub[2] || +ua[1] === 0 || +ub[1] === 0)) {
      const unit = ub[2] || ua[2];
      const na = +ua[1];
      const nb = +ub[1];
      return (t) => `${+lerp(na, nb, t).toFixed(3)}${unit}`;
    }
    return (t) => (t < 1 ? a : b); // step
  }
  if (isRect(a) && isRect(b)) {
    return (t) => lerpRect(a, b, t);
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    const fns = a.map((v, i) => interpolate(v, b[i]));
    return (t) => fns.map((fn) => fn(t));
  }
  if (a != null && b != null && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(b);
    const fns = {};
    for (const k of keys) {
      fns[k] = k in a ? interpolate(a[k], b[k]) : () => b[k];
    }
    return (t) => {
      const out = {};
      for (const k of keys) out[k] = fns[k](t);
      return out;
    };
  }
  return (t) => (t < 1 ? a : b); // step fallback
}

