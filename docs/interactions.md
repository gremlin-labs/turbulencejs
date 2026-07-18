# Interactions

`turbulencejs/interact` owns motion that is driven by input rather than elapsed time alone. Sessions keep event listeners, performances, temporary styles and attributes, pointer capture, live values, focus restoration, AbortSignals, and cleanup under one explicit lifetime. They do not store or commit application data.

## Hover and focus

```js
import { turb } from 'turbulencejs';
import { hover } from 'turbulencejs/interact';

const cardHover = hover('.investment-card', {
  enter: turb.parallel(
    turb.track({ y: [0, -4], scale: [1, 1.02] }, { duration: 180 }),
    turb.track({ '--card-glow': [0, 1] }, { duration: 220 })
  ),
  leave: turb.parallel(
    turb.track({ y: [-4, 0], scale: [1.02, 1] }, { duration: 160 }),
    turb.track({ '--card-glow': [1, 0] }, { duration: 160 })
  ),
  interruption: 'reverse'
});

// Component unmount:
cardHover.destroy();
```

Targets accept an element, iterable, selector, or lazy function. Enter and leave may be Turbs or factories receiving `(target, index, context)`. Factories resolve per target with a deterministic seed and can use the same recipes as page choreography.

Pointer hover runs only on hover-capable, fine-pointer media by default. Touch pointer events are ignored rather than becoming sticky hover; select `touch: 'allow'` only for a deliberate product interaction. Keyboard focus uses `:focus-visible` parity and never traps focus. `focus: false` opts out when the host already has a separate focus treatment.

Interruption policies are explicit:

- `reverse` reverses the active performance when its graph supports reverse, otherwise restarts the opposite phase.
- `restart` cancels current visual work and starts the latest phase.
- `finish` commits the active visual endpoint before starting the latest phase.
- `ignore` keeps the current phase.
- `queue-latest` runs only the most recent pending phase after settlement.

`ownership: 'independent'` lets every target animate separately; `shared` transitions other active targets toward leave when a new target enters. `delegate: true` binds a selector at the supplied root and supports children added later without per-child listeners.

Sessions transition through `active`, `suspended`, `settling`, `cancelled`, and `destroyed`. `suspend()`/`resume()` pause compatible performances; `cancel()` settles owned work without removing bindings; `destroy()` is idempotent and final. An external `signal` destroys the session on abort. Window blur, page visibility loss, and Escape request leave transitions. Event boundaries reject disconnected targets safely; explicit `destroy()` remains the preferred component-unmount contract because global removal observation would add avoidable cost.

Diagnostics report state, target/listener/performance/live-value/pointer-capture/cleanup counts, and the last pointer type. They are local snapshots and never transmitted.

## Low-level session ownership

`createInteractionSession()` is available for interaction primitives that do not fit hover. Use `listen()` instead of raw event listeners, `ownPerformance()` for Turb performances, `ownStyle()` and `ownAttribute()` before temporary mutation, and `capturePointer()`/`releasePointer()` around pointer gestures. Register any other resource with `cleanup()`.

```js
import { createInteractionSession } from 'turbulencejs/interact';

const session = createInteractionSession({ signal: componentSignal });
session.addTarget(handle);
session.ownStyle(handle, ['cursor', 'touchAction']);
session.listen(handle, 'pointerdown', beginGesture);
session.cleanup(() => localGeometryCache.clear());
```

Reduced motion is inherited by each Turb performance: semantic hover/focus endpoints apply without scheduled frames, while listeners and keyboard behavior remain available. Factory and handler errors can be observed with `onError`; one failure does not leak listeners or prevent session teardown.

## Drag and drop motion

`drag()` provides visual gesture mechanics while the host owns validity and state commits:

```js
import { drag } from 'turbulencejs/interact';

const sortable = drag('.portfolio-row', {
  axis: 'y',
  strategy: 'ghost',
  dropZones: '.portfolio-row',
  grid: 4,
  async canDrop({ target, zone, signal }) {
    return zone !== target && await hostPolicyAllows(target, zone, { signal });
  },
  onDrop({ target, zone }) {
    // Host-owned application commit. Turbulence never performs this mutation.
    reorderPortfolio(target, zone);
  },
  announce({ messageKey, target, zone }) {
    announceLocalized(messageKey, { target, zone });
  }
});
```

The idempotent gesture state machine is `idle → armed → lifted → dragging → validating → committed|rejected|cancelled → settling → idle`. Diagnostics expose the current drag and owner states, pointer id, input mode, position, velocity, cached zone count, validation generation, and last outcome.

Pointer behavior uses primary Pointer Events and explicit pointer capture. Non-primary buttons and additional pointers are ignored. `pointercancel`, `lostpointercapture`, Escape, window blur, target removal, destroy, and external abort release capture and restore every temporary style, attribute, placeholder, ghost, and layer. `touch-action` is applied for the bound session and restored at destroy.

Geometry is snapshotted at lift: viewport or element bounds, transformed-element scale, scroll origin, and drop-zone rectangles are read once rather than on every frame. Pointer deltas account for page scrolling and transformed scale. `axis`, numeric or x/y `grid`, overscroll resistance, and `magneticDistance` constrain visual position. `autoScroll` is opt-in and event-bounded by an edge and speed; it never creates a timer or frame loop.

Visual strategies are:

- `original`: transform the semantic source in place.
- `ghost`: move an `aria-hidden` clone while optionally hiding the source.
- `layer`: preserve layout with an inert placeholder and temporarily place the source in a fixed layer.

Spring follow is the default. It is a long-lived, non-seekable Turb driver retargeted by pointer/keyboard events; the existing Turbulence timeline supplies every integration frame. `follow: 'direct'` applies pointer deltas immediately. Drop, reject, and cancel settle through a finite timeline spring. Supply ordinary Turbs or factories in `motion.lift`, `drop`, `reject`, and `cancel` to replace those visual phases.

`canDrop` may be synchronous or asynchronous. Each validation receives an AbortSignal; cancellation, destroy, or a newer validation invalidates stale results. A false result or thrown validator/commit runs rejection motion and returns the session to idle. `onDrop` is called only after validation and is the host's sole application-state commit hook. Turbulence never reorders DOM, writes stores, or changes business data by itself.

Keyboard behavior is on by default. Space or Enter picks up and drops, arrow keys move by `keyboardStep`, Home/End move to bounded extremes, and Escape cancels. The same `canDrop`/`onDrop` callbacks run with `keyboard: true`, focus returns to the source, and `aria-grabbed` is restored. `announce` receives stable message keys such as `drag.pickup`, `drag.move`, `drag.committed`, and `drag.rejected`; the host supplies localized wording and the live region. Turbulence contains no fixed business-language announcements.

Reduced motion preserves pointer/keyboard movement, validation, callbacks, focus, and announcements while applying cancel/drop/reject endpoints immediately with no follow or settle frames.
