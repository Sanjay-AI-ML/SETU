import { describe, it, expect } from 'vitest';
import { generateReport } from './index.js';

describe('core/report generateReport', () => {
  it('builds a report with child, matrix, flags, and trial sections', () => {
    const session = { id: 'session-1' };
    const child = { displayName: 'Demo Child', ageMonths: 24 };
    const cells = [{ level: 1, purpose: 'obtain', state: 'not-used', evidence: [] }];
    const flags = [{ id: 'flag-x', label: 'Example flag', severity: 'concern' }];
    const trials = [{ index: 0, latencyMs: 1200, responded: true }];

    const report = generateReport({ session, child, cells, flags, trials });

    expect(report.id).toBeTypeOf('string');
    expect(report.sessionId).toBe('session-1');
    expect(report.generatedAt).toBeTypeOf('string');
    expect(report.sections.child).toEqual({ displayName: 'Demo Child', ageMonths: 24 });
    expect(report.sections.matrixProfile).toBe(cells);
    expect(report.sections.flags).toBe(flags);
    expect(report.sections.trials).toEqual([{ index: 0, latencyMs: 1200, responded: true }]);
  });

  it('always includes the required disclaimers, never a diagnostic claim', () => {
    const report = generateReport({
      session: { id: 's' },
      child: { displayName: 'X', ageMonths: 24 },
      cells: [],
      flags: [],
      trials: [],
    });
    expect(report.disclaimers.length).toBeGreaterThanOrEqual(4);
    expect(report.disclaimers.join(' ')).toMatch(/not a diagnostic tool/i);
    expect(report.disclaimers.join(' ')).toMatch(/not clinically validated/i);
  });
});
