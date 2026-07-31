# Phase 2 — Audio Onset Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add microphone-based auto-detection of a child's response in Bubble Time, alongside the existing parent-tap path, so the Ribbon can distinguish `audio-onset` from `parent-tap` returns.

**Architecture:** A pure, TDD'd onset-decision module (`core/latency/onset.js`) is imported by a thin `AudioWorkletProcessor` that runs sample-accurate energy detection on the audio thread. A small browser adapter (`core/latency/capture.js`) wraps `getUserMedia` + the worklet node; a module-level singleton (`core/latency/audioSession.js`) keeps one `AudioContext`/detector alive across the Prebrief→Run route transition (avoiding non-cloneable objects in router state). `ActivityPrebriefPage` calibrates once per activity run; `ActivityRunPage` arms/disarms the detector per trial with first-to-fire-wins reconciliation against the manual tap buttons.

**Tech Stack:** Web Audio API (`AudioContext`, `AudioWorkletNode`, `AnalyserNode`), `getUserMedia`, React 18/19, Vitest.

## Global Constraints

- Timing uses the Web Audio clock (`AudioContext.currentTime`), never `Date.now()` — `serveAt`/`returnAt` must come from the same `AudioContext` instance for a given trial.
- `core/` stays zero-React; only `core/` files that are pure logic get Vitest tests (`src/**/*.test.js`). Browser-API-heavy adapters in `core/` (this plan's `capture.js`, `audioSession.js`, the worklet file) follow the existing `core/vision`-style precedent: no React, but also not unit-tested — kept intentionally thin.
- No changes to `Trial`/`Session` data model — `Trial.returnSource: 'audio-onset' | 'parent-tap' | 'none'` already exists in `src/core/model/index.js`.
- Parent-tap must keep working exactly as in Phase 1, unconditionally — it is the always-available ground truth, never removed or gated behind audio availability.
- Dual-source reconciliation: first-to-fire-wins. No auto-timeout for "no response" — that stays manual-tap-only.
- Noise-floor calibration happens once per activity run, at Prebrief.
- Mic permission is requested at the first Activity Prebrief, not upfront at Consent.
- On any mic/permission/worklet failure, degrade gracefully to tap-only — never block the activity.
- i18n strings go in `src/i18n/en.json` under the relevant screen's key, following the existing flat-key convention (see `strings.activityRun.serveButton` etc.).

---

### Task 1: `core/latency/onset.js` — pure onset-decision logic

**Files:**
- Create: `src/core/latency/onset.js`
- Test: `src/core/latency/onset.test.js`

**Interfaces:**
- Consumes: nothing (pure math only)
- Produces:
  - `computeRmsEnergy(samples: Float32Array | number[]): number`
  - `calibrateNoiseFloor(rmsBlocks: number[]): number`
  - `shouldTriggerOnset({ rms, noiseFloor, thresholdMultiplier, elapsedMsSinceArm, listenDelayMs }): boolean`

  These three are consumed by Task 2 (worklet) and Task 3 (capture.js calibration loop).

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { computeRmsEnergy, calibrateNoiseFloor, shouldTriggerOnset } from './onset.js';

describe('computeRmsEnergy', () => {
  it('returns 0 for an empty sample array', () => {
    expect(computeRmsEnergy([])).toBe(0);
  });

  it('returns the constant magnitude for a constant signal', () => {
    expect(computeRmsEnergy([1, 1, 1, 1])).toBeCloseTo(1, 5);
  });

  it('computes RMS for a mixed-sign signal', () => {
    expect(computeRmsEnergy([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5, 5);
  });

  it('computes RMS for a known sequence', () => {
    // sqrt((3^2 + 4^2) / 2) = sqrt(25/2) = 3.5355...
    expect(computeRmsEnergy([3, 4])).toBeCloseTo(3.5355, 3);
  });
});

describe('calibrateNoiseFloor', () => {
  it('returns 0 for an empty block list', () => {
    expect(calibrateNoiseFloor([])).toBe(0);
  });

  it('averages the RMS blocks', () => {
    expect(calibrateNoiseFloor([0.01, 0.02, 0.03])).toBeCloseTo(0.02, 5);
  });
});

describe('shouldTriggerOnset', () => {
  it('never triggers before the listen delay has elapsed, even with high energy', () => {
    const result = shouldTriggerOnset({
      rms: 10,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 100,
      listenDelayMs: 300,
    });
    expect(result).toBe(false);
  });

  it('triggers once the delay has elapsed and rms exceeds the threshold', () => {
    const result = shouldTriggerOnset({
      rms: 0.05,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 300,
      listenDelayMs: 300,
    });
    expect(result).toBe(true);
  });

  it('does not trigger when rms is at or below the threshold', () => {
    const result = shouldTriggerOnset({
      rms: 0.03,
      noiseFloor: 0.01,
      thresholdMultiplier: 3,
      elapsedMsSinceArm: 500,
      listenDelayMs: 300,
    });
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/core/latency/onset.test.js`
Expected: FAIL — `onset.js` does not exist yet (`Failed to resolve import`).

- [ ] **Step 3: Write the implementation**

```js
export function computeRmsEnergy(samples) {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  return Math.sqrt(sumSquares / samples.length);
}

export function calibrateNoiseFloor(rmsBlocks) {
  if (rmsBlocks.length === 0) return 0;
  const sum = rmsBlocks.reduce((total, rms) => total + rms, 0);
  return sum / rmsBlocks.length;
}

export function shouldTriggerOnset({ rms, noiseFloor, thresholdMultiplier, elapsedMsSinceArm, listenDelayMs }) {
  if (elapsedMsSinceArm < listenDelayMs) return false;
  return rms > noiseFloor * thresholdMultiplier;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/core/latency/onset.test.js`
Expected: PASS, all 8 tests green.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test -- --run`
Expected: PASS, 36/36 (28 existing + 8 new).

- [ ] **Step 6: Commit**

```bash
git add src/core/latency/onset.js src/core/latency/onset.test.js
git commit -m "feat: add pure onset-detection logic (RMS, calibration, threshold)"
```

---

### Task 2: `core/latency/onset-processor.worklet.js` — AudioWorkletProcessor

**Files:**
- Create: `src/core/latency/onset-processor.worklet.js`

**Interfaces:**
- Consumes: `computeRmsEnergy`, `shouldTriggerOnset` from Task 1 (`./onset.js`)
- Produces: a worklet module registered under the name `'onset-processor'`, loaded via `audioContext.audioWorklet.addModule(new URL('./onset-processor.worklet.js', import.meta.url))` (consumed by Task 3's `capture.js`). Accepts `processorOptions: { noiseFloor, thresholdMultiplier?, listenDelayMs? }` at construction. Listens for `port.postMessage({ type: 'arm' })` / `{ type: 'disarm' }`, and emits `port.postMessage({ type: 'onset', time: <AudioContext currentTime> })` the first time energy crosses threshold after arming.

**Note on testing:** This file runs in `AudioWorkletGlobalScope`, which Vitest's `node` test environment cannot execute. There is no automated test for this file — its logic is a thin, mechanical wrapper around the fully-tested `onset.js` functions from Task 1. It is verified manually in Task 8 alongside the rest of the audio-capture path.

- [ ] **Step 1: Write the implementation**

```js
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
```

- [ ] **Step 2: Verify the full test suite still passes (this file has no tests of its own)**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged, confirms this new file doesn't break Vitest's module resolution for `onset.js`.

- [ ] **Step 3: Commit**

```bash
git add src/core/latency/onset-processor.worklet.js
git commit -m "feat: add AudioWorkletProcessor for sample-accurate onset detection"
```

---

### Task 3: `core/latency/capture.js` — browser mic/worklet adapter

**Files:**
- Create: `src/core/latency/capture.js`

**Interfaces:**
- Consumes: `computeRmsEnergy`, `calibrateNoiseFloor` from Task 1 (`./onset.js`); the `'onset-processor'` worklet module from Task 2.
- Produces: `createOnsetDetector(audioContext)` returning `{ calibrate(durationMs): Promise<number>, arm(onDetected: (time: number) => void): void, disarm(): void, release(): void }`. Consumed by Task 4 (`audioSession.js`).

**Note on testing:** Same as Task 2 — this file is browser-API-heavy (`getUserMedia`, `AudioWorkletNode`, `AnalyserNode`) with no meaningful Vitest coverage available. Kept thin; the only real decision logic it calls (`computeRmsEnergy`, `calibrateNoiseFloor`) is already tested in Task 1.

- [ ] **Step 1: Write the implementation**

```js
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
```

`workletNode.connect(audioContext.destination)` is required even though the node never writes output data — an `AudioWorkletNode` with no path to the destination is not guaranteed to keep receiving `process()` calls in every browser. The node outputs silence (it never touches its `outputs` array), so this is inaudible.

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/core/latency/capture.js
git commit -m "feat: add getUserMedia/AudioWorklet capture adapter"
```

---

### Task 4: `core/latency/audioSession.js` — singleton AudioContext/detector holder

**Files:**
- Create: `src/core/latency/audioSession.js`

**Interfaces:**
- Consumes: `createOnsetDetector` from Task 3 (`./capture.js`)
- Produces: `getAudioContext(): AudioContext`, `getDetector(): ReturnType<typeof createOnsetDetector>`, `resetAudioSession(): void`. Consumed by Task 6 (`ActivityPrebriefPage`) and Task 7 (`ActivityRunPage`).

**Why a singleton instead of passing objects through router state:** `AudioContext` and the detector's internal nodes are not structured-cloneable, so they cannot go through React Router's `navigate(path, { state })` (which uses `history.pushState` under the hood). Calibration happens on the Prebrief page but detection happens on the Run page — this module-level singleton is the one instance shared across that route transition. `Trial.serveAt`/`returnAt` must share one `AudioContext` clock, which this also guarantees.

- [ ] **Step 1: Write the implementation**

```js
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
```

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/core/latency/audioSession.js
git commit -m "feat: add singleton AudioContext/detector session holder"
```

---

### Task 5: `ResponseTimeRibbon` — visible source distinction

**Files:**
- Modify: `src/components/ribbon/ResponseTimeRibbon.jsx:43-50`

**Interfaces:**
- Consumes: `trial.returnSource` (already present on every `Trial`, values `'audio-onset' | 'parent-tap' | 'none'`)
- Produces: no interface change — same props (`trials`, `bands`, `width`)

**Note on testing:** Following this project's existing convention, presentational components under `src/components/` and `src/routes/` are not covered by Vitest (only `core/` is) — this is verified visually via the browser dev-server walkthrough in Task 8.

- [ ] **Step 1: Modify the responded-trial branch to add a source ring**

Find this block (currently lines 43-50):

```jsx
        return (
          <g key={trial.index}>
            <line x1={slotCenter} y1={TRACK_Y} x2={slotCenter} y2={dotY} stroke={bandColor(bandId)} strokeWidth={2} />
            <circle cx={slotCenter} cy={dotY} r={6} fill={bandColor(bandId)}>
              <title>{`Trial ${index + 1}: ${trial.latencyMs}ms (${bandId}, ${trial.returnSource})`}</title>
            </circle>
          </g>
        );
```

Replace it with:

```jsx
        return (
          <g key={trial.index}>
            <line x1={slotCenter} y1={TRACK_Y} x2={slotCenter} y2={dotY} stroke={bandColor(bandId)} strokeWidth={2} />
            {trial.returnSource === 'audio-onset' && (
              <circle cx={slotCenter} cy={dotY} r={9} fill="none" stroke="#fff" strokeWidth={2} />
            )}
            <circle cx={slotCenter} cy={dotY} r={6} fill={bandColor(bandId)}>
              <title>{`Trial ${index + 1}: ${trial.latencyMs}ms (${bandId}, ${trial.returnSource})`}</title>
            </circle>
          </g>
        );
```

The white ring is drawn before (underneath) the main dot at a larger radius, so it reads as a halo around audio-onset trials without obscuring the band-colour dot. This is on top of the existing colour coding, not a replacement for it — matches the doc's "don't encode meaning in colour alone" note.

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged (no tests target this file).

- [ ] **Step 3: Commit**

```bash
git add src/components/ribbon/ResponseTimeRibbon.jsx
git commit -m "feat: distinguish audio-onset trials on the Ribbon with a visible ring"
```

---

### Task 6: `ActivityPrebriefPage` — mic calibration step

**Files:**
- Modify: `src/routes/ActivityPrebriefPage.jsx` (full rewrite of the component body)
- Modify: `src/i18n/en.json` (add one key under `activityPrebrief`)

**Interfaces:**
- Consumes: `getAudioContext`, `getDetector` from Task 4 (`../core/latency/audioSession.js`)
- Produces: navigates to `/session/activity/run` with router state `{ audioAvailable: boolean }`, consumed by Task 7 (`ActivityRunPage`).

- [ ] **Step 1: Add the calibrating-label string**

In `src/i18n/en.json`, find the `activityPrebrief` block:

```json
  "activityPrebrief": {
    "materialsLabel": "You'll need",
    "startButton": "Start activity"
  },
```

Replace with:

```json
  "activityPrebrief": {
    "materialsLabel": "You'll need",
    "startButton": "Start activity",
    "calibratingLabel": "Listening to your room…"
  },
```

- [ ] **Step 2: Rewrite `ActivityPrebriefPage.jsx`**

Replace the full file contents with:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { getAudioContext, getDetector } from '../core/latency/audioSession.js';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');
const CALIBRATION_MS = 1500;

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();
  const [calibrating, setCalibrating] = useState(false);

  async function handleStart() {
    setCalibrating(true);
    const audioContext = getAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    let audioAvailable = true;
    try {
      await getDetector().calibrate(CALIBRATION_MS);
    } catch (error) {
      audioAvailable = false;
    }

    navigate('/session/activity/run', { state: { audioAvailable } });
  }

  return (
    <main>
      <h1>{bubbleTime.name}</h1>
      <p>{bubbleTime.parentScript}</p>
      <h2>{strings.activityPrebrief.materialsLabel}</h2>
      <ul>
        {bubbleTime.materials.map((material) => (
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

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/routes/ActivityPrebriefPage.jsx src/i18n/en.json
git commit -m "feat: calibrate noise floor at Activity Prebrief"
```

---

### Task 7: `ActivityRunPage` — dual-source trial recording

**Files:**
- Modify: `src/routes/ActivityRunPage.jsx` (full rewrite of the component body)
- Modify: `src/i18n/en.json` (add one key under `activityRun`)

**Interfaces:**
- Consumes:
  - `getAudioContext`, `getDetector`, `resetAudioSession` from Task 4 (`../core/latency/audioSession.js`)
  - `markTime`, `computeLatencyMs` from `../core/latency/index.js` (existing, Phase 1)
  - `location.state?.audioAvailable: boolean` set by Task 6
- Produces: dispatches `RECORD_TRIAL` with `returnSource: 'audio-onset' | 'parent-tap' | 'none'` (existing reducer action, no changes needed there)

- [ ] **Step 1: Add the mic-unavailable label string**

In `src/i18n/en.json`, find the `activityRun` block:

```json
  "activityRun": {
    "serveButton": "Blow bubbles",
    "respondedButton": "Child responded",
    "noResponseButton": "No response",
    "trialLabel": "Trial {current} of {total}",
    "waitingLabel": "Waiting for response…"
  },
```

Replace with:

```json
  "activityRun": {
    "serveButton": "Blow bubbles",
    "respondedButton": "Child responded",
    "noResponseButton": "No response",
    "trialLabel": "Trial {current} of {total}",
    "waitingLabel": "Waiting for response…",
    "micUnavailableLabel": "Microphone unavailable — using tap-only detection"
  },
```

- [ ] **Step 2: Rewrite `ActivityRunPage.jsx`**

Replace the full file contents with:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
import { getAudioContext, getDetector, resetAudioSession } from '../core/latency/audioSession.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

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
  const audioAvailable = Boolean(location.state?.audioAvailable);
  const audioContextRef = useRef(null);
  const recordedRef = useRef(false);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  useEffect(() => {
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: bubbleTime.id });
    audioContextRef.current = getAudioContext();
  }, [dispatch]);

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
    if (nextIndex >= bubbleTime.trialCount) {
      // Torn down here (end of activity) rather than in an effect cleanup:
      // React StrictMode double-invokes mount effects in dev, and an effect
      // cleanup would release the freshly-calibrated singleton session
      // between the two invocations, leaving the second mount uncalibrated.
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
      <h1>{bubbleTime.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', bubbleTime.trialCount)}
      </p>
      {!audioAvailable && <p>{strings.activityRun.micUnavailableLabel}</p>}
      {phase === 'ready' && <button onClick={handleServe}>{strings.activityRun.serveButton}</button>}
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

Key changes from the Phase 1 version: `audioContextRef` now comes from the shared `getAudioContext()` singleton (Task 4) instead of a fresh per-mount `AudioContext`; the mount effect no longer closes the context on cleanup (see the inline comment — this is a deliberate fix for a StrictMode double-invoke hazard, not an oversight); `recordTrial` takes `source`/optional `returnAt`/`serveAt` so both the manual buttons and the worklet's `onDetected` callback funnel through one function with a `recordedRef` guard enforcing first-to-fire-wins; `resetAudioSession()` runs exactly once, at the real end of the activity.

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS, 36/36 — unchanged (no tests target this file).

- [ ] **Step 4: Commit**

```bash
git add src/routes/ActivityRunPage.jsx src/i18n/en.json
git commit -m "feat: wire dual-source (audio-onset + parent-tap) trial recording"
```

---

### Task 8: Manual verification and progress log

**Files:**
- Modify: `PROGRESS.md`

No code changes — this task is verification and documentation only.

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm test -- --run`
Expected: PASS, 36/36.

- [ ] **Step 2: Manual browser walkthrough (tap-only path)**

Start the dev server (`npm run dev`), and using a browser (or browser automation), walk through: Home → Session Overview → Activity Prebrief (observe the "Listening to your room…" text appear briefly, or the mic-permission browser prompt) → Activity Run → 3 trials via the manual tap buttons → Review → Results → Report. Confirm:
- No console errors.
- If the browser/environment grants mic access, all 3 trials still work via manual tap (parent-tap must never be blocked by audio wiring).
- The Ribbon on Session Results and Report Preview renders without errors regardless of `returnSource` values recorded.

- [ ] **Step 3: Manual browser walkthrough (permission-denied path)**

Repeat the walkthrough in a context where mic permission is denied or unavailable (e.g., deny the browser's permission prompt, or use an environment with no mic). Confirm:
- The "Microphone unavailable — using tap-only detection" note appears on Activity Run.
- The activity still completes normally via manual taps, all the way to the Report.

- [ ] **Step 4: Flag the real audio-onset path for hands-on confirmation**

This plan's automated/browser-tool verification cannot feed a real "blow bubbles" sound through a real microphone. Note explicitly to the user (outside this file) that the actual mic-triggered detection path — calibration picking up real room noise, a real sound crossing the threshold and producing an `'audio-onset'` trial with a ringed dot on the Ribbon — needs to be confirmed either on the physical Android device or in a desktop browser with a live microphone, by the user.

- [ ] **Step 5: Update `PROGRESS.md`**

Add a new dated entry above the most recent one (`## 2026-07-31 — Session 4: Phase 1 — Bubble Time vertical slice`), following that entry's format (Done / Watch out for / Next up), summarizing: the 4 new `core/latency` modules (`onset.js` tested, `capture.js`/`audioSession.js`/the worklet untested-by-design), the Prebrief calibration step, the dual-source `ActivityRunPage` rewrite and the StrictMode-cleanup fix, the Ribbon ring, the two verified browser paths (tap-only and permission-denied), and the flagged open item (real mic-triggered detection needs hands-on device/browser confirmation from the user).

- [ ] **Step 6: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: log Phase 2 audio-onset detection session"
```
