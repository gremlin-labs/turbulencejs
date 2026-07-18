export function createVelocityTracker() {
  let previous = null;
  let velocity = { x: 0, y: 0 };
  return Object.freeze({
    update(position, time) {
      if (previous) {
        const delta = Math.max(1, time - previous.time);
        velocity = { x: (position.x - previous.x) / delta, y: (position.y - previous.y) / delta };
      }
      previous = { ...position, time };
      return velocity;
    },
    reset(position = { x: 0, y: 0 }, time = 0) { previous = { ...position, time }; velocity = { x: 0, y: 0 }; },
    get value() { return Object.freeze({ ...velocity }); }
  });
}
