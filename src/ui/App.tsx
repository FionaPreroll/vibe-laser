import { effect } from '@preact/signals'
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { Speaker } from '../audio/director'
import { Synth } from '../audio/synth'
import { packOfLevels, setCustomPacks } from '../content/packs'
import { t } from '../i18n'
import { PackShelf } from '../persistence/packs'
import { ProfileBook } from '../persistence/profiles'
import { browserStore, type KeyValueStore, memoryStore } from '../persistence/store'
import { EditorHome } from './editor/EditorHome'
import { LevelEditor } from './editor/LevelEditor'
import { PackEditor } from './editor/PackEditor'
import { HelpDialog } from './HelpDialog'
import { LanguageSwitch } from './LanguageSwitch'
import { followAddress, navigate, screen } from './router'
import { SettingsDialog } from './SettingsDialog'
import { AboutScreen } from './screens/AboutScreen'
import { LevelsScreen } from './screens/LevelsScreen'
import { PacksScreen } from './screens/PacksScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ProfilesScreen } from './screens/ProfilesScreen'
import { SkillsScreen } from './screens/SkillsScreen'

/** The game's sound: effects for the session, music, and volumes from the settings. */
export interface Audio extends Speaker {
  unlock(): void
  setVolumes(sound: number, music: number): void
}

interface Props {
  /** Where profiles and packs are saved; IndexedDB unless a test passes another store. */
  readonly store?: KeyValueStore
  readonly audio?: Audio
}

type Overlay = 'help' | 'settings' | undefined

interface Saves {
  readonly book: ProfileBook
  readonly shelf: PackShelf
  /** The browser does not let the game save, so everything lasts only until the page closes. */
  readonly blocked: boolean
}

/** Opens profiles and packs, or keeps them in memory when the browser does not let the game save. */
async function openSaves(store: KeyValueStore): Promise<Saves> {
  const options = {
    name: t('defaultName'),
    settings: { reducedMotion: matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false },
    persist: () => navigator.storage?.persist?.() ?? Promise.resolve(false),
  }
  try {
    const [book, shelf] = await Promise.all([
      ProfileBook.open(store, options),
      PackShelf.open(store),
    ])
    return { book, shelf, blocked: false }
  } catch (error) {
    console.warn('Saving is not possible in this browser', error)
    const memory = memoryStore()
    const [book, shelf] = await Promise.all([
      ProfileBook.open(memory, options),
      PackShelf.open(memory),
    ])
    return { book, shelf, blocked: true }
  }
}

export function App({ store, audio }: Props) {
  const sound = useMemo(() => audio ?? new Synth(), [audio])
  const [opened, setOpened] = useState<Saves>()
  const [overlay, setOverlay] = useState<Overlay>()

  useEffect(() => followAddress(), [])
  useEffect(() => {
    void openSaves(store ?? browserStore()).then(setOpened)
  }, [store])
  useEffect(() => {
    // Browsers start audio only after the player clicks or presses a key.
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [sound])
  const book = opened?.book
  const shelf = opened?.shelf
  useEffect(() => {
    if (shelf === undefined) return
    const stop = effect(() => {
      setCustomPacks(shelf.packs.value.map((pack) => packOfLevels(pack.id, pack.pack, pack.levels)))
    })
    return () => {
      stop()
      setCustomPacks([])
    }
  }, [shelf])
  useEffect(
    () =>
      book &&
      effect(() => {
        const { soundVolume, musicVolume } = book.active.value.settings
        sound.setVolumes(soundVolume, musicVolume)
      }),
    [book, sound],
  )

  if (opened === undefined || book === undefined) return <p class="loading">{t('loading')}</p>
  const current = screen.value
  const solved = book.solved.value
  const closeOverlay = () => setOverlay(undefined)

  return (
    <div class="shell">
      <header class="top-bar">
        <a class="title" href="#/">
          <h1>{t('appTitle')}</h1>
          <p class="tagline">{t('tagline')}</p>
        </a>
        <nav class="top-controls">
          <button type="button" onClick={() => navigate({ name: 'profiles' })}>
            {t('profileButton', { name: book.active.value.name })}
          </button>
          <button type="button" onClick={() => navigate({ name: 'editor' })}>
            {t('editorButton')}
          </button>
          <button type="button" onClick={() => setOverlay('settings')}>
            {t('settings')}
          </button>
          <button type="button" onClick={() => setOverlay('help')}>
            {t('help')}
          </button>
          <button type="button" onClick={() => navigate({ name: 'about' })}>
            {t('about')}
          </button>
          <LanguageSwitch />
        </nav>
      </header>
      {opened.blocked && <p class="notice">{t('storageBlocked')}</p>}
      <main class={current.name === 'play' || current.name === 'editLevel' ? 'play' : 'menu'}>
        {current.name === 'packs' && <PacksScreen solved={solved} />}
        {current.name === 'skills' && <SkillsScreen pack={current.pack} solved={solved} />}
        {current.name === 'levels' && (
          <LevelsScreen pack={current.pack} skill={current.skill} solved={solved} />
        )}
        {current.name === 'play' && (
          // One screen per level, so nothing of a finished game carries over to the next.
          <PlayScreen
            key={current.level}
            level={current.level}
            book={book}
            speaker={sound}
            paused={overlay !== undefined}
            onHelp={() => setOverlay('help')}
          />
        )}
        {current.name === 'profiles' && <ProfilesScreen book={book} />}
        {current.name === 'editor' && shelf && <EditorHome shelf={shelf} />}
        {current.name === 'editPack' && shelf && (
          <PackEditor key={current.pack} pack={current.pack} shelf={shelf} />
        )}
        {current.name === 'editLevel' && shelf && (
          // One editor per slot: its undo history belongs to one level.
          <LevelEditor
            key={`${current.pack}/${current.skill}/${current.slot}`}
            pack={current.pack}
            skill={current.skill}
            slot={current.slot}
            shelf={shelf}
            speaker={sound}
            paused={overlay !== undefined}
            onHelp={() => setOverlay('help')}
          />
        )}
        {current.name === 'about' && <AboutScreen />}
      </main>
      {overlay === 'help' && <HelpDialog onClose={closeOverlay} />}
      {overlay === 'settings' && <SettingsDialog book={book} onClose={closeOverlay} />}
    </div>
  )
}
