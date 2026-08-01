import { describe, it, expect } from 'vitest';
import { createDemoSession } from './index.js';
import { matchRules, mergeCells, applySurpassed } from '../matrix/index.js';
import { computeFlags } from '../matrix/flags.js';
import activities from '../../data/activities.json';
import rulesConfig from '../../data/matrix-rules.json';
import latencyBandsConfig from '../../data/latency-bands.json';

describe('createDemoSession', () => {
  it('produces one activity run per current activity, including Call & Response', () => {
    const session = createDemoSession({ childId: 'demo-child' });
    expect(session.activityRuns).toHaveLength(activities.length);
    expect(session.activityRuns.map((r) => r.activityId)).toContain('call-and-response');
  });

  it('every observation code it synthesises has a matching matrix rule', () => {
    const session = createDemoSession({ childId: 'demo-child' });
    const ruleCodes = new Set(rulesConfig.rules.flatMap((r) => r.requiredObservations));
    for (const run of session.activityRuns) {
      for (const observation of run.observations) {
        expect(ruleCodes.has(observation.code)).toBe(true);
      }
    }
  });

  it('feeds cleanly through the full results pipeline (matrix cells + flags) with no crash', () => {
    const session = createDemoSession({ childId: 'demo-child' });
    const allTrials = session.activityRuns.flatMap((run) => run.trials);
    const cellsPerRun = session.activityRuns.map((run) =>
      matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
    );
    const cells = applySurpassed(mergeCells(cellsPerRun));
    const flags = computeFlags({ trials: allTrials, cells, latencyBandsConfig });

    expect(cells.length).toBeGreaterThan(0);
    expect(Array.isArray(flags)).toBe(true);
    // Call & Response's synthesised observations should land as mastered
    // social-purpose cells, not silently vanish.
    const socialMastered = cells.some((c) => c.purpose === 'social' && c.state === 'mastered');
    expect(socialMastered).toBe(true);
  });
});
