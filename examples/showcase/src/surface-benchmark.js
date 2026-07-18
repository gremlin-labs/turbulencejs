import { script } from 'turbulencejs';
import { captureElement, dissolve, source } from 'turbulencejs/surfaces';
import workerUrl from 'turbulencejs/surface-worker?url';

const fixtures = [
  { name: 'small', width: 64, height: 64 },
  { name: 'medium', width: 256, height: 256 },
  { name: 'large', width: 1024, height: 768 }
];

async function benchmark(fixture) {
  const target = document.createElement('div');
  target.style.width = `${fixture.width}px`;
  target.style.height = `${fixture.height}px`;
  document.querySelector('#fixture').append(target);
  await new Promise(resolve => requestAnimationFrame(resolve));
  const pixels = new Uint8ClampedArray(fixture.width * fixture.height * 4);
  pixels.fill(180);
  const imageData = new ImageData(pixels, fixture.width, fixture.height);
  let longTasks = 0;
  const observer = typeof PerformanceObserver === 'function'
    ? new PerformanceObserver(entries => { longTasks += entries.getEntries().length; })
    : null;
  try { observer?.observe({ type: 'longtask', buffered: true }); } catch { observer?.disconnect(); }
  const setupStart = performance.now();
  const performanceController = script(dissolve.out(source.imageData(imageData), {
    duration: 1000,
    renderer: 'canvas2d',
    dpr: 1,
    visibility: 'preserve'
  })).play(target, { autoplay: false });
  const setupMs = performance.now() - setupStart;
  const frames = [];
  for (const time of [0, 125, 250, 375, 500, 625, 750, 875, 1000]) {
    const start = performance.now();
    performanceController.seek(time);
    frames.push(performance.now() - start);
  }
  performanceController.reset();
  observer?.disconnect();
  const cleanup = document.querySelectorAll('[data-turbulencejs-surface], [data-turbulencejs-surface-blocks]').length === 0;
  target.remove();
  return {
    ...fixture,
    setupMs,
    meanFrameMs: frames.reduce((sum, value) => sum + value, 0) / frames.length,
    maxFrameMs: Math.max(...frames),
    longTasks,
    cleanup
  };
}

function fixturePixels(width = 128, height = 96) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set([index % 255, 120, 210, 255], index);
  return new ImageData(pixels, width, height);
}

async function rendererCase(name, requested, input) {
  const target = document.createElement('div');
  target.style.width = '128px';
  target.style.height = '96px';
  target.textContent = 'TURBULENCEJS';
  document.querySelector('#fixture').append(target);
  await new Promise(resolve => requestAnimationFrame(resolve));
  try {
    const performanceController = script(dissolve.out(input, {
      duration: 100,
      renderer: requested,
      visibility: 'preserve',
      workerFactory: requested === 'worker' ? () => new Worker(workerUrl, { type: 'module' }) : undefined
    })).play(target, { autoplay: false });
    performanceController.seek(0).seek(50).seek(100);
    const diagnostics = performanceController.diagnostics;
    performanceController.reset();
    await Promise.resolve();
    return {
      name, requested,
      selected: diagnostics.selectedRenderer || requested,
      fallbacks: diagnostics.fallbackCount || 0,
      cleanup: document.querySelectorAll('[data-turbulencejs-surface], [data-turbulencejs-surface-blocks]').length === 0
    };
  } catch (error) {
    return { name, requested, selected: `error:${error.code || error.name}`, fallbacks: 0, cleanup: true };
  } finally { target.remove(); }
}

async function rendererMatrix() {
  const raster = source.imageData(fixturePixels());
  const results = [];
  for (const requested of ['dom-blocks', 'canvas2d', 'webgl2', 'worker', 'auto']) {
    results.push(await rendererCase(`raster-${requested}`, requested, raster));
  }
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = 32;
  imageCanvas.height = 24;
  const imageContext = imageCanvas.getContext('2d');
  imageContext.fillStyle = '#b7f34a';
  imageContext.fillRect(0, 0, 32, 24);
  const image = new Image();
  image.src = imageCanvas.toDataURL('image/png');
  await image.decode();
  results.push(await rendererCase('loaded-image', 'canvas2d', source.image(image)));

  const captureTarget = document.createElement('div');
  captureTarget.style.cssText = 'width:128px;height:96px;background:#5f4cff;color:white';
  captureTarget.textContent = 'DOM CAPTURE';
  document.querySelector('#fixture').append(captureTarget);
  try {
    const captured = await captureElement(captureTarget, { assets: 'none', fonts: 'skip', timeout: 3000, dpr: 1 });
    results.push(await rendererCase('supported-dom-capture', 'canvas2d', captured.source));
  } catch (error) {
    results.push({ name: 'supported-dom-capture', requested: 'canvas2d', selected: `error:${error.code || error.name}`, fallbacks: 0, cleanup: true });
  } finally { captureTarget.remove(); }
  return results;
}

async function run() {
  const results = [];
  for (const fixture of fixtures) results.push(await benchmark(fixture));
  document.querySelector('#results').innerHTML = results.map(result => `
    <tr data-fixture="${result.name}">
      <td>${result.name} (${result.width}×${result.height})</td>
      <td>${result.setupMs.toFixed(2)}</td>
      <td>${result.meanFrameMs.toFixed(2)}</td>
      <td>${result.maxFrameMs.toFixed(2)}</td>
      <td>${result.longTasks}</td>
      <td>${result.cleanup ? 'zero' : 'leaked'}</td>
    </tr>
  `).join('');
  const renderers = await rendererMatrix();
  document.querySelector('#renderer-results').innerHTML = renderers.map(result => `
    <tr data-renderer-case="${result.name}">
      <td>${result.name}</td><td>${result.requested}</td><td>${result.selected}</td><td>${result.fallbacks}</td><td>${result.cleanup ? 'zero' : 'leaked'}</td>
    </tr>
  `).join('');
  window.__TURBULENCEJS_SURFACE_BENCHMARK__ = results;
  window.__TURBULENCEJS_RENDERER_MATRIX__ = renderers;
  document.querySelector('#status').textContent = 'Complete';
}

run();
