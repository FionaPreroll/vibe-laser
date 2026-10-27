export const en = {
  appTitle: 'Vibe Laser',
  tagline: 'Guide colored laser beams onto every coin.',
  language: 'Language',
  board: 'Empty game board with {columns} columns and {rows} rows',
  boardFailed: 'The game graphics could not start in this browser.',
} as const satisfies Record<string, string>

export type MessageKey = keyof typeof en

/** Typed against the English catalog, so a missing German text fails the type check. */
export const de: Record<MessageKey, string> = {
  appTitle: 'Vibe Laser',
  tagline: 'Lenke farbige Laserstrahlen auf jede Münze.',
  language: 'Sprache',
  board: 'Leeres Spielfeld mit {columns} Spalten und {rows} Zeilen',
  boardFailed: 'Die Spielgrafik ließ sich in diesem Browser nicht starten.',
}
