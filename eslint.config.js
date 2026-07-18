import globals from 'globals';

export default [
  {
    ignores: ['coverage/**', 'dist/**', 'examples/showcase/dist/**', 'examples/showcase/node_modules/**']
  },
  {
    files: ['src/**/*.js', 'test/**/*.js', 'examples/showcase/src/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-dupe-keys': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        pendingAnimationFrames: 'readonly',
        runAnimationFrame: 'readonly'
      }
    }
  }
];
