import { turb } from '../../src/turbscript';
import { hover } from '../../src/interact';

function pointer(type, pointerType = 'mouse', relatedTarget = null) {
  const event = new Event(type, { bubbles: type === 'pointerover' || type === 'pointerout' });
  Object.defineProperties(event, {
    pointerType: { value: pointerType },
    relatedTarget: { value: relatedTarget }
  });
  return event;
}

describe('hover interaction', () => {
  beforeEach(() => {
    window.matchMedia.mockImplementation(query => ({
      matches: query.includes('hover: hover'), media: query,
      addEventListener: jest.fn(), removeEventListener: jest.fn()
    }));
  });

  test('plays enter/leave Turbs with focus parity and cleans rapid churn', () => {
    const target = document.createElement('button');
    document.body.append(target);
    const session = hover(target, {
      enter: turb.track({ scale: [1, 1.08] }, { duration: 100, easing: 'linear' }),
      leave: turb.track({ scale: [1.08, 1] }, { duration: 100, easing: 'linear' }),
      interruption: 'reverse'
    });
    for (let index = 0; index < 10; index += 1) {
      target.dispatchEvent(pointer('pointerenter'));
      runAnimationFrame(index * 10 + 5);
      target.dispatchEvent(pointer('pointerleave'));
    }
    expect(session.diagnostics.lastPointerType).toBe('mouse');
    expect(session.diagnostics.activePerformances).toBeLessThanOrEqual(1);
    target.dispatchEvent(new FocusEvent('focusin'));
    runAnimationFrame(200);
    target.dispatchEvent(new FocusEvent('focusout'));
    session.destroy();
    expect(session.diagnostics.activePerformances).toBe(0);
    expect(pendingAnimationFrames()).toBe(0);
  });

  test('ignores touch by default, supports reduced motion, and reports factory errors', async () => {
    const target = document.createElement('button');
    document.body.append(target);
    const onError = jest.fn();
    const factory = jest.fn(() => { throw new Error('bad hover'); });
    const session = hover(target, { enter: factory, onError });
    target.dispatchEvent(pointer('pointerenter', 'touch'));
    expect(factory).not.toHaveBeenCalled();
    target.dispatchEvent(pointer('pointerenter', 'mouse'));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERACTION_FACTORY_FAILED' }), session);
    session.destroy();

    window.matchMedia.mockReturnValue({ matches: true });
    const reduced = hover(target, {
      forceHover: true,
      enter: turb.track({ scale: [1, 1.1] }, { duration: 100 }),
      leave: turb.track({ scale: [1.1, 1] }, { duration: 100 })
    });
    target.dispatchEvent(pointer('pointerenter'));
    await Promise.resolve();
    expect(pendingAnimationFrames()).toBe(0);
    reduced.destroy();
  });

  test('delegates to dynamic children and queue-latest avoids overlap', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const session = hover('.dynamic-hover', {
      root, delegate: true, forceHover: true, interruption: 'queue-latest',
      enter: turb.track({ opacity: [0.5, 1] }, { duration: 100 }),
      leave: turb.track({ opacity: [1, 0.5] }, { duration: 100 })
    });
    const child = document.createElement('button');
    child.className = 'dynamic-hover';
    root.append(child);
    child.dispatchEvent(pointer('pointerover'));
    child.dispatchEvent(pointer('pointerout'));
    expect(session.diagnostics.targetCount).toBe(1);
    expect(session.diagnostics.activePerformances).toBe(1);
    runAnimationFrame(100);
    expect(session.diagnostics.activePerformances).toBe(1);
    runAnimationFrame(200);
    expect(session.diagnostics.activePerformances).toBe(0);
    child.remove();
    session.destroy();
    expect(session.diagnostics.targetCount).toBe(0);
  });

  test('finish/ignore/restart policies and global cancellation paths remain usable', () => {
    const target = document.createElement('button');
    document.body.append(target);
    for (const interruption of ['finish', 'ignore', 'restart']) {
      const session = hover(target, {
        forceHover: true, interruption,
        enter: turb.track({ opacity: [0, 1] }, { duration: 100 }),
        leave: turb.track({ opacity: [1, 0] }, { duration: 100 })
      });
      target.dispatchEvent(pointer('pointerenter'));
      target.dispatchEvent(pointer('pointerleave'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new Event('blur'));
      session.destroy();
      expect(pendingAnimationFrames()).toBe(0);
    }
  });

  test('drops a target removed during settlement without global observation', () => {
    const target = document.createElement('button');
    document.body.append(target);
    const session = hover(target, {
      forceHover: true,
      enter: turb.track({ opacity: [0, 1] }, { duration: 100 })
    });
    target.dispatchEvent(pointer('pointerenter'));
    target.remove();
    runAnimationFrame(100);
    expect(session.diagnostics).toMatchObject({ targetCount: 0, activePerformances: 0 });
    session.destroy();
  });
});
