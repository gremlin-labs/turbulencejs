// Easing curves. Every easing is a plain function t∈[0,1] → number.
// Resolve accepts a function, a named curve, or a CSS cubic-bezier() string.

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

const linear = (t) => t;

const quadIn = (t) => t * t;
const quadOut = (t) => t * (2 - t);
const quadInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

const cubicIn = (t) => t * t * t;
const cubicOut = (t) => --t * t * t + 1;
const cubicInOut = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

const expoOut = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const backOut = (t, s = 1.70158) => {
  const u = t - 1;
  return u * u * ((s + 1) * u + s) + 1;
};

const elasticOut = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
};

const bounceOut = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// Cubic bezier solver (CSS-compatible). Newton-Raphson with bisection fallback.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Bisection fallback
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      if (err > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
      if (hi - lo < 1e-6) break;
    }
    return t;
  };

  return (t) => {
    t = clamp01(t);
    if (t === 0 || t === 1) return t;
    return sampleY(solveX(t));
  };
}

// Named curves. The desktop presets come from the original Turbulence spec.
export const named = {
  linear,
  quadIn,
  quadOut,
  quadInOut,
  cubicIn,
  cubicOut,
  cubicInOut,
  expoOut,
  backOut: (t) => backOut(t),
  elasticOut,
  bounceOut,
  // Desktop presets (TURBULENCE-SPEC)
  smooth: cubicBezier(0.4, 0, 0.2, 1),
  snappy: cubicBezier(0.25, 0.46, 0.45, 0.94),
  sharp: cubicBezier(0.4, 0, 0.6, 1),
  gentle: cubicBezier(0.4, 0, 0.2, 1),
  bounce: bounceOut,
  elastic: elasticOut,
  back: (t) => backOut(t),
  // Platform curves
  macos: cubicBezier(0.28, 0, 0.21, 1),
  fluent: cubicBezier(0.25, 0.1, 0.25, 1),
};

const BEZIER_RE = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;

export function resolve(easing) {
  if (typeof easing === 'function') return easing;
  if (typeof easing === 'string') {
    if (named[easing]) return named[easing];
    const m = BEZIER_RE.exec(easing.trim());
    if (m) return cubicBezier(+m[1], +m[2], +m[3], +m[4]);
    throw new Error(`turbulence: unknown easing "${easing}"`);
  }
  if (easing == null) return named.smooth;
  throw new Error('turbulence: easing must be a function or a name');
}

