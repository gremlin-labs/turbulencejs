import { drag } from '../../src/interact';

function pointer(type, values = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries({
    pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true,
    clientX: 10, clientY: 10, timeStamp: 0,
    ...values
  }).forEach(([name, value]) => Object.defineProperty(event, name, { value }));
  return event;
}

function draggable() {
  const target = document.createElement('button');
  target.style.transform = 'rotate(2deg)';
  document.body.append(target);
  Object.defineProperties(target, { offsetWidth: { value: 100 }, offsetHeight: { value: 40 } });
  target.getBoundingClientRect = () => ({ left: 10, top: 10, right: 110, bottom: 50, width: 100, height: 40 });
  target.setPointerCapture = jest.fn();
  target.hasPointerCapture = jest.fn(() => true);
  target.releasePointerCapture = jest.fn();
  return target;
}

describe('pointer drag', () => {
  test('captures one pointer, follows without committing data, validates, and settles cleanly', async () => {
    const target = draggable();
    const onDrop = jest.fn();
    const states = [];
    const session = drag(target, {
      follow: 'direct', settleDuration: 100,
      canDrop: () => true, onDrop,
      onDragStateChange: state => states.push(state)
    });
    target.dispatchEvent(pointer('pointerdown'));
    expect(session.state).toBe('armed');
    expect(target.setPointerCapture).toHaveBeenCalledWith(1);
    document.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 30, timeStamp: 16 }));
    expect(session.state).toBe('dragging');
    expect(target.style.transform).toContain('translate3d(40px, 20px, 0px)');
    document.dispatchEvent(pointer('pointerup', { clientX: 50, clientY: 30, timeStamp: 20 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0].target).toBe(target);
    expect(onDrop.mock.calls[0][0].zone).toBeNull();
    expect(onDrop.mock.calls[0][0].keyboard).toBe(false);
    expect(target.releasePointerCapture).toHaveBeenCalledWith(1);
    runAnimationFrame(100);
    expect(session.state).toBe('idle');
    expect(target.style.transform).toBe('rotate(2deg)');
    expect(states).toEqual(expect.arrayContaining(['armed', 'lifted', 'dragging', 'validating', 'committed', 'settling', 'idle']));
    session.destroy();
    expect(session.state).toBe('destroyed');
    expect(session.diagnostics.listenerCount).toBe(0);
  });

  test('rejects invalid and thrown drops without calling the host commit', async () => {
    for (const canDrop of [() => false, () => { throw new Error('validation failed'); }]) {
      const target = draggable();
      const onDrop = jest.fn();
      const onReject = jest.fn();
      const onError = jest.fn();
      const session = drag(target, { follow: 'direct', settleDuration: 0, canDrop, onDrop, onReject, onError });
      target.dispatchEvent(pointer('pointerdown'));
      document.dispatchEvent(pointer('pointermove', { clientX: 40 }));
      document.dispatchEvent(pointer('pointerup', { clientX: 40 }));
      await Promise.resolve();
      await Promise.resolve();
      runAnimationFrame(0);
      expect(onDrop).not.toHaveBeenCalled();
      expect(onReject).toHaveBeenCalledTimes(1);
      if (canDrop.toString().includes('throw')) expect(onError).toHaveBeenCalledTimes(1);
      expect(session.state).toBe('idle');
      session.destroy();
    }
  });

  test('aborts stale async validation and handles pointer loss, cancellation, and extra pointers', async () => {
    const target = draggable();
    let resolveDrop;
    const canDrop = jest.fn(() => new Promise(resolve => { resolveDrop = resolve; }));
    const onDrop = jest.fn();
    const session = drag(target, { follow: 'direct', settleDuration: 0, canDrop, onDrop });
    target.dispatchEvent(pointer('pointerdown'));
    target.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 20 }));
    expect(target.setPointerCapture).toHaveBeenCalledTimes(1);
    document.dispatchEvent(pointer('pointermove', { clientX: 30 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 30 }));
    expect(session.state).toBe('validating');
    session.cancel('host-cancel');
    resolveDrop(true);
    await Promise.resolve();
    await Promise.resolve();
    runAnimationFrame(0);
    expect(onDrop).not.toHaveBeenCalled();
    expect(session.state).toBe('idle');

    target.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 30 }));
    target.dispatchEvent(pointer('lostpointercapture'));
    runAnimationFrame(0);
    expect(session.state).toBe('idle');
    session.destroy();
  });

  test('ghost and layer strategies restore all temporary DOM on interruption', () => {
    for (const strategy of ['ghost', 'layer']) {
      const target = draggable();
      const session = drag(target, { strategy, follow: 'direct', settleDuration: 0 });
      target.dispatchEvent(pointer('pointerdown'));
      document.dispatchEvent(pointer('pointermove', { clientX: 30 }));
      expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
      document.dispatchEvent(pointer('pointercancel'));
      runAnimationFrame(0);
      expect(session.state).toBe('idle');
      expect(target.style.visibility).toBe('');
      expect(target.parentElement).toBe(document.body);
      session.destroy();
    }
  });

  test('default spring follow consumes the Turbulence timeline clock and external abort tears down immediately', () => {
    const target = draggable();
    const abortController = new AbortController();
    const session = drag(target, { signal: abortController.signal });
    target.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 70, clientY: 40 }));
    expect(pendingAnimationFrames()).toBe(1);
    runAnimationFrame(16);
    expect(target.style.transform).toContain('translate3d');
    abortController.abort();
    expect(session.state).toBe('destroyed');
    expect(target.style.transform).toBe('rotate(2deg)');
    expect(target.style.touchAction).toBeFalsy();
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('host commit errors reject visually and target removal cancels safely', async () => {
    const target = draggable();
    const onError = jest.fn();
    const onReject = jest.fn();
    const session = drag(target, {
      follow: 'direct', settleDuration: 0, onError, onReject,
      onDrop: () => { throw new Error('host commit failed'); }
    });
    target.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 30 }));
    document.dispatchEvent(pointer('pointerup', { clientX: 30 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(session.state).toBe('idle');

    target.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 30 }));
    target.remove();
    document.dispatchEvent(pointer('pointermove', { clientX: 40 }));
    runAnimationFrame(300);
    expect(session.state).toBe('idle');
    session.destroy();
  });
});
