import { describe, it, expect } from 'vitest';
import { estimatePitchHz } from './pitchEstimate.js';

function sineWave(freqHz, sampleRate, size) {
  const buffer = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  }
  return buffer;
}

describe('estimatePitchHz', () => {
  it('returns null for silence', () => {
    const buffer = new Float32Array(2048);
    expect(estimatePitchHz(buffer, 44100)).toBeNull();
  });

  it('estimates a 220Hz tone within a few Hz', () => {
    const buffer = sineWave(220, 44100, 2048);
    const result = estimatePitchHz(buffer, 44100);
    expect(result).toBeGreaterThan(210);
    expect(result).toBeLessThan(230);
  });

  it('estimates a 350Hz tone (typical higher child-register range) within a few Hz', () => {
    const buffer = sineWave(350, 44100, 2048);
    const result = estimatePitchHz(buffer, 44100);
    expect(result).toBeGreaterThan(335);
    expect(result).toBeLessThan(365);
  });
});
