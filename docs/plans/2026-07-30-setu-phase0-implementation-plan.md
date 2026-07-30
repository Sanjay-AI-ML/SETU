# SETU Phase 0 — Scaffold & Day-1 Capacitor Smoke Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SETU Vite/React skeleton with a working Consent-gate → Home flow, and complete a throwaway Capacitor Android build that proves camera/mic permissions work on a real device — matching Phase 0 and the Day-1 goal from `docs/plans/2026-07-30-setu-architecture-plan.md`.

**Architecture:** Plain JS React app (no TypeScript) scaffolded by hand (not `npm create vite`, to avoid relying on an interactive CLI in a non-empty directory), React Router for two routes (`/consent`, `/`), a single `core/storage` module wrapping `idb-keyval` for consent persistence, and static JSON stubs for the data model. Capacitor wraps the built web app for a debug Android APK. A temporary, clearly-labelled smoke-test component verifies camera/mic OS permission prompts fire, then is deleted.

**Tech Stack:** React 18 + Vite 5 (JS, not TS) · react-router-dom 6 · idb-keyval · Vitest · Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) · Android Studio + SDK (installed by user, Track A).

## Global Constraints

(Copied verbatim from `CLAUDE.md` — every task below implicitly inherits these.)

- No backend. No paid APIs. Everything client-side.
- No real clinical data. All demo data is self-recorded or simulated and must be labelled as such in-app.
- Matrix mapping is rule-based JSON — deliberately NOT ML.
- Never commit audio/video of a child.
- The app must never imply a diagnosis.
- Stack is locked: React + Vite → Capacitor → Android APK · Web Audio API (timing) · `@mediapipe/tasks-vision` · rule-based JSON matrix engine · client-side templated reports · `idb-keyval` persistence · React Router · Context + `useReducer`. No Redux/Zustand/query libs. No SQLite/offline sync.
- `capacitor.config` must never ship `server.url` (or any `server` key at all).
- `core/` contains zero React — it is the only place tests go.
- Timing uses the Web Audio clock anchored to `performance.now()`, never `Date.now()` (not yet relevant in Phase 0 — no timing code lands until Phase 2).
- Project root is `D:\Smart Ability Hackathon\SETU` — never write outside it.

---

## File Structure

```
SETU/
├─ index.html                          (create — Task 1)
├─ package.json                        (create — Task 1)
├─ vite.config.js                      (create — Task 1, extended — Task 3)
├─ .gitignore                          (already exists — do not touch)
├─ src/
│  ├─ main.jsx                         (create — Task 1, replaced — Task 8)
│  ├─ App.jsx                          (create — Task 1, replaced — Task 2, Task 8, temporarily edited — Task 12)
│  ├─ styles/
│  │  └─ global.css                    (create — Task 8)
│  ├─ routes/
│  │  ├─ ConsentPage.jsx               (stub — Task 2, real content — Task 6)
│  │  ├─ HomePage.jsx                  (stub — Task 2, real content — Task 7)
│  │  └─ PermissionSmokeTest.jsx       (create — Task 12, deleted — Task 12)
│  ├─ components/
│  │  └─ common/
│  │     └─ ConsentGate.jsx            (create — Task 6)
│  ├─ core/
│  │  └─ storage/
│  │     ├─ index.js                   (create — Task 3)
│  │     └─ index.test.js              (create — Task 3)
│  ├─ data/
│  │  ├─ activities.json               (create — Task 4)
│  │  ├─ matrix-taxonomy.json          (create — Task 4)
│  │  ├─ matrix-rules.json             (create — Task 4)
│  │  └─ latency-bands.json            (create — Task 4)
│  └─ i18n/
│     └─ en.json                       (create — Task 5)
├─ android/                             (generated — Task 10, modified — Task 11)
└─ capacitor.config.json                (generated — Task 10, verified — Task 11)
```

