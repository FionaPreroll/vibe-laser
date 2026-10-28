import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { z } from 'zod'
import { SaveQueue } from './queue'
import type { KeyValueStore } from './store'

const settingsSchema = z
  .object({
    soundVolume: z.number().min(0).max(1),
    musicVolume: z.number().min(0).max(1),
    reducedMotion: z.boolean(),
  })
  .strict()

const profileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(40),
    /** Ids of solved levels, such as "tutorial/2/5". */
    solved: z.array(z.string()),
    settings: settingsSchema,
  })
  .strict()

const saveSchema = z
  .object({
    version: z.literal(1),
    active: z.string(),
    profiles: z.array(profileSchema).min(1),
  })
  .strict()
  .refine((save) => save.profiles.some((profile) => profile.id === save.active), {
    message: 'the active profile is missing',
  })

const exportSchema = z
  .object({
    format: z.literal('vibe-laser-profile'),
    version: z.literal(1),
    profile: profileSchema,
  })
  .strict()

export type Settings = z.output<typeof settingsSchema>
export type Profile = z.output<typeof profileSchema>
export type SaveData = z.output<typeof saveSchema>

export const DEFAULT_SETTINGS: Settings = {
  soundVolume: 0.8,
  musicVolume: 0.5,
  reducedMotion: false,
}

const KEY = 'save'

/** Saved data of a known version, brought up to the current one; undefined for anything else. */
export function migrate(saved: unknown): SaveData | undefined {
  const parsed = saveSchema.safeParse(saved)
  return parsed.success ? parsed.data : undefined
}

export interface Options {
  /** The name of the first profile. */
  readonly name: string
  /** Settings for new profiles, such as reduced motion when the system asks for it. */
  readonly settings?: Partial<Settings>
  /** Asks the browser to keep the saves; called once the first level is solved. */
  readonly persist?: () => Promise<unknown>
  readonly newId?: () => string
}

/**
 * Player profiles, each with its solved levels and its settings, saved as one record. The record
 * carries a version, so that later formats can migrate it when it loads.
 */
export class ProfileBook {
  readonly #store: KeyValueStore
  readonly #options: Options
  readonly #data: Signal<SaveData>
  readonly #queue = new SaveQueue()

  readonly data: ReadonlySignal<SaveData>
  readonly active: ReadonlySignal<Profile>
  /** The active profile's solved levels. */
  readonly solved: ReadonlySignal<ReadonlySet<string>>

  private constructor(store: KeyValueStore, data: SaveData, options: Options) {
    this.#store = store
    this.#options = options
    this.#data = signal(data)
    this.data = this.#data
    this.active = computed(() => {
      const { profiles, active } = this.#data.value
      return profiles.find((profile) => profile.id === active) ?? (profiles[0] as Profile)
    })
    this.solved = computed(() => new Set(this.active.value.solved))
  }

  /** Opens the saves, or starts with one profile when there are none or they cannot be read. */
  static async open(store: KeyValueStore, options: Options): Promise<ProfileBook> {
    const saved = migrate(await store.get(KEY))
    if (saved !== undefined) return new ProfileBook(store, saved, options)
    const first = newProfile(options, options.name)
    const book = new ProfileBook(
      store,
      { version: 1, active: first.id, profiles: [first] },
      options,
    )
    await book.#save()
    return book
  }

  /** Waits until every change so far is saved. */
  saved(): Promise<void> {
    return this.#queue.saved()
  }

  async markSolved(levelId: string): Promise<void> {
    const profile = this.active.value
    if (profile.solved.includes(levelId)) return
    const first = this.#data.value.profiles.every((each) => each.solved.length === 0)
    await this.#change(profile.id, { solved: [...profile.solved, levelId] })
    if (first) await this.#options.persist?.()
  }

  async updateSettings(changes: Partial<Settings>): Promise<void> {
    const profile = this.active.value
    await this.#change(profile.id, { settings: { ...profile.settings, ...changes } })
  }

  /** A new profile with fresh progress; it becomes the active one. */
  async create(name: string): Promise<Profile> {
    const profile = newProfile(this.#options, this.#uniqueName(name))
    await this.#write({
      ...this.#data.value,
      active: profile.id,
      profiles: [...this.#data.value.profiles, profile],
    })
    return profile
  }

  async rename(id: string, name: string): Promise<void> {
    const trimmed = name.trim()
    if (trimmed === '') return
    await this.#change(id, { name: trimmed.slice(0, 40) })
  }

  /** Removes a profile, never the last one; removing the active one activates the first left. */
  async remove(id: string): Promise<boolean> {
    const profiles = this.#data.value.profiles.filter((profile) => profile.id !== id)
    const first = profiles[0]
    if (first === undefined || profiles.length === this.#data.value.profiles.length) return false
    const active = this.#data.value.active === id ? first.id : this.#data.value.active
    await this.#write({ ...this.#data.value, active, profiles })
    return true
  }

  async switchTo(id: string): Promise<void> {
    if (!this.#data.value.profiles.some((profile) => profile.id === id)) return
    await this.#write({ ...this.#data.value, active: id })
  }

  /** A profile as a JSON file, as a backup and for moving to another browser. */
  exportProfile(id: string): string {
    const profile = this.#data.value.profiles.find((each) => each.id === id)
    if (profile === undefined) throw new RangeError(`There is no profile ${id}`)
    return `${JSON.stringify({ format: 'vibe-laser-profile', version: 1, profile }, null, 2)}\n`
  }

  /** Adds a profile from an exported file, under a new id and a free name; it becomes active. */
  async importProfile(text: string): Promise<Profile> {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new SyntaxError('The file is no profile export')
    }
    const parsed = exportSchema.safeParse(json)
    if (!parsed.success) throw new SyntaxError('The file is no profile export')
    const profile = {
      ...parsed.data.profile,
      id: this.#options.newId?.() ?? crypto.randomUUID(),
      name: this.#uniqueName(parsed.data.profile.name),
    }
    await this.#write({
      ...this.#data.value,
      active: profile.id,
      profiles: [...this.#data.value.profiles, profile],
    })
    return profile
  }

  #uniqueName(name: string): string {
    const base = name.trim().slice(0, 36) || this.#options.name
    const taken = new Set(this.#data.value.profiles.map((profile) => profile.name))
    if (!taken.has(base)) return base
    for (let count = 2; ; count++) {
      if (!taken.has(`${base} (${count})`)) return `${base} (${count})`
    }
  }

  async #change(id: string, changes: Partial<Profile>): Promise<void> {
    await this.#write({
      ...this.#data.value,
      profiles: this.#data.value.profiles.map((profile) =>
        profile.id === id ? { ...profile, ...changes } : profile,
      ),
    })
  }

  async #write(data: SaveData): Promise<void> {
    this.#data.value = data
    await this.#save()
  }

  /** Saves the data as it is once the saves before have run. */
  #save(): Promise<void> {
    return this.#queue.run(() => this.#store.set(KEY, this.#data.value))
  }
}

function newProfile(options: Options, name: string): Profile {
  return {
    id: options.newId?.() ?? crypto.randomUUID(),
    name,
    solved: [],
    settings: { ...DEFAULT_SETTINGS, ...options.settings },
  }
}
