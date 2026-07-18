import { createInteractionSession } from '../../src/interact/session';

describe('interaction session', () => {
  test('owns listeners, styles, attributes, live values, pointer capture, and focus restoration', () => {
    const trigger = document.createElement('button');
    const target = document.createElement('div');
    document.body.append(trigger, target);
    trigger.focus();
    target.style.cursor = 'grab';
    target.setAttribute('aria-grabbed', 'false');
    target.setPointerCapture = jest.fn();
    target.hasPointerCapture = jest.fn(() => true);
    target.releasePointerCapture = jest.fn();
    const listener = jest.fn();
    const session = createInteractionSession().rememberFocus(trigger).addTarget(target);
    session.ownStyle(target, ['cursor']);
    session.ownAttribute(target, 'aria-grabbed');
    session.listen(target, 'custom', listener);
    session.capturePointer(target, 7);
    session.setLiveValue('x', 42);
    target.style.cursor = 'grabbing';
    target.setAttribute('aria-grabbed', 'true');
    target.dispatchEvent(new Event('custom'));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getLiveValue('x')).toBe(42);
    expect(session.diagnostics).toMatchObject({ targetCount: 1, listenerCount: 1, capturedPointerCount: 1 });
    session.destroy().destroy();
    expect(target.style.cursor).toBe('grab');
    expect(target.getAttribute('aria-grabbed')).toBe('false');
    expect(target.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(document.activeElement).toBe(trigger);
    expect(session.diagnostics).toMatchObject({ state: 'destroyed', listenerCount: 0, cleanupCount: 0 });
  });

  test('suspends, resumes, cancels performances, and reacts to external abort once', async () => {
    const abortController = new AbortController();
    const performance = { state: 'playing', capabilities: { pause: true }, pause: jest.fn(), resume: jest.fn(), stop: jest.fn() };
    const onDestroy = jest.fn();
    const session = createInteractionSession({ signal: abortController.signal, onDestroy });
    session.ownPerformance(performance);
    session.suspend();
    expect(performance.pause).toHaveBeenCalled();
    performance.state = 'paused';
    session.resume();
    expect(performance.resume).toHaveBeenCalled();
    abortController.abort();
    await Promise.resolve();
    expect(performance.stop).toHaveBeenCalledTimes(1);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(session.state).toBe('destroyed');
  });

  test('continues teardown when an owned cleanup throws', () => {
    const onError = jest.fn();
    const healthy = jest.fn();
    const session = createInteractionSession({ onError });
    session.cleanup(healthy);
    session.cleanup(() => { throw new Error('cleanup failed'); });
    session.destroy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);
  });
});
