import { useEffect, useState } from 'preact/hooks'

interface Props {
  readonly label: string
  readonly value: string
  /** Called once the player is done with the field: on Enter or when it loses the focus. */
  readonly onCommit: (value: string) => void
  readonly multiline?: boolean
  readonly maxLength?: number
}

/**
 * A labelled field that keeps what the player types to itself and hands it on as one change, so a
 * name typed letter by letter is one step to undo. It follows outside changes, such as an undo.
 */
export function CommitField({ label, value, onCommit, multiline, maxLength }: Props) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  if (multiline) {
    return (
      <label class="field">
        <span>{label}</span>
        <textarea
          rows={2}
          value={text}
          maxLength={maxLength}
          onInput={(event) => setText(event.currentTarget.value)}
          onChange={(event) => onCommit(event.currentTarget.value)}
        />
      </label>
    )
  }
  return (
    <label class="field">
      <span>{label}</span>
      <input
        type="text"
        value={text}
        maxLength={maxLength}
        onInput={(event) => setText(event.currentTarget.value)}
        onChange={(event) => onCommit(event.currentTarget.value)}
      />
    </label>
  )
}

interface NumberProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly onCommit: (value: number) => void
}

/** A whole number in a range, handed on like a CommitField. */
export function NumberField({ label, value, min, max, onCommit }: NumberProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <label class="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={text}
        onInput={(event) => setText(event.currentTarget.value)}
        onChange={(event) => {
          const number = Number(event.currentTarget.value)
          if (Number.isFinite(number)) onCommit(number)
          else setText(String(value))
        }}
      />
    </label>
  )
}
