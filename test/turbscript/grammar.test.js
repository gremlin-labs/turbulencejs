import { turb } from '../../src/turbscript';

describe('Turb grammar', () => {
  test('creates immutable target-independent nodes', () => {
    const properties = { opacity: [0, 1] };
    const node = turb.track(properties, { duration: 100 });
    properties.opacity = [1, 0];

    expect(turb.isTurb(node)).toBe(true);
    expect(Object.isFrozen(node)).toBe(true);
    expect(node.properties.opacity).toEqual([0, 1]);
    expect(() => turb.sequence(node, {})).toThrow('must be a Turb value');
  });

  test('validates timing, choices, and recipe results', () => {
    expect(() => turb.wait(-1)).toThrow(RangeError);
    expect(() => turb.at(Number.NaN, turb.wait(0))).toThrow(RangeError);
    expect(() => turb.choose([])).toThrow(RangeError);
    const invalid = turb.define('invalid', () => null);
    expect(() => invalid()).toThrow('recipe "invalid" result');
    expect(() => turb.driver(() => () => {}, {})).toThrow('explicit duration');
    expect(() => turb.driver(() => () => {}, { duration: -1 })).toThrow(RangeError);
    expect(() => turb.mark('')).toThrow('non-empty name');
  });

  test('creates immutable driver and mark nodes', () => {
    const metadata = { phase: 'ready' };
    const driver = turb.driver(() => () => {}, { duration: 120 });
    const mark = turb.mark('landed', metadata);
    metadata.phase = 'changed';

    expect(driver).toMatchObject({ type: 'driver', options: { duration: 120 } });
    expect(mark).toMatchObject({ type: 'mark', metadata: { phase: 'ready' } });
    expect(Object.isFrozen(driver)).toBe(true);
    expect(Object.isFrozen(mark.metadata)).toBe(true);
  });
});
