import type { Sound, Speaker } from './director'

interface Tone {
  readonly type: OscillatorType
  readonly from: number
  readonly to?: number
  readonly seconds: number
  readonly gain: number
  readonly delay?: number
}

interface Noise {
  readonly seconds: number
  readonly gain: number
  /** Cutoff of the low-pass filter at the start and at the end. */
  readonly from: number
  readonly to: number
}

/** Every sound is synthesized from a few tones and bursts of noise; no sound files ship. */
const RECIPES: Readonly<Record<Sound, { tones?: readonly Tone[]; noise?: Noise }>> = {
  place: {
    tones: [{ type: 'triangle', from: 330, to: 220, seconds: 0.08, gain: 0.18 }],
    noise: { seconds: 0.03, gain: 0.08, from: 4000, to: 1500 },
  },
  turn: { tones: [{ type: 'triangle', from: 660, to: 620, seconds: 0.05, gain: 0.12 }] },
  coin: {
    tones: [
      { type: 'sine', from: 988, seconds: 0.12, gain: 0.14 },
      { type: 'sine', from: 1319, seconds: 0.25, gain: 0.12, delay: 0.07 },
    ],
  },
  solved: {
    tones: [523, 659, 784, 1047].map((from, index) => ({
      type: 'triangle' as const,
      from,
      seconds: 0.5,
      gain: 0.12,
      delay: index * 0.11,
    })),
  },
  blast: {
    tones: [{ type: 'sine', from: 90, to: 32, seconds: 0.6, gain: 0.5 }],
    noise: { seconds: 0.9, gain: 0.55, from: 3200, to: 150 },
  },
  failed: { tones: [{ type: 'sawtooth', from: 196, to: 98, seconds: 0.8, gain: 0.1, delay: 0.3 }] },
  shot: { tones: [{ type: 'square', from: 1400, to: 180, seconds: 0.16, gain: 0.08 }] },
  eat: {
    tones: [
      { type: 'triangle', from: 260, to: 150, seconds: 0.12, gain: 0.16 },
      { type: 'triangle', from: 200, to: 110, seconds: 0.14, gain: 0.14, delay: 0.1 },
    ],
  },
  collect: { tones: [{ type: 'sine', from: 520, to: 1040, seconds: 0.18, gain: 0.14 }] },
  swallow: { tones: [{ type: 'sine', from: 700, to: 55, seconds: 0.7, gain: 0.16 }] },
}

/** A minor pentatonic scale over two octaves, for the music. */
const SCALE = [220, 262, 294, 330, 392, 440, 523, 587, 659, 784]
const BEAT = 0.75
const LOOKAHEAD = 1.5

/**
 * Sound effects and a slow, generated melody, made with the Web Audio API. Browsers start audio
 * only after the player clicks or presses a key, so nothing plays before `unlock`.
 */
export class Synth implements Speaker {
  readonly #createContext: () => AudioContext
  readonly #random: () => number
  #context: AudioContext | undefined
  #sound: GainNode | undefined
  #music: GainNode | undefined
  #volumes = { sound: 0.8, music: 0.5 }
  #noise: AudioBuffer | undefined
  #timer: ReturnType<typeof setInterval> | undefined
  #nextBeat = 0
  #beat = 0

  constructor(createContext = () => new AudioContext(), random = Math.random) {
    this.#createContext = createContext
    this.#random = random
  }

  /** Starts audio; call it from a click or a key press. */
  unlock(): void {
    if (this.#context === undefined) {
      const context = this.#createContext()
      this.#context = context
      this.#sound = context.createGain()
      this.#music = context.createGain()
      this.#sound.connect(context.destination)
      this.#music.connect(context.destination)
      this.#applyVolumes()
    }
    void this.#context.resume()
    this.#startMusic()
  }

  setVolumes(sound: number, music: number): void {
    this.#volumes = { sound, music }
    this.#applyVolumes()
    if (music === 0) this.#stopMusic()
    else this.#startMusic()
  }

  play(sound: Sound): void {
    const context = this.#context
    const out = this.#sound
    if (context === undefined || out === undefined || this.#volumes.sound === 0) return
    const recipe = RECIPES[sound]
    const now = context.currentTime
    for (const tone of recipe.tones ?? []) this.#tone(context, out, now, tone)
    if (recipe.noise !== undefined) this.#burst(context, out, now, recipe.noise)
  }

  /** Stops the music and closes the audio context. */
  dispose(): void {
    this.#stopMusic()
    void this.#context?.close()
    this.#context = undefined
  }

  #applyVolumes(): void {
    const time = this.#context?.currentTime ?? 0
    this.#sound?.gain.setValueAtTime(this.#volumes.sound, time)
    this.#music?.gain.setValueAtTime(this.#volumes.music * 0.6, time)
  }

  #tone(context: AudioContext, out: AudioNode, now: number, tone: Tone): void {
    const start = now + (tone.delay ?? 0)
    const end = start + tone.seconds
    const oscillator = context.createOscillator()
    oscillator.type = tone.type
    oscillator.frequency.setValueAtTime(tone.from, start)
    if (tone.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(tone.to, end)
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(0.0001, start)
    envelope.gain.exponentialRampToValueAtTime(tone.gain, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, end)
    oscillator.connect(envelope)
    envelope.connect(out)
    oscillator.start(start)
    oscillator.stop(end + 0.05)
  }

  #burst(context: AudioContext, out: AudioNode, now: number, noise: Noise): void {
    if (this.#noise === undefined) {
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let index = 0; index < samples.length; index++) samples[index] = this.#random() * 2 - 1
      this.#noise = buffer
    }
    const source = context.createBufferSource()
    source.buffer = this.#noise
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(noise.from, now)
    filter.frequency.exponentialRampToValueAtTime(noise.to, now + noise.seconds)
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(noise.gain, now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + noise.seconds)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(out)
    source.start(now)
    source.stop(now + noise.seconds)
  }

  #startMusic(): void {
    const context = this.#context
    if (context === undefined || this.#timer !== undefined || this.#volumes.music === 0) return
    this.#nextBeat = context.currentTime + 0.1
    this.#timer = setInterval(() => this.#schedule(), 250)
    this.#schedule()
  }

  #stopMusic(): void {
    if (this.#timer !== undefined) clearInterval(this.#timer)
    this.#timer = undefined
  }

  /** Plans the notes of the next moments: a soft note on most beats, a low one every four. */
  #schedule(): void {
    const context = this.#context
    const out = this.#music
    if (context === undefined || out === undefined) return
    // Browsers slow timers down in background tabs: skip the beats missed meanwhile, rather than
    // playing them all at once.
    if (this.#nextBeat < context.currentTime) this.#nextBeat = context.currentTime + 0.05
    while (this.#nextBeat < context.currentTime + LOOKAHEAD) {
      const at = this.#nextBeat - context.currentTime
      if (this.#beat % 4 === 0) {
        const root = SCALE[Math.floor(this.#random() * 3)] ?? 220
        this.#tone(context, out, context.currentTime, {
          type: 'triangle',
          from: root / 2,
          seconds: BEAT * 4,
          gain: 0.1,
          delay: at,
        })
      }
      if (this.#random() < 0.7) {
        const note = SCALE[Math.floor(this.#random() * SCALE.length)] ?? 440
        this.#tone(context, out, context.currentTime, {
          type: 'sine',
          from: note,
          seconds: BEAT * 2,
          gain: 0.06,
          delay: at,
        })
      }
      this.#nextBeat += BEAT
      this.#beat++
    }
  }
}
