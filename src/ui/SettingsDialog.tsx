import { t } from '../i18n'
import type { ProfileBook } from '../persistence/profiles'
import { ART_STYLES } from '../view/display'
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
        <label>
          <span>{t('artLabel')}</span>
          <select
            value={settings.art}
            onChange={(event) => {
              const art = ART_STYLES.find((style) => style === event.currentTarget.value)
              if (art !== undefined) void book.updateSettings({ art })
            }}
          >
            {ART_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(`art.${style}`)}
              </option>
            ))}
          </select>
        </label>
        <LanguageSwitch />
      </div>
    </Modal>
  )
}
