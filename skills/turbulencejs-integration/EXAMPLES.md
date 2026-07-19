# TurbulenceJS integration examples

Use these as starting patterns, then match the host project's component ownership, tokens, and verification conventions.

## Direct browser animation

```js
import { animate } from 'turbulencejs';

const controller = animate(panel, {
  opacity: [0, 1],
  y: [8, 0]
}, {
  duration: 180,
  easing: 'easeOutCubic',
  respectReducedMotion: true
});

// Component teardown or interruption:
controller.stop();
```

## TurbScript with a selected style pack

```js
import { script, turb } from 'turbulencejs';
import { softReveal } from 'turbulencejs/subtle';

const entrance = turb.stagger(35, turb.sequence(
  softReveal(),
  turb.slot('actions', turb.track({ opacity: [0, 1] }))
));

const performance = script(entrance).play(() =>
  [...document.querySelectorAll('.card')].map(target => ({
    target,
    slots: { actions: '[data-actions]' }
  })),
  { seed: 'cards-v1', respectReducedMotion: true }
);

// Component teardown:
performance.stop();
performance.reset();
```

## Electron renderer or retargetable DOM channels

```js
import { createEngine, DomAnimator } from 'turbulencejs/dom';

const engine = createEngine();
const animator = new DomAnimator(engine);

animator.animate(panel, { x: 0, opacity: 1 }, {
  from: { opacity: 0 },
  duration: 180,
  easing: 'snappy'
});

// Renderer teardown, in ownership order:
animator.dispose();
engine.dispose();
```

## Electron main-process bounds and layout

```js
import { BoundsAnimator, Layout, createEngine } from 'turbulencejs/main';

const engine = createEngine({ fps: 60 });
const bounds = new BoundsAnimator(engine);
const layout = new Layout(engine, state => ({
  sidebar: { x: 0, y: 0, width: state.sidebar, height: state.height },
  content: { x: state.sidebar, y: 0, width: state.width - state.sidebar, height: state.height }
}));

layout.onRegion('content', rect => contentView.setBounds(rect));
layout.animateTo(nextLayoutState);
await bounds.animate(browserWindow, nextWindowBounds).finished;

// Main-process teardown, in ownership order:
layout.dispose();
bounds.dispose();
engine.dispose();
```

## Owned interactions

```js
import { drag, hover } from 'turbulencejs/interact';

const hoverSession = hover(card, { enter: lift, leave: settle });
const dragSession = drag(rows, {
  axis: 'y',
  dropZones: rows,
  canDrop: ({ target, zone }) => target !== zone,
  onDrop: ({ target, zone }) => commitReorder(target, zone)
});

hoverSession.destroy();
dragSession.destroy();
```

Host code owns `commitReorder`; animation owns feedback and cleanup, not business validity.

## Theatrical surface effect

```js
import { script } from 'turbulencejs';
import { snaporate } from 'turbulencejs/effects';
import { source } from 'turbulencejs/surfaces';

const performance = script(snaporate.out(source.image(image), {
  fidelity: 'pixel',
  direction: 'up-right'
})).play(card, {
  seed: 'approved-celebration',
  respectReducedMotion: true
});

performance.stop();
performance.reset();
```

Before choosing this pattern, verify origin-clean capture, CSP/worker behavior, resource caps, fallback, interruption, and canvas/resource cleanup.
