/** Line icons for buttons, drawn in the button's text color on a grid of 24 × 24. */
const PATHS = {
  exit: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  restart: ['M6 5v14', 'M19 5 9 12l10 7z'],
  cleanup: ['M4 14v6h16v-6', 'M12 3v11', 'M8 10l4 4 4-4'],
  undo: ['M9 14 4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'],
  redo: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h3'],
  rotateLeft: ['M4 4v5h5', 'M4.6 9A8 8 0 1 1 6 17.7'],
  rotateRight: ['M20 4v5h-5', 'M19.4 9A8 8 0 1 0 18 17.7'],
  help: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6',
    'M12 17h.01',
  ],
  next: ['M5 12h14', 'M13 6l6 6-6 6'],
  fast: ['M3 6l8 6-8 6z', 'M12 6l8 6-8 6z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name }: { readonly name: IconName }) {
  return (
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
