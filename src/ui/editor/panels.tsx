import { HEADINGS } from '../../core/actors/kinds'
import { colorLetters, parseColor } from '../../core/color'
import type { Place } from '../../core/level'
import { COLORED_KINDS } from '../../core/notation'
import { ROTATING_KINDS } from '../../core/parts'
import type { EditorController, Problem, Tool } from '../../editor/controller'
import { MAX_COLUMNS, MAX_ROWS, nameOf } from '../../editor/draft'
import { newPiece, PALETTE } from '../../editor/palette'
import { type MessageKey, t } from '../../i18n'
import { CommitField, NumberField } from './fields'

const TOOLS: readonly Tool[] = ['select', 'paint', 'clone', 'erase']

/** A board cell by its name, as "B6", or a toolbox slot by its number. */
export function placeName(editor: EditorController, place: Place): string {
  return place.area === 'board'
    ? nameOf(editor.level.value, place.cell)
    : t('toolboxSlot', { number: place.slot + 1 })
}

export function ToolPanel({ editor }: { readonly editor: EditorController }) {
  return (
    <fieldset class="panel tools">
      <legend>{t('toolLabel')}</legend>
      {TOOLS.map((tool) => (
        <label key={tool} class="choice">
          <input
            type="radio"
            name="editor-tool"
            checked={editor.tool.value === tool}
            onChange={() => {
              editor.tool.value = tool
            }}
          />
          <span>{t(`tool.${tool}`)}</span>
        </label>
      ))}
    </fieldset>
  )
}

/** Every part with its key; choosing one paints with it. */
export function PalettePanel({ editor }: { readonly editor: EditorController }) {
  const brush = editor.brush.value.type
  return (
    <fieldset class="panel palette">
      <legend>{t('paletteLabel')}</legend>
      {PALETTE.map(({ kind, key }) => (
        <button
          key={kind}
          type="button"
          aria-pressed={brush === kind && editor.tool.value === 'paint'}
          onClick={() => {
            editor.brush.value = newPiece(kind)
            editor.tool.value = 'paint'
          }}
        >
          {t('paletteEntry', { name: t(`parts.${kind}`), key: key.toUpperCase() })}
        </button>
      ))}
    </fieldset>
  )
}

const PRIMARIES = [
  { letter: 'r', label: 'red' },
  { letter: 'g', label: 'green' },
  { letter: 'b', label: 'blue' },
] as const satisfies readonly { letter: string; label: MessageKey }[]

