import { animate } from '../core/engine';
import { create as createTimeline } from '../core/timeline';
import { compileTurb } from './compiler';
import { createRandom } from './random';
import { normalizeTargets } from './targets';

let freshSeed = 0;

function readStyle(element, property) {
  return property.startsWith('--') ? element.style.getPropertyValue(property) : element.style[property];
}

function writeStyle(element, property, value) {
  if (property.startsWith('--')) {
    if (value) element.style.setProperty(property, value); else element.style.removeProperty(property);
  } else {
    element.style[property] = value;
  }
}

function takeSnapshots(owned) {
  const snapshots = new Map();
  owned.forEach((properties, element) => {
    snapshots.set(element, new Map([...properties].map(property => [property, readStyle(element, property)])));
  });
  return snapshots;
}

function restoreSnapshots(snapshots) {
  snapshots.forEach((properties, element) => properties.forEach((value, property) => writeStyle(element, property, value)));
}

function reducedMotionRequested(options) {
  if (typeof options.reducedMotion === 'boolean') return options.reducedMotion;
  return options.respectReducedMotion !== false
    && typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createPerformance(recipe, targetSource, initialOptions = {}) {
  let options = { seed: 'turbulencejs', respectReducedMotion: true, ...initialOptions };
  let timeline = null;
  let compiled = null;
  let records = [];
  let snapshots = new Map();
  let cleanups = [];
  let state = 'idle';
  let settled = false;
  let builtReducedMotion = null;
  const markHandlers = new Set();
  let markErrorCount = 0;

  function runCleanups() {
    const pending = cleanups;
    cleanups = [];
    for (let index = pending.length - 1; index >= 0; index -= 1) pending[index]();
  }

  function settle(kind) {
    if (settled) return;
    settled = true;
    state = kind === 'complete' ? 'completed' : 'cancelled';
    runCleanups();
    const callback = kind === 'complete' ? options.onComplete : options.onCancel;
    if (typeof callback === 'function') callback(controller);
  }

  function dispatchMark(event) {
    for (const handler of [...markHandlers]) {
      try {
        handler(event, controller);
      } catch (error) {
        markErrorCount += 1;
        if (typeof options.onError === 'function') options.onError(error, controller);
        else if (typeof console !== 'undefined') console.error('Turbulence mark handler failed.', error);
      }
    }
  }

  function build() {
    records = normalizeTargets(targetSource, options);
    const random = createRandom(options.seed);
    const reduce = reducedMotionRequested(options);
    compiled = compileTurb(recipe, records, { ...options, random, reducedMotion: reduce });
    builtReducedMotion = reduce;
    snapshots = takeSnapshots(compiled.owned);
    cleanups = [...compiled.cleanups];
    settled = false;
    timeline = createTimeline({
      respectReducedMotion: options.respectReducedMotion,
      reducedMotion: reduce,
      onComplete: () => settle('complete'),
      onMark: dispatchMark,
      onError: error => {
        settle('cancel');
        options.onError?.(error, controller);
      }
    });
    compiled.entries.forEach(entry => {
      if (entry.unit) timeline.addUnit(entry.unit, entry.offset);
      else {
        timeline.add(animate(entry.target, entry.properties, {
          ...entry.options,
          autoplay: false,
          respectReducedMotion: false
        }), entry.offset);
      }
    });
    compiled.marks.forEach(mark => timeline.addMark(mark, mark.offset));
    timeline.ensureDuration(compiled.duration);
  }

  function play() {
    if (state === 'paused') return resume();
    if (state === 'playing') return controller;
    if (timeline && state === 'idle' && builtReducedMotion !== reducedMotionRequested(options)) {
      runCleanups();
      restoreSnapshots(snapshots);
      timeline = null;
      compiled = null;
    }
    if (!timeline || state === 'completed' || state === 'cancelled') build();
    state = 'playing';
    if (typeof options.onStart === 'function') options.onStart(controller);
    timeline.play();
    return controller;
  }

  function pause() {
    if (state !== 'playing') return controller;
    requireCapability('pausable', 'pause');
    timeline.pause();
    state = 'paused';
    return controller;
  }

  function resume() {
    if (state !== 'paused') return controller;
    timeline.resume();
    state = 'playing';
    return controller;
  }

  function stop() {
    if (state !== 'playing' && state !== 'paused') return controller;
    timeline.cancel({ reset: false });
    settle('cancel');
    return controller;
  }

  function reset() {
    if (state === 'playing' || state === 'paused') stop();
    else runCleanups();
    restoreSnapshots(snapshots);
    timeline = null;
    compiled = null;
    builtReducedMotion = null;
    state = 'idle';
    settled = false;
    return controller;
  }

  function finish() {
    if (!timeline) build();
    requireCapability('finishable', 'finish');
    if (state === 'completed') return controller;
    state = 'playing';
    timeline.finish();
    return controller;
  }

  function replay() { reset(); return play(); }

  function reseed(seed) {
    options = { ...options, seed: seed ?? `turbulencejs-${Date.now()}-${++freshSeed}` };
    return replay();
  }

  function requireCapability(name, control = name) {
    if (compiled && compiled.capabilities[name] === false) {
      throw new Error(`This TurbScript performance does not support ${control}.`);
    }
  }

  function reverse() {
    if (!timeline) build();
    requireCapability('reversible', 'reverse');
    timeline.reverse();
    state = 'playing';
    return controller;
  }

  function seek(time, seekOptions) {
    if (!timeline) build();
    requireCapability('seekable', 'seek');
    timeline.seek(time, seekOptions);
    return controller;
  }

  function on(event, handler) {
    if (event !== 'mark') throw new RangeError(`Unsupported TurbScript event "${event}".`);
    if (typeof handler !== 'function') throw new TypeError('TurbScript event handler must be a function.');
    markHandlers.add(handler);
    return () => markHandlers.delete(handler);
  }

  const controller = {
    play, pause, resume, stop, reset, finish, replay, reseed, reverse, seek, on,
    get state() { return state; },
    get duration() { return compiled?.duration ?? 0; },
    get seed() { return options.seed; },
    get capabilities() {
      return Object.freeze({
        pause: compiled?.capabilities.pausable !== false,
        reverse: compiled?.capabilities.reversible !== false,
        seek: compiled?.capabilities.seekable !== false,
        stop: true, reset: true, finish: compiled?.capabilities.finishable !== false, replay: true
      });
    },
    get diagnostics() {
      const driverEntries = compiled?.entries.filter(entry => entry.unit) || [];
      return Object.freeze({
        targetCount: records.length,
        trackCount: compiled?.entries.filter(entry => !entry.unit).length ?? 0,
        driverCount: compiled?.entries.filter(entry => entry.unit).length ?? 0,
        unitCount: compiled?.entries.length ?? 0,
        markCount: compiled?.marks.length ?? 0,
        resourceCount: compiled?.entries.reduce((total, entry) => total + Object.values(entry.unit?.resources || {}).reduce((sum, value) => sum + Number(value || 0), 0), 0) ?? 0,
        markErrorCount,
        selectedRenderer: driverEntries.find(entry => entry.unit.diagnostics.renderer)?.unit.diagnostics.renderer || '',
        degradationCount: driverEntries.reduce((total, entry) => total + Number(entry.unit.diagnostics.degradationCount || 0), 0),
        fallbackCount: driverEntries.reduce((total, entry) => total + Number(entry.unit.diagnostics.fallbackCount || 0), 0),
        activeOwnedWork: state === 'playing' || state === 'paused' ? compiled?.entries.length ?? 0 : 0,
        duration: compiled?.duration ?? 0,
        seed: options.seed
      });
    }
  };

  build();
  if (options.autoplay !== false) play();
  return controller;
}
