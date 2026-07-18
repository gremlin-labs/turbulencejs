const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function createShowcaseInteractions({ turbulencejs, root = document, view = window, motionRunner }) {
  const activeControllers = new Set();
  const timers = new Set();
  const toastTimers = new Map();
  let activeDialog = null;
  let dialogTrigger = null;
  let previewLoader = null;

  function publishDiagnostics() {
    if (!root.documentElement) return;
    root.documentElement.dataset.interactionControllers = String(activeControllers.size);
    root.documentElement.dataset.interactionTimers = String(timers.size);
  }

  const sidebar = root.querySelector('[data-sidebar]');
  const sidebarToggle = root.querySelector('[data-sidebar-toggle]');
  const mobileSidebarToggle = root.querySelector('.mobile-menu-button');
  const accountButton = root.querySelector('[data-account-toggle]');
  const accountMenu = root.querySelector('[data-account-menu]');
  const filterButton = root.querySelector('[data-filter-toggle]');
  const filterMenu = root.querySelector('[data-filter-menu]');
  const modal = root.querySelector('[data-report-modal]');
  const commandDialog = root.querySelector('[data-command-dialog]');
  const toastRegion = root.querySelector('[data-toast-region]');

  function own(controller) {
    if (controller) activeControllers.add(controller);
    publishDiagnostics();
    return controller;
  }

  function release(controller) {
    activeControllers.delete(controller);
    publishDiagnostics();
  }

  function startOwned(factory) {
    let controller;
    const settle = () => release(controller);
    controller = factory(settle);
    return own(controller);
  }

  function reducedOptions(options = {}) {
    return root.documentElement?.dataset.reducedMotion === 'true'
      ? { ...options, duration: 0, delay: 0 }
      : options;
  }

  function schedule(callback, delay) {
    const timer = view.setTimeout(() => {
      timers.delete(timer);
      publishDiagnostics();
      callback();
    }, delay);
    timers.add(timer);
    publishDiagnostics();
    return timer;
  }

  function closeMenu(button, menu) {
    if (!button || !menu || menu.hidden) return;
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }

  function toggleAccountMenu() {
    if (!accountButton || !accountMenu) return;
    const opening = accountMenu.hidden;
    closeMenu(filterButton, filterMenu);
    accountButton.setAttribute('aria-expanded', String(opening));
    accountMenu.hidden = !opening;
    if (opening) startOwned(settle => turbulencejs.dropdowns.fanItems(accountMenu, reducedOptions({
      itemSelector: '[role="menuitem"]', duration: 260, staggerDelay: 25, onComplete: settle, onCancel: settle
    })));
  }

  function toggleFilterMenu() {
    if (!filterButton || !filterMenu) return;
    const opening = filterMenu.hidden;
    closeMenu(accountButton, accountMenu);
    filterButton.setAttribute('aria-expanded', String(opening));
    if (opening) {
      filterMenu.hidden = false;
      filterMenu.style.display = 'block';
    }
    startOwned(settle => turbulencejs.dropdowns.explosiveExpand(filterMenu, reducedOptions({
      reverse: !opening,
      duration: opening ? 360 : 220,
      onComplete: () => {
        if (!opening) filterMenu.hidden = true;
        settle();
      },
      onCancel: settle
    })));
  }

  function dialogFocusable(dialog) {
    return Array.from(dialog.querySelectorAll(focusableSelector)).filter(element => !element.hidden && element.tabIndex >= 0);
  }

  function closeDialog(dialog = activeDialog, { restoreFocus = true } = {}) {
    if (!dialog || dialog.hidden) return;
    const restoreTarget = dialogTrigger;
    const panel = dialog.querySelector('[data-dialog-panel]');
    const finish = () => {
      dialog.hidden = true;
      dialog.setAttribute('aria-hidden', 'true');
      if (activeDialog === dialog) activeDialog = null;
      if (restoreFocus && restoreTarget?.isConnected) restoreTarget.focus();
      if (dialogTrigger === restoreTarget) dialogTrigger = null;
    };
    const controller = turbulencejs.animate(panel, { opacity: [1, 0], scale: [1, 0.96], y: [0, 8] }, reducedOptions({
      duration: 160,
      easing: 'easeInCubic',
      onComplete: () => { release(controller); finish(); },
      onCancel: finish
    }));
    own(controller);
  }

  function openDialog(dialog, trigger) {
    if (!dialog) return;
    if (activeDialog && activeDialog !== dialog) {
      activeDialog.hidden = true;
      activeDialog.setAttribute('aria-hidden', 'true');
      activeDialog = null;
      dialogTrigger = null;
    }
    dialogTrigger = trigger || root.activeElement;
    activeDialog = dialog;
    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    const panel = dialog.querySelector('[data-dialog-panel]');
    let controller;
    const settle = () => release(controller);
    controller = dialog === modal
      ? turbulencejs.dialogs.elasticZoom(panel, reducedOptions({ duration: 520, onComplete: settle, onCancel: settle }))
      : turbulencejs.animate(panel, { opacity: [0, 1], y: [-12, 0], scale: [0.98, 1] }, reducedOptions(turbulencejs.motion.options('stateEnter', { onComplete: settle, onCancel: settle })));
    own(controller);
    const focusTarget = dialog.querySelector('[autofocus]') || dialogFocusable(dialog)[0];
    view.requestAnimationFrame(() => focusTarget?.focus());
  }

  function openCommand(trigger) {
    const search = commandDialog?.querySelector('[aria-label="Search motion commands"]');
    if (search) search.value = '';
    commandDialog?.querySelectorAll('[data-profile]').forEach(profile => { profile.hidden = false; });
    openDialog(commandDialog, trigger);
  }

  function openModal(trigger) {
    const form = modal?.querySelector('form');
    form?.reset();
    const error = modal?.querySelector('[data-form-error]');
    if (error) error.textContent = '';
    openDialog(modal, trigger);
  }

  function dismissToast(toast) {
    if (!toast?.isConnected || toast.dataset.leaving === 'true') return;
    toast.dataset.leaving = 'true';
    const timer = toastTimers.get(toast);
    if (timer !== undefined) {
      view.clearTimeout(timer);
      timers.delete(timer);
      toastTimers.delete(toast);
      publishDiagnostics();
    }
    const controller = turbulencejs.animate(toast, { opacity: [1, 0], x: [0, 28], scale: [1, 0.96] }, reducedOptions({
      duration: 180,
      easing: 'easeInCubic',
      onComplete: () => { release(controller); toast.remove(); },
      onCancel: () => toast.remove()
    }));
    own(controller);
  }

  function showToast(kind = 'success', message) {
    if (!toastRegion) return null;
    const copy = message || ({
      success: 'Delight dividend declared. Shareholders are cautiously thrilled.',
      warning: 'Your portfolio may be overexposed to tasteful wobble.',
      error: 'The motion market corrected. Your application state remains solvent.'
    }[kind] || 'A fresh motion opportunity just arrived.');
    const toast = root.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.dataset.toast = '';
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true"></span>
      <span><strong>${kind === 'success' ? 'All set' : kind === 'warning' ? 'Heads up' : 'Try again'}</strong><small>${copy}</small></span>
      <button class="icon-button toast-close" type="button" data-dismiss-toast aria-label="Dismiss notification">×</button>
    `;
    toastRegion.prepend(toast);
    const controller = turbulencejs.toasts.slideInBounce(toast, reducedOptions({
      direction: 'right',
      duration: 460,
      onComplete: () => release(controller)
    }));
    own(controller);
    const timer = schedule(() => {
      toastTimers.delete(toast);
      dismissToast(toast);
    }, 5000);
    toastTimers.set(toast, timer);
    return toast;
  }

  function setPreviewState(state) {
    if (previewLoader) {
      previewLoader.stop?.();
      release(previewLoader);
      previewLoader = null;
    }
    const panels = Array.from(root.querySelectorAll('[data-preview-state]'));
    panels.forEach(panel => { panel.hidden = panel.dataset.previewState !== state; });
    root.querySelectorAll('[data-state-action]').forEach(button => {
      const active = button.dataset.stateAction === state;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const target = panels.find(panel => !panel.hidden);
    if (target) startOwned(settle => turbulencejs.animate(target, { opacity: [0, 1], y: [8, 0] }, reducedOptions(turbulencejs.motion.options('stateEnter', { onComplete: settle, onCancel: settle }))));
    if (state === 'loading') {
      const dots = target?.querySelector('[data-loading-dots]');
      if (dots) {
        previewLoader = turbulencejs.loading.dots(dots, { count: 3, size: 6, color: '#b7f34a' });
        own(previewLoader);
      }
    }
  }

  function isMobileLayout() {
    return mobileSidebarToggle ? view.getComputedStyle(mobileSidebarToggle).display !== 'none' : false;
  }

  function syncSidebarMode() {
    if (!sidebar) return;
    const mobile = isMobileLayout();
    const open = sidebar.classList.contains('is-mobile-open');
    if (mobile && !open) {
      sidebar.setAttribute('aria-hidden', 'true');
      sidebar.inert = true;
    } else {
      sidebar.removeAttribute('aria-hidden');
      sidebar.inert = false;
    }
    if (sidebarToggle) sidebarToggle.setAttribute('aria-label', mobile ? 'Close navigation' : 'Collapse sidebar');
    if (!mobile) sidebar.classList.remove('is-mobile-open');
  }

  function toggleSidebar() {
    if (!sidebar || !sidebarToggle) return;
    const toggles = root.querySelectorAll('[data-sidebar-toggle]');
    const mobile = isMobileLayout();
    if (mobile) {
      const open = !sidebar.classList.contains('is-mobile-open');
      sidebar.classList.toggle('is-mobile-open', open);
      toggles.forEach(toggle => toggle.setAttribute('aria-expanded', String(open)));
      syncSidebarMode();
      view.requestAnimationFrame(() => (open ? sidebarToggle : mobileSidebarToggle)?.focus());
    } else {
      const collapsed = !sidebar.classList.contains('is-collapsed');
      sidebar.classList.toggle('is-collapsed', collapsed);
      toggles.forEach(toggle => toggle.setAttribute('aria-expanded', String(!collapsed)));
    }
    startOwned(settle => turbulencejs.buttons.click(sidebarToggle, reducedOptions({ onComplete: settle, onCancel: settle })));
  }

  function submitReport(form) {
    const nameInput = form.querySelector('[name="reportName"]');
    const error = form.querySelector('[data-form-error]');
    const submit = form.querySelector('[type="submit"]');
    if (!nameInput.value.trim()) {
      error.textContent = 'Give the shareholder letter a title before publishing it.';
      nameInput.setAttribute('aria-invalid', 'true');
      startOwned(settle => turbulencejs.forms.errorWobble(nameInput, reducedOptions({ onComplete: settle, onCancel: settle })));
      nameInput.focus();
      return;
    }
    nameInput.removeAttribute('aria-invalid');
    error.textContent = '';
    submit.disabled = true;
    submit.dataset.loading = 'true';
    schedule(() => {
      submit.disabled = false;
      delete submit.dataset.loading;
      closeDialog(modal);
      showToast('success', `“${nameInput.value.trim()}” is ready for long-term holders.`);
    }, 650);
  }

  function onClick(event) {
    const action = event.target.closest('[data-action]');
    const dismiss = event.target.closest('[data-dismiss-toast]');
    const profile = event.target.closest('[data-profile]');
    const intensity = event.target.closest('[data-intensity]');
    const stateAction = event.target.closest('[data-state-action]');
    const navLink = event.target.closest('.primary-nav a[href^="#"]');
    const menuItem = event.target.closest('[role="menuitem"]');
    const filterOption = event.target.closest('[data-filter-value]');

    if (dismiss) { dismissToast(dismiss.closest('[data-toast]')); return; }
    if (profile) { motionRunner.setProfile(profile.dataset.profile); return; }
    if (intensity) { motionRunner.setIntensity(intensity.dataset.intensity); return; }
    if (stateAction) { setPreviewState(stateAction.dataset.stateAction); return; }
    if (filterOption) {
      filterMenu.querySelectorAll('[data-filter-value]').forEach(option => option.classList.toggle('is-selected', option === filterOption));
      const label = filterButton.querySelector('[data-filter-label]');
      if (label) label.textContent = filterOption.dataset.filterValue;
      closeMenu(filterButton, filterMenu);
      startOwned(settle => turbulencejs.buttons.click(filterButton, reducedOptions({ onComplete: settle, onCancel: settle })));
      return;
    }
    if (menuItem) {
      closeMenu(accountButton, accountMenu);
      showToast('success', `${menuItem.textContent.trim()} is ready in this static preview.`);
      return;
    }
    if (navLink && isMobileLayout()) {
      sidebar.classList.remove('is-mobile-open');
      root.querySelectorAll('[data-sidebar-toggle]').forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
      syncSidebarMode();
      mobileSidebarToggle?.focus();
      return;
    }
    if (!action) {
      if (!event.target.closest('[data-account-control]')) closeMenu(accountButton, accountMenu);
      if (!event.target.closest('[data-filter-control]')) closeMenu(filterButton, filterMenu);
      return;
    }

    const commands = {
      'toggle-sidebar': toggleSidebar,
      'toggle-account': toggleAccountMenu,
      'toggle-filter': toggleFilterMenu,
      'open-command': () => openCommand(action),
      'close-dialog': () => closeDialog(action.closest('[role="dialog"]')),
      'open-modal': () => openModal(commandDialog?.contains(action) ? root.querySelector('.intro-actions [data-action="open-modal"]') : action),
      replay: () => motionRunner.run(),
      reset: () => motionRunner.reset(),
      'toast-success': () => showToast('success'),
      'toast-warning': () => showToast('warning'),
      'toast-error': () => showToast('error'),
      'select-row': () => {
        const row = action.closest('tr');
        row?.classList.toggle('is-selected');
        startOwned(settle => turbulencejs.buttons.jelly(action, reducedOptions({ intensity: 0.65, onComplete: settle, onCancel: settle })));
      }
    };
    commands[action.dataset.action]?.();
  }

  function onKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommand(root.querySelector('[data-action="open-command"]'));
      return;
    }
    if (activeDialog === commandDialog && !event.metaKey && !event.ctrlKey && /^[0-9]$/.test(event.key)) {
      const profiles = Array.from(commandDialog.querySelectorAll('[data-profile]'));
      const profile = profiles[event.key === '0' ? 9 : Number(event.key) - 1];
      if (profile) {
        event.preventDefault();
        profile.focus();
        motionRunner.setProfile(profile.dataset.profile);
      }
      return;
    }
    if (activeDialog === commandDialog && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const profiles = Array.from(commandDialog.querySelectorAll('[data-profile]:not([hidden])'));
      if (profiles.length > 0) {
        event.preventDefault();
        const current = profiles.indexOf(root.activeElement);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const next = current === -1 ? 0 : (current + delta + profiles.length) % profiles.length;
        profiles[next].focus();
      }
      return;
    }
    if (event.key === 'Escape') {
      if (activeDialog) closeDialog();
      else {
        closeMenu(accountButton, accountMenu);
        closeMenu(filterButton, filterMenu);
        sidebar?.classList.remove('is-mobile-open');
        sidebarToggle?.setAttribute('aria-expanded', 'false');
        mobileSidebarToggle?.setAttribute('aria-expanded', 'false');
        syncSidebarMode();
        mobileSidebarToggle?.focus();
      }
      return;
    }
    if (event.key === 'Tab' && activeDialog) {
      const focusable = dialogFocusable(activeDialog);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && root.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && root.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onSubmit(event) {
    const form = event.target.closest('[data-report-form]');
    if (!form) return;
    event.preventDefault();
    submitReport(form);
  }

  function onInput(event) {
    if (!event.target.matches('[aria-label="Search motion commands"]')) return;
    const query = event.target.value.trim().toLowerCase();
    commandDialog.querySelectorAll('[data-profile]').forEach(profile => {
      profile.hidden = query !== '' && !profile.textContent.toLowerCase().includes(query);
    });
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  view.addEventListener('resize', syncSidebarMode);
  syncSidebarMode();

  function destroy() {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('submit', onSubmit);
    root.removeEventListener('input', onInput);
    view.removeEventListener('resize', syncSidebarMode);
    activeControllers.forEach(controller => controller?.stop?.());
    activeControllers.clear();
    timers.forEach(timer => view.clearTimeout(timer));
    timers.clear();
    toastTimers.clear();
    publishDiagnostics();
  }

  function getDiagnostics() {
    return {
      activeControllers: activeControllers.size,
      activeTimers: timers.size,
      toasts: root.querySelectorAll('[data-toast]').length,
      loadingNodes: root.querySelectorAll('[data-loading-dots] > *').length,
      activeDialog: activeDialog ? (activeDialog.hasAttribute('data-command-dialog') ? 'command' : 'report') : null
    };
  }

  publishDiagnostics();
  return { openCommand, openModal, closeDialog, showToast, setPreviewState, getDiagnostics, destroy };
}
