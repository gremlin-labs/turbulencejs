function isElement(value) {
  return Boolean(value && typeof value === 'object' && value.style && typeof value.style === 'object');
}

function asRecord(value) {
  if (isElement(value)) return { target: value, slots: {} };
  if (value && isElement(value.target)) return { target: value.target, slots: value.slots || {} };
  throw new TypeError('TurbScript targets must be elements or { target, slots } records.');
}

function resolveSource(source, options) {
  const value = typeof source === 'function' ? source(options) : source;
  if (typeof value === 'string') {
    const root = options.root || globalThis.document;
    if (!root?.querySelectorAll) throw new TypeError('A query-capable root is required for selector targets.');
    return Array.from(root.querySelectorAll(value));
  }
  if (isElement(value) || (value && isElement(value.target))) return [value];
  if (value == null) return [];
  if (typeof value[Symbol.iterator] === 'function') return Array.from(value);
  throw new TypeError('TurbScript targets must be an element, iterable, selector, or lazy resolver.');
}

export function normalizeTargets(source, options = {}) {
  return resolveSource(source, options).map(asRecord);
}

export function resolveSlot(record, name) {
  const slot = record.slots?.[name];
  if (typeof slot === 'function') return slot(record.target);
  if (typeof slot === 'string') return record.target.querySelector?.(slot) || null;
  return slot || null;
}
