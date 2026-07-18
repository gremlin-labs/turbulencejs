let context;
let source;
let output;
let mode = 'out';

self.onmessage = event => {
  const message = event.data;
  if (message.type === 'init') {
    context = message.canvas.getContext('2d');
    source = new Uint8ClampedArray(message.pixels);
    output = context.createImageData(message.width, message.height);
    mode = message.mode;
    return;
  }
  if (message.type === 'progress' && context) {
    const reveal = mode === 'in' ? message.progress : 1 - message.progress;
    const threshold = Math.floor(reveal * 255);
    for (let index = 0; index < source.length; index += 4) {
      output.data[index] = source[index];
      output.data[index + 1] = source[index + 1];
      output.data[index + 2] = source[index + 2];
      output.data[index + 3] = reveal >= 1 || (reveal > 0 && ((index * 31) % 256) < threshold) ? source[index + 3] : 0;
    }
    context.putImageData(output, 0, 0);
    self.postMessage({ type: 'rendered' });
  }
  if (message.type === 'dispose') {
    context = null;
    source = null;
    output = null;
    self.close();
  }
};
