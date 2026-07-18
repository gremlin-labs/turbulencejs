import { script } from '../../src/turbscript';
import { source } from '../../src/surfaces';
import { createTurbulenceRecipes } from '../../src/recipes/effects';
import { turb } from '../../src/turbscript';
import surface from '../../src/surfaces';

const { snaporate } = createTurbulenceRecipes(turb, surface);

function context2d() {
  return {
    fillCalls: [],
    globalAlpha: 1,
    fillStyle: '',
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: jest.fn(), clearRect: jest.fn(),
    fillRect(...values) { this.fillCalls.push([...values, this.fillStyle, this.globalAlpha]); }
  };
}

function mountTarget(width = 8, height = 8) {
  const target = document.createElement('div');
  target.style.visibility = 'visible';
  document.body.append(target);
  jest.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height
  });
  return target;
}

function pixels(width = 8, height = 8) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set([index % 255, 120, 220, 255], index);
  return source.imageData({ width, height, data });
}

describe('Snaporate', () => {
  test('moves deterministic sampled pixels in a configured direction and replays identically', () => {
    const contexts = [];
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      const value = context2d(); contexts.push(value); return value;
    });
    const target = mountTarget();
    const performance = script(snaporate.out(pixels(), {
      duration: 100, fidelity: 'blocks', samples: 16, direction: 'up-right', turbulence: 0.4, seed: 'local'
    })).play(target, { seed: 'performance-seed' });
    runAnimationFrame(50);
    const first = contexts[0].fillCalls.map(call => [...call]);
    expect(first.length).toBeGreaterThan(0);
    runAnimationFrame(100);
    expect(target.style.visibility).toBe('hidden');
    expect(document.querySelector('[data-turbulencejs-surface]')).toBeNull();

    performance.replay();
    runAnimationFrame(150);
    const replay = contexts[1].fillCalls.map(call => [...call]);
    expect(replay).toEqual(first);
    performance.stop().reset();
    expect(target.style.visibility).toBe('visible');
  });

  test('supports in/out endpoints, fidelity validation, interruption, and multiple targets', async () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context2d());
    expect(() => snaporate.out(pixels(), { fidelity: 'imaginary' })).toThrow(RangeError);
    const targets = [mountTarget(), mountTarget()];
    targets.forEach(target => { target.style.visibility = 'hidden'; });
    const performance = script(snaporate.in(pixels(), { duration: 100, fidelity: 'invaders' })).play(targets);
    expect(document.querySelectorAll('[data-turbulencejs-surface]')).toHaveLength(2);
    performance.finish();
    expect(targets.every(target => target.style.visibility === 'visible')).toBe(true);
    expect(document.querySelectorAll('[data-turbulencejs-surface]')).toHaveLength(0);
    performance.reset();
    expect(targets.every(target => target.style.visibility === 'hidden')).toBe(true);

    window.matchMedia.mockReturnValue({ matches: true });
    const reduced = script(snaporate.out(pixels())).play(targets[0]);
    expect(document.querySelector('[data-turbulencejs-surface]')).toBeNull();
    await Promise.resolve();
    expect(reduced.state).toBe('completed');
    expect(targets[0].style.visibility).toBe('hidden');
  });
});
