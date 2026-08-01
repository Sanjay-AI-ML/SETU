import { describe, it, expect } from 'vitest';
import { summarizeFrames, interpretSummary, summarizeVocalization, interpretVocalization } from './videoScreening.js';

describe('summarizeFrames', () => {
  it('returns zeroed summary for no frames', () => {
    expect(summarizeFrames([])).toEqual({
      totalFrames: 0, faceDetectedRatio: 0, gazeToCameraRatio: 0, smileRatio: 0, handMotionEvents: 0,
    });
  });

  it('computes ratios across mixed frame samples', () => {
    const frames = [
      { facing: 'camera', smiling: true, motionDirection: 'toward' },
      { facing: 'camera', smiling: false, motionDirection: null },
      { facing: 'away', smiling: false, motionDirection: null },
      { facing: null, smiling: false, motionDirection: 'away' },
    ];
    const summary = summarizeFrames(frames);
    expect(summary.totalFrames).toBe(4);
    expect(summary.faceDetectedRatio).toBe(0.75);
    expect(summary.gazeToCameraRatio).toBe(0.5);
    expect(summary.smileRatio).toBe(0.25);
    expect(summary.handMotionEvents).toBe(2);
  });
});

describe('interpretSummary', () => {
  it('flags no-data for an empty summary', () => {
    expect(interpretSummary(summarizeFrames([])).label).toBe('no-data');
  });

  it('flags low-face-visibility when the face is rarely detected', () => {
    const frames = [{ facing: 'camera', smiling: false, motionDirection: null }];
    for (let i = 0; i < 9; i++) frames.push({ facing: null, smiling: false, motionDirection: null });
    expect(interpretSummary(summarizeFrames(frames)).label).toBe('low-face-visibility');
  });

  it('flags engaged when gaze-to-camera ratio is high', () => {
    const summary = summarizeFrames([
      { facing: 'camera', smiling: false, motionDirection: null },
      { facing: 'camera', smiling: false, motionDirection: null },
      { facing: 'away', smiling: false, motionDirection: null },
    ]);
    expect(interpretSummary(summary).label).toBe('engaged');
  });

  it('flags limited-engagement otherwise', () => {
    const summary = summarizeFrames([
      { facing: 'camera', smiling: false, motionDirection: null },
      { facing: 'away', smiling: false, motionDirection: null },
      { facing: 'away', smiling: false, motionDirection: null },
      { facing: 'away', smiling: false, motionDirection: null },
    ]);
    expect(interpretSummary(summary).label).toBe('limited-engagement');
  });
});

describe('summarizeVocalization', () => {
  it('returns zeroed summary for no samples', () => {
    expect(summarizeVocalization([])).toEqual({ totalSamples: 0, vocalizingRatio: 0, vocalizationEvents: 0 });
  });

  it('counts ratio and distinct rising-edge events', () => {
    const flags = [false, true, true, false, false, true, false];
    const summary = summarizeVocalization(flags);
    expect(summary.totalSamples).toBe(7);
    expect(summary.vocalizingRatio).toBeCloseTo(3 / 7);
    expect(summary.vocalizationEvents).toBe(2);
  });
});

describe('interpretVocalization', () => {
  it('flags no-data for empty summary', () => {
    expect(interpretVocalization(summarizeVocalization([])).label).toBe('no-data');
  });

  it('flags no-vocalization when nothing crosses the threshold', () => {
    const summary = summarizeVocalization([false, false, false]);
    expect(interpretVocalization(summary).label).toBe('no-vocalization');
  });

  it('flags vocalization-detected when events occurred', () => {
    const summary = summarizeVocalization([false, true, false]);
    expect(interpretVocalization(summary).label).toBe('vocalization-detected');
  });
});
