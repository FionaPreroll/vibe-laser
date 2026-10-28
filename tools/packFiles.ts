import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Plugin } from 'vite'

type Checked<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: unknown }

/**
 * The game's own checks for level and pack files, from src/content/schema.ts. The dev server
 * loads them when a request comes, so the Vite config itself imports nothing from src/.
 */
export interface Schemas {
  readonly levelSchema: { safeParse(value: unknown): Checked<unknown> }
  readonly packSchema: {
    safeParse(value: unknown): Checked<{ readonly skills: readonly unknown[] }>
  }
  describeIssues(error: never): string[]
}

/** Where the editor sends built-in levels and pack settings; see src/editor/devFiles.ts. */
export const PREFIX = '/__vibe-laser/packs'
const MAX_BODY = 1_000_000

export interface PackFileRequest {
  readonly method: string | undefined
  /** The path after the prefix: "/<pack>" for pack.json, "/<pack>/<skill>/<slot>" for a level. */
  readonly path: string
  readonly headers: IncomingHttpHeaders
  readonly body: string
}

export interface Answer {
  readonly status: number
  readonly message: string
}

/**
 * Writes or deletes a file of a built-in pack for the editor, after checking where the request
 * comes from, where it writes and what it writes. Only existing packs take files, and only files
 * that pass the level or pack schema.
 */
export async function answer(
  request: PackFileRequest,
  packsFolder: string,
  schemas: Schemas,
  format: (file: string) => Promise<void>,
): Promise<Answer> {
  const { levelSchema, packSchema, describeIssues } = schemas
  if (!sameOrigin(request.headers))
    return { status: 403, message: 'Only the game itself may write' }
  const match = /^\/([a-z0-9-]+)(?:\/([1-4])\/([1-9]|[12]\d|30))?$/.exec(request.path)
  if (match === null) return { status: 404, message: 'No such pack file' }
  const [, pack = '', skill, slot] = match
  const folder = join(packsFolder, pack)
  const packFile = join(folder, 'pack.json')
  const current = await readJson(packFile)
  const settings = packSchema.safeParse(current)
  if (!settings.success) return { status: 404, message: `There is no pack ${pack}` }
  const levelFile =
    skill === undefined || slot === undefined
      ? undefined
      : join(folder, 'levels', `skill${skill}`, `level_${slot.padStart(3, '0')}.json`)

  if (request.method === 'DELETE') {
    if (levelFile === undefined) return { status: 405, message: 'Packs are deleted by hand' }
    await rm(levelFile, { force: true })
    return { status: 204, message: '' }
  }
  if (request.method !== 'PUT') return { status: 405, message: 'Use PUT or DELETE' }
  if (!request.headers['content-type']?.startsWith('application/json')) {
    return { status: 415, message: 'Send JSON' }
  }
  let json: unknown
  try {
    json = JSON.parse(request.body)
  } catch {
    return { status: 400, message: 'The body is no JSON' }
  }
  const parsed = levelFile === undefined ? packSchema.safeParse(json) : levelSchema.safeParse(json)
  if (!parsed.success) {
    return { status: 422, message: describeIssues(parsed.error as never).join('\n') }
  }
  if (Number(skill) > settings.data.skills.length) {
    return { status: 422, message: `${pack} has only ${settings.data.skills.length} skills` }
  }
  const target = levelFile ?? packFile
  await mkdir(join(target, '..'), { recursive: true })
  // The request as sent, not the parsed data, which fills in defaults the file leaves out. On one
  // line, so Biome breaks lines by width alone, as in the files written by hand.
  await writeFile(target, `${JSON.stringify(json)}\n`)
  await format(target)
  return { status: 204, message: '' }
}

/** A browser request from the page the dev server serves, not from another site. */
function sameOrigin(headers: IncomingHttpHeaders): boolean {
  const site = headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin') return false
  const { origin, host } = headers
  if (origin === undefined) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

function readBody(request: IncomingMessage): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size <= MAX_BODY) chunks.push(chunk)
    })
    request.on('end', () =>
      resolve(size > MAX_BODY ? undefined : Buffer.concat(chunks).toString('utf8')),
    )
    request.on('error', reject)
  })
}

/** Formats a written file the way the repository's own JSON is formatted, with its biome.json. */
function biomeFormatter(root: string): (file: string) => Promise<void> {
  const biome = createRequire(import.meta.url).resolve('@biomejs/biome/bin/biome')
  return (file) =>
    new Promise((resolve) => {
      execFile(process.execPath, [biome, 'format', '--write', file], { cwd: root }, (error) => {
        if (error) console.warn(`Biome could not format ${file}: ${error.message}`)
        resolve()
      })
    })
}

/**
 * While the dev server runs, the level editor writes built-in packs straight into packs/, so the
 * game's own levels are made in the game and committed with git. Builds have no such endpoint.
 */
export function packFiles(root = process.cwd()): Plugin {
  return {
    name: 'vibe-laser-pack-files',
    apply: 'serve',
    configureServer(server) {
      const format = biomeFormatter(root)
      server.middlewares.use(PREFIX, (request, response) => {
        void (async () => {
          const body = await readBody(request)
          const result =
            body === undefined
              ? { status: 413, message: 'Too large' }
              : await answer(
                  {
                    method: request.method,
                    path: (request.url ?? '').split('?')[0] ?? '',
                    headers: request.headers,
                    body,
                  },
                  join(root, 'packs'),
                  (await server.ssrLoadModule('/src/content/schema.ts')) as Schemas,
                  format,
                )
          response.statusCode = result.status
          response.end(result.message)
        })().catch((error: unknown) => {
          response.statusCode = 500
          response.end(String(error))
        })
      })
    },
  }
}
