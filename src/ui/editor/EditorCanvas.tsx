import { useCallback } from 'preact/hooks'
import type { ArtStyle } from '../../content/schema'
import type { EditorController } from '../../editor/controller'
import { createArt } from '../../view/art'
import { artStyleOf } from '../../view/display'
import { mountEditorBoard } from '../../view/editorBoard'
import { CanvasHost } from '../BoardCanvas'

interface Props {
  readonly editor: EditorController
  readonly label: string
  /** The skin of the pack, so that the level looks as players will see it. */
  readonly skin: ArtStyle | undefined
}

/** The editor's board. Key it by the scene's layout: a new layout needs a new board. */
export function EditorCanvas({ editor, label, skin }: Props) {
  const style = artStyleOf(skin)
  const mount = useCallback(
    (element: HTMLElement) => mountEditorBoard(element, editor, createArt(style)),
    [editor, style],
  )
  return <CanvasHost mount={mount} label={label} describedBy="editor-hint" />
}
