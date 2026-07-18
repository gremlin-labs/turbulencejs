import {
  interpolateTransform,
  parseTransform,
  transformToString
} from '../../src/utils/transform';

describe('transform utilities', () => {
  test('normalizes uniform scale into every scale axis', () => {
    expect(parseTransform('translateX(12px) rotate(15deg) scale(2)')).toMatchObject({
      translateX: 12,
      rotate: 15,
      scale: 2,
      scaleX: 2,
      scaleY: 2,
      scaleZ: 2
    });
  });

  test('serializes uniform scale without losing it', () => {
    const value = parseTransform('translateX(12px) rotate(15deg) scale(2)');
    expect(transformToString(value)).toContain('translate3d(12px, 0px, 0px)');
    expect(transformToString(value)).toContain('rotate(15deg)');
    expect(transformToString(value)).toContain('scale(2)');
  });

  test('interpolates explicit zero values rather than replacing them with defaults', () => {
    const from = parseTransform('scale(0)');
    const to = parseTransform('scale(1)');
    expect(interpolateTransform(from, to, 0).scaleX).toBe(0);
  });
});
