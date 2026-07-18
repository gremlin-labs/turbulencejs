import { animate } from '../../src/core/engine';
import { browserScheduler, createFrameScheduler } from '../../src/core/scheduler';
import { create } from '../../src/core/timeline';
import { manualDriver } from '../../src/runtime';
import { springTo } from '../../src/utils/spring';

describe('shared frame scheduler', () => {
  test('fans multiple callbacks through one injected driver frame and becomes idle', () => {
    const driver = manualDriver();
    const scheduler = createFrameScheduler(driver);
    const calls = [];
    scheduler.schedule(time => calls.push(['a', time]));
    scheduler.schedule(time => calls.push(['b', time]));

    expect(driver.hasPending).toBe(true);
    expect(scheduler.size).toBe(2);
    driver.step(16);
    expect(calls).toEqual([['a', 16], ['b', 16]]);
    expect(scheduler.running).toBe(false);
    expect(scheduler.size).toBe(0);
  });

  test('direct animation, timeline, and springs share one production rAF request', () => {
    const directElement = document.createElement('div');
    const timelineElement = document.createElement('div');
    const firstSpringElement = document.createElement('div');
    const secondSpringElement = document.createElement('div');

    const direct = animate(directElement, { opacity: [0, 1] }, { duration: 100, easing: 'linear' });
    const timeline = create().add(
      animate(timelineElement, { opacity: [0, 1] }, { duration: 100, easing: 'linear', autoplay: false }),
      0
    ).play();
    const firstSpring = springTo(firstSpringElement, 'x', 100);
    const secondSpring = springTo(secondSpringElement, 'y', 100);

    expect(pendingAnimationFrames()).toBe(1);
    expect(browserScheduler.size).toBe(4);
    runAnimationFrame(16);
    expect(pendingAnimationFrames()).toBe(1);

    direct.stop();
    timeline.stop();
    firstSpring.stop();
    secondSpring.stop();
    expect(pendingAnimationFrames()).toBe(0);
    expect(browserScheduler.size).toBe(0);
  });
});
