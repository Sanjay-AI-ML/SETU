# SETU — Architecture & Build Plan

**Status:** DRAFT — awaiting review by Sanjay R
**Date:** 2026-07-30
**Event:** SmartAbility 2026 (REC + NIEPMD), Problem Statement 3 — Parent-Mediated Communication Assessment
**Timeline:** ~5 days, solo + AI assistance

> This document covers structure and sequencing only. No code is written yet.
> Once approved, a `CLAUDE.md` will be derived from this so context persists across sessions.

---

## Global Constraints (copied from spec — non-negotiable)

- **Stack:** React + Vite, wrapped in Capacitor for an installable Android APK.
- **Timing:** Web Audio API for latency/timing.
- **Vision:** MediaPipe `@mediapipe/tasks-vision`, in-browser.
- **Matrix mapping:** rule-based, JSON-driven. **Not ML** — deliberate, for speed and explainability.
- **Reports:** client-side templated. **No backend. No paid APIs.**
- **Data:** no real clinical data. All demo data self-recorded or simulated, **clearly labeled in-app**.
- **Persistence:** no SQLite/offline sync for the demo (roadmap only).
- **Roadmap, do NOT build:** Silero VAD, AI4Bharat IndicWhisper / Indic Parler-TTS, iCatcher/OWLET, native Android inference, SQLite + WorkManager. State honestly in code comments and README.

**All six required features must be visibly represented:**

| # | Feature | Where it lives |
|---|---------|----------------|
| 1 | Parent-guided assessment activities | Activity Pre-brief + Run screens |
| 2 | AI-based audio/video analysis | `core/latency` (audio onset) + `core/vision` (MediaPipe) |
| 3 | Communication Matrix comparison | `core/matrix` + Matrix Profile Grid |
| 4 | Response latency measurement | `core/latency` + Response-Time Ribbon |
| 5 | Detection of communication/auditory concerns | `core/matrix/flags` — rule-based flag list |
| 6 | Automated clinician report generation | `core/report` + Report Preview screen |

---

## 1. Screen & Navigation Flow

Ten screens. Linear spine with two loops (activity loop, session history loop).

```
Welcome/Consent ──> Child Profile ──> Home ──┬──> Session Overview
                                             │        │
                                             │        v
                                             │   Activity Pre-brief
                                             │        │
                                             │        v
                                             │   Activity Run  (capture)
                                             │        │
                                             │        v
                                             │   Activity Review (parent tags)
                                             │        │
                                             │   [more activities? loop back]
                                             │        │
                                             │        v
                                             │   Session Results  (Ribbon + Grid + Flags)
                                             │        │
                                             │        v
                                             │   Report Preview / Export
                                             │
                                             └──> History ──> (past Session Results)
                                                  Settings / About & Roadmap
```

| # | Screen | Purpose | Notes |
|---|--------|---------|-------|
| 1 | **Welcome & Consent** | Disclaimer gate: not diagnostic, screening support only, demo data, for clinician review | Blocking. Cannot proceed without explicit acknowledgement. Ethically required and a judging plus. |
| 2 | **Child Profile** | Initials, age in **months**, home languages, optional known diagnoses | Age in months drives latency bands and Matrix expectations. |
| 3 | **Home** | Start new session, resume, view history | Minimal. |
| 4 | **Session Overview** | Lists the activities, shows progress, estimated time | Entry point to activity loop. |
| 5 | **Activity Pre-brief** | Coaches the parent: exact script, materials, what to do | **This is required feature #1.** Short, illustrated, one screen. |
| 6 | **Activity Run** | Capture: small camera preview, serve control, large "child responded" tap target, live timer, recording indicator | Parent is busy with the child — biggest possible touch targets, near-zero reading. |
| 7 | **Activity Review** | Parent confirms/annotates observed behaviours | Human-in-the-loop. Makes rule-based mapping credible and hedges MediaPipe unreliability. |
| 8 | **Session Results** | Response-Time Ribbon + Matrix Profile Grid + concern flags | The signature screen. |
| 9 | **Report Preview / Export** | Clinician-facing structured report, export via browser print → PDF | Required feature #6. |
| 10 | **Settings / About & Roadmap** | Honest disclosure: what is simulated, what is roadmap, attribution | Turns limitations into credibility. |

