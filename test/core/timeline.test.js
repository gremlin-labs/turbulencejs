import { animate } from '../../src/core/engine';
import { create } from '../../src/core/timeline';

describe('timeline', () => {
  test('adopts compiled animation state without exposing engine internals or flashing', () => {
    const element = document.createElement('div');
    element.style.transform = 'rotate(30deg) scale(2)';
    const controller = animate(element, { x: [0, 100] }, { duration: 100, easing: 'linear' });

    expect(controller._internal).toBeUndefined();
    const timeline = create().add(controller, 0);
    expect(element.style.transform).toBe('rotate(30deg) scale(2)');

    timeline.seek(50);
    expect(element.style.transform).toContain('translate3d(50px, 0px, 0px)');
    expect(element.style.transform).toContain('rotate(30deg)');
    expect(element.style.transform).toContain('scale(2)');
  });

  test('completes once and can reverse from the endpoint', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onComplete = jest.fn();
    const timeline = create({ onComplete }).add(
      animate(element, { opacity: [0, 1] }, { duration: 100, easing: 'linear' }),
      0
    );

    timeline.play();
    runAnimationFrame(100);
    runAnimationFrame(116);
    expect(element.style.opacity).toBe('1');
    expect(onComplete).toHaveBeenCalledTimes(1);

    timeline.reverse();
    runAnimationFrame(216);
    expect(element.style.opacity).toBe('0');
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  test('reduced motion renders the endpoint and completes asynchronously', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onComplete = jest.fn();
    const timeline = create({ onComplete }).add(
      animate(element, { opacity: 1 }, { duration: 100, easing: 'linear' }),
      0
    );

    expect(element.style.opacity).toBe('0');
    timeline.play();
    expect(element.style.opacity).toBe('1');
    expect(onComplete).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('owns child callback ordering and cancellation', () => {
    const element = document.createElement('div');
    const calls = [];
    const child = animate(element, { opacity: [0, 1] }, {
      duration: 100,
      onStart: () => calls.push('start'),
      onComplete: () => calls.push('complete'),
      onCancel: () => calls.push('cancel')
    });
    const sequence = create().add(child, 0).play();
    runAnimationFrame(100);
    expect(calls).toEqual(['start', 'complete']);
    sequence.stop();
    expect(calls).toEqual(['start', 'complete']);

    const cancelled = animate(element, { opacity: [1, 0] }, { duration: 100, onCancel: () => calls.push('cancel') });
    create().add(cancelled, 0).play().stop();
    expect(calls).toEqual(['start', 'complete', 'cancel']);
  });

  test('reverse from the initial stopped state begins at the endpoint', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const sequence = create().add(animate(element, { opacity: [0, 1] }, { duration: 100, easing: 'linear' }), 0);
    sequence.reverse();
    runAnimationFrame(50);
    expect(Number(element.style.opacity)).toBeCloseTo(0.5);
    sequence.stop();
  });

  test('schedules generic playback units on its existing frame loop', () => {
    const render = jest.fn();
    const complete = jest.fn();
    const sequence = create().addUnit({
      type: 'test',
      config: { duration: 100 },
      render,
      complete
    }, 0).play();

    expect(pendingAnimationFrames()).toBe(1);
    runAnimationFrame(50);
    expect(render).toHaveBeenLastCalledWith(0.5, expect.objectContaining({ time: 50 }));
    runAnimationFrame(100);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
    sequence.stop();
  });
});
