import { animate } from '../../src/core/engine';

describe('animation engine', () => {
  test('completes a zero-duration animation on the next microtask', async () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onComplete = jest.fn();

    const controller = animate(element, { opacity: 1 }, { duration: 0, onComplete });

    expect(controller).toBeDefined();
    expect(onComplete).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(element.style.opacity).toBe('1');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('preserves unrelated transform components while animating scale', () => {
    const element = document.createElement('div');
    element.style.transform = 'translateX(5px) rotate(20deg) scale(2)';

    const controller = animate(element, { scale: [2, 3] }, { duration: 100, easing: 'linear' });
    runAnimationFrame(50);

    expect(element.style.transform).toContain('translate3d(5px, 0px, 0px)');
    expect(element.style.transform).toContain('rotate(20deg)');
    expect(element.style.transform).toContain('scale(2.5)');
    controller.stop();
  });

  test('renders the correct yoyo endpoint and completes once', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onComplete = jest.fn();

    animate(element, { opacity: [0, 1] }, {
      duration: 100,
      easing: 'linear',
      repeat: 1,
      yoyo: true,
      onComplete
    });
    runAnimationFrame(200);
    runAnimationFrame(216);

    expect(element.style.opacity).toBe('0');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('reduced motion applies the final state and preserves async completion', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onComplete = jest.fn();

    animate(element, { opacity: 1 }, { duration: 500, onComplete });

    expect(element.style.opacity).toBe('1');
    expect(onComplete).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('allows reduced-motion behavior to be opted out per animation', () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const element = document.createElement('div');
    element.style.opacity = '0';

    const controller = animate(element, { opacity: 1 }, {
      duration: 100,
      easing: 'linear',
      respectReducedMotion: false
    });

    expect(element.style.opacity).toBe('0');
    expect(pendingAnimationFrames()).toBe(1);
    controller.stop();
  });

  test('honors delay without firing start early', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const onStart = jest.fn();
    const controller = animate(element, { opacity: 1 }, { duration: 100, delay: 50, easing: 'linear', onStart });
    runAnimationFrame(49);
    expect(element.style.opacity).toBe('0');
    expect(onStart).not.toHaveBeenCalled();
    runAnimationFrame(50);
    expect(onStart).toHaveBeenCalledTimes(1);
    runAnimationFrame(150);
    expect(element.style.opacity).toBe('1');
    controller.stop();
  });

  test('pause and resume preserve elapsed progress', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const controller = animate(element, { opacity: 1 }, { duration: 100, easing: 'linear' });
    runAnimationFrame(40);
    expect(Number(element.style.opacity)).toBeCloseTo(0.4);
    controller.pause();
    runAnimationFrame(80);
    expect(Number(element.style.opacity)).toBeCloseTo(0.4);
    controller.resume();
    runAnimationFrame(110);
    expect(Number(element.style.opacity)).toBeCloseTo(0.7);
    controller.stop();
  });

  test('reverse preserves the current value and plays toward the opposite endpoint', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const controller = animate(element, { opacity: 1 }, { duration: 100, easing: 'linear' });
    runAnimationFrame(40);
    controller.reverse();
    runAnimationFrame(40);
    expect(Number(element.style.opacity)).toBeCloseTo(0.4);
    runAnimationFrame(80);
    expect(element.style.opacity).toBe('0');
  });

  test('stop invokes cancellation once and never completion', () => {
    const element = document.createElement('div');
    const onCancel = jest.fn();
    const onComplete = jest.fn();
    const controller = animate(element, { opacity: 1 }, { duration: 100, onCancel, onComplete });
    controller.stop();
    controller.stop();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('supports an explicit reduced-motion override for deterministic hosts', async () => {
    window.matchMedia.mockReturnValue({ matches: false });
    const element = document.createElement('div');
    const controller = animate(element, { opacity: [0, 1] }, { duration: 100, reducedMotion: true });
    expect(element.style.opacity).toBe('1');
    await Promise.resolve();
    expect(controller.state).toBe('completed');
    expect(pendingAnimationFrames()).toBe(0);
  });
});
