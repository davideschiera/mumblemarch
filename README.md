# Lemmings (vanilla HTML/CSS/TypeScript)

This is a browser remake of the classic *Lemmings*, with brand-new levels. It uses no
frameworks and has no runtime dependencies. All art is drawn in code, and all audio is
synthesised with Web Audio.

## Requirements

- Node.js **22.18 or later** (it runs the TypeScript tests natively)
- npm

## Run

```sh
npm install
npm run dev        # http://localhost:5180 — rebuilds and reloads on save
```

## Other commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build into `dist/`. It can be served by any static host, from any sub-path. |
| `npm run preview` | Serve `dist/` on http://localhost:5181 |
| `npm run typecheck` | TypeScript 7 strict type-check (app, core purity, tests) |
| `npm run lint` | Architecture guard: layer imports, no `any`, `.ts` specifiers |
| `npm test` | Unit tests (`node --test`) |
| `npm run check` | All of the above except the build: run it before committing |

## Project map

- `src/core/`: the deterministic simulation. It is pure TypeScript and unit-tested.
- `src/levels/`: level data and the compiler.
- `src/render/`, `src/audio/`, `src/input/`, `src/ui/`, `src/app/`, `src/persistence/`: the
  browser layers.
- `docs/`: the plan, research, design and architecture docs. See
  [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Automation

The game exposes `window.__game`, a small JSON API for browser tests. It can load a level,
step ticks, assign skills and read snapshots. See ARCHITECTURE.md §14.
