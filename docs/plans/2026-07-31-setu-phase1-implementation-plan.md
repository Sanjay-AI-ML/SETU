# SETU Phase 1 — Bubble Time Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run one complete Bubble Time session end to end — Child Profile → Home → Session Overview → Activity Pre-brief → Activity Run (serve → parent-tap → latency) → Activity Review (parent tags observed behaviours) → Session Results (real Response-Time Ribbon + Matrix Profile Grid + concern flags) → Report Preview — using **parent-tap only** (no audio-onset detection, no MediaPipe). This is the demo-safe baseline: if everything after this phase fails, this still demonstrates all six required features in degraded form.

**Architecture:** Five new pure-logic `core/` modules (model factories, latency timing, matrix rules engine, concern flags, report templating), all zero-React and Vitest-tested. A thin `state/SessionContext.jsx` (React Context + `useReducer`) holds the in-progress session and delegates all real logic to `core/`. Seven new route components consume that context. Two signature components (`ResponseTimeRibbon`, `MatrixProfileGrid`) are pure presentational SVG/CSS, receiving computed data as props — no internal fetching or state.

**Tech Stack:** Same as Phase 0 — React 18 + Vite 5 (JS, not TS) · react-router-dom 6 (nested layout routes with `<Outlet />`) · idb-keyval · Vitest · Web Audio API (`AudioContext.currentTime`) for serve/return timing.

## Global Constraints

(Copied verbatim from `CLAUDE.md` — every task below implicitly inherits these.)

- No backend. No paid APIs. Everything client-side.
- No real clinical data. All demo data is self-recorded or simulated and must be labelled as such in-app.
- Matrix mapping is rule-based JSON — deliberately NOT ML.
- The app must never imply a diagnosis.
- Timing uses the Web Audio clock (`AudioContext.currentTime`), never `Date.now()`.
- `core/` contains zero React — it is the only place tests go.
- No Redux/Zustand/query libs. Context + `useReducer` only.
- Project root is `D:\Smart Ability Hackathon\SETU` — never write outside it.
- Phase 1 is parent-tap only: no `core/vision`, no MediaPipe, no audio-onset detection (`core/latency` in this phase only marks timestamps — the return side is always a parent tap, `returnSource: 'parent-tap'` or `'none'`). Those are Phase 2/4.
- `surpassed` semantics must be implemented per the architecture doc: when a higher level is mastered in a purpose column, lower not-used levels in that column become `surpassed`.
- Only **Bubble Time** ships in Phase 1 (Obtain + Social purposes). The other 3 activities are Phase 3.
- "Resume session" and "View history" stay disabled in Phase 1 (session history/resume is out of scope for a single vertical slice — deferred, not forgotten, to whenever multi-session history is built).

---

## File Structure

```
SETU/
├─ src/
│  ├─ App.jsx                                    (modify — Task 18: nested layout routes)
│  ├─ core/
│  │  ├─ model/
│  │  │  ├─ index.js                             (create — Task 1)
│  │  │  └─ index.test.js                        (create — Task 1)
│  │  ├─ latency/
│  │  │  ├─ index.js                             (create — Task 2)
│  │  │  └─ index.test.js                        (create — Task 2)
│  │  ├─ matrix/
│  │  │  ├─ index.js                             (create — Task 3)
│  │  │  ├─ index.test.js                        (create — Task 3)
│  │  │  ├─ flags.js                             (create — Task 4)
│  │  │  └─ flags.test.js                        (create — Task 4)
│  │  ├─ report/
│  │  │  ├─ index.js                             (create — Task 5)
│  │  │  └─ index.test.js                        (create — Task 5)
│  │  └─ storage/
│  │     ├─ index.js                             (modify — Task 6)
│  │     └─ index.test.js                        (modify — Task 6)
│  ├─ state/
│  │  └─ SessionContext.jsx                      (create — Task 7)
│  ├─ components/
│  │  ├─ common/
│  │  │  ├─ ConsentGate.jsx                       (modify — Task 8: Outlet pattern)
│  │  │  └─ RequireChildProfile.jsx               (create — Task 8)
│  │  ├─ ribbon/
│  │  │  └─ ResponseTimeRibbon.jsx                (create — Task 14)
│  │  └─ matrix/
│  │     └─ MatrixProfileGrid.jsx                 (create — Task 15)
│  ├─ routes/
│  │  ├─ ChildProfilePage.jsx                     (create — Task 9)
│  │  ├─ HomePage.jsx                             (modify — Task 10)
│  │  ├─ SessionOverviewPage.jsx                  (create — Task 11)
│  │  ├─ ActivityPrebriefPage.jsx                 (create — Task 11)
│  │  ├─ ActivityRunPage.jsx                      (create — Task 12)
│  │  ├─ ActivityReviewPage.jsx                   (create — Task 13)
│  │  ├─ SessionResultsPage.jsx                   (create — Task 16)
│  │  └─ ReportPreviewPage.jsx                    (create — Task 17)
│  └─ i18n/
│     └─ en.json                                  (modify — Tasks 9, 11, 12, 13, 16, 17)
```

