import { turb, script } from '../../src/turbscript';
import surface from '../../src/surfaces';
import { createTurbulenceRecipes } from '../../src/recipes/effects';

const { tetrisLoad } = createTurbulenceRecipes(turb, surface);

function groupRecords(count = 3) {
  const group = document.createElement('section');
  document.body.append(group);
  const records = Array.from({ length: count }, () => {
    const card = document.createElement('article');
    const block = document.createElement('div');
    const content = document.createElement('div');
    content.style.opacity = '0';
    card.append(block, content);
    group.append(card);
    return { target: card, slots: { group, block, content } };
  });
  return { group, records };
}

describe('tetrisLoad', () => {
  test('drops arbitrary cards, emits landed/win marks, flashes once, and reveals existing content', () => {
    const { group, records } = groupRecords(3);
    const performance = script(tetrisLoad({
      blockSlot: 'block', groupSlot: 'group', contentSlot: 'content',
      stagger: 10, dropDuration: 20, collisionDuration: 10,
      flash: { duration: 20 }, contentDuration: 20, contentStagger: 5
    })).play(records, { autoplay: false });
    const marks = [];
    performance.on('mark', event => marks.push(event));
    expect(group.querySelectorAll('[data-turbulencejs-coordinator="tetris-win"]')).toHaveLength(1);
    performance.play();
    runAnimationFrame(0);
    runAnimationFrame(50);
    expect(marks.map(mark => mark.name)).toEqual(['tetris:landed']);
    runAnimationFrame(70);
    runAnimationFrame(100);
    expect(marks.map(mark => mark.name)).toEqual(['tetris:landed', 'tetris:win']);
    expect(group.querySelector('[data-turbulencejs-coordinator]')).toBeNull();
    expect(records.every(record => record.slots.content.style.opacity === '1')).toBe(true);
  });

  test('supports mark-driven host content, directions, partial groups, custom/settle/no-flash wins, and interruption', () => {
    let frameTime = 0;
    for (const direction of ['up', 'down', 'left', 'right']) {
      const { group, records } = groupRecords(2);
      const performance = script(tetrisLoad({
        direction, content: 'replace-at-mark', groupSlot: 'group', win: 'flash',
        stagger: 0, dropDuration: 10, collisionDuration: 10, flash: { duration: 10 }
      })).play(records);
      const mounted = jest.fn();
      performance.on('mark', event => { if (event.name === 'tetris:landed') mounted(); });
      frameTime += 30;
      runAnimationFrame(frameTime);
      expect(mounted).toHaveBeenCalledTimes(1);
      performance.stop().reset();
      expect(group.querySelector('[data-turbulencejs-coordinator]')).toBeNull();
    }
    const { records } = groupRecords(1);
    script(tetrisLoad({ win: 'settle' })).play(records).finish();
    script(tetrisLoad({ win: 'none' })).play(records).finish();
    const custom = jest.fn(() => turb.track({ scale: [1, 1.02, 1] }, { duration: 10 }));
    script(tetrisLoad({ win: 'custom', final: custom })).play(records).finish();
    expect(custom).toHaveBeenCalledTimes(1);
    expect(() => script(tetrisLoad({ win: 'flash', groupSlot: 'missing' })).play(records)).toThrow('slot "missing"');
    expect(() => tetrisLoad({ direction: 'diagonal' })).toThrow(RangeError);
  });

  test('reduced motion preserves marks/content without overlay and empty groups complete safely', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const { group, records } = groupRecords(2);
    const performance = script(tetrisLoad({ groupSlot: 'group', win: 'flash', content: 'replace-at-mark' }))
      .play(records, { autoplay: false });
    const marks = [];
    performance.on('mark', event => marks.push(event.name));
    performance.play();
    expect(group.querySelector('[data-turbulencejs-coordinator]')).toBeNull();
    await Promise.resolve();
    expect(marks).toEqual(['tetris:landed', 'tetris:win']);
    expect(performance.state).toBe('completed');
    const empty = script(tetrisLoad({ win: 'none' })).play([]);
    await Promise.resolve();
    expect(empty.state).toBe('completed');
  });
});
