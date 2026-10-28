import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { z } from 'zod'
import { type LevelFile, levelSchema, type PackFile, packSchema } from '../content/schema'
import { SaveQueue } from './queue'
import type { KeyValueStore } from './store'

/** A level's slot in a pack, as "2/17": skill 2, level 17. */
const slotKey = z.string().regex(/^[1-4]\/([1-9]|[12]\d|30)$/, 'expected a slot such as "2/17"')
const levels = z.record(slotKey, levelSchema)

/** Every level sits in one of the pack's skills. */
function inSkills(value: { readonly pack: PackFile; readonly levels: Record<string, unknown> }) {
  return Object.keys(value.levels).every((key) => Number(key[0]) <= value.pack.skills.length)
}

const customPackSchema = z
  .object({ id: z.string().regex(/^my-[a-z0-9]+$/), pack: packSchema, levels })
  .strict()
  .refine(inSkills, { message: 'a level lies outside the skills of its pack' })

const shelfSchema = z.object({ version: z.literal(1), packs: z.array(customPackSchema) }).strict()

const exportSchema = z
  .object({
    format: z.literal('vibe-laser-pack'),
    version: z.literal(1),
    pack: packSchema,
    levels,
  })
  .strict()
  .refine(inSkills, { message: 'a level lies outside the skills of its pack' })

/** A pack made in the editor: its pack.json and its levels by slot. */
export type CustomPack = z.output<typeof customPackSchema>
type ShelfData = z.output<typeof shelfSchema>

const KEY = 'packs'

export function slotOf(skill: number, slot: number): string {
  return `${skill}/${slot}`
}

/**
 * The player's own level packs, saved as one versioned record next to the profiles. A record that
 * cannot be read starts an empty shelf, and is only overwritten by the next change.
 */
export class PackShelf {
  readonly #store: KeyValueStore
  readonly #data: Signal<ShelfData>
  readonly #queue = new SaveQueue()
  readonly #newId: () => string

  readonly packs: ReadonlySignal<readonly CustomPack[]>

  private constructor(store: KeyValueStore, data: ShelfData, newId: () => string) {
    this.#store = store
    this.#data = signal(data)
    this.#newId = newId
    this.packs = computed(() => this.#data.value.packs)
  }

  static async open(
    store: KeyValueStore,
    options: { readonly newId?: () => string } = {},
  ): Promise<PackShelf> {
    const parsed = shelfSchema.safeParse(await store.get(KEY))
    const data = parsed.success ? parsed.data : { version: 1 as const, packs: [] }
    return new PackShelf(store, data, options.newId ?? randomId)
  }

  saved(): Promise<void> {
    return this.#queue.saved()
  }

  find(id: string): CustomPack | undefined {
    return this.#data.value.packs.find((pack) => pack.id === id)
  }

  /** A new pack without levels, after the others. */
  async create(file: PackFile): Promise<CustomPack> {
    const pack = { id: this.#newId(), pack: file, levels: {} }
    await this.#write([...this.#data.value.packs, pack])
    return pack
  }

  /** New pack settings; levels of skills that are gone go with them. */
  async updatePack(id: string, file: PackFile): Promise<void> {
    await this.#change(id, (pack) => {
      const kept = Object.entries(pack.levels).filter(
        ([key]) => Number(key[0]) <= file.skills.length,
      )
      return { ...pack, pack: file, levels: Object.fromEntries(kept) }
    })
  }

  async remove(id: string): Promise<void> {
    await this.#write(this.#data.value.packs.filter((pack) => pack.id !== id))
  }

  async saveLevel(id: string, skill: number, slot: number, level: LevelFile): Promise<void> {
    await this.#change(id, (pack) => ({
      ...pack,
      levels: { ...pack.levels, [slotOf(skill, slot)]: level },
    }))
  }

  async deleteLevel(id: string, skill: number, slot: number): Promise<void> {
    await this.#change(id, (pack) => {
      const { [slotOf(skill, slot)]: _, ...rest } = pack.levels
      return { ...pack, levels: rest }
    })
  }

  /** A pack as one file, with every level inside, for sharing it or moving it elsewhere. */
  exportPack(id: string): string {
    const pack = this.find(id)
    if (pack === undefined) throw new RangeError(`There is no pack ${id}`)
    const file = { format: 'vibe-laser-pack', version: 1, pack: pack.pack, levels: pack.levels }
    return `${JSON.stringify(file, null, 2)}\n`
  }

  /** Adds a pack from an exported file, under a new id. */
  async importPack(text: string): Promise<CustomPack> {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new SyntaxError('The file is no pack export')
    }
    const parsed = exportSchema.safeParse(json)
    if (!parsed.success) throw new SyntaxError('The file is no pack export')
    const pack = { id: this.#newId(), pack: parsed.data.pack, levels: parsed.data.levels }
    await this.#write([...this.#data.value.packs, pack])
    return pack
  }

  async #change(id: string, change: (pack: CustomPack) => CustomPack): Promise<void> {
    if (this.find(id) === undefined) throw new RangeError(`There is no pack ${id}`)
    await this.#write(this.#data.value.packs.map((pack) => (pack.id === id ? change(pack) : pack)))
  }

  async #write(packs: readonly CustomPack[]): Promise<void> {
    this.#data.value = { version: 1, packs: [...packs] }
    await this.#queue.run(() => this.#store.set(KEY, this.#data.value))
  }
}

function randomId(): string {
  return `my-${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`
}
