import { drag } from '../../src/interact';

function pointer(type, values = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries({ pointerId: 1, pointerType: 'mouse', button: 0, isPrimary: true, clientX: 100, clientY: 100, timeStamp: 0, ...values })
    .forEach(([name, value]) => Object.defineProperty(event, name, { value }));
  return event;
}

describe('drag geometry', () => {
  test('normalizes transformed coordinates, axis, grid, bounds, scroll, and velocity', () => {
    const target = document.createElement('div');
    document.body.append(target);
    Object.defineProperties(target, { offsetWidth: { value: 50 }, offsetHeight: { value: 25 } });
    target.getBoundingClientRect = () => ({ left: 100, top: 100, right: 200, bottom: 150, width: 100, height: 50 });
    target.setPointerCapture = jest.fn();
    target.hasPointerCapture = jest.fn(() => true);
    target.releasePointerCapture = jest.fn();
    const moves = [];
    const session = drag(target, {
      follow: 'direct', axis: 'x', grid: 10,
      bounds: { left: 80, top: 80, right: 260, bottom: 180 },
      onMove: context => moves.push(context.position)
    });
    target.dispatchEvent(pointer('pointerdown'));
    document.dispatchEvent(pointer('pointermove', { clientX: 145, clientY: 140, timeStamp: 20 }));
    expect(session.diagnostics.x).toBe(20);
    expect(session.diagnostics.y).toBe(0);
    expect(session.diagnostics.velocityX).toBe(1);
    expect(moves.at(-1)).toEqual({ x: 20, y: 0 });
    session.cancel();
    runAnimationFrame(300);
    session.destroy();
  });

  test('caches drop-zone geometry, supports magnetic drops, and bounds auto-scroll', async () => {
    const target = document.createElement('div');
    const zone = document.createElement('div');
    document.body.append(target, zone);
    Object.defineProperties(target, { offsetWidth: { value: 20 }, offsetHeight: { value: 20 } });
    target.getBoundingClientRect = () => ({ left: 10, top: 10, right: 30, bottom: 30, width: 20, height: 20 });
    const zoneRect = jest.fn(() => ({ left: 80, top: 80, right: 120, bottom: 120, width: 40, height: 40 }));
    zone.getBoundingClientRect = zoneRect;
    target.setPointerCapture = jest.fn();
    target.hasPointerCapture = jest.fn(() => true);
    target.releasePointerCapture = jest.fn();
    window.scrollBy = jest.fn();
    const onDrop = jest.fn();
    const session = drag(target, {
      follow: 'direct', settleDuration: 0, dropZones: [zone], magneticDistance: 40,
      autoScroll: { edge: 30, speed: 9 }, onDrop
    });
    target.dispatchEvent(pointer('pointerdown', { clientX: 20, clientY: 20 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 75, clientY: 100 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 5, clientY: 5 }));
    expect(window.scrollBy).toHaveBeenCalledWith({ left: -9, top: -9, behavior: 'auto' });
    expect(zoneRect).toHaveBeenCalledTimes(1);
    document.dispatchEvent(pointer('pointerup', { clientX: 75, clientY: 100 }));
    await Promise.resolve();
    await Promise.resolve();
    runAnimationFrame(0);
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ zone }));
    expect(session.state).toBe('idle');
    session.destroy();
  });
});
