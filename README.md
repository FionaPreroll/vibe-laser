# Vibe Laser

[![Coverage](https://codecov.io/gh/FionaPreroll/vibe-laser/branch/main/graph/badge.svg)](https://codecov.io/gh/FionaPreroll/vibe-laser)

A laser logic puzzle for the browser. Place mirrors, prisms, filters and other optical parts on a grid until colored laser beams hit every coin in exactly its color. The game is inspired by Aargon Deluxe (Twilight Games, 2001); its rules are rebuilt from a written specification, with our own name, art and levels.

Play it at https://fionapreroll.github.io/vibe-laser/.

## How to play

- Pick a level pack, a skill and a level. Every level of a skill is open from the start, and solved levels carry a mark.
- Drag pieces from the toolbox on the left onto the board. Click a piece to turn it left, right-click to turn it right.
- On a touch screen, tap a piece to select it and tap it again to turn it left, or tap a free place to move the selected piece there; dragging works too. Pinch to zoom in on the board, up to four times its size, and drag an empty spot to look around.
- A level is solved when every coin spins: each colored coin needs light of exactly its color, and dark anti-coins must stay out of the light.
- Keep light away from explosives. One that goes off sets off its neighbours too, and the level is lost; only starting again helps.
- Slimes, robot mines and spaceships move by themselves. With mines or ships on the board, a solution must hold for five seconds while a bar fills.
- The buttons below the board lead back to the level selection, restart the level, clean up (unlit pieces go back into the toolbox), undo, redo, rotate the selected piece and open the help.
- Each player can have a profile of their own, with their own progress and settings: the volume of sound effects and music, and less motion on the board. Profiles can be exported as a file and imported in another browser.
- Keyboard: focus the board with Tab. The arrow keys move a frame over the toolbox and the board, Enter picks a piece up and puts it down, Escape cancels, Q and E rotate, Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes.
- The level editor in the header makes levels of your own, in packs that appear in the pack list next to the built-in ones (see [Level editor](#level-editor)).

## Parts

The abbreviations are those of the board notation (see [Beam model](#beam-model)).

| Part            | Abbreviation | What it does                                                                                                                                  |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Laser           | `L`          | Fires a beam of its color.                                                                                                                    |
| Mirror          | `M`          | Its silver side turns a beam by 90°, or sends a beam that hits it head-on straight back. Its back stops light.                                |
| Double mirror   | `DM`         | A mirror that reflects on both sides.                                                                                                         |
| Slit mirror     | `SM`         | A double mirror with a slit between its faces: a beam along its surface passes straight through.                                              |
| Refractor       | `R`          | A glass bar that bends light by 45°. Light enters only through its two short ends; the shaded long sides stop it.                             |
| One-way         | `OW`         | Lets light in only straight through its broad side.                                                                                           |
| Splitter        | `S`          | Splits light that hits its tip into two beams, 90° to the left and to the right. Every other side stops light.                                |
| Threeway        | `SC`         | Light through the flat side splits and leaves both bevels turned 45°. Light through a bevel leaves the flat side.                             |
| Prism           | `P`          | Splits light into its primaries: red goes straight, green turns 45° and blue 90°. Run backwards, it merges them into one beam.                |
| Color converter | `CC`         | Shifts colors: through the narrow end red turns green, green blue and blue red; through the broad end the other way round. White stays white. |
| Filter          | `F`          | Lets only its own colors through, from every direction. Filters do not rotate.                                                                |
| Polarizer       | `PO`         | A filter that also lets light through only in the direction its marker points.                                                                |
| Coin            | `C`          | Spins when the light on its line has exactly its color.                                                                                       |
| Anti-coin       | `A`          | Spins as long as no light touches it.                                                                                                         |

Hazards and actors stop beams. Actors also have a heading, written as a digit after the abbreviation, so `SL0` is a slime heading north.

| Part       | Abbreviation | What it does                                                                                                                                                |
| ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explosive  | `T`          | Explodes when light, a mine or a ship reaches it, and destroys everything on its eight neighbours. Explosives among them go off as well.                    |
| Fuel cell  | `FC`         | Explodes like an explosive. A ship flying over it takes it aboard and can fire once.                                                                        |
| Black hole | `H`          | Swallows light. While no light falls into it, it pulls in ships in line with it and destroys them.                                                          |
| Slime      | `SL`         | Walks ahead and turns right where something is in its way. It eats the first explosive, or the first plain mirror without light, that it runs into.         |
| Robot mine | `MI`         | Jumps around in all eight directions and bounces off beams, pieces and the edge. Running into an explosive sets it off.                                     |
| Spaceship  | `SH`         | Flies east or west and drops a row when something is in its way. With a fuel cell aboard, it shoots the next explosive ahead; running into one sets it off. |

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
| `pnpm test:coverage`           | Unit tests with a coverage report in `coverage/`                                      |
| `pnpm test:e2e`                | Builds, then runs the Playwright browser tests                                        |
| `pnpm schemas`                 | Writes `packs/*.schema.json` again from the level and pack schemas                    |

Playwright needs a Chromium: run `pnpm exec playwright install chromium` once, or set `CHROMIUM_PATH` to an installed Chromium binary.

## Stack

TypeScript 7, PixiJS 8 for the board, Preact with Signals for the interface around it, Vite 8, Vitest 5, Playwright and Biome 2.

## Project layout

```
src/
  core/         game rules in pure TypeScript: no DOM, PixiJS or Preact
  game/         the game session: current state, undo and redo, solved or not
  content/      level and pack files: their schema, the loader, solutions
  editor/       the level editor's logic: palette, level edits, history, controller
  persistence/  profiles and the player's own packs, saved in IndexedDB
  audio/        sound effects and music, synthesized with Web Audio
  i18n/         English and German texts, t() and the language setting
  view/         PixiJS scene, art packs, pointer and keyboard input for game and editor
  ui/           Preact screens, header, button bar and dialogs around the canvas
  main.tsx      entry point
packs/          the level packs, one folder each
tools/          the dev server's endpoint that writes built-in packs
tests/e2e/      Playwright browser tests
public/         static files, copied as they are
```

Two rules keep the layers apart:

- `src/core` imports nothing from outside `src/core`. Its own `tsconfig.core.json` has no DOM types, and Biome blocks imports of PixiJS, Preact and other `src/` folders there.
- Every text players see goes through `t()` from `src/i18n`, in English and German. The German catalog is typed against the English one, so a missing text fails the type check.

Unit tests sit next to the code as `*.test.ts`, component tests as `*.test.tsx`. Tests that need a DOM say so in their first line (`// @vitest-environment happy-dom`) and render Preact components with Preact Testing Library. PixiJS's scene graph works without a renderer, so the view layers are tested directly, and `mountBoard` and `mountEditorBoard` run against a stand-in `Application` that receives pointer and keyboard events. Only WebGL drawing itself is left to the Playwright tests.

## Beam model

- Directions run 0 to 7 clockwise from north. A piece's rotation counts 45° steps clockwise from its base orientation; a laser fires in the direction of its rotation.
- A color is three bits, red 1, green 2 and blue 4. Mixing is OR, filtering is AND.
- `trace()` in `src/core/trace.ts` follows each primary color from each laser and records the light on every half-segment, the line from a cell's center toward one of its eight neighbours. Parts act on each primary on its own, so mixed light needs no second pass.
- Each part is described once, in rotation 0, in `src/core/parts.ts`: as a table of exits for each direction of travel, or as a small function where the color matters. Other rotations turn the beam into the part's frame and turn its exits back.
- Tests and levels write boards in a text notation (`src/core/notation.ts`): an abbreviation, then the rotation for parts that rotate, then the color letters. `L2r . M5 Fg PO2b` is a red laser firing east, an empty cell, a mirror in rotation 5, a green filter and a blue polarizer pointing east.
- Rules the spec leaves open are flags in `src/core/rules.ts`. `coinAngles` is decided; `beamIntoLaser: absorb`, `polarizer: direction` and `actorsBlockLight: true` are assumptions until they are checked against the original.

Property tests (`src/core/properties.test.ts`, with fast-check) check the model on random boards: tracing ends within its bound, the light of all lasers is the sum of each laser alone, turning a board turns its light, and mirroring a board mirrors its light. The mirror test leaves out prisms, which bend light one way round; a mirrored refractor is the same refractor turned by 45°.

## Game session

- `GameSession` in `src/game/session.ts` is the only writer of game state. Views and buttons send it commands (`move`, `rotate`, or a `batch` of them, as Cleanup does) from `src/core/commands.ts`.
- Every command stores its inverse. Undo applies that inverse to the current puzzle instead of restoring a snapshot, so that later the work of slimes, mines and ships survives undo, as the spec demands.
- Once every coin spins, the session locks the level; only Restart and the next level remain.
- Time runs in fixed ticks of 100 ms. The view feeds the session elapsed time with `advance()`; tests call `tick()`. On each tick the actors in `src/core/actors/` take their steps in id order, slimes every 8 ticks, mines and ships every 4. Mines bounce at random, from a generator seeded per session, so a level plays the same way for the same moves.
- The phases are `playing`, `stabilizing`, `exploding`, `failed` and `solved`. With mines or ships about, every coin spinning first means `stabilizing`, and the level counts as solved once that has held for 50 ticks. A lit explosive means `exploding`: the chain from `src/core/explosions.ts` spreads one ring per tick, then the level has `failed`.
- Undo takes back only player moves. Whatever actors and explosions did stays, and an undo entry whose piece is gone or whose cell is taken is dropped.
- The session reports what happens as events, such as `ignited`, `ate` or `fired`, for the view's effects.
- `BoardController` in `src/view/controller.ts` holds what only the interface needs: the selected piece, the keyboard focus and a piece lifted with the keyboard. Its `tap()` decides what a tap on a touch screen does.
- The stage keeps the scene's transform on the screen (`src/view/layout.ts`): fitted at first, zoomed and panned by fingers within bounds, and when the screen changes size, as when a phone's address bar hides, zoomed as far as before with the same middle.
- Every level file carries one known solution, with waits where actors must do their part first. `playSolution` and `replaySolution` in `src/content/solution.ts` play it; tests in `src/content/packs.test.ts` play every solution under eight seeds and expect the level to be solved, and check that no level explodes or solves itself during a minute without moves.

## Level packs

Levels live in `packs/`, a folder per pack, after the JSON proposal of the spec:

```
packs/
  level.schema.json          JSON Schema of a level file, for editors
  pack.schema.json           JSON Schema of pack.json
  tutorial/
    pack.json                title, description, place in the list, skill names
    levels/skill1/level_001.json
    levels/skill1/level_002.json
    …
```

- A pack has one to four skills of up to 30 levels each. A level's id comes from its path: `tutorial/2/5` is the fifth level of the second skill. With `"selectSkill": false`, or with one skill only, the pack opens straight at its levels.
- `pack.json` gives the title and description in English and German, the `position` in the list of packs, the skill names, and optionally `rules`: rule flags from `src/core/rules.ts` for every level of the pack.
- A level file gives its `name` in English and German, its `size` as columns and rows (up to 32 × 26), the `objects` on the board, the `toolbox`, optionally its own `rules`, and the known `solution`. An optional `note` tells other authors what the level is about.
- Objects name their cell as in the original, row letter and column number (`B6`), their `type` (`laser`, `mirror`, `blackHole` and so on), their rotation `rot` from 0 to 7 and their color `rgb` as the letters of the switched-on colors, so `"rb"` is magenta. Pieces on the board are fixed and toolbox pieces free; `moveable` and `rotateable` change that. A toolbox entry can repeat itself with `count`.
- A solution step puts toolbox piece `piece` (counted from 0) on cell `pos` in rotation `rot`. A piece that starts on the board is named by its cell instead: `{ "from": "C3", "pos": "B6", "rot": 7 }` moves or turns it, `{ "from": "C3", "stow": true }` puts it into the toolbox. `{ "wait": 10 }` lets ten ticks pass. Steps say where a piece ends up, so the same piece may appear twice.

```json
{
  "$schema": "../../../level.schema.json",
  "version": 1,
  "name": { "en": "First Light", "de": "Erstes Licht" },
  "size": [6, 3],
  "objects": [
    { "type": "coin", "pos": "A6", "rgb": "r" },
    { "type": "laser", "pos": "B1", "rot": 2, "rgb": "r" }
  ],
  "toolbox": [{ "type": "mirror", "rot": 0 }],
  "solution": [{ "piece": 0, "pos": "B6", "rot": 7 }]
}
```

The Zod schemas in `src/content/schema.ts` check every file and name each problem with its place, such as `objects[3].pos: G2 lies outside a 6 × 3 board`. They also check what JSON Schema cannot: cells on the board and free, colors for parts that need one, rotations only for parts that turn, at least one coin. The two `*.schema.json` files are generated from them, and a test fails when they fall behind; `pnpm schemas` writes them again.

The build bundles every `pack.json`, and each level file becomes a small file of its own that loads when its level list or the level opens (`src/content/packs.ts`).

## Screens and saves

- The address after `#` names the screen, so the browser's back button and bookmarks work: `#/` lists the packs, `#/packs/tutorial` the skills of a pack, `#/packs/tutorial/2` the levels of a skill, `#/play/tutorial/2/5` opens a level, and `#/profiles` and `#/about` the profiles and the version with the changelog. The editor lives at `#/editor`, a pack in it at `#/editor/<pack>` and a slot at `#/editor/<pack>/2/5`.
- Help and the settings open over the game and stop its clock while they are open.
- `ProfileBook` in `src/persistence/profiles.ts` keeps all profiles in one record in IndexedDB (database `vibe-laser`, store `saves`), through idb-keyval. The record carries a version, and `migrate()` is where later formats will convert older saves; a record it cannot read starts afresh. Changes are saved one after another, so the last one always wins.
- A profile holds a name, the ids of its solved levels and its settings. Reduced motion starts on when the system asks for less motion. After the first solved level the game asks the browser to keep its storage (`navigator.storage.persist()`).
- An exported profile is a JSON file (`"format": "vibe-laser-profile"`). An imported one gets a new id, and a number after its name when the name is taken.
- Where the browser blocks IndexedDB, as some private windows do, progress lasts until the page closes, and the game says so.
- The language is a setting of the browser, not of a profile, and stays in `localStorage`.
- `PackShelf` in `src/persistence/packs.ts` keeps the player's own packs in the same store, as one versioned record of pack settings and levels by slot. The library in `src/content/packs.ts` lists them after the built-in packs, so they play like any other.

## Level editor

The editor is a mode of the game: the same board with different input. Its logic is in `src/editor/` without any drawing, its board in `src/view/editorBoard.ts`, and its screens in `src/ui/editor/`, which load only when a player opens the editor.

- **Packs.** The editor starts with the player's own packs: a new pack, an imported `.vlpack.json` file, or one made before. A pack has one to four skills with 30 slots each, and its settings: titles, descriptions, skill names and whether players choose a skill first. A pack exports as one `.vlpack.json` file with every level inside (`"format": "vibe-laser-pack"`).
- **Board.** A click uses the tool: Select, Paint, Clone or Eraser. Select drags pieces, also between board and toolbox; Paint and Eraser paint along a drag, which undoes as one step; Clone picks up a piece to paint copies of it. A right click turns a piece. Each part has a key, as `H` for a black hole in the original: it puts the part where the pointer or the keyboard frame is, Q and E turn, Delete removes, Ctrl+Z and Ctrl+Y undo and redo.
- **Panels.** The selected piece's colors, direction or heading, and whether players may move and turn it; the level's names, note and size; its problems; and its solution.
- **Problems** show live, in the player's language, and keep a level from being saved: a missing name or coin, a color missing, light on an explosive or every coin spinning before the first move, or a solution that no longer works. A problem with a place selects it.
- **Test** plays the level as players will. Solved, its moves can become the level's solution: where the player left each piece, in the order of the last moves, with waits where actors make timing matter, and without the steps the level did not need. The editor then replays the solution with every random seed the golden tests use.
- **Slots.** Copy, Paste, Swap with the copied level, Clear and Delete work as in the original's level actions; Export and Import read and write single level files. Unsaved changes survive leaving the editor while the page stays open, and closing the page asks first.

### Built-in levels

While `pnpm dev` runs, the editor also lists the built-in packs. Saving one of their levels sends it to an endpoint of the dev server (`tools/packFiles.ts`), which checks the level with the game's own schema and writes it to `packs/<pack>/levels/skill<n>/level_<nnn>.json`, formatted by Biome, so a level saved unchanged stays byte for byte the same. The endpoint only answers the page it serves, and only writes into packs that exist. Production builds have no such endpoint. The game's own levels are made this way and committed with git; the golden tests then demand a solution for each.

## Sound

There are no sound files: `src/audio/synth.ts` synthesizes every effect and the music with the Web Audio API. `listen()` in `src/audio/director.ts` turns what happens in a game session into sounds: placing and turning pieces, coins starting to spin, blasts, shots, slimes eating, and the end of a level. The music is a slow, generated pentatonic melody. Browsers allow sound only after the first click or key press, so it starts then; the volumes come from the active profile.

## Game rules decided so far

- A coin hit by beams from several angles spins only if every beam carries exactly the coin's color (rule flag `coinAngles: sameColor`).
- All levels of a skill are open from the start.
- Art comes in switchable art packs. The first one is flat vector art drawn in code.
- The interface speaks English and German.

## Assumptions until checked against the original

- A beam that runs into a laser stops there (`beamIntoLaser: absorb`).
- Light passes through anti-coins, as it passes through coins.
- Mirrors and double mirrors stop a beam that runs along their surface; only the slit mirror lets it through.
- A beam enters a refractor's end either straight, and leaves turned 45°, or diagonally from the one side that makes it leave straight. The other diagonal stops. In rotation 0 the bar runs north to south, and a beam traveling north leaves to the north-west.
- Only light that hits a splitter's tip head-on splits.
- A threeway takes light into a bevel only on the path of a split beam run backwards: in rotation 0, traveling south-west into the north-east bevel or south-east into the north-west one.
- In rotation 0 a prism takes light through its south side and sends green and blue to the right, clockwise. Light entering its long side passes only on a path run backwards, so each primary needs its own angle; anything else stops.
- A color converter passes light only straight through its ends; its sides stop light.
- A filter lets its colors through from every direction, diagonals included.
- A polarizer passes light only in the direction its marker points (`polarizer: direction`); the rule flag `polarizer: axis` also passes the opposite direction.
- Cleanup returns unlit moveable pieces to the first free toolbox slots, in reading order; pieces that find no free slot stay on the board.
- The toolbox has two slots per board row.
- A dragged piece stays where it was until it is dropped, so carrying it around never changes the beams.
- An explosion destroys everything on the eight cells around it except black holes.
- Slimes, mines and ships stop beams that run into them (`actorsBlockLight: true`). Actors may not step onto a lit cell, and not diagonally across a beam through the shared corner.
- A slime heads north unless it starts another way, and tries ahead, then right, then back, then left. It eats the first food it runs into and is then gone with it; that is how this game reads "a nearer unlit mirror is eaten instead". It remembers its steps since the board last changed and avoids repeating one, which keeps it from circling.
- A robot mine keeps its heading while the way is open and otherwise jumps in a random open direction. It treats fuel cells as obstacles.
- A ship takes a fuel cell aboard when it is right above it, and fires at the next explosive or fuel cell ahead in its row, through other pieces. Black holes pull ships along rows and columns only.
- Slimes take 0.8 s per cell, mines and ships 0.4 s. Actors start moving as the level opens.
- Only mines and ships call for the five seconds of stability, as the spec says; slimes do not. Once a level is solved, mines stay where they are instead of vanishing, so the beams stay as they were.

## CI and deployment

CI (`.github/workflows/ci.yml`) runs the type check, Biome, the unit tests, the build and the Playwright tests on every pull request and on every push to `main`.

Headless Chromium draws WebGL without a graphics card, in SwiftShader. Antialiasing there costs more than the rest of a frame, so the board leaves it out wherever the renderer is a software one (`rendersInSoftware()` in `src/view/stage.ts`). That keeps the board at 60 frames a second in the browser tests, and for players on machines without graphics acceleration.

The unit tests run with coverage, and CI uploads the report to [Codecov](https://about.codecov.io/), which comments the numbers on pull requests. `codecov.yml` keeps them informational, so coverage never fails a pull request. The upload needs the repository secret `CODECOV_TOKEN`, from the repository's settings on codecov.io; without it, CI still passes but no coverage arrives. The badge at the top of this README shows the coverage of `main`.

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