---

## 2. Demo Activities

Four short play activities, each targeting specific Communication Matrix purposes. Each is JSON-defined, ~60–90s, 3 trials. Full session ≈ 5–6 minutes.

| Activity | Purposes covered | What the parent does | What it captures |
|---|---|---|---|
| **A. Bubble Time** | Obtain, Social | Blow bubbles, then **pause and wait** | Requesting: reach, point, vocalise, gaze-shift to parent. Latency from pause → request. Classic communication-temptation paradigm. |
| **B. Peek-a-boo** | Social | Start the routine, then pause mid-sequence | Social engagement, anticipation, gaze to face. Best activity for MediaPipe face signals. |
| **C. Not-This-One** | **Refuse** | Offer a clearly non-preferred item | Refusal: push away, head turn, vocal protest, "no". **Refuse is the hardest column to elicit — it needs its own activity.** |
| **D. What's In The Box?** | Information | Reveal an object/picture, ask "what's this?" | Labelling, commenting, showing/pointing to share. Reaches Levels V–VII (symbols, language). |

All four columns (Refuse / Obtain / Social / Information) are covered. **Bubble Time is the vertical-slice activity** — build it first, end to end. If Day 3 slips, cut to A + C + D (still covers all four columns; only Social loses a dedicated activity).

Each activity's JSON defines: `id`, `name`, `purposes[]`, `parentScript`, `materials[]`, `trialCount`, `expectedBehaviours[]`, `reviewTags[]`.

---

## 3. Session & Data Model

```
ChildProfile  { id, displayName, ageMonths, homeLanguages[], notes, createdAt }

Session       { id, childId, startedAt, endedAt, activityRuns[],
                matrixProfile, flags[], reportId }

ActivityRun   { id, activityId, startedAt, trials[], observations[] }

Trial         { index, serveAt, returnAt?, returnSource, latencyMs?, responded }
                // returnSource: 'audio-onset' | 'parent-tap' | 'none'

Observation   { code, source, confidence?, at }
                // source: 'parent' | 'mediapipe'
                // code: 'point' | 'reach' | 'vocalise' | 'gaze-to-face'
                //     | 'word' | 'push-away' | 'head-turn' | ...

MatrixCell    { level: 1..7, purpose, state, evidence[] }
                // state: 'not-used' | 'emerging' | 'mastered' | 'surpassed'
                // evidence: [{ sessionId, activityRunId, observationCode, ruleId }]

MatrixProfile { childId, cells: MatrixCell[28], computedAt, engineVersion }

Report        { id, sessionId, generatedAt, sections{}, disclaimers[] }
```

**Two decisions that carry the whole design:**

1. **Every Matrix cell keeps an evidence trail** — each mark traces back to the observations and the rule ID that produced it. This is what makes a rule-based engine *more* clinician-credible than ML, and it is directly why you chose rules. The grid must be tappable to reveal this.

2. **Timing uses the Web Audio clock, not `Date.now()`.** Serve timestamp is captured at prompt-audio playback start via `AudioContext.currentTime`, anchored once to `performance.now()`. `Date.now()` has neither the resolution nor the monotonicity for this.

**Aggregation:** trials → latency stats per activity → session-level latency distribution → Ribbon. Observations + latency bands → rules engine → 28 cells → Grid. Cells + latency stats + flag rules → concern flags → Report.

---

## 4. Component List

**The two signature components — build these properly, they are the demo.**