**Deliberately out of scope for this plan:** `core/vision`, MediaPipe, audio-onset detection, the other 3 activities, Tamil/Hindi content for new strings (English only, matching Phase 0's precedent), session resume/history, Report PDF export polish beyond `window.print()`.

---

### Task 1: `core/model` — data factories

**Files:**
- Create: `src/core/model/index.js`
- Create: `src/core/model/index.test.js`

**Interfaces:**
- Produces: `createChildProfile({displayName, ageMonths, homeLanguages, notes})`, `createSession({childId})`, `createActivityRun({activityId})`, `createTrial({index, serveAt})`, `createObservation({code, source, confidence})` — consumed by `state/SessionContext.jsx` (Task 7) and every route from Task 9 onward.

- [ ] **Step 1: Write the failing test — `src/core/model/index.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  createChildProfile,
  createSession,
  createActivityRun,
  createTrial,
  createObservation,
} from './index.js';

describe('core/model factories', () => {
  it('createChildProfile fills defaults and required fields', () => {
    const profile = createChildProfile({ displayName: 'A', ageMonths: 24 });
    expect(profile.id).toBeTypeOf('string');
    expect(profile.displayName).toBe('A');
    expect(profile.ageMonths).toBe(24);
    expect(profile.homeLanguages).toEqual([]);
    expect(profile.notes).toBe('');
    expect(profile.createdAt).toBeTypeOf('string');
  });

  it('createSession starts with empty activityRuns and null endedAt', () => {
    const session = createSession({ childId: 'child-1' });
    expect(session.childId).toBe('child-1');
    expect(session.activityRuns).toEqual([]);
    expect(session.endedAt).toBeNull();
    expect(session.matrixProfile).toBeNull();
    expect(session.flags).toEqual([]);
  });

  it('createActivityRun starts with empty trials and observations', () => {
    const run = createActivityRun({ activityId: 'bubble-time' });
    expect(run.activityId).toBe('bubble-time');
    expect(run.trials).toEqual([]);
    expect(run.observations).toEqual([]);
  });

  it('createTrial starts unresponded with no returnAt', () => {
    const trial = createTrial({ index: 0, serveAt: 1.5 });
    expect(trial.index).toBe(0);
    expect(trial.serveAt).toBe(1.5);
    expect(trial.returnAt).toBeNull();
    expect(trial.returnSource).toBe('none');
    expect(trial.latencyMs).toBeNull();
    expect(trial.responded).toBe(false);
  });

  it('createObservation records code and source with a timestamp', () => {
    const obs = createObservation({ code: 'reach', source: 'parent' });
    expect(obs.code).toBe('reach');
    expect(obs.source).toBe('parent');
    expect(obs.confidence).toBeNull();
    expect(obs.at).toBeTypeOf('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/model/index.test.js`
Expected: FAIL — `src/core/model/index.js` does not exist yet.

- [ ] **Step 3: Write `src/core/model/index.js`**

```js
export function createChildProfile({ displayName, ageMonths, homeLanguages = [], notes = '' }) {
  return {
    id: crypto.randomUUID(),
    displayName,
    ageMonths,
    homeLanguages,
    notes,
    createdAt: new Date().toISOString(),
  };
}

export function createSession({ childId }) {
  return {
    id: crypto.randomUUID(),
    childId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    activityRuns: [],
    matrixProfile: null,
    flags: [],
    reportId: null,
  };
}

export function createActivityRun({ activityId }) {
  return {
    id: crypto.randomUUID(),
    activityId,
    startedAt: new Date().toISOString(),
    trials: [],
    observations: [],
  };
}

export function createTrial({ index, serveAt }) {
  return {
    index,
    serveAt,
    returnAt: null,
    returnSource: 'none',
    latencyMs: null,
    responded: false,
  };
}

export function createObservation({ code, source, confidence = null }) {
  return {
    code,
    source,
    confidence,
    at: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/model/index.test.js`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/model/index.js src/core/model/index.test.js
git commit -m "feat: add core/model data factories"
```

---

### Task 2: `core/latency` — Web Audio clock timing

**Files:**
- Create: `src/core/latency/index.js`
- Create: `src/core/latency/index.test.js`

**Interfaces:**
- Consumes: `latency-bands.json` shape (already exists at `src/data/latency-bands.json`) — `{ bands: [{id, label, maxMs}] }`.
- Produces: `markTime(audioContextLike)`, `computeLatencyMs(serveAt, returnAt)`, `classifyBand(latencyMs, bandsConfig)` — consumed by `ActivityRunPage.jsx` (Task 12) and `core/matrix/flags.js` (Task 4). `markTime` takes anything with a `.currentTime` number (a real `AudioContext` in the browser, a plain object in tests) — kept decoupled from the browser-only `AudioContext` global so it stays testable under Vitest's `node` environment.

- [ ] **Step 1: Write the failing test — `src/core/latency/index.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { markTime, computeLatencyMs, classifyBand } from './index.js';

const bandsConfig = {
  bands: [
    { id: 'within', label: 'Within expected range', maxMs: 2000 },
    { id: 'borderline', label: 'Borderline', maxMs: 3500 },
    { id: 'delayed', label: 'Delayed', maxMs: null },
  ],
};

describe('core/latency', () => {
  it('markTime reads currentTime off an audio-context-like object', () => {
    expect(markTime({ currentTime: 5.25 })).toBe(5.25);
  });

  it('computeLatencyMs converts a serve/return gap in seconds to whole milliseconds', () => {
    expect(computeLatencyMs(1.0, 2.5)).toBe(1500);
    expect(computeLatencyMs(0, 0.001)).toBe(1);
  });

  it('classifyBand picks the first band whose maxMs the latency is within', () => {
    expect(classifyBand(500, bandsConfig)).toBe('within');
    expect(classifyBand(2000, bandsConfig)).toBe('within');
    expect(classifyBand(2001, bandsConfig)).toBe('borderline');
    expect(classifyBand(3500, bandsConfig)).toBe('borderline');
  });

  it('classifyBand falls into the last band (null maxMs) for anything above every ceiling', () => {
    expect(classifyBand(10000, bandsConfig)).toBe('delayed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/latency/index.test.js`
Expected: FAIL — `src/core/latency/index.js` does not exist yet.

- [ ] **Step 3: Write `src/core/latency/index.js`**

```js
export function markTime(audioContextLike) {
  return audioContextLike.currentTime;
}

export function computeLatencyMs(serveAt, returnAt) {
  return Math.round((returnAt - serveAt) * 1000);
}

export function classifyBand(latencyMs, bandsConfig) {
  for (const band of bandsConfig.bands) {
    if (band.maxMs === null || latencyMs <= band.maxMs) {
      return band.id;
    }
  }
  return bandsConfig.bands[bandsConfig.bands.length - 1].id;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/latency/index.test.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/latency/index.js src/core/latency/index.test.js
git commit -m "feat: add core/latency Web Audio clock timing helpers"
```

---

### Task 3: `core/matrix` — rules engine + surpassed logic

**Files:**
- Create: `src/core/matrix/index.js`
- Create: `src/core/matrix/index.test.js`

**Interfaces:**
- Consumes: `src/data/matrix-taxonomy.json` (`{levels: [{level, name, descriptor}], purposes: [{id, name, descriptor}]}`), `src/data/matrix-rules.json` (`{engineVersion, rules: [{id, level, purpose, state, requiredObservations}]}`) — both already exist.
- Produces: `buildEmptyCells()`, `applyRules(observations, rulesConfig, context)`, `applySurpassed(cells)` — consumed by `SessionResultsPage.jsx` (Task 16) and `core/matrix/flags.js` (Task 4). A cell is `{level, purpose, state, evidence: [{sessionId, activityRunId, observationCode, ruleId}]}`.

- [ ] **Step 1: Write the failing test — `src/core/matrix/index.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { buildEmptyCells, applyRules, applySurpassed } from './index.js';
import rulesConfig from '../../data/matrix-rules.json';

describe('core/matrix buildEmptyCells', () => {
  it('produces 28 cells, all not-used, one per level x purpose', () => {
    const cells = buildEmptyCells();
    expect(cells).toHaveLength(28);
    expect(cells.every((c) => c.state === 'not-used')).toBe(true);
    expect(cells.every((c) => c.evidence.length === 0)).toBe(true);
  });
});

describe('core/matrix applyRules', () => {
  it('marks a cell mastered when its required observation is present, with evidence', () => {
    const observations = [{ code: 'reach', source: 'parent' }];
    const cells = applyRules(observations, rulesConfig, {
      sessionId: 'session-1',
      activityRunId: 'run-1',
    });
    const cell = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    expect(cell.state).toBe('mastered');
    expect(cell.evidence).toEqual([
      { sessionId: 'session-1', activityRunId: 'run-1', observationCode: 'reach', ruleId: 'rule-obtain-l3-reach' },
    ]);
  });

  it('leaves cells with no matching rule as not-used', () => {
    const cells = applyRules([], rulesConfig, {});
    expect(cells.every((c) => c.state === 'not-used')).toBe(true);
  });
});

describe('core/matrix applySurpassed', () => {
  it('marks lower not-used levels in a column as surpassed once a higher level is mastered', () => {
    const observations = [
      { code: 'reach', source: 'parent' },
      { code: 'point', source: 'parent' },
    ];
    const cells = applyRules(observations, rulesConfig, {});
    const level1Obtain = cells.find((c) => c.level === 1 && c.purpose === 'obtain');
    const level2Obtain = cells.find((c) => c.level === 2 && c.purpose === 'obtain');
    const level3Obtain = cells.find((c) => c.level === 3 && c.purpose === 'obtain');
    const level4Obtain = cells.find((c) => c.level === 4 && c.purpose === 'obtain');
    expect(level1Obtain.state).toBe('surpassed');
    expect(level2Obtain.state).toBe('surpassed');
    expect(level3Obtain.state).toBe('mastered');
    expect(level4Obtain.state).toBe('mastered');
  });

  it('does not touch columns with no mastered cell', () => {
    const cells = applyRules([], rulesConfig, {});
    const refuseCells = cells.filter((c) => c.purpose === 'refuse');
    expect(refuseCells.every((c) => c.state === 'not-used')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/matrix/index.test.js`
Expected: FAIL — `src/core/matrix/index.js` does not exist yet.

- [ ] **Step 3: Write `src/core/matrix/index.js`**

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

export function applyRules(observations, rulesConfig, context = {}) {
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

  return applySurpassed(cells);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/matrix/index.test.js`
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/matrix/index.js src/core/matrix/index.test.js
git commit -m "feat: add core/matrix rules engine with surpassed semantics"
```

---

### Task 4: `core/matrix/flags` — rule-based concern flags

**Files:**
- Create: `src/core/matrix/flags.js`
- Create: `src/core/matrix/flags.test.js`

**Interfaces:**
- Consumes: `markTime`/`classifyBand` is NOT used here directly — flags takes already-computed `trials` (from `core/model`'s `Trial` shape) and `cells` (from `core/matrix`'s `applyRules`), plus `latencyBandsConfig` (`src/data/latency-bands.json` shape). Reuses `classifyBand` from `core/latency` (Task 2).
- Produces: `computeFlags({trials, cells, latencyBandsConfig})` → `[{id, label, severity}]` — consumed by `SessionResultsPage.jsx` (Task 16) and `ReportPreviewPage.jsx` (Task 17).

- [ ] **Step 1: Write the failing test — `src/core/matrix/flags.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { computeFlags } from './flags.js';
import { buildEmptyCells } from './index.js';

const latencyBandsConfig = {
  bands: [
    { id: 'within', label: 'Within expected range', maxMs: 2000 },
    { id: 'borderline', label: 'Borderline', maxMs: 3500 },
    { id: 'delayed', label: 'Delayed', maxMs: null },
  ],
};

function trial({ responded, latencyMs }) {
  return { index: 0, serveAt: 0, returnAt: responded ? 1 : null, returnSource: responded ? 'parent-tap' : 'none', latencyMs, responded };
}

describe('core/matrix flags', () => {
  it('flags when half or more trials had no response', () => {
    const trials = [trial({ responded: false, latencyMs: null }), trial({ responded: true, latencyMs: 1000 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-no-response-rate');
  });

  it('does not flag no-response when fewer than half of trials failed', () => {
    const trials = [
      trial({ responded: true, latencyMs: 500 }),
      trial({ responded: true, latencyMs: 500 }),
      trial({ responded: false, latencyMs: null }),
    ];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-response-rate');
  });

  it('flags when no behaviour above Level II was observed', () => {
    const cells = buildEmptyCells();
    const flags = computeFlags({ trials: [], cells, latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-no-behaviour-above-level-ii');
  });

  it('does not flag level-ii when a cell above Level II is mastered', () => {
    const cells = buildEmptyCells();
    cells.find((c) => c.level === 3 && c.purpose === 'obtain').state = 'mastered';
    const flags = computeFlags({ trials: [], cells, latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-no-behaviour-above-level-ii');
  });

  it('flags when median latency falls in the delayed band', () => {
    const trials = [trial({ responded: true, latencyMs: 5000 }), trial({ responded: true, latencyMs: 6000 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).toContain('flag-median-latency-delayed');
  });

  it('does not flag median latency when it is within range', () => {
    const trials = [trial({ responded: true, latencyMs: 500 }), trial({ responded: true, latencyMs: 700 })];
    const flags = computeFlags({ trials, cells: buildEmptyCells(), latencyBandsConfig });
    expect(flags.map((f) => f.id)).not.toContain('flag-median-latency-delayed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/matrix/flags.test.js`
Expected: FAIL — `src/core/matrix/flags.js` does not exist yet.

- [ ] **Step 3: Write `src/core/matrix/flags.js`**

```js
import { classifyBand } from '../latency/index.js';

const NO_RESPONSE_RATE_THRESHOLD = 0.5;

export function computeFlags({ trials, cells, latencyBandsConfig }) {
  const flags = [];

  if (hasHighNoResponseRate(trials)) {
    flags.push({
      id: 'flag-no-response-rate',
      label: 'No response in half or more of trials',
      severity: 'concern',
    });
  }

  if (!hasBehaviourAboveLevelTwo(cells)) {
    flags.push({
      id: 'flag-no-behaviour-above-level-ii',
      label: 'No communication behaviours observed above Level II',
      severity: 'concern',
    });
  }

  const medianBand = medianLatencyBand(trials, latencyBandsConfig);
  if (medianBand === 'delayed') {
    flags.push({
      id: 'flag-median-latency-delayed',
      label: 'Median response latency is in the delayed range',
      severity: 'concern',
    });
  }

  return flags;
}

function hasHighNoResponseRate(trials) {
  if (trials.length === 0) return false;
  const noResponseCount = trials.filter((t) => !t.responded).length;
  return noResponseCount / trials.length >= NO_RESPONSE_RATE_THRESHOLD;
}

function hasBehaviourAboveLevelTwo(cells) {
  return cells.some((c) => c.level > 2 && (c.state === 'mastered' || c.state === 'emerging'));
}

function medianLatencyBand(trials, latencyBandsConfig) {
  const latencies = trials
    .filter((t) => t.latencyMs != null)
    .map((t) => t.latencyMs)
    .sort((a, b) => a - b);
  if (latencies.length === 0) return null;

  const mid = Math.floor(latencies.length / 2);
  const median = latencies.length % 2 === 0 ? (latencies[mid - 1] + latencies[mid]) / 2 : latencies[mid];
  return classifyBand(median, latencyBandsConfig);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/matrix/flags.test.js`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/matrix/flags.js src/core/matrix/flags.test.js
git commit -m "feat: add core/matrix rule-based concern flags"
```

---

### Task 5: `core/report` — clinician report templating

**Files:**
- Create: `src/core/report/index.js`
- Create: `src/core/report/index.test.js`

**Interfaces:**
- Consumes: a `child` (from `core/model`'s `createChildProfile`), a `session` (`createSession`), `cells` (from `core/matrix`), `flags` (from `core/matrix/flags`), `trials`.
- Produces: `generateReport({session, child, cells, flags, trials})` → `Report` object — consumed by `ReportPreviewPage.jsx` (Task 17).

- [ ] **Step 1: Write the failing test — `src/core/report/index.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { generateReport } from './index.js';

describe('core/report generateReport', () => {
  it('builds a report with child, matrix, flags, and trial sections', () => {
    const session = { id: 'session-1' };
    const child = { displayName: 'Demo Child', ageMonths: 24 };
    const cells = [{ level: 1, purpose: 'obtain', state: 'not-used', evidence: [] }];
    const flags = [{ id: 'flag-x', label: 'Example flag', severity: 'concern' }];
    const trials = [{ index: 0, latencyMs: 1200, responded: true }];

    const report = generateReport({ session, child, cells, flags, trials });

    expect(report.id).toBeTypeOf('string');
    expect(report.sessionId).toBe('session-1');
    expect(report.generatedAt).toBeTypeOf('string');
    expect(report.sections.child).toEqual({ displayName: 'Demo Child', ageMonths: 24 });
    expect(report.sections.matrixProfile).toBe(cells);
    expect(report.sections.flags).toBe(flags);
    expect(report.sections.trials).toEqual([{ index: 0, latencyMs: 1200, responded: true }]);
  });

  it('always includes the required disclaimers, never a diagnostic claim', () => {
    const report = generateReport({
      session: { id: 's' },
      child: { displayName: 'X', ageMonths: 24 },
      cells: [],
      flags: [],
      trials: [],
    });
    expect(report.disclaimers.length).toBeGreaterThanOrEqual(4);
    expect(report.disclaimers.join(' ')).toMatch(/not a diagnostic tool/i);
    expect(report.disclaimers.join(' ')).toMatch(/not clinically validated/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/report/index.test.js`
Expected: FAIL — `src/core/report/index.js` does not exist yet.

- [ ] **Step 3: Write `src/core/report/index.js`**

```js
export function generateReport({ session, child, cells, flags, trials }) {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    sections: {
      child: { displayName: child.displayName, ageMonths: child.ageMonths },
      matrixProfile: cells,
      flags,
      trials: trials.map((t) => ({ index: t.index, latencyMs: t.latencyMs, responded: t.responded })),
    },
    disclaimers: [
      'SETU is not a diagnostic tool. It does not detect, diagnose, or rule out any condition.',
      'This is a hackathon prototype. Any sample data shown is self-recorded or simulated, never real clinical data.',
      'Latency thresholds are demo heuristics, not clinically validated.',
      'SETU produces structured observations for a qualified clinician to review — it is screening support, not a result.',
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/report/index.test.js`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/core/report/index.js src/core/report/index.test.js
git commit -m "feat: add core/report clinician report templating"
```

---

### Task 6: `core/storage` — child profile persistence

**Files:**
- Modify: `src/core/storage/index.js`
- Modify: `src/core/storage/index.test.js`

**Interfaces:**
- Produces (added to the existing module): `getChildProfile(): Promise<ChildProfile|null>`, `setChildProfile(profile): Promise<void>` — consumed by `RequireChildProfile.jsx` and `ChildProfilePage.jsx` (Task 8, 9).

- [ ] **Step 1: Add the failing tests to `src/core/storage/index.test.js`**

Add this `describe` block below the existing `describe('core/storage consent', ...)` block (keep the existing tests and imports; extend the destructured import to include the two new functions):

```js
const { getConsent, setConsent, getChildProfile, setChildProfile } = await import('./index.js');
```

```js
describe('core/storage child profile', () => {
  it('returns null when no child profile has been saved', async () => {
    await expect(getChildProfile()).resolves.toBeNull();
  });

  it('returns the saved profile after setChildProfile', async () => {
    const profile = { id: 'child-1', displayName: 'Demo Child', ageMonths: 24 };
    await setChildProfile(profile);
    await expect(getChildProfile()).resolves.toEqual(profile);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/storage/index.test.js`
Expected: FAIL — `getChildProfile`/`setChildProfile` are not exported yet.

- [ ] **Step 3: Add to `src/core/storage/index.js`**

Add below the existing `CONSENT_KEY` constant and its two functions:

```js
const CHILD_PROFILE_KEY = 'setu:child-profile';

export function getChildProfile() {
  return get(CHILD_PROFILE_KEY).then((value) => value ?? null);
}

export function setChildProfile(profile) {
  return set(CHILD_PROFILE_KEY, profile);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/storage/index.test.js`
Expected: PASS — 5 tests passing (3 existing consent + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/core/storage/index.js src/core/storage/index.test.js
git commit -m "feat: add child profile persistence to core/storage"
```

---

### Task 7: `state/SessionContext` — in-progress session state

**Files:**
- Create: `src/state/SessionContext.jsx`

**Interfaces:**
- Consumes: `createSession`, `createActivityRun`, `createTrial`, `createObservation` from `core/model` (Task 1).
- Produces: `<SessionProvider>`, `useSessionState()` → `{session, activityRun}`, `useSessionDispatch()` → dispatch function accepting actions `START_SESSION`, `START_ACTIVITY_RUN`, `RECORD_TRIAL`, `ADD_OBSERVATION`, `COMPLETE_ACTIVITY_RUN`. Consumed by every route from Task 10 onward.

No dedicated test file — this is a thin React state wrapper, not `core/` logic (per the "core has zero React, only tests go there" rule, non-core modules are covered by manual verification, matching the project's existing convention of ~10 Vitest tests total against `core/` only).

- [ ] **Step 1: Write `src/state/SessionContext.jsx`**

```jsx
import { createContext, useContext, useReducer } from 'react';
import { createSession, createActivityRun, createTrial, createObservation } from '../core/model/index.js';

const SessionStateContext = createContext(null);
const SessionDispatchContext = createContext(null);

function sessionReducer(state, action) {
  switch (action.type) {
    case 'START_SESSION':
      return { session: createSession({ childId: action.childId }), activityRun: null };

    case 'START_ACTIVITY_RUN':
      return { ...state, activityRun: createActivityRun({ activityId: action.activityId }) };

    case 'RECORD_TRIAL': {
      const trial = {
        ...createTrial({ index: action.index, serveAt: action.serveAt }),
        returnAt: action.returnAt,
        returnSource: action.returnSource,
        latencyMs: action.latencyMs,
        responded: action.responded,
      };
      return {
        ...state,
        activityRun: { ...state.activityRun, trials: [...state.activityRun.trials, trial] },
      };
    }

    case 'ADD_OBSERVATION': {
      const observation = createObservation({ code: action.code, source: action.source });
      return {
        ...state,
        activityRun: { ...state.activityRun, observations: [...state.activityRun.observations, observation] },
      };
    }

    case 'COMPLETE_ACTIVITY_RUN':
      return {
        ...state,
        session: { ...state.session, activityRuns: [...state.session.activityRuns, state.activityRun] },
        activityRun: null,
      };

    default:
      throw new Error(`Unknown session action type: ${action.type}`);
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, { session: null, activityRun: null });
  return (
    <SessionStateContext.Provider value={state}>
      <SessionDispatchContext.Provider value={dispatch}>{children}</SessionDispatchContext.Provider>
    </SessionStateContext.Provider>
  );
}

export function useSessionState() {
  const ctx = useContext(SessionStateContext);
  if (!ctx) throw new Error('useSessionState must be used within a SessionProvider');
  return ctx;
}

export function useSessionDispatch() {
  const ctx = useContext(SessionDispatchContext);
  if (!ctx) throw new Error('useSessionDispatch must be used within a SessionProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/state/SessionContext.jsx
git commit -m "feat: add SessionContext for in-progress session state"
```

---

### Task 8: Route gating — `ConsentGate` as a layout route, `RequireChildProfile`

Phase 1 adds 7 new routes that all need the same two gates (consent acknowledged, child profile exists) stacked in front of them. Refactoring `ConsentGate` from a children-wrapping component to a React Router layout route (using `<Outlet />`) avoids wrapping every single route element by hand.

**Files:**
- Modify: `src/components/common/ConsentGate.jsx`
- Create: `src/components/common/RequireChildProfile.jsx`

**Interfaces:**
- Consumes: `getConsent` from `core/storage` (existing), `getChildProfile` from `core/storage` (Task 6).
- Produces: `<ConsentGate />` and `<RequireChildProfile />` as React Router layout-route elements (no `children` prop — they render `<Outlet />`) — consumed by `App.jsx` (Task 18).

- [ ] **Step 1: Rewrite `src/components/common/ConsentGate.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getConsent } from '../../core/storage/index.js';

export default function ConsentGate() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    getConsent().then((acknowledged) => {
      setStatus(acknowledged ? 'acknowledged' : 'unacknowledged');
    });
  }, []);

  if (status === 'checking') return null;
  if (status === 'unacknowledged') return <Navigate to="/consent" replace />;
  return <Outlet />;
}
```

- [ ] **Step 2: Create `src/components/common/RequireChildProfile.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getChildProfile } from '../../core/storage/index.js';

export default function RequireChildProfile() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    getChildProfile().then((profile) => {
      setStatus(profile ? 'present' : 'missing');
    });
  }, []);

  if (status === 'checking') return null;
  if (status === 'missing') return <Navigate to="/child-profile" replace />;
  return <Outlet />;
}
```

- [ ] **Step 3: Commit**

This intentionally leaves `App.jsx` temporarily broken (it still uses the old `children`-based `<ConsentGate>` API) — Task 18 fixes routing. Commit anyway since these two files are complete, self-contained units; Task 9–17 don't touch routing.

```bash
git add src/components/common/ConsentGate.jsx src/components/common/RequireChildProfile.jsx
git commit -m "refactor: ConsentGate to layout-route pattern, add RequireChildProfile gate"
```

---

### Task 9: `ChildProfilePage` — Screen #2

**Files:**
- Create: `src/routes/ChildProfilePage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `setChildProfile` from `core/storage` (Task 6), `createChildProfile` from `core/model` (Task 1).
- Produces: a route that, on submit, persists a child profile and navigates to `/`.

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

Add this key inside the top-level object, alongside the existing `consent` and `home` keys:

```json
  "childProfile": {
    "title": "Tell us about your child",
    "displayNameLabel": "Child's name or initials",
    "ageMonthsLabel": "Age in months",
    "saveButton": "Save and continue"
  },
```

- [ ] **Step 2: Create `src/routes/ChildProfilePage.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChildProfile } from '../core/model/index.js';
import { setChildProfile } from '../core/storage/index.js';
import strings from '../i18n/en.json';

export default function ChildProfilePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [ageMonths, setAgeMonths] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const profile = createChildProfile({ displayName, ageMonths: Number(ageMonths) });
    await setChildProfile(profile);
    navigate('/', { replace: true });
  }

  return (
    <main>
      <h1>{strings.childProfile.title}</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="displayName">{strings.childProfile.displayNameLabel}</label>
        <input
          id="displayName"
          type="text"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <label htmlFor="ageMonths">{strings.childProfile.ageMonthsLabel}</label>
        <input
          id="ageMonths"
          type="number"
          min="0"
          required
          value={ageMonths}
          onChange={(event) => setAgeMonths(event.target.value)}
        />
        <button type="submit">{strings.childProfile.saveButton}</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/ChildProfilePage.jsx src/i18n/en.json
git commit -m "feat: add child profile screen"
```

---

### Task 10: Wire up "Start new session" on `HomePage`

**Files:**
- Modify: `src/routes/HomePage.jsx`

**Interfaces:**
- Consumes: `useSessionDispatch` from `state/SessionContext` (Task 7), `getChildProfile` from `core/storage` (Task 6).
- Produces: clicking "Start new session" dispatches `START_SESSION` and navigates to `/session/overview`. "Resume session" and "View history" stay disabled (out of scope for Phase 1 — see Global Constraints).

- [ ] **Step 1: Rewrite `src/routes/HomePage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildProfile } from '../core/storage/index.js';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const [childId, setChildId] = useState(null);

  useEffect(() => {
    getChildProfile().then((profile) => setChildId(profile?.id ?? null));
  }, []);

  function handleStartSession() {
    dispatch({ type: 'START_SESSION', childId });
    navigate('/session/overview');
  }

  return (
    <main>
      <h1>{strings.home.title}</h1>
      <button onClick={handleStartSession} disabled={!childId}>
        {strings.home.startSession}
      </button>
      <button disabled>{strings.home.resumeSession}</button>
      <button disabled>{strings.home.viewHistory}</button>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/HomePage.jsx
git commit -m "feat: wire up Start new session on Home"
```

---

### Task 11: `SessionOverviewPage` + `ActivityPrebriefPage` — Screens #4, #5

**Files:**
- Create: `src/routes/SessionOverviewPage.jsx`
- Create: `src/routes/ActivityPrebriefPage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `src/data/activities.json` (existing — this plan only uses the `bubble-time` entry), `useSessionState`/`useSessionDispatch` (Task 7).
- Produces: navigation `/session/overview` → `/session/activity/prebrief` → (Task 12) `/session/activity/run`.

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

```json
  "sessionOverview": {
    "title": "Today's session",
    "activityCount": "1 activity",
    "beginButton": "Begin"
  },
  "activityPrebrief": {
    "materialsLabel": "You'll need",
    "startButton": "Start activity"
  },
```

- [ ] **Step 2: Create `src/routes/SessionOverviewPage.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

export default function SessionOverviewPage() {
  const navigate = useNavigate();

  return (
    <main>
      <h1>{strings.sessionOverview.title}</h1>
      <p>{strings.sessionOverview.activityCount}</p>
      <h2>{bubbleTime.name}</h2>
      <button onClick={() => navigate('/session/activity/prebrief')}>
        {strings.sessionOverview.beginButton}
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/routes/ActivityPrebriefPage.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');

export default function ActivityPrebriefPage() {
  const navigate = useNavigate();

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
      <button onClick={() => navigate('/session/activity/run')}>
        {strings.activityPrebrief.startButton}
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/SessionOverviewPage.jsx src/routes/ActivityPrebriefPage.jsx src/i18n/en.json
git commit -m "feat: add session overview and activity pre-brief screens"
```

---

### Task 12: `ActivityRunPage` — Screen #6 (serve, parent-tap, trials)

This is the capture screen. Serve plays a short tone (the "bubbles" prompt) via `AudioContext` and marks `serveAt`; the parent taps a large "Child responded" target to mark `returnAt`, or taps "No response" if the trial times out. Three trials (`bubbleTime.trialCount`), then navigate to Review.

**Files:**
- Create: `src/routes/ActivityRunPage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `markTime`, `computeLatencyMs`, `classifyBand` from `core/latency` (Task 2), `useSessionDispatch` from `state/SessionContext` (Task 7), `src/data/activities.json`, `src/data/latency-bands.json` (existing).
- Produces: navigation to `/session/activity/review` after `bubbleTime.trialCount` trials are recorded, each dispatched via `RECORD_TRIAL`.

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

```json
  "activityRun": {
    "serveButton": "Blow bubbles",
    "respondedButton": "Child responded",
    "noResponseButton": "No response",
    "trialLabel": "Trial {current} of {total}",
    "waitingLabel": "Waiting for response…"
  },
```

- [ ] **Step 2: Create `src/routes/ActivityRunPage.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { markTime, computeLatencyMs } from '../core/latency/index.js';
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
  const dispatch = useSessionDispatch();
  const audioContextRef = useRef(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // 'ready' | 'waiting'
  const [pendingServeAt, setPendingServeAt] = useState(null);

  useEffect(() => {
    dispatch({ type: 'START_ACTIVITY_RUN', activityId: bubbleTime.id });
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }, [dispatch]);

  function handleServe() {
    const audioContext = audioContextRef.current;
    playServeTone(audioContext);
    setPendingServeAt(markTime(audioContext));
    setPhase('waiting');
  }

  function recordTrial({ responded }) {
    const audioContext = audioContextRef.current;
    const returnAt = responded ? markTime(audioContext) : null;
    const latencyMs = responded ? computeLatencyMs(pendingServeAt, returnAt) : null;

    dispatch({
      type: 'RECORD_TRIAL',
      index: trialIndex,
      serveAt: pendingServeAt,
      returnAt,
      returnSource: responded ? 'parent-tap' : 'none',
      latencyMs,
      responded,
    });

    const nextIndex = trialIndex + 1;
    if (nextIndex >= bubbleTime.trialCount) {
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
      {phase === 'ready' && <button onClick={handleServe}>{strings.activityRun.serveButton}</button>}
      {phase === 'waiting' && (
        <>
          <p>{strings.activityRun.waitingLabel}</p>
          <button onClick={() => recordTrial({ responded: true })}>
            {strings.activityRun.respondedButton}
          </button>
          <button onClick={() => recordTrial({ responded: false })}>
            {strings.activityRun.noResponseButton}
          </button>
        </>
      )}
    </main>
  );
}
```

This screen records raw `serveAt`/`returnAt`/`latencyMs` only — it does not band-classify. Band classification (via `classifyBand` from `core/latency`) happens later, in `SessionResultsPage` (Task 16) and `ResponseTimeRibbon` (Task 14), which read this trial data back out of session state.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityRunPage.jsx src/i18n/en.json
git commit -m "feat: add activity run screen with serve/tap trial capture"
```

---

### Task 13: `ActivityReviewPage` — Screen #7 (observation tagging)

**Files:**
- Create: `src/routes/ActivityReviewPage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `src/data/activities.json`'s parallel `expectedBehaviours`/`reviewTags` arrays (index-aligned — e.g. `expectedBehaviours[0]` is `'reach'`, `reviewTags[0]` is the human label `'reached-for-bubbles'`), `useSessionDispatch` (Task 7).
- Produces: dispatches `ADD_OBSERVATION` per checked tag, then `COMPLETE_ACTIVITY_RUN`, then navigates to `/session/results`.

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

```json
  "activityReview": {
    "title": "What did you notice?",
    "instructions": "Check anything your child did during the activity.",
    "confirmButton": "Confirm and see results"
  },
```

- [ ] **Step 2: Create `src/routes/ActivityReviewPage.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import activities from '../data/activities.json';
import { useSessionDispatch } from '../state/SessionContext.jsx';
import strings from '../i18n/en.json';

const bubbleTime = activities.find((activity) => activity.id === 'bubble-time');
const tagOptions = bubbleTime.expectedBehaviours.map((code, index) => ({
  code,
  label: bubbleTime.reviewTags[index],
}));

export default function ActivityReviewPage() {
  const navigate = useNavigate();
  const dispatch = useSessionDispatch();
  const [checked, setChecked] = useState({});

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
    navigate('/session/results');
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

- [ ] **Step 3: Commit**

```bash
git add src/routes/ActivityReviewPage.jsx src/i18n/en.json
git commit -m "feat: add activity review screen for parent observation tagging"
```

---

### Task 14: `ResponseTimeRibbon` component

**Files:**
- Create: `src/components/ribbon/ResponseTimeRibbon.jsx`

**Interfaces:**
- Consumes props: `trials` (array of `Trial`), `bands` (`latency-bands.json` shape), `width` (number, default 320).
- Produces: an SVG ribbon — consumed by `SessionResultsPage.jsx` (Task 16).

- [ ] **Step 1: Create `src/components/ribbon/ResponseTimeRibbon.jsx`**

```jsx
const BAND_COLORS = { within: '#2e7d32', borderline: '#ed6c02', delayed: '#c62828' };
const HEIGHT = 80;
const TRACK_Y = HEIGHT / 2;

function bandColor(bandId) {
  return BAND_COLORS[bandId] ?? '#757575';
}

function classifyForDisplay(latencyMs, bands) {
  for (const band of bands.bands) {
    if (band.maxMs === null || latencyMs <= band.maxMs) return band.id;
  }
  return bands.bands[bands.bands.length - 1].id;
}

export default function ResponseTimeRibbon({ trials, bands, width = 320 }) {
  const maxMs = Math.max(...trials.map((t) => t.latencyMs ?? 0), 1000);
  const slotWidth = width / trials.length;

  return (
    <svg width={width} height={HEIGHT} role="img" aria-label="Response time ribbon">
      <line x1={0} y1={TRACK_Y} x2={width} y2={TRACK_Y} stroke="#ccc" strokeWidth={2} />
      {trials.map((trial, index) => {
        const slotCenter = slotWidth * index + slotWidth / 2;
        if (!trial.responded) {
          return (
            <circle
              key={trial.index}
              cx={slotCenter}
              cy={TRACK_Y}
              r={8}
              fill="none"
              stroke="#757575"
              strokeDasharray="3,3"
              strokeWidth={2}
            >
              <title>{`Trial ${index + 1}: no response`}</title>
            </circle>
          );
        }
        const bandId = classifyForDisplay(trial.latencyMs, bands);
        const dotY = TRACK_Y - Math.min((trial.latencyMs / maxMs) * (HEIGHT / 2 - 10), HEIGHT / 2 - 10);
        return (
          <g key={trial.index}>
            <line x1={slotCenter} y1={TRACK_Y} x2={slotCenter} y2={dotY} stroke={bandColor(bandId)} strokeWidth={2} />
            <circle cx={slotCenter} cy={dotY} r={6} fill={bandColor(bandId)}>
              <title>{`Trial ${index + 1}: ${trial.latencyMs}ms (${bandId}, ${trial.returnSource})`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ribbon/ResponseTimeRibbon.jsx
git commit -m "feat: add ResponseTimeRibbon component"
```

---

### Task 15: `MatrixProfileGrid` component

**Files:**
- Create: `src/components/matrix/MatrixProfileGrid.jsx`

**Interfaces:**
- Consumes props: `cells` (array of `MatrixCell` from `core/matrix`), `taxonomy` (`matrix-taxonomy.json` shape).
- Produces: a 7×4 CSS grid — consumed by `SessionResultsPage.jsx` (Task 16). Tapping a cell expands an inline evidence list (minimal stand-in for the architecture doc's "evidence drawer").

- [ ] **Step 1: Create `src/components/matrix/MatrixProfileGrid.jsx`**

```jsx
import { Fragment, useState } from 'react';

const STATE_LABELS = {
  'not-used': 'Not used',
  emerging: 'Emerging',
  mastered: 'Mastered',
  surpassed: 'Surpassed',
};

const STATE_COLORS = {
  'not-used': '#e0e0e0',
  emerging: '#ffca28',
  mastered: '#43a047',
  surpassed: '#1976d2',
};

export default function MatrixProfileGrid({ cells, taxonomy }) {
  const [expandedKey, setExpandedKey] = useState(null);

  function cellKey(level, purpose) {
    return `${level}-${purpose}`;
  }

  function findCell(level, purposeId) {
    return cells.find((c) => c.level === level && c.purpose === purposeId);
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `120px repeat(${taxonomy.purposes.length}, 1fr)`,
          gap: '4px',
        }}
      >
        <div />
        {taxonomy.purposes.map((purpose) => (
          <div key={purpose.id}>{purpose.name}</div>
        ))}
        {taxonomy.levels.map((level) => (
          <Fragment key={level.level}>
            <div>{level.name}</div>
            {taxonomy.purposes.map((purpose) => {
              const cell = findCell(level.level, purpose.id);
              const key = cellKey(level.level, purpose.id);
              const isExpanded = expandedKey === key;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                    style={{ background: STATE_COLORS[cell.state], width: '100%', height: '32px' }}
                    aria-label={`${purpose.name} ${level.name}: ${STATE_LABELS[cell.state]}`}
                  />
                  {isExpanded && (
                    <div>
                      <p>{STATE_LABELS[cell.state]}</p>
                      {cell.evidence.length === 0 && <p>No direct evidence.</p>}
                      {cell.evidence.map((e, i) => (
                        <p key={i}>{`${e.observationCode} → ${e.ruleId}`}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <ul>
        {Object.entries(STATE_LABELS).map(([state, label]) => (
          <li key={state}>
            <span style={{ background: STATE_COLORS[state], display: 'inline-block', width: '12px', height: '12px' }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/matrix/MatrixProfileGrid.jsx
git commit -m "feat: add MatrixProfileGrid component"
```

---

### Task 16: `SessionResultsPage` — Screen #8 (Ribbon + Grid + flags)

**Files:**
- Create: `src/routes/SessionResultsPage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `useSessionState` (Task 7), `applyRules` from `core/matrix` (Task 3), `computeFlags` from `core/matrix/flags` (Task 4), `ResponseTimeRibbon` (Task 14), `MatrixProfileGrid` (Task 15), `src/data/matrix-rules.json`, `src/data/matrix-taxonomy.json`, `src/data/latency-bands.json` (existing).
- Produces: navigation to `/session/report`.

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

```json
  "sessionResults": {
    "title": "Session results",
    "flagsTitle": "Points to review with a clinician",
    "noFlags": "No concerns flagged by the demo heuristics.",
    "reportButton": "View report"
  },
```

- [ ] **Step 2: Create `src/routes/SessionResultsPage.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import { useSessionState } from '../state/SessionContext.jsx';
import { applyRules } from '../core/matrix/index.js';
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
  const activityRun = session.activityRuns[session.activityRuns.length - 1];

  const cells = applyRules(activityRun.observations, rulesConfig, {
    sessionId: session.id,
    activityRunId: activityRun.id,
  });
  const flags = computeFlags({ trials: activityRun.trials, cells, latencyBandsConfig });

  return (
    <main>
      <h1>{strings.sessionResults.title}</h1>
      <ResponseTimeRibbon trials={activityRun.trials} bands={latencyBandsConfig} />
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

- [ ] **Step 3: Commit**

```bash
git add src/routes/SessionResultsPage.jsx src/i18n/en.json
git commit -m "feat: add session results screen with Ribbon, Grid, and flags"
```

---

### Task 17: `ReportPreviewPage` — Screen #9

**Files:**
- Create: `src/routes/ReportPreviewPage.jsx`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Consumes: `useSessionState` (Task 7), `generateReport` from `core/report` (Task 5), `applyRules`, `computeFlags` (recomputed here — this screen doesn't receive them as router state, so it derives the same values independently from the same session data), `getChildProfile` from `core/storage` (Task 6).
- Produces: a printable report page (`window.print()`).

- [ ] **Step 1: Add strings to `src/i18n/en.json`**

```json
  "reportPreview": {
    "title": "Clinician report",
    "printButton": "Print / Save as PDF",
    "disclaimersTitle": "Important notes"
  },
```

- [ ] **Step 2: Create `src/routes/ReportPreviewPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useSessionState } from '../state/SessionContext.jsx';
import { getChildProfile } from '../core/storage/index.js';
import { applyRules } from '../core/matrix/index.js';
import { computeFlags } from '../core/matrix/flags.js';
import { generateReport } from '../core/report/index.js';
import rulesConfig from '../data/matrix-rules.json';
import latencyBandsConfig from '../data/latency-bands.json';
import strings from '../i18n/en.json';

export default function ReportPreviewPage() {
  const { session } = useSessionState();
  const [report, setReport] = useState(null);

  useEffect(() => {
    getChildProfile().then((child) => {
      const activityRun = session.activityRuns[session.activityRuns.length - 1];
      const cells = applyRules(activityRun.observations, rulesConfig, {
        sessionId: session.id,
        activityRunId: activityRun.id,
      });
      const flags = computeFlags({ trials: activityRun.trials, cells, latencyBandsConfig });
      setReport(generateReport({ session, child, cells, flags, trials: activityRun.trials }));
    });
  }, [session]);

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
      <button onClick={() => window.print()}>{strings.reportPreview.printButton}</button>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/ReportPreviewPage.jsx src/i18n/en.json
git commit -m "feat: add report preview screen"
```

---

### Task 18: Final wiring, `App.jsx`, full manual E2E verification

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: every route component from Tasks 9–17, `ConsentGate`/`RequireChildProfile` (Task 8), `SessionProvider` (Task 7).

- [ ] **Step 1: Rewrite `src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import ChildProfilePage from './routes/ChildProfilePage.jsx';
import HomePage from './routes/HomePage.jsx';
import SessionOverviewPage from './routes/SessionOverviewPage.jsx';
import ActivityPrebriefPage from './routes/ActivityPrebriefPage.jsx';
import ActivityRunPage from './routes/ActivityRunPage.jsx';
import ActivityReviewPage from './routes/ActivityReviewPage.jsx';
import SessionResultsPage from './routes/SessionResultsPage.jsx';
import ReportPreviewPage from './routes/ReportPreviewPage.jsx';
import ConsentGate from './components/common/ConsentGate.jsx';
import RequireChildProfile from './components/common/RequireChildProfile.jsx';
import { SessionProvider } from './state/SessionContext.jsx';

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/consent" element={<ConsentPage />} />
        <Route element={<ConsentGate />}>
          <Route path="/child-profile" element={<ChildProfilePage />} />
          <Route element={<RequireChildProfile />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/session/overview" element={<SessionOverviewPage />} />
            <Route path="/session/activity/prebrief" element={<ActivityPrebriefPage />} />
            <Route path="/session/activity/run" element={<ActivityRunPage />} />
            <Route path="/session/activity/review" element={<ActivityReviewPage />} />
            <Route path="/session/results" element={<SessionResultsPage />} />
            <Route path="/session/report" element={<ReportPreviewPage />} />
          </Route>
        </Route>
      </Routes>
    </SessionProvider>
  );
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npm run test
```

Expected: all `core/` tests pass (Task 1: 5, Task 2: 4, Task 3: 4, Task 4: 6, Task 5: 2, Task 6: 5 = 26 tests total, plus the 3 that already existed pre-Phase-1 are part of that 5 in Task 6 — so 26 total).

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 4: Manual end-to-end verification**

```bash
npm run dev
```

In a fresh/incognito browser window:
1. Acknowledge consent → land on Child Profile (not Home) since no profile exists yet.
2. Fill in a name and age, submit → land on Home.
3. Click "Start new session" → Session Overview shows "Bubble Time".
4. Click "Begin" → Pre-brief shows the parent script and materials.
5. Click "Start activity" → Activity Run shows "Trial 1 of 3".
6. Click "Blow bubbles" → hear a short tone, buttons change to "Child responded" / "No response".
7. Click "Child responded" for trial 1, repeat serve+respond for trials 2 and 3 (mix responded/no-response to see both paths) → after trial 3, lands on Activity Review.
8. Check a couple of behaviour boxes (e.g. "reached for bubbles", "vocalised") → click "Confirm and see results".
9. Session Results shows a Ribbon with 3 marks (colored dots for responses, dashed circle for any no-response) and a 7×4 Grid with at least the cells matching checked behaviours coloured in, plus `surpassed` cells below any mastered cell in the same column.
10. Click "View report" → Report Preview shows child name/age, disclaimers, and a working "Print / Save as PDF" button (opens the browser print dialog).

Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire full Phase 1 routing for the Bubble Time vertical slice"
```

- [ ] **Step 6: Update `PROGRESS.md`**

Add a new entry at the top documenting: Phase 1 complete, the full Bubble Time vertical slice runs end to end with parent-tap only, test count, any manual verification findings, and that Phase 2 (audio-onset detection) is next per the architecture doc's build order.

---

## Self-Review Notes

- **Spec coverage:** All six required features are represented — Parent-guided activity (Tasks 11–12), audio/video analysis in degraded parent-tap form (Task 12, `core/latency`), Communication Matrix comparison (Task 3, Task 15), response latency measurement (Task 2, Task 14), concern detection (Task 4), automated report (Task 5, Task 17). `surpassed` semantics implemented and tested (Task 3). Web Audio clock used for all timing, never `Date.now()` (Task 2, Task 12). Evidence trail on every matrix cell (Task 3, exposed in Task 15's grid). Screens #2, #4–#9 built (#1, #3, #10 already exist from Phase 0 or are out of scope — Settings/About is Phase 7 hardening).
- **Deferred, not forgotten:** `core/vision`/MediaPipe (Phase 4), audio-onset detection (Phase 2), the other 3 activities + full 7×4 rules JSON (Phase 3), session resume/history (no phase assigned yet — flagged as a gap to revisit), Tamil/Hindi strings (deferred since Phase 0, still no translated content to add).
- **Type/name consistency check:** `createTrial`'s shape (Task 1) matches what `ActivityRunPage` (Task 12) and `ResponseTimeRibbon` (Task 14) read (`serveAt`, `returnAt`, `returnSource`, `latencyMs`, `responded`). `applyRules`' cell shape (Task 3) matches what `MatrixProfileGrid` (Task 15) and `core/matrix/flags` (Task 4) expect (`level`, `purpose`, `state`, `evidence`). Action types dispatched by routes (`START_SESSION`, `START_ACTIVITY_RUN`, `RECORD_TRIAL`, `ADD_OBSERVATION`, `COMPLETE_ACTIVITY_RUN`) match exactly what `sessionReducer` (Task 7) handles. `bubbleTime.trialCount` (from existing `activities.json`, value `3`) matches the test count assumptions embedded in Task 18's E2E script.
