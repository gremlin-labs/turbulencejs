import { turb, script } from '../../src/turbscript';
import surface from '../../src/surfaces';
import { createTurbulenceRecipes } from '../../src/recipes/effects';

const { sidebarReady } = createTurbulenceRecipes(turb, surface);

function sidebarRecords(count = 3) {
  const parent = document.createElement('nav');
  document.body.append(parent);
  const records = Array.from({ length: count }, () => {
    const item = document.createElement('a');
    item.href = '#';
    const content = document.createElement('span');
    item.append(content);
    parent.append(item);
    return { target: item, slots: { parent, content, item } };
  });
  return { parent, records };
}

describe('sidebarReady', () => {
  test('arrives in stable/reverse order, emits marks, and creates one shared sweep', () => {
    const { parent, records } = sidebarRecords();
    const order = [];
    records[0].target.focus();
    const performance = script(sidebarReady({
      order: 'reverse', stagger: 10, finish: 'sweep', parentSlot: 'parent',
      arrival: (_target, index) => turb.track({ opacity: [0, 1] }, {
        duration: 20, onStart: () => order.push(index)
      }),
      sweep: { duration: 30 }
    })).play(records, { autoplay: false });
    const marks = [];
    performance.on('mark', event => marks.push(event.name));
    expect(parent.querySelectorAll('[data-turbulencejs-coordinator="sidebar-sweep"]')).toHaveLength(1);
    performance.play();
    runAnimationFrame(0);
    runAnimationFrame(10);
    runAnimationFrame(20);
    expect(order).toEqual([2, 1, 0]);
    runAnimationFrame(40);
    runAnimationFrame(70);
    expect(marks).toEqual(['sidebar:arrived', 'sidebar:ready']);
    expect(parent.querySelector('[data-turbulencejs-coordinator]')).toBeNull();
    expect(document.activeElement).toBe(records[0].target);
  });

  test('supports glow, settle, mixed, custom, slots, deterministic replay, and missing-slot errors', () => {
    const { records } = sidebarRecords(2);
    for (const finish of ['glow', 'settle', 'mixed', 'none']) {
      const performance = script(sidebarReady({ finish, itemSlot: 'item', seed: 'stable', stagger: 5 })).play(records);
      performance.finish().reset().replay().stop().reset();
      expect(performance.state).toBe('idle');
    }
    const custom = jest.fn((_target, index) => turb.track({ opacity: [1, 0.9, 1] }, { duration: 10 + index }));
    script(sidebarReady({ finish: 'custom', final: custom })).play(records).finish();
    expect(custom).toHaveBeenCalledTimes(2);
    expect(() => script(sidebarReady({ finish: 'sweep', parentSlot: 'missing' })).play(records))
      .toThrow('slot "missing"');
  });

  test('skips sweep allocation under reduced motion and handles empty targets', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const { parent, records } = sidebarRecords();
    const performance = script(sidebarReady({ parentSlot: 'parent' })).play(records);
    expect(parent.querySelector('[data-turbulencejs-coordinator]')).toBeNull();
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    const empty = script(sidebarReady({ finish: 'none' })).play([]);
    await Promise.resolve();
    expect(empty.state).toBe('completed');
  });
});
