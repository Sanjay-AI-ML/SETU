import { createVisionDetector } from './capture.js';

let detector = null;

export function getVisionDetector() {
  if (!detector) {
    detector = createVisionDetector();
  }
  return detector;
}

export function hasActiveVisionSession() {
  return detector !== null;
}

export function resetVisionSession() {
  detector?.stop();
  detector = null;
}
