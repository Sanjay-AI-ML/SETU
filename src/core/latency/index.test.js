import { describe, it, expect } from 'vitest';
import { markTime, computeLatencyMs, classifyBand } from './index.js';

const bandsConfig = {
  bands: [
    { id: 'within', label: 'Within expected range', maxMs: 2000 },
    { id: 'borderline', label: 'Borderline', maxMs: 3500 },
    { id: 'delayed', label: 'Delayed', maxMs: null },
  ],
};

describe('core/latency', () => {
  it('markTime reads currentTime off an audio-context-like object', () => {
    expect(markTime({ currentTime: 5.25 })).toBe(5.25);
  });

  it('computeLatencyMs converts a serve/return gap in seconds to whole milliseconds', () => {
    expect(computeLatencyMs(1.0, 2.5)).toBe(1500);
    expect(computeLatencyMs(0, 0.001)).toBe(1);
  });

  it('classifyBand picks the first band whose maxMs the latency is within', () => {
    expect(classifyBand(500, bandsConfig)).toBe('within');
    expect(classifyBand(2000, bandsConfig)).toBe('within');
    expect(classifyBand(2001, bandsConfig)).toBe('borderline');
    expect(classifyBand(3500, bandsConfig)).toBe('borderline');
  });

  it('classifyBand falls into the last band (null maxMs) for anything above every ceiling', () => {
    expect(classifyBand(10000, bandsConfig)).toBe('delayed');
  });
});
