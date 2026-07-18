# Package entrypoints

Every JavaScript entry below supports `import` and `require` except the ESM worker asset. Every API entry ships first-party declarations.

| Entry | Purpose |
|---|---|
| `turbulencejs` | Browser API, TurbScript, generic runtime compatibility, presets |
| `turbulencejs/runtime` | Platform-neutral ticker, drivers, tween, spring, interpolation, choreography |
| `turbulencejs/dom` | Renderer/DOM adapter plus compatible root namespace |
| `turbulencejs/main` | Electron-main bounds/layout adapter plus compatible root namespace |
| `turbulencejs/cartoon` | Bubble and skedaddle recipes |
| `turbulencejs/cinematic` | 3D card and cinematic slide recipes |
| `turbulencejs/subtle` | Restrained composed recipes |
| `turbulencejs/extreme` | High-intensity composed recipes |
| `turbulencejs/effects` | Snaporate, Enhance, Sidebar Ready, Tetris Load |
| `turbulencejs/surfaces` | Capture/source policy, renderers, surface programs |
| `turbulencejs/interact` | Hover/focus, drag/drop, and owned interaction sessions |
| `turbulencejs/surface-worker` | ESM worker that consumes host-owned progress |

Optional entries externalize the root package instead of embedding another animation runtime. `/dom` and `/main` can therefore re-export the compatible root namespace without duplicating ticker state in bundlers.

The root has no runtime dependencies. Browser globals are read only when browser behavior is started; importing the root, `/runtime`, or `/main` in Node does not require `window`, `document`, or `requestAnimationFrame`.

Use `npm run verify:consumers` to install the packed tarball into isolated ESM, CommonJS, and Vite fixtures. Use `npm run verify:package` to audit exact tarball files, entry exports, declarations, default/named shapes, worker ownership, duplicate runtimes, and entry sizes.

