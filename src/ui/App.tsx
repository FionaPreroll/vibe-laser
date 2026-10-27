import { t } from '../i18n'
import { BoardCanvas } from './BoardCanvas'
import { LanguageSwitch } from './LanguageSwitch'

export function App() {
  return (
    <div class="shell">
      <header class="top-bar">
        <div>
          <h1>{t('appTitle')}</h1>
          <p class="tagline">{t('tagline')}</p>
        </div>
        <LanguageSwitch />
      </header>
      <main class="stage">
        <BoardCanvas />
      </main>
    </div>
  )
}
