import { cloneElementForCapture } from '../../src/surfaces/capture/clone';
import { captureElement } from '../../src/surfaces/providers/element';
import { inlineCaptureAssets } from '../../src/surfaces/capture/assets';

function rect(width = 100, height = 50) {
  return { x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height };
}

describe('supported-subset element capture', () => {
  test('rejects disconnected, zero-area, and protected content explicitly', () => {
    const disconnected = document.createElement('div');
    expect(() => cloneElementForCapture(disconnected)).toThrow(expect.objectContaining({ code: 'SURFACE_UNSUPPORTED_INPUT' }));

    const target = document.createElement('div');
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(0, 10));
    expect(() => cloneElementForCapture(target)).toThrow(expect.objectContaining({ code: 'SURFACE_ZERO_AREA' }));

    target.innerHTML = '<video></video><iframe></iframe>';
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect());
    expect(() => cloneElementForCapture(target)).toThrow(expect.objectContaining({ code: 'SURFACE_UNSUPPORTED_INPUT' }));
    const omitted = cloneElementForCapture(target, { unsupported: 'omit' });
    expect(omitted.clone.querySelector('video, iframe')).toBeNull();
    expect(omitted.diagnostics.omittedUnsupported).toBe(2);
  });

  test('copies live form state and applies explicit asset policy without exposing URLs', () => {
    const target = document.createElement('div');
    target.innerHTML = '<input value="old"><textarea>old</textarea><img src="https://remote.invalid/private.png?token=secret">';
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect());
    target.querySelector('input').value = 'current';
    target.querySelector('textarea').value = 'current text';
    const prepared = cloneElementForCapture(target, { assets: 'none' });
    expect(prepared.clone.querySelector('input').getAttribute('value')).toBe('current');
    expect(prepared.clone.querySelector('textarea').textContent).toBe('current text');
    expect(prepared.clone.querySelector('img').hasAttribute('src')).toBe(false);
    expect(JSON.stringify(prepared.diagnostics)).not.toContain('secret');
  });

  test('aborts before serialization and uses an origin-clean local capture URL', async () => {
    const target = document.createElement('div');
    target.textContent = 'capture me';
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(2, 1));
    const aborted = new AbortController();
    aborted.abort();
    await expect(captureElement(target, { signal: aborted.signal, fonts: 'skip' }))
      .rejects.toMatchObject({ code: 'SURFACE_ABORTED' });

    const OriginalImage = global.Image;
    global.Image = class extends EventTarget {
      set src(value) { this.value = value; queueMicrotask(() => this.dispatchEvent(new Event('load'))); }
    };
    const context = {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ width: 2, height: 1, data: new Uint8ClampedArray(8) }))
    };
    const contextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    try {
      const captured = await captureElement(target, { fonts: 'skip', dpr: 1 });
      expect(captured.source.type).toBe('image-data');
      expect(captured.diagnostics.pseudoElements).toBe('omitted');
      expect(captured.source.value).toBeDefined();
    } finally {
      global.Image = OriginalImage;
      contextSpy.mockRestore();
    }
  });

  test('explicit asset loading omits credentials by default and sanitizes failures', async () => {
    const target = document.createElement('img');
    const diagnostics = { inlinedAssets: 0, failedAssets: 0 };
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['safe'], { type: 'image/png' })
    }));
    try {
      await inlineCaptureAssets([{ target, attribute: 'src', url: 'https://assets.invalid/private.png?token=secret' }], {
        assets: 'cors'
      }, diagnostics);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('assets.invalid'), expect.objectContaining({
        mode: 'cors', credentials: 'omit'
      }));
      expect(target.src).toMatch(/^data:image\/png/);
      expect(diagnostics).toEqual({ inlinedAssets: 1, failedAssets: 0 });
      expect(JSON.stringify(diagnostics)).not.toContain('secret');
    } finally { global.fetch = originalFetch; }
  });

  test('bounds the entire capture pipeline with one timeout', async () => {
    jest.useFakeTimers();
    const target = document.createElement('div');
    document.body.append(target);
    jest.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(2, 1));
    const pending = captureElement(target, { fonts: 'skip', timeout: 10 });
    jest.advanceTimersByTime(10);
    await expect(pending).rejects.toMatchObject({ code: 'SURFACE_SOURCE_NOT_READY' });
    jest.useRealTimers();
  });
});
