import * as grammar from './grammar';

export const turb = Object.freeze({
  track: grammar.track,
  driver: grammar.driver,
  mark: grammar.mark,
  sequence: grammar.sequence,
  parallel: grammar.parallel,
  wait: grammar.wait,
  at: grammar.at,
  each: grammar.each,
  stagger: grammar.stagger,
  cycle: grammar.cycle,
  choose: grammar.choose,
  shuffle: grammar.shuffle,
  slot: grammar.slot,
  effect: grammar.effect,
  define: grammar.define,
  isTurb: grammar.isTurb
});

export { script } from './script';
export { direct } from './director';

export default turb;
