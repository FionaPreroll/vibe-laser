import { type LevelFile, levelSchema } from './schema'

/**
 * Levels in links: the level file, compressed and written in the letters a URL allows, so a level
 * made in the editor travels in an address such as "#/level/…" instead of a file.
 */

const FORMAT = 'deflate-raw'

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(piped).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** A level as text for a link. Its author's notes stay behind. */
export async function encodeLevel(level: LevelFile): Promise<string> {
  const { $schema: _, note: __, ...shared } = level
  const json = new TextEncoder().encode(JSON.stringify(shared))
  return toBase64Url(await pipe(json, new CompressionStream(FORMAT)))
}

/** The level in a link's text; throws when the text holds no level of this game. */
export async function decodeLevel(text: string): Promise<LevelFile> {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new SyntaxError('The link holds no level')
  let json: unknown
  try {
    const bytes = await pipe(fromBase64Url(text), new DecompressionStream(FORMAT))
    json = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new SyntaxError('The link holds no level')
  }
  const parsed = levelSchema.safeParse(json)
  if (!parsed.success) throw new SyntaxError('The link holds no level')
  return parsed.data
}
