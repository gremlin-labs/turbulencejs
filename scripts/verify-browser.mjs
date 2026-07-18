import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const run = (args) => execFileSync('npm', args, { cwd: root, stdio: 'inherit' });

run(['test', '--', '--runInBand', 'test/showcase', 'test/turbscript', 'test/effects', 'test/surfaces', 'test/interact']);
run(['run', 'showcase:build']);
console.log('Automated browser contract verified; manual viewport and reduced-motion matrix is recorded separately in release evidence.');

