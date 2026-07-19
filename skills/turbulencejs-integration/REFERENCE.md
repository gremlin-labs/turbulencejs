# TurbulenceJS integration reference

## Package model

TurbulenceJS is one zero-runtime-dependency npm package. “Package choice” means selecting its public entrypoints, not installing separate packages.

| Entrypoint | Choose when | Avoid when |
|---|---|---|
| `turbulencejs` | Browser CSS animation, timelines, TurbScript, direct choreography, component presets | A main-only Electron module must remain browser-global-free |
| `turbulencejs/runtime` | Generic numbers, objects, colors, rects, injected clocks, or explicit engine ownership | A browser animation can use the root API directly |
| `turbulencejs/dom` | Renderer transform/style channels need smooth in-flight retargeting | Code runs in Electron main or Node without DOM targets |
| `turbulencejs/main` | Native bounds and multi-region layout in Electron main | Renderer-only motion |
| `turbulencejs/subtle` | Restrained entrances and settling | A signature playful or cinematic moment is required |
| `turbulencejs/cartoon` | Friendly overshoot, bubble, or skedaddle motion | High-frequency enterprise controls where character becomes noise |
| `turbulencejs/cinematic` | 3D cards, anchored reveals, editorial spatial transitions | Dense repeated micro-interactions |
| `turbulencejs/extreme` | Rare deliberate high-impact moments | Routine navigation, forms, or continuous feedback |
| `turbulencejs/interact` | Owned hover/focus and pointer/keyboard drag motion | Host validation or data commits would be hidden inside animation callbacks |
| `turbulencejs/surfaces` | Bounded raster capture/rendering with explicit resource policy | Cross-origin pixels, unbounded surfaces, or restrictive CSP are unresolved |
| `turbulencejs/effects` | Snaporate, Enhance, Sidebar Ready, or Tetris Load | The product cannot support surface fallback and cleanup requirements |
| `turbulencejs/surface-worker` | A worker renderer consumes host-owned deterministic progress | The worker would own its own animation clock |

Read the installed package's `docs/` when exact signatures matter. Do not invent exports from this summary; verify imports against `package.json#exports` or declarations.

## Coherent style profiles

### Restrained product

- Intensity 0–1.
- Root roles and `/subtle`; `/interact` only for interaction state that benefits from continuity.
- Small opacity/position deltas, short durations, no decorative sequencing on repeated tasks.
- Suitable for productivity, administration, settings, forms, and high-frequency controls.

### Expressive product

- Intensity 1–2.
- Root plus selective `/subtle`, `/cartoon`, or `/cinematic` recipes.
- One signature behavior per journey; routine controls stay restrained.
- Suitable for onboarding, creation flows, friendly consumer tools, and meaningful state transitions.

### Playful

- Intensity 2–3.
- `/cartoon` with controlled overshoot, deterministic seeds, and restrained fallbacks.
- Reserve skedaddle-like exits for disposable or clearly dismissed objects.
- Avoid making every component bounce.

### Cinematic

- Intensity 2–3.
- `/cinematic` for hierarchy changes, panels, featured content, and spatial continuity.
- Check perspective, transform origin, stacking, clipping, responsive geometry, and interruption.

### High-impact and theatrical

- Intensity 3–4.
- `/extreme` for composed CSS motion; `/effects` plus `/surfaces` for pixel/canvas treatments.
- Require explicit user approval, a rare trigger, deterministic cleanup, resource ceilings, and a reduced/fallback endpoint.
- Never make critical content depend on successful capture or rendering.

## Surface selection

### Browser apps

Start with the root. Use TurbScript for reusable choreography and lifecycle ownership, direct `animate()` for isolated property transitions, and `/dom` only when its independently retargetable channels match the component need. Framework components must stop/destroy owned controllers in unmount cleanup.

### Electron renderer

Treat it as a browser surface for CSS and recipes. Use `/dom` for renderer channel retargeting. Dispose animators before engines and remove component-owned performances/listeners during teardown. Hidden-window throttling is host policy.

### Electron main

Use `/main` only. Keep a distinct main engine, dispose bounds/layout adapters before the engine, tolerate destroyed targets, and use one layout state to preserve shared edges. Coordinate renderer and main through semantic targets, not a shared process clock.

### Generic runtime

Inject `rafDriver`, `timerDriver`, `manualDriver`, or a structural driver appropriate to the host. Own the engine lifecycle. Await `finished` for completion or cancellation; do not assume cancellation rejects.

## Implementation rules

1. Inventory current transitions, keyframes, animation libraries, gesture handlers, and reduced-motion utilities before adding TurbulenceJS.
2. Decide whether each existing behavior is retained, replaced, or removed. Avoid two libraries owning the same property or event.
3. Install with the detected package manager and preserve lockfile discipline.
4. Centralize product motion roles, not every animation. Components may own geometry- or content-specific recipes.
5. Keep application mutations at named host boundaries. Drivers render progress; they do not commit data.
6. Ensure cancellations restore or intentionally preserve styles. Record which policy each flow uses.
7. For raster effects, validate origin cleanliness, credential policy, CSP, worker URL construction, maximum pixels/layers, and fallback.
8. Lazy-start clocks and prove idle teardown after the final owner stops.

## Verification matrix

Classify each row `PASS`, `NOT APPLICABLE`, or `UNVERIFIED` in the implementation report.

| Dimension | Minimum evidence |
|---|---|
| Build and types | Production build plus typecheck or declaration consumer |
| Normal endpoint | Intended styles, bounds, focus, and semantic state |
| Reduced motion | Equivalent state clarity without unnecessary travel |
| Interruption | Rapid repeat, reverse, retarget, cancellation, and unmount |
| Ownership | Listeners, timers, frames, canvases, workers, pointer capture, and temporary styles cleaned |
| Idle | No frame/timer work after completion or teardown |
| Responsive | Representative narrow, medium, and wide geometry where UI applies |
| Inputs | Keyboard, pointer, touch, and focus paths applicable to the component |
| Electron | Renderer/main isolation, destroyed targets, seams, throttling policy, clean shutdown |
| Surfaces | Origin/CSP policy, caps, fallback, allocation and cleanup |
| Console | No new runtime errors or warnings |
| Regression | Project tests, lint, and existing interaction behavior |

## Artifact set

The stage owns:

- `DECISIONS.md`: user-facing package/style/intensity decision and approval.
- `INTEGRATION-PLAN.md`: exact target map, slices, verification, and rollback.
- `IMPLEMENTATION-REPORT.md`: changed files, commands, runtime evidence, deviations, and status.
- `NOTES.md`: optional sanitized research or measurements only.

The shared `WORK.md` indexes stages and handoff state without duplicating their contents. Reader-facing architecture belongs in the project's normal `README.md` or `docs/`, not only in `agent-work/`.
