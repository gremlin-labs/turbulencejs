import { Turbulence, manualDriver } from '../../src/runtime';
import { DomAnimator } from '../../src/dom';

function element() {
  const custom = new Map();
  return {
    style: {
      setProperty: (key, value) => custom.set(key, value),
      getPropertyValue: key => custom.get(key) || ''
    }
  };
}

async function stepUntilIdle(driver, engine, limit = 500) {
  let steps = 0;
  while (driver.hasPending && steps++ < limit) driver.step(16);
  await Promise.resolve();
  if (!engine.idle) throw new Error('ProductKit-shaped renderer fixture did not become idle');
}

describe('ProductKit-shaped renderer contract', () => {
  test('press/release retargeting, pop choreography, cancellation, and teardown share one engine', async () => {
    const driver = manualDriver();
    const engine = new Turbulence({ driver });
    const animator = new DomAnimator(engine);
    const button = element();
    const panel = element();

    animator.animate(button, { scale: 0.96, opacity: 0.8 }, { duration: 120, easing: 'linear' });
    driver.step(16);
    driver.step(40);
    const pressed = button.style.transform;
    const release = animator.animate(button, { scale: 1, opacity: 1 }, { duration: 120, easing: 'linear' });
    driver.step(40);
    expect(button.style.transform).not.toBe(pressed);

    const pop = animator.animate(panel, { y: 0, scale: 1, opacity: 1 }, {
      from: { opacity: 0 },
      duration: 100,
      easing: 'snappy'
    });
    await stepUntilIdle(driver, engine);
    await expect(release.finished).resolves.toMatchObject({ finished: true, cancelled: false });
    await expect(pop.finished).resolves.toMatchObject({ finished: true, cancelled: false });

    const cancelled = animator.animate(panel, { y: 100 }, { duration: 1000 });
    driver.step(16);
    cancelled.cancel();
    await expect(cancelled.finished).resolves.toMatchObject({ cancelled: true });

    animator.dispose();
    engine.dispose();
    expect(engine.idle).toBe(true);
  });

  test('stagger and reduced motion preserve semantic endpoints', async () => {
    const driver = manualDriver();
    const engine = new Turbulence({ driver, reducedMotion: true });
    const animator = new DomAnimator(engine);
    const items = [element(), element(), element()];
    const handles = [];
    const staggered = engine.stagger(items, item => {
      const handle = animator.animate(item, { opacity: 1, x: 0 }, { from: { opacity: 0 }, duration: 200 });
      handles.push(handle);
      return handle;
    }, 20);

    while (driver.hasPending) driver.step(20);
    await expect(staggered.finished).resolves.toMatchObject({ finished: true });
    await Promise.all(handles.map(handle => handle.finished));
    for (const item of items) expect(item.style.opacity).toBe('1');
    expect(engine.idle).toBe(true);
  });
});
