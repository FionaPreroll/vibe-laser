import { effect } from '@preact/signals'
import { render } from 'preact'
import { locale } from './i18n'
import { App } from './ui/App'
import { registerServiceWorker } from './ui/updates'
import './ui/styles.css'

effect(() => {
  document.documentElement.lang = locale.value
})

const root = document.getElementById('app')
if (!root) throw new Error('index.html has no #app element')
render(<App />, root)

// Only builds have a service worker; the dev server always serves the files as they are now.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void registerServiceWorker())
}
