import type { Piece } from '../core/board'
import { type Color, PRIMARIES, type Primary } from '../core/color'
import { STABLE_TICKS } from '../game/session'
import { type MessageKey, t } from '../i18n'
import type { BoardController } from '../view/controller'
import { touchScreen } from './pointer'

const PRIMARY_NAMES: Readonly<Record<Primary, MessageKey>> = { 1: 'red', 2: 'green', 4: 'blue' }
const PRIMARY_LETTERS: Readonly<Record<Primary, string>> = { 1: 'R', 2: 'G', 4: 'B' }

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
        <span class="moves">{t('movesCounter', { count: session.moves.value })}</span>
        <ColorDots piece={controller.inspected.value} />
      </div>
      <p id="controls-hint" class="hint">
        {t(touchScreen.value ? 'touchControls' : 'controls')}
      </p>
    </div>
  )
}

/**
 * The original's RGB dots: the colors of the piece under the pointer, so a yellow piece lights red
 * and green. A complex shows its inner color after a slash, as color-blind mode writes it.
 */
function ColorDots({ piece }: { readonly piece: Piece | undefined }) {
  const color = piece?.color ?? 0
  const inner = piece?.inner
  const colors =
    inner === undefined
      ? colorNames(color)
      : t('colorDotsComplex', { outer: colorNames(color), inner: colorNames(inner) })
  return (
    <div class="color-dots" role="img" aria-label={t('colorDots', { colors })}>
      <Dots color={color} />
      {inner !== undefined && (
        <>
          <span class="color-dots-slash">/</span>
          <Dots color={inner} />
        </>
      )}
    </div>
  )
}

function Dots({ color }: { readonly color: Color }) {
  return PRIMARIES.map((primary) => (
    <span
      key={primary}
      class={`color-dot color-dot-${PRIMARY_LETTERS[primary].toLowerCase()}`}
      data-on={(color & primary) !== 0}
    >
      {PRIMARY_LETTERS[primary]}
    </span>
  ))
}

function colorNames(color: Color): string {
  const names = PRIMARIES.filter((primary) => (color & primary) !== 0).map((primary) =>
    t(PRIMARY_NAMES[primary]),
  )
  return names.length === 0 ? t('colorDotsNone') : names.join(', ')
}
