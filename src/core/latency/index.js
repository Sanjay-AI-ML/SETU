export function markTime(audioContextLike) {
  return audioContextLike.currentTime;
}

export function computeLatencyMs(serveAt, returnAt) {
  return Math.round((returnAt - serveAt) * 1000);
}

export function classifyBand(latencyMs, bandsConfig) {
  for (const band of bandsConfig.bands) {
    if (band.maxMs === null || latencyMs <= band.maxMs) {
      return band.id;
    }
  }
  return bandsConfig.bands[bandsConfig.bands.length - 1].id;
}
