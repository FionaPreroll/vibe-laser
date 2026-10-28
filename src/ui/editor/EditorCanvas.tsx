import { useCallback } from 'preact/hooks'
import type { EditorController } from '../../editor/controller'
import { mountEditorBoard } from '../../view/editorBoard'
import { CanvasHost } from '../BoardCanvas'

interface Props {
  readonly editor: EditorController
  readonly label: string
}

/** The editor's board. Key it by the scene's layout: a new layout needs a new board. */
export function EditorCanvas({ editor, label }: Props) {
  const mount = useCallback((element: HTMLElement) => mountEditorBoard(element, editor), [editor])
  return <CanvasHost mount={mount} label={label} describedBy="editor-hint" />
}
