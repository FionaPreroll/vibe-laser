/** Rules the spec leaves open. Packs and levels will be able to override the defaults. */
export interface Rules {
  /**
   * Beams from several angles on one coin. 'single' spins the coin only when exactly one axis is lit
   * (fan manual); 'sameColor' also when every lit axis carries exactly the coin's color (FAQ hint on
   * "Duck Shoot").
   */
  readonly coinAngles: 'single' | 'sameColor'
  /** A beam that runs into a laser stops there, or passes straight through it. */
  readonly beamIntoLaser: 'absorb' | 'pass'
}

export const DEFAULT_RULES: Rules = {
  coinAngles: 'sameColor',
  beamIntoLaser: 'absorb',
}
