import { PALETTE } from '../editor/palette'
import { t } from '../i18n'
import { Modal } from './Modal'
import { touchScreen } from './pointer'

export function HelpDialog({ onClose }: { readonly onClose: () => void }) {
  return (
    <Modal id="help" title={t('helpTitle')} onClose={onClose}>
      <p>{t('helpGoal')}</p>
      <p>{t(touchScreen.value ? 'touchControls' : 'controls')}</p>
      <h3>{t('helpParts')}</h3>
      <dl class="parts">
        {PALETTE.map(({ kind }) => (
          <div key={kind}>
            <dt>{t(`parts.${kind}`)}</dt>
            <dd>{t(`parts.${kind}.text`)}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
