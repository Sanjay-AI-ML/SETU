import { createOnsetDetector as createCaptureDetector } from './capture.js';

let audioContext = null;
let detector = null;

export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function getDetector() {
  if (!detector) {
    detector = createCaptureDetector(getAudioContext());
  }
  return detector;
}

export function resetAudioSession() {
  detector?.release();
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }
  audioContext = null;
  detector = null;
}
