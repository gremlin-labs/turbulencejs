import { script } from '../../src/turbscript';
import { dissolve, program, source } from '../../src/surfaces';

function canvasContext() {
  return {
    output: null,
    createImageData(width, height) {
      this.output = { width, height, data: new Uint8ClampedArray(width * height * 4) };
      return this.output;
    },
    putImageData: jest.fn(),
    clearRect: jest.fn()
  };
}

describe('surface program', () => {
  let getContext;

  beforeEach(() => {
    getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => canvasContext());
  });

  test('renders deterministic Canvas2D frames and owns its decorative layer', () => {
    const target = document.createElement('div');
    target.style.visibility = 'visible';
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 10, y: 20, left: 10, top: 20, width: 2, height: 1, right: 12, bottom: 21
    });
    const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const performance = script(dissolve.out(source.imageData({ width: 2, height: 1, data: pixels }), {
      duration: 100,
      seed: 'fixture'
    })).play(target);

    const layer = document.querySelector('[data-turbulencejs-surface]');
    expect(layer).not.toBeNull();
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.style.pointerEvents).toBe('none');
    expect(performance.diagnostics.resourceCount).toBeGreaterThan(0);
    runAnimationFrame(50);
    expect(getContext.mock.results.at(-1).value.putImageData).toHaveBeenCalledTimes(1);
    runAnimationFrame(100);
    expect(target.style.visibility).toBe('hidden');
    expect(document.querySelector('[data-turbulencejs-surface]')).toBeNull();
    performance.reset();
    expect(target.style.visibility).toBe('visible');
  });

  test('skips allocation under reduced motion and applies the semantic endpoint', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const target = document.createElement('div');
    target.style.visibility = 'visible';
    document.body.append(target);
    const performance = script(dissolve.out(source.imageData({
      width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255])
    }))).play(target);

    expect(getContext).not.toHaveBeenCalled();
    expect(document.querySelector('[data-turbulencejs-surface]')).toBeNull();
    expect(target.style.visibility).toBe('hidden');
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    performance.reset();
    expect(target.style.visibility).toBe('visible');
  });

  test('rolls back a prepared layer when renderer setup fails', () => {
    const target = document.createElement('div');
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, width: 1, height: 1, right: 1, bottom: 1
    });
    const recipe = program(source.imageData({ width: 1, height: 1, data: new Uint8ClampedArray(4) }), () => {
      throw new Error('renderer failed');
    });
    expect(() => script(recipe).play(target)).toThrow('renderer failed');
    expect(document.querySelector('[data-turbulencejs-surface]')).toBeNull();
  });
});
