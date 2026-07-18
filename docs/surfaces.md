# Surfaces

`turbulencejs/surfaces` is the optional pixel-rendering runtime. It converts an explicitly supplied, origin-clean raster source into an ordinary `turb.driver()`; the main Turbulence timeline remains the only animation clock. Surface layers are decorative (`aria-hidden`, pointer-transparent), while the host DOM remains the semantic source of truth.

```js
import { script } from 'turbulencejs';
import { dissolve, source } from 'turbulencejs/surfaces';

const image = document.querySelector('.avatar img');
const performance = script(dissolve.out(source.image(image), {
  duration: 700,
  seed: 'avatar-17',
  maxParticles: 6000
})).play('.avatar');
```

## Sources and security

Use `source.image()`, `source.canvas()`, `source.imageBitmap()`, or `source.imageData()`. Descriptors are frozen and lazy: dimensions and pixels are read when the performance builds. Images must already be completely loaded. Turbulence does not fetch, add credentials, proxy, upload, cache, or persist source content.

Browser origin-clean rules are absolute. A canvas or image that taints a readback raises `SurfaceError` with code `SURFACE_TAINTED_PIXELS`; Turbulence never attempts to bypass that boundary. Other stable codes distinguish unsupported input, sources that are not ready, zero area, allocation failure, abort, context loss, and policy rejection. Error details contain dimensions and categories, never source pixels, data URLs, or asset URLs.

### Source and capture support

| Input/category | Contract |
|---|---|
| Loaded `HTMLImageElement` | Strong raster input; must be complete and origin-clean for readback. |
| `HTMLCanvasElement` | Strong raster input; tainted canvases fail with `SURFACE_TAINTED_PIXELS`. |
| `ImageBitmap` | Strong raster input; caller retains ownership and closes it when appropriate. |
| `ImageData` | Strong raster input; integer dimensions and an exact width × height × 4 `Uint8ClampedArray` are required. |
| Normal DOM/text/inline SVG | Supported-subset element capture through cloned computed styles and SVG `foreignObject`. |
| Inputs, textareas, selects | Current live value/checked/selected state is copied. |
| Canvas inside captured DOM | Snapshot through `toDataURL()`; protected pixels reject the capture. |
| Fonts | Wait for `document.fonts.ready` by default; bounded by capture timeout. |
| Pseudo-elements | Explicitly omitted and reported. |
| CSS URL assets | Omitted because credentials cannot be controlled inside `foreignObject`. |
| Image/SVG element assets | `none`, explicit same-origin, or explicit CORS fetch with controlled credentials and byte cap. |
| Video, iframe, object, embed | Reject by default; descendants may be explicitly omitted, but a protected root cannot. |
| Disconnected or zero-area target | Reject before serialization/allocation. |

## Resource policy

Every source passes through a finite resource policy before Turbulence allocates a readback canvas. Defaults bound CSS and raster dimensions, device-pixel ratio, samples, particles, DOM blocks, estimated allocation bytes, and worker backlog. `mode: 'degrade'` clamps requests and records requested/applied values plus reasons; `mode: 'reject'` raises `SURFACE_POLICY_REJECTED`.

```js
import { applySurfacePolicy } from 'turbulencejs/surfaces';

const decision = applySurfacePolicy(
  { width: 1200, height: 800, dpr: devicePixelRatio, particles: 50000 },
  { maxDpr: 1.5, maxParticles: 10000 }
);
console.table(decision.degradations);
```

Current defaults are conservative guardrails, not a device-performance claim. Later renderer selection may choose tighter applied values. Diagnostics expose source type, renderer, dimensions, degradation count, unit count, and owned resource count locally; there is no telemetry.

The current auto ladder tries WebGL2 above 50,000 pixels and an explicit worker path above 250,000 pixels when OffscreenCanvas plus `workerFactory` are available; every setup/runtime failure retains Canvas2D fallback unless strict selection is requested. The repeatable Chromium-compatible benchmark recorded 64×64, 256×256, and 1024×768 Canvas2D worst frames of 0.80 ms, 1.20 ms, and 5.40 ms with zero long tasks and zero leaked layers. Those results support the present thresholds in that engine only; 4096-pixel dimensions, DPR 2, 20,000 samples, 12,000 particles, 2,500 DOM blocks, 64 MiB estimated allocations, and worker backlog 2 remain safety ceilings rather than performance promises for every device.

## Custom programs

`program(source, rendererFactory, options)` is the low-level authoring API. The renderer factory receives the owned canvas, resolved pixels, mode, seed, and driver context. It must return `render(progress)` and idempotent `dispose()` functions. Allocate reusable arrays during setup, mutate them during render, and release external references during dispose. Never schedule animation frames from a renderer.

