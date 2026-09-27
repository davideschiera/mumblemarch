// `npm run lint` — zero-dependency architecture guard.
//  1. Layer import rules: each folder under src/ may only import from the layers listed below.
//  2. No `any`: explicit `any` types are banned (use `unknown` + narrowing).
//  3. Relative imports must use the `.ts` extension (required by Node type stripping).
//  4. core/ and levels/ stay deterministic: no Math.random, Date, performance, timers.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/** layer → layers it may import from (itself is always allowed). */
const ALLOWED = {
  core: [],
  levels: ['core'],
  art: ['core'],
  render: ['core', 'levels', 'art'],
  audio: ['core'],
  input: ['core'],
  persistence: ['core', 'input'],
  ui: ['core', 'levels', 'input', 'persistence', 'art'],
  app: ['core', 'levels', 'render', 'audio', 'input', 'ui', 'persistence', 'art'],
  '(root)': ['app'],
};

const IMPORT_RE = /^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
const ANY_RE = /\bany\b/;
const IMPURE_RE = /\b(Math\.random|Date|performance|setTimeout|setInterval|requestAnimationFrame|crypto)\b/;
const PURE_LAYERS = new Set(['core', 'levels', 'art']);

/** Remove comments and string/template literal contents so words inside them don't count. */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, (m) => m.replace(/[^\n]/g, ' '));
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (path.endsWith('.ts')) yield path;
  }
}

const layerOf = (file) => {
  const parts = relative('src', file).split(sep);
  return parts.length > 1 ? parts[0] : '(root)';
};

const problems = [];
for await (const file of walk('src')) {
  const layer = layerOf(file);
  const source = await readFile(file, 'utf8');
  codeOnly(source).split('\n').forEach((line, i) => {
    if (ANY_RE.test(line)) problems.push(`${file}:${i + 1} explicit 'any' is not allowed`);
    const impure = PURE_LAYERS.has(layer) && line.match(IMPURE_RE);
    if (impure) problems.push(`${file}:${i + 1} '${impure[1]}' breaks determinism in ${layer}/`);
  });
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (!spec || !spec.startsWith('.')) continue;
    if (!spec.endsWith('.ts')) problems.push(`${file}: relative import '${spec}' must end in .ts`);
    const target = relative('src', join(file, '..', spec)).split(sep);
    const targetLayer = target.length > 1 ? target[0] : '(root)';
    const allowed = ALLOWED[layer];
    if (!allowed) { problems.push(`${file}: unknown layer '${layer}' (add it to ALLOWED)`); continue; }
    if (targetLayer !== layer && !allowed.includes(targetLayer)) {
      problems.push(`${file}: layer '${layer}' must not import from '${targetLayer}' (${spec})`);
    }
  }
}

if (problems.length > 0) {
  console.error(`Architecture check failed (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log('Architecture check passed.');
