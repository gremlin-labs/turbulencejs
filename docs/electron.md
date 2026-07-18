# Electron integration

TurbulenceJS separates renderer and main-process responsibilities. Neither entry imports Electron itself; callers provide ordinary DOM elements or structural native-window targets.

## Renderer process

Use `turbulencejs/dom` for transform, opacity, custom-property, and explicitly seeded style channels. `createEngine()` uses `requestAnimationFrame` and observes `prefers-reduced-motion` unless `reducedMotion` is supplied. Call both `DomAnimator.dispose()` and `engine.dispose()` during renderer teardown.

Electron may throttle renderer animation when a window is hidden or backgrounded. Set `backgroundThrottling` according to the host product's policy; TurbulenceJS does not override Electron's web preferences. Long frame gaps remain bounded by the runtime ticker.

## Main process

Use `turbulencejs/main` for `BrowserWindow`, `WebContentsView`, `BrowserView`, or compatible targets:

```ts
interface BoundsTarget {
  getBounds(): { x: number; y: number; width: number; height: number };
  setBounds(bounds: { x: number; y: number; width: number; height: number }): void;
  isDestroyed?(): boolean;
}
```

`createEngine({ fps })` uses a paced timer driver. Timers call `unref()` when the host supports it, so idle or abandoned scheduling does not keep Node alive. `BoundsAnimator` retargets the same tween during rapid state changes, rounds shared edges safely, and cancels if a native target disappears.

`Layout` computes all regions from one state and interpolates them on one tween. Apply adjacent regions from the same layout so rounded edges remain flush. A failing region callback is isolated from the others.

## Teardown

- Cancel or dispose bounds and layout adapters before destroying their owners.
- Dispose the engine after adapters. This cancels every remaining playable and timer.
- Treat `isDestroyed()` and failed native calls as normal interruption paths.
- Keep renderer and main engines separate; synchronized semantic targets matter more than sharing a process clock.
- Use reduced motion in both processes when coordinated movement would otherwise continue in main after the renderer has snapped.

Run the packed smoke test with an installed Electron executable:

```bash
ELECTRON_BIN=/absolute/path/to/electron npm run verify:electron
```

The smoke covers rapid retargeting, renderer cancellation, reduced motion, main bounds/layout seams, clean console, and teardown to idle.

