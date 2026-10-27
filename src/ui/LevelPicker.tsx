import type { LevelDefinition } from '../content/levels'
import { locale, t } from '../i18n'

interface Props {
  readonly levels: readonly LevelDefinition[]
  readonly index: number
  readonly onSelect: (index: number) => void
}

/** Every level is open, so players can skip one that blocks them. */
export function LevelPicker({ levels, index, onSelect }: Props) {
  return (
    <label class="picker">
      <span>{t('level')}</span>
      <select
        value={String(index)}
        onChange={(event) => onSelect(Number(event.currentTarget.value))}
      >
        {levels.map((level, position) => (
          <option key={level.id} value={String(position)}>
            {`${position + 1}. ${level.name[locale.value]}`}
          </option>
        ))}
      </select>
    </label>
  )
}
