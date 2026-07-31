# Phase 2 — Audio Onset Detection: Design

Status: approved by user, ready for implementation planning.

## Purpose

Add microphone-based auto-detection of a child's response, per the architecture
doc's Phase 2 ("Audio"): Web Audio capture, energy-based onset detection,
dual-source return (auto + tap), noise-floor calibration. Verified by: the
Ribbon visibly distinguishes `audio-onset` from `parent-tap`.

The parent-tap path built in Phase 1 remains fully functional and is never
removed — it is always-available ground truth, not a fallback hack (this is
literally *parent-mediated* assessment, the problem statement's own framing).

## Non-goals

- No voice-activity-detection (VAD) sophistication — energy-threshold onset
  only, explicitly labeled as a heuristic, not real VAD (architecture risk 8.2).
- No change to the Trial/Session data model — `Trial.returnSource:
  'audio-onset' | 'parent-tap' | 'none'` already exists in `core/model`.
- No multi-activity calibration reuse — Bubble Time is still the only
  activity in scope; calibration happens once per activity run.

## Module architecture

**`src/core/latency/onset.js`** (pure, TDD'd — same tier as the rest of
`core/latency`):
- `computeRmsEnergy(samples: Float32Array): number`
- `calibrateNoiseFloor(rmsBlocks: number[]): number` — averages ambient-noise
  RMS blocks captured during the Prebrief calibration window into a single
  noise-floor value.
- `createOnsetDetector({ noiseFloor, thresholdMultiplier, listenDelayMs })` —
  state machine with `evaluate(rms, blockTimeMs): boolean`. Ignores all input
  until `listenDelayMs` after arming (guards against the tail of the serve
  tone triggering a false onset), then returns `true` the first time
  `rms > noiseFloor * thresholdMultiplier`.

**`src/core/latency/onset-processor.worklet.js`** — the `AudioWorkletProcessor`
subclass, loaded via `audioContext.audioWorklet.addModule(new
URL('./onset-processor.worklet.js', import.meta.url))`. Runs on the audio
rendering thread for sample-accurate timing. Deliberately thin: per
128-sample block, calls `computeRmsEnergy`/`createOnsetDetector` (imported
from `onset.js` — Vite resolves real ES imports inside worklet modules) and
`postMessage({ type: 'onset', time: currentTime })` the instant it fires.
`currentTime` inside the worklet is the same `AudioContext` clock `markTime()`
already reads — no new timing source to reconcile against `serveAt`.

**`src/core/latency/capture.js`** — non-React, non-pure adapter (same
category as the planned `core/vision` MediaPipe wrapper: browser-API-heavy,
not unit-tested). Wraps `getUserMedia({ audio: true })`,
`audioWorklet.addModule`, and `MediaStreamAudioSourceNode` →
`AudioWorkletNode` wiring behind:
```js
createOnsetDetector(audioContext)
// -> { calibrate(durationMs): Promise<noiseFloor>, arm(onDetected), disarm(), release() }
```

## UI flow

**`ActivityPrebriefPage`:** On mount, request mic permission and run
`calibrate(1500ms)`, showing a "Listening to your room…" indicator during the
window. On success: `navigate('/session/activity/run', { state: { noiseFloor } })`.
On permission denial or `getUserMedia` failure: catch it, show an inline note
("Microphone unavailable — using tap-only detection"), and proceed with
`noiseFloor: null` — degrade gracefully rather than block the activity,
consistent with Phase 1's "always demonstrable in degraded form" principle.

**`ActivityRunPage`:** Reads `noiseFloor` from router state; falls back to
tap-only if absent (e.g. a hard refresh mid-flow lost the router state). On
`handleServe`, after the tone plays, `arm(onDetected)`s the detector.
Dual-source reconciliation is **first-to-fire-wins**: both the worklet's
`onDetected` callback and the two manual buttons call the same
`recordTrial({ responded, source })`; whichever fires first wins and
immediately `disarm()`s the detector so a late worklet message or a stray tap
can't double-record the trial. `returnSource` becomes `'audio-onset'` or
`'parent-tap'` accordingly.

## Ribbon

`ResponseTimeRibbon` currently exposes `returnSource` only in the tooltip
title. Per the architecture doc's "don't encode meaning in colour alone"
accessibility note (already applied to latency bands), add a visible shape
distinction: parent-tap stays a plain filled dot; audio-onset gets a thin
white ring around the dot. No change to the existing band-colour logic.

## Error handling / degradation

| Failure | Behavior |
|---|---|
| Mic permission denied | Inline note on Prebrief, proceed tap-only (`noiseFloor: null`) |
| `getUserMedia` throws (no mic hardware, etc.) | Same as above |
| `AudioWorklet` unsupported (very old WebView) | Same as above — `capture.js` catches `addModule` failure |
| Router state lost (hard refresh mid-activity) | `ActivityRunPage` treats missing `noiseFloor` as tap-only |
| Worklet fires after trial already recorded via tap | Ignored — `disarm()` on first-to-fire, plus a trial-index guard on the message handler as a second line of defense |

## Testing

- `onset.js`: full TDD — RMS math, calibration averaging, listen-delay guard,
  threshold-crossing edge cases (silence never triggers, exact-boundary
  values, empty sample arrays).
- `capture.js` and the worklet file: accepted untested surface (no
  `AudioWorkletGlobalScope` in Vitest/jsdom), mitigated by keeping both thin
  and mechanical — all real decision logic lives in the tested `onset.js`.
- **Known verification gap:** there is no way to feed a real "blow bubbles"
  sound through a real microphone in the sandboxed browser used for
  automated walkthroughs this session. Everything up to that boundary
  (calibration UI, permission-denied fallback, worklet wiring, tap-still-works
  dual-source behavior) will be verified via browser automation; the actual
  mic-triggered detection path needs hands-on confirmation on the physical
  Android device or a desktop browser with a live mic.

## Decisions locked in during brainstorming

- Dual-source reconciliation: first-to-fire-wins (not audio-authoritative,
  not tap-overrides).
- Noise-floor calibration: once per activity run, at Prebrief (not per-trial,
  not continuously adaptive).
- No-response timeout: **not** added — stays manual-tap-only, no auto-timeout.
  Audio-onset only ever produces a positive detection, never a "no response"
  decision.
- Mic permission requested at first Activity Prebrief (not upfront at
  Consent).
- Detection method: `AudioWorklet` (sample-accurate), not a main-thread
  `AnalyserNode` polling loop — chosen over the simpler recommended option for
  timing precision, accepting the added implementation complexity and the
  worklet's untestable surface as a tradeoff.
