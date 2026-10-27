# Vibe Laser

A laser logic puzzle for the browser. Place mirrors, prisms, filters and other optical parts on a grid until colored laser beams hit every coin in exactly its color. The game is inspired by Aargon Deluxe (Twilight Games, 2001); its rules are rebuilt from a written specification, with our own name, art and levels.

Play it at https://fionapreroll.github.io/vibe-laser/.

## How to play

- Drag pieces from the toolbox on the left onto the board. Click a piece to turn it left, right-click to turn it right.
- A level is solved when every coin spins: each colored coin needs light of exactly its color, and dark anti-coins must stay out of the light.
- The buttons below the board restart the level, clean up (unlit pieces go back into the toolbox), undo, redo, and rotate the selected piece.
- Keyboard: focus the board with Tab. The arrow keys move a frame over the toolbox and the board, Enter picks a piece up and puts it down, Escape cancels, Q and E rotate, Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes.

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
  game/      the game session: current state, undo and redo, solved or not
  content/   the tutorial levels, until level packs arrive
  i18n/      English and German texts, t() and the language setting
  view/      PixiJS scene, art packs, pointer and keyboard input
  ui/        Preact header, button bar and dialogs around the canvas
  main.tsx   entry point
tests/e2e/   Playwright browser tests
public/      static files, copied as they are
```

Later milestones add `persistence/` (profiles and progress), `editor/` and `audio/`.

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

## Game session

- `GameSession` in `src/game/session.ts` is the only writer of game state. Views and buttons send it commands (`move`, `rotate`, or a `batch` of them, as Cleanup does) from `src/core/commands.ts`.
- Every command stores its inverse. Undo applies that inverse to the current puzzle instead of restoring a snapshot, so that later the work of slimes, mines and ships survives undo, as the spec demands.
- Once every coin spins, the session locks the level; only Restart and the next level remain.
- `BoardController` in `src/view/controller.ts` holds what only the interface needs: the selected piece, the keyboard focus and a piece lifted with the keyboard.
- Each tutorial level in `src/content/levels.ts` carries one known solution; a test plays every solution and expects the level to be solved.

## Game rules decided so far

- A coin hit by beams from several angles spins only if every beam carries exactly the coin's color (rule flag `coinAngles: sameColor`).
- All levels of a skill are open from the start.
- Art comes in switchable art packs. The first one is flat vector art drawn in code.
- The interface speaks English and German.

## Assumptions until checked against the original

- A beam that runs into a laser stops there (`beamIntoLaser: absorb`).
- Light passes through anti-coins, as it passes through coins.
- Mirrors and double mirrors stop a beam that runs along their surface; only the slit mirror lets it through.
- Cleanup returns unlit moveable pieces to the first free toolbox slots, in reading order; pieces that find no free slot stay on the board.
- The toolbox has two slots per board row.
- A dragged piece stays where it was until it is dropped, so carrying it around never changes the beams.

## CI and deployment

CI (`.github/workflows/ci.yml`) runs the type check, Biome, the unit tests, the build and the Playwright tests on every pull request and on every push to `main`.

### Deployment

Every push to `main` builds the game and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`), with Pages set to GitHub Actions in the repository settings. The build uses relative asset paths, so it runs under any path.

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
