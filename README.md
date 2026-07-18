# Turbulence

Turbulence is a framework-agnostic browser animation library for interface feedback, state transitions, loaders, and occasional expressive motion. It provides a small core engine, component-oriented presets, timelines, bounded spring physics, and compiled motion paths.

The package verifier measures the core browser bundle and each opt-in recipe pack. Size is reported as an optimization signal rather than used to remove expressive features prematurely.

## Install

```bash
npm install turbulencejs
```

Turbulence ships ESM, CommonJS, UMD, and TypeScript declarations from the same package.

## Quick start

```js
import turbulencejs from 'turbulencejs';

const button = document.querySelector('button');

button.addEventListener('click', () => {
  turbulencejs.buttons.click(button);
});

const controller = turbulencejs.animate(button, {
  opacity: [0, 1],
  y: [12, 0],
  scale: [0.96, 1]
}, {
  duration: 240,
  easing: 'easeOutCubic',
  onComplete: element => console.log('finished', element)
});

controller.pause();
controller.resume();
controller.reverse();
controller.stop();
```

All time values, including timeline offsets, are milliseconds.

## TurbScript

TurbScript is Turbulence's compositional animation language. A **Turb** is an immutable, reusable animation description; `script()` resolves targets and turns that description into one lifecycle-owned performance.

```js
import { turb, script } from 'turbulencejs';
import { bubbleIn, skedaddle } from 'turbulencejs/cartoon';

const entrance = turb.sequence(
  turb.stagger(45, turb.choose([
    bubbleIn({ intensity: 0.8 }),
    skedaddle.in({ from: 'left' })
  ])),
  turb.slot('actions', turb.track({ opacity: [0, 1], y: [8, 0] }))
);

const performance = script(entrance).play(() =>
  [...document.querySelectorAll('.card')].map(target => ({
    target,
    slots: { actions: '[data-card-actions]' }
  })),
  { seed: 'quarterly-chaos' }
);

performance.pause().resume();
performance.stop();  // preserve the interrupted frame
performance.reset(); // restore styles owned by this performance
performance.replay();
```

The fluent director is ergonomic sugar over the same graph and runtime:

```js
import { direct } from 'turbulencejs';

direct('.card')
  .stagger(45)
  .using((target, index) => index % 2 ? bubbleIn() : skedaddle.in())
  .then(turb.track({ opacity: 1 }))
  .seed('quarterly-chaos')
  .play();
```

See [the TurbScript language guide](docs/turbscript.md) for grammar, targets, determinism, lifecycle, errors, and accessibility, and [the recipe guide](docs/recipes.md) for the cartoon, cinematic, subtle, and extreme packs.

## Choose the right layer

| Need | Start with |
|---|---|
| Animate CSS properties on one element | `animate()` |
| Coordinate reusable time-based choreography | `turb` + `script()` |
| Author a canvas/game/pixel renderer on Turbulence's clock | `turb.driver()` |
| Emit a safe host workflow phase | `turb.mark()` + `performance.on('mark')` |
| Capture/render bounded raster surfaces | `turbulencejs/surfaces` |
| Use Snaporate, Enhance, Sidebar Ready, or Tetris Load | `turbulencejs/effects` |
| Own hover/focus or drag/drop motion | `turbulencejs/interact` |

