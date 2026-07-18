import { resolveSurfaceSource, source } from '../../src/surfaces/source';

describe('surface sources', () => {
  test('keeps strong descriptors lazy and resolves ImageData-compatible pixels', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 0]);
    const input = { width: 2, height: 1, data };
    const descriptor = source.imageData(input);
    expect(Object.isFrozen(descriptor)).toBe(true);
    const resolved = resolveSurfaceSource(descriptor);
    expect(resolved).toMatchObject({ type: 'image-data', width: 2, height: 1, originClean: true });
    expect(resolved.pixels).toBe(data);
  });

  test('reports abort, not-ready image, zero area, and tainted canvas distinctly', () => {
    const abortController = new AbortController();
    abortController.abort();
    expect(() => resolveSurfaceSource(source.imageData({ width: 1, height: 1, data: new Uint8ClampedArray(4) }), {
      signal: abortController.signal
    })).toThrow(expect.objectContaining({ code: 'SURFACE_ABORTED' }));

    const image = document.createElement('img');
    expect(() => resolveSurfaceSource(source.image(image))).toThrow(expect.objectContaining({ code: 'SURFACE_SOURCE_NOT_READY' }));
    expect(() => resolveSurfaceSource(source.imageData({ width: 0, height: 1, data: new Uint8ClampedArray(0) })))
      .toThrow(expect.objectContaining({ code: 'SURFACE_ZERO_AREA' }));

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const securityError = new Error('tainted');
    securityError.name = 'SecurityError';
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => { throw securityError; })
    });
    expect(() => resolveSurfaceSource(source.canvas(canvas))).toThrow(expect.objectContaining({ code: 'SURFACE_TAINTED_PIXELS' }));
  });

  test('rejects malformed pixel buffers and honors top-level policy caps', () => {
    expect(() => resolveSurfaceSource(source.imageData({
      width: 2, height: 2, data: new Uint8ClampedArray(4)
    }))).toThrow(expect.objectContaining({ code: 'SURFACE_UNSUPPORTED_INPUT' }));
    const resolved = resolveSurfaceSource(source.imageData({
      width: 1, height: 1, data: new Uint8ClampedArray(4)
    }), { particles: 100, maxParticles: 5 });
    expect(resolved.policy.applied.particles).toBe(5);
  });
});
