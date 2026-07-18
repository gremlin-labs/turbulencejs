import { turb, script } from '../../src/turbscript';
import surface from '../../src/surfaces';
import { createTurbulenceRecipes } from '../../src/recipes/effects';

const { enhance } = createTurbulenceRecipes(turb, surface);

function target() {
  const element = document.createElement('img');
  element.style.visibility = 'visible';
  document.body.append(element);
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 10, y: 20, left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120
  });
  return element;
}

describe('Enhance', () => {
  test('requires real stages and progressively selects loaded resolutions', () => {
    expect(() => enhance(['/only-one.jpg'])).toThrow('at least two');
    const element = target();
    const onStageLoad = jest.fn();
    const performance = script(enhance([
      { src: '/8.jpg', resolution: 8 },
      { src: '/64.jpg', resolution: 64 },
      { src: '/final.jpg', resolution: 1024 }
    ], { duration: 100, fit: 'contain', position: '20% 30%', onStageLoad })).play(element);
    const images = [...document.querySelectorAll('[data-turbulencejs-enhance] img')];
    expect(images).toHaveLength(3);
    expect(images[0].style.imageRendering).toBe('pixelated');
    expect(images[2].style.imageRendering).toBe('auto');
    images[0].dispatchEvent(new Event('load'));
    runAnimationFrame(20);
    expect(images[0].style.opacity).toBe('1');
    runAnimationFrame(80);
    expect(images[0].style.opacity).toBe('1');
    images[2].dispatchEvent(new Event('load'));
    runAnimationFrame(90);
    expect(images[2].style.opacity).toBe('1');
    expect(onStageLoad).toHaveBeenCalledTimes(2);
    performance.stop();
    expect(document.querySelector('[data-turbulencejs-enhance]')).toBeNull();
    expect(element.style.visibility).toBe('visible');
  });

  test('reports errors, retries through the lifecycle, repositions, and tears down idempotently', () => {
    jest.useFakeTimers();
    const element = target();
    const onStageError = jest.fn();
    const performance = script(enhance(['/preview.jpg', '/final.jpg'], {
      duration: 1000, retries: 1, retryDelay: 25, onStageError
    })).play(element);
    const images = [...document.querySelectorAll('[data-turbulencejs-enhance] img')];
    images[0].dispatchEvent(new Event('error'));
    expect(onStageError).toHaveBeenCalledWith(expect.objectContaining({ index: 0, resolution: 1, target: element }));
    jest.advanceTimersByTime(25);
    window.dispatchEvent(new Event('resize'));
    expect(document.querySelector('[data-turbulencejs-enhance]').style.width).toBe('200px');
    performance.stop().stop().reset();
    expect(jest.getTimerCount()).toBe(0);
    expect(document.querySelector('[data-turbulencejs-enhance]')).toBeNull();
    images[0].dispatchEvent(new Event('load'));
    expect(performance.state).toBe('idle');
    jest.useRealTimers();
  });

  test('emits a host handoff mark and skips image allocation under reduced motion', async () => {
    const element = target();
    const performance = script(enhance(['/preview.jpg', '/final.jpg'], {
      duration: 100, content: 'replace-at-mark', markName: 'content:ready'
    })).play(element, { autoplay: false });
    const marks = [];
    performance.on('mark', event => marks.push(event.name));
    performance.play();
    runAnimationFrame(100);
    expect(marks).toEqual(['content:ready']);
    expect(performance.state).toBe('completed');

    window.matchMedia.mockReturnValue({ matches: true });
    const reduced = script(enhance(['/preview.jpg', '/final.jpg'])).play(element);
    expect(document.querySelector('[data-turbulencejs-enhance]')).toBeNull();
    await Promise.resolve();
    expect(reduced.state).toBe('completed');
    expect(element.style.visibility).toBe('visible');
  });

  test('bounds stalled stages with timeout and appends an explicit fallback stage', () => {
    jest.useFakeTimers();
    const element = target();
    const onStageError = jest.fn();
    const performance = script(enhance(['/preview.jpg', '/final.jpg'], {
      timeout: 25,
      fallback: { src: '/fallback.jpg', resolution: 32 },
      onStageError
    })).play(element);
    expect(document.querySelectorAll('[data-turbulencejs-enhance] img')).toHaveLength(3);
    jest.advanceTimersByTime(25);
    expect(onStageError).toHaveBeenCalledTimes(3);
    expect(onStageError.mock.calls[0][0].error.message).toContain('timed out');
    performance.stop();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
