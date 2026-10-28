import type { Speaker } from '../../audio/director'
import type { PackShelf } from '../../persistence/packs'
import type { EditorScreen } from '../router'
import { EditorHome } from './EditorHome'
import { LevelEditor } from './LevelEditor'
import { PackEditor } from './PackEditor'

interface Props {
  readonly screen: EditorScreen
  readonly shelf: PackShelf
  readonly speaker: Speaker
  /** Help or the settings are open over the editor. */
  readonly paused: boolean
  readonly onHelp: () => void
}

/** The level editor, in a file of its own that loads only when a player opens the editor. */
export function EditorScreens({ screen, shelf, speaker, paused, onHelp }: Props) {
  switch (screen.name) {
    case 'editor':
      return <EditorHome shelf={shelf} />
    case 'editPack':
      return <PackEditor key={screen.pack} pack={screen.pack} shelf={shelf} />
    case 'editLevel':
      return (
        // One editor per slot: its undo history belongs to one level.
        <LevelEditor
          key={`${screen.pack}/${screen.skill}/${screen.slot}`}
          pack={screen.pack}
          skill={screen.skill}
          slot={screen.slot}
          shelf={shelf}
          speaker={speaker}
          paused={paused}
          onHelp={onHelp}
        />
      )
  }
}
