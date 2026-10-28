import { t } from '../i18n'
import type { ProfileBook } from '../persistence/profiles'
import { LanguageSwitch } from './LanguageSwitch'
import { Modal } from './Modal'

interface Props {
  readonly book: ProfileBook
  readonly onClose: () => void
}

/** Settings of the active profile; the language belongs to the browser. */
export function SettingsDialog({ book, onClose }: Props) {
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
        <LanguageSwitch />
      </div>
    </Modal>
  )
}
