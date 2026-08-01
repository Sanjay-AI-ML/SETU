import { describe, it, expect } from 'vitest';
import { computeRms, isVocalizing, VOCALIZATION_RMS_THRESHOLD } from './vocalizationLevel.js';

describe('computeRms', () => {
  it('returns 0 for silence (all samples at the 128 midpoint)', () => {
    const silence = new Uint8Array(64).fill(128);
    expect(computeRms(silence)).toBe(0);
  });

  it('returns 1 for full-scale alternating extremes', () => {
    const loud = new Uint8Array(64);
    for (let i = 0; i < loud.length; i++) loud[i] = i % 2 === 0 ? 0 : 255;
    expect(computeRms(loud)).toBeCloseTo(1, 1);
  });

  it('works with Float32Array values [-1..1]', () => {
    const Float32Silence = new Float32Array(64).fill(0);
    expect(computeRms(Float32Silence)).toBe(0);
    const Float32Loud = new Float32Array(64);
    for (let i = 0; i < Float32Loud.length; i++) Float32Loud[i] = i % 2 === 0 ? -1 : 1;
    expect(computeRms(Float32Loud)).toBeCloseTo(1, 1);
  });
});

describe('isVocalizing', () => {
  it('is false below the threshold', () => {
    expect(isVocalizing(VOCALIZATION_RMS_THRESHOLD - 0.01)).toBe(false);
  });

  it('is true above the threshold', () => {
    expect(isVocalizing(VOCALIZATION_RMS_THRESHOLD + 0.01)).toBe(true);
  });
});
