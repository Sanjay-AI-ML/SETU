import { describe, it, expect } from 'vitest';
import { buildEmptyCells, applyRules, applySurpassed } from './index.js';
import rulesConfig from '../../data/matrix-rules.json';

describe('core/matrix buildEmptyCells', () => {
  it('produces 28 cells, all not-used, one per level x purpose', () => {
    const cells = buildEmptyCells();
    expect(cells).toHaveLength(28);
    expect(cells.every((c) => c.state === 'not-used')).toBe(true);
    expect(cells.every((c) => c.evidence.length === 0)).toBe(true);
  });
});

describe('core/matrix applyRules', () => {
  it('marks a cell mastered when its required observation is present, with evidence', () => {
    const observations = [{ code: 'reach', source: 'parent' }];
    const cells = applyRules(observations, rulesConfig, {
      sessionId: 'session-1',
      activityRunId: 'run-1',
    });
    const cell = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(cell.state).toBe('mastered');
    expect(cell.evidence).toEqual([
      { sessionId: 'session-1', activityRunId: 'run-1', observationCode: 'reach', ruleId: 'rule-obtain-l3-reach' },
    ]);
  });

  it('leaves cells with no matching rule as not-used', () => {
    const cells = applyRules([], rulesConfig, {});
    expect(cells.every((c) => c.state === 'not-used')).toBe(true);
  });
});

describe('core/matrix applySurpassed', () => {
  it('marks lower not-used levels in a column as surpassed once a higher level is mastered', () => {
    const observations = [
      { code: 'reach', source: 'parent' },
      { code: 'point', source: 'parent' },
    ];
    const cells = applyRules(observations, rulesConfig, {});
    const level1Obtain = cells.find((c) => c.level === 1 && c.purpose === 'obtain');
    const level2Obtain = cells.find((c) => c.level === 2 && c.purpose === 'obtain');
    const level3Obtain = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    const level4Obtain = cells.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(level1Obtain.state).toBe('surpassed');
    expect(level2Obtain.state).toBe('surpassed');
    expect(level3Obtain.state).toBe('mastered');
    expect(level4Obtain.state).toBe('mastered');
  });

  it('does not touch columns with no mastered cell', () => {
    const cells = applyRules([], rulesConfig, {});
    const refuseCells = cells.filter((c) => c.purpose === 'refuse');
    expect(refuseCells.every((c) => c.state === 'not-used')).toBe(true);
  });
});