**`ResponseTimeRibbon`** — SVG (not canvas: crisper, accessible, easier to debug).
- Props: `trials[]`, `bands`, `width`
- Renders: horizontal time axis; each serve a vertical tick; each return a dot placed by latency; the gap between them a segment coloured green/amber/red by band; non-responses as an open dashed dot at the band ceiling.
- Interactive: tap/hover a trial → exact latency in ms + detection source (`parent-tap` vs `audio-onset`).
- Must be legible at 360px phone width **and** on a projector.

**`MatrixProfileGrid`** — 7 rows × 4 columns, CSS grid with SVG cell fills.
- Cell states colour-coded; **`surpassed` must be implemented** — when a higher level is achieved, lower levels in that column are marked surpassed. That is real Communication Matrix semantics and getting it right signals you actually read the instrument.
- Tap a cell → evidence drawer (which observations, which rule, which activity).
- Legend always visible.

**Accessibility note for both:** do not encode meaning in colour alone. Add shape/pattern/text labels — for colourblind judges and for unpredictable projector colour.

**Supporting components:** `ConsentGate`, `DisclaimerBanner`, `ActivityCard`, `ServeButton`, `ResponseTapTarget`, `LiveTimer`, `RecordingIndicator`, `CameraPreview`, `PermissionPrompt`, `ObservationTagger`, `ConcernFlagList`, `ReportSection`.

---

## 5. Module / Folder Structure

```
SETU/
├─ docs/
│  └─ plans/                      # this file
├─ public/
│  └─ models/                     # MediaPipe .task + .wasm, bundled NOT CDN
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ routes/                     # one file per screen (10)
│  ├─ components/
│  │  ├─ ribbon/ResponseTimeRibbon.jsx
│  │  ├─ matrix/MatrixProfileGrid.jsx
│  │  └─ common/
│  ├─ core/                       # PURE LOGIC — no React imports
│  │  ├─ latency/                 # serve/return timing, audio onset detection
│  │  ├─ vision/                  # MediaPipe wrapper, lazy-loaded
│  │  ├─ matrix/                  # rules engine, surpassed logic, flags
│  │  ├─ report/                  # templating
│  │  ├─ storage/                 # idb-keyval wrapper
│  │  └─ model/                   # schemas + factories
│  ├─ data/
│  │  ├─ activities.json
│  │  ├─ matrix-taxonomy.json
│  │  ├─ matrix-rules.json
│  │  └─ latency-bands.json
│  ├─ i18n/
│  │  ├─ en.json                  # UI strings, parent scripts, report copy
│  │  ├─ ta.json                  # Tamil
│  │  └─ hi.json                  # Hindi
│  ├─ fonts/                      # Noto Sans + Tamil + Devanagari, bundled
│  └─ styles/
└─ android/                       # Capacitor
```

**The `core/` boundary is the important one.** It contains no React, so latency maths and the rules engine are testable with plain Vitest — no DOM, no mounting, fast. That is where the logic risk lives, and it is where the only tests should go.

---

## 6. State Management & Navigation

Deliberately minimal:

- **Navigation:** React Router. Flat routes, no nesting beyond the activity loop.
- **State:** React Context + `useReducer` for the active session. One reducer, one context.
- **Persistence:** `idb-keyval` (IndexedDB) behind a single `core/storage` wrapper.
- **No** Redux, Zustand, MobX, or a query library. Scope does not justify them.

**Media handling — a deliberate design decision:** raw video is **never persisted**. Frames go to MediaPipe, features are extracted, frames are discarded. This directly supports differentiator (c) — only lightweight feature data would sync — and it removes the privacy exposure of storing video of a child. Optionally retain a short audio clip per trial, off by default.

---

## 7. Phased Build Order

