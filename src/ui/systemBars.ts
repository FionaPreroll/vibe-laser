/**
 * Colors the phone's status bar and navigation bar like the game around them: the theme-color
 * meta tag takes the page's background, so the bars follow the theme set in styles.css instead
 * of a color kept apart in index.html. Browsers in a tab tint their toolbar with it too.
 */
export function paintSystemBars(page: Document = document): void {
  const color = getComputedStyle(page.body).backgroundColor
  if (color === '' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return
  let meta = page.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta === null) {
    meta = page.createElement('meta')
    meta.name = 'theme-color'
    page.head.append(meta)
  }
  if (meta.content !== color) meta.content = color
}
