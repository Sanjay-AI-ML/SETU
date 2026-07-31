# Phase 4 — Vision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MediaPipe face/hand landmark detection as a second, parent-confirmable observation channel during activity runs, per `docs/superpowers/specs/2026-08-01-phase4-vision-design.md`.

**Architecture:** Pure, TDD'd classifiers in `core/vision/gesture.js` and `core/vision/observationMapper.js` turn plain-shape MediaPipe output into activity-specific observation codes. An untested `core/vision/capture.js` adapter (mirrors Phase 2's audio `capture.js`) owns the actual `getUserMedia`/MediaPipe/`requestAnimationFrame` wiring and converts raw MediaPipe results into the plain shapes the pure layer expects. `visionSession.js` is a singleton holder, same pattern as `audioSession.js`. Three route files get wired: Prebrief (combined permission request), Run (live preview + continuous inference + accumulation), Review (pre-checked suggestions + provenance tagging).

**Tech Stack:** `@mediapipe/tasks-vision` (already installed), React 18/19, Vitest.

## Global Constraints

- `core/` stays zero-React, pure-logic-only, fully tested (project's hard architectural rule).
- All Web Audio timing stays on `AudioContext.currentTime`, never `Date.now()` — unaffected by this plan, called out because `ActivityRunPage.jsx` is shared with the audio design and must not regress it.
- React Rules of Hooks: guards/early-returns after all hook calls — established pattern in every route file touched here.
- React StrictMode double-invoke safety: teardown happens at business-logic endpoints (end of activity / explicit abandonment), never bare effect cleanup — same reasoning as `audioSession.js`, applied identically to `visionSession.js`.
- MediaPipe models/WASM runtime load from local `public/` paths only, never a CDN (offline requirement) — **already vendored this session**, verify presence, don't re-fetch.
- Vision only ever contributes to *visually*-observable codes (see mapping table in the spec) — never touches verbal/vocal codes.

**Assets already vendored (verify in Task 1, do not re-fetch):**
- `public/models/face_landmarker.task` (3,758,596 bytes)
- `public/models/hand_landmarker.task` (7,819,105 bytes)
- `public/mediapipe/wasm/` (copied from `node_modules/@mediapipe/tasks-vision/wasm/`, 6 files)
- `@mediapipe/tasks-vision` in `package.json` dependencies

---

### Task 1: Vendored-asset verification + `gesture.js` — head orientation and smile classifiers

**Files:**
- Create: `src/core/vision/gesture.js`
- Test: `src/core/vision/gesture.test.js`

**Interfaces:**
- Produces: `classifyHeadOrientation(yawDeg: number) → { facing: 'camera' | 'away' | null, yawDeg: number }`
- Produces: `classifySmile(categories: Array<{categoryName: string, score: number}>) → boolean`

- [ ] **Step 1: Verify vendored assets are present**

Run: `ls -la public/models/ public/mediapipe/wasm/` (or `Get-ChildItem` if on PowerShell)
Expected: `public/models/face_landmarker.task` (~3.6M), `public/models/hand_landmarker.task` (~7.5M), and 6 files under `public/mediapipe/wasm/` (`vision_wasm_internal.js/.wasm`, `vision_wasm_module_internal.js/.wasm`, `vision_wasm_nosimd_internal.js/.wasm`). If any are missing, STOP and report back — do not attempt to re-fetch them yourself (this task has no network access in this environment for binary downloads).

- [ ] **Step 2: Write the failing tests**

```js
// src/core/vision/gesture.test.js
import { describe, it, expect } from 'vitest';
import { classifyHeadOrientation, classifySmile } from './gesture.js';

describe('classifyHeadOrientation', () => {
  it('classifies small yaw as facing camera', () => {
    expect(classifyHeadOrientation(0)).toEqual({ facing: 'camera', yawDeg: 0 });
    expect(classifyHeadOrientation(15)).toEqual({ facing: 'camera', yawDeg: 15 });
  });

  it('classifies yaw exactly at the camera threshold as facing camera', () => {
    expect(classifyHeadOrientation(20)).toEqual({ facing: 'camera', yawDeg: 20 });
  });

  it('classifies mid-range yaw as ambiguous (null)', () => {
    expect(classifyHeadOrientation(25).facing).toBe(null);
  });

  it('classifies large yaw as away, threshold inclusive', () => {
    expect(classifyHeadOrientation(35).facing).toBe('away');
    expect(classifyHeadOrientation(-40).facing).toBe('away');
  });
});

describe('classifySmile', () => {
  it('returns true when average smile blendshape score is above threshold', () => {
    const categories = [
      { categoryName: 'mouthSmileLeft', score: 0.6 },
      { categoryName: 'mouthSmileRight', score: 0.7 },
    ];
    expect(classifySmile(categories)).toBe(true);
  });

  it('returns false when average score is below threshold', () => {
    const categories = [
      { categoryName: 'mouthSmileLeft', score: 0.3 },
      { categoryName: 'mouthSmileRight', score: 0.2 },
    ];
    expect(classifySmile(categories)).toBe(false);
  });

  it('returns false when the categories are missing entirely', () => {
    expect(classifySmile([])).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run src/core/vision/gesture.test.js`
Expected: FAIL with "Failed to resolve import" or "does not provide an export" (file doesn't exist yet)

- [ ] **Step 4: Write the implementation**

```js
// src/core/vision/gesture.js
const FACE_CAMERA_THRESHOLD_DEG = 20;
const HEAD_TURN_THRESHOLD_DEG = 35;
const SMILE_THRESHOLD = 0.5;

export function classifyHeadOrientation(yawDeg) {
  const absYaw = Math.abs(yawDeg);
  if (absYaw <= FACE_CAMERA_THRESHOLD_DEG) return { facing: 'camera', yawDeg };
  if (absYaw >= HEAD_TURN_THRESHOLD_DEG) return { facing: 'away', yawDeg };
  return { facing: null, yawDeg };
}

function findScore(categories, name) {
  const found = categories.find((c) => c.categoryName === name);
  return found ? found.score : 0;
}

export function classifySmile(categories) {
  const left = findScore(categories, 'mouthSmileLeft');
  const right = findScore(categories, 'mouthSmileRight');
  return (left + right) / 2 > SMILE_THRESHOLD;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/core/vision/gesture.test.js`
Expected: PASS, 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/core/vision/gesture.js src/core/vision/gesture.test.js
git commit -m "feat: add head-orientation and smile vision classifiers"
```

---

### Task 2: `gesture.js` — hand pose and motion classifiers

**Files:**
- Modify: `src/core/vision/gesture.js`
- Modify: `src/core/vision/gesture.test.js`

**Interfaces:**
- Consumes: nothing from Task 1's exports directly (independent classifiers in the same file)
- Produces: `classifyHandPose(landmarks: Array<{x: number, y: number}>) → 'point' | 'open' | 'neutral'` (landmarks is a 21-element array, MediaPipe hand-landmark index order: 0=wrist, 6/8=index PIP/tip, 10/12=middle PIP/tip, 14/16=ring PIP/tip, 18/20=pinky PIP/tip)
- Produces: `classifyMotion(prevLandmarks: Array<{x: number, y: number}>, currLandmarks: Array<{x: number, y: number}>) → { direction: 'toward' | 'away' | null, magnitude: number }`

- [ ] **Step 1: Write the failing tests**

```js
// append to src/core/vision/gesture.test.js
import { classifyHandPose, classifyMotion } from './gesture.js';

function makeLandmarks(overrides) {
  const base = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  return base.map((point, i) => (overrides[i] ? { ...point, ...overrides[i] } : point));
}

describe('classifyHandPose', () => {
  it('classifies index-extended, others-curled as point', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },   // wrist
      6: { x: 0.5, y: 0.6 },   // index PIP
      8: { x: 0.5, y: 0.3 },   // index tip (far from wrist)
      10: { x: 0.52, y: 0.62 }, // middle PIP
      12: { x: 0.55, y: 0.65 }, // middle tip (close to PIP)
      14: { x: 0.48, y: 0.62 }, // ring PIP
      16: { x: 0.45, y: 0.65 }, // ring tip (close to PIP)
      18: { x: 0.46, y: 0.63 }, // pinky PIP
      20: { x: 0.44, y: 0.66 }, // pinky tip (close to PIP)
    });
    expect(classifyHandPose(landmarks)).toBe('point');
  });

  it('classifies all-fingers-extended as open', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },
      6: { x: 0.5, y: 0.6 }, 8: { x: 0.5, y: 0.3 },
      10: { x: 0.52, y: 0.6 }, 12: { x: 0.52, y: 0.3 },
      14: { x: 0.48, y: 0.6 }, 16: { x: 0.48, y: 0.3 },
      18: { x: 0.46, y: 0.6 }, 20: { x: 0.46, y: 0.3 },
    });
    expect(classifyHandPose(landmarks)).toBe('open');
  });

  it('classifies a closed fist as neutral', () => {
    const landmarks = makeLandmarks({
      0: { x: 0.5, y: 0.9 },
      6: { x: 0.5, y: 0.8 }, 8: { x: 0.5, y: 0.82 },
      10: { x: 0.5, y: 0.8 }, 12: { x: 0.5, y: 0.82 },
      14: { x: 0.5, y: 0.8 }, 16: { x: 0.5, y: 0.82 },
      18: { x: 0.5, y: 0.8 }, 20: { x: 0.5, y: 0.82 },
    });
    expect(classifyHandPose(landmarks)).toBe('neutral');
  });
});

