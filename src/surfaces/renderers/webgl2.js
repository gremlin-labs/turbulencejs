import { surfaceError, surfaceErrorCodes } from '../errors';

const vertexSource = `#version 300 es
in vec2 position;
out vec2 uv;
void main() { uv = (position + 1.0) * 0.5; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D image;
uniform float progress;
uniform float direction;
in vec2 uv;
out vec4 color;
float random(vec2 value) { return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 pixel = texture(image, vec2(uv.x, 1.0 - uv.y));
  float reveal = direction > 0.5 ? progress : 1.0 - progress;
  float visible = reveal >= 1.0 || (reveal > 0.0 && random(floor(gl_FragCoord.xy)) < reveal) ? pixel.a : 0.0;
  color = vec4(pixel.rgb, visible);
}`;

function shader(gl, type, source) {
  const value = gl.createShader(type);
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(value) || 'unknown shader error';
    gl.deleteShader(value);
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, `WebGL2 shader compilation failed: ${message}`);
  }
  return value;
}

export function createWebGL2Renderer({ canvas, source, mode = 'out' }) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true });
  if (!gl) throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'WebGL2 is unavailable.');
  const vertex = shader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, `WebGL2 program link failed: ${gl.getProgramInfoLog(program) || 'unknown link error'}`);
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.width, source.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.pixels);
  gl.useProgram(program);
  const progressLocation = gl.getUniformLocation(program, 'progress');
  const directionLocation = gl.getUniformLocation(program, 'direction');
  gl.uniform1f(directionLocation, mode === 'in' ? 1 : 0);
  let lost = false;
  let disposed = false;
  const onLost = event => { event.preventDefault(); lost = true; };
  canvas.addEventListener('webglcontextlost', onLost);
  return Object.freeze({
    type: 'webgl2',
    resources: Object.freeze({ webglContexts: 1, buffers: 2, pixels: source.width * source.height }),
    render(progress) {
      if (disposed) return;
      if (lost || gl.isContextLost?.()) throw surfaceError(surfaceErrorCodes.CONTEXT_LOST, 'WebGL2 context was lost.');
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(progressLocation, progress);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    }
  });
}
