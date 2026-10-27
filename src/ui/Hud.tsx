import { t } from '../i18n'
import type { BoardController } from '../view/controller'

/** The button bar below the board, as in the original. */
export function Hud({ controller }: { readonly controller: BoardController }) {
  const { session } = controller
  return (
    <div class="hud">
      <div class="hud-buttons" role="toolbar" aria-label={t('actions')}>
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
      </div>
      <p id="controls-hint" class="hint">
        {t('controls')}
      </p>
    </div>
  )
}
