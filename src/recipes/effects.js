function directionVector(value) {
  if (value && typeof value === 'object') {
    const x = Number(value.x);
    const y = Number(value.y);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }
  const directions = {
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    'up-left': { x: -0.7, y: -0.7 }, 'up-right': { x: 0.7, y: -0.7 },
    'down-left': { x: -0.7, y: 0.7 }, 'down-right': { x: 0.7, y: 0.7 }
  };
  if (!directions[value || 'right']) throw new RangeError(`Unknown Snaporate direction "${value}".`);
  return directions[value || 'right'];
}

function fidelityOptions(fidelity) {
  const presets = {
    invaders: { samples: 256, size: 3.5 },
    blocks: { samples: 1600, size: 2 },
    pixel: { samples: 10000, size: 1 }
  };
  if (!presets[fidelity || 'blocks']) throw new RangeError(`Unknown Snaporate fidelity "${fidelity}".`);
  return presets[fidelity || 'blocks'];
}

function createSnaporateRenderer(options) {
  return ({ canvas, source, context, mode }) => {
    const drawing = canvas.getContext('2d');
    if (!drawing) throw new Error('Snaporate requires a Canvas2D context.');
    const preset = fidelityOptions(options.fidelity);
    const count = Math.max(1, Math.min(source.policy.applied.samples || preset.samples, source.width * source.height));
    const columns = Math.max(1, Math.ceil(Math.sqrt(count * source.width / source.height)));
    const rows = Math.max(1, Math.ceil(count / columns));
    const actualCount = Math.min(count, columns * rows);
    const x = new Float32Array(actualCount);
    const y = new Float32Array(actualCount);
    const threshold = new Float32Array(actualCount);
    const noise = new Float32Array(actualCount);
    const colors = new Uint8ClampedArray(actualCount * 4);
    const vector = directionVector(options.direction || options.wind);
    const order = options.order || 'random';
    const full = drawing.createImageData(source.width, source.height);
    full.data.set(source.pixels);
    for (let index = 0; index < actualCount; index += 1) {
      x[index] = Math.min(source.width - 1, Math.floor((index % columns + 0.5) / columns * source.width));
      y[index] = Math.min(source.height - 1, Math.floor((Math.floor(index / columns) + 0.5) / rows * source.height));
      threshold[index] = order === 'left-to-right' ? x[index] / source.width
        : order === 'top-to-bottom' ? y[index] / source.height
          : context.random();
      noise[index] = context.random() * 2 - 1;
      const sourceOffset = (Math.floor(y[index]) * source.width + Math.floor(x[index])) * 4;
      colors.set(source.pixels.slice(sourceOffset, sourceOffset + 4), index * 4);
    }
    const distance = Number(options.distance ?? Math.max(source.width, source.height) * 0.65);
    const gravity = Number(options.gravity ?? 0.12);
    const turbulence = Number(options.turbulence ?? 0.25);
    const fade = options.fade !== false;
    let disposed = false;
    return Object.freeze({
      type: `snaporate-${options.fidelity || 'blocks'}`,
      resources: Object.freeze({ particles: actualCount, allocationBytes: x.byteLength + y.byteLength + threshold.byteLength + noise.byteLength + colors.byteLength + full.data.byteLength }),
      render(progress) {
        if (disposed) return;
        const vanish = mode === 'in' ? 1 - progress : progress;
        drawing.clearRect(0, 0, canvas.width, canvas.height);
        if (vanish <= 0) { drawing.putImageData(full, 0, 0); return; }
        if (vanish >= 1) return;
        const size = Math.max(1, preset.size * source.width / columns);
        for (let index = 0; index < actualCount; index += 1) {
          const released = vanish >= threshold[index];
          const travel = released ? (vanish - threshold[index]) / Math.max(0.001, 1 - threshold[index]) : 0;
          const wobble = Math.sin((travel * 9 + noise[index] * 3) * Math.PI) * turbulence * distance;
          const drawX = x[index] + vector.x * distance * travel + -vector.y * wobble;
          const drawY = y[index] + vector.y * distance * travel + vector.x * wobble + gravity * distance * travel * travel;
          const colorOffset = index * 4;
          drawing.globalAlpha = fade ? Math.max(0, 1 - travel) : 1;
          drawing.fillStyle = `rgba(${colors[colorOffset]}, ${colors[colorOffset + 1]}, ${colors[colorOffset + 2]}, ${colors[colorOffset + 3] / 255})`;
          drawing.fillRect(drawX, drawY, size, size);
        }
        drawing.globalAlpha = 1;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        drawing.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  };
}

function normalizeStages(stages) {
  const values = Array.isArray(stages) ? stages : stages?.stages;
  if (!Array.isArray(values) || values.length < 2) throw new RangeError('enhance requires at least two real source stages.');
  return Object.freeze(values.map((stage, index) => {
    if (typeof stage === 'string') return Object.freeze({ src: stage, resolution: index + 1 });
    if (typeof HTMLImageElement !== 'undefined' && stage instanceof HTMLImageElement) {
      return Object.freeze({ image: stage, resolution: stage.naturalWidth || index + 1 });
    }
    if (!stage || (typeof stage.src !== 'string' && !stage.image)) throw new TypeError(`enhance stage ${index} requires src or image.`);
    return Object.freeze({ ...stage, resolution: Number(stage.resolution ?? index + 1) });
  }));
}

function enhanceDriver(turb, stages, options) {
  return turb.driver(context => {
    if (context.reducedMotion) {
      return {
        ownedProperties: ['visibility'],
        render(progress) { if (progress === 1) context.target.style.visibility = 'visible'; },
        diagnostics: { renderer: 'enhance-reduced', stageCount: stages.length }
      };
    }
    if (!context.target.isConnected) throw new TypeError('enhance target must be connected.');
    const document = context.target.ownerDocument;
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.dataset.turbulencejsEnhance = '';
    Object.assign(container.style, { position: 'absolute', pointerEvents: 'none', overflow: 'hidden', zIndex: String(options.zIndex ?? 2147483000) });
    document.body.append(container);
    const state = stages.map(stage => ({ stage, loaded: false, failed: false, pending: false, attempts: 0, timer: null, image: document.createElement('img') }));
    let disposed = false;
    function position() {
      if (disposed || !context.target.isConnected) return;
      const rect = context.target.getBoundingClientRect();
      Object.assign(container.style, {
        left: `${rect.left + (document.defaultView?.scrollX || 0)}px`,
        top: `${rect.top + (document.defaultView?.scrollY || 0)}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
    }
    position();
    context.lifecycle.listen(document.defaultView, 'scroll', position, { passive: true });
    context.lifecycle.listen(document.defaultView, 'resize', position, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(position) : null;
    resizeObserver?.observe(context.target);
    if (resizeObserver) context.lifecycle.cleanup(() => resizeObserver.disconnect());

    state.forEach((item, index) => {
      const image = item.image;
      Object.assign(image.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0',
        objectFit: options.fit || 'cover', objectPosition: options.position || '50% 50%',
        imageRendering: index === state.length - 1 ? 'auto' : 'pixelated', transition: 'none'
      });
      container.append(image);
      const supplied = item.stage.image;
      const src = item.stage.src || supplied?.currentSrc || supplied?.src;
      const load = () => {
        if (!item.pending && !supplied?.complete) return;
        item.pending = false;
        clearTimeout(item.timer);
        item.timer = null;
        item.loaded = true;
        item.failed = false;
        options.onStageLoad?.({ index, resolution: item.stage.resolution, target: context.target });
      };
      const fail = error => {
        if (!item.pending) return;
        item.pending = false;
        clearTimeout(item.timer);
        item.timer = null;
        item.failed = true;
        options.onStageError?.({ index, resolution: item.stage.resolution, target: context.target, error });
        if (item.attempts <= Number(options.retries || 0)) context.lifecycle.timeout(start, Number(options.retryDelay || 100));
      };
      function start() {
        if (context.lifecycle.signal.aborted || !src) return;
        item.attempts += 1;
        item.pending = true;
        image.src = '';
        image.src = src;
        item.timer = context.lifecycle.timeout(() => fail(new Error(`Enhance stage ${index} timed out.`)), Number(options.timeout ?? 8000));
      }
      context.lifecycle.listen(image, 'load', load);
      context.lifecycle.listen(image, 'error', fail);
      if (supplied?.complete && supplied.naturalWidth > 0) {
        image.src = src;
        load();
      } else start();
    });
    context.lifecycle.cleanup(() => {
      disposed = true;
      state.forEach(item => { item.pending = false; clearTimeout(item.timer); item.image.removeAttribute('src'); });
      container.remove();
    });
    return {
      ownedProperties: ['visibility'],
      render(progress) {
        const desired = Math.min(state.length - 1, Math.floor(progress * state.length));
        let selected = -1;
        for (let index = 0; index <= desired; index += 1) if (state[index].loaded) selected = index;
        if (selected < 0) for (let index = desired + 1; index < state.length; index += 1) if (state[index].loaded) { selected = index; break; }
        state.forEach((item, index) => { item.image.style.opacity = index === selected ? '1' : '0'; });
        if (options.scan !== false) container.style.clipPath = `inset(0 0 ${Math.max(0, 100 - progress * 100)}% 0)`;
      },
      finish() { context.target.style.visibility = 'visible'; },
      diagnostics: { renderer: 'enhance-stages', stageCount: stages.length },
      resources: { images: stages.length, layers: 1 }
    };
  }, { duration: options.duration ?? 1200, easing: options.easing || 'linear' });
}

function orderedArrival(turb, child, options = {}) {
  const stagger = Math.max(0, Number(options.stagger ?? 55));
  if (options.order === 'shuffle') return turb.shuffle(turb.stagger(stagger, child));
  if (options.order === 'reverse') {
    return turb.each((target, index, context) => turb.sequence(
      turb.wait((context.count - index - 1) * stagger),
      typeof child === 'function' ? child(target, index, context) : child
    ));
  }
  return turb.stagger(stagger, child);
}

function resolveRecipe(turb, value, fallback, label) {
  const resolved = value || fallback;
  if (typeof resolved === 'function') return (...args) => {
    const recipe = resolved(...args);
    if (!turb.isTurb(recipe)) throw new TypeError(`${label} factory must return a Turb value.`);
    return recipe;
  };
  if (!turb.isTurb(resolved)) throw new TypeError(`${label} must be a Turb or factory.`);
  return resolved;
}

function overlayDriver(turb, kind, options = {}) {
  return turb.driver(context => {
    if (context.reducedMotion) return () => {};
    if (!context.target.isConnected) throw new TypeError(`${kind} parent target must be connected.`);
    const overlay = context.target.ownerDocument.createElement('i');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.dataset.turbulencejsCoordinator = kind;
    const originalPosition = context.target.style.position;
    if (context.target.ownerDocument.defaultView.getComputedStyle(context.target).position === 'static') {
      context.target.style.position = 'relative';
    }
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: String(options.zIndex ?? 2),
      transformOrigin: kind === 'sidebar-sweep' ? '50% 0%' : '50% 50%',
      background: options.color || (kind === 'sidebar-sweep'
        ? 'linear-gradient(180deg, transparent, rgba(183,243,74,.35), transparent)'
        : 'rgba(255,255,255,.75)'),
      mixBlendMode: options.blendMode || 'screen'
    });
    overlay.style.opacity = '0';
    context.target.append(overlay);
    context.lifecycle.resource('overlays', 1);
    context.lifecycle.cleanup(() => {
      overlay.remove();
      context.target.style.position = originalPosition;
    });
    return {
      render(progress) {
        if (kind === 'sidebar-sweep') {
          overlay.style.transform = `translate3d(0, ${-100 + progress * 200}%, 0) scaleY(.35)`;
          overlay.style.opacity = String(Math.sin(progress * Math.PI));
        } else {
          overlay.style.transform = `scale(${0.75 + progress * 0.5})`;
          overlay.style.opacity = String(Math.sin(progress * Math.PI));
        }
      },
      resources: { overlays: 1 },
      diagnostics: { renderer: kind }
    };
  }, { duration: options.duration ?? (kind === 'sidebar-sweep' ? 420 : 300), easing: options.easing || 'linear' });
}

function createSidebarReady(turb, options = {}) {
  const arrivalFallback = turb.track({ opacity: [0, 1], x: [options.from === 'right' ? 18 : -18, 0] }, {
    duration: options.arrivalDuration ?? 260, easing: options.arrivalEasing || 'easeOutCubic'
  });
  const arrivalValue = resolveRecipe(turb, options.arrival, arrivalFallback, 'sidebarReady arrival');
  const arrival = options.itemSlot
    ? turb.slot(options.itemSlot, orderedArrival(turb, arrivalValue, options))
    : orderedArrival(turb, arrivalValue, options);
  const glow = turb.stagger(options.finishStagger ?? 35, turb.track({
    boxShadow: ['0 0 0 rgba(183,243,74,0)', '0 0 18px rgba(183,243,74,.75)', '0 0 0 rgba(183,243,74,0)']
  }, { duration: options.finishDuration ?? 260, easing: 'easeInOutSine' }));
  const settle = turb.stagger(options.finishStagger ?? 35, turb.track({ y: [-3, 0], scale: [1.015, 1] }, {
    duration: options.finishDuration ?? 220, easing: 'easeOutCubic'
  }));
  let final;
  const strategy = options.finish || 'sweep';
  if (strategy === 'sweep') {
    final = turb.each((_target, index) => index === Number(options.ownerIndex || 0)
      ? turb.slot(options.parentSlot || 'parent', overlayDriver(turb, 'sidebar-sweep', options.sweep))
      : turb.wait(0));
  } else if (strategy === 'glow') final = glow;
  else if (strategy === 'settle' || strategy === 'none') final = strategy === 'none' ? turb.wait(0) : settle;
  else if (strategy === 'mixed') final = turb.choose([glow, settle], { seed: options.seed });
  else if (strategy === 'custom') {
    const custom = resolveRecipe(turb, options.final, null, 'sidebarReady final');
    final = typeof custom === 'function' ? turb.each(custom) : custom;
  }
  else throw new RangeError(`Unknown sidebarReady finish strategy "${strategy}".`);
  const sequence = turb.sequence(
    turb.wait(Math.max(0, Number(options.delay || 0))),
    arrival,
    turb.mark(options.arrivedMark || 'sidebar:arrived'),
    final,
    turb.mark(options.readyMark || 'sidebar:ready')
  );
  return options.contentSlot ? turb.slot(options.contentSlot, sequence) : sequence;
}

function createTetrisLoad(turb, options = {}) {
  const direction = options.direction || 'down';
  const distance = Number(options.distance ?? 220);
  const start = {
    down: { x: 0, y: -distance }, up: { x: 0, y: distance },
    left: { x: distance, y: 0 }, right: { x: -distance, y: 0 }
  }[direction];
  if (!start) throw new RangeError(`Unknown tetrisLoad direction "${direction}".`);
  const arrivalFallback = turb.sequence(
    turb.track({ opacity: [0, 1], x: [start.x, start.x * 0.03], y: [start.y, start.y * 0.03] }, {
      duration: options.dropDuration ?? 360, easing: options.dropEasing || 'easeInCubic'
    }),
    turb.track({ x: [start.x * 0.03, 0], y: [start.y * 0.03, 0], scaleX: [0.96, 1.04, 1], scaleY: [1.08, 0.94, 1] }, {
      duration: options.collisionDuration ?? 180, easing: 'easeOutCubic'
    })
  );
  const arrivalValue = resolveRecipe(turb, options.arrival, arrivalFallback, 'tetrisLoad arrival');
  const arrival = options.blockSlot
    ? turb.slot(options.blockSlot, orderedArrival(turb, arrivalValue, options))
    : orderedArrival(turb, arrivalValue, options);
  const contentReveal = options.contentSlot
    ? turb.slot(options.contentSlot, turb.stagger(options.contentStagger ?? 45, turb.track({ opacity: [0, 1], y: [8, 0] }, {
      duration: options.contentDuration ?? 240, easing: 'easeOutCubic'
    })))
    : turb.wait(0);
  const flash = turb.each((_target, index) => index === Number(options.ownerIndex || 0)
    ? turb.slot(options.groupSlot || 'group', overlayDriver(turb, 'tetris-win', options.flash))
    : turb.wait(0));
  let win;
  const strategy = options.win || (options.contentSlot ? 'flash-reveal' : 'flash');
  if (strategy === 'flash') win = flash;
  else if (strategy === 'flash-reveal') win = turb.sequence(flash, contentReveal);
  else if (strategy === 'reveal') win = contentReveal;
  else if (strategy === 'settle') {
    const settled = turb.stagger(35, turb.track({ scale: [1.025, 1] }, { duration: 180, easing: 'easeOutCubic' }));
    win = options.contentSlot ? turb.sequence(settled, contentReveal) : settled;
  } else if (strategy === 'none') win = options.contentSlot ? contentReveal : turb.wait(0);
  else if (strategy === 'custom') {
    const custom = resolveRecipe(turb, options.final, null, 'tetrisLoad final');
    win = typeof custom === 'function' ? turb.each(custom) : custom;
  }
  else throw new RangeError(`Unknown tetrisLoad win strategy "${strategy}".`);
  return turb.sequence(
    turb.wait(Math.max(0, Number(options.delay || 0))),
    arrival,
    turb.mark(options.landedMark || 'tetris:landed', { content: options.content || 'existing' }),
    win,
    turb.mark(options.winMark || 'tetris:win')
  );
}

export function createTurbulenceRecipes(turb, surfaceApi) {
  const snap = (mode, sourceInput, options = {}) => {
    if (!sourceInput) throw new TypeError('snaporate requires an explicit surface source.');
    const preset = fidelityOptions(options.fidelity);
    return surfaceApi.program(sourceInput, createSnaporateRenderer(options), {
      ...options,
      mode,
      samples: options.samples ?? preset.samples,
      renderer: undefined,
      visibility: options.visibility ?? 'endpoint'
    });
  };
  const snaporate = Object.freeze({
    in: (sourceInput, options) => snap('in', sourceInput, options),
    out: (sourceInput, options) => snap('out', sourceInput, options),
    program: (sourceInput, options = {}) => snap(options.mode === 'in' ? 'in' : 'out', sourceInput, options)
  });
  const enhance = (stageInput, options = {}) => {
    const values = Array.isArray(stageInput) ? stageInput : stageInput?.stages;
    const stages = normalizeStages(options.fallback ? [...(values || []), options.fallback] : stageInput);
    const driver = enhanceDriver(turb, stages, options);
    return options.content === 'replace-at-mark'
      ? turb.sequence(driver, turb.mark(options.markName || 'enhance:ready', { stageCount: stages.length }))
      : driver;
  };
  const sidebarReady = options => createSidebarReady(turb, options);
  const tetrisLoad = options => createTetrisLoad(turb, options);
  return Object.freeze({ snaporate, enhance, sidebarReady, tetrisLoad });
}
