// Shared esbuild options for dev and build. Two entry points: the app script and the stylesheet.
// Output names are flattened to `main.js` / `main.css`, referenced relatively by index.html,
// so `dist/` works from any static host and any sub-path.

/** @param {{ dev: boolean, outdir?: string }} mode @returns {import('esbuild').BuildOptions} */
export function esbuildOptions({ dev, outdir = 'dist' }) {
  return {
    entryPoints: ['src/main.ts', 'src/styles/main.css'],
    entryNames: '[name]',
    outdir,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    sourcemap: true,
    minify: !dev,
    legalComments: 'none',
    define: { __DEV__: String(dev) },
    logLevel: 'info',
  };
}
