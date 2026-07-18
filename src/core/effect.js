// Compose internal effect cleanup with public callbacks without allowing either to replace the other.
export function effectLifecycle(options, handlers = {}) {
  let settled = false;

  const finish = (kind, element) => {
    if (settled) return;
    settled = true;
    const internalHandler = handlers[kind];
    if (typeof internalHandler === 'function') internalHandler(element);
    const publicHandler = kind === 'complete' ? options.onComplete : options.onCancel;
    if (typeof publicHandler === 'function') publicHandler(element);
  };

  return {
    onComplete: element => finish('complete', element),
    onCancel: element => finish('cancel', element)
  };
}

export function effectOptions(options, overrides = {}) {
  const { onComplete, onCancel = onComplete, ...config } = overrides;
  const lifecycle = effectLifecycle(options, { complete: onComplete, cancel: onCancel });
  return {
    ...options,
    ...config,
    onComplete: lifecycle.onComplete,
    onCancel: lifecycle.onCancel
  };
}

export default { effectLifecycle, effectOptions };
