import { motionOptions } from '../core/motion';
import { customPlaybackUnit } from '../core/units';
import { createRandom, shuffled } from './random';
import { isTurb } from './grammar';
import { resolveSlot } from './targets';

const defaultDuration = 300;
const transformProperties = new Set([
  'x', 'y', 'z', 'translateX', 'translateY', 'translateZ',
  'rotate', 'rotateX', 'rotateY', 'rotateZ',
  'scale', 'scaleX', 'scaleY', 'scaleZ', 'skewX', 'skewY'
]);

function optionsFor(options = {}) {
  if (!options.role) return { ...options };
  const { role, ...rest } = options;
  return motionOptions(role, rest);
}

function trackDuration(options) {
  const duration = Math.max(0, Number(options.duration ?? defaultDuration));
  const delay = Math.max(0, Number(options.delay ?? 0));
  const repeat = options.repeat === -1 ? 0 : Math.max(0, Math.floor(Number(options.repeat ?? 0)));
  return delay + duration * (repeat + 1);
}

function contextFor(record, index, records, environment) {
  return {
    target: record.target,
    slots: record.slots,
    index,
    count: records.length,
    context: environment.context,
    random: environment.random,
    reducedMotion: environment.reducedMotion === true
  };
}

function result(entries = [], duration = 0, cleanups = [], capabilities = {}, marks = []) {
  return {
    entries,
    duration,
    cleanups,
    marks,
    capabilities: {
      reversible: capabilities.reversible !== false,
      seekable: capabilities.seekable !== false,
      pausable: capabilities.pausable !== false,
      finishable: capabilities.finishable !== false
    }
  };
}

function merge(results, duration) {
  return result(
    results.flatMap(item => item.entries),
    duration,
    results.flatMap(item => item.cleanups),
    {
      reversible: results.every(item => item.capabilities.reversible),
      seekable: results.every(item => item.capabilities.seekable),
      pausable: results.every(item => item.capabilities.pausable),
      finishable: results.every(item => item.capabilities.finishable)
    },
    results.flatMap(item => item.marks)
  );
}

function once(callback) {
  let called = false;
  return () => {
    if (called) return;
    called = true;
    callback();
  };
}

function createLifecycleScope() {
  const abortController = new AbortController();
  const owned = [];
  const resources = {};
  let active = true;
  function cleanup(callback) {
    if (typeof callback !== 'function') throw new TypeError('Driver lifecycle cleanup requires a function.');
    if (!active) { callback(); return callback; }
    owned.push(once(callback));
    return callback;
  }
  const scope = Object.freeze({
    signal: abortController.signal,
    cleanup,
    listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      cleanup(() => target.removeEventListener(type, listener, options));
      return listener;
    },
    timeout(callback, delay = 0) {
      const id = setTimeout(callback, delay);
      cleanup(() => clearTimeout(id));
      return id;
    },
    interval(callback, delay = 0) {
      const id = setInterval(callback, delay);
      cleanup(() => clearInterval(id));
      return id;
    },
    resource(type, count = 1) {
      if (!type || typeof type !== 'string') throw new TypeError('Driver resource type must be a string.');
      const amount = Number(count);
      if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Driver resource count must be non-negative.');
      resources[type] = (resources[type] || 0) + amount;
    }
  });
  return {
    scope,
    resources,
    dispose: once(() => {
      active = false;
      abortController.abort();
      for (let index = owned.length - 1; index >= 0; index -= 1) owned[index]();
    })
  };
}

function resolveFactory(value, context, label) {
  const resolved = typeof value === 'function' ? value(context.target, context.index, context) : value;
  if (!isTurb(resolved)) throw new TypeError(`${label} must resolve to a Turb value.`);
  return resolved;
}

