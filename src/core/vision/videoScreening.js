// Aggregates the frame-by-frame signals produced while running the on-device
// MediaPipe pipeline over an uploaded/recorded video into a plain-language,
// rule-based summary. Deliberately not tied to a scripted activity's Matrix
// rules — a standalone clip has no "serve" prompt to interpret responses
// against, so this reports raw observational ratios instead of Matrix cells.

export function summarizeFrames(frameSamples) {
  const totalFrames = frameSamples.length;
  if (totalFrames === 0) {
    return { totalFrames: 0, faceDetectedRatio: 0, gazeToCameraRatio: 0, smileRatio: 0, handMotionEvents: 0 };
  }

  const faceDetectedCount = frameSamples.filter((f) => f.facing !== null).length;
  const gazeToCameraCount = frameSamples.filter((f) => f.facing === 'camera').length;
  const smileCount = frameSamples.filter((f) => f.smiling).length;
  const handMotionEvents = frameSamples.filter((f) => f.motionDirection !== null).length;

  return {
    totalFrames,
    faceDetectedRatio: faceDetectedCount / totalFrames,
    gazeToCameraRatio: gazeToCameraCount / totalFrames,
    smileRatio: smileCount / totalFrames,
    handMotionEvents,
  };
}

const LOW_FACE_VISIBILITY_THRESHOLD = 0.15;
const ENGAGED_GAZE_THRESHOLD = 0.3;

export function interpretSummary(summary) {
  if (summary.totalFrames === 0) {
    return { label: 'no-data', message: 'No frames were analysed — try a longer or clearer clip.' };
  }

  if (summary.faceDetectedRatio < LOW_FACE_VISIBILITY_THRESHOLD) {
    return {
      label: 'low-face-visibility',
      message: "The child's face wasn't clearly visible for most of the clip. Try recording with better lighting and the camera facing the child directly.",
    };
  }

  if (summary.gazeToCameraRatio >= ENGAGED_GAZE_THRESHOLD) {
    return {
      label: 'engaged',
      message: 'The child oriented toward the camera/caller for a notable portion of the clip — a positive social-engagement signal.',
    };
  }

  return {
    label: 'limited-engagement',
    message: 'The child oriented toward the camera/caller only briefly during the clip. This alone is not conclusive — consider this alongside the guided activities.',
  };
}

// Vocalization-presence signal from the clip's own audio track — a coarse
// "was there vocal activity here" energy check, not sound classification.
// See core/audio/vocalizationLevel.js for why this stops short of
// differentiating what kind of sound it was.

export function summarizeVocalization(vocalizingFlags) {
  const totalSamples = vocalizingFlags.length;
  if (totalSamples === 0) {
    return { totalSamples: 0, vocalizingRatio: 0, vocalizationEvents: 0 };
  }

  const vocalizingCount = vocalizingFlags.filter(Boolean).length;
  let vocalizationEvents = 0;
  for (let i = 0; i < vocalizingFlags.length; i++) {
    if (vocalizingFlags[i] && !vocalizingFlags[i - 1]) vocalizationEvents++;
  }

  return {
    totalSamples,
    vocalizingRatio: vocalizingCount / totalSamples,
    vocalizationEvents,
  };
}

export function interpretVocalization(summary) {
  if (summary.totalSamples === 0) {
    return { label: 'no-data', message: 'No audio was analysed for this clip.' };
  }
  if (summary.vocalizationEvents === 0) {
    return { label: 'no-vocalization', message: 'No vocalization activity was detected during the clip.' };
  }
  return {
    label: 'vocalization-detected',
    message: `Vocalization activity detected in ${(summary.vocalizingRatio * 100).toFixed(0)}% of the clip, across ${summary.vocalizationEvents} distinct moment(s). This flags that sound happened, not what kind of sound it was.`,
  };
}
