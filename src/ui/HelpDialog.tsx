import type { PartKind } from '../core/board'
import { t } from '../i18n'
import { Modal } from './Modal'

/** In the order players meet them in the tutorial. */
const PARTS: readonly PartKind[] = [
  'laser',
  'coin',
  'antiCoin',
  'mirror',
  'doubleMirror',
  'slitMirror',
  'refractor',
  'oneWay',
  'splitter',
  'threeway',
  'prism',
  'colorConverter',
  'filter',
  'polarizer',
  'explosive',
  'slime',
  'mine',
  'blackHole',
  'ship',
  'fuelCell',
]

export function HelpDialog({ onClose }: { readonly onClose: () => void }) {
  return (
    <Modal id="help" title={t('helpTitle')} onClose={onClose}>
      <p>{t('helpGoal')}</p>
      <p>{t('controls')}</p>
      <h3>{t('helpParts')}</h3>
      <dl class="parts">
        {PARTS.map((kind) => (
          <div key={kind}>
            <dt>{t(`parts.${kind}`)}</dt>
            <dd>{t(`parts.${kind}.text`)}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
