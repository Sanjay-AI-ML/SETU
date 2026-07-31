# Phase 3 — Full Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 4 activities (currently only Bubble Time is reachable) into a fixed-order session loop, expand `matrix-rules.json` to cover every observation code across all 4 activities, and make Session Results/Report aggregate across the whole session instead of just the last activity run.

**Architecture:** `session.activityRuns.length` is used as the single source of truth for "which activity is current" (no new reducer state — the in-progress run lives in `state.activityRun` until `COMPLETE_ACTIVITY_RUN`, so the array's length is always exactly the completed count). `core/matrix`'s `applyRules` is split into `matchRules` (rule-matching only) + the existing `applySurpassed`, plus a new `mergeCells` that combines several runs' raw cell arrays before a single session-wide `applySurpassed` pass — merging already-surpassed per-run states would be meaningless, so raw states must be merged first.

**Tech Stack:** Same as prior phases — React 18/19, react-router-dom, Vitest.

## Global Constraints

- Fixed order, all 4 activities, no skipping — `activities.json`'s array order is the session order.
- Session Results and Report Preview must show data pooled across every completed `ActivityRun` in the session, not just the last one.
- No changes to the `Trial`/`Session`/`ActivityRun` data model.
- `core/` stays zero-React; `matchRules`/`mergeCells` are pure and get full Vitest coverage, following the existing `core/matrix` test style.
- Route components get no Vitest coverage (existing project convention) — verified via a full 4-activity browser walkthrough in the final task.
- Any route component that reads `session.activityRuns.length` must guard against `session` being null (direct navigation / reload) — same pattern as the existing `SessionResultsPage`/`ReportPreviewPage` guards from Phase 1's C1 fix — and against `activities[session.activityRuns.length]` being `undefined` (all 4 already done).
- i18n strings follow the existing flat-key convention in `src/i18n/en.json`.

---

### Task 1: `core/matrix` — split `applyRules`, add `mergeCells`

**Files:**
- Modify: `src/core/matrix/index.js`
- Modify: `src/core/matrix/index.test.js`

**Interfaces:**
- Consumes: nothing new (same `matrix-taxonomy.json` as before)
- Produces:
  - `matchRules(observations, rulesConfig, context = {}): MatrixCell[28]` — the existing rule-matching loop, returns raw (`not-used`/`emerging`/`mastered`) cells, no surpassed computation.
  - `applyRules(observations, rulesConfig, context = {}): MatrixCell[28]` — unchanged signature/behavior, now composed as `applySurpassed(matchRules(...))`.
  - `applySurpassed(cells): MatrixCell[28]` — unchanged.
  - `mergeCells(cellsArrays: MatrixCell[28][]): MatrixCell[28]` — new. Consumed by Task 7 (`SessionResultsPage`) and Task 8 (`ReportPreviewPage`).

- [ ] **Step 1: Write the failing tests**

Add these new `describe` blocks to `src/core/matrix/index.test.js` (the file's existing imports need `matchRules` and `mergeCells` added — change line 2's import to `import { buildEmptyCells, matchRules, applyRules, applySurpassed, mergeCells } from './index.js';`):

```js
describe('core/matrix matchRules', () => {
  it('marks matched cells but does NOT compute surpassed', () => {
    const observations = [
      { code: 'reach', source: 'parent' },
      { code: 'point', source: 'parent' },
    ];
    const cells = matchRules(observations, rulesConfig, {});
    const level1Obtain = cells.find((c) => c.level === 1 && c.purpose === 'obtain');
    const level3Obtain = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    const level4Obtain = cells.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(level1Obtain.state).toBe('not-used');
    expect(level3Obtain.state).toBe('mastered');
    expect(level4Obtain.state).toBe('mastered');
  });

  it('attaches evidence with the provided context', () => {
    const cells = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, {
      sessionId: 'session-1',
      activityRunId: 'run-1',
    });
    const cell = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(cell.evidence).toEqual([
      { sessionId: 'session-1', activityRunId: 'run-1', observationCode: 'reach', ruleId: 'rule-obtain-l3-reach' },
    ]);
  });
});

describe('core/matrix mergeCells', () => {
  it('takes the highest-ranked state across multiple cell arrays for the same cell', () => {
    const runA = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-a' });
    const runB = matchRules([{ code: 'point', source: 'parent' }], rulesConfig, { activityRunId: 'run-b' });
    const merged = mergeCells([runA, runB]);
    const obtainL3 = merged.find((c) => c.level === 3 && c.purpose === 'obtain');
    const obtainL4 = merged.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(obtainL3.state).toBe('mastered');
    expect(obtainL4.state).toBe('mastered');
  });

  it('concatenates evidence from all inputs for the same cell', () => {
    const runA = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-a' });
    const runB = matchRules([{ code: 'reach', source: 'parent' }], rulesConfig, { activityRunId: 'run-b' });
    const merged = mergeCells([runA, runB]);
    const obtainL3 = merged.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(obtainL3.evidence).toHaveLength(2);
    expect(obtainL3.evidence[0].activityRunId).toBe('run-a');
    expect(obtainL3.evidence[1].activityRunId).toBe('run-b');
  });

  it('returns all not-used cells when given an empty list of cell arrays', () => {
    const merged = mergeCells([]);
    expect(merged).toHaveLength(28);
    expect(merged.every((c) => c.state === 'not-used')).toBe(true);
  });

  it('a subsequent applySurpassed pass on merged cells produces session-wide surpassed states', () => {
    const runA = matchRules(
      [{ code: 'reach', source: 'parent' }, { code: 'point', source: 'parent' }],
      rulesConfig,
      {}
    );
    const merged = mergeCells([runA]);
    const surpassed = applySurpassed(merged);
    const obtainL1 = surpassed.find((c) => c.level === 1 && c.purpose === 'obtain');
    expect(obtainL1.state).toBe('surpassed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/core/matrix/index.test.js`
Expected: FAIL — `matchRules`/`mergeCells` are not exported yet.

- [ ] **Step 3: Modify `src/core/matrix/index.js`**

Replace the entire file with:

```js
import taxonomy from '../../data/matrix-taxonomy.json';

export function buildEmptyCells() {
  const cells = [];
  for (const level of taxonomy.levels) {
    for (const purpose of taxonomy.purposes) {
      cells.push({ level: level.level, purpose: purpose.id, state: 'not-used', evidence: [] });
    }
  }
  return cells;
}

export function matchRules(observations, rulesConfig, context = {}) {
  const cells = buildEmptyCells();
  const observedCodes = observations.map((observation) => observation.code);

  for (const rule of rulesConfig.rules) {
    const satisfied = rule.requiredObservations.every((code) => observedCodes.includes(code));
    if (!satisfied) continue;

    const cell = cells.find((c) => c.level === rule.level && c.purpose === rule.purpose);
    cell.state = rule.state;
    cell.evidence.push({
      sessionId: context.sessionId ?? null,
      activityRunId: context.activityRunId ?? null,
      observationCode: rule.requiredObservations[0],
      ruleId: rule.id,
    });
  }

  return cells;
}

export function applyRules(observations, rulesConfig, context = {}) {
  return applySurpassed(matchRules(observations, rulesConfig, context));
}

export function applySurpassed(cells) {
  const purposes = [...new Set(cells.map((c) => c.purpose))];

  for (const purpose of purposes) {
    const columnCells = cells.filter((c) => c.purpose === purpose);
    const masteredLevels = columnCells.filter((c) => c.state === 'mastered').map((c) => c.level);
    if (masteredLevels.length === 0) continue;

    const highestMastered = Math.max(...masteredLevels);
    for (const cell of columnCells) {
      if (cell.level < highestMastered && cell.state === 'not-used') {
        cell.state = 'surpassed';
      }
    }
  }

  return cells;
}

const STATE_RANK = { 'not-used': 0, emerging: 1, mastered: 2 };

export function mergeCells(cellsArrays) {
  const merged = buildEmptyCells();

  for (const cells of cellsArrays) {
    for (const cell of cells) {
      const target = merged.find((c) => c.level === cell.level && c.purpose === cell.purpose);
      if (STATE_RANK[cell.state] > STATE_RANK[target.state]) {
        target.state = cell.state;
      }
      target.evidence.push(...cell.evidence);
    }
  }

  return merged;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/core/matrix/index.test.js`
Expected: PASS, all tests green (existing `applyRules`/`applySurpassed` tests unchanged and still passing, plus the new ones).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test -- --run`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/matrix/index.js src/core/matrix/index.test.js
git commit -m "feat: split applyRules into matchRules + applySurpassed, add mergeCells"
```

---

### Task 2: `matrix-rules.json` — cover all activities' observation codes

**Files:**
- Modify: `src/data/matrix-rules.json`
- Modify: `src/core/matrix/index.test.js`

**Interfaces:**
- Consumes: `matchRules` from Task 1 (for the new verification tests)
- Produces: 8 new rule entries, consumed by every existing caller of `applyRules`/`matchRules` (no signature change)

- [ ] **Step 1: Write the failing tests**

Add this `describe` block to `src/core/matrix/index.test.js`:

```js
describe('core/matrix rules coverage for Phase 3 activities', () => {
  it('maps peek-a-boo observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'anticipatory-movement', source: 'parent' },
        { code: 'smile', source: 'parent' },
        { code: 'gaze-to-face', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 1 && c.purpose === 'social').state).toBe('mastered');
    expect(cells.find((c) => c.level === 2 && c.purpose === 'social').state).toBe('mastered');
    expect(cells.find((c) => c.level === 3 && c.purpose === 'social').state).toBe('mastered');
  });

  it('maps not-this-one observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'head-turn', source: 'parent' },
        { code: 'vocal-protest', source: 'parent' },
        { code: 'word-no', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 2 && c.purpose === 'refuse').state).toBe('mastered');
    expect(cells.find((c) => c.level === 3 && c.purpose === 'refuse').state).toBe('mastered');
    expect(cells.find((c) => c.level === 6 && c.purpose === 'refuse').state).toBe('mastered');
  });

  it('maps whats-in-the-box observations to their expected cells', () => {
    const cells = matchRules(
      [
        { code: 'show', source: 'parent' },
        { code: 'comment', source: 'parent' },
      ],
      rulesConfig,
      {}
    );
    expect(cells.find((c) => c.level === 4 && c.purpose === 'information').state).toBe('mastered');
    expect(cells.find((c) => c.level === 6 && c.purpose === 'information').state).toBe('mastered');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/core/matrix/index.test.js`
Expected: FAIL — the new observation codes don't match any rule yet, so the asserted cells stay `not-used`.

- [ ] **Step 3: Add the 8 new rules to `src/data/matrix-rules.json`**

Replace the file with:

```json
{
  "engineVersion": "0.1.0",
  "rules": [
    { "id": "rule-refuse-l3-push-away", "level": 3, "purpose": "refuse", "state": "mastered", "requiredObservations": ["push-away"] },
    { "id": "rule-obtain-l3-reach", "level": 3, "purpose": "obtain", "state": "mastered", "requiredObservations": ["reach"] },
    { "id": "rule-obtain-l4-point", "level": 4, "purpose": "obtain", "state": "mastered", "requiredObservations": ["point"] },
    { "id": "rule-social-l3-vocalise", "level": 3, "purpose": "social", "state": "mastered", "requiredObservations": ["vocalise"] },
    { "id": "rule-information-l4-label", "level": 4, "purpose": "information", "state": "mastered", "requiredObservations": ["label"] },
    { "id": "rule-social-l4-gaze-to-parent", "level": 4, "purpose": "social", "state": "mastered", "requiredObservations": ["gaze-to-parent"] },
    { "id": "rule-social-l6-word", "level": 6, "purpose": "social", "state": "mastered", "requiredObservations": ["word"] },
    { "id": "rule-social-l1-anticipatory-movement", "level": 1, "purpose": "social", "state": "mastered", "requiredObservations": ["anticipatory-movement"] },
    { "id": "rule-social-l2-smile", "level": 2, "purpose": "social", "state": "mastered", "requiredObservations": ["smile"] },
    { "id": "rule-social-l3-gaze-to-face", "level": 3, "purpose": "social", "state": "mastered", "requiredObservations": ["gaze-to-face"] },
    { "id": "rule-refuse-l2-head-turn", "level": 2, "purpose": "refuse", "state": "mastered", "requiredObservations": ["head-turn"] },
    { "id": "rule-refuse-l3-vocal-protest", "level": 3, "purpose": "refuse", "state": "mastered", "requiredObservations": ["vocal-protest"] },
    { "id": "rule-refuse-l6-word-no", "level": 6, "purpose": "refuse", "state": "mastered", "requiredObservations": ["word-no"] },
    { "id": "rule-information-l4-show", "level": 4, "purpose": "information", "state": "mastered", "requiredObservations": ["show"] },
    { "id": "rule-information-l6-comment", "level": 6, "purpose": "information", "state": "mastered", "requiredObservations": ["comment"] }
  ]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/core/matrix/index.test.js`
Expected: PASS, all tests green.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test -- --run`
Expected: PASS, all tests green — the 7 pre-existing rules and their tests are untouched.

- [ ] **Step 6: Commit**

```bash
git add src/data/matrix-rules.json src/core/matrix/index.test.js
git commit -m "feat: add matrix rules for peek-a-boo, not-this-one, whats-in-the-box"
```

---

### Task 3: `SessionOverviewPage` — list all 4 activities, drive the loop

**Files:**
- Modify: `src/routes/SessionOverviewPage.jsx` (full rewrite)
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `useSessionState` from `../state/SessionContext.jsx` (existing); `activities` from `../data/activities.json` (existing)
- Produces: navigates to `/session/activity/prebrief` (next undone activity, consumed by Task 4) or `/session/results` (all done)

- [ ] **Step 1: Replace the `sessionOverview` i18n block**

In `src/i18n/en.json`, find:

```json
  "sessionOverview": {
    "title": "Today's session",
    "activityCount": "1 activity",
    "beginButton": "Begin"
  },
```

Replace with:

```json
  "sessionOverview": {
    "title": "Today's session",
    "progressLabel": "{completed} of {total} activities done",
    "continueButton": "Continue",
    "seeResultsButton": "See results",
    "doneLabel": "Done"
  },
```

- [ ] **Step 2: Rewrite `SessionOverviewPage.jsx`**

Replace the full file contents with:

```jsx
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function SessionOverviewPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const completedCount = session.activityRuns.length;
  const allDone = completedCount >= activities.length;

  return (
    <main>
      <h1>{strings.sessionOverview.title}</h1>
      <p>
        {strings.sessionOverview.progressLabel
          .replace('{completed}', completedCount)
          .replace('{total}', activities.length)}
      </p>
      <ul>
        {activities.map((activity, index) => (
          <li key={activity.id}>
            {activity.name}
            {index < completedCount ? ` — ${strings.sessionOverview.doneLabel}` : ''}
          </li>
        ))}
      </ul>
      {allDone ? (
        <button onClick={() => navigate('/session/results')}>
          {strings.sessionOverview.seeResultsButton}
        </button>
      ) : (
        <button onClick={() => navigate('/session/activity/prebrief')}>
          {strings.sessionOverview.continueButton}
        </button>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged (no tests target this route file).

- [ ] **Step 4: Commit**

```bash
git add src/routes/SessionOverviewPage.jsx src/i18n/en.json
git commit -m "feat: list all 4 activities and drive the session loop from Overview"
```

---

### Task 4: `ActivityPrebriefPage` — generalize to the current activity

**Files:**
- Modify: `src/routes/ActivityPrebriefPage.jsx` (full rewrite)

**Interfaces:**
- Consumes: `useSessionState` (new); `activities[session.activityRuns.length]` as "current activity" (same derivation as Task 3)
- Produces: no interface change — still navigates to `/session/activity/run` with `{ state: { audioAvailable } }`

- [ ] **Step 1: Rewrite `ActivityPrebriefPage.jsx`**

Replace the full file contents with:

```jsx
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

This is the same component structure as before (including the I3 fix from Phase 2's final review — `getAudioContext()`/`resume()` inside `try`, the calibration timeout race, `finally { setCalibrating(false) }`), with `bubbleTime` replaced by `currentActivity` derived from session state, plus the two guards.

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityPrebriefPage.jsx
git commit -m "feat: generalize Activity Prebrief to the current session activity"
```

---

### Task 5: `ActivityRunPage` — generalize to the current activity

**Files:**
- Modify: `src/routes/ActivityRunPage.jsx` (full rewrite)

**Interfaces:**
- Consumes: `useSessionState` (new, alongside existing `useSessionDispatch`); `activities[session.activityRuns.length]` as current activity
- Produces: no interface change — same `RECORD_TRIAL`/`START_ACTIVITY_RUN` dispatch shapes

- [ ] **Step 1: Rewrite `ActivityRunPage.jsx`**

Replace the full file contents with:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  }, [dispatch, currentActivity]);

  // Separate from the mount effect above (which intentionally has no
  // cleanup — see its comment in recordTrial). This effect only disarms
  // the detector on unmount (e.g. hardware/browser back mid-activity) so
  // a stray sound can't fire a phantom trial into an unmounted page. It
  // does NOT call resetAudioSession(), which would reintroduce the
  // StrictMode double-invoke hazard the mount effect's comment guards
  // against. hasActiveSession() guards against the normal-completion path,
  // where resetAudioSession() already ran and nulled the singleton —
  // without this guard, getDetector() would auto-vivify (and immediately
  // orphan) a brand-new AudioContext just to disarm it.
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
      <h1>{currentActivity.name}</h1>
      <p>
        {strings.activityRun.trialLabel
          .replace('{current}', trialIndex + 1)
          .replace('{total}', currentActivity.trialCount)}
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

Everything from Phase 2 (dual-source recording, `recordedRef` guard, the StrictMode-safe mount effect, the `hasActiveSession()`-guarded unmount cleanup) is preserved exactly — only `bubbleTime` becomes `currentActivity`, sourced from `session.activityRuns.length`, plus the two guards placed after all hooks (matching the existing `ReportPreviewPage` pattern for hooks-then-guards ordering) and a guard inside the mount effect so it doesn't dispatch/create an AudioContext on a render that's about to redirect away.

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityRunPage.jsx
git commit -m "feat: generalize Activity Run to the current session activity"
```

---

### Task 6: `ActivityReviewPage` — generalize tags, loop back to Overview

**Files:**
- Modify: `src/routes/ActivityReviewPage.jsx` (full rewrite)

**Interfaces:**
- Consumes: `useSessionState` (new, alongside existing `useSessionDispatch`); `activities[session.activityRuns.length]` as current activity
- Produces: navigates to `/session/overview` (changed from `/session/results`) after `COMPLETE_ACTIVITY_RUN` — consumed by Task 3's loop

- [ ] **Step 1: Rewrite `ActivityReviewPage.jsx`**

Replace the full file contents with:

```jsx
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch, useSessionState } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const { session } = useSessionState();
  const [checked, setChecked] = useState({});

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const currentActivity = activities[session.activityRuns.length];
  if (!currentActivity) {
    return <Navigate to="/session/results" replace />;
  }

  const tagOptions = currentActivity.expectedBehaviours.map((code, index) => ({
    code,
    label: currentActivity.reviewTags[index],
  }));

  function toggle(code) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function handleConfirm() {
    for (const option of tagOptions) {
      if (checked[option.code]) {
        dispatch({ type: 'ADD_OBSERVATION', code: option.code, source: 'parent' });
      }
    }
    dispatch({ type: 'COMPLETE_ACTIVITY_RUN' });
    navigate('/session/overview');
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

Note the navigate target changed from `/session/results` to `/session/overview` — Overview now owns the "all done → results" branch (Task 3), so Review always loops back through Overview after each activity.

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityReviewPage.jsx
git commit -m "feat: generalize Activity Review tags, loop back to Overview"
```

---

### Task 7: `SessionResultsPage` + `ResponseTimeRibbon` — pool across all activities

**Files:**
- Modify: `src/routes/SessionResultsPage.jsx` (full rewrite)
- Modify: `src/components/ribbon/ResponseTimeRibbon.jsx:28,44`

**Interfaces:**
- Consumes: `matchRules`, `mergeCells`, `applySurpassed` from Task 1 (`../core/matrix/index.js`)
- Produces: no external interface change — `ResponseTimeRibbon`/`MatrixProfileGrid` still receive the same prop shapes, just computed differently

- [ ] **Step 1: Fix the Ribbon's React key collision for pooled trials**

Pooling trials from up to 4 activities means `trial.index` (each activity's own 0/1/2 per-trial index) repeats across activities — `key={trial.index}` would produce duplicate React keys. The list's own `.map()` index is unique across the whole pooled array and is safe to use instead.

In `src/components/ribbon/ResponseTimeRibbon.jsx`, there are two occurrences of `key={trial.index}` (line 28, inside the no-response `<circle>`, and line 44, on the responded-trial `<g>`). Change both to `key={index}` (the existing `.map((trial, index) => ...)` parameter already in scope at both locations — no other changes to either line).

- [ ] **Step 2: Rewrite `SessionResultsPage.jsx`**

Replace the full file contents with:

```jsx
import { useNavigate, Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import ResponseTimeRibbon from '../components/ribbon/ResponseTimeRibbon.jsx';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import rulesConfig from '../data/matrix-rules.json';
import taxonomy from '../data/matrix-taxonomy.json';
import latencyBandsConfig from '../data/latency-bands.json';
import strings from '../i18n/en.json';

export default function SessionResultsPage() {
  const navigate = useNavigate();
  const { session } = useSessionState();

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  const perRunCells = session.activityRuns.map((run) =>
    matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
  );
  const cells = applySurpassed(mergeCells(perRunCells));
  const trials = session.activityRuns.flatMap((run) => run.trials);
  const flags = computeFlags({ trials, cells, latencyBandsConfig });

  return (
    <main>
      <h1>{strings.sessionResults.title}</h1>
      <ResponseTimeRibbon trials={trials} bands={latencyBandsConfig} />
      <p>{latencyBandsConfig.disclaimer}</p>
      <MatrixProfileGrid cells={cells} taxonomy={taxonomy} />
      <h2>{strings.sessionResults.flagsTitle}</h2>
      {flags.length === 0 && <p>{strings.sessionResults.noFlags}</p>}
      <ul>
        {flags.map((flag) => (
          <li key={flag.id}>{flag.label}</li>
        ))}
      </ul>
      <button onClick={() => navigate('/session/report')}>{strings.sessionResults.reportButton}</button>
    </main>
  );
}
```

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged (neither file has Vitest coverage).

- [ ] **Step 4: Commit**

```bash
git add src/routes/SessionResultsPage.jsx src/components/ribbon/ResponseTimeRibbon.jsx
git commit -m "feat: pool Session Results across all completed activity runs"
```

---

### Task 8: `ReportPreviewPage` — pool across all activities

**Files:**
- Modify: `src/routes/ReportPreviewPage.jsx` (full rewrite)

**Interfaces:**
- Consumes: `matchRules`, `mergeCells`, `applySurpassed` from Task 1 — same aggregation pattern as Task 7

- [ ] **Step 1: Rewrite `ReportPreviewPage.jsx`**

Replace the full file contents with:

```jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { getChildProfile } from '../core/storage/index.js';
import { matchRules, mergeCells, applySurpassed } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { generateReport } from '../core/report/index.js';
import MatrixProfileGrid from '../components/matrix/MatrixProfileGrid.jsx';
import rulesConfig from '../data/matrix-rules.json';
import latencyBandsConfig from '../data/latency-bands.json';
import taxonomy from '../data/matrix-taxonomy.json';
import strings from '../i18n/en.json';

export default function ReportPreviewPage() {
  const { session } = useSessionState();
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!session?.activityRuns?.length) return;
    getChildProfile().then((child) => {
      const perRunCells = session.activityRuns.map((run) =>
        matchRules(run.observations, rulesConfig, { sessionId: session.id, activityRunId: run.id })
      );
      const cells = applySurpassed(mergeCells(perRunCells));
      const trials = session.activityRuns.flatMap((run) => run.trials);
      const flags = computeFlags({ trials, cells, latencyBandsConfig });
      setReport(generateReport({ session, child, cells, flags, trials }));
    });
  }, [session]);

  if (!session?.activityRuns?.length) {
    return <Navigate to="/" replace />;
  }

  if (!report) return null;

  return (
    <main>
      <h1>{strings.reportPreview.title}</h1>
      <p>{report.sections.child.displayName} — {report.sections.child.ageMonths} months</p>
      <h2>{strings.reportPreview.disclaimersTitle}</h2>
      <ul>
        {report.disclaimers.map((disclaimer, index) => (
          <li key={index}>{disclaimer}</li>
        ))}
      </ul>
      <h2>{strings.reportPreview.matrixTitle}</h2>
      <MatrixProfileGrid cells={report.sections.matrixProfile} taxonomy={taxonomy} />
      <h2>{strings.reportPreview.flagsTitle}</h2>
      {report.sections.flags.length === 0 && <p>{strings.reportPreview.noFlags}</p>}
      <ul>
        {report.sections.flags.map((flag) => (
          <li key={flag.id}>{flag.label}</li>
        ))}
      </ul>
      <button onClick={() => window.print()}>{strings.reportPreview.printButton}</button>
    </main>
  );
}
```

The `if (!session?.activityRuns?.length) return;` guard at the top of the `useEffect` (from Phase 1's C1 fix) is preserved unchanged — still required for the same reason (the render-body guard below it can't stop an already-registered effect from running on a null/empty session).

- [ ] **Step 2: Verify the full test suite still passes**

Run: `npm test -- --run`
Expected: PASS — unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ReportPreviewPage.jsx
git commit -m "feat: pool Report Preview across all completed activity runs"
```

