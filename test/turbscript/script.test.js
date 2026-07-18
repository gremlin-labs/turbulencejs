import { turb, script } from '../../src/turbscript';

describe('TurbScript performance', () => {
  test('sequences same-property tracks without future tracks overriding active work', () => {
    const element = document.createElement('div');
    element.style.opacity = '0';
    const performance = script(turb.sequence(
      turb.track({ opacity: [0, 1] }, { duration: 100, easing: 'linear' }),
      turb.track({ opacity: [1, 0.5] }, { duration: 100, easing: 'linear' })
    )).play(element);

    runAnimationFrame(50);
    expect(Number(element.style.opacity)).toBeCloseTo(0.5);
    runAnimationFrame(150);
    expect(Number(element.style.opacity)).toBeCloseTo(0.75);
    runAnimationFrame(200);
    expect(element.style.opacity).toBe('0.5');
    expect(performance.state).toBe('completed');
  });

  test('stop, reset, finish, and replay have distinct endpoints', () => {
    const element = document.createElement('div');
    element.style.opacity = '0.2';
    const performance = script(turb.track({ opacity: [0.2, 1] }, { duration: 100, easing: 'linear' })).play(element);

    runAnimationFrame(50);
    performance.stop();
    expect(Number(element.style.opacity)).toBeCloseTo(0.6);
    expect(performance.state).toBe('cancelled');
    performance.reset();
    expect(element.style.opacity).toBe('0.2');
    performance.finish();
    expect(element.style.opacity).toBe('1');
    expect(performance.state).toBe('completed');
    performance.replay();
    expect(performance.state).toBe('playing');
  });

  test('reduced motion applies the endpoint and completes asynchronously', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const element = document.createElement('div');
    const onComplete = jest.fn();
    const performance = script(turb.track({ opacity: [0, 1] }, { duration: 500 })).play(element, { onComplete });

    expect(element.style.opacity).toBe('1');
    expect(onComplete).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(performance.state).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('setup failure rolls back every effect exactly once', () => {
    const targets = [document.createElement('div'), document.createElement('div')];
    const cleanup = jest.fn();
    const recipe = turb.effect(
      () => cleanup,
      turb.each((_target, index) => {
        if (index === 1) throw new Error('factory failed');
        return turb.track({ opacity: [0, 1] });
      })
    );
    expect(() => script(recipe).play(targets)).toThrow('factory failed');
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  test('effect capabilities reject unsupported controls explicitly', () => {
    const element = document.createElement('div');
    const recipe = turb.effect(() => undefined, turb.track({ opacity: [0, 1] }), {
      reversible: false, seekable: false, pausable: false
    });
    const performance = script(recipe).play(element);
    expect(performance.capabilities).toMatchObject({ reverse: false, seek: false, pause: false });
    expect(() => performance.pause()).toThrow('pause');
    expect(() => performance.reverse()).toThrow('reverse');
    expect(() => performance.seek(20)).toThrow('seek');
    performance.stop();
  });

  test('terminal cleanup and cancellation callback each run once', () => {
    const element = document.createElement('div');
    const cleanup = jest.fn();
    const onCancel = jest.fn();
    const performance = script(turb.effect(
      () => cleanup,
      turb.track({ opacity: [0, 1] }, { duration: 100 })
    )).play(element, { onCancel });
    performance.stop().stop().reset();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('renders custom drivers from the timeline clock and cleans lifecycle resources once', () => {
    const element = document.createElement('div');
    const renders = [];
    const cleanup = jest.fn();
    const finish = jest.fn();
    const recipe = turb.driver(context => {
      expect(context.target).toBe(element);
      context.lifecycle.cleanup(cleanup);
      context.lifecycle.resource('canvas', 1);
      return {
        render(progress, frame) {
          renders.push(progress);
          expect(frame.lifecycle).toBe(context.lifecycle);
          element.dataset.progress = progress.toFixed(2);
        },
        finish
      };
    }, { duration: 100, easing: 'linear' });

    const performance = script(recipe).play(element);
    expect(pendingAnimationFrames()).toBe(1);
    runAnimationFrame(50);
    expect(element.dataset.progress).toBe('0.50');
    runAnimationFrame(100);
    expect(renders.at(-1)).toBe(1);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(performance.diagnostics).toMatchObject({ driverCount: 1, unitCount: 1, resourceCount: 1 });
    performance.stop().reset();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('rolls back driver setup and isolates mark handler errors', () => {
    const targets = [document.createElement('div'), document.createElement('div')];
    const cleanup = jest.fn();
    const failing = turb.driver(context => {
      context.lifecycle.cleanup(cleanup);
      if (context.index === 1) throw new Error('driver setup failed');
      return () => {};
    }, { duration: 100 });
    expect(() => script(failing).play(targets)).toThrow('driver setup failed');
    expect(cleanup).toHaveBeenCalledTimes(2);

    const onError = jest.fn();
    const marked = script(turb.sequence(
      turb.track({ opacity: [0, 1] }, { duration: 50 }),
      turb.mark('ready', { source: 'test' }),
      turb.wait(50)
    )).play(targets[0], { autoplay: false, onError });
    const healthy = jest.fn();
    marked.on('mark', () => { throw new Error('handler failed'); });
    marked.on('mark', healthy);
    marked.play();
    runAnimationFrame(50);
    expect(healthy).toHaveBeenCalledWith(expect.objectContaining({ name: 'ready', time: 50 }), marked);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(marked.state).toBe('playing');
  });

  test('marks emit once forward, only opt-in on seek, never on reverse, and again on replay', async () => {
    const element = document.createElement('div');
    const performance = script(turb.sequence(
      turb.mark('start'),
      turb.wait(50),
      turb.mark('middle'),
      turb.wait(50)
    )).play(element, { autoplay: false });
    const marks = [];
    performance.on('mark', event => marks.push(event.name));

    performance.seek(75);
    expect(marks).toEqual([]);
    performance.reset();
    performance.play();
    runAnimationFrame(0);
    runAnimationFrame(50);
    runAnimationFrame(100);
    expect(marks).toEqual(['start', 'middle']);

    performance.reverse();
    runAnimationFrame(150);
    runAnimationFrame(200);
    expect(marks).toEqual(['start', 'middle']);

    performance.replay();
    runAnimationFrame(200);
    runAnimationFrame(250);
    runAnimationFrame(300);
    expect(marks).toEqual(['start', 'middle', 'start', 'middle']);

    const reduced = script(turb.sequence(turb.mark('a'), turb.wait(10), turb.mark('b')))
      .play(element, { autoplay: false, respectReducedMotion: true });
    const reducedMarks = [];
    reduced.on('mark', event => reducedMarks.push(event.name));
    window.matchMedia.mockReturnValue({ matches: true });
    reduced.play();
    await Promise.resolve();
    expect(reducedMarks).toEqual(['a', 'b']);
    expect(reduced.state).toBe('completed');
  });

  test('mixed driver capabilities reject controls before mutation', () => {
    const element = document.createElement('div');
    const performance = script(turb.parallel(
      turb.track({ opacity: [0, 1] }, { duration: 100 }),
      turb.driver(() => () => {}, {
        duration: 100, reversible: false, seekable: false, pausable: false, finishable: false
      })
    )).play(element);
    expect(performance.capabilities).toMatchObject({ reverse: false, seek: false, pause: false, finish: false });
    expect(() => performance.pause()).toThrow('pause');
    expect(performance.state).toBe('playing');
    expect(() => performance.seek(50)).toThrow('seek');
    expect(() => performance.reverse()).toThrow('reverse');
    expect(() => performance.finish()).toThrow('finish');
    performance.stop();
  });
});