Property tracks and custom drivers share one timeline. A driver receives deterministic progress and a lifecycle scope; it must not schedule its own animation frame or commit application state. Named marks let host code mount or commit content without running arbitrary callbacks inside compile/render. See [advanced drivers and mark semantics](docs/turbscript.md#advanced-drivers-and-marks).

## Optional visual and interaction runtimes

```js
import { script } from 'turbulencejs';
import { source } from 'turbulencejs/surfaces';
import { snaporate, sidebarReady } from 'turbulencejs/effects';
import { drag, hover } from 'turbulencejs/interact';

script(snaporate.out(source.image(image), {
  fidelity: 'pixel',
  direction: 'up-right'
})).play(card, { seed: 'public-demo' });

const hoverSession = hover(card, { enter: lift, leave: settle });
const dragSession = drag(rows, {
  axis: 'y',
  dropZones: rows,
  canDrop: ({ target, zone }) => target !== zone,
  onDrop: ({ target, zone }) => reorderInHostState(target, zone)
});

// Component teardown:
hoverSession.destroy();
dragSession.destroy();
```

Optional packs are externalized from the core UMD and ship their own ESM, CommonJS, and declarations. `turbulencejs/surfaces` adds strong raster descriptors, truthful supported-subset element capture, DOM/Canvas2D/WebGL2/worker renderers, and finite resource policy. `turbulencejs/effects` contains the expressive recipes. `turbulencejs/interact` owns listeners, performances, pointer capture, focus, and cleanup while the host retains business validity and data commits.

- [Surfaces: source support, CORS/security, renderers, worker/CSP, resource policy](docs/surfaces.md)
- [Turbulence: Snaporate, Enhance, Sidebar Ready, Tetris Load, remixing](docs/effects.md)
- [Interactions: hover/focus, pointer and keyboard drag, host boundary](docs/interactions.md)

## Core animation

`animate(element, properties, options)` accepts numeric or CSS-string targets and arrays of keyframes. Transform aliases `x`, `y`, and `z` map to `translateX`, `translateY`, and `translateZ`. Supported transform properties are translation, rotation, scale, and skew axes.

```js
import { animate } from 'turbulencejs';

animate(card, {
  x: [0, 40, 0],
  rotate: [0, 4, 0],
  backgroundColor: ['#fff', '#dbeafe']
}, {
  duration: 500,
  delay: 50,
  repeat: 1,
  yoyo: true,
  easing: 'easeOutElastic(1, 0.7)',
  onStart: element => {},
  onUpdate: (element, progress, iteration) => {},
  onComplete: element => {},
  onCancel: element => {}
});
```

Known transform components are composed, so animating one component does not discard unrelated translation, rotation, or scale values. Zero-duration animations apply their final state immediately and invoke lifecycle callbacks in a microtask.

## Easing

```js
import { easing, animate } from 'turbulencejs';

animate(panel, { opacity: [0, 1] }, {
  easing: easing.elasticOut
});

const custom = easing.createEasing('easeOutElastic(1, 0.6)');
```

Canonical names such as `elasticOut`, preset-style aliases such as `easeOutElastic`, parameterized strings, and easing functions are accepted. Unknown strings warn once and fall back to linear.

Available families are linear, basic ease, quad, cubic, quart, quint, sine, expo, circ, elastic, back, and bounce, with `In`, `Out`, and `InOut` variants where applicable.

## Timelines

```js
import { animate, timeline } from 'turbulencejs';

const sequence = timeline.create({ timeScale: 1 })
  .add(animate(title, { opacity: [0, 1] }, { duration: 200 }), 0)
  .add(animate(body, { y: [12, 0], opacity: [0, 1] }, { duration: 240 }), '+=40');

sequence
  .onComplete(() => console.log('timeline complete'))
  .play();

sequence.pause().resume().seek(120).reverse();
```

Adding an animation transfers it to the timeline before its first frame. Timelines use the same compiled values and easing functions as the core engine.

## Springs

```js
import { spring } from 'turbulencejs';

const motion = spring.to(card, 'x', 200, spring.bouncy());
motion.retarget(80);
motion.stop();
```

Spring transform properties are `x`, `y`, `z`, scale axes, and rotation axes. Non-transform numeric CSS properties are also supported. Integration uses bounded substeps so long frames do not create an unbounded physics jump.

Presets: `spring.wobbly()`, `spring.bouncy()`, and `spring.gentle()`.

## Motion paths

```js
import { path } from 'turbulencejs';

const route = path.create([
  { x: 0, y: 0 },
  { x: 80, y: 40 },
  { x: 160, y: 0 }
]);

path.follow(badge, route, {
  duration: 800,
  rotate: true,
  easing: 'cubicInOut'
});
```

Paths are compiled and measured once per animation. Absolute, relative, and repeated `M`, `L`, `H`, `V`, `C`, `Q`, and `Z` commands are supported. `A`, `S`, and `T` are rejected with an explicit error instead of being approximated incorrectly. Path translation and tangent rotation preserve unrelated transforms.

## Reduced motion

Turbulence respects `prefers-reduced-motion: reduce` by default. Core, timeline, spring, and path animations immediately apply their semantic final state, then run normal completion and cleanup in a microtask.

Set `respectReducedMotion: false` on an individual animation only when motion is essential and an equivalent accessible result is unavailable.

For deterministic previews and tests, `reducedMotion: true | false` explicitly overrides the media query on an animation or Turb performance. Surface recipes skip capture/allocation when reduced; interactions preserve pointer/keyboard semantics and host callbacks while removing follow/settle motion.

## Semantic motion roles

`motion.roles` exposes shared recipes for `feedbackFast`, `stateEnter`, `stateExit`, `spatialMove`, `emphasizedExplain`, `gestureSettle`, `ambient`, and `celebration`. Every role declares an instant reduced-motion alternative.

```js
import { animate, motion } from 'turbulencejs';

animate(element, { opacity: [0, 1] }, motion.options('stateEnter'));
```

## Presets

- `buttons`: `jelly`, `explode`, `springCrazy`, `vibrate`, `glowPulse`, `flip`, `morph`, `shockwave`, `chaos`, `boing`, `rubberBand`, `poof`, `bounce`, `shimmer`, `ripple`, `click`
- `forms`: `shake`, `highlight`, `successBounce`, `floatingLabel`, `validationFeedback`, `inputFocusZoom`, `labelHop`, `errorWobble`
- `toasts`: `slideInBounce`, `zoomBurst`, `wiggleIn`, `heartbeat`, `flipIn`, `dropBounce`, `tada`, `slinkyIn`, `popAndWiggle`, `arcIn`
- `dialogs`: `elasticZoom`, `explosiveZoom`, `slam`, `flip3D`, `swipe`, `bounceIn`, `helicopterIn`, `glitchIn`, `paperFold`, `cartoonRunIn`, `dropAndSquash`
- `dropdowns`: `explosiveExpand`, `fanItems`, `rotate3D`, `floatingPanel`, `dramaticSwipe`, `cardDeck`, `cascadeItems`, `unroll`
- `loading`: `spinner`, `dots`, `pulse`, `progress`, `typing`

Preset controllers support interruption. Temporary nodes, timers, and host-style mutations owned by composite effects are cleaned up when the effect completes or is stopped.

## Development

```bash
npm test -- --runInBand
npm run lint
npm run motion:check
npm run build
npm run verify:package
```

The package verifier packs the actual publishable artifact, instantiates representative root/surface/effects/interaction APIs through ESM and CommonJS, checks declarations and the worker asset, asserts optional runtimes stay out of the core UMD, and reports raw plus gzip sizes.

## SaaS motion lab

The Vite showcase is a polished, static SaaS dashboard used to compare Turbulence motion in realistic interface context. Its command console can replay the page with Quiet, Waterfall, Sproing, Slam, Glitch, and Zero Gravity profiles at three intensity levels. The Turbulence desk proves Snaporate, Enhance error/retry, Sidebar Ready, Tetris Load, hover, and pointer/keyboard client reordering through public package exports.

```bash
npm run build
npm --prefix examples/showcase install
npm --prefix examples/showcase run dev
```

Run `npm run showcase:verify` for its tests, lint, root build, and nested production build. See [`examples/showcase/README.md`](examples/showcase/README.md) for keyboard controls, reproducible URL settings, interaction coverage, and the experiment-extension contract.

## Browser support

Turbulence targets the browsers in `package.json`: greater than 1% usage, the last two browser versions, and maintained browsers. Consumers must provide `requestAnimationFrame`, `performance.now`, and `matchMedia` where those APIs are unavailable.

## License

[MIT](LICENSE)