---

### Task 9: Manual verification and progress log

**Files:**
- Modify: `PROGRESS.md`

No further source changes — this task is verification and documentation only.

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm test -- --run`
Expected: PASS, all green.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: succeeds cleanly. (Per the lesson from Phase 2's final review: always confirm against a real build, not just `npm run dev` — this phase touches no Worklet/asset-bundling code, but running it costs nothing and keeps the habit.)

- [ ] **Step 3: Full 4-activity browser walkthrough**

Start the dev server (`npm run dev`) and, using browser tooling, walk through an entire session end to end: Home → Start new session → Session Overview (confirm it lists all 4 activities, shows "0 of 4 activities done") → Continue → Bubble Time Prebrief → Run (3 trials, mix of tap/no-response) → Review (check a couple of boxes) → Confirm (lands back on Overview, now showing "1 of 4 done" with Bubble Time marked Done) → Continue → Peek-a-boo → ... repeat for all 4 activities ... → after the 4th activity's Review, Overview should show "4 of 4 done" and offer "See results" instead of "Continue" → Session Results (confirm the Ribbon shows up to 12 trials total — 3 per activity — and the Matrix Grid shows cells filled from multiple purpose columns, not just the ones Bubble Time alone would produce) → View report → Report Preview (same pooled data). Check console messages at each step for errors — there should be none.

Also verify the edge case: after finishing all 4, manually navigate (or reload) directly to `/session/activity/prebrief` — confirm it redirects to `/session/results` instead of crashing (the `!currentActivity` guard from Task 4).

- [ ] **Step 4: Update `PROGRESS.md`**

Add a new dated entry above the current top entry, titled `## 2026-07-31 — Session 6: Phase 3 — Full content`, following the existing Done/Watch out for/Next up format. Summarize: the `matchRules`/`mergeCells` split in `core/matrix` and why (surpassed must be computed session-wide, not per-run), the 8 new rules and which activities/levels they cover, the `session.activityRuns.length`-derived current-activity pattern used across all 4 route files (and the new guards), the Overview-driven activity loop (Review → Overview → next Prebrief, or → Results once all 4 are done), the Ribbon's `trial.index` → map-index key fix, and what the browser walkthrough in Step 3 confirmed.

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: log Phase 3 full-content session"
```
