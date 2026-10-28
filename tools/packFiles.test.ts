import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schemas from '../src/content/schema'
import { answer, type PackFileRequest, PREFIX, packFiles } from './packFiles'

const PACK = {
  version: 1,
  title: { en: 'Test', de: 'Test' },
  position: 5,
  skills: [{ en: 'One', de: 'Eins' }],
}

const LEVEL = {
  version: 1,
  name: { en: 'Test', de: 'Test' },
  size: [3, 1],
  objects: [
    { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
    { type: 'coin', pos: 'A3', rgb: 'r' },
  ],
}

let root: string
let packs: string
const format = vi.fn(async () => {})

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'vibe-laser-'))
  packs = join(root, 'packs')
  await mkdir(join(packs, 'test'), { recursive: true })
  await writeFile(join(packs, 'test', 'pack.json'), JSON.stringify(PACK))
  format.mockClear()
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function request(changes: Partial<PackFileRequest>): PackFileRequest {
  return {
    method: 'PUT',
    path: '/test/1/2',
    headers: {
      host: 'localhost:5173',
      origin: 'http://localhost:5173',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
    },
    body: JSON.stringify(LEVEL),
    ...changes,
  }
}

const levelFile = () => join(packs, 'test', 'levels', 'skill1', 'level_002.json')

describe('answer', () => {
  it('writes a level into its skill folder and formats it', async () => {
    expect(await answer(request({}), packs, schemas, format)).toEqual({ status: 204, message: '' })
    expect(JSON.parse(await readFile(levelFile(), 'utf8'))).toEqual(LEVEL)
    expect(format).toHaveBeenCalledWith(levelFile())
  })

  it('writes pack settings and deletes levels', async () => {
    const pack = { ...PACK, title: { en: 'Renamed', de: 'Umbenannt' } }
    const written = await answer(
      request({ path: '/test', body: JSON.stringify(pack) }),
      packs,
      schemas,
      format,
    )
    expect(written.status).toBe(204)
    expect(JSON.parse(await readFile(join(packs, 'test', 'pack.json'), 'utf8'))).toEqual(pack)
    await answer(request({}), packs, schemas, format)
    expect((await answer(request({ method: 'DELETE' }), packs, schemas, format)).status).toBe(204)
    await expect(stat(levelFile())).rejects.toThrow()
    expect(
      (await answer(request({ method: 'DELETE', path: '/test' }), packs, schemas, format)).status,
    ).toBe(405)
  })

  it('refuses requests from other sites', async () => {
    const elsewhere = request({})
    const foreign = {
      ...elsewhere,
      headers: { ...elsewhere.headers, origin: 'https://evil.example' },
    }
    expect((await answer(foreign, packs, schemas, format)).status).toBe(403)
    const site = { ...elsewhere, headers: { ...elsewhere.headers, 'sec-fetch-site': 'cross-site' } }
    expect((await answer(site, packs, schemas, format)).status).toBe(403)
    const broken = { ...elsewhere, headers: { ...elsewhere.headers, origin: 'not a url' } }
    expect((await answer(broken, packs, schemas, format)).status).toBe(403)
    const { origin: _, 'sec-fetch-site': __, ...plain } = elsewhere.headers
    expect((await answer({ ...elsewhere, headers: plain }, packs, schemas, format)).status).toBe(
      204,
    )
  })

  it('writes only into packs that exist, at places a pack has', async () => {
    for (const path of ['/missing/1/1', '/../test/1/1', '/test/5/1', '/test/1/31', '/test/1']) {
      expect((await answer(request({ path }), packs, schemas, format)).status).toBe(404)
    }
    const second = await answer(request({ path: '/test/2/1' }), packs, schemas, format)
    expect(second).toEqual({ status: 422, message: 'test has only 1 skills' })
  })

  it('takes only levels and packs that pass their schema', async () => {
    const coinless = JSON.stringify({ ...LEVEL, objects: [LEVEL.objects[0]] })
    expect(await answer(request({ body: coinless }), packs, schemas, format)).toEqual({
      status: 422,
      message: 'objects: a level needs at least one coin',
    })
    expect((await answer(request({ body: '{' }), packs, schemas, format)).status).toBe(400)
    expect((await answer(request({ method: 'POST' }), packs, schemas, format)).status).toBe(405)
    const text = request({})
    const plain = { ...text, headers: { ...text.headers, 'content-type': 'text/plain' } }
    expect((await answer(plain, packs, schemas, format)).status).toBe(415)
    expect(format).not.toHaveBeenCalled()
  })
})

describe('packFiles', () => {
  it('serves the endpoint on the dev server only, and formats what it writes', async () => {
    const plugin = packFiles(root)
    expect(plugin.apply).toBe('serve')
    let handler: ((request: IncomingMessage, response: ServerResponse) => void) | undefined
    const server = {
      middlewares: {
        use(prefix: string, middleware: typeof handler) {
          expect(prefix).toBe(PREFIX)
          handler = middleware
        },
      },
      ssrLoadModule: async (path: string) => {
        expect(path).toBe('/src/content/schema.ts')
        return schemas
      },
    }
    ;(plugin.configureServer as (server: unknown) => void)(server)
    const send = (body: string) =>
      new Promise<{ status: number; body: string }>((resolve) => {
        const incoming = Object.assign(Readable.from([Buffer.from(body)]), {
          method: 'PUT',
          url: '/test/1/2?now',
          headers: request({}).headers,
        }) as unknown as IncomingMessage
        const response = {
          statusCode: 0,
          end(text: string) {
            resolve({ status: this.statusCode, body: text })
          },
        }
        handler?.(incoming, response as unknown as ServerResponse)
      })
    expect(await send(JSON.stringify(LEVEL))).toEqual({ status: 204, body: '' })
    const written = await readFile(levelFile(), 'utf8')
    expect(JSON.parse(written)).toEqual(LEVEL)
    // Biome put the short name object on one line, as the repository's level files have it.
    expect(written).toContain('"name": { "en": "Test", "de": "Test" }')
    expect((await send('x'.repeat(1_000_001))).status).toBe(413)
  }, 20_000)
})
