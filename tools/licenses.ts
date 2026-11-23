import { existsSync } from 'node:fs'
import { readdir, readFile, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Plugin } from 'vite'

/** A package that ships inside the game, with the notice its license asks to pass on. */
export interface ThirdParty {
  readonly name: string
  readonly version: string
  /** The SPDX expression from its package.json, such as "MIT". */
  readonly license: string
  readonly homepage: string | null
  /** The license text, with the copyright line. */
  readonly text: string
  /** The package's NOTICE file, which Apache-2.0 asks to pass on as well. */
  readonly notice: string | null
}

export interface PackageJson {
  readonly name?: string
  readonly version?: string
  readonly license?: string | { readonly type?: string }
  readonly author?: string | { readonly name?: string; readonly email?: string }
  readonly homepage?: string
  readonly repository?: string | { readonly url?: string }
  readonly dependencies?: Readonly<Record<string, string>>
  readonly optionalDependencies?: Readonly<Record<string, string>>
  readonly main?: string
  readonly module?: string
  readonly exports?: unknown
  readonly browser?: unknown
}

const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i
const NOTICE_FILE = /^notice(\.(md|txt))?$/i

const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

/**
 * Every package the game's dependencies pull in, from the project's package.json down, sorted by
 * name. Packages with types only are left out, since nothing of them reaches the build. A
 * package without a license text of its own gets the MIT text with its author, as far as its
 * license is MIT; any other package without one stops the build, so no notice goes missing.
 */
export async function collectLicenses(root: string): Promise<ThirdParty[]> {
  const own = await readJson(join(root, 'package.json'))
  const found = new Map<string, ThirdParty>()
  const queue: [from: string, name: string][] = Object.keys(own.dependencies ?? {}).map((name) => [
    root,
    name,
  ])
  const optional = new Set<string>()
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const [from, name] = next
    const folder = findPackage(from, name)
    if (folder === undefined) {
      if (optional.has(name)) continue
      throw new Error(`Licenses: cannot find ${name}, needed by ${from}`)
    }
    const real = await realpath(folder)
    const pkg = await readJson(join(real, 'package.json'))
    const key = `${pkg.name}@${pkg.version}`
    if (found.has(key) || !hasCode(pkg)) continue
    found.set(key, await describePackage(real, pkg))
    for (const dependency of Object.keys(pkg.dependencies ?? {})) queue.push([real, dependency])
    for (const dependency of Object.keys(pkg.optionalDependencies ?? {})) {
      optional.add(dependency)
      queue.push([real, dependency])
    }
  }
  return [...found.values()].sort((a, b) =>
    a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name),
  )
}

/** Where Node would find a package from a folder: node_modules here or in a folder above. */
function findPackage(from: string, name: string): string | undefined {
  for (let folder = from; ; folder = dirname(folder)) {
    const candidate = join(folder, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    if (dirname(folder) === folder) return undefined
  }
}

function hasCode(pkg: PackageJson): boolean {
  if (pkg.name?.startsWith('@types/')) return false
  return [pkg.main, pkg.module, pkg.exports, pkg.browser].some(
    (entry) => entry !== undefined && entry !== '',
  )
}

async function describePackage(folder: string, pkg: PackageJson): Promise<ThirdParty> {
  const name = pkg.name ?? folder
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? '')
  const files = await readdir(folder)
  const read = async (pattern: RegExp) => {
    const file = files.find((entry) => pattern.test(entry))
    return file === undefined ? null : (await readFile(join(folder, file), 'utf8')).trim()
  }
  let text = await read(LICENSE_FILE)
  if (text === null && license === 'MIT') {
    const author = authorOf(pkg)
    if (author === null) throw new Error(`Licenses: ${name} names no author for its MIT notice`)
    text = `MIT License\n\nCopyright (c) ${author}\n\n${MIT}`
  }
  if (text === null) throw new Error(`Licenses: ${name} (${license}) ships no license text`)
  // Apache-2.0 asks for the whole license; some packages ship only its short header.
  if (license === 'Apache-2.0' && !text.includes('TERMS AND CONDITIONS')) {
    const full = await readFile(new URL('licenses/Apache-2.0.txt', import.meta.url), 'utf8')
    text = `${text}\n\n${full.trim()}`
  }
  return {
    name,
    version: pkg.version ?? '',
    license,
    homepage: homepageOf(pkg),
    text,
    notice: await read(NOTICE_FILE),
  }
}

function authorOf(pkg: PackageJson): string | null {
  const { author } = pkg
  if (typeof author === 'string') return author
  if (author?.name === undefined) return null
  return author.email === undefined ? author.name : `${author.name} <${author.email}>`
}

/** A web address for the package: its homepage, or its repository as an https address. */
export function homepageOf(pkg: PackageJson): string | null {
  if (pkg.homepage?.startsWith('https://')) return pkg.homepage
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  if (repository === undefined) return null
  const shorthand = /^(?:github:)?([\w.-]+\/[\w.-]+)$/.exec(repository)
  if (shorthand) return `https://github.com/${shorthand[1]}`
  const url = repository
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '')
  return url.startsWith('https://') ? url : null
}

async function readJson(file: string): Promise<PackageJson> {
  return JSON.parse(await readFile(file, 'utf8')) as PackageJson
}

/**
 * Gives the game the module "virtual:licenses", whose default export lists the ThirdParty
 * packages. The About screen loads it only when it opens, so the texts stay out of the start.
 */
export function licenses(): Plugin {
  const id = 'virtual:licenses'
  const resolved = `\0${id}`
  let root = ''
  return {
    name: 'vibe-laser-licenses',
    configResolved(config) {
      root = config.root
    },
    resolveId: (source) => (source === id ? resolved : undefined),
    async load(source) {
      if (source !== resolved) return undefined
      return `export default ${JSON.stringify(await collectLicenses(root))}`
    },
  }
}
