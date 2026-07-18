const NODE = Symbol.for('turbulencejs.turb');

function freezeNode(type, fields = {}) {
  return Object.freeze({ [NODE]: true, type, ...fields });
}

export function isTurb(value) {
  return Boolean(value?.[NODE]);
}

function assertTurb(value, label = 'child') {
  if (!isTurb(value)) throw new TypeError(`TurbScript ${label} must be a Turb value.`);
  return value;
}

function childrenOf(values) {
  const children = values.flat();
  children.forEach((child, index) => assertTurb(child, `child ${index}`));
  return Object.freeze(children);
}

export function track(properties, options = {}) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new TypeError('turb.track requires a properties object.');
  }
  return freezeNode('track', {
    properties: Object.freeze({ ...properties }),
    options: Object.freeze({ ...options })
  });
}

export function driver(factory, options = {}) {
  if (typeof factory !== 'function') throw new TypeError('turb.driver requires a factory function.');
  if (options.duration === undefined) throw new TypeError('turb.driver requires an explicit duration.');
  const duration = Number(options.duration);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError('turb.driver duration must be a finite non-negative number.');
  }
  return freezeNode('driver', { factory, options: Object.freeze({ ...options, duration }) });
}

export function mark(name, metadata) {
  if (!name || typeof name !== 'string') throw new TypeError('turb.mark requires a non-empty name.');
  if (metadata !== undefined && (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))) {
    throw new TypeError('turb.mark metadata must be an object when supplied.');
  }
  return freezeNode('mark', { name, metadata: metadata === undefined ? undefined : Object.freeze({ ...metadata }) });
}

export function sequence(...children) { return freezeNode('sequence', { children: childrenOf(children) }); }
export function parallel(...children) { return freezeNode('parallel', { children: childrenOf(children) }); }
export function wait(duration) {
  const value = Number(duration);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('turb.wait duration must be a non-negative number.');
  return freezeNode('wait', { duration: value });
}
export function at(offset, child) {
  const value = Number(offset);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('turb.at offset must be a non-negative number.');
  return freezeNode('at', { offset: value, child: assertTurb(child) });
}
export function each(factory) {
  if (typeof factory !== 'function') throw new TypeError('turb.each requires a factory function.');
  return freezeNode('each', { factory });
}
export function stagger(step, child) {
  const value = Number(step);
  if (!Number.isFinite(value) || value < 0) throw new RangeError('turb.stagger step must be a non-negative number.');
  if (typeof child !== 'function') assertTurb(child);
  return freezeNode('stagger', { step: value, child });
}
export function cycle(...children) { return freezeNode('cycle', { children: childrenOf(children) }); }
export function choose(children, options = {}) {
  const choices = childrenOf(Array.isArray(children) ? children : [children]);
  if (choices.length === 0) throw new RangeError('turb.choose requires at least one choice.');
  return freezeNode('choose', { children: choices, options: Object.freeze({ ...options }) });
}
export function shuffle(child) { return freezeNode('shuffle', { child: assertTurb(child) }); }
export function slot(name, child) {
  if (!name || typeof name !== 'string') throw new TypeError('turb.slot requires a slot name.');
  return freezeNode('slot', { name, child: assertTurb(child) });
}
export function effect(setup, child, options = {}) {
  if (typeof setup !== 'function') throw new TypeError('turb.effect requires a setup function.');
  return freezeNode('effect', { setup, child: assertTurb(child), options: Object.freeze({ ...options }) });
}
export function define(name, factory) {
  if (!name || typeof name !== 'string' || typeof factory !== 'function') {
    throw new TypeError('turb.define requires a name and factory function.');
  }
  const recipe = (...args) => {
    const result = factory(...args);
    return assertTurb(result, `recipe "${name}" result`);
  };
  Object.defineProperty(recipe, 'recipeName', { value: name, enumerable: true });
  return Object.freeze(recipe);
}

export default {
  track, driver, mark, sequence, parallel, wait, at, each, stagger, cycle, choose, shuffle, slot, effect, define, isTurb
};
