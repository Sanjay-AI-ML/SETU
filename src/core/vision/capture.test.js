import { describe, it, expect } from 'vitest';
import { extractEyePositions } from './capture.js';

function makeLandmarks(count) {
  return Array.from({ length: count }, (_, i) => ({ x: i / count, y: i / count, z: 0 }));
}

describe('extractEyePositions', () => {
  it('returns null when there are no landmarks', () => {
    expect(extractEyePositions(null)).toBeNull();
    expect(extractEyePositions([])).toBeNull();
  });

  it('uses iris centers (468/473) when the full 478-point set is present', () => {
    const landmarks = makeLandmarks(478);
    const result = extractEyePositions(landmarks);
    expect(result).toEqual([
      { x: landmarks[468].x, y: landmarks[468].y },
      { x: landmarks[473].x, y: landmarks[473].y },
    ]);
  });

  it('falls back to outer-canthus corners (33/263) for a base 468-point mesh', () => {
    const landmarks = makeLandmarks(468);
    const result = extractEyePositions(landmarks);
    expect(result).toEqual([
      { x: landmarks[33].x, y: landmarks[33].y },
      { x: landmarks[263].x, y: landmarks[263].y },
    ]);
  });

  it('returns null for a landmark set too small to contain the fallback indices', () => {
    expect(extractEyePositions(makeLandmarks(50))).toBeNull();
  });
});
