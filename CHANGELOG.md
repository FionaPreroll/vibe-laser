# Changelog

All changes players can notice are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A new level pack, Sea of Colors: eighteen puzzles about color, in three skills. Prisms fan white light out, Converters change its color, and Filters sort it with filters and polarizers. Its skills are chosen in a ship's log, with the sounds of the sea.
- A new level pack, Powder Keg: eighteen puzzles down in the crypt, where light is dangerous, in three skills. Explosives must stay dark, Dark Coins brings anti-coins, and in Black Holes they all meet. It glows in Neon, with the crypt's sounds.
- A new level pack, Glass Maze: eighteen puzzles about the path of light, in three skills. Refraction bends beams with refractors, Split Beams divides them with splitters and threeways, and in Two Lasers two beams share every board. Its skills are chosen in the clinic of light, with the clinic's sounds.
- When a slime eats a mirror, a note below the board says so, since undo cannot bring the mirror back, and offers to start the level again.
- On a phone held upright, the game asks to be turned on its side. On touch screens a Full screen button in the header hides the browser's bars and, where the browser allows, holds the game in landscape. Installed as an app, the game opens in landscape.
- On a touch screen, holding a finger on a piece turns it right, as a right click does.
- On phones that can vibrate, a short buzz as pieces go down or turn, and a rumble when an explosive goes off. The settings switch it off.
- A setting for left hands puts the buttons left of the board on a phone or tablet on its side.
- With slimes, mines or ships on the board, a button in the bar runs them two or four times as fast, and the stability bar with them.
- While you carry a piece, dotted lines show where slimes and ships would walk if you put it down there, with a red ring where one would set off an explosive.
- A Continue button above the level packs leads back to the level played last, or to the next unsolved level of its pack once that one is solved. Each profile remembers its own.
- Undo right after Restart brings back the game as it was, until the next move. After a solved or exploded level, Restart still starts afresh.
- Once a level is solved, the button bar offers the next unsolved level too, so it stays at hand after the dialog is put aside.
- Par: each level counts the moves of its known solution as a target. The button bar shows it next to your moves, the solved dialog says whether you made it, and the level list gives a star to levels solved within par.
- A solved level throws colored sparks over its spinning coins. With less motion in the settings, there are none.
- Keys and a game controller: the buttons of the bar name their keys in their tooltips, and new keys restart (R), clean up (C), change the speed (F), open help (H) and go on to the next level (N). WASD moves the frame too. A controller plays with the D-pad or left stick, A to pick up and drop, the shoulder buttons to rotate, X and Y to undo and redo. In the settings, under Keys and controller, every key and button can be changed.

### Changed

- Help, the slime's description and the level Hungry Slime now say that slimes, mines and ships never cross a beam, and that turning the beam away sets them off.
- On a phone or tablet on its side, the buttons sit to the right of the board instead of below it, so the board gets the whole height. The header stays on one line, and the notch of a phone no longer covers the game.
- Help, the settings and the dialogs at the end of a level close with a tap or click on the dark area around them. An end dialog put aside this way, or with Escape, leaves the board in view and comes back with a button.
- The buttons of the bar below the board carry icons. Beside the board, on a phone or tablet on its side, only the icons show, so the board gets more room; their names appear as tooltips.
- On small screens and on phones on their side, the header's buttons sit behind a Menu button and open as a list, instead of being squeezed into one row.
- Help and the level Fuel Run now say where a ship must be to take a fuel cell aboard: on the cell just north of it, not on the fuel cell itself, which would explode.
- A piece dragged with a finger floats a little above it, so the finger hides neither the piece nor where its light would go.
- A level's intro shows in full the first time; after that it keeps to one line, and More opens it again.

### Fixed

- On a phone on its side, long dialogs such as the settings scroll again, so their lower options can be reached.

## [0.1.0] - 2026-10-30

The first version.

### Added

