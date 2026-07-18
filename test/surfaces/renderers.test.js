import { applySurfacePolicy } from '../../src/surfaces/policy';
import { createDOMBlocksRenderer } from '../../src/surfaces/renderers/dom-blocks';
import { createSurfaceRenderer } from '../../src/surfaces/renderers';
import { createWorkerRenderer } from '../../src/surfaces/renderers/worker';
import { createCanvas2DRenderer } from '../../src/surfaces/renderers/canvas2d';

function fixture(width = 2, height = 2) {
  return {
    type: 'image-data', width, height,
    pixels: new Uint8ClampedArray(width * height * 4).fill(255),
    policy: applySurfacePolicy({ width, height, domBlocks: 4, workerBacklog: 1 })
  };
}

function canvas2dContext() {
  return {
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: jest.fn(), clearRect: jest.fn()
  };
}

describe('surface renderer ladder', () => {
  test('DOM blocks are bounded, batched, decorative, and disposable', () => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    document.body.append(canvas);
    const renderer = createDOMBlocksRenderer({ canvas, source: fixture(), options: { domBlocks: 4 } });
    const container = document.querySelector('[data-turbulencejs-surface-blocks]');
    expect(container.getAttribute('aria-hidden')).toBe('true');
    expect(container.children).toHaveLength(4);
    renderer.render(0.5);
    expect([...container.children].some(node => node.style.opacity === '0')).toBe(true);
    renderer.dispose();
    renderer.dispose();
    expect(document.querySelector('[data-turbulencejs-surface-blocks]')).toBeNull();
  });

  test('Canvas2D and DOM-block renderers conform at semantic endpoints', () => {
    const source = fixture();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    document.body.append(canvas);
    let output;
    const context = canvas2dContext();
    context.createImageData = (width, height) => {
      output = { data: new Uint8ClampedArray(width * height * 4) };
      return output;
    };
    jest.spyOn(canvas, 'getContext').mockReturnValue(context);
    const bitmap = createCanvas2DRenderer({ canvas, source, mode: 'out' });
    const blocks = createDOMBlocksRenderer({ canvas, source, mode: 'out', options: { domBlocks: 4 } });
    bitmap.render(0);
    blocks.render(0);
    expect([...output.data].filter((_, index) => index % 4 === 3)).toEqual([255, 255, 255, 255]);
    expect([...document.querySelectorAll('[data-turbulencejs-surface-blocks] i')].every(node => node.style.opacity === '1')).toBe(true);
    bitmap.render(1);
    blocks.render(1);
    expect([...output.data].filter((_, index) => index % 4 === 3)).toEqual([0, 0, 0, 0]);
    expect([...document.querySelectorAll('[data-turbulencejs-surface-blocks] i')].every(node => node.style.opacity === '0')).toBe(true);
    bitmap.dispose();
    blocks.dispose();
  });

  test('strict renderer selection reports fallback exhaustion', () => {
    const canvas = document.createElement('canvas');
    expect(() => createSurfaceRenderer({
      canvas, source: fixture(), mode: 'out', options: { renderer: 'not-real', strictRenderer: true }
    })).toThrow(expect.objectContaining({ code: 'SURFACE_CONTEXT_LOST' }));
  });

  test('automatic selection falls back by feature detection, not user agent', () => {
    const canvas = document.createElement('canvas');
    const context = canvas2dContext();
    jest.spyOn(canvas, 'getContext').mockImplementation(type => type === '2d' ? context : null);
    const renderer = createSurfaceRenderer({
      canvas,
      source: fixture(300, 200),
      mode: 'out',
      options: { renderer: 'auto' }
    });
    expect(renderer.type).toBe('canvas2d');
    expect(renderer.fallbackChain).toEqual([
      expect.objectContaining({ renderer: 'webgl2', reason: 'SURFACE_CONTEXT_LOST' }),
      expect.objectContaining({ renderer: 'canvas2d', reason: 'selected' })
    ]);
    renderer.render(0.5);
    expect(context.putImageData).toHaveBeenCalled();
    renderer.dispose();
  });

  test('worker progress is coalesced and the worker never owns time', () => {
    const listeners = {};
    const worker = {
      postMessage: jest.fn(), terminate: jest.fn(),
      addEventListener: jest.fn((type, callback) => { listeners[type] = callback; }),
      removeEventListener: jest.fn()
    };
    const canvas = document.createElement('canvas');
    canvas.transferControlToOffscreen = jest.fn(() => ({ getContext: jest.fn() }));
    const renderer = createWorkerRenderer({
      canvas, source: fixture(), mode: 'out', options: { workerFactory: () => worker }
    });
    renderer.render(0.1);
    renderer.render(0.2);
    renderer.render(0.3);
    expect(worker.postMessage.mock.calls.filter(([message]) => message.type === 'progress')).toHaveLength(1);
    listeners.message({ data: { type: 'rendered' } });
    expect(worker.postMessage).toHaveBeenLastCalledWith({ type: 'progress', progress: 0.3 });
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    renderer.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  test('runtime worker loss swaps to an owned Canvas2D fallback', () => {
    const listeners = {};
    const worker = {
      postMessage: jest.fn(), terminate: jest.fn(),
      addEventListener: jest.fn((type, callback) => { listeners[type] = callback; }),
      removeEventListener: jest.fn()
    };
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    canvas.transferControlToOffscreen = jest.fn(() => ({}));
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas2dContext());
    const renderer = createSurfaceRenderer({
      canvas, source: fixture(), mode: 'out',
      options: { renderer: 'worker', workerFactory: () => worker }
    });
    listeners.error(new Event('error'));
    renderer.render(0.5);
    expect(renderer.type).toBe('canvas2d');
    expect(renderer.fallbackChain.at(-1).reason).toContain('runtime-fallback');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    renderer.dispose();
    expect(document.body.contains(canvas)).toBe(false);
  });
});
