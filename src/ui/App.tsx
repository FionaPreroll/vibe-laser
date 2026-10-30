import { effect } from '@preact/signals'
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { Speaker } from '../audio/director'
import { Synth } from '../audio/synth'
import { findLevel, findPack, packOfLevels, setCustomPacks } from '../content/packs'
import { type PackSounds, soundsOf } from '../content/schema'
import { t } from '../i18n'
import { PackShelf } from '../persistence/packs'
import { ProfileBook } from '../persistence/profiles'
import { browserStore, type KeyValueStore, memoryStore } from '../persistence/store'
import { bindings, resolveBindings } from '../view/bindings'
import { beamPreview, chosenArt, colorBlind, vibration } from '../view/display'
import { FullScreenButton, TurnNotice } from './FullScreen'
import { HelpDialog } from './HelpDialog'
import { LanguageSwitch } from './LanguageSwitch'
import { followAddress, isEditorScreen, navigate, type Screen, screen } from './router'
import { SettingsDialog } from './SettingsDialog'
import { AboutScreen } from './screens/AboutScreen'
import { LevelsScreen } from './screens/LevelsScreen'
import { PacksScreen } from './screens/PacksScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ProfilesScreen } from './screens/ProfilesScreen'
import { SharedScreen } from './screens/SharedScreen'
import { SkillsScreen } from './screens/SkillsScreen'
import { TopMenu } from './TopMenu'
import { UpdateNotice } from './UpdateNotice'

/** The game's sound: effects for the session, music, and volumes from the settings. */
export interface Audio extends Speaker {
  unlock(): void
  setVolumes(sound: number, music: number): void
  /** Plays in the voice of a pack's sounds. */
  useSounds(sounds: PackSounds): void
}

/** The pack a screen belongs to: one whose skills, levels or level it shows, or that it edits. */
function packOfScreen(current: Screen): string | undefined {
  if ('pack' in current) return current.pack
  return current.name === 'play' ? findLevel(current.level)?.pack.id : undefined
}

interface Props {
  /** Where profiles and packs are saved; IndexedDB unless a test passes another store. */
  readonly store?: KeyValueStore
  readonly audio?: Audio
}

type Overlay = 'help' | 'settings' | undefined

/** The editor loads on demand, so players who only play do not download it. */
type EditorModule = typeof import('./editor/EditorScreens')
const loadEditor = (): Promise<EditorModule> => import('./editor/EditorScreens')

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
  const [editor, setEditor] = useState<EditorModule>()

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
  useEffect(
    () =>
      effect(() => {
        // A pack sounds alike on its screens and in its levels; elsewhere the laboratory plays.
        const pack = packOfScreen(screen.value)
        sound.useSounds(soundsOf(pack === undefined ? undefined : findPack(pack)?.file))
      }),
    [sound],
  )
  const book = opened?.book
  const shelf = opened?.shelf
  const editing = isEditorScreen(screen.value)
  useEffect(() => {
    if (editing && editor === undefined) void loadEditor().then(setEditor)
  }, [editing, editor])
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
  useEffect(
    () =>
      book &&
      effect(() => {
        const { settings } = book.active.value
        colorBlind.value = settings.colorBlind
        chosenArt.value = settings.art
        beamPreview.value = settings.beamPreview
        vibration.value = settings.vibration
        bindings.value = resolveBindings({ keys: settings.keyBindings, pad: settings.padBindings })
      }),
    [book],
  )

  if (opened === undefined || book === undefined) return <p class="loading">{t('loading')}</p>
  const current = screen.value
  const solved = book.solved.value
  const closeOverlay = () => setOverlay(undefined)

  return (
    <div class={book.active.value.settings.leftHanded ? 'shell left-handed' : 'shell'}>
      <header class="top-bar">
        <a class="title" href="#/">
          <h1>{t('appTitle')}</h1>
          <p class="tagline">{t('tagline')}</p>
        </a>
        <TopMenu>
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
          <FullScreenButton />
          <LanguageSwitch />
        </TopMenu>
      </header>
      {opened.blocked && <p class="notice">{t('storageBlocked')}</p>}
      <UpdateNotice />
      <main
        class={
          current.name === 'play' || current.name === 'shared' || current.name === 'editLevel'
            ? 'play'
            : 'menu'
        }
      >
        {current.name === 'packs' && <PacksScreen solved={solved} last={book.active.value.last} />}
        {current.name === 'skills' && (
          <SkillsScreen pack={current.pack} solved={solved} onHelp={() => setOverlay('help')} />
        )}
        {current.name === 'levels' && (
          <LevelsScreen
            pack={current.pack}
            skill={current.skill}
            solved={solved}
            best={book.best.value}
          />
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
        {current.name === 'shared' && shelf && (
          <SharedScreen
            key={current.data}
            data={current.data}
            shelf={shelf}
            speaker={sound}
            paused={overlay !== undefined}
            reducedMotion={book.active.value.settings.reducedMotion}
            onHelp={() => setOverlay('help')}
          />
        )}
        {current.name === 'profiles' && <ProfilesScreen book={book} />}
        {isEditorScreen(current) &&
          (editor && shelf ? (
            <editor.EditorScreens
              screen={current}
              shelf={shelf}
              speaker={sound}
              paused={overlay !== undefined}
              onHelp={() => setOverlay('help')}
            />
          ) : (
            <p class="loading">{t('loading')}</p>
          ))}
        {current.name === 'about' && <AboutScreen />}
      </main>
      {overlay === 'help' && <HelpDialog onClose={closeOverlay} />}
      {overlay === 'settings' && <SettingsDialog book={book} onClose={closeOverlay} />}
      <TurnNotice />
    </div>
  )
}
