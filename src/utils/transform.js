// Transform parsing and composition utilities.

export const defaultTransform = Object.freeze({
  translateX: 0,
  translateY: 0,
  translateZ: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  skewX: 0,
  skewY: 0
});

const NUMBER = '(-?\\d*\\.?\\d+(?:e[-+]?\\d+)?)';

function matchValue(source, name, unit = '') {
  const match = source.match(new RegExp(`${name}\\(\\s*${NUMBER}${unit}\\s*\\)`, 'i'));
  return match ? Number(match[1]) : null;
}

function parseMatrix(source, result) {
  const matrix3d = source.match(/matrix3d\(([^)]+)\)/i);
  if (matrix3d) {
    const values = matrix3d[1].split(',').map(Number);
    if (values.length === 16 && values.every(Number.isFinite)) {
      result.translateX = values[12];
      result.translateY = values[13];
      result.translateZ = values[14];
      result.scaleX = Math.hypot(values[0], values[1], values[2]);
      result.scaleY = Math.hypot(values[4], values[5], values[6]);
      result.scaleZ = Math.hypot(values[8], values[9], values[10]);
      result.scale = result.scaleX === result.scaleY && result.scaleY === result.scaleZ
        ? result.scaleX
        : 1;
      result.rotate = Math.atan2(values[1], values[0]) * (180 / Math.PI);
    }
    return;
  }

  const matrix = source.match(/matrix\(([^)]+)\)/i);
  if (!matrix) return;
  const values = matrix[1].split(',').map(Number);
  if (values.length !== 6 || !values.every(Number.isFinite)) return;
  const [a, b, c, d, tx, ty] = values;
  result.translateX = tx;
  result.translateY = ty;
  result.scaleX = Math.hypot(a, b);
  result.scaleY = result.scaleX === 0 ? Math.hypot(c, d) : Math.abs((a * d - b * c) / result.scaleX);
  result.scaleZ = 1;
  result.scale = result.scaleX === result.scaleY ? result.scaleX : 1;
  result.rotate = Math.atan2(b, a) * (180 / Math.PI);
}

export function parseTransform(transform) {
  const result = { ...defaultTransform };
  if (!transform || transform === 'none') return result;

  parseMatrix(transform, result);

  const translate3d = transform.match(new RegExp(`translate3d\\(\\s*${NUMBER}px\\s*,\\s*${NUMBER}px\\s*,\\s*${NUMBER}px\\s*\\)`, 'i'));
  if (translate3d) {
    [result.translateX, result.translateY, result.translateZ] = translate3d.slice(1, 4).map(Number);
  }

  const scale3d = transform.match(new RegExp(`scale3d\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\)`, 'i'));
  if (scale3d) {
    [result.scaleX, result.scaleY, result.scaleZ] = scale3d.slice(1, 4).map(Number);
    result.scale = result.scaleX === result.scaleY && result.scaleY === result.scaleZ ? result.scaleX : 1;
  }

  const translate = transform.match(new RegExp(`translate\\(\\s*${NUMBER}px(?:\\s*,\\s*${NUMBER}px)?\\s*\\)`, 'i'));
  if (translate) {
    result.translateX = Number(translate[1]);
    result.translateY = translate[2] === undefined ? 0 : Number(translate[2]);
  }

  for (const property of ['translateX', 'translateY', 'translateZ']) {
    const value = matchValue(transform, property, 'px');
    if (value !== null) result[property] = value;
  }

  for (const property of ['rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY']) {
    const value = matchValue(transform, property, 'deg');
    if (value !== null) result[property] = value;
  }

  const uniformScale = matchValue(transform, 'scale');
  if (uniformScale !== null) {
    result.scale = uniformScale;
    result.scaleX = uniformScale;
    result.scaleY = uniformScale;
    result.scaleZ = uniformScale;
  }
  for (const property of ['scaleX', 'scaleY', 'scaleZ']) {
    const value = matchValue(transform, property);
    if (value !== null) result[property] = value;
  }

  return result;
}

export function setTransformValue(transform, property, value) {
  const next = transform;
  if (property === 'scale') {
    next.scale = value;
    next.scaleX = value;
    next.scaleY = value;
    next.scaleZ = value;
  } else {
    next[property] = value;
    if (property.startsWith('scale')) next.scale = 1;
  }
  return next;
}

export function transformToString(transform) {
  const parts = [];
  if (transform.translateX || transform.translateY || transform.translateZ) {
    parts.push(`translate3d(${transform.translateX}px, ${transform.translateY}px, ${transform.translateZ}px)`);
  }
  for (const property of ['rotate', 'rotateX', 'rotateY', 'rotateZ']) {
    if (transform[property]) parts.push(`${property}(${transform[property]}deg)`);
  }
  if (transform.scaleX !== 1 || transform.scaleY !== 1 || transform.scaleZ !== 1) {
    if (transform.scaleX === transform.scaleY && transform.scaleY === transform.scaleZ) {
      parts.push(`scale(${transform.scaleX})`);
    } else {
      parts.push(`scale3d(${transform.scaleX}, ${transform.scaleY}, ${transform.scaleZ})`);
    }
  }
  for (const property of ['skewX', 'skewY']) {
    if (transform[property]) parts.push(`${property}(${transform[property]}deg)`);
  }
  return parts.length ? parts.join(' ') : 'none';
}

export function interpolateTransform(from, to, progress) {
  return Object.keys(defaultTransform).reduce((result, property) => {
    const fromValue = from[property] ?? defaultTransform[property];
    const toValue = to[property] ?? defaultTransform[property];
    result[property] = fromValue + (toValue - fromValue) * progress;
    return result;
  }, {});
}

export function getCurrentTransform(element) {
  if (!element || typeof element !== 'object' || !element.style) {
    console.warn('getCurrentTransform called with an invalid element.');
    return { ...defaultTransform };
  }
  const computed = typeof getComputedStyle === 'function' ? getComputedStyle(element) : element.style;
  return parseTransform(computed.transform || computed.webkitTransform || element.style.transform);
}

export default {
  defaultTransform,
  getCurrentTransform,
  interpolateTransform,
  parseTransform,
  setTransformValue,
  transformToString
};
