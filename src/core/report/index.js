export function generateReport({ session, child, cells, flags, trials }) {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    sections: {
      child: { displayName: child.displayName, ageMonths: child.ageMonths },
      matrixProfile: cells,
      flags,
      trials: trials.map((t) => ({ index: t.index, latencyMs: t.latencyMs, responded: t.responded })),
    },
    disclaimers: [
      'SETU is not a diagnostic tool. It does not detect, diagnose, or rule out any condition.',
      'This is a hackathon prototype. Any sample data shown is self-recorded or simulated, never real clinical data.',
      'Latency thresholds are demo heuristics, not clinically validated.',
      'SETU produces structured observations for a qualified clinician to review — it is screening support, not a result.',
    ],
  };
}
