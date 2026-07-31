import { describe, it, expect } from 'vitest';
import { computeRmsEnergy, calibrateNoiseFloor, shouldTriggerOnset } from './onset.js';

describe('computeRmsEnergy', () => {
  it('returns 0 for an empty sample array', () => {
    expect(computeRmsEnergy([])).toBe(0);
  });

  it('returns the constant magnitude for a constant signal', () => {
    expect(computeRmsEnergy([1, 1, 1, 1])).toBeCloseTo(1, 5);
  });

  it('computes RMS for a mixed-sign signal', () => {
    expect(computeRmsEnergy([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5, 5);
  });

  it('computes RMS for a known sequence', () => {
    // sqrt((3^2 + 4^2) / 2) = sqrt(25/2) = 3.5355...
    expect(computeRmsEnergy([3, 4])).toBeCloseTo(3.5355, 3);
  });
});

describe('calibrateNoiseFloor', () => {
  it('returns 0 for an empty block list', () => {
    expect(calibrateNoiseFloor([])).toBe(0);
  });

  it('averages the RMS blocks', () => {
    expect(calibrateNoiseFloor([0.01, 0.02, 0.03])).toBeCloseTo(0.02, 5);
  });
});

describe('shouldTriggerOnset', () => {
  it('never triggers before the listen delay has elapsed, even with high energy', () => {
    const result = shouldTriggerOnset({
      rms: 10,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 100,
      listenDelayMs: 300,
    });
    expect(result).toBe(false);
  });

  it('triggers once the delay has elapsed and rms exceeds the threshold', () => {
    const result = shouldTriggerOnset({
      rms: 0.05,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 300,
      listenDelayMs: 300,
    });
    expect(result).toBe(true);
  });

  it('does not trigger when rms is at or below the threshold', () => {
    const result = shouldTriggerOnset({
      rms: 0.03,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 500,
      listenDelayMs: 300,
    });
    expect(result).toBe(false);
  });
});
