import { turb, script } from '../../src/turbscript';

function elements(count) {
  return Array.from({ length: count }, () => document.createElement('div'));
}

describe('TurbScript collection strategies', () => {
  test('stagger offsets ordered targets', () => {
    const targets = elements(3);
    const performance = script(turb.stagger(50, turb.track({ opacity: [0, 1] }, { duration: 100, easing: 'linear' }))).play(targets);
    expect(performance.duration).toBe(200);
    runAnimationFrame(75);
    expect(Number(targets[0].style.opacity)).toBeCloseTo(0.75);
    expect(Number(targets[1].style.opacity)).toBeCloseTo(0.25);
    expect(targets[2].style.opacity).toBe('');
  });

  test('seeded choose reproduces and reseed changes assignments', () => {
    const targets = elements(8);
    const choices = turb.choose([
      turb.track({ opacity: [0, 0.25] }, { duration: 0 }),
      turb.track({ opacity: [0, 0.75] }, { duration: 0 })
    ]);
    const performance = script(choices).play(targets, { seed: 'same' });
    return Promise.resolve().then(() => {
      const first = targets.map(target => target.style.opacity);
      performance.replay();
      return Promise.resolve().then(() => {
        expect(targets.map(target => target.style.opacity)).toEqual(first);
        performance.reseed('different');
        return Promise.resolve().then(() => {
          expect(targets.map(target => target.style.opacity)).not.toEqual(first);
        });
      });
    });
  });

  test('resolves selectors, lazy targets, and relative slots at play time', () => {
    document.body.innerHTML = '<article class="card"><span class="content"></span></article>';
    const recipe = turb.parallel(
      turb.track({ opacity: [0, 1] }, { duration: 100 }),
      turb.slot('content', turb.track({ y: [10, 0] }, { duration: 100 }))
    );
    const performance = script(recipe).play(() => [{
      target: document.querySelector('.card'),
      slots: { content: '.content' }
    }]);
    expect(performance.diagnostics).toMatchObject({ targetCount: 1, trackCount: 2 });
    performance.stop();
  });

  test('empty targets complete safely', async () => {
    const performance = script(turb.track({ opacity: [0, 1] })).play([]);
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    expect(performance.diagnostics.targetCount).toBe(0);
  });
});
