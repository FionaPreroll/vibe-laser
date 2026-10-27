import { effect } from '@preact/signals'
import { render } from 'preact'
import { locale } from './i18n'
import { App } from './ui/App'
import './ui/styles.css'

effect(() => {
  document.documentElement.lang = locale.value
})

const root = document.getElementById('app')
if (!root) throw new Error('index.html has no #app element')
render(<App />, root)
