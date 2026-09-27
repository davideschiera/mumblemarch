// `node scripts/snapshot.mjs <port> [outdir]` — a one-off PRODUCTION build (no live reload),
// served statically. For isolated browser checks while other agents keep editing (never rely
// on the shared dev server at :5180 for that — it reloads on every save).
import * as esbuild from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { esbuildOptions } from './esbuild.config.mjs';

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  console.error('Usage: node scripts/snapshot.mjs <port> [outdir]');
  process.exit(1);
}
const outdir = process.argv[3] ?? path.join(os.tmpdir(), `mumblemarch-snapshot-${port}`);

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await esbuild.build(esbuildOptions({ dev: false, outdir }));

await copyFile('index.html', path.join(outdir, 'index.html'));

const ctx = await esbuild.context({});
await ctx.serve({ host: '127.0.0.1', port, servedir: outdir });
console.log(`\n  Snapshot server: http://localhost:${port}/  (serving ${outdir}; Ctrl+C to stop)\n`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void ctx.dispose().then(() => process.exit(0));
  });
}
