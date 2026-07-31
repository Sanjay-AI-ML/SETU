import { classifyBand } from '../latency/index.js';

const NO_RESPONSE_RATE_THRESHOLD = 0.5;

export function computeFlags({ trials, cells, latencyBandsConfig }) {
  const flags = [];

  if (hasHighNoResponseRate(trials)) {
    flags.push({
      id: 'flag-no-response-rate',
      label: 'No response in half or more of trials',
      severity: 'concern',
    });
  }

  if (!hasBehaviourAboveLevelTwo(cells)) {
    flags.push({
      id: 'flag-no-behaviour-above-level-ii',
      label: 'No communication behaviours observed above Level II',
      severity: 'concern',
    });
  }

  const medianBand = medianLatencyBand(trials, latencyBandsConfig);
  if (medianBand === 'delayed') {
    flags.push({
      id: 'flag-median-latency-delayed',
      label: 'Median response latency is in the delayed range',
      severity: 'concern',
    });
  }

  return flags;
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
