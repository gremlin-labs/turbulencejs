#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? process.cwd());

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const manifestPath = resolve(root, 'package.json');
if (!await exists(manifestPath)) {
  console.error(`No package.json found at ${manifestPath}`);
  process.exitCode = 1;
} else {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies };
  const frameworks = ['next', 'react', 'vue', 'svelte', '@angular/core', 'solid-js'].filter(name => name in dependencies);
  const packageManager = await exists(resolve(root, 'pnpm-lock.yaml')) ? 'pnpm'
    : await exists(resolve(root, 'yarn.lock')) ? 'yarn'
      : await exists(resolve(root, 'bun.lockb')) || await exists(resolve(root, 'bun.lock')) ? 'bun'
        : await exists(resolve(root, 'package-lock.json')) ? 'npm'
          : manifest.packageManager?.split('@')[0] ?? 'unknown';
  const electron = 'electron' in dependencies || 'electron-vite' in dependencies;
  const turbulenceVersion = dependencies.turbulencejs ?? null;

  console.log(JSON.stringify({
    root,
    name: manifest.name ?? basename(root),
    private: manifest.private === true,
    packageManager,
    moduleType: manifest.type ?? 'commonjs',
    typescript: 'typescript' in dependencies || await exists(resolve(root, 'tsconfig.json')),
    frameworks,
    electron,
    turbulenceVersion,
    scripts: Object.keys(manifest.scripts ?? {}).sort(),
    candidateEntrypoints: electron
      ? ['turbulencejs/dom', 'turbulencejs/main']
      : ['turbulencejs']
  }, null, 2));
}
