export const en = {
  appTitle: 'Vibe Laser',
  tagline: 'Guide colored laser beams onto every coin.',
  language: 'Language',
  board: '{name}: game board with {columns} columns and {rows} rows',
  boardFailed: 'The game graphics could not start in this browser.',
  loading: 'Loading…',
  storageBlocked:
    'This browser does not let the game save, so progress lasts only until the page is closed.',
  back: 'Back',
  help: 'Help',
  settings: 'Settings',
  about: 'About',
  profileButton: 'Profile: {name}',
  close: 'Close',

  packsTitle: 'Level packs',
  progress: '{solved} of {total} solved',
  solvedMark: 'solved',
  levelLabel: '{number}. {name}',
  levelMissing: 'There is no level here.',
  levelBroken: 'This level could not be loaded.',
  levelHeading: '{pack} · {skill} · {number}. {name}',

  actions: 'Game actions',
  exit: 'Exit',
  restart: 'Restart',
  cleanup: 'Clean up',
  undo: 'Undo',
  redo: 'Redo',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  controls:
    'Drag pieces from the toolbox onto the board. Click a piece to rotate it left, right-click to rotate it right. Keyboard: arrow keys, Enter to pick up and drop, Q and E to rotate, Ctrl+Z to undo.',
  stabilizing: 'System stable: every coin spins. Wait until the bar is full.',
  stability: 'Stability',

  solvedTitle: 'Level solved',
  solvedText: 'Every coin is spinning.',
  packSolved: 'Every coin is spinning, and every level of this pack is solved.',
  nextUnsolved: 'Next unsolved level',
  levelSelection: 'Level selection',
  playAgain: 'Play again',
  failedTitle: 'Explosion',
  failedText: 'An explosive went off, and undo cannot bring it back. Start the level again.',
  startAgain: 'Start again',

  profilesTitle: 'Profiles',
  defaultName: 'Player',
  playingNow: 'playing now',
  solvedCount: '{count} levels solved',
  solvedCountOne: '1 level solved',
  playAs: 'Play as {name}',
  rename: 'Rename',
  save: 'Save',
  cancel: 'Cancel',
  remove: 'Delete',
  confirmRemove: 'Delete the profile {name} and all its progress?',
  exportProfile: 'Export',
  importProfile: 'Import a profile',
  importFailed: 'That file is no profile export.',
  newProfile: 'New profile',
  profileName: 'Name',
  create: 'Create',

  settingsTitle: 'Settings',
  soundVolume: 'Sound effects',
  musicVolume: 'Music',
  reducedMotion: 'Reduce motion',

  helpTitle: 'How to play',
  helpGoal:
    'Move and turn the pieces from the toolbox until every coin spins: each colored coin needs light of exactly its color, and dark anti-coins must stay out of the light. Keep light, mines and ships away from explosives.',
  helpParts: 'Parts',
  'parts.laser': 'Laser',
  'parts.laser.text': 'Fires a beam of its color.',
  'parts.mirror': 'Mirror',
  'parts.mirror.text':
    'Its silver side turns a beam by 90°, or sends it straight back. Its back stops light.',
  'parts.doubleMirror': 'Double mirror',
  'parts.doubleMirror.text': 'A mirror that reflects on both sides.',
  'parts.slitMirror': 'Slit mirror',
  'parts.slitMirror.text': 'A double mirror whose slit lets a beam along its surface pass.',
  'parts.refractor': 'Refractor',
  'parts.refractor.text':
    'A glass bar that bends light by 45° at its ends. Its long sides stop light.',
  'parts.oneWay': 'One-way',
  'parts.oneWay.text': 'Lets light in only straight through its broad side.',
  'parts.splitter': 'Splitter',
  'parts.splitter.text':
    'Splits light that hits its tip into two beams, to the left and to the right.',
  'parts.threeway': 'Threeway',
  'parts.threeway.text':
    'Splits light from its flat side into two beams; light through a bevel leaves through the flat side.',
  'parts.prism': 'Prism',
  'parts.prism.text':
    'Sends red straight on and turns green by 45° and blue by 90°; the other way round it joins them again.',
  'parts.colorConverter': 'Color converter',
  'parts.colorConverter.text':
    'Shifts colors: through the narrow end red turns green, green blue and blue red; through the broad end the other way round.',
  'parts.filter': 'Filter',
  'parts.filter.text': 'Lets only its own colors through.',
  'parts.polarizer': 'Polarizer',
  'parts.polarizer.text':
    'A filter that also lets light through only in the direction its marker points.',
  'parts.coin': 'Coin',
  'parts.coin.text': 'Spins when the light on its line has exactly its color.',
  'parts.antiCoin': 'Anti-coin',
  'parts.antiCoin.text': 'Spins as long as no light touches it.',
  'parts.explosive': 'Explosive',
  'parts.explosive.text':
    'Explodes when light, a mine or a ship reaches it, and takes its neighbours with it.',
  'parts.fuelCell': 'Fuel cell',
  'parts.fuelCell.text':
    'Explodes like an explosive. A ship flying over it takes it aboard and can fire once.',
  'parts.blackHole': 'Black hole',
  'parts.blackHole.text': 'Swallows light. While it is dark, it pulls in ships in line with it.',
  'parts.slime': 'Slime',
  'parts.slime.text':
    'Walks ahead and turns right where something is in its way. It eats the first explosive, or plain mirror without light, that it runs into.',
  'parts.mine': 'Robot mine',
  'parts.mine.text':
    'Jumps around and bounces off beams and pieces. Running into an explosive sets it off.',
  'parts.ship': 'Spaceship',
  'parts.ship.text':
    'Flies east and west and drops a row at obstacles. With a fuel cell aboard, it shoots the next explosive ahead.',

  aboutTitle: 'About Vibe Laser',
  aboutText:
    'A laser logic puzzle inspired by Aargon Deluxe (Twilight Games, 2001), with rules rebuilt from a written specification and levels and art of its own.',
  version: 'Version {version}',
  changes: 'What has changed',
  changesInEnglish: 'The list of changes is in English.',
} as const satisfies Record<string, string>

