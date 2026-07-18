import { direct, turb, script } from '../../src/turbscript';

describe('Motion Director', () => {
  test('compiles to the same Turb graph used by script', () => {
    const target = document.createElement('div');
    const recipe = turb.track({ opacity: [0, 1] }, { duration: 100 });
    const director = direct(target).stagger(20).using(recipe).seed('director');
    const compiled = director.compile();
    expect(compiled.type).toBe('stagger');
    const directed = director.play({ autoplay: false });
    const grammatical = script(compiled).play(target, { seed: 'director', autoplay: false });
    expect(directed.duration).toBe(grammatical.duration);
    expect(directed.seed).toBe(grammatical.seed);
  });

  test('requires a recipe before play', () => {
    expect(() => direct(document.createElement('div')).play()).toThrow('using()');
  });
});
