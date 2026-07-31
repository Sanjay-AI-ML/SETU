import { describe, it, expect } from 'vitest';
import { classifyHeadOrientation, classifySmile, classifyHandPose, classifyMotion } from './gesture.js';

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

function makeLandmarks(overrides) {
  const base = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  return base.map((point, i) => (overrides[i] ? { ...point, ...overrides[i] } : point));
}

describe('classifyHandPose', () => {
  it('classifies index-extended, others-curled as point', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },   // wrist
      6: { x: 0.5, y: 0.6 },   // index PIP
      8: { x: 0.5, y: 0.3 },   // index tip (far from wrist)
      10: { x: 0.52, y: 0.62 }, // middle PIP
      12: { x: 0.55, y: 0.65 }, // middle tip (close to PIP)
      14: { x: 0.48, y: 0.62 }, // ring PIP
      16: { x: 0.45, y: 0.65 }, // ring tip (close to PIP)
      18: { x: 0.46, y: 0.63 }, // pinky PIP
      20: { x: 0.44, y: 0.66 }, // pinky tip (close to PIP)
    });
    expect(classifyHandPose(landmarks)).toBe('point');
  });

  it('classifies all-fingers-extended as open', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },
      6: { x: 0.5, y: 0.6 }, 8: { x: 0.5, y: 0.3 },
      10: { x: 0.52, y: 0.6 }, 12: { x: 0.52, y: 0.3 },
      14: { x: 0.48, y: 0.6 }, 16: { x: 0.48, y: 0.3 },
      18: { x: 0.46, y: 0.6 }, 20: { x: 0.46, y: 0.3 },
    });
    expect(classifyHandPose(landmarks)).toBe('open');
  });

  it('classifies a closed fist as neutral', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },
      6: { x: 0.5, y: 0.8 }, 8: { x: 0.5, y: 0.82 },
      10: { x: 0.5, y: 0.8 }, 12: { x: 0.5, y: 0.82 },
      14: { x: 0.5, y: 0.8 }, 16: { x: 0.5, y: 0.82 },
      18: { x: 0.5, y: 0.8 }, 20: { x: 0.5, y: 0.82 },
    });
    expect(classifyHandPose(landmarks)).toBe('neutral');
  });
});

describe('classifyMotion', () => {
  it('classifies a hand moving toward the frame center as toward', () => {
    const prev = makeLandmarks({ 0: { x: 0.1, y: 0.1 } });
    const curr = makeLandmarks({ 0: { x: 0.45, y: 0.45 } });
    expect(classifyMotion(prev, curr).direction).toBe('toward');
  });

  it('classifies a hand moving away from the frame center as away', () => {
    const prev = makeLandmarks({ 0: { x: 0.5, y: 0.5 } });
    const curr = makeLandmarks({ 0: { x: 0.1, y: 0.1 } });
    expect(classifyMotion(prev, curr).direction).toBe('away');
  });

  it('classifies negligible movement as null direction', () => {
    const prev = makeLandmarks({ 0: { x: 0.5, y: 0.5 } });
    const curr = makeLandmarks({ 0: { x: 0.501, y: 0.5 } });
    expect(classifyMotion(prev, curr).direction).toBe(null);
  });
});
