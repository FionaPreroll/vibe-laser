# Vibe Laser

A laser logic puzzle for the browser. Place mirrors, prisms, filters and other optical parts on a grid until colored laser beams hit every coin in exactly its color. The game is inspired by Aargon Deluxe (Twilight Games, 2001); its rules are rebuilt from a written specification, with our own name, art and levels.

Once GitHub Pages is switched on (see [Deployment](#deployment)), the game runs at https://fionapreroll.github.io/vibe-laser/.

## Getting started

You need Node.js 22.12 or newer (CI uses Node 24) and pnpm. `package.json` pins pnpm 12.15.0, and pnpm 10 or newer switches to that version by itself.

```sh
pnpm install
pnpm dev
```

`pnpm dev` serves the game at http://localhost:5173 and reloads on every change.

## Scripts

| Script                         | What it does                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Development server with hot reload                                                    |
| `pnpm build`                   | Production build into `dist/`                                                         |
| `pnpm preview`                 | Serves `dist/` locally                                                                |
| `pnpm check`                   | Type check, lint and unit tests; run it before every push                             |
| `pnpm typecheck`               | TypeScript for `src/core` (without DOM types), the app, and the config and test files |
| `pnpm lint`, `pnpm format`     | Biome: check lint and formatting, or fix both                                         |
| `pnpm test`, `pnpm test:watch` | Vitest unit tests                                                                     |
| `pnpm test:e2e`                | Builds, then runs the Playwright browser tests                                        |

Playwright needs a Chromium: run `pnpm exec playwright install chromium` once, or set `CHROMIUM_PATH` to an installed Chromium binary.

## Stack

TypeScript 7, PixiJS 8 for the board, Preact with Signals for the interface around it, Vite 8, Vitest 5, Playwright and Biome 2.

## Project layout

```
src/
  core/      game rules in pure TypeScript: no DOM, PixiJS or Preact
  i18n/      English and German texts, t() and the language setting
  view/      PixiJS scene: board, later beams, pieces and input
  ui/        Preact header, screens and dialogs around the canvas
  main.tsx   entry point
tests/e2e/   Playwright browser tests
public/      static files, copied as they are
```

Later milestones add `game/` (session, ticks, undo), `content/` (packs and levels), `persistence/` (profiles and progress), `editor/` and `audio/`.

Two rules keep the layers apart:

- `src/core` imports nothing from outside `src/core`. Its own `tsconfig.core.json` has no DOM types, and Biome blocks imports of PixiJS, Preact and other `src/` folders there.
- Every text players see goes through `t()` from `src/i18n`, in English and German. The German catalog is typed against the English one, so a missing text fails the type check.

Unit tests sit next to the code as `*.test.ts`.

## Beam model

- Directions run 0 to 7 clockwise from north. A piece's rotation counts 45° steps clockwise from its base orientation; a laser fires in the direction of its rotation.
- A color is three bits, red 1, green 2 and blue 4. Mixing is OR, filtering is AND.
- `trace()` in `src/core/trace.ts` follows each primary color from each laser and records the light on every half-segment, the line from a cell's center toward one of its eight neighbours. Parts act on each primary on its own, so mixed light needs no second pass.
- Each part is a table in rotation 0 (`src/core/parts.ts`). Other rotations turn the beam into the part's frame and turn its exits back.
- Tests write boards in a text notation (`src/core/notation.ts`): `L2r . M5` is a red laser firing east, an empty cell and a mirror in rotation 5.
- Rules the spec leaves open are flags in `src/core/rules.ts`. `coinAngles` is decided; `beamIntoLaser: absorb` is an assumption until it is checked against the original.

Property tests (`src/core/properties.test.ts`, with fast-check) check the model on random boards: tracing ends within its bound, the light of all lasers is the sum of each laser alone, and turning or mirroring a board turns or mirrors its light.

## Game rules decided so far

- A coin hit by beams from several angles spins only if every beam carries exactly the coin's color (rule flag `coinAngles: sameColor`).
- All levels of a skill are open from the start.
- Art comes in switchable art packs. The first one is flat vector art drawn in code.
- The interface speaks English and German.

## CI and deployment

CI (`.github/workflows/ci.yml`) runs the type check, Biome, the unit tests, the build and the Playwright tests on every pull request and on every push to `main`.

### Deployment

Every push to `main` builds the game and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`). Pages has to be switched on once: Settings → Pages → Build and deployment → Source: GitHub Actions. The build uses relative asset paths, so it runs under any path.

## Branches and pull requests

- Every feature or fix gets its own branch off `origin/main`, named `feature/<name_in_snake_case>` or `fix/<name_in_snake_case>`.
- Each branch gets one pull request against `main`. Nobody pushes to `main` directly.
- A pull request is merged once CI is green.

## Changelog and versions

- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Changes that players can see go under `## [Unreleased]`, in `### Added`, `### Changed`, `### Fixed` or `### Removed`, written in English for players.
- Changes only developers notice, such as tests, tooling or refactoring, need no entry.
- A version is made only when asked. The entries under `## [Unreleased]` then move to a new `## [x.y.z] - YYYY-MM-DD` section, `package.json` gets the same version, and the commit is tagged `vx.y.z`. Versions follow [Semantic Versioning](https://semver.org/).

## License

There is no license yet.
