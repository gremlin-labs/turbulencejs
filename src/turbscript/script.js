import { isTurb } from './grammar';
import { createPerformance } from './performance';

export function script(recipe) {
  if (!isTurb(recipe)) throw new TypeError('script requires a Turb value.');
  return Object.freeze({
    recipe,
    play(targets, options = {}) { return createPerformance(recipe, targets, options); }
  });
}

export default script;
