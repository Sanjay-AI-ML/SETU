import { computeRmsEnergy, shouldTriggerOnset } from './onset.js';

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
