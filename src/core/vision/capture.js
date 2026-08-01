// src/core/vision/capture.js
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import { classifyHeadOrientation, classifySmile, classifyHandPose, classifyMotion } from './gesture.js';

let faceLandmarker = null;
let handLandmarker = null;

async function loadModels() {
  const filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
    runningMode: 'VIDEO',
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
  handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: '/models/hand_landmarker.task' },
    runningMode: 'VIDEO',
    numHands: 1,
  });
}

// Best-effort yaw extraction from a 16-element column-major 4x4 rotation
// matrix (MediaPipe's facialTransformationMatrixes[0].data). Unverified
// against a real face — see the Phase 4 design spec's "Known limitation".
function extractYawDeg(matrixData) {
  const m02 = matrixData[8];
  const m22 = matrixData[10];
  return Math.atan2(m02, m22) * (180 / Math.PI);
}

export function createVisionDetector() {
  let stream = null;
  let videoEl = null;
  let onFrame = null;
  let rafId = null;
  let lastVideoTime = -1;
  let prevHandLandmarks = null;
  // Generation token, not a boolean: a boolean "stopped" flag gets reset by
  // the very next start() call, so a stop() sandwiched between two start()
  // calls (React StrictMode's dev-only double-invoke of mount effects) can't
  // tell "cancelled" apart from "never started" — the first start() resumes
  // from its await thinking it's still current and races the second start().
  // Each start() captures the generation at call time and checks it's still
  // current after every await; stop() bumps it, permanently invalidating any
  // in-flight start() no matter how many started before the next one.
  let generation = 0;

  async function start(videoElement, onFrameCallback, facingMode = 'environment') {
    const myGeneration = ++generation;
    if (!faceLandmarker || !handLandmarker) {
      await loadModels();
    }
    if (myGeneration !== generation) return;

    // Bare (non-exact) facingMode is an "ideal" constraint per spec: the
    // browser picks the closest match instead of rejecting the request, so
    // this stays safe on devices with only one camera (e.g. a laptop webcam
    // during browser testing).
    const acquiredStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
    if (myGeneration !== generation) {
      acquiredStream.getTracks().forEach((track) => track.stop());
      return;
    }

    // Stay on locally-scoped handles through every remaining await — never
    // write to the shared stream/videoEl/onFrame until this generation is
    // confirmed still current, otherwise a stale call resuming here after a
    // newer start() has already taken over would stop/null the NEWER
    // generation's live stream and element instead of its own.
    videoElement.srcObject = acquiredStream;
    await videoElement.play();
    if (myGeneration !== generation) {
      acquiredStream.getTracks().forEach((track) => track.stop());
      return;
    }

    stream = acquiredStream;
    videoEl = videoElement;
    onFrame = onFrameCallback;
    lastVideoTime = -1;
    prevHandLandmarks = null;
    loop();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!videoEl || videoEl.currentTime === lastVideoTime) return;
    lastVideoTime = videoEl.currentTime;
    const now = performance.now();

    const faceResult = faceLandmarker.detectForVideo(videoEl, now);
    const handResult = handLandmarker.detectForVideo(videoEl, now);

    let facing = null;
    let smiling = false;
    if (faceResult.facialTransformationMatrixes?.length) {
      const yawDeg = extractYawDeg(faceResult.facialTransformationMatrixes[0].data);
      facing = classifyHeadOrientation(yawDeg).facing;
    }
    if (faceResult.faceBlendshapes?.length) {
      smiling = classifySmile(faceResult.faceBlendshapes[0].categories);
    }

    let handPose = 'neutral';
    let motionDirection = null;
    if (handResult.landmarks?.length) {
      const currentHandLandmarks = handResult.landmarks[0];
      handPose = classifyHandPose(currentHandLandmarks);
      if (prevHandLandmarks) {
        motionDirection = classifyMotion(prevHandLandmarks, currentHandLandmarks).direction;
      }
      prevHandLandmarks = currentHandLandmarks;
    } else {
      prevHandLandmarks = null;
    }

    onFrame({ facing, smiling, handPose, motionDirection });
  }

  function stop() {
    generation++;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    videoEl = null;
    onFrame = null;
    prevHandLandmarks = null;
  }

  return { start, stop };
}