| Phase | Deliverable | Verify by |
|---|---|---|
| **0. Scaffold** (~3h) | Vite + React + Router, folder skeleton, stub JSONs, Consent screen, Home | App runs, consent gate blocks |
| **1. Vertical slice** ★ | **Bubble Time end to end, parent-tap only.** No MediaPipe, no audio detection. Serve → tap → latency → Ribbon → 3 hardcoded rules → minimal report | Run one full session and see a real Ribbon, Grid, and Report |
| **2. Audio** | Web Audio capture, energy-based onset detection, dual-source return (auto + tap), noise-floor calibration | Ribbon distinguishes `audio-onset` from `parent-tap` |
| **3. Full content** | All 4 activities, Observation Tagger, full 7×4 rules JSON, surpassed logic, concern flags | Grid fills plausibly across all 4 columns |
| **4. Vision** ⚠ | MediaPipe lazy-load, face landmarker (gaze proxy), hand landmarker (point/reach) → observations with confidence | Observations appear from vision alongside parent tags |
| **3.5 Demo Mode** ★ | Seeded session loadable with one tap, no camera/child/props needed | A stranger can open the app cold and see the full value |
| **5. Report** | Print CSS → PDF, export/share | A clean PDF comes out |
| **6. Android** | Capacitor build, on-device test **on a device that is not yours** | APK installs and camera/mic work for someone else |
| **7. Demo hardening** | Rehearsal, backup video, deck screenshots from the real app | Live demo runs with no live camera |

**Two sequencing rules that matter more than the rest:**

- **Phase 1 is the demo-safe baseline.** If literally everything after it fails, Phase 1 still demonstrates all six required features in degraded form. Do not start Phase 2 until Phase 1 runs end to end.
- **Do a throwaway Capacitor build on Day 1**, not in Phase 6. Android camera/mic permissions under Capacitor are the classic multi-hour sink, and discovering that on Day 5 is fatal. Phase 6 then becomes polish rather than discovery.

---

## 8. Risks & Gaps You Haven't Accounted For

Ordered by how badly each can hurt you.

**8.1 — Communication Matrix licensing.** ⚠ *The one I'd act on today.*
The Communication Matrix is Charity Rowland's copyrighted instrument (OHSU, communicationmatrix.org). Reproducing it verbatim has licensing implications, and **NIEPMD judges will know this instrument well**. Mitigation: attribute explicitly and prominently; describe the levels in your own words rather than copying descriptors; say SETU *maps to* the framework, never that it *is* the Communication Matrix; note in the README that real deployment requires permission from the rights holder. Handled well this reads as professionalism, not weakness.

**8.2 — Latency detection validity.**
Energy-based onset detection is **not** VAD. In a real home the parent's own voice will trigger it. Mitigations: only listen for a return *after* the serve prompt audio ends; adaptive noise floor; hangover window; and keep the parent tap as an always-available ground-truth channel. Label the limitation in-app. The parent tap is not a hack — it is literally *parent-mediated* assessment, which is the problem statement's own framing.

**8.3 — Latency bands are not clinically validated.**
You need expected-latency thresholds, and there is no time to derive them properly. Keep them in `latency-bands.json`, and label them in-app and in the report as **demo heuristics requiring clinical calibration**. Do not present any number as clinically derived. Fabricated thresholds presented as clinical fact is the fastest way to lose a judge from NIEPMD.

**8.4 — MediaPipe assets must be bundled, not CDN-fetched.**
`tasks-vision` pulls `.wasm` and `.task` files at runtime. If those come from a CDN, your "works in low-bandwidth rural India" claim collapses — and it will fail offline on stage. Vendor them into `public/models/` and point the resolver at local paths. Verify actual file sizes early and pick the lightest model variants; they are in the single-digit-MB range each, but confirm rather than assume.

**8.5 — Gaze is a proxy, and infant faces are hard.**
MediaPipe FaceLandmarker gives blendshapes and head pose — **head orientation toward the camera, not true eye gaze**. It is also trained largely on adult faces and degrades on infants. Label the signal "head-orientation proxy for gaze". This is exactly why iCatcher/OWLET are on your roadmap, so the limitation is already consistent with your story — state it rather than let a judge find it.

