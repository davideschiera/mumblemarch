// `npm run preview` — serve the production build (dist/) on http://localhost:5181 to check it
// exactly as a static host would. Run `npm run build` first.
import * as esbuild from 'esbuild';

const PREVIEW_PORT = 5181;
const ctx = await esbuild.context({ logLevel: 'info' });
await ctx.serve({ host: '127.0.0.1', port: PREVIEW_PORT, servedir: 'dist' });
console.log(`\n  Preview of dist/: http://localhost:${PREVIEW_PORT}/  (Ctrl+C to stop)\n`);
