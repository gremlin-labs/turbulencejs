// src/core/easing.js
// Comprehensive easing function collection

// Basic easing functions
export const linear = t => t;

export const easeIn = t => t * t;
export const easeOut = t => t * (2 - t);
export const easeInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// Quadratic
export const quadIn = t => t * t;
export const quadOut = t => t * (2 - t);
export const quadInOut = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// Cubic
export const cubicIn = t => t * t * t;
export const cubicOut = t => --t * t * t + 1;
export const cubicInOut = t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// Quartic
export const quartIn = t => t * t * t * t;
export const quartOut = t => 1 - --t * t * t * t;
export const quartInOut = t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

// Quintic
export const quintIn = t => t * t * t * t * t;
export const quintOut = t => 1 + --t * t * t * t * t;
export const quintInOut = t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;

// Sinusoidal
export const sineIn = t => 1 - Math.cos(t * Math.PI / 2);
export const sineOut = t => Math.sin(t * Math.PI / 2);
export const sineInOut = t => -(Math.cos(Math.PI * t) - 1) / 2;

// Exponential
export const expoIn = t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
export const expoOut = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const expoInOut = t => {
  if (t === 0 || t === 1) return t;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Circular
export const circIn = t => 1 - Math.sqrt(1 - t * t);
export const circOut = t => Math.sqrt(1 - --t * t);
export const circInOut = t => t < 0.5
  ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
  : (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2;

// Elastic
export const elasticIn = (t, amplitude = 1, period = 0.3) => {
  if (t === 0 || t === 1) return t;
  const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
  return -(amplitude * Math.pow(2, 10 * (t - 1)) * 
          Math.sin((t - s) * (2 * Math.PI) / period));
};

export const elasticOut = (t, amplitude = 1, period = 0.3) => {
  if (t === 0 || t === 1) return t;
  const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
  return amplitude * Math.pow(2, -10 * t) * 
         Math.sin((t - s) * (2 * Math.PI) / period) + 1;
};

export const elasticInOut = (t, amplitude = 1, period = 0.3) => {
  if (t === 0 || t === 1) return t;
  return t < 0.5
    ? -0.5 * amplitude * Math.pow(2, 20 * t - 10) * 
           Math.sin((20 * t - 11.125) * (2 * Math.PI) / period)
    : amplitude * Math.pow(2, -20 * t + 10) * 
           Math.sin((20 * t - 11.125) * (2 * Math.PI) / period) * 0.5 + 1;
};

// Back
export const backIn = (t, overshoot = 1.70158) => t * t * ((overshoot + 1) * t - overshoot);
export const backOut = (t, overshoot = 1.70158) => --t * t * ((overshoot + 1) * t + overshoot) + 1;
export const backInOut = (t, overshoot = 1.70158) => {
  const s = overshoot * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2
    : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2;
};

// Bounce
export const bounceOut = t => {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75;
    return 7.5625 * t * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75;
    return 7.5625 * t * t + 0.9375;
  } else {
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }
};

export const bounceIn = t => 1 - bounceOut(1 - t);
export const bounceInOut = t => t < 0.5
  ? bounceIn(t * 2) * 0.5
  : bounceOut(t * 2 - 1) * 0.5 + 0.5;

const easingMap = {
    linear,
    easein: easeIn,
    easeout: easeOut,
    easeinout: easeInOut,
    quadin: quadIn,
    quadout: quadOut,
    quadinout: quadInOut,
    cubicin: cubicIn,
    cubicout: cubicOut,
    cubicinout: cubicInOut,
    quartin: quartIn,
    quartout: quartOut,
    quartinout: quartInOut,
    quintin: quintIn,
    quintout: quintOut,
    quintinout: quintInOut,
    sinein: sineIn,
    sineout: sineOut,
    sineinout: sineInOut,
    expoin: expoIn,
    expoout: expoOut,
    expoinout: expoInOut,
    circin: circIn,
    circout: circOut,
    circinout: circInOut,
    elasticin: elasticIn,
    elasticout: elasticOut,
    elasticinout: elasticInOut,
    backin: backIn,
    backout: backOut,
    backinout: backInOut,
    bouncein: bounceIn,
    bounceout: bounceOut,
    bounceinout: bounceInOut
};

const warnedUnknownEasings = new Set();

function normalizeEasingName(name) {
  const normalized = name.replace(/[\s_-]/g, '').toLowerCase();
  if (normalized.startsWith('ease') && normalized !== 'easein' && normalized !== 'easeout' && normalized !== 'easeinout') {
    const match = normalized.match(/^ease(inout|in|out)(.+)$/);
    if (match) return `${match[2]}${match[1]}`;
  }
  return normalized;
}

// Resolve canonical names, legacy CSS-style aliases, parameterized aliases, or functions.
export function createEasing(type = 'linear', ...explicitParams) {
  if (typeof type === 'function') return type;

  const source = String(type).trim();
  const call = source.match(/^([A-Za-z][\w-]*)(?:\(([^)]*)\))?$/);
  const name = call ? call[1] : source;
  const inlineParams = call?.[2]
    ? call[2].split(',').map(value => Number(value.trim())).filter(Number.isFinite)
    : [];
  const params = explicitParams.length ? explicitParams : inlineParams;
  const easing = easingMap[normalizeEasingName(name)];

  if (!easing) {
    if (!warnedUnknownEasings.has(source)) {
      warnedUnknownEasings.add(source);
      console.warn(`Unknown easing "${source}"; falling back to linear.`);
    }
    return linear;
  }
  return params.length ? t => easing(t, ...params) : easing;
}

// Default export with all easing functions
export default {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  quadIn,
  quadOut,
  quadInOut,
  cubicIn,
  cubicOut,
  cubicInOut,
  quartIn,
  quartOut,
  quartInOut,
  quintIn,
  quintOut,
  quintInOut,
  sineIn,
  sineOut,
  sineInOut,
  expoIn,
  expoOut,
  expoInOut,
  circIn,
  circOut,
  circInOut,
  elasticIn,
  elasticOut,
  elasticInOut,
  backIn,
  backOut,
  backInOut,
  bounceIn,
  bounceOut,
  bounceInOut,
  createEasing
};
