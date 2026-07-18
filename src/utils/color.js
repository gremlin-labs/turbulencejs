// src/utils/color.js
// Color parsing and interpolation utilities

// Regular expressions for color formats
const HEX_COLOR = /^#([A-Fa-f0-9]{3}){1,2}$/;
const RGB_COLOR = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
const RGBA_COLOR = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/;
const HSL_COLOR = /^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/;
const HSLA_COLOR = /^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d.]+)\s*\)$/;

// Parse color string to RGBA values
export function parseColor(color) {
  // Handle hex colors
  if (HEX_COLOR.test(color)) {
    return parseHex(color);
  }

  // Handle rgb/rgba colors
  if (RGB_COLOR.test(color) || RGBA_COLOR.test(color)) {
    return parseRgb(color);
  }

  // Handle hsl/hsla colors
  if (HSL_COLOR.test(color) || HSLA_COLOR.test(color)) {
    return parseHsl(color);
  }

  // Handle named colors
  if (typeof color === 'string') {
    const tempEl = document.createElement('div');
    tempEl.style.color = color;
    document.body.appendChild(tempEl);
    const computed = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    return parseRgb(computed);
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}

// Parse hex color to RGBA
function parseHex(hex) {
  // Remove # if present
  hex = hex.replace('#', '');

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

// Parse rgb/rgba color to RGBA
function parseRgb(rgb) {
  const matches = rgb.match(RGB_COLOR) || rgb.match(RGBA_COLOR);
  if (!matches) return { r: 0, g: 0, b: 0, a: 1 };

  return {
    r: parseInt(matches[1], 10),
    g: parseInt(matches[2], 10),
    b: parseInt(matches[3], 10),
    a: matches[4] === undefined ? 1 : parseFloat(matches[4])
  };
}

// Parse hsl/hsla color to RGBA
function parseHsl(hsl) {
  const matches = hsl.match(HSL_COLOR) || hsl.match(HSLA_COLOR);
  if (!matches) return { r: 0, g: 0, b: 0, a: 1 };

  const h = parseInt(matches[1], 10) / 360;
  const s = parseInt(matches[2], 10) / 100;
  const l = parseInt(matches[3], 10) / 100;
  const a = matches[4] === undefined ? 1 : parseFloat(matches[4]);

  // Convert HSL to RGB
  const rgb = hslToRgb(h, s, l);
  return { ...rgb, a };
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Interpolate between two colors
export function interpolateColor(color1, color2, progress) {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);
  const a = c1.a + (c2.a - c1.a) * progress;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Convert RGBA to string
export function rgbaToString({ r, g, b, a }) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export default {
  parseColor,
  interpolateColor,
  rgbaToString
}; 