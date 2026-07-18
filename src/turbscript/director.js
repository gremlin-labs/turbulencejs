import { each, parallel, sequence, stagger } from './grammar';
import { script } from './script';

function clone(state, patch) {
  return createDirector({ ...state, ...patch });
}

function asTurb(value) {
  return typeof value === 'function' ? each(value) : value;
}

function createDirector(state) {
  const director = {
    using(value) {
      const recipe = state.staggerStep === null
        ? asTurb(value)
        : stagger(state.staggerStep, value);
      return clone(state, { recipe, staggerStep: null });
    },
    then(value) {
      const child = asTurb(value);
      return clone(state, { recipe: state.recipe ? sequence(state.recipe, child) : child });
    },
    together(value) {
      const child = asTurb(value);
      return clone(state, { recipe: state.recipe ? parallel(state.recipe, child) : child });
    },
    stagger(step) { return clone(state, { staggerStep: Number(step) }); },
    seed(seed) { return clone(state, { seed }); },
    compile() {
      if (!state.recipe) throw new Error('direct().using() must define a Turb before compile or play.');
      return state.recipe;
    },
    play(options = {}) {
      return script(director.compile()).play(state.targets, { ...options, seed: options.seed ?? state.seed });
    }
  };
  return Object.freeze(director);
}

export function direct(targets) {
  return createDirector({ targets, recipe: null, staggerStep: null, seed: 'turbulencejs' });
}

export default direct;
