import { explode, poof, ripple, shockwave } from '../../src/animations/buttons';
import { glitchIn } from '../../src/animations/dialogs';
import { explosiveExpand, fanItems } from '../../src/animations/dropdowns';
import { highlight } from '../../src/animations/forms';
import { dots } from '../../src/animations/loading';
import { popAndWiggle } from '../../src/animations/toasts';

describe('effect lifecycle', () => {
  test('stopping a ripple removes its node and restores host styles', () => {
    const button = document.createElement('button');
    button.style.position = 'static';
    button.style.overflow = 'visible';
    button.getBoundingClientRect = () => ({ width: 100, height: 40 });
    document.body.appendChild(button);

    const controller = ripple(button, { duration: 100 });
    expect(button.children).toHaveLength(1);
    controller.stop();

    expect(button.children).toHaveLength(0);
    expect(button.style.position).toBe('static');
    expect(button.style.overflow).toBe('visible');
  });

  test('dropdown completion keeps internal cleanup and calls the user callback once', async () => {
    const dropdown = document.createElement('div');
    dropdown.style.overflow = 'visible';
    dropdown.style.height = '20px';
    Object.defineProperty(dropdown, 'offsetHeight', { value: 20 });
    const onComplete = jest.fn();

    explosiveExpand(dropdown, { duration: 0, reverse: true, onComplete });
    await Promise.resolve();

    expect(dropdown.style.overflow).toBe('visible');
    expect(dropdown.style.display).toBe('none');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('stopping a dropdown restores its temporary styles', () => {
    const dropdown = document.createElement('div');
    dropdown.style.overflow = 'visible';
    dropdown.style.height = '20px';
    dropdown.style.opacity = '1';
    Object.defineProperty(dropdown, 'offsetHeight', { value: 20 });

    const controller = explosiveExpand(dropdown, { duration: 100, reverse: true });
    controller.stop();

    expect(dropdown.style.overflow).toBe('visible');
    expect(dropdown.style.height).toBe('20px');
    expect(dropdown.style.opacity).toBe('1');
  });

  test('stopping a shockwave removes its temporary node and host mutation', () => {
    const button = document.createElement('button');
    button.style.position = 'static';
    document.body.appendChild(button);
    const controller = shockwave(button, { duration: 100 });
    expect(button.children).toHaveLength(1);
    controller.stop();
    expect(button.children).toHaveLength(0);
    expect(button.style.position).toBe('static');
  });

  test('a user callback cannot replace form-highlight cleanup', async () => {
    const input = document.createElement('input');
    input.style.backgroundColor = 'red';
    const onComplete = jest.fn();
    highlight(input, { duration: 0, color: 'blue', onComplete });
    await Promise.resolve();
    expect(input.style.backgroundColor).toBe('red');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('stopping a glitch clears owned timers and restores styles', () => {
    jest.useFakeTimers();
    const dialog = document.createElement('div');
    dialog.style.transform = 'scale(2)';
    dialog.style.filter = 'contrast(2)';
    const controller = glitchIn(dialog, { duration: 100 });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    controller.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(dialog.style.transform).toBe('scale(2)');
    expect(dialog.style.filter).toBe('contrast(2)');
    jest.useRealTimers();
  });

  test('stopping generated loading dots removes owned nodes and restores the container', () => {
    const container = document.createElement('div');
    container.style.display = 'block';
    const controller = dots(container, { count: 3 });
    expect(container.children).toHaveLength(3);
    controller.stop();
    expect(container.children).toHaveLength(0);
    expect(container.style.display).toBe('block');
  });

  test('stopping grouped dropdown items restores each item', () => {
    const container = document.createElement('ul');
    const item = document.createElement('li');
    item.style.opacity = '0.8';
    item.style.transform = 'rotate(5deg)';
    container.appendChild(item);
    const controller = fanItems(container, { duration: 100 });
    controller.stop();
    expect(item.style.opacity).toBe('0.8');
    expect(item.style.transform).toBe('rotate(5deg)');
  });

  test('legacy pop-and-wiggle owns and stops both composite phases', () => {
    const toast = document.createElement('div');
    const onCancel = jest.fn();
    const controller = popAndWiggle(toast, { duration: 700, onCancel });
    runAnimationFrame(100);
    controller.stop();
    expect(controller.state).toBe('cancelled');
    expect(controller.diagnostics.activeOwnedWork).toBe(0);
    expect(pendingAnimationFrames()).toBe(0);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('legacy particle presets use one bounded aggregate canvas and clean on cancellation', () => {
    jest.useFakeTimers();
    const context = {
      clearRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(),
      globalAlpha: 1, fillStyle: ''
    };
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const button = document.createElement('button');
    document.body.append(button);
    button.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 40 });
    const explodeCancel = jest.fn();
    const exploding = explode(button, { particles: true, particleCount: 900, seed: 'stable', onCancel: explodeCancel });
    jest.advanceTimersByTime(150);
    expect(document.querySelectorAll('[data-turbulencejs-aggregate-particles]')).toHaveLength(1);
    expect(document.querySelectorAll('.turbulencejs-particle')).toHaveLength(0);
    exploding.stop();
    expect(document.querySelector('[data-turbulencejs-aggregate-particles]')).toBeNull();
    expect(explodeCancel).toHaveBeenCalledTimes(1);

    const poofCancel = jest.fn();
    const poofing = poof(button, { seed: 'stable', onCancel: poofCancel });
    expect(document.querySelectorAll('[data-turbulencejs-aggregate-particles]')).toHaveLength(1);
    poofing.stop();
    expect(document.querySelector('[data-turbulencejs-aggregate-particles]')).toBeNull();
    expect(poofCancel).toHaveBeenCalledTimes(1);
    expect(pendingAnimationFrames()).toBe(0);
    jest.useRealTimers();
  });
});
