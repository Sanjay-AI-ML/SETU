import { describe, it, expect } from 'vitest';
import { computeFlags } from './flags.js';
import { buildEmptyCells } from './index.js';

const latencyBandsConfig = {
  bands: [
    { id: 'within', label: 'Within expected range', maxMs: 2000 },
    { id: 'borderline', label: 'Borderline', maxMs: 3500 },
    { id: 'delayed', label: 'Delayed', maxMs: null },
  ],
};

function trial({ responded, latencyMs }) {
  return { index: 0, serveAt: 0, returnAt: responded ? 1 : null, returnSource: responded ? 'parent-tap' : 'none', latencyMs, responded };
}

describe('core/matrix flags', () => {
  it('flags when half or more trials had no response', () => {
    const trials = [trial({ responded: false, latencyMs: null }), trial({ responded: true, latencyMs: 1000 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-no-response-rate');
  });

  it('does not flag no-response when fewer than half of trials failed', () => {
    const trials = [
      trial({ responded: true, latencyMs: 500 }),
      trial({ responded: true, latencyMs: 500 }),
      trial({ responded: false, latencyMs: null }),
    ];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-response-rate');
  });

  it('flags when no behaviour above Level II was observed', () => {
    const cells = buildEmptyCells();
    const flags = computeFlags({ trials: [], cells, latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-no-behaviour-above-level-ii');
  });

  it('does not flag level-ii when a cell above Level II is mastered', () => {
    const cells = buildEmptyCells();
    cells.find((c) => c.level === 3 && c.purpose === 'obtain').state = 'mastered';
    const flags = computeFlags({ trials: [], cells, latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-behaviour-above-level-ii');
  });

  it('flags when median latency falls in the delayed band', () => {
    const trials = [trial({ responded: true, latencyMs: 5000 }), trial({ responded: true, latencyMs: 6000 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-median-latency-delayed');
  });

  it('does not flag median latency when it is within range', () => {
    const trials = [trial({ responded: true, latencyMs: 500 }), trial({ responded: true, latencyMs: 700 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-median-latency-delayed');
  });

  it('every flag carries a plain-language detail, never a score', () => {
    const trials = [trial({ responded: false, latencyMs: null }), trial({ responded: false, latencyMs: null })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    for (const flag of flags) {
      expect(typeof flag.detail).toBe('string');
      expect(flag.detail.length).toBeGreaterThan(0);
      expect(flag).not.toHaveProperty('score');
      expect(flag).not.toHaveProperty('likelihood');
    }
  });

  it('flags no name-response when Call & Response ran but no name-response evidence exists', () => {
    const cells = buildEmptyCells();
    const flags = computeFlags({
      trials: [],
      cells,
      latencyBandsConfig,
      ranActivityIds: ['call-and-response'],
    });
    expect(flags.map((f) => f.id)).toContain('flag-no-name-response');
  });

  it('does not flag no-name-response when the activity was not run this session', () => {
    const cells = buildEmptyCells();
    const flags = computeFlags({ trials: [], cells, latencyBandsConfig, ranActivityIds: ['bubble-time'] });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-name-response');
  });

  it('does not flag no-name-response when name-response evidence exists', () => {
    const cells = buildEmptyCells();
    const socialL3 = cells.find((c) => c.level === 3 && c.purpose === 'social');
    socialL3.state = 'mastered';
    socialL3.evidence.push({ sessionId: 's1', activityRunId: 'r1', observationCode: 'name-response-orient', ruleId: 'rule-social-l3-name-orient' });
    const flags = computeFlags({
      trials: [],
      cells,
      latencyBandsConfig,
      ranActivityIds: ['call-and-response'],
    });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-name-response');
  });
});
