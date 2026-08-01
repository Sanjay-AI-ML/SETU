import { describe, it, expect } from 'vitest';
import { computeAgeGap } from './index.js';
import ageNormsConfig from '../../data/age-norms.json';

function cell(level, state) {
  return { level, purpose: 'obtain', state, evidence: [] };
}

describe('computeAgeGap', () => {
  it('flags delayed when age is well past the mastered level band', () => {
    const cells = [cell(2, 'mastered')];
    const result = computeAgeGap({ ageMonths: 30, cells, ageNormsConfig });
    expect(result.status).toBe('delayed');
    expect(result.functionalLevel).toBe(2);
    expect(result.gapMonths).toBeGreaterThan(0);
  });

  it('reports on-track when age falls inside the band', () => {
    const cells = [cell(4, 'mastered')];
    const result = computeAgeGap({ ageMonths: 15, cells, ageNormsConfig });
    expect(result.status).toBe('on-track');
  });

  it('flags ahead when age is below the mastered level band', () => {
    const cells = [cell(6, 'mastered')];
    const result = computeAgeGap({ ageMonths: 10, cells, ageNormsConfig });
    expect(result.status).toBe('ahead');
  });

  it('returns insufficient-data when nothing is mastered or emerging', () => {
    const cells = [cell(3, 'not-used')];
    const result = computeAgeGap({ ageMonths: 20, cells, ageNormsConfig });
    expect(result.status).toBe('insufficient-data');
  });
});
