import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        showcase: new URL('./src/index.html', import.meta.url).pathname,
        surfaceBenchmark: new URL('./src/surface-benchmark.html', import.meta.url).pathname
      }
    }
  }
});
