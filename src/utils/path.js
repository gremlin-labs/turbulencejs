import { createEasing } from '../core/easing';
import { effectLifecycle } from '../core/effect';
import { getCurrentTransform, setTransformValue, transformToString } from './transform';

const COMMAND_ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, Z: 0 };
const UNSUPPORTED = new Set(['A', 'S', 'T']);

function tokenize(path) {
  const tokens = String(path).match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
  return tokens.map(token => /^[A-Za-z]$/.test(token) ? token : Number(token));
}

function pointOnSegment(segment, t) {
  const { start, end } = segment;
  if (segment.type === 'L') {
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  }
  if (segment.type === 'Q') {
    const mt = 1 - t;
    return {
      x: mt * mt * start.x + 2 * mt * t * segment.cp.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * segment.cp.y + t * t * end.y
    };
  }
  const mt = 1 - t;
  return {
    x: mt ** 3 * start.x + 3 * mt * mt * t * segment.cp1.x + 3 * mt * t * t * segment.cp2.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt * mt * t * segment.cp1.y + 3 * mt * t * t * segment.cp2.y + t ** 3 * end.y
  };
}

function segmentTangent(segment, t) {
  if (segment.type === 'L') return { x: segment.end.x - segment.start.x, y: segment.end.y - segment.start.y };
  if (segment.type === 'Q') {
    return {
      x: 2 * (1 - t) * (segment.cp.x - segment.start.x) + 2 * t * (segment.end.x - segment.cp.x),
      y: 2 * (1 - t) * (segment.cp.y - segment.start.y) + 2 * t * (segment.end.y - segment.cp.y)
    };
  }
  return {
    x: 3 * (1 - t) ** 2 * (segment.cp1.x - segment.start.x) + 6 * (1 - t) * t * (segment.cp2.x - segment.cp1.x) + 3 * t ** 2 * (segment.end.x - segment.cp2.x),
    y: 3 * (1 - t) ** 2 * (segment.cp1.y - segment.start.y) + 6 * (1 - t) * t * (segment.cp2.y - segment.cp1.y) + 3 * t ** 2 * (segment.end.y - segment.cp2.y)
  };
}

function measureSegment(segment, steps = 30) {
  const samples = [{ t: 0, length: 0 }];
  let previous = segment.start;
  let length = 0;
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const point = pointOnSegment(segment, t);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ t, length });
    previous = point;
  }
  return { length, samples };
}

export function compilePath(pathString) {
  const tokens = tokenize(pathString);
  if (!tokens.length) throw new TypeError('Path cannot be empty.');
  const segments = [];
  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  let subpathStart = { ...current };

  while (index < tokens.length) {
    if (typeof tokens[index] === 'string') command = tokens[index++];
    if (!command) throw new SyntaxError('Path data must begin with a command.');
    const upper = command.toUpperCase();
    if (UNSUPPORTED.has(upper)) throw new RangeError(`Path command ${upper} is not supported; use M, L, H, V, C, Q, or Z.`);
    const arity = COMMAND_ARITY[upper];
    if (arity === undefined) throw new SyntaxError(`Unknown path command ${command}.`);
    if (upper === 'Z') {
      if (current.x !== subpathStart.x || current.y !== subpathStart.y) segments.push({ type: 'L', start: { ...current }, end: { ...subpathStart } });
      current = { ...subpathStart };
      command = null;
      continue;
    }
    if (index + arity > tokens.length || tokens.slice(index, index + arity).some(token => typeof token !== 'number' || !Number.isFinite(token))) {
      throw new SyntaxError(`Path command ${command} has invalid parameters.`);
    }
    const values = tokens.slice(index, index + arity);
    index += arity;
    const relative = command === command.toLowerCase();
    const absolute = (x, y) => ({ x: relative ? current.x + x : x, y: relative ? current.y + y : y });

    if (upper === 'M') {
      current = absolute(values[0], values[1]);
      subpathStart = { ...current };
      command = relative ? 'l' : 'L';
      continue;
    }
    let segment;
    if (upper === 'H') segment = { type: 'L', start: { ...current }, end: { x: relative ? current.x + values[0] : values[0], y: current.y } };
    else if (upper === 'V') segment = { type: 'L', start: { ...current }, end: { x: current.x, y: relative ? current.y + values[0] : values[0] } };
    else if (upper === 'L') segment = { type: 'L', start: { ...current }, end: absolute(values[0], values[1]) };
    else if (upper === 'Q') segment = { type: 'Q', start: { ...current }, cp: absolute(values[0], values[1]), end: absolute(values[2], values[3]) };
    else segment = { type: 'C', start: { ...current }, cp1: absolute(values[0], values[1]), cp2: absolute(values[2], values[3]), end: absolute(values[4], values[5]) };
    Object.assign(segment, measureSegment(segment));
    segments.push(segment);
    current = { ...segment.end };
  }

  if (!segments.length) throw new TypeError('Path must contain at least one drawable segment.');
  let totalLength = 0;
  for (const segment of segments) {
    segment.startLength = totalLength;
    totalLength += segment.length;
    segment.endLength = totalLength;
  }
  return { segments, totalLength };
}

