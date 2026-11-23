import build from 'virtual:build-info'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import changelog from '../../../CHANGELOG.md?raw'
import { version } from '../../../package.json'
import { isMessageKey, locale, t } from '../../i18n'
import { navigate } from '../router'

export const CONTACT_NAME = 'Fiona'
export const CONTACT_EMAIL = 'fipreroll+app@gmail.com'
export const WEBSITE = 'https://fionapreroll.github.io/'
export const SOURCE = 'https://github.com/FionaPreroll/vibe-laser'

type ThirdParty = typeof import('virtual:licenses')['default'][number]
type BuildInfo = typeof build

/**
 * The version, the build, contact and links, the licenses of the packages inside the game and
 * the changelog, which CLAUDE.md asks to write for players.
 */
export function AboutScreen({ info = build }: { readonly info?: BuildInfo }) {
  return (
    <section class="screen about" aria-labelledby="about-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <h2 id="about-title">{t('aboutTitle')}</h2>
      <p>{t('aboutText')}</p>
      <div class="about-cards">
        <section class="about-card" aria-labelledby="about-build">
          <h3 id="about-build">{t('buildTitle')}</h3>
          <BuildFacts info={info} />
        </section>
        <section class="about-card" aria-labelledby="about-contact">
          <h3 id="about-contact">{t('contactTitle')}</h3>
          <dl class="facts">
            <dt>{t('contactLabel')}</dt>
            <dd>
              {CONTACT_NAME}{' '}
              <span class="nowrap">
                &lt;<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>&gt;
              </span>
            </dd>
            <dt>{t('websiteLabel')}</dt>
            <dd>
              <ExternalLink href={WEBSITE}>{shortUrl(WEBSITE)}</ExternalLink>
            </dd>
            <dt>{t('sourceLabel')}</dt>
            <dd>
              <ExternalLink href={SOURCE}>{shortUrl(SOURCE)}</ExternalLink>
            </dd>
          </dl>
        </section>
      </div>
      <h3>{t('licensesTitle')}</h3>
      <Licenses />
      <h3>{t('changes')}</h3>
      <p class="hint">{t('changesInEnglish')}</p>
      <div lang="en" class="changelog">
        {renderChangelog(changelog)}
      </div>
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/** An address without its scheme and the slash at its end, as people read it. */
export function shortUrl(url: string): string {
  return url.replace(/^https:\/\//, '').replace(/\/$/, '')
}

function BuildFacts({ info }: { readonly info: BuildInfo }) {
  const built = new Date(info.builtAt)
  const { ciRun } = info
  return (
    <dl class="facts">
      <dt>{t('versionLabel')}</dt>
      <dd>{version}</dd>
      <dt>{t('commitLabel')}</dt>
      <dd>
        {info.commit === null ? (
          t('unknown')
        ) : (
          <>
            <ExternalLink href={`${SOURCE}/commit/${info.commit}`}>
              <code title={info.commit}>{info.commit.slice(0, 7)}</code>
            </ExternalLink>
            {info.modified && <span class="quiet"> · {t('commitModified')}</span>}
          </>
        )}
      </dd>
      <dt>{t('builtLabel')}</dt>
      <dd>
        <time dateTime={info.builtAt}>
          {Number.isNaN(built.getTime())
            ? info.builtAt
            : new Intl.DateTimeFormat(locale.value, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(built)}
        </time>
      </dd>
      <dt>{t('ciRunLabel')}</dt>
      <dd>
        {ciRun === null ? (
          <span class="quiet">{t('builtLocally')}</span>
        ) : (
          <ExternalLink href={ciRun.url}>
            {t(ciRun.attempt === '1' ? 'ciRun' : 'ciRunAttempt', {
              workflow: ciRun.workflow,
              number: ciRun.number,
              attempt: ciRun.attempt,
            })}
          </ExternalLink>
        )}
      </dd>
    </dl>
  )
}

/** What a package does in the game, from the "lib.<name>" messages, if one is written. */
export function purposeOf(name: string): string | undefined {
  const key = `lib.${name}`
  return isMessageKey(key) ? t(key) : undefined
}

/**
 * The packages inside the game, each with what it does there in the summary line and its
 * license text behind it.
 */
function Licenses() {
  const [packages, setPackages] = useState<readonly ThirdParty[] | 'failed'>()
  useEffect(() => {
    let current = true
    import('virtual:licenses').then(
      (module) => current && setPackages(module.default),
      () => current && setPackages('failed'),
    )
    return () => {
      current = false
    }
  }, [])
  return (
    <>
      <p>{t('licensesText')}</p>
      <p class="hint">{t('licensesInEnglish')}</p>
      {packages === undefined && <p class="quiet">{t('loading')}</p>}
      {packages === 'failed' && <p role="alert">{t('licensesFailed')}</p>}
      {Array.isArray(packages) && (
        <ul class="licenses">
          {packages.map((pkg) => (
            <li key={`${pkg.name}@${pkg.version}`}>
              <details>
                <summary>
                  <span class="license-name">{pkg.name}</span>{' '}
                  <span class="quiet">{pkg.version}</span>
                  <span class="license-id">{pkg.license}</span>
                  {purposeOf(pkg.name) !== undefined && (
                    <span class="license-purpose">{purposeOf(pkg.name)}</span>
                  )}
                </summary>
                {pkg.homepage !== null && (
                  <p>
                    <ExternalLink href={pkg.homepage}>{shortUrl(pkg.homepage)}</ExternalLink>
                  </p>
                )}
                <pre lang="en">{pkg.text}</pre>
                {pkg.notice !== null && <pre lang="en">{pkg.notice}</pre>}
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
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