```js
import { program, source } from 'turbulencejs/surfaces';

const checkerboard = program(source.imageData(pixels), ({ canvas, source }) => {
  const context = canvas.getContext('2d');
  return {
    type: 'checkerboard',
    resources: { canvases: 1, pixels: source.width * source.height },
    render(progress) {
      context.globalAlpha = progress;
      context.putImageData(new ImageData(source.pixels, source.width, source.height), 0, 0);
    },
    dispose() { context.clearRect(0, 0, canvas.width, canvas.height); }
  };
}, { duration: 500, mode: 'in' });
```

The built-in Canvas2D dissolve uses deterministic per-pixel thresholds and reuses its output and threshold arrays. `visibility: 'preserve'` keeps target visibility unchanged; otherwise an `out` program hides the semantic target at completion and an `in` program shows it. `reset()` restores the target's original inline visibility.

With reduced motion, source capture and layer allocation are skipped. Turbulence applies the semantic visibility endpoint, emits timeline marks, completes asynchronously, and leaves no canvas or scheduled frame behind.

## Renderer ladder

Set `renderer` to `canvas2d`, `dom-blocks`, `webgl2`, `worker`, or `auto`. Automatic selection uses source size and detected platform features—never a user-agent string—and always retains Canvas2D as the semantic baseline. Setup failures record a sanitized fallback chain. Runtime worker or WebGL loss replaces the transferred/lost canvas with an owned Canvas2D layer unless `strictRenderer: true`; teardown removes either path.

- `dom-blocks` intentionally trades fidelity for a chunky Space-Invaders look and is capped by `maxDomBlocks`.
- `canvas2d` is the universal deterministic baseline.
- `webgl2` preallocates its program, texture, and vertex buffer and reports context loss.
- `worker` uses an `OffscreenCanvas`, coalesces progress when its bounded backlog fills, and never owns a clock.

Worker creation is explicit for Content Security Policy and bundler compatibility:

```js
const workerUrl = import.meta.resolve('turbulencejs/surface-worker');
const effect = dissolve.out(source.image(image), {
  renderer: 'worker',
  workerFactory: () => new Worker(workerUrl, { type: 'module' })
});
```

If `import.meta.resolve` is not supported by a bundler, use its worker-URL import convention (for example an asset URL query), or copy the exported `turbulencejs/surface-worker` asset through its documented asset pipeline and return the resulting Worker from `workerFactory`. CommonJS build tools can locate the asset with `require.resolve('turbulencejs/surface-worker')`. Omitting the factory is a deliberate, diagnosable fallback—not an implicit blob worker that weakens CSP.

## Supported-subset element capture

Image, canvas, ImageBitmap, and ImageData inputs remain the strongest fidelity contract. Element capture is an explicitly degraded provider:

```js
import { captureElement, dissolve } from 'turbulencejs/surfaces';

const captured = await captureElement(document.querySelector('.card'), {
  assets: 'none',
  unsupported: 'omit',
  timeout: 4000
});
script(dissolve.out(captured.source)).play('.card');
```

The provider clones into a detached tree, copies computed styles and current input, textarea, select, and origin-clean canvas state, then rasterizes an SVG `foreignObject`. Normal DOM, text, inline SVG, and form state are supported. Pseudo-elements are explicitly omitted in this version. The provider waits for document fonts unless `fonts: 'skip'` is selected. Video, iframe, object, and embed content is rejected by default or omitted with a diagnostic; a protected root is always rejected. Disconnected and zero-area targets fail before serialization.

`assets: 'none'` is the safest default and removes element and CSS URL assets. `same-origin` and `cors` explicitly fetch element assets, defaulting to `credentials: 'omit'`, enforce `maxAssetBytes`, inline the result, and remain subject to origin-clean readback; CSS URL assets are omitted because their credentials cannot be controlled inside `foreignObject`. Use `assetFailure: 'omit'` only when missing imagery is an acceptable degradation. Captured canvas state uses `toDataURL()` and fails as tainted if the source canvas is protected. Timeouts and AbortSignals cover asset loading and serialization/decode. Diagnostics report only counts and categories, never source URLs or query strings.

## Troubleshooting

- `SURFACE_SOURCE_NOT_READY`: wait for the image's `load` event before creating or replaying the performance.
- `SURFACE_TAINTED_PIXELS`: serve the asset with appropriate CORS headers and a compatible image `crossOrigin` setting, or choose a stylized effect that does not require pixel readback.
- `SURFACE_POLICY_REJECTED`: reduce dimensions, DPR, samples, or particles, or deliberately use degrade mode.
- `SURFACE_ZERO_AREA`: play after the target/source has layout and nonzero dimensions.
- A missing Canvas2D context is reported as allocation or context loss; it is never treated as a successful invisible animation.