export function getPointAtPercent(compiled, percent) {
  const progress = Math.max(0, Math.min(1, Number(percent) || 0));
  const target = compiled.totalLength * progress;
  const segment = compiled.segments.find(candidate => target <= candidate.endLength) || compiled.segments[compiled.segments.length - 1];
  const localLength = Math.max(0, target - segment.startLength);
  let sampleIndex = segment.samples.findIndex(sample => sample.length >= localLength);
  if (sampleIndex < 1) sampleIndex = 1;
  const before = segment.samples[sampleIndex - 1];
  const after = segment.samples[sampleIndex];
  const interval = after.length - before.length;
  const ratio = interval === 0 ? 0 : (localLength - before.length) / interval;
  const t = before.t + (after.t - before.t) * ratio;
  const point = pointOnSegment(segment, t);
  const tangent = segmentTangent(segment, t);
  return { ...point, tangent, angle: Math.atan2(tangent.y, tangent.x) * (180 / Math.PI) };
}

export function parsePath(pathString) {
  return compilePath(pathString);
}

export function followPath(element, pathString, options = {}) {
  const config = {
    duration: 1000,
    easing: 'linear',
    rotate: false,
    rotateOffset: 0,
    offset: { x: 0, y: 0 },
    respectReducedMotion: true,
    ...options
  };
  const compiled = compilePath(pathString);
  const easing = createEasing(config.easing);
  const baseTransform = getCurrentTransform(element);
  let requestId = null;
  let startTime = null;
  let state = 'playing';
  const lifecycle = effectLifecycle(options);

  const render = progress => {
    const result = getPointAtPercent(compiled, easing(progress));
    const transform = { ...baseTransform };
    setTransformValue(transform, 'translateX', baseTransform.translateX + result.x + config.offset.x);
    setTransformValue(transform, 'translateY', baseTransform.translateY + result.y + config.offset.y);
    if (config.rotate) setTransformValue(transform, 'rotate', result.angle + config.rotateOffset);
    element.style.transform = transformToString(transform);
    if (typeof config.onUpdate === 'function') config.onUpdate(element, { x: result.x, y: result.y }, result.angle + config.rotateOffset);
  };

  const frame = timestamp => {
    if (state !== 'playing') return;
    if (startTime === null) startTime = timestamp;
    const progress = config.duration === 0 ? 1 : Math.min(1, (timestamp - startTime) / config.duration);
    render(progress);
    if (progress >= 1) {
      state = 'completed';
      requestId = null;
      lifecycle.onComplete(element);
    } else requestId = requestAnimationFrame(frame);
  };

  const controller = {
    stop() {
      if (state !== 'playing') return;
      state = 'cancelled';
      if (requestId !== null) cancelAnimationFrame(requestId);
      requestId = null;
      lifecycle.onCancel(element);
    },
    get state() { return state; }
  };

  const reduce = config.respectReducedMotion !== false && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (config.duration === 0 || reduce) {
    render(1);
    queueMicrotask(() => {
      if (state !== 'playing') return;
      state = 'completed';
      lifecycle.onComplete(element);
    });
  } else requestId = requestAnimationFrame(frame);
  return controller;
}

export function createPath(points, closed = false) {
  if (!Array.isArray(points) || points.length === 0) return '';
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 1; index < points.length; index += 1) commands.push(`L ${points[index].x} ${points[index].y}`);
  if (closed) commands.push('Z');
  return commands.join(' ');
}

export default { compilePath, createPath, followPath, getPointAtPercent, parsePath };
