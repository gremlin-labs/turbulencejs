import { compilePath, followPath, getPointAtPercent } from '../../src/utils/path';

describe('motion paths', () => {
  test('normalizes relative and repeated commands and caches segment metrics', () => {
    const path = compilePath('M 0 0 l 100 0 0 100');
    expect(path.segments).toHaveLength(2);
    expect(path.totalLength).toBeCloseTo(200);
    expect(getPointAtPercent(path, 0.75)).toMatchObject({ x: 100, y: 50 });
    expect(path.segments[0].samples.length).toBeGreaterThan(1);
  });

  test('samples quadratic curves with a tangent', () => {
    const path = compilePath('M 0 0 Q 50 100 100 0');
    const midpoint = getPointAtPercent(path, 0.5);
    expect(midpoint.x).toBeCloseTo(50, 1);
    expect(midpoint.y).toBeCloseTo(50, 1);
    expect(Number.isFinite(midpoint.angle)).toBe(true);
  });

  test.each(['S', 'T', 'A'])('rejects unsupported %s commands explicitly', command => {
    const parameters = command === 'A' ? '10 10 0 0 0 20 20' : command === 'S' ? '10 10 20 20' : '20 20';
    expect(() => compilePath(`M 0 0 ${command} ${parameters}`)).toThrow(`Path command ${command} is not supported`);
  });

  test('preserves scale while applying path translation and endpoint rotation', () => {
    const element = document.createElement('div');
    element.style.transform = 'rotate(20deg) scale(2)';
    const onComplete = jest.fn();
    followPath(element, 'M 0 0 L 100 100', { duration: 100, rotate: true, onComplete });

    runAnimationFrame(0);
    runAnimationFrame(100);
    expect(element.style.transform).toContain('translate3d(100px, 100px, 0px)');
    expect(element.style.transform).toContain('rotate(45deg)');
    expect(element.style.transform).toContain('scale(2)');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
