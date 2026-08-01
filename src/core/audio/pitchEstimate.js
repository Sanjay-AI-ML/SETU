// Autocorrelation-based fundamental frequency estimate from a time-domain
// audio buffer. Standard, explainable signal-processing technique — not a
// trained model. Used only by the experimental voice-register feature; never
// feeds the Matrix, flags, or any report section.

const MIN_HZ = 80;
const MAX_HZ = 1000; // covers adult male through infant cry/babble range
const SILENCE_RMS_THRESHOLD = 0.01;

export function estimatePitchHz(buffer, sampleRate) {
  const size = buffer.length;

  let sumSquares = 0;
  for (let i = 0; i < size; i++) sumSquares += buffer[i] * buffer[i];
  const rms = Math.sqrt(sumSquares / size);
  if (rms < SILENCE_RMS_THRESHOLD) return null;

  const minLag = Math.floor(sampleRate / MAX_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), size - 1);

  let bestLag = -1;
  let bestCorrelation = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    if (sum > bestCorrelation) {
      bestCorrelation = sum;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return null;
  return sampleRate / bestLag;
}
