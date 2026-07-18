# TurbScript recipe packs

Official recipes are opt-in package subpaths. Every recipe returns an ordinary Turb: it can be sequenced, staggered, chosen, slotted, or mixed with custom tracks before one performance plays it.

## Cartoon

```js
import { bubbleIn, bubbleInParts, skedaddle } from 'turbulencejs/cartoon';
```

`bubbleIn()` fades, rises, overshoots, and softly shakes into place. Use `mode: 'together'` (default), `mode: 'sequence'`, or `order: ['appear', 'rise', 'expand', 'settle']`. `bubbleInParts()` exposes those four Turbs for complete custom assembly. Direction, intensity, duration, rise, scale, overshoot, and transform origin are configurable.

`skedaddle.in()` races onto the stage; `skedaddle.out()` runs in place and bolts away. Entrance and exit directions are independent (`left`, `right`, `top`, or `bottom`). Distance can be a number or lazy geometry function; otherwise it is calculated from the target and viewport at play time.

## Cinematic

```js
import { card3D, cinematicSlide } from 'turbulencejs/cinematic';
```

`card3D.in()` pitches a component in from a cardinal or diagonal direction and lands it flat. `card3D.out()` can pitch and spin into a fadeaway. Perspective, host, depth, intensity, duration, origin, spin, and easing are configurable. Temporary perspective, transform-origin, and backface styles are restored on completion, cancellation, reset, and setup failure.

`cinematicSlide.in()` and `.out()` reveal from an anchor like a linear video wipe. Content can remain visible (`content: 'with'`), animate after the panel (`content: 'after'` plus a relative slot), or use any custom Turb. Panel and content durations are independent.

## Subtle and extreme

```js
import { softReveal, quietSlide, gentleSettle } from 'turbulencejs/subtle';
import { impactBubble, panicSkedaddle, spinAway } from 'turbulencejs/extreme';
```

These are thin compositions of the same cartoon, cinematic, and core grammar—not new runtimes. Subtle supplies restrained entrances; extreme turns up distance, overshoot, cycles, pitch, and spin. Options override their defaults, so they are starting points rather than locked presets.

## Mix official and custom recipes

```js
import { turb, script } from 'turbulencejs';
import { bubbleIn, skedaddle } from 'turbulencejs/cartoon';
import { card3D } from 'turbulencejs/cinematic';

const customGlint = turb.define('customGlint', color =>
  turb.track({ boxShadow: [`0 0 0 ${color}00`, `0 0 28px ${color}`, `0 0 0 ${color}00`] }, {
    role: 'celebration'
  })
);

const portfolio = turb.stagger(55, turb.choose([
  bubbleIn({ intensity: 0.8 }),
  skedaddle.in({ from: 'left' }),
  turb.sequence(card3D.in({ from: 'northEast' }), customGlint('#d6ff6b'))
]));

script(portfolio).play('.portfolio-card', { seed: 'boron-wuffet' });
```

Recipe options consume Turbulence's semantic motion roles while allowing explicit overrides. Prefer roles when authoring reusable recipes so app-wide timing remains coherent; use explicit duration or easing for an intentional signature moment.

## Turbulence and interaction recipes

The capture-backed and coordinated recipes live in opt-in packages so the core stays independent of raster and interaction machinery:

```js
import { enhance, sidebarReady, snaporate, tetrisLoad } from 'turbulencejs/effects';
import { drag, hover } from 'turbulencejs/interact';
```

See [Effects](effects.md) for Snaporate, Enhance, Sidebar Ready, Tetris Load, fidelity, deterministic ordering, marks, and degradation. See [Interactions](interactions.md) for hover interruption policies and pointer/keyboard drag ownership. Surface sources, capture security, renderers, workers, CSP, and resource limits are documented in [Surfaces](surfaces.md).
