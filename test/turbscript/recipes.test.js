import { turb, script } from '../../src/turbscript';
import { createCartoonRecipes } from '../../src/recipes/cartoon';
import { createCinematicRecipes } from '../../src/recipes/cinematic';
import { createSubtleRecipes } from '../../src/recipes/subtle';
import { createExtremeRecipes } from '../../src/recipes/extreme';

const cartoon = createCartoonRecipes(turb);
const cinematic = createCinematicRecipes(turb);
const subtle = createSubtleRecipes(turb, cartoon, cinematic);
const extreme = createExtremeRecipes(turb, cartoon, cinematic);

describe('official TurbScript recipe packs', () => {
  test('bubble-in exposes mixable parts and supports simultaneous, sequential, and custom ordering', () => {
    const parts = cartoon.bubbleInParts({ duration: 100 });
    expect(Object.keys(parts)).toEqual(['appear', 'rise', 'expand', 'settle']);
    Object.values(parts).forEach(part => expect(turb.isTurb(part)).toBe(true));

    const target = document.createElement('div');
    target.style.transformOrigin = '10% 20%';
    const together = script(cartoon.bubbleIn({ duration: 100 })).play(target);
    expect(together.duration).toBeCloseTo(100);
    expect(target.style.transformOrigin).toBe('50% 100%');
    together.finish();
    expect(target.style.opacity).toBe('1');
    expect(target.style.transformOrigin).toBe('10% 20%');

    const sequential = script(cartoon.bubbleIn({ mode: 'sequence', duration: 100 })).play(target, { autoplay: false });
    expect(sequential.duration).toBeCloseTo(200);
    sequential.reset();
    expect(() => cartoon.bubbleIn({ order: ['appear', 'nope'] })).toThrow(/Unknown recipe part/);
  });

  test.each(['left', 'right', 'top', 'bottom'])('skedaddle enters and exits independently toward %s', direction => {
    const target = document.createElement('div');
    target.getBoundingClientRect = () => ({ width: 50, height: 30 });
    const entrance = script(cartoon.skedaddle.in({ from: direction, duration: 100, distance: 200 })).play(target);
    entrance.finish();
    expect(target.style.opacity).toBe('1');

    const exit = script(cartoon.skedaddle.out({ to: direction, duration: 100, distance: 200 })).play(target);
    exit.finish();
    expect(target.style.opacity).toBe('0');
  });

  test('card 3D setup is scoped to the performance lifecycle', () => {
    const host = document.createElement('section');
    const target = document.createElement('article');
    host.style.perspective = '400px';
    target.style.transformOrigin = '10% 10%';
    host.append(target);

    const performance = script(cinematic.card3D.in({ from: 'northEast', perspective: 1200 })).play(target);
    expect(host.style.perspective).toBe('1200px');
    expect(target.style.backfaceVisibility).toBe('hidden');
    performance.stop();
    expect(host.style.perspective).toBe('400px');
    expect(target.style.transformOrigin).toBe('10% 10%');
    expect(target.style.backfaceVisibility).toBe('');
  });

  test('cinematic slide can reveal slotted content after the panel', () => {
    const panel = document.createElement('section');
    const content = document.createElement('div');
    panel.append(content);
    const performance = script(cinematic.cinematicSlide.in({ anchor: 'topLeft', duration: 100, contentDuration: 300, content: 'after' })).play([
      { target: panel, slots: { content } }
    ], { autoplay: false });
    expect(performance.duration).toBe(400);
    performance.finish();
    expect(content.style.opacity).toBe('1');
    expect(panel.style.transformOrigin).toBe('');
  });

  test('subtle and extreme presets remain ordinary composable Turbs', () => {
    [
      subtle.softReveal(), subtle.quietSlide(), subtle.gentleSettle(),
      extreme.impactBubble(), extreme.panicSkedaddle.in(), extreme.panicSkedaddle.out(), extreme.spinAway()
    ].forEach(recipe => expect(turb.isTurb(recipe)).toBe(true));
  });

  test('instant reduced playback lands every parallel transform at its semantic endpoint', async () => {
    const target = document.createElement('div');
    const performance = script(cartoon.bubbleIn({ duration: 0, rise: 30 })).play(target);
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    expect(target.style.opacity).toBe('1');
    expect(target.style.transform).toBe('none');
  });
});
