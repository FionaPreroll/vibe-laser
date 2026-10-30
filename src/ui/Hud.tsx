import { useEffect, useState } from 'preact/hooks'
import { ACTOR_KINDS } from '../core/actors/kinds'
import type { Piece } from '../core/board'
import { type Color, PRIMARIES, type Primary } from '../core/color'
import type { Puzzle } from '../core/level'
import { STABLE_TICKS } from '../game/session'
import { type MessageKey, t } from '../i18n'
import { type BoardController, nextSpeed } from '../view/controller'
import { Icon, type IconName } from './icons'
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
  const { phase, stable, puzzle } = session.state.value
  return (
    <div class="hud">
      {phase === 'stabilizing' && (
        <div class="stability">
          <span>{t('stabilizing')}</span>
          <progress max={STABLE_TICKS} value={stable} aria-label={t('stability')} />
        </div>
      )}
      <EatenMirrorNotice controller={controller} />
      <div class="hud-buttons" role="toolbar" aria-label={t('actions')}>
        <HudButton icon="exit" label={t('exit')} onClick={onExit} />
        <HudButton icon="restart" label={t('restart')} onClick={() => session.restart()} />
        <HudButton
          icon="cleanup"
          label={t('cleanup')}
          disabled={!session.canCleanup.value}
          onClick={() => session.cleanup()}
        />
        <HudButton
          icon="undo"
          label={t('undo')}
          disabled={!session.canUndo.value}
          onClick={() => session.undo()}
        />
        <HudButton
          icon="redo"
          label={t('redo')}
          disabled={!session.canRedo.value}
          onClick={() => session.redo()}
        />
        <HudButton
          icon="rotateLeft"
          label={t('rotateLeft')}
          disabled={!controller.canRotateSelected.value}
          onClick={() => controller.rotateSelected(-1)}
        />
        <HudButton
          icon="rotateRight"
          label={t('rotateRight')}
          disabled={!controller.canRotateSelected.value}
          onClick={() => controller.rotateSelected(1)}
        />
        {hasActors(puzzle) && (
          <HudButton
            icon="fast"
            label={t('speed', { speed: controller.speed.value })}
            badge={`${controller.speed.value}×`}
            pressed={controller.speed.value > 1}
            onClick={() => {
              controller.speed.value = nextSpeed(controller.speed.value)
            }}
          />
        )}
        <HudButton icon="help" label={t('help')} onClick={onHelp} />
        <span class="moves">{t('movesCounter', { count: session.moves.value })}</span>
        <ColorDots piece={controller.inspected.value} />
      </div>
      <p id="controls-hint" class="hint">
        {t(touchScreen.value ? 'touchControls' : 'controls')}
      </p>
    </div>
  )
}

interface ButtonProps {
  readonly icon: IconName
  readonly label: string
  readonly disabled?: boolean
  /** A short mark that stays in view beside the icon, such as the speed. */
  readonly badge?: string
  /** For buttons that switch something on. */
  readonly pressed?: boolean
  readonly onClick: () => void
}

/** A button of the bar: an icon, and its name beside it where there is room, else as a tooltip. */
export function HudButton({ icon, label, disabled, badge, pressed, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      class="hud-button"
      title={label}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <Icon name={icon} />
      {badge && (
        <span class="hud-badge" aria-hidden="true">
          {badge}
        </span>
      )}
      <span class="hud-label">{label}</span>
    </button>
  )
}

/** Slimes, mines or ships on the board, whose pace the fast-forward button can change. */
function hasActors(puzzle: Puzzle): boolean {
  return puzzle.items.some(
    ({ piece, place }) => place.area === 'board' && ACTOR_KINDS.has(piece.kind),
  )
}

/**
 * Says when a slime has eaten a mirror. Undo cannot bring it back, and without it the level may no
 * longer be solvable, so it offers a fresh start; restarting puts the notice away.
 */
function EatenMirrorNotice({ controller }: { readonly controller: BoardController }) {
  const { session } = controller
  const [eaten, setEaten] = useState(false)
  useEffect(
    () =>
      session.onEvents((events) => {
        if (events.some((event) => event.kind === 'ate' && event.meal === 'mirror')) setEaten(true)
      }),
    [session],
  )
  const restarted = session.moves.value === 0 && !session.canUndo.value
  useEffect(() => {
    if (restarted) setEaten(false)
  }, [restarted])
  if (!eaten) return null
  return (
    <div class="hud-notice" role="status">
      <span>{t('mirrorEaten')}</span>
      <button
        type="button"
        class="primary"
        onClick={() => {
          controller.select(undefined)
          session.restart()
        }}
      >
        {t('restart')}
      </button>
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
