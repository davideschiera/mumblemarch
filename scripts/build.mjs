// `npm run build` — production bundle into dist/ (index.html + main.js + main.css + sourcemaps).
import * as esbuild from 'esbuild';
import { copyFile, rm, mkdir } from 'node:fs/promises';
import { esbuildOptions } from './esbuild.config.mjs';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await esbuild.build(esbuildOptions({ dev: false }));
await copyFile('index.html', 'dist/index.html');
console.log('Built dist/ — serve it with any static server (e.g. `npm run preview`).');