**Deliberately out of scope for this plan** (per the architecture doc's own phasing, not needed until later): `ta.json`/`hi.json` translations, bundled Noto fonts, `core/latency`, `core/vision`, `core/matrix`, `core/report`, MediaPipe, Web Audio, and the other 8 screens. Adding empty placeholder folders for those now would violate YAGNI — they get created when their phase starts.

---

### Task 0: Android SDK toolchain (Track A — you run this, in parallel with Tasks 1–9)

This is the one part of today's session that needs you at the keyboard — I can't click through a GUI installer from the terminal.

**Files:** None (system install).

- [ ] **Step 1: Download and run Android Studio**

Go to https://developer.android.com/studio, download the Windows installer, run it, accept the "Standard" install type. Let it download the Android SDK, SDK Platform-Tools, and Android Emulator during the first-run Setup Wizard. This step is the slow part (multi-GB) — kick it off now and let it run while I work on Tasks 1–9.

- [ ] **Step 2: Confirm SDK components via SDK Manager**

In Android Studio: **More Actions → SDK Manager**. Under **SDK Platforms**, confirm at least one recent Android version is checked (e.g. Android 14 / API 34). Under **SDK Tools**, confirm **Android SDK Platform-Tools** and **Android SDK Build-Tools** are checked. Click Apply if you changed anything.

- [ ] **Step 3: Set environment variables**

Open PowerShell and run:

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
```

Then edit your user PATH (Settings → System → About → Advanced system settings → Environment Variables) and add:
```
%ANDROID_HOME%\platform-tools
```

Close and reopen your terminal for this to take effect.

- [ ] **Step 4: Enable USB debugging on your test phone**

On the Android phone you'll test with: **Settings → About phone → tap "Build number" 7 times** to unlock Developer Options, then **Settings → System → Developer options → enable USB debugging**. Plug the phone in via USB and accept the "Allow USB debugging?" prompt when it appears.

- [ ] **Step 5: Verify from a fresh terminal**

```powershell
adb version
adb devices
```

Expected: `adb version` prints a version number (not "command not found"), and `adb devices` lists your phone's device ID with `device` status (not `unauthorized` — if unauthorized, re-check the USB debugging prompt on the phone).

Tell me once this is done — Tasks 10–12 (Capacitor) are gated on it. Tasks 1–9 don't need it and can proceed now.

---

### Task 1: Project scaffold — Vite + React, minimal placeholder app

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`

**Interfaces:**
- Produces: a Vite dev server on `http://localhost:5173` rendering `<App />`, which later tasks replace piece by piece.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "setu",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install React and Vite**

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react
```

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SETU</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create placeholder `src/App.jsx`**

```jsx
export default function App() {
  return <p>SETU scaffold running.</p>;
}
```

- [ ] **Step 6: Create `src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Run the dev server and verify**

```bash
npm run dev
```

Expected: Vite prints a `Local: http://localhost:5173/` URL. Open it in a browser — expect to see the text "SETU scaffold running." Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js index.html src/main.jsx src/App.jsx package-lock.json
git commit -m "chore: scaffold Vite + React app"
```

---

### Task 2: Routing + folder skeleton

**Files:**
- Modify: `src/App.jsx`
- Create: `src/routes/ConsentPage.jsx`
- Create: `src/routes/HomePage.jsx`

**Interfaces:**
- Consumes: `App` from Task 1.
- Produces: two routes, `/consent` and `/`, each rendering a placeholder heading — replaced with real content in Tasks 6–8.

- [ ] **Step 1: Install React Router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Create placeholder `src/routes/ConsentPage.jsx`**

```jsx
export default function ConsentPage() {
  return <h1>Consent (placeholder)</h1>;
}
```

- [ ] **Step 3: Create placeholder `src/routes/HomePage.jsx`**

```jsx
export default function HomePage() {
  return <h1>Home (placeholder)</h1>;
}
```

- [ ] **Step 4: Replace `src/App.jsx` to wire routes**

```jsx
import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import HomePage from './routes/HomePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Wrap `main.jsx`'s `<App />` in `BrowserRouter`**

In `src/main.jsx`, add the import and wrapper:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify routing manually**

```bash
npm run dev
```

Open `http://localhost:5173/` → expect "Home (placeholder)". Open `http://localhost:5173/consent` → expect "Consent (placeholder)". Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/main.jsx src/routes/ConsentPage.jsx src/routes/HomePage.jsx package.json package-lock.json
git commit -m "feat: add router with consent and home route stubs"
```

---

### Task 3: `core/storage` — consent persistence + Vitest harness

This is the first `core/` module — zero React, tested under plain Vitest, per the architecture's testing philosophy.

**Files:**
- Create: `src/core/storage/index.js`
- Create: `src/core/storage/index.test.js`
- Modify: `vite.config.js` (add Vitest config)
- Modify: `package.json` (add `test:watch` script)

**Interfaces:**
- Produces: `getConsent(): Promise<boolean>`, `setConsent(value: boolean): Promise<void>` — consumed by `ConsentGate` and `ConsentPage` in Task 6.

- [ ] **Step 1: Install idb-keyval and Vitest**

```bash
npm install idb-keyval
npm install -D vitest
```

- [ ] **Step 2: Extend `vite.config.js` with Vitest config**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Add `test:watch` script to `package.json`**

Add this key inside `"scripts"`, alongside the existing `"test"` entry:

```json
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing test — `src/core/storage/index.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key) => Promise.resolve(store.get(key))),
  set: vi.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
}));

const { getConsent, setConsent } = await import('./index.js');

beforeEach(() => {
  store.clear();
});

describe('core/storage consent', () => {
  it('returns false when no consent has been recorded', async () => {
    await expect(getConsent()).resolves.toBe(false);
  });

  it('returns true after consent has been set', async () => {
    await setConsent(true);
    await expect(getConsent()).resolves.toBe(true);
  });

  it('returns false if consent was explicitly set to false', async () => {
    await setConsent(false);
    await expect(getConsent()).resolves.toBe(false);
  });
});
```

- [ ] **Step 5: Run the test and verify it fails**

```bash
npx vitest run src/core/storage/index.test.js
```

Expected: FAIL — `src/core/storage/index.js` does not exist yet.

- [ ] **Step 6: Write `src/core/storage/index.js`**

```js
import { get, set } from 'idb-keyval';

const CONSENT_KEY = 'setu:consent-ack';

export function getConsent() {
  return get(CONSENT_KEY).then((value) => value === true);
}

export function setConsent(value) {
  return set(CONSENT_KEY, value);
}
```

- [ ] **Step 7: Run the test and verify it passes**

```bash
npx vitest run src/core/storage/index.test.js
```

Expected: PASS — 3 tests passing.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js src/core/storage/index.js src/core/storage/index.test.js package-lock.json
git commit -m "feat: add core/storage consent persistence with tests"
```

---

### Task 4: Data model stub files

Stub JSON matching the schemas defined in `docs/plans/2026-07-30-setu-architecture-plan.md` §3. Real, usable starter content — not empty shells — but intentionally not the full 7×4 rule set (that's Phase 3).

**Files:**
- Create: `src/data/activities.json`
- Create: `src/data/matrix-taxonomy.json`
- Create: `src/data/matrix-rules.json`
- Create: `src/data/latency-bands.json`

- [ ] **Step 1: Create `src/data/activities.json`**

```json
[
  {
    "id": "bubble-time",
    "name": "Bubble Time",
    "purposes": ["obtain", "social"],
    "parentScript": "Blow a few bubbles together, then pause with the wand held still and wait quietly for your child to ask for more.",
    "materials": ["Bubble solution and wand"],
    "trialCount": 3,
    "expectedBehaviours": ["reach", "point", "vocalise", "gaze-to-parent", "word"],
    "reviewTags": ["reached-for-bubbles", "pointed-at-wand", "vocalised", "looked-at-parent", "said-word"]
  },
  {
    "id": "peek-a-boo",
    "name": "Peek-a-boo",
    "purposes": ["social"],
    "parentScript": "Play peek-a-boo through a few rounds, then pause mid-reveal with your hands still covering your face and wait.",
    "materials": ["None — just your hands or a small cloth"],
    "trialCount": 3,
    "expectedBehaviours": ["gaze-to-face", "vocalise", "smile", "anticipatory-movement"],
    "reviewTags": ["looked-at-face", "vocalised", "smiled", "anticipated-reveal"]
  },
  {
    "id": "not-this-one",
    "name": "Not-This-One",
    "purposes": ["refuse"],
    "parentScript": "Offer your child an item you know they dislike, hold it within reach, and wait for their reaction before taking it away.",
    "materials": ["A clearly non-preferred toy, food, or object"],
    "trialCount": 3,
    "expectedBehaviours": ["push-away", "head-turn", "vocal-protest", "word-no"],
    "reviewTags": ["pushed-away", "turned-head", "protested", "said-no"]
  },
  {
    "id": "whats-in-the-box",
    "name": "What's In The Box?",
    "purposes": ["information"],
    "parentScript": "Reveal an object or picture from the box and ask \"What's this?\", then wait for your child to respond before naming it yourself.",
    "materials": ["A small box", "3-4 familiar objects or picture cards"],
    "trialCount": 3,
    "expectedBehaviours": ["point", "label", "comment", "show"],
    "reviewTags": ["pointed-at-object", "named-object", "commented", "showed-object"]
  }
]
```

- [ ] **Step 2: Create `src/data/matrix-taxonomy.json`**

Descriptors written in our own words, not copied from the Communication Matrix instrument (licensing constraint from `CLAUDE.md`).

```json
{
  "levels": [
    { "level": 1, "name": "Pre-Intentional", "descriptor": "Behaviour reflects internal states (comfort, discomfort, arousal) without any intent to communicate with another person." },
    { "level": 2, "name": "Intentional", "descriptor": "Behaviour is intentional but not yet a deliberate signal — a caregiver interprets it, but the child does not yet direct it at anyone." },
    { "level": 3, "name": "Unconventional Communication", "descriptor": "Clear pre-symbolic signals directed at another person — reaching, pulling, pushing, vocalising, facial expression." },
    { "level": 4, "name": "Conventional Communication", "descriptor": "Socially accepted gestures directed at another person — pointing, nodding, shaking head, giving, showing." },
    { "level": 5, "name": "Concrete Symbols", "descriptor": "Symbols that resemble their meaning — pictures, objects, or signs that look or feel like what they represent." },
    { "level": 6, "name": "Abstract Symbols", "descriptor": "Symbols with no physical resemblance to their meaning — spoken words, printed words, or abstract signs." },
    { "level": 7, "name": "Language", "descriptor": "Symbols combined by grammatical rules into original, multi-word statements." }
  ],
  "purposes": [
    { "id": "refuse", "name": "Refuse", "descriptor": "Rejecting or protesting something unwanted." },
    { "id": "obtain", "name": "Obtain", "descriptor": "Requesting a wanted object, action, or more of something." },
    { "id": "social", "name": "Social", "descriptor": "Engaging another person for its own sake — greeting, showing off, seeking attention or comfort." },
    { "id": "information", "name": "Information", "descriptor": "Commenting, labelling, asking, or sharing information about the world." }
  ]
}
```

- [ ] **Step 3: Create `src/data/matrix-rules.json`**

A starter subset (one rule per purpose at Level III/IV) proving the shape — expanded to the full 7×4 set in Phase 3.

```json
{
  "engineVersion": "0.1.0",
  "rules": [
    { "id": "rule-refuse-l3-push-away", "level": 3, "purpose": "refuse", "state": "mastered", "requiredObservations": ["push-away"] },
    { "id": "rule-obtain-l3-reach", "level": 3, "purpose": "obtain", "state": "mastered", "requiredObservations": ["reach"] },
    { "id": "rule-obtain-l4-point", "level": 4, "purpose": "obtain", "state": "mastered", "requiredObservations": ["point"] },
    { "id": "rule-social-l3-vocalise", "level": 3, "purpose": "social", "state": "mastered", "requiredObservations": ["vocalise"] },
    { "id": "rule-information-l4-label", "level": 4, "purpose": "information", "state": "mastered", "requiredObservations": ["label"] }
  ]
}
```

- [ ] **Step 4: Create `src/data/latency-bands.json`**

Values are demo heuristics, explicitly labelled as such per the licensing/validity constraint — never presented as clinically derived.

```json
{
  "version": "0.1.0",
  "unvalidated": true,
  "disclaimer": "Demo heuristic thresholds, not clinically validated. Require calibration by a qualified clinician before any real-world use.",
  "ageMonthsDefault": 24,
  "bands": [
    { "id": "within", "label": "Within expected range", "maxMs": 2000 },
    { "id": "borderline", "label": "Borderline", "maxMs": 3500 },
    { "id": "delayed", "label": "Delayed", "maxMs": null }
  ]
}
```

- [ ] **Step 5: Verify all four files parse as valid JSON**

```bash
node --input-type=commonjs -e "['activities','matrix-taxonomy','matrix-rules','latency-bands'].forEach(f => { JSON.parse(require('fs').readFileSync('src/data/'+f+'.json','utf8')); console.log(f, 'OK'); })"
```

(`--input-type=commonjs` is needed because `package.json` has `"type": "module"`, which would otherwise make Node treat this `-e` script as ESM and `require` would be undefined.)

Expected: four lines, each ending in `OK`.

- [ ] **Step 6: Commit**

```bash
git add src/data/activities.json src/data/matrix-taxonomy.json src/data/matrix-rules.json src/data/latency-bands.json
git commit -m "feat: add stub data model JSON (activities, matrix taxonomy/rules, latency bands)"
```

---

### Task 5: `i18n/en.json` — English strings for Consent + Home

English only for Phase 0. Tamil/Hindi and the language-switching mechanism are deferred until that content actually exists (YAGNI) — noted as a follow-up in `PROGRESS.md`, not built here.

**Files:**
- Create: `src/i18n/en.json`

- [ ] **Step 1: Create `src/i18n/en.json`**

```json
{
  "consent": {
    "title": "Before you begin",
    "notDiagnostic": "SETU is not a diagnostic tool. It does not detect, diagnose, or rule out any condition.",
    "demoDataNotice": "This is a hackathon prototype. Any sample data you see is self-recorded or simulated, never real clinical data.",
    "clinicianReviewNotice": "SETU produces structured observations for a qualified clinician to review — it is screening support, not a result.",
    "acknowledgeButton": "I understand, continue"
  },
  "home": {
    "title": "SETU",
    "startSession": "Start new session",
    "resumeSession": "Resume session",
    "viewHistory": "View history"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/en.json
git commit -m "feat: add English UI strings for consent and home screens"
```

---

### Task 6: `ConsentGate` + real `ConsentPage`

Implements the blocking disclaimer gate — Screen #1 in the architecture doc, required feature scaffolding.

**Files:**
- Create: `src/components/common/ConsentGate.jsx`
- Modify: `src/routes/ConsentPage.jsx`

**Interfaces:**
- Consumes: `getConsent`, `setConsent` from `src/core/storage/index.js` (Task 3).
- Produces: `<ConsentGate>{children}</ConsentGate>` — renders `children` only once consent is acknowledged, otherwise redirects to `/consent`. Consumed by `App.jsx` in Task 8.

- [ ] **Step 1: Create `src/components/common/ConsentGate.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getConsent } from '../../core/storage/index.js';

export default function ConsentGate({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    getConsent().then((acknowledged) => {
      setStatus(acknowledged ? 'acknowledged' : 'unacknowledged');
    });
  }, []);

  if (status === 'checking') return null;
  if (status === 'unacknowledged') return <Navigate to="/consent" replace />;
  return children;
}
```

- [ ] **Step 2: Replace `src/routes/ConsentPage.jsx` with real content**

```jsx
import { useNavigate } from 'react-router-dom';
import { setConsent } from '../core/storage/index.js';
import strings from '../i18n/en.json';

export default function ConsentPage() {
  const navigate = useNavigate();

  async function handleAcknowledge() {
    await setConsent(true);
    navigate('/', { replace: true });
  }

  return (
    <main>
      <h1>{strings.consent.title}</h1>
      <p>{strings.consent.notDiagnostic}</p>
      <p>{strings.consent.demoDataNotice}</p>
      <p>{strings.consent.clinicianReviewNotice}</p>
      <button onClick={handleAcknowledge}>{strings.consent.acknowledgeButton}</button>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/common/ConsentGate.jsx src/routes/ConsentPage.jsx
git commit -m "feat: implement consent gate and consent page"
```

---

### Task 7: Real `HomePage`

**Files:**
- Modify: `src/routes/HomePage.jsx`

- [ ] **Step 1: Replace `src/routes/HomePage.jsx` with real content**

Buttons are disabled — the session flow they'd start doesn't exist until Phase 1. Honest scaffolding, not dead UI pretending to work.

```jsx
import strings from '../i18n/en.json';

export default function HomePage() {
  return (
    <main>
      <h1>{strings.home.title}</h1>
      <button disabled>{strings.home.startSession}</button>
      <button disabled>{strings.home.resumeSession}</button>
      <button disabled>{strings.home.viewHistory}</button>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/HomePage.jsx
git commit -m "feat: implement home screen"
```

---

### Task 8: Final wiring — `App.jsx`, `main.jsx`, `global.css`

Ties everything together: root route now goes through `ConsentGate`.

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`
- Create: `src/styles/global.css`

- [ ] **Step 1: Replace `src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import HomePage from './routes/HomePage.jsx';
import ConsentGate from './components/common/ConsentGate.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/consent" element={<ConsentPage />} />
      <Route
        path="/"
        element={(
          <ConsentGate>
            <HomePage />
          </ConsentGate>
        )}
      />
    </Routes>
  );
}
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f7f7f5;
  color: #1a1a1a;
}

main {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px;
}

main h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

main button {
  display: block;
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  font-size: 1rem;
  border-radius: 8px;
  border: none;
  background: #1d4e6b;
  color: white;
}

main button:disabled {
  background: #b8bfc4;
}
```

- [ ] **Step 3: Update `src/main.jsx` to import the stylesheet**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 4: Manual end-to-end verification**

```bash
npm run dev
```

In a browser, open `http://localhost:5173/` in a **fresh/incognito window** (no prior IndexedDB state):
1. Expect immediate redirect to `/consent`, showing the disclaimer text and "I understand, continue" button.
2. Click the button → expect navigation to `/` showing "SETU" and three disabled buttons.
3. Reload the page → expect to land directly on Home (consent persisted), not bounced back to `/consent`.

Stop the dev server once confirmed.

- [ ] **Step 5: Run the full test suite**

```bash
npm run test
```

Expected: all `core/storage` tests still pass (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/main.jsx src/styles/global.css
git commit -m "feat: wire consent gate into app routing with base styles"
```

---

### Task 9: Push to GitHub

**Files:** None.

- [ ] **Step 1: Review what will be pushed**

```bash
git log --oneline origin/main..HEAD
git status
```

- [ ] **Step 2: Confirm with the user, then push**

Ask: "Ready to push Phase 0 (Tasks 1–8) to `origin/main` on `Sanjay-AI-ML/SETU`?" Only run the push after an explicit yes:

```bash
git push origin main
```

---

### Task 10: Capacitor init + Android platform

**Gated on Task 0 (Android SDK + `adb` verified working).**

**Files:**
- Create: `capacitor.config.json` (generated by `cap init`)
- Create: `android/` (generated by `cap add android`)

- [ ] **Step 1: Confirm Task 0 is done**

```bash
adb devices
```

Expected: your phone listed with `device` status. Do not proceed until this works.

- [ ] **Step 2: Build the web app**

Capacitor needs a `dist/` to point at:

```bash
npm run build
```

- [ ] **Step 3: Install Capacitor core + CLI, then initialize**

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "SETU" "org.setu.app" --web-dir=dist
```

- [ ] **Step 4: Install and add the Android platform**

```bash
npm install @capacitor/android
npx cap add android
```

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.json android package.json package-lock.json
git commit -m "chore: initialize Capacitor with Android platform"
```

---

### Task 11: Android permissions + `capacitor.config.json` safety check

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Verify: `capacitor.config.json`

- [ ] **Step 1: Verify `capacitor.config.json` has no `server` key**

Open `capacitor.config.json` and confirm there is **no `"server"` key at all** (not just no `url` inside it — the whole key must be absent). Expected shape:

```json
{
  "appId": "org.setu.app",
  "appName": "SETU",
  "webDir": "dist"
}
```

If a `"server"` key is present, delete it entirely — its presence is "the classic submission killer" per `CLAUDE.md`.

- [ ] **Step 2: Add camera + microphone permissions to the manifest**

In `android/app/src/main/AndroidManifest.xml`, add these lines inside `<manifest>`, alongside whatever `<uses-permission>` entries Capacitor already generated (typically just `INTERNET`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml capacitor.config.json
git commit -m "fix: declare camera/mic permissions, confirm no server.url in capacitor config"
```

---

### Task 12: Day-1 throwaway permission smoke test

Builds a real debug APK and confirms the OS actually prompts for camera/mic access on your test device — the entire point of doing this on Day 1 instead of Day 5. The test harness is temporary by design and is deleted at the end of this task.

**Files:**
- Create (temporary): `src/routes/PermissionSmokeTest.jsx`
- Modify (temporarily, then reverted): `src/App.jsx`

- [ ] **Step 1: Create the temporary smoke-test component**

```jsx
import { useState } from 'react';

export default function PermissionSmokeTest() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function requestAccess() {
    setStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus('granted');
    } catch (err) {
      setError(err.message);
      setStatus('denied');
    }
  }

  return (
    <main>
      <h1>Camera & mic permission smoke test</h1>
      <p>Status: {status}</p>
      {error && <p>{error}</p>}
      <button onClick={requestAccess}>Request camera + mic access</button>
    </main>
  );
}
```

- [ ] **Step 2: Temporarily point the root route at it**

In `src/App.jsx`, temporarily replace the `path="/"` route's element with `<PermissionSmokeTest />` (bypassing `ConsentGate`/`HomePage` for this build only — there's no in-app navigation to reach a dev-only URL on a native build, so swapping the root route is the simplest way to reach it):

```jsx
import { Routes, Route } from 'react-router-dom';
import ConsentPage from './routes/ConsentPage.jsx';
import PermissionSmokeTest from './routes/PermissionSmokeTest.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/" element={<PermissionSmokeTest />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Build, sync, and build the debug APK**

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
cd ..
```

Expected: `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 4: Install on the connected phone and launch**

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p org.setu.app -c android.intent.category.LAUNCHER 1
```

- [ ] **Step 5: Verify the permission prompt on-device**

On the phone, tap "Request camera + mic access". Expected: the Android OS shows a native permission dialog for camera and microphone (may be two separate dialogs). Tap Allow on both. Expected: the app's status text changes to "granted". This confirms the manifest permissions, the Capacitor WebView bridge, and the physical device all work together — the actual Day-1 risk this task exists to catch.

If the OS shows no dialog at all (silent failure) or the app crashes, that is the exact multi-hour sink the architecture doc warned about — stop and debug here, before Phase 4 depends on it.

- [ ] **Step 6: Revert the temporary route change**

```bash
git diff src/App.jsx
git checkout src/App.jsx
```

Expected: `App.jsx` is back to routing `/` through `ConsentGate` → `HomePage`.

- [ ] **Step 7: Delete the throwaway component**

```bash
git rm src/routes/PermissionSmokeTest.jsx
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove Day-1 permission smoke test harness after verifying on-device"
```

- [ ] **Step 9: Update `PROGRESS.md`**

Add a new entry at the top documenting: Phase 0 complete, Day-1 Capacitor/permission smoke test passed on [device model], Tamil/Hindi i18n and font bundling deferred, next up is Phase 1 (Bubble Time vertical slice).

---

## Self-Review Notes

- **Spec coverage:** Every Phase 0 deliverable from the architecture plan is covered — Vite+React+Router (Tasks 1–2), folder skeleton (Tasks 1–8 file structure), stub JSONs (Task 4), Consent screen (Task 6), Home screen (Task 7), "app runs, consent gate blocks" verified (Task 8). The Day-1 Capacitor goal is covered by Tasks 10–12.
- **Deferred, not forgotten:** Tamil/Hindi translations, bundled Noto fonts, `core/latency`/`core/vision`/`core/matrix`/`core/report`, MediaPipe, and the other 8 screens are explicitly out of scope here (see File Structure section) and belong to later phases per the architecture doc — not gaps in this plan.
- **Type/name consistency check:** `getConsent`/`setConsent` (Task 3) match the calls in `ConsentGate.jsx` and `ConsentPage.jsx` (Task 6). `strings.consent.*` / `strings.home.*` keys (Task 5) match every reference in `ConsentPage.jsx` and `HomePage.jsx`. The Capacitor `appId` `org.setu.app` (Task 10) matches the `adb install`/`monkey -p` package name used in Task 12.
