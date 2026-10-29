import { PALETTE } from '../editor/palette'
import { t } from '../i18n'
import { BEAM_COLORS } from '../view/palette'
import { Modal } from './Modal'
import { touchScreen } from './pointer'

export function HelpDialog({ onClose }: { readonly onClose: () => void }) {
  return (
    <Modal id="help" title={t('helpTitle')} onClose={onClose}>
      <p>{t('helpGoal')}</p>
      <p>{t(touchScreen.value ? 'touchControls' : 'controls')}</p>
      <h3>{t('helpColors')}</h3>
      <div class="colors-help">
        <ColorWheel />
        <p>{t('helpColorsText')}</p>
      </div>
      <p>{t('helpColorDots')}</p>
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

/** Lights that overlap mix: the regions carry the letters that color-blind mode writes on pieces. */
function ColorWheel() {
  const lights = [
    { x: 76, y: 70, color: BEAM_COLORS[1] },
    { x: 124, y: 70, color: BEAM_COLORS[2] },
    { x: 100, y: 112, color: BEAM_COLORS[4] },
  ]
  const regions = [
    { x: 56, y: 58, letters: 'R' },
    { x: 144, y: 58, letters: 'G' },
    { x: 100, y: 146, letters: 'B' },
    { x: 100, y: 48, letters: 'RG' },
    { x: 70, y: 106, letters: 'RB' },
    { x: 130, y: 106, letters: 'GB' },
    { x: 100, y: 86, letters: 'RGB' },
  ]
  const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`
  return (
    <svg class="color-wheel" viewBox="0 0 200 180" role="img" aria-label={t('colorWheel')}>
      {lights.map(({ x, y, color }) => (
        <circle key={color} cx={x} cy={y} r={46} fill={hex(color)} />
      ))}
      {regions.map(({ x, y, letters }) => (
        <text key={letters} x={x} y={y}>
          {letters}
        </text>
      ))}
    </svg>
  )
}