**8.6 — Feature 5 is under-specified.**
"Detection of communication/auditory concerns" is the vaguest requirement and the easiest to over-claim. Define it narrowly and in JSON: e.g. no response in ≥N% of trials; no behaviours above Level II observed; median latency in the red band. Rule-based flags, never a predicted diagnosis.

**8.7 — Live demo failure modes.**
Camera, lighting, mic, and the availability of an actual child are all outside your control on stage. Phase 7's Demo Mode with a seeded session is not optional. Also record a backup video of a successful run.

**8.8 — Testing isn't in your brief.**
Recommend ~10 Vitest tests against `core/` only — latency maths, rules engine, surpassed logic. No UI tests. High value, low cost, and it protects the one part where a silent bug produces a plausible-looking but wrong Matrix profile.

**8.9 — Timeline realism.**
Five days solo with MediaPipe is aggressive. Pre-agree the cut order so you are not deciding under pressure at 2am: first cut Activity B, then reduce vision to face-presence + hand-raise only, then drop the audio onset detection and ship parent-tap only. Phase 1 guarantees a demo regardless.

---

---

## 9. Answers from Sanjay (2026-07-30) and what they change

**Deliverables: APK upload + deck + live demo + walkthrough.**

The APK is a *graded artifact a judge opens alone*, which changes two things:

- **Demo Mode is promoted to Phase 3.5** — no longer a safety net. A judge at their desk has no child, no bubbles, no props. If the app is unusable without them, the APK scores badly regardless of how good the live demo was. One tap must load a complete seeded session showing Ribbon, Grid, flags, and report.
- **Everything must be explainable without you in the room.** The About/Roadmap screen and in-app disclaimers carry that weight — they are read by a judge with no narrator.
- **`capacitor.config` must not ship `server.url`.** Building the APK pointed at a live dev server is the classic mistake — it works perfectly on your machine and is dead on every other device. Verify by installing on a phone that has never seen your dev environment.
- Pull **real screenshots from the built app back into the deck**. Real screenshots beat mockups for credibility, and it forces the components to match what the deck already promises.

**Language: multilingual.**

Scope boundary must be stated explicitly, because the spec already lists Indic speech models as roadmap:

| In scope now | Roadmap, not built |
|---|---|
| UI strings, parent scripts, report copy — JSON i18n | IndicWhisper ASR |
| English + Tamil + Hindi | Indic Parler-TTS voice prompts |

Tamil is high value — REC and NIEPMD are both in Chennai. Two consequences:

- **Bundle Noto Sans + Noto Sans Tamil + Noto Sans Devanagari locally.** Google Fonts over CDN breaks the offline/low-bandwidth claim and fails on stage. Tamil and Devanagari will render as tofu without them.
- **Tamil strings run noticeably longer than English.** Layouts must flex; test every screen in Tamil, not just English. Both are LTR, so no RTL work needed.

One genuine strength worth saying out loud in the pitch: because level VII is confirmed by *parent tagging* rather than ASR, SETU is **language-agnostic by construction** — the parent judges whether the child used a word in whatever language the home speaks. Competitors relying on English speech models cannot make that claim.

**Test device: any available.** Good — real-device testing is possible, and it is required, on a device that is not your dev machine.

**Demo child age: undecided.**

Treat this as a design choice, not a blank. A grid that is all one colour demos badly. Target a **~24-month persona** so the profile shows visible structure — mastered at Levels I–III, emerging at IV, not-used at V–VII, surpassed marks appearing below the mastered cells. That yields a plausible "some concerns, refer to clinician" narrative and a grid with something to point at. Keep the value in `latency-bands.json` and the profile editable.

## Still Open

- **Hard deadline date and hour** — not yet specified. Needed to fix the cut-order trigger points.
