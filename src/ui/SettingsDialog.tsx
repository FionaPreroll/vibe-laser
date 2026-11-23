import { t } from '../i18n'
import type { PackShelf } from '../persistence/packs'
import { LOOKS, type ProfileBook, WAKE_LOCKS } from '../persistence/profiles'
import { KeyBindings } from './KeyBindings'
import { LanguageSwitch } from './LanguageSwitch'
import { Modal } from './Modal'
import { SaveBackup } from './SaveBackup'
import { canKeepAwake } from './wakeLock'

interface Props {
  readonly book: ProfileBook
  readonly shelf: PackShelf
  readonly onClose: () => void
}

/** Settings of the active profile; the language belongs to the browser. */
export function SettingsDialog({ book, shelf, onClose }: Props) {
  const { settings } = book.active.value
  const percent = (value: number) => Math.round(value * 100)
  return (
    <Modal id="settings" title={t('settingsTitle')} onClose={onClose}>
      <div class="settings">
        <label>
          <span>{t('soundVolume')}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={percent(settings.soundVolume)}
            onInput={(event) =>
              void book.updateSettings({ soundVolume: Number(event.currentTarget.value) / 100 })
            }
          />
        </label>
        <label>
          <span>{t('musicVolume')}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={percent(settings.musicVolume)}
            onInput={(event) =>
              void book.updateSettings({ musicVolume: Number(event.currentTarget.value) / 100 })
            }
          />
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) =>
              void book.updateSettings({ reducedMotion: event.currentTarget.checked })
            }
          />
          <span>{t('reducedMotion')}</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.colorBlind}
            aria-describedby="color-blind-hint"
            onChange={(event) =>
              void book.updateSettings({ colorBlind: event.currentTarget.checked })
            }
          />
          <span>{t('colorBlind')}</span>
        </label>
        <p id="color-blind-hint" class="hint">
          {t('colorBlindHint')}
        </p>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.beamPreview}
            aria-describedby="beam-preview-hint"
            onChange={(event) =>
              void book.updateSettings({ beamPreview: event.currentTarget.checked })
            }
          />
          <span>{t('beamPreview')}</span>
        </label>
        <p id="beam-preview-hint" class="hint">
          {t('beamPreviewHint')}
        </p>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.leftHanded}
            aria-describedby="left-handed-hint"
            onChange={(event) =>
              void book.updateSettings({ leftHanded: event.currentTarget.checked })
            }
          />
          <span>{t('leftHanded')}</span>
        </label>
        <p id="left-handed-hint" class="hint">
          {t('leftHandedHint')}
        </p>
        {'vibrate' in navigator && (
          <label class="check">
            <input
              type="checkbox"
              checked={settings.vibration}
              onChange={(event) =>
                void book.updateSettings({ vibration: event.currentTarget.checked })
              }
            />
            <span>{t('vibration')}</span>
          </label>
        )}
        {canKeepAwake() && (
          <>
            <label>
              <span>{t('wakeLockLabel')}</span>
              <select
                value={settings.wakeLock}
                aria-describedby="wake-lock-hint"
                onChange={(event) => {
                  const wakeLock = WAKE_LOCKS.find((mode) => mode === event.currentTarget.value)
                  if (wakeLock !== undefined) void book.updateSettings({ wakeLock })
                }}
              >
                {WAKE_LOCKS.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`wakeLock.${mode}`)}
                  </option>
                ))}
              </select>
            </label>
            <p id="wake-lock-hint" class="hint">
              {t('wakeLockHint')}
            </p>
          </>
        )}
        <label>
          <span>{t('artLabel')}</span>
          <select
            value={settings.art}
            aria-describedby="art-hint"
            onChange={(event) => {
              const art = LOOKS.find((look) => look === event.currentTarget.value)
              if (art !== undefined) void book.updateSettings({ art })
            }}
          >
            {LOOKS.map((look) => (
              <option key={look} value={look}>
                {t(`art.${look}`)}
              </option>
            ))}
          </select>
        </label>
        <p id="art-hint" class="hint">
          {t('artHint')}
        </p>
        {'serviceWorker' in navigator && (
          <>
            <label class="check">
              <input
                type="checkbox"
                checked={settings.watchUpdates}
                aria-describedby="watch-updates-hint"
                onChange={(event) =>
                  void book.updateSettings({ watchUpdates: event.currentTarget.checked })
                }
              />
              <span>{t('watchUpdates')}</span>
            </label>
            <p id="watch-updates-hint" class="hint">
              {t('watchUpdatesHint')}
            </p>
          </>
        )}
        <LanguageSwitch />
        <KeyBindings book={book} />
        <SaveBackup book={book} shelf={shelf} />
      </div>
    </Modal>
  )
}