/** The selected place's piece: color, direction, and what players may do with it. */
export function PiecePanel({ editor }: { readonly editor: EditorController }) {
  const place = editor.selected.value
  if (place === undefined) {
    return (
      <section class="panel">
        <h3>{t('pieceLabel')}</h3>
        <p class="hint">{t('nothingSelected')}</p>
      </section>
    )
  }
  const where = placeName(editor, place)
  const piece = editor.pieceAt(place)
  if (piece === undefined) {
    return (
      <section class="panel">
        <h3>{t('pieceLabel')}</h3>
        <p class="hint">{t('emptyPlace', { place: where })}</p>
      </section>
    )
  }

  const kind = piece.type
  const onBoard = place.area === 'board'
  const moveable = piece.moveable ?? !onBoard
  const rotateable = piece.rotateable ?? (!onBoard && ROTATING_KINDS.has(kind))
  const color = parseColor(piece.rgb ?? '') ?? 0
  const headings = HEADINGS[kind]
  const setColor = (letter: string, on: boolean) => {
    const letters = PRIMARIES.map((primary) => primary.letter).filter((each) =>
      each === letter ? on : (piece.rgb ?? '').includes(each),
    )
    editor.change(place, { rgb: letters.length > 0 ? letters.join('') : undefined })
  }
  // A flag that matches the default for its area is left out of the file.
  const setFlag = (flag: 'moveable' | 'rotateable', value: boolean, standard: boolean) =>
    editor.change(place, { [flag]: value === standard ? undefined : value })

  return (
    <section class="panel piece-panel">
      <h3>{t('pieceLabel')}</h3>
      <p>{t('pieceOn', { name: t(`parts.${kind}`), place: where })}</p>
      {COLORED_KINDS.has(kind) && (
        <fieldset class="colors">
          <legend>{t('colorLabel')}</legend>
          {PRIMARIES.map(({ letter, label }) => (
            <label key={letter} class="check">
              <input
                type="checkbox"
                checked={colorLetters(color).includes(letter)}
                onChange={(event) => setColor(letter, event.currentTarget.checked)}
              />
              <span>{t(label)}</span>
            </label>
          ))}
        </fieldset>
      )}
      {headings !== undefined ? (
        <label class="field">
          <span>{t('headingLabel')}</span>
          <select
            value={String(piece.rot ?? headings[0])}
            onChange={(event) => editor.change(place, { rot: Number(event.currentTarget.value) })}
          >
            {headings.map((heading) => (
              <option key={heading} value={String(heading)}>
                {t(`direction.${heading}`)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        ROTATING_KINDS.has(kind) && (
          <div class="turn">
            <span>
              {t('directionLabel', { direction: t(`direction.${direction(piece.rot)}`) })}
            </span>
            <button type="button" onClick={() => editor.rotate(place, -1)}>
              {t('rotateLeft')}
            </button>
            <button type="button" onClick={() => editor.rotate(place, 1)}>
              {t('rotateRight')}
            </button>
          </div>
        )
      )}
      <label class="check">
        <input
          type="checkbox"
          checked={moveable}
          onChange={(event) => setFlag('moveable', event.currentTarget.checked, !onBoard)}
        />
        <span>{t('moveableLabel')}</span>
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={rotateable}
          disabled={!ROTATING_KINDS.has(kind)}
          onChange={(event) =>
            setFlag('rotateable', event.currentTarget.checked, !onBoard && ROTATING_KINDS.has(kind))
          }
        />
        <span>{t('rotateableLabel')}</span>
      </label>
      <button type="button" onClick={() => editor.erase(place)}>
        {t('removePiece')}
      </button>
    </section>
  )
}

function direction(rotation: number | undefined): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return ((((rotation ?? 0) % 8) + 8) % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
}

/** Name, note and size of the level. */
export function LevelPanel({ editor }: { readonly editor: EditorController }) {
  const level = editor.level.value
  const [columns, rows] = level.size
  return (
    <section class="panel level-panel">
      <h3>{t('levelSection')}</h3>
      <CommitField
        label={t('nameEn')}
        value={level.name.en}
        maxLength={60}
        onCommit={(value) => editor.rename('en', value.trim())}
      />
      <CommitField
        label={t('nameDe')}
        value={level.name.de}
        maxLength={60}
        onCommit={(value) => editor.rename('de', value.trim())}
      />
      <CommitField
        label={t('noteLabel')}
        value={level.note ?? ''}
        multiline
        onCommit={(value) => editor.setNote(value)}
      />
      <div class="field-pair">
        <NumberField
          label={t('columnsLabel')}
          value={columns}
          min={1}
          max={MAX_COLUMNS}
          onCommit={(value) => editor.resize(value, rows)}
        />
        <NumberField
          label={t('rowsLabel')}
          value={rows}
          min={1}
          max={MAX_ROWS}
          onCommit={(value) => editor.resize(columns, value)}
        />
      </div>
    </section>
  )
}

/** Whether the level has a known solution, and whether it still works. */
export function SolutionPanel({ editor }: { readonly editor: EditorController }) {
  const status = editor.solution.value
  const text =
    status.kind === 'none'
      ? t('solution.none')
      : status.kind === 'fails'
        ? t('solution.fails')
        : status.tried > 1 && status.solved === status.tried
          ? t('solution.seeds', { tried: status.tried })
          : t('solution.works')
  return (
    <section class="panel">
      <h3>{t('solutionLabel')}</h3>
      <p class={status.kind === 'fails' ? 'problem' : 'hint'}>{text}</p>
      {status.kind !== 'none' && (
        <button type="button" onClick={() => editor.setSolution(undefined)}>
          {t('forgetSolution')}
        </button>
      )}
    </section>
  )
}

/** What keeps the level from being saved; a problem with a place selects it. */
export function ProblemsPanel({ editor }: { readonly editor: EditorController }) {
  const problems = editor.problems.value
  return (
    <section class="panel">
      <h3>{t('problemsLabel')}</h3>
      {problems.length === 0 ? (
        <p class="hint">{t('noProblems')}</p>
      ) : (
        <ul class="problems">
          {problems.map((problem) => {
            const text = problemText(editor, problem)
            const at = problem.at
            return (
              <li key={text} class={problem.blocking ? 'problem' : 'warning'}>
                {at === undefined ? (
                  text
                ) : (
                  <button
                    type="button"
                    class="link"
                    onClick={() => {
                      editor.selected.value = at
                    }}
                  >
                    {text}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** A problem in the player's language, led by the place it is on. */
export function problemText(editor: EditorController, problem: Problem): string {
  const message = t(`problem.${problem.key}`, {
    part: problem.kind === undefined ? '' : t(`parts.${problem.kind}`),
    place: problem.place ?? '',
    count: problem.count ?? 0,
    solved: problem.solved ?? 0,
    tried: problem.tried ?? 0,
  })
  return problem.at === undefined
    ? message
    : t('problem.where', { place: placeName(editor, problem.at), message })
}
