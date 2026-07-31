export function computeRmsEnergy(samples) {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

export function calibrateNoiseFloor(rmsBlocks) {
  if (rmsBlocks.length === 0) return 0;
  const sum = rmsBlocks.reduce((total, rms) => total + rms, 0);
  return sum / rmsBlocks.length;
}

export function shouldTriggerOnset({ rms, noiseFloor, thresholdMultiplier, elapsedMsSinceArm, listenDelayMs }) {
  if (elapsedMsSinceArm < listenDelayMs) return false;
  return rms > noiseFloor * thresholdMultiplier;
}