export type MessageKey = keyof typeof en

/** Typed against the English catalog, so a missing German text fails the type check. */
export const de: Record<MessageKey, string> = {
  appTitle: 'Vibe Laser',
  tagline: 'Lenke farbige Laserstrahlen auf jede Münze.',
  language: 'Sprache',
  board: '{name}: Spielfeld mit {columns} Spalten und {rows} Zeilen',
  boardFailed: 'Die Spielgrafik ließ sich in diesem Browser nicht starten.',
  loading: 'Lädt …',
  storageBlocked:
    'Dieser Browser lässt das Spiel nicht speichern, der Fortschritt hält also nur, bis die Seite geschlossen wird.',
  back: 'Zurück',
  help: 'Hilfe',
  settings: 'Einstellungen',
  about: 'Über das Spiel',
  profileButton: 'Profil: {name}',
  close: 'Schließen',

  packsTitle: 'Level-Packs',
  progress: '{solved} von {total} gelöst',
  solvedMark: 'gelöst',
  levelLabel: '{number}. {name}',
  levelMissing: 'Hier gibt es kein Level.',
  levelBroken: 'Dieses Level ließ sich nicht laden.',
  levelHeading: '{pack} · {skill} · {number}. {name}',

  actions: 'Spielaktionen',
  exit: 'Verlassen',
  restart: 'Neustart',
  cleanup: 'Aufräumen',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  rotateLeft: 'Nach links drehen',
  rotateRight: 'Nach rechts drehen',
  controls:
    'Ziehe Teile aus der Ablage auf das Spielfeld. Ein Klick dreht ein Teil nach links, ein Rechtsklick nach rechts. Tastatur: Pfeiltasten, Enter zum Aufnehmen und Ablegen, Q und E zum Drehen, Strg+Z zum Rückgängigmachen.',
  stabilizing: 'System stabil: Alle Münzen drehen sich. Warte, bis der Balken voll ist.',
  stability: 'Stabilität',

  solvedTitle: 'Level gelöst',
  solvedText: 'Alle Münzen drehen sich.',
  packSolved: 'Alle Münzen drehen sich, und jedes Level dieses Packs ist gelöst.',
  nextUnsolved: 'Nächstes ungelöstes Level',
  levelSelection: 'Level-Auswahl',
  playAgain: 'Noch einmal',
  failedTitle: 'Explosion',
  failedText:
    'Ein Sprengstoff ist explodiert, und Rückgängig hilft nicht mehr. Starte das Level neu.',
  startAgain: 'Neu starten',

  profilesTitle: 'Profile',
  defaultName: 'Spieler',
  playingNow: 'spielt gerade',
  solvedCount: '{count} Level gelöst',
  solvedCountOne: '1 Level gelöst',
  playAs: 'Als {name} spielen',
  rename: 'Umbenennen',
  save: 'Speichern',
  cancel: 'Abbrechen',
  remove: 'Löschen',
  confirmRemove: 'Das Profil {name} mit allem Fortschritt löschen?',
  exportProfile: 'Exportieren',
  importProfile: 'Profil importieren',
  importFailed: 'Diese Datei ist kein exportiertes Profil.',
  newProfile: 'Neues Profil',
  profileName: 'Name',
  create: 'Anlegen',

  settingsTitle: 'Einstellungen',
  soundVolume: 'Geräusche',
  musicVolume: 'Musik',
  reducedMotion: 'Weniger Bewegung',

  helpTitle: 'So wird gespielt',
  helpGoal:
    'Verschiebe und drehe die Teile aus der Ablage, bis sich jede Münze dreht: Jede farbige Münze braucht Licht genau ihrer Farbe, und dunkle Anti-Münzen müssen im Dunkeln bleiben. Halte Licht, Minen und Raumschiffe von Sprengstoff fern.',
  helpParts: 'Teile',
  'parts.laser': 'Laser',
  'parts.laser.text': 'Sendet einen Strahl seiner Farbe aus.',
  'parts.mirror': 'Spiegel',
  'parts.mirror.text':
    'Seine silberne Seite lenkt einen Strahl um 90° um oder wirft ihn zurück. Seine Rückseite hält Licht auf.',
  'parts.doubleMirror': 'Doppelspiegel',
  'parts.doubleMirror.text': 'Ein Spiegel, der auf beiden Seiten spiegelt.',
  'parts.slitMirror': 'Schlitzspiegel',
  'parts.slitMirror.text':
    'Ein Doppelspiegel, durch dessen Schlitz ein Strahl entlang seiner Fläche läuft.',
  'parts.refractor': 'Refraktor',
  'parts.refractor.text':
    'Ein Glasstab, der Licht an seinen Enden um 45° knickt. Seine langen Seiten halten Licht auf.',
  'parts.oneWay': 'Einweg-Teil',
  'parts.oneWay.text': 'Lässt Licht nur gerade durch seine breite Seite herein.',
  'parts.splitter': 'Splitter',
  'parts.splitter.text':
    'Teilt Licht, das seine Spitze trifft, in zwei Strahlen nach links und nach rechts.',
  'parts.threeway': 'Threeway',
  'parts.threeway.text':
    'Teilt Licht von seiner flachen Seite in zwei Strahlen; Licht durch eine Schrägseite tritt aus der flachen Seite aus.',
  'parts.prism': 'Prisma',
  'parts.prism.text':
    'Lässt Rot geradeaus, knickt Grün um 45° und Blau um 90°; in Gegenrichtung vereint es sie wieder.',
  'parts.colorConverter': 'Farbwandler',
  'parts.colorConverter.text':
    'Verschiebt Farben: Durch das schmale Ende wird Rot zu Grün, Grün zu Blau und Blau zu Rot, durch das breite Ende umgekehrt.',
  'parts.filter': 'Filter',
  'parts.filter.text': 'Lässt nur seine eigenen Farben durch.',
  'parts.polarizer': 'Polarisator',
  'parts.polarizer.text':
    'Ein Filter, der Licht außerdem nur in die Richtung seiner Markierung durchlässt.',
  'parts.coin': 'Münze',
  'parts.coin.text': 'Dreht sich, wenn das Licht auf ihrer Linie genau ihre Farbe hat.',
  'parts.antiCoin': 'Anti-Münze',
  'parts.antiCoin.text': 'Dreht sich, solange kein Licht sie berührt.',
  'parts.explosive': 'Sprengstoff',
  'parts.explosive.text':
    'Explodiert, wenn Licht, eine Mine oder ein Raumschiff ihn erreicht, und reißt seine Nachbarn mit.',
  'parts.fuelCell': 'Brennstoffzelle',
  'parts.fuelCell.text':
    'Explodiert wie Sprengstoff. Ein Raumschiff, das darüber fliegt, nimmt sie auf und kann einmal schießen.',
  'parts.blackHole': 'Schwarzes Loch',
  'parts.blackHole.text':
    'Schluckt Licht. Solange es dunkel ist, zieht es Raumschiffe an, die mit ihm in einer Linie stehen.',
  'parts.slime': 'Schleim',
  'parts.slime.text':
    'Läuft geradeaus und biegt rechts ab, wo etwas im Weg ist. Er frisst den ersten Sprengstoff oder unbeleuchteten einfachen Spiegel, auf den er trifft.',
  'parts.mine': 'Robotmine',
  'parts.mine.text':
    'Springt umher und prallt an Strahlen und Teilen ab. Trifft sie auf Sprengstoff, geht er hoch.',
  'parts.ship': 'Raumschiff',
  'parts.ship.text':
    'Fliegt nach Osten und Westen und rückt an Hindernissen eine Zeile nach unten. Mit einer Brennstoffzelle an Bord schießt es auf den nächsten Sprengstoff voraus.',

  aboutTitle: 'Über Vibe Laser',
  aboutText:
    'Ein Laser-Logikspiel nach dem Vorbild von Aargon Deluxe (Twilight Games, 2001), mit Regeln nach einer schriftlichen Spezifikation und eigenen Leveln und eigener Grafik.',
  version: 'Version {version}',
  changes: 'Was sich geändert hat',
  changesInEnglish: 'Die Liste der Änderungen ist auf Englisch.',
}
