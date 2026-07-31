import { createSession, createActivityRun, createTrial, createObservation } from '../model/index.js';
import activities from '../../data/activities.json';

const LATENCY_PATTERN_MS = [900, 1600, 2800];
const RETURN_SOURCES = ['audio-onset', 'parent-tap', 'audio-onset'];

export function createDemoSession({ childId }) {
  const session = createSession({ childId });

  session.activityRuns = activities.map((activity) => {
    const run = createActivityRun({ activityId: activity.id });

    run.trials = LATENCY_PATTERN_MS.map((latencyMs, index) => {
      const responded = !(activity.id === 'not-this-one' && index === 2);
      const serveAt = index * 6;
      return {
        ...createTrial({ index, serveAt }),
        returnAt: responded ? serveAt + latencyMs / 1000 : null,
        returnSource: responded ? RETURN_SOURCES[index] : 'none',
        latencyMs: responded ? latencyMs : null,
        responded,
      };
    });

    run.observations = activity.expectedBehaviours
      .slice(0, 2)
      .map((code) => createObservation({ code, source: 'parent' }));

    return run;
  });

  return session;
}
