import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Sound } from './director'
import { Synth } from './synth'

class FakeParam {
  readonly values: number[] = []
  setValueAtTime(value: number) {
    this.values.push(value)
  }
  exponentialRampToValueAtTime(value: number) {
    this.values.push(value)
  }
}

class FakeNode {
  readonly connections: FakeNode[] = []
  connect(node: FakeNode) {
    this.connections.push(node)
    return node
  }
}

class FakeSource extends FakeNode {
  type = ''
  buffer: unknown = null
  readonly frequency = new FakeParam()
  readonly starts: number[] = []
  start(at: number) {
    this.starts.push(at)
  }
  stop() {}
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam()
}

class FakeContext {
  currentTime = 0
  readonly sampleRate = 100
  readonly destination = new FakeNode()
  readonly oscillators: FakeSource[] = []
  readonly gains: FakeGain[] = []
  readonly buffers: FakeSource[] = []
  readonly resume = vi.fn(async () => {})
  readonly close = vi.fn(async () => {})
  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
  createOscillator() {
    const oscillator = new FakeSource()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createBiquadFilter() {
    return new FakeSource()
  }
  createBufferSource() {
    const source = new FakeSource()
    this.buffers.push(source)
    return source
  }
  createBuffer(_: number, length: number) {
    const samples = new Float32Array(length)
    return { getChannelData: () => samples }
  }
}

function synth() {
  const context = new FakeContext()
  const create = vi.fn(() => context as unknown as AudioContext)
  return { synth: new Synth(create, () => 0.5), context, create }
}

const SOUNDS: Sound[] = [
  'place',
  'turn',
  'coin',
  'solved',
  'blast',
  'failed',
  'shot',
  'eat',
  'collect',
  'swallow',
]

afterEach(() => vi.useRealTimers())

describe('Synth', () => {
  it('stays silent until it is unlocked', () => {
    const { synth: speaker, create } = synth()
    speaker.play('coin')
    expect(create).not.toHaveBeenCalled()
  })

  it('plays every sound from tones and noise into the sound volume', () => {
    const { synth: speaker, context } = synth()
    speaker.setVolumes(0.8, 0)
    speaker.unlock()
    expect(context.resume).toHaveBeenCalled()
    const [sound, music] = context.gains
    expect(sound?.gain.values).toEqual([0.8])
    expect(music?.gain.values).toEqual([0])
    for (const name of SOUNDS) speaker.play(name)
    expect(context.oscillators.length).toBeGreaterThanOrEqual(SOUNDS.length)
    expect(context.buffers).toHaveLength(2)
    expect(context.oscillators.every((oscillator) => oscillator.starts.length === 1)).toBe(true)
  })

  it('plays nothing with the sound volume at zero', () => {
    const { synth: speaker, context } = synth()
    speaker.setVolumes(0, 0)
    speaker.unlock()
    speaker.play('blast')
    expect(context.oscillators).toHaveLength(0)
  })

  it('plays music on a slow beat while the music volume is up', () => {
    vi.useFakeTimers()
    const { synth: speaker, context } = synth()
    speaker.unlock()
    const planned = context.oscillators.length
    expect(planned).toBeGreaterThan(0)
    context.currentTime = 3
    vi.advanceTimersByTime(250)
    expect(context.oscillators.length).toBeGreaterThan(planned)
    speaker.setVolumes(0.8, 0)
    const stopped = context.oscillators.length
    context.currentTime = 6
    vi.advanceTimersByTime(1000)
    expect(context.oscillators).toHaveLength(stopped)
    speaker.setVolumes(0.8, 0.4)
    expect(context.oscillators.length).toBeGreaterThan(stopped)
  })

  it('skips the beats it missed while the page was in the background', () => {
    vi.useFakeTimers()
    const { synth: speaker, context } = synth()
    speaker.unlock()
    const planned = context.oscillators.length
    context.currentTime = 60
    vi.advanceTimersByTime(250)
    const late = context.oscillators.slice(planned)
    expect(late.length).toBeGreaterThan(0)
    expect(late.length).toBeLessThanOrEqual(6)
    expect(late.every((oscillator) => (oscillator.starts[0] ?? 0) >= 60)).toBe(true)
  })

  it("plays effects in the voice and pitch of a pack's sounds", () => {
    const { synth: speaker, context } = synth()
    speaker.setVolumes(0.8, 0)
    speaker.unlock()
    const last = () => context.oscillators.at(-1)
    speaker.play('turn')
    expect([last()?.type, last()?.frequency.values]).toEqual(['triangle', [660, 620]])
    speaker.useSounds('crypt')
    speaker.play('turn')
    expect(last()?.type).toBe('sawtooth')
    expect(last()?.frequency.values.map(Math.round)).toEqual([561, 527])
    // A sawtooth sounds louder than a triangle, so it plays more softly.
    expect(context.gains.at(-1)?.gain.values[1]).toBeCloseTo(0.12 * 0.7)
    // Effects with a square or sawtooth tone of their own keep it.
    speaker.play('shot')
    expect(last()?.type).toBe('square')
    speaker.useSounds('lab')
    speaker.play('turn')
    expect([last()?.type, last()?.frequency.values]).toEqual(['triangle', [660, 620]])
  })

  it("plays music in the scale, voices and pace of a pack's sounds", () => {
    vi.useFakeTimers()
    const { synth: speaker, context } = synth()
    speaker.useSounds('school')
    speaker.unlock()
    // With chance at one half every time: the second lowest note an octave down, and the sixth.
    const [bass, melody] = context.oscillators
    expect([bass?.type, bass?.frequency.values]).toEqual(['sine', [147]])
    expect([melody?.type, melody?.frequency.values]).toEqual(['triangle', [523]])
    // School's beats come every 0.55 s, so 1.5 s ahead hold three of them.
    expect(context.oscillators.filter((oscillator) => oscillator.type === 'triangle')).toHaveLength(
      3,
    )
  })

  it('closes its audio context when disposed', () => {
    const { synth: speaker, context } = synth()
    speaker.unlock()
    speaker.dispose()
    expect(context.close).toHaveBeenCalled()
    speaker.play('coin')
  })
})
