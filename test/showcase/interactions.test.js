import { createShowcaseInteractions } from '../../examples/showcase/src/components';

function fixture() {
  document.body.innerHTML = `
    <aside data-sidebar></aside>
    <button data-action="toggle-sidebar" data-sidebar-toggle aria-expanded="true"></button>
    <div data-account-control>
      <button data-action="toggle-account" data-account-toggle aria-expanded="false"></button>
      <div data-account-menu hidden><button role="menuitem">Profile</button></div>
    </div>
    <div data-filter-control>
      <button data-action="toggle-filter" data-filter-toggle aria-expanded="false"></button>
      <div data-filter-menu hidden><button data-filter-value="Last 30 days">Last 30 days</button></div>
    </div>
    <button class="intro-trigger" data-action="open-modal">Create report</button>
    <button data-action="open-command">Command</button>
    <div data-toast-region></div>
    <div data-report-modal role="dialog" aria-hidden="true" hidden>
      <button data-action="close-dialog" tabindex="-1">Backdrop</button>
      <div data-dialog-panel>
        <button data-action="close-dialog">Close</button>
        <form data-report-form>
          <input name="reportName" aria-describedby="form-error">
          <p id="form-error" data-form-error></p>
          <button type="submit">Create report</button>
        </form>
      </div>
    </div>
    <div data-command-dialog role="dialog" aria-hidden="true" hidden>
      <button data-action="close-dialog" tabindex="-1">Backdrop</button>
      <div data-dialog-panel>
        <input aria-label="Search motion commands" autofocus>
        <button data-profile="quiet">Quiet</button><button data-profile="waterfall">Waterfall</button><button data-profile="sproing">Sproing</button>
        <button data-profile="slam">Slam</button><button data-profile="glitch">Glitch</button><button data-profile="zeroGravity">Zero Gravity</button>
        <button data-action="close-dialog">Close</button>
      </div>
    </div>
  `;
}

function mockTurbulence() {
  const animate = jest.fn((_element, _properties, options = {}) => {
    const controller = { stop: jest.fn() };
    if (options.onComplete) queueMicrotask(() => options.onComplete());
    return controller;
  });
  return {
    animate,
    motion: { options: (_role, options = {}) => options },
    buttons: { click: jest.fn(() => ({ stop() {} })), jelly: jest.fn(() => ({ stop() {} })) },
    dialogs: { elasticZoom: jest.fn(() => ({ stop() {} })) },
    dropdowns: {
      fanItems: jest.fn(() => ({ stop() {} })),
      explosiveExpand: jest.fn((_element, options = {}) => {
        if (options.onComplete) queueMicrotask(() => options.onComplete());
        return { stop() {} };
      })
    },
    forms: { errorWobble: jest.fn(() => ({ stop() {} })) },
    loading: { dots: jest.fn(() => ({ stop: jest.fn() })) },
    toasts: {
      slideInBounce: jest.fn((_element, options = {}) => {
        if (options.onComplete) queueMicrotask(() => options.onComplete());
        return { stop() {} };
      })
    }
  };
}

function setup() {
  fixture();
  const turbulencejs = mockTurbulence();
  const motionRunner = { run: jest.fn(), reset: jest.fn(), setProfile: jest.fn(), setIntensity: jest.fn() };
  const interactions = createShowcaseInteractions({ turbulencejs, root: document, view: window, motionRunner });
  return { turbulencejs, motionRunner, interactions };
}

describe('showcase interactions', () => {
  test('account menu exposes its expanded state and Escape closes it', () => {
    setup();
    const button = document.querySelector('[data-account-toggle]');
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-account-menu]').hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-account-menu]').hidden).toBe(true);
  });

  test('keyboard shortcut opens command dialog and Escape restores trigger focus', async () => {
    const { motionRunner } = setup();
    const trigger = document.querySelector('[data-action="open-command"]');
    trigger.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    expect(document.querySelector('[data-command-dialog]').hidden).toBe(false);
    expect(document.querySelector('[data-command-dialog]').getAttribute('aria-hidden')).toBe('false');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    expect(motionRunner.setProfile).toHaveBeenCalledWith('sproing');
    expect(document.activeElement.dataset.profile).toBe('sproing');

    const lastControl = document.querySelector('[data-command-dialog] [data-action="close-dialog"]:last-child');
    lastControl.focus();
    lastControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Search motion commands');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.resolve();
    expect(document.querySelector('[data-command-dialog]').hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  test('report validation is semantic and successful toast cleanup is owned', async () => {
    jest.useFakeTimers();
    const { interactions, turbulencejs } = setup();
    const trigger = document.querySelector('.intro-trigger');
    interactions.openModal(trigger);
    document.querySelector('[data-report-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const input = document.querySelector('[name="reportName"]');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('[data-form-error]').textContent).toContain('Give the shareholder letter a title');
    expect(turbulencejs.forms.errorWobble).toHaveBeenCalledWith(input, expect.objectContaining({ onComplete: expect.any(Function), onCancel: expect.any(Function) }));

    const toast = interactions.showToast('success', 'Saved for testing.');
    expect(toast.isConnected).toBe(true);
    toast.querySelector('[data-dismiss-toast]').click();
    jest.runAllTicks();
    await Promise.resolve();
    expect(toast.isConnected).toBe(false);
    interactions.destroy();
    jest.useRealTimers();
  });

  test('destroy stops owned work and removes interaction listeners', () => {
    const { interactions, motionRunner } = setup();
    interactions.destroy();
    document.querySelector('[data-action="open-command"]').click();
    expect(document.querySelector('[data-command-dialog]').hidden).toBe(true);
    expect(motionRunner.run).not.toHaveBeenCalled();
  });

  test('switching away from loading cancels its owned loader', () => {
    document.body.innerHTML = '<div data-preview-state="loading"><span data-loading-dots></span></div><div data-preview-state="success" hidden></div>';
    const turbulencejs = mockTurbulence();
    const motionRunner = { run: jest.fn(), reset: jest.fn(), setProfile: jest.fn(), setIntensity: jest.fn() };
    const interactions = createShowcaseInteractions({ turbulencejs, root: document, view: window, motionRunner });
    interactions.setPreviewState('loading');
    const loader = turbulencejs.loading.dots.mock.results[0].value;
    interactions.setPreviewState('success');
    expect(loader.stop).toHaveBeenCalledTimes(1);
    interactions.destroy();
  });
});
