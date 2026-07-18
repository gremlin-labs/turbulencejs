# Migration to TurbulenceJS 2.0

## From TurbulenceJS 1.x

Generic runtime imports remain valid:

```js
const { Turbulence, Tween, Spring, manualDriver } = require('turbulencejs');
const { DomAnimator } = require('turbulencejs/dom');
const { BoundsAnimator, Layout } = require('turbulencejs/main');
```

The same exports also support ESM and first-party TypeScript declarations. The generic engine still requires an injected driver, `finished` always resolves, retargeting preserves the current value, long frame deltas are bounded, and idle engines schedule no work.

Material 2.0 changes:

- `VERSION` is `2.0.0`.
- `/runtime` is an explicit platform-neutral entry in addition to the compatible root exports.
- `/dom` and `/main` now ship ESM, CommonJS, and declarations rather than CommonJS only.
- `DomAnimator.dispose()`, `BoundsAnimator.dispose()`, and `Layout.dispose()` make ownership teardown explicit. Disposing a DOM-created engine removes its media-query listener.
- The root `easing` namespace combines strict v1 `resolve()` with the browser `createEasing()` parser. Unknown values passed to `resolve()` still throw.
- Browser recipes, effects, surfaces, and interactions are additive; Electron consumers do not need to import them.

## From Herky source consumers

The browser library now uses the TurbulenceJS package and TurbScript vocabulary. This is a hard rename with no compatibility aliases.

| Previous name | TurbulenceJS 2.0 |
|---|---|
| package/import identity `herky` | `turbulencejs` |
| HerkScript | TurbScript |
| `herk` grammar object | `turb` |
| `HerkNode`, `HerkContext`, `HerkPerformance` | `TurbNode`, `TurbContext`, `TurbPerformance` |
| `docs/herkscript.md` | `docs/turbscript.md` |
| theatrical `turbulence` recipe entry | `turbulencejs/effects` |

Typical update:

```diff
- import { herk, script } from 'herky';
- import { snaporate } from 'herky/turbulence';
+ import { turb, script } from 'turbulencejs';
+ import { snaporate } from 'turbulencejs/effects';

- const entrance = herk.sequence(herk.track({ opacity: [0, 1] }));
+ const entrance = turb.sequence(turb.track({ opacity: [0, 1] }));
```

Runtime behavior remains centered on immutable descriptions, lifecycle-owned performances, deterministic seeds, marks, reduced-motion endpoints, cleanup, and host-owned application state. Rename public types, local variable names, diagnostics expectations, and documentation together; do not keep mixed vocabulary.

