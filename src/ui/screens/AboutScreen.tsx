import type { ComponentChildren } from 'preact'
import changelog from '../../../CHANGELOG.md?raw'
import { version } from '../../../package.json'
import { t } from '../../i18n'
import { navigate } from '../router'

/** The version and the changelog, which CLAUDE.md asks to write for players. */
export function AboutScreen() {
  return (
    <section class="screen about" aria-labelledby="about-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <h2 id="about-title">{t('aboutTitle')}</h2>
      <p>{t('aboutText')}</p>
      <p>{t('version', { version })}</p>
      <h2>{t('changes')}</h2>
      <p class="hint">{t('changesInEnglish')}</p>
      <div lang="en">{renderChangelog(changelog)}</div>
    </section>
  )
}

/**
 * Just enough Markdown for CHANGELOG.md: headings, paragraphs and lists. Links keep their text,
 * link definitions are left out, and nothing becomes raw HTML. A version with nothing under it,
 * as Unreleased right after a release, is left out too.
 */
export function renderChangelog(markdown: string): ComponentChildren[] {
  const plain = (text: string) =>
    text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
  const blocks: ComponentChildren[] = []
  /** Where the latest version heading went, while nothing has followed it. */
  let bare: number | undefined
  const dropBare = () => {
    if (bare !== undefined && bare === blocks.length - 1) blocks.pop()
  }
  let list: string[] = []
  const flush = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item) => (
            <li key={item}>{plain(item)}</li>
          ))}
        </ul>,
      )
    }
    list = []
  }
  for (const line of markdown.split('\n')) {
    if (line.startsWith('- ')) {
      list.push(line.slice(2))
      continue
    }
    flush()
    if (line.startsWith('# ') || line.trim() === '' || /^\[[^\]]+\]:/.test(line)) continue
    if (line.startsWith('### ')) blocks.push(<h4 key={blocks.length}>{plain(line.slice(4))}</h4>)
    else if (line.startsWith('## ')) {
      dropBare()
      bare = blocks.length
      blocks.push(<h3 key={blocks.length}>{plain(line.slice(3))}</h3>)
    } else blocks.push(<p key={blocks.length}>{plain(line)}</p>)
  }
  flush()
  dropBare()
  return blocks
}