function compile(node, records, baseOffset, environment) {
  switch (node.type) {
    case 'track': {
      const options = optionsFor(node.options);
      const duration = trackDuration(options);
      return result(records.map(record => ({
        target: record.target,
        properties: node.properties,
        options,
        offset: baseOffset
      })), records.length === 0 ? 0 : duration);
    }
    case 'driver': {
      const entries = [];
      const cleanups = [];
      try {
        records.forEach((record, index) => {
          const lifecycle = createLifecycleScope();
          cleanups.push(lifecycle.dispose);
          environment.registeredCleanups?.push(lifecycle.dispose);
          const context = Object.freeze({
            ...contextFor(record, index, records, environment),
            lifecycle: lifecycle.scope
          });
          const implementation = node.factory(context);
          if (implementation?.cleanup) lifecycle.scope.cleanup(implementation.cleanup);
          const unit = customPlaybackUnit(implementation, node.options, record.target, context);
          entries.push({ unit: { ...unit, resources: { ...unit.resources, ...lifecycle.resources } }, offset: baseOffset });
        });
      } catch (error) {
        for (let index = cleanups.length - 1; index >= 0; index -= 1) cleanups[index]();
        throw error;
      }
      return result(entries, records.length === 0 ? 0 : trackDuration(node.options), cleanups, {
        reversible: entries.every(entry => entry.unit.capabilities.reversible),
        seekable: entries.every(entry => entry.unit.capabilities.seekable),
        pausable: entries.every(entry => entry.unit.capabilities.pausable),
        finishable: entries.every(entry => entry.unit.capabilities.finishable)
      });
    }
    case 'mark': return result([], 0, [], {}, [{ name: node.name, metadata: node.metadata, offset: baseOffset }]);
    case 'wait': return result([], node.duration);
    case 'at': {
      const child = compile(node.child, records, baseOffset + node.offset, environment);
      return { ...child, duration: node.offset + child.duration };
    }
    case 'sequence': {
      let cursor = 0;
      const children = node.children.map(child => {
        const compiled = compile(child, records, baseOffset + cursor, environment);
        cursor += compiled.duration;
        return compiled;
      });
      return merge(children, cursor);
    }
    case 'parallel': {
      const children = node.children.map(child => compile(child, records, baseOffset, environment));
      return merge(children, Math.max(0, ...children.map(child => child.duration)));
    }
    case 'each': {
      const children = records.map((record, index) => {
        const context = contextFor(record, index, records, environment);
        return compile(resolveFactory(node.factory, context, 'turb.each factory'), [record], baseOffset, environment);
      });
      return merge(children, Math.max(0, ...children.map(child => child.duration)));
    }
    case 'stagger': {
      const children = records.map((record, index) => {
        const context = contextFor(record, index, records, environment);
        const child = resolveFactory(node.child, context, 'turb.stagger child');
        return compile(child, [record], baseOffset + index * node.step, environment);
      });
      return merge(children, Math.max(0, ...children.map((child, index) => index * node.step + child.duration)));
    }
    case 'cycle': {
      const children = records.map((record, index) => compile(
        node.children[index % node.children.length], [record], baseOffset, environment
      ));
      return merge(children, Math.max(0, ...children.map(child => child.duration)));
    }
    case 'choose': {
      const localRandom = node.options.seed === undefined ? environment.random : createRandom(node.options.seed);
      const children = records.map(record => {
        const selected = Math.floor(localRandom() * node.children.length);
        return compile(node.children[selected], [record], baseOffset, { ...environment, random: localRandom });
      });
      return merge(children, Math.max(0, ...children.map(child => child.duration)));
    }
    case 'shuffle': return compile(node.child, shuffled(records, environment.random), baseOffset, environment);
    case 'slot': {
      const slotRecords = records.map(record => {
        const target = resolveSlot(record, node.name);
        if (!target?.style) throw new TypeError(`TurbScript slot "${node.name}" did not resolve to an element.`);
        return { target, slots: record.slots };
      });
      return compile(node.child, slotRecords, baseOffset, environment);
    }
    case 'effect': {
      const cleanups = [];
      records.forEach((record, index) => {
        const cleanup = node.setup(contextFor(record, index, records, environment));
        if (cleanup !== undefined && typeof cleanup !== 'function') {
          throw new TypeError('turb.effect setup must return a cleanup function or undefined.');
        }
        if (cleanup) {
          cleanups.push(cleanup);
          environment.registeredCleanups?.push(cleanup);
        }
      });
      const child = compile(node.child, records, baseOffset, environment);
      return {
        ...child,
        cleanups: [...cleanups, ...child.cleanups],
        capabilities: {
          reversible: node.options.reversible !== false && child.capabilities.reversible,
          seekable: node.options.seekable !== false && child.capabilities.seekable,
          pausable: node.options.pausable !== false && child.capabilities.pausable,
          finishable: node.options.finishable !== false && child.capabilities.finishable
        }
      };
    }
    default: throw new RangeError(`Unknown TurbScript node type "${node.type}".`);
  }
}

export function compileTurb(node, records, options = {}) {
  if (!isTurb(node)) throw new TypeError('script requires a Turb value.');
  const random = options.random || createRandom(options.seed);
  const registeredCleanups = [];
  let compiled;
  try {
    compiled = compile(node, records, 0, { ...options, random, registeredCleanups });
  } catch (error) {
    for (let index = registeredCleanups.length - 1; index >= 0; index -= 1) registeredCleanups[index]();
    throw error;
  }
  const owned = new Map();
  compiled.entries.forEach(entry => {
    const target = entry.unit?.element || entry.target;
    const propertyNames = entry.unit
      ? entry.unit.ownedProperties
      : Object.keys(entry.properties).map(property => transformProperties.has(property) ? 'transform' : property);
    if (propertyNames.length === 0) return;
    let properties = owned.get(target);
    if (!properties) { properties = new Set(); owned.set(target, properties); }
    propertyNames.forEach(property => properties.add(property));
  });
  return { ...compiled, owned };
}
