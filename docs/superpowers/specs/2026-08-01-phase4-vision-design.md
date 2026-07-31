# Phase 4 — Vision (MediaPipe) design

## Purpose

Add a second automatic observation channel alongside the existing parent-tap
Review checklist: on-device MediaPipe face/hand landmark detection during an
activity run, surfaced as pre-checked (parent-confirmable) suggestions on the
existing Review screen. Mirrors the audio-onset design's philosophy from
Phase 2 — an automatic channel that augments, never replaces, the parent as
ground truth — but the confirmation point differs: audio-onset auto-records a
trial return; vision suggestions require an explicit parent click to enter
the record at all.

## Scope decision (explicit, from brainstorming)

Full gaze + point/reach classification, not the plan's own minimal
"face-presence + hand-raise only" fallback. Chosen deliberately, with the
time/risk tradeoff surfaced and accepted.

Verbal/vocal observation codes (`vocalise`, `word`, `vocal-protest`,
`word-no`, `label`, `comment`) are permanently out of vision scope — no ASR
planned. Only visually-observable codes get a vision path.

`anticipatory-movement` (Peek-a-boo) and `gaze-to-parent` (Bubble Time) are
explicitly dropped from vision scope for this phase:
- `anticipatory-movement` needs timing relative to a specific pre-reveal
  window, which conflicts with the continuous-inference model chosen below
  (see "Inference window").
- `gaze-to-parent` is visually indistinguishable from `gaze-to-face` without
  knowing the parent's real-world position relative to the camera, which the
  app has no way to know. Both stay parent-only observations, unchanged from
  today.

## Code mapping

| Activity | Vision-sourced codes | Signal |
|---|---|---|
| Bubble Time | `reach`, `point` | hand landmarks |
| Peek-a-boo | `gaze-to-face`, `smile` | face landmarks/blendshapes |
| Not-This-One | `head-turn`, `push-away` | face orientation / hand motion |
| What's-In-The-Box | `point`, `show` | hand landmarks |

## Models & bundling

- `@mediapipe/tasks-vision` npm package (provides `FaceLandmarker`,
  `HandLandmarker`, `FilesetResolver`).
- `face_landmarker.task` (float16, ~3.76MB) and `hand_landmarker.task`
  (float16, ~7.82MB) — verified reachable and sized via a HEAD request this
  session — vendored into `public/models/`.
- The package's WASM runtime copied into `public/mediapipe/wasm/` at setup
  time. `FilesetResolver.forVisionTasks('/mediapipe/wasm')` — local path,
  never a CDN, consistent with the project's offline requirement (same
  reasoning as the audio worklet's `assetsInlineLimit: 0` fix in Phase 2).
- Both `.task` files and the WASM runtime are committed to git — the
  `.gitignore` already has an explicit carve-out for MediaPipe model files
  for exactly this reason.

## Core logic — `src/core/vision/` (zero-React, TDD'd, same rule as every
other `core/` module in this project)

- **`gesture.js`** — pure classifiers over plain landmark/blendshape arrays
  (never MediaPipe class instances directly, so these are testable with
  synthetic fixture data, no browser APIs):
  - `classifyHeadOrientation(facialTransformationMatrix)` → `{ facing:
    'camera' | 'away', yawDeg }`. Drives `gaze-to-face` (`|yawDeg| <` a small
    threshold) and `head-turn` (`|yawDeg| >` a larger threshold).
  - `classifySmile(blendshapes)` → boolean, from the `mouthSmileLeft`/
    `mouthSmileRight` blendshape scores averaged against a threshold.
  - `classifyHandPose(handLandmarks)` → `'point' | 'open' | 'neutral'`, from
    index-finger-extended-vs-other-fingers-curled landmark geometry.
  - `classifyMotion(prevLandmarks, currLandmarks)` → `{ direction,
    magnitude }`, a simple frame-to-frame landmark displacement (not real
    optical flow — the crudest classifier here, called out below).
- **`observationMapper.js`** — pure function taking classifier outputs plus
  the current activity id, returning candidate `{code, confidence}` pairs
  restricted to that activity's own `expectedBehaviours` list (reuses the
  existing `activities.json` shape, no schema change).

## Session/capture layer — mirrors `audioSession.js`/`capture.js` exactly

- **`visionSession.js`** — singleton holder: `getVisionSession()`,
  `hasActiveSession()`, `resetVisionSession()`. Same shape as the audio
  singleton from Phase 2, same reasons (React StrictMode double-invoke
  safety, teardown at business-logic endpoints not effect cleanup).
- **`capture.js`** — non-React adapter: `getUserMedia({video})` +
  `requestAnimationFrame` loop feeding frames to both landmarkers, calling a
  callback with per-frame classification results. Untested by design — needs
  real `getUserMedia`/MediaPipe WASM, not available under Vitest/jsdom (same
  as Phase 2's audio `capture.js`).

## UI wiring

- **`ActivityPrebriefPage`**: the existing `getUserMedia({audio: true})` call
  becomes `getUserMedia({audio: true, video: true})` — one combined prompt.
  On the first activity of the session only, also lazy-loads both MediaPipe
  models (~11.5MB, one-time; subsequent activities reuse the loaded
  singleton). `audioAvailable` and `visionAvailable` are tracked
  independently — either failing doesn't block the other, same
  graceful-degradation philosophy the mic path already has.
- **`ActivityRunPage`**: if `visionAvailable`, renders a small live `<video>`
  preview thumbnail (so the parent can see the camera is actually pointed at
  the child — a live demo with zero visual feedback from a "working" camera
  is a trust problem). Inference runs continuously from activity mount to
  activity end, not gated per-trial (a gaze shift or smile isn't cleanly
  bounded to one trial's serve/wait window the way an audio onset is).
  Accumulates a rolling best-confidence-per-code map across the whole
  activity.
- **`ActivityReviewPage`**: any code in that map crosses its confidence
  threshold, and its checkbox starts pre-checked. Parent can uncheck. On
  submit: still-checked vision-suggested codes get `source:
  'vision-confirmed'`; anything else the parent checked (that vision never
  suggested) still gets `source: 'parent'`, unchanged. This preserves an
  honest provenance trail in the evidence data, the same way trials already
  carry `returnSource: 'audio-onset' | 'parent-tap'`.

## Known limitation (stated here and to be stated in-app / PROGRESS.md,
same as Phase 2's mic-path gap)

Detection accuracy against a real child's face and hands is **not
verifiable from this environment** — no camera, no test footage, no way to
confirm these heuristics actually recognize a real toddler's point vs reach
vs a random hand movement. The pure classifiers are TDD'd for geometric/
mathematical correctness against synthetic fixtures, not for real-world
accuracy. `classifyMotion` (driving `reach`/`push-away`) is the least
rigorous of the four classifiers — simple displacement, no real motion
tracking — and the most likely to need threshold retuning after a real
on-device test. This mirrors exactly the open item Phase 2 left for the
real mic-triggered audio path: **someone needs to run all 4 activities on
the physical device with a real child (or a good-faith stand-in) and confirm
the pre-checked suggestions are directionally sane before trusting this in
front of judges.**

## Testing

- `gesture.js` and `observationMapper.js`: fully TDD'd against synthetic
  landmark/blendshape fixtures, following the exact pattern of Phase 2's
  `core/latency/onset.js`.
- `capture.js`, `visionSession.js`: untested by design, browser-API-only,
  same precedent as their audio equivalents.
- No automated end-to-end verification of the real camera pipeline is
  possible from this environment — flagged above, not hidden.
