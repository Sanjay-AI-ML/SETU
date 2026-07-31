// NOTE: computeRmsEnergy/shouldTriggerOnset are intentionally duplicated
// here rather than imported from './onset.js'. AudioWorkletGlobalScope
// loads this file via audioContext.audioWorklet.addModule(), which in a
// production (Vite-built) bundle may serve this script from a `data:`
// URL or a standalone emitted asset — neither of which can reliably
// resolve a relative import back to './onset.js'. Duplicating the (tiny,
// pure) logic here makes this worklet fully self-contained regardless of
// how the build pipeline packages it. The canonical, tested versions of
// these functions live in './onset.js' and are used everywhere else
// (capture.js, tests) — keep both copies in sync if the algorithm changes.
function computeRmsEnergy(samples) {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

function shouldTriggerOnset({ rms, noiseFloor, thresholdMultiplier, elapsedMsSinceArm, listenDelayMs }) {
  if (elapsedMsSinceArm < listenDelayMs) return false;
  return rms > noiseFloor * thresholdMultiplier;
}

const DEFAULT_THRESHOLD_MULTIPLIER = 3;
const DEFAULT_LISTEN_DELAY_MS = 300;

class OnsetProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options?.processorOptions ?? {};
    this.noiseFloor = processorOptions.noiseFloor ?? 0;
    this.thresholdMultiplier = processorOptions.thresholdMultiplier ?? DEFAULT_THRESHOLD_MULTIPLIER;
    this.listenDelayMs = processorOptions.listenDelayMs ?? DEFAULT_LISTEN_DELAY_MS;
    this.armed = false;
    this.armTimeMs = null;
    this.triggered = false;

    this.port.onmessage = (event) => {
      if (event.data.type === 'arm') {
        this.armed = true;
        this.armTimeMs = currentTime * 1000;
        this.triggered = false;
      } else if (event.data.type === 'disarm') {
        this.armed = false;
        this.armTimeMs = null;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!this.armed || this.triggered || !input || input.length === 0) {
      return true;
    }

    const channelData = input[0];
    const rms = computeRmsEnergy(channelData);
    const nowMs = currentTime * 1000;
    const elapsedMsSinceArm = nowMs - this.armTimeMs;

    if (
      shouldTriggerOnset({
        rms,
        noiseFloor: this.noiseFloor,
        thresholdMultiplier: this.thresholdMultiplier,
        elapsedMsSinceArm,
        listenDelayMs: this.listenDelayMs,
      })
    ) {
      this.triggered = true;
      this.port.postMessage({ type: 'onset', time: currentTime });
    }

    return true;
  }
}

registerProcessor('onset-processor', OnsetProcessor);
