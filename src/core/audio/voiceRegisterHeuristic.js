// Maps an estimated fundamental frequency to a coarse, plainly-labeled voice
// "register" bucket. Deliberately not framed as age prediction in the core
// logic — pitch loosely correlates with age at a population level but is a
// weak, unvalidated signal for any individual, especially pre-verbal infants
// whose cry/babble acoustics don't map cleanly onto adult-speech pitch norms.
// This is a novelty heuristic, not a trained model — see VoiceAgeCheckPage.jsx
// for the disclaimers shown alongside it. Never feeds the Matrix, flags, or
// any report section.

const REGISTERS = [
  { maxHz: 165, id: 'lower-register', label: 'Lower-pitched register', note: 'Typical of adult male speech.' },
  { maxHz: 260, id: 'mid-register', label: 'Mid-pitched register', note: 'Typical of adult female speech or older children.' },
  { maxHz: 400, id: 'higher-register', label: 'Higher-pitched register', note: 'Common in young children\'s speech.' },
  { maxHz: Infinity, id: 'very-high-register', label: 'Very high-pitched register', note: 'Common in infant/toddler vocalizations, including crying and babbling.' },
];

export function estimateVoiceRegister(pitchHz) {
  if (pitchHz == null || !Number.isFinite(pitchHz) || pitchHz <= 0) {
    return { id: 'unknown', label: 'No clear pitch detected', note: 'Try again with less background noise.', pitchHz: null };
  }
  const register = REGISTERS.find((r) => pitchHz <= r.maxHz);
  return { id: register.id, label: register.label, note: register.note, pitchHz: Math.round(pitchHz) };
}
