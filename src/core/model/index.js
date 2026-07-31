export function createChildProfile({ displayName, ageMonths, homeLanguages = [], notes = '' }) {
  return {
    id: crypto.randomUUID(),
    displayName,
    ageMonths,
    homeLanguages,
    notes,
    createdAt: new Date().toISOString(),
  };
}

export function createSession({ childId }) {
  return {
    id: crypto.randomUUID(),
    childId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    activityRuns: [],
    matrixProfile: null,
    flags: [],
    reportId: null,
  };
}

export function createActivityRun({ activityId }) {
  return {
    id: crypto.randomUUID(),
    activityId,
    startedAt: new Date().toISOString(),
    trials: [],
    observations: [],
  };
}

export function createTrial({ index, serveAt }) {
  return {
    index,
    serveAt,
    returnAt: null,
    returnSource: 'none',
    latencyMs: null,
    responded: false,
  };
}

export function createObservation({ code, source, confidence = null }) {
  return {
    code,
    source,
    confidence,
    at: new Date().toISOString(),
  };
}
