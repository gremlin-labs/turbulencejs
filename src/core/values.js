import { parseColor, rgbaToString } from '../utils/color';
import {
  defaultTransform,
  getCurrentTransform,
  setTransformValue,
  transformToString
} from '../utils/transform';

const COLOR_PROPERTIES = new Set(['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke']);
const UNITLESS_PROPERTIES = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flexGrow', 'flexShrink', 'order']);
const TRANSFORM_ALIASES = { x: 'translateX', y: 'translateY', z: 'translateZ' };

function currentStyleValue(element, property) {
  const computed = typeof getComputedStyle === 'function' ? getComputedStyle(element) : element.style;
  return computed[property] || element.style[property] || '';
}

function normalizeTransformKey(property) {
  return TRANSFORM_ALIASES[property] || property;
}

export function parseProperties(element, properties) {
  const initialTransform = getCurrentTransform(element);
  const parsed = Object.entries(properties).filter(([, target]) => target !== undefined).map(([inputProperty, target]) => {
    const property = normalizeTransformKey(inputProperty);
    const isTransform = Object.hasOwn(defaultTransform, property);
    const isColor = COLOR_PROPERTIES.has(property);
    let keyframes = Array.isArray(target) ? [...target] : null;
    let from = isTransform ? initialTransform[property] : currentStyleValue(element, property);
    let to = target;

    if (keyframes) {
      from = keyframes[0];
      to = keyframes[keyframes.length - 1];
    } else {
      keyframes = [from, to];
    }

    if (isColor) {
      keyframes = keyframes.map(parseColor);
      [from] = keyframes;
      to = keyframes[keyframes.length - 1];
    } else if (isTransform) {
      keyframes = keyframes.map(value => Number.isFinite(Number(value)) ? Number(value) : initialTransform[property]);
      [from] = keyframes;
      to = keyframes[keyframes.length - 1];
    }

    return { property, from, to, keyframes, isColor, isTransform };
  });

  return { initialTransform, properties: parsed };
}

function interpolateUnits(from, to, progress) {
  const fromMatch = String(from).match(/^(-?\d*\.?\d+)(.*)$/);
  const toMatch = String(to).match(/^(-?\d*\.?\d+)(.*)$/);
  if (!fromMatch || !toMatch || fromMatch[2] !== toMatch[2]) return progress < 0.5 ? from : to;
  const value = Number(fromMatch[1]) + (Number(toMatch[1]) - Number(fromMatch[1])) * progress;
  return `${value}${fromMatch[2]}`;
}

function interpolateValue(from, to, progress, isColor) {
  if (isColor) {
    return rgbaToString({
      r: Math.round(from.r + (to.r - from.r) * progress),
      g: Math.round(from.g + (to.g - from.g) * progress),
      b: Math.round(from.b + (to.b - from.b) * progress),
      a: from.a + (to.a - from.a) * progress
    });
  }
  if (typeof from === 'number' && typeof to === 'number') return from + (to - from) * progress;
  return interpolateUnits(from, to, progress);
}

function valueAt(prop, progress) {
  const segments = prop.keyframes.length - 1;
  if (segments <= 1) return interpolateValue(prop.from, prop.to, progress, prop.isColor);
  if (progress >= 1) return prop.keyframes[prop.keyframes.length - 1];
  const position = Math.max(0, progress) * segments;
  const index = Math.min(Math.floor(position), segments - 1);
  return interpolateValue(prop.keyframes[index], prop.keyframes[index + 1], position - index, prop.isColor);
}

export function applyProperties(element, definition, progress) {
  const transform = { ...definition.initialTransform };
  const styles = {};

  for (const property of definition.properties) {
    const value = valueAt(property, progress);
    if (property.isTransform) {
      setTransformValue(transform, property.property, value);
    } else if (typeof value === 'number' && !UNITLESS_PROPERTIES.has(property.property)) {
      styles[property.property] = `${value}px`;
    } else {
      styles[property.property] = String(value);
    }
  }

  if (definition.properties.some(property => property.isTransform)) {
    element.style.transform = transformToString(transform);
  }
  Object.assign(element.style, styles);
}

export default { applyProperties, parseProperties };
