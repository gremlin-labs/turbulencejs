import { createEasing, elasticOut, quadOut } from '../../src/core/easing';

describe('createEasing', () => {
  test('resolves canonical and preset-style aliases', () => {
    expect(createEasing('quadOut')(0.4)).toBeCloseTo(quadOut(0.4));
    expect(createEasing('easeOutQuad')(0.4)).toBeCloseTo(quadOut(0.4));
  });

  test('parses parameterized aliases', () => {
    const resolved = createEasing('easeOutElastic(1, 0.7)');
    expect(resolved(0.35)).toBeCloseTo(elasticOut(0.35, 1, 0.7));
  });

  test('accepts easing functions unchanged', () => {
    const easing = t => t / 2;
    expect(createEasing(easing)).toBe(easing);
  });

  test('warns once and falls back to linear for an unknown string', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(createEasing('notAnEasing')(0.4)).toBe(0.4);
    expect(createEasing('notAnEasing')(0.8)).toBe(0.8);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
