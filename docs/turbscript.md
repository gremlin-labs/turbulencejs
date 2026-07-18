# TurbScript language guide

TurbScript is the compositional layer above Turbulence's existing renderer and timeline. It does not add a second frame loop. It compiles immutable animation descriptions—**Turbs**—into the same animation controllers and one owning timeline.

## The grammar

```js
import { turb, script } from 'turbulencejs';

const reveal = turb.sequence(
  turb.track({ opacity: [0, 1] }, { role: 'stateEnter' }),
  turb.parallel(
    turb.track({ y: [12, 0] }, { duration: 240 }),
    turb.at(80, turb.track({ scale: [0.96, 1] }))
  ),
  turb.wait(120)
);

script(reveal).play('.card');
```

- `track(properties, options)` describes keyframes.
- `driver(factory, options)` creates a deterministic progress-driven playback unit for advanced rendering.
- `mark(name, metadata?)` emits a named, zero-duration phase event when forward playback crosses it.
- `sequence(...turbs)` runs children one after another.
- `parallel(...turbs)` starts children together.
- `wait(ms)` creates empty time; `at(ms, turb)` offsets a child.
- `each(factory)` creates a Turb for each target.
- `stagger(ms, turbOrFactory)` offsets targets in their resolved order.
- `cycle(...turbs)` assigns choices round-robin.
- `choose(turbs)` assigns a seeded random choice.
- `shuffle(turb)` seeded-shuffles target order before compiling its child.
- `slot(name, turb)` redirects a child to a relative element.
- `effect(setup, turb, capabilities)` scopes temporary styles or resources to the performance lifecycle.
- `define(name, factory)` creates a named, validated recipe factory.

Constructors validate immediately. A non-Turb child, negative time, empty choice list, unresolved slot, or factory that returns another value throws a descriptive error. Turbs are frozen and target-independent, so one value can be replayed against different collections.

## Targets and slots

Targets resolve when `play()` runs, not when the Turb is authored. Accepted sources are an element, iterable, selector, lazy function, or records containing an element plus slots.

```js
const cards = () => [...document.querySelectorAll('.card')].map(target => ({
  target,
  slots: {
    title: '[data-title]',
    actions: target => target.querySelector('[data-actions]')
  }
}));

script(turb.slot('title', reveal)).play(cards, { root: dashboard });
```

Selectors are scoped by `root`. Empty collections are valid and complete safely. Missing or non-element slots fail before playback rather than silently targeting the wrong node.

## Collections and deterministic variation

Factories receive `(target, index, context)`. The context includes `count`, user `context`, a local `random()` function, and resolved slots. `choose`, `shuffle`, and that random function use the performance seed; they never mutate global randomness.

```js
const performance = script(turb.choose([soft, loud])).play('.card', {
  seed: 'demo-42',
  context: { density: 'comfortable' }
});

performance.replay();           // same assignments
performance.reseed('demo-43');  // rebuild with new assignments
```

## Lifecycle and endpoints

One `TurbPerformance` owns every compiled child and effect cleanup.

- `stop()` interrupts and preserves the current visual frame.
- `reset()` stops, cleans up, and restores the inline properties owned by the performance.
- `finish()` applies the final endpoint and completes.
- `replay()` resets, resolves targets again, and plays with the same seed.
- `reseed(seed?)` replays with a supplied or fresh local seed.
- `pause()`, `resume()`, `reverse()`, and `seek(ms)` control supported graphs.

`state`, `duration`, `seed`, `capabilities`, and `diagnostics` expose truthful runtime information. `diagnostics` includes resolved targets, compiled tracks, owned active work, duration, and seed. A graph can declare an effect non-pausable, non-reversible, or non-seekable; unsupported controls throw instead of pretending to work.

Completion, cancellation, setup failure, reset, finish, and reduced-motion settlement run owned cleanup once. Do not mutate focus, DOM ownership, or application state in animation setup; motion should decorate a transition, not become the transition's source of truth.

## Advanced drivers and marks

Drivers are the escape hatch for pixels, canvases, games, and other renderers that cannot be expressed as CSS properties. A driver receives the target and a lifecycle scope once, then Turbulence supplies deterministic eased progress from the owning timeline. Driver code must not create its own animation frame loop.

```js
const meter = turb.sequence(
  turb.driver(({ target, lifecycle, random }) => {
    const hue = Math.floor(random() * 360);
    lifecycle.resource('canvas', 1);
    lifecycle.cleanup(() => target.style.removeProperty('--meter-hue'));

    return {
      render(progress) {
        target.style.setProperty('--meter', progress);
        target.style.setProperty('--meter-hue', hue);
      },
      finish() {},
      cancel() {}
    };
  }, { duration: 500, easing: 'easeOut' }),
  turb.mark('meter-ready', { version: 1 })
);

const performance = script(meter).play('.meter', { autoplay: false });
const unsubscribe = performance.on('mark', event => {
  if (event.name === 'meter-ready') announceReady();
});
performance.play();
```

The factory may return a render function as shorthand, or an object with `render` plus optional `start`, `finish`, `cancel`, `cleanup`, `capabilities`, `resources`, and `diagnostics`. `duration` is required. Use `lifecycle.cleanup()`, `listen()`, `timeout()`, and `interval()` for owned work; the lifecycle abort signal fires before registered cleanup runs. Setup, render, and lifecycle hooks must only update visual state. Application data and business transitions belong in host code, typically in a mark handler.

Capabilities are obligations. Set `reversible`, `seekable`, `pausable`, or `finishable` to `false` when the renderer cannot honor that operation. A mixed graph reports the strict intersection and rejects unsupported controls before changing playback.

Forward playback emits each mark once per pass in timeline order. Replay emits marks again. `seek(ms)` is silent; use `seek(ms, { emitMarks: true })` to deliberately emit forward crossings. Reverse playback never fabricates forward business events. Reduced motion emits forward marks in order before asynchronous completion. Handler failures are isolated, reported through `onError` when supplied, and do not prevent other handlers or completion.

## Reduced motion

Performances respect `prefers-reduced-motion: reduce` by default. The semantic final state is applied immediately, completion and cleanup run in a microtask, and no animation frame remains scheduled. Keep opacity, visibility, focus, and content order correct without motion. Set `respectReducedMotion: false` only when motion is essential and an equivalent accessible result cannot be provided.

## Fluent director

`direct(targets)` is a chainable authoring surface that compiles into the same Turb graph:

```js
direct('.row')
  .using(fade)
  .together(lift)
  .then(settle)
  .stagger(35)
  .using((target, index) => index % 2 ? left : right)
  .seed('rows')
  .play();
```

Use the grammar when explicit nesting is clearer and the director for linear choreography. They can freely share custom and official Turbs.

Turb values are a JavaScript authoring API, not a stable JSON or remote-execution format. Serialization and evaluation of untrusted choreography are intentionally outside the current contract.
