import { createSpring, springTo } from '../../src/utils/spring';

describe('spring motion', () => {
  test('returns a stable result shape and clamps long frame gaps', () => {
    const spring = createSpring({ stiffness: 180, damping: 12 });
    spring.reset(0);

    expect(spring.update(100, 0)).toEqual({ position: 0, velocity: 0, isSettled: false });
    const afterGap = spring.update(100, 5000);
    expect(Number.isFinite(afterGap.position)).toBe(true);
    expect(Number.isFinite(afterGap.velocity)).toBe(true);
    expect(Math.abs(afterGap.position)).toBeLessThan(1000);
  });

  test('uses the requested axis and preserves unrelated transforms', () => {
    const element = document.createElement('div');
    element.style.transform = 'translateX(10px) rotate(30deg) scale(2)';
    const controller = springTo(element, 'y', 50, { stiffness: 180, damping: 18 });

    runAnimationFrame(0);
    runAnimationFrame(16);
    expect(element.style.transform).toContain('translate3d(10px,');
    expect(element.style.transform).toContain('rotate(30deg)');
    expect(element.style.transform).toContain('scale(2)');
    controller.stop();
  });

  test('can retarget without replacing the controller', () => {
    const element = document.createElement('div');
    const controller = springTo(element, 'x', 50);
    expect(controller.retarget(100)).toBe(controller);
    runAnimationFrame(0);
    runAnimationFrame(16);
    expect(controller.state).toBe('playing');
    controller.stop();
  });

  test('retargeting remains immediate when reduced motion is active', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const element = document.createElement('div');
    const controller = springTo(element, 'x', 50);
    await Promise.resolve();
    controller.retarget(20);
    expect(element.style.transform).toContain('translate3d(20px, 0px, 0px)');
    expect(controller.state).toBe('completed');
    expect(pendingAnimationFrames()).toBe(0);
  });
});
