import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectLicenses, homepageOf } from './licenses.ts'

const folders: string[] = []
afterEach(async () => {
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true })
})

/** A project folder with packages in node_modules, as name → package.json and files. */
async function project(
  dependencies: string[],
  packages: Record<string, { json: object; files?: Record<string, string> }>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'licenses-'))
  folders.push(root)
  const deps = Object.fromEntries(dependencies.map((name) => [name, '*']))
  await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: deps }))
  for (const [name, { json, files = {} }] of Object.entries(packages)) {
    const folder = join(root, 'node_modules', name)
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, 'package.json'), JSON.stringify({ name, ...json }))
    for (const [file, text] of Object.entries(files)) await writeFile(join(folder, file), text)
  }
  return root
}

describe('collectLicenses', () => {
  it('follows dependencies and leaves out packages with types only', async () => {
    const root = await project(['a'], {
      a: {
        json: {
          version: '1.0.0',
          license: 'ISC',
          main: 'a.js',
          dependencies: { b: '*', '@types/c': '*', d: '*' },
        },
        files: { LICENSE: 'ISC License\n\nCopyright A' },
      },
      b: {
        json: {
          version: '2.0.0',
          license: 'MIT',
          main: 'b.js',
          author: { name: 'Bea', email: 'b@x' },
        },
      },
      '@types/c': { json: { version: '1.0.0', license: 'MIT', types: 'index.d.ts' } },
      d: { json: { version: '1.0.0', license: 'MIT', main: '', types: 'index.d.ts' } },
    })
    const found = await collectLicenses(root)
    expect(found.map((entry) => entry.name)).toEqual(['a', 'b'])
    expect(found[0]?.text).toBe('ISC License\n\nCopyright A')
    expect(found[1]?.text).toContain('Copyright (c) Bea <b@x>')
    expect(found[1]?.text).toContain('Permission is hereby granted')
  })

  it('adds the whole Apache license and the notice where a package ships only a header', async () => {
    const root = await project(['a'], {
      a: {
        json: { version: '1.0.0', license: 'Apache-2.0', main: 'a.js' },
        files: { LICENCE: 'Copyright 2016, Someone', NOTICE: 'Notice of a' },
      },
    })
    const [a] = await collectLicenses(root)
    expect(a?.text).toMatch(/^Copyright 2016, Someone\n\n\s*Apache License/)
    expect(a?.text).toContain('END OF TERMS AND CONDITIONS')
    expect(a?.notice).toBe('Notice of a')
  })

  it('stops where a license text is missing', async () => {
    const root = await project(['a'], {
      a: { json: { version: '1.0.0', license: 'BSD-3-Clause', main: 'a.js' } },
    })
    await expect(collectLicenses(root)).rejects.toThrow('a (BSD-3-Clause) ships no license text')
  })

  it('finds the game’s own dependencies', async () => {
    const found = await collectLicenses(process.cwd())
    const names = found.map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['pixi.js', 'preact', 'zod', 'idb-keyval']))
    for (const entry of found) expect(entry.text.length).toBeGreaterThan(100)
  })
})

describe('homepageOf', () => {
  it('makes web addresses of homepages and repositories', () => {
    expect(homepageOf({ homepage: 'https://example.com' })).toBe('https://example.com')
    expect(homepageOf({ repository: 'omgovich/colord' })).toBe('https://github.com/omgovich/colord')
    expect(homepageOf({ repository: 'git://github.com/jkroso/parse-svg-path.git' })).toBe(
      'https://github.com/jkroso/parse-svg-path',
    )
    expect(homepageOf({ repository: { url: 'git+https://github.com/a/b.git' } })).toBe(
      'https://github.com/a/b',
    )
    expect(homepageOf({ repository: 'git@github.com:a/b.git' })).toBeNull()
    expect(homepageOf({})).toBeNull()
  })
})
