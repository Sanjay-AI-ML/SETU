import { describe, it, expect } from 'vitest';
import {
  createChildProfile,
  createSession,
  createActivityRun,
  createTrial,
  createObservation,
} from './index.js';

describe('core/model factories', () => {
  it('createChildProfile fills defaults and required fields', () => {
    const profile = createChildProfile({ displayName: 'A', ageMonths: 24 });
    expect(profile.id).toBeTypeOf('string');
    expect(profile.displayName).toBe('A');
    expect(profile.ageMonths).toBe(24);
    expect(profile.homeLanguages).toEqual([]);
    expect(profile.notes).toBe('');
    expect(profile.createdAt).toBeTypeOf('string');
  });

  it('createSession starts with empty activityRuns and null endedAt', () => {
    const session = createSession({ childId: 'child-1' });
    expect(session.childId).toBe('child-1');
    expect(session.activityRuns).toEqual([]);
    expect(session.endedAt).toBeNull();
    expect(session.matrixProfile).toBeNull();
    expect(session.flags).toEqual([]);
  });

  it('createActivityRun starts with empty trials and observations', () => {
    const run = createActivityRun({ activityId: 'bubble-time' });
    expect(run.activityId).toBe('bubble-time');
    expect(run.trials).toEqual([]);
    expect(run.observations).toEqual([]);
  });

  it('createTrial starts unresponded with no returnAt', () => {
    const trial = createTrial({ index: 0, serveAt: 1.5 });
    expect(trial.index).toBe(0);
    expect(trial.serveAt).toBe(1.5);
    expect(trial.returnAt).toBeNull();
    expect(trial.returnSource).toBe('none');
    expect(trial.latencyMs).toBeNull();
    expect(trial.responded).toBe(false);
  });

  it('createObservation records code and source with a timestamp', () => {
    const obs = createObservation({ code: 'reach', source: 'parent' });
    expect(obs.code).toBe('reach');
    expect(obs.source).toBe('parent');
    expect(obs.confidence).toBeNull();
    expect(obs.at).toBeTypeOf('string');
  });
});
