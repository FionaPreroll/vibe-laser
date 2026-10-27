export const en = {
  appTitle: 'Vibe Laser',
  tagline: 'Guide colored laser beams onto every coin.',
  language: 'Language',
  level: 'Level',
  board: '{name}: game board with {columns} columns and {rows} rows',
  boardFailed: 'The game graphics could not start in this browser.',
  actions: 'Game actions',
  restart: 'Restart',
  cleanup: 'Clean up',
  undo: 'Undo',
  redo: 'Redo',
  rotateLeft: 'Rotate left',
  rotateRight: 'Rotate right',
  controls:
    'Drag pieces from the toolbox onto the board. Click a piece to rotate it left, right-click to rotate it right. Keyboard: arrow keys, Enter to pick up and drop, Q and E to rotate, Ctrl+Z to undo.',
  solvedTitle: 'Level solved',
  solvedText: 'Every coin is spinning.',
  lastLevel: 'Every coin is spinning. That was the last level for now.',
  nextLevel: 'Next level',
  playAgain: 'Play again',
} as const satisfies Record<string, string>

export type MessageKey = keyof typeof en

/** Typed against the English catalog, so a missing German text fails the type check. */
export const de: Record<MessageKey, string> = {
  appTitle: 'Vibe Laser',
  tagline: 'Lenke farbige Laserstrahlen auf jede Münze.',
  language: 'Sprache',
  level: 'Level',
  board: '{name}: Spielfeld mit {columns} Spalten und {rows} Zeilen',
  boardFailed: 'Die Spielgrafik ließ sich in diesem Browser nicht starten.',
  actions: 'Spielaktionen',
  restart: 'Neustart',
  cleanup: 'Aufräumen',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  rotateLeft: 'Nach links drehen',
  rotateRight: 'Nach rechts drehen',
  controls:
    'Ziehe Teile aus der Ablage auf das Spielfeld. Ein Klick dreht ein Teil nach links, ein Rechtsklick nach rechts. Tastatur: Pfeiltasten, Enter zum Aufnehmen und Ablegen, Q und E zum Drehen, Strg+Z zum Rückgängigmachen.',
  solvedTitle: 'Level gelöst',
  solvedText: 'Alle Münzen drehen sich.',
  lastLevel: 'Alle Münzen drehen sich. Das war fürs Erste das letzte Level.',
  nextLevel: 'Nächstes Level',
  playAgain: 'Noch einmal',
}
