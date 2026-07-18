// Choreography over "playables" — anything with { finished, cancel() }.
// Factories are functions returning a started playable, so sequences build
// steps lazily (each step reads fresh state when its turn comes).

function controllable() {
  let settle;
  const finished = new Promise((res) => {
    settle = res;
  });
  return { finished, settle };
}

// Run playable factories one after another. Cancelling cancels the active step
// and skips the rest.
export function sequence(factories) {
  const { finished, settle } = controllable();
  let active = null;
  let cancelled = false;

  (async () => {
    for (const make of factories) {
      if (cancelled) break;
      active = make();
      const result = await active.finished;
      if (cancelled || (result && result.cancelled)) break;
    }
    settle({ finished: !cancelled, cancelled });
  })();

  return {
    finished,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      if (active) active.cancel();
    },
  };
}

// Start all factories now; finished when every one finishes.
export function parallel(factories) {
  const players = factories.map((make) => make());
  const finished = Promise.all(players.map((p) => p.finished)).then((results) => ({
    finished: results.every((r) => r && r.finished),
    cancelled: results.some((r) => r && r.cancelled),
  }));
  return {
    finished,
    cancel() {
      players.forEach((p) => p.cancel());
    },
  };
}

// Start one playable per item with a fixed delay between starts.
// makePlayable(item, index) → playable. Delays ride on the provided ticker so
// tests can drive them deterministically.
export function stagger(ticker, items, makePlayable, staggerMs = 40) {
  const { finished, settle } = controllable();
  const players = [];
  let cancelled = false;
  let elapsed = 0;
  let started = 0;

  const startDue = () => {
    while (started < items.length && elapsed >= started * staggerMs) {
      players.push(makePlayable(items[started], started));
      started++;
    }
  };

  const removeTick = items.length > 0
    ? ticker.add((dt) => {
        elapsed += dt;
        startDue();
        if (started >= items.length) {
          removeTick();
          Promise.all(players.map((p) => p.finished)).then(() => {
            if (!cancelled) settle({ finished: true, cancelled: false });
          });
        }
      })
    : null;

  if (items.length === 0) settle({ finished: true, cancelled: false });
  else startDue(); // fire index 0 immediately

  return {
    finished,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      if (removeTick) removeTick();
      players.forEach((p) => p.cancel());
      settle({ finished: false, cancelled: true });
    },
  };
}

