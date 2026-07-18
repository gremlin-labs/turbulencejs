import { createEasing } from './easing';
import { applyProperties } from './values';

let unitId = 0;

function finiteNonNegative(value, fallback, label) {
  const resolved = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
  return resolved;
}

function normalizeConfig(config = {}) {
  const repeat = config.repeat === -1 ? -1 : Math.floor(finiteNonNegative(config.repeat, 0, 'Playback unit repeat'));
  return Object.freeze({
    ...config,
    duration: finiteNonNegative(config.duration, 0, 'Playback unit duration'),
    delay: finiteNonNegative(config.delay, 0, 'Playback unit delay'),
    repeat,
    yoyo: config.yoyo === true
  });
}

export function validatePlaybackUnit(value) {
  if (!value || typeof value !== 'object') throw new TypeError('Playback unit must be an object.');
  if (typeof value.render !== 'function') throw new TypeError('Playback unit render must be a function.');
  const config = normalizeConfig(value.config);
  const capabilities = Object.freeze({
    reversible: value.capabilities?.reversible !== false,
    seekable: value.capabilities?.seekable !== false,
    pausable: value.capabilities?.pausable !== false,
    finishable: value.capabilities?.finishable !== false
  });
  return Object.freeze({
    id: value.id ?? `unit-${++unitId}`,
    type: value.type || 'custom',
    element: value.element,
    config,
    easing: typeof value.easing === 'function' ? value.easing : createEasing(value.easing || config.easing || 'linear'),
    render: value.render,
    start: typeof value.start === 'function' ? value.start : null,
    complete: typeof value.complete === 'function' ? value.complete : null,
    cancel: typeof value.cancel === 'function' ? value.cancel : null,
    diagnostics: Object.freeze({ ...(value.diagnostics || {}) }),
    resources: Object.freeze({ ...(value.resources || {}) }),
    ownedProperties: Object.freeze([...(value.ownedProperties || [])]),
    capabilities
  });
}

export function propertyPlaybackUnit(definition) {
  if (!definition?.element || !definition.definition || !definition.config) {
    throw new TypeError('Property playback unit requires a compiled animation definition.');
  }
  return validatePlaybackUnit({
    id: `property-${definition.id}`,
    type: 'property',
    element: definition.element,
    config: definition.config,
    easing: definition.easing,
    render(progress) {
      applyProperties(definition.element, definition.definition, progress);
    },
    start() { definition.config.onStart?.(definition.element); },
    complete() { definition.config.onComplete?.(definition.element); },
    cancel() { definition.config.onCancel?.(definition.element); },
    diagnostics: { propertyCount: Object.keys(definition.definition).length }
  });
}

export function customPlaybackUnit(implementation, options = {}, element, setupContext = {}) {
  const resolved = typeof implementation === 'function' ? { render: implementation } : implementation;
  if (!resolved || typeof resolved !== 'object') {
    throw new TypeError('turb.driver factory must return a render function or playback unit object.');
  }
  const frameContext = frame => Object.freeze({ ...setupContext, ...frame });
  return validatePlaybackUnit({
    ...resolved,
    type: resolved.type || 'driver',
    element,
    config: options,
    easing: resolved.easing || options.easing,
    render(progress, frame) { return resolved.render(progress, frameContext(frame)); },
    start: resolved.start ? frame => resolved.start(frameContext(frame)) : null,
    complete: resolved.finish || resolved.complete
      ? frame => (resolved.finish || resolved.complete)(frameContext(frame))
      : null,
    cancel: resolved.cancel ? frame => resolved.cancel(frameContext(frame)) : null,
    ownedProperties: resolved.ownedProperties,
    capabilities: {
      reversible: options.reversible !== false && resolved.capabilities?.reversible !== false,
      seekable: options.seekable !== false && resolved.capabilities?.seekable !== false,
      pausable: options.pausable !== false && resolved.capabilities?.pausable !== false,
      finishable: options.finishable !== false && resolved.capabilities?.finishable !== false
    }
  });
}

export function playbackUnitDuration(unit) {
  const iterations = unit.config.repeat === -1 ? 1 : unit.config.repeat + 1;
  return unit.config.delay + unit.config.duration * iterations;
}
