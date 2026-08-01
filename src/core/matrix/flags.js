import { classifyBand } from '../latency/index.js';

const NO_RESPONSE_RATE_THRESHOLD = 0.5;

// Every flag is a rule over directly observed data, with a plain-language
// `detail` naming the exact evidence — never a score, likelihood, or
// prediction. See CLAUDE.md: "must never imply a diagnosis." Adding evidence
// text here is meant to make these flags more legible to a clinician, not to
// dress a heuristic up as something more predictive than it is.
export function computeFlags({ trials, cells, latencyBandsConfig, ranActivityIds = [] }) {
  const flags = [];

  if (hasHighNoResponseRate(trials)) {
    const noResponseCount = trials.filter((t) => !t.responded).length;
    flags.push({
      id: 'flag-no-response-rate',
      label: 'No response in half or more of trials',
      severity: 'concern',
      detail: `No response recorded in ${noResponseCount} of ${trials.length} trials across all activities.`,
    });
  }

  if (!hasBehaviourAboveLevelTwo(cells)) {
    flags.push({
      id: 'flag-no-behaviour-above-level-ii',
      label: 'No communication behaviours observed above Level II',
      severity: 'concern',
      detail: 'Every observed or emerging behaviour stayed at pre-intentional/intentional levels (I-II) across all four purposes.',
    });
  }

  const medianBand = medianLatencyBand(trials, latencyBandsConfig);
  if (medianBand === 'delayed') {
    const respondedLatencies = trials.filter((t) => t.latencyMs != null).map((t) => t.latencyMs);
    flags.push({
      id: 'flag-median-latency-delayed',
      label: 'Median response latency is in the delayed range',
      severity: 'concern',
      detail: `Median response time across ${respondedLatencies.length} responded trial(s) fell in the delayed band (see response-time ribbon).`,
    });
  }

  if (ranActivityIds.includes('call-and-response') && !hasNameResponseEvidence(cells)) {
    flags.push({
      id: 'flag-no-name-response',
      label: 'No response observed when name was called',
      severity: 'concern',
      detail: 'Across the Call & Response activity, no orienting, approach, or vocal response to the child\'s name was recorded — a well-established early social-communication screening signal, on its own not conclusive.',
    });
  }

  return flags;
}

function hasNameResponseEvidence(cells) {
  return cells.some((cell) => cell.evidence.some((e) => e.observationCode?.startsWith('name-response')));
}

function hasHighNoResponseRate(trials) {
  if (trials.length === 0) return false;
  const noResponseCount = trials.filter((t) => !t.responded).length;
  return noResponseCount / trials.length >= NO_RESPONSE_RATE_THRESHOLD;
}

function hasBehaviourAboveLevelTwo(cells) {
  return cells.some((c) => c.level > 2 && (c.state === 'mastered' || c.state === 'emerging'));
}

function medianLatencyBand(trials, latencyBandsConfig) {
  const latencies = trials
    .filter((t) => t.latencyMs != null)
    .map((t) => t.latencyMs)
    .sort((a, b) => a - b);
  if (latencies.length === 0) return null;

  const mid = Math.floor(latencies.length / 2);
  const median = latencies.length % 2 === 0 ? (latencies[mid - 1] + latencies[mid]) / 2 : latencies[mid];
  return classifyBand(median, latencyBandsConfig);
}
