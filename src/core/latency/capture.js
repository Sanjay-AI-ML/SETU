import { computeRmsEnergy, calibrateNoiseFloor } from './onset.js';

export function createOnsetDetector(audioContext) {
  let stream = null;
  let sourceNode = null;
  let workletNode = null;

  async function calibrate(durationMs) {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sourceNode = audioContext.createMediaStreamSource(stream);

    const workletUrl = new URL('./onset-processor.worklet.js', import.meta.url);
    await audioContext.audioWorklet.addModule(workletUrl);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    const startedAt = audioContext.currentTime;
    const rmsBlocks = [];

    await new Promise((resolve) => {
      function sampleBlock() {
        analyser.getFloatTimeDomainData(buffer);
        rmsBlocks.push(computeRmsEnergy(buffer));

        if ((audioContext.currentTime - startedAt) * 1000 >= durationMs) {
          resolve();
        } else {
          requestAnimationFrame(sampleBlock);
        }
      }
      sampleBlock();
    });

    sourceNode.disconnect(analyser);
    const noiseFloor = calibrateNoiseFloor(rmsBlocks);

    workletNode = new AudioWorkletNode(audioContext, 'onset-processor', {
      processorOptions: { noiseFloor },
    });
    sourceNode.connect(workletNode);
    workletNode.connect(audioContext.destination);

    return noiseFloor;
  }

  function arm(onDetected) {
    if (!workletNode) return;
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'onset') {
        onDetected(event.data.time);
      }
    };
    workletNode.port.postMessage({ type: 'arm' });
  }

  function disarm() {
    if (!workletNode) return;
    workletNode.port.postMessage({ type: 'disarm' });
    workletNode.port.onmessage = null;
  }

  function release() {
    disarm();
    workletNode?.disconnect();
    sourceNode?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
  }

  return { calibrate, arm, disarm, release };
}
