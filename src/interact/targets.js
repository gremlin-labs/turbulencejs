import { InteractionError, interactionErrorCodes } from './errors';

function isElement(value) { return Boolean(value?.nodeType === 1 && value.addEventListener); }

export function resolveInteractionTargets(source, options = {}) {
  const root = options.root || document;
  const value = typeof source === 'function' ? source(options) : source;
  let targets;
  if (typeof value === 'string') targets = [...root.querySelectorAll(value)];
  else if (isElement(value)) targets = [value];
  else if (value == null) targets = [];
  else if (typeof value[Symbol.iterator] === 'function') targets = [...value];
  else throw new InteractionError(interactionErrorCodes.INVALID_TARGET, 'Interaction targets must be an element, iterable, selector, or lazy source.');
  targets.forEach((target, index) => {
    if (!isElement(target)) throw new InteractionError(interactionErrorCodes.INVALID_TARGET, `Interaction target ${index} is not an element.`);
  });
  return targets;
}
