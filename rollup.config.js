import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// Banner comment to be placed at the top of each generated file
const banner = `/*!
 * Turbulence v${pkg.version}
 * A lightweight animation library for SaaS applications
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} License
 */`;

// Common output configuration
const outputConfig = {
  exports: 'named',
  sourcemap: false,
  banner
};

const babelPlugin = targets => babel({
  babelHelpers: 'bundled',
  exclude: 'node_modules/**',
  presets: [['@babel/preset-env', { targets }]]
});

const packs = ['cartoon', 'cinematic', 'subtle', 'extreme', 'surfaces', 'effects', 'interact', 'runtime', 'dom', 'main'];
const packExternals = ['turbulencejs', 'turbulencejs/runtime', 'turbulencejs/cartoon', 'turbulencejs/cinematic', 'turbulencejs/surfaces'];

const packBuilds = packs.flatMap(name => [
  {
    input: `src/entries/${name}.js`,
    external: packExternals,
    output: { file: `dist/${name}.js`, format: 'es', ...outputConfig },
    plugins: [resolve(), babelPlugin('> 1%, last 2 versions, not dead')]
  },
  {
    input: `src/entries/${name}.js`,
    external: packExternals,
    output: { file: `dist/${name}.cjs`, format: 'cjs', ...outputConfig },
    plugins: [resolve(), babelPlugin({ node: '10' })]
  }
]);

export default [
  // UMD build for browsers (minified)
  {
    input: 'src/index.js',
    output: {
      name: 'turbulencejs',
      file: 'dist/turbulencejs.min.js',
      format: 'umd',
      ...outputConfig
    },
    plugins: [
      resolve(),
      commonjs(),
      json(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 1%, last 2 versions, not dead' }]
        ]
      }),
      terser()
    ]
  },

  // UMD build for browsers (non-minified, for development)
  {
    input: 'src/index.js',
    output: {
      name: 'turbulencejs',
      file: 'dist/turbulencejs.umd.js',
      format: 'umd',
      ...outputConfig
    },
    plugins: [
      resolve(),
      commonjs(),
      json(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 1%, last 2 versions, not dead' }]
        ]
      })
    ]
  },

  // ESM build for bundlers
  {
    input: 'src/index.js',
    output: {
      file: pkg.module,
      format: 'es',
      ...outputConfig
    },
    plugins: [
      resolve(),
      json(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 1%, last 2 versions, not dead' }]
        ]
      })
    ]
  },

  // CommonJS build for Node.js
  {
    input: 'src/index.js',
    output: {
      file: 'dist/turbulencejs.cjs',
      format: 'cjs',
      ...outputConfig
    },
    plugins: [
      resolve(),
      json(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: { node: '10' } }]
        ]
      })
    ]
  },
  ...packBuilds,
  {
    input: 'src/surfaces/worker.js',
    output: { file: 'dist/surface-worker.js', format: 'es', ...outputConfig },
    plugins: [babelPlugin('> 1%, last 2 versions, not dead')]
  }
];
