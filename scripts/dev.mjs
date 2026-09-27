// `npm run dev` — esbuild watch + in-memory dev server with live reload on http://localhost:5180
// index.html is served straight from the project root (as the fallback page); bundles are served
// from memory (nothing is written to dist/). The app reloads itself on rebuild (see src/main.ts).
import * as esbuild from 'esbuild';
import { esbuildOptions } from './esbuild.config.mjs';

export const DEV_PORT = 5180;

const ctx = await esbuild.context({ ...esbuildOptions({ dev: true }), write: false });
await ctx.watch();
await ctx.serve({ host: '127.0.0.1', port: DEV_PORT, fallback: 'index.html' });
console.log(`\n  Dev server: http://localhost:${DEV_PORT}/  (Ctrl+C to stop)\n`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void ctx.dispose().then(() => process.exit(0));
  });
}
