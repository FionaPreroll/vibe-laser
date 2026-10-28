import type { ArtStyle } from '../../content/schema'
import { createFlatArt } from './flat'
import { createNeonArt } from './neon'
import type { ArtPack } from './types'

/** A fresh art pack of a style; boards draw with it until they go. */
export function createArt(style: ArtStyle): ArtPack {
  return style === 'neon' ? createNeonArt() : createFlatArt()
}