describe('classifyMotion', () => {
  it('classifies a hand moving toward the frame center as toward', () => {
    const prev = makeLandmarks({ 0: { x: 0.1, y: 0.1 } });
    const curr = makeLandmarks({ 0: { x: 0.45, y: 0.45 } });
    expect(classifyMotion(prev, curr).direction).toBe('toward');
  });

  it('classifies a hand moving away from the frame center as away', () => {
    const prev = makeLandmarks({ 0: { x: 0.5, y: 0.5 } });
    const curr = makeLandmarks({ 0: { x: 0.1, y: 0.1 } });
    expect(classifyMotion(prev, curr).direction).toBe('away');
  });

  it('classifies negligible movement as null direction', () => {
    const prev = makeLandmarks({ 0: { x: 0.5, y: 0.5 } });
    const curr = makeLandmarks({ 0: { x: 0.501, y: 0.5 } });
    expect(classifyMotion(prev, curr).direction).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/core/vision/gesture.test.js`
Expected: FAIL with "classifyHandPose is not a function" / "classifyMotion is not a function"

- [ ] **Step 3: Write the implementation**

```js
// append to src/core/vision/gesture.js
const WRIST = 0;
const INDEX_PIP = 6, INDEX_TIP = 8;
const MIDDLE_PIP = 10, MIDDLE_TIP = 12;
const RING_PIP = 14, RING_TIP = 16;
const PINKY_PIP = 18, PINKY_TIP = 20;
const EXTENSION_RATIO = 1.2;
const MOTION_THRESHOLD = 0.02;
const FRAME_CENTER = { x: 0.5, y: 0.5 };

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isExtended(landmarks, tipIndex, pipIndex) {
  const wrist = landmarks[WRIST];
  return dist(wrist, landmarks[tipIndex]) > dist(wrist, landmarks[pipIndex]) * EXTENSION_RATIO;
}

export function classifyHandPose(landmarks) {
  const indexExtended = isExtended(landmarks, INDEX_TIP, INDEX_PIP);
  const middleExtended = isExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
  const ringExtended = isExtended(landmarks, RING_TIP, RING_PIP);
  const pinkyExtended = isExtended(landmarks, PINKY_TIP, PINKY_PIP);

  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'point';
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) return 'open';
  return 'neutral';
}

function centroid(landmarks) {
  const sum = landmarks.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / landmarks.length, y: sum.y / landmarks.length };
}

export function classifyMotion(prevLandmarks, currLandmarks) {
  const prevDistFromCenter = dist(centroid(prevLandmarks), FRAME_CENTER);
  const currDistFromCenter = dist(centroid(currLandmarks), FRAME_CENTER);
  const delta = currDistFromCenter - prevDistFromCenter;
  const magnitude = Math.abs(delta);
  if (magnitude < MOTION_THRESHOLD) return { direction: null, magnitude };
  return { direction: delta < 0 ? 'toward' : 'away', magnitude };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/core/vision/gesture.test.js`
Expected: PASS, 13 tests total (7 from Task 1 + 6 new)

- [ ] **Step 5: Commit**

```bash
git add src/core/vision/gesture.js src/core/vision/gesture.test.js
git commit -m "feat: add hand-pose and motion vision classifiers"
```

---

### Task 3: `observationMapper.js`

**Files:**
- Create: `src/core/vision/observationMapper.js`
- Test: `src/core/vision/observationMapper.test.js`

**Interfaces:**
- Consumes: nothing directly (takes plain classifier outputs as input, doesn't import `gesture.js`)
- Produces: `mapObservations({ activityId: string, facing: 'camera'|'away'|null, smiling: boolean, handPose: 'point'|'open'|'neutral', motionDirection: 'toward'|'away'|null }) → string[]` (array of observation codes, deduped, restricted to the mapping table below)

Mapping table (from the design spec — hardcode exactly this, do not derive from `activities.json`):

| activityId | codes |
|---|---|
| `bubble-time` | `reach` (handPose 'open' AND motionDirection 'toward'), `point` (handPose 'point') |
| `peek-a-boo` | `gaze-to-face` (facing 'camera'), `smile` (smiling true) |
| `not-this-one` | `head-turn` (facing 'away'), `push-away` (handPose 'open' AND motionDirection 'away') |
| `whats-in-the-box` | `point` (handPose 'point'), `show` (handPose 'open') |

- [ ] **Step 1: Write the failing tests**

```js
// src/core/vision/observationMapper.test.js
import { describe, it, expect } from 'vitest';
import { mapObservations } from './observationMapper.js';

describe('mapObservations', () => {
  it('maps bubble-time reach and point', () => {
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'open', motionDirection: 'toward' })).toEqual(['reach']);
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'point' })).toEqual(['point']);
  });

  it('maps peek-a-boo gaze-to-face and smile', () => {
    expect(mapObservations({ activityId: 'peek-a-boo', facing: 'camera' })).toEqual(['gaze-to-face']);
    expect(mapObservations({ activityId: 'peek-a-boo', smiling: true })).toEqual(['smile']);
    expect(mapObservations({ activityId: 'peek-a-boo', facing: 'camera', smiling: true })).toEqual(['gaze-to-face', 'smile']);
  });

  it('maps not-this-one head-turn and push-away', () => {
    expect(mapObservations({ activityId: 'not-this-one', facing: 'away' })).toEqual(['head-turn']);
    expect(mapObservations({ activityId: 'not-this-one', handPose: 'open', motionDirection: 'away' })).toEqual(['push-away']);
  });

  it('maps whats-in-the-box point and show', () => {
    expect(mapObservations({ activityId: 'whats-in-the-box', handPose: 'point' })).toEqual(['point']);
    expect(mapObservations({ activityId: 'whats-in-the-box', handPose: 'open' })).toEqual(['show']);
  });

  it('returns an empty array when nothing crosses a threshold', () => {
    expect(mapObservations({ activityId: 'bubble-time', handPose: 'neutral', facing: null, smiling: false, motionDirection: null })).toEqual([]);
  });

  it('returns an empty array for an unknown activityId', () => {
    expect(mapObservations({ activityId: 'not-a-real-activity', facing: 'camera' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/core/vision/observationMapper.test.js`
Expected: FAIL, module doesn't exist

- [ ] **Step 3: Write the implementation**

```js
// src/core/vision/observationMapper.js
export function mapObservations({ activityId, facing = null, smiling = false, handPose = 'neutral', motionDirection = null }) {
  const codes = [];

  if (activityId === 'bubble-time') {
    if (handPose === 'open' && motionDirection === 'toward') codes.push('reach');
    if (handPose === 'point') codes.push('point');
  } else if (activityId === 'peek-a-boo') {
    if (facing === 'camera') codes.push('gaze-to-face');
    if (smiling) codes.push('smile');
  } else if (activityId === 'not-this-one') {
    if (facing === 'away') codes.push('head-turn');
    if (handPose === 'open' && motionDirection === 'away') codes.push('push-away');
  } else if (activityId === 'whats-in-the-box') {
    if (handPose === 'point') codes.push('point');
    if (handPose === 'open') codes.push('show');
  }

  return codes;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/core/vision/observationMapper.test.js`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/core/vision/observationMapper.js src/core/vision/observationMapper.test.js
git commit -m "feat: add vision observationMapper (classifier outputs to observation codes)"
```

---

### Task 4: `visionSession.js`

**Files:**
- Create: `src/core/vision/visionSession.js`

**Interfaces:**
- Consumes: `createVisionDetector` from `./capture.js` (does not exist yet — Task 5 creates it; this task references it by name/shape only, matching the plan's declared interface below)
- Produces: `getVisionDetector() → { start(videoEl, onFrame), stop() }`, `hasActiveVisionSession() → boolean`, `resetVisionSession() → void`

This file is a thin singleton wrapper, same shape as `src/core/latency/audioSession.js`. It is not unit-tested (that file isn't either — it's trivial wiring around an untestable browser-API adapter).

- [ ] **Step 1: Write the implementation**

```js
// src/core/vision/visionSession.js
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
```

- [ ] **Step 2: Verify the project still builds (this file has no runtime effect yet since nothing imports it)**

Run: `npm test -- --run`
Expected: PASS, same test count as before this task (no new tests, nothing broken)

- [ ] **Step 3: Commit**

```bash
git add src/core/vision/visionSession.js
git commit -m "feat: add vision singleton session holder"
```

---

### Task 5: `capture.js` — the MediaPipe/camera adapter

**Files:**
- Create: `src/core/vision/capture.js`

**Interfaces:**
- Consumes: `classifyHeadOrientation`, `classifySmile`, `classifyHandPose`, `classifyMotion` from `./gesture.js` (Tasks 1-2); `@mediapipe/tasks-vision`'s `FilesetResolver`, `FaceLandmarker`, `HandLandmarker`
- Produces: `createVisionDetector() → { start(videoEl: HTMLVideoElement, onFrame: (signals) => void) → Promise<void>, stop() → void }`, where `signals` is `{ facing: 'camera'|'away'|null, smiling: boolean, handPose: 'point'|'open'|'neutral', motionDirection: 'toward'|'away'|null }` — exactly the shape `mapObservations` (Task 3) expects.

This file is **untested by design** — it needs real `getUserMedia`, real MediaPipe WASM, and a real `<video>` element, none available under Vitest/jsdom. Same precedent as `src/core/latency/capture.js` from Phase 2. The yaw-angle extraction from MediaPipe's `facialTransformationMatrixes[0].data` (a 16-element column-major 4×4 matrix) is a best-effort formula that cannot be verified against a real face from this environment — this is the single most likely thing to need retuning after a real on-device test, exactly as flagged in the design spec's "Known limitation" section.

- [ ] **Step 1: Write the implementation**

```js
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

  async function start(videoElement, onFrameCallback) {
    if (!faceLandmarker || !handLandmarker) {
      await loadModels();
    }
    videoEl = videoElement;
    onFrame = onFrameCallback;
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoEl.srcObject = stream;
    await videoEl.play();
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
```

- [ ] **Step 2: Verify the full suite still passes (no new tests, but confirm this file's imports resolve and nothing else broke)**

Run: `npm test -- --run`
Expected: PASS, same test count as Task 4 (20 tests: 13 from gesture.js + 7 from observationMapper.js)

- [ ] **Step 3: Verify the production build still succeeds and treats the new public/ assets correctly**

Run: `npm run build`
Expected: clean build. Check `dist/models/face_landmarker.task` and `dist/mediapipe/wasm/vision_wasm_internal.wasm` exist and are the same byte sizes as the `public/` originals (Vite copies `public/` verbatim — this confirms it, and guards against a repeat of Phase 2's C1 bug where a similar-looking asset got silently inlined/broken in production builds).

- [ ] **Step 4: Commit**

```bash
git add src/core/vision/capture.js
git commit -m "feat: add MediaPipe camera capture adapter"
```

---

### Task 6: `ActivityPrebriefPage.jsx` — combined audio+video permission request

**Files:**
- Modify: `src/routes/ActivityPrebriefPage.jsx` (full current content shown below — replace entirely)

**Interfaces:**
- Consumes: nothing new from `core/vision/` in this file (permission-only; model loading is lazy inside `capture.js`'s `start()`, called later from `ActivityRunPage.jsx` in Task 7)
- Produces: navigates to `/session/activity/run` with `{ state: { audioAvailable, visionAvailable } }` — Task 7 consumes both flags

Current file content (for reference — this task replaces it):

```js
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import strings from '../i18n/en.json';

const CALIBRATION_MS = 1500;
const CALIBRATION_TIMEOUT_MS = 8000;

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();
  const [calibrating, setCalibrating] = useState(false);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const currentActivity = activities[session.activityRuns.length];
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  async function handleStart() {
    setCalibrating(true);
    let audioAvailable = true;
    try {
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      await Promise.race([
        getDetector().calibrate(CALIBRATION_MS),
        new Promise((_, reject) => setTimeout(() => reject(new Error('calibration-timeout')), CALIBRATION_TIMEOUT_MS)),
      ]);
    } catch (error) {
      audioAvailable = false;
    } finally {
      setCalibrating(false);
    }

    navigate('/session/activity/run', { state: { audioAvailable } });
  }

  return (
    <main>
      <h1>{currentActivity.name}</h1>
      <p>{currentActivity.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {currentActivity.materials.map((material) => (
          <li key={material}>{material}</li>
        ))}
      </ul>
      {calibrating && <p>{strings.activityPrebrief.calibratingLabel}</p>}
      <button onClick={handleStart} disabled={calibrating}>
        {strings.activityPrebrief.startButton}
      </button>
    </main>
  );
}
```

Why the permission flow is structured this way: a single `getUserMedia({audio: true, video: true})` call gives one native OS prompt covering both streams, but Chrome rejects the *entire* call if the user denies just one of the two — so on rejection we fall back to two independent single-stream requests to figure out which one (if either) is actually available. Either request only needs to prove the browser will grant a stream; we stop the tracks immediately since we don't need the stream itself here (the audio detector's own `calibrate()` and the vision detector's own `start()`, called later, will each open their own stream — once permission is granted for an origin, those later calls resolve silently with no second prompt).

- [ ] **Step 1: Write the new implementation**

```js
// src/routes/ActivityPrebriefPage.jsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import strings from '../i18n/en.json';

const CALIBRATION_MS = 1500;
const CALIBRATION_TIMEOUT_MS = 8000;

async function tryGetUserMedia(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

async function requestMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { audioAvailable: true, visionAvailable: true };
  } catch {
    const audioAvailable = await tryGetUserMedia({ audio: true });
    const visionAvailable = await tryGetUserMedia({ video: true });
    return { audioAvailable, visionAvailable };
  }
}

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();
  const [calibrating, setCalibrating] = useState(false);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const currentActivity = activities[session.activityRuns.length];
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  async function handleStart() {
    setCalibrating(true);
    const { audioAvailable: mediaAudioAvailable, visionAvailable } = await requestMediaPermissions();

    let audioAvailable = mediaAudioAvailable;
    if (audioAvailable) {
      try {
        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        await Promise.race([
          getDetector().calibrate(CALIBRATION_MS),
          new Promise((_, reject) => setTimeout(() => reject(new Error('calibration-timeout')), CALIBRATION_TIMEOUT_MS)),
        ]);
      } catch (error) {
        audioAvailable = false;
      }
    }

    setCalibrating(false);
    navigate('/session/activity/run', { state: { audioAvailable, visionAvailable } });
  }

  return (
    <main>
      <h1>{currentActivity.name}</h1>
      <p>{currentActivity.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {currentActivity.materials.map((material) => (
          <li key={material}>{material}</li>
        ))}
      </ul>
      {calibrating && <p>{strings.activityPrebrief.calibratingLabel}</p>}
      <button onClick={handleStart} disabled={calibrating}>
        {strings.activityPrebrief.startButton}
      </button>
    </main>
  );
}
```

Note: `audioAvailable` now starts from `requestMediaPermissions()`'s result rather than always starting `true` — if the browser denies mic access outright, we skip the calibration attempt entirely instead of letting it fail into the same state (behavior is equivalent either way, this is just avoiding a pointless doomed `calibrate()` call).

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS, same 47 pre-existing tests still passing (this file isn't covered by `core/` unit tests — route components aren't unit tested in this project, verified by browser walkthrough instead, same as every other route change this project has made)

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityPrebriefPage.jsx
git commit -m "feat: request combined audio+video permission at Activity Prebrief"
```

---

### Task 7: `ActivityRunPage.jsx` — live preview, continuous inference, accumulation

**Files:**
- Modify: `src/routes/ActivityRunPage.jsx` (current full content shown in the plan header context above — see Task 6's "why" note for the shared file-reading approach; full current content was read this session and is reproduced in full below for the implementer's reference)

**Interfaces:**
- Consumes: `getVisionDetector`, `hasActiveVisionSession`, `resetVisionSession` from `../core/vision/visionSession.js` (Task 4); `mapObservations` from `../core/vision/observationMapper.js` (Task 3)
- Produces: navigates to `/session/activity/review` with `{ state: { visionSuggestedCodes: string[] } }` — Task 8 consumes this

Current file content (full, current `main` state — this task modifies it in place, all existing audio logic must survive unchanged):

```js
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, hasActiveSession, resetAudioSession } from '../core/latency/audioSession.js';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

function playServeTone(audioContext) {
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 660;
  oscillator.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
}

export default function ActivityRunPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useSessionDispatch();
  const { session } = useSessionState();
  const audioAvailable = Boolean(location.state?.audioAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  const currentActivity = session ? activities[session.activityRuns.length] : null;

  useEffect(() => {
    if (!currentActivity) return;
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: currentActivity.id });
    audioContextRef.current = getAudioContext();
    // currentActivity intentionally omitted: this must run exactly once per
    // page mount (one activity run per visit to this route), the same reason
    // the audio-session mount effect below has no cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (audioAvailable && hasActiveSession()) {
        getDetector().disarm();
      }
    };
  }, [audioAvailable]);

  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  async function handleServe() {
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    playServeTone(audioContext);
    const serveAt = markTime(audioContext);
    setPendingServeAt(serveAt);
    setPhase('waiting');
    recordedRef.current = false;

    if (audioAvailable) {
      getDetector().arm((detectedAt) => {
        recordTrial({ responded: true, source: 'audio-onset', returnAt: detectedAt, serveAt });
      });
    }
  }

  function recordTrial({ responded, source, returnAt: providedReturnAt, serveAt: providedServeAt }) {
    if (recordedRef.current) return;
    recordedRef.current = true;
    if (audioAvailable) {
      getDetector().disarm();
    }

    const audioContext = audioContextRef.current;
    const serveAt = providedServeAt ?? pendingServeAt;
    const returnAt = responded ? (providedReturnAt ?? markTime(audioContext)) : null;
    const latencyMs = responded ? computeLatencyMs(serveAt, returnAt) : null;

    dispatch({
      type: 'RECORD_TRIAL',
      index: trialIndex,
      serveAt,
      returnAt,
      returnSource: responded ? source : 'none',
      latencyMs,
      responded,
    });

    const nextIndex = trialIndex + 1;
    if (nextIndex >= currentActivity.trialCount) {
      resetAudioSession();
      navigate('/session/activity/review');
      return;
    }
    setTrialIndex(nextIndex);
    setPhase('ready');
    setPendingServeAt(null);
  }

  return (
    <main>
      <h1>{currentActivity.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', currentActivity.trialCount)}
      </p>
      {!audioAvailable && <p>{strings.activityRun.micUnavailableLabel}</p>}
      {phase === 'ready' && <button onClick={handleServe}>{currentActivity.serveButtonLabel}</button>}
      {phase === 'waiting' && (
        <>
          <p>{strings.activityRun.waitingLabel}</p>
          <button onClick={() => recordTrial({ responded: true, source: 'parent-tap' })}>
            {strings.activityRun.respondedButton}
          </button>
          <button onClick={() => recordTrial({ responded: false, source: 'none' })}>
            {strings.activityRun.noResponseButton}
          </button>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 1: Write the new implementation**

```js
// src/routes/ActivityRunPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, hasActiveSession, resetAudioSession } from '../core/latency/audioSession.js';
import { getVisionDetector, hasActiveVisionSession, resetVisionSession } from '../core/vision/visionSession.js';
import { mapObservations } from '../core/vision/observationMapper.js';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

function playServeTone(audioContext) {
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 660;
  oscillator.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.15);
}

export default function ActivityRunPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useSessionDispatch();
  const { session } = useSessionState();
  const audioAvailable = Boolean(location.state?.audioAvailable);
  const visionAvailable = Boolean(location.state?.visionAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const videoRef = useRef(null);
  const visionCodesRef = useRef(new Set());
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  const currentActivity = session ? activities[session.activityRuns.length] : null;

  function handleVisionFrame(signals) {
    if (!currentActivity) return;
    const codes = mapObservations({ activityId: currentActivity.id, ...signals });
    codes.forEach((code) => visionCodesRef.current.add(code));
  }

  useEffect(() => {
    if (!currentActivity) return;
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: currentActivity.id });
    audioContextRef.current = getAudioContext();
    if (visionAvailable) {
      getVisionDetector().start(videoRef.current, handleVisionFrame);
    }
    // currentActivity intentionally omitted: this must run exactly once per
    // page mount (one activity run per visit to this route), the same reason
    // the audio-session mount effect below has no cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (audioAvailable && hasActiveSession()) {
        getDetector().disarm();
      }
      if (visionAvailable && hasActiveVisionSession()) {
        getVisionDetector().stop();
      }
    };
  }, [audioAvailable, visionAvailable]);

  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  async function handleServe() {
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    playServeTone(audioContext);
    const serveAt = markTime(audioContext);
    setPendingServeAt(serveAt);
    setPhase('waiting');
    recordedRef.current = false;

    if (audioAvailable) {
      getDetector().arm((detectedAt) => {
        recordTrial({ responded: true, source: 'audio-onset', returnAt: detectedAt, serveAt });
      });
    }
  }

  function recordTrial({ responded, source, returnAt: providedReturnAt, serveAt: providedServeAt }) {
    if (recordedRef.current) return;
    recordedRef.current = true;
    if (audioAvailable) {
      getDetector().disarm();
    }

    const audioContext = audioContextRef.current;
    const serveAt = providedServeAt ?? pendingServeAt;
    const returnAt = responded ? (providedReturnAt ?? markTime(audioContext)) : null;
    const latencyMs = responded ? computeLatencyMs(serveAt, returnAt) : null;

    dispatch({
      type: 'RECORD_TRIAL',
      index: trialIndex,
      serveAt,
      returnAt,
      returnSource: responded ? source : 'none',
      latencyMs,
      responded,
    });

    const nextIndex = trialIndex + 1;
    if (nextIndex >= currentActivity.trialCount) {
      // Torn down here (end of activity), same StrictMode-safety reasoning
      // as resetAudioSession() below — see the mount effect's comment.
      resetAudioSession();
      if (visionAvailable) {
        resetVisionSession();
      }
      navigate('/session/activity/review', {
        state: { visionSuggestedCodes: Array.from(visionCodesRef.current) },
      });
      return;
    }
    setTrialIndex(nextIndex);
    setPhase('ready');
    setPendingServeAt(null);
  }

  return (
    <main>
      <h1>{currentActivity.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', currentActivity.trialCount)}
      </p>
      {!audioAvailable && <p>{strings.activityRun.micUnavailableLabel}</p>}
      {!visionAvailable && <p>{strings.activityRun.visionUnavailableLabel}</p>}
      {visionAvailable && (
        <video ref={videoRef} autoPlay playsInline muted style={{ width: 160, height: 120 }} />
      )}
      {phase === 'ready' && <button onClick={handleServe}>{currentActivity.serveButtonLabel}</button>}
      {phase === 'waiting' && (
        <>
          <p>{strings.activityRun.waitingLabel}</p>
          <button onClick={() => recordTrial({ responded: true, source: 'parent-tap' })}>
            {strings.activityRun.respondedButton}
          </button>
          <button onClick={() => recordTrial({ responded: false, source: 'none' })}>
            {strings.activityRun.noResponseButton}
          </button>
        </>
      )}
    </main>
  );
}
```

Note the `<video>` element is rendered unconditionally on `visionAvailable` (which is stable from the very first render, derived synchronously from `location.state`) — this guarantees `videoRef.current` is a real, attached DOM node by the time the mount effect runs and calls `getVisionDetector().start(videoRef.current, ...)`.

- [ ] **Step 2: Add the missing i18n string**

Add `"visionUnavailableLabel": "Camera unavailable — using manual observation only."` to the `activityRun` block in `src/i18n/en.json`, alongside the existing `micUnavailableLabel`.

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS, same 47 pre-existing tests (route components aren't unit tested)

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: clean build, no new errors

- [ ] **Step 5: Commit**

```bash
git add src/routes/ActivityRunPage.jsx src/i18n/en.json
git commit -m "feat: run continuous vision inference during Activity Run, with live preview"
```

---

### Task 8: `ActivityReviewPage.jsx` — pre-checked vision suggestions + provenance tagging

**Files:**
- Modify: `src/routes/ActivityReviewPage.jsx` (full current content shown in the earlier design-review context of this session — reproduced below)

**Interfaces:**
- Consumes: `location.state.visionSuggestedCodes: string[]` from Task 7's `navigate()` call

Current file content (full, current `main` state):

```js
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const { session, activityRun } = useSessionState();
  const [checked, setChecked] = useState({});
  const submittedRef = useRef(false);

  if (!session || (!activityRun && !submittedRef.current)) {
    return <Navigate to="/" replace />;
  }
  if (submittedRef.current) {
    return null;
  }

  const currentActivity = activities.find((activity) => activity.id === activityRun.activityId);
  const tagOptions = currentActivity.expectedBehaviours.map((code, index) => ({
    code,
    label: currentActivity.reviewTags[index],
  }));

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    submittedRef.current = true;
    for (const option of tagOptions) {
      if (checked[option.code]) {
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source: 'parent' });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });

    const completedCount = session.activityRuns.length + 1;
    const moreActivitiesRemain = completedCount < activities.length;
    navigate(moreActivitiesRemain ? '/session/overview' : '/session/results');
  }

  return (
    <main>
      <h1>{strings.activityReview.title}</h1>
      <p>{strings.activityReview.instructions}</p>
      {tagOptions.map((option) => (
        <label key={option.code}>
          <input
            type="checkbox"
            checked={!!checked[option.code]}
            onChange={() => toggle(option.code)}
          />
          {option.label}
        </label>
      ))}
      <button onClick={handleConfirm}>{strings.activityReview.confirmButton}</button>
    </main>
  );
}
```

- [ ] **Step 1: Write the new implementation**

```js
// src/routes/ActivityReviewPage.jsx
import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useSessionDispatch();
  const { session, activityRun } = useSessionState();
  const visionSuggestedCodes = location.state?.visionSuggestedCodes ?? [];
  const [checked, setChecked] = useState(() => {
    const initial = {};
    visionSuggestedCodes.forEach((code) => {
      initial[code] = true;
    });
    return initial;
  });
  const submittedRef = useRef(false);

  if (!session || (!activityRun && !submittedRef.current)) {
    return <Navigate to="/" replace />;
  }
  if (submittedRef.current) {
    return null;
  }

  const currentActivity = activities.find((activity) => activity.id === activityRun.activityId);
  const tagOptions = currentActivity.expectedBehaviours.map((code, index) => ({
    code,
    label: currentActivity.reviewTags[index],
  }));
  const visionSuggestedSet = new Set(visionSuggestedCodes);

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    submittedRef.current = true;
    for (const option of tagOptions) {
      if (checked[option.code]) {
        const source = visionSuggestedSet.has(option.code) ? 'vision-confirmed' : 'parent';
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });

    const completedCount = session.activityRuns.length + 1;
    const moreActivitiesRemain = completedCount < activities.length;
    navigate(moreActivitiesRemain ? '/session/overview' : '/session/results');
  }

  return (
    <main>
      <h1>{strings.activityReview.title}</h1>
      <p>{strings.activityReview.instructions}</p>
      {tagOptions.map((option) => (
        <label key={option.code}>
          <input
            type="checkbox"
            checked={!!checked[option.code]}
            onChange={() => toggle(option.code)}
          />
          {option.label}
          {visionSuggestedSet.has(option.code) && ` ${strings.activityReview.visionSuggestedLabel}`}
        </label>
      ))}
      <button onClick={handleConfirm}>{strings.activityReview.confirmButton}</button>
    </main>
  );
}
```

- [ ] **Step 2: Add the missing i18n string**

Add `"visionSuggestedLabel": "(camera suggested)"` to the `activityReview` block in `src/i18n/en.json`.

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS, same 47 pre-existing tests

- [ ] **Step 4: Commit**

```bash
git add src/routes/ActivityReviewPage.jsx src/i18n/en.json
git commit -m "feat: pre-check vision-suggested observations on Review, tag provenance on confirm"
```

---

### Task 9: Final verification and PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm test -- --run`
Expected: PASS, 47 tests (20 new vision tests from Tasks 1-3, plus the 47 pre-existing route/core tests — confirm the exact final count when this step actually runs and use the real number in the PROGRESS.md entry, not this plan's guess)

- [ ] **Step 2: Run the production build and verify vendored assets are intact**

Run: `npm run build`
Expected: clean build. Then verify (same check as Task 5's Step 3, repeated here as the final gate): `dist/models/face_landmarker.task`, `dist/models/hand_landmarker.task`, and all 6 files under `dist/mediapipe/wasm/` exist and match the `public/` originals' byte sizes exactly. This is the single most important check in this whole plan — Phase 2's C1 finding was exactly this class of bug (an asset that works under `npm run dev` but silently breaks under `npm run build`), caught only by explicitly checking the production output, not the dev server.

- [ ] **Step 3: Write the PROGRESS.md entry**

Add a new entry at the top of `PROGRESS.md` (below the "Newest entry at the top" line) following the exact format of every prior session entry (Done / Watch out for / Not yet done / Next up sections as applicable), covering:
- The 9 tasks and what each built
- The explicit scope decision (full gaze+gesture classification, not the minimal fallback)
- The vendored-asset sizes and where they came from
- The known limitation: detection accuracy against a real child unverified from this environment, `classifyMotion`'s crude displacement heuristic and `capture.js`'s unverified yaw-extraction formula are the most likely things to need retuning
- The explicit next step: run all 4 activities on the physical device with a real camera and confirm the pre-checked Review suggestions are directionally sane

- [ ] **Step 4: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: log Phase 4 Vision session"
```
