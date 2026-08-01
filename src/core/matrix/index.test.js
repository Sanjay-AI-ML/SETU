import { describe, it, expect } from 'vitest';
import { buildEmptyCells, matchRules, applyRules, applySurpassed, mergeCells } from './index.js';
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

  it('does not surpass levels in unrelated columns when a different column has mastered cells', () => {
    const observations = [{ code: 'reach', source: 'parent' }];
    const cells = applyRules(observations, rulesConfig, {});
    const refuseL1 = cells.find((c) => c.level === 1 && c.purpose === 'refuse');
    const refuseL2 = cells.find((c) => c.level === 2 && c.purpose === 'refuse');
    const obtainL3 = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(obtainL3.state).toBe('mastered');
    expect(refuseL1.state).toBe('not-used');
    expect(refuseL2.state).toBe('not-used');
  });
});

describe('core/matrix matchRules', () => {
  it('marks matched cells but does NOT compute surpassed', () => {
    const observations = [
      { code: 'reach', source: 'parent' },
      { code: 'point', source: 'parent' },
    ];
    const cells = matchRules(observations, rulesConfig, {});
    const level1Obtain = cells.find((c) => c.level === 1 && c.purpose === 'obtain');
    const level3Obtain = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    const level4Obtain = cells.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(level1Obtain.state).toBe('not-used');
    expect(level3Obtain.state).toBe('mastered');
    expect(level4Obtain.state).toBe('mastered');
  });

  it('attaches evidence with the provided context', () => {
    const cells = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, {
      sessionId: 'session-1',
      activityRunId: 'run-1',
    });
    const cell = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(cell.evidence).toEqual([
      { sessionId: 'session-1', activityRunId: 'run-1', observationCode: 'reach', ruleId: 'rule-obtain-l3-reach' },
    ]);
  });
});

describe('core/matrix mergeCells', () => {
  it('takes the highest-ranked state across multiple cell arrays for the same cell', () => {
    const runA = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-a' });
    const runB = matchRules([{ code: 'point', source: 'parent' }], rulesConfig, { activityRunId: 'run-b' });
    const merged = mergeCells([runA, runB]);
    const obtainL3 = merged.find((c) => c.level === 3 && c.purpose === 'obtain');
    const obtainL4 = merged.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(obtainL3.state).toBe('mastered');
    expect(obtainL4.state).toBe('mastered');
  });

  it('concatenates evidence from all inputs for the same cell', () => {
    const runA = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-a' });
    const runB = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-b' });
    const merged = mergeCells([runA, runB]);
    const obtainL3 = merged.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(obtainL3.evidence).toHaveLength(2);
    expect(obtainL3.evidence[0].activityRunId).toBe('run-a');
    expect(obtainL3.evidence[1].activityRunId).toBe('run-b');
  });

  it('returns all not-used cells when given an empty list of cell arrays', () => {
    const merged = mergeCells([]);
    expect(merged).toHaveLength(28);
    expect(merged.every((c) => c.state === 'not-used')).toBe(true);
  });

  it('a subsequent applySurpassed pass on merged cells produces session-wide surpassed states', () => {
    const runA = matchRules(
      [{ code: 'reach', source: 'parent' }, { code: 'point', source: 'parent' }],
      rulesConfig,
      {}
    );
    const merged = mergeCells([runA]);
    const surpassed = applySurpassed(merged);
    const obtainL1 = surpassed.find((c) => c.level === 1 && c.purpose === 'obtain');
    expect(obtainL1.state).toBe('surpassed');
  });
});

describe('core/matrix rules coverage for Phase 3 activities', () => {
  it('maps peek-a-boo observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'anticipatory-movement', source: 'parent' },
        { code: 'smile', source: 'parent' },
        { code: 'gaze-to-face', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 1 && c.purpose === 'social').state).toBe('mastered');
    expect(cells.find((c) => c.level === 2 && c.purpose === 'social').state).toBe('mastered');
    expect(cells.find((c) => c.level === 3 && c.purpose === 'social').state).toBe('mastered');
  });

  it('maps not-this-one observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'head-turn', source: 'parent' },
        { code: 'vocal-protest', source: 'parent' },
        { code: 'word-no', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 2 && c.purpose === 'refuse').state).toBe('mastered');
    expect(cells.find((c) => c.level === 3 && c.purpose === 'refuse').state).toBe('mastered');
    expect(cells.find((c) => c.level === 6 && c.purpose === 'refuse').state).toBe('mastered');
  });

  it('maps whats-in-the-box observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'show', source: 'parent' },
        { code: 'comment', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 4 && c.purpose === 'information').state).toBe('mastered');
    expect(cells.find((c) => c.level === 6 && c.purpose === 'information').state).toBe('mastered');
  });
});