- Five tutorial levels: guide red, green and blue laser beams onto coins of their color with mirrors, double mirrors and slit mirrors, and keep dark anti-coins out of the light. Every level is open from the start.
- Eight new optical parts. Refractors bend beams by 45°, one-way pieces let light through in one direction only, splitters and threeways split a beam in two, prisms split white light into red, green and blue and merge them again, color converters change a beam's color, filters let only their own colors through, and polarizers also demand a direction.
- Eight more tutorial levels, one for each new part, for 13 in all.
- Explosives: light that reaches one, or a mine or a ship running into it, sets off a chain reaction that fails the level. Undo cannot help; start again.
- Slimes, robot mines and spaceships move by themselves. Slimes eat explosives and unlit mirrors, mines bounce off beams and pieces, ships take fuel cells aboard and shoot explosives, and dark black holes pull ships in.
- With mines or ships on the board, a solution must hold for five seconds while a bar fills.
- Five more tutorial levels for the hazards and actors, for 18 in all.
- Drag pieces from the toolbox onto the board. Click a piece to turn it left, right-click to turn it right.
- Buttons below the board: Restart, Clean up, Undo, Redo, Rotate left and Rotate right.
- Keyboard play: the arrow keys move a frame over the toolbox and the board, Enter picks a piece up and puts it down, Q and E rotate, Ctrl+Z and Ctrl+Y undo and redo.
- When every coin spins, the level is solved and a message offers the next unsolved level of the pack, the level selection, or another go.
- Rows and columns of the board are marked with letters and numbers, as in the original.
- The interface speaks English and German. It follows the browser's language, and the switch in the header changes it.
- Level packs: the tutorial levels form the Tutorial pack, in three skills. Pick a pack, a skill and a level; solved levels carry a mark, and every pack and skill shows how many of its levels are solved.
- Profiles: every player keeps their own solved levels and settings, saved in the browser. Profiles can be created, renamed and deleted, and exported as a file to import them in another browser.
- Settings for the volume of sound effects and music, and to reduce motion: actors jump instead of gliding, and blasts flash instead of swelling.
- Sound effects for placing and turning pieces, coins that start to spin, blasts, shots, hungry slimes and the end of a level, with quiet music in the background.
- A help page that explains the controls and every part, and an About page with the version and this list of changes.
- Exit and Help buttons below the board. While help or the settings are open, the game waits.
- A level editor, in the header: make packs of your own with up to four skills of 30 levels each, and play them from the pack list. Paint parts onto the board and into the toolbox with the mouse or with a key for each part, set their colors, directions and whether players may move and turn them, and name and size the level.
- The editor checks a level as you go, and test-plays it: solve it, and your moves become its solution, which the editor replays to make sure it works.
- Copy, paste, swap, clear and delete levels in a pack, and export and import single levels or whole packs as files.
- Five parts from the expansion packs of the original: benders turn every beam 45° clockwise, splicers split a beam three ways, prismirrors are prisms in mirror image, selectors turn their own color aside and let the rest through, and complexes turn their outer color aside and let only their inner color through.
- Five more tutorial levels in a fourth skill, Expansions, one for each new part, for 23 in all.
- In the level editor the new parts sit on the keys 1 to 5, and a complex has switches for its outer and its inner color.
- Once it has loaded, the game also plays offline, and browsers can install it as an app with an icon of its own. When a new version is out, a notice offers to reload into it, so a level in progress is never interrupted.
- Touch screens: tap a piece to select it, tap it again to turn it, or tap a free place to move it there. Pinch to zoom in on the board, and drag an empty spot to look around. The hints below the board explain the touch controls.
- On phones the header and the buttons take less room, so the board gets more of the screen.
- Color-blind mode, in the settings: pieces show their colors as letters, R, G and B, and beams draw each of their colors as a line of its own. Help explains how colors mix, with a diagram.
- A second look for the board, in the settings: Neon draws every part as a glowing outline on a dark board.
- Level packs can choose the look their levels are made for. The new default look in the settings, the pack's choice, shows each pack that way; Plain or Neon show every pack in one look. In the level editor, the pack settings choose a pack's look.
- Every tutorial level explains its new part in a few words above the board, and the level editor lets authors write such an intro, in English and German, for their own levels.
- A second level pack, Lightworks: eighteen puzzles for after the tutorial, in three skills, that combine the parts in new ways, such as a prism used backwards or a slime steered with beams. In its third skill, Crossfire, two lasers share every board, and in one level the mirrors are fixed and only turn.
- Three dots at the end of the button bar light up in the colors of the piece under the pointer, as in the original: a yellow piece lights red and green. After a key they follow the keyboard frame, and on touch screens they show the selected piece.
- Each level pack can have sounds of its own: seven sets of music and effects, from the calm laboratory to a bright schoolroom, a ship at sea and an eerie crypt. The Tutorial now sounds like a schoolroom, and the level editor's pack settings choose a pack's sounds.
- Each level pack has a selection screen of its own, as in the original: the Tutorial lays out its skills on a chalkboard, Lightworks at a laboratory console, and the level editor offers seven screens, from a classic menu to a crypt. The pack list shows every pack with a banner in its style.
- While you carry a piece, the beams show faintly where light would go if you put it down there, and explosives it would reach get a red ring. A setting switches this off.
- A Hints & Solutions pack, as the original offered: the Lightworks puzzles with help at hand. A hint shows where the next piece goes and how it is turned, and the whole solution plays itself if you ask. Packs made in the level editor can offer hints and solutions too.
- Share a level you made as a link: Share link in the level editor copies it, and whoever opens the link plays the level at once, with no file to pass around. Solved or not, Add to my packs keeps it in a pack called Shared levels.
- The button bar counts your moves, and a solved level tells you how many you needed and whether that beats your best. The level list shows each level's best next to its mark.
- A third level pack, Strange Light: eighteen puzzles with the parts of the expansion packs, in three skills. Bent Light is about benders and splicers, Color Sorting about prismirrors, selectors and complexes, and Danger Zone puts them among explosives and anti-coins. It glows in Neon at the space station's console, with the sounds of space.

### Changed

- Three tutorial levels are rebuilt so that you decide what the slime and the ships do: Hungry Slime, Event Horizon and Fuel Run. A beam holds them back until you move it, and the wrong order sets off the explosive. Nothing in them hurries you any more.
- Slimes crawl more slowly, 1.2 seconds per cell instead of 0.8, so you can watch where they go.
- On computers without graphics acceleration, the board leaves out edge smoothing and so runs twice as smoothly.
- The game starts faster: the board's graphics load only when the first level opens.
- Once a level is solved, its message waits a moment, so you can watch the coins spin first.

### Fixed

- A spaceship that runs into a dead end turns round and flies back, instead of standing still there.

[Unreleased]: https://github.com/FionaPreroll/vibe-laser/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FionaPreroll/vibe-laser/releases/tag/v0.1.0
