import { drag } from '../../src/interact';

function key(target, value) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
}

function fixture() {
  const target = document.createElement('div');
  document.body.append(target);
  Object.defineProperties(target, { offsetWidth: { value: 50 }, offsetHeight: { value: 50 } });
  target.getBoundingClientRect = () => ({ left: 100, top: 100, right: 150, bottom: 150, width: 50, height: 50 });
  return target;
}

describe('keyboard drag', () => {
  test('provides pickup, movement, drop, focus preservation, and host-localized announcements', async () => {
    const target = fixture();
    target.tabIndex = 0;
    target.focus();
    const announce = jest.fn();
    const onDrop = jest.fn();
    const session = drag(target, {
      follow: 'direct', keyboardStep: 20, grid: 10, settleDuration: 0,
      announce, canDrop: () => true, onDrop
    });
    key(target, ' ');
    expect(session.state).toBe('lifted');
    expect(target.getAttribute('aria-grabbed')).toBe('true');
    key(target, 'ArrowRight');
    key(target, 'ArrowDown');
    expect(session.diagnostics).toMatchObject({ x: 20, y: 20, keyboard: 1 });
    key(target, 'Enter');
    await Promise.resolve();
    await Promise.resolve();
    runAnimationFrame(0);
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ keyboard: true, position: { x: 20, y: 20 } }));
    expect(document.activeElement).toBe(target);
    expect(target.hasAttribute('aria-grabbed')).toBe(false);
    expect(announce.mock.calls.map(([event]) => event.messageKey)).toEqual(expect.arrayContaining(['drag.pickup', 'drag.move', 'drag.committed']));
    session.destroy();
  });

  test('supports Home/End and Escape with reduced-motion semantic parity', async () => {
    window.matchMedia.mockReturnValue({ matches: true });
    const target = fixture();
    const onCancel = jest.fn();
    const session = drag(target, {
      bounds: { left: 0, top: 0, right: 300, bottom: 300 },
      follow: 'direct', onCancel
    });
    key(target, 'Enter');
    key(target, 'End');
    expect(session.diagnostics).toMatchObject({ x: 150, y: 150 });
    key(target, 'Home');
    expect(session.diagnostics).toMatchObject({ x: -100, y: -100 });
    key(target, 'Escape');
    await Promise.resolve();
    expect(session.state).toBe('idle');
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'escape', keyboard: true }));
    expect(pendingAnimationFrames()).toBe(0);
    session.destroy();
  });
});
