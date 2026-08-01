// Pure RMS-energy math for the video-check's audio signal. Deliberately NOT
// sound classification (babble vs crying vs speech) — that needs a trained
// audio model, which this project doesn't build (see CLAUDE.md: no ML
// without labelled data to build it responsibly). This only answers "was
// there audible vocal activity in this moment", a coarse presence signal.

export const VOCALIZATION_RMS_THRESHOLD = 0.04;

export function computeRms(timeDomainData) {
  let sumSquares = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    const normalized = (timeDomainData[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / timeDomainData.length);
}

export function isVocalizing(rms, threshold = VOCALIZATION_RMS_THRESHOLD) {
  return rms > threshold;
}
