# Effects

`turbulencejs/effects` is the experimental recipe pack for motion that is intentionally more theatrical than a conventional component transition. It depends on public `turbulencejs` and `turbulencejs/surfaces` exports, so the core UMD remains independent.

## Snaporate

Snaporate dissolves a real raster source into deterministic sampled particles and gives those pixels wind, gravity, and turbulence.

```js
import { script } from 'turbulencejs';
import { source } from 'turbulencejs/surfaces';
import { snaporate } from 'turbulencejs/effects';

const sourceImage = source.image(document.querySelector('.card img'));
const exit = snaporate.out(sourceImage, {
  fidelity: 'pixel',
  direction: 'up-right',
  order: 'left-to-right',
  turbulence: 0.35,
  gravity: 0.08,
  distance: 420,
  duration: 900
});
script(exit).play('.card', { seed: 'card-42' });
```

Fidelity is `invaders`, `blocks`, or `pixel`; each is a sample-budget preset and may be overridden with `samples`. Direction accepts eight names or an `{x, y}` vector. Order is seeded random, left-to-right, or top-to-bottom. Particle thresholds and drift consume only the performance RNG, so replay is stable and `reseed()` deliberately creates a new arrangement.

`out()` keeps the semantic target visible until capture and renderer setup succeed, hides it only at the terminal endpoint, and removes all decoration. `in()` starts from no sampled pixels and ends on the complete source while leaving the semantic target visible. `finish()`, interruption, reset, multiple targets, and reduced motion use the ordinary performance contract. Under reduced motion no capture or canvas is allocated; only the visibility endpoint is applied.

Use `snaporate.program(source, { mode, ...options })` as the remixable part when a recipe factory needs to choose direction, fidelity, or ordering dynamically. Lower-level renderer authoring remains `surface.program()`.

## Enhance

Enhance simulates progressive JPEG loading with actual discrete preview sources. It never claims that CSS `image-rendering` invents missing resolution.

```js
import { enhance } from 'turbulencejs/effects';

const reveal = enhance([
  { src: '/dashboard-16.jpg', resolution: 16 },
  { src: '/dashboard-128.jpg', resolution: 128 },
  { src: '/dashboard-final.jpg', resolution: 1600 }
], {
  duration: 1400,
  fit: 'cover',
  scan: true,
  retries: 1,
  onStageError: ({ index }) => reportLocalPreviewFailure(index)
});
script(reveal).play('.dashboard-preview');
```

Each stage is a URL, loaded `HTMLImageElement`, or `{src|image, resolution}` record. An owned decorative overlay loads every stage, uses the best loaded stage available for the current progress, and can adopt a late stage on the next timeline render. `retries` and `retryDelay` are lifecycle-owned; load/error hooks are local and contain no telemetry. Scroll, resize, and `ResizeObserver` updates keep the overlay aligned. `fit` and `position` map to object-fit and object-position. Stop, completion, reset, setup error, and target removal abort listeners, retry timers, images, observers, and the overlay exactly once.

The host target remains usable content throughout loading and after errors. Turbulence does not change its `src`, fetch application data, or commit state. With `content: 'replace-at-mark'`, Enhance appends a named `enhance:ready` mark (or `markName`) so host code can mount or commit its final content outside render:

```js
const performance = script(enhance(stages, {
  content: 'replace-at-mark',
  markName: 'preview:ready'
})).play(target, { autoplay: false });

performance.on('mark', ({ name }) => {
  if (name === 'preview:ready') mountFinalContent();
});
performance.play();
```

Under reduced motion the overlay and preview loads are skipped and the existing final semantic target is shown immediately.

## Compatibility

Legacy `buttons.explode({ particles: true })` and `buttons.poof()` keep their call signatures and returned animation controller. Their many ambient-random DOM particles have been replaced by one deterministic, `aria-hidden`, pointer-transparent aggregate canvas driven by the existing engine clock. Particle counts are bounded, callbacks remain composed, cancellation removes the canvas, and normal completion self-cleans it. New code should prefer Snaporate when it has an origin-clean source and needs configurable pixel fidelity.

## Sidebar Ready

`sidebarReady()` treats navigation readiness as a coordinated investment instead of a pile of unrelated delays. Play it against item records with an optional shared `parent` slot:

```js
import { script } from 'turbulencejs';
import { sidebarReady } from 'turbulencejs/effects';

const items = [...sidebar.querySelectorAll('a')].map(target => ({
  target,
  slots: { parent: sidebar, content: target.querySelector('span') }
}));

script(sidebarReady({
  order: 'shuffle',
  seed: 'nav-2026',
  stagger: 45,
  finish: 'sweep',       // sweep | glow | settle | mixed | custom | none
  parentSlot: 'parent'
})).play(items);
```

Arrival accepts a Turb or per-item factory, stable/reverse/shuffle order, delay, stagger, left/right origin, and optional item/content slots. Final strategies are a single owner-scoped parent sweep, item glow cascade, settle, deterministic mixed choice, or custom Turb/factory. `sidebar:arrived` and `sidebar:ready` marks are configurable. Items must already exist in semantic order and remain focusable throughout; reduced motion applies ready endpoints and marks without allocating the sweep overlay.

The recipe is ordinary grammar. Its essential equivalent is:

```js
const equivalent = turb.sequence(
  turb.stagger(45, turb.track({ opacity: [0, 1], x: [-18, 0] })),
  turb.mark('sidebar:arrived'),
  turb.stagger(35, turb.track({ y: [-3, 0], scale: [1.015, 1] })),
  turb.mark('sidebar:ready')
);

direct(items).using(sidebarReady({ finish: 'settle' })).play();
```

## Tetris Load

`tetrisLoad()` drops an arbitrary group of cards or blocks into place, applies a collision squash, then pays out a configurable win phase:

```js
const cards = [...row.children].map(target => ({
  target,
  slots: {
    group: row,
    block: target.querySelector('[data-block]'),
    content: target.querySelector('[data-content]')
  }
}));

const performance = script(tetrisLoad({
  direction: 'down',
  order: 'stable',
  stagger: 70,
  blockSlot: 'block',
  groupSlot: 'group',
  contentSlot: 'content',
  win: 'flash-reveal'
})).play(cards, { autoplay: false });

performance.on('mark', ({ name }) => {
  if (name === 'tetris:landed') mountHostContent();
});
performance.play();
```

Directions are up/down/left/right; custom arrival and final Turbs can change block shapes and collision character. Win strategies are one shared row flash, flash then content reveal, reveal only, settle, custom, or none. Groups need not contain three items. `content: 'existing'` assumes semantic content is pre-rendered; `replace-at-mark` emits `tetris:landed` for a host mount/commit. `tetris:win` follows the visual win phase. The recipe never fetches or mutates application content.

The grammar equivalent is a staggered sequence plus marks; the all-items barrier already comes from sequence-after-stagger:

```js
const equivalent = turb.sequence(
  turb.stagger(70, turb.sequence(drop, collision)),
  turb.mark('tetris:landed'),
  rowFlash,
  turb.slot('content', turb.stagger(45, reveal)),
  turb.mark('tetris:win')
);

direct(cards).using(tetrisLoad({ win: 'settle' })).play();
```

Both coordinators preserve DOM order, content, and focus, are deterministic under replay/reseed, remove shared overlays on completion/interruption, and emit ordered marks under reduced motion without allocating decoration.
