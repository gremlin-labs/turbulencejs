let animationFrames;
let frameId;
let now;

beforeEach(() => {
  animationFrames = new Map();
  frameId = 0;
  now = 0;

  jest.spyOn(performance, 'now').mockImplementation(() => now);
  global.requestAnimationFrame = jest.fn(callback => {
    const id = ++frameId;
    animationFrames.set(id, callback);
    return id;
  });
  global.cancelAnimationFrame = jest.fn(id => {
    animationFrames.delete(id);
  });
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

global.runAnimationFrame = timestamp => {
  now = timestamp;
  const callbacks = [...animationFrames.values()];
  animationFrames.clear();
  callbacks.forEach(callback => callback(timestamp));
};

global.pendingAnimationFrames = () => animationFrames.size;
