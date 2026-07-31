import { describe, it, expect } from 'vitest';
import { classifyHeadOrientation, classifySmile } from './gesture.js';

describe('classifyHeadOrientation', () => {
  it('classifies small yaw as facing camera', () => {
    expect(classifyHeadOrientation(0)).toEqual({ facing: 'camera', yawDeg: 0 });
    expect(classifyHeadOrientation(15)).toEqual({ facing: 'camera', yawDeg: 15 });
  });

  it('classifies yaw exactly at the camera threshold as facing camera', () => {
    expect(classifyHeadOrientation(20)).toEqual({ facing: 'camera', yawDeg: 20 });
  });

  it('classifies mid-range yaw as ambiguous (null)', () => {
    expect(classifyHeadOrientation(25).facing).toBe(null);
  });

  it('classifies large yaw as away, threshold inclusive', () => {
    expect(classifyHeadOrientation(35).facing).toBe('away');
    expect(classifyHeadOrientation(-40).facing).toBe('away');
  });
});

describe('classifySmile', () => {
  it('returns true when average smile blendshape score is above threshold', () => {
    const categories = [
      { categoryName: 'mouthSmileLeft', score: 0.6 },
      { categoryName: 'mouthSmileRight', score: 0.7 },
    ];
    expect(classifySmile(categories)).toBe(true);
  });

  it('returns false when average score is below threshold', () => {
    const categories = [
      { categoryName: 'mouthSmileLeft', score: 0.3 },
      { categoryName: 'mouthSmileRight', score: 0.2 },
    ];
    expect(classifySmile(categories)).toBe(false);
  });

  it('returns false when the categories are missing entirely', () => {
    expect(classifySmile([])).toBe(false);
  });
});
