import { STABLE_TICKS } from '../game/session'
import { t } from '../i18n'
import type { BoardController } from '../view/controller'
import { touchScreen } from './pointer'

interface Props {
  readonly controller: BoardController
  readonly onExit: () => void
  readonly onHelp: () => void
}

/** The button bar below the board, as in the original, with the stability bar above it. */
export function Hud({ controller, onExit, onHelp }: Props) {
  const { session } = controller
  const { phase, stable } = session.state.value
  return (
    <div class="hud">
      {phase === 'stabilizing' && (
        <div class="stability">
          <span>{t('stabilizing')}</span>
          <progress max={STABLE_TICKS} value={stable} aria-label={t('stability')} />
        </div>
      )}
      <div class="hud-buttons" role="toolbar" aria-label={t('actions')}>
        <button type="button" onClick={onExit}>
          {t('exit')}
        </button>
        <button type="button" onClick={() => session.restart()}>
          {t('restart')}
        </button>
        <button
          type="button"
          disabled={!session.canCleanup.value}
          onClick={() => session.cleanup()}
        >
          {t('cleanup')}
        </button>
        <button type="button" disabled={!session.canUndo.value} onClick={() => session.undo()}>
          {t('undo')}
        </button>
        <button type="button" disabled={!session.canRedo.value} onClick={() => session.redo()}>
          {t('redo')}
        </button>
        <button
          type="button"
          disabled={!controller.canRotateSelected.value}
          onClick={() => controller.rotateSelected(-1)}
        >
          {t('rotateLeft')}
        </button>
        <button
          type="button"
          disabled={!controller.canRotateSelected.value}
          onClick={() => controller.rotateSelected(1)}
        >
          {t('rotateRight')}
        </button>
        <button type="button" onClick={onHelp}>
          {t('help')}
        </button>
      </div>
      <p id="controls-hint" class="hint">
        {t(touchScreen.value ? 'touchControls' : 'controls')}
      </p>
    </div>
  )
}
