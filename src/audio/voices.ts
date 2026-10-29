import type { PackSounds } from '../content/schema'

/** How a pack sounds: the scale and pace of its music, and the voice of its effects. */
export interface Voice {
  /** Notes of the melody, low to high, in hertz; the bass plays the lowest three an octave down. */
  readonly scale: readonly number[]
  /** Seconds per beat of the music. */
  readonly beat: number
  /** Share of the beats that get a melody note. */
  readonly density: number
  readonly melody: OscillatorType
  readonly bass: OscillatorType
  /** The waveform of the effects' soft tones; without it, each effect keeps its own. */
  readonly voice?: OscillatorType
  /** A factor on the pitch of every effect. */
  readonly pitch: number
}

/**
 * Square and sawtooth waves sound louder than sines and triangles at the same gain, being
 * brighter, and a square carries more energy too; these factors bring them about level.
 */
export const TYPE_GAIN: Readonly<Record<OscillatorType, number>> = {
  sine: 1,
  triangle: 1,
  square: 0.55,
  sawtooth: 0.7,
  custom: 1,
}

export const VOICES: Readonly<Record<PackSounds, Voice>> = {
  // A minor pentatonic over two octaves, slow and soft: the sound of the game from the start.
  lab: {
    scale: [220, 262, 294, 330, 392, 440, 523, 587, 659, 784],
    beat: 0.75,
    density: 0.7,
    melody: 'sine',
    bass: 'triangle',
    pitch: 1,
  },
  // C major pentatonic, quicker and higher, struck like a xylophone.
  school: {
    scale: [262, 294, 330, 392, 440, 523, 587, 659, 784, 880],
    beat: 0.55,
    density: 0.6,
    melody: 'triangle',
    bass: 'sine',
    voice: 'sine',
    pitch: 1.2,
  },
  // D dorian on a plucked, reedy voice, busy like a harpsichord.
  classic: {
    scale: [294, 330, 349, 392, 440, 494, 523, 587, 659, 698],
    beat: 0.45,
    density: 0.8,
    melody: 'square',
    bass: 'triangle',
    voice: 'triangle',
    pitch: 1,
  },
  // F lydian, low and sparse, with long gaps between the notes.
  space: {
    scale: [175, 196, 220, 247, 262, 330, 349, 392, 440, 494],
    beat: 1.2,
    density: 0.45,
    melody: 'sine',
    bass: 'sine',
    voice: 'sine',
    pitch: 0.8,
  },
  // G mixolydian, rolling along like a ship on the swell.
  sea: {
    scale: [196, 220, 247, 294, 330, 349, 392, 440, 494, 587],
    beat: 0.9,
    density: 0.55,
    melody: 'triangle',
    bass: 'triangle',
    voice: 'triangle',
    pitch: 0.9,
  },
  // E harmonic minor, low and slow, on a buzzing voice.
  crypt: {
    scale: [165, 185, 196, 220, 247, 262, 311, 330, 392, 494],
    beat: 1.05,
    density: 0.5,
    melody: 'sawtooth',
    bass: 'sine',
    voice: 'sawtooth',
    pitch: 0.85,
  },
  // C major, clean and bright, with effects that beep.
  clinic: {
    scale: [262, 330, 392, 440, 523, 587, 659, 784, 880, 1047],
    beat: 0.65,
    density: 0.5,
    melody: 'sine',
    bass: 'triangle',
    voice: 'square',
    pitch: 1.3,
  },
}
