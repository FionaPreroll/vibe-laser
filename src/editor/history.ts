import { batch, computed, type ReadonlySignal, signal } from '@preact/signals-core'

/** Undo and redo for values that are replaced as a whole, such as a level being edited. */
export class History<T> {
  readonly #past = signal<readonly T[]>([])
  readonly #future = signal<readonly T[]>([])
  readonly #current
  readonly #limit: number

  readonly current: ReadonlySignal<T>
  readonly canUndo = computed(() => this.#past.value.length > 0)
  readonly canRedo = computed(() => this.#future.value.length > 0)

  constructor(initial: T, limit = 200) {
    this.#current = signal(initial)
    this.current = this.#current
    this.#limit = limit
  }

  /** Makes a new value current; the oldest steps go once there are more than the limit. */
  push(next: T): void {
    if (next === this.#current.value) return
    batch(() => {
      this.#past.value = [...this.#past.value, this.#current.value].slice(-this.#limit)
      this.#future.value = []
      this.#current.value = next
    })
  }

  /** Replaces the current value without a step of its own, as for each cell of a painted stroke. */
  amend(next: T): void {
    batch(() => {
      this.#future.value = []
      this.#current.value = next
    })
  }

  undo(): boolean {
    const past = this.#past.value
    const previous = past.at(-1)
    if (previous === undefined) return false
    batch(() => {
      this.#past.value = past.slice(0, -1)
      this.#future.value = [this.#current.value, ...this.#future.value]
      this.#current.value = previous
    })
    return true
  }

  redo(): boolean {
    const [next, ...rest] = this.#future.value
    if (next === undefined) return false
    batch(() => {
      this.#future.value = rest
      this.#past.value = [...this.#past.value, this.#current.value]
      this.#current.value = next
    })
    return true
  }
}
